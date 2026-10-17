/**
 * Part 11 — Preventive Maintenance Service
 */

import { storage } from './storage';
import { PMPlan, PMWorkOrder, MaintenanceConfiguration } from './maintenanceTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getAsset, listAssets } from './assets';
import { listLogbooks } from './logbookService';

const pmPlansStore = storage.getAdapter<PMPlan>('pm_plans');
const pmWorkOrdersStore = storage.getAdapter<PMWorkOrder>('pm_work_orders');
const configStore = storage.getAdapter<MaintenanceConfiguration>('maintenance_config');

// ============================================================================
// Configuration
// ============================================================================

export async function getMaintenanceConfiguration(): Promise<MaintenanceConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    // Return default configuration
    const defaultConfig: MaintenanceConfiguration = {
      id: 'default',
      pmDueSooonAlertDays: 7,
      pmOverdueAlertDays: 1,
      safetyHoldRequiresDualApproval: true,
      minimumEventsForMTBF: 3,
      minimumEventsForMTTR: 3,
      minimumOperatingHoursForMetrics: 100,
      defaultLabourRatePerHour: 500,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }
  return configs[0];
}

export async function updateMaintenanceConfiguration(
  updates: Partial<MaintenanceConfiguration>
): Promise<MaintenanceConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const config: MaintenanceConfiguration = {
      id: generateId(),
      pmDueSooonAlertDays: updates.pmDueSooonAlertDays ?? 7,
      pmOverdueAlertDays: updates.pmOverdueAlertDays ?? 1,
      safetyHoldRequiresDualApproval: updates.safetyHoldRequiresDualApproval ?? true,
      minimumEventsForMTBF: updates.minimumEventsForMTBF ?? 3,
      minimumEventsForMTTR: updates.minimumEventsForMTTR ?? 3,
      minimumOperatingHoursForMetrics: updates.minimumOperatingHoursForMetrics ?? 100,
      defaultLabourRatePerHour: updates.defaultLabourRatePerHour ?? 500,
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
// PM Plan Management
// ============================================================================

export async function createPMPlan(
  inputData: Omit<PMPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PMPlan> {
  const plan: PMPlan = {
    ...inputData,
    id: generateId(),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await pmPlansStore.create(plan);

  await recordAudit({
    entityType: 'PMPlan',
    entityId: plan.id,
    action: 'create',
    before: null,
    after: plan as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'PM plan created',
  });

  return plan;
}

export async function getPMPlan(id: string): Promise<PMPlan | null> {
  return pmPlansStore.findById(id);
}

export async function listPMPlans(filters?: {
  assetId?: string;
  make?: string;
  model?: string;
  assetCategory?: string;
  status?: string;
}): Promise<PMPlan[]> {
  let plans = await pmPlansStore.findAll();

  if (filters?.assetId) {
    plans = plans.filter(p => p.assetId === filters.assetId);
  }
  if (filters?.make) {
    plans = plans.filter(p => p.make === filters.make);
  }
  if (filters?.model) {
    plans = plans.filter(p => p.model === filters.model);
  }
  if (filters?.assetCategory) {
    plans = plans.filter(p => p.assetCategory === filters.assetCategory);
  }
  if (filters?.status) {
    plans = plans.filter(p => p.status === filters.status);
  }

  return plans;
}

export async function updatePMPlan(
  id: string,
  updates: Partial<PMPlan>,
  userId: string
): Promise<PMPlan> {
  const plan = await pmPlansStore.findById(id);
  if (!plan) {
    throw new Error(`PM plan ${id} not found`);
  }

  const updated = await pmPlansStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'PMPlan',
    entityId: id,
    action: 'update',
    before: plan as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'PM plan updated',
  });

  return updated;
}

// ============================================================================
// Next Due Calculation
// ============================================================================

export async function calculateNextDue(planId: string): Promise<PMPlan> {
  const plan = await pmPlansStore.findById(planId);
  if (!plan) {
    throw new Error(`PM plan ${planId} not found`);
  }

  let nextDueDate: string | undefined;
  let nextDueMeterReading: number | undefined;

  if (plan.intervalType === 'calendar_days') {
    // Calendar-based: next due = last performed + interval
    if (plan.lastPerformedDate) {
      const lastDate = new Date(plan.lastPerformedDate);
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + plan.intervalValue);
      nextDueDate = nextDate.toISOString().split('T')[0];
    }
  } else if (plan.intervalType === 'hours' || plan.intervalType === 'kilometres') {
    // Meter-based: next due = last meter reading + interval
    if (plan.lastPerformedMeterReading !== undefined) {
      nextDueMeterReading = plan.lastPerformedMeterReading + plan.intervalValue;
    }

    // Also calculate date-based due if we have asset and logbook data
    if (plan.assetId) {
      const logbooks = await listLogbooks({ assetId: plan.assetId, status: 'approved' });
      if (logbooks.length > 0) {
        const latestLogbook = logbooks[0]; // Already sorted by date descending
        const currentReading = plan.intervalType === 'hours' 
          ? latestLogbook.closingHourMeter 
          : latestLogbook.closingOdometer;

        if (currentReading !== undefined) {
          // Estimate days until due based on average daily usage
          const dailyUsage = 10; // Default 10 hours/km per day
          const remaining = (nextDueMeterReading || 0) - currentReading;
          const daysUntilDue = Math.ceil(remaining / dailyUsage);
          
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + daysUntilDue);
          nextDueDate = nextDate.toISOString().split('T')[0];
        }
      }
    }
  }

  const updated = await pmPlansStore.update(planId, {
    nextDueDate,
    nextDueMeterReading,
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

// ============================================================================
// PM Due Checks
// ============================================================================

export async function checkPMDueStatus(): Promise<{
  dueSoon: PMPlan[];
  overdue: PMPlan[];
}> {
  const config = await getMaintenanceConfiguration();
  const plans = await pmPlansStore.findAll({ status: 'active' } as any);
  
  const dueSoon: PMPlan[] = [];
  const overdue: PMPlan[] = [];
  const now = new Date();

  for (const plan of plans) {
    if (!plan.nextDueDate) continue;

    const dueDate = new Date(plan.nextDueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      // Overdue
      overdue.push(plan);
      
      await raiseAlert({
        ruleCode: 'PM_OVERDUE',
        severity: 'high',
        title: `PM Overdue for Asset`,
        description: `Preventive maintenance for asset ${plan.assetId || plan.make + ' ' + plan.model} is overdue by ${Math.abs(daysUntilDue)} days`,
        module: 'Maintenance',
        entityType: 'PMPlan',
        entityId: plan.id,
        responsibleRole: 'maintenance_manager',
        recommendedAction: 'Schedule PM immediately',
        dueInHours: 24,
        requestId: generateId(),
      });
    } else if (daysUntilDue <= config.pmDueSooonAlertDays) {
      // Due soon
      dueSoon.push(plan);
      
      await raiseAlert({
        ruleCode: 'PM_DUE',
        severity: 'warning',
        title: `PM Due Soon`,
        description: `Preventive maintenance for asset ${plan.assetId || plan.make + ' ' + plan.model} is due in ${daysUntilDue} days`,
        module: 'Maintenance',
        entityType: 'PMPlan',
        entityId: plan.id,
        responsibleRole: 'maintenance_manager',
        recommendedAction: 'Schedule PM within the next week',
        dueInHours: 7 * 24,
        requestId: generateId(),
      });
    }
  }

  return { dueSoon, overdue };
}

// ============================================================================
// PM Work Order Management
// ============================================================================

export async function createPMWorkOrder(
  inputData: Omit<PMWorkOrder, 'id' | 'workOrderNumber' | 'createdAt' | 'updatedAt'>
): Promise<PMWorkOrder> {
  // Generate work order number
  const workOrderNumber = `PM-WO-${Date.now()}`;

  const workOrder: PMWorkOrder = {
    ...inputData,
    id: generateId(),
    workOrderNumber,
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await pmWorkOrdersStore.create(workOrder);

  // Update PM plan
  if (inputData.pmPlanId) {
    await pmPlansStore.update(inputData.pmPlanId, {
      lastPerformedDate: inputData.scheduledDate,
      lastPerformedMeterReading: inputData.scheduledMeterReading,
      updatedAt: new Date().toISOString(),
    });

    // Recalculate next due
    await calculateNextDue(inputData.pmPlanId);
  }

  await recordAudit({
    entityType: 'PMWorkOrder',
    entityId: workOrder.id,
    action: 'create',
    before: null,
    after: workOrder as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'PM work order created',
  });

  return workOrder;
}

export async function getPMWorkOrder(id: string): Promise<PMWorkOrder | null> {
  return pmWorkOrdersStore.findById(id);
}

export async function listPMWorkOrders(filters?: {
  pmPlanId?: string;
  assetId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PMWorkOrder[]> {
  let workOrders = await pmWorkOrdersStore.findAll();

  if (filters?.pmPlanId) {
    workOrders = workOrders.filter(wo => wo.pmPlanId === filters.pmPlanId);
  }
  if (filters?.assetId) {
    workOrders = workOrders.filter(wo => wo.assetId === filters.assetId);
  }
  if (filters?.status) {
    workOrders = workOrders.filter(wo => wo.status === filters.status);
  }
  if (filters?.fromDate) {
    workOrders = workOrders.filter(wo => wo.scheduledDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    workOrders = workOrders.filter(wo => wo.scheduledDate <= filters.toDate!);
  }

  return workOrders.sort((a, b) => 
    new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );
}

export async function updatePMWorkOrder(
  id: string,
  updates: Partial<PMWorkOrder>,
  userId: string
): Promise<PMWorkOrder> {
  const workOrder = await pmWorkOrdersStore.findById(id);
  if (!workOrder) {
    throw new Error(`PM work order ${id} not found`);
  }

  const updated = await pmWorkOrdersStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'PMWorkOrder',
    entityId: id,
    action: 'update',
    before: workOrder as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'PM work order updated',
  });

  return updated;
}

export async function completePMWorkOrder(
  id: string,
  checklistId: string,
  actualMeterReading: number,
  userId: string
): Promise<PMWorkOrder> {
  const workOrder = await pmWorkOrdersStore.findById(id);
  if (!workOrder) {
    throw new Error(`PM work order ${id} not found`);
  }

  const updated = await pmWorkOrdersStore.update(id, {
    status: 'completed',
    actualEndDate: new Date().toISOString(),
    actualMeterReading,
    checklistId,
    checklistCompleted: true,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'PMWorkOrder',
    entityId: id,
    action: 'update',
    before: workOrder as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'maintenance_manager',
    requestId: generateId(),
    reason: 'PM work order completed',
  });

  return updated;
}

// ============================================================================
// PM Statistics
// ============================================================================

export async function getPMStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalPlans: number;
  activePlans: number;
  scheduledWorkOrders: number;
  completedWorkOrders: number;
  complianceRate: number;
}> {
  let plans = await pmPlansStore.findAll();
  let workOrders = await pmWorkOrdersStore.findAll();

  if (filters?.fromDate) {
    workOrders = workOrders.filter(wo => wo.scheduledDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    workOrders = workOrders.filter(wo => wo.scheduledDate <= filters.toDate!);
  }

  const activePlans = plans.filter(p => p.status === 'active').length;
  const scheduledWorkOrders = workOrders.filter(wo => wo.status === 'scheduled').length;
  const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed').length;
  const totalWorkOrders = workOrders.length;

  const complianceRate = totalWorkOrders > 0 
    ? (completedWorkOrders / totalWorkOrders) * 100 
    : 0;

  return {
    totalPlans: plans.length,
    activePlans,
    scheduledWorkOrders,
    completedWorkOrders,
    complianceRate: Math.round(complianceRate * 10) / 10,
  };
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultPMPlans(): Promise<void> {
  const existing = await pmPlansStore.findAll();
  if (existing.length > 0) return;

  // Create sample PM plans for different asset categories
  const plans = [
    {
      make: 'CAT',
      model: '320',
      assetCategory: 'earthmoving',
      intervalType: 'hours' as const,
      intervalValue: 250,
      toleranceWindowPercent: 10,
      checklistTemplateId: 'checklist_earthmoving_250hr',
      checklistTemplateName: 'Earthmoving 250hr PM',
      requiredPartsKitId: 'kit_earthmoving_250hr',
      requiredPartsKitName: '250hr Service Kit',
      status: 'active' as const,
      createdBy: 'system',
    },
    {
      make: 'Tata',
      model: 'Signet 40k',
      assetCategory: 'transport',
      intervalType: 'kilometres' as const,
      intervalValue: 10000,
      toleranceWindowPercent: 10,
      checklistTemplateId: 'checklist_transport_10000km',
      checklistTemplateName: 'Transport 10000km PM',
      requiredPartsKitId: 'kit_transport_10000km',
      requiredPartsKitName: '10000km Service Kit',
      status: 'active' as const,
      createdBy: 'system',
    },
  ];

  for (const plan of plans) {
    await createPMPlan(plan);
  }
}
