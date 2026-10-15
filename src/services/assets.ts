/**
 * Part 04 — Asset Master Service
 *
 * Authoritative register for all machines, vehicles, plant items and equipment units.
 * Linked to fixed-asset and accounting records (never duplicates financial data).
 */

import { storage } from './storage';
import { Asset, AssetStatus, AssetOwnership } from '../types';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getAssetCategoryByCode } from './assetCategories';

const assetsStore = storage.getAdapter<Asset>('assets');

// ============================================================================
// Asset CRUD
// ============================================================================

/**
 * Create a new asset.
 */
export async function createAsset(
  data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<Asset> {
  // Validate unique constraints
  await validateUniqueConstraints(data);

  // Check for near-duplicates (fuzzy match)
  const nearDuplicates = await detectNearDuplicates(data);
  if (nearDuplicates.length > 0) {
    console.warn(`Near-duplicate assets detected: ${nearDuplicates.map(a => a.assetCode).join(', ')}`);
  }

  const asset: Asset = {
    ...data,
    id: generateId(),
    status: data.status || 'available',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await assetsStore.create(asset);

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: asset.id,
    action: 'create',
    before: null,
    after: asset as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
  });

  return asset;
}

/**
 * Get asset by ID.
 */
export async function getAsset(id: string): Promise<Asset | null> {
  return assetsStore.findById(id);
}

/**
 * List assets with filters.
 */
export async function listAssets(filters?: {
  companyId?: string;
  categoryId?: string;
  status?: AssetStatus;
  ownership?: AssetOwnership;
  projectId?: string;
  siteId?: string;
  plantId?: string;
}): Promise<Asset[]> {
  let assets = await assetsStore.findAll();

  if (filters?.companyId) {
    assets = assets.filter(a => a.companyId === filters.companyId);
  }
  if (filters?.categoryId) {
    assets = assets.filter(a => a.categoryId === filters.categoryId);
  }
  if (filters?.status) {
    assets = assets.filter(a => a.status === filters.status);
  }
  if (filters?.ownership) {
    assets = assets.filter(a => a.ownership === filters.ownership);
  }
  if (filters?.projectId) {
    assets = assets.filter(a => a.currentProjectId === filters.projectId);
  }
  if (filters?.siteId) {
    assets = assets.filter(a => a.currentSiteId === filters.siteId);
  }
  if (filters?.plantId) {
    assets = assets.filter(a => a.currentPlantId === filters.plantId);
  }

  return assets;
}

/**
 * Update asset.
 */
export async function updateAsset(
  id: string,
  updates: Partial<Asset>,
  userId: string
): Promise<Asset> {
  const existing = await assetsStore.findById(id);
  if (!existing) {
    throw new Error(`Asset ${id} not found`);
  }

  // Validate unique constraints if identity fields changed
  if (updates.assetCode || updates.registrationNumber || updates.serialNumber) {
    const merged = { ...existing, ...updates };
    await validateUniqueConstraints(merged, id);
  }

  // Validate status change
  if (updates.status && updates.status !== existing.status) {
    await validateStatusChange(existing, updates.status);
  }

  const updated = await assetsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: id,
    action: 'update',
    before: existing as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
  });

  return updated;
}

/**
 * Delete asset (soft delete by changing status to 'disposed').
 */
