/**
 * Part 02 — Acceptance Tests
 *
 * Tests for all shared platform services.
 * Run with: npm run typecheck (build validates TypeScript)
 *
 * These tests verify the acceptance criteria from Part 02:
 * 1. Number series produce unique numbers under concurrent requests
 * 2. Audit records are written and cannot be modified
 * 3. Attachments require permission for download
 * 4. Submitter cannot approve their own record
 * 5. Duplicate idempotency key returns original result
 * 6. Alert de-duplication works
 */

import {
  initializePlatform,
  resetPlatform,
  masters,
  numbering,
  audit,
  attachments,
  workflow,
  alerts,
  idempotency,
  generateId,
  getCurrentFinancialYear,
} from './index';

// ============================================================================
// Test Runner (simple assertion-based, no external test framework)
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

export async function runAllTests(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n🧪 Part 02 — Acceptance Tests\n');

  resetPlatform();
  await initializePlatform();

  await testNumberSeries();
  await testAuditTrail();
  await testAttachmentPermissions();
  await testWorkflowSeparationOfDuties();
  await testIdempotency();
  await testAlertDeduplication();
  await testFinancialYearReset();
  await testUoMConversion();

  console.log(`\n📊 Results: ${passCount}/${testCount} passed, ${failCount} failed\n`);

  return { total: testCount, passed: passCount, failed: failCount };
}

// ============================================================================
// Test: Number Series (Acceptance: unique numbers under concurrency)
// ============================================================================

async function testNumberSeries(): Promise<void> {
  console.log('\n📋 Number Series Tests');

  // Create a company for testing
  const company = await masters.createCompany({
    code: 'TEST-CO',
    name: 'Test Company',
    legalName: 'Test Company Pvt Ltd',
    address: '123 Test St',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    country: 'India',
  });

  // Generate 5 numbers concurrently
  const promises = Array.from({ length: 5 }, () =>
    numbering.generateNumber(company.id, 'OPERATOR_LOG')
  );
  const numbers = await Promise.all(promises);

  // All should be unique
  const uniqueNumbers = new Set(numbers);
  assert(uniqueNumbers.size === 5, 'Concurrent number generation produces unique numbers');

  // All should follow format
  const fy = getCurrentFinancialYear();
  for (const num of numbers) {
    assert(num.startsWith(`OL/${fy}/`), `Number ${num} has correct prefix`);
  }

  // Sequential check
  const parsed = numbers.map(n => numbering.parseDocumentNumber(n));
  const sequences = parsed.map(p => p?.sequence).filter(Boolean).sort((a, b) => (a || 0) - (b || 0));
  assert(
    sequences[0] === 1 && sequences[4] === 5,
    'Numbers are sequential (1-5)'
  );
}

// ============================================================================
// Test: Audit Trail (Acceptance: records written and immutable)
// ============================================================================

async function testAuditTrail(): Promise<void> {
  console.log('\n📋 Audit Trail Tests');

  const requestId = generateId();

  // Create an audit record
  const record = await audit.recordCreate(
    'TestEntity',
    'test-123',
    { name: 'Test', value: 100 },
    'user-1',
    'site_manager',
    requestId
  );

  assert(record.id !== undefined, 'Audit record created with ID');
  assert(record.action === 'create', 'Audit action is "create"');
  assert(record.after?.name === 'Test', 'Audit after value captured');

  // Verify history
  const history = await audit.getAuditHistory('TestEntity', 'test-123');
  assert(history.length === 1, 'Audit history has 1 entry');

  // Attempt to update (should fail)
  const updateError = await audit.attemptAuditUpdate(record.id);
  assert(updateError.message.includes('Append-only'), 'Audit record cannot be updated');

  // Attempt to delete (should fail)
  const deleteError = await audit.attemptAuditDelete(record.id);
  assert(deleteError.message.includes('Append-only'), 'Audit record cannot be deleted');

  // Record an update
  await audit.recordUpdate(
    'TestEntity',
    'test-123',
    { name: 'Test', value: 100 },
    { name: 'Test Updated', value: 200 },
    'user-1',
    'site_manager',
    requestId
  );

  const updatedHistory = await audit.getAuditHistory('TestEntity', 'test-123');
  assert(updatedHistory.length === 2, 'Audit history has 2 entries after update');
}

// ============================================================================
// Test: Attachment Permissions (Acceptance: download requires permission)
// ============================================================================

