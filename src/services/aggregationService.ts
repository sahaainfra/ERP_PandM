/**
 * Part 22 — Aggregation Service
 */

import { storage } from './storage';
import { AggregatedKPI, KPIPeriod, DataSourceLabel } from './dashboardTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { listAssets } from './assets';
import { listWorkOrders } from './workOrderService';
import { listBatches } from './batchService';
import { listFuelIssues } from './fuelIssues';
import { listRMCOrders } from './rmcOrderService';
import { listDispatches } from './dispatchService';
import { listPMPlans } from './pmPlanService';

const aggregatedKPIStore = storage.getAdapter<AggregatedKPI>('aggregated_kpis');

// ============================================================================
// Aggregation Engine
// ============================================================================

export async function aggregateKPI(
  kpiId: string,
  period: KPIPeriod,
  periodStart: string,
  periodEnd: string,
  scope?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  }
): Promise<AggregatedKPI> {
  // Check if already aggregated
  const existing = await getAggregatedKPI(kpiId, period, periodStart, scope);
  if (existing && !existing.isStale) {
    return existing;
  }

  // Calculate value based on KPI
  const { value, statusBreakdown, sourceLabels } = await calculateKPIValue(kpiId, periodStart, periodEnd, scope);

  // Calculate previous period value for comparison
  const previousPeriod = getPreviousPeriod(period, periodStart);
  const { value: previousValue } = await calculateKPIValue(kpiId, previousPeriod.start, previousPeriod.end, scope);

  // Calculate change
  const change = previousValue ? value - previousValue : 0;
  const changePercent = previousValue ? (change / previousValue) * 100 : 0;

  // Check if data is stale (older than 1 hour)
  const lastRefreshedAt = new Date().toISOString();
  const isStale = false; // Fresh data

  const aggregated: AggregatedKPI = {
    id: existing?.id || generateId(),
    kpiId,
    period,
    periodStart,
    periodEnd,
    value,
    previousValue,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 10) / 10,
    statusBreakdown,
    sourceLabels,
    lastRefreshedAt,
    isStale,
    scope: scope || {},
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (existing) {
    await aggregatedKPIStore.update(existing.id, aggregated);
  } else {
    await aggregatedKPIStore.create(aggregated);
  }

  return aggregated;
}

