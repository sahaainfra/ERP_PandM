/**
 * Part 06 — Daily Equipment Logbook Service
 */

import { storage } from './storage';
import { EquipmentLogbook, ValidationFlag, ValidationFlagCode, LogbookConfiguration, ActivityCode, ReasonCode, TimeSplitReason } from './logbookTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { hasPermission } from './permissions';
import { getAsset } from './assets';
import { getActiveAllocation } from './assetAllocation';
import { getOperator } from './operatorManagement';

const logbooksStore = storage.getAdapter<EquipmentLogbook>('equipment_logbooks');
const configStore = storage.getAdapter<LogbookConfiguration>('logbook_configurations');
const activityCodesStore = storage.getAdapter<ActivityCode>('activity_codes');
const reasonCodesStore = storage.getAdapter<ReasonCode>('reason_codes');

// ============================================================================
// Logbook CRUD
// ============================================================================

export async function createLogbook(
  data: Omit<EquipmentLogbook, 'id' | 'logbookNumber' | 'createdAt' | 'updatedAt' | 'validationFlags' | 'status' | 'dataSource'>,
  userId: string
): Promise<EquipmentLogbook> {
  // Check permissions
  await hasPermission({
    userId,
    role: 'operator',
    action: 'create',
    resource: 'equipment_logbook',
  });

  // Generate logbook number
  const logbookNumber = `LOG-${Date.now()}`;

  // Validate asset allocation
  const allocation = await getActiveAllocation(data.assetId);
  if (!allocation) {
    throw new Error('Asset is not currently allocated');
  }

  // Validate operator assignment (Part 05)
  const operator = await getOperator(data.operatorId);
  if (!operator) {
    throw new Error('Operator not found');
  }

  // Check for duplicate logbook (same asset, date, shift)
  const existingLogbooks = await logbooksStore.findAll({
    assetId: data.assetId,
    date: data.date,
    shift: data.shift,
  } as Partial<EquipmentLogbook>);

  if (existingLogbooks.length > 0) {
    throw new Error('Logbook already exists for this asset, date, and shift');
  }

  // Create logbook
  const logbook: EquipmentLogbook = {
    ...data,
    id: generateId(),
    logbookNumber,
    status: 'draft',
    dataSource: 'manual',
    validationFlags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    updatedBy: userId,
  };

  // Run validations
  const flags = await validateLogbook(logbook);
  logbook.validationFlags = flags;

  await logbooksStore.create(logbook);

  // Audit
  await recordAudit({
    entityType: 'EquipmentLogbook',
    entityId: logbook.id,
    action: 'create',
    before: null,
    after: logbook as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Logbook created',
  });

  return logbook;
}

export async function getLogbook(id: string): Promise<EquipmentLogbook | null> {
  return logbooksStore.findById(id);
}

export async function getLogbookByNumber(logbookNumber: string): Promise<EquipmentLogbook | null> {
  return logbooksStore.findOne({ logbookNumber } as Partial<EquipmentLogbook>);
}

