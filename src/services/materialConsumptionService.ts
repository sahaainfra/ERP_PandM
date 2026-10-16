/**
 * Part 15 — Material Consumption Variance Service
 */

import { storage } from './storage';
import { MaterialConsumption } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getRevisionByNumber } from './mixDesignService';
import { getBatch } from './batchService';

const consumptionsStore = storage.getAdapter<MaterialConsumption>('material_consumptions');

// ============================================================================
// Material Consumption CRUD
// ============================================================================

export async function createMaterialConsumption(
  data: Omit<MaterialConsumption, 'id' | 'variance' | 'variancePercent' | 'createdAt'>
): Promise<MaterialConsumption> {
  // Calculate variance
  const variance = data.actualQuantity - data.theoreticalQuantity;
  const variancePercent = data.theoreticalQuantity > 0 
    ? (variance / data.theoreticalQuantity) * 100 
    : 0;
  
  const consumption: MaterialConsumption = {
    ...data,
    id: generateId(),
    variance,
    variancePercent: Math.round(variancePercent * 100) / 100,
    createdAt: new Date().toISOString(),
  };
  
  await consumptionsStore.create(consumption);
  
  await recordAudit({
    entityType: 'MaterialConsumption',
    entityId: consumption.id,
    action: 'create',
    before: null,
    after: consumption as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Material consumption recorded for batch ${data.batchNumber}`,
  });
  
  // Check for variance alert
  if (Math.abs(variancePercent) > 5) { // 5% threshold
    await raiseAlert({
      ruleCode: 'MATERIAL_CONSUMPTION_VARIANCE',
      severity: Math.abs(variancePercent) > 10 ? 'high' : 'warning',
      title: `Material Consumption Variance`,
      description: `Batch ${data.batchNumber}: ${data.materialName} has ${variance > 0 ? 'excess' : 'shortage'} consumption of ${Math.abs(variance).toFixed(2)} ${data.actualUnit} (${variancePercent.toFixed(2)}%)`,
      module: 'Material Inventory',
      entityType: 'MaterialConsumption',
      entityId: consumption.id,
      responsibleRole: 'plant_manager',
      recommendedAction: 'Investigate variance - check batch records, material quality, or equipment calibration',
      dueInHours: 24,
      requestId: generateId(),
    });
  }
  
  return consumption;
}

export async function getMaterialConsumption(id: string): Promise<MaterialConsumption | null> {
  return consumptionsStore.findById(id);
}

export async function listMaterialConsumptions(filters?: {
  batchId?: string;
  materialId?: string;
  productionOrderId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<MaterialConsumption[]> {
  let consumptions = await consumptionsStore.findAll();
  
  if (filters?.batchId) {
    consumptions = consumptions.filter(c => c.batchId === filters.batchId);
  }
  if (filters?.materialId) {
    consumptions = consumptions.filter(c => c.materialId === filters.materialId);
  }
  if (filters?.productionOrderId) {
    consumptions = consumptions.filter(c => c.productionOrderId === filters.productionOrderId);
  }
  if (filters?.fromDate) {
    consumptions = consumptions.filter(c => c.consumptionDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    consumptions = consumptions.filter(c => c.consumptionDate <= filters.toDate!);
  }
  
  return consumptions.sort((a, b) => new Date(b.consumptionDate).getTime() - new Date(a.consumptionDate).getTime());
}

// ============================================================================
// Theoretical vs Actual Comparison
// ============================================================================

export async function calculateBatchConsumption(
  batchId: string,
  batchNumber: string,
  productionOrderId: string | undefined,
  batchVolume: number, // m³
  mixDesignId: string,
  revisionNumber: number,
  consumptionDate: string
): Promise<MaterialConsumption[]> {
  // Get mix design revision
  const revision = await getRevisionByNumber(mixDesignId, revisionNumber);
  if (!revision) {
    throw new Error(`Mix design revision ${revisionNumber} not found`);
  }
  
  // Get batch actual weights
  const batch = await getBatch(batchId);
  if (!batch) {
    throw new Error(`Batch ${batchId} not found`);
  }
  
  const consumptions: MaterialConsumption[] = [];
  
  // Calculate consumption for each ingredient
  for (const ingredient of revision.ingredients) {
    const theoreticalQuantity = ingredient.quantity * batchVolume;
    
    // Find actual weight from batch
    const batchIngredient = batch.ingredients.find(i => i.ingredientName === ingredient.name);
    const actualQuantity = batchIngredient ? batchIngredient.actualWeight : theoreticalQuantity;
    
    const consumption = await createMaterialConsumption({
      batchId,
      batchNumber,
      productionOrderId,
      materialId: ingredient.id,
      materialName: ingredient.name,
      theoreticalQuantity,
      theoreticalUnit: ingredient.unit,
      actualQuantity,
      actualUnit: ingredient.unit,
      issueMethod: 'backflush', // Default, would be determined by configuration
      consumptionDate,
    });
    
    consumptions.push(consumption);
  }
  
  return consumptions;
}

// ============================================================================
// Variance Analysis
// ============================================================================

export async function getConsumptionVarianceAnalysis(filters?: {
  materialId?: string;
  plantId?: string;
  grade?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalConsumptions: number;
  averageVariancePercent: number;
  maxVariancePercent: number;
  minVariancePercent: number;
  consumptionsWithVariance: number;
  totalVarianceQuantity: number;
}> {
  let consumptions = await consumptionsStore.findAll();
  
  if (filters?.materialId) {
    consumptions = consumptions.filter(c => c.materialId === filters.materialId);
  }
  if (filters?.fromDate) {
    consumptions = consumptions.filter(c => c.consumptionDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    consumptions = consumptions.filter(c => c.consumptionDate <= filters.toDate!);
  }
  
  const variances = consumptions.map(c => c.variancePercent);
  const averageVariance = variances.length > 0 
    ? variances.reduce((sum, v) => sum + v, 0) / variances.length 
    : 0;
  
  return {
    totalConsumptions: consumptions.length,
    averageVariancePercent: Math.round(averageVariance * 100) / 100,
    maxVariancePercent: variances.length > 0 ? Math.max(...variances) : 0,
    minVariancePercent: variances.length > 0 ? Math.min(...variances) : 0,
    consumptionsWithVariance: consumptions.filter(c => Math.abs(c.variancePercent) > 2).length,
    totalVarianceQuantity: consumptions.reduce((sum, c) => sum + c.variance, 0),
  };
}

export async function getVarianceByMaterial(filters?: {
  fromDate?: string;
  toDate?: string;
}): Promise<Array<{
  materialId: string;
  materialName: string;
  totalTheoretical: number;
  totalActual: number;
  totalVariance: number;
  averageVariancePercent: number;
}>> {
  let consumptions = await consumptionsStore.findAll();
  
  if (filters?.fromDate) {
    consumptions = consumptions.filter(c => c.consumptionDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    consumptions = consumptions.filter(c => c.consumptionDate <= filters.toDate!);
  }
  
  // Group by material
  const byMaterial = new Map<string, MaterialConsumption[]>();
  for (const consumption of consumptions) {
    const existing = byMaterial.get(consumption.materialId) || [];
    existing.push(consumption);
    byMaterial.set(consumption.materialId, existing);
  }
  
  // Calculate statistics for each material
  const result = Array.from(byMaterial.entries()).map(([materialId, consumptions]) => {
    const totalTheoretical = consumptions.reduce((sum, c) => sum + c.theoreticalQuantity, 0);
    const totalActual = consumptions.reduce((sum, c) => sum + c.actualQuantity, 0);
    const totalVariance = totalActual - totalTheoretical;
    const averageVariancePercent = totalTheoretical > 0 
      ? (totalVariance / totalTheoretical) * 100 
      : 0;
    
    return {
      materialId,
      materialName: consumptions[0].materialName,
      totalTheoretical: Math.round(totalTheoretical * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalVariance: Math.round(totalVariance * 100) / 100,
      averageVariancePercent: Math.round(averageVariancePercent * 100) / 100,
    };
  });
  
  return result.sort((a, b) => Math.abs(b.averageVariancePercent) - Math.abs(a.averageVariancePercent));
}
