/**
 * 2.6 Alert & Notification Service
 *
 * Alert entity with rule registry, delivery channels, user preferences,
 * quiet hours, and de-duplication.
 */

import { storage } from './storage';
import {
  Alert, AlertRule, AlertSeverity, AlertStatus,
  Notification, NotificationChannel, UserNotificationPreferences,
  UserRole
} from './types';
import { generateId } from './utils';
import { recordAudit } from './audit';

const alertsStore = storage.getAdapter<Alert>('alerts');
const alertRulesStore = storage.getAdapter<AlertRule>('alert_rules');
const notificationsStore = storage.getAdapter<Notification>('notifications');
const userPrefsStore = storage.getAdapter<UserNotificationPreferences>('user_notification_prefs');

// De-duplication window (same alert code + entity won't fire again within this window)
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Alert Rules
// ============================================================================

/**
 * Register an alert rule.
 */
export async function registerAlertRule(params: {
  code: string;
  name: string;
  description: string;
  module: string;
  severity: AlertSeverity;
  condition: string;
  threshold?: number;
  recipientRoles: UserRole[];
  recipientUsers?: string[];
  escalationHours?: number;
}): Promise<AlertRule> {
  // Check for duplicate code
  const existing = await alertRulesStore.findOne({ code: params.code } as Partial<AlertRule>);
  if (existing) {
    throw new Error(`Alert rule with code '${params.code}' already exists`);
  }

  const rule: AlertRule = {
    id: generateId(),
    ...params,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  return alertRulesStore.create(rule);
}

/**
 * Get an alert rule by code.
 */
export async function getAlertRule(code: string): Promise<AlertRule | null> {
  return alertRulesStore.findOne({ code } as Partial<AlertRule>);
}

/**
 * List all alert rules.
 */
export async function listAlertRules(module?: string): Promise<AlertRule[]> {
  const all = await alertRulesStore.findAll();
  if (module) return all.filter(r => r.module === module);
  return all;
}

/**
 * Deactivate an alert rule.
 */
export async function deactivateAlertRule(ruleId: string): Promise<void> {
  await alertRulesStore.update(ruleId, { isActive: false });
}

// ============================================================================
// Alerts
// ============================================================================

/**
 * Raise an alert (with de-duplication).
 */
export async function raiseAlert(params: {
  ruleCode?: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  module: string;
  entityType?: string;
  entityId?: string;
  responsibleUserId?: string;
  responsibleRole?: UserRole;
  recommendedAction?: string;
  dueInHours?: number;
  requestId: string;
}): Promise<Alert | null> {
  // De-duplication check
  const dedupKey = `${params.ruleCode || params.title}:${params.entityType || ''}:${params.entityId || ''}`;
  const recentAlerts = await alertsStore.findAll();
  const recentDuplicate = recentAlerts.find(a =>
    a.deduplicationKey === dedupKey &&
    a.status !== 'resolved' &&
    a.status !== 'closed' &&
    (new Date().getTime() - new Date(a.createdAt).getTime()) < DEDUP_WINDOW_MS
  );

  if (recentDuplicate) {
    // De-duplicated — don't create a new alert
    return null;
  }

  const dueAt = params.dueInHours
    ? new Date(Date.now() + params.dueInHours * 60 * 60 * 1000).toISOString()
    : undefined;

  const alert: Alert = {
    id: generateId(),
    code: params.ruleCode || `MANUAL_${Date.now()}`,
    ruleId: params.ruleCode ? (await alertRulesStore.findOne({ code: params.ruleCode } as Partial<AlertRule>))?.id : undefined,
    severity: params.severity,
    title: params.title,
    description: params.description,
    module: params.module,
    entityType: params.entityType,
    entityId: params.entityId,
    responsibleUserId: params.responsibleUserId,
    responsibleRole: params.responsibleRole,
    status: 'open',
    createdAt: new Date().toISOString(),
    dueAt,
    recommendedAction: params.recommendedAction,
    deduplicationKey: dedupKey,
  };

  await alertsStore.create(alert);

  // Record in audit
  await recordAudit({
    entityType: 'Alert',
    entityId: alert.id,
    action: 'create',
    before: null,
    after: { title: alert.title, severity: alert.severity, module: alert.module },
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: params.requestId,
  });

  // Send notifications
  await sendAlertNotifications(alert);

  return alert;
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string,
  userRole: UserRole,
  requestId: string
): Promise<Alert> {
  const alert = await alertsStore.findById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);
  if (alert.status !== 'open') throw new Error(`Alert is not in 'open' status (current: ${alert.status})`);

  const updated = await alertsStore.update(alertId, {
    status: 'acknowledged',
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: userId,
  });

  await recordAudit({
    entityType: 'Alert',
    entityId: alertId,
    action: 'acknowledge',
    before: { status: 'open' },
    after: { status: 'acknowledged' },
    actorId: userId,
    actorRole: userRole,
    requestId,
  });

  return updated;
}

