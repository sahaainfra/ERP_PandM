/**
 * Part 19 — Chat Service
 */

import { storage } from './storage';
import { 
  ChatChannel, 
  ChatMessage, 
  ChannelType, 
  MessageType,
  ChatPresence,
  ChatNotificationPreferences,
  UnreadCount,
  ChatSearchResult,
  ChatOutboxMessage,
  ChatAuditLog,
  ChatConfiguration,
  MessageReaction
} from './chatTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const channelsStore = storage.getAdapter<ChatChannel>('chat_channels');
const messagesStore = storage.getAdapter<ChatMessage>('chat_messages');
const presenceStore = storage.getAdapter<ChatPresence>('chat_presence');
const notificationPrefsStore = storage.getAdapter<ChatNotificationPreferences>('chat_notification_prefs');
const unreadStore = storage.getAdapter<UnreadCount>('chat_unread');
const outboxStore = storage.getAdapter<ChatOutboxMessage>('chat_outbox');
const auditLogStore = storage.getAdapter<ChatAuditLog>('chat_audit_log');
const configStore = storage.getAdapter<ChatConfiguration>('chat_config');

// ============================================================================
// Configuration
// ============================================================================

export async function getChatConfiguration(): Promise<ChatConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const defaultConfig: ChatConfiguration = {
      id: 'default',
      maxMessageLength: 4000,
      maxAttachmentsPerMessage: 10,
      maxAttachmentSizeMB: 25,
      editWindowMinutes: 15,
      allowDelete: true,
      deleteRetainsTombstone: true,
      enablePresence: true,
      enableTypingIndicators: true,
      enableSearch: true,
      searchMaxResults: 50,
      defaultRetentionDays: 365,
      messagesPerMinute: 30,
      attachmentsPerMinute: 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }
  return configs[0];
}

