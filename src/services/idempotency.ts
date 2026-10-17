/**
 * 2.7 Idempotency & Offline Sync Framework
 *
 * Idempotency-key middleware for write APIs.
 * Offline sync contract for mobile/PWA.
 */

import { storage } from './storage';
import { IdempotencyRecord, OfflineQueueItem } from './types';
import { generateId, sha256 } from './utils';

const idempotencyStore = storage.getAdapter<IdempotencyRecord>('idempotency');
const offlineQueueStore = storage.getAdapter<OfflineQueueItem>('offline_queue');

// Idempotency key expiry (24 hours)
const IDEMPOTENCY_EXPIRY_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// Idempotency
// ============================================================================

/**
 * Process a request with idempotency key.
 * If the key has been seen before, return the cached response.
 * Otherwise, execute the handler and cache the result.
 */
export async function withIdempotency<T>(params: {
  idempotencyKey: string;
  entityType: string;
  requestPayload: Record<string, unknown>;
  handler: () => Promise<{ entityId: string; response: T }>;
}): Promise<{ entityId: string; response: T; cached: boolean }> {
  const requestHash = await sha256(JSON.stringify(params.requestPayload));

  // Check for existing record
  const existing = await idempotencyStore.findAll();
  const cached = existing.find(r => r.key === params.idempotencyKey);

  if (cached) {
    // Verify the request hasn't changed
    if (cached.requestHash !== requestHash) {
      throw new Error(
        `Idempotency key '${params.idempotencyKey}' was used with a different request payload. ` +
        `Use a new key for different requests.`
      );
    }

    // Check expiry
    if (new Date(cached.expiresAt) < new Date()) {
      // Expired — remove and proceed
      await idempotencyStore.delete(cached.id);
    } else {
      // Return cached result
      return {
        entityId: cached.entityId,
        response: cached.response as T,
        cached: true,
      };
    }
  }

  // Execute the handler
  const result = await params.handler();

  // Cache the result
  const record: IdempotencyRecord = {
    id: generateId(),
    key: params.idempotencyKey,
    entityType: params.entityType,
    entityId: result.entityId,
    requestHash,
    response: result.response,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + IDEMPOTENCY_EXPIRY_MS).toISOString(),
  };

  await idempotencyStore.create(record);

  return {
    entityId: result.entityId,
    response: result.response,
    cached: false,
  };
}

/**
 * Clean up expired idempotency records.
 */
export async function cleanupExpiredIdempotency(): Promise<number> {
  const all = await idempotencyStore.findAll();
  const now = new Date();
  let cleaned = 0;

  for (const record of all) {
    if (new Date(record.expiresAt) < now) {
      await idempotencyStore.delete(record.id);
      cleaned++;
    }
  }

  return cleaned;
}

// ============================================================================
// Offline Sync
// ============================================================================

/**
 * Queue an offline operation.
 */
export async function queueOfflineOperation(params: {
  entityType: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientCapturedAt?: string;
}): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: (params.payload.id as string) || generateId(),
    entityType: params.entityType,
    action: params.action,
    payload: params.payload,
    clientCreatedAt: new Date().toISOString(),
    clientCapturedAt: params.clientCapturedAt,
    retryCount: 0,
    status: 'pending',
  };

  return offlineQueueStore.create(item);
}

/**
 * Get all pending offline operations.
 */
export async function getPendingOperations(): Promise<OfflineQueueItem[]> {
  const all = await offlineQueueStore.findAll();
  return all
    .filter(item => item.status === 'pending' || item.status === 'failed')
    .sort((a, b) => new Date(a.clientCreatedAt).getTime() - new Date(b.clientCreatedAt).getTime());
}

/**
 * Mark an offline operation as syncing.
 */
export async function markAsSyncing(itemId: string): Promise<void> {
  await offlineQueueStore.update(itemId, { status: 'syncing' });
}

/**
 * Mark an offline operation as synced.
 */
export async function markAsSynced(itemId: string): Promise<void> {
  await offlineQueueStore.update(itemId, {
    status: 'synced',
    serverReceiptAt: new Date().toISOString(),
  });
}

/**
 * Mark an offline operation as failed with retry.
 */
export async function markAsFailed(itemId: string, maxRetries = 3): Promise<void> {
  const item = await offlineQueueStore.findById(itemId);
  if (!item) throw new Error(`Offline queue item ${itemId} not found`);

  const newRetryCount = item.retryCount + 1;
  const newStatus = newRetryCount >= maxRetries ? 'failed' : 'pending';

  await offlineQueueStore.update(itemId, {
    status: newStatus,
    retryCount: newRetryCount,
  });
}

/**
 * Detect conflicts between offline and server data.
 */
export async function detectConflict(
  entityType: string,
  entityId: string,
  clientPayload: Record<string, unknown>,
  serverData: Record<string, unknown>
): Promise<{ hasConflict: boolean; conflictingFields: string[] }> {
  const conflictingFields: string[] = [];

  for (const [key, clientValue] of Object.entries(clientPayload)) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;

    const serverValue = serverData[key];
    if (JSON.stringify(clientValue) !== JSON.stringify(serverValue)) {
      conflictingFields.push(key);
    }
  }

  return {
    hasConflict: conflictingFields.length > 0,
    conflictingFields,
  };
}

/**
 * Get sync statistics.
 */
export async function getSyncStats(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  conflict: number;
  failed: number;
}> {
  const all = await offlineQueueStore.findAll();
  return {
    total: all.length,
    pending: all.filter(i => i.status === 'pending').length,
    syncing: all.filter(i => i.status === 'syncing').length,
    synced: all.filter(i => i.status === 'synced').length,
    conflict: all.filter(i => i.status === 'conflict').length,
    failed: all.filter(i => i.status === 'failed').length,
  };
}
