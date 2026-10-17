/**
 * Part 05 — Asset Lifecycle Types
 */

import { Status, DataSource } from './types';
import { AssetStatus, AssetCategory } from './assetTypes';

// ============================================================================
// Allocation
// ============================================================================

export interface AssetAllocation {
  id: string;
  assetId: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  departmentId?: string;
  
  // Dates
  plannedStartDate: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  
  // Meter readings at allocation
  openingHourMeter?: number;
  openingOdometer?: number;
  
  // Status
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  
  // Metadata
  allocatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  reason?: string;
  notes?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ============================================================================
// Transfer
// ============================================================================

export interface AssetTransfer {
  id: string;
  assetId: string;
  transferNumber: string;
  
  // From location
  fromProjectId?: string;
  fromSiteId?: string;
  fromPlantId?: string;
  fromLocation: string;
  fromMeterReading: {
    hourMeter?: number;
    odometer?: number;
    takenAt: string;
    takenBy: string;
    photoAttachmentId?: string;
  };
  fromCondition: ConditionChecklist;
  
  // To location
  toProjectId?: string;
  toSiteId?: string;
  toPlantId?: string;
  toLocation: string;
  
  // Transport
  transportVendorId?: string;
  transportCost?: number;
  transportDate?: string;
  
  // Receipt
  receivedAt?: string;
  receivedBy?: string;
  receivedMeterReading?: {
    hourMeter?: number;
    odometer?: number;
    takenAt: string;
    takenBy: string;
    photoAttachmentId?: string;
  };
  receivedCondition?: ConditionChecklist;
  
  // Status
  status: 'requested' | 'approved' | 'dispatched' | 'in_transit' | 'received' | 'cancelled';
  
  // Approval
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

export interface ConditionChecklist {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  exteriorDamage: boolean;
  exteriorDamageNotes?: string;
  interiorCondition: 'excellent' | 'good' | 'fair' | 'poor';
  mechanicalIssues: boolean;
  mechanicalIssuesNotes?: string;
  safetyEquipmentPresent: boolean;
  cleanliness: 'excellent' | 'good' | 'fair' | 'poor';
  photos: string[]; // Attachment IDs
  notes?: string;
}

// ============================================================================
// Mobilization / Demobilization
// ============================================================================

export interface Mobilization {
  id: string;
  assetId: string;
  type: 'mobilization' | 'demobilization';
  
  // Location
  projectId?: string;
  siteId?: string;
  plantId?: string;
  location: string;
  
  // Transport
  transportVendorId?: string;
  transportCost: number;
  transportDate: string;
  
  // Approval
  requestedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Rental / Hire-In
// ============================================================================

export interface RentalAgreement {
  id: string;
  assetId: string;
  agreementNumber: string;
  
  // Vendor
  vendorId: string;
  vendorName: string;
  contactPerson?: string;
  contactPhone?: string;
  
  // Terms
  rateBasis: 'hourly' | 'daily' | 'monthly' | 'per_trip' | 'minimum_guaranteed';
  rate: number;
  currency: string;
  minimumGuaranteedHours?: number;
  
  // Dates
  startDate: string;
  endDate?: string;
  actualOffHireDate?: string;
  
  // Meter readings
  onHireMeterReading: {
    hourMeter?: number;
    odometer?: number;
    takenAt: string;
    photoAttachmentId?: string;
  };
  offHireMeterReading?: {
    hourMeter?: number;
    odometer?: number;
    takenAt: string;
    photoAttachmentId?: string;
  };
  
  // Condition
  onHireCondition: ConditionChecklist;
  offHireCondition?: ConditionChecklist;
  
  // Billing
  totalHours?: number;
  totalAmount?: number;
  billingStatus: 'pending' | 'in_progress' | 'completed' | 'disputed';
  
