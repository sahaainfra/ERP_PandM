/**
 * Part 08 — Workflow Configuration Service
 */

import { storage } from './storage';
import { ApprovalRoutingRule, ValidationFlagDefinition, ApprovalSLA, ValidationFlagCode } from './workflowConfigTypes';
import { AssetCategory } from './assetTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { registerAlertRule } from './alerts';

const routingRulesStore = storage.getAdapter<ApprovalRoutingRule>('approval_routing_rules');
const validationFlagsStore = storage.getAdapter<ValidationFlagDefinition>('validation_flags');
const slaStore = storage.getAdapter<ApprovalSLA>('approval_slas');

// ============================================================================
// Routing Rules Management
// ============================================================================

export async function createRoutingRule(
  data: Omit<ApprovalRoutingRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApprovalRoutingRule> {
  const rule: ApprovalRoutingRule = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await routingRulesStore.create(rule);

  await recordAudit({
    entityType: 'ApprovalRoutingRule',
    entityId: rule.id,
    action: 'create',
    before: null,
    after: rule as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Routing rule created',
  });

  return rule;
}

export async function getRoutingRule(id: string): Promise<ApprovalRoutingRule | null> {
  return routingRulesStore.findById(id);
}

export async function listRoutingRules(filters?: {
  assetCategory?: AssetCategory;
  siteId?: string;
  plantId?: string;
  isActive?: boolean;
}): Promise<ApprovalRoutingRule[]> {
  let rules = await routingRulesStore.findAll();

  if (filters?.assetCategory) {
    rules = rules.filter(r => r.assetCategory === filters.assetCategory);
  }
  if (filters?.siteId) {
    rules = rules.filter(r => r.siteId === filters.siteId);
  }
  if (filters?.plantId) {
    rules = rules.filter(r => r.plantId === filters.plantId);
  }
  if (filters?.isActive !== undefined) {
    rules = rules.filter(r => r.isActive === filters.isActive);
  }

  return rules;
}

export async function updateRoutingRule(
  id: string,
  updates: Partial<ApprovalRoutingRule>,
  userId: string
): Promise<ApprovalRoutingRule> {
  const rule = await routingRulesStore.findById(id);
  if (!rule) {
    throw new Error(`Routing rule ${id} not found`);
  }

  const updated = await routingRulesStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ApprovalRoutingRule',
    entityId: id,
    action: 'update',
    before: rule as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Routing rule updated',
  });

  return updated;
}

/**
 * Determine approver for a submission based on routing rules
 */
export async function determineApprover(params: {
  assetCategory: AssetCategory;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  hasException: boolean;
  escalationLevel?: number;
}): Promise<{
  approverRole: string;
  approverLevel: number;
  rule: ApprovalRoutingRule | null;
}> {
  const rules = await listRoutingRules({ isActive: true });
  
  // Find matching rule
  let matchingRule = rules.find(r => 
    r.assetCategory === params.assetCategory &&
    r.siteId === params.siteId &&
    r.plantId === params.plantId &&
    new Date(r.effectiveFrom) <= new Date() &&
    (!r.effectiveTo || new Date(r.effectiveTo) >= new Date())
  );

  // Fallback to category-only rule
  if (!matchingRule) {
    matchingRule = rules.find(r => 
      r.assetCategory === params.assetCategory &&
      !r.siteId &&
      !r.plantId &&
      new Date(r.effectiveFrom) <= new Date() &&
      (!r.effectiveTo || new Date(r.effectiveTo) >= new Date())
    );
  }

  if (!matchingRule) {
    // Default fallback
    return {
      approverRole: 'site_manager',
      approverLevel: 1,
      rule: null,
    };
  }

  // Handle exceptions
  if (params.hasException && matchingRule.exceptionApproverRole) {
    return {
      approverRole: matchingRule.exceptionApproverRole,
      approverLevel: matchingRule.exceptionApproverLevel || matchingRule.approverLevel + 1,
      rule: matchingRule,
    };
  }

  // Handle escalation
  if (params.escalationLevel && matchingRule.escalationRole) {
    return {
      approverRole: matchingRule.escalationRole,
      approverLevel: matchingRule.escalationLevel || params.escalationLevel,
      rule: matchingRule,
    };
  }

  return {
    approverRole: matchingRule.approverRole,
    approverLevel: matchingRule.approverLevel,
    rule: matchingRule,
  };
}

