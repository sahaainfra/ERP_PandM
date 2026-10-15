/**
 * Part 03 — Approval Matrix Service
 *
 * Defines approval rules based on resource type, thresholds, and conditions.
 * Determines which role(s) must approve a record.
 */

import { storage } from './storage';
import { UserRole } from './types';
import { generateId } from './utils';

// ============================================================================
// Approval Matrix Types
// ============================================================================

export interface ApprovalRule {
  id: string;
  resourceType: string; // e.g., 'operator_log', 'fuel_verification'
  condition: ApprovalCondition;
  requiredRole: UserRole;
  requiredLevel?: number; // For multi-level approval
  description: string;
  createdAt: string;
}

export interface ApprovalCondition {
  type: 'threshold' | 'value' | 'always' | 'custom';
  field?: string; // Field to check (e.g., 'variance_percent', 'amount')
  operator?: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'between';
  value?: number | string | [number, number];
  customFn?: string; // For complex conditions (future)
}

const approvalRulesStore = storage.getAdapter<ApprovalRule>('approval_rules');

// ============================================================================
// Approval Matrix Management
// ============================================================================

/**
 * Create an approval rule.
 */
export async function createApprovalRule(params: {
  resourceType: string;
  condition: ApprovalCondition;
  requiredRole: UserRole;
  requiredLevel?: number;
  description: string;
}): Promise<ApprovalRule> {
  const rule: ApprovalRule = {
    id: generateId(),
    resourceType: params.resourceType,
    condition: params.condition,
    requiredRole: params.requiredRole,
    requiredLevel: params.requiredLevel || 1,
    description: params.description,
    createdAt: new Date().toISOString(),
  };

  return approvalRulesStore.create(rule);
}

/**
 * Get approval rules for a resource type.
 */
export async function getApprovalRules(resourceType: string): Promise<ApprovalRule[]> {
  const rules = await approvalRulesStore.findAll({
    resourceType,
  } as Partial<ApprovalRule>);

  // Sort by level (lower level = first approver)
  return rules.sort((a, b) => (a.requiredLevel || 1) - (b.requiredLevel || 1));
}

/**
 * Determine which role must approve a specific record.
 */
export async function getRequiredApprover(
  resourceType: string,
  recordData: Record<string, unknown>,
  currentLevel: number = 1
): Promise<{ role: UserRole; rule: ApprovalRule } | null> {
  const rules = await getApprovalRules(resourceType);

  // Find rules for the current approval level
  const levelRules = rules.filter(r => (r.requiredLevel || 1) === currentLevel);

  // Check each rule's condition
  for (const rule of levelRules) {
    if (evaluateCondition(rule.condition, recordData)) {
      return { role: rule.requiredRole, rule };
    }
  }

  // If no rule matches, check if there's a default "always" rule
  const defaultRule = levelRules.find(r => r.condition.type === 'always');
  if (defaultRule) {
    return { role: defaultRule.requiredRole, rule: defaultRule };
  }

  return null;
}

/**
 * Evaluate an approval condition against record data.
 */
function evaluateCondition(
  condition: ApprovalCondition,
  data: Record<string, unknown>
): boolean {
  switch (condition.type) {
    case 'always':
      return true;

    case 'threshold':
    case 'value':
      if (!condition.field || !condition.operator || condition.value === undefined) {
        return false;
      }

      const fieldValue = data[condition.field];
      if (fieldValue === undefined || fieldValue === null) {
        return false;
      }

      return compareValues(fieldValue, condition.operator, condition.value);

    case 'custom':
      // Future: evaluate custom function
      return false;

    default:
      return false;
  }
}

/**
 * Compare a field value against a condition value.
 */
function compareValues(
  fieldValue: unknown,
  operator: string,
  conditionValue: number | string | [number, number]
): boolean {
  // Handle numeric comparisons
  if (typeof fieldValue === 'number') {
    if (typeof conditionValue === 'number') {
      switch (operator) {
        case '>':
          return fieldValue > conditionValue;
        case '<':
          return fieldValue < conditionValue;
        case '>=':
          return fieldValue >= conditionValue;
        case '<=':
          return fieldValue <= conditionValue;
        case '==':
          return fieldValue === conditionValue;
        case '!=':
          return fieldValue !== conditionValue;
        default:
          return false;
      }
    }

    if (Array.isArray(conditionValue) && conditionValue.length === 2) {
      const [min, max] = conditionValue;
      return fieldValue >= min && fieldValue <= max;
    }
  }

  // Handle string comparisons
  if (typeof fieldValue === 'string' && typeof conditionValue === 'string') {
    switch (operator) {
      case '==':
        return fieldValue === conditionValue;
      case '!=':
        return fieldValue !== conditionValue;
      default:
        return false;
    }
  }

  return false;
}

/**
 * Get all approval rules.
 */
export async function getAllApprovalRules(): Promise<ApprovalRule[]> {
  return approvalRulesStore.findAll();
}

/**
 * Delete an approval rule.
 */
export async function deleteApprovalRule(ruleId: string): Promise<void> {
  await approvalRulesStore.delete(ruleId);
}

