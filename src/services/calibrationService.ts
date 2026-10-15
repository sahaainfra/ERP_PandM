/**
 * Part 10 — Calibration Service
 * 
 * Manages instrument calibrations, tank calibration charts, and field checks
 */

import { storage } from './storage';
import { CalibrationRecord, TankCalibrationChart, FieldCheck, CalibrationStatus } from './fuelVerificationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';

const calibrationsStore = storage.getAdapter<CalibrationRecord>('calibration_records');
const tankChartsStore = storage.getAdapter<TankCalibrationChart>('tank_calibration_charts');
const fieldChecksStore = storage.getAdapter<FieldCheck>('field_checks');

// ============================================================================
// Calibration Records
// ============================================================================

export async function createCalibrationRecord(
   Omit<CalibrationRecord, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<CalibrationRecord> {
  // Determine status based on next due date
  const now = new Date();
  const nextDue = new Date(inputData.nextDueDate);
  const daysUntilDue = (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  let status: CalibrationStatus = 'valid';
  if (inputData.result === 'fail') {
    status = 'out_of_service';
  } else if (daysUntilDue < 0) {
    status = 'overdue';
  } else if (daysUntilDue <= 7) {
    status = 'due_soon';
  }

  const calibration: CalibrationRecord = {
    ...inputData,
    id: generateId(),
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await calibrationsStore.create(calibration);

  await recordAudit({
    entityType: 'CalibrationRecord',
    entityId: calibration.id,
    action: 'create',
    before: null,
    after: calibration as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Calibration record created',
  });

  return calibration;
}

export async function getCalibrationRecord(id: string): Promise<CalibrationRecord | null> {
  return calibrationsStore.findById(id);
}

export async function getLatestCalibration(instrumentId: string): Promise<CalibrationRecord | null> {
  const all = await calibrationsStore.findAll();
  const instrumentCalibrations = all
    .filter(c => c.instrumentId === instrumentId)
    .sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
  
  return instrumentCalibrations[0] || null;
}

export async function listCalibrationRecords(filters?: {
  instrumentId?: string;
  status?: CalibrationStatus;
  fromDate?: string;
  toDate?: string;
}): Promise<CalibrationRecord[]> {
  let records = await calibrationsStore.findAll();

  if (filters?.instrumentId) {
    records = records.filter(r => r.instrumentId === filters.instrumentId);
  }
  if (filters?.status) {
    records = records.filter(r => r.status === filters.status);
  }
  if (filters?.fromDate) {
    records = records.filter(r => r.calibrationDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    records = records.filter(r => r.calibrationDate <= filters.toDate!);
  }

  return records.sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
}

export async function updateCalibrationStatus(instrumentId: string): Promise<void> {
  const latestCalibration = await getLatestCalibration(instrumentId);
  if (!latestCalibration) return;

  const now = new Date();
  const nextDue = new Date(latestCalibration.nextDueDate);
  const daysUntilDue = (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  
  let newStatus: CalibrationStatus = 'valid';
  if (latestCalibration.result === 'fail') {
    newStatus = 'out_of_service';
  } else if (daysUntilDue < 0) {
    newStatus = 'overdue';
    
    // Raise alert for overdue calibration
    await raiseAlert({
      ruleCode: 'CALIBRATION_OVERDUE',
      severity: 'high',
      title: `Calibration Overdue`,
      description: `Instrument ${instrumentId} calibration is overdue (due: ${latestCalibration.nextDueDate})`,
      module: 'Fuel Verification',
      entityType: 'CalibrationRecord',
      entityId: latestCalibration.id,
      responsibleRole: 'calibration_officer',
      recommendedAction: 'Schedule calibration immediately',
      dueInHours: 24,
      requestId: generateId(),
    });
  } else if (daysUntilDue <= 7) {
    newStatus = 'due_soon';
    
    // Raise alert for calibration due soon
    await raiseAlert({
      ruleCode: 'CALIBRATION_DUE',
      severity: 'warning',
      title: `Calibration Due Soon`,
      description: `Instrument ${instrumentId} calibration is due in ${Math.round(daysUntilDue)} days`,
      module: 'Fuel Verification',
      entityType: 'CalibrationRecord',
      entityId: latestCalibration.id,
      responsibleRole: 'calibration_officer',
      recommendedAction: 'Schedule calibration',
      dueInHours: 7 * 24,
      requestId: generateId(),
    });
  }

  if (newStatus !== latestCalibration.status) {
    await calibrationsStore.update(latestCalibration.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function isInstrumentCalibratedOnDate(instrumentId: string, date: string): Promise<{
  calibrated: boolean;
  status?: CalibrationStatus;
  calibrationRecord?: CalibrationRecord;
}> {
  const all = await calibrationsStore.findAll();
  const instrumentCalibrations = all
    .filter(c => c.instrumentId === instrumentId && c.calibrationDate <= date)
    .sort((a, b) => new Date(b.calibrationDate).getTime() - new Date(a.calibrationDate).getTime());
  
  if (instrumentCalibrations.length === 0) {
    return { calibrated: false };
  }

  const calibration = instrumentCalibrations[0];
  const readingDate = new Date(date);
  const nextDueDate = new Date(calibration.nextDueDate);

  if (readingDate > nextDueDate) {
    return { calibrated: false, status: 'overdue', calibrationRecord: calibration };
  }

  if (calibration.result === 'fail') {
    return { calibrated: false, status: 'out_of_service', calibrationRecord: calibration };
  }

  return { calibrated: true, status: calibration.status, calibrationRecord: calibration };
}

// ============================================================================
// Tank Calibration Charts
// ============================================================================

export async function createTankCalibrationChart(
   Omit<TankCalibrationChart, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TankCalibrationChart> {
  // Validate entries are sorted by dip reading
  const sortedEntries = [...inputData.entries].sort((a, b) => a.dipReading - b.dipReading);
  
  const chart: TankCalibrationChart = {
    ...inputData,
    entries: sortedEntries,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await tankChartsStore.create(chart);

  await recordAudit({
    entityType: 'TankCalibrationChart',
    entityId: chart.id,
    action: 'create',
    before: null,
    after: chart as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Tank calibration chart created',
  });

  return chart;
}

export async function getTankCalibrationChart(id: string): Promise<TankCalibrationChart | null> {
  return tankChartsStore.findById(id);
}

export async function getActiveTankChartForInstrument(instrumentId: string, date: string): Promise<TankCalibrationChart | null> {
  const all = await tankChartsStore.findAll();
  const instrumentCharts = all
    .filter(c => c.instrumentId === instrumentId)
    .sort((a, b) => b.version - a.version);

  for (const chart of instrumentCharts) {
    const effectiveFrom = new Date(chart.effectiveFrom);
    const effectiveTo = chart.effectiveTo ? new Date(chart.effectiveTo) : null;
    const readingDate = new Date(date);

    if (readingDate >= effectiveFrom && (!effectiveTo || readingDate <= effectiveTo)) {
      return chart;
    }
  }

  return null;
}

export async function listTankCalibrationCharts(filters?: {
  instrumentId?: string;
}): Promise<TankCalibrationChart[]> {
  let charts = await tankChartsStore.findAll();

  if (filters?.instrumentId) {
    charts = charts.filter(c => c.instrumentId === filters.instrumentId);
  }

  return charts.sort((a, b) => b.version - a.version);
}

/**
 * Convert dip reading to volume using tank calibration chart
 */
export function dipToVolumeFromChart(dip: number, chart: TankCalibrationChart): number {
  const entries = chart.entries;

  // Find the two entries that bracket the dip reading
  let lowerEntry = entries[0];
  let upperEntry = entries[entries.length - 1];

  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].dipReading <= dip && entries[i + 1].dipReading >= dip) {
      lowerEntry = entries[i];
      upperEntry = entries[i + 1];
      break;
    }
  }

  // Linear interpolation
  if (lowerEntry.dipReading === upperEntry.dipReading) {
    return lowerEntry.volume;
  }

  const ratio = (dip - lowerEntry.dipReading) / (upperEntry.dipReading - lowerEntry.dipReading);
  return lowerEntry.volume + ratio * (upperEntry.volume - lowerEntry.volume);
}

// ============================================================================
// Field Checks
// ============================================================================

export async function createFieldCheck( Omit<FieldCheck, 'id' | 'createdAt'>): Promise<FieldCheck> {
  const fieldCheck: FieldCheck = {
    ...inputData,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  await fieldChecksStore.create(fieldCheck);

  // If check failed, raise alert
  if (fieldCheck.result === 'fail') {
    await raiseAlert({
      ruleCode: 'INSTRUMENT_CHECK_FAILED',
      severity: 'high',
      title: `Instrument Check Failed`,
      description: `Field check for instrument ${fieldCheck.instrumentId} failed on ${fieldCheck.checkDate}`,
      module: 'Fuel Verification',
      entityType: 'FieldCheck',
      entityId: fieldCheck.id,
      responsibleRole: 'calibration_officer',
      recommendedAction: 'Investigate and recalibrate instrument',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  await recordAudit({
    entityType: 'FieldCheck',
    entityId: fieldCheck.id,
    action: 'create',
    before: null,
    after: fieldCheck as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Field check recorded',
  });

  return fieldCheck;
}

export async function listFieldChecks(filters?: {
  instrumentId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<FieldCheck[]> {
  let checks = await fieldChecksStore.findAll();

  if (filters?.instrumentId) {
    checks = checks.filter(c => c.instrumentId === filters.instrumentId);
  }
  if (filters?.fromDate) {
    checks = checks.filter(c => c.checkDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    checks = checks.filter(c => c.checkDate <= filters.toDate!);
  }

  return checks.sort((a, b) => new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime());
}

export async function getLatestFieldCheck(instrumentId: string): Promise<FieldCheck | null> {
  const all = await fieldChecksStore.findAll();
  const instrumentChecks = all
    .filter(c => c.instrumentId === instrumentId)
    .sort((a, b) => new Date(b.checkDate).getTime() - new Date(a.checkDate).getTime());
  
  return instrumentChecks[0] || null;
}

// ============================================================================
// Calibration Statistics
// ============================================================================

export async function getCalibrationStatistics(): Promise<{
  totalInstruments: number;
  validCount: number;
  dueSoonCount: number;
  overdueCount: number;
  checkFailedCount: number;
  outOfServiceCount: number;
  compliancePercent: number;
}> {
  const allCalibrations = await calibrationsStore.findAll();
  
  // Get latest calibration for each instrument
  const latestByInstrument = new Map<string, CalibrationRecord>();
  for (const cal of allCalibrations) {
    const existing = latestByInstrument.get(cal.instrumentId);
    if (!existing || new Date(cal.calibrationDate) > new Date(existing.calibrationDate)) {
      latestByInstrument.set(cal.instrumentId, cal);
    }
  }

  const latestCalibrations = Array.from(latestByInstrument.values());

  return {
    totalInstruments: latestCalibrations.length,
    validCount: latestCalibrations.filter(c => c.status === 'valid').length,
    dueSoonCount: latestCalibrations.filter(c => c.status === 'due_soon').length,
    overdueCount: latestCalibrations.filter(c => c.status === 'overdue').length,
    checkFailedCount: latestCalibrations.filter(c => c.status === 'check_failed').length,
    outOfServiceCount: latestCalibrations.filter(c => c.status === 'out_of_service').length,
    compliancePercent: latestCalibrations.length > 0
      ? (latestCalibrations.filter(c => c.status === 'valid' || c.status === 'due_soon').length / latestCalibrations.length) * 100
      : 0,
  };
}
