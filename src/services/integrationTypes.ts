/**
 * Part 12 — Integration Types
 */

import { Status } from './types';

// ============================================================================
// Integration Framework
// ============================================================================

export type ConnectorStatus = 'active' | 'configured_untested' | 'unavailable' | 'failed';
export type DataSource = 'integrated_live' | 'integrated_delayed' | 'imported' | 'manual';
export type InboundPattern = 'webhook' | 'polling' | 'file_drop' | 'manual_import';
export type AuthMethod = 'api_key' | 'oauth2' | 'basic' | 'certificate' | 'none';

export interface IntegrationConnector {
  id: string;
  
  // Identity
  system: string; // e.g., 'telematics', 'batching_plant', 'weighbridge'
  provider: string; // e.g., 'trimble', 'schwing_stetter', 'mettler_toledo'
  environment: 'production' | 'staging' | 'development';
  
  // Configuration
  authMethod: AuthMethod;
  credentialsId: string; // Reference to secrets manager (never store actual credentials)
  webhookUrl?: string;
  pollingIntervalMinutes?: number;
  fileDropPath?: string;
  
  // Status
  status: ConnectorStatus;
  lastSuccessfulSync?: string;
  lastFailedSync?: string;
  lastErrorMessage?: string;
  
  // SLA
  dataLatencySLAMinutes: number;
  
