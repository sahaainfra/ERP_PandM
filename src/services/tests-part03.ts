/**
 * Part 03 — Acceptance Tests
 *
 * Tests for roles, permissions, delegation, and approval matrix.
 * Verifies all acceptance criteria from Part 03.
 */

import {
  initializePlatform,
  resetPlatform,
  roles,
  permissions,
  delegation,
  approvalMatrix,
  audit,
  generateId,
} from './index';

// ============================================================================
// Test Runner
// ============================================================================

let testCount = 0;
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string): void {
  testCount++;
  if (condition) {
    passCount++;
    console.log(`  ✅ ${message}`);
  } else {
    failCount++;
    console.error(`  ❌ ${message}`);
  }
}

async function assertThrows(fn: () => Promise<unknown>, expectedMessage: string, testName: string): Promise<void> {
  testCount++;
  try {
    await fn();
    failCount++;
    console.error(`  ❌ ${testName} — expected error but none thrown`);
  } catch (err) {
    if (err instanceof Error && err.message.includes(expectedMessage)) {
      passCount++;
      console.log(`  ✅ ${testName}`);
    } else {
      failCount++;
      console.error(`  ❌ ${testName} — wrong error: ${err}`);
    }
  }
}

// ============================================================================
// Test Suite
// ============================================================================

export async function runPart03Tests(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n🧪 Part 03 — Acceptance Tests\n');

  resetPlatform();
  await initializePlatform();

  await testRolesSeeded();
  await testPermissionEnforcement();
  await testScopeEnforcement();
  await testFieldLevelPermissions();
  await testDelegation();
  await testDelegationExpiry();
  await testApprovalMatrix();
  await testMakerChecker();
  await testPermissionAudit();

  console.log(`\n📊 Results: ${passCount}/${testCount} passed, ${failCount} failed\n`);

  return { total: testCount, passed: passCount, failed: failCount };
}

// ============================================================================
// Test: Roles Seeded
// ============================================================================

async function testRolesSeeded(): Promise<void> {
  console.log('\n📋 Roles Seeded Tests');

  const allRoles = await roles.listRoleDefinitions();
  assert(allRoles.length >= 24, `At least 24 roles seeded (found ${allRoles.length})`);

  // Check specific roles exist
  const operatorRole = await roles.getRoleDefinition('operator');
  assert(operatorRole !== null, 'Operator role exists');
  assert(operatorRole?.canApprove === false, 'Operator cannot approve');

  const siteManagerRole = await roles.getRoleDefinition('site_manager');
  assert(siteManagerRole !== null, 'Site Manager role exists');
  assert(siteManagerRole?.canApprove === true, 'Site Manager can approve');

  const driverRole = await roles.getRoleDefinition('operator'); // Driver uses operator role
  assert(driverRole?.canApprove === false, 'Driver (operator) cannot approve');
}

// ============================================================================
// Test: Permission Enforcement
// ============================================================================

async function testPermissionEnforcement(): Promise<void> {
  console.log('\n📋 Permission Enforcement Tests');

  // Operator can view equipment
  const operatorCanView = await permissions.hasPermission({
    userId: 'user-1',
    role: 'operator',
    action: 'view',
    resource: 'equipment',
    scope: { assignedToId: 'user-1' },
  });
  assert(operatorCanView, 'Operator can view equipment');

  // Operator cannot approve
  const operatorCanApprove = await permissions.hasPermission({
    userId: 'user-1',
    role: 'operator',
    action: 'approve',
    resource: 'operator_log',
  });
  assert(!operatorCanApprove, 'Operator cannot approve operator logs');

  // Site Manager can approve operator logs
  const siteManagerCanApprove = await permissions.hasPermission({
    userId: 'user-2',
    role: 'site_manager',
    action: 'approve',
    resource: 'operator_log',
    scope: { siteId: 'site-1' },
  });
  assert(siteManagerCanApprove, 'Site Manager can approve operator logs');

  // Accounts Manager can post journal vouchers
  const accountsCanPost = await permissions.hasPermission({
    userId: 'user-3',
    role: 'accounts_manager',
    action: 'post',
    resource: 'journal_voucher',
    scope: { companyId: 'company-1' },
  });
  assert(accountsCanPost, 'Accounts Manager can post journal vouchers');

  // Operator cannot post
  const operatorCanPost = await permissions.hasPermission({
    userId: 'user-1',
    role: 'operator',
    action: 'post',
    resource: 'journal_voucher',
  });
  assert(!operatorCanPost, 'Operator cannot post journal vouchers');
}

