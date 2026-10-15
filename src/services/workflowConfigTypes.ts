/**
 * Part 08 — Workflow Configuration Types
 */

import { AssetCategory } from './assetTypes';
import { UserRole } from './types';

// ============================================================================
// Approval Routing Rules
// ============================================================================

export interface ApprovalRoutingRule {
  id: string;
  name: string;
  description: string;
  
  // Routing conditions
  assetCategory?: AssetCategory;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  
  // Approver role
  approverRole: UserRole;
  approverLevel: number; // For multi-level approval
  
  // Escalation
  escalationRole?: UserRole;
  escalationLevel?: number;
  escalationHours: number;
  
  // Exception handling
  exceptionApproverRole?: UserRole;
  exceptionApproverLevel?: number;
  
  // Effective dates
  effectiveFrom: string;
  effectiveTo?: string;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Validation Flags
// ============================================================================

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

export interface ValidationFlagDefinition {
  id: string;
  code: ValidationFlagCode;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Thresholds per asset category
  thresholds: Record<AssetCategory, number | undefined>;
  
  // Alert integration
  alertRuleCode: string;
  raiseAlert: boolean;
  
  // Blocking behavior
  blocksApproval: boolean;
  requiresException: boolean;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Approval SLA
// ============================================================================

export interface ApprovalSLA {
  id: string;
  siteId?: string;
  plantId?: string;
  projectId?: string;
  
  // SLA configuration
  approvalDeadlineHours: number; // Hours from submission
  approvalDeadlineTime?: string; // e.g., "11:00" next day
  
  // Escalation chain
  escalationLevels: EscalationLevel[];
  
  // Notifications
  notifyApprover: boolean;
  notifyEscalation: boolean;
  notifyOperator: boolean;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationLevel {
  level: number;
  role: UserRole;
  hoursAfterDeadline: number;
  notifyBy: ('email' | 'sms' | 'push' | 'in_app')[];
}

// ============================================================================
// Approval Record
// ============================================================================

export interface ApprovalRecord {
  id: string;
  submissionId: string;
  
  // Approver details
  approverId: string;
  approverRole: UserRole;
  approverName: string;
  
  // Decision
  decision: 'approved' | 'rejected' | 'returned' | 'escalated' | 'exception_granted';
  decisionTime: string;
  
  // Context
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
  
  // Comments and instructions
  comment?: string;
  returnInstructions?: string;
  exceptionReason?: string;
  
  // Validation flags at time of decision
  validationFlags: string[];
  
  // Metadata
  isBulkApproval: boolean;
  isExceptionApproval: boolean;
  escalatedFrom?: string;
  
  createdAt: string;
}

// ============================================================================
// Amendment Record
// ============================================================================

export interface AmendmentRecord {
  id: string;
  submissionId: string;
  
  // Amendment details
  amendmentNumber: number;
  originalValues: Record<string, unknown>;
  amendedValues: Record<string, unknown>;
  
  // Reason and approval
  reason: string;
  amendedBy: string;
  amendedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Impact
  affectedRecords: {
    entityType: string;
    entityId: string;
    recalculationTriggered: boolean;
  }[];
  
  createdAt: string;
}

// ============================================================================
// Bulk Approval
// ============================================================================

export interface BulkApprovalRequest {
  submissionIds: string[];
  approverId: string;
  approverRole: UserRole;
  comment?: string;
}

export interface BulkApprovalResult {
  approved: number;
  skipped: number;
  failed: number;
  details: {
    submissionId: string;
    status: 'approved' | 'skipped' | 'failed';
    reason?: string;
  }[];
}
