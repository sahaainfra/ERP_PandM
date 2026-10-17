/**
 * Part 08 — Approval Workflow Types
 */

import { Status } from './types';
import { AssetCategory } from './assetTypes';

// ============================================================================
// Approval Routing
// ============================================================================

export interface ApprovalRoute {
  id: string;
  assetCategory: AssetCategory;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  approverRole: string;
  approverUserId?: string;
  escalationLevel: number;
  escalationHours: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Validation Flags
// ============================================================================

export interface ValidationFlagRule {
  id: string;
  code: ValidationFlagCode;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  assetCategory?: AssetCategory;
  threshold?: number;
  thresholdUnit?: string;
  autoEscalate: boolean;
  escalationHours?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ValidationFlagCode =
  | 'MISSING_EVIDENCE'
  | 'MISSING_FIELD'
  | 'DECREASING_READING'
  | 'IMPLAUSIBLE_USAGE'
  | 'READING_GAP'
  | 'DUPLICATE_SUBMISSION'
  | 'MISSING_CLOSING_READING'
  | 'UNASSIGNED_ASSET'
  | 'UNAUTHORIZED_OPERATOR'
  | 'HIGH_IDLE_RATIO'
  | 'TELEMATICS_MISMATCH'
  | 'ABNORMAL_FUEL'
  | 'LATE_SUBMISSION'
  | 'OVERDUE_APPROVAL';

// ============================================================================
// Approval Review
// ============================================================================

export interface ApprovalReview {
  id: string;
  submissionId: string;
  reviewerId: string;
  reviewerRole: string;
  
  // Review data
  previousApprovedSubmission?: any;
  usageTrend7Days: UsageTrendEntry[];
  typicalDailyUsage?: number;
  validationFlags: ValidationFlag[];
  
  // Decision
  decision: 'approve' | 'reject' | 'return' | 'escalate' | 'request_evidence';
  decisionReason?: string;
  decisionComment?: string;
  
  // Metadata
  reviewedAt: string;
  ipAddress?: string;
  deviceId?: string;
  
  createdAt: string;
}

export interface UsageTrendEntry {
  date: string;
  operatingHours: number;
  kilometres?: number;
  fuelConsumed?: number;
}

export interface ValidationFlag {
  code: ValidationFlagCode | string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  field?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Amendments
// ============================================================================

export interface Amendment {
  id: string;
  submissionId: string;
  revisionNumber: number;
  
  // Original and amended values
  originalValues: Record<string, unknown>;
  amendedValues: Record<string, unknown>;
  
  // Reason and approval
  reason: string;
  authorId: string;
  approverId: string;
  approvedAt: string;
  
  // Impact
  affectedRecords: AffectedRecord[];
  recalculationTriggered: boolean;
  
  createdAt: string;
}

export interface AffectedRecord {
  entityType: string;
  entityId: string;
  action: 'recalculated' | 'updated' | 'flagged';
  details?: string;
}

// ============================================================================
// SLA Configuration
// ============================================================================

export interface ApprovalSLA {
  id: string;
  siteId?: string;
  projectId?: string;
  plantId?: string;
  
  // SLA settings
  approvalDeadlineHours: number; // Hours from submission
  deadlineTime?: string; // Time of day (e.g., "11:00")
  
  // Escalation
  escalationChain: EscalationLevel[];
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationLevel {
  level: number;
  approverRole: string;
  approverUserId?: string;
  escalationHours: number;
}

// ============================================================================
// Bulk Approval
// ============================================================================

export interface BulkApprovalRequest {
  submissionIds: string[];
  approverId: string;
  approverRole: string;
  decision: 'approve' | 'reject';
  reason?: string;
  comment?: string;
}

export interface BulkApprovalResult {
  total: number;
  approved: number;
  rejected: number;
  skipped: number;
  skippedReasons: { submissionId: string; reason: string }[];
}
