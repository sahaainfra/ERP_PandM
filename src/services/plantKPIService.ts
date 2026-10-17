/**
 * Part 13 — Plant KPI Service
 */

import { storage } from './storage';
import { PlantKPIs, StoppageReason } from './rmcPlantTypes';
import { getPlant } from './rmcPlantService';
import { listBatches, getBatchStatistics } from './batchService';
import { listStoppages, getDowntimeStatistics } from './stoppageService';
import { generateId } from './utils';

const kpisStore = storage.getAdapter<PlantKPIs>('plant_kpis');

// ============================================================================
// KPI Calculation
// ============================================================================

export async function calculatePlantKPIs(
  plantId: string,
  startDate: string,
  endDate: string
): Promise<PlantKPIs> {
  const plant = await getPlant(plantId);
  if (!plant) {
    throw new Error(`Plant ${plantId} not found`);
  }

  // Calculate period
  const start = new Date(startDate);
  const end = new Date(endDate);
  const periodDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

  // Get batch statistics
  const batchStats = await getBatchStatistics(plantId, startDate, endDate);

  // Get downtime statistics
  const downtimeStats = await getDowntimeStatistics(plantId, startDate, endDate);

  // Calculate available hours (total hours in period minus downtime)
  const totalHoursInPeriod = periodDays * 24;
  const downtimeHours = downtimeStats.totalDowntimeMinutes / 60;
  const availableHours = totalHoursInPeriod - downtimeHours;

  // Calculate operating hours (time when plant was actually producing)
  const batches = await listBatches({ plantId, fromDate: startDate, toDate: endDate });
  const operatingHours = calculateOperatingHours(batches);

  // Calculate production metrics
  const plannedProduction = plant.dailyTarget ? plant.dailyTarget * periodDays : 0;
  const actualProduction = batchStats.totalVolume;
  const productionVariance = actualProduction - plannedProduction;
  const productionVariancePercent = plannedProduction > 0 
    ? (productionVariance / plannedProduction) * 100 
    : 0;

  // Calculate efficiency metrics
  const batchesPerHour = operatingHours > 0 ? batchStats.totalBatches / operatingHours : 0;
  const plantUtilization = availableHours > 0 
    ? (operatingHours / availableHours) * 100 
    : 0;
  const productionEfficiency = plannedProduction > 0 
    ? (actualProduction / plannedProduction) * 100 
    : 0;

  // Calculate quality metrics
  const rejectedBatchesPercent = batchStats.totalBatches > 0 
    ? (batchStats.rejectedBatches / batchStats.totalBatches) * 100 
    : 0;

  // Calculate wastage (difference between target and actual volume)
  const wastageM3 = batches.reduce((sum, b) => {
    const batchWastage = b.targetVolume - b.actualVolume;
    return sum + (batchWastage > 0 ? batchWastage : 0);
  }, 0);

  // Group downtime by reason
  const downtimeByReason: Record<StoppageReason, number> = {
    power_failure: 0,
    breakdown: 0,
    material_shortage: 0,
    no_orders: 0,
    weather: 0,
    qc_hold: 0,
    maintenance: 0,
    operator_unavailable: 0,
    other: 0,
  };

  for (const [reason, data] of Object.entries(downtimeStats.downtimeByReason)) {
    downtimeByReason[reason as StoppageReason] = data.minutes;
  }

  const kpis: PlantKPIs = {
    id: generateId(),
    plantId,
    period: {
      startDate,
      endDate,
    },
    plannedProduction: Math.round(plannedProduction * 100) / 100,
    actualProduction: Math.round(actualProduction * 100) / 100,
    productionVariance: Math.round(productionVariance * 100) / 100,
    productionVariancePercent: Math.round(productionVariancePercent * 10) / 10,
    totalBatches: batchStats.totalBatches,
    averageBatchCycleTime: batchStats.averageCycleTime,
    batchesPerHour: Math.round(batchesPerHour * 10) / 10,
    availableHours: Math.round(availableHours * 10) / 10,
    operatingHours: Math.round(operatingHours * 10) / 10,
    plantUtilization: Math.round(plantUtilization * 10) / 10,
    productionEfficiency: Math.round(productionEfficiency * 10) / 10,
    rejectedBatches: batchStats.rejectedBatches,
    rejectedBatchesPercent: Math.round(rejectedBatchesPercent * 10) / 10,
    wastageM3: Math.round(wastageM3 * 100) / 100,
    totalDowntimeMinutes: downtimeStats.totalDowntimeMinutes,
    downtimeByReason,
    calculatedAt: new Date().toISOString(),
  };

  // Store KPIs
  await kpisStore.create(kpis);

  return kpis;
}

