/**
 * Part 23 — Alert Action Center Service
 */

import { storage } from './storage';
import { AlertActionCenter, AlertActionRecord, AlertAction, AlertStatus, AlertMetrics } from './dashboardPart23Types';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { listAlerts } from './alerts';

const alertActionCenterStore = storage.getAdapter<AlertActionCenter>('alert_action_center');
const alertActionsStore = storage.getAdapter<AlertActionRecord>('alert_action_records');

// ============================================================================
// Alert Action Center Management
// ============================================================================

export async function createAlertActionCenter(
  alertId: string,
  alertData: {
    severity: 'info' | 'warning' | 'high' | 'critical';
    title: string;
    description: string;
    affectedRecordType?: string;
    affectedRecordId?: string;
    responsiblePerson: string;
    responsibleRole: string;
    dueAt?: string;
    recommendedAction: string;
  }
): Promise<AlertActionCenter> {
  // Check if already exists
  const existing = await getAlertActionCenterByAlertId(alertId);
  if (existing) {
    return existing;
  }

  const actionCenter: AlertActionCenter = {
    id: generateId(),
    alertId,
    severity: alertData.severity,
    title: alertData.title,
    description: alertData.description,
    affectedRecordType: alertData.affectedRecordType,
    affectedRecordId: alertData.affectedRecordId,
    responsiblePerson: alertData.responsiblePerson,
    responsibleRole: alertData.responsibleRole,
    createdAt: new Date().toISOString(),
    dueAt: alertData.dueAt,
    status: 'open',
    ageingHours: 0,
    recommendedAction: alertData.recommendedAction,
    actions: [],
    updatedAt: new Date().toISOString(),
  };

  await alertActionCenterStore.create(actionCenter);

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: actionCenter.id,
    action: 'create',
    before: null,
    after: actionCenter as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Alert action center created for alert ${alertId}`,
  });

  return actionCenter;
}

export async function getAlertActionCenter(id: string): Promise<AlertActionCenter | null> {
  return alertActionCenterStore.findById(id);
}

export async function getAlertActionCenterByAlertId(alertId: string): Promise<AlertActionCenter | null> {
  const all = await alertActionCenterStore.findAll();
  return all.find(a => a.alertId === alertId) || null;
}

export async function listAlertActionCenters(filters?: {
  status?: AlertStatus;
  severity?: string;
  responsiblePerson?: string;
  responsibleRole?: string;
  siteId?: string;
  plantId?: string;
}): Promise<AlertActionCenter[]> {
  let alerts = await alertActionCenterStore.findAll();

  if (filters?.status) {
    alerts = alerts.filter(a => a.status === filters.status);
  }
  if (filters?.severity) {
    alerts = alerts.filter(a => a.severity === filters.severity);
  }
  if (filters?.responsiblePerson) {
    alerts = alerts.filter(a => a.responsiblePerson === filters.responsiblePerson);
  }
  if (filters?.responsibleRole) {
    alerts = alerts.filter(a => a.responsibleRole === filters.responsibleRole);
  }

  // Update ageing for all alerts
  const now = new Date();
  for (const alert of alerts) {
    const createdAt = new Date(alert.createdAt);
    const ageingHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    alert.ageingHours = Math.round(ageingHours * 10) / 10;
  }

  return alerts.sort((a, b) => {
    // Sort by severity (critical first)
    const severityOrder = { critical: 0, high: 1, warning: 2, info: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    // Then by ageing (oldest first)
    return b.ageingHours - a.ageingHours;
  });
}

// ============================================================================
// Alert Actions
// ============================================================================

export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  if (alert.status !== 'open') {
    throw new Error(`Alert is not in open status (current: ${alert.status})`);
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'acknowledge',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Calculate time to acknowledge
  const createdAt = new Date(alert.createdAt);
  const acknowledgedAt = new Date();
  const timeToAcknowledge = (acknowledgedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    status: 'acknowledged',
    acknowledgedAt: acknowledgedAt.toISOString(),
    timeToAcknowledge: Math.round(timeToAcknowledge * 10) / 10,
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'acknowledge',
    before: { status: 'open' },
    after: { status: 'acknowledged' },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: 'Alert acknowledged',
  });

  return updated;
}

export async function assignAlert(
  alertId: string,
  assignedTo: string,
  userId: string,
  comment?: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  if (alert.status !== 'acknowledged' && alert.status !== 'open') {
    throw new Error(`Alert cannot be assigned from status ${alert.status}`);
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'assign',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    assignedTo,
    comment,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    status: 'assigned',
    responsiblePerson: assignedTo,
    assignedAt: new Date().toISOString(),
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'assign',
    before: { responsiblePerson: alert.responsiblePerson },
    after: { responsiblePerson: assignedTo, comment },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Alert assigned to ${assignedTo}`,
  });

  return updated;
}

