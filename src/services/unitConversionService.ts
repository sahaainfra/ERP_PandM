/**
 * Part 15 — Unit Conversion Service
 */

import { storage } from './storage';
import { UnitConversion } from './materialInventoryTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const conversionsStore = storage.getAdapter<UnitConversion>('unit_conversions');

// ============================================================================
// Unit Conversion CRUD
// ============================================================================

export async function createUnitConversion(
  data: Omit<UnitConversion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<UnitConversion> {
  const conversion: UnitConversion = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await conversionsStore.create(conversion);
  
  await recordAudit({
    entityType: 'UnitConversion',
    entityId: conversion.id,
    action: 'create',
    before: null,
    after: conversion as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Unit conversion created: ${data.fromUnit} to ${data.toUnit}`,
  });
  
  return conversion;
}

export async function getUnitConversion(
  materialId: string,
  fromUnit: string,
  toUnit: string
): Promise<UnitConversion | null> {
  const all = await conversionsStore.findAll();
  return all.find(c => 
    c.materialId === materialId && 
    c.fromUnit === fromUnit && 
    c.toUnit === toUnit
  ) || null;
}

export async function getActiveUnitConversion(
  materialId: string,
  fromUnit: string,
  toUnit: string,
  onDate: string
): Promise<UnitConversion | null> {
  const all = await conversionsStore.findAll();
  const checkDate = new Date(onDate);
  
  return all.find(c => {
    if (c.materialId !== materialId || c.fromUnit !== fromUnit || c.toUnit !== toUnit) {
      return false;
    }
    
    const effectiveFrom = new Date(c.effectiveFrom);
    const effectiveTo = c.effectiveTo ? new Date(c.effectiveTo) : null;
    
    return checkDate >= effectiveFrom && (!effectiveTo || checkDate <= effectiveTo);
  }) || null;
}

export async function listUnitConversions(filters?: {
  materialId?: string;
  fromUnit?: string;
  toUnit?: string;
}): Promise<UnitConversion[]> {
  let conversions = await conversionsStore.findAll();
  
  if (filters?.materialId) {
    conversions = conversions.filter(c => c.materialId === filters.materialId);
  }
  if (filters?.fromUnit) {
    conversions = conversions.filter(c => c.fromUnit === filters.fromUnit);
  }
  if (filters?.toUnit) {
    conversions = conversions.filter(c => c.toUnit === filters.toUnit);
  }
  
  return conversions;
}

export async function convertUnits(
  materialId: string,
  quantity: number,
  fromUnit: string,
  toUnit: string,
  onDate: string
): Promise<number> {
  if (fromUnit === toUnit) {
    return quantity;
  }
  
  const conversion = await getActiveUnitConversion(materialId, fromUnit, toUnit, onDate);
  if (!conversion) {
    throw new Error(`No active unit conversion found for ${fromUnit} to ${toUnit} on ${onDate}`);
  }
  
  return quantity * conversion.conversionFactor;
}

// ============================================================================
// Seed Default Conversions
// ============================================================================

export async function seedDefaultUnitConversions(): Promise<void> {
  const existing = await conversionsStore.findAll();
  if (existing.length > 0) return;
  
  // Common conversions for cement
  const cementConversions = [
    { fromUnit: 'tonnes', toUnit: 'kg', conversionFactor: 1000 },
    { fromUnit: 'bags', toUnit: 'kg', conversionFactor: 50 }, // 50kg per bag
    { fromUnit: 'kg', toUnit: 'tonnes', conversionFactor: 0.001 },
    { fromUnit: 'kg', toUnit: 'bags', conversionFactor: 0.02 }, // 1/50 bags per kg
  ];
  
  // Common conversions for aggregates
  const aggregateConversions = [
    { fromUnit: 'tonnes', toUnit: 'kg', conversionFactor: 1000 },
    { fromUnit: 'm³', toUnit: 'kg', conversionFactor: 1500 }, // Approximate bulk density
    { fromUnit: 'kg', toUnit: 'tonnes', conversionFactor: 0.001 },
    { fromUnit: 'kg', toUnit: 'm³', conversionFactor: 0.000667 }, // 1/1500 m³ per kg
  ];
  
  // Common conversions for admixtures
  const admixtureConversions = [
    { fromUnit: 'litres', toUnit: 'kg', conversionFactor: 1.2 }, // Approximate density
    { fromUnit: 'kg', toUnit: 'litres', conversionFactor: 0.833 }, // 1/1.2 litres per kg
  ];
  
  // Create conversions for all materials (simplified - in real system would be per material)
  const defaultMaterialId = 'default';
  
  for (const conv of [...cementConversions, ...aggregateConversions, ...admixtureConversions]) {
    await createUnitConversion({
      materialId: defaultMaterialId,
      materialName: 'Default',
      fromUnit: conv.fromUnit,
      toUnit: conv.toUnit,
      conversionFactor: conv.conversionFactor,
      effectiveFrom: '2024-01-01',
    });
  }
}
