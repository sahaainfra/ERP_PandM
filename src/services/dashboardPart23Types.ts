/**
 * Part 23 — Dashboard and Alert Action Center Types
 */

// ============================================================================
// RMC Production Dashboard Types
// ============================================================================

export interface RMCProductionKPI {
  id: string;
  period: string;
  
  // Production metrics
  plannedProduction: number; // m³
  actualProduction: number; // m³
  productionVariance: number; // m³
  productionVariancePercent: number;
  
  // Batch metrics
  totalBatches: number;
  averageBatchDuration: number; // minutes
  plantUtilization: number; // percentage
  
  // Material consumption
  theoreticalConsumption: Record<string, number>; // material -> kg
  actualConsumption: Record<string, number>; // material -> kg
  consumptionVariance: Record<string, number>; // material -> kg
  
  // Cost metrics
  costPerM3: number; // INR
  totalProductionCost: number; // INR
  
  // Quality metrics
  wastageM3: number;
  rejectedM3: number;
  returnedM3: number;
  
  // Schedule metrics
  orderBacklog: number;
  scheduleAdherence: number; // percentage
  
  // Data quality
  dataSource: 'integrated_live' | 'integrated_delayed' | 'imported' | 'manual';
  lastRefreshedAt: string;
  
  createdAt: string;
}

export interface RMCProductionByPlant {
  plantId: string;
  plantName: string;
  plannedProduction: number;
  actualProduction: number;
  batchCount: number;
  utilization: number;
  costPerM3: number;
}

export interface RMCProductionByGrade {
  grade: string;
  totalProduction: number;
  batchCount: number;
  averageCostPerM3: number;
}

// ============================================================================
// Dispatch and Logistics Dashboard Types
// ============================================================================

export interface DispatchLogisticsKPI {
  id: string;
  period: string;
  
  // Order status
  scheduledOrders: number;
  batchedOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  delayedOrders: number;
  cancelledOrders: number;
  
  // Resource availability
  availableMixers: number;
  totalMixers: number;
  availablePumps: number;
  totalPumps: number;
  
  // Vehicle metrics
  totalTrips: number;
  averageTripsPerMixer: number;
  vehicleUtilization: number; // percentage
  
  // Duration metrics (minutes)
  averageLoadingTime: number;
  averageWaitingTime: number;
  averageTransitTime: number;
  averageUnloadingTime: number;
  
  // Delivery performance
  onTimeDeliveryPercent: number;
  
  // Quantity reconciliation
  orderedQuantity: number; // m³
  producedQuantity: number; // m³
  dispatchedQuantity: number; // m³
  deliveredQuantity: number; // m³
  returnedQuantity: number; // m³
  invoicedQuantity: number; // m³
  
  // Cost metrics
  transportCostPerM3: number; // INR
  totalTransportCost: number; // INR
  
  // Exceptions
  deliveryExceptions: number;
  siteWaitingExcess: number;
  
  // Data quality
  dataSource: 'integrated_live' | 'integrated_delayed' | 'imported' | 'manual';
  lastRefreshedAt: string;
  
  createdAt: string;
}

export interface MixerUtilization {
  mixerId: string;
  mixerNumber: string;
  totalTrips: number;
  totalDistance: number; // km
  totalHours: number;
  utilizationPercent: number;
}

export interface DeliveryException {
  id: string;
  dispatchId: string;
  orderId: string;
  exceptionType: 'delay' | 'waiting' | 'rejection' | 'return';
  severity: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// Financial and Profitability Dashboard Types
// ============================================================================

export interface FinancialKPI {
  id: string;
  period: string;
  
  // Revenue and expenses
  totalRevenue: number; // INR
  totalExpenses: number; // INR
  grossProfit: number; // INR
  grossMargin: number; // percentage
  
  // Cost breakdown
  materialCost: number; // INR
  fuelCost: number; // INR
  fuelVarianceCost: number; // INR (unexplained variance)
  labourCost: number; // INR
  maintenanceCost: number; // INR
  transportCost: number; // INR
  overheadCost: number; // INR
  
  // Equipment costs
  equipmentOwnershipCost: number; // INR
  equipmentOperatingCost: number; // INR
  equipmentRentalCost: number; // INR
  
  // Plant costs
  plantOperatingCost: number; // INR
  plantMaintenanceCost: number; // INR
  