/**
 * Assign an alert to a user.
 */
export async function assignAlert(
  alertId: string,
  assigneeId: string,
  userId: string,
  userRole: UserRole,
  requestId: string
): Promise<Alert> {
  const alert = await alertsStore.findById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const updated = await alertsStore.update(alertId, {
    status: 'assigned',
    responsibleUserId: assigneeId,
  });

  await recordAudit({
    entityType: 'Alert',
    entityId: alertId,
    action: 'assign',
    before: { responsibleUserId: alert.responsibleUserId },
    after: { responsibleUserId: assigneeId },
    actorId: userId,
    actorRole: userRole,
    requestId,
  });

  return updated;
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(
  alertId: string,
  userId: string,
  userRole: UserRole,
  resolutionNote: string,
  requestId: string
): Promise<Alert> {
  const alert = await alertsStore.findById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  const updated = await alertsStore.update(alertId, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: userId,
    resolutionNote,
  });

  await recordAudit({
    entityType: 'Alert',
    entityId: alertId,
    action: 'resolve',
    before: { status: alert.status },
    after: { status: 'resolved', resolutionNote },
    actorId: userId,
    actorRole: userRole,
    requestId,
  });

  return updated;
}

/**
 * Close an alert.
 */
export async function closeAlert(
  alertId: string,
  userId: string,
  userRole: UserRole,
  requestId: string
): Promise<Alert> {
  const alert = await alertsStore.findById(alertId);
  if (!alert) throw new Error(`Alert ${alertId} not found`);

  return alertsStore.update(alertId, { status: 'closed' });
}

/**
 * List alerts with filters.
 */