// ============================================================================
// Test: Scope Enforcement
// ============================================================================

async function testScopeEnforcement(): Promise<void> {
  console.log('\n📋 Scope Enforcement Tests');

  // Site Manager scoped to Site A
  const siteManagerScopeA = await permissions.hasPermission({
    userId: 'user-2',
    role: 'site_manager',
    action: 'view',
    resource: 'equipment',
    scope: { siteId: 'site-A' },
  });
  assert(siteManagerScopeA, 'Site Manager can view equipment in Site A');

  // Build query filter for site-scoped user
  const queryFilter = permissions.buildQueryFilter({
    role: 'site_manager',
    userId: 'user-2',
    userScopes: [{ type: 'site', id: 'site-A' }],
  });
  assert(queryFilter.$or !== undefined, 'Query filter includes scope conditions');
  assert(Array.isArray(queryFilter.$or), 'Query filter has $or array');

  // Operator scope filter
  const operatorFilter = permissions.buildQueryFilter({
    role: 'operator',
    userId: 'user-1',
    userScopes: [{ type: 'site', id: 'site-A' }],
  });
  assert(operatorFilter.$or !== undefined, 'Operator query filter includes scope');

  // Super admin sees everything (no filter)
  const adminFilter = permissions.buildQueryFilter({
    role: 'super_admin',
    userId: 'admin-1',
    userScopes: [{ type: 'company', id: 'company-1' }],
  });
  assert(Object.keys(adminFilter).length === 0, 'Super admin has no scope filter');
}

// ============================================================================
// Test: Field-Level Permissions
// ============================================================================

async function testFieldLevelPermissions(): Promise<void> {
  console.log('\n📋 Field-Level Permission Tests');

  const equipmentData = {
    id: 'eq-1',
    name: 'Excavator',
    purchase_cost: 5000000,
    depreciation: 1000000,
    maintenance_cost: 200000,
    operator_phone: '9876543210',
    operator_email: 'operator@example.com',
  };

  // Operator without view_cost — cost fields removed
  const operatorView = permissions.filterFields(equipmentData, 'operator', {
    cost: ['purchase_cost', 'depreciation', 'maintenance_cost'],
    personal: ['operator_phone', 'operator_email'],
  });
  assert(!('purchase_cost' in operatorView), 'Cost fields hidden from operator');
  assert(!('operator_phone' in operatorView), 'Personal fields hidden from operator');
  assert('name' in operatorView, 'Non-sensitive fields visible');

  // Fleet Manager with view_cost — cost fields visible
  const fleetManagerView = permissions.filterFields(equipmentData, 'fleet_manager', {
    cost: ['purchase_cost', 'depreciation', 'maintenance_cost'],
    personal: ['operator_phone', 'operator_email'],
  });
  assert('purchase_cost' in fleetManagerView, 'Cost fields visible to Fleet Manager');
  assert('depreciation' in fleetManagerView, 'Depreciation visible to Fleet Manager');

  // Site Manager with view_personal — personal fields visible
  const siteManagerView = permissions.filterFields(equipmentData, 'site_manager', {
    cost: ['purchase_cost', 'depreciation', 'maintenance_cost'],
    personal: ['operator_phone', 'operator_email'],
  });
  assert('operator_phone' in siteManagerView, 'Personal fields visible to Site Manager');
}

// ============================================================================
// Test: Delegation
// ============================================================================

