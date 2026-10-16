/**
 * Part 22 — Dashboard Types
 */

// ============================================================================
// KPI Registry
// ============================================================================

export type KPIStatus = 'active' | 'deprecated' | 'draft';
export type KPIPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'ytd';
export type KPIUnit = 'count' | 'currency' | 'percentage' | 'hours' | 'km' | 'm3' | 'litres';
export type DataSourceLabel = 'integrated_live' | 'integrated_delayed' | 'imported' | 'manual' | 'approved' | 'pending';

export interface KPIDefinition {
  id: string;
  name: string;
  description: string;
  category: 'executive' | 'fleet' | 'operator' | 'fuel' | 'finance' | 'rmc' | 'maintenance';
  
  // Formula and source
  formula: string;
  sourceTables: string[];
  statusFilter: ('approved' | 'posted' | 'submitted' | 'pending')[];
  
  // Display
  unit: KPIUnit;
  currency?: string;
  decimalPlaces: number;
  
  // Configuration
  defaultPeriod: KPIPeriod;
  ownerRole: string;
  
  // Status
  status: KPIStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Dashboard Widgets
// ============================================================================

export type WidgetType = 
  | 'kpi_card'
  | 'trend_chart'
  | 'comparison_chart'
  | 'ranked_table'
  | 'status_indicator'
  | 'approval_queue'
  | 'exception_summary'
  | 'recent_activity'
  | 'gauge_chart'
  | 'stacked_bar'
  | 'pie_chart';

export interface DashboardWidget {
  id: string;
  dashboardId: string;
  
  // Widget configuration
  type: WidgetType;
  title: string;
  kpiId?: string; // Reference to KPI definition
  
  // Data source
  queryConfig: WidgetQueryConfig;
  
  // Display
  position: { row: number; col: number; width: number; height: number };
  refreshInterval?: number; // seconds
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface WidgetQueryConfig {
  // Filters
  scopeFilter?: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
    assetCategory?: string;
  };
  
  // Time range
  period: KPIPeriod;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  
  // Aggregation
  groupBy?: string[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
  
  // Status
  statusFilter?: string[];
}

// ============================================================================
// Dashboard Layouts
// ============================================================================

export type DashboardRole = 
  | 'executive'
  | 'project_manager'
  | 'site_manager'
  | 'plant_manager'
  | 'fleet_manager'
  | 'maintenance_manager'
  | 'qc_manager'
  | 'accounts_manager';

export interface DashboardLayout {
  id: string;
  name: string;
  role: DashboardRole;
  
  // Widgets
  widgets: DashboardWidget[];
  
  // Configuration
  isDefault: boolean;
  isEditable: boolean;
  
  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Aggregated Data
// ============================================================================

export interface AggregatedKPI {
  id: string;
  kpiId: string;
  period: KPIPeriod;
  periodStart: string;
  periodEnd: string;
  
  // Values
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  
  // Status breakdown
  statusBreakdown: Record<string, number>;
  
  // Data quality
  sourceLabels: Record<DataSourceLabel, number>;
  lastRefreshedAt: string;
  isStale: boolean;
  
  // Scope
  scope: {
    companyId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
  };
  
  createdAt: string;
}

// ============================================================================
// Dashboard Data
// ============================================================================

export interface DashboardData {
  dashboardId: string;
  layoutId: string;
  
  // Widgets data
  widgetsData: WidgetData[];
  
  // Metadata
  generatedAt: string;
  refreshDuration: number; // milliseconds
  
  // Data quality
  staleDataWarnings: StaleDataWarning[];
  integrationFailures: IntegrationFailure[];
}

export interface WidgetData {
  widgetId: string;
  kpiId?: string;
  
  // Data
  value?: number;
  trend?: number[];
  comparison?: { label: string; value: number }[];
  breakdown?: Record<string, number>;
  items?: any[];
  changePercent?: number;
  
  // Status
  status: 'success' | 'loading' | 'error' | 'stale';
  errorMessage?: string;
  
  // Metadata
  lastRefreshedAt: string;
  sourceLabels: Record<DataSourceLabel, number>;
}

export interface StaleDataWarning {
  widgetId: string;
  kpiId?: string;
  lastRefreshedAt: string;
  stalenessMinutes: number;
  message: string;
}

export interface IntegrationFailure {
  source: string;
  errorMessage: string;
  failedAt: string;
  retryCount: number;
}

// ============================================================================
// Filters
// ============================================================================

export interface DashboardFilter {
  id: string;
  name: string;
  
  // Filter values
  companyId?: string;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  assetCategory?: string;
  customer?: string;
  grade?: string;
  
  // Time range
  period: KPIPeriod;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  
  // Status
  statusFilter?: string[];
  
  // Metadata
  isSaved: boolean;
  createdBy: string;
  createdAt: string;
}

// ============================================================================
// Drill-Down
// ============================================================================

export interface DrillDownConfig {
  sourceWidgetId: string;
  targetDashboardId?: string;
  targetRecordType?: string;
  
  // Filters to pass
  passFilters: string[];
  
  // Authorization
  requiresPermission: string;
}

// ============================================================================
// Export
// ============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export interface DashboardExport {
  id: string;
  dashboardId: string;
  layoutId: string;
  format: ExportFormat;
  
  // Filters at time of export
  filters: DashboardFilter;
  
  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  
  // File
  fileName?: string;
  fileSize?: number;
  downloadUrl?: string;
  
  // Metadata
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
}
