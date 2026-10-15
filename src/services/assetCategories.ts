/**
 * Part 04 — Asset Categories Service
 *
 * Configurable category tree for assets. Each category defines:
 * - Usage meter type (hour_meter, odometer, both, none)
 * - Fuel type and consumption unit
 * - Required documents
 * - Required evidence photo categories
 * - Whether operator licence validation applies
 */

import { storage } from './storage';
import { AssetCategory, AssetCategoryCode } from '../types';
import { generateId } from './utils';
import { recordAudit } from './audit';

const assetCategoriesStore = storage.getAdapter<AssetCategory>('asset_categories');

// ============================================================================
// Category Management
// ============================================================================

/**
 * Create an asset category.
 */
export async function createAssetCategory(
  data: Omit<AssetCategory, 'id' | 'createdAt'>,
  userId: string
): Promise<AssetCategory> {
  // Check for duplicate code
  const existing = await assetCategoriesStore.findOne({ code: data.code } as Partial<AssetCategory>);
  if (existing) {
    throw new Error(`Asset category with code '${data.code}' already exists`);
  }

  const category: AssetCategory = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  await assetCategoriesStore.create(category);

  // Audit
  await recordAudit({
    entityType: 'AssetCategory',
    entityId: category.id,
    action: 'create',
    before: null,
    after: category as any,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
  });

  return category;
}

/**
 * Get asset category by ID.
 */
export async function getAssetCategory(id: string): Promise<AssetCategory | null> {
  return assetCategoriesStore.findById(id);
}

/**
 * Get asset category by code.
 */
export async function getAssetCategoryByCode(code: AssetCategoryCode): Promise<AssetCategory | null> {
  return assetCategoriesStore.findOne({ code } as Partial<AssetCategory>);
}

/**
 * List all asset categories.
 */
export async function listAssetCategories(): Promise<AssetCategory[]> {
  return assetCategoriesStore.findAll();
}

/**
 * Update asset category.
 */
export async function updateAssetCategory(
  id: string,
  updates: Partial<AssetCategory>,
  userId: string
): Promise<AssetCategory> {
  const existing = await assetCategoriesStore.findById(id);
  if (!existing) {
    throw new Error(`Asset category ${id} not found`);
  }

  const updated = await assetCategoriesStore.update(id, updates);

  // Audit
  await recordAudit({
    entityType: 'AssetCategory',
    entityId: id,
    action: 'update',
    before: existing as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
  });

  return updated;
}

// ============================================================================
// Seed Default Categories
// ============================================================================

export async function seedDefaultAssetCategories(): Promise<void> {
  const existing = await assetCategoriesStore.findAll();
  if (existing.length > 0) return;

  const categories: Omit<AssetCategory, 'id' | 'createdAt'>[] = [
    {
      code: 'earthmoving',
      name: 'Earthmoving',
      description: 'Excavators, JCBs, backhoe loaders, wheel loaders, bulldozers, motor graders',
      usageMeterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'permit'],
      requiredEvidencePhotos: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
    },
    {
      code: 'compaction',
      name: 'Compaction',
      description: 'Vibratory rollers, tandem rollers, plate compactors',
      usageMeterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidencePhotos: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
    },
    {
      code: 'lifting',
      name: 'Lifting and Handling',
      description: 'Mobile and tower cranes, forklifts',
      usageMeterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'load_test_certificate'],
      requiredEvidencePhotos: ['hour_meter', 'registration_plate', 'load_test_certificate'],
      operatorLicenceRequired: true,
    },
    {
      code: 'concrete',
      name: 'Concrete',
      description: 'Concrete pumps, transit mixers, RMC batching plants, silos, aggregate bins, weigh hoppers, conveyors, admixture dosing systems, weighbridges',
      usageMeterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidencePhotos: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
    },
    {
      code: 'transport',
      name: 'Transport',
      description: 'Dumpers, tippers, trucks, water tankers, diesel bowsers/tankers',
      usageMeterType: 'both',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'both',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'permit', 'puc'],
      requiredEvidencePhotos: ['hour_meter', 'odometer', 'registration_plate'],
      operatorLicenceRequired: true,
    },
    {
      code: 'power_air',
      name: 'Power and Air',
      description: 'Generators (DG sets), compressors',
      usageMeterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidencePhotos: ['hour_meter'],
      operatorLicenceRequired: false,
    },
    {
      code: 'light_support',
      name: 'Light and Support',
      description: 'Staff vehicles, maintenance vans, miscellaneous machinery',
      usageMeterType: 'odometer',
      fuelType: 'petrol',
      fuelConsumptionUnit: 'L/km',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'puc'],
      requiredEvidencePhotos: ['odometer', 'registration_plate'],
      operatorLicenceRequired: true,
    },
  ];

  for (const category of categories) {
    await createAssetCategory(category, 'system');
  }
}