async function testDelegation(): Promise<void> {
  console.log('\n📋 Delegation Tests');

  const now = new Date();
  const startDate = new Date(now.getTime() - 1000).toISOString(); // 1 second ago
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  // Create delegation
  const del = await delegation.createDelegation({
    delegatorId: 'manager-1',
    delegatorRole: 'site_manager',
    delegateId: 'engineer-1',
    delegateRole: 'site_engineer',
    resourceType: 'operator_log',
    startDate,
    endDate,
    reason: 'On leave',
    createdBy: 'manager-1',
  });

  assert(del.id !== undefined, 'Delegation created');
  assert(del.status === 'active', 'Delegation is active');

  // Check delegated authority
  const hasAuth = await delegation.hasDelegatedAuthority('engineer-1', 'operator_log');
  assert(hasAuth.hasAuthority, 'Delegate has approval authority');
  assert(hasAuth.delegation?.id === del.id, 'Correct delegation returned');

  // Cannot delegate to self
  await assertThrows(
    () => delegation.createDelegation({
      delegatorId: 'manager-1',
      delegatorRole: 'site_manager',
      delegateId: 'manager-1', // Same as delegator
      delegateRole: 'site_manager',
      resourceType: 'operator_log',
      startDate,
      endDate,
      reason: 'Test',
      createdBy: 'manager-1',
    }),
    'Cannot delegate approval authority to yourself',
    'Cannot delegate to self'
  );

  // Cannot delegate to higher role
  await assertThrows(
    () => delegation.createDelegation({
      delegatorId: 'engineer-1',
      delegatorRole: 'site_engineer',
      delegateId: 'manager-1',
      delegateRole: 'site_manager', // Higher than engineer
      resourceType: 'operator_log',
      startDate,
      endDate,
      reason: 'Test',
      createdBy: 'engineer-1',
    }),
    'Cannot delegate to a user with higher role authority',
    'Cannot delegate to higher role'
  );

  // Revoke delegation
  await delegation.revokeDelegation(del.id, 'manager-1', 'site_manager');
  const revokedDelegations = await delegation.getUserDelegations('engineer-1', 'delegate');
  const revoked = revokedDelegations.find(d => d.id === del.id);
  assert(revoked?.status === 'revoked', 'Delegation revoked');
}

// ============================================================================
// Test: Delegation Expiry
// ============================================================================

async function testDelegationExpiry(): Promise<void> {
  console.log('\n📋 Delegation Expiry Tests');

  const now = new Date();
  const pastStart = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours ago
  const pastEnd = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago

  // Create expired delegation
  const expiredDel = await delegation.createDelegation({
    delegatorId: 'manager-2',
    delegatorRole: 'site_manager',
    delegateId: 'engineer-2',
    delegateRole: 'site_engineer',
    resourceType: 'fuel_verification',
    startDate: pastStart,
    endDate: pastEnd,
    reason: 'Past delegation',
    createdBy: 'manager-2',
  });

  // Check authority at current time (should fail - expired)
  const hasAuthNow = await delegation.hasDelegatedAuthority('engineer-2', 'fuel_verification', now);
  assert(!hasAuthNow.hasAuthority, 'Expired delegation does not grant authority');

  // Check authority at past time (should succeed)
  const pastTime = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36 hours ago
  const hasAuthPast = await delegation.hasDelegatedAuthority('engineer-2', 'fuel_verification', pastTime);
  assert(hasAuthPast.hasAuthority, 'Delegation was active in the past');

  // Expire old delegations
  const expiredCount = await delegation.expireOldDelegations();
  assert(expiredCount >= 1, `Expired ${expiredCount} old delegations`);
}

// ============================================================================
// Test: Approval Matrix
// ============================================================================

async function testApprovalMatrix(): Promise<void> {
  console.log('\n📋 Approval Matrix Tests');

  // Fuel verification with low variance
  const lowVariance = await approvalMatrix.getRequiredApprover('fuel_verification', {
    variance_percent: 3,
  });
  assert(lowVariance?.role === 'site_manager', 'Low variance requires Site Manager');

  // Fuel verification with high variance
  const highVariance = await approvalMatrix.getRequiredApprover('fuel_verification', {
    variance_percent: 10,
  });
  assert(highVariance?.role === 'fleet_manager', 'High variance requires Fleet Manager');

  // Fuel verification with critical variance (level 2)
  const criticalVariance = await approvalMatrix.getRequiredApprover('fuel_verification', {
    variance_percent: 25,
  }, 2);
  assert(criticalVariance?.role === 'project_manager', 'Critical variance requires Project Manager (Level 2)');

  // Maintenance order with low cost
  const lowCost = await approvalMatrix.getRequiredApprover('maintenance_order', {
    estimated_cost: 30000,
  });
  assert(lowCost?.role === 'fleet_manager', 'Low cost maintenance requires Fleet Manager');

  // Maintenance order with high cost
  const highCost = await approvalMatrix.getRequiredApprover('maintenance_order', {
    estimated_cost: 100000,
  });
  assert(highCost?.role === 'project_manager', 'High cost maintenance requires Project Manager');

  // Journal voucher
  const jvLow = await approvalMatrix.getRequiredApprover('journal_voucher', {
    amount: 50000,
  });
  assert(jvLow?.role === 'accounts_manager', 'Low value JV requires Accounts Manager');

  const jvHigh = await approvalMatrix.getRequiredApprover('journal_voucher', {
    amount: 200000,
  });
  assert(jvHigh?.role === 'company_admin', 'High value JV requires Company Admin');
}

