/**
 * Part 16 — Quality Assurance and Quality Control Types
 */

import { Status } from './types';

// ============================================================================
// Test Configuration
// ============================================================================

export type TestCategory = 'incoming_material' | 'fresh_concrete' | 'hardened_concrete' | 'soil' | 'aggregate' | 'other';
export type TestFrequency = 'per_lot' | 'per_x_tonnes' | 'per_y_m3' | 'per_day' | 'per_pour' | 'per_batch' | 'custom';

export interface TestType {
  id: string;
  code: string; // e.g., 'SLUMP_TEST', 'CUBE_7DAY', 'SIEVE_ANALYSIS'
  name: string;
  category: TestCategory;
  description?: string;
  
  // Parameters
  parameters: TestParameter[];
  
  // Method reference
  methodStandard?: string; // e.g., 'IS 1199', 'IS 516'
  methodReference?: string; // Link to method document
  
  // Frequency
  frequency: TestFrequency;
  frequencyValue?: number; // For per_x_tonnes, per_y_m3
  frequencyDescription?: string; // Custom description
  
  // Acceptance criteria
  acceptanceCriteria: AcceptanceCriterion[];
  
  // Source reference
  criteriaSource: string; // e.g., 'IS 456:2000', 'Project Specification XYZ'
  criteriaSourceVerifiedBy?: string;
  criteriaSourceVerifiedAt?: string;
  
  // Effective dates
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TestParameter {
  id: string;
  testTypeId: string;
  name: string;
  unit: string;
  dataType: 'number' | 'text' | 'boolean' | 'select';
  required: boolean;
  minValue?: number;
  maxValue?: number;
  options?: string[]; // For select type
  description?: string;
}

export interface AcceptanceCriterion {
  id: string;
  testTypeId: string;
  parameterId: string;
  
  // Criteria
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in';
  value: number | string | number[];
  value2?: number; // For 'between' operator
  
  // Grade-specific (optional)
  applicableGrades?: string[]; // e.g., ['M25', 'M30']
  
  // Severity
  severity: 'pass' | 'warning' | 'fail';
  
  // Description
  description: string;
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
  accreditationExpiry?: string;
  
  // Equipment
  equipment: LabEquipment[];
  
  // Contact
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  
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
  
  // Calibration link
  calibrationRecordId?: string; // Link to Part 11 calibration
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  
  // Status
  status: 'operational' | 'calibration_due' | 'calibration_overdue' | 'out_of_service';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Incoming Material Inspection
// ============================================================================

export type LotStatus = 'on_hold' | 'accepted' | 'rejected' | 'conditionally_accepted';

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
  
  // Inspection
  inspectionDate?: string;
  inspectionResults: InspectionResult[];
  
  // Status
  status: LotStatus;
  
  // Conditional acceptance
  conditionalApprovalNotes?: string;
  conditionalApprovedBy?: string;
  conditionalApprovedAt?: string;
  conditionalExpiryDate?: string;
  
  // Rejection
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  
  // NCR link
  ncrId?: string; // If rejected or conditionally accepted
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TestCertificate {
  id: string;
  lotId: string;
  
  // Certificate details
  certificateNumber: string;
  issueDate: string;
  issuedBy: string; // Supplier or lab
  
  // Attachment
  attachmentId?: string; // Link to Part 02 attachment
  
  // Key values
  keyValues: Record<string, number | string>;
  
  // Metadata
  uploadedAt: string;
  uploadedBy: string;
}

export interface InspectionResult {
  id: string;
  lotId: string;
  
  // Test link
  testTypeId: string;
  testTypeName: string;
  
  // Results
  parameters: Record<string, number | string | boolean>;
  
  // Evaluation
  result: 'pass' | 'fail' | 'warning';
  evaluationNotes?: string;
  
  // Tester
  testedBy: string;
  testedAt: string;
  labId?: string;
  
  // Equipment
  equipmentId?: string;
  equipmentCalibrationValid: boolean;
  
  // Metadata
  createdAt: string;
}

// ============================================================================
// Fresh Concrete Testing
// ============================================================================

export interface FreshConcreteTest {
  id: string;
  testNumber: string;
  
  // Batch link
  batchId: string;
  batchNumber: string;
  
  // Delivery link (if tested at site)
  deliveryChallanId?: string;
  
  // Test location
  location: 'plant' | 'site';
  plantId?: string;
  siteId?: string;
  
  // Test type
  testTypeId: string;
  testTypeName: string;
  
  // Results
  slump?: number; // mm
  flow?: number; // mm (for self-compacting)
  concreteTemperature?: number; // °C
  ambientTemperature?: number; // °C
  density?: number; // kg/m³
  airContent?: number; // %
  
  // Timing
  timeOfTest: string;
  timeOfBatching?: string;
  
  // Evaluation
  result: 'pass' | 'fail' | 'warning';
  evaluationNotes?: string;
  
  // Tester
  testedBy: string;
  testedAt: string;
  labId?: string;
  
  // Equipment
  equipmentId?: string;
  equipmentCalibrationValid: boolean;
  
  // Delivery hold
  deliveryOnHold: boolean;
  holdReason?: string;
  
  // Site rejection link
  siteRejectionId?: string; // Link to Part 18
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Specimen Management
// ============================================================================

export type SpecimenType = 'cube' | 'cylinder';

export interface SpecimenSet {
  id: string;
  setId: string; // Unique set ID (printable label/QR)
  
