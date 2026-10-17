/**
 * Part 23 — Dispatch and Logistics Dashboard Service
 */

import { storage } from './storage';
import { DispatchLogisticsKPI, MixerUtilization, DeliveryException } from './dashboardPart23Types';
import { generateId } from './utils';
import { listDispatches } from './dispatchService';
import { listMixerTrips } from './mixerTripService';
import { listRMCOrders } from './rmcOrderService';
import { listAssets } from './assets';

const dispatchLogisticsStore = storage.getAdapter<DispatchLogisticsKPI>('dispatch_logistics_kpis');

// ============================================================================
// Dispatch and Logistics KPI Calculation
// ============================================================================

export async function calculateDispatchLogisticsKPI(
  period: string,
  startDate: string,
  endDate: string,
  filters?: {
    plantId?: string;
    siteId?: string;
  }
): Promise<DispatchLogisticsKPI> {
  // Get all dispatches for the period
  let dispatches = await listDispatches({
    fromDate: startDate,
    toDate: endDate,
  });

  if (filters?.plantId) {
    dispatches = dispatches.filter(d => d.plantId === filters.plantId);
  }

  // Calculate order status metrics
  const scheduledOrders = dispatches.filter(d => d.status === 'scheduled').length;
  const batchedOrders = dispatches.filter(d => d.status === 'loaded').length;
  const dispatchedOrders = dispatches.filter(d => 
    d.status === 'in_transit' || d.status === 'at_site' || d.status === 'unloading' || d.status === 'completed'
  ).length;
  const deliveredOrders = dispatches.filter(d => d.status === 'completed').length;
  const delayedOrders = dispatches.filter(d => d.hasDelay).length;
  const cancelledOrders = dispatches.filter(d => d.status === 'cancelled').length;

  // Get resource availability
  const allAssets = await listAssets();
  const mixers = allAssets.filter(a => a.category === 'concrete' && a.subCategory === 'transit_mixer');
  const availableMixers = mixers.filter(m => m.status === 'available' || m.status === 'deployed').length;
  
  const pumps = allAssets.filter(a => a.category === 'concrete' && (a.subCategory === 'boom_pump' || a.subCategory === 'line_pump'));
  const availablePumps = pumps.filter(p => p.status === 'available' || p.status === 'deployed').length;

  // Get trip data
  const trips = await listMixerTrips({
    fromDate: startDate,
    toDate: endDate,
  });

  const totalTrips = trips.length;
  const uniqueMixers = new Set(trips.map(t => t.mixerId)).size;
  const averageTripsPerMixer = uniqueMixers > 0 ? totalTrips / uniqueMixers : 0;

  // Calculate vehicle utilization
  const totalMixerHours = trips.reduce((sum, t) => sum + (t.drumHours || 0), 0);
  const availableMixerHours = mixers.length * 24 * 30; // 30 days
  const vehicleUtilization = availableMixerHours > 0
    ? (totalMixerHours / availableMixerHours) * 100
    : 0;

  // Calculate duration metrics
  const loadingTimes = dispatches
    .filter(d => d.loadingStartTime && d.loadingEndTime)
    .map(d => {
      const start = new Date(d.loadingStartTime!).getTime();
      const end = new Date(d.loadingEndTime!).getTime();
      return (end - start) / (1000 * 60); // minutes
    });
  const averageLoadingTime = loadingTimes.length > 0
    ? loadingTimes.reduce((sum, t) => sum + t, 0) / loadingTimes.length
    : 0;

  const waitingTimes = dispatches
    .filter(d => d.siteWaitingMinutes)
    .map(d => d.siteWaitingMinutes!);
  const averageWaitingTime = waitingTimes.length > 0
    ? waitingTimes.reduce((sum, t) => sum + t, 0) / waitingTimes.length
    : 0;

  const transitTimes = dispatches
    .filter(d => d.plantDepartureTime && d.siteArrivalTime)
    .map(d => {
      const departure = new Date(d.plantDepartureTime!).getTime();
      const arrival = new Date(d.siteArrivalTime!).getTime();
      return (arrival - departure) / (1000 * 60); // minutes
    });
  const averageTransitTime = transitTimes.length > 0
    ? transitTimes.reduce((sum, t) => sum + t, 0) / transitTimes.length
    : 0;

  const unloadingTimes = dispatches
    .filter(d => d.unloadingStartTime && d.unloadingEndTime)
    .map(d => {
      const start = new Date(d.unloadingStartTime!).getTime();
      const end = new Date(d.unloadingEndTime!).getTime();
      return (end - start) / (1000 * 60); // minutes
    });
  const averageUnloadingTime = unloadingTimes.length > 0
    ? unloadingTimes.reduce((sum, t) => sum + t, 0) / unloadingTimes.length
    : 0;

  // Calculate on-time delivery
  const config = await import('./dispatchConfigService').then(m => m.getDispatchConfiguration());
  const onTimeDeliveries = dispatches.filter(d => {
    if (!d.plantDepartureTime || !d.siteArrivalTime) return false;
    const departure = new Date(d.plantDepartureTime).getTime();
    const arrival = new Date(d.siteArrivalTime).getTime();
    const transitMinutes = (arrival - departure) / (1000 * 60);
    return transitMinutes <= config.maxTransitTimeMinutes;
  }).length;
  const onTimeDeliveryPercent = deliveredOrders > 0
    ? (onTimeDeliveries / deliveredOrders) * 100
    : 100;

  // Calculate quantity reconciliation
  const orders = await listRMCOrders({
    fromDate: startDate,
    toDate: endDate,
  });

  const orderedQuantity = orders.reduce((sum, o) => sum + o.requiredQuantity, 0);
  const producedQuantity = dispatches.reduce((sum, d) => sum + (d.dispatchedQuantity || 0), 0);
  const dispatchedQuantity = dispatches.filter(d => d.status !== 'cancelled').reduce((sum, d) => sum + (d.dispatchedQuantity || 0), 0);
  const deliveredQuantity = dispatches.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.deliveredQuantity || 0), 0);
  const returnedQuantity = dispatches.reduce((sum, d) => sum + (d.returnedQuantity || 0), 0);
  const invoicedQuantity = deliveredQuantity - returnedQuantity; // Simplified

  // Calculate transport costs
  const totalTransportCost = trips.reduce((sum, t) => {
    const fuelCost = (t.fuelConsumed || 0) * 85; // Average fuel price
    const driverCost = 500; // Fixed driver cost per trip
    const maintenanceCost = 200; // Fixed maintenance allocation
    return sum + fuelCost + driverCost + maintenanceCost;
  }, 0);
  const transportCostPerM3 = deliveredQuantity > 0
    ? totalTransportCost / deliveredQuantity
    : 0;

  // Calculate exceptions
  const deliveryExceptions = dispatches.filter(d => d.hasDelay || d.concreteAgeExceeded).length;
  const siteWaitingExcess = dispatches.filter(d => 
    d.siteWaitingMinutes && d.siteWaitingMinutes > config.maxSiteWaitingMinutes
  ).length;

  const kpi: DispatchLogisticsKPI = {
    id: generateId(),
    period,
    scheduledOrders,
    batchedOrders,
    dispatchedOrders,
    deliveredOrders,
    delayedOrders,
    cancelledOrders,
    availableMixers,
    totalMixers: mixers.length,
    availablePumps,
    totalPumps: pumps.length,
    totalTrips,
    averageTripsPerMixer: Math.round(averageTripsPerMixer * 10) / 10,
    vehicleUtilization: Math.round(vehicleUtilization * 10) / 10,
    averageLoadingTime: Math.round(averageLoadingTime),
    averageWaitingTime: Math.round(averageWaitingTime),
    averageTransitTime: Math.round(averageTransitTime),
    averageUnloadingTime: Math.round(averageUnloadingTime),
    onTimeDeliveryPercent: Math.round(onTimeDeliveryPercent * 10) / 10,
    orderedQuantity: Math.round(orderedQuantity * 100) / 100,
    producedQuantity: Math.round(producedQuantity * 100) / 100,
    dispatchedQuantity: Math.round(dispatchedQuantity * 100) / 100,
    deliveredQuantity: Math.round(deliveredQuantity * 100) / 100,
    returnedQuantity: Math.round(returnedQuantity * 100) / 100,
    invoicedQuantity: Math.round(invoicedQuantity * 100) / 100,
    transportCostPerM3: Math.round(transportCostPerM3 * 100) / 100,
    totalTransportCost: Math.round(totalTransportCost * 100) / 100,
    deliveryExceptions,
    siteWaitingExcess,
    dataSource: 'integrated_live',
    lastRefreshedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await dispatchLogisticsStore.create(kpi);
  return kpi;
}

