/**
 * Part 22 — Dashboard Framework Service
 */

import { storage } from './storage';
import { 
  DashboardLayout, 
  DashboardWidget, 
  DashboardData, 
  WidgetData,
  DashboardFilter,
  DashboardRole,
  StaleDataWarning
} from './dashboardTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { aggregateKPI, detectStaleData } from './aggregationService';
import { getKPIDefinition } from './kpiRegistry';

const layoutsStore = storage.getAdapter<DashboardLayout>('dashboard_layouts');
const filtersStore = storage.getAdapter<DashboardFilter>('dashboard_filters');

// ============================================================================
// Dashboard Layout Management
// ============================================================================

export async function createDashboardLayout(params: {
  name: string;
  role: DashboardRole;
  widgets: DashboardWidget[];
  isDefault?: boolean;
  isEditable?: boolean;
  createdBy: string;
}): Promise<DashboardLayout> {
  const layout: DashboardLayout = {
    id: generateId(),
    name: params.name,
    role: params.role,
    widgets: params.widgets,
    isDefault: params.isDefault || false,
    isEditable: params.isEditable !== false,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await layoutsStore.create(layout);

  await recordAudit({
    entityType: 'DashboardLayout',
    entityId: layout.id,
    action: 'create',
    before: null,
    after: layout as any,
    actorId: params.createdBy,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Dashboard layout created: ${layout.name}`,
  });

  return layout;
}

export async function getDashboardLayout(id: string): Promise<DashboardLayout | null> {
  return layoutsStore.findById(id);
}

export async function getDefaultLayoutForRole(role: DashboardRole): Promise<DashboardLayout | null> {
  const all = await layoutsStore.findAll();
  return all.find(l => l.role === role && l.isDefault) || null;
}

export async function listDashboardLayouts(filters?: {
  role?: DashboardRole;
  isDefault?: boolean;
}): Promise<DashboardLayout[]> {
  let layouts = await layoutsStore.findAll();

  if (filters?.role) {
    layouts = layouts.filter(l => l.role === filters.role);
  }
  if (filters?.isDefault !== undefined) {
    layouts = layouts.filter(l => l.isDefault === filters.isDefault);
  }

  return layouts;
}

export async function updateDashboardLayout(
  id: string,
  updates: Partial<DashboardLayout>,
  userId: string
): Promise<DashboardLayout> {
  const layout = await layoutsStore.findById(id);
  if (!layout) {
    throw new Error(`Dashboard layout ${id} not found`);
  }

  if (!layout.isEditable) {
    throw new Error('This layout is not editable');
  }

  const updated = await layoutsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'DashboardLayout',
    entityId: id,
    action: 'update',
    before: layout as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Dashboard layout updated',
  });

  return updated;
}

// ============================================================================
// Dashboard Data Generation
// ============================================================================

export async function generateDashboardData(
  layoutId: string,
  filters: DashboardFilter,
  userId: string
): Promise<DashboardData> {
  const startTime = Date.now();
  const layout = await layoutsStore.findById(layoutId);
  if (!layout) {
    throw new Error(`Dashboard layout ${layoutId} not found`);
  }

  const widgetsData: WidgetData[] = [];
  const staleDataWarnings: StaleDataWarning[] = [];

  // Generate data for each widget
  for (const widget of layout.widgets) {
    if (!widget.isActive) continue;

    try {
      const widgetData = await generateWidgetData(widget, filters);
      widgetsData.push(widgetData);

      // Check for stale data
      if (widgetData.status === 'stale') {
        const lastRefreshed = new Date(widgetData.lastRefreshedAt);
        const stalenessMinutes = (Date.now() - lastRefreshed.getTime()) / (1000 * 60);
        
        staleDataWarnings.push({
          widgetId: widget.id,
          kpiId: widget.kpiId,
          lastRefreshedAt: widgetData.lastRefreshedAt,
          stalenessMinutes: Math.round(stalenessMinutes),
          message: `Data is ${Math.round(stalenessMinutes)} minutes old`,
        });
      }
    } catch (error) {
      widgetsData.push({
        widgetId: widget.id,
        kpiId: widget.kpiId,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        lastRefreshedAt: new Date().toISOString(),
        sourceLabels: {
          integrated_live: 0,
          integrated_delayed: 0,
          imported: 0,
          manual: 0,
          approved: 0,
          pending: 0,
        },
      });
    }
  }

  const refreshDuration = Date.now() - startTime;

  const dashboardData: DashboardData = {
    dashboardId: generateId(),
    layoutId,
    widgetsData,
    generatedAt: new Date().toISOString(),
    refreshDuration,
    staleDataWarnings,
    integrationFailures: [],
  };

  await recordAudit({
    entityType: 'DashboardData',
    entityId: dashboardData.dashboardId,
    action: 'create',
    before: null,
    after: { layoutId, widgetCount: widgetsData.length, refreshDuration } as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: 'Dashboard data generated',
  });

  return dashboardData;
}

async function generateWidgetData(
  widget: DashboardWidget,
  filters: DashboardFilter
): Promise<WidgetData> {
  if (!widget.kpiId) {
    return {
      widgetId: widget.id,
      status: 'success',
      lastRefreshedAt: new Date().toISOString(),
      sourceLabels: {
        integrated_live: 0,
        integrated_delayed: 0,
        imported: 0,
        manual: 0,
        approved: 0,
        pending: 0,
      },
    };
  }

  // Get KPI definition
  const kpi = await getKPIDefinition(widget.kpiId);
  if (!kpi) {
    throw new Error(`KPI ${widget.kpiId} not found`);
  }

  // Aggregate KPI data
  const period = filters.period || kpi.defaultPeriod;
  const periodStart = filters.dateRange?.startDate || new Date().toISOString().split('T')[0];
  const periodEnd = filters.dateRange?.endDate || periodStart;

  const aggregated = await aggregateKPI(widget.kpiId, period, periodStart, periodEnd, {
    companyId: filters.companyId,
    projectId: filters.projectId,
    siteId: filters.siteId,
    plantId: filters.plantId,
  });

  // Check if data is stale
  const lastRefreshed = new Date(aggregated.lastRefreshedAt);
  const ageMinutes = (Date.now() - lastRefreshed.getTime()) / (1000 * 60);
  const isStale = ageMinutes > 60; // Stale if older than 1 hour

  return {
    widgetId: widget.id,
    kpiId: widget.kpiId,
    value: aggregated.value,
    trend: aggregated.change !== undefined ? [aggregated.previousValue || 0, aggregated.value] : undefined,
    comparison: aggregated.changePercent !== undefined ? [
      { label: 'Current', value: aggregated.value },
      { label: 'Previous', value: aggregated.previousValue || 0 },
    ] : undefined,
    breakdown: aggregated.statusBreakdown,
    status: isStale ? 'stale' : 'success',
    lastRefreshedAt: aggregated.lastRefreshedAt,
    sourceLabels: aggregated.sourceLabels,
  };
}

// ============================================================================
// Filter Management
// ============================================================================

export async function createDashboardFilter(params: {
  name: string;
  companyId?: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  assetCategory?: string;
  customer?: string;
  grade?: string;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'ytd';
  dateRange?: { startDate: string; endDate: string };
  statusFilter?: string[];
  isSaved?: boolean;
  createdBy: string;
}): Promise<DashboardFilter> {
  const filter: DashboardFilter = {
    id: generateId(),
    name: params.name,
    companyId: params.companyId,
    projectId: params.projectId,
    siteId: params.siteId,
    plantId: params.plantId,
    assetCategory: params.assetCategory,
    customer: params.customer,
    grade: params.grade,
    period: params.period,
    dateRange: params.dateRange,
    statusFilter: params.statusFilter,
    isSaved: params.isSaved || false,
    createdBy: params.createdBy,
    createdAt: new Date().toISOString(),
  };

  await filtersStore.create(filter);
  return filter;
}

export async function getDashboardFilter(id: string): Promise<DashboardFilter | null> {
  return filtersStore.findById(id);
}

export async function listSavedFilters(userId: string): Promise<DashboardFilter[]> {
  const all = await filtersStore.findAll();
  return all.filter(f => f.isSaved && f.createdBy === userId);
}

// ============================================================================
// Seed Default Layouts
// ============================================================================

export async function seedDefaultDashboardLayouts(): Promise<void> {
  const existing = await layoutsStore.findAll();
  if (existing.length > 0) return;

  // Executive Dashboard
  await createDashboardLayout({
    name: 'Executive Overview',
    role: 'executive',
    isDefault: true,
    createdBy: 'system',
    widgets: [
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Total Assets',
        kpiId: '1',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 0, width: 3, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Asset Utilization',
        kpiId: '2',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 3, width: 3, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'RMC Production',
        kpiId: '3',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 6, width: 3, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Fuel Expenditure',
        kpiId: '4',
        queryConfig: { period: 'monthly' },
        position: { row: 0, col: 9, width: 3, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  // Fleet Manager Dashboard
  await createDashboardLayout({
    name: 'Fleet Management',
    role: 'fleet_manager',
    isDefault: true,
    createdBy: 'system',
    widgets: [
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Asset Utilization',
        kpiId: '2',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 0, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Equipment Downtime',
        kpiId: '11',
        queryConfig: { period: 'monthly' },
        position: { row: 0, col: 4, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Maintenance Spend',
        kpiId: '6',
        queryConfig: { period: 'monthly' },
        position: { row: 0, col: 8, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  // Plant Manager Dashboard
  await createDashboardLayout({
    name: 'RMC Plant Operations',
    role: 'plant_manager',
    isDefault: true,
    createdBy: 'system',
    widgets: [
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'RMC Production',
        kpiId: '3',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 0, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'Open Orders',
        kpiId: '12',
        queryConfig: { period: 'daily' },
        position: { row: 0, col: 4, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: generateId(),
        dashboardId: '',
        type: 'kpi_card',
        title: 'RMC Cost per m³',
        kpiId: '10',
        queryConfig: { period: 'monthly' },
        position: { row: 0, col: 8, width: 4, height: 2 },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });
}
