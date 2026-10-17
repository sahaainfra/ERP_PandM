/**
 * Part 10 — Fuel Investigation Service
 * 
 * Manages investigations for fuel variance and critical alerts
 */

import { storage } from './storage';
import { FuelInvestigation, RootCauseCode } from './fuelVerificationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getVerification } from './verificationEngine';

const investigationsStore = storage.getAdapter<FuelInvestigation>('fuel_investigations');

// ============================================================================
// Investigation CRUD
// ============================================================================

export async function createInvestigation(
  verificationId: string,
  rootCauseCode: RootCauseCode,
  rootCauseDescription: string,
  investigatedBy: string
): Promise<FuelInvestigation> {
  const verification = await getVerification(verificationId);
  if (!verification) {
    throw new Error(`Verification ${verificationId} not found`);
  }

  // Check if investigation already exists
  const existing = await investigationsStore.findAll({ verificationId } as any);
  if (existing.length > 0) {
    throw new Error(`Investigation already exists for verification ${verificationId}`);
  }

  const investigation: FuelInvestigation = {
    id: generateId(),
    verificationId,
    rootCauseCode,
    rootCauseDescription,
    evidenceAttachmentIds: [],
    investigationNotes: '',
    correctiveAction: '',
    correctiveActionType: 'other',
    unexplainedLitres: Math.abs(verification.varianceLitres),
    fuelCostPerLitre: 85.50, // Default rate - would come from configuration
    unexplainedCost: Math.abs(verification.varianceLitres) * 85.50,
    investigatedBy,
    investigatedAt: new Date().toISOString(),
    closureApprovedBy: '',
    closureApprovedAt: '',
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await investigationsStore.create(investigation);

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: investigation.id,
    action: 'create',
    before: null,
    after: investigation as any,
    actorId: investigatedBy,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: `Investigation opened for verification ${verificationId}`,
  });

  return investigation;
}

export async function getInvestigation(id: string): Promise<FuelInvestigation | null> {
  return investigationsStore.findById(id);
}

export async function getInvestigationByVerification(verificationId: string): Promise<FuelInvestigation | null> {
  const investigations = await investigationsStore.findAll({ verificationId } as any);
  return investigations[0] || null;
}

export async function listInvestigations(filters?: {
  verificationId?: string;
  status?: string;
  rootCauseCode?: string;
  investigatedBy?: string;
}): Promise<FuelInvestigation[]> {
  let investigations = await investigationsStore.findAll();

  if (filters?.verificationId) {
    investigations = investigations.filter(i => i.verificationId === filters.verificationId);
  }
  if (filters?.status) {
    investigations = investigations.filter(i => i.status === filters.status);
  }
  if (filters?.rootCauseCode) {
    investigations = investigations.filter(i => i.rootCauseCode === filters.rootCauseCode);
  }
  if (filters?.investigatedBy) {
    investigations = investigations.filter(i => i.investigatedBy === filters.investigatedBy);
  }

  return investigations.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateInvestigation(
  id: string,
  updates: Partial<FuelInvestigation>,
  userId: string
): Promise<FuelInvestigation> {
  const investigation = await investigationsStore.findById(id);
  if (!investigation) {
    throw new Error(`Investigation ${id} not found`);
  }

  if (investigation.status === 'closed') {
    throw new Error('Cannot update closed investigation');
  }

  const updated = await investigationsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: id,
    action: 'update',
    before: investigation as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Investigation updated',
  });

  return updated;
}

// ============================================================================
// Evidence Management
// ============================================================================

export async function addEvidence(
  investigationId: string,
  attachmentId: string,
  userId: string
): Promise<FuelInvestigation> {
  const investigation = await investigationsStore.findById(investigationId);
  if (!investigation) {
    throw new Error(`Investigation ${investigationId} not found`);
  }

  const updated = await investigationsStore.update(investigationId, {
    evidenceAttachmentIds: [...investigation.evidenceAttachmentIds, attachmentId],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: investigationId,
    action: 'update',
    before: investigation as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Evidence added to investigation',
  });

  return updated;
}

