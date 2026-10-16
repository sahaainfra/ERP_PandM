/**
 * Part 15 — Concrete Reconciliation Service
 */

import { storage } from './storage';
import { ConcreteReconciliation } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';

const reconciliationsStore = storage.getAdapter<ConcreteReconciliation>('concrete_reconciliations');

// ============================================================================
// Concrete Reconciliation CRUD
// ============================================================================

export async function createConcreteReconciliation(
  data: Omit<ConcreteReconciliation, 'id' | 'batchedVsDispatchedVariance' | 'dispatchedVsDeliveredVariance' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<ConcreteReconciliation> {
  // Calculate variances
  const batchedVsDispatchedVariance = data.batchedQuantity - data.dispatchedQuantity;
  const dispatchedVsDeliveredVariance = data.dispatchedQuantity - data.deliveredQuantity;
  
  // Determine status
  let status: 'pending' | 'reconciled' | 'variance_detected' = 'pending';
  
  if (Math.abs(batchedVsDispatchedVariance) > data.batchingTolerance || 
      Math.abs(dispatchedVsDeliveredVariance) > data.dispatchTolerance) {
    status = 'variance_detected';
  } else if (data.reconciledBy) {
    status = 'reconciled';
  }
  
  const reconciliation: ConcreteReconciliation = {
    ...data,
    id: generateId(),
    batchedVsDispatchedVariance,
    dispatchedVsDeliveredVariance,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await reconciliationsStore.create(reconciliation);
  
  await recordAudit({
    entityType: 'ConcreteReconciliation',
    entityId: reconciliation.id,
    action: 'create',
    before: null,
    after: reconciliation as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Concrete reconciliation created for production order ${data.productionOrderNumber}`,
  });
  
  // Raise alert if variance detected
  if (status === 'variance_detected') {
    await raiseAlert({
      ruleCode: 'RMC_QUANTITY_MISMATCH',
      severity: 'high',
      title: `RMC Quantity Mismatch Detected`,
      description: `Production order ${data.productionOrderNumber} has quantity mismatches: Batched=${data.batchedQuantity}m³, Dispatched=${data.dispatchedQuantity}m³, Delivered=${data.deliveredQuantity}m³`,
      module: 'Material Inventory',
      entityType: 'ConcreteReconciliation',
      entityId: reconciliation.id,
      responsibleRole: 'plant_manager',
      recommendedAction: 'Investigate quantity mismatches - check batch records, dispatch logs, and site receipts',
      dueInHours: 24,
      requestId: generateId(),
    });
  }
  
  return reconciliation;
}

export async function getConcreteReconciliation(id: string): Promise<ConcreteReconciliation | null> {
  return reconciliationsStore.findById(id);
}

export async function getConcreteReconciliationByOrder(productionOrderId: string): Promise<ConcreteReconciliation | null> {
  const all = await reconciliationsStore.findAll();
  return all.find(r => r.productionOrderId === productionOrderId) || null;
}

export async function listConcreteReconciliations(filters?: {
  plantId?: string;
  date?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ConcreteReconciliation[]> {
  let reconciliations = await reconciliationsStore.findAll();
  
  if (filters?.plantId) {
    reconciliations = reconciliations.filter(r => r.plantId === filters.plantId);
  }
  if (filters?.date) {
    reconciliations = reconciliations.filter(r => r.date === filters.date);
  }
  if (filters?.status) {
    reconciliations = reconciliations.filter(r => r.status === filters.status);
  }
  if (filters?.fromDate) {
    reconciliations = reconciliations.filter(r => r.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    reconciliations = reconciliations.filter(r => r.date <= filters.toDate!);
  }
  
  return reconciliations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// Reconciliation Approval
// ============================================================================

export async function reconcileConcreteOrder(
  id: string,
  reconciledBy: string,
  notes?: string
): Promise<ConcreteReconciliation> {
  const reconciliation = await reconciliationsStore.findById(id);
  if (!reconciliation) {
    throw new Error(`Concrete reconciliation ${id} not found`);
  }
  
  const updated = await reconciliationsStore.update(id, {
    status: 'reconciled',
    reconciledBy,
    reconciledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'ConcreteReconciliation',
    entityId: id,
    action: 'update',
    before: { status: reconciliation.status },
    after: { status: 'reconciled', reconciledBy, notes },
    actorId: reconciledBy,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: notes || 'Concrete reconciliation approved',
  });
  
  return updated;
}

// ============================================================================
// Reconciliation Statistics
// ============================================================================

export async function getReconciliationStatistics(filters?: {
  plantId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalReconciliations: number;
  reconciled: number;
  pending: number;
  varianceDetected: number;
  totalPlanned: number;
  totalBatched: number;
  totalDispatched: number;
  totalDelivered: number;
  totalInvoiced: number;
}> {
  let reconciliations = await reconciliationsStore.findAll();
  
  if (filters?.plantId) {
    reconciliations = reconciliations.filter(r => r.plantId === filters.plantId);
  }
  if (filters?.fromDate) {
    reconciliations = reconciliations.filter(r => r.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    reconciliations = reconciliations.filter(r => r.date <= filters.toDate!);
  }
  
  return {
    totalReconciliations: reconciliations.length,
    reconciled: reconciliations.filter(r => r.status === 'reconciled').length,
    pending: reconciliations.filter(r => r.status === 'pending').length,
    varianceDetected: reconciliations.filter(r => r.status === 'variance_detected').length,
    totalPlanned: reconciliations.reduce((sum, r) => sum + r.plannedQuantity, 0),
    totalBatched: reconciliations.reduce((sum, r) => sum + r.batchedQuantity, 0),
    totalDispatched: reconciliations.reduce((sum, r) => sum + r.dispatchedQuantity, 0),
    totalDelivered: reconciliations.reduce((sum, r) => sum + r.deliveredQuantity, 0),
    totalInvoiced: reconciliations.reduce((sum, r) => sum + r.invoicedQuantity, 0),
  };
}

export async function getReconciliationVarianceAnalysis(filters?: {
  plantId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  averageBatchingVariance: number;
  averageDispatchVariance: number;
  maxBatchingVariance: number;
  maxDispatchVariance: number;
  ordersWithVariance: number;
}> {
  let reconciliations = await reconciliationsStore.findAll();
  
  if (filters?.plantId) {
    reconciliations = reconciliations.filter(r => r.plantId === filters.plantId);
  }
  if (filters?.fromDate) {
    reconciliations = reconciliations.filter(r => r.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    reconciliations = reconciliations.filter(r => r.date <= filters.toDate!);
  }
  
  const batchingVariances = reconciliations.map(r => r.batchedVsDispatchedVariance);
  const dispatchVariances = reconciliations.map(r => r.dispatchedVsDeliveredVariance);
  
  const averageBatchingVariance = batchingVariances.length > 0
    ? batchingVariances.reduce((sum, v) => sum + v, 0) / batchingVariances.length
    : 0;
  
  const averageDispatchVariance = dispatchVariances.length > 0
    ? dispatchVariances.reduce((sum, v) => sum + v, 0) / dispatchVariances.length
    : 0;
  
  return {
    averageBatchingVariance: Math.round(averageBatchingVariance * 100) / 100,
    averageDispatchVariance: Math.round(averageDispatchVariance * 100) / 100,
    maxBatchingVariance: batchingVariances.length > 0 ? Math.max(...batchingVariances.map(Math.abs)) : 0,
    maxDispatchVariance: dispatchVariances.length > 0 ? Math.max(...dispatchVariances.map(Math.abs)) : 0,
    ordersWithVariance: reconciliations.filter(r => 
      Math.abs(r.batchedVsDispatchedVariance) > r.batchingTolerance ||
      Math.abs(r.dispatchedVsDeliveredVariance) > r.dispatchTolerance
    ).length,
  };
}
