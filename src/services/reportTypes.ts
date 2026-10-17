/**
 * Part 24 — Report Types
 */

// ============================================================================
// Report Framework
// ============================================================================

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';
export type ReportStatus = 'draft' | 'active' | 'deprecated';
export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ReportCategory;
  
  // Data sources
  sourceModules: string[];
  kpiIds: string[];
  
  // Filters
  availableFilters: ReportFilter[];
  defaultFilters: Record<string, any>;
  
  // Columns/sections
  columns: ReportColumn[];
  sections?: ReportSection[];
  
  // Export
  supportedFormats: ReportFormat[];
  maxRows?: number;
  
  // Permissions
  requiredPermission: string;
  
  // Versioning
  version: number;
  versionNotes?: string;
  
  // Status
  status: ReportStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ReportCategory = 
  | 'assets'
  | 'operations'
  | 'fuel'
  | 'maintenance'
  | 'rmc_production'
  | 'quality'
  | 'dispatch'
  | 'finance'
  | 'management';

export interface ReportFilter {
  id: string;
  name: string;
  type: 'date_range' | 'single_select' | 'multi_select' | 'text' | 'number';
  required: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface ReportColumn {
  id: string;
  name: string;
  field: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'status';
  width?: number;
  sortable: boolean;
  visible: boolean;
  format?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  columns: ReportColumn[];
}

// ============================================================================
// Report Execution
// ============================================================================

export interface ReportExecution {
  id: string;
  reportId: string;
  reportVersion: number;
  
  // Filters applied
  filters: Record<string, any>;
  
  // Results
  data: any[];
  totalRows: number;
  
  // Header info
  generatedAt: string;
  generatedBy: string;
  dataSources: string[];
  dataFreshness: Record<string, string>;
  statusBreakdown: Record<string, number>;
  
  // Metadata
  executionTimeMs: number;
  
  createdAt: string;
}

// ============================================================================
// Export Jobs
// ============================================================================

export interface ExportJob {
  id: string;
  reportId: string;
  executionId: string;
  
  // Export details
  format: ReportFormat;
  fileName: string;
  
  // Status
  status: ExportJobStatus;
  progress: number; // 0-100
  errorMessage?: string;
  
  // File
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: string;
  
  // Requester
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  
  // Logging
  rowCount?: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Scheduled Reports
// ============================================================================

export interface ScheduledReport {
  id: string;
  reportId: string;
  
  // Schedule
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'custom';
  scheduleConfig: {
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
    time?: string; // HH:mm
    cronExpression?: string;
  };
  
  // Recipients
  recipientEmails: string[];
  recipientRoles?: string[];
  
  // Filters (fixed for scheduled reports)
  filters: Record<string, any>;
  
  // Export
  format: ReportFormat;
  
  // Status
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Audit Trail
// ============================================================================

export interface AuditTrailEntry {
  id: string;
  
  // Entity
  entityType: string;
  entityId: string;
  entityNumber?: string;
  
  // Action
  action: string;
  actorId: string;
  actorRole: string;
  
  // Changes
  beforeValues: Record<string, any> | null;
  afterValues: Record<string, any> | null;
  changedFields: string[];
  
  // Context
  reason?: string;
  requestId: string;
  
  // Timestamp
  timestamp: string;
  
  // Linked records
  linkedEntityType?: string;
  linkedEntityId?: string;
}

export interface AuditTrailQuery {
  entityType?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Evidence Pack
// ============================================================================

export interface EvidencePack {
  id: string;
  
  // Source record
  entityType: string;
  entityId: string;
  entityNumber?: string;
  
  // Contents
  mainRecord: any;
  revisions: any[];
  attachments: EvidencePackAttachment[];
  approvals: any[];
  chatReferences: any[];
  alerts: any[];
  auditTrail: AuditTrailEntry[];
  
  // Metadata
  generatedAt: string;
  generatedBy: string;
  
  // Export
  exportFormat: 'pdf' | 'zip';
  exportFileId?: string;
  exportHash?: string;
  
  createdAt: string;
}

export interface EvidencePackAttachment {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  captureTime?: string;
  gpsCoordinates?: { lat: number; lng: number };
  downloadUrl?: string;
}

// ============================================================================
// Report Catalogue
// ============================================================================

export interface ReportCatalogueEntry {
  id: string;
  code: string;
  name: string;
  description: string;
  category: ReportCategory;
  requiredPermission: string;
  supportedFormats: ReportFormat[];
  isScheduled: boolean;
}
