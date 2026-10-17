/**
 * Part 08 — Approval Review Service
 */

import { storage } from './storage';
import { ApprovalReview, UsageTrendEntry, ValidationFlag, BulkApprovalRequest, BulkApprovalResult } from './approvalWorkflowTypes';
import { OperatorSubmission } from './submissionTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getSubmission, updateSubmission } from './submissionService';
import { listSubmissions } from './submissionService';
import { getAsset } from './assets';
import { hasPermission } from './permissions';
import { raiseAlert } from './alerts';

const approvalReviewsStore = storage.getAdapter<ApprovalReview>('approval_reviews');

// ============================================================================
// Review Context
// ============================================================================

export async function getReviewContext(submissionId: string): Promise<{
  submission: OperatorSubmission;
  previousApprovedSubmission?: OperatorSubmission;
  usageTrend7Days: UsageTrendEntry[];
  typicalDailyUsage?: number;
  validationFlags: ValidationFlag[];
}> {
  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Get previous approved submission for same asset
  const allSubmissions = await listSubmissions({ assetId: submission.assetId });
  const previousApproved = allSubmissions
    .filter(s => s.id !== submissionId && s.status === 'approved' && s.date < submission.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  // Calculate 7-day usage trend
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentSubmissions = allSubmissions
    .filter(s => s.status === 'approved' && new Date(s.date) >= sevenDaysAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const usageTrend7Days: UsageTrendEntry[] = recentSubmissions.map(s => ({
    date: s.date,
    operatingHours: s.calculatedOperatingHours || 0,
    kilometres: s.calculatedKilometres,
    fuelConsumed: s.fuelAtStart && s.fuelAtClose 
      ? (s.fuelAtStart + (s.fuelReceived || 0)) - s.fuelAtClose 
      : undefined,
  }));

  // Calculate typical daily usage
  const typicalDailyUsage = usageTrend7Days.length > 0
    ? usageTrend7Days.reduce((sum, entry) => sum + entry.operatingHours, 0) / usageTrend7Days.length
    : undefined;

  // Extract validation flags from submission
  const validationFlags: ValidationFlag[] = submission.validationFlags.map(flag => ({
    code: flag.code,
    message: flag.message,
    severity: flag.severity as 'info' | 'warning' | 'error',
    field: flag.field,
  }));

  return {
    submission,
    previousApprovedSubmission: previousApproved,
    usageTrend7Days,
    typicalDailyUsage,
    validationFlags,
  };
}

// ============================================================================
// Approval Actions
// ============================================================================

export async function approveSubmission(
  submissionId: string,
  reviewerId: string,
  reviewerRole: string,
  comment?: string,
  ipAddress?: string,
  deviceId?: string
): Promise<ApprovalReview> {
  // Check permissions
  await hasPermission({
    userId: reviewerId,
    role: reviewerRole as any,
    action: 'approve',
    resource: 'operator_submission',
  });

  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Separation of duties: cannot approve own submission
  if (submission.operatorId === reviewerId) {
    throw new Error('Cannot approve your own submission');
  }

  // Cannot approve if someone else edited it on behalf of operator
  if (submission.createdBy !== submission.operatorId && submission.createdBy === reviewerId) {
    throw new Error('Cannot approve a submission you created or edited');
  }

  // Check submission status
  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  // Get review context
  const context = await getReviewContext(submissionId);

  // Create approval review record
  const review: ApprovalReview = {
    id: generateId(),
    submissionId,
    reviewerId,
    reviewerRole,
    previousApprovedSubmission: context.previousApprovedSubmission,
    usageTrend7Days: context.usageTrend7Days,
    typicalDailyUsage: context.typicalDailyUsage,
    validationFlags: context.validationFlags,
    decision: 'approve',
    decisionComment: comment,
    reviewedAt: new Date().toISOString(),
    ipAddress,
    deviceId,
    createdAt: new Date().toISOString(),
  };

  await approvalReviewsStore.create(review);

  // Update submission status
  await updateSubmission(submissionId, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: reviewerId,
  }, reviewerId);

  // Audit trail
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'approve',
    before: { status: 'submitted' },
    after: { status: 'approved', approvedBy: reviewerId },
    actorId: reviewerId,
    actorRole: reviewerRole as any,
    requestId: generateId(),
    reason: comment || 'Submission approved',
  });

  return review;
}

