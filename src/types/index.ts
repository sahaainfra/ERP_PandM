export type Status = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'returned' | 'posted' | 'reversed';
export type DataSource = 'manual' | 'imported' | 'integrated_live' | 'integrated_delayed' | 'system_calculated';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: 'excavator' | 'loader' | 'crane' | 'roller' | 'grader' | 'transit_mixer' | 'pump' | 'generator' | 'batch_plant';
  registrationNo: string;
  status: 'operational' | 'maintenance' | 'idle' | 'decommissioned';
  project: string;
  operator?: string;
  fuelCapacity: number; // litres
  currentFuel: number; // litres
  lastMaintenance: string;
  nextMaintenance: string;
  runningHours: number;
}

export interface OperatorLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  operatorName: string;
  date: string;
  startTime: string;
  endTime: string;
  runningHours: number;
  fuelConsumed: number; // litres
  fuelIssued: number; // litres
  openingReading: number; // km or hours
  closingReading: number;
  workDescription: string;
  status: Status;
  dataSource: DataSource;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  photos: string[];
}

export interface FuelRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  date: string;
  fuelIssued: number; // litres
  fuelConsumed: number; // litres
  expectedConsumption: number; // litres
  variance: number; // litres
  variancePercent: number;
  dataSource: DataSource;
  verifiedBy?: string;
  status: Status;
  notes?: string;
}

export interface RMCOrder {
  id: string;
  orderNo: string;
  plant: string;
  projectName: string;
  siteName: string;
  grade: string;
  quantity: number; // m³
  delivered: number; // m³
  status: Status;
  orderDate: string;
  deliveryDate: string;
  transitMixers: number;
  pumpRequired: boolean;
  specialInstructions?: string;
}

export interface MixDesign {
  id: string;
  code: string;
  grade: string;
  cement: number; // kg/m³
  sand: number; // kg/m³
  aggregate20mm: number; // kg/m³
  aggregate12mm: number; // kg/m³
  water: number; // litres/m³
  admixture: number; // ml/m³
  wcratio: number;
  slump: number; // mm
  targetStrength: number; // MPa
  status: 'draft' | 'approved' | 'active' | 'superseded';
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  readBy: string[];
  replyTo?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'project' | 'plant' | 'department' | 'direct';
  members: number;
  unread: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  affectedRecord?: string;
  responsiblePerson: string;
  createdAt: string;
  dueAt?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  recommendedAction: string;
  module: string;
}

export interface FinanceEntry {
  id: string;
  date: string;
  voucherNo: string;
  account: string;
  project: string;
  debit: number;
  credit: number;
  description: string;
  status: Status;
  createdBy: string;
  approvedBy?: string;
}

export interface DashboardKPI {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color: string;
}

// ============================================================================
// Part 04 — Asset Master Types
// ============================================================================

export type AssetCategoryCode =
  | 'earthmoving'
  | 'compaction'
  | 'lifting'
  | 'concrete'
  | 'transport'
  | 'power_air'
  | 'light_support';

export type UsageMeterType = 'hour_meter' | 'odometer' | 'both' | 'none';
export type FuelType = 'diesel' | 'petrol' | 'electric' | 'cng' | 'hybrid' | 'none';
export type FuelConsumptionUnit = 'L/hr' | 'L/km' | 'both';
export type AssetOwnership = 'owned' | 'leased' | 'rented' | 'subcontractor' | 'hired';
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

export interface AssetCategory {
  id: string;
  code: AssetCategoryCode;
  name: string;
  description: string;
  parentId?: string;
  usageMeterType: UsageMeterType;
  fuelType: FuelType;
  fuelConsumptionUnit: FuelConsumptionUnit;
  requiredDocuments: string[]; // e.g., ['registration_certificate', 'fitness_certificate', 'insurance']
  requiredEvidencePhotos: string[]; // e.g., ['hour_meter', 'odometer', 'registration_plate']
  operatorLicenceRequired: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  companyId: string;
  categoryId: string;
  
  // Identity
  assetCode: string;
  registrationNumber: string;
  country: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  serialNumber?: string;
  chassisNumber?: string;
  engineNumber?: string;
  capacity?: number;
  capacityUnit?: string;
  color?: string;
  photographs: string[]; // Attachment IDs
  
  // Ownership
  ownership: AssetOwnership;
  ownerVendorId?: string;
  contractReference?: string;
  rateBasis?: string;
  rate?: number;
  rateCurrency?: string;
  
  // Finance link
  purchaseDate?: string;
  purchaseCost?: number;
  fixedAssetId?: string; // Link to accounting fixed-asset record
  depreciationMethod?: string;
  bookValue?: number; // Read from accounting, never recalculated
  
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
  
  // Meters
  currentHourMeter?: number;
  currentOdometer?: number;
  
  // Fuel
  tankCapacity?: number; // litres
  fuelType?: FuelType;
  fuelBenchmarkId?: string; // Link to benchmark (Part 10)
  
  // Telematics
  telematicsDeviceId?: string;
  telematicsProvider?: string;
  telematicsSim?: string;
  hasFuelSensor?: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AssetDocument {
  id: string;
  assetId: string;
  documentType: string; // e.g., 'registration_certificate', 'fitness_certificate', 'insurance'
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  attachmentId: string; // Link to uploaded file
  issuingAuthority?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetMeterReading {
  id: string;
  assetId: string;
  meterType: 'hour_meter' | 'odometer';
  reading: number;
  readingDate: string;
  verifiedBy?: string;
  attachmentId?: string; // Photo evidence
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface AssetMeterReplacement {
  id: string;
  assetId: string;
  meterType: 'hour_meter' | 'odometer';
  oldMeterFinalReading: number;
  newMeterStartReading: number;
  replacementDate: string;
  reason: string;
  approvedBy: string;
  approvedAt: string;
  attachmentId?: string; // Photo evidence
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface AssetAllocation {
  id: string;
  assetId: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  departmentId?: string;
  startDate: string;
  endDate?: string;
  reason?: string;
  createdAt: string;
  createdBy: string;
}

export interface AssetImportRow {
  rowNumber: number;
  assetCode: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  categoryCode: AssetCategoryCode;
  ownership: AssetOwnership;
  status: AssetStatus;
  [key: string]: string | number | undefined;
}

export interface AssetImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{
    rowNumber: number;
    field: string;
    message: string;
  }>;
  warnings: Array<{
    rowNumber: number;
    field: string;
    message: string;
  }>;
  dryRun: boolean;
  importedCount: number;
}
