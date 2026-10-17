/**
 * Part 03 — Delegation Service
 *
 * Handles temporary delegation of approval authority from one user to another.
 * Enforces date ranges and prevents self-delegation.
 */

import { storage } from './storage';
import { UserRole } from './types';
import { generateId } from './utils';
import { recordAudit } from './audit';

// ============================================================================
// Delegation Types
// ============================================================================

export interface Delegation {
  id: string;
  delegatorId: string;
  delegatorRole: UserRole;
  delegateId: string;
  delegateRole: UserRole;
  resourceType: string; // e.g., 'operator_log', 'fuel_verification'
  startDate: string; // ISO date
  endDate: string; // ISO date
  reason: string;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  createdBy: string;
}

const delegationsStore = storage.getAdapter<Delegation>('delegations');

// ============================================================================
// Delegation Management
// ============================================================================

/**
 * Create a new delegation.
 */
export async function createDelegation(params: {
  delegatorId: string;
  delegatorRole: UserRole;
  delegateId: string;
  delegateRole: UserRole;
  resourceType: string;
  startDate: string;
  endDate: string;
  reason: string;
  createdBy: string;
}): Promise<Delegation> {
  // Validate: cannot delegate to self
  if (params.delegatorId === params.delegateId) {
    throw new Error('Cannot delegate approval authority to yourself');
  }

  // Validate: delegate must have equal or lower role
  const roleHierarchy: Record<UserRole, number> = {
    super_admin: 100,
    company_admin: 90,
    project_manager: 80,
    site_manager: 70,
    fleet_manager: 70,
    plant_manager: 70,
    maintenance_manager: 70,
    qc_manager: 70,
    accounts_manager: 70,
    dispatch_manager: 70,
    site_engineer: 60,
    fleet_supervisor: 60,
    fuel_officer: 50,
    store_keeper: 50,
    operator: 40,
    technician: 40,
    lab_staff: 40,
    calibration_officer: 40,
    procurement_officer: 30,
    accounts_executive: 30,
    logistics_staff: 30,
    general_staff: 20,
    hr_manager: 70,
    hr_executive: 50,
    website_administrator: 95,
    auditor: 10,
    viewer: 0,
  };

  const delegatorLevel = roleHierarchy[params.delegatorRole];
  const delegateLevel = roleHierarchy[params.delegateRole];

  if (delegateLevel > delegatorLevel) {
    throw new Error('Cannot delegate to a user with higher role authority');
  }

  // Validate: delegate must have approval capability for this role
  if (!canRoleApprove(params.delegateRole)) {
    throw new Error('Delegate role does not have approval authority');
  }

  // Validate dates
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);
  const now = new Date();

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  if (end < now) {
    throw new Error('End date cannot be in the past');
  }

  // Check for overlapping delegations
  const existingDelegations = await delegationsStore.findAll({
    delegatorId: params.delegatorId,
    resourceType: params.resourceType,
  } as Partial<Delegation>);

  const hasOverlap = existingDelegations.some(d => {
    if (d.status !== 'active') return false;
    const dStart = new Date(d.startDate);
    const dEnd = new Date(d.endDate);
    return start < dEnd && end > dStart;
  });

  if (hasOverlap) {
    throw new Error('Overlapping delegation already exists for this resource type');
  }

  // Create delegation
  const delegation: Delegation = {
    id: generateId(),
    delegatorId: params.delegatorId,
    delegatorRole: params.delegatorRole,
    delegateId: params.delegateId,
    delegateRole: params.delegateRole,
    resourceType: params.resourceType,
    startDate: params.startDate,
    endDate: params.endDate,
    reason: params.reason,
    status: 'active',
    createdAt: new Date().toISOString(),
    createdBy: params.createdBy,
  };

  const created = await delegationsStore.create(delegation);

  // Audit the creation
  await recordAudit({
    entityType: 'Delegation',
    entityId: created.id,
    action: 'create',
    before: null,
    after: {
      delegatorId: created.delegatorId,
      delegateId: created.delegateId,
      resourceType: created.resourceType,
      startDate: created.startDate,
      endDate: created.endDate,
    },
    actorId: params.createdBy,
    actorRole: params.delegatorRole,
    requestId: generateId(),
    reason: params.reason,
  });

  return created;
}