export async function listAlerts(filters?: {
  severity?: AlertSeverity;
  status?: AlertStatus;
  module?: string;
  responsibleUserId?: string;
}): Promise<Alert[]> {
  let results = await alertsStore.findAll();

  if (filters?.severity) results = results.filter(a => a.severity === filters.severity);
  if (filters?.status) results = results.filter(a => a.status === filters.status);
  if (filters?.module) results = results.filter(a => a.module === filters.module);
  if (filters?.responsibleUserId) results = results.filter(a => a.responsibleUserId === filters.responsibleUserId);

  return results.sort((a, b) => {
    const severityOrder: Record<AlertSeverity, number> = { critical: 0, high: 1, warning: 2, info: 3 };
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Send notifications for an alert based on user preferences.
 */
async function sendAlertNotifications(alert: Alert): Promise<void> {
  // Determine recipients
  const recipientIds: string[] = [];

  if (alert.responsibleUserId) {
    recipientIds.push(alert.responsibleUserId);
  }

  // In production, would also look up users with the responsible role

  for (const userId of recipientIds) {
    const prefs = await getUserPreferences(userId);
    const channels = prefs?.channels || ['in_app'];

    // Check quiet hours
    if (isInQuietHours(prefs)) {
      // Queue for later or send only critical
      if (alert.severity !== 'critical') continue;
    }

    // Check minimum severity
    const severityOrder: Record<AlertSeverity, number> = { info: 0, warning: 1, high: 2, critical: 3 };
    if (prefs && severityOrder[alert.severity] < severityOrder[prefs.severityMinimum]) {
      continue;
    }

    for (const channel of channels) {
      const notification: Notification = {
        id: generateId(),
        userId,
        alertId: alert.id,
        channel,
        title: alert.title,
        body: alert.description,
        sentAt: new Date().toISOString(),
        delivered: true, // In production, would track actual delivery
      };

      await notificationsStore.create(notification);
    }
  }
}

/**
 * Get user notification preferences.
 */
export async function getUserPreferences(userId: string): Promise<UserNotificationPreferences | null> {
  return userPrefsStore.findOne({ userId } as Partial<UserNotificationPreferences>);
}

/**
 * Set user notification preferences.
 */
export async function setUserPreferences(prefs: Omit<UserNotificationPreferences, 'id'>): Promise<UserNotificationPreferences> {
  const existing = await userPrefsStore.findOne({ userId: prefs.userId } as Partial<UserNotificationPreferences>);
  if (existing) {
    return userPrefsStore.update(existing.id, { ...existing, ...prefs });
  }
  return userPrefsStore.create({ ...prefs, id: generateId() });
}

/**
 * Check if current time is within user's quiet hours.
 */
function isInQuietHours(prefs: UserNotificationPreferences | null): boolean {
  if (!prefs?.quietHoursStart || !prefs?.quietHoursEnd) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  if (prefs.quietHoursStart <= prefs.quietHoursEnd) {
    return currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd;
  }
  // Overnight quiet hours (e.g., 22:00 to 06:00)
  return currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd;
}

/**
 * Get notifications for a user.
 */
export async function getUserNotifications(
  userId: string,
  unreadOnly = false
): Promise<Notification[]> {
  const all = await notificationsStore.findAll();
  let results = all.filter(n => n.userId === userId);
  if (unreadOnly) results = results.filter(n => !n.readAt);
  return results.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string): Promise<void> {
  await notificationsStore.update(notificationId, { readAt: new Date().toISOString() });
}

/**
 * Initialize default alert rules.
 */
export async function initializeDefaultAlertRules(): Promise<void> {
  const existing = await alertRulesStore.findAll();
  if (existing.length > 0) return;

  await registerAlertRule({
    code: 'FUEL_VARIANCE_CRITICAL',
    name: 'Fuel Variance Exceeds Critical Threshold',
    description: 'Equipment fuel consumption variance exceeds 10% of expected',
    module: 'Fuel Management',
    severity: 'critical',
    condition: 'variance_percent > 10',
    threshold: 10,
    recipientRoles: ['site_manager', 'fuel_officer'],
    escalationHours: 4,
  });

  await registerAlertRule({
    code: 'FUEL_VARIANCE_HIGH',
    name: 'Fuel Variance Exceeds Warning Threshold',
    description: 'Equipment fuel consumption variance exceeds 5% of expected',
    module: 'Fuel Management',
    severity: 'high',
    condition: 'variance_percent > 5',
    threshold: 5,
    recipientRoles: ['fuel_officer'],
    escalationHours: 8,
  });

  await registerAlertRule({
    code: 'MAINTENANCE_OVERDUE',
    name: 'Equipment Maintenance Overdue',
    description: 'Equipment maintenance is past its scheduled date',
    module: 'Fleet Management',
    severity: 'high',
    condition: 'next_maintenance < today',
    recipientRoles: ['maintenance_manager', 'site_manager'],
    escalationHours: 24,
  });

  await registerAlertRule({
    code: 'APPROVAL_PENDING_24H',
    name: 'Approval Pending Over 24 Hours',
    description: 'A record has been waiting for approval for over 24 hours',
    module: 'Workflow',
    severity: 'warning',
    condition: 'pending_hours > 24',
    threshold: 24,
    recipientRoles: ['site_manager', 'project_manager'],
    escalationHours: 48,
  });

  await registerAlertRule({
    code: 'RMC_DELIVERY_DELAYED',
    name: 'RMC Delivery Delayed',
    description: 'Transit mixer has exceeded expected delivery time',
    module: 'RMC Operations',
    severity: 'high',
    condition: 'delivery_time > expected + 30min',
    recipientRoles: ['plant_manager', 'site_engineer'],
    escalationHours: 1,
  });
}