function calculateOperatingHours(batches: any[]): number {
  if (batches.length === 0) return 0;

  // Sort batches by start time
  const sortedBatches = batches
    .filter(b => b.batchStartTime && b.batchEndTime)
    .sort((a, b) => new Date(a.batchStartTime).getTime() - new Date(b.batchStartTime).getTime());

  if (sortedBatches.length === 0) return 0;

  // Merge overlapping time periods
  const periods: Array<{ start: number; end: number }> = [];
  
  for (const batch of sortedBatches) {
    const start = new Date(batch.batchStartTime).getTime();
    const end = new Date(batch.batchEndTime).getTime();

    if (periods.length === 0) {
      periods.push({ start, end });
    } else {
      const lastPeriod = periods[periods.length - 1];
      if (start <= lastPeriod.end) {
        // Overlapping, extend the period
        lastPeriod.end = Math.max(lastPeriod.end, end);
      } else {
        // Non-overlapping, add new period
        periods.push({ start, end });
      }
    }
  }

  // Calculate total operating time
  const totalMs = periods.reduce((sum, p) => sum + (p.end - p.start), 0);
  return totalMs / (1000 * 60 * 60); // Convert to hours
}

// ============================================================================
// KPI Retrieval
// ============================================================================

export async function getPlantKPIs(
  plantId: string,
  startDate: string,
  endDate: string
): Promise<PlantKPIs | null> {
  const all = await kpisStore.findAll();
  return all.find(k => 
    k.plantId === plantId &&
    k.period.startDate === startDate &&
    k.period.endDate === endDate
  ) || null;
}

export async function listPlantKPIs(filters?: {
  plantId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PlantKPIs[]> {
  let kpis = await kpisStore.findAll();

  if (filters?.plantId) {
    kpis = kpis.filter(k => k.plantId === filters.plantId);
  }
  if (filters?.fromDate) {
    kpis = kpis.filter(k => k.period.startDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    kpis = kpis.filter(k => k.period.endDate <= filters.toDate!);
  }

  return kpis.sort((a, b) => new Date(b.period.endDate).getTime() - new Date(a.period.endDate).getTime());
}

// ============================================================================
// KPI Comparison
// ============================================================================

export async function comparePlantKPIs(
  plantId: string,
  period1: { startDate: string; endDate: string },
  period2: { startDate: string; endDate: string }
): Promise<{
  period1: PlantKPIs | null;
  period2: PlantKPIs | null;
  changes: {
    production: number;
    utilization: number;
    efficiency: number;
    batchesPerHour: number;
    rejectedBatchesPercent: number;
  };
}> {
  const kpis1 = await getPlantKPIs(plantId, period1.startDate, period1.endDate);
  const kpis2 = await getPlantKPIs(plantId, period2.startDate, period2.endDate);

  const changes = {
    production: 0,
    utilization: 0,
    efficiency: 0,
    batchesPerHour: 0,
    rejectedBatchesPercent: 0,
  };

  if (kpis1 && kpis2) {
    changes.production = kpis2.actualProduction - kpis1.actualProduction;
    changes.utilization = kpis2.plantUtilization - kpis1.plantUtilization;
    changes.efficiency = kpis2.productionEfficiency - kpis1.productionEfficiency;
    changes.batchesPerHour = kpis2.batchesPerHour - kpis1.batchesPerHour;
    changes.rejectedBatchesPercent = kpis2.rejectedBatchesPercent - kpis1.rejectedBatchesPercent;
  }

  return {
    period1: kpis1,
    period2: kpis2,
    changes: {
      production: Math.round(changes.production * 100) / 100,
      utilization: Math.round(changes.utilization * 10) / 10,
      efficiency: Math.round(changes.efficiency * 10) / 10,
      batchesPerHour: Math.round(changes.batchesPerHour * 10) / 10,
      rejectedBatchesPercent: Math.round(changes.rejectedBatchesPercent * 10) / 10,
    },
  };
}
