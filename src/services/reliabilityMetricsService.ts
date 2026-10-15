/**
 * Part 11 — Reliability Metrics Service
 */

import { storage } from './storage';
import { ReliabilityMetrics } from './maintenanceTypes';
import { listWorkOrders } from './workOrderService';
import { listLogbooks } from './logbookService';
import { getMaintenanceConfiguration } from './pmPlanService';
import { generateId } from './utils';

const metricsStore = storage.getAdapter<ReliabilityMetrics>('reliability_metrics');

// ============================================================================
// Reliability Metrics Calculation
// ============================================================================

export async function calculateReliabilityMetrics(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<ReliabilityMetrics> {
  const config = await getMaintenanceConfiguration();

  // Get all work orders for the asset in the period
  const workOrders = await listWorkOrders({
    assetId,
    fromDate: startDate,
    toDate: endDate,
  });

  // Get all approved logbooks for the asset in the period
  const logbooks = await listLogbooks({
    assetId,
    status: 'approved',
  });

  // Filter logbooks by date range
  const periodLogbooks = logbooks.filter(l => l.date >= startDate && l.date <= endDate);

  // Calculate total operating hours
  const totalOperatingHours = periodLogbooks.reduce((sum, l) => {
    return sum + (l.calculatedOperatingHours || 0);
  }, 0);

  // Calculate breakdown count and downtime
  const breakdownWorkOrders = workOrders.filter(wo => wo.type === 'breakdown');
  const breakdownCount = breakdownWorkOrders.length;

  // Calculate total repair hours (downtime)
  const totalRepairHours = breakdownWorkOrders.reduce((sum, wo) => {
    if (wo.downtimeStart && wo.downtimeEnd) {
      const start = new Date(wo.downtimeStart).getTime();
      const end = new Date(wo.downtimeEnd).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);

  const repairCount = breakdownWorkOrders.filter(wo => wo.downtimeStart && wo.downtimeEnd).length;

  // Calculate scheduled hours (total hours in the period)
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  const scheduledHours = periodDays * 24; // Assuming 24/7 operation

  // Calculate downtime hours (all work orders with downtime)
  const downtimeHours = workOrders.reduce((sum, wo) => {
    if (wo.downtimeStart && wo.downtimeEnd) {
      const woStart = new Date(wo.downtimeStart).getTime();
      const woEnd = new Date(wo.downtimeEnd).getTime();
      const hours = (woEnd - woStart) / (1000 * 60 * 60);
      return sum + hours;
    }
    return sum;
  }, 0);

  // Calculate MTBF
  let mtbf: number | null = null;
  let mtbfConfidence: 'high' | 'medium' | 'low' | 'insufficient_data' = 'insufficient_data';

  if (breakdownCount >= config.minimumEventsForMTBF && totalOperatingHours >= config.minimumOperatingHoursForMetrics) {
    mtbf = totalOperatingHours / breakdownCount;
    
    if (breakdownCount >= 10) {
      mtbfConfidence = 'high';
    } else if (breakdownCount >= 5) {
      mtbfConfidence = 'medium';
    } else {
      mtbfConfidence = 'low';
    }
  }

  // Calculate MTTR
  let mttr: number | null = null;
  let mttrConfidence: 'high' | 'medium' | 'low' | 'insufficient_data' = 'insufficient_data';

  if (repairCount >= config.minimumEventsForMTTR) {
    mttr = totalRepairHours / repairCount;
    
    if (repairCount >= 10) {
      mttrConfidence = 'high';
    } else if (repairCount >= 5) {
      mttrConfidence = 'medium';
    } else {
      mttrConfidence = 'low';
    }
  }

  // Calculate Availability
  let availability: number | null = null;
  let availabilityConfidence: 'high' | 'medium' | 'low' | 'insufficient_data' = 'insufficient_data';

  if (scheduledHours > 0 && totalOperatingHours >= config.minimumOperatingHoursForMetrics) {
    availability = ((scheduledHours - downtimeHours) / scheduledHours) * 100;
    
    if (periodDays >= 90) {
      availabilityConfidence = 'high';
    } else if (periodDays >= 30) {
      availabilityConfidence = 'medium';
    } else {
      availabilityConfidence = 'low';
    }
  }

  // Calculate PM compliance
  const pmWorkOrders = workOrders.filter(wo => wo.type === 'pm');
  const completedPMs = pmWorkOrders.filter(wo => wo.status === 'closed').length;
  const totalPMs = pmWorkOrders.length;
  const preventiveMaintenanceCompliance = totalPMs > 0 
    ? (completedPMs / totalPMs) * 100 
    : undefined;

  const metrics: ReliabilityMetrics = {
    id: generateId(),
    assetId,
    period: {
      startDate,
      endDate,
    },
    totalOperatingHours: Math.round(totalOperatingHours * 10) / 10,
    breakdownCount,
    mtbf: mtbf !== null ? Math.round(mtbf * 10) / 10 : null,
    mtbfConfidence,
    totalRepairHours: Math.round(totalRepairHours * 10) / 10,
    repairCount,
    mttr: mttr !== null ? Math.round(mttr * 10) / 10 : null,
    mttrConfidence,
    scheduledHours: Math.round(scheduledHours * 10) / 10,
    downtimeHours: Math.round(downtimeHours * 10) / 10,
    availability: availability !== null ? Math.round(availability * 10) / 10 : null,
    availabilityConfidence,
    preventiveMaintenanceCompliance: preventiveMaintenanceCompliance !== undefined
      ? Math.round(preventiveMaintenanceCompliance * 10) / 10
      : undefined,
    calculatedAt: new Date().toISOString(),
    minimumEventsRequired: config.minimumEventsForMTBF,
  };

  // Store metrics
  await metricsStore.create(metrics);

  return metrics;
}

export async function getReliabilityMetrics(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<ReliabilityMetrics | null> {
  const allMetrics = await metricsStore.findAll();
  
  return allMetrics.find(m => 
    m.assetId === assetId &&
    m.period.startDate === startDate &&
    m.period.endDate === endDate
  ) || null;
}

export async function listReliabilityMetrics(filters?: {
  assetId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ReliabilityMetrics[]> {
  let metrics = await metricsStore.findAll();

  if (filters?.assetId) {
    metrics = metrics.filter(m => m.assetId === filters.assetId);
  }
  if (filters?.startDate) {
    metrics = metrics.filter(m => m.period.startDate >= filters.startDate!);
  }
  if (filters?.endDate) {
    metrics = metrics.filter(m => m.period.endDate <= filters.endDate!);
  }

  return metrics.sort((a, b) => 
    new Date(b.period.endDate).getTime() - new Date(a.period.endDate).getTime()
  );
}

// ============================================================================
// Fleet-Wide Reliability Metrics
// ============================================================================

export async function calculateFleetReliabilityMetrics(
  startDate: string,
  endDate: string
): Promise<{
  totalAssets: number;
  averageMTBF: number | null;
  averageMTTR: number | null;
  averageAvailability: number | null;
  totalBreakdowns: number;
  totalDowntimeHours: number;
  totalOperatingHours: number;
}> {
  const metrics = await listReliabilityMetrics({ startDate, endDate });

  const totalAssets = metrics.length;
  
  const mtbfValues = metrics.filter(m => m.mtbf !== null).map(m => m.mtbf!);
  const averageMTBF = mtbfValues.length > 0
    ? mtbfValues.reduce((sum, v) => sum + v, 0) / mtbfValues.length
    : null;

  const mttrValues = metrics.filter(m => m.mttr !== null).map(m => m.mttr!);
  const averageMTTR = mttrValues.length > 0
    ? mttrValues.reduce((sum, v) => sum + v, 0) / mttrValues.length
    : null;

  const availabilityValues = metrics.filter(m => m.availability !== null).map(m => m.availability!);
  const averageAvailability = availabilityValues.length > 0
    ? availabilityValues.reduce((sum, v) => sum + v, 0) / availabilityValues.length
    : null;

  const totalBreakdowns = metrics.reduce((sum, m) => sum + m.breakdownCount, 0);
  const totalDowntimeHours = metrics.reduce((sum, m) => sum + m.downtimeHours, 0);
  const totalOperatingHours = metrics.reduce((sum, m) => sum + m.totalOperatingHours, 0);

  return {
    totalAssets,
    averageMTBF: averageMTBF !== null ? Math.round(averageMTBF * 10) / 10 : null,
    averageMTTR: averageMTTR !== null ? Math.round(averageMTTR * 10) / 10 : null,
    averageAvailability: averageAvailability !== null ? Math.round(averageAvailability * 10) / 10 : null,
    totalBreakdowns,
    totalDowntimeHours: Math.round(totalDowntimeHours * 10) / 10,
    totalOperatingHours: Math.round(totalOperatingHours * 10) / 10,
  };
}