export async function getDispatchLogisticsKPI(id: string): Promise<DispatchLogisticsKPI | null> {
  return dispatchLogisticsStore.findById(id);
}

export async function getLatestDispatchLogisticsKPI(period: string): Promise<DispatchLogisticsKPI | null> {
  const all = await dispatchLogisticsStore.findAll();
  const periodKPIs = all.filter(k => k.period === period);
  return periodKPIs.length > 0 ? periodKPIs[periodKPIs.length - 1] : null;
}

// ============================================================================
// Mixer Utilization
// ============================================================================

export async function getMixerUtilization(
  startDate: string,
  endDate: string
): Promise<MixerUtilization[]> {
  const allAssets = await listAssets();
  const mixers = allAssets.filter(a => a.category === 'concrete' && a.subCategory === 'transit_mixer');
  
  const results: MixerUtilization[] = [];

  for (const mixer of mixers) {
    const trips = await listMixerTrips({
      mixerId: mixer.id,
      fromDate: startDate,
      toDate: endDate,
    });

    const totalTrips = trips.length;
    const totalDistance = trips.reduce((sum, t) => sum + (t.tripKilometres || 0), 0);
    const totalHours = trips.reduce((sum, t) => sum + (t.drumHours || 0), 0);
    
    const availableHours = 24 * 30; // 30 days
    const utilizationPercent = availableHours > 0
      ? (totalHours / availableHours) * 100
      : 0;

    results.push({
      mixerId: mixer.id,
      mixerNumber: mixer.assetCode,
      totalTrips,
      totalDistance: Math.round(totalDistance),
      totalHours: Math.round(totalHours * 10) / 10,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
    });
  }

  return results.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
}