/**
 * Revoke a delegation.
 */
export async function revokeDelegation(
  delegationId: string,
  revokedBy: string,
  revokerRole: UserRole
): Promise<void> {
  const delegation = await delegationsStore.findById(delegationId);
  if (!delegation) {
    throw new Error(`Delegation ${delegationId} not found`);
  }

  if (delegation.status !== 'active') {
    throw new Error('Can only revoke active delegations');
  }

  await delegationsStore.update(delegationId, {
    status: 'revoked',
  });

  // Audit the revocation
  await recordAudit({
    entityType: 'Delegation',
    entityId: delegationId,
    action: 'update',
    before: { status: 'active' },
    after: { status: 'revoked' },
    actorId: revokedBy,
    actorRole: revokerRole,
    requestId: generateId(),
    reason: 'Delegation revoked',
  });
}

/**
 * Get active delegation for a user and resource type at a specific time.
 */
export async function getActiveDelegation(
  delegateId: string,
  resourceType: string,
  atTime: Date = new Date()
): Promise<Delegation | null> {
  const delegations = await delegationsStore.findAll({
    delegateId,
    resourceType,
    status: 'active',
  } as Partial<Delegation>);

  // Find delegation that covers the requested time
  for (const delegation of delegations) {
    const start = new Date(delegation.startDate);
    const end = new Date(delegation.endDate);

    if (atTime >= start && atTime <= end) {
      return delegation;
    }
  }

  return null;
}

/**
 * Check if a user has delegated approval authority at a specific time.
 */
export async function hasDelegatedAuthority(
  userId: string,
  resourceType: string,
  atTime: Date = new Date()
): Promise<{ hasAuthority: boolean; delegation?: Delegation }> {
  const delegation = await getActiveDelegation(userId, resourceType, atTime);

  if (delegation) {
    return { hasAuthority: true, delegation };
  }

  return { hasAuthority: false };
}

/**
 * Get all delegations for a user (as delegator or delegate).
 */
export async function getUserDelegations(
  userId: string,
  role: 'delegator' | 'delegate' | 'both' = 'both'
): Promise<Delegation[]> {
  let delegations: Delegation[] = [];

  if (role === 'delegator' || role === 'both') {
    const asDelegator = await delegationsStore.findAll({
      delegatorId: userId,
    } as Partial<Delegation>);
    delegations = [...delegations, ...asDelegator];
  }

  if (role === 'delegate' || role === 'both') {
    const asDelegate = await delegationsStore.findAll({
      delegateId: userId,
    } as Partial<Delegation>);
    delegations = [...delegations, ...asDelegate];
  }

  // Remove duplicates (if role === 'both' and user delegated to themselves, which shouldn't happen)
  const uniqueDelegations = Array.from(
    new Map(delegations.map(d => [d.id, d])).values()
  );

  return uniqueDelegations.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Expire old delegations (should be called periodically).
 */
export async function expireOldDelegations(): Promise<number> {
  const now = new Date();
  const allDelegations = await delegationsStore.findAll();
  let expiredCount = 0;

  for (const delegation of allDelegations) {
    if (delegation.status === 'active') {
      const endDate = new Date(delegation.endDate);
      if (endDate < now) {
        await delegationsStore.update(delegation.id, {
          status: 'expired',
        });
        expiredCount++;
      }
    }
  }

  return expiredCount;
}

/**
 * Helper: Check if a role has approval capability.
 */
function canRoleApprove(role: UserRole): boolean {
  const approverRoles: UserRole[] = [
    'super_admin',
    'company_admin',
    'project_manager',
    'site_manager',
    'fleet_manager',
    'plant_manager',
    'maintenance_manager',
    'qc_manager',
    'accounts_manager',
    'dispatch_manager',
  ];

  return approverRoles.includes(role);
}
