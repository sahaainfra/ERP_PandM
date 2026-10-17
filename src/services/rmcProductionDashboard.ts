/**
 * Part 23 — RMC Production Dashboard Service
 */

import { storage } from './storage';
import { RMCProductionKPI, RMCProductionByPlant, RMCProductionByGrade } from './dashboardPart23Types';
import { generateId } from './utils';
import { listBatches } from './batchService';
import { listPlants } from './rmcPlantService';
import { listProductionOrders } from './productionOrderService';
import { listMaterialConsumptions } from './materialConsumptionService';
import { listMixDesigns } from './mixDesignService';
import { calculatePlantCost } from './costingService';

const rmcProductionStore = storage.getAdapter<RMCProductionKPI>('rmc_production_kpis');

// ============================================================================
// RMC Production KPI Calculation
// ============================================================================

export async function calculateRMCProductionKPI(
  period: string,
  startDate: string,
  endDate: string,
  filters?: {
    plantId?: string;
    grade?: string;
    projectId?: string;
  }
): Promise<RMCProductionKPI> {
  // Get all batches for the period
  let batches = await listBatches({
    fromDate: startDate,
    toDate: endDate,
    plantId: filters?.plantId,
  });
  
  // Filter by grade if specified
  if (filters?.grade) {
    batches = batches.filter(b => b.grade === filters.grade);
  }

  // Calculate production metrics
  const totalBatches = batches.length;
  const actualProduction = batches.reduce((sum, b) => sum + b.actualVolume, 0);
  
  // Get production orders for planned production
  let orders = await listProductionOrders({
    fromDate: startDate,
    toDate: endDate,
  });
  
  if (filters?.plantId) {
    orders = orders.filter(o => o.plantId === filters.plantId);
  }
  const plannedProduction = orders.reduce((sum, o) => sum + o.orderedQuantity, 0);
  
  const productionVariance = actualProduction - plannedProduction;
  const productionVariancePercent = plannedProduction > 0 
    ? (productionVariance / plannedProduction) * 100 
    : 0;

  // Calculate batch duration metrics
  const batchDurations = batches
    .filter(b => b.batchStartTime && b.batchEndTime)
    .map(b => {
      const start = new Date(b.batchStartTime!).getTime();
      const end = new Date(b.batchEndTime!).getTime();
      return (end - start) / (1000 * 60); // minutes
    });
  
  const averageBatchDuration = batchDurations.length > 0
    ? batchDurations.reduce((sum, d) => sum + d, 0) / batchDurations.length
    : 0;

  // Calculate plant utilization
  const plants = await listPlants();
  const filteredPlants = filters?.plantId 
    ? plants.filter(p => p.id === filters.plantId)
    : plants;
  
  const totalPlantCapacity = filteredPlants.reduce((sum, p) => sum + p.practicalCapacity, 0);
  const totalAvailableHours = filteredPlants.length * 24 * 30; // Assume 30 days, 24 hours
  const totalOperatingHours = batchDurations.reduce((sum, d) => sum + d, 0) / 60; // Convert to hours
  const plantUtilization = totalAvailableHours > 0
    ? (totalOperatingHours / totalAvailableHours) * 100
    : 0;

  // Calculate material consumption vs theoretical
  const consumptions = await listMaterialConsumptions({
    fromDate: startDate,
    toDate: endDate,
  });

  const theoreticalConsumption: Record<string, number> = {};
  const actualConsumption: Record<string, number> = {};
  const consumptionVariance: Record<string, number> = {};

  for (const consumption of consumptions) {
    const material = consumption.materialName;
    theoreticalConsumption[material] = (theoreticalConsumption[material] || 0) + consumption.theoreticalQuantity;
    actualConsumption[material] = (actualConsumption[material] || 0) + consumption.actualQuantity;
    consumptionVariance[material] = (consumptionVariance[material] || 0) + consumption.variance;
  }

  // Calculate cost per m³
  let totalProductionCost = 0;
  let costPerM3 = 0;
  
  if (actualProduction > 0) {
    // Get plant costs
    for (const plant of filteredPlants) {
      const plantCost = await calculatePlantCost(plant.id, period, startDate, endDate);
      totalProductionCost += plantCost.totalCost;
    }
    costPerM3 = totalProductionCost / actualProduction;
  }

  // Calculate quality metrics (mock data - would need actual wastage/return tracking)
  const wastageM3 = actualProduction * 0.02; // Assume 2% wastage
  const rejectedM3 = batches.filter(b => b.qualityStatus === 'rejected').reduce((sum, b) => sum + b.actualVolume, 0);
  const returnedM3 = 0; // Would need return tracking

  // Calculate schedule metrics
  const orderBacklog = orders.filter(o => o.status === 'planned' || o.status === 'in_progress').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const scheduleAdherence = orders.length > 0
    ? (completedOrders / orders.length) * 100
    : 100;

  const kpi: RMCProductionKPI = {
    id: generateId(),
    period,
    plannedProduction: Math.round(plannedProduction * 100) / 100,
    actualProduction: Math.round(actualProduction * 100) / 100,
    productionVariance: Math.round(productionVariance * 100) / 100,
    productionVariancePercent: Math.round(productionVariancePercent * 10) / 10,
    totalBatches,
    averageBatchDuration: Math.round(averageBatchDuration),
    plantUtilization: Math.round(plantUtilization * 10) / 10,
    theoreticalConsumption,
    actualConsumption,
    consumptionVariance,
    costPerM3: Math.round(costPerM3 * 100) / 100,
    totalProductionCost: Math.round(totalProductionCost * 100) / 100,
    wastageM3: Math.round(wastageM3 * 100) / 100,
    rejectedM3: Math.round(rejectedM3 * 100) / 100,
    returnedM3: Math.round(returnedM3 * 100) / 100,
    orderBacklog,
    scheduleAdherence: Math.round(scheduleAdherence * 10) / 10,
    dataSource: 'integrated_live',
    lastRefreshedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await rmcProductionStore.create(kpi);
  return kpi;
}

export async function getRMCProductionKPI(id: string): Promise<RMCProductionKPI | null> {
  return rmcProductionStore.findById(id);
}

export async function getLatestRMCProductionKPI(period: string): Promise<RMCProductionKPI | null> {
  const all = await rmcProductionStore.findAll();
  const periodKPIs = all.filter(k => k.period === period);
  return periodKPIs.length > 0 ? periodKPIs[periodKPIs.length - 1] : null;
}

// ============================================================================
// Production by Plant
// ============================================================================

export async function getRMCProductionByPlant(
  startDate: string,
  endDate: string
): Promise<RMCProductionByPlant[]> {
  const plants = await listPlants();
  const results: RMCProductionByPlant[] = [];

  for (const plant of plants) {
    const batches = await listBatches({
      plantId: plant.id,
      fromDate: startDate,
      toDate: endDate,
    });

    const orders = await listProductionOrders({
      plantId: plant.id,
      fromDate: startDate,
      toDate: endDate,
    });

    const actualProduction = batches.reduce((sum, b) => sum + b.actualVolume, 0);
    const plannedProduction = orders.reduce((sum, o) => sum + o.orderedQuantity, 0);
    const batchCount = batches.length;

    // Calculate utilization
    const availableHours = 24 * 30; // 30 days
    const operatingHours = batches
      .filter(b => b.batchStartTime && b.batchEndTime)
      .reduce((sum, b) => {
        const start = new Date(b.batchStartTime!).getTime();
        const end = new Date(b.batchEndTime!).getTime();
        return sum + ((end - start) / (1000 * 60 * 60)); // hours
      }, 0);
    const utilization = availableHours > 0 ? (operatingHours / availableHours) * 100 : 0;

    // Calculate cost per m³
    const plantCost = await calculatePlantCost(plant.id, 'monthly', startDate, endDate);
    const costPerM3 = actualProduction > 0 ? plantCost.totalCost / actualProduction : 0;

    results.push({
      plantId: plant.id,
      plantName: plant.name,
      plannedProduction: Math.round(plannedProduction * 100) / 100,
      actualProduction: Math.round(actualProduction * 100) / 100,
      batchCount,
      utilization: Math.round(utilization * 10) / 10,
      costPerM3: Math.round(costPerM3 * 100) / 100,
    });
  }

  return results;
}

// ============================================================================
// Production by Grade
// ============================================================================

export async function getRMCProductionByGrade(
  startDate: string,
  endDate: string
): Promise<RMCProductionByGrade[]> {
  const batches = await listBatches({
    fromDate: startDate,
    toDate: endDate,
  });

  const gradeMap = new Map<string, {
    totalProduction: number;
    batchCount: number;
    totalCost: number;
  }>();

  for (const batch of batches) {
    const grade = batch.grade;
    const existing = gradeMap.get(grade) || {
      totalProduction: 0,
      batchCount: 0,
      totalCost: 0,
    };

    existing.totalProduction += batch.actualVolume;
    existing.batchCount += 1;
    
    // Get cost for this batch (simplified - would need actual cost tracking)
    existing.totalCost += batch.actualVolume * 4500; // Assume ₹4500/m³ average

    gradeMap.set(grade, existing);
  }

  const results: RMCProductionByGrade[] = [];
  for (const [grade, data] of gradeMap.entries()) {
    results.push({
      grade,
      totalProduction: Math.round(data.totalProduction * 100) / 100,
      batchCount: data.batchCount,
      averageCostPerM3: data.totalProduction > 0 
        ? Math.round((data.totalCost / data.totalProduction) * 100) / 100
        : 0,
    });
  }

  return results.sort((a, b) => b.totalProduction - a.totalProduction);
}

// ============================================================================
// Stock Level Monitoring
// ============================================================================

export async function getStockLevels(plantId?: string): Promise<{
  material: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  stockOutRisk: 'low' | 'medium' | 'high';
  daysOfStock: number;
}[]> {
  // This would integrate with Part 15 inventory service
  // For now, return mock data
  return [
    {
      material: 'Cement',
      currentStock: 50000,
      unit: 'kg',
      reorderLevel: 20000,
      stockOutRisk: 'low',
      daysOfStock: 15,
    },
    {
      material: 'Sand',
      currentStock: 80000,
      unit: 'kg',
      reorderLevel: 30000,
      stockOutRisk: 'low',
      daysOfStock: 12,
    },
    {
      material: 'Aggregate 20mm',
      currentStock: 120000,
      unit: 'kg',
      reorderLevel: 50000,
      stockOutRisk: 'low',
      daysOfStock: 18,
    },
  ];
}

// ============================================================================
// Consumption Variance Analysis
// ============================================================================

export async function getConsumptionVariance(
  startDate: string,
  endDate: string
): Promise<{
  material: string;
  theoretical: number;
  actual: number;
  variance: number;
  variancePercent: number;
  status: 'within_tolerance' | 'warning' | 'critical';
}[]> {
  const consumptions = await listMaterialConsumptions({
    fromDate: startDate,
    toDate: endDate,
  });

  const materialMap = new Map<string, {
    theoretical: number;
    actual: number;
  }>();

  for (const consumption of consumptions) {
    const material = consumption.materialName;
    const existing = materialMap.get(material) || {
      theoretical: 0,
      actual: 0,
    };

    existing.theoretical += consumption.theoreticalQuantity;
    existing.actual += consumption.actualQuantity;

    materialMap.set(material, existing);
  }

  const results = [];
  for (const [material, data] of materialMap.entries()) {
    const variance = data.actual - data.theoretical;
    const variancePercent = data.theoretical > 0 
      ? (variance / data.theoretical) * 100 
      : 0;

    let status: 'within_tolerance' | 'warning' | 'critical' = 'within_tolerance';
    if (Math.abs(variancePercent) > 10) {
      status = 'critical';
    } else if (Math.abs(variancePercent) > 5) {
      status = 'warning';
    }

    results.push({
      material,
      theoretical: Math.round(data.theoretical * 100) / 100,
      actual: Math.round(data.actual * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      variancePercent: Math.round(variancePercent * 10) / 10,
      status,
    });
  }

  return results.sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
}
