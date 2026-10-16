/**
 * Part 15 — Silo Level Service
 */

import { storage } from './storage';
import { SiloLevelReading } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { calculateStockBalance } from './stockMovementService';

const siloLevelsStore = storage.getAdapter<SiloLevelReading>('silo_level_readings');

// ============================================================================
// Silo Level Reading CRUD
// ============================================================================

export async function createSiloLevelReading(
  data: Omit<SiloLevelReading, 'id' | 'bookStock' | 'variance' | 'variancePercent' | 'createdAt'>
): Promise<SiloLevelReading> {
  // Calculate book stock from movements
  const balance = await calculateStockBalance(
    'material-id', // Would need to get from storage location
    data.storageLocationId,
    data.readingDate
  );
  
  const bookStock = balance.closingBalance;
  const variance = data.calculatedStock - bookStock;
  const variancePercent = bookStock > 0 ? (variance / bookStock) * 100 : 0;
  
  const reading: SiloLevelReading = {
    ...data,
    id: generateId(),
    bookStock,
    variance,
    variancePercent: Math.round(variancePercent * 100) / 100,
    createdAt: new Date().toISOString(),
  };
  
  await siloLevelsStore.create(reading);
  
  await recordAudit({
    entityType: 'SiloLevelReading',
    entityId: reading.id,
    action: 'create',
    before: null,
    after: reading as any,
    actorId: data.readBy,
    actorRole: 'operator',
    requestId: generateId(),
    reason: `Silo level reading created for ${data.storageLocationName}`,
  });
  
  // Check for variance alert
  if (Math.abs(variancePercent) > 5) { // 5% threshold
    await raiseAlert({
      ruleCode: 'SILO_STOCK_VARIANCE',
      severity: variancePercent > 10 ? 'high' : 'warning',
      title: `Silo Stock Variance Detected`,
      description: `Silo ${data.storageLocationName} has ${variancePercent > 0 ? 'excess' : 'shortage'} of ${Math.abs(variance).toFixed(2)} ${data.unit} (${variancePercent.toFixed(2)}%)`,
      module: 'Material Inventory',
      entityType: 'SiloLevelReading',
      entityId: reading.id,
      responsibleRole: 'plant_manager',
      recommendedAction: 'Investigate variance - check for measurement errors, theft, or unrecorded movements',
      dueInHours: 24,
      requestId: generateId(),
    });
  }
  
  return reading;
}

export async function getSiloLevelReading(id: string): Promise<SiloLevelReading | null> {
  return siloLevelsStore.findById(id);
}

export async function listSiloLevelReadings(filters?: {
  storageLocationId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<SiloLevelReading[]> {
  let readings = await siloLevelsStore.findAll();
  
  if (filters?.storageLocationId) {
    readings = readings.filter(r => r.storageLocationId === filters.storageLocationId);
  }
  if (filters?.fromDate) {
    readings = readings.filter(r => r.readingDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    readings = readings.filter(r => r.readingDate <= filters.toDate!);
  }
  
  return readings.sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime());
}

export async function getLatestSiloLevel(storageLocationId: string): Promise<SiloLevelReading | null> {
  const readings = await listSiloLevelReadings({ storageLocationId });
  return readings[0] || null;
}

// ============================================================================
// Silo Level Statistics
// ============================================================================

export async function getSiloLevelStatistics(filters?: {
  storageLocationId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalReadings: number;
  averageVariancePercent: number;
  maxVariancePercent: number;
  minVariancePercent: number;
  readingsWithVariance: number;
}> {
  let readings = await siloLevelsStore.findAll();
  
  if (filters?.storageLocationId) {
    readings = readings.filter(r => r.storageLocationId === filters.storageLocationId);
  }
  if (filters?.fromDate) {
    readings = readings.filter(r => r.readingDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    readings = readings.filter(r => r.readingDate <= filters.toDate!);
  }
  
  const variances = readings.map(r => r.variancePercent);
  const averageVariance = variances.length > 0 
    ? variances.reduce((sum, v) => sum + v, 0) / variances.length 
    : 0;
  
  return {
    totalReadings: readings.length,
    averageVariancePercent: Math.round(averageVariance * 100) / 100,
    maxVariancePercent: variances.length > 0 ? Math.max(...variances) : 0,
    minVariancePercent: variances.length > 0 ? Math.min(...variances) : 0,
    readingsWithVariance: readings.filter(r => Math.abs(r.variancePercent) > 1).length,
  };
}
