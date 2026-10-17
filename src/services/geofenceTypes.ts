/**
 * Part 26 — Geofence Types
 */

// ============================================================================
// Geofence Definitions
// ============================================================================

export type GeofenceType = 'circle' | 'polygon';
export type GeofenceStatus = 'draft' | 'active' | 'inactive' | 'archived';

export interface Geofence {
  id: string;
  name: string;
  description?: string;
  
  // Type and geometry
  type: GeofenceType;
  
  // For circle geofences
  center?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // metres
  
  // For polygon geofences
  polygon?: Array<{
    latitude: number;
    longitude: number;
  }>;
  
  // Buffer zone
  bufferMetres: number; // Additional buffer around geofence
  
  // Linked entities
  linkedEntityType?: 'site' | 'plant' | 'office' | 'project';
  linkedEntityId?: string;
  
  // Effective dates
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Version
  version: number;
  
  // Status
  status: GeofenceStatus;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Point-in-Geofence Check
// ============================================================================

export interface GeofenceCheckRequest {
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in metres
  timestamp: string;
}

export interface GeofenceCheckResult {
  insideGeofence: boolean;
  geofenceId?: string;
  geofenceName?: string;
  geofenceVersion: number;
  distanceFromBoundary?: number; // metres (negative if inside)
  checkTimestamp: string;
  accuracyUsed: number;
}

// ============================================================================
// Geofence History
// ============================================================================

export interface GeofenceVersion {
  id: string;
  geofenceId: string;
  version: number;
  
  // Snapshot of geofence at this version
  snapshot: Omit<Geofence, 'id' | 'version' | 'createdAt' | 'updatedAt'>;
  
  // Change info
  changedBy: string;
  changedAt: string;
  changeReason: string;
}

// ============================================================================
// Geofence Presence Log
// ============================================================================

export interface GeofencePresenceLog {
  id: string;
  geofenceId: string;
  entityType: 'asset' | 'operator' | 'vehicle';
  entityId: string;
  
  // Entry/exit
  entryTime: string;
  exitTime?: string;
  durationMinutes?: number;
  
  // Location data
  entryLocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  exitLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
