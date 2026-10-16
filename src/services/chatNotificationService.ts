/**
 * Part 20 — Chat Notification Service
 */

import { storage } from './storage';
import { ChatAlertNotification, AlertNotificationTemplate, ChatAction } from './erpChatTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { sendMessage } from './chatService';
import { getChannel, createChannel } from './chatService';

const chatNotificationsStore = storage.getAdapter<ChatAlertNotification>('chat_alert_notifications');

// ============================================================================
// Notification Templates
// ============================================================================

const notificationTemplates: Record<AlertNotificationTemplate, {
  subject: string;
  body: string;
  actions: ChatAction[];
}> = {
  equipment_reading_submitted: {
    subject: 'Equipment Reading Submitted',
    body: 'Equipment reading for {assetCode} has been submitted and is awaiting supervisor approval.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/submissions/{submissionId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'approve',
        label: 'Approve',
        action: 'approve',
        apiEndpoint: '/api/submissions/{submissionId}/approve',
        apiPayload: {},
        requiresPermission: 'approve',
      },
    ],
  },
  meter_photograph_missing: {
    subject: 'Meter Photograph Missing',
    body: 'Required meter photograph is missing for {assetCode} submission.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/submissions/{submissionId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
    ],
  },
  fuel_verification_critical: {
    subject: 'Critical Fuel Variance',
    body: 'Daily fuel verification for {assetCode}: consumed {actual} L/hr against benchmark {benchmark} L/hr ({variance}% variance) — outside critical tolerance. Review required.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/fuel-verifications/{verificationId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        action: 'acknowledge',
        apiEndpoint: '/api/fuel-verifications/{verificationId}/acknowledge',
        apiPayload: {},
        requiresPermission: 'acknowledge',
      },
    ],
  },
  fuel_verification_sheet_unsigned: {
    subject: 'Fuel Verification Sheet Unsigned',
    body: 'Daily fuel verification sheet for {siteName} has not been signed off by the deadline.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/fuel-verification-sheets/{sheetId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'sign',
        label: 'Sign Off',
        action: 'approve',
        apiEndpoint: '/api/fuel-verification-sheets/{sheetId}/sign',
        apiPayload: {},
        requiresPermission: 'approve',
      },
    ],
  },
  calibration_overdue: {
    subject: 'Calibration Overdue',
    body: 'Calibration of {instrumentName} is overdue. Readings marked as unverified.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/calibrations/{calibrationId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'schedule',
        label: 'Schedule Calibration',
        action: 'open',
        apiEndpoint: '/api/calibrations/schedule',
        apiPayload: { instrumentId: '{instrumentId}' },
        requiresPermission: 'create',
      },
    ],
  },
  batch_quality_clearance: {
    subject: 'Batch Requires Quality Clearance',
    body: 'RMC production batch {batchNumber} requires quality clearance before dispatch.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/batches/{batchId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'clear',
        label: 'Clear Quality',
        action: 'approve',
        apiEndpoint: '/api/batches/{batchId}/clear-quality',
        apiPayload: {},
        requiresPermission: 'approve',
      },
    ],
  },
  transit_mixer_delayed: {
    subject: 'Transit Mixer Delivery Delayed',
    body: 'Transit mixer {mixerNumber} delivery to {siteName} is delayed. Expected arrival: {expectedTime}.',
    actions: [
      {
        id: 'track',
        label: 'Track',
        action: 'open',
        apiEndpoint: '/api/dispatches/{dispatchId}/track',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'contact',
        label: 'Contact Driver',
        action: 'open',
        apiEndpoint: '/api/drivers/{driverId}/contact',
        apiPayload: {},
        requiresPermission: 'view',
      },
    ],
  },
  pm_overdue: {
    subject: 'Preventive Maintenance Overdue',
    body: 'Preventive maintenance for {assetCode} is overdue by {daysOverdue} days.',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '/api/maintenance/{workOrderId}',
        apiPayload: {},
        requiresPermission: 'view',
      },
      {
        id: 'schedule',
        label: 'Schedule Now',
        action: 'open',
        apiEndpoint: '/api/maintenance/schedule',
        apiPayload: { assetId: '{assetId}' },
        requiresPermission: 'create',
      },
    ],
  },
  generic: {
    subject: '{title}',
    body: '{message}',
    actions: [
      {
        id: 'open',
        label: 'Open',
        action: 'open',
        apiEndpoint: '{url}',
        apiPayload: {},
        requiresPermission: 'view',
      },
    ],
  },
};

// ============================================================================
// Send Chat Notification
// ============================================================================

