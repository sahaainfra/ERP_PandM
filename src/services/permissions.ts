/**
 * Part 03 — Permissions Service
 *
 * Core authorization service that enforces permissions across all modules.
 * Handles action-level, resource-level, scope-level, and field-level permissions.
 */

import { storage } from './storage';
import { UserRole, UserScope } from './types';
import { generateId } from './utils';
import { recordAudit } from './audit';

// ============================================================================
// Permission Types
// ============================================================================

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'return'
  | 'post'
  | 'reverse'
  | 'export'
  | 'administer'
  | 'view_cost'
  | 'view_personal';

export type PermissionResource =
  // Fleet & Equipment
  | 'equipment'
  | 'operator_log'
  | 'equipment_logbook'
  | 'fuel_issue'
  | 'fuel_verification'
  | 'maintenance_order'
  | 'calibration_record'
  // Asset Lifecycle (Part 05)
  | 'asset_allocation'
  | 'asset_transfer'
  | 'asset_mobilization'
  | 'rental_agreement'
  | 'hire_out_agreement'
  | 'daily_deployment'
  | 'operator'
  // RMC
  | 'rmc_plant'
  | 'batch_ticket'
  | 'mix_design'
  | 'qc_test'
  | 'rmc_order'
  | 'dispatch'
  // Finance
  | 'journal_voucher'
  | 'payment_voucher'
  | 'receipt_voucher'
  | 'purchase_order'
  | 'goods_receipt'
  // Masters
  | 'user'
  | 'role'
  | 'project'
  | 'site'
  | 'vendor'
  | 'customer'
  | 'item'
  | 'warehouse'
  // Communication
  | 'chat_channel'
  | 'chat_message'
  | 'notification'
  | 'alert'
  // System
  | 'audit_log'
  | 'report'
  | 'dashboard'
  | 'attachment'
  // Assets (Part 04)
  | 'asset'
  | 'asset_category'
  | 'asset_document'
  | 'asset_meter';

export type PermissionScope =
  | 'company'
  | 'region'
  | 'project'
  | 'site'
  | 'plant'
  | 'department'
  | 'own'
  | 'assigned';

// ============================================================================
// Permission Definition
// ============================================================================

export interface PermissionDefinition {
  id: string;
  role: UserRole;
  resource: PermissionResource;
  actions: PermissionAction[];
  scopes: PermissionScope[];
  conditions?: Record<string, unknown>; // Future: complex conditions
  createdAt: string;
  updatedAt: string;
}

const permissionsStore = storage.getAdapter<PermissionDefinition>('permissions');

// ============================================================================
// Permission Checking
// ============================================================================

export interface PermissionCheck {
  userId: string;
  role: UserRole;
  action: PermissionAction;
  resource: PermissionResource;
  scope?: {
    companyId?: string;
    regionId?: string;
    projectId?: string;
    siteId?: string;
    plantId?: string;
    departmentId?: string;
    ownerId?: string;
    assignedToId?: string;
  };
}

/**
 * Check if a user has permission to perform an action on a resource.
 */
export async function hasPermission(check: PermissionCheck): Promise<boolean> {
  // Super admin has all permissions
  if (check.role === 'super_admin') {
    return true;
  }

  // Find matching permission
  const permissions = await permissionsStore.findAll({
    role: check.role,
    resource: check.resource,
  } as Partial<PermissionDefinition>);

  if (permissions.length === 0) {
    return false;
  }

  // Check if any permission grants the requested action
  for (const perm of permissions) {
    if (!perm.actions.includes(check.action)) {
      continue;
    }

    // Check scope
    if (!check.scope) {
      // No scope required, permission granted
      return true;
    }

    // Verify scope matches
    const scopeMatch = verifyScope(perm.scopes, check.scope);
    if (scopeMatch) {
      return true;
    }
  }

  return false;
}

/**
 * Verify that the requested scope is allowed by the permission scopes.
 */
function verifyScope(
  allowedScopes: PermissionScope[],
  requestedScope: PermissionCheck['scope']
): boolean {
  if (!requestedScope) return true;

  for (const scope of allowedScopes) {
    switch (scope) {
      case 'company':
        // Company scope allows everything in the company
        if (requestedScope.companyId) return true;
        break;
      case 'region':
        if (requestedScope.regionId) return true;
        break;
      case 'project':
        if (requestedScope.projectId) return true;
        break;
      case 'site':
        if (requestedScope.siteId) return true;
        break;
      case 'plant':
        if (requestedScope.plantId) return true;
        break;
      case 'department':
        if (requestedScope.departmentId) return true;
        break;
      case 'own':
        if (requestedScope.ownerId) return true;
        break;
      case 'assigned':
        if (requestedScope.assignedToId) return true;
        break;
    }
  }

  return false;
}

/**
 * Enforce permission or throw error.
 */
export async function enforcePermission(check: PermissionCheck): Promise<void> {
  const allowed = await hasPermission(check);
  if (!allowed) {
    throw new Error(
      `Permission denied: ${check.role} cannot ${check.action} ${check.resource}`
    );
  }
}

