/**
 * Part 04 — Asset Categories Service
 */

import { storage } from './storage';
import { AssetCategoryDefinition, AssetCategory, AssetSubCategory, MeterType, FuelType, FuelConsumptionUnit } from './assetTypes';
import { generateId } from './utils';

const categoriesStore = storage.getAdapter<AssetCategoryDefinition>('asset_categories');

/**
 * Seed default asset categories
 */
export async function seedAssetCategories(): Promise<void> {
  const existing = await categoriesStore.findAll();
  if (existing.length > 0) return;

  const categories: Omit<AssetCategoryDefinition, 'id' | 'createdAt'>[] = [
    {
      code: 'earthmoving',
      name: 'Earthmoving',
      description: 'Excavators, loaders, bulldozers, graders',
      meterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'pollution_certificate'],
      requiredEvidenceCategories: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'excavator', name: 'Excavator' },
        { code: 'jcb', name: 'JCB' },
        { code: 'backhoe_loader', name: 'Backhoe Loader' },
        { code: 'wheel_loader', name: 'Wheel Loader' },
        { code: 'bulldozer', name: 'Bulldozer' },
        { code: 'motor_grader', name: 'Motor Grader' },
      ],
    },
    {
      code: 'compaction',
      name: 'Compaction',
      description: 'Rollers, compactors',
      meterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidenceCategories: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'vibratory_roller', name: 'Vibratory Roller' },
        { code: 'tandem_roller', name: 'Tandem Roller' },
        { code: 'plate_compactor', name: 'Plate Compactor' },
      ],
    },
    {
      code: 'lifting_handling',
      name: 'Lifting & Handling',
      description: 'Cranes, forklifts',
      meterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'load_test_certificate'],
      requiredEvidenceCategories: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'mobile_crane', name: 'Mobile Crane' },
        { code: 'tower_crane', name: 'Tower Crane' },
        { code: 'forklift', name: 'Forklift' },
      ],
    },
    {
      code: 'concrete',
      name: 'Concrete',
      description: 'Pumps, mixers, batching plants',
      meterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidenceCategories: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'boom_pump', name: 'Boom Pump' },
        { code: 'line_pump', name: 'Line Pump' },
        { code: 'transit_mixer', name: 'Transit Mixer' },
        { code: 'batching_plant', name: 'Batching Plant' },
        { code: 'silo', name: 'Silo' },
        { code: 'aggregate_bin', name: 'Aggregate Bin' },
        { code: 'weigh_hopper', name: 'Weigh Hopper' },
        { code: 'conveyor', name: 'Conveyor' },
        { code: 'admixture_dosing', name: 'Admixture Dosing System' },
        { code: 'weighbridge', name: 'Weighbridge' },
      ],
    },
    {
      code: 'transport',
      name: 'Transport',
      description: 'Trucks, tankers, dumpers',
      meterType: 'both',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'both',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'pollution_certificate', 'permit'],
      requiredEvidenceCategories: ['odometer', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'dumper', name: 'Dumper' },
        { code: 'tipper', name: 'Tipper' },
        { code: 'truck', name: 'Truck' },
        { code: 'water_tanker', name: 'Water Tanker' },
        { code: 'diesel_bowser', name: 'Diesel Bowser/Tanker' },
      ],
    },
    {
      code: 'power_air',
      name: 'Power & Air',
      description: 'Generators, compressors',
      meterType: 'hour_meter',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'L/hr',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance'],
      requiredEvidenceCategories: ['hour_meter', 'registration_plate'],
      operatorLicenceRequired: false,
      subCategories: [
        { code: 'generator', name: 'Generator (DG Set)' },
        { code: 'compressor', name: 'Compressor' },
      ],
    },
    {
      code: 'light_support',
      name: 'Light & Support',
      description: 'Staff vehicles, maintenance vans',
      meterType: 'both',
      fuelType: 'diesel',
      fuelConsumptionUnit: 'both',
      requiredDocuments: ['registration_certificate', 'fitness_certificate', 'insurance', 'pollution_certificate'],
      requiredEvidenceCategories: ['odometer', 'registration_plate'],
      operatorLicenceRequired: true,
      subCategories: [
        { code: 'staff_vehicle', name: 'Staff Vehicle' },
        { code: 'maintenance_van', name: 'Maintenance Van' },
        { code: 'miscellaneous', name: 'Miscellaneous Machinery' },
      ],
    },
  ];

  for (const category of categories) {
    await categoriesStore.create({
      ...category,
      id: generateId(),
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Get all asset categories
 */
export async function getAllCategories(): Promise<AssetCategoryDefinition[]> {
  return categoriesStore.findAll();
}

/**
 * Get category by code
 */
export async function getCategory(code: AssetCategory): Promise<AssetCategoryDefinition | null> {
  return categoriesStore.findOne({ code } as Partial<AssetCategoryDefinition>);
}

/**
 * Get category definition with subcategories
 */
export async function getCategoryWithSubCategories(code: AssetCategory): Promise<AssetCategoryDefinition | null> {
  return categoriesStore.findOne({ code } as Partial<AssetCategoryDefinition>);
}

/**
 * Validate subcategory belongs to category
 */
export async function validateSubCategory(category: AssetCategory, subCategory: AssetSubCategory): Promise<boolean> {
  const categoryDef = await getCategory(category);
  if (!categoryDef) return false;
  return categoryDef.subCategories.some(sc => sc.code === subCategory);
}

/**
 * Get meter type for category
 */
export async function getMeterTypeForCategory(category: AssetCategory): Promise<MeterType> {
  const categoryDef = await getCategory(category);
  return categoryDef?.meterType || 'none';
}

/**
 * Get fuel type for category
 */
export async function getFuelTypeForCategory(category: AssetCategory): Promise<FuelType> {
  const categoryDef = await getCategory(category);
  return categoryDef?.fuelType || 'diesel';
}

/**
 * Get required documents for category
 */
export async function getRequiredDocuments(category: AssetCategory): Promise<string[]> {
  const categoryDef = await getCategory(category);
  return categoryDef?.requiredDocuments || [];
}

/**
 * Check if operator licence is required
 */
export async function isOperatorLicenceRequired(category: AssetCategory): Promise<boolean> {
  const categoryDef = await getCategory(category);
  return categoryDef?.operatorLicenceRequired || false;
}
