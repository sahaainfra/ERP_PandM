/**
 * Part 11 — Work Order Service (Corrective Maintenance)
 */

import { storage } from './storage';
import { WorkOrder, WorkOrderType, WorkOrderStatus, WorkOrderPart } from './maintenanceTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getAsset, updateAsset } from './assets';
import { getMaintenanceConfiguration } from './pmPlanService';

const workOrdersStore = storage.getAdapter<WorkOrder>('work_orders');

// ============================================================================
// Work Order CRUD
// ============================================================================

export async function createWorkOrder(
  inputData: Omit<WorkOrder, 'id' | 'workOrderNumber' | 'status' | 'partsUsed' | 'labourCost' | 'partsCost' | 'externalCost' | 'totalCost' | 'testRunCompleted' | 'createdAt' | 'updatedAt'>
): Promise<WorkOrder> {
  // Generate work order number
  const workOrderNumber = `WO-${Date.now()}`;

  const workOrder: WorkOrder = {
    ...inputData,
    id: generateId(),
    workOrderNumber,
    status: 'reported',
    partsUsed: [],
    labourCost: 0,
    partsCost: 0,
    externalCost: 0,
    totalCost: 0,
    testRunCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await workOrdersStore.create(workOrder);

  // If safety-critical, apply safety hold
  if (inputData.isSafetyCritical) {
    await applySafetyHold(workOrder.id, inputData.assetId, inputData.safetyCriticalReason || 'Safety-critical defect reported', inputData.reportedBy);
  }

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: workOrder.id,
    action: 'create',
    before: null,
    after: workOrder as any,
    actorId: inputData.reportedBy,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Work order created',
  });

  return workOrder;
}

export async function getWorkOrder(id: string): Promise<WorkOrder | null> {
  return workOrdersStore.findById(id);
}

export async function getWorkOrderByNumber(workOrderNumber: string): Promise<WorkOrder | null> {
  const all = await workOrdersStore.findAll();
  return all.find(wo => wo.workOrderNumber === workOrderNumber) || null;
}

