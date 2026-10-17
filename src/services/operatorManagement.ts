/**
 * Part 05 — Operator Management Service
 * 
 * Manages operators and drivers, including licence validation,
 * competency tracking, and assignment validation.
 */

import { storage } from './storage';
import { Operator, OperatorCertificate, OperatorTraining, OperatorCompetency, AssignmentValidation } from './assetLifecycleTypes';
import { AssetCategory } from './assetTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { hasPermission } from './permissions';

const operatorsStore = storage.getAdapter<Operator>('operators');

// ============================================================================
// Operator Management
// ============================================================================

export async function createOperator(
  data: Omit<Operator, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  userId: string
): Promise<Operator> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'create',
    resource: 'operator',
  });

  const operator: Operator = {
    ...data,
    id: generateId(),
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    updatedBy: userId,
  };

  await operatorsStore.create(operator);

  await recordAudit({
    entityType: 'Operator',
    entityId: operator.id,
    action: 'create',
    before: null,
    after: operator as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Operator created',
  });

  return operator;
}

export async function getOperator(id: string): Promise<Operator | null> {
  return operatorsStore.findById(id);
}

export async function listOperators(filters?: {
  type?: 'internal' | 'subcontractor' | 'hired';
  status?: 'active' | 'inactive' | 'suspended' | 'terminated';
}): Promise<Operator[]> {
  let operators = await operatorsStore.findAll();

  if (filters?.type) {
    operators = operators.filter(o => o.type === filters.type);
  }
  if (filters?.status) {
    operators = operators.filter(o => o.status === filters.status);
  }

  return operators;
}

export async function updateOperator(
  id: string,
  updates: Partial<Operator>,
  userId: string
): Promise<Operator> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'operator',
  });

  const operator = await operatorsStore.findById(id);
  if (!operator) {
    throw new Error(`Operator ${id} not found`);
  }

  const updated = await operatorsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'Operator',
    entityId: id,
    action: 'update',
    before: operator as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Operator updated',
  });

  return updated;
}

// ============================================================================
// Certificate Management
// ============================================================================

export async function addCertificate(
  operatorId: string,
  certificate: Omit<OperatorCertificate, 'id' | 'alertSent'>,
  userId: string
): Promise<Operator> {
  const operator = await operatorsStore.findById(operatorId);
  if (!operator) {
    throw new Error(`Operator ${operatorId} not found`);
  }

  const newCert: OperatorCertificate = {
    ...certificate,
    id: generateId(),
    alertSent: false,
  };

  const updated = await operatorsStore.update(operatorId, {
    certificates: [...operator.certificates, newCert],
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'Operator',
    entityId: operatorId,
    action: 'update',
    before: operator as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: `Certificate added: ${certificate.type}`,
  });

  return updated;
}

export async function addCompetency(
  operatorId: string,
  competency: Omit<OperatorCompetency, 'id'>,
  userId: string
): Promise<Operator> {
  const operator = await operatorsStore.findById(operatorId);
  if (!operator) {
    throw new Error(`Operator ${operatorId} not found`);
  }

  const newCompetency: OperatorCompetency = {
    ...competency,
    id: generateId(),
  };

  const updated = await operatorsStore.update(operatorId, {
    competencies: [...operator.competencies, newCompetency],
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'Operator',
    entityId: operatorId,
    action: 'update',
    before: operator as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: `Competency added: ${competency.assetCategory}`,
  });

  return updated;
}

// ============================================================================
// Assignment Validation
// ============================================================================

