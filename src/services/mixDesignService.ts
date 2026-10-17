/**
 * Part 14 — Mix Design Management Service
 */

import { storage } from './storage';
import { 
  MixDesign, 
  MixDesignRevision, 
  MixDesignIngredient, 
  MixDesignTrial,
  AggregateMoistureData,
  MoistureCorrectionResult,
  CorrectedBatchWeights,
  MixDesignCost,
  TheoreticalMaterialRequirement,
  ReferenceStandard,
  MixDesignConfiguration
} from './mixDesignTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';

const mixDesignsStore = storage.getAdapter<MixDesign>('mix_designs');
const revisionsStore = storage.getAdapter<MixDesignRevision>('mix_design_revisions');
const trialsStore = storage.getAdapter<MixDesignTrial>('mix_design_trials');
const moistureDataStore = storage.getAdapter<AggregateMoistureData>('aggregate_moisture_data');
const configStore = storage.getAdapter<MixDesignConfiguration>('mix_design_config');

// ============================================================================
// Configuration
// ============================================================================

export async function getMixDesignConfiguration(): Promise<MixDesignConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    // Return default configuration
    const defaultConfig: MixDesignConfiguration = {
      id: 'default',
      moistureDataMaxAgeHours: 24,
      requireCustomerApproval: false,
      requireTechnicalAuthorityApproval: true,
      minWaterBinderRatio: 0.35,
      maxWaterBinderRatio: 0.65,
      minCementContent: 250,
      maxCementContent: 550,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }
  return configs[0];
}

export async function updateMixDesignConfiguration(
  updates: Partial<MixDesignConfiguration>
): Promise<MixDesignConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const config: MixDesignConfiguration = {
      id: generateId(),
      moistureDataMaxAgeHours: updates.moistureDataMaxAgeHours ?? 24,
      requireCustomerApproval: updates.requireCustomerApproval ?? false,
      requireTechnicalAuthorityApproval: updates.requireTechnicalAuthorityApproval ?? true,
      minWaterBinderRatio: updates.minWaterBinderRatio ?? 0.35,
      maxWaterBinderRatio: updates.maxWaterBinderRatio ?? 0.65,
      minCementContent: updates.minCementContent ?? 250,
      maxCementContent: updates.maxCementContent ?? 550,
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
// Mix Design CRUD
// ============================================================================

export async function createMixDesign(
  data: Omit<MixDesign, 'id' | 'createdAt' | 'updatedAt' | 'currentRevision' | 'totalBinder' | 'waterBinderRatio' | 'scmReplacementPercent' | 'theoreticalDensity'>
): Promise<MixDesign> {
  // Calculate derived parameters
  const derived = calculateDerivedParameters(data.ingredients);

  const mixDesign: MixDesign = {
    ...data,
    id: generateId(),
    currentRevision: 1,
    totalBinder: derived.totalBinder,
    waterBinderRatio: derived.waterBinderRatio,
    scmReplacementPercent: derived.scmReplacementPercent,
    theoreticalDensity: derived.theoreticalDensity,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await mixDesignsStore.create(mixDesign);

  // Create initial revision
  await createRevision(mixDesign.id, {
    mixDesignId: mixDesign.id,
    revisionNumber: 1,
    changeSummary: 'Initial mix design',
    changedFields: ['all'],
    ingredients: mixDesign.ingredients,
    totalBinder: derived.totalBinder,
    waterBinderRatio: derived.waterBinderRatio,
    scmReplacementPercent: derived.scmReplacementPercent,
    theoreticalDensity: derived.theoreticalDensity,
    effectiveFrom: new Date().toISOString(),
    status: 'draft',
    draftedBy: data.createdBy,
    draftedAt: new Date().toISOString(),
    reason: 'Initial mix design creation',
  });

  await recordAudit({
    entityType: 'MixDesign',
    entityId: mixDesign.id,
    action: 'create',
    before: null,
    after: mixDesign as any,
    actorId: data.createdBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Mix design created',
  });

  return mixDesign;
}

export async function getMixDesign(id: string): Promise<MixDesign | null> {
  return mixDesignsStore.findById(id);
}

export async function getMixDesignByCode(code: string): Promise<MixDesign | null> {
  const all = await mixDesignsStore.findAll();
  return all.find(m => m.mixDesignCode === code) || null;
}

export async function listMixDesigns(filters?: {
  grade?: string;
  status?: string;
  plantId?: string;
}): Promise<MixDesign[]> {
  let designs = await mixDesignsStore.findAll();

  if (filters?.grade) {
    designs = designs.filter(m => m.grade === filters.grade);
  }
  if (filters?.status) {
    designs = designs.filter(m => m.status === filters.status);
  }
  if (filters?.plantId) {
    designs = designs.filter(m => m.applicablePlantIds.includes(filters.plantId!));
  }

  return designs;
}

export async function updateMixDesign(
  id: string,
  updates: Partial<MixDesign>,
  userId: string
): Promise<MixDesign> {
  const mixDesign = await mixDesignsStore.findById(id);
  if (!mixDesign) {
    throw new Error(`Mix design ${id} not found`);
  }

  // Recalculate derived parameters if ingredients changed
  if (updates.ingredients) {
    const derived = calculateDerivedParameters(updates.ingredients);
    updates.totalBinder = derived.totalBinder;
    updates.waterBinderRatio = derived.waterBinderRatio;
    updates.scmReplacementPercent = derived.scmReplacementPercent;
    updates.theoreticalDensity = derived.theoreticalDensity;
  }

  const updated = await mixDesignsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'MixDesign',
    entityId: id,
    action: 'update',
    before: mixDesign as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Mix design updated',
  });

  return updated;
}

