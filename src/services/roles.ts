/**
 * Part 03 — Role Definitions & Seeding
 *
 * Configurable roles (not hard-coded). Each role has a set of default permissions
 * that can be customized per company/project/site.
 */

import { storage } from './storage';
import { UserRole, UserScope } from './types';
import { generateId } from './utils';

// ============================================================================
// Role Definitions
// ============================================================================

export interface RoleDefinition {
  id: string;
  code: UserRole;
  name: string;
  description: string;
  category: 'executive' | 'management' | 'operational' | 'technical' | 'support' | 'readonly';
  defaultScopes: UserScope['type'][];
  canApprove: boolean;
  canPost: boolean;
  canAdmin: boolean;
  isActive: boolean;
  createdAt: string;
}

const rolesStore = storage.getAdapter<RoleDefinition>('role_definitions');

// ============================================================================
// Seed Default Roles
// ============================================================================

export async function seedDefaultRoles(): Promise<void> {
  const existing = await rolesStore.findAll();
  if (existing.length > 0) return;

  const roles: Omit<RoleDefinition, 'id' | 'createdAt'>[] = [
    // Executive
    {
      code: 'super_admin',
      name: 'System Administrator',
      description: 'Full system access, configuration, user management',
      category: 'executive',
      defaultScopes: ['company'],
      canApprove: true,
      canPost: true,
      canAdmin: true,
      isActive: true,
    },
    {
      code: 'company_admin',
      name: 'Managing Director / CEO / Director',
      description: 'Company-wide oversight, financial approval, strategic decisions',
      category: 'executive',
      defaultScopes: ['company'],
      canApprove: true,
      canPost: true,
      canAdmin: false,
      isActive: true,
    },

    // Management
    {
      code: 'project_manager',
      name: 'Project Manager / Project Director',
      description: 'Project-level oversight, budget approval, resource allocation',
      category: 'management',
      defaultScopes: ['company', 'project'],
      canApprove: true,
      canPost: true,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'site_manager',
      name: 'Site Manager',
      description: 'Site-level operations, daily approvals, resource coordination',
      category: 'management',
      defaultScopes: ['project', 'site'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'fleet_manager',
      name: 'Fleet Manager',
      description: 'Fleet operations, maintenance approval, fuel oversight',
      category: 'management',
      defaultScopes: ['company', 'project'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'plant_manager',
      name: 'RMC Plant Manager',
      description: 'Plant operations, batch approval, quality oversight',
      category: 'management',
      defaultScopes: ['plant'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'maintenance_manager',
      name: 'Maintenance Manager',
      description: 'Maintenance planning, work order approval, spare parts',
      category: 'management',
      defaultScopes: ['company', 'project'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'qc_manager',
      name: 'Quality Control Manager',
      description: 'Quality oversight, test approval, compliance',
      category: 'management',
      defaultScopes: ['company', 'project', 'plant'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'accounts_manager',
      name: 'Finance Manager / Accountant',
      description: 'Financial oversight, voucher posting, reporting',
      category: 'management',
      defaultScopes: ['company'],
      canApprove: true,
      canPost: true,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'dispatch_manager',
      name: 'Dispatch Manager',
      description: 'Dispatch operations, logistics coordination',
      category: 'management',
      defaultScopes: ['plant', 'project'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },

    // Operational
    {
      code: 'site_engineer',
      name: 'Site Engineer / Site Supervisor',
      description: 'Site execution, daily reporting, material coordination',
      category: 'operational',
      defaultScopes: ['site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'fleet_supervisor',
      name: 'Fleet Supervisor',
      description: 'Fleet daily operations, operator coordination',
      category: 'operational',
      defaultScopes: ['project', 'site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'fuel_officer',
      name: 'Fuel In-charge / Fuel Attendant',
      description: 'Fuel issuance, daily verification, meter readings',
      category: 'operational',
      defaultScopes: ['site', 'plant'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'store_keeper',
      name: 'Storekeeper',
      description: 'Inventory management, material issuance, GRN',
      category: 'operational',
      defaultScopes: ['site', 'plant'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },

    // Technical
    {
      code: 'operator',
      name: 'Equipment Operator / Driver / Plant Operator',
      description: 'Equipment operation, daily log submission, photo evidence',
      category: 'technical',
      defaultScopes: ['site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'technician',
      name: 'Technician',
      description: 'Maintenance execution, repair work, calibration',
      category: 'technical',
      defaultScopes: ['site', 'plant'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'lab_staff',
      name: 'Laboratory Staff',
      description: 'Quality testing, cube casting, slump tests',
      category: 'technical',
      defaultScopes: ['plant', 'site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'calibration_officer',
      name: 'Calibration Officer',
      description: 'Equipment calibration, benchmark verification',
      category: 'technical',
      defaultScopes: ['company', 'plant'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },

    // Support
    {
      code: 'procurement_officer',
      name: 'Procurement Officer',
      description: 'Purchase orders, vendor coordination, material sourcing',
      category: 'support',
      defaultScopes: ['company', 'project'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'accounts_executive',
      name: 'Accounts Executive',
      description: 'Voucher entry, payment processing, reconciliation',
      category: 'support',
      defaultScopes: ['company'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'logistics_staff',
      name: 'Logistics Staff',
      description: 'Dispatch coordination, transit tracking, delivery confirmation',
      category: 'support',
      defaultScopes: ['plant', 'site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'general_staff',
      name: 'General Staff',
      description: 'General access, basic operations, attendance',
      category: 'support',
      defaultScopes: ['site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },

    // Add-on roles (Parts 26-33)
    {
      code: 'hr_manager',
      name: 'HR Manager',
      description: 'HR operations, attendance approval, leave management, payroll oversight',
      category: 'management',
      defaultScopes: ['company', 'department'],
      canApprove: true,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'hr_executive',
      name: 'HR Executive',
      description: 'HR operations, attendance processing, leave tracking',
      category: 'support',
      defaultScopes: ['company', 'department'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },

    // Read-only
    {
      code: 'auditor',
      name: 'Auditor (Read-Only)',
      description: 'Full read access to all records, audit trails, reports',
      category: 'readonly',
      defaultScopes: ['company'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
    {
      code: 'viewer',
      name: 'Viewer / Authorized Chat User',
      description: 'Read-only access, chat participation',
      category: 'readonly',
      defaultScopes: ['company', 'project', 'site'],
      canApprove: false,
      canPost: false,
      canAdmin: false,
      isActive: true,
    },
  ];

  for (const role of roles) {
    await rolesStore.create({
      ...role,
      id: generateId(),
      createdAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Role Queries
// ============================================================================

export async function getRoleDefinition(code: UserRole): Promise<RoleDefinition | null> {
  return rolesStore.findOne({ code } as Partial<RoleDefinition>);
}

export async function listRoleDefinitions(): Promise<RoleDefinition[]> {
  return rolesStore.findAll();
}

export async function createRoleDefinition(
  data: Omit<RoleDefinition, 'id' | 'createdAt'>
): Promise<RoleDefinition> {
  const existing = await rolesStore.findOne({ code: data.code } as Partial<RoleDefinition>);
  if (existing) {
    throw new Error(`Role with code '${data.code}' already exists`);
  }

  const role: RoleDefinition = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  return rolesStore.create(role);
}

export async function updateRoleDefinition(
  id: string,
  updates: Partial<RoleDefinition>
): Promise<RoleDefinition> {
  return rolesStore.update(id, updates);
}

export async function canRoleApprove(code: UserRole): Promise<boolean> {
  const role = await getRoleDefinition(code);
  return role?.canApprove || false;
}

export async function canRolePost(code: UserRole): Promise<boolean> {
  const role = await getRoleDefinition(code);
  return role?.canPost || false;
}
