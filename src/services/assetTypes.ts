/**
 * Part 04 — Asset Master Types
 */

import { Status, DataSource } from './types';

// ============================================================================
// Asset Categories
// ============================================================================

export type AssetCategory =
  | 'earthmoving'
  | 'compaction'
  | 'lifting_handling'
  | 'concrete'
  | 'transport'
  | 'power_air'
  | 'light_support';

export type AssetSubCategory =
  // Earthmoving
  | 'excavator'
  | 'jcb'
  | 'backhoe_loader'
  | 'wheel_loader'
  | 'bulldozer'
  | 'motor_grader'
  // Compaction
  | 'vibratory_roller'
  | 'tandem_roller'
  | 'plate_compactor'
  // Lifting
  | 'mobile_crane'
  | 'tower_crane'
  | 'forklift'
  // Concrete
  | 'boom_pump'
  | 'line_pump'
  | 'transit_mixer'
  | 'batching_plant'
  | 'silo'
  | 'aggregate_bin'
  | 'weigh_hopper'
  | 'conveyor'
  | 'admixture_dosing'
  | 'weighbridge'
  // Transport
  | 'dumper'
  | 'tipper'
  | 'truck'
  | 'water_tanker'
  | 'diesel_bowser'
  // Power
  | 'generator'
  | 'compressor'
  // Light
  | 'staff_vehicle'
  | 'maintenance_van'
  | 'miscellaneous';

export type MeterType = 'hour_meter' | 'odometer' | 'both' | 'none';
export type FuelType = 'diesel' | 'petrol' | 'electric' | 'cng' | 'hybrid' | 'none';
export type FuelConsumptionUnit = 'L/hr' | 'L/km' | 'both';
export type OwnershipType = 'owned' | 'leased' | 'rented' | 'subcontractor' | 'hired';
export type AssetStatus =
  | 'available'
  | 'deployed'
  | 'idle'
  | 'standby'
  | 'under_maintenance'
  | 'breakdown'
  | 'out_of_service'
  | 'in_transit'
  | 'disposed';

export interface AssetCategoryDefinition {
  id: string;
  code: AssetCategory;
  name: string;
  description: string;
  meterType: MeterType;
  fuelType: FuelType;
  fuelConsumptionUnit: FuelConsumptionUnit;
  requiredDocuments: string[];
  requiredEvidenceCategories: string[];
  operatorLicenceRequired: boolean;
  subCategories: AssetSubCategoryDefinition[];
  createdAt: string;
}

export interface AssetSubCategoryDefinition {
  code: AssetSubCategory;
  name: string;
  description?: string;
}

// ============================================================================
// Asset Record
// ============================================================================

export interface Asset {
  id: string;
  assetCode: string;
  registrationNumber: string;
  country: string;
  
  // Identity
  make: string;
  model: string;
  variant?: string;
  year: number;
  serialNumber: string;
  chassisNumber?: string;
  engineNumber?: string;
  capacity?: number;
  capacityUnit?: string;
  category: AssetCategory;
  subCategory: AssetSubCategory;
  colour?: string;
  photographs: string[]; // Attachment IDs
  
  // Ownership
  ownershipType: OwnershipType;
  ownerVendorId?: string;
  contractReference?: string;
  rateBasis?: string;
  rate?: number;
  rateCurrency?: string;
  
  // Finance
  purchaseDate?: string;
  purchaseCost?: number;
  fixedAssetId?: string;
  depreciationMethod?: string;
  bookValue?: number;
  
  // Compliance Documents
  documents: ComplianceDocument[];
  
  // Assignment
  currentProjectId?: string;
  currentSiteId?: string;
  currentPlantId?: string;
  departmentId?: string;
  supervisorId?: string;
  defaultOperatorId?: string;
  location?: string;
  
  // Status
  status: AssetStatus;
  statusChangedAt: string;
  statusChangedBy: string;
  statusChangeReason?: string;
  
  // Meters
  currentHourMeter?: number;
  currentOdometer?: number;
  hourMeterApprovedAt?: string;
  odometerApprovedAt?: string;
  meterReplacements: MeterReplacement[];
  
  // Fuel
  tankCapacity?: number; // litres
  fuelType: FuelType;
  fuelBenchmarkId?: string;
  
  // Telematics
  telematicsDeviceId?: string;
  telematicsProvider?: string;
  simNumber?: string;
  fuelSensorPresent: boolean;
  
  // Metadata
  dataSource: DataSource;
  status_: Status;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ComplianceDocument {
  id: string;
  type: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  attachmentId?: string;
  issuedBy?: string;
  notes?: string;
  alertSent: boolean;
  alertSentAt?: string;
}

export interface MeterReplacement {
  id: string;
  meterType: 'hour_meter' | 'odometer';
  oldMeterFinalReading: number;
  newMeterStartReading: number;
  replacementDate: string;
  reason: string;
  approvedBy: string;
  approvedAt: string;
  attachmentId?: string;
}

// ============================================================================
// Asset Allocation History
// ============================================================================

export interface AssetAllocation {
  id: string;
  assetId: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  departmentId?: string;
  startDate: string;
  endDate?: string;
  allocatedBy: string;
  reason?: string;
  createdAt: string;
}

// ============================================================================
// Bulk Import
// ============================================================================

export interface BulkImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: BulkImportError[];
  warnings: BulkImportWarning[];
  dryRun: boolean;
  imported: boolean;
  importedAt?: string;
}

export interface BulkImportError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface BulkImportWarning {
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface BulkImportRow {
  assetCode: string;
  registrationNumber: string;
  country: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  serialNumber: string;
  category: AssetCategory;
  subCategory: AssetSubCategory;
  ownershipType: OwnershipType;
  fuelType: FuelType;
  tankCapacity?: number;
  [key: string]: unknown;
}