export async function updateChatConfiguration(
  updates: Partial<ChatConfiguration>
): Promise<ChatConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const config: ChatConfiguration = {
      id: generateId(),
      maxMessageLength: updates.maxMessageLength ?? 4000,
      maxAttachmentsPerMessage: updates.maxAttachmentsPerMessage ?? 10,
      maxAttachmentSizeMB: updates.maxAttachmentSizeMB ?? 25,
      editWindowMinutes: updates.editWindowMinutes ?? 15,
      allowDelete: updates.allowDelete ?? true,
      deleteRetainsTombstone: updates.deleteRetainsTombstone ?? true,
      enablePresence: updates.enablePresence ?? true,
      enableTypingIndicators: updates.enableTypingIndicators ?? true,
      enableSearch: updates.enableSearch ?? true,
      searchMaxResults: updates.searchMaxResults ?? 50,
      defaultRetentionDays: updates.defaultRetentionDays ?? 365,
      messagesPerMinute: updates.messagesPerMinute ?? 30,
      attachmentsPerMinute: updates.attachmentsPerMinute ?? 10,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(config);
    return config;
  }

  const updated = await configStore.update(configs[0].id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

// ============================================================================
// Channel Management
// ============================================================================

export async function createChannel(
  data: Omit<ChatChannel, 'id' | 'memberIds' | 'adminIds' | 'createdAt' | 'updatedAt'>,
  creatorId: string
): Promise<ChatChannel> {
  const channel: ChatChannel = {
    ...data,
    id: generateId(),
    memberIds: [creatorId],
    adminIds: [creatorId],
    legalHold: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await channelsStore.create(channel);

  await recordAudit({
    entityType: 'ChatChannel',
    entityId: channel.id,
    action: 'create',
    before: null,
    after: channel as any,
    actorId: creatorId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Channel ${channel.name} created`,
  });

  return channel;
}

export async function getChannel(id: string): Promise<ChatChannel | null> {
  return channelsStore.findById(id);
}

export async function listChannels(userId: string): Promise<ChatChannel[]> {
  const allChannels = await channelsStore.findAll();
  return allChannels.filter(c => c.memberIds.includes(userId) && c.isActive);
}

export async function updateChannel(
  id: string,
  updates: Partial<ChatChannel>,
  userId: string
): Promise<ChatChannel> {
  const channel = await channelsStore.findById(id);
  if (!channel) {
    throw new Error(`Channel ${id} not found`);
  }

  // Check if user is admin
  if (!channel.adminIds.includes(userId)) {
    throw new Error('Only channel admins can update the channel');
  }

  const updated = await channelsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'ChatChannel',
    entityId: id,
    action: 'update',
    before: channel as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: 'Channel updated',
  });

  return updated;
}

export async function addChannelMember(
  channelId: string,
  userId: string,
  addedBy: string
): Promise<void> {
  const channel = await channelsStore.findById(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  if (!channel.adminIds.includes(addedBy)) {
    throw new Error('Only channel admins can add members');
  }

  if (channel.memberIds.includes(userId)) {
    return; // Already a member
  }

  await channelsStore.update(channelId, {
    memberIds: [...channel.memberIds, userId],
    updatedAt: new Date().toISOString(),
  });

  // Create audit log
  const auditLog: ChatAuditLog = {
    id: generateId(),
    action: 'member_added',
    channelId,
    userId: addedBy,
    targetUserId: userId,
    details: {},
    createdAt: new Date().toISOString(),
  };
  await auditLogStore.create(auditLog);
}

export async function removeChannelMember(
  channelId: string,
  userId: string,
  removedBy: string
): Promise<void> {
  const channel = await channelsStore.findById(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  if (!channel.adminIds.includes(removedBy)) {
    throw new Error('Only channel admins can remove members');
  }

  await channelsStore.update(channelId, {
    memberIds: channel.memberIds.filter(id => id !== userId),
    adminIds: channel.adminIds.filter(id => id !== userId),
    updatedAt: new Date().toISOString(),
  });

  // Create audit log
  const auditLog: ChatAuditLog = {
    id: generateId(),
    action: 'member_removed',
    channelId,
    userId: removedBy,
    targetUserId: userId,
    details: {},
    createdAt: new Date().toISOString(),
  };
  await auditLogStore.create(auditLog);
}

// ============================================================================
// Message Management
// ============================================================================

export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  type: MessageType = 'text',
  attachmentIds: string[] = [],
  replyToMessageId?: string,
  mentions: string[] = [],
  clientMessageId?: string
): Promise<ChatMessage> {
  const channel = await channelsStore.findById(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  // Check if user is member
  if (!channel.memberIds.includes(senderId)) {
    throw new Error('User is not a member of this channel');
  }

  // Check message length
  const config = await getChatConfiguration();
  if (content.length > config.maxMessageLength) {
    throw new Error(`Message exceeds maximum length of ${config.maxMessageLength} characters`);
  }

  // Check attachments
  if (attachmentIds.length > config.maxAttachmentsPerMessage) {
    throw new Error(`Cannot attach more than ${config.maxAttachmentsPerMessage} files`);
  }

  // Check for duplicate (idempotency)
  if (clientMessageId) {
    const existing = await messagesStore.findAll();
    const duplicate = existing.find(m => m.clientMessageId === clientMessageId);
    if (duplicate) {
      return duplicate; // Return existing message
    }
  }

  // Get next sequence number
  const allMessages = await messagesStore.findAll({ channelId } as any);
  const maxSequence = allMessages.reduce((max, m) => Math.max(max, m.sequenceNumber), 0);
  const sequenceNumber = maxSequence + 1;

  const message: ChatMessage = {
    id: generateId(),
    channelId,
    clientMessageId: clientMessageId || generateId(),
    senderId,
    senderName: senderId, // Would be resolved from user service
    type,
    content,
    attachmentIds,
    replyToMessageId,
    reactions: [],
    mentions,
    isTombstone: false,
    readBy: [senderId],
    isPinned: false,
    sequenceNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await messagesStore.create(message);

  // Update channel last message
  await channelsStore.update(channelId, {
    lastMessageAt: message.createdAt,
    lastMessagePreview: content.substring(0, 100),
    updatedAt: new Date().toISOString(),
  });

  // Initialize unread counts for other members
  for (const memberId of channel.memberIds) {
    if (memberId !== senderId) {
      await incrementUnreadCount(memberId, channelId);
    }
  }

  return message;
}

export async function getMessage(id: string): Promise<ChatMessage | null> {
  return messagesStore.findById(id);
}

export async function listMessages(
  channelId: string,
  userId: string,
  limit: number = 50,
  beforeSequence?: number
): Promise<ChatMessage[]> {
  const channel = await channelsStore.findById(channelId);
  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  // Check if user is member
  if (!channel.memberIds.includes(userId)) {
    throw new Error('User is not a member of this channel');
  }

  let messages = await messagesStore.findAll({ channelId } as any);
  
  if (beforeSequence !== undefined) {
    messages = messages.filter(m => m.sequenceNumber < beforeSequence);
  }

  // Sort by sequence number descending
  messages.sort((a, b) => b.sequenceNumber - a.sequenceNumber);

  // Limit results
  messages = messages.slice(0, limit);

  // Reverse to chronological order
  messages.reverse();

  // Mark as read
  await markAsRead(channelId, userId, messages[messages.length - 1]?.sequenceNumber || 0);

  return messages;
}

export async function editMessage(
  messageId: string,
  newContent: string,
  userId: string
): Promise<ChatMessage> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  // Check if user is sender
  if (message.senderId !== userId) {
    throw new Error('Only the sender can edit their message');
  }

  // Check edit window
  const config = await getChatConfiguration();
  const messageAge = (Date.now() - new Date(message.createdAt).getTime()) / (1000 * 60);
  if (messageAge > config.editWindowMinutes) {
    throw new Error(`Edit window of ${config.editWindowMinutes} minutes has expired`);
  }

  // Check message length
  if (newContent.length > config.maxMessageLength) {
    throw new Error(`Message exceeds maximum length of ${config.maxMessageLength} characters`);
  }

  const updated = await messagesStore.update(messageId, {
    content: newContent,
    editedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function deleteMessage(
  messageId: string,
  userId: string,
  isAdmin: boolean = false
): Promise<void> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  const config = await getChatConfiguration();

  // Check permissions
  if (!isAdmin && message.senderId !== userId) {
    throw new Error('Only the sender or an admin can delete this message');
  }

  if (!config.allowDelete && !isAdmin) {
    throw new Error('Message deletion is not allowed');
  }

  if (config.deleteRetainsTombstone) {
    // Create tombstone
    await messagesStore.update(messageId, {
      content: '[This message was deleted]',
      type: 'tombstone',
      deletedAt: new Date().toISOString(),
      isTombstone: true,
      attachmentIds: [],
      updatedAt: new Date().toISOString(),
    });
  } else {
    // Hard delete
    await messagesStore.delete(messageId);
  }

  // Create audit log
  const auditLog: ChatAuditLog = {
    id: generateId(),
    action: 'message_deleted',
    channelId: message.channelId,
    messageId,
    userId,
    details: {
      originalContent: message.content,
      deletedBy: userId,
      isAdmin,
    },
    createdAt: new Date().toISOString(),
  };
  await auditLogStore.create(auditLog);
}

// ============================================================================
// Reactions
// ============================================================================

export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<ChatMessage> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  const channel = await channelsStore.findById(message.channelId);
  if (!channel || !channel.memberIds.includes(userId)) {
    throw new Error('User is not a member of this channel');
  }

  // Check if reaction already exists
  const existingReaction = message.reactions.find(r => r.userId === userId && r.emoji === emoji);
  if (existingReaction) {
    return message; // Already reacted
  }

  const newReaction: MessageReaction = {
    userId,
    emoji,
    createdAt: new Date().toISOString(),
  };

  const updated = await messagesStore.update(messageId, {
    reactions: [...message.reactions, newReaction],
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<ChatMessage> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  const updated = await messagesStore.update(messageId, {
    reactions: message.reactions.filter(r => !(r.userId === userId && r.emoji === emoji)),
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

// ============================================================================
// Pinning
// ============================================================================

export async function pinMessage(
  messageId: string,
  userId: string
): Promise<ChatMessage> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  const channel = await channelsStore.findById(message.channelId);
  if (!channel || !channel.adminIds.includes(userId)) {
    throw new Error('Only channel admins can pin messages');
  }

  const updated = await messagesStore.update(messageId, {
    isPinned: true,
    pinnedAt: new Date().toISOString(),
    pinnedBy: userId,
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function unpinMessage(
  messageId: string,
  userId: string
): Promise<ChatMessage> {
  const message = await messagesStore.findById(messageId);
  if (!message) {
    throw new Error(`Message ${messageId} not found`);
  }

  const channel = await channelsStore.findById(message.channelId);
  if (!channel || !channel.adminIds.includes(userId)) {
    throw new Error('Only channel admins can unpin messages');
  }

  const updated = await messagesStore.update(messageId, {
    isPinned: false,
    pinnedAt: undefined,
    pinnedBy: undefined,
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

// ============================================================================
// Unread Counts
// ============================================================================

async function incrementUnreadCount(userId: string, channelId: string): Promise<void> {
  const existing = await unreadStore.findAll({ userId, channelId } as any);
  
  if (existing.length === 0) {
    const unread: UnreadCount = {
      id: generateId(),
      userId,
      channelId,
      count: 1,
      lastReadSequence: 0,
      updatedAt: new Date().toISOString(),
    };
    await unreadStore.create(unread);
  } else {
    await unreadStore.update(existing[0].id, {
      count: existing[0].count + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function markAsRead(
  channelId: string,
  userId: string,
  sequenceNumber: number
): Promise<void> {
  const existing = await unreadStore.findAll({ userId, channelId } as any);
  
  if (existing.length === 0) {
    const unread: UnreadCount = {
      id: generateId(),
      userId,
      channelId,
      count: 0,
      lastReadSequence: sequenceNumber,
      updatedAt: new Date().toISOString(),
    };
    await unreadStore.create(unread);
  } else {
    await unreadStore.update(existing[0].id, {
      count: 0,
      lastReadSequence: sequenceNumber,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function getUnreadCounts(userId: string): Promise<UnreadCount[]> {
  return unreadStore.findAll({ userId } as any);
}

// ============================================================================
// Search
// ============================================================================

export async function searchMessages(
  userId: string,
  query: string,
  channelId?: string,
  limit: number = 50
): Promise<ChatSearchResult[]> {
  const config = await getChatConfiguration();
  if (!config.enableSearch) {
    throw new Error('Search is disabled');
  }

  // Get user's channels
  const userChannels = await listChannels(userId);
  const channelIds = channelId ? [channelId] : userChannels.map(c => c.id);

  // Search messages
  const allMessages = await messagesStore.findAll();
  const results = allMessages
    .filter(m => channelIds.includes(m.channelId))
    .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
    .slice(0, limit)
    .map(m => {
      const channel = userChannels.find(c => c.id === m.channelId);
      return {
        messageId: m.id,
        channelId: m.channelId,
        channelName: channel?.name || 'Unknown',
        senderName: m.senderName,
        content: m.content,
        createdAt: m.createdAt,
        highlight: m.content.substring(0, 100), // Simplified highlight
      };
    });

  return results;
}

// ============================================================================
// Presence
// ============================================================================

export async function updatePresence(
  userId: string,
  status: 'online' | 'offline' | 'away',
  channelId?: string
): Promise<void> {
  const existing = await presenceStore.findAll({ userId } as any);
  
  if (existing.length === 0) {
    const presence: ChatPresence = {
      id: generateId(),
      userId,
      channelId,
      status,
      lastSeenAt: new Date().toISOString(),
      isTyping: false,
      updatedAt: new Date().toISOString(),
    };
    await presenceStore.create(presence);
  } else {
    await presenceStore.update(existing[0].id, {
      status,
      channelId,
      lastSeenAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function getPresence(userId: string): Promise<ChatPresence | null> {
  const all = await presenceStore.findAll({ userId } as any);
  return all[0] || null;
}

export async function updateTypingStatus(
  userId: string,
  channelId: string,
  isTyping: boolean
): Promise<void> {
  const existing = await presenceStore.findAll({ userId } as any);
  
  if (existing.length === 0) {
    const presence: ChatPresence = {
      id: generateId(),
      userId,
      channelId,
      status: 'online',
      lastSeenAt: new Date().toISOString(),
      isTyping,
      typingInChannelId: isTyping ? channelId : undefined,
      updatedAt: new Date().toISOString(),
    };
    await presenceStore.create(presence);
  } else {
    await presenceStore.update(existing[0].id, {
      isTyping,
      typingInChannelId: isTyping ? channelId : undefined,
      updatedAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Notification Preferences
// ============================================================================

export async function getNotificationPreferences(userId: string): Promise<ChatNotificationPreferences | null> {
  const all = await notificationPrefsStore.findAll({ userId } as any);
  return all[0] || null;
}

export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<ChatNotificationPreferences>
): Promise<ChatNotificationPreferences> {
  const existing = await notificationPrefsStore.findAll({ userId } as any);
  
  if (existing.length === 0) {
    const prefs: ChatNotificationPreferences = {
      id: generateId(),
      userId,
      enablePushNotifications: updates.enablePushNotifications ?? true,
      enableSound: updates.enableSound ?? true,
      enablePreview: updates.enablePreview ?? true,
      quietHoursEnabled: updates.quietHoursEnabled ?? false,
      quietHoursStart: updates.quietHoursStart,
      quietHoursEnd: updates.quietHoursEnd,
      channelOverrides: updates.channelOverrides ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await notificationPrefsStore.create(prefs);
    return prefs;
  }

  const updated = await notificationPrefsStore.update(existing[0].id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}

// ============================================================================
// Offline Outbox
// ============================================================================

export async function addToOutbox(
  channelId: string,
  senderId: string,
  content: string,
  attachmentIds: string[] = [],
  replyToMessageId?: string,
  mentions: string[] = [],
  clientMessageId?: string
): Promise<ChatOutboxMessage> {
  const outboxMessage: ChatOutboxMessage = {
    id: generateId(),
    clientMessageId: clientMessageId || generateId(),
    channelId,
    senderId,
    content,
    attachmentIds,
    replyToMessageId,
    mentions,
    syncStatus: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  await outboxStore.create(outboxMessage);
  return outboxMessage;
}

export async function syncOutbox(): Promise<number> {
  const pending = await outboxStore.findAll({ syncStatus: 'pending' } as any);
  let synced = 0;

  for (const msg of pending) {
    try {
      await outboxStore.update(msg.id, { syncStatus: 'syncing' });
      
      await sendMessage(
        msg.channelId,
        msg.senderId,
        msg.content,
        'text',
        msg.attachmentIds,
        msg.replyToMessageId,
        msg.mentions,
        msg.clientMessageId
      );

      await outboxStore.update(msg.id, {
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      });
      synced++;
    } catch (error) {
      await outboxStore.update(msg.id, {
        syncStatus: 'failed',
        retryCount: msg.retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return synced;
}

// ============================================================================
// Audit Log
// ============================================================================

export async function getChatAuditLog(
  channelId?: string,
  userId?: string,
  limit: number = 100
): Promise<ChatAuditLog[]> {
  let logs = await auditLogStore.findAll();
  
  if (channelId) {
    logs = logs.filter(l => l.channelId === channelId);
  }
  if (userId) {
    logs = logs.filter(l => l.userId === userId);
  }

  logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return logs.slice(0, limit);
}
