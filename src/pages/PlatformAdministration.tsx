import React, { useState, useEffect } from 'react';
import {
  getPlatformConfig,
  updatePlatformConfig,
  getWebsiteAdminConfig,
  updateWebsiteAdminConfig,
  requestPrivilegedRoleGrant,
  approvePrivilegedRoleGrant,
  rejectPrivilegedRoleGrant,
  enableMaintenanceMode,
  disableMaintenanceMode,
  requestCacheClear,
  getJobQueue,
  retryFailedJob,
  getSystemHealth,
  getBackupHistory,
  requestBackupRestore,
  initiateEmergencyAccess,
  getPlatformAuditTrail,
  requestPrivilegedOperation,
} from '../services/platformAdminService';
import {
  PlatformConfiguration,
  WebsiteAdministratorConfig,
  PrivilegedRoleGrant,
  MaintenanceModeConfig,
  JobQueueItem,
  SystemHealth,
  BackupRecord,
  EmergencyAccessSession,
  PlatformAuditEntry,
} from '../services/platformAdminTypes';
import {
  Settings,
  Users,
  Shield,
  AlertTriangle,
  Database,
  Activity,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit,
  Save,
  X,
} from 'lucide-react';

type TabType = 'config' | 'users' | 'maintenance' | 'monitoring' | 'backup' | 'emergency' | 'audit';