// ============================================================================
// Delivery Exceptions
// ============================================================================

export async function getDeliveryExceptions(
  startDate: string,
  endDate: string
): Promise<DeliveryException[]> {
  const dispatches = await listDispatches({
    fromDate: startDate,
    toDate: endDate,
  });

  const exceptions: DeliveryException[] = [];

  for (const dispatch of dispatches) {
    // Check for delays
    if (dispatch.hasDelay) {
      exceptions.push({
        id: generateId(),
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        exceptionType: 'delay',
        severity: 'high',
        description: dispatch.delayReason || 'Delivery delayed',
        createdAt: dispatch.createdAt,
        resolvedAt: dispatch.status === 'completed' ? dispatch.unloadingEndTime : undefined,
      });
    }

    // Check for excessive waiting
    if (dispatch.siteWaitingMinutes && dispatch.siteWaitingMinutes > 60) {
      exceptions.push({
        id: generateId(),
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        exceptionType: 'waiting',
        severity: 'medium',
        description: `Site waiting time: ${dispatch.siteWaitingMinutes} minutes`,
        createdAt: dispatch.createdAt,
      });
    }

    // Check for rejections
    if (dispatch.rejectedQuantity && dispatch.rejectedQuantity > 0) {
      exceptions.push({
        id: generateId(),
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        exceptionType: 'rejection',
        severity: 'high',
        description: dispatch.rejectionReason || 'Concrete rejected at site',
        createdAt: dispatch.createdAt,
      });
    }

    // Check for returns
    if (dispatch.returnedQuantity && dispatch.returnedQuantity > 0) {
      exceptions.push({
        id: generateId(),
        dispatchId: dispatch.id,
        orderId: dispatch.orderId,
        exceptionType: 'return',
        severity: 'medium',
        description: dispatch.returnReason || 'Concrete returned from site',
        createdAt: dispatch.createdAt,
      });
    }
  }

  return exceptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// Quantity Reconciliation
// ============================================================================

export async function getQuantityReconciliation(
  startDate: string,
  endDate: string
): Promise<{
  ordered: number;
  produced: number;
  dispatched: number;
  delivered: number;
  returned: number;
  rejected: number;
  invoiced: number;
  variance: number;
}> {
  const orders = await listRMCOrders({
    fromDate: startDate,
    toDate: endDate,
  });

  const dispatches = await listDispatches({
    fromDate: startDate,
    toDate: endDate,
  });

  const ordered = orders.reduce((sum, o) => sum + o.requiredQuantity, 0);
  const produced = dispatches.reduce((sum, d) => sum + (d.dispatchedQuantity || 0), 0);
  const dispatched = dispatches.filter(d => d.status !== 'cancelled').reduce((sum, d) => sum + (d.dispatchedQuantity || 0), 0);
  const delivered = dispatches.filter(d => d.status === 'completed').reduce((sum, d) => sum + (d.deliveredQuantity || 0), 0);
  const returned = dispatches.reduce((sum, d) => sum + (d.returnedQuantity || 0), 0);
  const rejected = dispatches.reduce((sum, d) => sum + (d.rejectedQuantity || 0), 0);
  const invoiced = delivered - returned - rejected;

  const variance = ordered - invoiced;

  return {
    ordered: Math.round(ordered * 100) / 100,
    produced: Math.round(produced * 100) / 100,
    dispatched: Math.round(dispatched * 100) / 100,
    delivered: Math.round(delivered * 100) / 100,
    returned: Math.round(returned * 100) / 100,
    rejected: Math.round(rejected * 100) / 100,
    invoiced: Math.round(invoiced * 100) / 100,
    variance: Math.round(variance * 100) / 100,
  };
}
