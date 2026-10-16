/**
 * Part 13 — RMC Plant Service
 */

import { storage } from './storage';
import { RMCPlant, PlantShift, PlantEquipment, PlantOperatingStatus } from './rmcPlantTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getAsset, updateAsset } from './assets';

const plantsStore = storage.getAdapter<RMCPlant>('rmc_plants');
const equipmentStore = storage.getAdapter<PlantEquipment>('plant_equipment');
const shiftsStore = storage.getAdapter<PlantShift>('plant_shifts');

// ============================================================================
// Plant CRUD
// ============================================================================

export async function createPlant(
  data: Omit<RMCPlant, 'id' | 'createdAt' | 'updatedAt' | 'shifts' | 'approvedSupplierIds'>
): Promise<RMCPlant> {
  const plant: RMCPlant = {
    ...data,
    id: generateId(),
    shifts: [],
    approvedSupplierIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await plantsStore.create(plant);

  await recordAudit({
    entityType: 'RMCPlant',
    entityId: plant.id,
    action: 'create',
    before: null,
    after: plant as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'RMC plant created',
  });

  return plant;
}

export async function getPlant(id: string): Promise<RMCPlant | null> {
  return plantsStore.findById(id);
}

export async function getPlantByCode(plantCode: string): Promise<RMCPlant | null> {
  const all = await plantsStore.findAll();
  return all.find(p => p.plantCode === plantCode) || null;
}

export async function listPlants(filters?: {
  companyId?: string;
  type?: string;
  operatingStatus?: PlantOperatingStatus;
  isActive?: boolean;
}): Promise<RMCPlant[]> {
  let plants = await plantsStore.findAll();

  if (filters?.companyId) {
    plants = plants.filter(p => p.companyId === filters.companyId);
  }
  if (filters?.type) {
    plants = plants.filter(p => p.type === filters.type);
  }
  if (filters?.operatingStatus) {
    plants = plants.filter(p => p.operatingStatus === filters.operatingStatus);
  }
  if (filters?.isActive !== undefined) {
    plants = plants.filter(p => p.isActive === filters.isActive);
  }

  return plants;
}

export async function updatePlant(
  id: string,
  updates: Partial<RMCPlant>,
  userId: string
): Promise<RMCPlant> {
  const plant = await plantsStore.findById(id);
  if (!plant) {
    throw new Error(`Plant ${id} not found`);
  }

  const updated = await plantsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'RMCPlant',
    entityId: id,
    action: 'update',
    before: plant as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: 'Plant updated',
  });

  return updated;
}

export async function updatePlantOperatingStatus(
  id: string,
  status: PlantOperatingStatus,
  userId: string,
  reason?: string
): Promise<RMCPlant> {
  const plant = await plantsStore.findById(id);
  if (!plant) {
    throw new Error(`Plant ${id} not found`);
  }

  const updated = await plantsStore.update(id, {
    operatingStatus: status,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'RMCPlant',
    entityId: id,
    action: 'update',
    before: { operatingStatus: plant.operatingStatus },
    after: { operatingStatus: status, reason },
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: reason || `Plant status changed to ${status}`,
  });

  return updated;
}

// ============================================================================
// Plant Shifts
// ============================================================================

export async function addPlantShift(
  plantId: string,
  data: Omit<PlantShift, 'id' | 'plantId'>
): Promise<PlantShift> {
  const plant = await plantsStore.findById(plantId);
  if (!plant) {
    throw new Error(`Plant ${plantId} not found`);
  }

  const shift: PlantShift = {
    ...data,
    id: generateId(),
    plantId,
  };

  const updatedShifts = [...plant.shifts, shift];
  await plantsStore.update(plantId, { shifts: updatedShifts });

  return shift;
}

export async function removePlantShift(plantId: string, shiftId: string): Promise<void> {
  const plant = await plantsStore.findById(plantId);
  if (!plant) {
    throw new Error(`Plant ${plantId} not found`);
  }

  const updatedShifts = plant.shifts.filter(s => s.id !== shiftId);
  await plantsStore.update(plantId, { shifts: updatedShifts });
}

// ============================================================================
// Plant Equipment
// ============================================================================

