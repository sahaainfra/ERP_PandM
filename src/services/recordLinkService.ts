/**
 * Part 20 — Record Link Service
 */

import { storage } from './storage';
import { RecordLink, LinkedRecordType, ConversationThread } from './erpChatTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { hasPermission } from './permissions';

const recordLinksStore = storage.getAdapter<RecordLink>('chat_record_links');
const threadsStore = storage.getAdapter<ConversationThread>('chat_threads');

// ============================================================================
// Record Link Management
// ============================================================================

export async function createRecordLink(
  channelId: string,
  recordType: LinkedRecordType,
  recordId: string,
  userId: string,
  recordData?: {
    recordNumber?: string;
    recordTitle?: string;
    recordStatus?: string;
    recordKeyValues?: Record<string, any>;
  }
): Promise<RecordLink> {
  // Check if link already exists
  const existing = await getRecordLinkByRecord(recordType, recordId, channelId);
  if (existing) {
    return existing;
  }

  const link: RecordLink = {
    id: generateId(),
    channelId,
    recordType,
    recordId,
    recordNumber: recordData?.recordNumber,
    recordTitle: recordData?.recordTitle,
    recordStatus: recordData?.recordStatus,
    recordKeyValues: recordData?.recordKeyValues,
    lastPermissionCheck: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await recordLinksStore.create(link);

  await recordAudit({
    entityType: 'RecordLink',
    entityId: link.id,
    action: 'create',
    before: null,
    after: link as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Linked ${recordType} ${recordId} to channel ${channelId}`,
  });

  return link;
}

export async function getRecordLink(id: string): Promise<RecordLink | null> {
  return recordLinksStore.findById(id);
}

export async function getRecordLinkByRecord(
  recordType: LinkedRecordType,
  recordId: string,
  channelId: string
): Promise<RecordLink | null> {
  const all = await recordLinksStore.findAll();
  return all.find(l => 
    l.recordType === recordType && 
    l.recordId === recordId && 
    l.channelId === channelId
  ) || null;
}

export async function getRecordLinksByChannel(channelId: string): Promise<RecordLink[]> {
  const all = await recordLinksStore.findAll();
  return all.filter(l => l.channelId === channelId);
}

export async function getRecordLinksByRecord(
  recordType: LinkedRecordType,
  recordId: string
): Promise<RecordLink[]> {
  const all = await recordLinksStore.findAll();
  return all.filter(l => l.recordType === recordType && l.recordId === recordId);
}

export async function updateRecordLinkData(
  id: string,
  recordData: {
    recordTitle?: string;
    recordStatus?: string;
    recordKeyValues?: Record<string, any>;
  }
): Promise<RecordLink> {
  const link = await recordLinksStore.findById(id);
  if (!link) {
    throw new Error(`Record link ${id} not found`);
  }

  const updated = await recordLinksStore.update(id, {
    ...recordData,
    lastPermissionCheck: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function checkRecordPermission(
  linkId: string,
  userId: string
): Promise<{ hasAccess: boolean; record?: any }> {
  const link = await recordLinksStore.findById(linkId);
  if (!link) {
    return { hasAccess: false };
  }

  // Update last permission check
  await recordLinksStore.update(linkId, {
    lastPermissionCheck: new Date().toISOString(),
  });

  // In a real implementation, this would fetch the actual record
  // and check permissions based on the record type
  // For now, we'll return a mock response
  return {
    hasAccess: true,
    record: {
      type: link.recordType,
      id: link.recordId,
      number: link.recordNumber,
      title: link.recordTitle,
      status: link.recordStatus,
      keyValues: link.recordKeyValues,
    },
  };
}

// ============================================================================
// Conversation Thread Management
// ============================================================================

export async function createConversationThread(
  channelId: string,
  recordType: LinkedRecordType,
  recordId: string,
  userId: string,
  title: string,
  description?: string
): Promise<ConversationThread> {
  // Create or get record link
  const recordLink = await createRecordLink(channelId, recordType, recordId, userId);

  // Check if thread already exists
  const existingThread = await getThreadByRecordLink(recordLink.id);
  if (existingThread) {
    return existingThread;
  }

  const thread: ConversationThread = {
    id: generateId(),
    channelId,
    recordLink,
    title,
    description,
    participantIds: [userId],
    isResolved: false,
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await threadsStore.create(thread);

  await recordAudit({
    entityType: 'ConversationThread',
    entityId: thread.id,
    action: 'create',
    before: null,
    after: thread as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Thread created for ${recordType} ${recordId}`,
  });

  return thread;
}

export async function getThread(id: string): Promise<ConversationThread | null> {
  return threadsStore.findById(id);
}

export async function getThreadByRecordLink(recordLinkId: string): Promise<ConversationThread | null> {
  const all = await threadsStore.findAll();
  return all.find(t => t.recordLink.id === recordLinkId) || null;
}

export async function getThreadsByChannel(channelId: string): Promise<ConversationThread[]> {
  const all = await threadsStore.findAll();
  return all.filter(t => t.channelId === channelId);
}

export async function addThreadParticipant(
  threadId: string,
  userId: string,
  addedBy: string
): Promise<ConversationThread> {
  const thread = await threadsStore.findById(threadId);
  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  if (thread.participantIds.includes(userId)) {
    return thread; // Already a participant
  }

  const updated = await threadsStore.update(threadId, {
    participantIds: [...thread.participantIds, userId],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ConversationThread',
    entityId: threadId,
    action: 'update',
    before: { participantIds: thread.participantIds },
    after: { participantIds: updated.participantIds },
    actorId: addedBy,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `User ${userId} added to thread`,
  });

  return updated;
}

export async function resolveThread(
  threadId: string,
  userId: string
): Promise<ConversationThread> {
  const thread = await threadsStore.findById(threadId);
  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  const updated = await threadsStore.update(threadId, {
    isResolved: true,
    resolvedAt: new Date().toISOString(),
    resolvedBy: userId,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ConversationThread',
    entityId: threadId,
    action: 'update',
    before: { isResolved: false },
    after: { isResolved: true, resolvedBy: userId },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: 'Thread resolved',
  });

  return updated;
}

export async function incrementThreadMessageCount(threadId: string): Promise<void> {
  const thread = await threadsStore.findById(threadId);
  if (!thread) {
    return;
  }

  await threadsStore.update(threadId, {
    messageCount: thread.messageCount + 1,
    lastMessageAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// ============================================================================
// Deep Link Resolution
// ============================================================================

export function parseDeepLink(url: string): {
  recordType: LinkedRecordType;
  recordId: string;
  action?: string;
} | null {
  // Parse erp://record-type/record-id?action=view
  const match = url.match(/^erp:\/\/([^\/]+)\/([^\/\?]+)(?:\?action=(\w+))?$/);
  if (!match) {
    return null;
  }

  return {
    recordType: match[1] as LinkedRecordType,
    recordId: match[2],
    action: match[3],
  };
}

export function createDeepLink(
  recordType: LinkedRecordType,
  recordId: string,
  action?: string
): string {
  let link = `erp://${recordType}/${recordId}`;
  if (action) {
    link += `?action=${action}`;
  }
  return link;
}

export async function resolveDeepLink(
  url: string,
  userId: string
): Promise<{
  resolved: boolean;
  recordType?: LinkedRecordType;
  recordId?: string;
  record?: any;
  permissionGranted: boolean;
  errorMessage?: string;
}> {
  const parsed = parseDeepLink(url);
  if (!parsed) {
    return {
      resolved: false,
      permissionGranted: false,
      errorMessage: 'Invalid deep link format',
    };
  }

  // Find record link
  const links = await getRecordLinksByRecord(parsed.recordType, parsed.recordId);
  if (links.length === 0) {
    return {
      resolved: false,
      recordType: parsed.recordType,
      recordId: parsed.recordId,
      permissionGranted: false,
      errorMessage: 'Record not found or not linked to any conversation',
    };
  }

  // Check permission on first link
  const permissionCheck = await checkRecordPermission(links[0].id, userId);
  
  return {
    resolved: true,
    recordType: parsed.recordType,
    recordId: parsed.recordId,
    record: permissionCheck.record,
    permissionGranted: permissionCheck.hasAccess,
  };
}
