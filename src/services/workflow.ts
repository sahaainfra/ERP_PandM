/**
 * 2.5 Generic Workflow & Approval Engine
 *
 * Configurable workflows per record type with states, transitions,
 * required fields, approver rules, escalation, and delegation.
 * Built-in separation of duties: submitter cannot approve own record.
 */

import { storage } from './storage';
import {
  WorkflowDefinition, WorkflowInstance, WorkflowHistoryEntry,
  WorkflowState, WorkflowAction, WorkflowTransition, UserRole
} from './types';
import { generateId } from './utils';
import { recordWorkflowAction } from './audit';

const workflowDefsStore = storage.getAdapter<WorkflowDefinition>('workflow_definitions');
const workflowInstancesStore = storage.getAdapter<WorkflowInstance>('workflow_instances');

// ============================================================================
// Workflow Definitions
// ============================================================================

/**
 * Create a workflow definition.
 */
export async function createWorkflowDefinition(params: {
  entityType: string;
  name: string;
  initialState: WorkflowState;
  transitions: WorkflowTransition[];
  approvalLevels?: number;
  escalationHours?: number;
}): Promise<WorkflowDefinition> {
  const def: WorkflowDefinition = {
    id: generateId(),
    entityType: params.entityType,
    name: params.name,
    initialState: params.initialState,
    transitions: params.transitions,
    approvalLevels: params.approvalLevels || 1,
    escalationHours: params.escalationHours,
    createdAt: new Date().toISOString(),
  };
  return workflowDefsStore.create(def);
}

/**
 * Get workflow definition for an entity type.
 */
export async function getWorkflowDefinition(entityType: string): Promise<WorkflowDefinition | null> {
  return workflowDefsStore.findOne({ entityType } as Partial<WorkflowDefinition>);
}

/**
 * Create default workflow definitions for common entity types.
 */
