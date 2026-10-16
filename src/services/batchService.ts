/**
 * Part 13 — Batch Service
 */

import { storage } from './storage';
import { BatchRecord, BatchIngredient, ToleranceViolation, WeighingToleranceConfig, IngredientTolerance } from './rmcPlantTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getPlant } from './rmcPlantService';
import { getMixDesign } from './mixDesignService';

const batchesStore = storage.getAdapter<BatchRecord>('batch_records');
const toleranceConfigStore = storage.getAdapter<WeighingToleranceConfig>('weighing_tolerance_config');

// ============================================================================
// Batch CRUD
// ============================================================================

export async function createBatch(
  data: Omit<BatchRecord, 'id' | 'createdAt' | 'updatedAt' | 'toleranceViolations' | 'manualEntryApproved' | 'qualityStatus'>,
  userId: string
): Promise<BatchRecord> {
  const plant = await getPlant(data.plantId);
  if (!plant) {
    throw new Error(`Plant ${data.plantId} not found`);
  }

  // Check for duplicate batch number
  const existingBatch = await getBatchByNumber(data.batchNumber, data.plantId);
  if (existingBatch) {
    throw new Error(`Batch number ${data.batchNumber} already exists for plant ${data.plantId}`);
  }

  // Validate mix design revision if provided
  if (data.mixDesignId && data.mixDesignRevision) {
    const mixDesign = await getMixDesign(data.mixDesignId);
    if (!mixDesign) {
      throw new Error(`Mix design ${data.mixDesignId} not found`);
    }
    
    // Check if revision is approved
    const revision = mixDesign.revisions.find(r => r.revisionNumber === data.mixDesignRevision);
    if (!revision) {
      throw new Error(`Mix design revision ${data.mixDesignRevision} not found`);
    }
    if (revision.status !== 'approved') {
      throw new Error(`Mix design revision ${data.mixDesignRevision} is not approved (status: ${revision.status})`);
    }
  }

  // Calculate ingredient variances and check tolerances
  const ingredients = await calculateIngredientVariances(data.ingredients, data.plantId);
  const toleranceViolations = checkToleranceViolations(ingredients);

  // Determine batch status based on violations
  let qualityStatus: 'pending' | 'approved' | 'rejected' = 'pending';
  if (toleranceViolations.some(v => v.severity === 'error')) {
    qualityStatus = 'rejected';
  }

  // Manual entry requires approval
  const manualEntryApproved = data.dataSource === 'manual' ? false : true;

  const batch: BatchRecord = {
    ...data,
    id: generateId(),
    ingredients,
    toleranceViolations,
    qualityStatus,
    manualEntryApproved,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await batchesStore.create(batch);

  // Raise alert for tolerance violations
  if (toleranceViolations.length > 0) {
    await raiseAlert({
      ruleCode: 'BATCH_WEIGH_TOLERANCE',
      severity: toleranceViolations.some(v => v.severity === 'error') ? 'high' : 'warning',
      title: `Batch Weighing Tolerance Violation`,
      description: `Batch ${batch.batchNumber} has ${toleranceViolations.length} tolerance violation(s)`,
      module: 'RMC Operations',
      entityType: 'BatchRecord',
      entityId: batch.id,
      responsibleRole: 'plant_manager',
      recommendedAction: 'Review batch ingredients and approve/reject',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  // Raise alert for manual entry requiring approval
  if (data.dataSource === 'manual') {
    await raiseAlert({
      ruleCode: 'MANUAL_BATCH_ENTRY',
      severity: 'warning',
      title: `Manual Batch Entry Requires Approval`,
      description: `Batch ${batch.batchNumber} was manually entered and requires supervisor approval`,
      module: 'RMC Operations',
      entityType: 'BatchRecord',
      entityId: batch.id,
      responsibleRole: 'plant_manager',
      recommendedAction: 'Review and approve manual batch entry',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  await recordAudit({
    entityType: 'BatchRecord',
    entityId: batch.id,
    action: 'create',
    before: null,
    after: batch as any,
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: `Batch ${batch.batchNumber} created`,
  });

  return batch;
}

export async function getBatch(id: string): Promise<BatchRecord | null> {
  return batchesStore.findById(id);
}

export async function getBatchByNumber(batchNumber: string, plantId: string): Promise<BatchRecord | null> {
  const all = await batchesStore.findAll();
  return all.find(b => b.batchNumber === batchNumber && b.plantId === plantId) || null;
}

export async function listBatches(filters?: {
  plantId?: string;
  productionOrderId?: string;
  dataSource?: string;
  qualityStatus?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<BatchRecord[]> {
  let batches = await batchesStore.findAll();

  if (filters?.plantId) {
    batches = batches.filter(b => b.plantId === filters.plantId);
  }
  if (filters?.productionOrderId) {
    batches = batches.filter(b => b.productionOrderId === filters.productionOrderId);
  }
  if (filters?.dataSource) {
    batches = batches.filter(b => b.dataSource === filters.dataSource);
  }
  if (filters?.qualityStatus) {
    batches = batches.filter(b => b.qualityStatus === filters.qualityStatus);
  }
  if (filters?.fromDate) {
    batches = batches.filter(b => b.batchStartTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    batches = batches.filter(b => b.batchStartTime <= filters.toDate!);
  }

  return batches.sort((a, b) => new Date(b.batchStartTime).getTime() - new Date(a.batchStartTime).getTime());
}

// ============================================================================
// Batch Approval
// ============================================================================

export async function approveBatch(
  id: string,
  approvedBy: string,
  qualityNotes?: string
): Promise<BatchRecord> {
  const batch = await batchesStore.findById(id);
  if (!batch) {
    throw new Error(`Batch ${id} not found`);
  }

  // Manual entry approval
  if (batch.dataSource === 'manual' && !batch.manualEntryApproved) {
    const updated = await batchesStore.update(id, {
      manualEntryApproved: true,
      manualEntryApprovedBy: approvedBy,
      manualEntryApprovedAt: new Date().toISOString(),
      qualityStatus: 'approved',
      qualityNotes,
      updatedAt: new Date().toISOString(),
    });

    await recordAudit({
      entityType: 'BatchRecord',
      entityId: id,
      action: 'approve',
      before: { manualEntryApproved: false, qualityStatus: batch.qualityStatus },
      after: { manualEntryApproved: true, qualityStatus: 'approved', qualityNotes },
      actorId: approvedBy,
      actorRole: 'plant_manager',
      requestId: generateId(),
      reason: 'Manual batch entry approved',
    });

    return updated;
  }

  // Quality approval
  const updated = await batchesStore.update(id, {
    qualityStatus: 'approved',
    qualityNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'BatchRecord',
    entityId: id,
    action: 'approve',
    before: { qualityStatus: batch.qualityStatus },
    after: { qualityStatus: 'approved', qualityNotes },
    actorId: approvedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Batch quality approved',
  });

  return updated;
}

export async function rejectBatch(
  id: string,
  rejectedBy: string,
  qualityNotes: string
): Promise<BatchRecord> {
  const batch = await batchesStore.findById(id);
  if (!batch) {
    throw new Error(`Batch ${id} not found`);
  }

  const updated = await batchesStore.update(id, {
    qualityStatus: 'rejected',
    qualityNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'BatchRecord',
    entityId: id,
    action: 'reject',
    before: { qualityStatus: batch.qualityStatus },
    after: { qualityStatus: 'rejected', qualityNotes },
    actorId: rejectedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: qualityNotes,
  });

  return updated;
}

// ============================================================================
// Ingredient Calculations
// ============================================================================

async function calculateIngredientVariances(
  ingredients: BatchIngredient[],
  plantId: string
): Promise<BatchIngredient[]> {
  const config = await getWeighingToleranceConfig(plantId);

  return ingredients.map(ing => {
    const variance = ing.actualWeight - ing.targetWeight;
    const variancePercent = ing.targetWeight > 0 ? (variance / ing.targetWeight) * 100 : 0;
    
    // Get tolerance from config or use ingredient's own tolerance
    const tolerance = config?.ingredientTolerances.find(t => t.ingredientType === ing.ingredientType)?.tolerancePercent 
      || ing.tolerancePercent;

    const withinTolerance = Math.abs(variancePercent) <= tolerance;

    return {
      ...ing,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
      tolerancePercent: tolerance,
      withinTolerance,
    };
  });
}

function checkToleranceViolations(ingredients: BatchIngredient[]): ToleranceViolation[] {
  const violations: ToleranceViolation[] = [];

  for (const ing of ingredients) {
    if (!ing.withinTolerance) {
      const severity: 'warning' | 'error' = Math.abs(ing.variancePercent) > ing.tolerancePercent * 1.5 
        ? 'error' 
        : 'warning';

      violations.push({
        id: generateId(),
        batchId: '', // Will be set after batch is created
        ingredientType: ing.ingredientType,
        ingredientName: ing.ingredientName,
        targetWeight: ing.targetWeight,
        actualWeight: ing.actualWeight,
        variancePercent: ing.variancePercent,
        tolerancePercent: ing.tolerancePercent,
        severity,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return violations;
}

// ============================================================================
// Tolerance Configuration
// ============================================================================

export async function getWeighingToleranceConfig(plantId?: string): Promise<WeighingToleranceConfig | null> {
  if (plantId) {
    const plantConfig = await toleranceConfigStore.findOne({ plantId } as any);
    if (plantConfig) return plantConfig;
  }
  
  // Return global config
  const globalConfig = await toleranceConfigStore.findOne({ plantId: undefined } as any);
  return globalConfig || null;
}

export async function createWeighingToleranceConfig(
  data: Omit<WeighingToleranceConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WeighingToleranceConfig> {
  const config: WeighingToleranceConfig = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await toleranceConfigStore.create(config);
  return config;
}

export async function updateWeighingToleranceConfig(
  id: string,
  updates: Partial<WeighingToleranceConfig>
): Promise<WeighingToleranceConfig> {
  const config = await toleranceConfigStore.findById(id);
  if (!config) {
    throw new Error(`Tolerance config ${id} not found`);
  }

  const updated = await toleranceConfigStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

// ============================================================================
// Batch Statistics
// ============================================================================

export async function getBatchStatistics(plantId: string, fromDate: string, toDate: string): Promise<{
  totalBatches: number;
  completedBatches: number;
  rejectedBatches: number;
  manualBatches: number;
  integratedBatches: number;
  totalVolume: number;
  averageCycleTime: number;
  toleranceViolations: number;
}> {
  const batches = await listBatches({ plantId, fromDate, toDate });

  const completedBatches = batches.filter(b => b.qualityStatus === 'approved').length;
  const rejectedBatches = batches.filter(b => b.qualityStatus === 'rejected').length;
  const manualBatches = batches.filter(b => b.dataSource === 'manual').length;
  const integratedBatches = batches.filter(b => b.dataSource !== 'manual').length;
  const totalVolume = batches.reduce((sum, b) => sum + b.actualVolume, 0);
  
  // Calculate average cycle time
  const batchesWithDuration = batches.filter(b => b.batchEndTime);
  const totalCycleTime = batchesWithDuration.reduce((sum, b) => {
    const start = new Date(b.batchStartTime).getTime();
    const end = new Date(b.batchEndTime!).getTime();
    return sum + (end - start) / (1000 * 60); // minutes
  }, 0);
  const averageCycleTime = batchesWithDuration.length > 0 
    ? totalCycleTime / batchesWithDuration.length 
    : 0;

  const toleranceViolations = batches.reduce((sum, b) => sum + b.toleranceViolations.length, 0);

  return {
    totalBatches: batches.length,
    completedBatches,
    rejectedBatches,
    manualBatches,
    integratedBatches,
    totalVolume: Math.round(totalVolume * 100) / 100,
    averageCycleTime: Math.round(averageCycleTime * 10) / 10,
    toleranceViolations,
  };
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultToleranceConfig(): Promise<void> {
  const existing = await toleranceConfigStore.findAll();
  if (existing.length > 0) return;

  const config: Omit<WeighingToleranceConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    plantId: undefined, // Global config
    ingredientTolerances: [
      { ingredientType: 'cement', tolerancePercent: 2, severity: 'error' },
      { ingredientType: 'fly_ash', tolerancePercent: 3, severity: 'warning' },
      { ingredientType: 'sand', tolerancePercent: 3, severity: 'warning' },
      { ingredientType: 'aggregate_20mm', tolerancePercent: 3, severity: 'warning' },
      { ingredientType: 'aggregate_12mm', tolerancePercent: 3, severity: 'warning' },
      { ingredientType: 'aggregate_6mm', tolerancePercent: 3, severity: 'warning' },
    ],
  };

  await createWeighingToleranceConfig(config);
}
