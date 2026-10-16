/**
 * Part 15 — RMC Material Inventory Types
 */

import { Status } from './types';

// ============================================================================
// Material Receipts
// ============================================================================

export type MaterialCategory = 'cement' | 'aggregate' | 'admixture' | 'scm' | 'water' | 'other';

export interface MaterialReceipt {
  id: string;
  receiptNumber: string;
  
  // Purchase order link
  purchaseOrderId?: string;
  
  // Supplier
  supplierId: string;
  supplierName: string;
  
  // Material
  materialId: string;
  materialName: string;
  materialCategory: MaterialCategory;
  
  // Delivery details
  vehicleNumber?: string;
  deliveryDate: string;
  weighbridgeTicketId?: string;
  
  // Quantities
  invoiceQuantity: number;
  invoiceUnit: string;
  weighedQuantity: number;
  weighedUnit: string;
  
  // Unit conversion
  conversionFactor?: number;
  convertedQuantity: number; // In base unit (kg for solids, litres for liquids)
  
  // Financial
  rate: number;
  rateUnit: string;
  totalValue: number;
  
  // Storage
  storageLocationId: string;
  storageLocationName: string;
  storageLocationType: 'silo' | 'bin' | 'stockyard' | 'tank';
  
  // Lot/batch reference
  lotNumber?: string;
  supplierBatchNumber?: string;
  
  // Quality
  testCertificateId?: string;
  qcStatus: 'pending' | 'on_hold' | 'accepted' | 'rejected';
  qcAcceptedBy?: string;
  qcAcceptedAt?: string;
  qcRejectionReason?: string;
  
  // Status
  status: Status;
  
  // Metadata
  receivedBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Stock Movements
// ============================================================================

export type StockMovementType = 
  | 'opening_balance'
  | 'receipt'
  | 'issue_to_production'
  | 'transfer_out'
  | 'transfer_in'
  | 'return_to_supplier'
  | 'wastage'
  | 'physical_count_adjustment'
  | 'backflush';

export interface StockMovement {
  id: string;
  movementNumber: string;
  
  // Material
  materialId: string;
  materialName: string;
  
  // Movement type
  type: StockMovementType;
  
  // Quantity
  quantity: number;
  unit: string;
  
  // Reference
  referenceType?: string; // 'receipt', 'batch', 'transfer', 'adjustment'
  referenceId?: string;
  
  // Storage locations
  fromStorageLocationId?: string;
  toStorageLocationId?: string;
  
  // Date
  movementDate: string;
  
  // Financial (cost-restricted)
  unitCost?: number;
  totalCost?: number;
  
  // Approval (for adjustments)
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  
  // Metadata
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// Silo/Bin Levels
// ============================================================================

export interface SiloLevelReading {
  id: string;
  
  // Storage location
  storageLocationId: string;
  storageLocationName: string;
  
  // Reading
  readingDate: string;
  readingMethod: 'manual_dip' | 'level_sensor' | 'load_cells';
  
  // Level
  levelPercent: number;
  levelHeight?: number; // cm or m
  volumeM3?: number;
  
  // Calculated stock
  calculatedStock: number; // In base unit
  unit: string;
  
  // Book stock comparison
  bookStock: number;
  variance: number;
  variancePercent: number;
  
  // Metadata
  readBy: string;
  createdAt: string;
}

// ============================================================================
// Unit Conversions
// ============================================================================

export interface UnitConversion {
  id: string;
  
  // Material
  materialId: string;
  materialName: string;
  
  // Conversion
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
  
  // Effective dates
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Material Consumption
// ============================================================================

export interface MaterialConsumption {
  id: string;
  
  // Batch link
  batchId: string;
  batchNumber: string;
  productionOrderId?: string;
  
  // Material
  materialId: string;
  materialName: string;
  
  // Theoretical (from mix design)
  theoreticalQuantity: number;
  theoreticalUnit: string;
  
  // Actual (from batch record)
  actualQuantity: number;
  actualUnit: string;
  
  // Variance
  variance: number;
  variancePercent: number;
  
  // Issue method
  issueMethod: 'backflush' | 'manual';
  stockMovementId?: string;
  
  // Date
  consumptionDate: string;
  
  // Metadata
  createdAt: string;
}

// ============================================================================
// Reconciliation
// ============================================================================

export interface ConcreteReconciliation {
  id: string;
  
  // Production order
  productionOrderId: string;
  productionOrderNumber: string;
  
  // Plant
  plantId: string;
  plantName: string;
  
  // Date
  date: string;
  
  // Quantities (all in m³)
  plannedQuantity: number;
  batchedQuantity: number;
  dispatchedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  rejectedQuantity: number;
  wastedQuantity: number;
  invoicedQuantity: number;
  
  // Tolerances
  batchingTolerance: number; // ±%
  dispatchTolerance: number; // ±%
  
  // Variance checks
  batchedVsDispatchedVariance: number;
  dispatchedVsDeliveredVariance: number;
  
  // Status
  status: 'pending' | 'reconciled' | 'variance_detected';
  
  // Metadata
  reconciledBy?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface MaterialInventoryConfiguration {
  id: string;
  
  // Tolerances
  siloVarianceTolerancePercent: number;
  materialConsumptionVariancePercent: number;
  batchingTolerancePercent: number;
  dispatchTolerancePercent: number;
  
  // Stock management
  defaultIssueMethod: 'backflush' | 'manual';
  allowDualIssue: boolean; // Allow both backflush and manual (not recommended)
  
  // Alerts
  lowStockThresholdPercent: number;
  stockOutRiskDays: number;
  
  // Unit conversions
  defaultCementUnit: 'kg' | 'tonnes' | 'bags';
  defaultAggregateUnit: 'kg' | 'tonnes' | 'm³';
  defaultAdmixtureUnit: 'kg' | 'litres';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
