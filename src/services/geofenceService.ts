/**
 * Part 26 — Geofence Service
 * 
 * Manages geofences (circle and polygon) for location-based validation.
 * Provides point-in-geofence checking with buffer zone support.
 */

import { storage } from './storage';
import { 
  Geofence, 
  GeofenceType, 
  GeofenceStatus,
  GeofenceCheckRequest,
  GeofenceCheckResult,
  GeofenceVersion,
  GeofencePresenceLog
} from './geofenceTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { hasPermission } from './permissions';

const geofencesStore = storage.getAdapter<Geofence>('geofences');
const geofenceVersionsStore = storage.getAdapter<GeofenceVersion>('geofence_versions');
const presenceLogsStore = storage.getAdapter<GeofencePresenceLog>('geofence_presence_logs');

// ============================================================================
// Geofence CRUD
// ============================================================================

export async function createGeofence(
  data: Omit<Geofence, 'id' | 'version' | 'status' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<Geofence> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'create',
    resource: 'geofence',
  });

  // Validate geometry
  if (data.type === 'circle') {
    if (!data.center || !data.radius) {
      throw new Error('Circle geofence requires center and radius');
    }
    if (data.radius <= 0) {
      throw new Error('Radius must be positive');
    }
  } else if (data.type === 'polygon') {
    if (!data.polygon || data.polygon.length < 3) {
      throw new Error('Polygon geofence requires at least 3 vertices');
    }
  }

  const geofence: Geofence = {
    ...data,
    id: generateId(),
    version: 1,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await geofencesStore.create(geofence);

  // Create initial version
  await createGeofenceVersion(geofence, userId, 'Initial creation');

  await recordAudit({
    entityType: 'Geofence',
    entityId: geofence.id,
    action: 'create',
    before: null,
    after: geofence as any,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Geofence created',
  });

  return geofence;
}

export async function getGeofence(id: string): Promise<Geofence | null> {
  return geofencesStore.findById(id);
}

export async function listGeofences(filters?: {
  type?: GeofenceType;
  status?: GeofenceStatus;
  linkedEntityType?: string;
  linkedEntityId?: string;
  effectiveOn?: string;
}): Promise<Geofence[]> {
  let geofences = await geofencesStore.findAll();

  if (filters?.type) {
    geofences = geofences.filter(g => g.type === filters.type);
  }
  if (filters?.status) {
    geofences = geofences.filter(g => g.status === filters.status);
  }
  if (filters?.linkedEntityType) {
    geofences = geofences.filter(g => g.linkedEntityType === filters.linkedEntityType);
  }
  if (filters?.linkedEntityId) {
    geofences = geofences.filter(g => g.linkedEntityId === filters.linkedEntityId);
  }
  if (filters?.effectiveOn) {
    const checkDate = new Date(filters.effectiveOn);
    geofences = geofences.filter(g => {
      const effectiveFrom = new Date(g.effectiveFrom);
      const effectiveTo = g.effectiveTo ? new Date(g.effectiveTo) : null;
      return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
    });
  }

  return geofences;
}

export async function updateGeofence(
  id: string,
  updates: Partial<Geofence>,
  userId: string,
  changeReason: string
): Promise<Geofence> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'geofence',
  });

  const geofence = await geofencesStore.findById(id);
  if (!geofence) {
    throw new Error(`Geofence ${id} not found`);
  }

  // Validate geometry if changed
  if (updates.type || updates.center || updates.radius || updates.polygon) {
    const type = updates.type || geofence.type;
    if (type === 'circle') {
      const center = updates.center || geofence.center;
      const radius = updates.radius || geofence.radius;
      if (!center || !radius) {
        throw new Error('Circle geofence requires center and radius');
      }
    } else if (type === 'polygon') {
      const polygon = updates.polygon || geofence.polygon;
      if (!polygon || polygon.length < 3) {
        throw new Error('Polygon geofence requires at least 3 vertices');
      }
    }
  }

  const updated = await geofencesStore.update(id, {
    ...updates,
    version: geofence.version + 1,
    updatedAt: new Date().toISOString(),
  });

  // Create new version
  await createGeofenceVersion(updated, userId, changeReason);

  await recordAudit({
    entityType: 'Geofence',
    entityId: id,
    action: 'update',
    before: geofence as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: changeReason,
  });

  return updated;
}