export async function listWorkOrders(filters?: {
  assetId?: string;
  type?: WorkOrderType;
  status?: WorkOrderStatus;
  priority?: string;
  isSafetyCritical?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<WorkOrder[]> {
  let workOrders = await workOrdersStore.findAll();

  if (filters?.assetId) {
    workOrders = workOrders.filter(wo => wo.assetId === filters.assetId);
  }
  if (filters?.type) {
    workOrders = workOrders.filter(wo => wo.type === filters.type);
  }
  if (filters?.status) {
    workOrders = workOrders.filter(wo => wo.status === filters.status);
  }
  if (filters?.priority) {
    workOrders = workOrders.filter(wo => wo.priority === filters.priority);
  }
  if (filters?.isSafetyCritical !== undefined) {
    workOrders = workOrders.filter(wo => wo.isSafetyCritical === filters.isSafetyCritical);
  }
  if (filters?.fromDate) {
    workOrders = workOrders.filter(wo => wo.reportedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    workOrders = workOrders.filter(wo => wo.reportedAt <= filters.toDate!);
  }

  return workOrders.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
}

// ============================================================================
// Work Order Status Transitions
// ============================================================================

export async function updateWorkOrderStatus(
  id: string,
  newStatus: WorkOrderStatus,
  userId: string,
  notes?: string
): Promise<WorkOrder> {
  const workOrder = await workOrdersStore.findById(id);
  if (!workOrder) {
    throw new Error(`Work order ${id} not found`);
  }

  // Validate status transition
  const validTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
    reported: ['triaged', 'cancelled'],
    triaged: ['in_progress', 'awaiting_parts', 'awaiting_external_vendor', 'cancelled'],
    in_progress: ['awaiting_parts', 'awaiting_external_vendor', 'testing', 'cancelled'],
    awaiting_parts: ['in_progress', 'cancelled'],
    awaiting_external_vendor: ['in_progress', 'cancelled'],
    testing: ['released', 'in_progress', 'cancelled'],
    released: ['closed'],
    closed: [],
    cancelled: [],
  };

  if (!validTransitions[workOrder.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${workOrder.status} to ${newStatus}`);
  }

  const updates: Partial<WorkOrder> = {
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };

  // Set downtime start when work begins
  if (newStatus === 'in_progress' && !workOrder.downtimeStart) {
    updates.downtimeStart = new Date().toISOString();
  }

  // Set downtime end when testing starts
  if (newStatus === 'testing' && !workOrder.downtimeEnd) {
    updates.downtimeEnd = new Date().toISOString();
  }

  const updated = await workOrdersStore.update(id, updates);

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: id,
    action: 'update',
    before: { status: workOrder.status },
    after: { status: newStatus, notes },
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: notes || `Status changed to ${newStatus}`,
  });

  return updated;
}

// ============================================================================
// Parts Management
// ============================================================================

export async function addPartToWorkOrder(
  workOrderId: string,
  part: Omit<WorkOrderPart, 'id' | 'workOrderId' | 'quantityIssued' | 'quantityReturned' | 'quantityUsed' | 'totalCost' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<WorkOrder> {
  const workOrder = await workOrdersStore.findById(workOrderId);
  if (!workOrder) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  const newPart: WorkOrderPart = {
    ...part,
    id: generateId(),
    workOrderId,
    quantityIssued: part.quantityRequested,
    quantityReturned: 0,
    quantityUsed: part.quantityRequested,
    totalCost: part.quantityRequested * part.unitCost,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedParts = [...workOrder.partsUsed, newPart];
  const partsCost = updatedParts.reduce((sum, p) => sum + p.totalCost, 0);
  const totalCost = workOrder.labourCost + partsCost + workOrder.externalCost;

  const updated = await workOrdersStore.update(workOrderId, {
    partsUsed: updatedParts,
    partsCost,
    totalCost,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: workOrderId,
    action: 'update',
    before: { partsUsed: workOrder.partsUsed },
    after: { partsUsed: updatedParts },
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: `Part added: ${part.partName}`,
  });

  return updated;
}

export async function updateWorkOrderLabour(
  workOrderId: string,
  actualLabourHours: number,
  userId: string
): Promise<WorkOrder> {
  const workOrder = await workOrdersStore.findById(workOrderId);
  if (!workOrder) {
    throw new Error(`Work order ${workOrderId} not found`);
  }

  const config = await getMaintenanceConfiguration();
  const labourCost = actualLabourHours * config.defaultLabourRatePerHour;
  const totalCost = labourCost + workOrder.partsCost + workOrder.externalCost;

  const updated = await workOrdersStore.update(workOrderId, {
    actualLabourHours,
    labourCost,
    totalCost,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: workOrderId,
    action: 'update',
    before: { actualLabourHours: workOrder.actualLabourHours, labourCost: workOrder.labourCost },
    after: { actualLabourHours, labourCost },
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'Labour hours updated',
  });

  return updated;
}

// ============================================================================
// Release and Closure
// ============================================================================

export async function releaseWorkOrder(
  id: string,
  releaseChecklistId: string,
  releasedBy: string,
  releaseNotes?: string
): Promise<WorkOrder> {
  const workOrder = await workOrdersStore.findById(id);
  if (!workOrder) {
    throw new Error(`Work order ${id} not found`);
  }

  if (workOrder.status !== 'testing') {
    throw new Error(`Work order must be in testing status to release (current: ${workOrder.status})`);
  }

  // Maker-checker: cannot release own work
  if (workOrder.primaryTechnicianId === releasedBy) {
    throw new Error('Technician cannot release their own work order');
  }

  const updated = await workOrdersStore.update(id, {
    status: 'released',
    releaseChecklistId,
    releasedBy,
    releasedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Release safety hold if applicable
  if (workOrder.isSafetyCritical && workOrder.safetyHoldApplied) {
    await releaseSafetyHold(workOrder.assetId, releasedBy, releaseNotes);
  }

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: id,
    action: 'update',
    before: { status: 'testing' },
    after: { status: 'released', releasedBy, releaseNotes },
    actorId: releasedBy,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: releaseNotes || 'Work order released',
  });

  return updated;
}

export async function closeWorkOrder(
  id: string,
  userId: string,
  closureNotes?: string
): Promise<WorkOrder> {
  const workOrder = await workOrdersStore.findById(id);
  if (!workOrder) {
    throw new Error(`Work order ${id} not found`);
  }

  if (workOrder.status !== 'released') {
    throw new Error(`Work order must be released before closing (current: ${workOrder.status})`);
  }

  const updated = await workOrdersStore.update(id, {
    status: 'closed',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'WorkOrder',
    entityId: id,
    action: 'update',
    before: { status: 'released' },
    after: { status: 'closed', closureNotes },
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: closureNotes || 'Work order closed',
  });

  return updated;
}

// ============================================================================
// Safety Hold Integration
// ============================================================================

async function applySafetyHold(workOrderId: string, assetId: string, reason: string, appliedBy: string): Promise<void> {
  // Update asset status to out_of_service
  await updateAsset(assetId, {
    status: 'out_of_service',
    statusChangeReason: `Safety hold applied: ${reason}`,
    statusChangedBy: appliedBy,
  }, appliedBy, generateId());

  // Update work order
  await workOrdersStore.update(workOrderId, {
    safetyHoldApplied: true,
    updatedAt: new Date().toISOString(),
  });

  await raiseAlert({
    ruleCode: 'SAFETY_HOLD_APPLIED',
    severity: 'critical',
    title: `Safety Hold Applied to Asset`,
    description: `Asset ${assetId} has been placed on safety hold due to: ${reason}`,
    module: 'Maintenance',
    entityType: 'WorkOrder',
    entityId: workOrderId,
    responsibleRole: 'maintenance_manager',
    recommendedAction: 'Complete repair and obtain release approval',
    dueInHours: 24,
    requestId: generateId(),
  });
}

async function releaseSafetyHold(assetId: string, releasedBy: string, releaseNotes?: string): Promise<void> {
  // Update asset status to available
  await updateAsset(assetId, {
    status: 'available',
    statusChangeReason: `Safety hold released: ${releaseNotes || 'Work completed'}`,
    statusChangedBy: releasedBy,
  }, releasedBy, generateId());
}

// ============================================================================
// Work Order Statistics
// ============================================================================

export async function getWorkOrderStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  assetId?: string;
}): Promise<{
  totalWorkOrders: number;
  openWorkOrders: number;
  safetyCriticalCount: number;
  averageCompletionTime: number; // hours
  totalCost: number;
  byType: Record<WorkOrderType, number>;
  byStatus: Record<WorkOrderStatus, number>;
}> {
  let workOrders = await workOrdersStore.findAll();

  if (filters?.fromDate) {
    workOrders = workOrders.filter(wo => wo.reportedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    workOrders = workOrders.filter(wo => wo.reportedAt <= filters.toDate!);
  }
  if (filters?.assetId) {
    workOrders = workOrders.filter(wo => wo.assetId === filters.assetId);
  }

  const openWorkOrders = workOrders.filter(wo => wo.status !== 'closed').length;
  const safetyCriticalCount = workOrders.filter(wo => wo.isSafetyCritical).length;
  const totalCost = workOrders.reduce((sum, wo) => sum + wo.totalCost, 0);

  // Calculate average completion time
  const closedWorkOrders = workOrders.filter(wo => wo.status === 'closed' && wo.downtimeStart && wo.downtimeEnd);
  const completionTimes = closedWorkOrders.map(wo => {
    const start = new Date(wo.downtimeStart!).getTime();
    const end = new Date(wo.downtimeEnd!).getTime();
    return (end - start) / (1000 * 60 * 60); // hours
  });
  const averageCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((sum, t) => sum + t, 0) / completionTimes.length
    : 0;

  // Count by type
  const byType: Record<WorkOrderType, number> = {
    pm: 0,
    breakdown: 0,
    accident: 0,
    overhaul: 0,
    modification: 0,
    warranty: 0,
  };
  for (const wo of workOrders) {
    byType[wo.type]++;
  }

  // Count by status
  const byStatus: Record<WorkOrderStatus, number> = {
    reported: 0,
    triaged: 0,
    in_progress: 0,
    awaiting_parts: 0,
    awaiting_external_vendor: 0,
    testing: 0,
    released: 0,
    closed: 0,
    cancelled: 0,
  };
  for (const wo of workOrders) {
    byStatus[wo.status]++;
  }

  return {
    totalWorkOrders: workOrders.length,
    openWorkOrders,
    safetyCriticalCount,
    averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
    totalCost,
    byType,
    byStatus,
  };
}