async function calculateKPIValue(
  kpiId: string,
  startDate: string,
  endDate: string,
  scope?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  }
): Promise<{
  value: number;
  statusBreakdown: Record<string, number>;
  sourceLabels: Record<DataSourceLabel, number>;
}> {
  // This is a simplified implementation - in production, this would query actual data sources
  // For now, return mock data based on KPI ID
  
  const statusBreakdown: Record<string, number> = {};
  const sourceLabels: Record<DataSourceLabel, number> = {
    integrated_live: 0,
    integrated_delayed: 0,
    imported: 0,
    manual: 0,
    approved: 0,
    pending: 0,
  };

  let value = 0;

  // Mock calculations based on KPI name patterns
  if (kpiId.includes('total_assets') || kpiId === '1') {
    const assets = await listAssets();
    const filtered = scope?.siteId 
      ? assets.filter(a => a.currentSiteId === scope.siteId)
      : assets;
    value = filtered.length;
    statusBreakdown['available'] = filtered.filter(a => a.status === 'available').length;
    statusBreakdown['deployed'] = filtered.filter(a => a.status === 'deployed').length;
    statusBreakdown['under_maintenance'] = filtered.filter(a => a.status === 'under_maintenance').length;
    statusBreakdown['idle'] = filtered.filter(a => a.status === 'idle').length;
    sourceLabels.approved = value;
  } else if (kpiId.includes('utilization') || kpiId === '2') {
    value = 75.5; // Mock percentage
    sourceLabels.approved = 1;
  } else if (kpiId.includes('rmc_production') || kpiId === '3') {
    const batches = await listBatches({ fromDate: startDate, toDate: endDate });
    const filtered = scope?.plantId
      ? batches.filter(b => b.plantId === scope.plantId)
      : batches;
    value = filtered.reduce((sum, b) => sum + b.actualVolume, 0);
    sourceLabels.approved = filtered.length;
  } else if (kpiId.includes('fuel_expenditure') || kpiId === '4') {
    const issues = await listFuelIssues({ fromDate: startDate, toDate: endDate });
    value = issues.reduce((sum, i) => sum + i.totalCost, 0);
    sourceLabels.approved = issues.length;
  } else if (kpiId.includes('verification_coverage') || kpiId === '5') {
    value = 92.3; // Mock percentage
    sourceLabels.approved = 1;
  } else if (kpiId.includes('maintenance_spend') || kpiId === '6') {
    const workOrders = await listWorkOrders({ fromDate: startDate, toDate: endDate });
    value = workOrders.reduce((sum, wo) => sum + wo.totalCost, 0);
    sourceLabels.approved = workOrders.length;
  } else if (kpiId.includes('pending_approvals') || kpiId === '7') {
    // Mock value - would need operator submission service
    value = 5;
    sourceLabels.pending = value;
  } else if (kpiId.includes('revenue') || kpiId === '8') {
    value = 2500000; // Mock revenue
    sourceLabels.approved = 1;
  } else if (kpiId.includes('gross_margin') || kpiId === '9') {
    value = 750000; // Mock margin
    sourceLabels.approved = 1;
  } else if (kpiId.includes('cost_per_m3') || kpiId === '10') {
    value = 4500; // Mock cost per m³
    sourceLabels.approved = 1;
  } else if (kpiId.includes('downtime') || kpiId === '11') {
    const workOrders = await listWorkOrders({ fromDate: startDate, toDate: endDate });
    value = workOrders.reduce((sum, wo) => {
      if (wo.downtimeStart && wo.downtimeEnd) {
        const hours = (new Date(wo.downtimeEnd).getTime() - new Date(wo.downtimeStart).getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);
    sourceLabels.approved = workOrders.length;
  } else if (kpiId.includes('open_orders') || kpiId === '12') {
    const orders = await listRMCOrders({ status: 'approved' });
    value = orders.length;
    sourceLabels.approved = value;
  } else if (kpiId.includes('dispatch_delays') || kpiId === '13') {
    const dispatches = await listDispatches({ fromDate: startDate, toDate: endDate });
    value = dispatches.filter(d => d.hasDelay).length;
    sourceLabels.approved = dispatches.length;
  } else if (kpiId.includes('calibration_compliance') || kpiId === '14') {
    value = 88.5; // Mock percentage
    sourceLabels.approved = 1;
  } else if (kpiId.includes('overdue_pm') || kpiId === '15') {
    const pmPlans = await listPMPlans();
    const today = new Date().toISOString().split('T')[0];
    value = pmPlans.filter(p => p.nextDueDate && p.nextDueDate < today).length;
    sourceLabels.approved = pmPlans.length;
  } else {
    // Default mock value
    value = 100;
    sourceLabels.approved = 1;
  }

  return { value, statusBreakdown, sourceLabels };
}

function getPreviousPeriod(period: KPIPeriod, periodStart: string): { start: string; end: string } {
  const start = new Date(periodStart);
  
  switch (period) {
    case 'daily':
      start.setDate(start.getDate() - 1);
      return {
        start: start.toISOString().split('T')[0],
        end: start.toISOString().split('T')[0],
      };
    case 'weekly':
      start.setDate(start.getDate() - 7);
      const weekEnd = new Date(start);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return {
        start: start.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      };
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return {
        start: start.toISOString().split('T')[0],
        end: monthEnd.toISOString().split('T')[0],
      };
    default:
      return { start: periodStart, end: periodStart };
  }
}

// ============================================================================
// Aggregated KPI Retrieval
// ============================================================================

export async function getAggregatedKPI(
  kpiId: string,
  period: KPIPeriod,
  periodStart: string,
  scope?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  }
): Promise<AggregatedKPI | null> {
  const all = await aggregatedKPIStore.findAll();
  return all.find(k => 
    k.kpiId === kpiId && 
    k.period === period && 
    k.periodStart === periodStart &&
    (!scope || (
      (!scope.companyId || k.scope.companyId === scope.companyId) &&
      (!scope.projectId || k.scope.projectId === scope.projectId) &&
      (!scope.siteId || k.scope.siteId === scope.siteId) &&
      (!scope.plantId || k.scope.plantId === scope.plantId)
    ))
  ) || null;
}

export async function listAggregatedKPIs(filters?: {
  kpiId?: string;
  period?: KPIPeriod;
  periodStart?: string;
  scope?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  };
}): Promise<AggregatedKPI[]> {
  let kpis = await aggregatedKPIStore.findAll();

  if (filters?.kpiId) {
    kpis = kpis.filter(k => k.kpiId === filters.kpiId);
  }
  if (filters?.period) {
    kpis = kpis.filter(k => k.period === filters.period);
  }
  if (filters?.periodStart) {
    kpis = kpis.filter(k => k.periodStart === filters.periodStart);
  }
  if (filters?.scope) {
    if (filters.scope.companyId) {
      kpis = kpis.filter(k => k.scope.companyId === filters.scope!.companyId);
    }
    if (filters.scope.projectId) {
      kpis = kpis.filter(k => k.scope.projectId === filters.scope!.projectId);
    }
    if (filters.scope.siteId) {
      kpis = kpis.filter(k => k.scope.siteId === filters.scope!.siteId);
    }
    if (filters.scope.plantId) {
      kpis = kpis.filter(k => k.scope.plantId === filters.scope!.plantId);
    }
  }

  return kpis;
}

// ============================================================================
// Batch Aggregation
// ============================================================================

export async function aggregateAllKPIs(
  period: KPIPeriod,
  periodStart: string,
  periodEnd: string,
  scope?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  }
): Promise<AggregatedKPI[]> {
  const kpiRegistry = await import('./kpiRegistry');
  const kpis = await kpiRegistry.listKPIDefinitions({ status: 'active' });
  
  const results: AggregatedKPI[] = [];
  
  for (const kpi of kpis) {
    const aggregated = await aggregateKPI(kpi.id, period, periodStart, periodEnd, scope);
    results.push(aggregated);
  }

  await recordAudit({
    entityType: 'AggregatedKPI',
    entityId: 'batch',
    action: 'create',
    before: null,
    after: { count: results.length, period, periodStart } as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Batch aggregation completed for ${period} ${periodStart}`,
  });

  return results;
}

// ============================================================================
// Stale Data Detection
// ============================================================================

export async function detectStaleData(maxAgeMinutes: number = 60): Promise<AggregatedKPI[]> {
  const all = await aggregatedKPIStore.findAll();
  const now = new Date();
  
  return all.filter(k => {
    const lastRefreshed = new Date(k.lastRefreshedAt);
    const ageMinutes = (now.getTime() - lastRefreshed.getTime()) / (1000 * 60);
    return ageMinutes > maxAgeMinutes;
  });
}

export async function markAsStale(kpiId: string): Promise<void> {
  const all = await aggregatedKPIStore.findAll({ kpiId } as any);
  for (const kpi of all) {
    await aggregatedKPIStore.update(kpi.id, { isStale: true });
  }
}
