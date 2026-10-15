/**
 * Part 07 — Submission Service
 */

import { storage } from './storage';
import { OperatorSubmission, SubmissionValidationFlag, PhotoEvidence, OcrResult } from './submissionTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { hasPermission } from './permissions';
import { getAsset } from './assets';
import { getActiveAllocation } from './assetAllocation';
import { getOperator } from './operatorManagement';
import { getRequiredEvidence, validateEvidenceCompleteness } from './evidenceRules';
import { createLogbook } from './logbookService';

const submissionsStore = storage.getAdapter<OperatorSubmission>('operator_submissions');

// ============================================================================
// Submission CRUD
// ============================================================================

export async function createSubmission(
  inputData: Omit<OperatorSubmission, 'id' | 'submissionNumber' | 'createdAt' | 'updatedAt' | 'validationFlags' | 'status' | 'dataSource'>,
  userId: string
): Promise<OperatorSubmission> {
  // Check permissions
  await hasPermission({
    userId,
    role: 'operator',
    action: 'create',
    resource: 'operator_submission',
  });

  // Validate operator is assigned to asset
  const operator = await getOperator(inputData.operatorId);
  if (!operator) {
    throw new Error('Operator not found');
  }

  if (!operator.assignedAssets.includes(inputData.assetId)) {
    throw new Error('Operator is not assigned to this asset');
  }

  // Validate asset allocation
  const allocation = await getActiveAllocation(inputData.assetId);
  if (!allocation) {
    throw new Error('Asset is not currently allocated');
  }

  // Check for duplicate submission
  const existingSubmission = await getSubmissionByAssetAndDate(
    inputData.assetId,
    inputData.date,
    inputData.shift
  );

  if (existingSubmission) {
    throw new Error('Submission already exists for this asset, date, and shift');
  }

  // Generate submission number
  const submissionNumber = `SUB-${Date.now()}`;

  // Calculate usage
  const calculatedOperatingHours = inputData.openingHourMeter !== undefined && inputData.closingHourMeter !== undefined
    ? inputData.closingHourMeter - inputData.openingHourMeter
    : undefined;

  const calculatedKilometres = inputData.openingOdometer !== undefined && inputData.closingOdometer !== undefined
    ? inputData.closingOdometer - inputData.openingOdometer
    : undefined;

  // Create submission
  const submission: OperatorSubmission = {
    ...inputData,
    id: generateId(),
    submissionNumber,
    calculatedOperatingHours,
    calculatedKilometres,
    validationFlags: [],
    status: 'draft',
    dataSource: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    updatedBy: userId,
  };

  // Run validations
  const flags = await validateSubmission(submission);
  submission.validationFlags = flags;

  await submissionsStore.create(submission);

  // Audit
  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submission.id,
    action: 'create',
    before: null,
    after: submission as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Submission created',
  });

  return submission;
}

export async function getSubmission(id: string): Promise<OperatorSubmission | null> {
  return submissionsStore.findById(id);
}

export async function getSubmissionByNumber(submissionNumber: string): Promise<OperatorSubmission | null> {
  return submissionsStore.findOne({ submissionNumber } as Partial<OperatorSubmission>);
}

export async function getSubmissionByAssetAndDate(
  assetId: string,
  date: string,
  shift: string
): Promise<OperatorSubmission | null> {
  const submissions = await submissionsStore.findAll();
  return submissions.find(s => 
    s.assetId === assetId && 
    s.date === date && 
    s.shift === shift
  ) || null;
}

