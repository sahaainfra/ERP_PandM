/**
 * Part 13 — Production Order Service
 */

import { storage } from './storage';
import { ProductionOrder, ProductionOrderStatus } from './rmcPlantTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getPlant } from './rmcPlantService';
import { listBatches } from './batchService';

const productionOrdersStore = storage.getAdapter<ProductionOrder>('production_orders');

// ============================================================================
// Production Order CRUD
// ============================================================================

export async function createProductionOrder(
  data: Omit<ProductionOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'producedQuantity' | 'remainingQuantity' | 'status'>
): Promise<ProductionOrder> {
  const plant = await getPlant(data.plantId);
  if (!plant) {
    throw new Error(`Plant ${data.plantId} not found`);
  }

  // Generate order number
  const orderNumber = `PO-${plant.plantCode}-${Date.now()}`;

  const order: ProductionOrder = {
    ...data,
    id: generateId(),
    orderNumber,
    producedQuantity: 0,
    remainingQuantity: data.orderedQuantity,
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await productionOrdersStore.create(order);

  await recordAudit({
    entityType: 'ProductionOrder',
    entityId: order.id,
    action: 'create',
    before: null,
    after: order as any,
    actorId: data.createdBy,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: `Production order ${orderNumber} created`,
  });

  return order;
}

export async function getProductionOrder(id: string): Promise<ProductionOrder | null> {
  return productionOrdersStore.findById(id);
}

export async function getProductionOrderByNumber(orderNumber: string): Promise<ProductionOrder | null> {
  const all = await productionOrdersStore.findAll();
  return all.find(o => o.orderNumber === orderNumber) || null;
}

export async function listProductionOrders(filters?: {
  plantId?: string;
  status?: ProductionOrderStatus;
  scheduledDate?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ProductionOrder[]> {
  let orders = await productionOrdersStore.findAll();

  if (filters?.plantId) {
    orders = orders.filter(o => o.plantId === filters.plantId);
  }
  if (filters?.status) {
    orders = orders.filter(o => o.status === filters.status);
  }
  if (filters?.scheduledDate) {
    orders = orders.filter(o => o.scheduledDate === filters.scheduledDate);
  }
  if (filters?.fromDate) {
    orders = orders.filter(o => o.scheduledDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    orders = orders.filter(o => o.scheduledDate <= filters.toDate!);
  }

  return orders.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
}

export async function updateProductionOrderStatus(
  id: string,
  status: ProductionOrderStatus,
  userId: string,
  reason?: string
): Promise<ProductionOrder> {
  const order = await productionOrdersStore.findById(id);
  if (!order) {
    throw new Error(`Production order ${id} not found`);
  }

  const updates: Partial<ProductionOrder> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  // Set actual start time when starting production
  if (status === 'in_progress' && !order.actualStartTime) {
    updates.actualStartTime = new Date().toISOString();
  }

  // Set actual end time when completing
  if (status === 'completed') {
    updates.actualEndTime = new Date().toISOString();
  }

  const updated = await productionOrdersStore.update(id, updates);

  await recordAudit({
    entityType: 'ProductionOrder',
    entityId: id,
    action: 'update',
    before: { status: order.status },
    after: { status, reason },
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: reason || `Order status changed to ${status}`,
  });

  return updated;
}

// ============================================================================
// Production Tracking
// ============================================================================

export async function updateProductionQuantity(orderId: string): Promise<ProductionOrder> {
  const order = await productionOrdersStore.findById(orderId);
  if (!order) {
    throw new Error(`Production order ${orderId} not found`);
  }

  // Calculate produced quantity from batches
  const batches = await listBatches({ productionOrderId: orderId });
  const producedQuantity = batches
    .filter(b => b.qualityStatus === 'approved')
    .reduce((sum, b) => sum + b.actualVolume, 0);

  const remainingQuantity = order.orderedQuantity - producedQuantity;

  const updated = await productionOrdersStore.update(orderId, {
    producedQuantity: Math.round(producedQuantity * 100) / 100,
    remainingQuantity: Math.round(remainingQuantity * 100) / 100,
    updatedAt: new Date().toISOString(),
  });

  // Auto-complete order if all quantity produced
  if (remainingQuantity <= 0 && order.status === 'in_progress') {
    await updateProductionOrderStatus(orderId, 'completed', 'system', 'All quantity produced');
  }

  return updated;
}

// ============================================================================
// Order Queue
// ============================================================================

export async function getOrderQueue(plantId: string, date: string): Promise<ProductionOrder[]> {
  const orders = await listProductionOrders({
    plantId,
    scheduledDate: date,
    status: 'planned',
  });

  // Sort by priority and scheduled time
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return orders.sort((a, b) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (a.scheduledStartTime && b.scheduledStartTime) {
      return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
    }
    return 0;
  });
}

// ============================================================================
// Statistics
// ============================================================================

export async function getProductionOrderStatistics(
  plantId: string,
  fromDate: string,
  toDate: string
): Promise<{
  totalOrders: number;
  completedOrders: number;
  inProgressOrders: number;
  plannedOrders: number;
  cancelledOrders: number;
  totalOrdered: number;
  totalProduced: number;
  fulfillmentRate: number;
}> {
  const orders = await listProductionOrders({ plantId, fromDate, toDate });

  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const inProgressOrders = orders.filter(o => o.status === 'in_progress').length;
  const plannedOrders = orders.filter(o => o.status === 'planned').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  const totalOrdered = orders.reduce((sum, o) => sum + o.orderedQuantity, 0);
  const totalProduced = orders.reduce((sum, o) => sum + o.producedQuantity, 0);
  const fulfillmentRate = totalOrdered > 0 ? (totalProduced / totalOrdered) * 100 : 0;

  return {
    totalOrders: orders.length,
    completedOrders,
    inProgressOrders,
    plannedOrders,
    cancelledOrders,
    totalOrdered: Math.round(totalOrdered * 100) / 100,
    totalProduced: Math.round(totalProduced * 100) / 100,
    fulfillmentRate: Math.round(fulfillmentRate * 10) / 10,
  };
}
