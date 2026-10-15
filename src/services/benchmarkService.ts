/**
 * Part 10 — Benchmark Service
 * 
 * Manages fuel consumption benchmarks with versioning, approval workflow, and review suggestions
 */

import { storage } from './storage';
import { FuelBenchmark, ConditionFactor, BenchmarkReviewSuggestion } from './fuelVerificationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getAsset } from './assets';

const benchmarksStore = storage.getAdapter<FuelBenchmark>('fuel_benchmarks');
const reviewSuggestionsStore = storage.getAdapter<BenchmarkReviewSuggestion>('benchmark_review_suggestions');

// ============================================================================
// Benchmark CRUD
// ============================================================================

export async function createBenchmark(
  inputData: Omit<FuelBenchmark, 'id' | 'version' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<FuelBenchmark> {
  // Determine version (start at 1 for new benchmarks)
  const existingBenchmarks = await benchmarksStore.findAll();
  const sameScopeBenchmarks = existingBenchmarks.filter(b => 
    b.assetId === inputData.assetId &&
    b.make === inputData.make &&
    b.model === inputData.model &&
    b.assetCategory === inputData.assetCategory
  );
  
  const version = sameScopeBenchmarks.length > 0 
    ? Math.max(...sameScopeBenchmarks.map(b => b.version)) + 1
    : 1;

  const benchmark: FuelBenchmark = {
    ...inputData,
    id: generateId(),
    version,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await benchmarksStore.create(benchmark);

  await recordAudit({
    entityType: 'FuelBenchmark',
    entityId: benchmark.id,
    action: 'create',
    before: null,
    after: benchmark as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel benchmark created',
  });

  return benchmark;
}

export async function getBenchmark(id: string): Promise<FuelBenchmark | null> {
  return benchmarksStore.findById(id);
}

export async function listBenchmarks(filters?: {
  assetId?: string;
  make?: string;
  model?: string;
  assetCategory?: string;
  status?: string;
}): Promise<FuelBenchmark[]> {
  let benchmarks = await benchmarksStore.findAll();

  if (filters?.assetId) {
    benchmarks = benchmarks.filter(b => b.assetId === filters.assetId);
  }
  if (filters?.make) {
    benchmarks = benchmarks.filter(b => b.make === filters.make);
  }
  if (filters?.model) {
    benchmarks = benchmarks.filter(b => b.model === filters.model);
  }
  if (filters?.assetCategory) {
    benchmarks = benchmarks.filter(b => b.assetCategory === filters.assetCategory);
  }
  if (filters?.status) {
    benchmarks = benchmarks.filter(b => b.status === filters.status);
  }

  return benchmarks.sort((a, b) => b.version - a.version);
}

export async function updateBenchmark(
  id: string,
  updates: Partial<FuelBenchmark>,
  userId: string
): Promise<FuelBenchmark> {
  const benchmark = await benchmarksStore.findById(id);
  if (!benchmark) {
    throw new Error(`Benchmark ${id} not found`);
  }

  if (benchmark.status === 'approved') {
    throw new Error('Cannot update approved benchmark. Create a new version instead.');
  }

  const updated = await benchmarksStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelBenchmark',
    entityId: id,
    action: 'update',
    before: benchmark as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Benchmark updated',
  });

  return updated;
}

// ============================================================================
// Benchmark Approval (Maker-Checker)
// ============================================================================

export async function proposeBenchmark(
  id: string,
  proposedBy: string
): Promise<FuelBenchmark> {
  const benchmark = await benchmarksStore.findById(id);
  if (!benchmark) {
    throw new Error(`Benchmark ${id} not found`);
  }

  if (benchmark.status !== 'draft') {
    throw new Error(`Benchmark is not in draft status (current: ${benchmark.status})`);
  }

  const updated = await benchmarksStore.update(id, {
    proposedBy,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelBenchmark',
    entityId: id,
    action: 'submit',
    before: benchmark as any,
    after: updated as any,
    actorId: proposedBy,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: 'Benchmark proposed for approval',
  });

  return updated;
}