export async function listSubmissions(filters?: {
  assetId?: string;
  operatorId?: string;
  date?: string;
  status?: string;
}): Promise<OperatorSubmission[]> {
  let submissions = await submissionsStore.findAll();

  if (filters?.assetId) {
    submissions = submissions.filter(s => s.assetId === filters.assetId);
  }
  if (filters?.operatorId) {
    submissions = submissions.filter(s => s.operatorId === filters.operatorId);
  }
  if (filters?.date) {
    submissions = submissions.filter(s => s.date === filters.date);
  }
  if (filters?.status) {
    submissions = submissions.filter(s => s.status === filters.status);
  }

  return submissions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateSubmission(
  id: string,
  updates: Partial<OperatorSubmission>,
  userId: string
): Promise<OperatorSubmission> {
  await hasPermission({
    userId,
    role: 'operator',
    action: 'edit',
    resource: 'operator_submission',
  });

  const submission = await submissionsStore.findById(id);
  if (!submission) {
    throw new Error(`Submission ${id} not found`);
  }

  if (submission.status === 'approved') {
    throw new Error('Cannot edit approved submission');
  }

  const updated = await submissionsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Re-run validations
  const flags = await validateSubmission(updated);
  const finalUpdated = await submissionsStore.update(id, {
    validationFlags: flags,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: id,
    action: 'update',
    before: submission as unknown as Record<string, unknown>,
    after: finalUpdated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Submission updated',
  });

  return finalUpdated;
}

// ============================================================================
// Validation Logic
// ============================================================================

async function validateSubmission(submission: OperatorSubmission): Promise<SubmissionValidationFlag[]> {
  const flags: SubmissionValidationFlag[] = [];

  // 1. Validate operator declaration
  if (!submission.operatorDeclaration) {
    flags.push({
      id: generateId(),
      code: 'INVALID_DECLARATION',
      message: 'Operator must confirm readings are correct',
      severity: 'error',
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Validate opening reading matches previous closing
  if (submission.openingHourMeter !== undefined) {
    const previousSubmission = await getPreviousSubmission(submission.assetId, submission.date);
    if (previousSubmission && previousSubmission.closingHourMeter !== undefined) {
      if (submission.openingHourMeter !== previousSubmission.closingHourMeter) {
        flags.push({
          id: generateId(),
          code: 'READING_GAP',
          message: `Opening reading (${submission.openingHourMeter}) does not match previous closing (${previousSubmission.closingHourMeter})`,
          severity: 'error',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Validate closing >= opening (no negative usage)
  if (submission.openingHourMeter !== undefined && submission.closingHourMeter !== undefined) {
    if (submission.closingHourMeter < submission.openingHourMeter) {
      flags.push({
        id: generateId(),
        code: 'NEGATIVE_USAGE',
        message: 'Closing reading cannot be less than opening reading',
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (submission.openingOdometer !== undefined && submission.closingOdometer !== undefined) {
    if (submission.closingOdometer < submission.openingOdometer) {
      flags.push({
        id: generateId(),
        code: 'NEGATIVE_USAGE',
        message: 'Closing odometer cannot be less than opening odometer',
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 4. Validate im plausible usage
  if (submission.calculatedOperatingHours && submission.calculatedOperatingHours > 24) {
    flags.push({
      id: generateId(),
      code: 'IMPLAUSIBLE_USAGE',
      message: `Operating hours (${submission.calculatedOperatingHours}) exceed maximum (24)`,
      severity: 'warning',
      createdAt: new Date().toISOString(),
    });
  }

  if (submission.calculatedKilometres && submission.calculatedKilometres > 1000) {
    flags.push({
      id: generateId(),
      code: 'IMPLAUSIBLE_USAGE',
      message: `Kilometres (${submission.calculatedKilometres}) exceed maximum (1000)`,
      severity: 'warning',
      createdAt: new Date().toISOString(),
    });
  }

  // 5. Validate photo evidence
  const asset = await getAsset(submission.assetId);
  if (asset) {
    const photoCategories = submission.photoEvidence.map(p => ({
      category: p.category,
      count: 1,
    }));

    const eventType = submission.closingHourMeter !== undefined ? 'closing' : 'opening';
    const validation = await validateEvidenceCompleteness(
      asset.category,
      eventType,
      photoCategories
    );

    if (!validation.complete) {
      flags.push({
        id: generateId(),
        code: 'MISSING_EVIDENCE',
        message: `Missing required photos: ${validation.missing.map(m => m.category).join(', ')}`,
        severity: 'error',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 6. Validate OCR mismatches
  for (const ocr of submission.ocrResults) {
    if (ocr.mismatch) {
      flags.push({
        id: generateId(),
        code: 'OCR_MISMATCH',
        message: `OCR detected ${ocr.parsedValue} but operator entered ${ocr.operatorValue}`,
        severity: 'warning',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 7. Validate photo age
  const now = new Date();
  for (const photo of submission.photoEvidence) {
    const captureTime = new Date(photo.captureTime);
    const ageMinutes = (now.getTime() - captureTime.getTime()) / (1000 * 60);
    
    // Get max age from evidence rules
    if (asset) {
      const requiredEvidence = await getRequiredEvidence(asset.category, 'opening');
      const rule = requiredEvidence.find(r => r.photoCategory === photo.category);
      
      if (rule && ageMinutes > rule.maxAgeMinutes) {
        flags.push({
          id: generateId(),
          code: 'PHOTO_TOO_OLD',
          message: `Photo ${photo.category} is ${Math.round(ageMinutes)} minutes old (max ${rule.maxAgeMinutes})`,
          severity: 'warning',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return flags;
}

async function getPreviousSubmission(assetId: string, date: string): Promise<OperatorSubmission | null> {
  const allSubmissions = await submissionsStore.findAll({ assetId } as Partial<OperatorSubmission>);
  const previousSubmissions = allSubmissions
    .filter(s => s.date < date && s.status === 'approved')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  return previousSubmissions[0] || null;
}

// ============================================================================
// Submission Workflow
// ============================================================================

export async function submitSubmission(
  id: string,
  userId: string
): Promise<OperatorSubmission> {
  await hasPermission({
    userId,
    role: 'operator',
    action: 'submit',
    resource: 'operator_submission',
  });

  const submission = await submissionsStore.findById(id);
  if (!submission) {
    throw new Error(`Submission ${id} not found`);
  }

  if (submission.status !== 'draft') {
    throw new Error(`Submission is not in draft status (current: ${submission.status})`);
  }

  // Check for critical validation errors
  const criticalErrors = submission.validationFlags.filter(f => f.severity === 'error');
  if (criticalErrors.length > 0 && !submission.hasException) {
    throw new Error(`Cannot submit submission with ${criticalErrors.length} critical validation error(s)`);
  }

  const updated = await submissionsStore.update(id, {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    submittedBy: userId,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: id,
    action: 'submit',
    before: submission as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Submission submitted for approval',
  });

  return updated;
}

export async function approveSubmission(
  id: string,
  userId: string
): Promise<OperatorSubmission> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'approve',
    resource: 'operator_submission',
  });

  const submission = await submissionsStore.findById(id);
  if (!submission) {
    throw new Error(`Submission ${id} not found`);
  }

  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  // Maker-checker: cannot approve own submission
  if (submission.submittedBy === userId) {
    throw new Error('Cannot approve your own submission');
  }

  // Create or update logbook (Part 06 linkage)
  const logbookData = {
    date: submission.date,
    shift: submission.shift,
    assetId: submission.assetId,
    operatorId: submission.operatorId,
    projectId: submission.projectId,
    siteId: submission.siteId,
    plantId: submission.plantId,
    supervisingOfficerId: submission.operatorId, // Use operator as supervisor for now
    openingHourMeter: submission.openingHourMeter,
    closingHourMeter: submission.closingHourMeter,
    openingOdometer: submission.openingOdometer,
    closingOdometer: submission.closingOdometer,
    calculatedOperatingHours: submission.calculatedOperatingHours,
    calculatedKilometres: submission.calculatedKilometres,
    productiveHours: submission.idleTime || 0,
    idleHours: submission.idleTime || 0,
    standbyHours: 0,
    breakdownHours: submission.operationalStatus === 'breakdown' ? submission.calculatedOperatingHours || 0 : 0,
    timeSplitReasonCodes: [],
    fuelAtStart: submission.fuelAtStart,
    fuelAtClose: submission.fuelAtClose,
    fuelReceived: submission.fuelReceived,
    events: [],
    photoAttachmentIds: submission.photoEvidence.map(p => p.attachmentId),
    status: 'approved' as const,
    dataSource: 'manual' as const,
  };

  const logbook = await createLogbook(logbookData as any, userId);

  const updated = await submissionsStore.update(id, {
    status: 'approved',
    approvedAt: new Date().toISOString(),
    approvedBy: userId,
    logbookId: logbook.id,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: id,
    action: 'approve',
    before: submission as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Submission approved and linked to logbook',
  });

  return updated;
}

export async function rejectSubmission(
  id: string,
  reason: string,
  userId: string
): Promise<OperatorSubmission> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'reject',
    resource: 'operator_submission',
  });

  const submission = await submissionsStore.findById(id);
  if (!submission) {
    throw new Error(`Submission ${id} not found`);
  }

  if (submission.status !== 'submitted') {
    throw new Error(`Submission is not in submitted status (current: ${submission.status})`);
  }

  const updated = await submissionsStore.update(id, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: id,
    action: 'reject',
    before: submission as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason,
  });

  return updated;
}

// ============================================================================
// Photo Evidence Management
// ============================================================================

export async function addPhotoEvidence(
  submissionId: string,
  photo: Omit<PhotoEvidence, 'id' | 'createdAt' | 'submissionId'>,
  userId: string
): Promise<OperatorSubmission> {
  const submission = await submissionsStore.findById(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const newPhoto: PhotoEvidence = {
    ...photo,
    id: generateId(),
    submissionId,
    createdAt: new Date().toISOString(),
  };

  const updated = await submissionsStore.update(submissionId, {
    photoEvidence: [...submission.photoEvidence, newPhoto],
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Re-run validations
  const flags = await validateSubmission(updated);
  const finalUpdated = await submissionsStore.update(submissionId, {
    validationFlags: flags,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'update',
    before: submission as unknown as Record<string, unknown>,
    after: finalUpdated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: `Photo evidence added: ${photo.category}`,
  });

  return finalUpdated;
}

export async function removePhotoEvidence(
  submissionId: string,
  photoId: string,
  userId: string
): Promise<OperatorSubmission> {
  const submission = await submissionsStore.findById(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const updated = await submissionsStore.update(submissionId, {
    photoEvidence: submission.photoEvidence.filter(p => p.id !== photoId),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Re-run validations
  const flags = await validateSubmission(updated);
  const finalUpdated = await submissionsStore.update(submissionId, {
    validationFlags: flags,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'update',
    before: submission as unknown as Record<string, unknown>,
    after: finalUpdated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Photo evidence removed',
  });

  return finalUpdated;
}

// ============================================================================
// OCR Integration
// ============================================================================

export async function addOcrResult(
  submissionId: string,
  ocr: Omit<OcrResult, 'id' | 'createdAt' | 'submissionId'>,
  userId: string
): Promise<OperatorSubmission> {
  const submission = await submissionsStore.findById(submissionId);
  if (!submission) {
    throw new Error(`Submission ${submissionId} not found`);
  }

  const newOcr: OcrResult = {
    ...ocr,
    id: generateId(),
    submissionId,
    createdAt: new Date().toISOString(),
  };

  const updated = await submissionsStore.update(submissionId, {
    ocrResults: [...submission.ocrResults, newOcr],
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Re-run validations
  const flags = await validateSubmission(updated);
  const finalUpdated = await submissionsStore.update(submissionId, {
    validationFlags: flags,
  });

  await recordAudit({
    entityType: 'OperatorSubmission',
    entityId: submissionId,
    action: 'update',
    before: submission as unknown as Record<string, unknown>,
    after: finalUpdated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'OCR result added',
  });

  return finalUpdated;
}
