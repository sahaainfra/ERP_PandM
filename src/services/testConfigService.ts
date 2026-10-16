/**
 * Part 16 — Test Configuration Service
 */

import { storage } from './storage';
import { TestType, Laboratory, LabEquipment, TestParameter, AcceptanceCriterion } from './qualityTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const testTypesStore = storage.getAdapter<TestType>('test_types');
const labsStore = storage.getAdapter<Laboratory>('laboratories');
const equipmentStore = storage.getAdapter<LabEquipment>('lab_equipment');

// ============================================================================
// Test Type Management
// ============================================================================

export async function createTestType(
   Omit<TestType, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestType> {
  const testType: TestType = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await testTypesStore.create(testType);

  await recordAudit({
    entityType: 'TestType',
    entityId: testType.id,
    action: 'create',
    before: null,
    after: testType as any,
    actorId: data.createdBy,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Test type ${testType.code} created`,
  });

  return testType;
}

export async function getTestType(id: string): Promise<TestType | null> {
  return testTypesStore.findById(id);
}

export async function getTestTypeByCode(code: string): Promise<TestType | null> {
  const all = await testTypesStore.findAll();
  return all.find(t => t.code === code) || null;
}

export async function listTestTypes(filters?: {
  category?: string;
  isActive?: boolean;
}): Promise<TestType[]> {
  let testTypes = await testTypesStore.findAll();

  if (filters?.category) {
    testTypes = testTypes.filter(t => t.category === filters.category);
  }
  if (filters?.isActive !== undefined) {
    testTypes = testTypes.filter(t => t.isActive === filters.isActive);
  }

  return testTypes;
}

export async function updateTestType(
  id: string,
  updates: Partial<TestType>,
  userId: string
): Promise<TestType> {
  const testType = await testTypesStore.findById(id);
  if (!testType) {
    throw new Error(`Test type ${id} not found`);
  }

  const updated = await testTypesStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'TestType',
    entityId: id,
    action: 'update',
    before: testType as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Test type updated',
  });

  return updated;
}

export async function getActiveTestTypeOnDate(
  code: string,
  date: string
): Promise<TestType | null> {
  const all = await testTypesStore.findAll();
  const checkDate = new Date(date);

  return all.find(t => {
    if (t.code !== code) return false;
    if (!t.isActive) return false;

    const effectiveFrom = new Date(t.effectiveFrom);
    const effectiveTo = t.effectiveTo ? new Date(t.effectiveTo) : null;

    return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
  }) || null;
}

// ============================================================================
// Laboratory Management
// ============================================================================

export async function createLaboratory(
   Omit<Laboratory, 'id' | 'createdAt' | 'updatedAt' | 'equipment'>
): Promise<Laboratory> {
  const lab: Laboratory = {
    ...data,
    id: generateId(),
    equipment: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await labsStore.create(lab);

  await recordAudit({
    entityType: 'Laboratory',
    entityId: lab.id,
    action: 'create',
    before: null,
    after: lab as any,
    actorId: 'system',
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Laboratory ${lab.code} created`,
  });

  return lab;
}

export async function getLaboratory(id: string): Promise<Laboratory | null> {
  return labsStore.findById(id);
}

export async function listLaboratories(filters?: {
  type?: string;
  plantId?: string;
  siteId?: string;
  isActive?: boolean;
}): Promise<Laboratory[]> {
  let labs = await labsStore.findAll();

  if (filters?.type) {
    labs = labs.filter(l => l.type === filters.type);
  }
  if (filters?.plantId) {
    labs = labs.filter(l => l.plantId === filters.plantId);
  }
  if (filters?.siteId) {
    labs = labs.filter(l => l.siteId === filters.siteId);
  }
  if (filters?.isActive !== undefined) {
    labs = labs.filter(l => l.isActive === filters.isActive);
  }

  return labs;
}

export async function updateLaboratory(
  id: string,
  updates: Partial<Laboratory>,
  userId: string
): Promise<Laboratory> {
  const lab = await labsStore.findById(id);
  if (!lab) {
    throw new Error(`Laboratory ${id} not found`);
  }

  const updated = await labsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'Laboratory',
    entityId: id,
    action: 'update',
    before: lab as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Laboratory updated',
  });

  return updated;
}

// ============================================================================
// Lab Equipment Management
// ============================================================================

