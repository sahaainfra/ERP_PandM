/**
 * Part 04 — Asset Master Service
 */

import { storage } from './storage';
import { Asset, AssetStatus, ComplianceDocument, MeterReplacement, AssetAllocation, BulkImportResult, BulkImportError, BulkImportWarning, BulkImportRow } from './assetTypes';
import { generateId, getCurrentFinancialYear } from './utils';
import { recordAudit } from './audit';
import { getCategory, validateSubCategory } from './assetCategories';
import { generateNumber } from './numbering';
import { hasPermission } from './permissions';

const assetsStore = storage.getAdapter<Asset>('assets');
const allocationsStore = storage.getAdapter<AssetAllocation>('asset_allocations');

/**
 * Create a new asset
 */
export async function createAsset(
  data: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'status_' | 'dataSource' | 'statusChangedAt' | 'statusChangedBy' | 'meterReplacements'>,
  userId: string,
  requestId: string
): Promise<Asset> {
  // Check permissions
  await hasPermission({
    userId,
    role: 'company_admin', // TODO: Get from user context
    action: 'create',
    resource: 'asset',
  });

  // Validate category and subcategory
  const categoryValid = await validateSubCategory(data.category, data.subCategory);
  if (!categoryValid) {
    throw new Error(`Invalid subcategory ${data.subCategory} for category ${data.category}`);
  }

  // Check for duplicates
  const existingByCode = await assetsStore.findOne({ assetCode: data.assetCode } as Partial<Asset>);
  if (existingByCode) {
    throw new Error(`Asset with code ${data.assetCode} already exists`);
  }

  const existingByReg = await assetsStore.findOne({ 
    registrationNumber: data.registrationNumber,
    country: data.country 
  } as Partial<Asset>);
  if (existingByReg) {
    throw new Error(`Asset with registration number ${data.registrationNumber} already exists in ${data.country}`);
  }

  const existingBySerial = await assetsStore.findOne({ serialNumber: data.serialNumber } as Partial<Asset>);
  if (existingBySerial) {
    throw new Error(`Asset with serial number ${data.serialNumber} already exists`);
  }

  // Check for near-duplicates (fuzzy match)
  const nearDuplicates = await assetsStore.findAll();
  const fuzzyMatch = nearDuplicates.find(a => 
    a.make === data.make && 
    a.model === data.model && 
    a.serialNumber === data.serialNumber
  );
  if (fuzzyMatch) {
    throw new Error(`Potential duplicate found: Asset ${fuzzyMatch.assetCode} has same make, model, and serial number`);
  }

  const asset: Asset = {
    ...data,
    id: generateId(),
    status_: 'approved',
    dataSource: 'manual',
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: userId,
    meterReplacements: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    updatedBy: userId,
  };

  await assetsStore.create(asset);

  // Create initial allocation if project/site/plant specified
  if (data.currentProjectId || data.currentSiteId || data.currentPlantId) {
    await createAllocation({
      assetId: asset.id,
      projectId: data.currentProjectId,
      siteId: data.currentSiteId,
      plantId: data.currentPlantId,
      departmentId: data.departmentId,
      startDate: new Date().toISOString(),
      allocatedBy: userId,
      reason: 'Initial allocation',
    });
  }

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: asset.id,
    action: 'create',
    before: null,
    after: asset as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'company_admin', // TODO: Get from context
    requestId,
    reason: 'Asset created',
  });

  return asset;
}

/**
 * Get asset by ID
 */
export async function getAsset(id: string): Promise<Asset | null> {
  return assetsStore.findById(id);
}

/**
 * Get asset by code
 */
export async function getAssetByCode(assetCode: string): Promise<Asset | null> {
  return assetsStore.findOne({ assetCode } as Partial<Asset>);
}

/**
 * List all assets with filters
 */