// ============================================================================
// Field-Level Permissions
// ============================================================================

/**
 * Filter fields from an object based on permissions.
 */
export function filterFields<T extends Record<string, unknown>>(
  data: T,
  role: UserRole,
  sensitiveFields: {
    cost?: string[];
    personal?: string[];
  }
): Partial<T> {
  const filtered = { ...data };

  // Check view_cost permission
  const canViewCost = role === 'super_admin' || role === 'company_admin' ||
                      role === 'accounts_manager' || role === 'project_manager';

  if (!canViewCost && sensitiveFields.cost) {
    for (const field of sensitiveFields.cost) {
      delete filtered[field];
    }
  }

  // Check view_personal permission
  const canViewPersonal = role === 'super_admin' || role === 'company_admin' ||
                          role === 'site_manager' || role === 'fleet_manager';

  if (!canViewPersonal && sensitiveFields.personal) {
    for (const field of sensitiveFields.personal) {
      delete filtered[field];
    }
  }

  return filtered;
}

// ============================================================================
// Query-Level Scoping
// ============================================================================

export interface QueryScope {
  role: UserRole;
  userId: string;
  userScopes: UserScope[];
}

/**
 * Build a query filter based on user's scope.
 * This ensures list endpoints never return out-of-scope records.
 */
export function buildQueryFilter(scope: QueryScope): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  // Super admin sees everything
  if (scope.role === 'super_admin') {
    return filter;
  }

  // Build OR conditions for each scope type
  const orConditions: Record<string, unknown>[] = [];

  for (const userScope of scope.userScopes) {
    switch (userScope.type) {
      case 'company':
        // Company scope: no additional filter needed (all records in company)
        orConditions.push({});
        break;
      case 'project':
        orConditions.push({ projectId: userScope.id });
        break;
      case 'site':
        orConditions.push({ siteId: userScope.id });
        break;
      case 'plant':
        orConditions.push({ plantId: userScope.id });
        break;
      case 'department':
        orConditions.push({ departmentId: userScope.id });
        break;
    }
  }

  // Add "own records" scope
  const roleAllowsOwn = ['operator', 'site_engineer', 'fuel_officer', 'technician'].includes(scope.role);
  if (roleAllowsOwn) {
    orConditions.push({ createdBy: scope.userId });
  }

  // Add "assigned assets" scope
  const roleAllowsAssigned = ['operator', 'driver', 'technician'].includes(scope.role);
  if (roleAllowsAssigned) {
    orConditions.push({ assignedTo: scope.userId });
  }

  if (orConditions.length > 0) {
    filter.$or = orConditions;
  }

  return filter;
}

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Grant a permission to a role.
 */