// ============================================================================
// Validation Flags Management
// ============================================================================

export async function createValidationFlag(
  data: Omit<ValidationFlagDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ValidationFlagDefinition> {
  const flag: ValidationFlagDefinition = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await validationFlagsStore.create(flag);

  // Register alert rule if configured
  if (flag.raiseAlert) {
    await registerAlertRule({
      code: flag.alertRuleCode,
      name: flag.name,
      description: flag.description,
      module: 'Workflow',
      severity: flag.severity === 'critical' ? 'critical' : flag.severity === 'error' ? 'high' : 'warning',
      condition: `validation_flag:${flag.code}`,
      recipientRoles: ['site_manager', 'fleet_manager'],
      escalationHours: 24,
    });
  }

  await recordAudit({
    entityType: 'ValidationFlag',
    entityId: flag.id,
    action: 'create',
    before: null,
    after: flag as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Validation flag created',
  });

  return flag;
}

export async function getValidationFlag(code: ValidationFlagCode): Promise<ValidationFlagDefinition | null> {
  return validationFlagsStore.findOne({ code } as Partial<ValidationFlagDefinition>);
}

export async function listValidationFlags(filters?: {
  severity?: string;
  isActive?: boolean;
}): Promise<ValidationFlagDefinition[]> {
  let flags = await validationFlagsStore.findAll();

  if (filters?.severity) {
    flags = flags.filter(f => f.severity === filters.severity);
  }
  if (filters?.isActive !== undefined) {
    flags = flags.filter(f => f.isActive === filters.isActive);
  }

  return flags;
}

export async function updateValidationFlag(
  code: ValidationFlagCode,
  updates: Partial<ValidationFlagDefinition>,
  userId: string
): Promise<ValidationFlagDefinition> {
  const flag = await validationFlagsStore.findOne({ code } as Partial<ValidationFlagDefinition>);
  if (!flag) {
    throw new Error(`Validation flag ${code} not found`);
  }

  const updated = await validationFlagsStore.update(flag.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ValidationFlag',
    entityId: flag.id,
    action: 'update',
    before: flag as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Validation flag updated',
  });

  return updated;
}

/**
 * Check if validation flag blocks approval
 */
export async function doesFlagBlockApproval(flagCode: ValidationFlagCode): Promise<boolean> {
  const flag = await getValidationFlag(flagCode);
  return flag?.blocksApproval || false;
}

/**
 * Get threshold for a validation flag and asset category
 */
export async function getFlagThreshold(
  flagCode: ValidationFlagCode,
  assetCategory: AssetCategory
): Promise<number | undefined> {
  const flag = await getValidationFlag(flagCode);
  return flag?.thresholds[assetCategory];
}

// ============================================================================
// SLA Management
// ============================================================================

export async function createSLA(
  data: Omit<ApprovalSLA, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ApprovalSLA> {
  const sla: ApprovalSLA = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await slaStore.create(sla);

  await recordAudit({
    entityType: 'ApprovalSLA',
    entityId: sla.id,
    action: 'create',
    before: null,
    after: sla as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'SLA created',
  });

  return sla;
}

export async function getSLA(siteId?: string, plantId?: string): Promise<ApprovalSLA | null> {
  if (siteId) {
    const sla = await slaStore.findOne({ siteId } as Partial<ApprovalSLA>);
    if (sla) return sla;
  }
  
  if (plantId) {
    const sla = await slaStore.findOne({ plantId } as Partial<ApprovalSLA>);
    if (sla) return sla;
  }

  // Return default SLA
  const allSlas = await slaStore.findAll();
  return allSlas[0] || null;
}

export async function listSLAs(): Promise<ApprovalSLA[]> {
  return slaStore.findAll();
}

export async function updateSLA(
  id: string,
  updates: Partial<ApprovalSLA>,
  userId: string
): Promise<ApprovalSLA> {
  const sla = await slaStore.findById(id);
  if (!sla) {
    throw new Error(`SLA ${id} not found`);
  }

  const updated = await slaStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ApprovalSLA',
    entityId: id,
    action: 'update',
    before: sla as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'SLA updated',
  });

  return updated;
}

