/**
 * Part 22 — KPI Registry Service
 */

import { storage } from './storage';
import { KPIDefinition, KPIStatus } from './dashboardTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const kpiRegistryStore = storage.getAdapter<KPIDefinition>('kpi_registry');

// ============================================================================
// KPI Registry Management
// ============================================================================

export async function createKPIDefinition(params: {
  name: string;
  description: string;
  category: 'executive' | 'fleet' | 'operator' | 'fuel' | 'finance' | 'rmc' | 'maintenance';
  formula: string;
  sourceTables: string[];
  statusFilter: ('approved' | 'posted' | 'submitted' | 'pending')[];
  unit: 'count' | 'currency' | 'percentage' | 'hours' | 'km' | 'm3' | 'litres';
  currency?: string;
  decimalPlaces: number;
  defaultPeriod: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'ytd';
  ownerRole: string;
  status?: KPIStatus;
}): Promise<KPIDefinition> {
  const kpi: KPIDefinition = {
    id: generateId(),
    name: params.name,
    description: params.description,
    category: params.category,
    formula: params.formula,
    sourceTables: params.sourceTables,
    statusFilter: params.statusFilter,
    unit: params.unit,
    currency: params.currency,
    decimalPlaces: params.decimalPlaces,
    defaultPeriod: params.defaultPeriod,
    ownerRole: params.ownerRole,
    status: params.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await kpiRegistryStore.create(kpi);

  await recordAudit({
    entityType: 'KPIDefinition',
    entityId: kpi.id,
    action: 'create',
    before: null,
    after: kpi as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `KPI definition created: ${kpi.name}`,
  });

  return kpi;
}

export async function getKPIDefinition(id: string): Promise<KPIDefinition | null> {
  return kpiRegistryStore.findById(id);
}

export async function getKPIByName(name: string): Promise<KPIDefinition | null> {
  const all = await kpiRegistryStore.findAll();
  return all.find(k => k.name === name) || null;
}

export async function listKPIDefinitions(filters?: {
  category?: string;
  status?: KPIStatus;
}): Promise<KPIDefinition[]> {
  let kpis = await kpiRegistryStore.findAll();

  if (filters?.category) {
    kpis = kpis.filter(k => k.category === filters.category);
  }
  if (filters?.status) {
    kpis = kpis.filter(k => k.status === filters.status);
  }

  return kpis;
}

export async function updateKPIDefinition(
  id: string,
  updates: Partial<KPIDefinition>,
  userId: string
): Promise<KPIDefinition> {
  const kpi = await kpiRegistryStore.findById(id);
  if (!kpi) {
    throw new Error(`KPI definition ${id} not found`);
  }

  const updated = await kpiRegistryStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'KPIDefinition',
    entityId: id,
    action: 'update',
    before: kpi as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'KPI definition updated',
  });

  return updated;
}

export async function deprecateKPI(id: string, userId: string): Promise<KPIDefinition> {
  return updateKPIDefinition(id, { status: 'deprecated' }, userId);
}

// ============================================================================
// Seed Default KPIs
// ============================================================================