// ============================================================================
// Test: Maker-Checker
// ============================================================================

async function testMakerChecker(): Promise<void> {
  console.log('\n📋 Maker-Checker Tests');

  // This test verifies that the workflow engine (from Part 02) enforces maker-checker
  // The workflow engine already has this check, but we verify it's integrated

  // Import workflow service
  const workflow = await import('./workflow');

  // Start a workflow
  const instance = await workflow.startWorkflow({
    entityType: 'OperatorLog',
    entityId: 'log-mc-test',
    submittedBy: 'operator-1',
    submittedByRole: 'operator',
    requestId: generateId(),
  });

  // Submit
  await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-mc-test',
    action: 'submit',
    actorId: 'operator-1',
    actorRole: 'operator',
    requestId: generateId(),
  });

  await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-mc-test',
    action: 'submit',
    actorId: 'operator-1',
    actorRole: 'operator',
    requestId: generateId(),
  });

  // Try to approve as the submitter (should fail)
  await assertThrows(
    () => workflow.executeWorkflowAction({
      entityType: 'OperatorLog',
      entityId: 'log-mc-test',
      action: 'approve',
      actorId: 'operator-1', // Same as submitter
      actorRole: 'site_manager',
      requestId: generateId(),
    }),
    'Separation of duties',
    'Submitter cannot approve own record (maker-checker)'
  );

  // Approve as different user (should succeed)
  const approved = await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-mc-test',
    action: 'approve',
    actorId: 'manager-1', // Different from submitter
    actorRole: 'site_manager',
    requestId: generateId(),
  });

  assert(approved.currentState === 'approved', 'Different user can approve (maker-checker enforced)');
}

// ============================================================================
// Test: Permission Audit
// ============================================================================

async function testPermissionAudit(): Promise<void> {
  console.log('\n📋 Permission Audit Tests');

  // Grant a permission
  const perm = await permissions.grantPermission(
    'site_engineer',
    'rmc_order',
    ['view', 'create', 'edit', 'submit'],
    ['site'],
    'admin-1'
  );

  assert(perm.id !== undefined, 'Permission granted');

  // Check audit trail
  const auditHistory = await audit.getAuditHistory('Permission', perm.id);
  assert(auditHistory.length >= 1, 'Permission creation audited');
  assert(auditHistory[0].action === 'create', 'Audit action is "create"');
  assert(auditHistory[0].actorId === 'admin-1', 'Audit records who made the change');

  // Update permission
  const updated = await permissions.grantPermission(
    'site_engineer',
    'rmc_order',
    ['view', 'create', 'edit', 'submit', 'approve'], // Added approve
    ['site'],
    'admin-1'
  );

  const updatedHistory = await audit.getAuditHistory('Permission', perm.id);
  assert(updatedHistory.length >= 2, 'Permission update audited');

  // Revoke permission
  await permissions.revokePermission(perm.id, 'admin-1');

  const revokedHistory = await audit.getAuditHistory('Permission', perm.id);
  assert(revokedHistory.length >= 3, 'Permission revocation audited');

  // Verify permission is gone
  const allPerms = await permissions.getRolePermissions('site_engineer');
  const rmcPerm = allPerms.find(p => p.id === perm.id);
  assert(rmcPerm === undefined, 'Permission revoked successfully');
}