export async function listAssets(filters?: {
  category?: string;
  subCategory?: string;
  status?: AssetStatus;
  projectId?: string;
  siteId?: string;
  plantId?: string;
  ownershipType?: string;
}): Promise<Asset[]> {
  let assets = await assetsStore.findAll();

  if (filters?.category) {
    assets = assets.filter(a => a.category === filters.category);
  }
  if (filters?.subCategory) {
    assets = assets.filter(a => a.subCategory === filters.subCategory);
  }
  if (filters?.status) {
    assets = assets.filter(a => a.status === filters.status);
  }
  if (filters?.projectId) {
    assets = assets.filter(a => a.currentProjectId === filters.projectId);
  }
  if (filters?.siteId) {
    assets = assets.filter(a => a.currentSiteId === filters.siteId);
  }
  if (filters?.plantId) {
    assets = assets.filter(a => a.currentPlantId === filters.plantId);
  }
  if (filters?.ownershipType) {
    assets = assets.filter(a => a.ownershipType === filters.ownershipType);
  }

  return assets;
}

/**
 * Update asset
 */
export async function updateAsset(
  id: string,
  updates: Partial<Asset>,
  userId: string,
  requestId: string
): Promise<Asset> {
  const asset = await assetsStore.findById(id);
  if (!asset) {
    throw new Error(`Asset ${id} not found`);
  }

  // Check permissions
  await hasPermission({
    userId,
    role: 'company_admin', // TODO: Get from user context
    action: 'edit',
    resource: 'asset',
  });

  const before = { ...asset };
  const updated = await assetsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: id,
    action: 'update',
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'company_admin', // TODO: Get from context
    requestId,
    reason: 'Asset updated',
  });

  return updated;
}

/**
 * Change asset status
 */
