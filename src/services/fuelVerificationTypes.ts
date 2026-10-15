/**
 * Part 10 — Fuel Verification Types
 */

import { Status } from './types';

// ============================================================================
// Calibration Management
// ============================================================================

export type CalibrationStatus = 'valid' | 'due_soon' | 'overdue' | 'check_failed' | 'out_of_service';

export interface CalibrationRecord {
  id: string;
  instrumentId: string;
  calibrationDate: string;
  performingAgency: string;
  accreditation?: string; // e.g., 'NABL-accredited'
  certificateNumber: string;
  certificateAttachmentId?: string;
  
  // Errors
  asFoundError?: number;
  asLeftError?: number;
  permittedAccuracy?: number;
  
  // Result
  result: 'pass' | 'fail';
  nextDueDate: string;
  
  // Personnel
  performedBy: string;
  approvedBy: string; // Calibration Officer (maker-checker)
  
  // Status
  status: CalibrationStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TankCalibrationChart {
  id: string;
  instrumentId: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Chart data
  entries: TankChartEntry[];
  
  // Approval
  approvedBy: string;
  approvedAt: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TankChartEntry {
  dipReading: number; // mm
  volume: number; // litres
}

export interface FieldCheck {
  id: string;
  instrumentId: string;
  checkDate: string;
  checkType: 'proving_can' | 'meter_comparison';
  
  // Measurements
  certifiedMeasure?: number; // For proving can
  instrumentReading: number;
  error: number;
  tolerance: number;
  
  // Result
  result: 'pass' | 'fail';
  
  // Personnel
  performedBy: string;
  
  // Metadata
  createdAt: string;
}

// ============================================================================
// Benchmark Register
// ============================================================================

export type BenchmarkSource = 'OEM_specification' | 'controlled_field_trial' | 'historical_baseline' | 'contract_norm';
export type BenchmarkUnit = 'L/hr' | 'L/km';

export interface FuelBenchmark {
  id: string;
  
  // Scope (resolution order: asset → make/model → category)
  assetId?: string;
  make?: string;
  model?: string;
  assetCategory?: string;
  
  // Benchmark values
  baseValue: number;
  unit: BenchmarkUnit;
  source: BenchmarkSource;
  sourceEvidenceAttachmentId?: string;
  
  // Composite benchmarks (for dual-use assets)
  isComposite: boolean;
  travelComponent?: {
    value: number;
    unit: 'L/km';
  };
  operationalComponent?: {
    value: number;
    unit: 'L/hr';
  };
  
  // Condition factors
  conditionFactors: ConditionFactor[];
  
  // Tolerances
  warningToleranceLower: number; // percentage (e.g., -10)
  warningToleranceUpper: number; // percentage (e.g., +10)
  criticalToleranceLower: number; // percentage (e.g., -20)
  criticalToleranceUpper: number; // percentage (e.g., +20)
  absoluteMinimumToleranceLitres: number; // default 5 L
  
  // Minimum usage for evaluation
  minimumUsageHours: number; // default 2 hr
  minimumUsageKilometres: number; // default 20 km
  
  // Effective dates
  effectiveFrom: string;
  effectiveTo?: string;
  version: number;
  
  // Approval (maker-checker)
  proposedBy: string;
  approvedBy: string;
  approvedAt: string;
  
  // Status
  status: 'draft' | 'approved' | 'superseded';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ConditionFactor {
  id: string;
  benchmarkId: string;
  factorType: 'duty_class' | 'attachment' | 'terrain' | 'load' | 'season';
  factorValue: string; // e.g., 'heavy', 'bucket', 'hilly'
  multiplier: number; // e.g., 1.2 for 20% increase
  approvedBy: string;
  createdAt: string;
}

export interface BenchmarkReviewSuggestion {
  id: string;
  benchmarkId: string;
  assetId?: string;
  make?: string;
  model?: string;
  
  // Analysis
  periodDays: number; // e.g., 30
  medianActual: number;
  benchmarkValue: number;
  differencePercent: number;
  
  // Suggestion
  suggestedAction: 'increase_benchmark' | 'decrease_benchmark' | 'investigate';
  reason: string;
  
  // Status
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  
  createdAt: string;
}

// ============================================================================
// Daily Verification
// ============================================================================

export type FuelConsumptionMethod = 'tank_level' | 'full_tank_to_full_tank' | 'telematics';
export type VerificationResultStatus = 
  | 'within_tolerance'
  | 'warning'
  | 'critical'
  | 'fuel_without_usage'
  | 'not_evaluable'
  | 'unverified'
  | 'provisional'
  | 'missing';

export interface DailyFuelVerification {
  id: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  
  // Method and inputs
  consumptionMethod: FuelConsumptionMethod;
  
  // Fuel consumed calculation
  openingTankLevel?: number; // litres
  fuelIssued?: number; // litres
  closingTankLevel?: number; // litres
  fuelConsumed: number; // litres
  
  // Full-tank method specifics
  fullTankWindowId?: string;
  isProvisional: boolean;
  
  // Telematics cross-check
  telematicsConsumption?: number; // litres
  telematicsSourceMismatch: boolean;
  
  // Usage (from approved logbooks)
  approvedUsageHours: number;
  approvedUsageKilometres: number;
  
  // Benchmark application
  benchmarkId: string;
  benchmarkVersion: number;
  conditionFactorMultiplier: number;
  expectedFuel: number; // litres
  
  // Variance calculation
  actualRate: number; // L/hr or L/km
  varianceLitres: number;
  variancePercent: number;
  
  // Classification
  resultStatus: VerificationResultStatus;
  
  // Instrument calibration status
  instrumentsUsed: InstrumentVerificationStatus[];
  allInstrumentsValid: boolean;
  
  // Trend analysis
  rolling7DayVariance?: number; // litres
  rolling30DayVariance?: number; // litres
  consecutiveWarningDays?: number;
  
  // Revision tracking
  revisionNumber: number;
  previousRevisionId?: string;
  reRunReason?: string;
  
  // Sign-off
  signedOff: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
  disposition?: string; // For warning/critical/missing
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentVerificationStatus {
  instrumentId: string;
  instrumentType: string;
  calibrationStatus: CalibrationStatus;
  isValid: boolean;
  lastCalibrationDate?: string;
  nextDueDate?: string;
}

export interface FullTankWindow {
  id: string;
  assetId: string;
  openingFillDate: string;
  openingFillLitres: number;
  openingMeterReading: number; // hour meter or odometer
  
  closingFillDate?: string;
  closingFillLitres?: number;
  closingMeterReading?: number;
  
  // Calculated when closed
  totalFuelConsumed?: number;
  totalUsageHours?: number;
  totalUsageKilometres?: number;
  
  // Daily allocations
  dailyAllocations: FullTankDailyAllocation[];
  
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface FullTankDailyAllocation {
  date: string;
  allocatedFuel: number; // litres
  allocatedUsageHours: number;
  allocatedUsageKilometres: number;
  verificationId?: string;
}

// ============================================================================
// Daily Sign-off
// ============================================================================

export interface DailyFuelSignOff {
  id: string;
  date: string;
  siteId?: string;
  plantId?: string;
  
  // Summary
  totalAssetDays: number;
  verifiedCount: number;
  withinToleranceCount: number;
  warningCount: number;
  criticalCount: number;
  missingCount: number;
  unverifiedCount: number;
  
  // Sign-off
  signedOffBy: string;
  signedOffAt: string;
  signOffDeadline: string; // SLA
  
  // Status
  status: 'pending' | 'signed_off' | 'overdue';
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Investigation
// ============================================================================

export type RootCauseCode = 
  | 'meter_fault'
  | 'sensor_fault'
  | 'calibration_error'
  | 'data_entry_error'
  | 'abnormal_working_conditions'
  | 'excessive_idling'
  | 'leak_or_mechanical_fault'
  | 'unrecorded_issue'
  | 'unexplained';

export interface FuelInvestigation {
  id: string;
  verificationId: string;
  
  // Root cause
  rootCauseCode: RootCauseCode;
  rootCauseDescription: string;
  
  // Evidence
  evidenceAttachmentIds: string[];
  investigationNotes: string;
  
  // Corrective action
  correctiveAction: string;
  correctiveActionType: 'maintenance_work_order' | 'recalibration' | 'operator_retraining' | 'benchmark_review' | 'other';
  correctiveActionReferenceId?: string; // Link to work order, calibration, etc.
  
  // Variance valuation
  unexplainedLitres: number;
  fuelCostPerLitre: number;
  unexplainedCost: number;
  
  // Personnel
  investigatedBy: string;
  investigatedAt: string;
  
  // Closure (maker-checker)
  closureApprovedBy: string;
  closureApprovedAt: string;
  
  // Status
  status: 'open' | 'in_progress' | 'closed';
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface FuelVerificationConfiguration {
  id: string;
  
  // Verification job
  verificationCutoffTime: string; // e.g., '02:00'
  verificationTimezone: string; // e.g., 'Asia/Kolkata'
  gracePeriodMinutes: number;
  
  // Sign-off
  signOffDeadlineTime: string; // e.g., '12:00'
  signOffTimezone: string;
  
  // Trend analysis
  trendWarningConsecutiveDays: number; // default 3
  trendCriticalCumulativeVarianceLitres: number;
  
  // Telematics
  telematicsMismatchTolerancePercent: number;
  
  // Benchmark review
  benchmarkReviewMarginPercent: number; // e.g., 15%
  benchmarkReviewPeriodDays: number; // e.g., 30
  
  // Field checks
  fieldCheckFrequencyDays: number; // e.g., 7
  
  // Minimum usage
  defaultMinimumUsageHours: number; // default 2
  defaultMinimumUsageKilometres: number; // default 20
  
  // Tolerances
  defaultWarningTolerancePercent: number; // default 10
  defaultCriticalTolerancePercent: number; // default 20
  defaultAbsoluteMinimumToleranceLitres: number; // default 5
  
  createdAt: string;
  updatedAt: string;
}