export async function addLabEquipment(
  labId: string,
   Omit<LabEquipment, 'id' | 'labId' | 'createdAt' | 'updatedAt'>
): Promise<LabEquipment> {
  const lab = await labsStore.findById(labId);
  if (!lab) {
    throw new Error(`Laboratory ${labId} not found`);
  }

  const equipment: LabEquipment = {
    ...data,
    id: generateId(),
    labId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await equipmentStore.create(equipment);

  // Update lab equipment list
  const updatedEquipment = [...lab.equipment, equipment];
  await labsStore.update(labId, { equipment: updatedEquipment });

  await recordAudit({
    entityType: 'LabEquipment',
    entityId: equipment.id,
    action: 'create',
    before: null,
    after: equipment as any,
    actorId: 'system',
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: `Equipment ${equipment.name} added to lab ${lab.code}`,
  });

  return equipment;
}

export async function getLabEquipment(id: string): Promise<LabEquipment | null> {
  return equipmentStore.findById(id);
}

export async function listLabEquipment(filters?: {
  labId?: string;
  status?: string;
}): Promise<LabEquipment[]> {
  let equipment = await equipmentStore.findAll();

  if (filters?.labId) {
    equipment = equipment.filter(e => e.labId === filters.labId);
  }
  if (filters?.status) {
    equipment = equipment.filter(e => e.status === filters.status);
  }

  return equipment;
}

export async function updateEquipmentCalibration(
  equipmentId: string,
  calibrationRecordId: string,
  lastCalibrationDate: string,
  nextCalibrationDate: string,
  userId: string
): Promise<LabEquipment> {
  const equipment = await equipmentStore.findById(equipmentId);
  if (!equipment) {
    throw new Error(`Equipment ${equipmentId} not found`);
  }

  const updated = await equipmentStore.update(equipmentId, {
    calibrationRecordId,
    lastCalibrationDate,
    nextCalibrationDate,
    status: 'operational',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'LabEquipment',
    entityId: equipmentId,
    action: 'update',
    before: {
      calibrationRecordId: equipment.calibrationRecordId,
      lastCalibrationDate: equipment.lastCalibrationDate,
      nextCalibrationDate: equipment.nextCalibrationDate,
    },
    after: {
      calibrationRecordId,
      lastCalibrationDate,
      nextCalibrationDate,
    },
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Equipment calibration updated',
  });

  return updated;
}

export async function checkEquipmentCalibrationStatus(equipmentId: string): Promise<{
  isValid: boolean;
  status: string;
  message: string;
}> {
  const equipment = await equipmentStore.findById(equipmentId);
  if (!equipment) {
    return {
      isValid: false,
      status: 'not_found',
      message: 'Equipment not found',
    };
  }

  if (!equipment.nextCalibrationDate) {
    return {
      isValid: false,
      status: 'no_calibration',
      message: 'No calibration date recorded',
    };
  }

  const now = new Date();
  const nextCalibration = new Date(equipment.nextCalibrationDate);
  const daysUntilDue = Math.ceil((nextCalibration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    // Overdue
    await equipmentStore.update(equipmentId, { status: 'calibration_overdue' });
    return {
      isValid: false,
      status: 'overdue',
      message: `Calibration overdue by ${Math.abs(daysUntilDue)} days`,
    };
  } else if (daysUntilDue <= 30) {
    // Due soon
    await equipmentStore.update(equipmentId, { status: 'calibration_due' });
    return {
      isValid: true,
      status: 'due_soon',
      message: `Calibration due in ${daysUntilDue} days`,
    };
  } else {
    // Valid
    await equipmentStore.update(equipmentId, { status: 'operational' });
    return {
      isValid: true,
      status: 'valid',
      message: `Calibration valid for ${daysUntilDue} days`,
    };
  }
}

// ============================================================================
// Seed Default Test Types
// ============================================================================

export async function seedDefaultTestTypes(): Promise<void> {
  const existing = await testTypesStore.findAll();
  if (existing.length > 0) return;

  const testTypes = [
    {
      code: 'SLUMP_TEST',
      name: 'Slump Test',
      category: 'fresh_concrete' as const,
      description: 'Workability test for fresh concrete',
      parameters: [
        {
          id: generateId(),
          testTypeId: '',
          name: 'Slump',
          unit: 'mm',
          dataType: 'number' as const,
          required: true,
          minValue: 0,
          maxValue: 300,
        },
      ],
      methodStandard: 'IS 1199',
      frequency: 'per_batch' as const,
      acceptanceCriteria: [
        {
          id: generateId(),
          testTypeId: '',
          parameterId: '',
          operator: 'between' as const,
          value: [50, 150],
          value2: 150,
          severity: 'pass' as const,
          description: 'Slump within specified range',
        },
      ],
      criteriaSource: 'IS 456:2000',
      effectiveFrom: '2024-01-01',
      isActive: true,
      createdBy: 'system',
    },
    {
      code: 'CUBE_TEST_7DAY',
      name: 'Cube Compressive Strength Test - 7 Days',
      category: 'hardened_concrete' as const,
      description: 'Compressive strength test at 7 days',
      parameters: [
        {
          id: generateId(),
          testTypeId: '',
          name: 'Load',
          unit: 'kN',
          dataType: 'number' as const,
          required: true,
        },
        {
          id: generateId(),
          testTypeId: '',
          name: 'Failure Mode',
          unit: '',
          dataType: 'select' as const,
          required: false,
          options: ['cone', 'shear', 'splitting', 'other'],
        },
      ],
      methodStandard: 'IS 516',
      frequency: 'custom' as const,
      frequencyDescription: 'Per specimen set at 7 days',
      acceptanceCriteria: [
        {
          id: generateId(),
          testTypeId: '',
          parameterId: '',
          operator: 'gte' as const,
          value: 0,
          applicableGrades: ['M25', 'M30', 'M35', 'M40'],
          severity: 'pass' as const,
          description: 'Strength meets characteristic strength requirement',
        },
      ],
      criteriaSource: 'IS 456:2000',
      effectiveFrom: '2024-01-01',
      isActive: true,
      createdBy: 'system',
    },
    {
      code: 'SIEVE_ANALYSIS',
      name: 'Sieve Analysis',
      category: 'aggregate' as const,
      description: 'Particle size distribution test',
      parameters: [
        {
          id: generateId(),
          testTypeId: '',
          name: 'Passing %',
          unit: '%',
          dataType: 'number' as const,
          required: true,
        },
      ],
      methodStandard: 'IS 2386',
      frequency: 'per_lot' as const,
      acceptanceCriteria: [
        {
          id: generateId(),
          testTypeId: '',
          parameterId: '',
          operator: 'between' as const,
          value: [0, 100],
          value2: 100,
          severity: 'pass' as const,
          description: 'Grading within specified limits',
        },
      ],
      criteriaSource: 'IS 383:2016',
      effectiveFrom: '2024-01-01',
      isActive: true,
      createdBy: 'system',
    },
  ];

  for (const testType of testTypes) {
    await createTestType(testType);
  }
}