export default function PlatformAdministration() {
  const [activeTab, setActiveTab] = useState<TabType>('config');
  const [platformConfig, setPlatformConfig] = useState<PlatformConfiguration | null>(null);
  const [adminConfig, setAdminConfig] = useState<WebsiteAdministratorConfig | null>(null);
  const [roleGrants, setRoleGrants] = useState<PrivilegedRoleGrant[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState<MaintenanceModeConfig | null>(null);
  const [jobQueue, setJobQueue] = useState<JobQueueItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<PlatformAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [mfaVerified, setMfaVerified] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'config':
          const [pConfig, aConfig] = await Promise.all([
            getPlatformConfig(),
            getWebsiteAdminConfig(),
          ]);
          setPlatformConfig(pConfig);
          setAdminConfig(aConfig);
          break;
        case 'users':
          // Load role grants (would need to add this function)
          break;
        case 'maintenance':
          const [jobs, health] = await Promise.all([
            getJobQueue(),
            getSystemHealth(),
          ]);
          setJobQueue(jobs);
          setSystemHealth(health);
          break;
        case 'backup':
          const backupHistory = await getBackupHistory();
          setBackups(backupHistory);
          break;
        case 'audit':
          const audit = await getPlatformAuditTrail();
          setAuditTrail(audit);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerification = () => {
    // In real implementation, this would trigger MFA flow
    setMfaVerified(true);
    alert('MFA verification successful (demo mode)');
  };

  const handleUpdatePlatformConfig = async (updates: Partial<PlatformConfiguration>) => {
    if (!mfaVerified) {
      alert('MFA verification required for privileged operations');
      return;
    }

    const reason = prompt('Enter reason for this change:');
    if (!reason) return;

    try {
      const updated = await updatePlatformConfig(updates, 'current_user', reason);
      setPlatformConfig(updated);
      alert('Platform configuration updated successfully');
    } catch (error) {
      alert(`Failed to update configuration: ${(error as Error).message}`);
    }
  };

  const handleEnableMaintenanceMode = async () => {
    if (!mfaVerified) {
      alert('MFA verification required for privileged operations');
      return;
    }

    const message = prompt('Enter maintenance mode message:');
    if (!message) return;

    const reason = prompt('Enter reason for enabling maintenance mode:');
    if (!reason) return;

    try {
      const config = await enableMaintenanceMode(
        message,
        'warning',
        reason,
        undefined,
        'current_user'
      );
      setMaintenanceMode(config);
      alert('Maintenance mode enabled');
    } catch (error) {
      alert(`Failed to enable maintenance mode: ${(error as Error).message}`);
    }
  };

  const handleDisableMaintenanceMode = async () => {
    if (!mfaVerified) {
      alert('MFA verification required for privileged operations');
      return;
    }

    const reason = prompt('Enter reason for disabling maintenance mode:');
    if (!reason) return;

    try {
      await disableMaintenanceMode(reason, 'current_user');
      setMaintenanceMode(null);
      alert('Maintenance mode disabled');
    } catch (error) {
      alert(`Failed to disable maintenance mode: ${(error as Error).message}`);
    }
  };

  const handleInitiateEmergencyAccess = async () => {
    const reason = prompt('Enter reason for emergency access:');
    if (!reason) return;

    const confirmation = confirm(
      'EMERGENCY ACCESS WARNING\n\n' +
      'This action will:\n' +
      '1. Grant you temporary administrative access\n' +
      '2. Send alerts to security owners\n' +
      '3. Log all actions in audit trail\n' +
      '4. Expire after 60 minutes\n\n' +
      'Are you sure you want to proceed?'
    );

    if (!confirmation) return;

    try {
      const session = await initiateEmergencyAccess('current_user', reason);
      alert(`Emergency access initiated. Session ID: ${session.id}\nExpires at: ${session.expiresAt}`);
    } catch (error) {
      alert(`Failed to initiate emergency access: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading platform administration...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Platform Administration
        </h1>
        <p className="text-gray-600 mt-1">
          Manage website configuration, users, and system maintenance
        </p>
      </div>

      {/* MFA Status */}
      {!mfaVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">MFA Verification Required</h3>
              <p className="text-sm text-amber-800 mt-1">
                Multi-factor authentication is required for privileged operations.
              </p>
              <button
                onClick={handleMfaVerification}
                className="mt-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Verify MFA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Configuration
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Users
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Maintenance
          </button>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'monitoring'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Monitoring
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'backup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Backup
          </button>
          <button
            onClick={() => setActiveTab('emergency')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'emergency'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Emergency
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Audit
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && platformConfig && adminConfig && (
        <div className="space-y-6">
          {/* Platform Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Configuration</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={platformConfig.companyName}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Domain</label>
                <input
                  type="text"
                  value={platformConfig.primaryDomain}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, primaryDomain: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Time Zone</label>
                <select
                  value={platformConfig.defaultTimeZone}
                  onChange={(e) => setPlatformConfig({ ...platformConfig, defaultTimeZone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>
              <button
                onClick={() => handleUpdatePlatformConfig(platformConfig)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Changes
              </button>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Security Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">MFA Required for Website Administrators</p>
                  <p className="text-xs text-gray-500">Enforce multi-factor authentication</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adminConfig.mfaRequired}
                    onChange={(e) => setAdminConfig({ ...adminConfig, mfaRequired: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Lifetime (minutes)</label>
                <input
                  type="number"
                  value={adminConfig.sessionLifetimeMinutes}
                  onChange={(e) => setAdminConfig({ ...adminConfig, sessionLifetimeMinutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleUpdatePlatformConfig({} as any)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4 inline mr-2" />
                Save Security Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Mode</h2>
            {maintenanceMode?.enabled ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-red-900">Maintenance Mode Active</h3>
                      <p className="text-sm text-red-800 mt-1">{maintenanceMode.message}</p>
                      <p className="text-xs text-red-600 mt-2">
                        Enabled by {maintenanceMode.enabledBy} at {new Date(maintenanceMode.enabledAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleDisableMaintenanceMode}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Disable Maintenance Mode
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Maintenance mode is currently disabled.</p>
                <button
                  onClick={handleEnableMaintenanceMode}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Enable Maintenance Mode
                </button>
              </div>
            )}
          </div>

          {/* Job Queue */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Queue</h2>
            <div className="space-y-2">
              {jobQueue.length === 0 ? (
                <p className="text-sm text-gray-500">No jobs in queue</p>
              ) : (
                jobQueue.map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.jobType}</p>
                      <p className="text-xs text-gray-500">
                        Status: {job.status} | Retries: {job.retryCount}/{job.maxRetries}
                      </p>
                    </div>
                    {job.status === 'failed' && (
                      <button
                        onClick={() => retryFailedJob(job.id, 'current_user')}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        <RefreshCw className="w-4 h-4 inline mr-1" />
                        Retry
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* System Health */}
          {systemHealth && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Status</p>
                  <p className={`text-lg font-bold ${
                    systemHealth.status === 'healthy' ? 'text-green-600' :
                    systemHealth.status === 'degraded' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {systemHealth.status}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-lg font-bold text-gray-900">{systemHealth.activeUsers}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Requests/min</p>
                  <p className="text-lg font-bold text-gray-900">{systemHealth.requestsPerMinute}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Error Rate</p>
                  <p className="text-lg font-bold text-gray-900">{systemHealth.errorRate}%</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'emergency' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900">Emergency Access (Break-Glass)</h2>
                <p className="text-sm text-red-800 mt-2">
                  Emergency access provides temporary administrative privileges when normal access is unavailable.
                  All actions are audited and the session expires automatically after 60 minutes.
                </p>
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-red-900">Use only when:</p>
                  <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
                    <li>All Website Administrators are unavailable</li>
                    <li>MFA devices are lost or compromised</li>
                    <li>System lockout due to security incident</li>
                    <li>Critical system failure requiring immediate intervention</li>
                  </ul>
                </div>
                <button
                  onClick={handleInitiateEmergencyAccess}
                  className="mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  <AlertTriangle className="w-5 h-5 inline mr-2" />
                  Initiate Emergency Access
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Access Procedure</h2>
            <div className="space-y-3 text-sm text-gray-700">
              <p><strong>Step 1:</strong> Obtain authorization from Executive Director, CFO, or CTO</p>
              <p><strong>Step 2:</strong> Retrieve emergency credentials from secure location</p>
              <p><strong>Step 3:</strong> Login with emergency username, password, and MFA</p>
              <p><strong>Step 4:</strong> Perform necessary administrative actions (all logged)</p>
              <p><strong>Step 5:</strong> Session automatically expires after 60 minutes</p>
              <p><strong>Step 6:</strong> Conduct post-access review within 24 hours</p>
              <p><strong>Step 7:</strong> Rotate emergency credentials within 48 hours</p>
            </div>
            <a
              href="/docs/erp/EMERGENCY_ACCESS.md"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-blue-600 hover:text-blue-900 text-sm"
            >
              View full procedure documentation →
            </a>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Audit Trail</h2>
          <div className="space-y-2">
            {auditTrail.length === 0 ? (
              <p className="text-sm text-gray-500">No audit entries found</p>
            ) : (
              auditTrail.slice(0, 50).map((entry) => (
                <div key={entry.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                      <p className="text-xs text-gray-500">
                        {entry.category} | {entry.performedBy} ({entry.performedByRole})
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(entry.performedAt).toLocaleString()}
                    </p>
                  </div>
                  {entry.targetType && (
                    <p className="text-xs text-gray-600 mt-1">
                      Target: {entry.targetType} {entry.targetName || entry.targetId}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Reason: {entry.confirmationReason}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Management</h2>
          <p className="text-sm text-gray-600">User management interface (to be implemented)</p>
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Monitoring</h2>
          <p className="text-sm text-gray-600">Monitoring dashboard (to be implemented)</p>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup Management</h2>
          <div className="space-y-2">
            {backups.length === 0 ? (
              <p className="text-sm text-gray-500">No backups found</p>
            ) : (
              backups.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{backup.backupType} Backup</p>
                    <p className="text-xs text-gray-500">
                      {new Date(backup.createdAt).toLocaleString()} | {(backup.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${
                    backup.status === 'completed' ? 'bg-green-100 text-green-800' :
                    backup.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {backup.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
