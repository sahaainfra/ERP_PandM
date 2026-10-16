/**
 * Part 21 — Finance and Costing Types
 */

import { Status } from './types';

// ============================================================================
// Posting Framework
// ============================================================================

export type PostingStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed' | 'paid';
export type TransactionType = 
  | 'fuel_receipt'
  | 'fuel_issue'
  | 'spare_part_issue'
  | 'work_order_external'
  | 'hire_in'
  | 'hire_out'
  | 'material_receipt'
  | 'material_consumption'
  | 'rmc_sale'
  | 'pumping_charge'
  | 'transport_cost'
  | 'labour_cost'
  | 'overhead_allocation';

export interface PostingRule {
  id: string;
  name: string;
  transactionType: TransactionType;
  
  // Debit and credit accounts
  debitAccountId: string;
  creditAccountId: string;
  
  // Conditions
  conditions?: Record<string, any>;
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface FinancialPosting {
  id: string;
  postingNumber: string;
  
  // Source reference
  sourceType: TransactionType;
  sourceId: string;
  sourceReference?: string;
  
  // Accounts
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  
  // Amount
  amount: number;
  currency: string;
  
  // Date
  postingDate: string;
  periodId: string;
  
  // Status
  status: PostingStatus;
  
  // Reversal
  isReversal: boolean;
  originalPostingId?: string;
  reversalReason?: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  postedBy?: string;
  postedAt?: string;
  
  // Metadata
  description: string;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PostingPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  
  // Status
  status: 'open' | 'closed' | 'locked';
  
  // Metadata
  closedBy?: string;
  closedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Machinery and Fleet Costing
// ============================================================================

export interface AssetCostRecord {
  id: string;
  assetId: string;
  periodId: string;
  
  // Cost breakdown
  fuelCost: number;
  fuelVarianceCost: number; // Unexplained variance from Part 10
  maintenanceLabourCost: number;
  maintenancePartsCost: number;
  externalRepairCost: number;
  operatorWagesCost: number;
  insuranceCost: number;
  taxCost: number;
  depreciationCost: number;
  hireInCost: number;
  
  // Totals
  totalCost: number;
  
  // Usage
  approvedOperatingHours: number;
  approvedKilometres: number;
  
  // Unit costs
  costPerHour: number;
  costPerKilometre: number;
  
  // Allocation
  projectAllocations: ProjectCostAllocation[];
  
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCostAllocation {
  id: string;
  assetCostRecordId: string;
  projectId: string;
  projectName: string;
  
  // Allocation
  allocatedHours: number;
  allocatedKilometres: number;
  internalHireRate: number;
  allocatedAmount: number;
  
  // GST
  gstApplicable: boolean;
  gstRate: number;
  gstAmount: number;
  totalWithGST: number;
  
  createdAt: string;
}

// ============================================================================
// RMC Plant Costing
// ============================================================================

export interface PlantCostRecord {
  id: string;
  plantId: string;
  periodId: string;
  grade?: string; // Optional: cost per grade
  
  // Material costs
  cementCost: number;
  scmCost: number;
  aggregateCost: number;
  waterCost: number;
  admixtureCost: number;
  consumablesCost: number;
  totalMaterialCost: number;
  
  // Operational costs
  fuelCost: number;
  electricityCost: number;
  plantLabourCost: number;
  plantMaintenanceCost: number;
  transitMixerCost: number;
  pumpCost: number;
  
  // Wastage
  wastageCost: number;
  rejectedCost: number;
  returnedCost: number;
  
  // Overhead
  overheadAllocation: number;
  overheadAllocationMethod: 'per_m3' | 'per_batch_hour' | 'per_trip' | 'per_km';
  
  // Totals
  totalCost: number;
  totalProduction: number; // m³
  costPerM3: number;
  
  // Contribution margin
  totalRevenue: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface OrderContributionMargin {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  plantId: string;
  grade: string;
  
  // Quantities
  orderedQuantity: number;
  deliveredQuantity: number;
  
  // Revenue
  unitPrice: number;
  totalRevenue: number;
  pumpingCharges: number;
  waitingCharges: number;
  minimumLoadCharges: number;
  totalRevenueWithCharges: number;
  
  // Cost
  costPerM3: number;
  totalCost: number;
  
  // Margin
  contributionMargin: number;
  contributionMarginPercent: number;
  
  createdAt: string;
}

// ============================================================================
// Receivables and Payables
// ============================================================================

export interface CustomerInvoice {
  id: string;
  invoiceNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  
  // Order reference
  orderId: string;
  orderNumber: string;
  
  // Items
  items: InvoiceItem[];
  
  // Amounts
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  
  // GST
  placeOfSupply: string;
  isInterState: boolean;
  
  // Dates
  invoiceDate: string;
  dueDate: string;
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paidAmount: number;
  paidAt?: string;
  
  // Delivery reference
  deliveryChallanIds: string[];
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  
  // Item details
  description: string;
  hsnCode: string;
  sacCode?: string;
  
  // Quantity and rate
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  
  // GST
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  
  createdAt: string;
}

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  
  // Reference
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  
  // Customer
  customerId: string;
  customerName: string;
  
  // Reason
  reason: string;
  returnType: 'return' | 'rejection' | 'discount' | 'other';
  
  // Amounts
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  
  // Dates
  creditNoteDate: string;
  
  // Status
  status: 'draft' | 'issued' | 'applied' | 'cancelled';
  
  // Delivery reference
  returnDeliveryIds: string[];
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  
  // Vendor
  vendorId: string;
  vendorName: string;
  
  // Receipt reference
  receiptId?: string;
  receiptNumber?: string;
  
  // Items
  items: BillItem[];
  
  // Amounts
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  
  // Dates
  billDate: string;
  dueDate: string;
  
  // Status
  status: 'draft' | 'approved' | 'paid' | 'overdue' | 'cancelled';
  paidAmount: number;
  paidAt?: string;
  
  // Matching
  matchStatus: 'unmatched' | 'partial' | 'matched';
  matchedReceiptIds: string[];
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface BillItem {
  id: string;
  billId: string;
  
  // Item details
  description: string;
  hsnCode: string;
  
  // Quantity and rate
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  
  // GST
  gstRate: number;
  
  createdAt: string;
}

// ============================================================================
// Reconciliation
// ============================================================================

export interface ReconciliationReport {
  id: string;
  reportDate: string;
  periodId: string;
  
  // Module reconciliation
  moduleReconciliations: ModuleReconciliation[];
  
  // Summary
  totalOperational: number;
  totalPosted: number;
  variance: number;
  
  // Unposted transactions
  unpostedTransactions: UnpostedTransaction[];
  
  createdAt: string;
  createdBy: string;
}

export interface ModuleReconciliation {
  module: string;
  operationalTotal: number;
  postedTotal: number;
  variance: number;
  status: 'reconciled' | 'variance';
}

export interface UnpostedTransaction {
  sourceType: TransactionType;
  sourceId: string;
  sourceReference: string;
  amount: number;
  date: string;
  status: string;
  reason?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface CostingConfiguration {
  id: string;
  
  // Internal hire rates
  defaultInternalHireRatePerHour: number;
  defaultInternalHireRatePerKm: number;
  
  // Overhead allocation
  defaultOverheadAllocationMethod: 'per_m3' | 'per_batch_hour' | 'per_trip' | 'per_km';
  defaultOverheadRatePerM3: number;
  
  // GST
  defaultGstRate: number;
  interStateGstRate: number;
  
  // Costing periods
  costingPeriodStartDay: number; // 1-28
  
  createdAt: string;
  updatedAt: string;
}