export async function activateGeofence(id: string, userId: string): Promise<Geofence> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'approve',
    resource: 'geofence',
  });

  const geofence = await geofencesStore.findById(id);
  if (!geofence) {
    throw new Error(`Geofence ${id} not found`);
  }

  const updated = await geofencesStore.update(id, {
    status: 'active',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'Geofence',
    entityId: id,
    action: 'approve',
    before: { status: geofence.status },
    after: { status: 'active' },
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Geofence activated',
  });

  return updated;
}

export async function deactivateGeofence(id: string, userId: string): Promise<Geofence> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'geofence',
  });

  const geofence = await geofencesStore.findById(id);
  if (!geofence) {
    throw new Error(`Geofence ${id} not found`);
  }

  const updated = await geofencesStore.update(id, {
    status: 'inactive',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'Geofence',
    entityId: id,
    action: 'update',
    before: { status: geofence.status },
    after: { status: 'inactive' },
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Geofence deactivated',
  });

  return updated;
}

// ============================================================================
// Point-in-Geofence Check
// ============================================================================

export async function checkPointInGeofence(
  request: GeofenceCheckRequest,
  geofenceId: string
): Promise<GeofenceCheckResult> {
  const geofence = await geofencesStore.findById(geofenceId);
  if (!geofence) {
    throw new Error(`Geofence ${geofenceId} not found`);
  }

  if (geofence.status !== 'active') {
    throw new Error(`Geofence ${geofenceId} is not active`);
  }

  // Check if geofence is effective on the request timestamp
  const checkDate = new Date(request.timestamp);
  const effectiveFrom = new Date(geofence.effectiveFrom);
  const effectiveTo = geofence.effectiveTo ? new Date(geofence.effectiveTo) : null;
  
  if (checkDate < effectiveFrom || (effectiveTo && checkDate > effectiveTo)) {
    throw new Error(`Geofence ${geofenceId} is not effective on ${request.timestamp}`);
  }

  let insideGeofence = false;
  let distanceFromBoundary: number | undefined;

  if (geofence.type === 'circle') {
    const result = checkPointInCircle(
      request.latitude,
      request.longitude,
      geofence.center!.latitude,
      geofence.center!.longitude,
      geofence.radius!,
      geofence.bufferMetres
    );
    insideGeofence = result.inside;
    distanceFromBoundary = result.distance;
  } else if (geofence.type === 'polygon') {
    const result = checkPointInPolygon(
      request.latitude,
      request.longitude,
      geofence.polygon!,
      geofence.bufferMetres
    );
    insideGeofence = result.inside;
    distanceFromBoundary = result.distance;
  }

  return {
    insideGeofence,
    geofenceId: geofence.id,
    geofenceName: geofence.name,
    geofenceVersion: geofence.version,
    distanceFromBoundary,
    checkTimestamp: new Date().toISOString(),
    accuracyUsed: request.accuracy || 10, // Default 10m accuracy
  };
}

export async function checkPointInAnyGeofence(
  request: GeofenceCheckRequest
): Promise<GeofenceCheckResult[]> {
  // Get all active geofences effective on the request timestamp
  const geofences = await listGeofences({
    status: 'active',
    effectiveOn: request.timestamp,
  });

  const results: GeofenceCheckResult[] = [];

  for (const geofence of geofences) {
    try {
      const result = await checkPointInGeofence(request, geofence.id);
      results.push(result);
    } catch (error) {
      // Skip geofences that fail validation
      continue;
    }
  }

  return results;
}

// ============================================================================
// Geometry Calculations
// ============================================================================