export async function addComment(
  alertId: string,
  userId: string,
  comment: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'comment',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    comment,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'update',
    before: null,
    after: { comment },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: 'Comment added to alert',
  });

  return updated;
}

export async function escalateAlert(
  alertId: string,
  escalatedTo: string,
  userId: string,
  reason: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'escalate',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    assignedTo: escalatedTo,
    comment: reason,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    status: 'escalated',
    responsiblePerson: escalatedTo,
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'escalate',
    before: { responsiblePerson: alert.responsiblePerson, status: alert.status },
    after: { responsiblePerson: escalatedTo, status: 'escalated', reason },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Alert escalated to ${escalatedTo}: ${reason}`,
  });

  return updated;
}

export async function linkAlertToRecord(
  alertId: string,
  recordType: string,
  recordId: string,
  userId: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'link',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    linkedRecordType: recordType,
    linkedRecordId: recordId,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    affectedRecordType: recordType,
    affectedRecordId: recordId,
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'update',
    before: { affectedRecordType: alert.affectedRecordType, affectedRecordId: alert.affectedRecordId },
    after: { affectedRecordType: recordType, affectedRecordId: recordId },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Alert linked to ${recordType} ${recordId}`,
  });

  return updated;
}

export async function resolveAlert(
  alertId: string,
  userId: string,
  resolutionNote: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  if (alert.status === 'closed') {
    throw new Error('Alert is already closed');
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'resolve',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    resolutionNote,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Calculate time to resolve
  const createdAt = new Date(alert.createdAt);
  const resolvedAt = new Date();
  const timeToResolve = (resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    status: 'resolved',
    resolvedAt: resolvedAt.toISOString(),
    timeToResolve: Math.round(timeToResolve * 10) / 10,
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'resolve',
    before: { status: alert.status },
    after: { status: 'resolved', resolutionNote },
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Alert resolved: ${resolutionNote}`,
  });

  return updated;
}

export async function closeAlert(
  alertId: string,
  userId: string,
  userRole: string,
  closureNote?: string
): Promise<AlertActionCenter> {
  const alert = await getAlertActionCenterByAlertId(alertId);
  if (!alert) {
    throw new Error(`Alert ${alertId} not found in action center`);
  }

  if (alert.status !== 'resolved') {
    throw new Error('Alert must be resolved before closing');
  }

  // Check if resolver is trying to close their own critical alert
  if (alert.severity === 'critical') {
    const resolveAction = alert.actions.find(a => a.action === 'resolve');
    if (resolveAction && resolveAction.performedBy === userId) {
      throw new Error('Cannot close your own critical alert - requires independent review');
    }
  }

  // Create action record
  const action: AlertActionRecord = {
    id: generateId(),
    alertId: alert.id,
    action: 'close',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    comment: closureNote,
    createdAt: new Date().toISOString(),
  };

  await alertActionsStore.create(action);

  // Update alert
  const updated = await alertActionCenterStore.update(alert.id, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    actions: [...alert.actions, action],
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AlertActionCenter',
    entityId: alert.id,
    action: 'close',
    before: { status: 'resolved' },
    after: { status: 'closed', closureNote },
    actorId: userId,
    actorRole: userRole as any,
    requestId: generateId(),
    reason: `Alert closed: ${closureNote || 'No note provided'}`,
  });

  return updated;
}

// ============================================================================
// Bulk Actions
// ============================================================================

export async function bulkAcknowledgeAlerts(
  alertIds: string[],
  userId: string
): Promise<{ acknowledged: number; failed: number }> {
  let acknowledged = 0;
  let failed = 0;

  for (const alertId of alertIds) {
    try {
      const alert = await getAlertActionCenterByAlertId(alertId);
      if (!alert) {
        failed++;
        continue;
      }

      // Only acknowledge low severity alerts in bulk
      if (alert.severity !== 'info' && alert.severity !== 'warning') {
        failed++;
        continue;
      }

      await acknowledgeAlert(alertId, userId);
      acknowledged++;
    } catch (error) {
      failed++;
    }
  }

  return { acknowledged, failed };
}

// ============================================================================
// Alert Metrics
// ============================================================================

export async function calculateAlertMetrics(
  period: string,
  startDate: string,
  endDate: string
): Promise<AlertMetrics> {
  const alerts = await listAlertActionCenters();
  const periodAlerts = alerts.filter(a => 
    a.createdAt >= startDate && a.createdAt <= endDate
  );

  // Count by severity
  const openBySeverity = {
    info: periodAlerts.filter(a => a.severity === 'info' && a.status !== 'closed').length,
    warning: periodAlerts.filter(a => a.severity === 'warning' && a.status !== 'closed').length,
    high: periodAlerts.filter(a => a.severity === 'high' && a.status !== 'closed').length,
    critical: periodAlerts.filter(a => a.severity === 'critical' && a.status !== 'closed').length,
  };

  // Calculate mean time to acknowledge
  const acknowledgedAlerts = periodAlerts.filter(a => a.timeToAcknowledge !== undefined);
  const meanTimeToAcknowledge = acknowledgedAlerts.length > 0
    ? acknowledgedAlerts.reduce((sum, a) => sum + (a.timeToAcknowledge || 0), 0) / acknowledgedAlerts.length
    : 0;

  // Calculate mean time to resolve
  const resolvedAlerts = periodAlerts.filter(a => a.timeToResolve !== undefined);
  const meanTimeToResolve = resolvedAlerts.length > 0
    ? resolvedAlerts.reduce((sum, a) => sum + (a.timeToResolve || 0), 0) / resolvedAlerts.length
    : 0;

  // Calculate overdue percentage
  const now = new Date();
  const overdueAlerts = periodAlerts.filter(a => 
    a.dueAt && new Date(a.dueAt) < now && a.status !== 'closed' && a.status !== 'resolved'
  );
  const overduePercent = periodAlerts.length > 0
    ? (overdueAlerts.length / periodAlerts.length) * 100
    : 0;

  // Count resolved within SLA (assume 24 hours for critical, 48 for high, 72 for others)
  const resolvedWithinSLA = resolvedAlerts.filter(a => {
    const slaHours = a.severity === 'critical' ? 24 : a.severity === 'high' ? 48 : 72;
    return (a.timeToResolve || 0) <= slaHours;
  }).length;

  // Count repeat alerts by asset
  const repeatAlertsByAsset: Record<string, number> = {};
  for (const alert of periodAlerts) {
    if (alert.affectedRecordId) {
      repeatAlertsByAsset[alert.affectedRecordId] = (repeatAlertsByAsset[alert.affectedRecordId] || 0) + 1;
    }
  }

  // Filter to only repeats (count > 1)
  const repeatAlerts = Object.fromEntries(
    Object.entries(repeatAlertsByAsset).filter(([_, count]) => count > 1)
  );

  const metrics: AlertMetrics = {
    period,
    openBySeverity,
    meanTimeToAcknowledge: Math.round(meanTimeToAcknowledge * 10) / 10,
    meanTimeToResolve: Math.round(meanTimeToResolve * 10) / 10,
    overduePercent: Math.round(overduePercent * 10) / 10,
    resolvedWithinSLA,
    totalResolved: resolvedAlerts.length,
    repeatAlertsByAsset: repeatAlerts,
    createdAt: new Date().toISOString(),
  };

  return metrics;
}

export async function getAlertMetrics(id: string): Promise<AlertMetrics | null> {
  const all = await alertActionCenterStore.findAll();
  // This is a simplified implementation - would need separate metrics storage
  return null;
}

// ============================================================================
// Alert Views
// ============================================================================

export async function getMyAlerts(userId: string): Promise<AlertActionCenter[]> {
  return listAlertActionCenters({ responsiblePerson: userId });
}

export async function getTeamAlerts(teamId: string): Promise<AlertActionCenter[]> {
  // This would need team membership lookup
  // For now, return all alerts
  return listAlertActionCenters();
}

export async function getAlertsBySite(siteId: string): Promise<AlertActionCenter[]> {
  // This would need site-based filtering
  // For now, return all alerts
  return listAlertActionCenters();
}

export async function getAlertsByPlant(plantId: string): Promise<AlertActionCenter[]> {
  // This would need plant-based filtering
  // For now, return all alerts
  return listAlertActionCenters();
}

export async function getAlertsBySeverity(severity: string): Promise<AlertActionCenter[]> {
  return listAlertActionCenters({ severity });
}

export async function getOverdueAlerts(): Promise<AlertActionCenter[]> {
  const now = new Date();
  const alerts = await listAlertActionCenters();
  return alerts.filter(a => 
    a.dueAt && new Date(a.dueAt) < now && a.status !== 'closed' && a.status !== 'resolved'
  );
}