export async function addPlantEquipment(
  plantId: string,
  assetId: string,
  equipmentType: PlantEquipment['equipmentType'],
  name: string,
  userId: string
): Promise<PlantEquipment> {
  const plant = await plantsStore.findById(plantId);
  if (!plant) {
    throw new Error(`Plant ${plantId} not found`);
  }

  const asset = await getAsset(assetId);
  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  // Check if asset is already linked to another plant
  const existingEquipment = await equipmentStore.findAll();
  const alreadyLinked = existingEquipment.find(e => e.assetId === assetId && e.plantId !== plantId);
  if (alreadyLinked) {
    throw new Error(`Asset ${assetId} is already linked to plant ${alreadyLinked.plantId}`);
  }

  const equipment: PlantEquipment = {
    id: generateId(),
    plantId,
    assetId,
    equipmentType,
    name,
    status: 'operational',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await equipmentStore.create(equipment);

  // Update asset to link to plant
  await updateAsset(assetId, {
    currentPlantId: plantId,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }, userId, generateId());

  await recordAudit({
    entityType: 'PlantEquipment',
    entityId: equipment.id,
    action: 'create',
    before: null,
    after: equipment as any,
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: `Equipment ${name} added to plant`,
  });

  return equipment;
}

export async function listPlantEquipment(plantId: string): Promise<PlantEquipment[]> {
  return equipmentStore.findAll({ plantId } as any);
}

export async function updateEquipmentStatus(
  equipmentId: string,
  status: PlantEquipment['status'],
  userId: string,
  reason?: string
): Promise<PlantEquipment> {
  const equipment = await equipmentStore.findById(equipmentId);
  if (!equipment) {
    throw new Error(`Equipment ${equipmentId} not found`);
  }

  const updated = await equipmentStore.update(equipmentId, {
    status,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'PlantEquipment',
    entityId: equipmentId,
    action: 'update',
    before: { status: equipment.status },
    after: { status, reason },
    actorId: userId,
    actorRole: 'plant_manager',
    requestId: generateId(),
    reason: reason || `Equipment status changed to ${status}`,
  });

  return updated;
}

// ============================================================================
// Plant Statistics
// ============================================================================

export async function getPlantStatistics(plantId: string): Promise<{
  totalEquipment: number;
  operationalEquipment: number;
  maintenanceEquipment: number;
  idleEquipment: number;
  outOfServiceEquipment: number;
  activeShifts: number;
}> {
  const equipment = await listPlantEquipment(plantId);
  const plant = await getPlant(plantId);

  return {
    totalEquipment: equipment.length,
    operationalEquipment: equipment.filter(e => e.status === 'operational').length,
    maintenanceEquipment: equipment.filter(e => e.status === 'maintenance').length,
    idleEquipment: equipment.filter(e => e.status === 'idle').length,
    outOfServiceEquipment: equipment.filter(e => e.status === 'out_of_service').length,
    activeShifts: plant?.shifts.filter(s => s.isActive).length || 0,
  };
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultPlants(): Promise<void> {
  const existing = await plantsStore.findAll();
  if (existing.length > 0) return;

  const plants = [
    {
      plantCode: 'RMC-001',
      name: 'RMC Plant Alpha',
      companyId: 'company-1',
      address: 'Industrial Area, Phase 2',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      latitude: 19.0760,
      longitude: 72.8777,
      type: 'stationary' as const,
      ratedCapacity: 60,
      practicalCapacity: 50,
      mixerSize: 1.5,
      operatingStatus: 'operational' as const,
      dailyTarget: 400,
      monthlyTarget: 10000,
      plantManagerName: 'Vikram Desai',
      staffCount: 15,
      isActive: true,
    },
    {
      plantCode: 'RMC-002',
      name: 'RMC Plant Beta',
      companyId: 'company-1',
      address: 'MIDC Area',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      latitude: 18.5204,
      longitude: 73.8567,
      type: 'stationary' as const,
      ratedCapacity: 45,
      practicalCapacity: 38,
      mixerSize: 1.0,
      operatingStatus: 'operational' as const,
      dailyTarget: 300,
      monthlyTarget: 7500,
      plantManagerName: 'Rajesh Patil',
      staffCount: 12,
      isActive: true,
    },
  ];

  for (const plant of plants) {
    await createPlant(plant);
  }
}