export async function rejectSubmission(
  submissionId: string,
  reviewerId: string,
  reviewerRole: string,
  reason: string,
  comment?: string,
  ipAddress?: string,
  deviceId?: string
): Promise<ApprovalReview> {
  // Check permissions
  await hasPermission({
    userId: reviewerId,
    role: reviewerRole as any,
    action: 'reject',
    resource: 'operator_submission',
  });

  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Separation of duties
  if (submission.operatorId === reviewerId) {
    throw new Error('Cannot reject your own submission');
  }

  if (submission.createdBy !== submission.operatorId && submission.createdBy === reviewerId) {
    throw new Error('Cannot reject a submission you created or edited');
  }

  // Check submission status
  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  // Reason is mandatory for rejection
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is mandatory for rejection');
  }

  // Get review context
  const context = await getReviewContext(submissionId);

  // Create approval review record
  const review: ApprovalReview = {
    id: generateId(),
    submissionId,
    reviewerId,
    reviewerRole,
    previousApprovedSubmission: context.previousApprovedSubmission,
    usageTrend7Days: context.usageTrend7Days,
    typicalDailyUsage: context.typicalDailyUsage,
    validationFlags: context.validationFlags,
    decision: 'reject',
    decisionReason: reason,
    decisionComment: comment,
    reviewedAt: new Date().toISOString(),
    ipAddress,
    deviceId,
    createdAt: new Date().toISOString(),
  };

  await approvalReviewsStore.create(review);

  // Update submission status
  await updateSubmission(submissionId, {
    status: 'rejected',
    rejectionReason: reason,
  }, reviewerId);

  // Audit trail
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'reject',
    before: { status: 'submitted' },
    after: { status: 'rejected', rejectionReason: reason },
    actorId: reviewerId,
    actorRole: reviewerRole as any,
    requestId: generateId(),
    reason,
  });

  return review;
}

export async function returnForCorrection(
  submissionId: string,
  reviewerId: string,
  reviewerRole: string,
  instructions: string,
  comment?: string,
  ipAddress?: string,
  deviceId?: string
): Promise<ApprovalReview> {
  // Check permissions
  await hasPermission({
    userId: reviewerId,
    role: reviewerRole as any,
    action: 'return',
    resource: 'operator_submission',
  });

  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Separation of duties
  if (submission.operatorId === reviewerId) {
    throw new Error('Cannot return your own submission');
  }

  if (submission.createdBy !== submission.operatorId && submission.createdBy === reviewerId) {
    throw new Error('Cannot return a submission you created or edited');
  }

  // Check submission status
  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  // Instructions are mandatory
  if (!instructions || instructions.trim().length === 0) {
    throw new Error('Instructions are mandatory for return');
  }

  // Get review context
  const context = await getReviewContext(submissionId);

  // Create approval review record
  const review: ApprovalReview = {
    id: generateId(),
    submissionId,
    reviewerId,
    reviewerRole,
    previousApprovedSubmission: context.previousApprovedSubmission,
    usageTrend7Days: context.usageTrend7Days,
    typicalDailyUsage: context.typicalDailyUsage,
    validationFlags: context.validationFlags,
    decision: 'return',
    decisionReason: instructions,
    decisionComment: comment,
    reviewedAt: new Date().toISOString(),
    ipAddress,
    deviceId,
    createdAt: new Date().toISOString(),
  };

  await approvalReviewsStore.create(review);

  // Update submission status to returned
  await updateSubmission(submissionId, {
    status: 'returned',
    rejectionReason: instructions,
  }, reviewerId);

  // Audit trail
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'return',
    before: { status: 'submitted' },
    after: { status: 'returned', instructions },
    actorId: reviewerId,
    actorRole: reviewerRole as any,
    requestId: generateId(),
    reason: instructions,
  });

  // Raise alert for operator
  await raiseAlert({
    ruleCode: 'SUBMISSION_RETURNED',
    severity: 'warning',
    title: `Submission returned for correction`,
    description: `Your submission for ${submission.assetId} on ${submission.date} has been returned. Instructions: ${instructions}`,
    module: 'Approvals',
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    responsibleUserId: submission.operatorId,
    recommendedAction: 'Review instructions and resubmit',
    dueInHours: 24,
    requestId: generateId(),
  });

  return review;
}

export async function requestMoreEvidence(
  submissionId: string,
  reviewerId: string,
  reviewerRole: string,
  evidenceRequired: string,
  comment?: string,
  ipAddress?: string,
  deviceId?: string
): Promise<ApprovalReview> {
  // Check permissions
  await hasPermission({
    userId: reviewerId,
    role: reviewerRole as any,
    action: 'request_evidence',
    resource: 'operator_submission',
  });

  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Separation of duties
  if (submission.operatorId === reviewerId) {
    throw new Error('Cannot request evidence for your own submission');
  }

  // Check submission status
  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  // Evidence required is mandatory
  if (!evidenceRequired || evidenceRequired.trim().length === 0) {
    throw new Error('Evidence required description is mandatory');
  }

  // Get review context
  const context = await getReviewContext(submissionId);

  // Create approval review record
  const review: ApprovalReview = {
    id: generateId(),
    submissionId,
    reviewerId,
    reviewerRole,
    previousApprovedSubmission: context.previousApprovedSubmission,
    usageTrend7Days: context.usageTrend7Days,
    typicalDailyUsage: context.typicalDailyUsage,
    validationFlags: context.validationFlags,
    decision: 'request_evidence',
    decisionReason: evidenceRequired,
    decisionComment: comment,
    reviewedAt: new Date().toISOString(),
    ipAddress,
    deviceId,
    createdAt: new Date().toISOString(),
  };

  await approvalReviewsStore.create(review);

  // Update submission status to pending_evidence
  await updateSubmission(submissionId, {
    status: 'pending_evidence',
    rejectionReason: evidenceRequired,
  }, reviewerId);

  // Audit trail
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'request_evidence',
    before: { status: 'submitted' },
    after: { status: 'pending_evidence', evidenceRequired },
    actorId: reviewerId,
    actorRole: reviewerRole as any,
    requestId: generateId(),
    reason: evidenceRequired,
  });

  // Raise alert for operator
  await raiseAlert({
    ruleCode: 'EVIDENCE_REQUESTED',
    severity: 'warning',
    title: `Additional evidence required`,
    description: `Your submission for ${submission.assetId} on ${submission.date} requires additional evidence: ${evidenceRequired}`,
    module: 'Approvals',
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    responsibleUserId: submission.operatorId,
    recommendedAction: 'Upload requested evidence and resubmit',
    dueInHours: 24,
    requestId: generateId(),
  });

  return review;
}