  // Budget vs actual
  budgetedRevenue: number; // INR
  budgetedExpenses: number; // INR
  revenueVariance: number; // INR
  expenseVariance: number; // INR
  
  // Receivables and payables
  totalReceivables: number; // INR
  overdueReceivables: number; // INR
  totalPayables: number; // INR
  overduePayables: number; // INR
  
  // Cash flow
  cashFlowIndicator: 'positive' | 'negative' | 'neutral';
  
  // Inventory
  inventoryValuation: number; // INR
  
  // Unposted transactions
  unpostedTransactions: number;
  unpostedAmount: number; // INR
  
  // Data status
  postedActuals: number; // INR
  approvedUnposted: number; // INR
  estimates: number; // INR
  forecasts: number; // INR
  
  // Data quality
  dataSource: 'integrated_live' | 'integrated_delayed' | 'imported' | 'manual';
  lastRefreshedAt: string;
  
  createdAt: string;
}

export interface ProjectProfitability {
  projectId: string;
  projectName: string;
  revenue: number; // INR
  expenses: number; // INR
  profit: number; // INR
  margin: number; // percentage
}

export interface PlantCostBreakdown {
  plantId: string;
  plantName: string;
  materialCost: number;
  fuelCost: number;
  labourCost: number;
  maintenanceCost: number;
  overheadCost: number;
  totalCost: number;
  production: number; // m³
  costPerM3: number;
}

// ============================================================================
// Alert Action Center Types
// ============================================================================

export type AlertAction = 'acknowledge' | 'assign' | 'reassign' | 'comment' | 'escalate' | 'link' | 'resolve' | 'close';
export type AlertStatus = 'open' | 'acknowledged' | 'assigned' | 'escalated' | 'in_progress' | 'resolved' | 'closed';

export interface AlertActionRecord {
  id: string;
  alertId: string;
  action: AlertAction;
  
  // Action details
  performedBy: string;
  performedAt: string;
  
  // Action-specific data
  assignedTo?: string;
  comment?: string;
  linkedRecordType?: string;
  linkedRecordId?: string;
  resolutionNote?: string;
  
  // Metadata
  createdAt: string;
}

export interface AlertActionCenter {
  id: string;
  alertId: string;
  
  // Alert details
  severity: 'info' | 'warning' | 'high' | 'critical';
  title: string;
  description: string;
  affectedRecordType?: string;
  affectedRecordId?: string;
  
  // Assignment
  responsiblePerson: string;
  responsibleRole: string;
  
  // Timeline
  createdAt: string;
  dueAt?: string;
  acknowledgedAt?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  
  // Status
  status: AlertStatus;
  
  // Metrics
  ageingHours: number;
  timeToAcknowledge?: number; // hours
  timeToResolve?: number; // hours
  
  // Recommended action
  recommendedAction: string;
  
  // Action history
  actions: AlertActionRecord[];
  
  // Metadata
  updatedAt: string;
}

export interface AlertMetrics {
  period: string;
  
  // Counts by severity
  openBySeverity: {
    info: number;
    warning: number;
    high: number;
    critical: number;
  };
  
  // Time metrics
  meanTimeToAcknowledge: number; // hours
  meanTimeToResolve: number; // hours
  
  // Performance
  overduePercent: number;
  resolvedWithinSLA: number;
  totalResolved: number;
  
  // Repeat alerts
  repeatAlertsByAsset: Record<string, number>;
  
  createdAt: string;
}

export interface AlertView {
  type: 'my_alerts' | 'my_team' | 'by_site' | 'by_plant' | 'by_severity' | 'overdue';
  filters: {
    userId?: string;
    teamId?: string;
    siteId?: string;
    plantId?: string;
    severity?: string;
    status?: AlertStatus;
  };
}

// ============================================================================
// Dashboard Configuration
// ============================================================================

export interface DashboardWidgetConfig {
  id: string;
  dashboardType: 'rmc_production' | 'dispatch_logistics' | 'financial';
  widgetType: 'kpi_card' | 'chart' | 'table' | 'gauge';
  
  // Data source
  kpiId?: string;
  queryConfig?: any;
  
  // Display
  title: string;
  position: { row: number; col: number; width: number; height: number };
  
  // Permissions
  requiresPermission?: string; // e.g., 'view_cost'
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}
