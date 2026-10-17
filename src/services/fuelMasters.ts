/**
 * Part 09 — Fuel Masters Service
 * 
 * Manages fuel types, storage points, and measuring instruments
 */

import { storage } from './storage';
import { FuelType, StoragePoint, MeasuringInstrument, StrappingChart } from './fuelTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const fuelTypesStore = storage.getAdapter<FuelType>('fuel_types');
const storagePointsStore = storage.getAdapter<StoragePoint>('storage_points');
const instrumentsStore = storage.getAdapter<MeasuringInstrument>('measuring_instruments');
const strappingChartsStore = storage.getAdapter<StrappingChart>('strapping_charts');

// ============================================================================
// Fuel Types
// ============================================================================

export async function createFuelType(data: Omit<FuelType, 'id' | 'createdAt' | 'updatedAt'>): Promise<FuelType> {
  const fuelType: FuelType = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fuelTypesStore.create(fuelType);

  await recordAudit({
    entityType: 'FuelType',
    entityId: fuelType.id,
    action: 'create',
    before: null,
    after: fuelType as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel type created',
  });

  return fuelType;
}

export async function getFuelType(id: string): Promise<FuelType | null> {
  return fuelTypesStore.findById(id);
}

export async function getFuelTypeByCode(code: string): Promise<FuelType | null> {
  const all = await fuelTypesStore.findAll();
  return all.find(ft => ft.code === code) || null;
}

export async function listFuelTypes(): Promise<FuelType[]> {
  return fuelTypesStore.findAll();
}

export async function updateFuelType(id: string, updates: Partial<FuelType>): Promise<FuelType> {
  const fuelType = await fuelTypesStore.findById(id);
  if (!fuelType) {
    throw new Error(`Fuel type ${id} not found`);
  }

  const updated = await fuelTypesStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelType',
    entityId: id,
    action: 'update',
    before: fuelType as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel type updated',
  });

  return updated;
}

// ============================================================================
// Storage Points
// ============================================================================

export async function createStoragePoint(data: Omit<StoragePoint, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoragePoint> {
  const storagePoint: StoragePoint = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await storagePointsStore.create(storagePoint);

  await recordAudit({
    entityType: 'StoragePoint',
    entityId: storagePoint.id,
    action: 'create',
    before: null,
    after: storagePoint as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Storage point created',
  });

  return storagePoint;
}

export async function getStoragePoint(id: string): Promise<StoragePoint | null> {
  return storagePointsStore.findById(id);
}

export async function getStoragePointByCode(code: string): Promise<StoragePoint | null> {
  const all = await storagePointsStore.findAll();
  return all.find(sp => sp.code === code) || null;
}

export async function listStoragePoints(filters?: {
  type?: string;
  fuelTypeId?: string;
  projectId?: string;
  siteId?: string;
}): Promise<StoragePoint[]> {
  let storagePoints = await storagePointsStore.findAll();

  if (filters?.type) {
    storagePoints = storagePoints.filter(sp => sp.type === filters.type);
  }
  if (filters?.fuelTypeId) {
    storagePoints = storagePoints.filter(sp => sp.fuelTypeId === filters.fuelTypeId);
  }
  if (filters?.projectId) {
    storagePoints = storagePoints.filter(sp => sp.projectId === filters.projectId);
  }
  if (filters?.siteId) {
    storagePoints = storagePoints.filter(sp => sp.siteId === filters.siteId);
  }

  return storagePoints;
}

export async function updateStoragePoint(id: string, updates: Partial<StoragePoint>): Promise<StoragePoint> {
  const storagePoint = await storagePointsStore.findById(id);
  if (!storagePoint) {
    throw new Error(`Storage point ${id} not found`);
  }

  const updated = await storagePointsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'StoragePoint',
    entityId: id,
    action: 'update',
    before: storagePoint as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Storage point updated',
  });

  return updated;
}

// ============================================================================
// Measuring Instruments
// ============================================================================

export async function createMeasuringInstrument(data: Omit<MeasuringInstrument, 'id' | 'createdAt' | 'updatedAt'>): Promise<MeasuringInstrument> {
  const instrument: MeasuringInstrument = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await instrumentsStore.create(instrument);

  await recordAudit({
    entityType: 'MeasuringInstrument',
    entityId: instrument.id,
    action: 'create',
    before: null,
    after: instrument as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Measuring instrument created',
  });

  return instrument;
}

export async function getMeasuringInstrument(id: string): Promise<MeasuringInstrument | null> {
  return instrumentsStore.findById(id);
}

export async function getMeasuringInstrumentBySerial(serialNumber: string): Promise<MeasuringInstrument | null> {
  const all = await instrumentsStore.findAll();
  return all.find(inst => inst.serialNumber === serialNumber) || null;
}

