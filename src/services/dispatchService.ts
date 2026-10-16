/**
 * Part 18 — Dispatch Service
 */

import { storage } from './storage';
import { Dispatch, DispatchStatus, DispatchException, ExceptionType } from './dispatchTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getRMCOrder, updateRMCOrder } from './rmcOrderService';
import { getBatch } from './batchService';
import { getAsset } from './assets';
import { getOperator } from './operatorManagement';
import { getDispatchConfiguration } from './dispatchConfigService';

const dispatchesStore = storage.getAdapter<Dispatch>('dispatches');
const exceptionsStore = storage.getAdapter<DispatchException>('dispatch_exceptions');

// ============================================================================
// Dispatch CRUD
// ============================================================================

export async function createDispatch(
  data: Omit<Dispatch, 'id' | 'dispatchNumber' | 'challanNumber' | 'challanGeneratedAt' | 'status' | 'hasDelay' | 'concreteAgeExceeded' | 'timestampSources' | 'createdAt' | 'updatedAt'>
): Promise<Dispatch> {
  // Generate dispatch number
  const dispatchNumber = `DSP-${Date.now()}`;
  const challanNumber = `CHL-${Date.now()}`;
  
  // Validate order exists and is approved
  const order = await getRMCOrder(data.orderId);
  if (!order) {
    throw new Error(`Order ${data.orderId} not found`);
  }
  
  if (order.status !== 'approved' && order.status !== 'scheduled') {
    throw new Error(`Order ${order.orderNumber} is not approved for dispatch (status: ${order.status})`);
  }
  
  // Validate batch exists
  const batch = await getBatch(data.batchId);
  if (!batch) {
    throw new Error(`Batch ${data.batchId} not found`);
  }
  
  // Validate mixer exists and is available
  const mixer = await getAsset(data.mixerId);
  if (!mixer) {
    throw new Error(`Mixer ${data.mixerId} not found`);
  }
  
  if (mixer.status === 'out_of_service' || mixer.status === 'under_maintenance') {
    throw new Error(`Mixer ${mixer.assetCode} is not available (status: ${mixer.status})`);
  }
  
  // Check safety hold (using breakdown status as indicator)
  if (mixer.status === 'breakdown') {
    throw new Error(`Mixer ${mixer.assetCode} is in breakdown status and cannot be dispatched`);
  }
  
  // Validate driver exists and has valid licence
  const driver = await getOperator(data.driverId);
  if (!driver) {
    throw new Error(`Driver ${data.driverId} not found`);
  }
  
  if (driver.licenceExpiryDate) {
    const expiryDate = new Date(driver.licenceExpiryDate);
    const now = new Date();
    if (expiryDate < now) {
      throw new Error(`Driver ${driver.fullName} licence has expired`);
    }
  }
  
  // Check load capacity
  const mixerCapacity = mixer.tankCapacity || 0;
  if (data.dispatchedQuantity > mixerCapacity) {
    throw new Error(`Dispatch quantity ${data.dispatchedQuantity} m³ exceeds mixer capacity ${mixerCapacity} m³`);
  }
  
  const dispatch: Dispatch = {
    ...data,
    id: generateId(),
    dispatchNumber,
    challanNumber,
    challanGeneratedAt: new Date().toISOString(),
    status: 'scheduled',
    hasDelay: false,
    concreteAgeExceeded: false,
    timestampSources: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await dispatchesStore.create(dispatch);
  
  // Update order status
  await updateRMCOrder(data.orderId, {
    status: 'in_production',
    updatedAt: new Date().toISOString(),
  }, data.createdBy);
  
  await recordAudit({
    entityType: 'Dispatch',
    entityId: dispatch.id,
    action: 'create',
    before: null,
    after: dispatch as any,
    actorId: data.createdBy,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: `Dispatch ${dispatchNumber} created for order ${order.orderNumber}`,
  });
  
  return dispatch;
}

export async function getDispatch(id: string): Promise<Dispatch | null> {
  return dispatchesStore.findById(id);
}

export async function getDispatchByNumber(dispatchNumber: string): Promise<Dispatch | null> {
  const all = await dispatchesStore.findAll();
  return all.find(d => d.dispatchNumber === dispatchNumber) || null;
}

export async function listDispatches(filters?: {
  orderId?: string;
  batchId?: string;
  mixerId?: string;
  driverId?: string;
  status?: DispatchStatus;
  date?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<Dispatch[]> {
  let dispatches = await dispatchesStore.findAll();
  
  if (filters?.orderId) {
    dispatches = dispatches.filter(d => d.orderId === filters.orderId);
  }
  if (filters?.batchId) {
    dispatches = dispatches.filter(d => d.batchId === filters.batchId);
  }
  if (filters?.mixerId) {
    dispatches = dispatches.filter(d => d.mixerId === filters.mixerId);
  }
  if (filters?.driverId) {
    dispatches = dispatches.filter(d => d.driverId === filters.driverId);
  }
  if (filters?.status) {
    dispatches = dispatches.filter(d => d.status === filters.status);
  }
  if (filters?.date) {
    dispatches = dispatches.filter(d => d.scheduledLoadingTime.startsWith(filters.date!));
  }
  if (filters?.fromDate) {
    dispatches = dispatches.filter(d => d.scheduledLoadingTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    dispatches = dispatches.filter(d => d.scheduledLoadingTime <= filters.toDate!);
  }
  
  return dispatches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// Dispatch Status Updates
// ============================================================================

export async function updateDispatchTimestamp(
  dispatchId: string,
  timestampField: keyof Dispatch,
  timestamp: string,
  source: 'manual' | 'gps' | 'driver_app',
  userId: string
): Promise<Dispatch> {
  const dispatch = await dispatchesStore.findById(dispatchId);
  if (!dispatch) {
    throw new Error(`Dispatch ${dispatchId} not found`);
  }
  
  const updates: Partial<Dispatch> = {
    [timestampField]: timestamp,
    timestampSources: {
      ...dispatch.timestampSources,
      [timestampField]: source,
    },
    updatedAt: new Date().toISOString(),
  };
  
  // Check for delays
  const config = await getDispatchConfiguration();
  await checkForDelays(dispatch, timestampField, timestamp, config);
  
  // Check concrete age
  if (timestampField === 'unloadingStartTime') {
    await checkConcreteAge(dispatch, timestamp, config);
  }
  
  // Update status based on timestamp
  const newStatus = determineStatusFromTimestamp(timestampField, dispatch.status);
  if (newStatus) {
    updates.status = newStatus;
  }
  
  const updated = await dispatchesStore.update(dispatchId, updates);
  
  await recordAudit({
    entityType: 'Dispatch',
    entityId: dispatchId,
    action: 'update',
    before: { [timestampField]: (dispatch as any)[timestampField], status: dispatch.status },
    after: { [timestampField]: timestamp, status: newStatus || dispatch.status, source },
    actorId: userId,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: `Timestamp updated: ${timestampField}`,
  });
  
  return updated;
}

function determineStatusFromTimestamp(
  timestampField: keyof Dispatch,
  currentStatus: DispatchStatus
): DispatchStatus | null {
  switch (timestampField) {
    case 'loadingStartTime':
      return 'loading';
    case 'loadingEndTime':
      return 'loaded';
    case 'plantDepartureTime':
      return 'in_transit';
    case 'siteArrivalTime':
      return 'at_site';
    case 'unloadingStartTime':
      return 'unloading';
    case 'unloadingEndTime':
      return 'completed';
    default:
      return null;
  }
}

async function checkForDelays(
  dispatch: Dispatch,
  timestampField: keyof Dispatch,
  timestamp: string,
  config: any
): Promise<void> {
  const now = new Date(timestamp);
  
  // Check loading delay
  if (timestampField === 'loadingStartTime' && dispatch.scheduledLoadingTime) {
    const scheduled = new Date(dispatch.scheduledLoadingTime);
    const delayMinutes = (now.getTime() - scheduled.getTime()) / (1000 * 60);
    
    if (delayMinutes > config.maxLoadingDelayMinutes) {
      await createDispatchException(dispatch.id, 'DISPATCH_DELAY', 'warning', 
        `Loading started ${Math.round(delayMinutes)} minutes late`, 
        config.maxLoadingDelayMinutes, delayMinutes, 'minutes');
    }
  }
  
  // Check transit delay
  if (timestampField === 'siteArrivalTime' && dispatch.plantDepartureTime) {
    const departure = new Date(dispatch.plantDepartureTime);
    const transitMinutes = (now.getTime() - departure.getTime()) / (1000 * 60);
    
    if (transitMinutes > config.maxTransitTimeMinutes) {
      await createDispatchException(dispatch.id, 'TRANSIT_DELAY', 'warning',
        `Transit time ${Math.round(transitMinutes)} minutes exceeds expected ${config.maxTransitTimeMinutes} minutes`,
        config.maxTransitTimeMinutes, transitMinutes, 'minutes');
    }
  }
  
  // Check site waiting
  if (timestampField === 'unloadingStartTime' && dispatch.siteArrivalTime) {
    const arrival = new Date(dispatch.siteArrivalTime);
    const waitingMinutes = (now.getTime() - arrival.getTime()) / (1000 * 60);
    
    if (waitingMinutes > config.maxSiteWaitingMinutes) {
      await createDispatchException(dispatch.id, 'SITE_WAITING_EXCESS', 'warning',
        `Site waiting time ${Math.round(waitingMinutes)} minutes exceeds limit ${config.maxSiteWaitingMinutes} minutes`,
        config.maxSiteWaitingMinutes, waitingMinutes, 'minutes');
      
      // Update dispatch with waiting time
      await dispatchesStore.update(dispatch.id, {
        siteWaitingMinutes: waitingMinutes,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}

async function checkConcreteAge(
  dispatch: Dispatch,
  unloadingStartTime: string,
  config: any
): Promise<void> {
  const batch = await getBatch(dispatch.batchId);
  if (!batch) return;
  
  const batchingTime = new Date(batch.batchEndTime || batch.batchStartTime);
  const unloadingTime = new Date(unloadingStartTime);
  const ageMinutes = (unloadingTime.getTime() - batchingTime.getTime()) / (1000 * 60);
  
  await dispatchesStore.update(dispatch.id, {
    concreteAgeAtUnloading: ageMinutes,
    updatedAt: new Date().toISOString(),
  });
  
  if (ageMinutes > config.maxConcreteAgeMinutes) {
    await createDispatchException(dispatch.id, 'CONCRETE_AGE_LIMIT', 'critical',
      `Concrete age ${Math.round(ageMinutes)} minutes exceeds limit ${config.maxConcreteAgeMinutes} minutes`,
      config.maxConcreteAgeMinutes, ageMinutes, 'minutes');
    
    await dispatchesStore.update(dispatch.id, {
      concreteAgeExceeded: true,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Exception Management
// ============================================================================

export async function createDispatchException(
  dispatchId: string,
  exceptionType: ExceptionType,
  severity: 'info' | 'warning' | 'critical',
  description: string,
  thresholdValue?: number,
  actualValue?: number,
  unit?: string
): Promise<DispatchException> {
  const exception: DispatchException = {
    id: generateId(),
    dispatchId,
    exceptionType,
    severity,
    title: getExceptionTitle(exceptionType),
    description,
    thresholdValue,
    actualValue,
    unit,
    acknowledged: false,
    alertRaised: false,
    detectedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  
  await exceptionsStore.create(exception);
  
  // Raise alert
  const alertRaised = await raiseAlert({
    ruleCode: exceptionType,
    severity,
    title: exception.title,
    description: exception.description,
    module: 'Dispatch',
    entityType: 'Dispatch',
    entityId: dispatchId,
    responsibleRole: 'dispatch_manager',
    recommendedAction: getRecommendedAction(exceptionType),
    dueInHours: severity === 'critical' ? 1 : 4,
    requestId: generateId(),
  });
  
  if (alertRaised) {
    await exceptionsStore.update(exception.id, {
      alertRaised: true,
      alertId: alertRaised.id,
    });
  }
  
  // Update dispatch
  await dispatchesStore.update(dispatchId, {
    hasDelay: true,
    updatedAt: new Date().toISOString(),
  });
  
  return exception;
}

function getExceptionTitle(type: ExceptionType): string {
  const titles: Record<ExceptionType, string> = {
    'DISPATCH_DELAY': 'Dispatch Delay',
    'TRANSIT_DELAY': 'Transit Delay',
    'SITE_WAITING_EXCESS': 'Excessive Site Waiting Time',
    'CONCRETE_AGE_LIMIT': 'Concrete Age Limit Exceeded',
    'OVERLOAD_ATTEMPT': 'Overload Attempt',
    'SAFETY_HOLD_VIOLATION': 'Safety Hold Violation',
    'INVALID_LICENCE': 'Invalid Driver Licence',
  };
  return titles[type];
}

function getRecommendedAction(type: ExceptionType): string {
  const actions: Record<ExceptionType, string> = {
    'DISPATCH_DELAY': 'Investigate cause of delay and implement corrective actions',
    'TRANSIT_DELAY': 'Check route and traffic conditions, notify site',
    'SITE_WAITING_EXCESS': 'Coordinate with site for immediate unloading',
    'CONCRETE_AGE_LIMIT': 'QC inspection required before use, consider rejection',
    'OVERLOAD_ATTEMPT': 'Verify load calculations and mixer capacity',
    'SAFETY_HOLD_VIOLATION': 'Immediate investigation required, halt operations',
    'INVALID_LICENCE': 'Verify driver credentials, arrange replacement driver',
  };
  return actions[type];
}

export async function acknowledgeException(
  exceptionId: string,
  acknowledgedBy: string,
  resolutionNotes: string
): Promise<DispatchException> {
  const exception = await exceptionsStore.findById(exceptionId);
  if (!exception) {
    throw new Error(`Exception ${exceptionId} not found`);
  }
  
  const updated = await exceptionsStore.update(exceptionId, {
    acknowledged: true,
    acknowledgedBy,
    acknowledgedAt: new Date().toISOString(),
    resolutionNotes,
  });
  
  await recordAudit({
    entityType: 'DispatchException',
    entityId: exceptionId,
    action: 'update',
    before: { acknowledged: false },
    after: { acknowledged: true, resolutionNotes },
    actorId: acknowledgedBy,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: 'Exception acknowledged',
  });
  
  return updated;
}

export async function listDispatchExceptions(filters?: {
  dispatchId?: string;
  exceptionType?: ExceptionType;
  severity?: string;
  acknowledged?: boolean;
}): Promise<DispatchException[]> {
  let exceptions = await exceptionsStore.findAll();
  
  if (filters?.dispatchId) {
    exceptions = exceptions.filter(e => e.dispatchId === filters.dispatchId);
  }
  if (filters?.exceptionType) {
    exceptions = exceptions.filter(e => e.exceptionType === filters.exceptionType);
  }
  if (filters?.severity) {
    exceptions = exceptions.filter(e => e.severity === filters.severity);
  }
  if (filters?.acknowledged !== undefined) {
    exceptions = exceptions.filter(e => e.acknowledged === filters.acknowledged);
  }
  
  return exceptions.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

// ============================================================================
// Delivery Completion
// ============================================================================

export async function completeDelivery(
  dispatchId: string,
  deliveredQuantity: number,
  returnedQuantity: number,
  rejectedQuantity: number,
  wastedQuantity: number,
  receiverName: string,
  receiverSignature: string,
  userId: string
): Promise<Dispatch> {
  const dispatch = await dispatchesStore.findById(dispatchId);
  if (!dispatch) {
    throw new Error(`Dispatch ${dispatchId} not found`);
  }
  
  if (dispatch.status !== 'unloading' && dispatch.status !== 'at_site') {
    throw new Error(`Dispatch is not in unloading status (current: ${dispatch.status})`);
  }
  
  // Validate quantities
  const totalQuantity = deliveredQuantity + returnedQuantity + rejectedQuantity + wastedQuantity;
  if (Math.abs(totalQuantity - dispatch.dispatchedQuantity) > 0.1) {
    throw new Error(`Quantity mismatch: dispatched ${dispatch.dispatchedQuantity} m³, but delivered+returned+rejected+wasted = ${totalQuantity} m³`);
  }
  
  let newStatus: DispatchStatus = 'completed';
  let returnReason: string | undefined;
  let rejectionReason: string | undefined;
  
  if (returnedQuantity > 0) {
    newStatus = 'returned';
    returnReason = 'Site returned concrete';
  }
  
  if (rejectedQuantity > 0) {
    newStatus = 'rejected';
    rejectionReason = 'QC rejected concrete';
  }
  
  const updated = await dispatchesStore.update(dispatchId, {
    deliveredQuantity,
    returnedQuantity,
    rejectedQuantity,
    wastedQuantity,
    receiverName,
    receiverSignature,
    receiptConfirmedAt: new Date().toISOString(),
    status: newStatus,
    returnReason,
    rejectionReason,
    updatedAt: new Date().toISOString(),
  });
  
  // Update order
  const order = await getRMCOrder(dispatch.orderId);
  if (order) {
    const newDeliveredQuantity = (order.deliveredQuantity || 0) + deliveredQuantity;
    await updateRMCOrder(dispatch.orderId, {
      deliveredQuantity: newDeliveredQuantity,
      remainingQuantity: order.requiredQuantity - newDeliveredQuantity,
      status: newDeliveredQuantity >= order.requiredQuantity ? 'completed' : 'partially_delivered',
      updatedAt: new Date().toISOString(),
    }, userId);
  }
  
  await recordAudit({
    entityType: 'Dispatch',
    entityId: dispatchId,
    action: 'update',
    before: { status: dispatch.status, deliveredQuantity: dispatch.deliveredQuantity },
    after: { status: newStatus, deliveredQuantity, returnedQuantity, rejectedQuantity, wastedQuantity },
    actorId: userId,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: 'Delivery completed',
  });
  
  return updated;
}

// ============================================================================
// Dispatch Statistics
// ============================================================================

export async function getDispatchStatistics(filters?: {
  plantId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalDispatches: number;
  completedDispatches: number;
  returnedDispatches: number;
  rejectedDispatches: number;
  totalDispatched: number;
  totalDelivered: number;
  totalReturned: number;
  totalRejected: number;
  averageTransitTime: number;
  onTimeDeliveryPercent: number;
  exceptionCount: number;
}> {
  let dispatches = await dispatchesStore.findAll();
  
  if (filters?.plantId) {
    dispatches = dispatches.filter(d => d.plantId === filters.plantId);
  }
  if (filters?.fromDate) {
    dispatches = dispatches.filter(d => d.scheduledLoadingTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    dispatches = dispatches.filter(d => d.scheduledLoadingTime <= filters.toDate!);
  }
  
  const completedDispatches = dispatches.filter(d => d.status === 'completed').length;
  const returnedDispatches = dispatches.filter(d => d.status === 'returned').length;
  const rejectedDispatches = dispatches.filter(d => d.status === 'rejected').length;
  
  const totalDispatched = dispatches.reduce((sum, d) => sum + d.dispatchedQuantity, 0);
  const totalDelivered = dispatches.reduce((sum, d) => sum + (d.deliveredQuantity || 0), 0);
  const totalReturned = dispatches.reduce((sum, d) => sum + (d.returnedQuantity || 0), 0);
  const totalRejected = dispatches.reduce((sum, d) => sum + (d.rejectedQuantity || 0), 0);
  
  // Calculate average transit time
  const transitTimes = dispatches
    .filter(d => d.plantDepartureTime && d.siteArrivalTime)
    .map(d => {
      const departure = new Date(d.plantDepartureTime!).getTime();
      const arrival = new Date(d.siteArrivalTime!).getTime();
      return (arrival - departure) / (1000 * 60); // minutes
    });
  
  const averageTransitTime = transitTimes.length > 0
    ? transitTimes.reduce((sum, t) => sum + t, 0) / transitTimes.length
    : 0;
  
  // Calculate on-time delivery percentage
  const config = await getDispatchConfiguration();
  const onTimeCount = dispatches.filter(d => {
    if (!d.plantDepartureTime || !d.siteArrivalTime) return false;
    const departure = new Date(d.plantDepartureTime).getTime();
    const arrival = new Date(d.siteArrivalTime).getTime();
    const transitMinutes = (arrival - departure) / (1000 * 60);
    return transitMinutes <= config.maxTransitTimeMinutes;
  }).length;
  
  const onTimeDeliveryPercent = dispatches.length > 0
    ? (onTimeCount / dispatches.length) * 100
    : 0;
  
  // Count exceptions
  const exceptions = await exceptionsStore.findAll();
  const exceptionCount = exceptions.filter(e => 
    dispatches.some(d => d.id === e.dispatchId)
  ).length;
  
  return {
    totalDispatches: dispatches.length,
    completedDispatches,
    returnedDispatches,
    rejectedDispatches,
    totalDispatched: Math.round(totalDispatched * 100) / 100,
    totalDelivered: Math.round(totalDelivered * 100) / 100,
    totalReturned: Math.round(totalReturned * 100) / 100,
    totalRejected: Math.round(totalRejected * 100) / 100,
    averageTransitTime: Math.round(averageTransitTime),
    onTimeDeliveryPercent: Math.round(onTimeDeliveryPercent * 10) / 10,
    exceptionCount,
  };
}