export async function seedDefaultKPIs(): Promise<void> {
  const existing = await kpiRegistryStore.findAll();
  if (existing.length > 0) return;

  const kpis = [
    // Executive KPIs
    {
      name: 'Total Assets',
      description: 'Total number of machinery, vehicles, and equipment',
      category: 'executive' as const,
      formula: 'COUNT(assets)',
      sourceTables: ['assets'],
      statusFilter: ['approved' as const],
      unit: 'count' as const,
      decimalPlaces: 0,
      defaultPeriod: 'daily' as const,
      ownerRole: 'company_admin',
      status: 'active' as const,
    },
    {
      name: 'Asset Utilization',
      description: 'Percentage of assets in operational status',
      category: 'executive' as const,
      formula: '(operational_assets / total_assets) * 100',
      sourceTables: ['assets'],
      statusFilter: ['approved' as const],
      unit: 'percentage' as const,
      decimalPlaces: 1,
      defaultPeriod: 'daily' as const,
      ownerRole: 'fleet_manager',
      status: 'active' as const,
    },
    {
      name: 'RMC Production',
      description: 'Total concrete production in cubic meters',
      category: 'rmc' as const,
      formula: 'SUM(batch.actual_volume)',
      sourceTables: ['batches'],
      statusFilter: ['approved' as const],
      unit: 'm3' as const,
      decimalPlaces: 2,
      defaultPeriod: 'daily' as const,
      ownerRole: 'plant_manager',
      status: 'active' as const,
    },
    {
      name: 'Fuel Expenditure',
      description: 'Total fuel cost in INR',
      category: 'fuel' as const,
      formula: 'SUM(fuel_issues.total_cost)',
      sourceTables: ['fuel_issues'],
      statusFilter: ['approved' as const],
      unit: 'currency' as const,
      currency: 'INR',
      decimalPlaces: 2,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'accounts_manager',
      status: 'active' as const,
    },
    {
      name: 'Fuel Verification Coverage',
      description: 'Percentage of asset-days with verified fuel consumption',
      category: 'fuel' as const,
      formula: '(verified_asset_days / expected_asset_days) * 100',
      sourceTables: ['fuel_verifications', 'daily_coverage'],
      statusFilter: ['approved' as const],
      unit: 'percentage' as const,
      decimalPlaces: 1,
      defaultPeriod: 'daily' as const,
      ownerRole: 'fleet_manager',
      status: 'active' as const,
    },
    {
      name: 'Maintenance Spend',
      description: 'Total maintenance cost in INR',
      category: 'maintenance' as const,
      formula: 'SUM(work_orders.total_cost)',
      sourceTables: ['work_orders'],
      statusFilter: ['approved' as const],
      unit: 'currency' as const,
      currency: 'INR',
      decimalPlaces: 2,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'maintenance_manager',
      status: 'active' as const,
    },
    {
      name: 'Pending Approvals',
      description: 'Number of submissions awaiting approval',
      category: 'operator' as const,
      formula: 'COUNT(submissions WHERE status = submitted)',
      sourceTables: ['operator_submissions'],
      statusFilter: ['submitted' as const],
      unit: 'count' as const,
      decimalPlaces: 0,
      defaultPeriod: 'daily' as const,
      ownerRole: 'site_manager',
      status: 'active' as const,
    },
    {
      name: 'Revenue',
      description: 'Total revenue from RMC sales',
      category: 'finance' as const,
      formula: 'SUM(invoices.total_amount)',
      sourceTables: ['invoices'],
      statusFilter: ['posted' as const],
      unit: 'currency' as const,
      currency: 'INR',
      decimalPlaces: 2,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'accounts_manager',
      status: 'active' as const,
    },
    {
      name: 'Gross Margin',
      description: 'Revenue minus direct costs',
      category: 'finance' as const,
      formula: 'revenue - direct_costs',
      sourceTables: ['invoices', 'work_orders', 'fuel_issues'],
      statusFilter: ['posted' as const],
      unit: 'currency' as const,
      currency: 'INR',
      decimalPlaces: 2,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'accounts_manager',
      status: 'active' as const,
    },
    {
      name: 'RMC Cost per m³',
      description: 'Average cost to produce one cubic meter of concrete',
      category: 'rmc' as const,
      formula: 'total_production_cost / total_production_m3',
      sourceTables: ['plant_costs', 'batches'],
      statusFilter: ['approved' as const],
      unit: 'currency' as const,
      currency: 'INR',
      decimalPlaces: 2,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'plant_manager',
      status: 'active' as const,
    },
    {
      name: 'Equipment Downtime',
      description: 'Total downtime hours across all assets',
      category: 'fleet' as const,
      formula: 'SUM(work_orders.downtime_hours)',
      sourceTables: ['work_orders'],
      statusFilter: ['approved' as const],
      unit: 'hours' as const,
      decimalPlaces: 1,
      defaultPeriod: 'monthly' as const,
      ownerRole: 'fleet_manager',
      status: 'active' as const,
    },
    {
      name: 'Open Orders',
      description: 'Number of RMC orders not yet completed',
      category: 'rmc' as const,
      formula: 'COUNT(orders WHERE status != completed)',
      sourceTables: ['rmc_orders'],
      statusFilter: ['approved' as const],
      unit: 'count' as const,
      decimalPlaces: 0,
      defaultPeriod: 'daily' as const,
      ownerRole: 'plant_manager',
      status: 'active' as const,
    },
    {
      name: 'Dispatch Delays',
      description: 'Number of dispatches with delays',
      category: 'rmc' as const,
      formula: 'COUNT(dispatches WHERE has_delay = true)',
      sourceTables: ['dispatches'],
      statusFilter: ['approved' as const],
      unit: 'count' as const,
      decimalPlaces: 0,
      defaultPeriod: 'daily' as const,
      ownerRole: 'dispatch_manager',
      status: 'active' as const,
    },
    {
      name: 'Calibration Compliance',
      description: 'Percentage of instruments with valid calibration',
      category: 'fuel' as const,
      formula: '(valid_instruments / total_instruments) * 100',
      sourceTables: ['calibration_records', 'measuring_instruments'],
      statusFilter: ['approved' as const],
      unit: 'percentage' as const,
      decimalPlaces: 1,
      defaultPeriod: 'daily' as const,
      ownerRole: 'calibration_officer',
      status: 'active' as const,
    },
    {
      name: 'Overdue PM',
      description: 'Number of preventive maintenance tasks overdue',
      category: 'maintenance' as const,
      formula: 'COUNT(pm_plans WHERE next_due_date < today)',
      sourceTables: ['pm_plans'],
      statusFilter: ['approved' as const],
      unit: 'count' as const,
      decimalPlaces: 0,
      defaultPeriod: 'daily' as const,
      ownerRole: 'maintenance_manager',
      status: 'active' as const,
    },
  ];

  for (const kpi of kpis) {
    await createKPIDefinition(kpi);
  }
}
