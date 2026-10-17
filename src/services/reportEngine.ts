/**
 * Part 24 — Report Engine Service
 */

import { storage } from './storage';
import { 
  ReportDefinition, 
  ReportExecution, 
  ReportCategory,
  ReportFilter,
  ReportColumn
} from './reportTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { aggregateKPI } from './aggregationService';
import { getKPIDefinition } from './kpiRegistry';

const reportDefinitionsStore = storage.getAdapter<ReportDefinition>('report_definitions');
const reportExecutionsStore = storage.getAdapter<ReportExecution>('report_executions');

// ============================================================================
// Report Definition Management
// ============================================================================

export async function createReportDefinition(params: {
  code: string;
  name: string;
  description: string;
  category: ReportCategory;
  sourceModules: string[];
  kpiIds: string[];
  availableFilters: ReportFilter[];
  defaultFilters: Record<string, any>;
  columns: ReportColumn[];
  sections?: any[];
  supportedFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  maxRows?: number;
  requiredPermission: string;
  createdBy: string;
}): Promise<ReportDefinition> {
  const report: ReportDefinition = {
    id: generateId(),
    code: params.code,
    name: params.name,
    description: params.description,
    category: params.category,
    sourceModules: params.sourceModules,
    kpiIds: params.kpiIds,
    availableFilters: params.availableFilters,
    defaultFilters: params.defaultFilters,
    columns: params.columns,
    sections: params.sections,
    supportedFormats: params.supportedFormats,
    maxRows: params.maxRows || 10000,
    requiredPermission: params.requiredPermission,
    version: 1,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: params.createdBy,
  };

  await reportDefinitionsStore.create(report);

  await recordAudit({
    entityType: 'ReportDefinition',
    entityId: report.id,
    action: 'create',
    before: null,
    after: report as any,
    actorId: params.createdBy,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Report definition created: ${report.name}`,
  });

  return report;
}

export async function getReportDefinition(id: string): Promise<ReportDefinition | null> {
  return reportDefinitionsStore.findById(id);
}

export async function getReportDefinitionByCode(code: string): Promise<ReportDefinition | null> {
  const all = await reportDefinitionsStore.findAll();
  return all.find(r => r.code === code) || null;
}

export async function listReportDefinitions(filters?: {
  category?: ReportCategory;
  status?: string;
}): Promise<ReportDefinition[]> {
  let reports = await reportDefinitionsStore.findAll();

  if (filters?.category) {
    reports = reports.filter(r => r.category === filters.category);
  }
  if (filters?.status) {
    reports = reports.filter(r => r.status === filters.status);
  }

  return reports.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateReportDefinition(
  id: string,
  updates: Partial<ReportDefinition>,
  userId: string,
  versionNotes?: string
): Promise<ReportDefinition> {
  const report = await reportDefinitionsStore.findById(id);
  if (!report) {
    throw new Error(`Report definition ${id} not found`);
  }

  const updated = await reportDefinitionsStore.update(id, {
    ...updates,
    version: report.version + 1,
    versionNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ReportDefinition',
    entityId: id,
    action: 'update',
    before: { version: report.version },
    after: { version: updated.version, versionNotes },
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Report definition updated to version ${updated.version}`,
  });

  return updated;
}

// ============================================================================
// Report Execution
// ============================================================================

