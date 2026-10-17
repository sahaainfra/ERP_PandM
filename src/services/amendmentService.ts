/**
 * Part 08 — Amendment Service
 */

import { storage } from './storage';
import { Amendment, AffectedRecord } from './approvalWorkflowTypes';
import { OperatorSubmission } from './submissionTypes';
import { generateId, deepClone } from './utils';
import { recordAudit, createRevision } from './audit';
import { getSubmission, updateSubmission } from './submissionService';
import { hasPermission } from './permissions';

const amendmentsStore = storage.getAdapter<Amendment>('amendments');

// ============================================================================
// Amendment Creation
// ============================================================================

export async function createAmendment(
  submissionId: string,
  amendedValues: Record<string, unknown>,
  reason: string,
  authorId: string,
  approverId: string,
  approverRole: string
): Promise<Amendment> {
  // Check permissions
  await hasPermission({
    userId: approverId,
    role: approverRole as any,
    action: 'amend',
    resource: 'operator_submission',
  });

  const submission = await getSubmission(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  // Only approved submissions can be amended
  if (submission.status !== 'approved') {
    throw new Error(`Only approved submissions can be amended (current status: ${submission.status})`);
  }

  // Separation of duties: author and approver must be different
  if (authorId === approverId) {
    throw new Error('Author and approver must be different persons');
  }

  // Reason is mandatory
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is mandatory for amendments');
  }

  // Get current revision number
  const existingAmendments = await amendmentsStore.findAll({ submissionId } as Partial<Amendment>);
  const revisionNumber = existingAmendments.length + 1;

  // Extract original values (only the fields being amended)
  const originalValues: Record<string, unknown> = {};
  for (const key of Object.keys(amendedValues)) {
    originalValues[key] = (submission as any)[key];
  }

  // Create amendment record
  const amendment: Amendment = {
    id: generateId(),
    submissionId,
    revisionNumber,
    originalValues: deepClone(originalValues),
    amendedValues: deepClone(amendedValues),
    reason,
    authorId,
    approverId,
    approvedAt: new Date().toISOString(),
    affectedRecords: [],
    recalculationTriggered: false,
    createdAt: new Date().toISOString(),
  };

  await amendmentsStore.create(amendment);

  // Create revision in audit trail (Part 02 revision service)
  await createRevision({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    originalValue: originalValues,
    amendedValue: amendedValues,
    reason,
    authorId,
    approverId,
  });

  // Update submission with amended values
  const updatedSubmission = await updateSubmission(
    submissionId,
    amendedValues as Partial<OperatorSubmission>,
    approverId
  );

  // Trigger recalculation of dependent records
  const affectedRecords = await recalculateDependentRecords(submissionId, updatedSubmission);
  
  // Update amendment with affected records
  await amendmentsStore.update(amendment.id, {
    affectedRecords,
    recalculationTriggered: affectedRecords.length > 0,
  });

  // Audit trail
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'amend',
    before: originalValues,
    after: amendedValues,
    actorId: approverId,
    actorRole: approverRole as any,
    requestId: generateId(),
    reason: `Amendment #${revisionNumber}: ${reason}`,
  });

  return amendment;
}

// ============================================================================
// Recalculation of Dependent Records
// ============================================================================