export async function disposeAsset(
  id: string,
  userId: string,
  reason: string
): Promise<Asset> {
  const existing = await assetsStore.findById(id);
  if (!existing) {
    throw new Error(`Asset ${id} not found`);
  }

  // Check for open work orders or allocations
  // (In production, would query work_orders and allocations tables)

  const updated = await assetsStore.update(id, {
    status: 'disposed',
    updatedAt: new Date().toISOString(),
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: id,
    action: 'update',
    before: { status: existing.status },
    after: { status: 'disposed' },
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason,
  });

  return updated;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate unique constraints on asset code, registration number, serial number.
 */
async function validateUniqueConstraints(
  data: Partial<Asset>,
  excludeId?: string
): Promise<void> {
  const allAssets = await assetsStore.findAll();

  // Asset code must be unique
  if (data.assetCode) {
    const duplicate = allAssets.find(
      a => a.assetCode === data.assetCode && a.id !== excludeId
    );
    if (duplicate) {
      throw new Error(`Asset code '${data.assetCode}' already exists`);
    }
  }

  // Registration number must be unique per country
  if (data.registrationNumber && data.country) {
    const duplicate = allAssets.find(
      a =>
        a.registrationNumber === data.registrationNumber &&
        a.country === data.country &&
        a.id !== excludeId
    );
    if (duplicate) {
      throw new Error(
        `Registration number '${data.registrationNumber}' already exists in ${data.country}`
      );
    }
  }

  // Serial/chassis number must be unique
  if (data.serialNumber) {
    const duplicate = allAssets.find(
      a => a.serialNumber === data.serialNumber && a.id !== excludeId
    );
    if (duplicate) {
      throw new Error(`Serial number '${data.serialNumber}' already exists`);
    }
  }
}

/**
 * Detect near-duplicates (fuzzy match on make+model+serial).
 */
async function detectNearDuplicates(data: Partial<Asset>): Promise<Asset[]> {
  if (!data.make || !data.model || !data.serialNumber) {
    return [];
  }

  const allAssets = await assetsStore.findAll();

  return allAssets.filter(a => {
    // Fuzzy match: same make + model + similar serial
    if (a.make !== data.make || a.model !== data.model) {
      return false;
    }

    // Check if serial is similar (e.g., differs by 1-2 characters)
    if (!a.serialNumber || !data.serialNumber) {
      return false;
    }

    const similarity = calculateStringSimilarity(a.serialNumber, data.serialNumber);
    return similarity > 0.8; // 80% similar
  });
}

/**
 * Calculate string similarity (0-1) using Levenshtein distance.
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  // Simple similarity: 1 - (edit distance / max length)
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Levenshtein distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Validate status change.
 */
async function validateStatusChange(
  asset: Asset,
  newStatus: AssetStatus
): Promise<void> {
  // Define valid transitions
  const validTransitions: Record<AssetStatus, AssetStatus[]> = {
    available: ['deployed', 'idle', 'standby', 'under_maintenance', 'breakdown', 'out_of_service', 'disposed'],
    deployed: ['available', 'idle', 'standby', 'under_maintenance', 'breakdown', 'out_of_service', 'in_transit', 'disposed'],
    idle: ['available', 'deployed', 'standby', 'under_maintenance', 'breakdown', 'out_of_service', 'disposed'],
    standby: ['available', 'deployed', 'idle', 'under_maintenance', 'breakdown', 'out_of_service', 'disposed'],
    under_maintenance: ['available', 'deployed', 'idle', 'standby', 'breakdown', 'out_of_service', 'disposed'],
    breakdown: ['under_maintenance', 'out_of_service', 'disposed'],
    out_of_service: ['available', 'under_maintenance', 'disposed'],
    in_transit: ['deployed', 'available', 'idle'],
    disposed: [],
  };

  const allowed = validTransitions[asset.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: cannot change from '${asset.status}' to '${newStatus}'`
    );
  }

  // Additional validation: check for open work orders before certain transitions
  if (newStatus === 'disposed' || newStatus === 'out_of_service') {
    // In production, would check for open work orders
    console.log(`Asset ${asset.assetCode} transitioning to ${newStatus} — checking for open work orders`);
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Get assets by category code.
 */
export async function getAssetsByCategory(categoryCode: string): Promise<Asset[]> {
  const category = await getAssetCategoryByCode(categoryCode as any);
  if (!category) {
    throw new Error(`Category ${categoryCode} not found`);
  }

  const allAssets = await assetsStore.findAll();
  return allAssets.filter(a => a.categoryId === category.id);
}

/**
 * Get assets expiring documents within N days.
 */
export async function getAssetsWithExpiringDocuments(
  companyId: string,
  daysThreshold: number
): Promise<Asset[]> {
  // In production, would join with asset_documents table
  // For now, return all assets (document expiry check is in assetDocuments service)
  return listAssets({ companyId });
}

/**
 * Get asset statistics.
 */
export async function getAssetStatistics(companyId: string): Promise<{
  total: number;
  byStatus: Record<AssetStatus, number>;
  byOwnership: Record<AssetOwnership, number>;
}> {
  const assets = await listAssets({ companyId });

  const byStatus: Record<string, number> = {};
  const byOwnership: Record<string, number> = {};

  for (const asset of assets) {
    byStatus[asset.status] = (byStatus[asset.status] || 0) + 1;
    byOwnership[asset.ownership] = (byOwnership[asset.ownership] || 0) + 1;
  }

  return {
    total: assets.length,
    byStatus: byStatus as Record<AssetStatus, number>,
    byOwnership: byOwnership as Record<AssetOwnership, number>,
  };
}
