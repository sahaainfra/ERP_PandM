/**
 * Part 24 — Evidence Pack Service
 */

import { storage } from './storage';
import { EvidencePack, EvidencePackAttachment } from './reportTypes';
import { generateId, sha256 } from './utils';
import { recordAudit } from './audit';
import { getAuditHistory } from './audit';
import { getRevisionHistory } from './audit';

const evidencePacksStore = storage.getAdapter<EvidencePack>('evidence_packs');

// ============================================================================
// Evidence Pack Generation
// ============================================================================

export async function generateEvidencePack(
  entityType: string,
  entityId: string,
  userId: string,
  exportFormat: 'pdf' | 'zip' = 'pdf'
): Promise<EvidencePack> {
  // Fetch main record (would need to be implemented per entity type)
  const mainRecord = await fetchMainRecord(entityType, entityId);
  if (!mainRecord) {
    throw new Error(`${entityType} ${entityId} not found`);
  }

  // Fetch revisions
  const revisions = await getRevisionHistory(entityType, entityId);

  // Fetch attachments
  const attachments = await fetchAttachments(entityType, entityId);

  // Fetch approvals (from audit trail)
  const auditTrail = await getAuditHistory(entityType, entityId);
  const approvals = auditTrail.filter(entry => 
    entry.action === 'approve' || entry.action === 'submit'
  );

  // Fetch chat references (would need chat service integration)
  const chatReferences = await fetchChatReferences(entityType, entityId);

  // Fetch related alerts
  const alerts = await fetchAlerts(entityType, entityId);

  // Calculate hashes for all attachments
  const attachmentHashes = await Promise.all(
    attachments.map(async (att) => ({
      ...att,
      sha256: await calculateAttachmentHash(att),
    }))
  );

  const evidencePack: EvidencePack = {
    id: generateId(),
    entityType,
    entityId,
    entityNumber: mainRecord.number || mainRecord.code || entityId,
    mainRecord,
    revisions,
    attachments: attachmentHashes,
    approvals,
    chatReferences,
    alerts,
    auditTrail: auditTrail.map(entry => ({
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      beforeValues: entry.before,
      afterValues: entry.after,
      changedFields: entry.before && entry.after 
        ? Object.keys(entry.before).filter(key => 
            JSON.stringify(entry.before![key]) !== JSON.stringify(entry.after![key])
          )
        : [],
      reason: entry.reason,
      requestId: entry.requestId,
      timestamp: entry.timestamp,
    })),
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
    exportFormat,
    createdAt: new Date().toISOString(),
  };

  await evidencePacksStore.create(evidencePack);

  await recordAudit({
    entityType: 'EvidencePack',
    entityId: evidencePack.id,
    action: 'create',
    before: null,
    after: { entityType, entityId, attachmentCount: attachments.length } as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Evidence pack generated for ${entityType} ${entityId}`,
  });

  return evidencePack;
}

export async function getEvidencePack(id: string): Promise<EvidencePack | null> {
  return evidencePacksStore.findById(id);
}

export async function listEvidencePacks(filters?: {
  entityType?: string;
  entityId?: string;
  generatedBy?: string;
}): Promise<EvidencePack[]> {
  let packs = await evidencePacksStore.findAll();

  if (filters?.entityType) {
    packs = packs.filter(p => p.entityType === filters.entityType);
  }
  if (filters?.entityId) {
    packs = packs.filter(p => p.entityId === filters.entityId);
  }
  if (filters?.generatedBy) {
    packs = packs.filter(p => p.generatedBy === filters.generatedBy);
  }

  return packs.sort((a, b) => 
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

// ============================================================================
// Evidence Pack Export
// ============================================================================

export async function exportEvidencePack(
  packId: string,
  userId: string
): Promise<{
  fileId: string;
  fileName: string;
  hash: string;
  downloadUrl: string;
}> {
  const pack = await evidencePacksStore.findById(packId);
  if (!pack) {
    throw new Error(`Evidence pack ${packId} not found`);
  }

  // Generate export file (stub implementation)
  const fileName = `evidence_pack_${pack.entityType}_${pack.entityId}_${Date.now()}.${pack.exportFormat}`;
  const fileId = generateId();
  
  // Calculate hash of the entire pack
  const packContent = JSON.stringify({
    mainRecord: pack.mainRecord,
    revisions: pack.revisions,
    attachments: pack.attachments.map(a => ({ id: a.attachmentId, hash: a.sha256 })),
    approvals: pack.approvals,
    auditTrail: pack.auditTrail,
  });
  
  const hash = await sha256(packContent);

  // Update pack with export info
  await evidencePacksStore.update(packId, {
    exportFileId: fileId,
    exportHash: hash,
  });

  await recordAudit({
    entityType: 'EvidencePack',
    entityId: packId,
    action: 'update',
    before: { exportFileId: null },
    after: { exportFileId: fileId, exportHash: hash } as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Evidence pack exported: ${fileName}`,
  });

  return {
    fileId,
    fileName,
    hash,
    downloadUrl: `/api/evidence-packs/${packId}/download`,
  };
}

// ============================================================================
// Helper Functions (Stub implementations)
// ============================================================================

async function fetchMainRecord(entityType: string, entityId: string): Promise<any> {
  // Would fetch from appropriate service based on entity type
  // Stub implementation
  return {
    id: entityId,
    type: entityType,
    number: `${entityType}-${entityId.slice(0, 8)}`,
    data: {},
  };
}

async function fetchAttachments(entityType: string, entityId: string): Promise<any[]> {
  // Would fetch from attachment service
  // Stub implementation
  return [];
}

async function fetchChatReferences(entityType: string, entityId: string): Promise<any[]> {
  // Would fetch from chat service
  // Stub implementation
  return [];
}

async function fetchAlerts(entityType: string, entityId: string): Promise<any[]> {
  // Would fetch from alert service
  // Stub implementation
  return [];
}

async function calculateAttachmentHash(attachment: any): Promise<string> {
  // Would calculate actual hash from file content
  // Stub implementation
  return `hash_${attachment.attachmentId || 'unknown'}`;
}

// ============================================================================
// Evidence Pack Verification
// ============================================================================

export async function verifyEvidencePack(packId: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const pack = await evidencePacksStore.findById(packId);
  if (!pack) {
    return {
      valid: false,
      errors: ['Evidence pack not found'],
      warnings: [],
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Verify all attachments have hashes
  for (const attachment of pack.attachments) {
    if (!attachment.sha256) {
      errors.push(`Attachment ${attachment.attachmentId} is missing hash`);
    }
  }

  // Verify audit trail is complete
  if (pack.auditTrail.length === 0) {
    warnings.push('No audit trail entries found');
  }

  // Verify export hash if exported
  if (pack.exportFileId && !pack.exportHash) {
    errors.push('Export file exists but hash is missing');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