export async function validateOperatorAssignment(
  operatorId: string,
  assetCategory: AssetCategory,
  assignmentDate: string,
  shiftStart: string,
  shiftEnd: string
): Promise<AssignmentValidation> {
  const operator = await operatorsStore.findById(operatorId);
  if (!operator) {
    return {
      valid: false,
      errors: [{ code: 'OPERATOR_NOT_FOUND', message: 'Operator not found', field: 'operatorId' }],
      warnings: [],
    };
  }

  const errors: AssignmentValidation['errors'] = [];
  const warnings: AssignmentValidation['warnings'] = [];

  // Check operator status
  if (operator.status !== 'active') {
    errors.push({
      code: 'OPERATOR_INACTIVE',
      message: `Operator is ${operator.status}`,
      field: 'status',
    });
  }

  // Check licence validity
  if (operator.licenceExpiryDate) {
    const expiryDate = new Date(operator.licenceExpiryDate);
    const assignDate = new Date(assignmentDate);
    if (expiryDate < assignDate) {
      errors.push({
        code: 'LICENCE_EXPIRED',
        message: 'Driving licence has expired',
        field: 'licenceExpiryDate',
      });
    }
  }

  // Check licence class
  if (operator.licenceClass && operator.licenceClass.length > 0) {
    const requiredClass = getRequiredLicenceClass(assetCategory);
    if (requiredClass && !operator.licenceClass.includes(requiredClass)) {
      errors.push({
        code: 'LICENCE_CLASS_MISMATCH',
        message: `Licence class does not cover ${assetCategory}. Required: ${requiredClass}`,
        field: 'licenceClass',
      });
    }
  }

  // Check competency
  const hasCompetency = operator.competencies.some(
    c => c.assetCategory === assetCategory && 
         (!c.validUntil || new Date(c.validUntil) >= new Date(assignmentDate))
  );

  if (!hasCompetency) {
    warnings.push({
      code: 'NO_COMPETENCY',
      message: `No competency recorded for ${assetCategory}`,
      field: 'competencies',
    });
  }

  // Check certificate validity
  const requiredCerts = getRequiredCertificates(assetCategory);
  for (const certType of requiredCerts) {
    const cert = operator.certificates.find(c => c.type === certType);
    if (!cert) {
      errors.push({
        code: 'CERTIFICATE_MISSING',
        message: `Required certificate missing: ${certType}`,
        field: 'certificates',
      });
    } else {
      const expiryDate = new Date(cert.expiryDate);
      const assignDate = new Date(assignmentDate);
      if (expiryDate < assignDate) {
        errors.push({
          code: 'CERTIFICATE_EXPIRED',
          message: `Certificate expired: ${certType}`,
          field: 'certificates',
        });
      }
    }
  }

  // Check medical fitness
  if (operator.medicalFitnessExpiryDate) {
    const expiryDate = new Date(operator.medicalFitnessExpiryDate);
    const assignDate = new Date(assignmentDate);
    if (expiryDate < assignDate) {
      errors.push({
        code: 'MEDICAL_EXPIRED',
        message: 'Medical fitness certificate has expired',
        field: 'medicalFitnessExpiryDate',
      });
    }
  }

  // Check shift overlap (simplified - would need daily deployment data)
  // This would check if operator is already assigned to another asset during this shift

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function getRequiredLicenceClass(category: AssetCategory): string | null {
  const classMap: Record<AssetCategory, string> = {
    earthmoving: 'HMV',
    compaction: 'HMV',
    lifting_handling: 'HMV',
    concrete: 'HMV',
    transport: 'HMV',
    power_air: 'LMV',
    light_support: 'LMV',
  };
  return classMap[category] || null;
}

function getRequiredCertificates(category: AssetCategory): string[] {
  const certMap: Record<AssetCategory, string[]> = {
    earthmoving: ['Equipment Operator Certificate'],
    compaction: ['Equipment Operator Certificate'],
    lifting_handling: ['Crane Operator Certificate'],
    concrete: ['Equipment Operator Certificate'],
    transport: ['Transport Endorsement'],
    power_air: [],
    light_support: [],
  };
  return certMap[category] || [];
}

// ============================================================================
// Document Expiry Alerts
// ============================================================================

export async function checkExpiringDocuments(leadTimeDays: number = 30): Promise<Operator[]> {
  const operators = await operatorsStore.findAll();
  const now = new Date();
  const leadTime = leadTimeDays * 24 * 60 * 60 * 1000;

  return operators.filter(operator => {
    // Check licence expiry
    if (operator.licenceExpiryDate) {
      const expiryDate = new Date(operator.licenceExpiryDate);
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      if (timeUntilExpiry > 0 && timeUntilExpiry <= leadTime) {
        return true;
      }
    }

    // Check certificate expiry
    for (const cert of operator.certificates) {
      const expiryDate = new Date(cert.expiryDate);
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      if (timeUntilExpiry > 0 && timeUntilExpiry <= leadTime && !cert.alertSent) {
        return true;
      }
    }

    // Check medical fitness expiry
    if (operator.medicalFitnessExpiryDate) {
      const expiryDate = new Date(operator.medicalFitnessExpiryDate);
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      if (timeUntilExpiry > 0 && timeUntilExpiry <= leadTime) {
        return true;
      }
    }

    return false;
  });
}

export async function markCertificateAlertSent(operatorId: string, certificateId: string): Promise<void> {
  const operator = await operatorsStore.findById(operatorId);
  if (!operator) return;

  const updatedCerts = operator.certificates.map(cert => {
    if (cert.id === certificateId) {
      return { ...cert, alertSent: true, alertSentAt: new Date().toISOString() };
    }
    return cert;
  });

  await operatorsStore.update(operatorId, { certificates: updatedCerts });
}

// ============================================================================
// Override Assignment
// ============================================================================

export async function overrideAssignmentValidation(
  operatorId: string,
  assetCategory: AssetCategory,
  assignmentDate: string,
  reason: string,
  approvedBy: string
): Promise<void> {
  await hasPermission({
    userId: approvedBy,
    role: 'project_manager',
    action: 'approve',
    resource: 'operator',
  });

  await recordAudit({
    entityType: 'Operator',
    entityId: operatorId,
    action: 'approve',
    before: null,
    after: {
      override: true,
      assetCategory,
      assignmentDate,
      reason,
      approvedBy,
    },
    actorId: approvedBy,
    actorRole: 'project_manager',
    requestId: generateId(),
    reason: `Assignment override: ${reason}`,
  });
}
