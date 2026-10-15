/**
 * Part 09 — Fuel Receipts Service
 * 
 * Manages fuel receipts from suppliers into storage points
 */

import { storage } from './storage';
import { FuelReceipt, FuelConfiguration } from './fuelTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getStoragePoint, getFuelType } from './fuelMasters';

const fuelReceiptsStore = storage.getAdapter<FuelReceipt>('fuel_receipts');
const configStore = storage.getAdapter<FuelConfiguration>('fuel_configuration');

// ============================================================================
// Fuel Configuration
// ============================================================================

export async function getFuelConfiguration(): Promise<FuelConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    // Return default configuration
    const defaultConfig: FuelConfiguration = {
      id: 'default',
      receiptVarianceTolerancePercent: 2,
      receiptVarianceToleranceLitres: 50,
      tankVarianceTolerancePercent: 0.5,
      tankVarianceToleranceLitres: 10,
      issueTankCapacityTolerancePercent: 5,
      costValuationMethod: 'weighted_average',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return defaultConfig;
  }
  return configs[0];
}

export async function updateFuelConfiguration(updates: Partial<FuelConfiguration>): Promise<FuelConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    // Create new configuration with defaults
    const defaultConfig: FuelConfiguration = {
      id: generateId(),
      receiptVarianceTolerancePercent: updates.receiptVarianceTolerancePercent ?? 2,
      receiptVarianceToleranceLitres: updates.receiptVarianceToleranceLitres ?? 50,
      tankVarianceTolerancePercent: updates.tankVarianceTolerancePercent ?? 0.5,
      tankVarianceToleranceLitres: updates.tankVarianceToleranceLitres ?? 10,
      issueTankCapacityTolerancePercent: updates.issueTankCapacityTolerancePercent ?? 5,
      costValuationMethod: updates.costValuationMethod ?? 'weighted_average',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }

  const updated = await configStore.update(configs[0].id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

// ============================================================================
// Fuel Receipts
// ============================================================================

export async function createFuelReceipt(data: Omit<FuelReceipt, 'id' | 'receiptNumber' | 'variance' | 'variancePercent' | 'baseAmount' | 'gstAmount' | 'totalAmount' | 'createdAt' | 'updatedAt'>): Promise<FuelReceipt> {
  // Get storage point and fuel type
  const storagePoint = await getStoragePoint(data.storagePointId);
  if (!storagePoint) {
    throw new Error(`Storage point ${data.storagePointId} not found`);
  }

  const fuelType = await getFuelType(data.fuelTypeId);
  if (!fuelType) {
    throw new Error(`Fuel type ${data.fuelTypeId} not found`);
  }

  // Calculate measured quantity
  let measuredQuantity = data.measuredQuantity;
  if (data.dipBefore !== undefined && data.dipAfter !== undefined) {
    measuredQuantity = data.dipAfter - data.dipBefore;
  } else if (data.meterOpening !== undefined && data.meterClosing !== undefined) {
    measuredQuantity = data.meterClosing - data.meterOpening;
  }

  // Calculate variance
  const variance = data.invoicedQuantity - measuredQuantity;
  const variancePercent = (variance / data.invoicedQuantity) * 100;

  // Calculate financial amounts
  const baseAmount = measuredQuantity * data.rate;
  const gstAmount = baseAmount * (data.gstRate / 100);
  const totalAmount = baseAmount + gstAmount;

  // Generate receipt number
  const receiptNumber = `FR-${Date.now()}`;

  const receipt: FuelReceipt = {
    ...data,
    id: generateId(),
    receiptNumber,
    measuredQuantity,
    variance,
    variancePercent,
    baseAmount,
    gstAmount,
    totalAmount,
    status: 'draft',
    postedToInventory: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fuelReceiptsStore.create(receipt);

  await recordAudit({
    entityType: 'FuelReceipt',
    entityId: receipt.id,
    action: 'create',
    before: null,
    after: receipt as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel receipt created',
  });

  return receipt;
}

export async function getFuelReceipt(id: string): Promise<FuelReceipt | null> {
  return fuelReceiptsStore.findById(id);
}

export async function getFuelReceiptByNumber(receiptNumber: string): Promise<FuelReceipt | null> {
  const all = await fuelReceiptsStore.findAll();
  return all.find(r => r.receiptNumber === receiptNumber) || null;
}

export async function listFuelReceipts(filters?: {
  storagePointId?: string;
  fuelTypeId?: string;
  supplierId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<FuelReceipt[]> {
  let receipts = await fuelReceiptsStore.findAll();

  if (filters?.storagePointId) {
    receipts = receipts.filter(r => r.storagePointId === filters.storagePointId);
  }
  if (filters?.fuelTypeId) {
    receipts = receipts.filter(r => r.fuelTypeId === filters.fuelTypeId);
  }
  if (filters?.supplierId) {
    receipts = receipts.filter(r => r.supplierId === filters.supplierId);
  }
  if (filters?.fromDate) {
    receipts = receipts.filter(r => r.deliveryDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    receipts = receipts.filter(r => r.deliveryDate <= filters.toDate!);
  }
  if (filters?.status) {
    receipts = receipts.filter(r => r.status === filters.status);
  }

  return receipts.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
}

export async function submitFuelReceipt(id: string, userId: string): Promise<FuelReceipt> {
  const receipt = await fuelReceiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Fuel receipt ${id} not found`);
  }

  if (receipt.status !== 'draft') {
    throw new Error(`Fuel receipt is not in draft status (current: ${receipt.status})`);
  }

  // Check for duplicate invoice
  const existingReceipts = await fuelReceiptsStore.findAll();
  const duplicateInvoice = existingReceipts.find(r => 
    r.id !== id && 
    r.invoiceNumber === receipt.invoiceNumber && 
    r.supplierId === receipt.supplierId
  );

  if (duplicateInvoice) {
    throw new Error(`Duplicate invoice number: ${receipt.invoiceNumber} already exists for this supplier`);
  }

  // Check variance tolerance
  const config = await getFuelConfiguration();
  const varianceExceedsTolerance = 
    Math.abs(receipt.variancePercent) > config.receiptVarianceTolerancePercent ||
    Math.abs(receipt.variance) > config.receiptVarianceToleranceLitres;

  if (varianceExceedsTolerance) {
    // Raise alert
    await raiseAlert({
      ruleCode: 'FUEL_RECEIPT_SHORTAGE',
      severity: 'warning',
      title: `Fuel Receipt Variance Exceeds Tolerance`,
      description: `Receipt ${receipt.receiptNumber} has variance of ${receipt.variance.toFixed(2)}L (${receipt.variancePercent.toFixed(2)}%)`,
      module: 'Fuel Management',
      entityType: 'FuelReceipt',
      entityId: receipt.id,
      responsibleRole: 'fuel_officer',
      recommendedAction: 'Review receipt measurements and supplier delivery',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  const updated = await fuelReceiptsStore.update(id, {
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelReceipt',
    entityId: id,
    action: 'submit',
    before: receipt as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel receipt submitted',
  });

  return updated;
}

export async function approveFuelReceipt(id: string, userId: string): Promise<FuelReceipt> {
  const receipt = await fuelReceiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Fuel receipt ${id} not found`);
  }

  if (receipt.status !== 'submitted') {
    throw new Error(`Fuel receipt is not in submitted status (current: ${receipt.status})`);
  }

  // Post to inventory ledger (simulated - would integrate with inventory service)
  // This would update the inventory ledger with the received fuel
  const updated = await fuelReceiptsStore.update(id, {
    status: 'approved',
    approvedBy: userId,
    postedToInventory: true,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelReceipt',
    entityId: id,
    action: 'approve',
    before: receipt as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel receipt approved and posted to inventory',
  });

  return updated;
}

export async function rejectFuelReceipt(id: string, reason: string, userId: string): Promise<FuelReceipt> {
  const receipt = await fuelReceiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Fuel receipt ${id} not found`);
  }

  if (receipt.status !== 'submitted') {
    throw new Error(`Fuel receipt is not in submitted status (current: ${receipt.status})`);
  }

  const updated = await fuelReceiptsStore.update(id, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelReceipt',
    entityId: id,
    action: 'reject',
    before: receipt as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason,
  });

  return updated;
}

// ============================================================================
// Receipt Statistics
// ============================================================================

export async function getReceiptStatistics(filters?: {
  storagePointId?: string;
  fuelTypeId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalReceipts: number;
  totalQuantity: number;
  totalValue: number;
  averageVariance: number;
}> {
  let receipts = await fuelReceiptsStore.findAll();

  if (filters?.storagePointId) {
    receipts = receipts.filter(r => r.storagePointId === filters.storagePointId);
  }
  if (filters?.fuelTypeId) {
    receipts = receipts.filter(r => r.fuelTypeId === filters.fuelTypeId);
  }
  if (filters?.fromDate) {
    receipts = receipts.filter(r => r.deliveryDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    receipts = receipts.filter(r => r.deliveryDate <= filters.toDate!);
  }

  const approvedReceipts = receipts.filter(r => r.status === 'approved');

  return {
    totalReceipts: approvedReceipts.length,
    totalQuantity: approvedReceipts.reduce((sum, r) => sum + r.measuredQuantity, 0),
    totalValue: approvedReceipts.reduce((sum, r) => sum + r.totalAmount, 0),
    averageVariance: approvedReceipts.length > 0
      ? approvedReceipts.reduce((sum, r) => sum + r.variancePercent, 0) / approvedReceipts.length
      : 0,
  };
}