  // Specimen details
  specimenType: SpecimenType;
  specimenSize: number; // mm (150 for cube, 150 for cylinder)
  numberOfSpecimens: number;
  
  // Specimen IDs
  specimenIds: string[]; // Individual specimen IDs
  
  // Source
  batchId: string;
  batchNumber: string;
  deliveryChallanId?: string;
  productionOrderId?: string;
  projectId?: string;
  structuralElement?: string; // e.g., 'Column C1', 'Beam B2'
  
  // Sampling
  samplingPoint: string; // e.g., 'First truck', 'Middle of pour'
  sampledBy: string;
  samplingTime: string;
  castingTime: string;
  
  // Curing
  curingMethod: 'water' | 'lime' | 'standard_curing';
  curingStartDate: string;
  curingLocation: string;
  
  // Test schedule
  testSchedule: SpecimenTestSchedule[];
  
  // Results
  testResults: SpecimenTestResult[];
  
  // Set evaluation
  setResult: 'pass' | 'fail' | 'pending' | 'not_evaluable';
  setEvaluationNotes?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface SpecimenTestSchedule {
  id: string;
  setId: string;
  
  // Test age
  testAge: number; // days (3, 7, 28, etc.)
  scheduledDate: string;
  
  // Status
  status: 'scheduled' | 'due' | 'overdue' | 'completed' | 'cancelled';
  
  // Alert
  alertRaised: boolean;
  alertId?: string;
  
  // Metadata
  createdAt: string;
}

export interface SpecimenTestResult {
  id: string;
  setId: string;
  specimenId: string;
  
  // Test schedule link
  scheduleId: string;
  testAge: number;
  
  // Test details
  testDate: string;
  labId: string;
  testedBy: string;
  
  // Results
  load: number; // kN
  area: number; // mm²
  calculatedStrength: number; // MPa (system-calculated)
  failureMode?: string; // e.g., 'cone', 'shear', 'splitting'
  
  // Equipment
  equipmentId?: string;
  equipmentCalibrationValid: boolean;
  
  // Metadata
  createdAt: string;
}

// ============================================================================
// Strength Evaluation
// ============================================================================

export interface StrengthEvaluation {
  id: string;
  setId: string;
  
  // Grade
  grade: string; // e.g., 'M25'
  targetMeanStrength: number; // MPa
  
  // Test results
  testAge: number;
  specimenResults: number[]; // Individual strengths
  
  // Statistical summary
  sampleSize: number;
  meanStrength: number;
  standardDeviation?: number;
  characteristicStrength?: number;
  
  // Evaluation
  result: 'pass' | 'fail' | 'insufficient_data';
  evaluationNotes?: string;
  
  // Acceptance criteria used
  criteriaSource: string;
  criteriaReference: string;
  
  // Metadata
  evaluatedAt: string;
  evaluatedBy: string;
}

// ============================================================================
// Nonconformance Reports (NCR)
// ============================================================================

export type NCRSource = 'material' | 'batch' | 'delivery' | 'strength_result' | 'customer_complaint' | 'other';
export type NCRSeverity = 'minor' | 'major' | 'critical';
export type NCRStatus = 'open' | 'investigation' | 'corrective_action' | 'verification' | 'closed';

export interface NonconformanceReport {
  id: string;
  ncrNumber: string;
  
  // Source
  source: NCRSource;
  sourceId?: string; // Link to material lot, batch, delivery, specimen set, etc.
  sourceDescription: string;
  
  // Description
  title: string;
  description: string;
  evidenceAttachmentIds: string[];
  
  // Severity
  severity: NCRSeverity;
  
  // Containment
  containmentAction?: string;
  containmentDate?: string;
  containedBy?: string;
  
  // Root cause
  rootCause?: string;
  rootCauseAnalysis?: string;
  
  // Corrective and preventive action
  correctiveAction?: string;
  preventiveAction?: string;
  
  // Ownership
  ownerId: string;
  ownerName: string;
  dueDate: string;
  
  // Verification
  verificationAction?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationResult?: 'effective' | 'ineffective';
  
  // Closure
  closureNotes?: string;
  closedBy?: string; // QC Manager (not the owner)
  closedAt?: string;
  
  // Status
  status: NCRStatus;
  
  // Customer complaint link
  customerComplaintId?: string;
  
  // Return link (Part 18)
  returnRecordId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Customer Complaints
// ============================================================================

export interface CustomerComplaint {
  id: string;
  complaintNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  
  // Order/Delivery link
  productionOrderId?: string;
  deliveryChallanId?: string;
  
  // Complaint details
  complaintDate: string;
  complaintType: string; // e.g., 'strength', 'workability', 'setting_time', 'appearance'
  description: string;
  evidenceAttachmentIds: string[];
  
  // NCR link
  ncrId?: string;
  
  // Resolution
  resolutionAction?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  
  // Status
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface QCConfiguration {
  id: string;
  
  // Specimen testing
  defaultTestAges: number[]; // e.g., [3, 7, 28]
  specimenTestAlertDays: number; // Alert X days before due
  minimumSampleSizeForStatistics: number;
  
  // Strength evaluation
  strengthEvaluationMethod: 'characteristic_strength' | 'mean_strength' | 'individual';
  
  // NCR
  ncrDueSooonAlertDays: number;
  ncrOverdueAlertDays: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
