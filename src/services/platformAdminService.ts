/**
 * Part 27 — Platform Administration Service
 */

import { storage } from './storage';
import { 
  PlatformConfiguration,
  UserManagementAction,
  PrivilegedRoleGrant,
  MaintenanceModeConfig,
  CacheClearRequest,
  JobQueueItem,
  SystemHealth,
  BackupRecord,
  RestoreRequest,
  EmergencyAccessSession,
  PlatformAuditEntry,
  PrivilegedOperationRequest,
  WebsiteAdministratorConfig
} from './platformAdminTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { hasPermission } from './permissions';
import { raiseAlert } from './alerts';

// Storage adapters
const platformConfigStore = storage.getAdapter<PlatformConfiguration>('platform_configurations');
const userActionsStore = storage.getAdapter<UserManagementAction>('user_management_actions');
const roleGrantsStore = storage.getAdapter<PrivilegedRoleGrant>('privileged_role_grants');
const cacheRequestsStore = storage.getAdapter<CacheClearRequest>('cache_clear_requests');
const jobQueueStore = storage.getAdapter<JobQueueItem>('job_queue');
const backupStore = storage.getAdapter<BackupRecord>('backup_records');
const restoreRequestsStore = storage.getAdapter<RestoreRequest>('restore_requests');
const emergencySessionsStore = storage.getAdapter<EmergencyAccessSession>('emergency_access_sessions');
const auditStore = storage.getAdapter<PlatformAuditEntry>('platform_audit_entries');
const privilegedOpsStore = storage.getAdapter<PrivilegedOperationRequest>('privileged_operations');
const websiteAdminConfigStore = storage.getAdapter<WebsiteAdministratorConfig>('website_admin_config');

// ============================================================================
// Website Administrator Configuration
// ============================================================================

