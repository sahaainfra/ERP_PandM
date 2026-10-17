/**
 * Part 12 — Telematics Adapter Service
 */

import { storage } from './storage';
import { 
  TelematicsDevice, 
  TelematicsPosition, 
  TelematicsEngineData, 
  TelematicsFaultCode 
} from './integrationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { processInboundEvent } from './integrationFramework';
import { getAsset } from './assets';
import { listLogbooks } from './logbookService';

const devicesStore = storage.getAdapter<TelematicsDevice>('telematics_devices');
const positionsStore = storage.getAdapter<TelematicsPosition>('telematics_positions');
const engineDataStore = storage.getAdapter<TelematicsEngineData>('telematics_engine_data');
const faultCodesStore = storage.getAdapter<TelematicsFaultCode>('telematics_fault_codes');

// ============================================================================
// Device Management
// ============================================================================

export async function registerTelematicsDevice(
  inputData: Omit<TelematicsDevice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TelematicsDevice> {
  const device: TelematicsDevice = {
    ...inputData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await devicesStore.create(device);

  await recordAudit({
    entityType: 'TelematicsDevice',
    entityId: device.id,
    action: 'create',
    before: null,
    after: device as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Telematics device registered',
  });

  return device;
}

export async function getDeviceByAsset(assetId: string, date?: string): Promise<TelematicsDevice | null> {
  const all = await devicesStore.findAll({ assetId } as any);
  
  if (date) {
    const checkDate = new Date(date);
    return all.find(d => {
      const effectiveFrom = new Date(d.effectiveFrom);
      const effectiveTo = d.effectiveTo ? new Date(d.effectiveTo) : null;
      return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
    }) || null;
  }
  
  // Return most recent active device
  return all.find(d => d.status === 'active') || all[0] || null;
}

export async function listDevices(filters?: {
  assetId?: string;
  provider?: string;
  status?: string;
}): Promise<TelematicsDevice[]> {
  let devices = await devicesStore.findAll();

  if (filters?.assetId) {
    devices = devices.filter(d => d.assetId === filters.assetId);
  }
  if (filters?.provider) {
    devices = devices.filter(d => d.provider === filters.provider);
  }
  if (filters?.status) {
    devices = devices.filter(d => d.status === filters.status);
  }

  return devices;
}

// ============================================================================
// Position Data
// ============================================================================

export async function ingestTelematicsPosition(
  connectorId: string,
  deviceId: string,
  position: Omit<TelematicsPosition, 'id' | 'assetId' | 'receivedAt' | 'createdAt'>
): Promise<TelematicsPosition> {
  const device = await devicesStore.findById(deviceId);
  if (!device) {
    throw new Error(`Device ${deviceId} not found`);
  }

  // Process through integration framework
  await processInboundEvent(
    connectorId,
    'TelematicsPosition',
    `${deviceId}:${position.recordedAt}`,
    position as any,
    position.recordedAt
  );

  // Store position
  const positionRecord: TelematicsPosition = {
    ...position,
    id: generateId(),
    assetId: device.assetId,
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await positionsStore.create(positionRecord);

  // Update device last communication
  await devicesStore.update(deviceId, {
    lastCommunicationAt: position.recordedAt,
    updatedAt: new Date().toISOString(),
  });

  return positionRecord;
}

export async function listPositions(filters?: {
  assetId?: string;
  deviceId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<TelematicsPosition[]> {
  let positions = await positionsStore.findAll();

  if (filters?.assetId) {
    positions = positions.filter(p => p.assetId === filters.assetId);
  }
  if (filters?.deviceId) {
    positions = positions.filter(p => p.deviceId === filters.deviceId);
  }
  if (filters?.fromDate) {
    positions = positions.filter(p => p.recordedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    positions = positions.filter(p => p.recordedAt <= filters.toDate!);
  }

  return positions.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

// ============================================================================
// Engine Data
// ============================================================================

export async function ingestTelematicsEngineData(
  connectorId: string,
  deviceId: string,
  data: Omit<TelematicsEngineData, 'id' | 'assetId' | 'receivedAt' | 'createdAt'>
): Promise<TelematicsEngineData> {
  const device = await devicesStore.findById(deviceId);
  if (!device) {
    throw new Error(`Device ${deviceId} not found`);
  }

  // Process through integration framework
  await processInboundEvent(
    connectorId,
    'TelematicsEngineHours',
    `${deviceId}:${data.recordedAt}`,
    data as any,
    data.recordedAt
  );

  // Store engine data
  const engineDataRecord: TelematicsEngineData = {
    ...data,
    id: generateId(),
    assetId: device.assetId,
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await engineDataStore.create(engineDataRecord);

  // Cross-check with logbook hours
  await checkTelematicsVsLogbookMismatch(device.assetId, data.engineHours, data.recordedAt);

  return engineDataRecord;
}

async function checkTelematicsVsLogbookMismatch(
  assetId: string,
  telematicsHours: number,
  date: string
): Promise<void> {
  const logbooks = await listLogbooks({ assetId, date: date.split('T')[0] });
  
  if (logbooks.length === 0) return;

  const latestLogbook = logbooks[0];
  const logbookHours = latestLogbook.closingHourMeter || 0;
  
  const variance = Math.abs(telematicsHours - logbookHours);
  const variancePercent = logbookHours > 0 ? (variance / logbookHours) * 100 : 0;

  if (variancePercent > 10) { // 10% threshold
    await raiseAlert({
      ruleCode: 'TELEMATICS_MISMATCH',
      severity: 'warning',
      title: `Telematics vs Logbook Hours Mismatch`,
      description: `Asset ${assetId}: Telematics shows ${telematicsHours}h, logbook shows ${logbookHours}h (${variancePercent.toFixed(1)}% variance)`,
      module: 'Integration',
      entityType: 'TelematicsEngineData',
      entityId: assetId,
      responsibleRole: 'fleet_manager',
      recommendedAction: 'Investigate discrepancy between telematics and logbook hours',
      dueInHours: 48,
      requestId: generateId(),
    });
  }
}

export async function listEngineData(filters?: {
  assetId?: string;
  deviceId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<TelematicsEngineData[]> {
  let data = await engineDataStore.findAll();

  if (filters?.assetId) {
    data = data.filter(d => d.assetId === filters.assetId);
  }
  if (filters?.deviceId) {
    data = data.filter(d => d.deviceId === filters.deviceId);
  }
  if (filters?.fromDate) {
    data = data.filter(d => d.recordedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    data = data.filter(d => d.recordedAt <= filters.toDate!);
  }

  return data.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

// ============================================================================
// Fault Codes
// ============================================================================

export async function ingestTelematicsFaultCode(
  connectorId: string,
  deviceId: string,
  fault: Omit<TelematicsFaultCode, 'id' | 'assetId' | 'receivedAt' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<TelematicsFaultCode> {
  const device = await devicesStore.findById(deviceId);
  if (!device) {
    throw new Error(`Device ${deviceId} not found`);
  }

  // Process through integration framework
  await processInboundEvent(
    connectorId,
    'TelematicsFaultCode',
    `${deviceId}:${fault.faultCode}:${fault.detectedAt}`,
    fault as any,
    fault.detectedAt
  );

  // Store fault code
  const faultRecord: TelematicsFaultCode = {
    ...fault,
    id: generateId(),
    assetId: device.assetId,
    receivedAt: new Date().toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await faultCodesStore.create(faultRecord);

  // Raise alert for critical faults
  if (fault.severity === 'critical' || fault.severity === 'high') {
    await raiseAlert({
      ruleCode: 'TELEMATICS_FAULT_DETECTED',
      severity: fault.severity === 'critical' ? 'critical' : 'high',
      title: `Telematics Fault Detected: ${fault.faultCode}`,
      description: `Asset ${device.assetId}: ${fault.faultDescription} (${fault.severity} severity)`,
      module: 'Integration',
      entityType: 'TelematicsFaultCode',
      entityId: faultRecord.id,
      responsibleRole: 'maintenance_manager',
      recommendedAction: 'Review fault and create maintenance work order if needed',
      dueInHours: fault.severity === 'critical' ? 4 : 24,
      requestId: generateId(),
    });
  }

  return faultRecord;
}

export async function acknowledgeFaultCode(faultId: string, userId: string): Promise<TelematicsFaultCode> {
  const fault = await faultCodesStore.findById(faultId);
  if (!fault) {
    throw new Error(`Fault code ${faultId} not found`);
  }

  const updated = await faultCodesStore.update(faultId, {
    status: 'acknowledged',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'TelematicsFaultCode',
    entityId: faultId,
    action: 'update',
    before: fault as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'Fault code acknowledged',
  });

  return updated;
}

export async function linkFaultToWorkOrder(faultId: string, workOrderId: string): Promise<TelematicsFaultCode> {
  const fault = await faultCodesStore.findById(faultId);
  if (!fault) {
    throw new Error(`Fault code ${faultId} not found`);
  }

  const updated = await faultCodesStore.update(faultId, {
    workOrderId,
    status: 'acknowledged',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'TelematicsFaultCode',
    entityId: faultId,
    action: 'update',
    before: fault as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Fault linked to work order ${workOrderId}`,
  });

  return updated;
}

export async function listFaultCodes(filters?: {
  assetId?: string;
  deviceId?: string;
  status?: string;
  severity?: string;
}): Promise<TelematicsFaultCode[]> {
  let faults = await faultCodesStore.findAll();

  if (filters?.assetId) {
    faults = faults.filter(f => f.assetId === filters.assetId);
  }
  if (filters?.deviceId) {
    faults = faults.filter(f => f.deviceId === filters.deviceId);
  }
  if (filters?.status) {
    faults = faults.filter(f => f.status === filters.status);
  }
  if (filters?.severity) {
    faults = faults.filter(f => f.severity === filters.severity);
  }

  return faults.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

// ============================================================================
// Cross-Checks
// ============================================================================

export async function checkGeofencePresence(
  assetId: string,
  geofenceId: string,
  date: string
): Promise<{
  present: boolean;
  entryTime?: string;
  exitTime?: string;
  durationMinutes?: number;
}> {
  const positions = await listPositions({
    assetId,
    fromDate: date,
    toDate: date,
  });

  const geofencePositions = positions.filter(p => p.geofenceId === geofenceId && p.insideGeofence);

  if (geofencePositions.length === 0) {
    return { present: false };
  }

  const entryTime = geofencePositions[geofencePositions.length - 1].recordedAt;
  const exitTime = geofencePositions[0].recordedAt;
  const durationMinutes = (new Date(exitTime).getTime() - new Date(entryTime).getTime()) / (1000 * 60);

  return {
    present: true,
    entryTime,
    exitTime,
    durationMinutes: Math.round(durationMinutes),
  };
}

// ============================================================================
// Statistics
// ============================================================================

export async function getTelematicsStatistics(filters?: {
  assetId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalPositions: number;
  totalEngineDataPoints: number;
  activeFaults: number;
  averageDailyPositions: number;
}> {
  let positions = await positionsStore.findAll();
  let engineData = await engineDataStore.findAll();
  let faults = await faultCodesStore.findAll();

  if (filters?.assetId) {
    positions = positions.filter(p => p.assetId === filters.assetId);
    engineData = engineData.filter(d => d.assetId === filters.assetId);
    faults = faults.filter(f => f.assetId === filters.assetId);
  }
  if (filters?.fromDate) {
    positions = positions.filter(p => p.recordedAt >= filters.fromDate!);
    engineData = engineData.filter(d => d.recordedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    positions = positions.filter(p => p.recordedAt <= filters.toDate!);
    engineData = engineData.filter(d => d.recordedAt <= filters.toDate!);
  }

  const activeFaults = faults.filter(f => f.status === 'active').length;

  // Calculate average daily positions
  const days = filters?.fromDate && filters?.toDate
    ? Math.ceil((new Date(filters.toDate).getTime() - new Date(filters.fromDate).getTime()) / (1000 * 60 * 60 * 24))
    : 30;
  const averageDailyPositions = days > 0 ? positions.length / days : 0;

  return {
    totalPositions: positions.length,
    totalEngineDataPoints: engineData.length,
    activeFaults,
    averageDailyPositions: Math.round(averageDailyPositions),
  };
}
