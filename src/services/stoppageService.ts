/**
 * Part 13 — Stoppage Service
 */

import { storage } from './storage';
import { StoppageLog, StoppageReason } from './rmcPlantTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getPlant } from './rmcPlantService';

const stoppagesStore = storage.getAdapter<StoppageLog>('stoppage_logs');

// ============================================================================
// Stoppage CRUD
// ============================================================================

export async function createStoppage(
  data: Omit<StoppageLog, 'id' | 'createdAt' | 'updatedAt' | 'durationMinutes' | 'reportedAt'>
): Promise<StoppageLog> {
  const plant = await getPlant(data.plantId);
  if (!plant) {
    throw new Error(`Plant ${data.plantId} not found`);
  }

  const stoppage: StoppageLog = {
    ...data,
    id: generateId(),
    reportedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await stoppagesStore.create(stoppage);

  await recordAudit({
    entityType: 'StoppageLog',
    entityId: stoppage.id,
    action: 'create',
    before: null,
    after: stoppage as any,
    actorId: data.reportedBy,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: `Stoppage reported: ${data.reason}`,
  });

  return stoppage;
}

export async function endStoppage(
  id: string,
  endTime: string,
  userId: string,
  productionLossM3?: number
): Promise<StoppageLog> {
  const stoppage = await stoppagesStore.findById(id);
  if (!stoppage) {
    throw new Error(`Stoppage ${id} not found`);
  }

  if (stoppage.endTime) {
    throw new Error(`Stoppage ${id} already ended`);
  }

  // Calculate duration
  const startTime = new Date(stoppage.startTime).getTime();
  const endTimestamp = new Date(endTime).getTime();
  const durationMinutes = (endTimestamp - startTime) / (1000 * 60);

  const updated = await stoppagesStore.update(id, {
    endTime,
    durationMinutes: Math.round(durationMinutes),
    productionLossM3,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'StoppageLog',
    entityId: id,
    action: 'update',
    before: { endTime: null },
    after: { endTime, durationMinutes, productionLossM3 },
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: 'Stoppage ended',
  });

  return updated;
}

export async function getStoppage(id: string): Promise<StoppageLog | null> {
  return stoppagesStore.findById(id);
}

export async function listStoppages(filters?: {
  plantId?: string;
  reason?: StoppageReason;
  fromDate?: string;
  toDate?: string;
  activeOnly?: boolean;
}): Promise<StoppageLog[]> {
  let stoppages = await stoppagesStore.findAll();

  if (filters?.plantId) {
    stoppages = stoppages.filter(s => s.plantId === filters.plantId);
  }
  if (filters?.reason) {
    stoppages = stoppages.filter(s => s.reason === filters.reason);
  }
  if (filters?.fromDate) {
    stoppages = stoppages.filter(s => s.startTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    stoppages = stoppages.filter(s => s.startTime <= filters.toDate!);
  }
  if (filters?.activeOnly) {
    stoppages = stoppages.filter(s => !s.endTime);
  }

  return stoppages.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// ============================================================================
// Downtime Statistics
// ============================================================================

export async function getDowntimeStatistics(
  plantId: string,
  fromDate: string,
  toDate: string
): Promise<{
  totalStoppages: number;
  totalDowntimeMinutes: number;
  totalProductionLossM3: number;
  averageDowntimeMinutes: number;
  downtimeByReason: Record<StoppageReason, { count: number; minutes: number }>;
  longestStoppage: StoppageLog | null;
}> {
  const stoppages = await listStoppages({ plantId, fromDate, toDate });

  const completedStoppages = stoppages.filter(s => s.endTime);
  const totalDowntimeMinutes = completedStoppages.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalProductionLossM3 = completedStoppages.reduce((sum, s) => sum + (s.productionLossM3 || 0), 0);
  const averageDowntimeMinutes = completedStoppages.length > 0 
    ? totalDowntimeMinutes / completedStoppages.length 
    : 0;

  // Group by reason
  const downtimeByReason: Record<StoppageReason, { count: number; minutes: number }> = {
    power_failure: { count: 0, minutes: 0 },
    breakdown: { count: 0, minutes: 0 },
    material_shortage: { count: 0, minutes: 0 },
    no_orders: { count: 0, minutes: 0 },
    weather: { count: 0, minutes: 0 },
    qc_hold: { count: 0, minutes: 0 },
    maintenance: { count: 0, minutes: 0 },
    operator_unavailable: { count: 0, minutes: 0 },
    other: { count: 0, minutes: 0 },
  };

  for (const stoppage of completedStoppages) {
    downtimeByReason[stoppage.reason].count++;
    downtimeByReason[stoppage.reason].minutes += stoppage.durationMinutes || 0;
  }

  // Find longest stoppage
  const longestStoppage = completedStoppages.length > 0
    ? completedStoppages.reduce((max, s) => 
        (s.durationMinutes || 0) > (max.durationMinutes || 0) ? s : max
      )
    : null;

  return {
    totalStoppages: stoppages.length,
    totalDowntimeMinutes: Math.round(totalDowntimeMinutes),
    totalProductionLossM3: Math.round(totalProductionLossM3 * 100) / 100,
    averageDowntimeMinutes: Math.round(averageDowntimeMinutes),
    downtimeByReason,
    longestStoppage,
  };
}

export async function getActiveStoppages(plantId?: string): Promise<StoppageLog[]> {
  return listStoppages({ plantId, activeOnly: true });
}