// ============================================================================
// Derived Parameter Calculations
// ============================================================================

function calculateDerivedParameters(ingredients: MixDesignIngredient[]): {
  totalBinder: number;
  waterBinderRatio: number;
  scmReplacementPercent: number;
  theoreticalDensity: number;
} {
  // Calculate total binder (cement + fly ash + GGBS + silica fume)
  const binderIngredients = ingredients.filter(i => 
    ['cement', 'fly_ash', 'ggbs', 'silica_fume'].includes(i.category)
  );
  const totalBinder = binderIngredients.reduce((sum, i) => {
    if (i.unit === 'kg/m³') return sum + i.quantity;
    if (i.unit === 'g/m³') return sum + i.quantity / 1000;
    return sum;
  }, 0);

  // Calculate water content
  const waterIngredient = ingredients.find(i => i.category === 'water');
  const waterContent = waterIngredient && waterIngredient.unit === 'litres/m³' 
    ? waterIngredient.quantity 
    : 0;

  // Calculate water-binder ratio
  const waterBinderRatio = totalBinder > 0 ? waterContent / totalBinder : 0;

  // Calculate SCM replacement percentage
  const cementIngredient = ingredients.find(i => i.category === 'cement');
  const cementContent = cementIngredient && cementIngredient.unit === 'kg/m³' 
    ? cementIngredient.quantity 
    : 0;
  const scmContent = totalBinder - cementContent;
  const scmReplacementPercent = totalBinder > 0 ? (scmContent / totalBinder) * 100 : 0;

  // Calculate theoretical density (simplified)
  const totalWeight = ingredients.reduce((sum, i) => {
    if (i.unit === 'kg/m³') return sum + i.quantity;
    if (i.unit === 'g/m³') return sum + i.quantity / 1000;
    if (i.unit === 'litres/m³') return sum + i.quantity; // Approximate 1L = 1kg
    return sum;
  }, 0);
  const theoreticalDensity = totalWeight;

  return {
    totalBinder: Math.round(totalBinder * 100) / 100,
    waterBinderRatio: Math.round(waterBinderRatio * 1000) / 1000,
    scmReplacementPercent: Math.round(scmReplacementPercent * 10) / 10,
    theoreticalDensity: Math.round(theoreticalDensity),
  };
}

// ============================================================================
// Revision Management
// ============================================================================

