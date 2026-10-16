/**
 * Part 15 — Material Receipt Service
 */

import { storage } from './storage';
import { MaterialReceipt, MaterialCategory } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getUnitConversion, convertUnits } from './unitConversionService';

const receiptsStore = storage.getAdapter<MaterialReceipt>('material_receipts');

// ============================================================================
// Material Receipt CRUD
// ============================================================================

export async function createMaterialReceipt(
  data: Omit<MaterialReceipt, 'id' | 'receiptNumber' | 'convertedQuantity' | 'totalValue' | 'createdAt' | 'updatedAt'>
): Promise<MaterialReceipt> {
  // Generate receipt number
  const receiptNumber = `MR-${Date.now()}`;
  
  // Get unit conversion if needed
  let convertedQuantity = data.weighedQuantity;
  let conversionFactor: number | undefined;
  
  if (data.invoiceUnit !== data.weighedUnit) {
    const conversion = await getUnitConversion(data.materialId, data.weighedUnit, 'kg');
    if (conversion) {
      conversionFactor = conversion.conversionFactor;
      convertedQuantity = await convertUnits(data.materialId, data.weighedQuantity, data.weighedUnit, 'kg', data.deliveryDate);
    }
  }
  
  // Calculate total value
  const totalValue = convertedQuantity * data.rate;
  
  const receipt: MaterialReceipt = {
    ...data,
    id: generateId(),
    receiptNumber,
    convertedQuantity,
    conversionFactor,
    totalValue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await receiptsStore.create(receipt);
  
  await recordAudit({
    entityType: 'MaterialReceipt',
    entityId: receipt.id,
    action: 'create',
    before: null,
    after: receipt as any,
    actorId: data.receivedBy,
    actorRole: 'store_keeper',
    requestId: generateId(),
    reason: `Material receipt ${receiptNumber} created`,
  });
  
  return receipt;
}

export async function getMaterialReceipt(id: string): Promise<MaterialReceipt | null> {
  return receiptsStore.findById(id);
}

export async function getMaterialReceiptByNumber(receiptNumber: string): Promise<MaterialReceipt | null> {
  const all = await receiptsStore.findAll();
  return all.find(r => r.receiptNumber === receiptNumber) || null;
}

export async function listMaterialReceipts(filters?: {
  supplierId?: string;
  materialId?: string;
  materialCategory?: MaterialCategory;
  storageLocationId?: string;
  qcStatus?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<MaterialReceipt[]> {
  let receipts = await receiptsStore.findAll();
  
  if (filters?.supplierId) {
    receipts = receipts.filter(r => r.supplierId === filters.supplierId);
  }
  if (filters?.materialId) {
    receipts = receipts.filter(r => r.materialId === filters.materialId);
  }
  if (filters?.materialCategory) {
    receipts = receipts.filter(r => r.materialCategory === filters.materialCategory);
  }
  if (filters?.storageLocationId) {
    receipts = receipts.filter(r => r.storageLocationId === filters.storageLocationId);
  }
  if (filters?.qcStatus) {
    receipts = receipts.filter(r => r.qcStatus === filters.qcStatus);
  }
  if (filters?.fromDate) {
    receipts = receipts.filter(r => r.deliveryDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    receipts = receipts.filter(r => r.deliveryDate <= filters.toDate!);
  }
  
  return receipts.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
}

// ============================================================================
// QC Acceptance
// ============================================================================

export async function acceptMaterialReceipt(
  id: string,
  acceptedBy: string,
  testCertificateId?: string
): Promise<MaterialReceipt> {
  const receipt = await receiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Material receipt ${id} not found`);
  }
  
  if (receipt.qcStatus !== 'on_hold' && receipt.qcStatus !== 'pending') {
    throw new Error(`Material receipt is not pending QC acceptance (current status: ${receipt.qcStatus})`);
  }
  
  const updated = await receiptsStore.update(id, {
    qcStatus: 'accepted',
    qcAcceptedBy: acceptedBy,
    qcAcceptedAt: new Date().toISOString(),
    testCertificateId,
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'MaterialReceipt',
    entityId: id,
    action: 'update',
    before: { qcStatus: receipt.qcStatus },
    after: { qcStatus: 'accepted', testCertificateId },
    actorId: acceptedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Material receipt accepted by QC',
  });
  
  return updated;
}

export async function rejectMaterialReceipt(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<MaterialReceipt> {
  const receipt = await receiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Material receipt ${id} not found`);
  }
  
  if (receipt.qcStatus !== 'on_hold' && receipt.qcStatus !== 'pending') {
    throw new Error(`Material receipt is not pending QC acceptance (current status: ${receipt.qcStatus})`);
  }
  
  const updated = await receiptsStore.update(id, {
    qcStatus: 'rejected',
    qcAcceptedBy: rejectedBy,
    qcAcceptedAt: new Date().toISOString(),
    qcRejectionReason: reason,
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'MaterialReceipt',
    entityId: id,
    action: 'update',
    before: { qcStatus: receipt.qcStatus },
    after: { qcStatus: 'rejected', reason },
    actorId: rejectedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Material receipt rejected: ${reason}`,
  });
  
  // Raise alert for rejected material
  await raiseAlert({
    ruleCode: 'MATERIAL_QC_REJECTED',
    severity: 'high',
    title: `Material QC Rejected`,
    description: `Material receipt ${receipt.receiptNumber} for ${receipt.materialName} has been rejected by QC: ${reason}`,
    module: 'Material Inventory',
    entityType: 'MaterialReceipt',
    entityId: id,
    responsibleRole: 'store_keeper',
    recommendedAction: 'Arrange return to supplier or disposal',
    dueInHours: 48,
    requestId: generateId(),
  });
  
  return updated;
}

export async function placeMaterialOnHold(
  id: string,
  placedBy: string,
  reason: string
): Promise<MaterialReceipt> {
  const receipt = await receiptsStore.findById(id);
  if (!receipt) {
    throw new Error(`Material receipt ${id} not found`);
  }
  
  const updated = await receiptsStore.update(id, {
    qcStatus: 'on_hold',
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'MaterialReceipt',
    entityId: id,
    action: 'update',
    before: { qcStatus: receipt.qcStatus },
    after: { qcStatus: 'on_hold', reason },
    actorId: placedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Material placed on hold: ${reason}`,
  });
  
  return updated;
}

// ============================================================================
// Receipt Statistics
// ============================================================================

export async function getReceiptStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  materialCategory?: MaterialCategory;
}): Promise<{
  totalReceipts: number;
  totalQuantity: number;
  totalValue: number;
  pendingQC: number;
  onHold: number;
  accepted: number;
  rejected: number;
}> {
  let receipts = await receiptsStore.findAll();
  
  if (filters?.fromDate) {
    receipts = receipts.filter(r => r.deliveryDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    receipts = receipts.filter(r => r.deliveryDate <= filters.toDate!);
  }
  if (filters?.materialCategory) {
    receipts = receipts.filter(r => r.materialCategory === filters.materialCategory);
  }
  
  return {
    totalReceipts: receipts.length,
    totalQuantity: receipts.reduce((sum, r) => sum + r.convertedQuantity, 0),
    totalValue: receipts.reduce((sum, r) => sum + r.totalValue, 0),
    pendingQC: receipts.filter(r => r.qcStatus === 'pending').length,
    onHold: receipts.filter(r => r.qcStatus === 'on_hold').length,
    accepted: receipts.filter(r => r.qcStatus === 'accepted').length,
    rejected: receipts.filter(r => r.qcStatus === 'rejected').length,
  };
}
