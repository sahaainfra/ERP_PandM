/**
 * Part 02 — Shared Platform Foundation Types
 *
 * All cross-cutting service interfaces and entities used by every module.
 * These types are the contract between services and consuming modules.
 */

// ============================================================================
// Common Types
// ============================================================================

export type Status = 'draft' | 'submitted' | 'pending_approval' | 'pending_evidence' | 'approved' | 'rejected' | 'returned' | 'posted' | 'reversed' | 'completed';
export type DataSource = 'manual' | 'imported' | 'integrated_live' | 'integrated_delayed' | 'system_calculated';

// ============================================================================
// 2.1 Organizational Hierarchy & Shared Masters
// ============================================================================

export interface Company {
  id: string;
  code: string;
  name: string;
  legalName: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  financialYearStart: { month: number; day: number }; // default {4, 1} for India
  currency: string; // ISO 4217, default 'INR'
  timezone: string; // default 'Asia/Kolkata'
  createdAt: string;
  updatedAt: string;
}

export interface Region {
  id: string;
  companyId: string;
  code: string;
  name: string;
  createdAt: string;
}

export interface Project {
  id: string;
  companyId: string;
  regionId?: string;
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  status: 'planned' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  location?: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
}

export interface Site {
  id: string;
  projectId: string;
  code: string;
  name: string;
  address?: string;
  location?: { lat: number; lng: number };
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Plant {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'rmc' | 'workshop' | 'store' | 'batch_plant' | 'crushing';
  siteId?: string;
  address?: string;
  location?: { lat: number; lng: number };
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: string;
}

export interface Department {
  id: string;
  companyId: string;
  code: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface CostCentre {
  id: string;
  companyId: string;
  projectId?: string;
  code: string;
  name: string;
  type: 'project' | 'plant' | 'overhead' | 'corporate';
  parentId?: string;
  createdAt: string;
}

export interface User {
  id: string;
  companyId: string;
  employeeId?: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  scopes: UserScope[];
  active: boolean;
  mfaEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export type UserRole =
  // Executive
  | 'super_admin'
  | 'company_admin'
  // Management
  | 'project_manager'
  | 'site_manager'
  | 'fleet_manager'
  | 'plant_manager'
  | 'maintenance_manager'
  | 'qc_manager'
  | 'accounts_manager'
  | 'dispatch_manager'
  // Operational
  | 'site_engineer'
  | 'fleet_supervisor'
  | 'fuel_officer'
  | 'store_keeper'
  // Technical
  | 'operator'
  | 'technician'
  | 'lab_staff'
  | 'calibration_officer'
  // Support
  | 'procurement_officer'
  | 'accounts_executive'
  | 'logistics_staff'
  | 'general_staff'
  // Add-on roles (Parts 26-33)
  | 'hr_manager'
  | 'hr_executive'
  // Read-only
  | 'auditor'
  | 'viewer';

export interface UserScope {
  type: 'company' | 'project' | 'site' | 'plant' | 'department';
  id: string;
}

export interface Employee {
  id: string;
  companyId: string;
  code: string;
  fullName: string;
  departmentId?: string;
  designation?: string;
  email: string;
  phone?: string;
  userId?: string;
  active: boolean;
  joinDate: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  companyId: string;
  code: string;
  name: string;
  gstin?: string;
  pan?: string;
  category: 'fuel' | 'spares' | 'material' | 'service' | 'subcontractor' | 'other';
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  companyId: string;
  code: string;
  name: string;
  gstin?: string;
  pan?: string;
  category: 'client' | 'internal' | 'other';
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  active: boolean;
  createdAt: string;
}

export interface Item {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  category: 'fuel' | 'spares' | 'rmc_material' | 'consumable' | 'service' | 'finished_good';
  uomId: string;
  isFuelItem: boolean;
  isRmcMaterial: boolean;
  isSpare: boolean;
  hsnCode?: string;
  gstRate?: number;
  active: boolean;
  createdAt: string;
}

export interface UnitOfMeasure {
  id: string;
  code: string; // 'L', 'KL', 'HRS', 'KM', 'M3', 'KG', 'TNE', 'BAG', 'NOS', 'MT'
  name: string;
  category: 'volume' | 'weight' | 'length' | 'time' | 'count' | 'area';
  baseUnitId?: string; // for conversion
  factorToBase: number; // multiply by this to get base unit value
  decimalPlaces: number;
  roundingRule: 'round' | 'floor' | 'ceil' | 'half_up';
  createdAt: string;
}

export interface Warehouse {
  id: string;
  companyId: string;
  plantId?: string;
  code: string;
  name: string;
  type: 'main' | 'site' | 'plant' | 'transit';
  address?: string;
  active: boolean;
  createdAt: string;
}

export interface TaxCode {
  id: string;
  companyId: string;
  code: string; // 'GST-18', 'GST-0', 'GST-28', 'EXEMPT'
  name: string;
  rate: number; // percentage
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  cessRate: number;
  active: boolean;
  createdAt: string;
}

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  parentId?: string;
  isPosting: boolean;
  active: boolean;
  createdAt: string;
}

// ============================================================================
// 2.2 Document Numbering
// ============================================================================

export type DocumentType =
  | 'EQUIPMENT'
  | 'OPERATOR_LOG'
  | 'FUEL_RECORD'
  | 'MAINTENANCE_ORDER'
  | 'RMC_ORDER'
  | 'BATCH_TICKET'
  | 'QUALITY_TEST'
  | 'JOURNAL_VOUCHER'
  | 'PAYMENT_VOUCHER'
  | 'RECEIPT_VOUCHER'
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'ATTACHMENT'
  | 'ALERT';

export interface NumberSeries {
  id: string;
  companyId: string;
  documentType: DocumentType;
  plantId?: string;
  siteId?: string;
  prefix: string;
  financialYear: string; // e.g. '2026-27'
  lastNumber: number;
  paddingLength: number;
  suffix?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 2.3 Audit Trail
// ============================================================================

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'submit'
  | 'approve'
  | 'reject'
  | 'return'
  | 'request_evidence'
  | 'post'
  | 'reverse'
  | 'amend'
  | 'escalate'
  | 'delegate'
  | 'withdraw'
  | 'assign'
  | 'acknowledge'
  | 'resolve'
  | 'close'
  | 'export'
  | 'login'
  | 'logout'
  | 'permission_change';

export interface AuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  ipAddress?: string;
  deviceId?: string;
  requestId: string;
  timestamp: string; // UTC ISO
}

export interface RevisionRecord {
  id: string;
  entityType: string;
  entityId: string;
  revisionNumber: number;
  originalValue: Record<string, unknown>;
  amendedValue: Record<string, unknown>;
  reason: string;
  authorId: string;
  approverId?: string;
  approvedAt?: string;
  createdAt: string;
}

// ============================================================================
// 2.4 Attachments
// ============================================================================

export type EvidenceCategory =
  | 'hour_meter'
  | 'odometer'
  | 'fuel_meter'
  | 'registration_plate'
  | 'damage'
  | 'delivery_receipt'
  | 'slump_test'
  | 'cube_test'
  | 'work_completion'
  | 'signature'
  | 'invoice'
  | 'general';

export type AttachmentType = 'image/jpeg' | 'image/png' | 'image/heic' | 'application/pdf' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'application/vnd.ms-excel' | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface Attachment {
  id: string;
  entityType: string;
  entityId: string;
  category: EvidenceCategory;
  fileName: string;
  mimeType: AttachmentType;
  sizeBytes: number;
  sha256: string;
  uploaderId: string;
  uploadedAt: string;
  captureTime?: string;
  deviceInfo?: { model?: string; os?: string; app?: string };
  gpsLocation?: { lat: number; lng: number; accuracy?: number };
  exifData?: Record<string, unknown>;
  previewUrl?: string;
  downloadUrl?: string;
  isDeleted: boolean;
}

export interface SignedUrl {
  url: string;
  expiresAt: string;
  attachmentId: string;
}

// ============================================================================
// 2.5 Workflow & Approval
// ============================================================================

export type WorkflowState =
  | 'draft'
  | 'submitted'
  | 'pending_approval'
  | 'pending_evidence'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'posted'
  | 'reversed'
  | 'cancelled'
  | 'escalated';

export type WorkflowAction =
  | 'submit'
  | 'approve'
  | 'reject'
  | 'return'
  | 'request_evidence'
  | 'escalate'
  | 'withdraw'
  | 'post'
  | 'reverse'
  | 'cancel'
  | 'comment';

export interface WorkflowTransition {
  fromState: WorkflowState;
  toState: WorkflowState;
  action: WorkflowAction;
  requiredRoles: UserRole[];
  requiredFields?: string[];
  reasonRequired: boolean;
}

export interface WorkflowDefinition {
  id: string;
  entityType: string;
  name: string;
  initialState: WorkflowState;
  transitions: WorkflowTransition[];
  approvalLevels?: number;
  escalationHours?: number;
  createdAt: string;
}

export interface WorkflowInstance {
  id: string;
  definitionId: string;
  entityType: string;
  entityId: string;
  currentState: WorkflowState;
  currentLevel: number;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  history: WorkflowHistoryEntry[];
}

export interface WorkflowHistoryEntry {
  action: WorkflowAction;
  fromState: WorkflowState;
  toState: WorkflowState;
  actorId: string;
  actorRole: UserRole;
  reason?: string;
  comment?: string;
  timestamp: string;
}

// ============================================================================
// 2.6 Alerts & Notifications
// ============================================================================

export type AlertSeverity = 'info' | 'warning' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'assigned' | 'escalated' | 'resolved' | 'closed';

export interface AlertRule {
  id: string;
  code: string; // e.g. 'FUEL_VARIANCE_CRITICAL'
  name: string;
  description: string;
  module: string;
  severity: AlertSeverity;
  condition: string; // expression or rule identifier
  threshold?: number;
  recipientRoles: UserRole[];
  recipientUsers?: string[];
  escalationHours?: number;
  isActive: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  ruleId?: string;
  code: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  module: string;
  entityType?: string;
  entityId?: string;
  responsibleUserId?: string;
  responsibleRole?: UserRole;
  status: AlertStatus;
  createdAt: string;
  dueAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  recommendedAction?: string;
  deduplicationKey?: string;
}

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'chat';

export interface Notification {
  id: string;
  userId: string;
  alertId?: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  link?: string;
  sentAt: string;
  readAt?: string;
  delivered: boolean;
}

export interface UserNotificationPreferences {
  id: string;
  userId: string;
  channels: NotificationChannel[];
  quietHoursStart?: string; // 'HH:mm'
  quietHoursEnd?: string;
  severityMinimum: AlertSeverity;
}

// ============================================================================
// 2.7 Idempotency & Offline Sync
// ============================================================================

export interface IdempotencyRecord {
  id: string;
  key: string;
  entityType: string;
  entityId: string;
  requestHash: string;
  response: unknown;
  createdAt: string;
  expiresAt: string;
}

export interface OfflineQueueItem {
  id: string; // client-generated UUID
  entityType: string;
  action: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientCreatedAt: string;
  clientCapturedAt?: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
  serverReceiptAt?: string;
  conflictDetails?: string;
}

// ============================================================================
// 2.8 API Conventions
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SortParam {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterParam {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like' | 'between';
  value: unknown;
}

export interface ApiRequestContext {
  requestId: string;
  userId: string;
  userRole: UserRole;
  companyId: string;
  scopes: UserScope[];
  ipAddress?: string;
  deviceId?: string;
  timestamp: string;
}
