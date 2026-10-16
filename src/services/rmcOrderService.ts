/**
 * Part 17 — RMC Order Service
 */

import { storage } from './storage';
import { RMCOrder, OrderRevision, OrderStatus } from './rmcOrderTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getMixDesign, getRevisionByNumber } from './mixDesignService';

const ordersStore = storage.getAdapter<RMCOrder>('rmc_orders');

// ============================================================================
// Order CRUD
// ============================================================================

export async function createRMCOrder(
   Omit<RMCOrder, 'id' | 'orderNumber' | 'deliveredQuantity' | 'remainingQuantity' | 'status' | 'creditApproved' | 'technicalApproved' | 'revisionNumber' | 'revisionHistory' | 'productionOrderIds' | 'createdAt' | 'updatedAt'>
): Promise<RMCOrder> {
  // Generate order number
  const orderNumber = `RMC-${Date.now()}`;
  
  // Validate mix design is approved
  const mixDesign = await getMixDesign(data.mixDesignId);
  if (!mixDesign) {
    throw new Error(`Mix design ${data.mixDesignId} not found`);
  }
  
  const revision = await getRevisionByNumber(data.mixDesignId, data.mixDesignRevision);
  if (!revision) {
    throw new Error(`Mix design revision ${data.mixDesignRevision} not found`);
  }
  
  if (revision.status !== 'approved') {
    throw new Error(`Mix design revision ${data.mixDesignRevision} is not approved (status: ${revision.status})`);
  }
  
  const order: RMCOrder = {
    ...data,
    id: generateId(),
    orderNumber,
    deliveredQuantity: 0,
    remainingQuantity: data.requiredQuantity,
    status: 'draft',
    creditApproved: false,
    technicalApproved: false,
    revisionNumber: 1,
    revisionHistory: [],
    productionOrderIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await ordersStore.create(order);
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: order.id,
    action: 'create',
    before: null,
    after: order as any,
    actorId: data.createdBy,
    actorRole: 'sales_executive',
    requestId: generateId(),
    reason: `RMC order ${orderNumber} created`,
  });
  
  return order;
}

export async function getRMCOrder(id: string): Promise<RMCOrder | null> {
  return ordersStore.findById(id);
}

export async function getRMCOrderByNumber(orderNumber: string): Promise<RMCOrder | null> {
  const all = await ordersStore.findAll();
  return all.find(o => o.orderNumber === orderNumber) || null;
}