  // Status
  status: 'active' | 'off_hired' | 'terminated' | 'completed';
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Hire-Out (to third parties)
// ============================================================================

export interface HireOutAgreement {
  id: string;
  assetId: string;
  agreementNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  contactPerson?: string;
  contactPhone?: string;
  
  // Terms
  rateBasis: 'hourly' | 'daily' | 'monthly' | 'per_trip';
  rate: number;
  currency: string;
  
  // Dates
  startDate: string;
  endDate?: string;
  actualReturnDate?: string;
  
  // Billing
  totalHours?: number;
  totalAmount?: number;
  invoicedAmount?: number;
  paidAmount?: number;
  billingStatus: 'pending' | 'invoiced' | 'partial' | 'paid' | 'overdue';
  
  // Status
  status: 'active' | 'returned' | 'terminated' | 'completed';
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Daily Deployment
// ============================================================================

export interface DailyDeployment {
  id: string;
  assetId: string;
  operatorId: string;
  date: string;
  
  // Shift
  shiftStartTime: string;
  shiftEndTime: string;
  
  // Activity
  activityType: string;
  activityDescription?: string;
  workLocation?: string;
  
  // Meter readings
  startHourMeter?: number;
  endHourMeter?: number;
  startOdometer?: number;
  endOdometer?: number;
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  
  // Approval
  assignedBy: string;
  approvedBy?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Operator / Driver
// ============================================================================

export interface Operator {
  id: string;
  employeeId?: string; // Link to employee if internal
  vendorId?: string; // Link to vendor if subcontractor
  
  // Identity
  fullName: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  
  // Type
  type: 'internal' | 'subcontractor' | 'hired';
  
  // Driving Licence
  licenceNumber?: string;
  licenceClass?: string[]; // e.g., ['HMV', 'LMV', 'Crane']
  licenceIssueDate?: string;
  licenceExpiryDate?: string;
  licenceAttachmentId?: string;
  
  // Certificates
  certificates: OperatorCertificate[];
  
  // Training
  inductions: OperatorTraining[];
  safetyTraining: OperatorTraining[];
  
  // Competency
  competencies: OperatorCompetency[];
  
  // Medical
  medicalFitnessDate?: string;
  medicalFitnessExpiryDate?: string;
  medicalFitnessAttachmentId?: string;
  
  // Assignment
  assignedAssets: string[]; // Asset IDs
  shiftSchedule?: string;
  
  // Status
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface OperatorCertificate {
  id: string;
  type: string; // e.g., 'Crane Operator', 'Forklift', 'Boom Pump'
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  attachmentId?: string;
  alertSent: boolean;
  alertSentAt?: string;
}

export interface OperatorTraining {
  id: string;
  type: string; // e.g., 'Safety Induction', 'Equipment Training'
  completedDate: string;
  validUntil?: string;
  conductedBy: string;
  attachmentId?: string;
}

export interface OperatorCompetency {
  id: string;
  assetCategory: AssetCategory;
  competencyLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  assessedDate: string;
  assessedBy: string;
  validUntil?: string;
  attachmentId?: string;
}

// ============================================================================
// Assignment Validation
// ============================================================================

export interface AssignmentValidation {
  valid: boolean;
  errors: AssignmentValidationError[];
  warnings: AssignmentValidationWarning[];
}

export interface AssignmentValidationError {
  code: string;
  message: string;
  field: string;
}

export interface AssignmentValidationWarning {
  code: string;
  message: string;
  field: string;
}

// ============================================================================
// Utilization Metrics
// ============================================================================

export interface AssetUtilization {
  assetId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Time breakdown (in hours)
  totalHours: number;
  productiveHours: number;
  idleHours: number;
  downtimeHours: number;
  maintenanceHours: number;
  
  // Percentages
  utilizationPercent: number;
  availabilityPercent: number;
  
  // Breakdown
  breakdowns: number;
  meanTimeBetweenFailures?: number; // hours
  meanTimeToRepair?: number; // hours
}