async function testAttachmentPermissions(): Promise<void> {
  console.log('\n📋 Attachment Permission Tests');

  // Upload an attachment
  const content = new TextEncoder().encode('test image content');
  const attachment = await attachments.uploadAttachment({
    entityType: 'OperatorLog',
    entityId: 'log-123',
    category: 'hour_meter',
    fileName: 'meter.jpg',
    mimeType: 'image/jpeg',
    fileContent: content.buffer,
    uploaderId: 'user-1',
    uploaderRole: 'operator',
    requestId: generateId(),
  });

  assert(attachment.sha256.length === 64, 'Attachment has SHA-256 hash');
  assert(attachment.sizeBytes === content.buffer.byteLength, 'Attachment size recorded');

  // Generate signed URL with permission
  const signedUrl = await attachments.generateSignedUrl({
    attachmentId: attachment.id,
    userId: 'user-1',
    hasPermission: true,
  });
  assert(signedUrl.url.includes(attachment.id), 'Signed URL contains attachment ID');
  assert(new Date(signedUrl.expiresAt) > new Date(), 'Signed URL has future expiry');

  // Try without permission
  await assertThrows(
    () => attachments.generateSignedUrl({
      attachmentId: attachment.id,
      userId: 'user-2',
      hasPermission: false,
    }),
    'Permission denied',
    'Download denied without permission on parent record'
  );

  // Test invalid file type
  await assertThrows(
    () => attachments.uploadAttachment({
      entityType: 'Test',
      entityId: 'test',
      category: 'general',
      fileName: 'script.exe',
      mimeType: 'application/x-executable' as any,
      fileContent: new ArrayBuffer(100),
      uploaderId: 'user-1',
      uploaderRole: 'operator',
      requestId: generateId(),
    }),
    'not allowed',
    'Invalid file type rejected'
  );
}

// ============================================================================
// Test: Workflow Separation of Duties
// ============================================================================

async function testWorkflowSeparationOfDuties(): Promise<void> {
  console.log('\n📋 Workflow Separation of Duties Tests');

  // Start a workflow
  const instance = await workflow.startWorkflow({
    entityType: 'OperatorLog',
    entityId: 'log-456',
    submittedBy: 'operator-1',
    submittedByRole: 'operator',
    requestId: generateId(),
  });

  assert(instance.currentState === 'draft', 'Workflow starts in draft state');

  // Submit
  const submitted = await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-456',
    action: 'submit',
    actorId: 'operator-1',
    actorRole: 'operator',
    requestId: generateId(),
  });
  assert(submitted.currentState === 'submitted', 'Workflow transitions to submitted');

  // Submit again to move to pending_approval
  const pending = await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-456',
    action: 'submit',
    actorId: 'operator-1',
    actorRole: 'operator',
    requestId: generateId(),
  });
  assert(pending.currentState === 'pending_approval', 'Workflow transitions to pending_approval');

  // Try to approve as the submitter (should fail)
  await assertThrows(
    () => workflow.executeWorkflowAction({
      entityType: 'OperatorLog',
      entityId: 'log-456',
      action: 'approve',
      actorId: 'operator-1', // Same as submitter
      actorRole: 'site_manager',
      requestId: generateId(),
    }),
    'Separation of duties',
    'Submitter cannot approve their own record'
  );

  // Approve as a different user
  const approved = await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-456',
    action: 'approve',
    actorId: 'manager-1', // Different from submitter
    actorRole: 'site_manager',
    requestId: generateId(),
  });
  assert(approved.currentState === 'approved', 'Different user can approve');
  assert(approved.approvedBy === 'manager-1', 'Approver recorded');

  // Test reject without reason (should fail)
  // Start another workflow for this test
  await workflow.startWorkflow({
    entityType: 'OperatorLog',
    entityId: 'log-789',
    submittedBy: 'operator-2',
    submittedByRole: 'operator',
    requestId: generateId(),
  });
  await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-789',
    action: 'submit',
    actorId: 'operator-2',
    actorRole: 'operator',
    requestId: generateId(),
  });
  await workflow.executeWorkflowAction({
    entityType: 'OperatorLog',
    entityId: 'log-789',
    action: 'submit',
    actorId: 'operator-2',
    actorRole: 'operator',
    requestId: generateId(),
  });

  await assertThrows(
    () => workflow.executeWorkflowAction({
      entityType: 'OperatorLog',
      entityId: 'log-789',
      action: 'reject',
      actorId: 'manager-2',
      actorRole: 'site_manager',
      requestId: generateId(),
      // No reason provided
    }),
    'Reason is required',
    'Reject without reason fails'
  );
}

// ============================================================================
// Test: Idempotency (Acceptance: duplicate key returns original)
// ============================================================================