export async function sendChatAlertNotification(
  alertId: string,
  template: AlertNotificationTemplate,
  templateVariables: Record<string, string>,
  channelId: string,
  responsibleUserId?: string,
  userId: string = 'system'
): Promise<ChatAlertNotification> {
  const templateConfig = notificationTemplates[template];
  if (!templateConfig) {
    throw new Error(`Template ${template} not found`);
  }

  // Generate deduplication key
  const deduplicationKey = `${alertId}-${channelId}-${template}`;

  // Check if notification already sent (deduplication)
  const existing = await chatNotificationsStore.findAll();
  const duplicate = existing.find(n => n.deduplicationKey === deduplicationKey);
  if (duplicate) {
    return duplicate; // Already sent
  }

  // Render message content
  let messageContent = templateConfig.body;
  for (const [key, value] of Object.entries(templateVariables)) {
    messageContent = messageContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  // Replace action placeholders
  const actions = templateConfig.actions.map(action => ({
    ...action,
    apiEndpoint: action.apiEndpoint.replace(/\{(\w+)\}/g, (_, key) => templateVariables[key] || ''),
    apiPayload: Object.fromEntries(
      Object.entries(action.apiPayload).map(([k, v]) => [
        k,
        typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, key) => templateVariables[key] || '') : v,
      ])
    ),
  }));

  // Send to channel
  let channelMessageId: string | undefined;
  try {
    const channelMessage = await sendMessage(
      channelId,
      userId,
      `🔔 **${templateConfig.subject}**\n\n${messageContent}`,
      'text',
      [],
      undefined,
      [],
      generateId()
    );
    channelMessageId = channelMessage.id;
  } catch (error) {
    // Channel might not exist or user might not have access
    console.error('Failed to send channel message:', error);
  }

  // Send direct message to responsible person
  let dmSent = false;
  if (responsibleUserId) {
    try {
      // Create or get DM channel
      const dmChannelId = `dm-${userId}-${responsibleUserId}`;
      let dmChannel = await getChannel(dmChannelId);
      
      if (!dmChannel) {
        dmChannel = await createChannel({
          name: `DM: ${userId} ↔ ${responsibleUserId}`,
          type: 'direct',
          description: 'Direct message channel',
          autoJoin: false,
          autoLeave: false,
          retentionDays: 365,
          legalHold: false,
          isActive: true,
          createdBy: userId,
        } as any, userId);
      }

      await sendMessage(
        dmChannel.id,
        userId,
        `🔔 **${templateConfig.subject}**\n\n${messageContent}`,
        'text',
        [],
        undefined,
        [],
        generateId()
      );
      dmSent = true;
    } catch (error) {
      console.error('Failed to send DM:', error);
    }
  }

  // Create notification record
  const notification: ChatAlertNotification = {
    id: generateId(),
    alertId,
    channelId,
    messageId: channelMessageId,
    template,
    templateVariables,
    actions,
    sentToDM: dmSent,
    sentToChannel: !!channelMessageId,
    sentAt: new Date().toISOString(),
    deduplicationKey,
    createdAt: new Date().toISOString(),
  };

  await chatNotificationsStore.create(notification);

  await recordAudit({
    entityType: 'ChatAlertNotification',
    entityId: notification.id,
    action: 'create',
    before: null,
    after: notification as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Chat notification sent for alert ${alertId}`,
  });

  return notification;
}

// ============================================================================
// Execute Chat Action
// ============================================================================

export async function executeChatAction(
  notificationId: string,
  actionId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  const notification = await chatNotificationsStore.findById(notificationId);
  if (!notification) {
    return { success: false, message: 'Notification not found' };
  }

  const action = notification.actions.find(a => a.id === actionId);
  if (!action) {
    return { success: false, message: 'Action not found' };
  }

  // In a real implementation, this would call the actual API endpoint
  // For now, we'll just log the action
  console.log(`Executing action: ${action.action} on ${action.apiEndpoint}`, action.apiPayload);

  // If action is acknowledge, update the alert
  if (action.action === 'acknowledge') {
    // This would call the alert service to acknowledge the alert
    console.log(`Acknowledging alert ${notification.alertId}`);
  }

  await recordAudit({
    entityType: 'ChatAlertNotification',
    entityId: notificationId,
    action: 'update',
    before: { action: null },
    after: { action: actionId, executedBy: userId },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Action ${actionId} executed`,
  });

  return { success: true, message: 'Action executed successfully' };
}

// ============================================================================
// Notification Statistics
// ============================================================================

export async function getChatNotificationStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  template?: AlertNotificationTemplate;
}): Promise<{
  totalNotifications: number;
  sentToChannel: number;
  sentToDM: number;
  byTemplate: Record<AlertNotificationTemplate, number>;
}> {
  let notifications = await chatNotificationsStore.findAll();

  if (filters?.fromDate) {
    notifications = notifications.filter(n => n.sentAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    notifications = notifications.filter(n => n.sentAt <= filters.toDate!);
  }
  if (filters?.template) {
    notifications = notifications.filter(n => n.template === filters.template);
  }

  const byTemplate: Record<AlertNotificationTemplate, number> = {
    equipment_reading_submitted: 0,
    meter_photograph_missing: 0,
    fuel_verification_critical: 0,
    fuel_verification_sheet_unsigned: 0,
    calibration_overdue: 0,
    batch_quality_clearance: 0,
    transit_mixer_delayed: 0,
    pm_overdue: 0,
    generic: 0,
  };

  for (const notification of notifications) {
    byTemplate[notification.template]++;
  }

  return {
    totalNotifications: notifications.length,
    sentToChannel: notifications.filter(n => n.sentToChannel).length,
    sentToDM: notifications.filter(n => n.sentToDM).length,
    byTemplate,
  };
}

export async function getNotificationsByAlert(alertId: string): Promise<ChatAlertNotification[]> {
  const all = await chatNotificationsStore.findAll();
  return all.filter(n => n.alertId === alertId);
}

export async function getNotificationsByChannel(channelId: string): Promise<ChatAlertNotification[]> {
  const all = await chatNotificationsStore.findAll();
  return all.filter(n => n.channelId === channelId);
}