// ============================================================================
// Bulk Approval
// ============================================================================

export async function bulkApprove(request: BulkApprovalRequest): Promise<BulkApprovalResult> {
  const result: BulkApprovalResult = {
    total: request.submissionIds.length,
    approved: 0,
    rejected: 0,
    skipped: 0,
    skippedReasons: [],
  };

  for (const submissionId of request.submissionIds) {
    try {
      const submission = await getSubmission(submissionId);
      if (!submission) {
        result.skipped++;
        result.skippedReasons.push({ submissionId, reason: 'Submission not found' });
        continue;
      }

      // Skip if has validation flags
      if (submission.validationFlags && submission.validationFlags.length > 0) {
        result.skipped++;
        result.skippedReasons.push({ 
          submissionId, 
          reason: `Skipped: ${submission.validationFlags.length} validation flag(s)` 
        });
        continue;
      }

      // Skip if approver is operator
      if (submission.operatorId === request.approverId) {
        result.skipped++;
        result.skippedReasons.push({ 
          submissionId, 
          reason: 'Skipped: Cannot approve own submission' 
        });
        continue;
      }

      // Skip if approver created/edited it
      if (submission.createdBy !== submission.operatorId && submission.createdBy === request.approverId) {
        result.skipped++;
        result.skippedReasons.push({ 
          submissionId, 
          reason: 'Skipped: Cannot approve submission you created/edited' 
        });
        continue;
      }

      // Approve the submission
      if (request.decision === 'approve') {
        await approveSubmission(
          submissionId,
          request.approverId,
          request.approverRole,
          request.comment
        );
        result.approved++;
      } else if (request.decision === 'reject') {
        await rejectSubmission(
          submissionId,
          request.approverId,
          request.approverRole,
          request.reason || 'Bulk rejection',
          request.comment
        );
        result.rejected++;
      }
    } catch (error) {
      result.skipped++;
      result.skippedReasons.push({ 
        submissionId, 
        reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  // Audit trail for bulk operation
  await recordAudit({
    entityType: 'BulkApproval',
    entityId: generateId(),
    action: 'create',
    before: null,
    after: result as unknown as Record<string, unknown>,
    actorId: request.approverId,
    actorRole: request.approverRole as any,
    requestId: generateId(),
    reason: `Bulk ${request.decision}: ${result.approved} approved, ${result.rejected} rejected, ${result.skipped} skipped`,
  });

  return result;
}

// ============================================================================
// Review History
// ============================================================================

export async function getReviewHistory(submissionId: string): Promise<ApprovalReview[]> {
  const reviews = await approvalReviewsStore.findAll({ submissionId } as Partial<ApprovalReview>);
  return reviews.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
}

export async function getReviewsByReviewer(reviewerId: string): Promise<ApprovalReview[]> {
  const reviews = await approvalReviewsStore.findAll({ reviewerId } as Partial<ApprovalReview>);
  return reviews.sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime());
}

export async function getPendingReviews(approverRole?: string): Promise<ApprovalReview[]> {
  // Get all submitted submissions
  const submissions = await listSubmissions({ status: 'submitted' });
  
  // For each submission, check if there's a pending review
  const pendingReviews: ApprovalReview[] = [];
  
  for (const submission of submissions) {
    const reviews = await getReviewHistory(submission.id);
    const hasPendingReview = reviews.some(r => 
      r.decision === 'approve' || 
      r.decision === 'reject' || 
      r.decision === 'return' ||
      r.decision === 'request_evidence'
    );
    
    if (!hasPendingReview) {
      // Create a placeholder review for pending items
      pendingReviews.push({
        id: `pending-${submission.id}`,
        submissionId: submission.id,
        reviewerId: '',
        reviewerRole: approverRole || '',
        previousApprovedSubmission: undefined,
        usageTrend7Days: [],
        typicalDailyUsage: undefined,
        validationFlags: submission.validationFlags.map(f => ({
          code: f.code,
          message: f.message,
          severity: f.severity as 'info' | 'warning' | 'error',
          field: f.field,
        })),
        decision: 'approve', // Placeholder
        reviewedAt: submission.submittedAt || submission.createdAt,
        createdAt: submission.createdAt,
      });
    }
  }
  
  return pendingReviews;
}
