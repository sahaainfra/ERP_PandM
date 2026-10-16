/**
 * Part 21 — Costing Engine Service
 */

import { storage } from './storage';
import { 
  AssetCostRecord, 
  PlantCostRecord, 
  ProjectCostAllocation,
  OrderContributionMargin,
  CostingConfiguration
} from './financeTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { listWorkOrders } from './workOrderService';
import { listMixerTrips } from './mixerTripService';
import { listBatches } from './batchService';
import { listLogbooks } from './logbookService';

const assetCostsStore = storage.getAdapter<AssetCostRecord>('asset_cost_records');
const plantCostsStore = storage.getAdapter<PlantCostRecord>('plant_cost_records');
const configStore = storage.getAdapter<CostingConfiguration>('costing_configurations');

// ============================================================================
// Configuration
// ============================================================================

export async function getCostingConfiguration(): Promise<CostingConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const defaultConfig: CostingConfiguration = {
      id: 'default',
      defaultInternalHireRatePerHour: 500,
      defaultInternalHireRatePerKm: 50,
      defaultOverheadAllocationMethod: 'per_m3',
      defaultOverheadRatePerM3: 100,
      defaultGstRate: 18,
      interStateGstRate: 18,
      costingPeriodStartDay: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }
  return configs[0];
}

