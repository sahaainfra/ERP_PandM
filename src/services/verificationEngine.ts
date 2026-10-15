/**
 * Part 10 — Fuel Verification Calculation Engine
 * 
 * Calculates daily fuel consumption verification with benchmark comparison
 */

import { storage } from './storage';
import { 
  DailyFuelVerification, 
  VerificationResultStatus, 
  FuelConsumptionMethod,
  InstrumentVerificationStatus,
  FullTankWindow,
  FullTankDailyAllocation
} from './fuelVerificationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getAsset } from './assets';
import { listLogbooks } from './logbookService';
import { listFuelIssues } from './fuelIssues';
import { getApplicableBenchmark, calculateConditionMultiplier } from './benchmarkService';

const verificationsStore = storage.getAdapter<DailyFuelVerification>('daily_fuel_verifications');
const fullTankWindowsStore = storage.getAdapter<FullTankWindow>('full_tank_windows');

// ============================================================================
// Daily Verification Calculation
// ============================================================================

export async function calculateDailyVerification(
  assetId: string,
  date: string,
  method: FuelConsumptionMethod = 'tank_level'
): Promise<DailyFuelVerification> {
  const asset = await getAsset(assetId);
  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  // Get applicable benchmark
  const benchmark = await getApplicableBenchmark(assetId, date);
  
  if (!benchmark) {
    // No benchmark - create not_evaluable result
    return createNotEvaluableResult(assetId, date, 'BENCHMARK_MISSING');
  }

  // Get approved logbooks for the day (Part 08)
  const logbooks = await listLogbooks({ assetId, date, status: 'approved' });
  
  if (logbooks.length === 0) {
    // No approved logbooks - create missing result
    return createMissingResult(assetId, date);
  }

  // Calculate approved usage
  const approvedUsageHours = logbooks.reduce((sum, l) => sum + (l.calculatedOperatingHours || 0), 0);
  const approvedUsageKilometres = logbooks.reduce((sum, l) => sum + (l.calculatedKilometres || 0), 0);

  // Check minimum usage
  const meetsMinimumUsage = 
    (benchmark.unit === 'L/hr' && approvedUsageHours >= benchmark.minimumUsageHours) ||
    (benchmark.unit === 'L/km' && approvedUsageKilometres >= benchmark.minimumUsageKilometres);

  if (!meetsMinimumUsage) {
    return createNotEvaluableResult(assetId, date, 'USAGE_BELOW_MINIMUM', approvedUsageHours, approvedUsageKilometres);
  }

  // Calculate fuel consumed based on method
  let fuelConsumed = 0;
  let instrumentsUsed: InstrumentVerificationStatus[] = [];
  let allInstrumentsValid = true;

  switch (method) {
    case 'tank_level':
      const tankResult = await calculateTankLevelMethod(assetId, date);
      fuelConsumed = tankResult.fuelConsumed;
      instrumentsUsed = tankResult.instrumentsUsed;
      allInstrumentsValid = tankResult.allInstrumentsValid;
      break;

    case 'full_tank_to_full_tank':
      const ftResult = await calculateFullTankMethod(assetId, date);
      fuelConsumed = ftResult.fuelConsumed;
      instrumentsUsed = ftResult.instrumentsUsed;
      allInstrumentsValid = ftResult.allInstrumentsValid;
      break;

    case 'telematics':
      // Telematics method - placeholder for Part 12 integration
      fuelConsumed = 0;
      break;
  }

  // Check if any instruments are unverified
  if (!allInstrumentsValid) {
    return createUnverifiedResult(
      assetId, 
      date, 
      fuelConsumed, 
      approvedUsageHours, 
      approvedUsageKilometres,
      instrumentsUsed,
      benchmark
    );
  }

  // Calculate condition factor multiplier
  // In a real implementation, this would come from logbook data or telematics
  const conditions = {}; // Placeholder - would extract from logbook
  const conditionMultiplier = calculateConditionMultiplier(benchmark, conditions);

  // Calculate expected fuel
  const approvedUsage = benchmark.unit === 'L/hr' ? approvedUsageHours : approvedUsageKilometres;
  const expectedFuel = benchmark.baseValue * conditionMultiplier * approvedUsage;

  // Calculate actual rate
  const actualRate = fuelConsumed / approvedUsage;

  // Calculate variance
  const varianceLitres = fuelConsumed - expectedFuel;
  const variancePercent = expectedFuel > 0 ? (varianceLitres / expectedFuel) * 100 : 0;

  // Classify result
  const resultStatus = classifyResult(
    variancePercent,
    varianceLitres,
    fuelConsumed,
    approvedUsage,
    benchmark
  );

  // Get historical verifications for trend analysis
  const historicalVerifications = await getHistoricalVerifications(assetId, date, 30);
  const rolling7DayVariance = calculateRollingVariance(historicalVerifications, 7);
  const rolling30DayVariance = calculateRollingVariance(historicalVerifications, 30);
  const consecutiveWarningDays = countConsecutiveDays(historicalVerifications, 'warning', 7);

  // Create verification record
  const verification: DailyFuelVerification = {
    id: generateId(),
    date,
    assetId,
    consumptionMethod: method,
    fuelConsumed: Math.round(fuelConsumed * 10) / 10, // Round to 0.1
    approvedUsageHours: Math.round(approvedUsageHours * 10) / 10,
    approvedUsageKilometres: Math.round(approvedUsageKilometres),
    benchmarkId: benchmark.id,
    benchmarkVersion: benchmark.version,
    conditionFactorMultiplier: conditionMultiplier,
    expectedFuel: Math.round(expectedFuel * 10) / 10,
    actualRate: Math.round(actualRate * 100) / 100, // Round to 0.01
    varianceLitres: Math.round(varianceLitres * 10) / 10,
    variancePercent: Math.round(variancePercent * 10) / 10,
    resultStatus,
    instrumentsUsed,
    allInstrumentsValid,
    isProvisional: false,
    telematicsSourceMismatch: false,
    rolling7DayVariance,
    rolling30DayVariance,
    consecutiveWarningDays,
    revisionNumber: 1,
    signedOff: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await verificationsStore.create(verification);

  // Raise alerts based on result
  await raiseVerificationAlerts(verification, benchmark);

  await recordAudit({
    entityType: 'DailyFuelVerification',
    entityId: verification.id,
    action: 'create',
    before: null,
    after: verification as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Daily fuel verification calculated for ${date}`,
  });

  return verification;
}

// ============================================================================
// Fuel Consumption Methods
// ============================================================================

async function calculateTankLevelMethod(
  assetId: string, 
  date: string
): Promise<{
  fuelConsumed: number;
  instrumentsUsed: InstrumentVerificationStatus[];
  allInstrumentsValid: boolean;
}> {
  // Get fuel issues for the day (Part 09)
  const issues = await listFuelIssues({ assetId, fromDate: date, toDate: date, status: 'approved' });
  const fuelIssued = issues.reduce((sum, i) => sum + i.quantity, 0);

  // In a real implementation, this would:
  // 1. Get opening tank level from sensor/dip at start of day
  // 2. Get closing tank level from sensor/dip at end of day
  // 3. Calculate: consumed = opening + issued - closing
  
  // For demo, we'll use a simplified calculation
  // Assume opening level from previous day's closing
  const previousVerifications = await verificationsStore.findAll({ assetId } as any);
  const previousDay = previousVerifications
    .filter(v => v.date < date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const openingLevel = previousDay ? previousDay.closingTankLevel || 0 : 200; // Default 200L
  const closingLevel = openingLevel + fuelIssued - 50; // Assume 50L consumed for demo

  const fuelConsumed = openingLevel + fuelIssued - closingLevel;

  // Check instrument calibration status
  const instrumentsUsed: InstrumentVerificationStatus[] = [];
  let allInstrumentsValid = true;

  // In a real implementation, would check fuel level sensor calibration
  // For demo, assume all valid
  instrumentsUsed.push({
    instrumentId: 'fuel_sensor_1',
    instrumentType: 'fuel_sensor',
    calibrationStatus: 'valid',
    isValid: true,
    lastCalibrationDate: '2024-01-01',
    nextDueDate: '2025-01-01',
  });

  return {
    fuelConsumed,
    instrumentsUsed,
    allInstrumentsValid,
  };
}

async function calculateFullTankMethod(
  assetId: string,
  date: string
): Promise<{
  fuelConsumed: number;
  instrumentsUsed: InstrumentVerificationStatus[];
  allInstrumentsValid: boolean;
  isProvisional: boolean;
  windowId?: string;
}> {
  // Check if there's an open full-tank window
  const windows = await fullTankWindowsStore.findAll({ assetId, status: 'open' } as any);
  const openWindow = windows[0];

  if (!openWindow) {
    // No open window - this day starts a new window
    // Return provisional result
    return {
      fuelConsumed: 0,
      instrumentsUsed: [],
      allInstrumentsValid: true,
      isProvisional: true,
    };
  }

  // Check if this day closes the window (full tank fill recorded)
  // In a real implementation, would check for full-tank fill on this date
  // For demo, assume window closes after 3 days
  
  const windowDays = Math.ceil(
    (new Date(date).getTime() - new Date(openWindow.openingFillDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (windowDays >= 3) {
    // Close the window
    const closingFillLitres = 150; // Demo value
    const closingMeterReading = openWindow.openingMeterReading + 300; // Demo: 300 km

    const totalFuelConsumed = closingFillLitres;
    const totalUsageKilometres = closingMeterReading - openWindow.openingMeterReading;

    // Allocate fuel and usage to each day in the window
    const dailyAllocation = totalFuelConsumed / windowDays;
    const dailyUsage = totalUsageKilometres / windowDays;

    // Update window
    await fullTankWindowsStore.update(openWindow.id, {
      status: 'closed',
      closingFillDate: date,
      closingFillLitres,
      closingMeterReading,
      totalFuelConsumed,
      totalUsageKilometres,
      updatedAt: new Date().toISOString(),
    });

    return {
      fuelConsumed: dailyAllocation,
      instrumentsUsed: [],
      allInstrumentsValid: true,
      isProvisional: false,
      windowId: openWindow.id,
    };
  }

  // Window still open - provisional result
  return {
    fuelConsumed: 0,
    instrumentsUsed: [],
    allInstrumentsValid: true,
    isProvisional: true,
    windowId: openWindow.id,
  };
}

// ============================================================================
// Result Classification
// ============================================================================

function classifyResult(
  variancePercent: number,
  varianceLitres: number,
  fuelConsumed: number,
  approvedUsage: number,
  benchmark: any
): VerificationResultStatus {
  // Fuel without usage
  if (approvedUsage === 0 && fuelConsumed > benchmark.absoluteMinimumToleranceLitres) {
    return 'fuel_without_usage';
  }

  // Within absolute minimum tolerance
  if (Math.abs(varianceLitres) <= benchmark.absoluteMinimumToleranceLitres) {
    return 'within_tolerance';
  }

  // Check warning band
  if (
    variancePercent >= benchmark.warningToleranceLower &&
    variancePercent <= benchmark.warningToleranceUpper
  ) {
    return 'within_tolerance';
  }

  // Check critical band
  if (
    variancePercent >= benchmark.criticalToleranceLower &&
    variancePercent <= benchmark.criticalToleranceUpper
  ) {
    return 'warning';
  }

  // Outside critical band
  return 'critical';
}

// ============================================================================
// Helper Functions
// ============================================================================

async function createNotEvaluableResult(
  assetId: string,
  date: string,
  reason: string,
  usageHours: number = 0,
  usageKilometres: number = 0
): Promise<DailyFuelVerification> {
  const verification: DailyFuelVerification = {
    id: generateId(),
    date,
    assetId,
    consumptionMethod: 'tank_level',
    fuelConsumed: 0,
    approvedUsageHours: usageHours,
    approvedUsageKilometres: usageKilometres,
    benchmarkId: '',
    benchmarkVersion: 0,
    conditionFactorMultiplier: 1,
    expectedFuel: 0,
    actualRate: 0,
    varianceLitres: 0,
    variancePercent: 0,
    resultStatus: 'not_evaluable',
    instrumentsUsed: [],
    allInstrumentsValid: true,
    isProvisional: false,
    telematicsSourceMismatch: false,
    revisionNumber: 1,
    signedOff: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await verificationsStore.create(verification);

  if (reason === 'BENCHMARK_MISSING') {
    await raiseAlert({
      ruleCode: 'BENCHMARK_MISSING',
      severity: 'warning',
      title: `Benchmark Missing for Asset`,
      description: `No benchmark found for asset ${assetId} on ${date}`,
      module: 'Fuel Verification',
      entityType: 'DailyFuelVerification',
      entityId: verification.id,
      responsibleRole: 'fleet_manager',
      recommendedAction: 'Create or assign a benchmark for this asset',
      dueInHours: 48,
      requestId: generateId(),
    });
  }

  return verification;
}

async function createMissingResult(
  assetId: string,
  date: string
): Promise<DailyFuelVerification> {
  const verification: DailyFuelVerification = {
    id: generateId(),
    date,
    assetId,
    consumptionMethod: 'tank_level',
    fuelConsumed: 0,
    approvedUsageHours: 0,
    approvedUsageKilometres: 0,
    benchmarkId: '',
    benchmarkVersion: 0,
    conditionFactorMultiplier: 1,
    expectedFuel: 0,
    actualRate: 0,
    varianceLitres: 0,
    variancePercent: 0,
    resultStatus: 'missing',
    instrumentsUsed: [],
    allInstrumentsValid: true,
    isProvisional: false,
    telematicsSourceMismatch: false,
    revisionNumber: 1,
    signedOff: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await verificationsStore.create(verification);

  await raiseAlert({
    ruleCode: 'FUEL_VERIFICATION_MISSING',
    severity: 'high',
    title: `Fuel Verification Missing`,
    description: `No approved logbooks found for asset ${assetId} on ${date}`,
    module: 'Fuel Verification',
    entityType: 'DailyFuelVerification',
    entityId: verification.id,
    responsibleRole: 'fleet_supervisor',
    recommendedAction: 'Ensure operator submits and gets approval for daily logbook',
    dueInHours: 24,
    requestId: generateId(),
  });

  return verification;
}

async function createUnverifiedResult(
  assetId: string,
  date: string,
  fuelConsumed: number,
  usageHours: number,
  usageKilometres: number,
  instrumentsUsed: InstrumentVerificationStatus[],
  benchmark: any
): Promise<DailyFuelVerification> {
  const approvedUsage = benchmark.unit === 'L/hr' ? usageHours : usageKilometres;
  const expectedFuel = benchmark.baseValue * approvedUsage;
  const actualRate = approvedUsage > 0 ? fuelConsumed / approvedUsage : 0;
  const varianceLitres = fuelConsumed - expectedFuel;
  const variancePercent = expectedFuel > 0 ? (varianceLitres / expectedFuel) * 100 : 0;

  const verification: DailyFuelVerification = {
    id: generateId(),
    date,
    assetId,
    consumptionMethod: 'tank_level',
    fuelConsumed: Math.round(fuelConsumed * 10) / 10,
    approvedUsageHours: Math.round(usageHours * 10) / 10,
    approvedUsageKilometres: Math.round(usageKilometres),
    benchmarkId: benchmark.id,
    benchmarkVersion: benchmark.version,
    conditionFactorMultiplier: 1,
    expectedFuel: Math.round(expectedFuel * 10) / 10,
    actualRate: Math.round(actualRate * 100) / 100,
    varianceLitres: Math.round(varianceLitres * 10) / 10,
    variancePercent: Math.round(variancePercent * 10) / 10,
    resultStatus: 'unverified',
    instrumentsUsed,
    allInstrumentsValid: false,
    isProvisional: false,
    telematicsSourceMismatch: false,
    revisionNumber: 1,
    signedOff: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await verificationsStore.create(verification);

  await raiseAlert({
    ruleCode: 'CALIBRATION_OVERDUE',
    severity: 'high',
    title: `Unverified Fuel Consumption`,
    description: `Fuel consumption for asset ${assetId} on ${date} cannot be verified due to invalid instrument calibration`,
    module: 'Fuel Verification',
    entityType: 'DailyFuelVerification',
    entityId: verification.id,
    responsibleRole: 'calibration_officer',
    recommendedAction: 'Calibrate instruments and re-run verification',
    dueInHours: 24,
    requestId: generateId(),
  });

  return verification;
}

async function getHistoricalVerifications(
  assetId: string,
  beforeDate: string,
  days: number
): Promise<DailyFuelVerification[]> {
  const allVerifications = await verificationsStore.findAll({ assetId } as any);
  const cutoffDate = new Date(beforeDate);
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allVerifications
    .filter(v => new Date(v.date) >= cutoffDate && new Date(v.date) < new Date(beforeDate))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function calculateRollingVariance(verifications: DailyFuelVerification[], days: number): number | undefined {
  if (verifications.length < days) return undefined;

  const recentVerifications = verifications.slice(-days);
  const totalVariance = recentVerifications.reduce((sum, v) => sum + v.varianceLitres, 0);
  
  return Math.round(totalVariance * 10) / 10;
}

function countConsecutiveDays(
  verifications: DailyFuelVerification[], 
  status: VerificationResultStatus,
  maxDays: number
): number | undefined {
  if (verifications.length === 0) return undefined;

  let count = 0;
  for (let i = verifications.length - 1; i >= Math.max(0, verifications.length - maxDays); i--) {
    if (verifications[i].resultStatus === status) {
      count++;
    } else {
      break;
    }
  }

  return count > 0 ? count : undefined;
}

async function raiseVerificationAlerts(
  verification: DailyFuelVerification,
  benchmark: any
): Promise<void> {
  // Critical variance
  if (verification.resultStatus === 'critical') {
    await raiseAlert({
      ruleCode: verification.varianceLitres > 0 ? 'FUEL_VARIANCE_CRITICAL' : 'FUEL_UNDER_CONSUMPTION',
      severity: 'critical',
      title: `Critical Fuel Variance`,
      description: `Asset ${verification.assetId} on ${verification.date}: ${verification.varianceLitres > 0 ? 'Over' : 'Under'}-consumption of ${Math.abs(verification.varianceLitres).toFixed(1)}L (${verification.variancePercent.toFixed(1)}%)`,
      module: 'Fuel Verification',
      entityType: 'DailyFuelVerification',
      entityId: verification.id,
      responsibleRole: 'fleet_manager',
      recommendedAction: 'Investigate root cause and open investigation',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  // Warning variance
  if (verification.resultStatus === 'warning') {
    await raiseAlert({
      ruleCode: 'FUEL_VARIANCE_WARNING',
      severity: 'warning',
      title: `Fuel Variance Warning`,
      description: `Asset ${verification.assetId} on ${verification.date}: Variance of ${verification.varianceLitres.toFixed(1)}L (${verification.variancePercent.toFixed(1)}%)`,
      module: 'Fuel Verification',
      entityType: 'DailyFuelVerification',
      entityId: verification.id,
      responsibleRole: 'fleet_supervisor',
      recommendedAction: 'Monitor and investigate if trend continues',
      dueInHours: 48,
      requestId: generateId(),
    });
  }

  // Fuel without usage
  if (verification.resultStatus === 'fuel_without_usage') {
    await raiseAlert({
      ruleCode: 'FUEL_WITHOUT_USAGE',
      severity: 'critical',
      title: `Fuel Consumed Without Usage`,
      description: `Asset ${verification.assetId} on ${verification.date}: ${verification.fuelConsumed.toFixed(1)}L consumed with zero approved usage`,
      module: 'Fuel Verification',
      entityType: 'DailyFuelVerification',
      entityId: verification.id,
      responsibleRole: 'fleet_manager',
      recommendedAction: 'Investigate immediately - possible unrecorded usage or theft',
      dueInHours: 12,
      requestId: generateId(),
    });
  }

  // Trend drift
  if (verification.consecutiveWarningDays && verification.consecutiveWarningDays >= 3) {
    await raiseAlert({
      ruleCode: 'FUEL_TREND_DRIFT',
      severity: 'high',
      title: `Fuel Consumption Trend Drift`,
      description: `Asset ${verification.assetId}: ${verification.consecutiveWarningDays} consecutive days of warning-level variance`,
      module: 'Fuel Verification',
      entityType: 'DailyFuelVerification',
      entityId: verification.id,
      responsibleRole: 'fleet_manager',
      recommendedAction: 'Investigate pattern and consider benchmark review',
      dueInHours: 48,
      requestId: generateId(),
    });
  }
}

// ============================================================================
// Verification Queries
// ============================================================================

export async function getVerification(id: string): Promise<DailyFuelVerification | null> {
  return verificationsStore.findById(id);
}

export async function listVerifications(filters?: {
  assetId?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
  resultStatus?: string;
}): Promise<DailyFuelVerification[]> {
  let verifications = await verificationsStore.findAll();

  if (filters?.assetId) {
    verifications = verifications.filter(v => v.assetId === filters.assetId);
  }
  if (filters?.date) {
    verifications = verifications.filter(v => v.date === filters.date);
  }
  if (filters?.fromDate) {
    verifications = verifications.filter(v => v.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    verifications = verifications.filter(v => v.date <= filters.toDate!);
  }
  if (filters?.resultStatus) {
    verifications = verifications.filter(v => v.resultStatus === filters.resultStatus);
  }

  return verifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getVerificationStatistics(filters?: {
  assetId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalVerifications: number;
  withinTolerance: number;
  warning: number;
  critical: number;
  missing: number;
  unverified: number;
  notEvaluable: number;
  totalVarianceLitres: number;
}> {
  let verifications = await verificationsStore.findAll();

  if (filters?.assetId) {
    verifications = verifications.filter(v => v.assetId === filters.assetId);
  }
  if (filters?.fromDate) {
    verifications = verifications.filter(v => v.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    verifications = verifications.filter(v => v.date <= filters.toDate!);
  }

  return {
    totalVerifications: verifications.length,
    withinTolerance: verifications.filter(v => v.resultStatus === 'within_tolerance').length,
    warning: verifications.filter(v => v.resultStatus === 'warning').length,
    critical: verifications.filter(v => v.resultStatus === 'critical').length,
    missing: verifications.filter(v => v.resultStatus === 'missing').length,
    unverified: verifications.filter(v => v.resultStatus === 'unverified').length,
    notEvaluable: verifications.filter(v => v.resultStatus === 'not_evaluable').length,
    totalVarianceLitres: verifications.reduce((sum, v) => sum + Math.abs(v.varianceLitres), 0),
  };
}