export async function grantPermission(
  role: UserRole,
  resource: PermissionResource,
  actions: PermissionAction[],
  scopes: PermissionScope[],
  grantedBy: string
): Promise<PermissionDefinition> {
  // Check if permission already exists
  const existing = await permissionsStore.findOne({
    role,
    resource,
  } as Partial<PermissionDefinition>);

  if (existing) {
    // Update existing permission
    const updated = await permissionsStore.update(existing.id, {
      actions,
      scopes,
      updatedAt: new Date().toISOString(),
    });

    // Audit the change
    await recordAudit({
      entityType: 'Permission',
      entityId: existing.id,
      action: 'update',
      before: { actions: existing.actions, scopes: existing.scopes },
      after: { actions, scopes },
      actorId: grantedBy,
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: 'Permission updated',
    });

    return updated;
  }

  // Create new permission
  const permission: PermissionDefinition = {
    id: generateId(),
    role,
    resource,
    actions,
    scopes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const created = await permissionsStore.create(permission);

  // Audit the creation
  await recordAudit({
    entityType: 'Permission',
    entityId: created.id,
    action: 'create',
    before: null,
    after: { role, resource, actions, scopes },
    actorId: grantedBy,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Permission granted',
  });

  return created;
}

/**
 * Revoke a permission from a role.
 */
export async function revokePermission(
  permissionId: string,
  revokedBy: string
): Promise<void> {
  const permission = await permissionsStore.findById(permissionId);
  if (!permission) {
    throw new Error(`Permission ${permissionId} not found`);
  }

  await permissionsStore.delete(permissionId);

  // Audit the revocation
  await recordAudit({
    entityType: 'Permission',
    entityId: permissionId,
    action: 'delete',
    before: { role: permission.role, resource: permission.resource, actions: permission.actions, scopes: permission.scopes },
    after: null,
    actorId: revokedBy,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Permission revoked',
  });
}

/**
 * Get all permissions for a role.
 */
export async function getRolePermissions(role: UserRole): Promise<PermissionDefinition[]> {
  return permissionsStore.findAll({ role } as Partial<PermissionDefinition>);
}

/**
 * Get all permissions for a resource.
 */
export async function getResourcePermissions(
  resource: PermissionResource
): Promise<PermissionDefinition[]> {
  return permissionsStore.findAll({ resource } as Partial<PermissionDefinition>);
}

// ============================================================================
// Seed Default Permissions
// ============================================================================

export async function seedDefaultPermissions(): Promise<void> {
  const existing = await permissionsStore.findAll();
  if (existing.length > 0) return;

  const defaultPermissions: Array<{
    role: UserRole;
    resource: PermissionResource;
    actions: PermissionAction[];
    scopes: PermissionScope[];
  }> = [
    // Super Admin - full access
    {
      role: 'super_admin',
      resource: 'user',
      actions: ['view', 'create', 'edit', 'delete', 'administer'],
      scopes: ['company'],
    },
    {
      role: 'super_admin',
      resource: 'role',
      actions: ['view', 'create', 'edit', 'delete', 'administer'],
      scopes: ['company'],
    },

    // Company Admin
    {
      role: 'company_admin',
      resource: 'equipment',
      actions: ['view', 'create', 'edit', 'approve', 'export', 'view_cost'],
      scopes: ['company'],
    },
    {
      role: 'company_admin',
      resource: 'project',
      actions: ['view', 'create', 'edit'],
      scopes: ['company'],
    },

    // Project Manager
    {
      role: 'project_manager',
      resource: 'equipment',
      actions: ['view', 'approve', 'export', 'view_cost'],
      scopes: ['project'],
    },
    {
      role: 'project_manager',
      resource: 'operator_log',
      actions: ['view', 'approve'],
      scopes: ['project'],
    },
    {
      role: 'project_manager',
      resource: 'fuel_verification',
      actions: ['view', 'approve'],
      scopes: ['project'],
    },

    // Site Manager
    {
      role: 'site_manager',
      resource: 'equipment',
      actions: ['view', 'edit', 'approve'],
      scopes: ['site'],
    },
    {
      role: 'site_manager',
      resource: 'operator_log',
      actions: ['view', 'approve'],
      scopes: ['site'],
    },
    {
      role: 'site_manager',
      resource: 'fuel_issue',
      actions: ['view', 'approve'],
      scopes: ['site'],
    },
    {
      role: 'site_manager',
      resource: 'maintenance_order',
      actions: ['view', 'approve'],
      scopes: ['site'],
    },

    // Fleet Manager
    {
      role: 'fleet_manager',
      resource: 'equipment',
      actions: ['view', 'create', 'edit', 'approve', 'view_cost'],
      scopes: ['company'],
    },
    {
      role: 'fleet_manager',
      resource: 'maintenance_order',
      actions: ['view', 'create', 'edit', 'approve'],
      scopes: ['company'],
    },
    {
      role: 'fleet_manager',
      resource: 'fuel_verification',
      actions: ['view', 'approve'],
      scopes: ['company'],
    },

    // Plant Manager
    {
      role: 'plant_manager',
      resource: 'rmc_plant',
      actions: ['view', 'edit'],
      scopes: ['plant'],
    },
    {
      role: 'plant_manager',
      resource: 'batch_ticket',
      actions: ['view', 'approve'],
      scopes: ['plant'],
    },
    {
      role: 'plant_manager',
      resource: 'rmc_order',
      actions: ['view', 'approve'],
      scopes: ['plant'],
    },
    {
      role: 'plant_manager',
      resource: 'qc_test',
      actions: ['view', 'approve'],
      scopes: ['plant'],
    },

    // Operator
    {
      role: 'operator',
      resource: 'equipment',
      actions: ['view'],
      scopes: ['assigned'],
    },
    {
      role: 'operator',
      resource: 'operator_log',
      actions: ['view', 'create', 'edit', 'submit'],
      scopes: ['own'],
    },

    // Fuel Officer
    {
      role: 'fuel_officer',
      resource: 'fuel_issue',
      actions: ['view', 'create', 'edit', 'submit'],
      scopes: ['site'],
    },
    {
      role: 'fuel_officer',
      resource: 'fuel_verification',
      actions: ['view', 'create', 'edit', 'submit'],
      scopes: ['site'],
    },

    // Accounts Manager
    {
      role: 'accounts_manager',
      resource: 'journal_voucher',
      actions: ['view', 'create', 'edit', 'approve', 'post', 'reverse', 'view_cost'],
      scopes: ['company'],
    },
    {
      role: 'accounts_manager',
      resource: 'payment_voucher',
      actions: ['view', 'create', 'edit', 'approve', 'post', 'view_cost'],
      scopes: ['company'],
    },

    // Auditor
    {
      role: 'auditor',
      resource: 'audit_log',
      actions: ['view', 'export'],
      scopes: ['company'],
    },
    {
      role: 'auditor',
      resource: 'equipment',
      actions: ['view', 'export'],
      scopes: ['company'],
    },
    {
      role: 'auditor',
      resource: 'operator_log',
      actions: ['view', 'export'],
      scopes: ['company'],
    },
  ];

  for (const perm of defaultPermissions) {
    await grantPermission(
      perm.role,
      perm.resource,
      perm.actions,
      perm.scopes,
      'system'
    );
  }
}