export async function updateCostingConfiguration(
  updates: Partial<CostingConfiguration>
): Promise<CostingConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const config: CostingConfiguration = {
      id: generateId(),
      defaultInternalHireRatePerHour: updates.defaultInternalHireRatePerHour ?? 500,
      defaultInternalHireRatePerKm: updates.defaultInternalHireRatePerKm ?? 50,
      defaultOverheadAllocationMethod: updates.defaultOverheadAllocationMethod ?? 'per_m3',
      defaultOverheadRatePerM3: updates.defaultOverheadRatePerM3 ?? 100,
      defaultGstRate: updates.defaultGstRate ?? 18,
      interStateGstRate: updates.interStateGstRate ?? 18,
      costingPeriodStartDay: updates.costingPeriodStartDay ?? 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(config);
    return config;
  }

  const updated = await configStore.update(configs[0].id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

// ============================================================================
// Asset Cost Calculation
// ============================================================================

export async function calculateAssetCost(
  assetId: string,
  periodId: string,
  startDate: string,
  endDate: string
): Promise<AssetCostRecord> {
  // Get all cost components
  const fuelCosts = await calculateFuelCost(assetId, startDate, endDate);
  const maintenanceCosts = await calculateMaintenanceCost(assetId, startDate, endDate);
  const transportCosts = await calculateTransportCost(assetId, startDate, endDate);
  
  // Get usage from logbooks
  const logbooks = await listLogbooks({ assetId, status: 'approved' });
  const filteredLogbooks = logbooks.filter(l => l.date >= startDate && l.date <= endDate);
  const approvedHours = filteredLogbooks.reduce((sum: number, v: any) => sum + (v.calculatedOperatingHours || 0), 0);
  const approvedKm = filteredLogbooks.reduce((sum: number, v: any) => sum + (v.calculatedKilometres || 0), 0);

  // Calculate totals
  const totalCost = 
    fuelCosts.fuelCost +
    fuelCosts.fuelVarianceCost +
    maintenanceCosts.labourCost +
    maintenanceCosts.partsCost +
    maintenanceCosts.externalCost +
    transportCosts.totalCost;

  const costPerHour = approvedHours > 0 ? totalCost / approvedHours : 0;
  const costPerKm = approvedKm > 0 ? totalCost / approvedKm : 0;

  const costRecord: AssetCostRecord = {
    id: generateId(),
    assetId,
    periodId,
    fuelCost: fuelCosts.fuelCost,
    fuelVarianceCost: fuelCosts.fuelVarianceCost,
    maintenanceLabourCost: maintenanceCosts.labourCost,
    maintenancePartsCost: maintenanceCosts.partsCost,
    externalRepairCost: maintenanceCosts.externalCost,
    operatorWagesCost: 0, // Would come from HR/payroll
    insuranceCost: 0, // Would come from fixed asset module
    taxCost: 0, // Would come from fixed asset module
    depreciationCost: 0, // Would come from fixed asset module
    hireInCost: 0, // Would come from hire-in records
    totalCost: Math.round(totalCost * 100) / 100,
    approvedOperatingHours: Math.round(approvedHours * 10) / 10,
    approvedKilometres: Math.round(approvedKm),
    costPerHour: Math.round(costPerHour * 100) / 100,
    costPerKilometre: Math.round(costPerKm * 100) / 100,
    projectAllocations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await assetCostsStore.create(costRecord);

  await recordAudit({
    entityType: 'AssetCostRecord',
    entityId: costRecord.id,
    action: 'create',
    before: null,
    after: costRecord as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Asset cost calculated for ${assetId} in period ${periodId}`,
  });

  return costRecord;
}

async function calculateFuelCost(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{ fuelCost: number; fuelVarianceCost: number }> {
  // Simplified - would need actual fuel issue data
  const fuelCost = 25000; // Fixed monthly fuel cost estimate
  const fuelVarianceCost = 2000; // Estimated unexplained variance cost

  return {
    fuelCost: Math.round(fuelCost * 100) / 100,
    fuelVarianceCost: Math.round(fuelVarianceCost * 100) / 100,
  };
}

async function calculateMaintenanceCost(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{ labourCost: number; partsCost: number; externalCost: number }> {
  const workOrders = await listWorkOrders({ assetId, fromDate: startDate, toDate: endDate });
  
  const labourCost = workOrders.reduce((sum, wo) => sum + wo.labourCost, 0);
  const partsCost = workOrders.reduce((sum, wo) => sum + wo.partsCost, 0);
  const externalCost = workOrders.reduce((sum, wo) => sum + wo.externalCost, 0);

  return {
    labourCost: Math.round(labourCost * 100) / 100,
    partsCost: Math.round(partsCost * 100) / 100,
    externalCost: Math.round(externalCost * 100) / 100,
  };
}

async function calculateTransportCost(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{ totalCost: number }> {
  // Simplified - would need actual trip data
  const totalCost = 15000; // Fixed monthly transport cost estimate

  return {
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

// ============================================================================
// Plant Cost Calculation
// ============================================================================

export async function calculatePlantCost(
  plantId: string,
  periodId: string,
  startDate: string,
  endDate: string,
  grade?: string
): Promise<PlantCostRecord> {
  // Get all batches for the plant
  const batches = await listBatches({ plantId, fromDate: startDate, toDate: endDate });
  const filteredBatches = grade ? batches.filter(b => b.grade === grade) : batches;
  
  const totalProduction = filteredBatches.reduce((sum, b) => sum + b.actualVolume, 0);
  
  // Calculate material costs
  const materialCosts = await calculateMaterialCosts(filteredBatches);
  
  // Calculate operational costs
  const operationalCosts = await calculateOperationalCosts(plantId, startDate, endDate);
  
  // Calculate wastage costs
  const wastageCosts = await calculateWastageCosts(filteredBatches);
  
  // Calculate overhead
  const config = await getCostingConfiguration();
  let overheadAllocation = 0;
  
  switch (config.defaultOverheadAllocationMethod) {
    case 'per_m3':
      overheadAllocation = totalProduction * config.defaultOverheadRatePerM3;
      break;
    case 'per_batch_hour':
      // Would need batch hour data
      overheadAllocation = totalProduction * config.defaultOverheadRatePerM3;
      break;
    default:
      overheadAllocation = totalProduction * config.defaultOverheadRatePerM3;
  }

  // Calculate totals
  const totalCost = 
    materialCosts.totalCost +
    operationalCosts.totalCost +
    wastageCosts.totalCost +
    overheadAllocation;

  const costPerM3 = totalProduction > 0 ? totalCost / totalProduction : 0;

  const costRecord: PlantCostRecord = {
    id: generateId(),
    plantId,
    periodId,
    grade,
    cementCost: materialCosts.cementCost,
    scmCost: materialCosts.scmCost,
    aggregateCost: materialCosts.aggregateCost,
    waterCost: materialCosts.waterCost,
    admixtureCost: materialCosts.admixtureCost,
    consumablesCost: materialCosts.consumablesCost,
    totalMaterialCost: materialCosts.totalCost,
    fuelCost: operationalCosts.fuelCost,
    electricityCost: operationalCosts.electricityCost,
    plantLabourCost: operationalCosts.labourCost,
    plantMaintenanceCost: operationalCosts.maintenanceCost,
    transitMixerCost: operationalCosts.transitMixerCost,
    pumpCost: operationalCosts.pumpCost,
    wastageCost: wastageCosts.wastageCost,
    rejectedCost: wastageCosts.rejectedCost,
    returnedCost: wastageCosts.returnedCost,
    overheadAllocation: Math.round(overheadAllocation * 100) / 100,
    overheadAllocationMethod: config.defaultOverheadAllocationMethod,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProduction: Math.round(totalProduction * 100) / 100,
    costPerM3: Math.round(costPerM3 * 100) / 100,
    totalRevenue: 0, // Would be calculated from orders
    contributionMargin: 0,
    contributionMarginPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await plantCostsStore.create(costRecord);

  await recordAudit({
    entityType: 'PlantCostRecord',
    entityId: costRecord.id,
    action: 'create',
    before: null,
    after: costRecord as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Plant cost calculated for ${plantId} in period ${periodId}`,
  });

  return costRecord;
}

async function calculateMaterialCosts(batches: any[]): Promise<{
  cementCost: number;
  scmCost: number;
  aggregateCost: number;
  waterCost: number;
  admixtureCost: number;
  consumablesCost: number;
  totalCost: number;
}> {
  // Simplified calculation - would need actual material consumption data
  const totalVolume = batches.reduce((sum, b) => sum + b.actualVolume, 0);
  
  // Approximate material costs per m³
  const cementCost = totalVolume * 800; // ₹800 per m³
  const scmCost = totalVolume * 200; // ₹200 per m³
  const aggregateCost = totalVolume * 600; // ₹600 per m³
  const waterCost = totalVolume * 50; // ₹50 per m³
  const admixtureCost = totalVolume * 150; // ₹150 per m³
  const consumablesCost = totalVolume * 100; // ₹100 per m³

  const totalCost = cementCost + scmCost + aggregateCost + waterCost + admixtureCost + consumablesCost;

  return {
    cementCost: Math.round(cementCost * 100) / 100,
    scmCost: Math.round(scmCost * 100) / 100,
    aggregateCost: Math.round(aggregateCost * 100) / 100,
    waterCost: Math.round(waterCost * 100) / 100,
    admixtureCost: Math.round(admixtureCost * 100) / 100,
    consumablesCost: Math.round(consumablesCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

async function calculateOperationalCosts(
  plantId: string,
  startDate: string,
  endDate: string
): Promise<{
  fuelCost: number;
  electricityCost: number;
  labourCost: number;
  maintenanceCost: number;
  transitMixerCost: number;
  pumpCost: number;
  totalCost: number;
}> {
  // Simplified calculation - would need actual operational data
  const fuelCost = 50000; // Fixed monthly fuel cost
  const electricityCost = 30000; // Fixed monthly electricity cost
  const labourCost = 100000; // Fixed monthly labour cost
  const maintenanceCost = 20000; // Fixed monthly maintenance cost
  const transitMixerCost = 40000; // Fixed monthly transit mixer cost
  const pumpCost = 25000; // Fixed monthly pump cost

  const totalCost = fuelCost + electricityCost + labourCost + maintenanceCost + transitMixerCost + pumpCost;

  return {
    fuelCost,
    electricityCost,
    labourCost,
    maintenanceCost,
    transitMixerCost,
    pumpCost,
    totalCost,
  };
}

async function calculateWastageCosts(batches: any[]): Promise<{
  wastageCost: number;
  rejectedCost: number;
  returnedCost: number;
  totalCost: number;
}> {
  // Simplified calculation - would need actual wastage data
  const totalVolume = batches.reduce((sum, b) => sum + b.actualVolume, 0);
  
  // Assume 2% wastage, 1% rejection, 0.5% return
  const wastageVolume = totalVolume * 0.02;
  const rejectedVolume = totalVolume * 0.01;
  const returnedVolume = totalVolume * 0.005;
  
  const costPerM3 = 1800; // Average cost per m³
  
  const wastageCost = wastageVolume * costPerM3;
  const rejectedCost = rejectedVolume * costPerM3;
  const returnedCost = returnedVolume * costPerM3;
  
  const totalCost = wastageCost + rejectedCost + returnedCost;

  return {
    wastageCost: Math.round(wastageCost * 100) / 100,
    rejectedCost: Math.round(rejectedCost * 100) / 100,
    returnedCost: Math.round(returnedCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

// ============================================================================
// Cost Retrieval
// ============================================================================

export async function getAssetCost(id: string): Promise<AssetCostRecord | null> {
  return assetCostsStore.findById(id);
}

export async function listAssetCosts(filters?: {
  assetId?: string;
  periodId?: string;
}): Promise<AssetCostRecord[]> {
  let costs = await assetCostsStore.findAll();

  if (filters?.assetId) {
    costs = costs.filter(c => c.assetId === filters.assetId);
  }
  if (filters?.periodId) {
    costs = costs.filter(c => c.periodId === filters.periodId);
  }

  return costs;
}

export async function getPlantCost(id: string): Promise<PlantCostRecord | null> {
  return plantCostsStore.findById(id);
}

export async function listPlantCosts(filters?: {
  plantId?: string;
  periodId?: string;
  grade?: string;
}): Promise<PlantCostRecord[]> {
  let costs = await plantCostsStore.findAll();

  if (filters?.plantId) {
    costs = costs.filter(c => c.plantId === filters.plantId);
  }
  if (filters?.periodId) {
    costs = costs.filter(c => c.periodId === filters.periodId);
  }
  if (filters?.grade) {
    costs = costs.filter(c => c.grade === filters.grade);
  }

  return costs;
}
