import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  GitBranch,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { UserRole } from '../services/types';
import {
  listRoleDefinitions,
  createRoleDefinition,
  updateRoleDefinition,
  RoleDefinition,
} from '../services/roles';
import {
  getRolePermissions,
  grantPermission,
  revokePermission,
  PermissionDefinition,
  PermissionAction,
  PermissionResource,
  PermissionScope,
} from '../services/permissions';
import {
  getUserDelegations,
  createDelegation,
  revokeDelegation,
  Delegation,
} from '../services/delegation';
import {
  getAllApprovalRules,
  createApprovalRule,
  deleteApprovalRule,
  ApprovalRule,
} from '../services/approvalMatrix';

type Tab = 'roles' | 'permissions' | 'delegations' | 'approval-matrix';

export default function AdminPermissions() {
  const [activeTab, setActiveTab] = useState<Tab>('roles');
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'roles') {
        const roleList = await listRoleDefinitions();
        setRoles(roleList);
      } else if (activeTab === 'permissions' && selectedRole) {
        const perms = await getRolePermissions(selectedRole);
        setPermissions(perms);
      } else if (activeTab === 'delegations') {
        // Get all delegations (in production, filter by current user)
        const dels = await getUserDelegations('system', 'both');
        setDelegations(dels);
      } else if (activeTab === 'approval-matrix') {
        const rules = await getAllApprovalRules();
        setApprovalRules(rules);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7" />
          Permissions & Roles Administration
        </h1>
        <p className="text-gray-600 mt-1">
          Manage roles, permissions, delegations, and approval rules
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <TabButton
            icon={<Users className="w-4 h-4" />}
            label="Roles"
            active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
          />
          <TabButton
            icon={<Shield className="w-4 h-4" />}
            label="Permissions"
            active={activeTab === 'permissions'}
            onClick={() => setActiveTab('permissions')}
          />
          <TabButton
            icon={<GitBranch className="w-4 h-4" />}
            label="Delegations"
            active={activeTab === 'delegations'}
            onClick={() => setActiveTab('delegations')}
          />
          <TabButton
            icon={<Settings className="w-4 h-4" />}
            label="Approval Matrix"
            active={activeTab === 'approval-matrix'}
            onClick={() => setActiveTab('approval-matrix')}
          />
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : (
        <>
          {activeTab === 'roles' && (
            <RolesTab roles={roles} onReload={loadData} />
          )}
          {activeTab === 'permissions' && (
            <PermissionsTab
              roles={roles}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              permissions={permissions}
              onReload={loadData}
            />
          )}
          {activeTab === 'delegations' && (
            <DelegationsTab delegations={delegations} onReload={loadData} />
          )}
          {activeTab === 'approval-matrix' && (
            <ApprovalMatrixTab rules={approvalRules} onReload={loadData} />
          )}
        </>
      )}
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function RolesTab({
  roles,
  onReload,
}: {
  roles: RoleDefinition[];
  onReload: () => void;
}) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Role Definitions ({roles.length})
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Can Approve
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Can Post
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {role.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {role.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                    {role.category}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {role.canApprove ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {role.canPost ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PermissionsTab({
  roles,
  selectedRole,
  onSelectRole,
  permissions,
  onReload,
}: {
  roles: RoleDefinition[];
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole | null) => void;
  permissions: PermissionDefinition[];
  onReload: () => void;
}) {
  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Role
        </label>
        <select
          value={selectedRole || ''}
          onChange={(e) => onSelectRole(e.target.value as UserRole || null)}
          className="block w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Select a role --</option>
          {roles.map((role) => (
            <option key={role.code} value={role.code}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {selectedRole && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Permissions for {selectedRole} ({permissions.length})
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Permission
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scopes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {perm.resource}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {perm.actions.map((action) => (
                          <span
                            key={action}
                            className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1">
                        {perm.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function DelegationsTab({
  delegations,
  onReload,
}: {
  delegations: Delegation[];
  onReload: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Active Delegations ({delegations.length})
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Create Delegation
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delegator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Delegate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {delegations.map((del) => (
              <tr key={del.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {del.delegatorId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {del.delegateId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {del.resourceType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(del.startDate).toLocaleDateString()} -{' '}
                  {new Date(del.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      del.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : del.status === 'expired'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {del.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {del.status === 'active' && (
                    <button className="text-red-600 hover:text-red-900">
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApprovalMatrixTab({
  rules,
  onReload,
}: {
  rules: ApprovalRule[];
  onReload: () => void;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Approval Rules ({rules.length})
        </h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Condition
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Required Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {rule.resourceType}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {rule.condition.type === 'always'
                      ? 'Always'
                      : `${rule.condition.field} ${rule.condition.operator} ${rule.condition.value}`}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {rule.requiredRole}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  Level {rule.requiredLevel || 1}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {rule.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-red-600 hover:text-red-900">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