export async function initializeDefaultWorkflows(): Promise<void> {
  const existing = await workflowDefsStore.findAll();
  if (existing.length > 0) return; // Already initialized

  // Operator Log workflow
  await createWorkflowDefinition({
    entityType: 'OperatorLog',
    name: 'Operator Log Approval',
    initialState: 'draft',
    transitions: [
      { fromState: 'draft', toState: 'submitted', action: 'submit', requiredRoles: ['operator'], reasonRequired: false },
      { fromState: 'submitted', toState: 'pending_approval', action: 'submit', requiredRoles: ['operator'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'approved', action: 'approve', requiredRoles: ['site_manager', 'project_manager'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'rejected', action: 'reject', requiredRoles: ['site_manager', 'project_manager'], reasonRequired: true },
      { fromState: 'pending_approval', toState: 'returned', action: 'return', requiredRoles: ['site_manager', 'project_manager'], reasonRequired: true },
      { fromState: 'pending_approval', toState: 'pending_evidence', action: 'request_evidence', requiredRoles: ['site_manager', 'project_manager'], reasonRequired: true },
      { fromState: 'returned', toState: 'submitted', action: 'submit', requiredRoles: ['operator'], reasonRequired: false },
      { fromState: 'pending_evidence', toState: 'submitted', action: 'submit', requiredRoles: ['operator'], reasonRequired: false },
    ],
    approvalLevels: 1,
    escalationHours: 24,
  });

  // Fuel Record workflow
  await createWorkflowDefinition({
    entityType: 'FuelRecord',
    name: 'Fuel Verification',
    initialState: 'draft',
    transitions: [
      { fromState: 'draft', toState: 'submitted', action: 'submit', requiredRoles: ['fuel_officer'], reasonRequired: false },
      { fromState: 'submitted', toState: 'pending_approval', action: 'submit', requiredRoles: ['fuel_officer'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'approved', action: 'approve', requiredRoles: ['site_manager', 'plant_manager'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'rejected', action: 'reject', requiredRoles: ['site_manager', 'plant_manager'], reasonRequired: true },
      { fromState: 'rejected', toState: 'submitted', action: 'submit', requiredRoles: ['fuel_officer'], reasonRequired: false },
    ],
    approvalLevels: 1,
    escalationHours: 12,
  });

  // Journal Voucher workflow (multi-level)
  await createWorkflowDefinition({
    entityType: 'JournalVoucher',
    name: 'Journal Voucher Approval',
    initialState: 'draft',
    transitions: [
      { fromState: 'draft', toState: 'submitted', action: 'submit', requiredRoles: ['accounts_executive'], reasonRequired: false },
      { fromState: 'submitted', toState: 'pending_approval', action: 'submit', requiredRoles: ['accounts_executive'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'approved', action: 'approve', requiredRoles: ['accounts_manager'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'rejected', action: 'reject', requiredRoles: ['accounts_manager'], reasonRequired: true },
      { fromState: 'approved', toState: 'posted', action: 'post', requiredRoles: ['accounts_manager'], reasonRequired: false },
      { fromState: 'posted', toState: 'reversed', action: 'reverse', requiredRoles: ['accounts_manager'], reasonRequired: true },
    ],
    approvalLevels: 1,
    escalationHours: 48,
  });

  // RMC Order workflow
  await createWorkflowDefinition({
    entityType: 'RMCOrder',
    name: 'RMC Order Confirmation',
    initialState: 'draft',
    transitions: [
      { fromState: 'draft', toState: 'submitted', action: 'submit', requiredRoles: ['site_engineer', 'site_manager'], reasonRequired: false },
      { fromState: 'submitted', toState: 'pending_approval', action: 'submit', requiredRoles: ['site_engineer', 'site_manager'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'approved', action: 'approve', requiredRoles: ['plant_manager', 'project_manager'], reasonRequired: false },
      { fromState: 'pending_approval', toState: 'rejected', action: 'reject', requiredRoles: ['plant_manager', 'project_manager'], reasonRequired: true },
      { fromState: 'approved', toState: 'cancelled', action: 'cancel', requiredRoles: ['plant_manager', 'project_manager'], reasonRequired: true },
    ],
    approvalLevels: 1,
    escalationHours: 4,
  });
}

// ============================================================================
// Workflow Instances
// ============================================================================

/**
 * Start a new workflow instance for an entity.
 */
export async function startWorkflow(params: {
  entityType: string;
  entityId: string;
  submittedBy: string;
  submittedByRole: UserRole;
  requestId: string;
}): Promise<WorkflowInstance> {
  const definition = await getWorkflowDefinition(params.entityType);
  if (!definition) {
    throw new Error(`No workflow definition found for entity type: ${params.entityType}`);
  }

  const instance: WorkflowInstance = {
    id: generateId(),
    definitionId: definition.id,
    entityType: params.entityType,
    entityId: params.entityId,
    currentState: definition.initialState,
    currentLevel: 0,
    submittedBy: params.submittedBy,
    submittedAt: new Date().toISOString(),
    history: [],
  };

  await workflowInstancesStore.create(instance);
  return instance;
}

/**
 * Execute a workflow action (transition).
 */
export async function executeWorkflowAction(params: {
  entityType: string;
  entityId: string;
  action: WorkflowAction;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  comment?: string;
  requestId: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}): Promise<WorkflowInstance> {
  // Find the workflow instance
  const allInstances = await workflowInstancesStore.findAll();
  const instance = allInstances.find(
    i => i.entityType === params.entityType && i.entityId === params.entityId
  );

  if (!instance) {
    throw new Error(`No workflow instance found for ${params.entityType}:${params.entityId}`);
  }

  const definition = await workflowDefsStore.findById(instance.definitionId);
  if (!definition) {
    throw new Error(`Workflow definition ${instance.definitionId} not found`);
  }

  // Find the transition
  const transition = definition.transitions.find(
    t => t.fromState === instance.currentState && t.action === params.action
  );

  if (!transition) {
    throw new Error(
      `Invalid transition: cannot ${params.action} from state '${instance.currentState}'`
    );
  }

  // Check role permission
  if (!transition.requiredRoles.includes(params.actorRole) && params.actorRole !== 'super_admin') {
    throw new Error(
      `Role '${params.actorRole}' is not authorized to ${params.action}. Required: ${transition.requiredRoles.join(', ')}`
    );
  }

  // Separation of duties: submitter cannot approve their own record
  if (params.action === 'approve' && instance.submittedBy === params.actorId) {
    throw new Error('Separation of duties violation: submitter cannot approve their own record');
  }

  // Reason required check
  if (transition.reasonRequired && (!params.reason || params.reason.trim().length === 0)) {
    throw new Error(`Reason is required for action '${params.action}'`);
  }

  // Execute the transition
  const historyEntry: WorkflowHistoryEntry = {
    action: params.action,
    fromState: instance.currentState,
    toState: transition.toState,
    actorId: params.actorId,
    actorRole: params.actorRole,
    reason: params.reason,
    comment: params.comment,
    timestamp: new Date().toISOString(),
  };

  const updatedInstance: WorkflowInstance = {
    ...instance,
    currentState: transition.toState,
    history: [...instance.history, historyEntry],
    ...(params.action === 'approve' ? {
      approvedBy: params.actorId,
      approvedAt: new Date().toISOString(),
    } : {}),
    ...(params.action === 'reject' ? {
      rejectionReason: params.reason,
    } : {}),
  };

  await workflowInstancesStore.update(instance.id, updatedInstance);

  // Record in audit trail
  await recordWorkflowAction(
    params.entityType,
    params.entityId,
    params.action as any,
    params.beforeState || { state: instance.currentState },
    params.afterState || { state: transition.toState },
    params.actorId,
    params.actorRole,
    params.requestId,
    params.reason
  );

  return updatedInstance;
}

/**
 * Get workflow instance for an entity.
 */
export async function getWorkflowInstance(
  entityType: string,
  entityId: string
): Promise<WorkflowInstance | null> {
  const allInstances = await workflowInstancesStore.findAll();
  return allInstances.find(
    i => i.entityType === entityType && i.entityId === entityId
  ) || null;
}

/**
 * Get available actions for the current state.
 */
export async function getAvailableActions(
  entityType: string,
  entityId: string,
  actorRole: UserRole,
  actorId: string
): Promise<WorkflowAction[]> {
  const instance = await getWorkflowInstance(entityType, entityId);
  if (!instance) return [];

  const definition = await workflowDefsStore.findById(instance.definitionId);
  if (!definition) return [];

  return definition.transitions
    .filter(t => t.fromState === instance.currentState)
    .filter(t => t.requiredRoles.includes(actorRole) || actorRole === 'super_admin')
    .filter(t => {
      // Separation of duties
      if (t.action === 'approve' && instance.submittedBy === actorId) return false;
      return true;
    })
    .map(t => t.action);
}

/**
 * Check if escalation is due.
 */
export async function getEscalationsDue(): Promise<WorkflowInstance[]> {
  const allInstances = await workflowInstancesStore.findAll();
  const now = new Date();

  return allInstances.filter(instance => {
    if (instance.currentState !== 'pending_approval') return false;

    const definition = workflowDefsStore._size() > 0
      ? null // Would need to fetch definition
      : null;

    // For now, check if submitted more than 24 hours ago
    const submittedAt = new Date(instance.submittedAt);
    const hoursSinceSubmission = (now.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceSubmission > 24;
  });
}