export async function approveBenchmark(
  id: string,
  approvedBy: string
): Promise<FuelBenchmark> {
  const benchmark = await benchmarksStore.findById(id);
  if (!benchmark) {
    throw new Error(`Benchmark ${id} not found`);
  }

  // Maker-checker: cannot approve own proposal
  if (benchmark.proposedBy === approvedBy) {
    throw new Error('Cannot approve your own benchmark proposal');
  }

  // Supersede previous approved benchmarks with same scope
  const existingBenchmarks = await benchmarksStore.findAll();
  for (const existing of existingBenchmarks) {
    if (
      existing.id !== id &&
      existing.status === 'approved' &&
      existing.assetId === benchmark.assetId &&
      existing.make === benchmark.make &&
      existing.model === benchmark.model &&
      existing.assetCategory === benchmark.assetCategory
    ) {
      await benchmarksStore.update(existing.id, {
        status: 'superseded',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const updated = await benchmarksStore.update(id, {
    status: 'approved',
    approvedBy,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelBenchmark',
    entityId: id,
    action: 'approve',
    before: benchmark as any,
    after: updated as any,
    actorId: approvedBy,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'Benchmark approved',
  });

  return updated;
}

// ============================================================================
// Benchmark Resolution
// ============================================================================

/**
 * Get the applicable benchmark for an asset on a specific date
 * Resolution order: asset-specific → make/model → asset-category
 */
export async function getApplicableBenchmark(
  assetId: string,
  date: string
): Promise<FuelBenchmark | null> {
  const asset = await getAsset(assetId);
  if (!asset) {
    return null;
  }

  const allBenchmarks = await benchmarksStore.findAll({ status: 'approved' } as any);
  
  // Filter benchmarks effective on the given date
  const effectiveBenchmarks = allBenchmarks.filter(b => {
    const effectiveFrom = new Date(b.effectiveFrom);
    const effectiveTo = b.effectiveTo ? new Date(b.effectiveTo) : null;
    const checkDate = new Date(date);
    
    return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
  });

  // Resolution order 1: Asset-specific benchmark
  const assetSpecific = effectiveBenchmarks.find(b => b.assetId === assetId);
  if (assetSpecific) {
    return assetSpecific;
  }

  // Resolution order 2: Make/model benchmark
  const makeModel = effectiveBenchmarks.find(b => 
    b.make === asset.make && 
    b.model === asset.model && 
    !b.assetId
  );
  if (makeModel) {
    return makeModel;
  }

  // Resolution order 3: Asset category benchmark
  const category = effectiveBenchmarks.find(b => 
    b.assetCategory === asset.category && 
    !b.make && 
    !b.model && 
    !b.assetId
  );
  
  return category || null;
}

// ============================================================================
// Condition Factors
// ============================================================================

export async function addConditionFactor(
  benchmarkId: string,
  factor: Omit<ConditionFactor, 'id' | 'benchmarkId' | 'createdAt'>
): Promise<FuelBenchmark> {
  const benchmark = await benchmarksStore.findById(benchmarkId);
  if (!benchmark) {
    throw new Error(`Benchmark ${benchmarkId} not found`);
  }

  const newFactor: ConditionFactor = {
    ...factor,
    id: generateId(),
    benchmarkId,
    createdAt: new Date().toISOString(),
  };

  const updated = await benchmarksStore.update(benchmarkId, {
    conditionFactors: [...benchmark.conditionFactors, newFactor],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelBenchmark',
    entityId: benchmarkId,
    action: 'update',
    before: benchmark as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Condition factor added: ${factor.factorType}=${factor.factorValue}`,
  });

  return updated;
}

/**
 * Calculate the condition factor multiplier for a given set of conditions
 */
export function calculateConditionMultiplier(
  benchmark: FuelBenchmark,
  conditions: Record<string, string>
): number {
  let multiplier = 1.0;

  for (const factor of benchmark.conditionFactors) {
    const conditionValue = conditions[factor.factorType];
    if (conditionValue === factor.factorValue) {
      multiplier *= factor.multiplier;
    }
  }

  return multiplier;
}

// ============================================================================
// Benchmark Review Suggestions
// ============================================================================

export async function createReviewSuggestion(
  inputData: Omit<BenchmarkReviewSuggestion, 'id' | 'status' | 'createdAt'>
): Promise<BenchmarkReviewSuggestion> {
  const suggestion: BenchmarkReviewSuggestion = {
    ...inputData,
    id: generateId(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await reviewSuggestionsStore.create(suggestion);

  await recordAudit({
    entityType: 'BenchmarkReviewSuggestion',
    entityId: suggestion.id,
    action: 'create',
    before: null,
    after: suggestion as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Benchmark review suggestion created',
  });

  return suggestion;
}

export async function listReviewSuggestions(filters?: {
  benchmarkId?: string;
  status?: string;
}): Promise<BenchmarkReviewSuggestion[]> {
  let suggestions = await reviewSuggestionsStore.findAll();

  if (filters?.benchmarkId) {
    suggestions = suggestions.filter(s => s.benchmarkId === filters.benchmarkId);
  }
  if (filters?.status) {
    suggestions = suggestions.filter(s => s.status === filters.status);
  }

  return suggestions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function reviewSuggestion(
  id: string,
  status: 'accepted' | 'rejected',
  reviewedBy: string
): Promise<BenchmarkReviewSuggestion> {
  const suggestion = await reviewSuggestionsStore.findById(id);
  if (!suggestion) {
    throw new Error(`Review suggestion ${id} not found`);
  }

  const updated = await reviewSuggestionsStore.update(id, {
    status,
    reviewedBy,
    reviewedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'BenchmarkReviewSuggestion',
    entityId: id,
    action: 'update',
    before: suggestion as any,
    after: updated as any,
    actorId: reviewedBy,
    actorRole: 'fleet_manager',
    requestId: generateId(),
    reason: `Review suggestion ${status}`,
  });

  return updated;
}

/**
 * Generate review suggestions based on 30-day median actuals vs benchmark
 */
export async function generateReviewSuggestions(
  verificationResults: Array<{
    assetId: string;
    benchmarkId: string;
    actualRate: number;
    date: string;
  }>,
  marginPercent: number = 15
): Promise<BenchmarkReviewSuggestion[]> {
  const suggestions: BenchmarkReviewSuggestion[] = [];

  // Group by benchmark
  const byBenchmark = new Map<string, typeof verificationResults>();
  for (const result of verificationResults) {
    const existing = byBenchmark.get(result.benchmarkId) || [];
    existing.push(result);
    byBenchmark.set(result.benchmarkId, existing);
  }

  // Analyze each benchmark
  for (const [benchmarkId, results] of byBenchmark) {
    const benchmark = await getBenchmark(benchmarkId);
    if (!benchmark || benchmark.status !== 'approved') continue;

    // Calculate median actual rate
    const rates = results.map(r => r.actualRate).sort((a, b) => a - b);
    const median = rates[Math.floor(rates.length / 2)];

    // Calculate difference percentage
    const differencePercent = ((median - benchmark.baseValue) / benchmark.baseValue) * 100;

    // Check if difference exceeds margin
    if (Math.abs(differencePercent) > marginPercent) {
      const suggestion = await createReviewSuggestion({
        benchmarkId,
        assetId: results[0].assetId,
        make: benchmark.make,
        model: benchmark.model,
        periodDays: 30,
        medianActual: median,
        benchmarkValue: benchmark.baseValue,
        differencePercent,
        suggestedAction: differencePercent > 0 ? 'increase_benchmark' : 'decrease_benchmark',
        reason: `30-day median actual (${median.toFixed(2)} ${benchmark.unit}) differs from benchmark (${benchmark.baseValue} ${benchmark.unit}) by ${differencePercent.toFixed(1)}%`,
      });

      suggestions.push(suggestion);
    }
  }

  return suggestions;
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultBenchmarks(): Promise<void> {
  const existing = await benchmarksStore.findAll();
  if (existing.length > 0) return;

  const benchmarks = [
    {
      assetCategory: 'earthmoving',
      make: 'CAT',
      model: '320',
      baseValue: 14.0,
      unit: 'L/hr' as const,
      source: 'OEM_specification' as const,
      isComposite: false,
      conditionFactors: [],
      warningToleranceLower: -10,
      warningToleranceUpper: 10,
      criticalToleranceLower: -20,
      criticalToleranceUpper: 20,
      absoluteMinimumToleranceLitres: 5,
      minimumUsageHours: 2,
      minimumUsageKilometres: 20,
      effectiveFrom: '2024-01-01',
      proposedBy: 'fleet_manager_1',
      approvedBy: 'maintenance_manager_1',
      approvedAt: new Date().toISOString(),
    },
    {
      assetCategory: 'transport',
      make: 'Tata',
      model: 'Signet 40k',
      baseValue: 0.30,
      unit: 'L/km' as const,
      source: 'historical_baseline' as const,
      isComposite: false,
      conditionFactors: [],
      warningToleranceLower: -10,
      warningToleranceUpper: 10,
      criticalToleranceLower: -20,
      criticalToleranceUpper: 20,
      absoluteMinimumToleranceLitres: 5,
      minimumUsageHours: 2,
      minimumUsageKilometres: 20,
      effectiveFrom: '2024-01-01',
      proposedBy: 'fleet_manager_1',
      approvedBy: 'maintenance_manager_1',
      approvedAt: new Date().toISOString(),
    },
  ];

  for (const b of benchmarks) {
    await createBenchmark(b);
    // Auto-approve for demo purposes
    const created = await benchmarksStore.findAll();
    const latest = created[created.length - 1];
    await approveBenchmark(latest.id, 'maintenance_manager_1');
  }
}
