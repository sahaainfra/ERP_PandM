/**
 * Part 16 — QA/QC Types
 */

import { Status } from './types';

// ============================================================================
// Test Configuration
// ============================================================================

export type TestCategory = 'incoming_material' | 'fresh_concrete' | 'hardened_concrete' | 'other';
export type TestFrequencyType = 'per_lot' | 'per_tonnes' | 'per_m3' | 'per_day' | 'per_pour' | 'per_batch';

export interface TestType {
  id: string;
  code: string;
  name: string;
  category: TestCategory;
  
  // Test parameters
  parameters: TestParameter[];
  
  // Method
  methodReference?: string; // e.g., 'IS 1199', 'IS 516'
  methodDescription?: string;
  
  // Frequency
  frequencyType: TestFrequencyType;
  frequencyValue?: number; // e.g., 100 tonnes, 50 m³
  
  // Acceptance criteria
  acceptanceCriteria: AcceptanceCriterion[];
  
  // Source
  sourceStandard?: string; // e.g., 'IS 383:2016', 'IS 456:2000'
  sourceContract?: string; // Contract specification reference
  sourceVerifiedBy?: string;
  sourceVerifiedAt?: string;
  
  // Status
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TestParameter {
  id: string;
  testTypeId: string;
  name: string;
  unit: string;
  dataType: 'number' | 'text' | 'boolean' | 'date';
  isRequired: boolean;
  minValue?: number;
  maxValue?: number;
  precision?: number;
}

export interface AcceptanceCriterion {
  id: string;
  testTypeId: string;
  parameterId: string;
  
  // Criteria
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';
  value?: number | string | boolean;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
  
  // Grade-specific (for concrete tests)
  applicableGrades?: string[]; // e.g., ['M25', 'M30']
  
  // Source
  sourceStandard?: string;
  sourceClause?: string;
  
  // Severity
  severity: 'critical' | 'major' | 'minor';
  
  createdAt: string;
}

// ============================================================================
// Laboratories
// ============================================================================

export type LabType = 'in_house_plant' | 'in_house_site' | 'external_accredited';

export interface Laboratory {
  id: string;
  code: string;
  name: string;
  type: LabType;
  
  // Location
  plantId?: string;
  siteId?: string;
  address?: string;
  
  // Accreditation (for external labs)
  accreditationBody?: string;
  accreditationNumber?: string;
  accreditationExpiryDate?: string;
  
