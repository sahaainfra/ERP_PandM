/**
 * Part 20 — ERP Chat Integration Types
 */

// ============================================================================
// Record-Linked Conversations
// ============================================================================

export type LinkedRecordType = 
  | 'logbook'
  | 'approval'
  | 'operator_submission'
  | 'fuel_verification'
  | 'fuel_investigation'
  | 'work_order'
  | 'batch'
  | 'qc_test'
  | 'ncr'
  | 'dispatch'
  | 'delivery'
  | 'purchase_order'
  | 'inventory_issue'
  | 'payment'
  | 'project';

export interface RecordLink {
  id: string;
  channelId: string;
  recordType: LinkedRecordType;
  recordId: string;
  recordNumber?: string;
  
  // Cached record data (for quick display)
  recordTitle?: string;
  recordStatus?: string;
  recordKeyValues?: Record<string, any>;
  
  // Permission cache
  lastPermissionCheck: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Deep Links
// ============================================================================

export interface DeepLink {
  protocol: 'erp';
  recordType: LinkedRecordType;
  recordId: string;
  action?: 'view' | 'edit' | 'approve' | 'discuss';
}

export interface DeepLinkResolution {
  link: DeepLink;
  resolved: boolean;
  record?: any;
  permissionGranted: boolean;
  errorMessage?: string;
}

// ============================================================================
// Chat Notifications from Alerts
// ============================================================================

export type AlertNotificationTemplate = 
  | 'equipment_reading_submitted'
  | 'meter_photograph_missing'
  | 'fuel_verification_critical'
  | 'fuel_verification_sheet_unsigned'
  | 'calibration_overdue'
  | 'batch_quality_clearance'
  | 'transit_mixer_delayed'
  | 'pm_overdue'
  | 'generic';

export interface ChatAlertNotification {
  id: string;
  alertId: string;
  channelId: string;
  messageId?: string;
  
  // Template
  template: AlertNotificationTemplate;
  templateVariables: Record<string, string>;
  
  // Actionable buttons
  actions: ChatAction[];
  
  // Delivery
  sentToDM: boolean; // Direct message to responsible person
  sentToChannel: boolean; // Posted to channel
  sentAt: string;
  
  // Deduplication
  deduplicationKey: string;
  
  createdAt: string;
}

export interface ChatAction {
  id: string;
  label: string;
  action: 'open' | 'acknowledge' | 'assign' | 'approve' | 'reject';
  apiEndpoint: string;
  apiPayload: Record<string, any>;
  requiresPermission: string;
}

// ============================================================================
// Chat UI State
// ============================================================================

export interface ChatWindowState {
  isOpen: boolean;
  isMinimized: boolean;
  isDocked: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  activeChannelId?: string;
}

export interface ChatDraft {
  channelId: string;
  content: string;
  attachmentIds: string[];
  updatedAt: string;
}

// ============================================================================
// Conversation Thread
// ============================================================================

export interface ConversationThread {
  id: string;
  channelId: string;
  recordLink: RecordLink;
  
  // Thread metadata
  title: string;
  description?: string;
  
  // Participants
  participantIds: string[];
  
  // Status
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  
  // Message count
  messageCount: number;
  lastMessageAt?: string;
  
  createdAt: string;
  updatedAt: string;
}
