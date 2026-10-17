/**
 * Part 13 — RMC Plant Types
 */

import { Status, DataSource } from './types';

// ============================================================================
// Plant Master
// ============================================================================

export type PlantType = 'stationary' | 'mobile' | 'project_site_captive';
export type PlantOperatingStatus = 'operational' | 'maintenance' | 'idle' | 'decommissioned';

export interface RMCPlant {
  id: string;
  plantCode: string;
  name: string;
  companyId: string;
  
  // Location
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  
  // Configuration
  type: PlantType;
  ratedCapacity: number; // m³/hr
  practicalCapacity: number; // m³/hr (typically 80-85% of rated)
  mixerSize: number; // m³ per batch
  
  // Operating status
  operatingStatus: PlantOperatingStatus;
  
  // Shifts
  shifts: PlantShift[];
  
  // Targets
  dailyTarget?: number; // m³
  monthlyTarget?: number; // m³
  
  // Personnel
  plantManagerId?: string;
  plantManagerName?: string;
  staffCount?: number;
  
  // Linked entities
  linkedStoreId?: string;
  linkedCostCentreId?: string;
  approvedSupplierIds: string[];
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlantShift {
  id: string;
  plantId: string;
  name: string; // e.g., "Morning Shift", "Night Shift"
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
}

// ============================================================================
// Plant Equipment
// ============================================================================

export type PlantEquipmentType = 
  | 'batching_plant'
  | 'cement_silo'
  | 'fly_ash_silo'
  | 'aggregate_bin'
  | 'weigh_hopper'
  | 'conveyor'
  | 'mixer'
  | 'admixture_dosing'
  | 'water_meter'
  | 'compressor'
  | 'dg_set'
  | 'plant_weighbridge';

export interface PlantEquipment {
  id: string;
  plantId: string;
  assetId: string; // Link to Part 04 asset
  
  // Equipment details
  equipmentType: PlantEquipmentType;
  name: string;
  
  // Capacity (for silos, hoppers)
  capacity?: number;
  capacityUnit?: string; // e.g., 'tonnes', 'litres'
  currentLevel?: number;
  currentLevelUnit?: string;
  
  // Status
  status: 'operational' | 'maintenance' | 'idle' | 'out_of_service';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Production Orders
// ============================================================================

export type ProductionOrderStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface ProductionOrder {
  id: string;
  orderNumber: string;
  plantId: string;
  
  // Source
  sourceType: 'customer_order' | 'internal_requirement';
  sourceId?: string; // Customer order ID or internal requirement ID
  
  // Product details
  grade: string; // e.g., 'M25', 'M30'
  mixDesignId: string;
  mixDesignRevision: number;
  
  // Quantity
  orderedQuantity: number; // m³
  producedQuantity: number; // m³
  remainingQuantity: number; // m³
  
  // Schedule
  scheduledDate: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  
  // Priority
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Status
  status: ProductionOrderStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Batch Records
// ============================================================================

export type BatchStatus = 'in_progress' | 'completed' | 'rejected' | 'qc_hold';

export interface BatchRecord {
  id: string;
  batchNumber: string;
  plantId: string;
  productionOrderId?: string;
  
  // Timestamps
  batchStartTime: string;
  batchEndTime?: string;
  receivedAt: string; // When we received the data
  
  // Product
  grade: string;
  mixDesignId: string;
  mixDesignRevision: number;
  
  // Volume
  targetVolume: number; // m³
  actualVolume: number; // m³
  
  // Ingredients (actual weights in kg)
  ingredients: BatchIngredient[];
  
  // Water and admixture
  waterAdded: number; // litres
  admixtureAdded: number; // litres/kg
  moistureCorrection?: number; // kg
  
  // Operator
  operatorId: string;
  operatorName: string;
  
  // Source and validation
  dataSource: DataSource; // 'integrated_live', 'imported', 'manual'
  provider?: string; // e.g., 'schwing_stetter'
  
  // Quality
  qualityStatus: 'pending' | 'approved' | 'rejected';
  qualityNotes?: string;
  
  // Tolerance validation
  toleranceViolations: ToleranceViolation[];
  
  // Manual entry approval (if dataSource = 'manual')
  manualEntryApproved: boolean;
  manualEntryApprovedBy?: string;
  manualEntryApprovedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface BatchIngredient {
  id: string;
  batchId: string;
  
  // Ingredient details
  ingredientType: 'cement' | 'fly_ash' | 'sand' | 'aggregate_20mm' | 'aggregate_12mm' | 'aggregate_6mm' | 'other';
  ingredientName: string;
  
  // Weights
  targetWeight: number; // kg
  actualWeight: number; // kg
  tolerancePercent: number; // e.g., 2 for ±2%
  
  // Variance
  variance: number; // kg
  variancePercent: number;
  withinTolerance: boolean;
  
  // Metadata
  createdAt: string;
}

export interface ToleranceViolation {
  id: string;
  batchId: string;
  ingredientType: string;
  ingredientName: string;
  targetWeight: number;
  actualWeight: number;
  variancePercent: number;
  tolerancePercent: number;
  severity: 'warning' | 'error';
  createdAt: string;
}

// ============================================================================
// Downtime / Stoppage
// ============================================================================

export type StoppageReason = 
  | 'power_failure'
  | 'breakdown'
  | 'material_shortage'
  | 'no_orders'
  | 'weather'
  | 'qc_hold'
  | 'maintenance'
  | 'operator_unavailable'
  | 'other';

export interface StoppageLog {
  id: string;
  plantId: string;
  
  // Timing
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  
  // Reason
  reason: StoppageReason;
  reasonDetails?: string;
  
  // Linked work order (if breakdown/maintenance)
  workOrderId?: string;
  
  // Impact
  productionLossM3?: number;
  
  // Metadata
  reportedBy: string;
  reportedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Weighing Tolerance Configuration
// ============================================================================

export interface WeighingToleranceConfig {
  id: string;
  plantId?: string; // null = global config
  
  // Tolerances by ingredient type
  ingredientTolerances: IngredientTolerance[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface IngredientTolerance {
  ingredientType: string;
  tolerancePercent: number; // e.g., 2 for ±2%
  severity: 'warning' | 'error';
}

// ============================================================================
// Plant KPIs
// ============================================================================

export interface PlantKPIs {
  id: string;
  plantId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Production
  plannedProduction: number; // m³
  actualProduction: number; // m³
  productionVariance: number; // m³
  productionVariancePercent: number;
  
  // Efficiency
  totalBatches: number;
  averageBatchCycleTime: number; // minutes
  batchesPerHour: number;
  
  // Utilization
  availableHours: number;
  operatingHours: number;
  plantUtilization: number; // percentage
  productionEfficiency: number; // percentage
  
  // Quality
  rejectedBatches: number;
  rejectedBatchesPercent: number;
  wastageM3: number;
  
  // Downtime
  totalDowntimeMinutes: number;
  downtimeByReason: Record<StoppageReason, number>;
  
  // Metadata
  calculatedAt: string;
}