// ============================================================================
// Seed Default Configuration
// ============================================================================

export async function seedDefaultWorkflowConfig(): Promise<void> {
  // Seed validation flags
  const existingFlags = await validationFlagsStore.findAll();
  if (existingFlags.length === 0) {
    await seedDefaultValidationFlags();
  }

  // Seed routing rules
  const existingRules = await routingRulesStore.findAll();
  if (existingRules.length === 0) {
    await seedDefaultRoutingRules();
  }

  // Seed SLAs
  const existingSlas = await slaStore.findAll();
  if (existingSlas.length === 0) {
    await seedDefaultSLAs();
  }
}

export async function seedDefaultValidationFlags(): Promise<void> {
  const flags: Omit<ValidationFlagDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      code: 'MISSING_EVIDENCE',
      name: 'Missing Photo Evidence',
      description: 'Required photo evidence is missing',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_MISSING_EVIDENCE',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: true,
      isActive: true,
    },
    {
      code: 'MISSING_FIELD',
      name: 'Missing Required Field',
      description: 'A required field is missing',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_MISSING_FIELD',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'DECREASING_READING',
      name: 'Decreasing Meter Reading',
      description: 'Meter reading decreased from previous',
      severity: 'critical',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_DECREASING_READING',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: true,
      isActive: true,
    },
    {
      code: 'IMPLAUSIBLE_USAGE',
      name: 'Implausible Usage',
      description: 'Usage exceeds reasonable limits',
      severity: 'warning',
      thresholds: {
        earthmoving: 24,
        transport: 1000,
        concrete: 24,
        compaction: 24,
        lifting_handling: 24,
        power_air: 24,
        light_support: 1000,
      },
      alertRuleCode: 'VALIDATION_IMPLAUSIBLE_USAGE',
      raiseAlert: true,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'READING_GAP',
      name: 'Reading Gap',
      description: 'Opening reading does not match previous closing',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_READING_GAP',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: true,
      isActive: true,
    },
    {
      code: 'DUPLICATE_SUBMISSION',
      name: 'Duplicate Submission',
      description: 'Duplicate submission detected',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_DUPLICATE_SUBMISSION',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'MISSING_CLOSING_READING',
      name: 'Missing Closing Reading',
      description: 'Closing meter reading is missing',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_MISSING_CLOSING_READING',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: true,
      isActive: true,
    },
    {
      code: 'UNASSIGNED_ASSET',
      name: 'Unassigned Asset',
      description: 'Asset is not currently allocated',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_UNASSIGNED_ASSET',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'UNAUTHORIZED_OPERATOR',
      name: 'Unauthorized Operator',
      description: 'Operator is not authorized for this asset',
      severity: 'error',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_UNAUTHORIZED_OPERATOR',
      raiseAlert: true,
      blocksApproval: true,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'HIGH_IDLE_RATIO',
      name: 'High Idle Ratio',
      description: 'Idle time exceeds threshold',
      severity: 'warning',
      thresholds: {
        earthmoving: 30,
        transport: 40,
        concrete: 25,
        compaction: 30,
        lifting_handling: 35,
        power_air: 20,
        light_support: 40,
      },
      alertRuleCode: 'VALIDATION_HIGH_IDLE_RATIO',
      raiseAlert: true,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'TELEMATICS_MISMATCH',
      name: 'Telematics Mismatch',
      description: 'Telematics data does not match submission',
      severity: 'warning',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_TELEMATICS_MISMATCH',
      raiseAlert: true,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'ABNORMAL_FUEL',
      name: 'Abnormal Fuel Consumption',
      description: 'Fuel consumption is abnormal',
      severity: 'warning',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_ABNORMAL_FUEL',
      raiseAlert: true,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'LATE_SUBMISSION',
      name: 'Late Submission',
      description: 'Submission was submitted late',
      severity: 'info',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_LATE_SUBMISSION',
      raiseAlert: false,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
    {
      code: 'OVERDUE_APPROVAL',
      name: 'Overdue Approval',
      description: 'Approval is overdue',
      severity: 'warning',
      thresholds: {} as Record<AssetCategory, number | undefined>,
      alertRuleCode: 'VALIDATION_OVERDUE_APPROVAL',
      raiseAlert: true,
      blocksApproval: false,
      requiresException: false,
      isActive: true,
    },
  ];

  for (const flag of flags) {
    await createValidationFlag(flag);
  }
}

