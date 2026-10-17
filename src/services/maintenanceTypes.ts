/**
 * Part 11 — Maintenance Types
 */

import { Status } from './types';

// ============================================================================
// Preventive Maintenance
// ============================================================================

export type PMIntervalType = 'hours' | 'kilometres' | 'calendar_days';

export interface PMPlan {
  id: string;
  
  // Scope (asset-specific or make/model)
  assetId?: string;
  make?: string;
  model?: string;
  assetCategory?: string;
  
  // Interval configuration
  intervalType: PMIntervalType;
  intervalValue: number;
  toleranceWindowPercent: number; // e.g., 10% early/late
  
  // Checklist
  checklistTemplateId: string;
  checklistTemplateName: string;
  
  // Required parts kit
  requiredPartsKitId?: string;
  requiredPartsKitName?: string;
  
  // Scheduling
  lastPerformedDate?: string;
  lastPerformedMeterReading?: number;
  nextDueDate?: string;
  nextDueMeterReading?: number;
  
  // Status
  status: 'active' | 'inactive' | 'superseded';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PMWorkOrder {
  id: string;
  workOrderNumber: string;
  pmPlanId: string;
  assetId: string;
  
  // Scheduling
  scheduledDate: string;
  scheduledMeterReading?: number;
  actualStartDate?: string;
  actualEndDate?: string;
  actualMeterReading?: number;
  
  // Execution
  assignedTechnicianIds: string[];
  checklistId: string;
  checklistCompleted: boolean;
  partsKitIssued: boolean;
  
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Inspection Checklists
// ============================================================================

export interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  assetCategory?: string;
  
  // Checklist items
  items: ChecklistItem[];
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  templateId: string;
  order: number;
  
  // Item details
  category: 'engine' | 'hydraulic' | 'electrical' | 'safety' | 'structural' | 'fluid' | 'tire_track' | 'other';
  description: string;
  inspectionMethod: 'visual' | 'measurement' | 'functional_test' | 'operational';
  
  // Safety critical
  isSafetyCritical: boolean;
  
  // Pass criteria
  passCriteria?: string;
  minValue?: number;
  maxValue?: number;
  unit?: string;
  
  // Metadata
  createdAt: string;
}

export interface ChecklistInstance {
  id: string;
  templateId: string;
  workOrderId?: string;
  assetId: string;
  
  // Execution
  inspectedBy: string;
  inspectedAt: string;
  location?: string;
  
  // Results
  items: ChecklistItemResult[];
  overallResult: 'pass' | 'fail' | 'conditional_pass';
  failedSafetyCriticalItems: number;
  
  // Notes
  generalNotes?: string;
  defectsIdentified: string[]; // Work order IDs
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItemResult {
  itemId: string;
  itemDescription: string;
  isSafetyCritical: boolean;
  
  // Result
  result: 'pass' | 'fail' | 'na';
  actualValue?: number;
  unit?: string;
  notes?: string;
  
  // Defect
  defectCreated?: boolean;
  defectWorkOrderId?: string;
}

// ============================================================================
// Corrective Maintenance (Work Orders)
// ============================================================================

export type WorkOrderType = 'pm' | 'breakdown' | 'accident' | 'overhaul' | 'modification' | 'warranty';
export type WorkOrderStatus = 
  | 'reported' 
  | 'triaged' 
  | 'in_progress' 
  | 'awaiting_parts' 
  | 'awaiting_external_vendor' 
  | 'testing' 
  | 'released' 
  | 'closed'
  | 'cancelled';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  
  // Source
  sourceType: 'operator_submission' | 'logbook' | 'inspection' | 'fuel_investigation' | 'telematics' | 'manual';
  sourceId?: string;
  
  // Asset
  assetId: string;
  assetCode?: string;
  location?: string;
  
  // Type and priority
  type: WorkOrderType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Problem description
  reportedBy: string;
  reportedAt: string;
  symptoms: string;
  photos: string[]; // Attachment IDs
  
  // Safety
  isSafetyCritical: boolean;
  safetyCriticalReason?: string;
  safetyHoldApplied: boolean;
  
  // Diagnosis and work
  diagnosis?: string;
  workPerformed?: string;
  
  // Assignment
  assignedTechnicianIds: string[];
  primaryTechnicianId?: string;
  
  // Timing
  downtimeStart?: string;
  downtimeEnd?: string;
  estimatedHours?: number;
  actualLabourHours?: number;
  
