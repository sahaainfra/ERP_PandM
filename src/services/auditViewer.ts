/**
 * Part 24 — Audit Viewer Service
 */

import { storage } from './storage';
import { AuditTrailEntry, AuditTrailQuery } from './reportTypes';
import { getAuditHistory, searchAudit } from './audit';

// ============================================================================
// Audit Trail Query
// ============================================================================

export async function queryAuditTrail(query: AuditTrailQuery): Promise<{
  entries: AuditTrailEntry[];
  total: number;
}> {
  // Use the existing audit service to search
  const auditEntries = await searchAudit({
    entityType: query.entityType,
    entityId: query.entityId,
    actorId: query.actorId,
    action: query.action as any,
    fromDate: query.fromDate,
    toDate: query.toDate,
  });

  // Apply pagination
  const offset = query.offset || 0;
  const limit = query.limit || 100;
  const paginatedEntries = auditEntries.slice(offset, offset + limit);

  // Transform to AuditTrailEntry format
  const entries: AuditTrailEntry[] = paginatedEntries.map(entry => ({
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityNumber: undefined, // Would need to fetch from entity
    action: entry.action,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    beforeValues: entry.before,
    afterValues: entry.after,
    changedFields: entry.before && entry.after 
      ? Object.keys(entry.before).filter(key => 
          JSON.stringify(entry.before![key]) !== JSON.stringify(entry.after![key])
        )
      : [],
    reason: entry.reason,
    requestId: entry.requestId,
    timestamp: entry.timestamp,
  }));

  return {
    entries,
    total: auditEntries.length,
  };
}

export async function getEntityAuditTrail(
  entityType: string,
  entityId: string
): Promise<AuditTrailEntry[]> {
  const auditEntries = await getAuditHistory(entityType, entityId);

  return auditEntries.map(entry => ({
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    entityNumber: undefined,
    action: entry.action,
    actorId: entry.actorId,
    actorRole: entry.actorRole,
    beforeValues: entry.before,
    afterValues: entry.after,
    changedFields: entry.before && entry.after 
      ? Object.keys(entry.before).filter(key => 
          JSON.stringify(entry.before![key]) !== JSON.stringify(entry.after![key])
        )
      : [],
    reason: entry.reason,
    requestId: entry.requestId,
    timestamp: entry.timestamp,
  }));
}

// ============================================================================
// Amendment Report
// ============================================================================

export async function getAmendmentReport(
  entityType: string,
  fromDate: string,
  toDate: string
): Promise<{
  amendments: Array<{
    entityType: string;
    entityId: string;
    revisionNumber: number;
    originalValues: Record<string, any>;
    amendedValues: Record<string, any>;
    reason: string;
    authorId: string;
    approverId?: string;
    approvedAt?: string;
    createdAt: string;
  }>;
  total: number;
}> {
  // Query audit trail for 'amend' actions
  const auditEntries = await searchAudit({
    action: 'amend',
    fromDate,
    toDate,
  });

  const amendments = auditEntries
    .filter(entry => entry.entityType === entityType)
    .map(entry => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      revisionNumber: 1, // Would need to fetch from revision service
      originalValues: entry.before || {},
      amendedValues: entry.after || {},
      reason: entry.reason || '',
      authorId: entry.actorId,
      approverId: undefined, // Would need to fetch from revision service
      approvedAt: undefined,
      createdAt: entry.timestamp,
    }));

  return {
    amendments,
    total: amendments.length,
  };
}

// ============================================================================
// Audit Statistics
// ============================================================================

export async function getAuditStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
  entityType?: string;
}): Promise<{
  totalEntries: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  byActor: Record<string, number>;
  mostActiveEntities: Array<{ entityType: string; entityId: string; count: number }>;
}> {
  let auditEntries = await searchAudit({
    fromDate: filters?.fromDate,
    toDate: filters?.toDate,
    entityType: filters?.entityType,
  });

  // Count by action
  const byAction: Record<string, number> = {};
  for (const entry of auditEntries) {
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;
  }

  // Count by entity type
  const byEntityType: Record<string, number> = {};
  for (const entry of auditEntries) {
    byEntityType[entry.entityType] = (byEntityType[entry.entityType] || 0) + 1;
  }

  // Count by actor
  const byActor: Record<string, number> = {};
  for (const entry of auditEntries) {
    byActor[entry.actorId] = (byActor[entry.actorId] || 0) + 1;
  }

  // Find most active entities
  const entityCounts = new Map<string, number>();
  for (const entry of auditEntries) {
    const key = `${entry.entityType}:${entry.entityId}`;
    entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
  }

  const mostActiveEntities = Array.from(entityCounts.entries())
    .map(([key, count]) => {
      const [entityType, entityId] = key.split(':');
      return { entityType, entityId, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEntries: auditEntries.length,
    byAction,
    byEntityType,
    byActor,
    mostActiveEntities,
  };
}

// ============================================================================
// Audit Export
// ============================================================================

export async function exportAuditTrail(
  query: AuditTrailQuery,
  format: 'csv' | 'json'
): Promise<string> {
  const { entries } = await queryAuditTrail(query);

  if (format === 'json') {
    return JSON.stringify(entries, null, 2);
  }

  // CSV format
  if (entries.length === 0) return '';

  const headers = [
    'Timestamp',
    'Entity Type',
    'Entity ID',
    'Action',
    'Actor ID',
    'Actor Role',
    'Reason',
    'Changed Fields',
  ];

  const csvRows = entries.map(entry => {
    return [
      entry.timestamp,
      entry.entityType,
      entry.entityId,
      entry.action,
      entry.actorId,
      entry.actorRole,
      entry.reason || '',
      entry.changedFields.join('; '),
    ].map(value => {
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  });

  return headers.join(',') + '\n' + csvRows.join('\n');
}