export async function seedDefaultRoutingRules(): Promise<void> {
  const rules: Omit<ApprovalRoutingRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      name: 'Earthmoving - Site Manager',
      description: 'Earthmoving equipment submissions routed to Site Manager',
      assetCategory: 'earthmoving',
      approverRole: 'site_manager',
      approverLevel: 1,
      escalationRole: 'fleet_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'fleet_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
    {
      name: 'Transport - Site Manager',
      description: 'Transport equipment submissions routed to Site Manager',
      assetCategory: 'transport',
      approverRole: 'site_manager',
      approverLevel: 1,
      escalationRole: 'fleet_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'fleet_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
    {
      name: 'Concrete - Plant Manager',
      description: 'Concrete equipment submissions routed to Plant Manager',
      assetCategory: 'concrete',
      approverRole: 'plant_manager',
      approverLevel: 1,
      escalationRole: 'project_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'project_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
    {
      name: 'Compaction - Site Manager',
      description: 'Compaction equipment submissions routed to Site Manager',
      assetCategory: 'compaction',
      approverRole: 'site_manager',
      approverLevel: 1,
      escalationRole: 'fleet_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'fleet_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
    {
      name: 'Lifting - Site Manager',
      description: 'Lifting equipment submissions routed to Site Manager',
      assetCategory: 'lifting_handling',
      approverRole: 'site_manager',
      approverLevel: 1,
      escalationRole: 'fleet_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'fleet_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
    {
      name: 'Power - Plant Manager',
      description: 'Power equipment submissions routed to Plant Manager',
      assetCategory: 'power_air',
      approverRole: 'plant_manager',
      approverLevel: 1,
      escalationRole: 'project_manager',
      escalationLevel: 2,
      escalationHours: 24,
      exceptionApproverRole: 'project_manager',
      exceptionApproverLevel: 2,
      effectiveFrom: '2024-01-01',
      isActive: true,
    },
  ];

  for (const rule of rules) {
    await createRoutingRule(rule);
  }
}

export async function seedDefaultSLAs(): Promise<void> {
  const sla: Omit<ApprovalSLA, 'id' | 'createdAt' | 'updatedAt'> = {
    approvalDeadlineHours: 24,
    approvalDeadlineTime: '11:00',
    escalationLevels: [
      {
        level: 1,
        role: 'site_manager',
        hoursAfterDeadline: 0,
        notifyBy: ['in_app', 'email'],
      },
      {
        level: 2,
        role: 'fleet_manager',
        hoursAfterDeadline: 24,
        notifyBy: ['in_app', 'email', 'sms'],
      },
      {
        level: 3,
        role: 'project_manager',
        hoursAfterDeadline: 48,
        notifyBy: ['in_app', 'email', 'sms', 'push'],
      },
    ],
    notifyApprover: true,
    notifyEscalation: true,
    notifyOperator: true,
    isActive: true,
  };

  await createSLA(sla);
}