// ============================================================================
// Seed Default Approval Rules
// ============================================================================

export async function seedDefaultApprovalRules(): Promise<void> {
  const existing = await approvalRulesStore.findAll();
  if (existing.length > 0) return;

  const defaultRules: Array<{
    resourceType: string;
    condition: ApprovalCondition;
    requiredRole: UserRole;
    requiredLevel?: number;
    description: string;
  }> = [
    // Operator Log Approval
    {
      resourceType: 'operator_log',
      condition: { type: 'always' },
      requiredRole: 'site_manager',
      requiredLevel: 1,
      description: 'All operator logs require Site Manager approval',
    },

    // Fuel Verification Approval
    {
      resourceType: 'fuel_verification',
      condition: {
        type: 'threshold',
        field: 'variance_percent',
        operator: '<=',
        value: 5,
      },
      requiredRole: 'site_manager',
      requiredLevel: 1,
      description: 'Fuel variance ≤5%: Site Manager approval',
    },
    {
      resourceType: 'fuel_verification',
      condition: {
        type: 'threshold',
        field: 'variance_percent',
        operator: '>',
        value: 5,
      },
      requiredRole: 'fleet_manager',
      requiredLevel: 1,
      description: 'Fuel variance >5%: Fleet Manager approval',
    },
    {
      resourceType: 'fuel_verification',
      condition: {
        type: 'threshold',
        field: 'variance_percent',
        operator: '>',
        value: 20,
      },
      requiredRole: 'project_manager',
      requiredLevel: 2,
      description: 'Fuel variance >20%: Project Manager approval (Level 2)',
    },

    // Maintenance Order Approval
    {
      resourceType: 'maintenance_order',
      condition: {
        type: 'threshold',
        field: 'estimated_cost',
        operator: '<=',
        value: 50000,
      },
      requiredRole: 'fleet_manager',
      requiredLevel: 1,
      description: 'Maintenance cost ≤₹50,000: Fleet Manager approval',
    },
    {
      resourceType: 'maintenance_order',
      condition: {
        type: 'threshold',
        field: 'estimated_cost',
        operator: '>',
        value: 50000,
      },
      requiredRole: 'project_manager',
      requiredLevel: 1,
      description: 'Maintenance cost >₹50,000: Project Manager approval',
    },
    {
      resourceType: 'maintenance_order',
      condition: {
        type: 'threshold',
        field: 'estimated_cost',
        operator: '>',
        value: 200000,
      },
      requiredRole: 'company_admin',
      requiredLevel: 2,
      description: 'Maintenance cost >₹2,00,000: Company Admin approval (Level 2)',
    },

    // RMC Order Approval
    {
      resourceType: 'rmc_order',
      condition: { type: 'always' },
      requiredRole: 'plant_manager',
      requiredLevel: 1,
      description: 'All RMC orders require Plant Manager approval',
    },

    // Batch Ticket Approval
    {
      resourceType: 'batch_ticket',
      condition: { type: 'always' },
      requiredRole: 'plant_manager',
      requiredLevel: 1,
      description: 'All batch tickets require Plant Manager approval',
    },

    // QC Test Approval
    {
      resourceType: 'qc_test',
      condition: { type: 'always' },
      requiredRole: 'qc_manager',
      requiredLevel: 1,
      description: 'All QC tests require QC Manager approval',
    },

    // Journal Voucher Approval
    {
      resourceType: 'journal_voucher',
      condition: {
        type: 'threshold',
        field: 'amount',
        operator: '<=',
        value: 100000,
      },
      requiredRole: 'accounts_manager',
      requiredLevel: 1,
      description: 'JV amount ≤₹1,00,000: Accounts Manager approval',
    },
    {
      resourceType: 'journal_voucher',
      condition: {
        type: 'threshold',
        field: 'amount',
        operator: '>',
        value: 100000,
      },
      requiredRole: 'company_admin',
      requiredLevel: 1,
      description: 'JV amount >₹1,00,000: Company Admin approval',
    },

    // Payment Voucher Approval
    {
      resourceType: 'payment_voucher',
      condition: {
        type: 'threshold',
        field: 'amount',
        operator: '<=',
        value: 50000,
      },
      requiredRole: 'accounts_manager',
      requiredLevel: 1,
      description: 'Payment ≤₹50,000: Accounts Manager approval',
    },
    {
      resourceType: 'payment_voucher',
      condition: {
        type: 'threshold',
        field: 'amount',
        operator: '>',
        value: 50000,
      },
      requiredRole: 'project_manager',
      requiredLevel: 1,
      description: 'Payment >₹50,000: Project Manager approval',
    },
    {
      resourceType: 'payment_voucher',
      condition: {
        type: 'threshold',
        field: 'amount',
        operator: '>',
        value: 500000,
      },
      requiredRole: 'company_admin',
      requiredLevel: 2,
      description: 'Payment >₹5,00,000: Company Admin approval (Level 2)',
    },
  ];

  for (const rule of defaultRules) {
    await createApprovalRule(rule);
  }
}