  // Ownership
  ownerUserId: string;
  ownerRole: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationEvent {
  id: string;
  connectorId: string;
  
  // Event identity
  eventType: string; // e.g., 'TelematicsEngineHours', 'BatchRecordImported'
  providerRecordId: string; // Provider's unique ID for this record
  
  // Data
  payload: Record<string, unknown>;
  
  // Source tracking
  dataSource: DataSource;
  provider: string;
  receiptTime: string; // When we received it
  providerTimestamp?: string; // When provider generated it
  
  // Processing
  processed: boolean;
  processedAt?: string;
  processingError?: string;
  
  // Idempotency
  idempotencyKey: string;
  
  // Retry
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  
  // Dead letter
  inDeadLetter: boolean;
  deadLetterReason?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationHealthCheck {
  id: string;
  connectorId: string;
  
  // Check details
  checkType: 'connectivity' | 'data_freshness' | 'error_rate';
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  // Metrics
  latencyMs?: number;
  lastCheckedAt: string;
  errorMessage?: string;
  
  // Metadata
  createdAt: string;
}

export interface IntegrationSecret {
  id: string;
  connectorId: string;
  
  // Secret identity (never store actual secret)
  secretType: 'api_key' | 'oauth_token' | 'password' | 'certificate';
  secretName: string;
  
  // Reference to actual secret storage (e.g., AWS Secrets Manager, Azure Key Vault)
  secretStoreReference: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  lastRotatedAt?: string;
}

// ============================================================================
// Telematics
// ============================================================================

export interface TelematicsDevice {
  id: string;
  deviceId: string; // Provider's device ID
  provider: string;
  
  // Asset mapping
  assetId: string;
  effectiveFrom: string;
  effectiveTo?: string;
  
  // Device details
  deviceType: string; // e.g., 'gps_tracker', 'fuel_sensor', 'obd_device'
  simNumber?: string;
  firmwareVersion?: string;
  
  // Status
  status: 'active' | 'inactive' | 'decommissioned';
  lastCommunicationAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TelematicsPosition {
  id: string;
  deviceId: string;
  assetId: string;
  
  // Position
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number;
  
  // Timestamps
  recordedAt: string; // When device recorded
  receivedAt: string; // When we received
  
  // Context
  speed?: number; // km/h
  heading?: number; // degrees
  ignition: boolean;
  
  // Geofence
  geofenceId?: string;
  insideGeofence: boolean;
  
  // Source
  dataSource: DataSource;
  provider: string;
  
  createdAt: string;
}

export interface TelematicsEngineData {
  id: string;
  deviceId: string;
  assetId: string;
  
  // Engine data
  engineHours: number;
  odometer?: number;
  fuelLevel?: number; // percentage or litres
  fuelUsed?: number; // litres since last reading
  
  // Timestamps
  recordedAt: string;
  receivedAt: string;
  
  // Source
  dataSource: DataSource;
  provider: string;
  
  createdAt: string;
}

export interface TelematicsFaultCode {
  id: string;
  deviceId: string;
  assetId: string;
  
  // Fault details
  faultCode: string; // e.g., 'P0300', 'SPN_1234'
  faultDescription: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Timestamps
  detectedAt: string;
  receivedAt: string;
  clearedAt?: string;
  
  // Status
  status: 'active' | 'cleared' | 'acknowledged';
  workOrderId?: string; // Linked maintenance work order
  
  // Source
  dataSource: DataSource;
  provider: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Batching Plant
// ============================================================================

export interface BatchRecord {
  id: string;
  batchNumber: string;
  plantId: string;
  
  // Timestamps
  batchStartTime: string;
  batchEndTime: string;
  receivedAt: string;
  
  // Recipe
  mixDesignId: string;
  mixDesignCode: string;
  
  // Ingredients (actual weights in kg)
  cement: number;
  sand: number;
  aggregate20mm: number;
  aggregate12mm: number;
  water: number;
  admixture: number;
  
  // Corrections
  moistureCorrection?: number;
  
  // Output
  batchVolume: number; // m³
  slump?: number; // mm
  
  // Operator
  operatorId: string;
  operatorName: string;
  
  // Quality
  qualityStatus: 'pending' | 'approved' | 'rejected';
  qualityNotes?: string;
  
  // Source
  dataSource: DataSource;
  provider: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Weighbridge
// ============================================================================

export interface WeighbridgeTicket {
  id: string;
  ticketNumber: string;
  weighbridgeId: string;
  
  // Weights
  grossWeight: number; // kg
  tareWeight: number; // kg
  netWeight: number; // kg
  
  // Vehicle
  vehicleNumber: string;
  vehicleType?: string;
  
  // Material
  materialType: string; // e.g., 'sand', 'aggregate', 'cement'
  materialDescription?: string;
  
  // Transaction
  transactionType: 'receipt' | 'dispatch';
  supplierId?: string; // For receipts
  customerId?: string; // For dispatch
  projectId?: string;
  
  // Timestamps
  weighTime: string;
  receivedAt: string;
  
  // Operator
  operatorId: string;
  operatorName: string;
  
  // Validation
  duplicateDetected: boolean;
  tareAnomaly: boolean;
  anomalyNotes?: string;
  
  // Source
  dataSource: DataSource;
  provider: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Notifications
// ============================================================================

export interface EmailConfig {
  id: string;
  connectorId: string;
  
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPasswordRef: string; // Reference to secrets
  fromEmail: string;
  fromName: string;
  
  // TLS
  useTLS: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface SMSConfig {
  id: string;
  connectorId: string;
  
  provider: string; // e.g., 'msg91', 'twilio'
  apiKeyRef: string; // Reference to secrets
  senderId: string;
  
  // DLT (India-specific)
  dltTemplateId?: string;
  dltEntityId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface PushNotificationConfig {
  id: string;
  connectorId: string;
  
  // Firebase Cloud Messaging
  fcmServerKeyRef: string;
  
  // Apple Push Notification Service
  apnsCertificateRef?: string;
  apnsKeyRef?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Maps
// ============================================================================

export interface MapsConfig {
  id: string;
  connectorId: string;
  
  provider: string; // e.g., 'google_maps', 'mapmyindia', 'openstreetmap'
  apiKeyRef: string; // Reference to secrets
  
  // Features
  geocodingEnabled: boolean;
  reverseGeocodingEnabled: boolean;
  routingEnabled: boolean;
  
  // Licence
  licenceValid: boolean;
  licenceExpiryDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// File Storage
// ============================================================================

export interface FileStorageConfig {
  id: string;
  connectorId: string;
  
  provider: string; // e.g., 'aws_s3', 'azure_blob', 'minio'
  bucketName: string;
  region?: string;
  
  // Credentials
  accessKeyRef: string;
  secretKeyRef: string;
  
  // Encryption
  encryptionAtRest: boolean;
  encryptionAlgorithm?: string; // e.g., 'AES-256'
  
  // Retention
  retentionDays?: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Monitoring
// ============================================================================

export interface IntegrationMetrics {
  connectorId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  
  // Message counts
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  retryMessages: number;
  
  // Latency
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  
  // Error rates
  errorRate: number; // percentage
  
  // Data freshness
  lastSuccessfulSync?: string;
  dataStalenessMinutes?: number;
  
  createdAt: string;
}