  // Equipment
  equipment: LabEquipment[];
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface LabEquipment {
  id: string;
  labId: string;
  
  // Equipment details
  name: string;
  type: string; // e.g., 'compression_testing_machine', 'slump_cone', 'thermometer'
  model?: string;
  serialNumber?: string;
  
  // Calibration
  calibrationRecordId?: string; // Link to Part 10 calibration
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  calibrationStatus: 'valid' | 'due_soon' | 'overdue' | 'not_calibrated';
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Incoming Material Testing
// ============================================================================

export type MaterialLotStatus = 'on_hold' | 'accepted' | 'rejected' | 'conditionally_accepted';

export interface MaterialLot {
  id: string;
  lotNumber: string;
  
  // Material
  materialId: string;
  materialName: string;
  materialCategory: string;
  
  // Supplier
  supplierId: string;
  supplierName: string;
  
  // Receipt
  receiptId: string; // Link to Part 15 receipt
  receiptDate: string;
  quantity: number;
  unit: string;
  
  // Test certificates
  testCertificates: TestCertificate[];
  
  // Inspection results
  inspectionResults: InspectionResult[];
  
  // Status
  status: MaterialLotStatus;
  
  // Conditional acceptance
  conditionalAcceptanceReason?: string;
  conditionalAcceptanceApprovedBy?: string;
  conditionalAcceptanceApprovedAt?: string;
  
  // Rejection
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  returnToSupplier: boolean;
  
  // Metadata
  inspectedBy?: string;
  inspectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestCertificate {
  id: string;
  lotId: string;
  
  // Certificate details
  certificateNumber: string;
  issueDate: string;
  issuedBy: string; // Supplier or lab
  
  // Attachment
  attachmentId?: string;
  
  // Key values (manually entered from certificate)
  keyValues: Record<string, number | string>;
  
  // Verification
  verifiedBy?: string;
  verifiedAt?: string;
  
  createdAt: string;
}

export interface InspectionResult {
  id: string;
  lotId: string;
  testTypeId: string;
  
  // Test execution
  testDate: string;
  testedBy: string;
  labId?: string;
  equipmentId?: string;
  
  // Results
  parameterValues: Record<string, number | string | boolean>;
  
  // Acceptance
  passed: boolean;
  failedCriteria: string[]; // Criterion IDs that failed
  
  // Notes
  notes?: string;
  
  createdAt: string;
}

// ============================================================================
// Fresh Concrete Testing
// ============================================================================

export interface FreshConcreteTest {
  id: string;
  testNumber: string;
  
  // Link to batch
  batchId: string;
  batchNumber: string;
  plantId: string;
  
  // Test details
  testDate: string;
  testTime: string;
  testedBy: string;
  labId?: string;
  equipmentId?: string;
  
  // Location
  testLocation: 'plant' | 'site';
  locationDetails?: string;
  
  // Test results
  slump?: number; // mm
  flow?: number; // mm (for SCC)
  concreteTemperature?: number; // °C
  ambientTemperature?: number; // °C
  density?: number; // kg/m³
  airContent?: number; // %
  
  // Time tracking
  batchingTime?: string;
  testTime?: string;
  transitTime?: number; // minutes
  
  // Acceptance
  passed: boolean;
  failedCriteria: string[];
  
  // Actions
  deliveryOnHold: boolean;
  siteRejection: boolean;
  
  // Notes
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Specimen Management
// ============================================================================

export type SpecimenType = 'cube' | 'cylinder';

export interface SpecimenSet {
  id: string;
  setId: string; // Unique set identifier
  
  // Link to batch
  batchId: string;
  batchNumber: string;
  deliveryChallanId?: string;
  productionOrderId?: string;
  projectId?: string;
  structuralElement?: string;
  
  // Specimen details
  specimenType: SpecimenType;
  size: number; // mm (150 for cube, 150x300 for cylinder)
  numberOfSpecimens: number;
  
  // Sampling
  samplingPoint: string; // e.g., 'first truck', 'mid-pour'
  sampledBy: string;
  samplingTime: string;
  castingTime: string;
  
  // Specimens
  specimens: Specimen[];
  
  // Curing
  curingMethod: 'water' | 'steam' | 'standard';
  curingStartDate: string;
  
  // Test schedule
  testSchedule: TestSchedule[];
  
  // Status
  status: 'cast' | 'curing' | 'testing' | 'completed';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface Specimen {
  id: string;
  specimenId: string; // Unique specimen identifier (for labels/QR)
  setId: string;
  
  // Position in set
  position: number; // 1, 2, 3, etc.
  
  // Test results (per age)
  testResults: SpecimenTestResult[];
  
  // Status
  status: 'pending' | 'tested' | 'failed';
  
  createdAt: string;
}

export interface TestSchedule {
  id: string;
  setId: string;
  
  // Test age
  testAge: number; // days (3, 7, 28, etc.)
  
  // Schedule
  scheduledDate: string;
  scheduledBy: string;
  
  // Execution
  testedDate?: string;
  testedBy?: string;
  labId?: string;
  
  // Status
  status: 'scheduled' | 'due' | 'overdue' | 'completed';
  
  // Alerts
  alertRaised: boolean;
  alertId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface SpecimenTestResult {
  id: string;
  specimenId: string;
  testScheduleId: string;
  
  // Test details
  testAge: number; // days
  testDate: string;
  testedBy: string;
  labId: string;
  equipmentId?: string;
  
  // Results
  load: number; // kN or kg
  area: number; // mm²
  strength: number; // MPa (system-calculated)
  failureMode?: string; // e.g., 'cone', 'shear', 'splitting'
  
  // Acceptance
  targetStrength: number; // MPa
  passed: boolean;
  
  // Notes
  notes?: string;
  
  createdAt: string;
}

// ============================================================================
// Nonconformance (NCR)
// ============================================================================

export type NCRSource = 'material' | 'batch' | 'delivery' | 'strength_result' | 'customer_complaint' | 'other';
export type NCRSeverity = 'critical' | 'major' | 'minor';
export type NCRStatus = 'open' | 'investigating' | 'corrective_action' | 'verification' | 'closed';

export interface NonconformanceReport {
  id: string;
  ncrNumber: string;
  
  // Source
  source: NCRSource;
  sourceId?: string; // Link to material lot, batch, delivery, etc.
  sourceDetails?: string;
  
  // Description
  title: string;
  description: string;
  severity: NCRSeverity;
  
  // Evidence
  evidenceIds: string[]; // Attachment IDs
  
  // Containment
  containmentAction: string;
  containmentDate: string;
  containedBy: string;
  
  // Root cause
  rootCause?: string;
  rootCauseAnalysis?: string;
  
  // Corrective and preventive action
  correctiveAction?: string;
  preventiveAction?: string;
  
  // Ownership
  owner: string;
  dueDate: string;
  
  // Verification
  verificationAction?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  
  // Closure
  status: NCRStatus;
  closedBy?: string; // QC Manager (not owner)
  closedAt?: string;
  closureNotes?: string;
  
  // Customer complaint link
  customerComplaintId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Traceability
// ============================================================================

export interface TraceQuery {
  id: string;
  queryType: 'forward' | 'backward';
  
  // Starting point
  entityType: string;
  entityId: string;
  
  // Results
  relatedEntities: TraceResult[];
  
  // Metadata
  queriedBy: string;
  queriedAt: string;
}

export interface TraceResult {
  entityType: string;
  entityId: string;
  entityNumber?: string;
  relationship: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

export interface QCConfiguration {
  id: string;
  
  // Specimen testing
  defaultTestAges: number[]; // e.g., [3, 7, 28]
  specimenTestDueAlertDays: number;
  specimenTestOverdueAlertDays: number;
  
  // Statistical analysis
  minimumSampleSizeForStatistics: number;
  
  // NCR
  ncrDueAlertDays: number;
  ncrOverdueAlertDays: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
