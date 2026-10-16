/**
 * Part 15 — Stock Movement Service
 */

import { storage } from './storage';
import { StockMovement, StockMovementType } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getMaterialReceipt } from './materialReceiptService';

const movementsStore = storage.getAdapter<StockMovement>('stock_movements');

// ============================================================================
// Stock Movement CRUD
// ============================================================================

export async function createStockMovement(
  data: Omit<StockMovement, 'id' | 'movementNumber' | 'createdAt'>
): Promise<StockMovement> {
  // Generate movement number
  const movementNumber = `SM-${Date.now()}`;
  
  const movement: StockMovement = {
    ...data,
    id: generateId(),
    movementNumber,
    createdAt: new Date().toISOString(),
  };
  
  await movementsStore.create(movement);
  
  await recordAudit({
    entityType: 'StockMovement',
    entityId: movement.id,
    action: 'create',
    before: null,
    after: movement as any,
    actorId: data.createdBy,
    actorRole: 'store_keeper',
    requestId: generateId(),
    reason: `Stock movement ${movementNumber} created: ${data.type}`,
  });
  
  return movement;
}

export async function getStockMovement(id: string): Promise<StockMovement | null> {
  return movementsStore.findById(id);
}

export async function getStockMovementByNumber(movementNumber: string): Promise<StockMovement | null> {
  const all = await movementsStore.findAll();
  return all.find(m => m.movementNumber === movementNumber) || null;
}

