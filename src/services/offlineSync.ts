/**
 * Part 07 — Offline Sync Service
 */

import { storage } from './storage';
import { OfflineQueueItem } from './submissionTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { createSubmission, addPhotoEvidence } from './submissionService';

const offlineQueueStore = storage.getAdapter<OfflineQueueItem>('offline_queue');

// ============================================================================
// Offline Queue Management
// ============================================================================

export async function addToOfflineQueue(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'retryCount'>
): Promise<OfflineQueueItem> {
  const queueItem: OfflineQueueItem = {
    ...item,
    id: item.clientUuid,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await offlineQueueStore.create(queueItem);

  await recordAudit({
    entityType: 'OfflineQueueItem',
    entityId: queueItem.id,
    action: 'create',
    before: null,
    after: queueItem as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Item added to offline queue',
  });

  return queueItem;
}

export async function getOfflineQueueItem(id: string): Promise<OfflineQueueItem | null> {
  return offlineQueueStore.findById(id);
}

export async function listOfflineQueueItems(filters?: {
  status?: string;
  type?: string;
}): Promise<OfflineQueueItem[]> {
  let items = await offlineQueueStore.findAll();

  if (filters?.status) {
    items = items.filter(i => i.status === filters.status);
  }
  if (filters?.type) {
    items = items.filter(i => i.type === filters.type);
  }

  return items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateOfflineQueueItem(
  id: string,
  updates: Partial<OfflineQueueItem>
): Promise<OfflineQueueItem> {
  const item = await offlineQueueStore.findById(id);
  if (!item) {
    throw new Error(`Offline queue item ${id} not found`);
  }

  return offlineQueueStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeFromOfflineQueue(id: string): Promise<void> {
  const item = await offlineQueueStore.findById(id);
  if (!item) {
    throw new Error(`Offline queue item ${id} not found`);
  }

  await offlineQueueStore.delete(id);

  await recordAudit({
    entityType: 'OfflineQueueItem',
    entityId: id,
    action: 'delete',
    before: item as unknown as Record<string, unknown>,
    after: null,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Item removed from offline queue',
  });
}

// ============================================================================
// Sync Operations
// ============================================================================

export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  const stats = {
    synced: 0,
    failed: 0,
    conflicts: 0,
  };

  const pendingItems = await listOfflineQueueItems({ status: 'pending' });

  for (const item of pendingItems) {
    try {
      await updateOfflineQueueItem(item.id, { status: 'syncing' });

      if (item.type === 'submission' && item.submissionData) {
        // Sync submission
        const submission = await createSubmission(item.submissionData as any, item.submissionData.createdBy || 'system');
        
        await updateOfflineQueueItem(item.id, {
          status: 'synced',
          serverId: submission.id,
          serverReceiptTime: new Date().toISOString(),
        });

        stats.synced++;
      } else if (item.type === 'photo' && item.photoData) {
        // Sync photo
        await addPhotoEvidence(
          item.photoData.submissionId,
          {
            category: item.photoData.category,
            fileName: 'photo.jpg', // Would get from metadata
            mimeType: item.photoData.fileBlob.type,
            sizeBytes: item.photoData.fileBlob.size,
            sha256: 'pending', // Would calculate actual hash
            captureTime: item.photoData.captureTime,
            attachmentId: 'pending', // Would upload to attachment service
          },
          'system'
        );

        await updateOfflineQueueItem(item.id, {
          status: 'synced',
          serverReceiptTime: new Date().toISOString(),
        });

        stats.synced++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a conflict
      if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
        await updateOfflineQueueItem(item.id, {
          status: 'conflict',
          conflictDetails: errorMessage,
          retryCount: item.retryCount + 1,
        });
        stats.conflicts++;
      } else {
        await updateOfflineQueueItem(item.id, {
          status: 'failed',
          lastError: errorMessage,
          retryCount: item.retryCount + 1,
        });
        stats.failed++;
      }
    }
  }

  await recordAudit({
    entityType: 'OfflineQueue',
    entityId: 'batch',
    action: 'update',
    before: null,
    after: stats as unknown as Record<string, unknown>,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Offline queue sync completed',
  });

  return stats;
}

export async function retryFailedItems(): Promise<{
  retried: number;
  failed: number;
}> {
  const stats = {
    retried: 0,
    failed: 0,
  };

  const failedItems = await listOfflineQueueItems({ status: 'failed' });

  for (const item of failedItems) {
    if (item.retryCount < 3) { // Max 3 retries
      await updateOfflineQueueItem(item.id, {
        status: 'pending',
        lastError: undefined,
      });
      stats.retried++;
    } else {
      stats.failed++;
    }
  }

  return stats;
}

export async function resolveConflict(
  itemId: string,
  resolution: 'keep_local' | 'keep_server' | 'merge',
  userId: string
): Promise<void> {
  const item = await offlineQueueStore.findById(itemId);
  if (!item) {
    throw new Error(`Offline queue item ${itemId} not found`);
  }

  if (item.status !== 'conflict') {
    throw new Error('Item is not in conflict status');
  }

  // Handle resolution based on strategy
  if (resolution === 'keep_local') {
    await updateOfflineQueueItem(itemId, {
      status: 'pending',
      conflictDetails: undefined,
    });
  } else if (resolution === 'keep_server') {
    await removeFromOfflineQueue(itemId);
  } else if (resolution === 'merge') {
    // Merge logic would be implemented here
    await updateOfflineQueueItem(itemId, {
      status: 'pending',
      conflictDetails: 'Merged',
    });
  }

  await recordAudit({
    entityType: 'OfflineQueueItem',
    entityId: itemId,
    action: 'update',
    before: item as unknown as Record<string, unknown>,
    after: { status: 'pending', resolution },
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Conflict resolved: ${resolution}`,
  });
}

// ============================================================================
// Queue Statistics
// ============================================================================

export async function getQueueStatistics(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  conflicts: number;
}> {
  const items = await offlineQueueStore.findAll();

  return {
    total: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    syncing: items.filter(i => i.status === 'syncing').length,
    synced: items.filter(i => i.status === 'synced').length,
    failed: items.filter(i => i.status === 'failed').length,
    conflicts: items.filter(i => i.status === 'conflict').length,
  };
}

export async function cleanupOldSyncedItems(maxAgeHours: number = 24): Promise<number> {
  const items = await offlineQueueStore.findAll();
  const now = new Date();
  let cleaned = 0;

  for (const item of items) {
    if (item.status === 'synced') {
      const syncedAt = new Date(item.serverReceiptTime || item.updatedAt);
      const ageHours = (now.getTime() - syncedAt.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > maxAgeHours) {
        await offlineQueueStore.delete(item.id);
        cleaned++;
      }
    }
  }

  return cleaned;
}