export async function listMeasuringInstruments(filters?: {
  type?: string;
  storagePointId?: string;
  assetId?: string;
}): Promise<MeasuringInstrument[]> {
  let instruments = await instrumentsStore.findAll();

  if (filters?.type) {
    instruments = instruments.filter(inst => inst.type === filters.type);
  }
  if (filters?.storagePointId) {
    instruments = instruments.filter(inst => inst.storagePointId === filters.storagePointId);
  }
  if (filters?.assetId) {
    instruments = instruments.filter(inst => inst.assetId === filters.assetId);
  }

  return instruments;
}

export async function updateMeasuringInstrument(id: string, updates: Partial<MeasuringInstrument>): Promise<MeasuringInstrument> {
  const instrument = await instrumentsStore.findById(id);
  if (!instrument) {
    throw new Error(`Measuring instrument ${id} not found`);
  }

  const updated = await instrumentsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'MeasuringInstrument',
    entityId: id,
    action: 'update',
    before: instrument as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Measuring instrument updated',
  });

  return updated;
}

// ============================================================================
// Strapping Charts
// ============================================================================

export async function createStrappingChart(data: Omit<StrappingChart, 'id' | 'createdAt' | 'updatedAt'>): Promise<StrappingChart> {
  const chart: StrappingChart = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await strappingChartsStore.create(chart);

  await recordAudit({
    entityType: 'StrappingChart',
    entityId: chart.id,
    action: 'create',
    before: null,
    after: chart as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Strapping chart created',
  });

  return chart;
}

export async function getStrappingChart(id: string): Promise<StrappingChart | null> {
  return strappingChartsStore.findById(id);
}

export async function getStrappingChartByInstrument(instrumentId: string): Promise<StrappingChart | null> {
  const all = await strappingChartsStore.findAll();
  return all.find(chart => chart.instrumentId === instrumentId) || null;
}

/**
 * Convert dip reading to volume using strapping chart
 */
export function dipToVolume(dip: number, chart: StrappingChart): number {
  const entries = chart.entries.sort((a, b) => a.dipReading - b.dipReading);

  // Find the two entries that bracket the dip reading
  let lowerEntry = entries[0];
  let upperEntry = entries[entries.length - 1];

  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].dipReading <= dip && entries[i + 1].dipReading >= dip) {
      lowerEntry = entries[i];
      upperEntry = entries[i + 1];
      break;
    }
  }

  // Linear interpolation
  if (lowerEntry.dipReading === upperEntry.dipReading) {
    return lowerEntry.volume;
  }

  const ratio = (dip - lowerEntry.dipReading) / (upperEntry.dipReading - lowerEntry.dipReading);
  return lowerEntry.volume + ratio * (upperEntry.volume - lowerEntry.volume);
}

/**
 * Convert volume to dip reading using strapping chart (inverse operation)
 */
export function volumeToDip(volume: number, chart: StrappingChart): number {
  const entries = chart.entries.sort((a, b) => a.volume - b.volume);

  // Find the two entries that bracket the volume
  let lowerEntry = entries[0];
  let upperEntry = entries[entries.length - 1];

  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].volume <= volume && entries[i + 1].volume >= volume) {
      lowerEntry = entries[i];
      upperEntry = entries[i + 1];
      break;
    }
  }

  // Linear interpolation
  if (lowerEntry.volume === upperEntry.volume) {
    return lowerEntry.dipReading;
  }

  const ratio = (volume - lowerEntry.volume) / (upperEntry.volume - lowerEntry.volume);
  return lowerEntry.dipReading + ratio * (upperEntry.dipReading - lowerEntry.dipReading);
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultFuelTypes(): Promise<void> {
  const existing = await fuelTypesStore.findAll();
  if (existing.length > 0) return;

  const fuelTypes = [
    {
      code: 'HSD',
      name: 'High Speed Diesel',
      description: 'Standard diesel fuel for construction equipment',
      density: 0.832, // kg/litre at 15°C
      unit: 'litre' as const,
      isActive: true,
    },
    {
      code: 'PETROL',
      name: 'Petrol',
      description: 'Petrol for light vehicles and generators',
      density: 0.745,
      unit: 'litre' as const,
      isActive: true,
    },
    {
      code: 'CNG',
      name: 'Compressed Natural Gas',
      description: 'CNG for dual-fuel vehicles',
      density: 0.18, // kg/litre (approximate)
      unit: 'litre' as const,
      isActive: true,
    },
  ];

  for (const ft of fuelTypes) {
    await createFuelType(ft);
  }
}
