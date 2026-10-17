/**
 * Part 19 — Team Chat Types
 */

import { Status } from './types';

// ============================================================================
// Chat Channel
// ============================================================================

export type ChannelType = 'direct' | 'group' | 'project' | 'site' | 'plant' | 'department' | 'fleet' | 'equipment';

export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  
  // Scope (for auto-membership)
  projectId?: string;
  siteId?: string;
  plantId?: string;
  departmentId?: string;
  fleetId?: string;
  equipmentId?: string;
  
  // Membership
  memberIds: string[];
  adminIds: string[];
  
  // Settings
  autoJoin: boolean; // Auto-join based on ERP assignments
  autoLeave: boolean; // Auto-leave when assignment changes
  
  // Metadata
  description?: string;
  avatarAttachmentId?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  
  // Retention
  retentionDays?: number;
  legalHold: boolean;
  
  // Status
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Chat Message
// ============================================================================

export type MessageType = 'text' | 'image' | 'document' | 'system' | 'tombstone';

export interface ChatMessage {
  id: string;
  channelId: string;
  
  // Client-generated ID for idempotency
  clientMessageId: string;
  
  // Sender
  senderId: string;
  senderName: string;
  
  // Message type
  type: MessageType;
  
  // Content
  content: string;
  
  // Attachments
  attachmentIds: string[];
  
  // Replies and reactions
  replyToMessageId?: string;
  reactions: MessageReaction[];
  mentions: string[]; // User IDs mentioned
  
  // Edit/Delete
  editedAt?: string;
  deletedAt?: string;
  isTombstone: boolean; // True if deleted but retained for audit
  
  // Delivery/Read
  deliveredAt?: string;
  readBy: string[];
  
  // Pinning
  isPinned: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  
  // Server sequence for ordering
  sequenceNumber: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

// ============================================================================
// Chat Presence
// ============================================================================

export interface ChatPresence {
  id: string;
  userId: string;
  channelId?: string;
  status: 'online' | 'offline' | 'away';
  lastSeenAt: string;
  isTyping: boolean;
  typingInChannelId?: string;
  updatedAt: string;
}

// ============================================================================
// Notification Preferences
// ============================================================================

export interface ChatNotificationPreferences {
  id: string;
  userId: string;
  
  // Global settings
  enablePushNotifications: boolean;
  enableSound: boolean;
  enablePreview: boolean;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string; // HH:mm
  
  // Per-channel overrides
  channelOverrides: ChannelNotificationOverride[];
  
  createdAt: string;
  updatedAt: string;
}

export interface ChannelNotificationOverride {
  channelId: string;
  muted: boolean;
  enablePush: boolean;
  enableSound: boolean;
}

// ============================================================================
// Unread Counts
// ============================================================================

export interface UnreadCount {
  id: string;
  userId: string;
  channelId: string;
  count: number;
  lastReadSequence: number;
  updatedAt: string;
}

// ============================================================================
// Chat Search
// ============================================================================

export interface ChatSearchResult {
  messageId: string;
  channelId: string;
  channelName: string;
  senderName: string;
  content: string;
  createdAt: string;
  highlight: string; // Highlighted snippet
}

// ============================================================================
// Real-time Events
// ============================================================================

export type ChatEventType = 
  | 'message_created'
  | 'message_updated'
  | 'message_deleted'
  | 'reaction_added'
  | 'reaction_removed'
  | 'user_joined'
  | 'user_left'
  | 'presence_updated'
  | 'typing_started'
  | 'typing_stopped';

export interface ChatEvent {
  id: string;
  type: ChatEventType;
  channelId: string;
  payload: any;
  timestamp: string;
  sequenceNumber: number;
}

// ============================================================================
// Offline Outbox
// ============================================================================

export interface ChatOutboxMessage {
  id: string;
  clientMessageId: string;
  channelId: string;
  senderId: string;
  content: string;
  attachmentIds: string[];
  replyToMessageId?: string;
  mentions: string[];
  
  // Sync status
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
  
  createdAt: string;
  syncedAt?: string;
}

// ============================================================================
// Audit Log
// ============================================================================

export interface ChatAuditLog {
  id: string;
  action: 'message_deleted' | 'member_added' | 'member_removed' | 'channel_created' | 'channel_updated';
  channelId?: string;
  messageId?: string;
  userId: string;
  targetUserId?: string;
  details: Record<string, any>;
  createdAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface ChatConfiguration {
  id: string;
  
  // Message limits
  maxMessageLength: number;
  maxAttachmentsPerMessage: number;
  maxAttachmentSizeMB: number;
  
  // Edit/Delete policies
  editWindowMinutes: number;
  allowDelete: boolean;
  deleteRetainsTombstone: boolean;
  
  // Presence
  enablePresence: boolean;
  enableTypingIndicators: boolean;
  
  // Search
  enableSearch: boolean;
  searchMaxResults: number;
  
  // Retention
  defaultRetentionDays: number;
  
  // Rate limiting
  messagesPerMinute: number;
  attachmentsPerMinute: number;
  
  createdAt: string;
  updatedAt: string;
}