  // Parts
  partsUsed: WorkOrderPart[];
  
  // External service
  externalVendorId?: string;
  externalVendorName?: string;
  externalServiceCost?: number;
  
  // Warranty
  warrantyClaimId?: string;
  warrantyRecoveryAmount?: number;
  
  // Testing and release
  testRunCompleted: boolean;
  testRunNotes?: string;
  releaseChecklistId?: string;
  releasedBy?: string;
  releasedAt?: string;
  
  // Status
  status: WorkOrderStatus;
  
  // Costs
  labourCost: number;
  partsCost: number;
  externalCost: number;
  totalCost: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  
  // Part details
  partId: string;
  partName: string;
  partNumber: string;
  
  // Quantity
  quantityRequested: number;
  quantityIssued: number;
  quantityReturned: number;
  quantityUsed: number;
  
  // Cost
  unitCost: number;
  totalCost: number;
  
  // Inventory
  inventoryTransactionId?: string;
  returnTransactionId?: string;
  
  // Scrap/core return
  isScrap: boolean;
  coreReturnValue?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Safety Hold
// ============================================================================

export interface SafetyHold {
  id: string;
  assetId: string;
  workOrderId: string;
  
  // Hold details
  reason: string;
  appliedBy: string;
  appliedAt: string;
  
  // Release
  releasedBy?: string;
  releasedAt?: string;
  releaseChecklistId?: string;
  releaseNotes?: string;
  
  // Status
  status: 'active' | 'released';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Spare Parts
// ============================================================================

export interface SparePart {
  id: string;
  partNumber: string;
  name: string;
  description?: string;
  
  // Compatibility
  compatibleAssets: string[]; // Asset IDs
  compatibleMakes: string[];
  compatibleModels: string[];
  
  // Inventory
  inventoryItemId: string;
  currentStock: number;
  minimumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  
  // Cost
  unitCost: number;
  
  // Warranty
  warrantyPeriodMonths?: number;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PartsRequisition {
  id: string;
  requisitionNumber: string;
  workOrderId: string;
  
  // Parts
  items: PartsRequisitionItem[];
  
  // Request
  requestedBy: string;
  requestedAt: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  
  // Status
  status: 'pending' | 'approved' | 'issued' | 'partially_issued' | 'cancelled';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface PartsRequisitionItem {
  id: string;
  requisitionId: string;
  partId: string;
  partName: string;
  partNumber: string;
  
  quantityRequested: number;
  quantityIssued: number;
  
  unitCost: number;
  totalCost: number;
  
  inventoryTransactionId?: string;
}

// ============================================================================
// Warranty
// ============================================================================

export interface WarrantyClaim {
  id: string;
  claimNumber: string;
  workOrderId: string;
  assetId: string;
  
  // Part details
  partId: string;
  partName: string;
  partNumber: string;
  
  // Claim details
  failureDate: string;
  failureDescription: string;
  claimDate: string;
  
  // Vendor
  vendorId: string;
  vendorName: string;
  
  // Status
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'completed';
  
  // Financial
  claimedAmount: number;
  approvedAmount?: number;
  recoveredAmount?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Reliability Metrics
// ============================================================================

export interface ReliabilityMetrics {
  id: string;
  assetId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // MTBF
  totalOperatingHours: number;
  breakdownCount: number;
  mtbf: number | null; // null if insufficient data
  mtbfConfidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  
  // MTTR
  totalRepairHours: number;
  repairCount: number;
  mttr: number | null;
  mttrConfidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  
  // Availability
  scheduledHours: number;
  downtimeHours: number;
  availability: number | null;
  availabilityConfidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  
  // Additional metrics
  meanTimeBetweenInspections?: number;
  preventiveMaintenanceCompliance?: number; // percentage
  
  // Metadata
  calculatedAt: string;
  minimumEventsRequired: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface MaintenanceConfiguration {
  id: string;
  
  // PM scheduling
  pmDueSooonAlertDays: number; // e.g., 7 days before due
  pmOverdueAlertDays: number; // e.g., 1 day after due
  
  // Safety hold
  safetyHoldRequiresDualApproval: boolean;
  
  // Reliability metrics
  minimumEventsForMTBF: number; // e.g., 3 breakdowns
  minimumEventsForMTTR: number; // e.g., 3 repairs
  minimumOperatingHoursForMetrics: number; // e.g., 100 hours
  
  // Labour rates
  defaultLabourRatePerHour: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