export async function addNotes(
  investigationId: string,
  notes: string,
  userId: string
): Promise<FuelInvestigation> {
  const investigation = await investigationsStore.findById(investigationId);
  if (!investigation) {
    throw new Error(`Investigation ${investigationId} not found`);
  }

  const updatedNotes = investigation.investigationNotes 
    ? `${investigation.investigationNotes}\n\n[${new Date().toISOString()}] ${notes}`
    : `[${new Date().toISOString()}] ${notes}`;

  const updated = await investigationsStore.update(investigationId, {
    investigationNotes: updatedNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: investigationId,
    action: 'update',
    before: investigation as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Notes added to investigation',
  });

  return updated;
}

// ============================================================================
// Corrective Actions
// ============================================================================

export async function setCorrectiveAction(
  investigationId: string,
  correctiveAction: string,
  correctiveActionType: FuelInvestigation['correctiveActionType'],
  correctiveActionReferenceId: string | undefined,
  userId: string
): Promise<FuelInvestigation> {
  const investigation = await investigationsStore.findById(investigationId);
  if (!investigation) {
    throw new Error(`Investigation ${investigationId} not found`);
  }

  const updated = await investigationsStore.update(investigationId, {
    correctiveAction,
    correctiveActionType,
    correctiveActionReferenceId,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: investigationId,
    action: 'update',
    before: investigation as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: `Corrective action set: ${correctiveActionType}`,
  });

  return updated;
}

// ============================================================================
// Closure (Maker-Checker)
// ============================================================================

export async function closeInvestigation(
  investigationId: string,
  closureApprovedBy: string
): Promise<FuelInvestigation> {
  const investigation = await investigationsStore.findById(investigationId);
  if (!investigation) {
    throw new Error(`Investigation ${investigationId} not found`);
  }

  if (investigation.status === 'closed') {
    throw new Error('Investigation already closed');
  }

  // Maker-checker: investigator cannot approve own closure
  if (investigation.investigatedBy === closureApprovedBy) {
    throw new Error('Investigator cannot approve own investigation closure');
  }

  // Validate corrective action is set
  if (!investigation.correctiveAction) {
    throw new Error('Corrective action must be set before closing investigation');
  }

  const updated = await investigationsStore.update(investigationId, {
    status: 'closed',
    closureApprovedBy,
    closureApprovedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelInvestigation',
    entityId: investigationId,
    action: 'update',
    before: investigation as any,
    after: updated as any,
    actorId: closureApprovedBy,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Investigation closed',
  });

  return updated;
}

// ============================================================================
// Investigation Statistics
// ============================================================================

export async function getInvestigationStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  rootCauseCode?: string;
}): Promise<{
  totalInvestigations: number;
  open: number;
  inProgress: number;
  closed: number;
  totalUnexplainedLitres: number;
  totalUnexplainedCost: number;
  rootCauseBreakdown: Record<string, number>;
}> {
  let investigations = await investigationsStore.findAll();

  if (filters?.fromDate) {
    investigations = investigations.filter(i => i.createdAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    investigations = investigations.filter(i => i.createdAt <= filters.toDate!);
  }
  if (filters?.rootCauseCode) {
    investigations = investigations.filter(i => i.rootCauseCode === filters.rootCauseCode);
  }

  const rootCauseBreakdown: Record<string, number> = {};
  for (const inv of investigations) {
    rootCauseBreakdown[inv.rootCauseCode] = (rootCauseBreakdown[inv.rootCauseCode] || 0) + 1;
  }

  return {
    totalInvestigations: investigations.length,
    open: investigations.filter(i => i.status === 'open').length,
    inProgress: investigations.filter(i => i.status === 'in_progress').length,
    closed: investigations.filter(i => i.status === 'closed').length,
    totalUnexplainedLitres: investigations.reduce((sum, i) => sum + i.unexplainedLitres, 0),
    totalUnexplainedCost: investigations.reduce((sum, i) => sum + i.unexplainedCost, 0),
    rootCauseBreakdown,
  };
}

export async function getInvestigationsByRootCause(
  rootCauseCode: RootCauseCode
): Promise<FuelInvestigation[]> {
  return investigationsStore.findAll({ rootCauseCode } as any);
}
