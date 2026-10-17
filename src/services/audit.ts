/**
 * 2.3 Audit Trail Service
 *
 * Append-only audit table. Records cannot be edited or deleted through
 * the application. Tracks every create, update, submit, approve, reject,
 * post, reverse, amend, export, and permission change.
 */

import { storage } from './storage';
import { AuditRecord, AuditAction, RevisionRecord, UserRole } from './types';
import { generateId, deepClone, computeDiff } from './utils';

// Append-only store — updates and deletes are blocked by the adapter
const auditStore = storage.getAdapter<AuditRecord>('audit_log', true);
const revisionStore = storage.getAdapter<RevisionRecord>('revisions');

/**
 * Record an audit event.
 */
export async function recordAudit(params: {
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  ipAddress?: string;
  deviceId?: string;
  requestId: string;
}): Promise<AuditRecord> {
  const record: AuditRecord = {
    id: generateId(),
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    before: params.before ? deepClone(params.before) : null,
    after: params.after ? deepClone(params.after) : null,
    actorId: params.actorId,
    actorRole: params.actorRole,
    reason: params.reason,
    ipAddress: params.ipAddress,
    deviceId: params.deviceId,
    requestId: params.requestId,
    timestamp: new Date().toISOString(),
  };

  return auditStore.append(record);
}

/**
 * Record a create action.
 */
export async function recordCreate(
  entityType: string,
  entityId: string,
  after: Record<string, unknown>,
  actorId: string,
  actorRole: UserRole,
  requestId: string
): Promise<AuditRecord> {
  return recordAudit({
    entityType,
    entityId,
    action: 'create',
    before: null,
    after,
    actorId,
    actorRole,
    requestId,
  });
}

/**
 * Record an update action with automatic diff.
 */
export async function recordUpdate(
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actorId: string,
  actorRole: UserRole,
  requestId: string,
  reason?: string
): Promise<AuditRecord> {
  const { changed } = computeDiff(before, after);
  if (!changed) {
    // Still record the attempt for audit completeness
    return recordAudit({
      entityType,
      entityId,
      action: 'update',
      before,
      after,
      actorId,
      actorRole,
      requestId,
      reason: reason || 'No changes detected',
    });
  }

  return recordAudit({
    entityType,
    entityId,
    action: 'update',
    before,
    after,
    actorId,
    actorRole,
    requestId,
    reason,
  });
}

/**
 * Record a workflow action (submit, approve, reject, etc.).
 */
export async function recordWorkflowAction(
  entityType: string,
  entityId: string,
  action: AuditAction,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  actorId: string,
  actorRole: UserRole,
  requestId: string,
  reason?: string
): Promise<AuditRecord> {
  return recordAudit({
    entityType,
    entityId,
    action,
    before,
    after,
    actorId,
    actorRole,
    requestId,
    reason,
  });
}

/**
 * Get audit history for an entity.
 */
export async function getAuditHistory(
  entityType: string,
  entityId: string
): Promise<AuditRecord[]> {
  const all = await auditStore.findAll();
  return all
    .filter(r => r.entityType === entityType && r.entityId === entityId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Get audit history for an actor.
 */
export async function getAuditByActor(actorId: string): Promise<AuditRecord[]> {
  const all = await auditStore.findAll();
  return all
    .filter(r => r.actorId === actorId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

/**
 * Search audit records.
 */
export async function searchAudit(params: {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  actorId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<AuditRecord[]> {
  let results = await auditStore.findAll();

  if (params.entityType) {
    results = results.filter(r => r.entityType === params.entityType);
  }
  if (params.entityId) {
    results = results.filter(r => r.entityId === params.entityId);
  }
  if (params.action) {
    results = results.filter(r => r.action === params.action);
  }
  if (params.actorId) {
    results = results.filter(r => r.actorId === params.actorId);
  }
  if (params.fromDate) {
    results = results.filter(r => r.timestamp >= params.fromDate!);
  }
  if (params.toDate) {
    results = results.filter(r => r.timestamp <= params.toDate!);
  }

  return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/**
 * Verify that audit records cannot be modified.
 * This is enforced by the append-only adapter.
 */
export async function attemptAuditUpdate(id: string): Promise<Error> {
  try {
    await auditStore.update(id, { action: 'update' as AuditAction });
    throw new Error('SECURITY: Audit record was modified — this should never happen');
  } catch (err) {
    if (err instanceof Error && err.message.includes('Append-only')) {
      return err;
    }
    throw err;
  }
}

export async function attemptAuditDelete(id: string): Promise<Error> {
  try {
    await auditStore.delete(id);
    throw new Error('SECURITY: Audit record was deleted — this should never happen');
  } catch (err) {
    if (err instanceof Error && err.message.includes('Append-only')) {
      return err;
    }
    throw err;
  }
}

// ============================================================================
// Revision Service (for approved records)
// ============================================================================

/**
 * Create a revision for an approved record.
 */
export async function createRevision(params: {
  entityType: string;
  entityId: string;
  originalValue: Record<string, unknown>;
  amendedValue: Record<string, unknown>;
  reason: string;
  authorId: string;
  approverId?: string;
}): Promise<RevisionRecord> {
  if (!params.reason || params.reason.trim().length === 0) {
    throw new Error('Reason is required for revisions');
  }

  // Get current revision number
  const existing = await revisionStore.findAll();
  const entityRevisions = existing.filter(
    r => r.entityType === params.entityType && r.entityId === params.entityId
  );
  const nextRevisionNumber = entityRevisions.length + 1;

  const revision: RevisionRecord = {
    id: generateId(),
    entityType: params.entityType,
    entityId: params.entityId,
    revisionNumber: nextRevisionNumber,
    originalValue: deepClone(params.originalValue),
    amendedValue: deepClone(params.amendedValue),
    reason: params.reason,
    authorId: params.authorId,
    approverId: params.approverId,
    approvedAt: params.approverId ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };

  await revisionStore.create(revision);

  // Also record in audit trail
  await recordAudit({
    entityType: params.entityType,
    entityId: params.entityId,
    action: 'amend',
    before: params.originalValue,
    after: params.amendedValue,
    actorId: params.authorId,
    actorRole: 'company_admin', // will be passed from context in real impl
    requestId: generateId(),
    reason: params.reason,
  });

  return revision;
}

/**
 * Get revision history for an entity.
 */
export async function getRevisionHistory(
  entityType: string,
  entityId: string
): Promise<RevisionRecord[]> {
  const all = await revisionStore.findAll();
  return all
    .filter(r => r.entityType === entityType && r.entityId === entityId)
    .sort((a, b) => a.revisionNumber - b.revisionNumber);
}