async function testIdempotency(): Promise<void> {
  console.log('\n📋 Idempotency Tests');

  const idempotencyKey = 'test-key-001';
  let callCount = 0;

  // First call
  const result1 = await idempotency.withIdempotency({
    idempotencyKey,
    entityType: 'TestEntity',
    requestPayload: { name: 'Test' },
    handler: async () => {
      callCount++;
      return { entityId: 'entity-1', response: { success: true, callNumber: callCount } };
    },
  });

  assert(!result1.cached, 'First call is not cached');
  assert(callCount === 1, 'Handler called once');

  // Second call with same key
  const result2 = await idempotency.withIdempotency({
    idempotencyKey,
    entityType: 'TestEntity',
    requestPayload: { name: 'Test' }, // Same payload
    handler: async () => {
      callCount++;
      return { entityId: 'entity-2', response: { success: true, callNumber: callCount } };
    },
  });

  assert(result2.cached, 'Second call returns cached result');
  assert(callCount === 1, 'Handler NOT called again');
  assert(result2.entityId === 'entity-1', 'Returns original entity ID');

  // Different payload with same key should fail
  await assertThrows(
    () => idempotency.withIdempotency({
      idempotencyKey,
      entityType: 'TestEntity',
      requestPayload: { name: 'Different' }, // Different payload
      handler: async () => {
        return { entityId: 'entity-3', response: {} };
      },
    }),
    'different request payload',
    'Different payload with same key throws error'
  );
}

// ============================================================================
// Test: Alert De-duplication
// ============================================================================

async function testAlertDeduplication(): Promise<void> {
  console.log('\n📋 Alert De-duplication Tests');

  // Raise an alert
  const alert1 = await alerts.raiseAlert({
    ruleCode: 'FUEL_VARIANCE_CRITICAL',
    severity: 'critical',
    title: 'Fuel Variance High',
    description: 'Equipment EQ-001 has 12% variance',
    module: 'Fuel Management',
    entityType: 'FuelRecord',
    entityId: 'fr-001',
    requestId: generateId(),
  });

  assert(alert1 !== null, 'First alert raised');

  // Try to raise the same alert again (should be de-duplicated)
  const alert2 = await alerts.raiseAlert({
    ruleCode: 'FUEL_VARIANCE_CRITICAL',
    severity: 'critical',
    title: 'Fuel Variance High',
    description: 'Equipment EQ-001 has 12% variance',
    module: 'Fuel Management',
    entityType: 'FuelRecord',
    entityId: 'fr-001', // Same entity
    requestId: generateId(),
  });

  assert(alert2 === null, 'Duplicate alert de-duplicated (returns null)');

  // Different entity should create new alert
  const alert3 = await alerts.raiseAlert({
    ruleCode: 'FUEL_VARIANCE_CRITICAL',
    severity: 'critical',
    title: 'Fuel Variance High',
    description: 'Equipment EQ-002 has 15% variance',
    module: 'Fuel Management',
    entityType: 'FuelRecord',
    entityId: 'fr-002', // Different entity
    requestId: generateId(),
  });

  assert(alert3 !== null, 'Alert for different entity is created');

  // Test alert status transitions
  if (alert1) {
    const acknowledged = await alerts.acknowledgeAlert(alert1.id, 'user-1', 'site_manager', generateId());
    assert(acknowledged.status === 'acknowledged', 'Alert acknowledged');

    const resolved = await alerts.resolveAlert(alert1.id, 'user-1', 'site_manager', 'Variance explained by terrain', generateId());
    assert(resolved.status === 'resolved', 'Alert resolved');
    assert(resolved.resolutionNote === 'Variance explained by terrain', 'Resolution note saved');
  }
}

// ============================================================================
// Test: Financial Year Reset
// ============================================================================

async function testFinancialYearReset(): Promise<void> {
  console.log('\n📋 Financial Year Reset Tests');

  const company = await masters.createCompany({
    code: 'FY-TEST',
    name: 'FY Test Company',
    legalName: 'FY Test Company Pvt Ltd',
    address: 'Test',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
    country: 'India',
  });

  const currentFY = getCurrentFinancialYear();
  const num1 = await numbering.generateNumber(company.id, 'JOURNAL_VOUCHER');
  assert(num1.includes(currentFY), `Number includes current FY (${currentFY})`);

  // Parse and verify
  const parsed = numbering.parseDocumentNumber(num1);
  assert(parsed !== null, 'Document number parsed successfully');
  assert(parsed?.financialYear === currentFY, 'Parsed FY matches current FY');
}

// ============================================================================
// Test: UoM Conversion
// ============================================================================

async function testUoMConversion(): Promise<void> {
  console.log('\n📋 UoM Conversion Tests');

  const uomList = await masters.listUoMs();
  assert(uomList.length >= 10, 'Default UoMs seeded (at least 10)');

  // Litre to Kilolitre
  const kl = masters.convertUoM(1000, 'L', 'KL', uomList);
  assert(kl === 1, '1000 L = 1 KL');

  // KG to Tonne
  const tonnes = masters.convertUoM(2500, 'KG', 'TNE', uomList);
  assert(tonnes === 2.5, '2500 KG = 2.5 TNE');

  // Bags to KG (1 bag = 50 kg)
  const kg = masters.convertUoM(10, 'BAG', 'KG', uomList);
  assert(kg === 500, '10 bags = 500 KG');

  // Cannot convert between categories
  try {
    masters.convertUoM(100, 'L', 'KG', uomList);
    assert(false, 'Cross-category conversion should throw');
  } catch (err) {
    assert(true, 'Cross-category conversion throws error');
  }
}