export async function listLogbooks(filters?: {
  assetId?: string;
  date?: string;
  operatorId?: string;
  status?: string;
  projectId?: string;
  siteId?: string;
}): Promise<EquipmentLogbook[]> {
  let logbooks = await logbooksStore.findAll();

  if (filters?.assetId) {
    logbooks = logbooks.filter(l => l.assetId === filters.assetId);
  }
  if (filters?.date) {
    logbooks = logbooks.filter(l => l.date === filters.date);
  }
  if (filters?.operatorId) {
    logbooks = logbooks.filter(l => l.operatorId === filters.operatorId);
  }
  if (filters?.status) {
    logbooks = logbooks.filter(l => l.status === filters.status);
  }
  if (filters?.projectId) {
    logbooks = logbooks.filter(l => l.projectId === filters.projectId);
  }
  if (filters?.siteId) {
    logbooks = logbooks.filter(l => l.siteId === filters.siteId);
  }

  return logbooks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateLogbook(
  id: string,
  updates: Partial<EquipmentLogbook>,
  userId: string
): Promise<EquipmentLogbook> {
  await hasPermission({
    userId,
    role: 'operator',
    action: 'edit',
    resource: 'equipment_logbook',
  });

  const logbook = await logbooksStore.findById(id);
  if (!logbook) {
    throw new Error(`Logbook ${id} not found`);
  }

  if (logbook.status === 'approved') {
    throw new Error('Cannot edit approved logbook');
  }

  const updated = await logbooksStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Re-run validations
  const flags = await validateLogbook(updated);
  const finalUpdated = await logbooksStore.update(id, {
    validationFlags: flags,
  });

  await recordAudit({
    entityType: 'EquipmentLogbook',
    entityId: id,
    action: 'update',
    before: logbook as unknown as Record<string, unknown>,
    after: finalUpdated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Logbook updated',
  });

  return finalUpdated;
}

// ============================================================================
// Validation Logic
// ============================================================================

async function validateLogbook(logbook: EquipmentLogbook): Promise<ValidationFlag[]> {
  const flags: ValidationFlag[] = [];

  // 1. Validate opening reading matches previous closing
  if (logbook.openingHourMeter !== undefined) {
    const previousLogbook = await getPreviousLogbook(logbook.assetId, logbook.date);
    if (previousLogbook && previousLogbook.closingHourMeter !== undefined) {
      // Check for approved meter replacement
      const asset = await getAsset(logbook.assetId);
      const hasMeterReplacement = asset?.meterReplacements.some(r => 
        r.meterType === 'hour_meter' && 
        new Date(r.replacementDate) > new Date(previousLogbook.date) &&
        new Date(r.replacementDate) < new Date(logbook.date)
      );

      if (!hasMeterReplacement && logbook.openingHourMeter !== previousLogbook.closingHourMeter) {
        flags.push({
          id: generateId(),
          code: 'READING_GAP',
          message: `Opening reading (${logbook.openingHourMeter}) does not match previous closing (${previousLogbook.closingHourMeter})`,
          severity: 'error',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. Validate closing >= opening (no negative usage)
  if (logbook.openingHourMeter !== undefined && logbook.closingHourMeter !== undefined) {
    if (logbook.closingHourMeter < logbook.openingHourMeter) {
      flags.push({
        id: generateId(),
        code: 'NEGATIVE_USAGE',
        message: 'Closing reading cannot be less than opening reading',
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (logbook.openingOdometer !== undefined && logbook.closingOdometer !== undefined) {
    if (logbook.closingOdometer < logbook.openingOdometer) {
      flags.push({
        id: generateId(),
        code: 'NEGATIVE_USAGE',
        message: 'Closing odometer cannot be less than opening odometer',
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 3. Validate im plausible usage
  const config = await getLogbookConfiguration(logbook.siteId || logbook.plantId);
  if (logbook.calculatedOperatingHours && config) {
    if (logbook.calculatedOperatingHours > config.maxOperatingHoursPerDay) {
      flags.push({
        id: generateId(),
        code: 'IMPLAUSIBLE_USAGE',
        message: `Operating hours (${logbook.calculatedOperatingHours}) exceed maximum (${config.maxOperatingHoursPerDay})`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (logbook.calculatedKilometres && config) {
    if (logbook.calculatedKilometres > config.maxKilometresPerDay) {
      flags.push({
        id: generateId(),
        code: 'IMPLAUSIBLE_USAGE',
        message: `Kilometres (${logbook.calculatedKilometres}) exceed maximum (${config.maxKilometresPerDay})`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 4. Validate time split reconciliation
  const totalSplitHours = logbook.productiveHours + logbook.idleHours + logbook.standbyHours + logbook.breakdownHours;
  const reportedHours = logbook.calculatedOperatingHours || 0;
  
  if (config && Math.abs(totalSplitHours - reportedHours) > config.timeSplitToleranceHours) {
    flags.push({
      id: generateId(),
      code: 'TIME_SPLIT_MISMATCH',
      message: `Time split (${totalSplitHours}h) does not match reported hours (${reportedHours}h) within tolerance`,
      severity: 'warning',
      createdAt: new Date().toISOString(),
    });
  }

  // 5. Validate asset allocation
  const allocation = await getActiveAllocation(logbook.assetId);
  if (!allocation) {
    flags.push({
      id: generateId(),
      code: 'UNASSIGNED_ASSET',
      message: 'Asset is not currently allocated',
      severity: 'error',
      createdAt: new Date().toISOString(),
    });
  } else {
    // Check if allocation matches logbook location
    if (logbook.projectId && allocation.projectId !== logbook.projectId) {
      flags.push({
        id: generateId(),
        code: 'UNASSIGNED_ASSET',
        message: 'Asset is not allocated to this project',
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 6. Validate operator assignment (Part 05)
  const operator = await getOperator(logbook.operatorId);
  if (!operator) {
    flags.push({
      id: generateId(),
      code: 'UNAUTHORIZED_OPERATOR',
      message: 'Operator not found',
      severity: 'error',
      createdAt: new Date().toISOString(),
    });
  }

  return flags;
}

async function getPreviousLogbook(assetId: string, date: string): Promise<EquipmentLogbook | null> {
  const allLogbooks = await logbooksStore.findAll({ assetId } as Partial<EquipmentLogbook>);
  const previousLogbooks = allLogbooks
    .filter(l => l.date < date && l.status === 'approved')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return previousLogbooks[0] || null;
}

// ============================================================================
// Approval Workflow
// ============================================================================

export async function submitLogbook(
  id: string,
  userId: string
): Promise<EquipmentLogbook> {
  await hasPermission({
    userId,
    role: 'operator',
    action: 'submit',
    resource: 'equipment_logbook',
  });

  const logbook = await logbooksStore.findById(id);
  if (!logbook) {
    throw new Error(`Logbook ${id} not found`);
  }

  if (logbook.status !== 'draft') {
    throw new Error(`Logbook is not in draft status (current: ${logbook.status})`);
  }

  // Check for critical validation errors
  const criticalErrors = logbook.validationFlags.filter(f => f.severity === 'error');
  if (criticalErrors.length > 0) {
    throw new Error(`Cannot submit logbook with ${criticalErrors.length} critical validation error(s)`);
  }

  const updated = await logbooksStore.update(id, {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    submittedBy: userId,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'EquipmentLogbook',
    entityId: id,
    action: 'submit',
    before: logbook as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Logbook submitted for approval',
  });

  return updated;
}

export async function approveLogbook(
  id: string,
  userId: string
): Promise<EquipmentLogbook> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'approve',
    resource: 'equipment_logbook',
  });

  const logbook = await logbooksStore.findById(id);
  if (!logbook) {
    throw new Error(`Logbook ${id} not found`);
  }

  if (logbook.status !== 'submitted') {
    throw new Error(`Logbook is not in submitted status (current: ${logbook.status})`);
  }

  // Maker-checker: cannot approve own logbook
  if (logbook.submittedBy === userId) {
    throw new Error('Cannot approve your own logbook');
  }

  const updated = await logbooksStore.update(id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: userId,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'EquipmentLogbook',
    entityId: id,
    action: 'approve',
    before: logbook as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Logbook approved',
  });

  return updated;
}

export async function rejectLogbook(
  id: string,
  reason: string,
  userId: string
): Promise<EquipmentLogbook> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'reject',
    resource: 'equipment_logbook',
  });

  const logbook = await logbooksStore.findById(id);
  if (!logbook) {
    throw new Error(`Logbook ${id} not found`);
  }

  if (logbook.status !== 'submitted') {
    throw new Error(`Logbook is not in submitted status (current: ${logbook.status})`);
  }

  const updated = await logbooksStore.update(id, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'EquipmentLogbook',
    entityId: id,
    action: 'reject',
    before: logbook as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason,
  });

  return updated;
}

// ============================================================================
// Configuration Management
// ============================================================================

export async function getLogbookConfiguration(siteOrPlantId?: string): Promise<LogbookConfiguration | null> {
  if (siteOrPlantId) {
    const config = await configStore.findOne({ siteId: siteOrPlantId } as Partial<LogbookConfiguration>);
    if (config) return config;
    
    const plantConfig = await configStore.findOne({ plantId: siteOrPlantId } as Partial<LogbookConfiguration>);
    if (plantConfig) return plantConfig;
  }
  
  // Return default configuration
  const allConfigs = await configStore.findAll();
  return allConfigs[0] || null;
}

export async function createLogbookConfiguration(
  data: Omit<LogbookConfiguration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LogbookConfiguration> {
  const config: LogbookConfiguration = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return configStore.create(config);
}

// ============================================================================
// Activity and Reason Codes
// ============================================================================

export async function listActivityCodes(): Promise<ActivityCode[]> {
  return activityCodesStore.findAll({ isActive: true } as Partial<ActivityCode>);
}

export async function listReasonCodes(type?: string): Promise<ReasonCode[]> {
  let codes = await reasonCodesStore.findAll({ isActive: true } as Partial<ReasonCode>);
  if (type) {
    codes = codes.filter(c => c.type === type);
  }
  return codes;
}

// ============================================================================
// Utilization Calculations
// ============================================================================

export async function calculateAssetUtilization(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalOperatingHours: number;
  totalKilometres: number;
  productiveHours: number;
  idleHours: number;
  standbyHours: number;
  breakdownHours: number;
  logbookCount: number;
}> {
  const logbooks = await logbooksStore.findAll({ assetId } as Partial<EquipmentLogbook>);
  
  const filteredLogbooks = logbooks.filter(l => 
    l.date >= startDate && 
    l.date <= endDate && 
    l.status === 'approved'
  );

  const totals = filteredLogbooks.reduce(
    (acc, l) => ({
      totalOperatingHours: acc.totalOperatingHours + (l.calculatedOperatingHours || 0),
      totalKilometres: acc.totalKilometres + (l.calculatedKilometres || 0),
      productiveHours: acc.productiveHours + l.productiveHours,
      idleHours: acc.idleHours + l.idleHours,
      standbyHours: acc.standbyHours + l.standbyHours,
      breakdownHours: acc.breakdownHours + l.breakdownHours,
      logbookCount: acc.logbookCount + 1,
    }),
    {
      totalOperatingHours: 0,
      totalKilometres: 0,
      productiveHours: 0,
      idleHours: 0,
      standbyHours: 0,
      breakdownHours: 0,
      logbookCount: 0,
    }
  );

  return totals;
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedActivityCodes(): Promise<void> {
  const existing = await activityCodesStore.findAll();
  if (existing.length > 0) return;

  const codes: Omit<ActivityCode, 'id'>[] = [
    { code: 'EXC001', name: 'Excavation', category: 'excavation', defaultUnit: 'm³', isActive: true },
    { code: 'LOD001', name: 'Loading', category: 'loading', defaultUnit: 'tonnes', isActive: true },
    { code: 'HAU001', name: 'Hauling', category: 'hauling', defaultUnit: 'trips', isActive: true },
    { code: 'CMP001', name: 'Compaction', category: 'compaction', defaultUnit: 'm³', isActive: true },
    { code: 'PMP001', name: 'Concrete Pumping', category: 'pumping', defaultUnit: 'm³', isActive: true },
    { code: 'LFT001', name: 'Lifting', category: 'lifting', defaultUnit: 'tonnes', isActive: true },
    { code: 'DRL001', name: 'Drilling', category: 'drilling', defaultUnit: 'm', isActive: true },
  ];

  for (const code of codes) {
    await activityCodesStore.create({ ...code, id: generateId() });
  }
}

export async function seedReasonCodes(): Promise<void> {
  const existing = await reasonCodesStore.findAll();
  if (existing.length > 0) return;

  const codes: Omit<ReasonCode, 'id'>[] = [
    // Productive
    { code: 'PROD_NORMAL', name: 'Normal Operation', type: 'productive', isActive: true },
    { code: 'PROD_OVERTIME', name: 'Overtime Work', type: 'productive', isActive: true },
    
    // Idle
    { code: 'IDLE_WAIT_MATERIAL', name: 'Waiting for Material', type: 'idle', isActive: true },
    { code: 'IDLE_WAIT_INSTRUCTION', name: 'Waiting for Instruction', type: 'idle', isActive: true },
    { code: 'IDLE_WEATHER', name: 'Weather Delay', type: 'idle', isActive: true },
    { code: 'IDLE_OTHER', name: 'Other Idle', type: 'idle', isActive: true },
    
    // Standby
    { code: 'STBY_AVAILABLE', name: 'Available on Standby', type: 'standby', isActive: true },
    { code: 'STBY_RESERVED', name: 'Reserved for Future Work', type: 'standby', isActive: true },
    
    // Breakdown
    { code: 'BD_MECHANICAL', name: 'Mechanical Breakdown', type: 'breakdown', isActive: true },
    { code: 'BD_ELECTRICAL', name: 'Electrical Breakdown', type: 'breakdown', isActive: true },
    { code: 'BD_HYDRAULIC', name: 'Hydraulic Breakdown', type: 'breakdown', isActive: true },
    { code: 'BD_OTHER', name: 'Other Breakdown', type: 'breakdown', isActive: true },
  ];

  for (const code of codes) {
    await reasonCodesStore.create({ ...code, id: generateId() });
  }
}

export async function seedDefaultConfiguration(): Promise<void> {
  const existing = await configStore.findAll();
  if (existing.length > 0) return;

  const config: Omit<LogbookConfiguration, 'id' | 'createdAt' | 'updatedAt'> = {
    cutoffTime: '23:59',
    timezone: 'Asia/Kolkata',
    maxOperatingHoursPerDay: 24,
    maxKilometresPerDay: 1000,
    timeSplitToleranceHours: 0.5,
    hoursPrecision: 1,
    kilometresPrecision: 0,
    litresPrecision: 1,
    raiseAlertForMissingLogbook: true,
    alertLeadTimeMinutes: 60,
  };

  await configStore.create({
    ...config,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}