export async function changeAssetStatus(
  id: string,
  newStatus: AssetStatus,
  reason: string,
  userId: string,
  requestId: string
): Promise<Asset> {
  const asset = await assetsStore.findById(id);
  if (!asset) {
    throw new Error(`Asset ${id} not found`);
  }

  // Check permissions
  await hasPermission({
    userId,
    role: 'company_admin', // TODO: Get from user context
    action: 'edit',
    resource: 'asset',
  });

  // Validate status transition
  const validTransitions: Record<AssetStatus, AssetStatus[]> = {
    available: ['deployed', 'under_maintenance', 'standby', 'disposed'],
    deployed: ['available', 'idle', 'under_maintenance', 'breakdown', 'in_transit', 'disposed'],
    idle: ['deployed', 'under_maintenance', 'standby', 'disposed'],
    standby: ['deployed', 'under_maintenance', 'disposed'],
    under_maintenance: ['available', 'breakdown', 'out_of_service'],
    breakdown: ['under_maintenance', 'out_of_service'],
    out_of_service: ['under_maintenance', 'disposed'],
    in_transit: ['deployed', 'available'],
    disposed: [],
  };

  if (!validTransitions[asset.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${asset.status} to ${newStatus}`);
  }

  const before = { ...asset };
  const updated = await assetsStore.update(id, {
    status: newStatus,
    statusChangedAt: new Date().toISOString(),
    statusChangedBy: userId,
    statusChangeReason: reason,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: id,
    action: 'update',
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'company_admin', // TODO: Get from context
    requestId,
    reason: `Status changed from ${before.status} to ${newStatus}: ${reason}`,
  });

  return updated;
}

/**
 * Replace meter
 */
export async function replaceMeter(
  assetId: string,
  meterType: 'hour_meter' | 'odometer',
  oldMeterFinalReading: number,
  newMeterStartReading: number,
  reason: string,
  approvedBy: string,
  requestId: string
): Promise<Asset> {
  const asset = await assetsStore.findById(assetId);
  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  // Check permissions
  await hasPermission({
    userId: approvedBy,
    role: 'fleet_manager', // TODO: Get from user context
    action: 'approve',
    resource: 'asset',
  });

  // Validate readings
  if (meterType === 'hour_meter' && asset.currentHourMeter !== undefined) {
    if (oldMeterFinalReading < asset.currentHourMeter) {
      throw new Error(`Old meter final reading (${oldMeterFinalReading}) cannot be less than current reading (${asset.currentHourMeter})`);
    }
  }

  if (meterType === 'odometer' && asset.currentOdometer !== undefined) {
    if (oldMeterFinalReading < asset.currentOdometer) {
      throw new Error(`Old meter final reading (${oldMeterFinalReading}) cannot be less than current reading (${asset.currentOdometer})`);
    }
  }

  if (newMeterStartReading < oldMeterFinalReading) {
    throw new Error(`New meter start reading (${newMeterStartReading}) cannot be less than old meter final reading (${oldMeterFinalReading})`);
  }

  const replacement: MeterReplacement = {
    id: generateId(),
    meterType,
    oldMeterFinalReading,
    newMeterStartReading,
    replacementDate: new Date().toISOString(),
    reason,
    approvedBy,
    approvedAt: new Date().toISOString(),
  };

  const before = { ...asset };
  const updated = await assetsStore.update(assetId, {
    meterReplacements: [...asset.meterReplacements, replacement],
    [meterType === 'hour_meter' ? 'currentHourMeter' : 'currentOdometer']: newMeterStartReading,
    updatedAt: new Date().toISOString(),
    updatedBy: approvedBy,
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: assetId,
    action: 'update',
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: approvedBy,
    actorRole: 'fleet_manager', // TODO: Get from context
    requestId,
    reason: `Meter replacement: ${meterType} - ${reason}`,
  });

  return updated;
}

/**
 * Add compliance document
 */
export async function addComplianceDocument(
  assetId: string,
  document: Omit<ComplianceDocument, 'id' | 'alertSent'>,
  userId: string,
  requestId: string
): Promise<Asset> {
  const asset = await assetsStore.findById(assetId);
  if (!asset) {
    throw new Error(`Asset ${assetId} not found`);
  }

  const newDoc: ComplianceDocument = {
    ...document,
    id: generateId(),
    alertSent: false,
  };

  const before = { ...asset };
  const updated = await assetsStore.update(assetId, {
    documents: [...asset.documents, newDoc],
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Audit
  await recordAudit({
    entityType: 'Asset',
    entityId: assetId,
    action: 'update',
    before: before as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'company_admin', // TODO: Get from context
    requestId,
    reason: `Added compliance document: ${document.type}`,
  });

  return updated;
}

/**
 * Create allocation
 */
export async function createAllocation(data: Omit<AssetAllocation, 'id' | 'createdAt'>): Promise<AssetAllocation> {
  // End previous allocation if exists
  const previousAllocations = await allocationsStore.findAll({ assetId: data.assetId } as Partial<AssetAllocation>);
  const activeAllocation = previousAllocations.find(a => !a.endDate);
  if (activeAllocation) {
    await allocationsStore.update(activeAllocation.id, {
      endDate: data.startDate,
    });
  }

  const allocation: AssetAllocation = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  return allocationsStore.create(allocation);
}

/**
 * Get allocation history
 */
export async function getAllocationHistory(assetId: string): Promise<AssetAllocation[]> {
  const allocations = await allocationsStore.findAll({ assetId } as Partial<AssetAllocation>);
  return allocations.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
}

/**
 * Bulk import assets
 */
export async function bulkImportAssets(
  rows: BulkImportRow[],
  dryRun: boolean,
  userId: string,
  requestId: string
): Promise<BulkImportResult> {
  const errors: BulkImportError[] = [];
  const warnings: BulkImportWarning[] = [];
  let validRows = 0;

  // Validate all rows first
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Required fields
    if (!row.assetCode) {
      errors.push({ row: rowNum, field: 'assetCode', message: 'Asset code is required' });
    }
    if (!row.registrationNumber) {
      errors.push({ row: rowNum, field: 'registrationNumber', message: 'Registration number is required' });
    }
    if (!row.serialNumber) {
      errors.push({ row: rowNum, field: 'serialNumber', message: 'Serial number is required' });
    }
    if (!row.make) {
      errors.push({ row: rowNum, field: 'make', message: 'Make is required' });
    }
    if (!row.model) {
      errors.push({ row: rowNum, field: 'model', message: 'Model is required' });
    }
    if (!row.year || row.year < 1900 || row.year > new Date().getFullYear() + 1) {
      errors.push({ row: rowNum, field: 'year', message: 'Valid year is required', value: String(row.year) });
    }

    // Check for duplicates in import
    const duplicateInImport = rows.findIndex((r, idx) => idx !== i && r.assetCode === row.assetCode);
    if (duplicateInImport !== -1) {
      errors.push({ row: rowNum, field: 'assetCode', message: `Duplicate asset code in import (also in row ${duplicateInImport + 1})`, value: row.assetCode });
    }

    // Check against existing assets
    const existingByCode = await assetsStore.findOne({ assetCode: row.assetCode } as Partial<Asset>);
    if (existingByCode) {
      errors.push({ row: rowNum, field: 'assetCode', message: 'Asset code already exists', value: row.assetCode });
    }

    const existingByReg = await assetsStore.findOne({ 
      registrationNumber: row.registrationNumber,
      country: row.country || 'India'
    } as Partial<Asset>);
    if (existingByReg) {
      errors.push({ row: rowNum, field: 'registrationNumber', message: 'Registration number already exists', value: row.registrationNumber });
    }

    // Check for near-duplicates
    const nearDuplicate = await assetsStore.findOne({
      make: row.make,
      model: row.model,
      serialNumber: row.serialNumber,
    } as Partial<Asset>);
    if (nearDuplicate) {
      warnings.push({ 
        row: rowNum, 
        field: 'serialNumber', 
        message: `Potential duplicate: ${nearDuplicate.assetCode} has same make, model, and serial`, 
        value: row.serialNumber 
      });
    }

    if (errors.filter(e => e.row === rowNum).length === 0) {
      validRows++;
    }
  }

  const result: BulkImportResult = {
    totalRows: rows.length,
    validRows,
    invalidRows: errors.length,
    errors,
    warnings,
    dryRun,
    imported: false,
  };

  // If not dry run and no errors, import
  if (!dryRun && errors.length === 0) {
    for (const row of rows) {
      await createAsset({
        assetCode: row.assetCode,
        registrationNumber: row.registrationNumber,
        country: row.country || 'India',
        make: row.make,
        model: row.model,
        variant: row.variant,
        year: row.year,
        serialNumber: row.serialNumber,
        chassisNumber: undefined,
        engineNumber: undefined,
        category: row.category,
        subCategory: row.subCategory,
        colour: undefined,
        ownershipType: row.ownershipType,
        purchaseDate: undefined,
        purchaseCost: undefined,
        documents: [],
        status: 'available',
        currentHourMeter: undefined,
        currentOdometer: undefined,
        tankCapacity: row.tankCapacity,
        fuelType: row.fuelType,
        telematicsDeviceId: undefined,
        telematicsProvider: undefined,
        simNumber: undefined,
        fuelSensorPresent: false,
        photographs: [],
      } as any, userId, requestId);
    }
    result.imported = true;
    result.importedAt = new Date().toISOString();
  }

  return result;
}

/**
 * Check for expiring documents
 */
export async function checkExpiringDocuments(leadTimeDays: number = 30): Promise<Asset[]> {
  const assets = await assetsStore.findAll();
  const now = new Date();
  const leadTime = leadTimeDays * 24 * 60 * 60 * 1000;

  return assets.filter(asset => {
    return asset.documents.some(doc => {
      const expiryDate = new Date(doc.expiryDate);
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();
      return timeUntilExpiry > 0 && timeUntilExpiry <= leadTime && !doc.alertSent;
    });
  });
}

/**
 * Mark document alert as sent
 */
export async function markDocumentAlertSent(assetId: string, documentId: string): Promise<void> {
  const asset = await assetsStore.findById(assetId);
  if (!asset) return;

  const updatedDocs = asset.documents.map(doc => {
    if (doc.id === documentId) {
      return { ...doc, alertSent: true, alertSentAt: new Date().toISOString() };
    }
    return doc;
  });

  await assetsStore.update(assetId, { documents: updatedDocs });
}
