/**
 * Part 27 — Platform Administration Types
 */

// ============================================================================
// Website Administrator Role
// ============================================================================

export interface WebsiteAdministratorConfig {
  id: string;
  
  // MFA Configuration
  mfaRequired: boolean;
  mfaMethod: 'totp' | 'webauthn' | 'sms';
  sessionLifetimeMinutes: number;
  reauthRequiredForPrivilegedOps: boolean;
  
  // IP/Network Restrictions
  ipAllowListEnabled: boolean;
  ipAllowList: string[];
  networkAllowList: string[];
  
  // Alerts
  alertOnNewDeviceLogin: boolean;
  alertOnPrivilegedOperation: boolean;
  securityOwnerUserId: string;
  
  // Emergency Access
  emergencyAccessEnabled: boolean;
  emergencyAccessLifetimeMinutes: number;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Platform Configuration
// ============================================================================

export interface PlatformConfiguration {
  id: string;
  
  // Branding
  companyName: string;
  companyLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Domains
  primaryDomain: string;
  additionalDomains: string[];
  
  // Email/SMS Templates
  emailTemplates: EmailTemplate[];
  smsTemplates: SMSTemplate[];
  
  // Feature Flags
  featureFlags: FeatureFlag[];
  
  // System Settings
  defaultTimeZone: string;
  numberSeriesPrefix: string;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
  passwordExpiryDays: number;
  
  // Maintenance Mode
  maintenanceModeEnabled: boolean;
  maintenanceModeMessage: string;
  maintenanceModeBannerColor: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

export interface SMSTemplate {
  id: string;
  name: string;
  body: string;
  variables: string[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  enabledForRoles: string[];
  enabledForUsers: string[];
}

// ============================================================================
// User Management
// ============================================================================

export interface UserManagementAction {
  id: string;
  action: 'create' | 'deactivate' | 'activate' | 'unlock' | 'reset_mfa' | 'assign_role' | 'remove_role';
  targetUserId: string;
  targetUserName: string;
  performedBy: string;
  performedByRole: string;
  
  // Details
  details: Record<string, any>;
  
  // Approval (for privileged actions)
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  
  // Confirmation
  confirmationReason: string;
  
  // Timestamp
  performedAt: string;
}

export interface PrivilegedRoleGrant {
  id: string;
  targetUserId: string;
  targetUserName: string;
  roleGranted: string;
  
  // Approval workflow
  requestedBy: string;
  requestedAt: string;
  approvedBy: string;
  approvedAt: string;
  approvalReason: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// System Maintenance
// ============================================================================

export interface MaintenanceModeConfig {
  enabled: boolean;
  message: string;
  bannerColor: 'info' | 'warning' | 'error';
  enabledBy: string;
  enabledAt: string;
  reason: string;
  expectedDowntimeMinutes?: number;
}

export interface CacheClearRequest {
  id: string;
  cacheType: 'all' | 'user_sessions' | 'api_responses' | 'dashboard_data' | 'report_data';
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  completedAt?: string;
  clearedBy?: string;
}

export interface JobQueueItem {
  id: string;
  jobType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  payload: Record<string, any>;
}

// ============================================================================
// Application Monitoring
// ============================================================================

export interface SystemHealth {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  // Component health
  database: ComponentHealth;
  cache: ComponentHealth;
  queue: ComponentHealth;
  integrations: IntegrationHealth[];
  
  // Metrics
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  averageResponseTime: number;
  
  // Alerts
  activeAlerts: SystemAlert[];
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastChecked: string;
  details?: string;
}

export interface IntegrationHealth {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  errorMessage?: string;
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

// ============================================================================
// Backup Management
// ============================================================================

export interface BackupRecord {
  id: string;
  backupType: 'full' | 'incremental' | 'database' | 'files';
  status: 'completed' | 'failed' | 'in_progress';
  
  // Details
  size: number; // bytes
  duration: number; // seconds
  location: string;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  
  // Retention
  retentionDays: number;
  expiresAt: string;
  
  // Restore
  restoreRequested: boolean;
  restoreRequestedBy?: string;
  restoreRequestedAt?: string;
  restoreApprovedBy?: string;
  restoreApprovedAt?: string;
}

export interface RestoreRequest {
  id: string;
  backupId: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  
  // Approval
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  
  // Status
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed';
  
  // Execution
  startedAt?: string;
  completedAt?: string;
  executedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Emergency Access (Break-Glass)
// ============================================================================

export interface EmergencyAccessSession {
  id: string;
  
  // Access details
  accessedBy: string;
  accessReason: string;
  accessedAt: string;
  expiresAt: string;
  
  // Alerts
  alertSentTo: string[];
  alertSentAt: string;
  
  // Status
  status: 'active' | 'expired' | 'revoked';
  
  // Actions taken
  actionsTaken: EmergencyAccessAction[];
  
  // Post-access review
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Credential rotation
  credentialsRotated: boolean;
  credentialsRotatedAt?: string;
  credentialsRotatedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyAccessAction {
  id: string;
  sessionId: string;
  action: string;
  details: Record<string, any>;
  performedAt: string;
}

// ============================================================================
// Audit Trail
// ============================================================================

export interface PlatformAuditEntry {
  id: string;
  
  // Action
  action: string;
  category: 'user_management' | 'system_config' | 'maintenance' | 'security' | 'backup' | 'emergency_access';
  
  // Actor
  performedBy: string;
  performedByRole: string;
  performedAt: string;
  
  // Target
  targetType?: string;
  targetId?: string;
  targetName?: string;
  
  // Details
  details: Record<string, any>;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // Confirmation
  confirmationReason: string;
  
  // Approval (if required)
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  
  // IP/Device
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
  
  createdAt: string;
}

// ============================================================================
// Privileged Operations
// ============================================================================

export type PrivilegedOperation = 
  | 'grant_privileged_role'
  | 'revoke_privileged_role'
  | 'deactivate_user'
  | 'reset_user_mfa'
  | 'change_security_policy'
  | 'enable_maintenance_mode'
  | 'clear_cache'
  | 'request_backup_restore'
  | 'initiate_emergency_access'
  | 'change_platform_config';

export interface PrivilegedOperationRequest {
  id: string;
  operation: PrivilegedOperation;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  
  // Details
  details: Record<string, any>;
  
  // MFA
  mfaVerified: boolean;
  mfaVerifiedAt?: string;
  
  // Confirmation
  confirmationProvided: boolean;
  confirmationReason: string;
  
  // Approval (if required)
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  approvalReason?: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  
  // Execution
  executedAt?: string;
  executedBy?: string;
  
  createdAt: string;
  updatedAt: string;
}