async function recalculateDependentRecords(
  submissionId: string,
  submission: OperatorSubmission
): Promise<AffectedRecord[]> {
  const affectedRecords: AffectedRecord[] = [];

  // Recalculate fuel verification (Part 10)
  // This would integrate with fuel verification service
  if (submission.fuelAtStart !== undefined && submission.fuelAtClose !== undefined) {
    affectedRecords.push({
      entityType: 'FuelVerification',
      entityId: `fuel-verify-${submissionId}`,
      action: 'recalculated',
      details: 'Fuel consumption recalculated based on amended submission',
    });
  }

  // Recalculate utilization metrics (Part 06)
  if (submission.calculatedOperatingHours !== undefined) {
    affectedRecords.push({
      entityType: 'UtilizationMetric',
      entityId: `util-${submission.assetId}-${submission.date}`,
      action: 'recalculated',
      details: 'Utilization metrics recalculated based on amended hours',
    });
  }

  // Recalculate productivity (Part 21)
  if (submission.workPerformed !== undefined) {
    affectedRecords.push({
      entityType: 'ProductivityRecord',
      entityId: `prod-${submissionId}`,
      action: 'recalculated',
      details: 'Productivity recalculated based on amended work performed',
    });
  }

  // Recalculate costing (Part 21)
  if (submission.calculatedOperatingHours !== undefined || submission.fuelAtClose !== undefined) {
    affectedRecords.push({
      entityType: 'CostRecord',
      entityId: `cost-${submissionId}`,
      action: 'recalculated',
      details: 'Costing recalculated based on amended hours and fuel',
    });
  }

  // Log recalculation in audit trail
  if (affectedRecords.length > 0) {
    await recordAudit({
      entityType: 'Amendment',
      entityId: submissionId,
      action: 'update',
      before: null,
      after: { affectedRecordsCount: affectedRecords.length },
      actorId: 'system',
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: `Recalculated ${affectedRecords.length} dependent records`,
    });
  }

  return affectedRecords;
}

// ============================================================================
// Amendment History
// ============================================================================

export async function getAmendmentHistory(submissionId: string): Promise<Amendment[]> {
  const amendments = await amendmentsStore.findAll({ submissionId } as Partial<Amendment>);
  return amendments.sort((a, b) => a.revisionNumber - b.revisionNumber);
}

export async function getAmendment(id: string): Promise<Amendment | null> {
  return amendmentsStore.findById(id);
}

export async function getAllAmendments(filters?: {
  submissionId?: string;
  authorId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<Amendment[]> {
  let amendments = await amendmentsStore.findAll();

  if (filters?.submissionId) {
    amendments = amendments.filter(a => a.submissionId === filters.submissionId);
  }
  if (filters?.authorId) {
    amendments = amendments.filter(a => a.authorId === filters.authorId);
  }
  if (filters?.approverId) {
    amendments = amendments.filter(a => a.approverId === filters.approverId);
  }
  if (filters?.fromDate) {
    amendments = amendments.filter(a => a.createdAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    amendments = amendments.filter(a => a.createdAt <= filters.toDate!);
  }

  return amendments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// Amendment Validation
// ============================================================================

export async function validateAmendment(
  submissionId: string,
  amendedValues: Record<string, unknown>,
  authorId: string,
  approverId: string
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const submission = await getSubmission(submissionId);
  if (!submission) {
    errors.push('Submission not found');
    return { valid: false, errors, warnings };
  }

  // Check if submission is approved
  if (submission.status !== 'approved') {
    errors.push('Only approved submissions can be amended');
  }

  // Check separation of duties
  if (authorId === approverId) {
    errors.push('Author and approver must be different persons');
  }

  // Check if there are actual changes
  let hasChanges = false;
  for (const [key, value] of Object.entries(amendedValues)) {
    if ((submission as any)[key] !== value) {
      hasChanges = true;
      break;
    }
  }

  if (!hasChanges) {
    warnings.push('No actual changes detected in amended values');
  }

  // Validate specific field amendments
  if (amendedValues.openingHourMeter !== undefined || amendedValues.closingHourMeter !== undefined) {
    const opening = amendedValues.openingHourMeter !== undefined 
      ? Number(amendedValues.openingHourMeter) 
      : submission.openingHourMeter;
    const closing = amendedValues.closingHourMeter !== undefined 
      ? Number(amendedValues.closingHourMeter) 
      : submission.closingHourMeter;

    if (opening !== undefined && closing !== undefined && closing < opening) {
      errors.push('Closing hour meter cannot be less than opening hour meter');
    }
  }

  if (amendedValues.openingOdometer !== undefined || amendedValues.closingOdometer !== undefined) {
    const opening = amendedValues.openingOdometer !== undefined 
      ? Number(amendedValues.openingOdometer) 
      : submission.openingOdometer;
    const closing = amendedValues.closingOdometer !== undefined 
      ? Number(amendedValues.closingOdometer) 
      : submission.closingOdometer;

    if (opening !== undefined && closing !== undefined && closing < opening) {
      errors.push('Closing odometer cannot be less than opening odometer');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
