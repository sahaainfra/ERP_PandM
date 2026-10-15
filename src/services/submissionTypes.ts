/**
 * Part 07 — Submission and Evidence Types
 */

import { Status, DataSource } from './types';
import { AssetCategory } from './assetTypes';

// ============================================================================
// Evidence Rules Configuration
// ============================================================================

export interface EvidenceRule {
  id: string;
  assetCategory: AssetCategory;
  eventType: 'opening' | 'closing' | 'breakdown' | 'general';
  photoCategory: EvidenceCategory;
  minimumCount: number;
  mandatory: boolean;
  requireInAppCamera: boolean; // Block gallery upload
  maxAgeMinutes: number; // Maximum age relative to submission
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EvidenceCategory =
  | 'opening_hour_meter'
  | 'closing_hour_meter'
  | 'opening_odometer'
  | 'closing_odometer'
  | 'registration_plate'
  | 'asset_id_plate'
  | 'fuel_gauge'
  | 'fuel_tank_dip'
  | 'damage'
  | 'defect'
  | 'breakdown'
  | 'work_completion'
  | 'general';

// ============================================================================
// Submission Record
// ============================================================================

export interface OperatorSubmission {
  id: string;
  submissionNumber: string;
  
  // Asset and operator identification
  assetId: string;
  operatorId: string;
  
  // Date and shift
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'afternoon' | 'night' | 'full_day';
  projectId?: string;
  siteId?: string;
  plantId?: string;
  
  // Meter readings
  openingHourMeter?: number;
  closingHourMeter?: number;
  openingOdometer?: number;
  closingOdometer?: number;
  calculatedOperatingHours?: number;
  calculatedKilometres?: number;
  
  // Fuel readings
  fuelAtStart?: number;
  fuelAtClose?: number;
  fuelReceived?: number;
  
  // Operational status
  operationalStatus: 'productive' | 'idle' | 'standby' | 'breakdown';
  workPerformed?: string;
  idleTime?: number;
  breakdownDetails?: string;
  
  // Operator declaration
  operatorDeclaration: boolean;
  declarationText: string;
  
  // Time tracking
  clientCaptureTime: string; // When operator captured on device
  serverReceiptTime: string; // When server received
  isOffline: boolean;
  
  // Photo evidence
  photoEvidence: PhotoEvidence[];
  
  // OCR results (optional, for reviewer aid)
  ocrResults: OcrResult[];
  
  // Validation
  validationFlags: SubmissionValidationFlag[];
  
  // Exception handling
  hasException: boolean;
  exceptionReason?: string;
  exceptionDetails?: string;
  
  // Status and linkage
  status: Status;
  dataSource: DataSource;
  logbookId?: string; // Link to Part 06 logbook
  
  // Submission metadata
  submittedAt?: string;
  submittedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  
  // Audit
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ============================================================================
// Photo Evidence
// ============================================================================

export interface PhotoEvidence {
  id: string;
  submissionId: string;
  category: EvidenceCategory;
  
  // File metadata
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  
  // Capture metadata
  captureTime: string;
  deviceId?: string;
  deviceModel?: string;
  appVersion?: string;
  
  // Location (if available and lawful)
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  
  // EXIF data (if available)
  exifData?: Record<string, unknown>;
  
  // Storage
  attachmentId: string; // Link to Part 02 attachment service
  previewUrl?: string;
  
  // OCR (optional)
  ocrText?: string;
  ocrConfidence?: number;
  
  // Metadata overlay (for display only, not stored in image)
  overlayData?: {
    assetCode: string;
    dateTime: string;
    operatorName: string;
  };
  
  createdAt: string;
}

// ============================================================================
// OCR Results
// ============================================================================

export interface OcrResult {
  id: string;
  submissionId: string;
  photoEvidenceId: string;
  
  // OCR data
  recognizedText: string;
  confidence: number; // 0-100
  
  // Parsed values
  parsedValue?: number;
  parsedUnit?: string;
  
  // Comparison with operator input
  operatorValue?: number;
  mismatch: boolean;
  mismatchDetails?: string;
  
  // Processing metadata
  processedAt: string;
  processingTimeMs: number;
  ocrEngine: string;
  
  createdAt: string;
}

// ============================================================================
// Validation Flags
// ============================================================================

export interface SubmissionValidationFlag {
  id: string;
  code: SubmissionValidationCode;
  message: string;
  severity: 'warning' | 'error';
  field?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
}

export type SubmissionValidationCode =
  | 'MISSING_EVIDENCE'
  | 'READING_GAP'
  | 'NEGATIVE_USAGE'
  | 'IMPLAUSIBLE_USAGE'
  | 'DUPLICATE_SUBMISSION'
  | 'UNAUTHORIZED_ASSET'
  | 'UNAUTHORIZED_OPERATOR'
  | 'MISSING_CLOSING_READING'
  | 'OCR_MISMATCH'
  | 'PHOTO_TOO_OLD'
  | 'INVALID_DECLARATION';

// ============================================================================
// Offline Queue
// ============================================================================

export interface OfflineQueueItem {
  id: string; // Client-generated UUID
  type: 'submission' | 'photo';
  
  // For submissions
  submissionData?: Partial<OperatorSubmission>;
  
  // For photos
  photoData?: {
    submissionId: string;
    category: EvidenceCategory;
    fileBlob: Blob;
    captureTime: string;
    metadata?: Record<string, unknown>;
  };
  
  // Sync metadata
  clientUuid: string;
  idempotencyKey: string;
  clientCaptureTime: string;
  
  // Status
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  retryCount: number;
  lastError?: string;
  
  // Server response
  serverReceiptTime?: string;
  serverId?: string;
  conflictDetails?: string;
  
  // Encryption
  encrypted: boolean;
  encryptionKeyId?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Exception Reasons
// ============================================================================

export interface ExceptionReason {
  id: string;
  code: string;
  name: string;
  description: string;
  requiresApproverReview: boolean;
  isActive: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

export interface SubmissionConfiguration {
  id: string;
  
  // Photo requirements
  maxPhotoSizeMB: number;
  allowedPhotoFormats: string[];
  requireGpsForPhotos: boolean;
  
  // Offline settings
  offlineQueueMaxAge: number; // hours
  offlineQueueMaxSize: number; // items
  encryptOfflineData: boolean;
  
  // OCR settings
  enableOcr: boolean;
  ocrEngine: string;
  ocrConfidenceThreshold: number;
  
  // Validation
  maxSubmissionAge: number; // minutes
  allowGalleryUpload: boolean;
  
  createdAt: string;
  updatedAt: string;
}
