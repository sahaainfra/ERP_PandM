/**
 * Part 07 — Evidence Rules Configuration Service
 */

import { storage } from './storage';
import { EvidenceRule, EvidenceCategory } from './submissionTypes';
import { AssetCategory } from './assetTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const evidenceRulesStore = storage.getAdapter<EvidenceRule>('evidence_rules');

// ============================================================================
// Evidence Rules CRUD
// ============================================================================

export async function createEvidenceRule(
  inputData: Omit<EvidenceRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EvidenceRule> {
  const rule: EvidenceRule = {
    ...inputData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await evidenceRulesStore.create(rule);

  await recordAudit({
    entityType: 'EvidenceRule',
    entityId: rule.id,
    action: 'create',
    before: null,
    after: rule as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Evidence rule created',
  });

  return rule;
}

export async function getEvidenceRule(id: string): Promise<EvidenceRule | null> {
  return evidenceRulesStore.findById(id);
}

export async function listEvidenceRules(filters?: {
  assetCategory?: AssetCategory;
  eventType?: string;
  isActive?: boolean;
}): Promise<EvidenceRule[]> {
  let rules = await evidenceRulesStore.findAll();

  if (filters?.assetCategory) {
    rules = rules.filter(r => r.assetCategory === filters.assetCategory);
  }
  if (filters?.eventType) {
    rules = rules.filter(r => r.eventType === filters.eventType);
  }
  if (filters?.isActive !== undefined) {
    rules = rules.filter(r => r.isActive === filters.isActive);
  }

  return rules;
}

export async function updateEvidenceRule(
  id: string,
  updates: Partial<EvidenceRule>,
  userId: string
): Promise<EvidenceRule> {
  const rule = await evidenceRulesStore.findById(id);
  if (!rule) {
    throw new Error(`Evidence rule ${id} not found`);
  }

  const updated = await evidenceRulesStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'EvidenceRule',
    entityId: id,
    action: 'update',
    before: rule as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Evidence rule updated',
  });

  return updated;
}

export async function deleteEvidenceRule(id: string, userId: string): Promise<void> {
  const rule = await evidenceRulesStore.findById(id);
  if (!rule) {
    throw new Error(`Evidence rule ${id} not found`);
  }

  await evidenceRulesStore.update(id, { isActive: false });

  await recordAudit({
    entityType: 'EvidenceRule',
    entityId: id,
    action: 'delete',
    before: rule as unknown as Record<string, unknown>,
    after: null,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Evidence rule deactivated',
  });
}

// ============================================================================
// Get Required Evidence for Submission
// ============================================================================

export async function getRequiredEvidence(
  assetCategory: AssetCategory,
  eventType: 'opening' | 'closing' | 'breakdown' | 'general'
): Promise<EvidenceRule[]> {
  const rules = await listEvidenceRules({
    assetCategory,
    eventType,
    isActive: true,
  });

  return rules.filter(r => r.mandatory);
}

export async function validateEvidenceCompleteness(
  assetCategory: AssetCategory,
  eventType: 'opening' | 'closing' | 'breakdown' | 'general',
  submittedPhotos: { category: EvidenceCategory; count: number }[]
): Promise<{
  complete: boolean;
  missing: { category: EvidenceCategory; required: number; submitted: number }[];
  warnings: string[];
}> {
  const requiredRules = await getRequiredEvidence(assetCategory, eventType);
  const missing: { category: EvidenceCategory; required: number; submitted: number }[] = [];
  const warnings: string[] = [];

  for (const rule of requiredRules) {
    const submitted = submittedPhotos.find(p => p.category === rule.photoCategory);
    const submittedCount = submitted?.count || 0;

    if (submittedCount < rule.minimumCount) {
      missing.push({
        category: rule.photoCategory,
        required: rule.minimumCount,
        submitted: submittedCount,
      });
    }
  }

  return {
    complete: missing.length === 0,
    missing,
    warnings,
  };
}

// ============================================================================
// Seed Default Evidence Rules
// ============================================================================

export async function seedDefaultEvidenceRules(): Promise<void> {
  const existing = await evidenceRulesStore.findAll();
  if (existing.length > 0) return;

  const defaultRules: Omit<EvidenceRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Earthmoving - Opening
    {
      assetCategory: 'earthmoving',
      eventType: 'opening',
      photoCategory: 'opening_hour_meter',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Opening hour meter reading',
      isActive: true,
    },
    {
      assetCategory: 'earthmoving',
      eventType: 'opening',
      photoCategory: 'registration_plate',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 60,
      description: 'Asset registration plate',
      isActive: true,
    },

    // Earthmoving - Closing
    {
      assetCategory: 'earthmoving',
      eventType: 'closing',
      photoCategory: 'closing_hour_meter',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Closing hour meter reading',
      isActive: true,
    },

    // Transport - Opening
    {
      assetCategory: 'transport',
      eventType: 'opening',
      photoCategory: 'opening_odometer',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Opening odometer reading',
      isActive: true,
    },
    {
      assetCategory: 'transport',
      eventType: 'opening',
      photoCategory: 'fuel_gauge',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Opening fuel gauge reading',
      isActive: true,
    },

    // Transport - Closing
    {
      assetCategory: 'transport',
      eventType: 'closing',
      photoCategory: 'closing_odometer',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Closing odometer reading',
      isActive: true,
    },
    {
      assetCategory: 'transport',
      eventType: 'closing',
      photoCategory: 'fuel_gauge',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Closing fuel gauge reading',
      isActive: true,
    },

    // Concrete - Opening
    {
      assetCategory: 'concrete',
      eventType: 'opening',
      photoCategory: 'opening_hour_meter',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Opening hour meter reading',
      isActive: true,
    },

    // Concrete - Closing
    {
      assetCategory: 'concrete',
      eventType: 'closing',
      photoCategory: 'closing_hour_meter',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 30,
      description: 'Closing hour meter reading',
      isActive: true,
    },

    // Breakdown (all categories)
    {
      assetCategory: 'earthmoving',
      eventType: 'breakdown',
      photoCategory: 'damage',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 60,
      description: 'Damage or defect photo',
      isActive: true,
    },
    {
      assetCategory: 'transport',
      eventType: 'breakdown',
      photoCategory: 'damage',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 60,
      description: 'Damage or defect photo',
      isActive: true,
    },
    {
      assetCategory: 'concrete',
      eventType: 'breakdown',
      photoCategory: 'damage',
      minimumCount: 1,
      mandatory: true,
      requireInAppCamera: true,
      maxAgeMinutes: 60,
      description: 'Damage or defect photo',
      isActive: true,
    },
  ];

  for (const rule of defaultRules) {
    await createEvidenceRule(rule);
  }
}
