/**
 * Part 28 — Attendance Types
 */

// ============================================================================
// Masters
// ============================================================================

export type DayType = 'working' | 'weekly_off' | 'holiday';

export interface Shift {
  id: string;
  name: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  graceMinutes: number;
  breakRules: BreakRule[];
  minHoursForFullDay: number;
  minHoursForHalfDay: number;
  isNightShift: boolean;
  nightShiftDateRule: 'start_date' | 'end_date'; // Which date counts for night shift
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BreakRule {
  id: string;
  shiftId: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  durationMinutes: number;
  isPaid: boolean;
}

export interface WorkCalendar {
  id: string;
  name: string;
  siteId?: string;
  officeId?: string;
  year: number;
  
  // Weekly offs (0 = Sunday, 6 = Saturday)
  weeklyOffs: number[];
  
  // Holidays
  holidays: Holiday[];
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Holiday {
  id: string;
  calendarId: string;
  date: string; // YYYY-MM-DD
  name: string;
  isPaid: boolean;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  employeeCategory: string; // e.g., 'staff', 'operator', 'subcontractor'
  
  // Overtime
  overtimeEligible: boolean;
  overtimeThresholdHours: number; // Daily hours before OT starts
  overtimeRate: number; // Multiplier (e.g., 1.5 for 1.5x)
  
  // Late/Early rules
  lateThresholdMinutes: number;
  earlyDepartureThresholdMinutes: number;
  
  // Rounding
  roundingMinutes: number; // Round to nearest X minutes
  roundingDirection: 'up' | 'down' | 'nearest';
  
  // Source reference
  sourceReference: string; // e.g., "Factories Act 1948, Section 59"
  sourceVerifiedAt: string;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Daily Attendance
// ============================================================================

export type DayStatus = 
  | 'present'
  | 'absent'
  | 'half_day'
  | 'on_leave'
  | 'holiday'
  | 'weekly_off'
  | 'on_duty_outstation'
  | 'compensatory_off';

export type AttendanceRecordStatus = 
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'locked';

export interface AttendancePunch {
  id: string;
  attendanceRecordId: string;
  
  // Punch details
  direction: 'check_in' | 'check_out';
  deviceTime: string; // ISO timestamp from device
  serverTime: string; // ISO timestamp when received
  source: 'mobile' | 'supervisor' | 'biometric' | 'card' | 'terminal';
  
  // Location verification (from Part 29)
  locationVerified: boolean;
  geofenceId?: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  
  // Device info (for biometric/card/terminal)
  deviceId?: string;
  deviceClockDriftMinutes?: number;
  
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  
  // Employee/Operator link
  employeeId?: string; // Link to employee master
  operatorId?: string; // Link to Part 05 operator (if applicable)
  
  // Date and shift
  date: string; // YYYY-MM-DD
  shiftId: string;
  
  // Assignment
  projectId?: string;
  siteId?: string;
  plantId?: string;
  officeId?: string;
  
  // Punches
  punches: AttendancePunch[];
  
  // Calculated values (server-side)
  workingHours: number; // Decimal hours
  breakDeductionHours: number;
  overtimeHours: number;
  lateArrivalMinutes: number;
  earlyDepartureMinutes: number;
  
  // Site split (for project costing)
  siteHours?: Record<string, number>; // siteId -> hours
  
  // Day status
  dayStatus: DayStatus;
  
  // Leave link
  leaveApplicationId?: string;
  
  // Status
  status: AttendanceRecordStatus;
  
  // Missing checkout flag
  missingCheckout: boolean;
  
  // Supervisor mark (if source = supervisor)
  supervisorMarkReason?: string;
  supervisorMarkedBy?: string;
  
  // Approval
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Leave Management
// ============================================================================

export type LeaveType = 
  | 'casual'
  | 'sick'
  | 'earned'
  | 'maternity'
  | 'paternity'
  | 'unpaid'
  | 'compensatory'
  | 'other';

export interface LeaveEntitlement {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  year: number;
  totalDays: number;
  usedDays: number;
  balanceDays: number;
  carryForwardDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  
  // Dates
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number;
  
  // Reason
  reason: string;
  
  // Status
  status: 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'cancelled';
  
  // Approval
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Device Import
// ============================================================================

export interface DevicePunchImport {
  deviceId: string;
  employeeCode: string;
  timestamp: string; // ISO timestamp
  direction: 'check_in' | 'check_out';
}

export interface DeviceImportResult {
  totalPunches: number;
  imported: number;
  duplicates: number;
  unknownEmployees: string[];
  clockDriftAlerts: Array<{
    deviceId: string;
    driftMinutes: number;
  }>;
}

// ============================================================================
// Exception Queue
// ============================================================================

export interface AttendanceException {
  id: string;
  type: 'unknown_employee' | 'duplicate_punch' | 'clock_drift' | 'missing_checkout';
  
  // Details
  employeeCode?: string;
  deviceId?: string;
  timestamp: string;
  details: Record<string, any>;
  
  // Resolution
  status: 'open' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Summaries
// ============================================================================

export interface AttendanceSummary {
  employeeId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Day counts
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  onDutyDays: number;
  compensatoryOffDays: number;
  
  // Late/Early
  lateCount: number;
  earlyDepartureCount: number;
  
  // Hours
  totalWorkingHours: number;
  totalOvertimeHours: number;
  
  // Attendance %
  attendancePercentage: number;
  
  // Payable days (as per policy)
  payableDays: number;
  
  calculatedAt: string;
}