export async function createRevision(
  mixDesignId: string,
  data: Omit<MixDesignRevision, 'id' | 'createdAt' | 'updatedAt'>
): Promise<MixDesignRevision> {
  const mixDesign = await mixDesignsStore.findById(mixDesignId);
  if (!mixDesign) {
    throw new Error(`Mix design ${mixDesignId} not found`);
  }

  // Supersede previous revision
  const previousRevision = await getCurrentApprovedRevision(mixDesignId);
  if (previousRevision) {
    await revisionsStore.update(previousRevision.id, {
      status: 'superseded',
      effectiveTo: data.effectiveFrom,
      updatedAt: new Date().toISOString(),
    });
  }

  const revision: MixDesignRevision = {
    ...data,
    id: generateId(),
    mixDesignId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await revisionsStore.create(revision);

  // Update mix design current revision
  await mixDesignsStore.update(mixDesignId, {
    currentRevision: data.revisionNumber,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'MixDesignRevision',
    entityId: revision.id,
    action: 'create',
    before: null,
    after: revision as any,
    actorId: data.draftedBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Revision ${data.revisionNumber} created: ${data.changeSummary}`,
  });

  return revision;
}

export async function getRevision(id: string): Promise<MixDesignRevision | null> {
  return revisionsStore.findById(id);
}

export async function getRevisionByNumber(
  mixDesignId: string, 
  revisionNumber: number
): Promise<MixDesignRevision | null> {
  const all = await revisionsStore.findAll({ mixDesignId } as any);
  return all.find(r => r.revisionNumber === revisionNumber) || null;
}

export async function getCurrentApprovedRevision(mixDesignId: string): Promise<MixDesignRevision | null> {
  const all = await revisionsStore.findAll({ mixDesignId } as any);
  return all.find(r => r.status === 'approved') || null;
}

export async function getApprovedRevisionOnDate(
  mixDesignId: string, 
  date: string
): Promise<MixDesignRevision | null> {
  const all = await revisionsStore.findAll({ mixDesignId } as any);
  const checkDate = new Date(date);
  
  return all.find(r => {
    if (r.status !== 'approved') return false;
    const effectiveFrom = new Date(r.effectiveFrom);
    const effectiveTo = r.effectiveTo ? new Date(r.effectiveTo) : null;
    return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
  }) || null;
}

export async function listRevisions(mixDesignId: string): Promise<MixDesignRevision[]> {
  const revisions = await revisionsStore.findAll({ mixDesignId } as any);
  return revisions.sort((a, b) => b.revisionNumber - a.revisionNumber);
}

// ============================================================================
// Approval Workflow
// ============================================================================

export async function submitRevisionForReview(
  revisionId: string,
  userId: string
): Promise<MixDesignRevision> {
  const revision = await revisionsStore.findById(revisionId);
  if (!revision) {
    throw new Error(`Revision ${revisionId} not found`);
  }

  if (revision.status !== 'draft') {
    throw new Error(`Revision is not in draft status (current: ${revision.status})`);
  }

  const updated = await revisionsStore.update(revisionId, {
    status: 'under_review',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'MixDesignRevision',
    entityId: revisionId,
    action: 'submit',
    before: { status: 'draft' },
    after: { status: 'under_review' },
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Revision submitted for review',
  });

  return updated;
}

export async function reviewRevision(
  revisionId: string,
  reviewerId: string,
  reviewNotes: string,
  approved: boolean
): Promise<MixDesignRevision> {
  const revision = await revisionsStore.findById(revisionId);
  if (!revision) {
    throw new Error(`Revision ${revisionId} not found`);
  }

  if (revision.status !== 'under_review') {
    throw new Error(`Revision is not under review (current: ${revision.status})`);
  }

  // Self-review check
  if (revision.draftedBy === reviewerId) {
    throw new Error('Cannot review your own revision (self-approval not allowed)');
  }

  const newStatus = approved ? 'approved' : 'rejected';
  const updated = await revisionsStore.update(revisionId, {
    status: newStatus,
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
    reviewNotes,
    ...(approved && {
      approvedBy: reviewerId,
      approvedAt: new Date().toISOString(),
      approvalNotes: reviewNotes,
    }),
    updatedAt: new Date().toISOString(),
  });

  // Update mix design status
  const mixDesign = await mixDesignsStore.findById(revision.mixDesignId);
  if (mixDesign) {
    await mixDesignsStore.update(mixDesign.id, {
      status: approved ? 'approved' : 'draft',
      updatedAt: new Date().toISOString(),
    });
  }

  await recordAudit({
    entityType: 'MixDesignRevision',
    entityId: revisionId,
    action: approved ? 'approve' : 'reject',
    before: { status: 'under_review' },
    after: { status: newStatus, reviewNotes },
    actorId: reviewerId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Revision ${approved ? 'approved' : 'rejected'}: ${reviewNotes}`,
  });

  return updated;
}

export async function suspendRevision(
  revisionId: string,
  userId: string,
  reason: string
): Promise<MixDesignRevision> {
  const revision = await revisionsStore.findById(revisionId);
  if (!revision) {
    throw new Error(`Revision ${revisionId} not found`);
  }

  if (revision.status !== 'approved') {
    throw new Error(`Only approved revisions can be suspended (current: ${revision.status})`);
  }

  const updated = await revisionsStore.update(revisionId, {
    status: 'suspended',
    updatedAt: new Date().toISOString(),
  });

  // Update mix design status
  const mixDesign = await mixDesignsStore.findById(revision.mixDesignId);
  if (mixDesign) {
    await mixDesignsStore.update(mixDesign.id, {
      status: 'suspended',
      updatedAt: new Date().toISOString(),
    });
  }

  // Alert open production orders using this revision
  await raiseAlert({
    ruleCode: 'MIX_DESIGN_SUSPENDED',
    severity: 'high',
    title: `Mix Design Revision Suspended`,
    description: `Mix design ${mixDesign?.mixDesignCode} revision ${revision.revisionNumber} has been suspended. Open production orders may be affected.`,
    module: 'Mix Design',
    entityType: 'MixDesignRevision',
    entityId: revisionId,
    responsibleRole: 'plant_manager',
    recommendedAction: 'Review open production orders and select alternative mix design',
    dueInHours: 24,
    requestId: generateId(),
  });

  await recordAudit({
    entityType: 'MixDesignRevision',
    entityId: revisionId,
    action: 'update',
    before: { status: 'approved' },
    after: { status: 'suspended', reason },
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Revision suspended: ${reason}`,
  });

  return updated;
}

// ============================================================================
// Moisture Correction
// ============================================================================

export async function addMoistureData(
  data: Omit<AggregateMoistureData, 'id' | 'createdAt' | 'updatedAt' | 'isStale'>
): Promise<AggregateMoistureData> {
  const config = await getMixDesignConfiguration();
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + config.moistureDataMaxAgeHours);

  const moistureData: AggregateMoistureData = {
    ...data,
    id: generateId(),
    isStale: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await moistureDataStore.create(moistureData);

  return moistureData;
}

export async function getLatestMoistureData(
  aggregateType: string,
  aggregateName: string
): Promise<AggregateMoistureData | null> {
  const all = await moistureDataStore.findAll();
  const matching = all.filter(m => 
    m.aggregateType === aggregateType && 
    m.aggregateName === aggregateName
  );
  
  if (matching.length === 0) return null;
  
  // Return most recent
  return matching.sort((a, b) => 
    new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  )[0];
}

export async function checkStaleMoistureData(): Promise<number> {
  const config = await getMixDesignConfiguration();
  const now = new Date();
  const all = await moistureDataStore.findAll();
  let staleCount = 0;

  for (const data of all) {
    const testDate = new Date(data.testDate);
    const ageHours = (now.getTime() - testDate.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > config.moistureDataMaxAgeHours && !data.isStale) {
      await moistureDataStore.update(data.id, {
        isStale: true,
        updatedAt: new Date().toISOString(),
      });

      await raiseAlert({
        ruleCode: 'MOISTURE_DATA_STALE',
        severity: 'warning',
        title: `Moisture Data Stale: ${data.aggregateName}`,
        description: `Moisture data for ${data.aggregateName} is ${Math.round(ageHours)} hours old (max ${config.moistureDataMaxAgeHours} hours)`,
        module: 'Mix Design',
        entityType: 'AggregateMoistureData',
        entityId: data.id,
        responsibleRole: 'qc_manager',
        recommendedAction: 'Perform new moisture test',
        dueInHours: 24,
        requestId: generateId(),
      });

      staleCount++;
    }
  }

  return staleCount;
}

export async function calculateMoistureCorrection(
  ingredients: MixDesignIngredient[],
  batchVolume: number // m³
): Promise<CorrectedBatchWeights> {
  const corrections: MoistureCorrectionResult[] = [];
  let totalWaterReduction = 0;
  let totalAggregateAdjustment = 0;
  let maxAgeHours = 0;

  for (const ingredient of ingredients) {
    if (ingredient.category !== 'fine_aggregate' && ingredient.category !== 'coarse_aggregate') {
      continue;
    }

    // Get moisture data
    const moistureData = await getLatestMoistureData(ingredient.category, ingredient.name);
    if (!moistureData) {
      continue; // No moisture data available
    }

    // Check if stale
    const config = await getMixDesignConfiguration();
    const now = new Date();
    const testDate = new Date(moistureData.testDate);
    const ageHours = (now.getTime() - testDate.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > config.moistureDataMaxAgeHours) {
      // Stale data - skip correction
      continue;
    }
    
    // Track maximum age
    if (ageHours > maxAgeHours) {
      maxAgeHours = ageHours;
    }

    // Calculate corrections
    const nominalWeight = ingredient.quantity * batchVolume;
    const actualMoisture = moistureData.moistureContent;
    const actualAbsorption = moistureData.absorption;

    // Free moisture = moisture content - absorption
    const freeMoisture = actualMoisture - actualAbsorption;

    // Aggregate adjustment: add free moisture weight to aggregate
    const moistureAdjustment = (nominalWeight * freeMoisture) / 100;
    const correctedWeight = nominalWeight + moistureAdjustment;

    // Water reduction: reduce mixing water by free moisture amount
    const waterReduction = moistureAdjustment;

    corrections.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      nominalWeight: Math.round(nominalWeight * 100) / 100,
      nominalMoisture: 0, // Design assumes SSD condition
      actualMoisture,
      actualAbsorption,
      moistureAdjustment: Math.round(moistureAdjustment * 100) / 100,
      correctedWeight: Math.round(correctedWeight * 100) / 100,
      waterReduction: Math.round(waterReduction * 100) / 100,
      moistureDataId: moistureData.id,
      moistureDataDate: moistureData.testDate,
    });

    totalWaterReduction += waterReduction;
    totalAggregateAdjustment += moistureAdjustment;
  }

  // Calculate corrected totals
  const waterIngredient = ingredients.find(i => i.category === 'water');
  const originalWaterWeight = waterIngredient ? waterIngredient.quantity * batchVolume : 0;
  const correctedWaterWeight = originalWaterWeight - totalWaterReduction;

  const originalBatchWeight = ingredients.reduce((sum, i) => {
    if (i.unit === 'kg/m³') return sum + i.quantity * batchVolume;
    if (i.unit === 'litres/m³') return sum + i.quantity * batchVolume;
    return sum;
  }, 0);

  const correctedBatchWeight = originalBatchWeight + totalAggregateAdjustment - totalWaterReduction;

  return {
    batchId: '', // Will be set when creating batch
    originalIngredients: ingredients.map(i => ({
      ingredientId: i.id,
      ingredientName: i.name,
      originalWeight: i.quantity * batchVolume,
    })),
    corrections,
    totalWaterReduction: Math.round(totalWaterReduction * 100) / 100,
    totalAggregateAdjustment: Math.round(totalAggregateAdjustment * 100) / 100,
    correctedWaterWeight: Math.round(correctedWaterWeight * 100) / 100,
    correctedBatchWeight: Math.round(correctedBatchWeight * 100) / 100,
    calculatedAt: new Date().toISOString(),
    moistureDataAge: maxAgeHours,
  };
}

// ============================================================================
// Cost Calculation
// ============================================================================

export async function calculateMixDesignCost(
  mixDesignId: string,
  revisionNumber: number,
  materialCosts: Record<string, number> // ingredientId -> cost per unit
): Promise<MixDesignCost> {
  const revision = await getRevisionByNumber(mixDesignId, revisionNumber);
  if (!revision) {
    throw new Error(`Revision ${revisionNumber} not found for mix design ${mixDesignId}`);
  }

  const ingredientCosts = revision.ingredients.map(ingredient => {
    const unitCost = materialCosts[ingredient.id] || 0;
    const totalCost = ingredient.quantity * unitCost;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unitCost: Math.round(unitCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
    };
  });

  const materialCostPerM3 = ingredientCosts.reduce((sum, c) => sum + c.totalCost, 0);

  return {
    mixDesignId,
    revisionNumber,
    materialCostPerM3: Math.round(materialCostPerM3 * 100) / 100,
    ingredientCosts,
    calculatedAt: new Date().toISOString(),
    materialCostDate: new Date().toISOString().split('T')[0],
  };
}

// ============================================================================
// Theoretical Material Requirements
// ============================================================================

export async function calculateTheoreticalRequirements(
  mixDesignId: string,
  revisionNumber: number,
  volume: number, // m³
  productionOrderId?: string,
  batchId?: string
): Promise<TheoreticalMaterialRequirement> {
  const revision = await getRevisionByNumber(mixDesignId, revisionNumber);
  if (!revision) {
    throw new Error(`Revision ${revisionNumber} not found for mix design ${mixDesignId}`);
  }

  const materials = revision.ingredients.map(ingredient => ({
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    category: ingredient.category,
    quantityPerM3: ingredient.quantity,
    unit: ingredient.unit,
    totalQuantity: Math.round(ingredient.quantity * volume * 100) / 100,
  }));

  // Calculate totals
  const totalBinder = materials
    .filter(m => ['cement', 'fly_ash', 'ggbs', 'silica_fume'].includes(m.category))
    .reduce((sum, m) => sum + m.totalQuantity, 0);

  const totalWater = materials
    .filter(m => m.category === 'water')
    .reduce((sum, m) => sum + m.totalQuantity, 0);

  const totalAggregate = materials
    .filter(m => ['fine_aggregate', 'coarse_aggregate'].includes(m.category))
    .reduce((sum, m) => sum + m.totalQuantity, 0);

  return {
    productionOrderId,
    batchId,
    mixDesignId,
    revisionNumber,
    volume,
    materials,
    totalBinder: Math.round(totalBinder * 100) / 100,
    totalWater: Math.round(totalWater * 100) / 100,
    totalAggregate: Math.round(totalAggregate * 100) / 100,
    calculatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Trial Management
// ============================================================================

export async function createTrial(
  data: Omit<MixDesignTrial, 'id' | 'trialNumber' | 'createdAt' | 'updatedAt'>
): Promise<MixDesignTrial> {
  const trialNumber = `TRIAL-${Date.now()}`;

  const trial: MixDesignTrial = {
    ...data,
    id: generateId(),
    trialNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await trialsStore.create(trial);

  // Update mix design status to under_trial
  const mixDesign = await mixDesignsStore.findById(data.mixDesignId);
  if (mixDesign && mixDesign.status === 'draft') {
    await mixDesignsStore.update(mixDesign.id, {
      status: 'under_trial',
      updatedAt: new Date().toISOString(),
    });
  }

  await recordAudit({
    entityType: 'MixDesignTrial',
    entityId: trial.id,
    action: 'create',
    before: null,
    after: trial as any,
    actorId: data.createdBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Trial ${trialNumber} created`,
  });

  return trial;
}

export async function listTrials(mixDesignId?: string): Promise<MixDesignTrial[]> {
  let trials = await trialsStore.findAll();
  
  if (mixDesignId) {
    trials = trials.filter(t => t.mixDesignId === mixDesignId);
  }

  return trials.sort((a, b) => new Date(b.trialDate).getTime() - new Date(a.trialDate).getTime());
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultMixDesigns(): Promise<void> {
  const existing = await mixDesignsStore.findAll();
  if (existing.length > 0) return;

  // Create sample mix designs
  const m25Design = await createMixDesign({
    mixDesignCode: 'M25-STD',
    name: 'M25 Standard Mix',
    grade: 'M25',
    exposureCondition: 'moderate',
    type: 'standard',
    maxAggregateSize: 20,
    targetSlump: 100,
    targetMeanStrength: 33,
    applicablePlantIds: ['plant-1', 'plant-2'],
    ingredients: [
      {
        id: generateId(),
        mixDesignId: '',
        category: 'cement',
        name: 'OPC 53 Grade',
        type: 'OPC',
        quantity: 340,
        unit: 'kg/m³',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        mixDesignId: '',
        category: 'fine_aggregate',
        name: 'River Sand',
        type: 'Zone II',
        quantity: 720,
        unit: 'kg/m³',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        mixDesignId: '',
        category: 'coarse_aggregate',
        name: '20mm Aggregate',
        quantity: 1080,
        unit: 'kg/m³',
        createdAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        mixDesignId: '',
        category: 'water',
        name: 'Water',
        quantity: 170,
        unit: 'litres/m³',
        createdAt: new Date().toISOString(),
      },
    ],
    referenceStandards: [
      {
        id: generateId(),
        mixDesignId: '',
        standardCode: 'IS 10262:2019',
        standardName: 'Guidelines for Concrete Mix Proportioning',
        effectiveFrom: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ],
    status: 'draft',
    createdBy: 'qc_manager_1',
  });

  // Approve the revision
  const revision = await getCurrentApprovedRevision(m25Design.id) || 
    (await listRevisions(m25Design.id))[0];
  
  if (revision && revision.status === 'draft') {
    await submitRevisionForReview(revision.id, 'qc_manager_1');
    await reviewRevision(revision.id, 'technical_authority_1', 'Approved for production', true);
  }
}