export async function getWebsiteAdminConfig(): Promise<WebsiteAdministratorConfig> {
  const configs = await websiteAdminConfigStore.findAll();
  if (configs.length === 0) {
    // Return default config
    return {
      id: 'default',
      mfaRequired: true,
      mfaMethod: 'totp',
      sessionLifetimeMinutes: 30,
      reauthRequiredForPrivilegedOps: true,
      ipAllowListEnabled: false,
      ipAllowList: [],
      networkAllowList: [],
      alertOnNewDeviceLogin: true,
      alertOnPrivilegedOperation: true,
      securityOwnerUserId: 'security_owner',
      emergencyAccessEnabled: true,
      emergencyAccessLifetimeMinutes: 60,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return configs[0];
}

export async function updateWebsiteAdminConfig(
  updates: Partial<WebsiteAdministratorConfig>,
  userId: string
): Promise<WebsiteAdministratorConfig> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const config = await getWebsiteAdminConfig();
  const updated = await websiteAdminConfigStore.update(config.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'update_website_admin_config',
    category: 'system_config',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: { updates },
    previousValues: config,
    newValues: updated,
    confirmationReason: 'Website administrator configuration updated',
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}

// ============================================================================
// Platform Configuration
// ============================================================================

export async function getPlatformConfig(): Promise<PlatformConfiguration> {
  const configs = await platformConfigStore.findAll();
  if (configs.length === 0) {
    // Return default config
    return {
      id: 'default',
      companyName: 'ConstructERP',
      primaryColor: '#3b82f6',
      secondaryColor: '#1e40af',
      primaryDomain: 'localhost',
      additionalDomains: [],
      emailTemplates: [],
      smsTemplates: [],
      featureFlags: [],
      defaultTimeZone: 'Asia/Kolkata',
      numberSeriesPrefix: 'CE',
      sessionTimeoutMinutes: 60,
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: false,
      passwordExpiryDays: 90,
      maintenanceModeEnabled: false,
      maintenanceModeMessage: 'System is under maintenance. Please try again later.',
      maintenanceModeBannerColor: 'warning',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
  return configs[0];
}

export async function updatePlatformConfig(
  updates: Partial<PlatformConfiguration>,
  userId: string,
  confirmationReason: string
): Promise<PlatformConfiguration> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const config = await getPlatformConfig();
  const updated = await platformConfigStore.update(config.id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'update_platform_config',
    category: 'system_config',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: { updates },
    previousValues: config,
    newValues: updated,
    confirmationReason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}

// ============================================================================
// User Management
// ============================================================================

export async function recordUserManagementAction(
  action: Omit<UserManagementAction, 'id'>,
  userId: string
): Promise<UserManagementAction> {
  const userAction: UserManagementAction = {
    ...action,
    id: generateId(),
  };

  await userActionsStore.create(userAction);

  await recordPlatformAudit({
    action: `user_management_${action.action}`,
    category: 'user_management',
    performedBy: userId,
    performedByRole: 'website_administrator',
    targetType: 'user',
    targetId: action.targetUserId,
    targetName: action.targetUserName,
    details: action.details,
    confirmationReason: action.confirmationReason,
    requiresApproval: action.requiresApproval,
    approvedBy: action.approvedBy,
    approvedAt: action.approvedAt,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return userAction;
}

export async function requestPrivilegedRoleGrant(
  targetUserId: string,
  targetUserName: string,
  roleGranted: string,
  requestedBy: string,
  approvalReason: string
): Promise<PrivilegedRoleGrant> {
  // Check if requester is trying to grant role to themselves
  if (targetUserId === requestedBy) {
    throw new Error('Cannot grant privileged role to yourself');
  }

  const grant: PrivilegedRoleGrant = {
    id: generateId(),
    targetUserId,
    targetUserName,
    roleGranted,
    requestedBy,
    requestedAt: new Date().toISOString(),
    approvedBy: '',
    approvedAt: '',
    approvalReason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await roleGrantsStore.create(grant);

  // Raise alert for approval
  await raiseAlert({
    ruleCode: 'PRIVILEGED_ROLE_GRANT_REQUEST',
    severity: 'high',
    title: `Privileged Role Grant Request`,
    description: `${requestedBy} requested to grant ${roleGranted} role to ${targetUserName}`,
    module: 'Platform Administration',
    entityType: 'PrivilegedRoleGrant',
    entityId: grant.id,
    responsibleRole: 'website_administrator',
    recommendedAction: 'Review and approve/reject the role grant request',
    dueInHours: 24,
    requestId: generateId(),
  });

  return grant;
}

export async function approvePrivilegedRoleGrant(
  grantId: string,
  approvedBy: string,
  approvalReason: string
): Promise<PrivilegedRoleGrant> {
  const grant = await roleGrantsStore.findById(grantId);
  if (!grant) {
    throw new Error(`Role grant ${grantId} not found`);
  }

  if (grant.status !== 'pending') {
    throw new Error(`Role grant is not pending (current status: ${grant.status})`);
  }

  // Check if approver is the same as requester
  if (grant.requestedBy === approvedBy) {
    throw new Error('Cannot approve your own role grant request');
  }

  const updated = await roleGrantsStore.update(grantId, {
    approvedBy,
    approvedAt: new Date().toISOString(),
    approvalReason,
    status: 'approved',
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'approve_privileged_role_grant',
    category: 'user_management',
    performedBy: approvedBy,
    performedByRole: 'website_administrator',
    targetType: 'user',
    targetId: grant.targetUserId,
    targetName: grant.targetUserName,
    details: { roleGranted: grant.roleGranted, approvalReason },
    confirmationReason: `Approved role grant: ${approvalReason}`,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}

export async function rejectPrivilegedRoleGrant(
  grantId: string,
  rejectedBy: string,
  rejectionReason: string
): Promise<PrivilegedRoleGrant> {
  const grant = await roleGrantsStore.findById(grantId);
  if (!grant) {
    throw new Error(`Role grant ${grantId} not found`);
  }

  const updated = await roleGrantsStore.update(grantId, {
    status: 'rejected',
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'reject_privileged_role_grant',
    category: 'user_management',
    performedBy: rejectedBy,
    performedByRole: 'website_administrator',
    targetType: 'user',
    targetId: grant.targetUserId,
    targetName: grant.targetUserName,
    details: { roleGranted: grant.roleGranted, rejectionReason },
    confirmationReason: `Rejected role grant: ${rejectionReason}`,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}

// ============================================================================
// System Maintenance
// ============================================================================

export async function enableMaintenanceMode(
  message: string,
  bannerColor: 'info' | 'warning' | 'error',
  reason: string,
  expectedDowntimeMinutes: number | undefined,
  userId: string
): Promise<MaintenanceModeConfig> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const config: MaintenanceModeConfig = {
    enabled: true,
    message,
    bannerColor,
    enabledBy: userId,
    enabledAt: new Date().toISOString(),
    reason,
    expectedDowntimeMinutes,
  };

  await updatePlatformConfig({
    maintenanceModeEnabled: true,
    maintenanceModeMessage: message,
    maintenanceModeBannerColor: bannerColor,
  }, userId, reason);

  await recordPlatformAudit({
    action: 'enable_maintenance_mode',
    category: 'maintenance',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: config,
    confirmationReason: reason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  // Raise alert
  await raiseAlert({
    ruleCode: 'MAINTENANCE_MODE_ENABLED',
    severity: 'warning',
    title: `Maintenance Mode Enabled`,
    description: `System maintenance mode enabled by ${userId}. Reason: ${reason}`,
    module: 'Platform Administration',
    entityType: 'PlatformConfiguration',
    entityId: 'platform_config',
    responsibleRole: 'website_administrator',
    recommendedAction: 'Monitor system and disable maintenance mode when complete',
    dueInHours: expectedDowntimeMinutes ? expectedDowntimeMinutes / 60 : 24,
    requestId: generateId(),
  });

  return config;
}

export async function disableMaintenanceMode(
  reason: string,
  userId: string
): Promise<void> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  await updatePlatformConfig({
    maintenanceModeEnabled: false,
  }, userId, reason);

  await recordPlatformAudit({
    action: 'disable_maintenance_mode',
    category: 'maintenance',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: { reason },
    confirmationReason: reason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });
}

export async function requestCacheClear(
  cacheType: 'all' | 'user_sessions' | 'api_responses' | 'dashboard_data' | 'report_data',
  reason: string,
  userId: string
): Promise<CacheClearRequest> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const request: CacheClearRequest = {
    id: generateId(),
    cacheType,
    requestedBy: userId,
    requestedAt: new Date().toISOString(),
    reason,
    status: 'pending',
  };

  await cacheRequestsStore.create(request);

  await recordPlatformAudit({
    action: 'request_cache_clear',
    category: 'maintenance',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: { cacheType, reason },
    confirmationReason: reason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return request;
}

export async function getJobQueue(filters?: {
  status?: string;
  jobType?: string;
}): Promise<JobQueueItem[]> {
  let jobs = await jobQueueStore.findAll();

  if (filters?.status) {
    jobs = jobs.filter(j => j.status === filters.status);
  }
  if (filters?.jobType) {
    jobs = jobs.filter(j => j.jobType === filters.jobType);
  }

  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function retryFailedJob(jobId: string, userId: string): Promise<JobQueueItem> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const job = await jobQueueStore.findById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  if (job.status !== 'failed') {
    throw new Error(`Job is not failed (current status: ${job.status})`);
  }

  const updated = await jobQueueStore.update(jobId, {
    status: 'pending',
    retryCount: job.retryCount + 1,
    errorMessage: undefined,
  });

  await recordPlatformAudit({
    action: 'retry_failed_job',
    category: 'maintenance',
    performedBy: userId,
    performedByRole: 'website_administrator',
    targetType: 'job',
    targetId: jobId,
    details: { jobType: job.jobType },
    confirmationReason: 'Retrying failed job',
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}

// ============================================================================
// Application Monitoring
// ============================================================================

export async function getSystemHealth(): Promise<SystemHealth> {
  // In a real implementation, this would query actual system metrics
  // For now, return mock data
  return {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    database: {
      status: 'healthy',
      latency: 5,
      lastChecked: new Date().toISOString(),
    },
    cache: {
      status: 'healthy',
      latency: 2,
      lastChecked: new Date().toISOString(),
    },
    queue: {
      status: 'healthy',
      latency: 10,
      lastChecked: new Date().toISOString(),
    },
    integrations: [],
    activeUsers: 42,
    requestsPerMinute: 150,
    errorRate: 0.5,
    averageResponseTime: 250,
    activeAlerts: [],
  };
}

// ============================================================================
// Backup Management
// ============================================================================

export async function getBackupHistory(): Promise<BackupRecord[]> {
  return backupStore.findAll();
}

export async function requestBackupRestore(
  backupId: string,
  reason: string,
  requestedBy: string
): Promise<RestoreRequest> {
  await hasPermission({
    userId: requestedBy,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const backup = await backupStore.findById(backupId);
  if (!backup) {
    throw new Error(`Backup ${backupId} not found`);
  }

  const request: RestoreRequest = {
    id: generateId(),
    backupId,
    requestedBy,
    requestedAt: new Date().toISOString(),
    reason,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await restoreRequestsStore.create(request);

  // Raise alert for approval
  await raiseAlert({
    ruleCode: 'BACKUP_RESTORE_REQUEST',
    severity: 'critical',
    title: `Backup Restore Request`,
    description: `${requestedBy} requested to restore from backup ${backupId}. Reason: ${reason}`,
    module: 'Platform Administration',
    entityType: 'RestoreRequest',
    entityId: request.id,
    responsibleRole: 'website_administrator',
    recommendedAction: 'Review and approve/reject the restore request',
    dueInHours: 4,
    requestId: generateId(),
  });

  await recordPlatformAudit({
    action: 'request_backup_restore',
    category: 'backup',
    performedBy: requestedBy,
    performedByRole: 'website_administrator',
    targetType: 'backup',
    targetId: backupId,
    details: { reason },
    confirmationReason: reason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return request;
}

// ============================================================================
// Emergency Access (Break-Glass)
// ============================================================================

export async function initiateEmergencyAccess(
  accessedBy: string,
  accessReason: string
): Promise<EmergencyAccessSession> {
  const config = await getWebsiteAdminConfig();
  
  if (!config.emergencyAccessEnabled) {
    throw new Error('Emergency access is not enabled');
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.emergencyAccessLifetimeMinutes);

  const session: EmergencyAccessSession = {
    id: generateId(),
    accessedBy,
    accessReason,
    accessedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    alertSentTo: [config.securityOwnerUserId],
    alertSentAt: new Date().toISOString(),
    status: 'active',
    actionsTaken: [],
    credentialsRotated: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await emergencySessionsStore.create(session);

  // Raise critical alert
  await raiseAlert({
    ruleCode: 'EMERGENCY_ACCESS_INITIATED',
    severity: 'critical',
    title: `Emergency Access Initiated`,
    description: `${accessedBy} initiated emergency access. Reason: ${accessReason}. Session expires at ${expiresAt.toISOString()}`,
    module: 'Platform Administration',
    entityType: 'EmergencyAccessSession',
    entityId: session.id,
    responsibleRole: 'website_administrator',
    recommendedAction: 'Monitor emergency access session and ensure credential rotation after use',
    dueInHours: config.emergencyAccessLifetimeMinutes / 60,
    requestId: generateId(),
  });

  await recordPlatformAudit({
    action: 'initiate_emergency_access',
    category: 'emergency_access',
    performedBy: accessedBy,
    performedByRole: 'website_administrator',
    details: { accessReason, expiresAt: expiresAt.toISOString() },
    confirmationReason: accessReason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return session;
}

export async function recordEmergencyAccessAction(
  sessionId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  const session = await emergencySessionsStore.findById(sessionId);
  if (!session) {
    throw new Error(`Emergency session ${sessionId} not found`);
  }

  if (session.status !== 'active') {
    throw new Error(`Emergency session is not active (current status: ${session.status})`);
  }

  const emergencyAction = {
    id: generateId(),
    sessionId,
    action,
    details,
    performedAt: new Date().toISOString(),
  };

  await emergencySessionsStore.update(sessionId, {
    actionsTaken: [...session.actionsTaken, emergencyAction],
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: `emergency_access_${action}`,
    category: 'emergency_access',
    performedBy: session.accessedBy,
    performedByRole: 'website_administrator',
    details,
    confirmationReason: `Emergency access action: ${action}`,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });
}

export async function expireEmergencyAccess(sessionId: string): Promise<void> {
  const session = await emergencySessionsStore.findById(sessionId);
  if (!session) {
    throw new Error(`Emergency session ${sessionId} not found`);
  }

  await emergencySessionsStore.update(sessionId, {
    status: 'expired',
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'expire_emergency_access',
    category: 'emergency_access',
    performedBy: 'system',
    performedByRole: 'system',
    targetType: 'emergency_session',
    targetId: sessionId,
    details: { accessedBy: session.accessedBy },
    confirmationReason: 'Emergency access session expired',
    ipAddress: '127.0.0.1',
    userAgent: 'System',
  });
}

export async function reviewEmergencyAccess(
  sessionId: string,
  reviewedBy: string,
  reviewNotes: string
): Promise<void> {
  const session = await emergencySessionsStore.findById(sessionId);
  if (!session) {
    throw new Error(`Emergency session ${sessionId} not found`);
  }

  await emergencySessionsStore.update(sessionId, {
    reviewedBy,
    reviewedAt: new Date().toISOString(),
    reviewNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'review_emergency_access',
    category: 'emergency_access',
    performedBy: reviewedBy,
    performedByRole: 'website_administrator',
    targetType: 'emergency_session',
    targetId: sessionId,
    details: { reviewNotes, actionsCount: session.actionsTaken.length },
    confirmationReason: reviewNotes,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });
}

export async function rotateEmergencyCredentials(
  sessionId: string,
  rotatedBy: string
): Promise<void> {
  const session = await emergencySessionsStore.findById(sessionId);
  if (!session) {
    throw new Error(`Emergency session ${sessionId} not found`);
  }

  await emergencySessionsStore.update(sessionId, {
    credentialsRotated: true,
    credentialsRotatedAt: new Date().toISOString(),
    credentialsRotatedBy: rotatedBy,
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'rotate_emergency_credentials',
    category: 'emergency_access',
    performedBy: rotatedBy,
    performedByRole: 'website_administrator',
    targetType: 'emergency_session',
    targetId: sessionId,
    details: {},
    confirmationReason: 'Emergency credentials rotated',
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });
}

// ============================================================================
// Audit Trail
// ============================================================================

async function recordPlatformAudit(
  entry: {
    action: string;
    category: 'user_management' | 'system_config' | 'maintenance' | 'security' | 'backup' | 'emergency_access';
    performedBy: string;
    performedByRole: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    details: Record<string, any>;
    previousValues?: Record<string, any>;
    newValues?: Record<string, any>;
    confirmationReason: string;
    requiresApproval?: boolean;
    approvedBy?: string;
    approvedAt?: string;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
  }
): Promise<void> {
  const auditEntry: PlatformAuditEntry = {
    id: generateId(),
    action: entry.action,
    category: entry.category,
    performedBy: entry.performedBy,
    performedByRole: entry.performedByRole,
    performedAt: new Date().toISOString(),
    targetType: entry.targetType,
    targetId: entry.targetId,
    targetName: entry.targetName,
    details: entry.details,
    previousValues: entry.previousValues,
    newValues: entry.newValues,
    confirmationReason: entry.confirmationReason,
    requiresApproval: entry.requiresApproval || false,
    approvedBy: entry.approvedBy,
    approvedAt: entry.approvedAt,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    deviceId: entry.deviceId,
    createdAt: new Date().toISOString(),
  };

  await auditStore.create(auditEntry);
}

export async function getPlatformAuditTrail(filters?: {
  category?: string;
  performedBy?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<PlatformAuditEntry[]> {
  let entries = await auditStore.findAll();

  if (filters?.category) {
    entries = entries.filter(e => e.category === filters.category);
  }
  if (filters?.performedBy) {
    entries = entries.filter(e => e.performedBy === filters.performedBy);
  }
  if (filters?.fromDate) {
    entries = entries.filter(e => e.performedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    entries = entries.filter(e => e.performedAt <= filters.toDate!);
  }

  return entries.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
}

// ============================================================================
// Privileged Operations
// ============================================================================

export async function requestPrivilegedOperation(
  operation: PrivilegedOperationRequest,
  userId: string
): Promise<PrivilegedOperationRequest> {
  await hasPermission({
    userId,
    role: 'website_administrator',
    action: 'edit',
    resource: 'platform_config',
  });

  const config = await getWebsiteAdminConfig();

  // Check MFA verification
  if (config.mfaRequired && !operation.mfaVerified) {
    throw new Error('MFA verification required for privileged operations');
  }

  // Check confirmation
  if (!operation.confirmationProvided) {
    throw new Error('Confirmation required for privileged operations');
  }

  const request: PrivilegedOperationRequest = {
    ...operation,
    id: generateId(),
    requestedBy: userId,
    requestedAt: new Date().toISOString(),
    status: operation.requiresApproval ? 'pending' : 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await privilegedOpsStore.create(request);

  if (operation.requiresApproval) {
    // Raise alert for approval
    await raiseAlert({
      ruleCode: 'PRIVILEGED_OPERATION_REQUEST',
      severity: 'high',
      title: `Privileged Operation Request`,
      description: `${userId} requested privileged operation: ${operation.operation}`,
      module: 'Platform Administration',
      entityType: 'PrivilegedOperationRequest',
      entityId: request.id,
      responsibleRole: 'website_administrator',
      recommendedAction: 'Review and approve/reject the privileged operation',
      dueInHours: 4,
      requestId: generateId(),
    });
  }

  await recordPlatformAudit({
    action: `request_privileged_operation_${operation.operation}`,
    category: 'security',
    performedBy: userId,
    performedByRole: 'website_administrator',
    details: operation.details,
    confirmationReason: operation.confirmationReason,
    requiresApproval: operation.requiresApproval,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return request;
}

export async function approvePrivilegedOperation(
  requestId: string,
  approvedBy: string,
  approvalReason: string
): Promise<PrivilegedOperationRequest> {
  const request = await privilegedOpsStore.findById(requestId);
  if (!request) {
    throw new Error(`Privileged operation request ${requestId} not found`);
  }

  if (request.status !== 'pending') {
    throw new Error(`Request is not pending (current status: ${request.status})`);
  }

  const updated = await privilegedOpsStore.update(requestId, {
    approvedBy,
    approvedAt: new Date().toISOString(),
    approvalReason,
    status: 'approved',
    updatedAt: new Date().toISOString(),
  });

  await recordPlatformAudit({
    action: 'approve_privileged_operation',
    category: 'security',
    performedBy: approvedBy,
    performedByRole: 'website_administrator',
    targetType: 'privileged_operation',
    targetId: requestId,
    details: { operation: request.operation, approvalReason },
    confirmationReason: approvalReason,
    ipAddress: '127.0.0.1',
    userAgent: 'Platform Admin Console',
  });

  return updated;
}