export async function listRMCOrders(filters?: {
  customerId?: string;
  projectId?: string;
  status?: OrderStatus;
  requestedDate?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<RMCOrder[]> {
  let orders = await ordersStore.findAll();
  
  if (filters?.customerId) {
    orders = orders.filter(o => o.customerId === filters.customerId);
  }
  if (filters?.projectId) {
    orders = orders.filter(o => o.projectId === filters.projectId);
  }
  if (filters?.status) {
    orders = orders.filter(o => o.status === filters.status);
  }
  if (filters?.requestedDate) {
    orders = orders.filter(o => o.requestedDate === filters.requestedDate);
  }
  if (filters?.fromDate) {
    orders = orders.filter(o => o.requestedDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    orders = orders.filter(o => o.requestedDate <= filters.toDate!);
  }
  
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateRMCOrder(
  id: string,
  updates: Partial<RMCOrder>,
  userId: string
): Promise<RMCOrder> {
  const order = await ordersStore.findById(id);
  if (!order) {
    throw new Error(`RMC order ${id} not found`);
  }
  
  const updated = await ordersStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: id,
    action: 'update',
    before: order as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'sales_executive',
    requestId: generateId(),
    reason: 'RMC order updated',
  });
  
  return updated;
}

// ============================================================================
// Order Status Management
// ============================================================================

export async function submitOrder(
  id: string,
  userId: string
): Promise<RMCOrder> {
  const order = await ordersStore.findById(id);
  if (!order) {
    throw new Error(`RMC order ${id} not found`);
  }
  
  if (order.status !== 'draft') {
    throw new Error(`Order is not in draft status (current: ${order.status})`);
  }
  
  const updated = await ordersStore.update(id, {
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: id,
    action: 'submit',
    before: { status: 'draft' },
    after: { status: 'submitted' },
    actorId: userId,
    actorRole: 'sales_executive',
    requestId: generateId(),
    reason: 'Order submitted for approval',
  });
  
  return updated;
}

export async function cancelOrder(
  id: string,
  reason: string,
  cancellationCharges: number,
  userId: string
): Promise<RMCOrder> {
  const order = await ordersStore.findById(id);
  if (!order) {
    throw new Error(`RMC order ${id} not found`);
  }
  
  if (order.status === 'completed' || order.status === 'cancelled') {
    throw new Error(`Cannot cancel order in ${order.status} status`);
  }
  
  const updated = await ordersStore.update(id, {
    status: 'cancelled',
    cancellationReason: reason,
    cancellationCharges,
    cancelledBy: userId,
    cancelledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: id,
    action: 'update',
    before: { status: order.status },
    after: { status: 'cancelled', reason, cancellationCharges },
    actorId: userId,
    actorRole: 'sales_manager',
    requestId: generateId(),
    reason: `Order cancelled: ${reason}`,
  });
  
  return updated;
}

// ============================================================================
// Order Revisions
// ============================================================================

export async function createOrderRevision(
  orderId: string,
  changedFields: string[],
  previousValues: Record<string, any>,
  newValues: Record<string, any>,
  reason: string,
  requiresReApproval: boolean,
  userId: string
): Promise<RMCOrder> {
  const order = await ordersStore.findById(orderId);
  if (!order) {
    throw new Error(`RMC order ${orderId} not found`);
  }
  
  const revision: OrderRevision = {
    id: generateId(),
    orderId,
    revisionNumber: order.revisionNumber + 1,
    changedFields,
    previousValues,
    newValues,
    reason,
    requiresReApproval,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  };
  
  const updated = await ordersStore.update(orderId, {
    ...newValues,
    revisionNumber: revision.revisionNumber,
    revisionHistory: [...order.revisionHistory, revision],
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: orderId,
    action: 'update',
    before: previousValues,
    after: newValues,
    actorId: userId,
    actorRole: 'sales_executive',
    requestId: generateId(),
    reason: `Order revised (v${revision.revisionNumber}): ${reason}`,
  });
  
  // If re-approval required, reset approval status
  if (requiresReApproval) {
    await ordersStore.update(orderId, {
      creditApproved: false,
      technicalApproved: false,
      updatedAt: new Date().toISOString(),
    });
    
    await raiseAlert({
      ruleCode: 'ORDER_REVISION_REQUIRES_APPROVAL',
      severity: 'warning',
      title: `Order Revision Requires Re-Approval`,
      description: `Order ${order.orderNumber} has been revised and requires re-approval: ${reason}`,
      module: 'RMC Orders',
      entityType: 'RMCOrder',
      entityId: orderId,
      responsibleRole: 'sales_manager',
      recommendedAction: 'Review and approve revised order',
      dueInHours: 24,
      requestId: generateId(),
    });
  }
  
  return updated;
}

export async function getOrderRevisions(orderId: string): Promise<OrderRevision[]> {
  const order = await ordersStore.findById(orderId);
  if (!order) {
    throw new Error(`RMC order ${orderId} not found`);
  }
  
  return order.revisionHistory.sort((a, b) => b.revisionNumber - a.revisionNumber);
}

// ============================================================================
// Order Statistics
// ============================================================================

export async function getOrderStatistics(filters?: {
  customerId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalOrders: number;
  totalQuantity: number;
  totalValue: number;
  byStatus: Record<OrderStatus, number>;
  averageOrderValue: number;
}> {
  let orders = await ordersStore.findAll();
  
  if (filters?.customerId) {
    orders = orders.filter(o => o.customerId === filters.customerId);
  }
  if (filters?.fromDate) {
    orders = orders.filter(o => o.requestedDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    orders = orders.filter(o => o.requestedDate <= filters.toDate!);
  }
  
  const totalQuantity = orders.reduce((sum, o) => sum + o.requiredQuantity, 0);
  const totalValue = orders.reduce((sum, o) => sum + (o.requiredQuantity * o.ratePerM3), 0);
  
  const byStatus: Record<OrderStatus, number> = {
    draft: 0,
    submitted: 0,
    approved: 0,
    scheduled: 0,
    in_production: 0,
    partially_delivered: 0,
    completed: 0,
    cancelled: 0,
    on_hold: 0,
  };
  
  for (const order of orders) {
    byStatus[order.status]++;
  }
  
  return {
    totalOrders: orders.length,
    totalQuantity: Math.round(totalQuantity * 100) / 100,
    totalValue: Math.round(totalValue * 100) / 100,
    byStatus,
    averageOrderValue: orders.length > 0 ? Math.round((totalValue / orders.length) * 100) / 100 : 0,
  };
}

// ============================================================================
// Delivery Tracking
// ============================================================================

export async function updateDeliveredQuantity(
  orderId: string,
  deliveredQuantity: number,
  userId: string
): Promise<RMCOrder> {
  const order = await ordersStore.findById(orderId);
  if (!order) {
    throw new Error(`RMC order ${orderId} not found`);
  }
  
  const remainingQuantity = order.requiredQuantity - deliveredQuantity;
  
  let newStatus: OrderStatus = order.status;
  if (deliveredQuantity === 0) {
    newStatus = 'scheduled';
  } else if (deliveredQuantity < order.requiredQuantity) {
    newStatus = 'partially_delivered';
  } else if (deliveredQuantity >= order.requiredQuantity) {
    newStatus = 'completed';
  }
  
  const updated = await ordersStore.update(orderId, {
    deliveredQuantity,
    remainingQuantity,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'RMCOrder',
    entityId: orderId,
    action: 'update',
    before: { deliveredQuantity: order.deliveredQuantity, status: order.status },
    after: { deliveredQuantity, remainingQuantity, status: newStatus },
    actorId: userId,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: 'Delivered quantity updated',
  });
  
  return updated;
}
