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
  
  createdAt: string;
  updatedAt: string;
}

export interface TankCalibrationChart {
  id: string;
  instrumentId: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  
  entries: TankCalibrationEntry[];
  
  createdBy: string;
  approvedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TankCalibrationEntry {
  dipReading: number; // mm
  volume: number; // litres
}

export interface FieldCheck {
  id: string;
  instrumentId: string;
  checkDate: string;
  checkType: 'proving_can' | 'meter_comparison';
  
  // Proving can test
  certifiedMeasure?: number;
  dispenserReading?: number;
  error?: number;
  tolerance?: number;
  
  // Meter comparison
  meterReading?: number;
  telematicsReading?: number;
  gpsDistance?: number;
  deviation?: number;
  
  result: 'pass' | 'fail';
  performedBy: string;
  
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
  
  // Benchmark value
  value: number;
  unit: BenchmarkUnit;
  
  // For dual-use assets (e.g., transit mixer)
  secondaryValue?: number;
  secondaryUnit?: BenchmarkUnit;
  secondaryUsageField?: string; // e.g., 'drum_rotation_hours', 'pumping_hours'
  
  // Source and evidence
  source: BenchmarkSource;
  evidenceAttachmentId?: string;
  
  // Tolerances
  warningToleranceLower: number; // percentage, e.g., -10
  warningToleranceUpper: number; // percentage, e.g., +10
  criticalToleranceLower: number; // percentage, e.g., -20
  criticalToleranceUpper: number; // percentage, e.g., +20
  absoluteMinToleranceLitres: number; // e.g., 5 L
  minimumUsageForEvaluation: number; // e.g., 2 hr or 20 km
  
  // Condition factors (optional multipliers)
  conditionFactors?: ConditionFactor[];
  
  // Versioning and approval
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'draft' | 'approved' | 'superseded';
  
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ConditionFactor {
  id: string;
  name: string; // e.g., 'duty_class', 'terrain', 'season'
  value: string; // e.g., 'heavy', 'hilly', 'summer'
  multiplier: number; // e.g., 1.2
}

export interface BenchmarkReviewSuggestion {
  id: string;
  benchmarkId: string;
  assetId?: string;
  make?: string;
  model?: string;
  
  currentBenchmark: number;
  suggestedBenchmark: number;
  basis: string; // e.g., '30-day median of verified actuals'
  
  status: 'pending' | 'accepted' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  createdAt: string;
}

// ============================================================================
// Daily Fuel Verification
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
  
  // Method and instruments
  method: FuelConsumptionMethod;
  instrumentsUsed: InstrumentUsage[];
  
  // Fuel consumed
  openingLevel?: number; // litres
  fuelIssued?: number; // litres
  closingLevel?: number; // litres
  fuelConsumed: number; // litres
  
  // Full-tank method
  fullTankWindowId?: string;
  fullTankLitresIssued?: number;
  
  // Telematics method
  telematicsFuelUsed?: number;
  
  // Usage
  approvedUsage: number; // hours or km
  usageUnit: 'hr' | 'km';
  
  // Secondary usage (for dual-use assets)
  secondaryUsage?: number;
  secondaryUsageUnit?: 'hr' | 'km';
  
  // Calculations
  actualRate: number; // L/hr or L/km
  benchmarkId: string;
  benchmarkVersion: number;
  benchmarkValue: number;
  expectedFuel: number; // litres
  
  // Variance
  varianceLitres: number;
  variancePercent: number;
  
  // Classification
  resultStatus: VerificationResultStatus;
  unverifiedReason?: string;
  
  // Trend
  rolling7DayVariance?: number;
  rolling30DayVariance?: number;
  consecutiveWarningDays?: number;
  
  // Sign-off
  signedOff: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
  disposition?: string; // For non-within_tolerance results
  
  // Revision tracking
  revisionNumber: number;
  previousRevisionId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentUsage {
  instrumentId: string;
  instrumentType: string;
  calibrationStatus: CalibrationStatus;
  readingDate: string;
  reading: number;
  convertedVolume?: number; // if dip reading
  chartVersionUsed?: number; // if tank chart used
  verified: boolean;
}

export interface FullTankWindow {
  id: string;
  assetId: string;
  openingFillDate: string;
  openingFillLitres: number;
  openingFillMeterReading: number;
  
  closingFillDate?: string;
  closingFillLitres?: number;
  closingFillMeterReading?: number;
  
  status: 'open' | 'closed';
  
  createdAt: string;
  updatedAt: string;
}

export interface DailyFuelVerificationSheet {
  id: string;
  date: string;
  siteId?: string;
  plantId?: string;
  
  rows: DailyFuelVerification[];
  
  // Summary
  totalAssets: number;
  verifiedCount: number;
  withinToleranceCount: number;
  warningCount: number;
  criticalCount: number;
  missingCount: number;
  unverifiedCount: number;
  
  // Sign-off
  signedOff: boolean;
  signedOffBy?: string;
  signedOffAt?: string;
  
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

export type CorrectiveActionType = 
  | 'maintenance_work_order'
  | 'recalibration'
  | 'operator_retraining'
  | 'benchmark_review_request'
  | 'other';

export interface FuelInvestigation {
  id: string;
  verificationId: string;
  assetId: string;
  date: string;
  
  // Root cause
  rootCause: RootCauseCode;
  rootCauseDetails?: string;
  
  // Evidence
  evidenceAttachmentIds: string[];
  evidenceNotes?: string;
  
  // Corrective action
  correctiveActionType: CorrectiveActionType;
  correctiveActionDetails: string;
  workOrderId?: string; // if maintenance work order created
  
  // Status
  status: 'open' | 'in_progress' | 'closed';
  
  // Personnel
  investigatedBy: string;
  closedBy?: string; // Must be different from investigatedBy (maker-checker)
  closedAt?: string;
  
  // Unexplained variance
  unexplainedLitres?: number;
  unexplainedCost?: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface FuelVerificationConfiguration {
  id: string;
  
  // Daily job
  dailyJobCutoffTime: string; // e.g., '02:00'
  dailyJobTimezone: string; // e.g., 'Asia/Kolkata'
  dailyJobGracePeriodMinutes: number;
  
  // Sign-off
  signOffDeadlineTime: string; // e.g., '12:00'
  signOffDeadlineTimezone: string;
  
  // Trend analysis
  trendWarningConsecutiveDays: number; // e.g., 3
  trendCriticalCumulativeLitres: number;
  
  // Review suggestions
  reviewSuggestionMarginPercent: number; // e.g., 15%
  reviewSuggestionPeriodDays: number; // e.g., 30
  
  // Cross-checks
  telematicsMismatchTolerancePercent: number; // e.g., 10%
  
  createdAt: string;
  updatedAt: string;
}