function checkPointInCircle(
  pointLat: number,
  pointLng: number,
  centerLat: number,
  centerLng: number,
  radius: number,
  buffer: number
): { inside: boolean; distance: number } {
  // Calculate distance using Haversine formula
  const R = 6371000; // Earth's radius in metres
  const dLat = toRad(pointLat - centerLat);
  const dLng = toRad(pointLng - centerLng);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(centerLat)) * Math.cos(toRad(pointLat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  const effectiveRadius = radius + buffer;
  const inside = distance <= effectiveRadius;

  return {
    inside,
    distance: distance - radius, // Negative if inside
  };
}

function checkPointInPolygon(
  pointLat: number,
  pointLng: number,
  polygon: Array<{ latitude: number; longitude: number }>,
  buffer: number
): { inside: boolean; distance: number } {
  // Ray casting algorithm for point-in-polygon
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect = ((yi > pointLng) !== (yj > pointLng)) &&
      (pointLat < (xj - xi) * (pointLng - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  // Calculate distance to nearest edge (simplified)
  let minDistance = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const distance = distanceToSegment(
      pointLat,
      pointLng,
      polygon[i].latitude,
      polygon[i].longitude,
      polygon[j].latitude,
      polygon[j].longitude
    );
    minDistance = Math.min(minDistance, distance);
  }

  // Apply buffer
  if (inside) {
    return { inside: true, distance: -minDistance };
  } else {
    const effectiveDistance = minDistance - buffer;
    return { inside: effectiveDistance <= 0, distance: effectiveDistance };
  }
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  // Calculate distance from point to line segment (simplified, in degrees)
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  // Convert to approximate metres (very rough)
  return Math.sqrt(dx * dx + dy * dy) * 111000;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================================================
// Version Management
// ============================================================================

async function createGeofenceVersion(
  geofence: Geofence,
  userId: string,
  changeReason: string
): Promise<GeofenceVersion> {
  const version: GeofenceVersion = {
    id: generateId(),
    geofenceId: geofence.id,
    version: geofence.version,
    snapshot: {
      name: geofence.name,
      description: geofence.description,
      type: geofence.type,
      center: geofence.center,
      radius: geofence.radius,
      polygon: geofence.polygon,
      bufferMetres: geofence.bufferMetres,
      linkedEntityType: geofence.linkedEntityType,
      linkedEntityId: geofence.linkedEntityId,
      effectiveFrom: geofence.effectiveFrom,
      effectiveTo: geofence.effectiveTo,
      status: geofence.status,
      approvedBy: geofence.approvedBy,
      approvedAt: geofence.approvedAt,
      createdBy: geofence.createdBy,
    },
    changedBy: userId,
    changedAt: new Date().toISOString(),
    changeReason,
  };

  await geofenceVersionsStore.create(version);
  return version;
}

export async function getGeofenceVersions(geofenceId: string): Promise<GeofenceVersion[]> {
  const versions = await geofenceVersionsStore.findAll({ geofenceId } as any);
  return versions.sort((a, b) => b.version - a.version);
}

// ============================================================================
// Presence Logging
// ============================================================================

export async function logGeofenceEntry(
  geofenceId: string,
  entityType: 'asset' | 'operator' | 'vehicle',
  entityId: string,
  location: { latitude: number; longitude: number; accuracy: number }
): Promise<GeofencePresenceLog> {
  const log: GeofencePresenceLog = {
    id: generateId(),
    geofenceId,
    entityType,
    entityId,
    entryTime: new Date().toISOString(),
    entryLocation: location,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await presenceLogsStore.create(log);
  return log;
}

export async function logGeofenceExit(
  logId: string,
  location: { latitude: number; longitude: number; accuracy: number }
): Promise<GeofencePresenceLog> {
  const log = await presenceLogsStore.findById(logId);
  if (!log) {
    throw new Error(`Presence log ${logId} not found`);
  }

  const exitTime = new Date().toISOString();
  const entryTime = new Date(log.entryTime);
  const exitTimeDate = new Date(exitTime);
  const durationMinutes = (exitTimeDate.getTime() - entryTime.getTime()) / (1000 * 60);

  const updated = await presenceLogsStore.update(logId, {
    exitTime,
    exitLocation: location,
    durationMinutes: Math.round(durationMinutes),
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function getPresenceLogs(filters?: {
  geofenceId?: string;
  entityType?: string;
  entityId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<GeofencePresenceLog[]> {
  let logs = await presenceLogsStore.findAll();

  if (filters?.geofenceId) {
    logs = logs.filter(l => l.geofenceId === filters.geofenceId);
  }
  if (filters?.entityType) {
    logs = logs.filter(l => l.entityType === filters.entityType);
  }
  if (filters?.entityId) {
    logs = logs.filter(l => l.entityId === filters.entityId);
  }
  if (filters?.fromDate) {
    logs = logs.filter(l => l.entryTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    logs = logs.filter(l => l.entryTime <= filters.toDate!);
  }

  return logs.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function getGeofencesForEntity(
  entityType: 'site' | 'plant' | 'office' | 'project',
  entityId: string
): Promise<Geofence[]> {
  return listGeofences({
    linkedEntityType: entityType,
    linkedEntityId: entityId,
    status: 'active',
  });
}

export async function getCurrentGeofences(): Promise<Geofence[]> {
  const now = new Date().toISOString();
  return listGeofences({
    status: 'active',
    effectiveOn: now,
  });
}