export async function executeReport(
  reportId: string,
  filters: Record<string, any>,
  userId: string
): Promise<ReportExecution> {
  const report = await reportDefinitionsStore.findById(reportId);
  if (!report) {
    throw new Error(`Report definition ${reportId} not found`);
  }

  const startTime = Date.now();

  // Validate required filters
  for (const filter of report.availableFilters) {
    if (filter.required && !filters[filter.id]) {
      throw new Error(`Required filter '${filter.name}' is missing`);
    }
  }

  // Execute report based on category
  let data: any[] = [];
  const dataSources: string[] = [];
  const dataFreshness: Record<string, string> = {};
  const statusBreakdown: Record<string, number> = {};

  switch (report.category) {
    case 'assets':
      const assetData = await executeAssetReport(report.code, filters);
      data = assetData.data;
      dataSources.push(...assetData.sources);
      Object.assign(dataFreshness, assetData.freshness);
      Object.assign(statusBreakdown, assetData.statusBreakdown);
      break;

    case 'operations':
      const opsData = await executeOperationsReport(report.code, filters);
      data = opsData.data;
      dataSources.push(...opsData.sources);
      Object.assign(dataFreshness, opsData.freshness);
      Object.assign(statusBreakdown, opsData.statusBreakdown);
      break;

    case 'fuel':
      const fuelData = await executeFuelReport(report.code, filters);
      data = fuelData.data;
      dataSources.push(...fuelData.sources);
      Object.assign(dataFreshness, fuelData.freshness);
      Object.assign(statusBreakdown, fuelData.statusBreakdown);
      break;

    case 'maintenance':
      const maintData = await executeMaintenanceReport(report.code, filters);
      data = maintData.data;
      dataSources.push(...maintData.sources);
      Object.assign(dataFreshness, maintData.freshness);
      Object.assign(statusBreakdown, maintData.statusBreakdown);
      break;

    case 'rmc_production':
      const rmcData = await executeRMCReport(report.code, filters);
      data = rmcData.data;
      dataSources.push(...rmcData.sources);
      Object.assign(dataFreshness, rmcData.freshness);
      Object.assign(statusBreakdown, rmcData.statusBreakdown);
      break;

    case 'quality':
      const qualityData = await executeQualityReport(report.code, filters);
      data = qualityData.data;
      dataSources.push(...qualityData.sources);
      Object.assign(dataFreshness, qualityData.freshness);
      Object.assign(statusBreakdown, qualityData.statusBreakdown);
      break;

    case 'dispatch':
      const dispatchData = await executeDispatchReport(report.code, filters);
      data = dispatchData.data;
      dataSources.push(...dispatchData.sources);
      Object.assign(dataFreshness, dispatchData.freshness);
      Object.assign(statusBreakdown, dispatchData.statusBreakdown);
      break;

    case 'finance':
      const financeData = await executeFinanceReport(report.code, filters);
      data = financeData.data;
      dataSources.push(...financeData.sources);
      Object.assign(dataFreshness, financeData.freshness);
      Object.assign(statusBreakdown, financeData.statusBreakdown);
      break;

    case 'management':
      const mgmtData = await executeManagementReport(report.code, filters);
      data = mgmtData.data;
      dataSources.push(...mgmtData.sources);
      Object.assign(dataFreshness, mgmtData.freshness);
      Object.assign(statusBreakdown, mgmtData.statusBreakdown);
      break;
  }

  // Apply row limit
  if (report.maxRows && data.length > report.maxRows) {
    data = data.slice(0, report.maxRows);
  }

  const executionTimeMs = Date.now() - startTime;

  const execution: ReportExecution = {
    id: generateId(),
    reportId,
    reportVersion: report.version,
    filters,
    data,
    totalRows: data.length,
    generatedAt: new Date().toISOString(),
    generatedBy: userId,
    dataSources,
    dataFreshness,
    statusBreakdown,
    executionTimeMs,
    createdAt: new Date().toISOString(),
  };

  await reportExecutionsStore.create(execution);

  await recordAudit({
    entityType: 'ReportExecution',
    entityId: execution.id,
    action: 'create',
    before: null,
    after: { reportId, reportVersion: report.version, totalRows: data.length, executionTimeMs } as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Report executed: ${report.name}`,
  });

  return execution;
}

// ============================================================================
// Report Execution Functions (Stub implementations)
// ============================================================================

async function executeAssetReport(code: string, filters: Record<string, any>) {
  // Stub implementation - would query actual asset data
  return {
    data: [],
    sources: ['assets', 'allocations'],
    freshness: { assets: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeOperationsReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['logbooks', 'submissions'],
    freshness: { logbooks: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeFuelReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['fuel_receipts', 'fuel_issues', 'fuel_verifications'],
    freshness: { fuel: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeMaintenanceReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['work_orders', 'pm_plans'],
    freshness: { maintenance: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeRMCReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['batches', 'production_orders'],
    freshness: { rmc: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeQualityReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['qc_tests', 'specimens'],
    freshness: { quality: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeDispatchReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['dispatches', 'orders'],
    freshness: { dispatch: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeFinanceReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['postings', 'invoices'],
    freshness: { finance: new Date().toISOString() },
    statusBreakdown: {},
  };
}

async function executeManagementReport(code: string, filters: Record<string, any>) {
  return {
    data: [],
    sources: ['kpis', 'alerts'],
    freshness: { management: new Date().toISOString() },
    statusBreakdown: {},
  };
}

// ============================================================================
// Report Retrieval
// ============================================================================

export async function getReportExecution(id: string): Promise<ReportExecution | null> {
  return reportExecutionsStore.findById(id);
}

export async function listReportExecutions(filters?: {
  reportId?: string;
  generatedBy?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ReportExecution[]> {
  let executions = await reportExecutionsStore.findAll();

  if (filters?.reportId) {
    executions = executions.filter(e => e.reportId === filters.reportId);
  }
  if (filters?.generatedBy) {
    executions = executions.filter(e => e.generatedBy === filters.generatedBy);
  }
  if (filters?.fromDate) {
    executions = executions.filter(e => e.generatedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    executions = executions.filter(e => e.generatedAt <= filters.toDate!);
  }

  return executions.sort((a, b) => 
    new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

// ============================================================================
// Seed Default Reports
// ============================================================================

export async function seedDefaultReports(): Promise<void> {
  const existing = await reportDefinitionsStore.findAll();
  if (existing.length > 0) return;

  // Asset Register Report
  await createReportDefinition({
    code: 'ASSET_REGISTER',
    name: 'Asset Register',
    description: 'Complete list of all assets with current status and location',
    category: 'assets',
    sourceModules: ['assets'],
    kpiIds: ['1'],
    availableFilters: [
      { id: 'date', name: 'As of Date', type: 'date_range', required: false },
      { id: 'status', name: 'Status', type: 'multi_select', required: false, options: ['available', 'deployed', 'idle', 'under_maintenance'] },
      { id: 'category', name: 'Category', type: 'multi_select', required: false },
    ],
    defaultFilters: {},
    columns: [
      { id: 'code', name: 'Asset Code', field: 'assetCode', type: 'text', sortable: true, visible: true },
      { id: 'name', name: 'Name', field: 'name', type: 'text', sortable: true, visible: true },
      { id: 'status', name: 'Status', field: 'status', type: 'status', sortable: true, visible: true },
      { id: 'location', name: 'Location', field: 'location', type: 'text', sortable: true, visible: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    requiredPermission: 'view',
    createdBy: 'system',
  });

  // Fuel Verification Report
  await createReportDefinition({
    code: 'FUEL_VERIFICATION',
    name: 'Daily Fuel Verification Sheet',
    description: 'Daily fuel consumption verification with variance analysis',
    category: 'fuel',
    sourceModules: ['fuel_verifications', 'batches'],
    kpiIds: ['4', '5'],
    availableFilters: [
      { id: 'date', name: 'Date', type: 'date_range', required: true },
      { id: 'site', name: 'Site', type: 'single_select', required: false },
      { id: 'asset', name: 'Asset', type: 'single_select', required: false },
    ],
    defaultFilters: {},
    columns: [
      { id: 'date', name: 'Date', field: 'date', type: 'date', sortable: true, visible: true },
      { id: 'asset', name: 'Asset', field: 'assetCode', type: 'text', sortable: true, visible: true },
      { id: 'consumed', name: 'Consumed (L)', field: 'fuelConsumed', type: 'number', sortable: true, visible: true },
      { id: 'usage', name: 'Usage', field: 'usage', type: 'text', sortable: true, visible: true },
      { id: 'variance', name: 'Variance', field: 'varianceLitres', type: 'number', sortable: true, visible: true },
      { id: 'status', name: 'Status', field: 'resultStatus', type: 'status', sortable: true, visible: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    requiredPermission: 'view',
    createdBy: 'system',
  });

  // Work Order Report
  await createReportDefinition({
    code: 'WORK_ORDERS',
    name: 'Work Orders and Costs',
    description: 'Complete work order history with cost breakdown',
    category: 'maintenance',
    sourceModules: ['work_orders'],
    kpiIds: ['6', '11'],
    availableFilters: [
      { id: 'date', name: 'Date Range', type: 'date_range', required: true },
      { id: 'asset', name: 'Asset', type: 'single_select', required: false },
      { id: 'type', name: 'Type', type: 'multi_select', required: false, options: ['pm', 'breakdown', 'accident'] },
      { id: 'status', name: 'Status', type: 'multi_select', required: false },
    ],
    defaultFilters: {},
    columns: [
      { id: 'number', name: 'Work Order #', field: 'workOrderNumber', type: 'text', sortable: true, visible: true },
      { id: 'asset', name: 'Asset', field: 'assetCode', type: 'text', sortable: true, visible: true },
      { id: 'type', name: 'Type', field: 'type', type: 'text', sortable: true, visible: true },
      { id: 'status', name: 'Status', field: 'status', type: 'status', sortable: true, visible: true },
      { id: 'cost', name: 'Total Cost', field: 'totalCost', type: 'currency', sortable: true, visible: true },
    ],
    supportedFormats: ['pdf', 'excel', 'csv'],
    requiredPermission: 'view_cost',
    createdBy: 'system',
  });

  // Financial Reconciliation Report
  await createReportDefinition({
    code: 'FINANCIAL_RECONCILIATION',
    name: 'Operational vs Financial Reconciliation',
    description: 'Reconcile operational totals with posted financial amounts',
    category: 'finance',
    sourceModules: ['postings', 'fuel_issues', 'work_orders'],
    kpiIds: ['8', '9'],
    availableFilters: [
      { id: 'period', name: 'Period', type: 'date_range', required: true },
      { id: 'module', name: 'Module', type: 'multi_select', required: false },
    ],
    defaultFilters: {},
    columns: [
      { id: 'module', name: 'Module', field: 'module', type: 'text', sortable: true, visible: true },
      { id: 'operational', name: 'Operational Total', field: 'operationalTotal', type: 'currency', sortable: true, visible: true },
      { id: 'posted', name: 'Posted Total', field: 'postedTotal', type: 'currency', sortable: true, visible: true },
      { id: 'variance', name: 'Variance', field: 'variance', type: 'currency', sortable: true, visible: true },
      { id: 'status', name: 'Status', field: 'status', type: 'status', sortable: true, visible: true },
    ],
    supportedFormats: ['pdf', 'excel'],
    requiredPermission: 'view_cost',
    createdBy: 'system',
  });
}
