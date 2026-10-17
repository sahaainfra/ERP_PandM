/**
 * Part 06 — Daily Equipment Logbook Types
 */

import { Status, DataSource } from './types';

// ============================================================================
// Logbook Record
// ============================================================================

export interface EquipmentLogbook {
  id: string;
  logbookNumber: string;
  
  // Header
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'afternoon' | 'night' | 'full_day';
  assetId: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  activityCode?: string;
  activityDescription?: string;
  operatorId: string;
  supervisingOfficerId: string;
  
  // Meters
  openingHourMeter?: number;
  closingHourMeter?: number;
  openingOdometer?: number;
  closingOdometer?: number;
  calculatedOperatingHours?: number;
  calculatedKilometres?: number;
  
  // Time Split (in hours)
  productiveHours: number;
  idleHours: number;
  standbyHours: number;
  breakdownHours: number;
  timeSplitReasonCodes: TimeSplitReason[];
  
  // Output
  workQuantity?: number;
  workQuantityUnit?: string;
  tripCount?: number;
  
  // Fuel
  fuelAtStart?: number; // litres
  fuelReceived?: number; // litres (linked to fuel issue vouchers)
  fuelAtClose?: number; // litres
  fuelIssueVoucherIds?: string[];
  
  // Events
  events: LogbookEvent[];
  supervisorComments?: string;
  photoAttachmentIds: string[];
  
  // Validation
  validationFlags: ValidationFlag[];
  
  // Status
  status: Status;
  dataSource: DataSource;
  
  // Approval
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TimeSplitReason {
  id: string;
  type: 'productive' | 'idle' | 'standby' | 'breakdown';
  hours: number;
  reasonCode: string;
  reasonDescription?: string;
  startTime?: string;
  endTime?: string;
}

export interface LogbookEvent {
  id: string;
  type: 'breakdown' | 'defect' | 'delay' | 'safety_incident' | 'near_miss' | 'remark';
  description: string;
  occurredAt: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  photoAttachmentId?: string;
  reportedBy: string;
}

export interface ValidationFlag {
  id: string;
  code: ValidationFlagCode;
  message: string;
  severity: 'warning' | 'error';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export type ValidationFlagCode =
  | 'READING_GAP'
  | 'NEGATIVE_USAGE'
  | 'IMPLAUSIBLE_USAGE'
  | 'DUPLICATE_LOGBOOK'
  | 'OVERLAPPING_SHIFT'
  | 'UNASSIGNED_ASSET'
  | 'UNAUTHORIZED_OPERATOR'
  | 'MISSING_CLOSING_READING'
  | 'TIME_SPLIT_MISMATCH';

// ============================================================================
// Daily Coverage Register
// ============================================================================

export interface DailyCoverageEntry {
  id: string;
  date: string; // YYYY-MM-DD
  assetId: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  
  // Expected shifts
  expectedShifts: ('morning' | 'afternoon' | 'night' | 'full_day')[];
  
  // Actual logbooks
  submittedLogbookIds: string[];
  approvedLogbookIds: string[];
  
  // Status
  status: 'submitted' | 'approved' | 'idle_declared' | 'under_maintenance' | 'missing';
  
  // Alerts
  alertRaised: boolean;
  alertId?: string;
  
  // Metadata
  siteCutoffTime: string; // HH:mm
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Activity/Work Codes
// ============================================================================

export interface ActivityCode {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'excavation' | 'loading' | 'hauling' | 'compaction' | 'pumping' | 'lifting' | 'drilling' | 'other';
  defaultUnit?: string;
  isActive: boolean;
}

// ============================================================================
// Reason Codes
// ============================================================================

export interface ReasonCode {
  id: string;
  code: string;
  name: string;
  type: 'productive' | 'idle' | 'standby' | 'breakdown';
  description?: string;
  isActive: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export interface LogbookConfiguration {
  id: string;
  siteId?: string;
  plantId?: string;
  
  // Time settings
  cutoffTime: string; // HH:mm (e.g., "23:59")
  timezone: string; // e.g., "Asia/Kolkata"
  
  // Validation thresholds
  maxOperatingHoursPerDay: number; // e.g., 24
  maxKilometresPerDay: number; // e.g., 1000
  timeSplitToleranceHours: number; // e.g., 0.5
  
  // Decimal precision
  hoursPrecision: number; // e.g., 1 (0.1 hours)
  kilometresPrecision: number; // e.g., 0 (1 km)
  litresPrecision: number; // e.g., 1 (0.1 litres)
  
  // Alerts
  raiseAlertForMissingLogbook: boolean;
  alertLeadTimeMinutes: number; // e.g., 60
  
  createdAt: string;
  updatedAt: string;
}