export async function listStockMovements(filters?: {
  materialId?: string;
  type?: StockMovementType;
  storageLocationId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<StockMovement[]> {
  let movements = await movementsStore.findAll();
  
  if (filters?.materialId) {
    movements = movements.filter(m => m.materialId === filters.materialId);
  }
  if (filters?.type) {
    movements = movements.filter(m => m.type === filters.type);
  }
  if (filters?.storageLocationId) {
    movements = movements.filter(m => 
      m.fromStorageLocationId === filters.storageLocationId || 
      m.toStorageLocationId === filters.storageLocationId
    );
  }
  if (filters?.fromDate) {
    movements = movements.filter(m => m.movementDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    movements = movements.filter(m => m.movementDate <= filters.toDate!);
  }
  
  return movements.sort((a, b) => new Date(b.movementDate).getTime() - new Date(a.movementDate).getTime());
}

// ============================================================================
// Issue to Production
// ============================================================================

export async function issueToProduction(
  materialId: string,
  materialName: string,
  quantity: number,
  unit: string,
  storageLocationId: string,
  batchId: string,
  issueMethod: 'backflush' | 'manual',
  issuedBy: string
): Promise<StockMovement> {
  // Check if material is on QC hold
  const receipts = await getMaterialReceiptsByMaterial(materialId);
  const heldReceipts = receipts.filter(r => r.qcStatus === 'on_hold');
  
  if (heldReceipts.length > 0) {
    throw new Error(`Cannot issue material ${materialName} to production: material is on QC hold`);
  }
  
  // Check if both backflush and manual issue exist for same batch
  if (issueMethod === 'manual') {
    const existingBackflush = await movementsStore.findAll();
    const hasBackflush = existingBackflush.some(m => 
      m.materialId === materialId && 
      m.referenceId === batchId && 
      m.type === 'backflush'
    );
    
    if (hasBackflush) {
      throw new Error(`Cannot create manual issue for batch ${batchId}: backflush already exists`);
    }
  } else if (issueMethod === 'backflush') {
    const existingManual = await movementsStore.findAll();
    const hasManual = existingManual.some(m => 
      m.materialId === materialId && 
      m.referenceId === batchId && 
      m.type === 'issue_to_production'
    );
    
    if (hasManual) {
      throw new Error(`Cannot create backflush for batch ${batchId}: manual issue already exists`);
    }
  }
  
  const movementType: StockMovementType = issueMethod === 'backflush' ? 'backflush' : 'issue_to_production';
  
  const movement = await createStockMovement({
    materialId,
    materialName,
    type: movementType,
    quantity,
    unit,
    referenceType: 'batch',
    referenceId: batchId,
    fromStorageLocationId: storageLocationId,
    movementDate: new Date().toISOString().split('T')[0],
    requiresApproval: false,
    createdBy: issuedBy,
  });
  
  return movement;
}

async function getMaterialReceiptsByMaterial(materialId: string): Promise<any[]> {
  // This would normally query the receipts store
  // For now, return empty array
  return [];
}

// ============================================================================
// Physical Count Adjustment
// ============================================================================

export async function createPhysicalCountAdjustment(
  materialId: string,
  materialName: string,
  quantity: number,
  unit: string,
  storageLocationId: string,
  reason: string,
  createdBy: string,
  approvedBy?: string
): Promise<StockMovement> {
  const requiresApproval = !approvedBy;
  
  const movement = await createStockMovement({
    materialId,
    materialName,
    type: 'physical_count_adjustment',
    quantity,
    unit,
    referenceType: 'adjustment',
    toStorageLocationId: storageLocationId,
    movementDate: new Date().toISOString().split('T')[0],
    requiresApproval,
    approvedBy,
    approvedAt: approvedBy ? new Date().toISOString() : undefined,
    approvalReason: reason,
    createdBy,
  });
  
  if (requiresApproval) {
    // Raise alert for pending approval
    await raiseAlert({
      ruleCode: 'STOCK_ADJUSTMENT_PENDING',
      severity: 'warning',
      title: `Stock Adjustment Pending Approval`,
      description: `Physical count adjustment for ${materialName} requires approval: ${reason}`,
      module: 'Material Inventory',
      entityType: 'StockMovement',
      entityId: movement.id,
      responsibleRole: 'site_manager',
      recommendedAction: 'Review and approve stock adjustment',
      dueInHours: 24,
      requestId: generateId(),
    });
  }
  
  return movement;
}

export async function approveStockAdjustment(
  movementId: string,
  approvedBy: string,
  approvalReason: string
): Promise<StockMovement> {
  const movement = await movementsStore.findById(movementId);
  if (!movement) {
    throw new Error(`Stock movement ${movementId} not found`);
  }
  
  if (movement.type !== 'physical_count_adjustment') {
    throw new Error(`Stock movement ${movementId} is not a physical count adjustment`);
  }
  
  if (!movement.requiresApproval || movement.approvedBy) {
    throw new Error(`Stock movement ${movementId} does not require approval or is already approved`);
  }
  
  const updated = await movementsStore.update(movementId, {
    approvedBy,
    approvedAt: new Date().toISOString(),
    approvalReason,
  });
  
  await recordAudit({
    entityType: 'StockMovement',
    entityId: movementId,
    action: 'approve',
    before: { approvedBy: null },
    after: { approvedBy, approvalReason },
    actorId: approvedBy,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: `Stock adjustment approved: ${approvalReason}`,
  });
  
  return updated;
}

// ============================================================================
// Stock Balance Calculation
// ============================================================================

export async function calculateStockBalance(
  materialId: string,
  storageLocationId?: string,
  asOfDate?: string
): Promise<{
  openingBalance: number;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
  closingBalance: number;
}> {
  let movements = await movementsStore.findAll({ materialId } as any);
  
  if (storageLocationId) {
    movements = movements.filter(m => 
      m.toStorageLocationId === storageLocationId || 
      m.fromStorageLocationId === storageLocationId
    );
  }
  
  if (asOfDate) {
    movements = movements.filter(m => m.movementDate <= asOfDate);
  }
  
  let openingBalance = 0;
  let receipts = 0;
  let issues = 0;
  let transfers = 0;
  let adjustments = 0;
  
  for (const movement of movements) {
    const signedQuantity = movement.type.includes('transfer_in') || movement.type.includes('receipt') || movement.type.includes('opening')
      ? movement.quantity
      : -movement.quantity;
    
    switch (movement.type) {
      case 'opening_balance':
        openingBalance += signedQuantity;
        break;
      case 'receipt':
        receipts += movement.quantity;
        break;
      case 'issue_to_production':
      case 'backflush':
        issues += movement.quantity;
        break;
      case 'transfer_in':
      case 'transfer_out':
        transfers += signedQuantity;
        break;
      case 'physical_count_adjustment':
        adjustments += signedQuantity;
        break;
    }
  }
  
  const closingBalance = openingBalance + receipts - issues + transfers + adjustments;
  
  return {
    openingBalance,
    receipts,
    issues,
    transfers,
    adjustments,
    closingBalance,
  };
}

// ============================================================================
// Stock Movement Statistics
// ============================================================================

export async function getStockMovementStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  materialId?: string;
}): Promise<{
  totalMovements: number;
  receipts: number;
  issues: number;
  transfers: number;
  adjustments: number;
  pendingApprovals: number;
}> {
  let movements = await movementsStore.findAll();
  
  if (filters?.fromDate) {
    movements = movements.filter(m => m.movementDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    movements = movements.filter(m => m.movementDate <= filters.toDate!);
  }
  if (filters?.materialId) {
    movements = movements.filter(m => m.materialId === filters.materialId);
  }
  
  return {
    totalMovements: movements.length,
    receipts: movements.filter(m => m.type === 'receipt').length,
    issues: movements.filter(m => m.type === 'issue_to_production' || m.type === 'backflush').length,
    transfers: movements.filter(m => m.type === 'transfer_in' || m.type === 'transfer_out').length,
    adjustments: movements.filter(m => m.type === 'physical_count_adjustment').length,
    pendingApprovals: movements.filter(m => m.requiresApproval && !m.approvedBy).length,
  };
}
