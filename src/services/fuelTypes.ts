/**
 * Part 09 — Fuel Management Types
 */

import { Status } from './types';

// ============================================================================
// Fuel Masters
// ============================================================================

export interface FuelType {
  id: string;
  code: string; // e.g., 'HSD', 'PETROL', 'CNG'
  name: string;
  description?: string;
  density?: number; // kg/litre at 15°C
  unit: 'litre';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type StoragePointType = 'fixed_tank' | 'mobile_bowser' | 'barrel' | 'external_station';

export interface StoragePoint {
  id: string;
  code: string;
  name: string;
  type: StoragePointType;
  fuelTypeId: string;
  capacity: number; // litres
  safeFillLevel: number; // litres (typically 85-90% of capacity)
  deadStock: number; // litres (unusable fuel at bottom)
  location?: string;
  projectId?: string;
  siteId?: string;
  custodianId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InstrumentType = 'dispenser_meter' | 'dipstick' | 'tank_gauge' | 'bowser_meter' | 'fuel_sensor';

export interface MeasuringInstrument {
  id: string;
  serialNumber: string;
  type: InstrumentType;
  storagePointId?: string;
  assetId?: string;
  measuringRange?: { min: number; max: number };
  accuracyClass?: string; // e.g., 'Class 0.5', 'Class 1.0'
  calibrationDueDate?: string;
  lastCalibrationDate?: string;
  calibrationCertificateId?: string;
  strappingChartId?: string; // For dipsticks/tank gauges
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StrappingChart {
  id: string;
  instrumentId: string;
  name: string;
  entries: StrappingChartEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StrappingChartEntry {
  dipReading: number; // cm or mm
  volume: number; // litres
}

// ============================================================================
// Fuel Receipts
// ============================================================================

export interface FuelReceipt {
  id: string;
  receiptNumber: string;
  purchaseOrderId?: string;
  supplierId: string;
  invoiceNumber: string;
  invoiceDate: string;
  
  // Delivery details
  deliveryDate: string;
  tankerNumber?: string;
  vehicleNumber?: string;
  
  // Fuel details
  fuelTypeId: string;
  storagePointId: string;
  
  // Quantities
  invoicedQuantity: number; // litres
  measuredQuantity: number; // litres (from dip or meter)
  
  // Measurements
  dipBefore?: number;
  dipAfter?: number;
  meterOpening?: number;
  meterClosing?: number;
  
  // Quality
  density?: number;
  temperature?: number;
  
  // Financial
  rate: number; // per litre
  gstRate: number;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  
  // Variance
  variance: number; // litres (invoiced - measured)
  variancePercent: number;
  
  // Status
  status: Status;
  postedToInventory: boolean;
  
  // Metadata
  receivedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Fuel Issues
// ============================================================================

export interface FuelIssue {
  id: string;
  voucherNumber: string;
  issueDate: string;
  
  // Source
  storagePointId: string;
  dispenserInstrumentId?: string;
  meterOpening?: number;
  meterClosing?: number;
  
  // Destination
  assetId: string;
  operatorId: string;
  
  // Quantity
  quantity: number; // litres
  
  // Asset readings at time of issue
  assetHourMeter?: number;
  assetOdometer?: number;
  photoEvidenceId?: string;
  
  // Full tank flag
  fullTankFill: boolean;
  
  // Financial
  costPerLitre: number;
  totalCost: number;
  projectId?: string;
  siteId?: string;
  costCentreId?: string;
  
  // Personnel
  issuingAttendantId: string;
  approvingOfficerId?: string;
  
  // Status
  status: Status;
  postedToInventory: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface RetailFuelFill {
  id: string;
  fillDate: string;
  stationName: string;
  stationLocation?: string;
  
  // Fuel details
  fuelTypeId: string;
  assetId: string;
  operatorId: string;
  
  // Quantity and cost
  quantity: number; // litres
  rate: number;
  totalCost: number;
  
  // Evidence
  billPhotoId?: string;
  fuelCardTransactionId?: string;
  
  // Asset readings
  odometerReading: number;
  photoEvidenceId?: string;
  
  // Financial
  projectId?: string;
  siteId?: string;
  costCentreId?: string;
  
  // Status
  status: Status;
  matchedToVoucher: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Fuel Transfers
// ============================================================================

export interface FuelTransfer {
  id: string;
  transferNumber: string;
  transferDate: string;
  
  // Source
  fromStoragePointId: string;
  fromMeterOpening?: number;
  fromMeterClosing?: number;
  fromDipBefore?: number;
  fromDipAfter?: number;
  
  // Destination
  toStoragePointId: string;
  toMeterOpening?: number;
  toMeterClosing?: number;
  toDipBefore?: number;
  toDipAfter?: number;
  
  // Quantity
  quantity: number; // litres
  
  // Personnel
  transferredBy: string;
  receivedBy: string;
  
  // Status
  status: Status;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface FuelReturn {
  id: string;
  returnNumber: string;
  returnDate: string;
  
  // Source (asset)
  assetId: string;
  operatorId: string;
  
  // Destination (storage point)
  toStoragePointId: string;
  dipBefore?: number;
  dipAfter?: number;
  
  // Quantity
  quantity: number; // litres
  
  // Personnel
  returnedBy: string;
  receivedBy: string;
  
  // Status
  status: Status;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Tank Reconciliation
// ============================================================================

export interface DailyTankReconciliation {
  id: string;
  date: string; // YYYY-MM-DD
  storagePointId: string;
  
  // Opening
  openingDip: number;
  openingVolume: number; // litres (from strapping chart)
  
  // Additions
  receiptsVolume: number; // litres
  transfersInVolume: number; // litres
  
  // Deductions
  issuesVolume: number; // litres
  transfersOutVolume: number; // litres
  
  // Book closing
  bookClosingVolume: number; // litres
  
  // Physical closing
  closingDip: number;
  closingVolume: number; // litres (from strapping chart)
  
  // Variance
  variance: number; // litres (book - physical)
  variancePercent: number;
  
  // Dispenser reconciliation
  dispenserMeterTotal: number; // litres
  issueVouchersTotal: number; // litres
  dispenserVariance: number; // litres
  
  // Status
  status: 'reconciled' | 'variance_detected' | 'pending';
  alertRaised: boolean;
  alertId?: string;
  
  // Metadata
  reconciledBy?: string;
  reconciledAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface FuelConfiguration {
  id: string;
  
  // Receipt tolerance
  receiptVarianceTolerancePercent: number; // e.g., 2%
  receiptVarianceToleranceLitres: number; // e.g., 50 litres
  
  // Tank reconciliation tolerance
  tankVarianceTolerancePercent: number; // e.g., 0.5%
  tankVarianceToleranceLitres: number; // e.g., 10 litres
  
  // Issue validation
  issueTankCapacityTolerancePercent: number; // e.g., 5%
  
  // Cost valuation
  costValuationMethod: 'fifo' | 'weighted_average';
  
  createdAt: string;
  updatedAt: string;
}
