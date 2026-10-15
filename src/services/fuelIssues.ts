/**
 * Part 09 — Fuel Issues Service
 * 
 * Manages fuel issuance from storage points to assets
 */

import { storage } from './storage';
import { FuelIssue, RetailFuelFill } from './fuelTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getStoragePoint, getFuelType } from './fuelMasters';
import { getAsset } from './assets';
import { getFuelConfiguration } from './fuelReceipts';

const fuelIssuesStore = storage.getAdapter<FuelIssue>('fuel_issues');
const retailFillsStore = storage.getAdapter<RetailFuelFill>('retail_fuel_fills');

// ============================================================================
// Fuel Issues
// ============================================================================

export async function createFuelIssue(data: Omit<FuelIssue, 'id' | 'voucherNumber' | 'totalCost' | 'createdAt' | 'updatedAt'>): Promise<FuelIssue> {
  // Get storage point
  const storagePoint = await getStoragePoint(data.storagePointId);
  if (!storagePoint) {
    throw new Error(`Storage point ${data.storagePointId} not found`);
  }

  // Get asset
  const asset = await getAsset(data.assetId);
  if (!asset) {
    throw new Error(`Asset ${data.assetId} not found`);
  }

  // Validate asset is allocated to the site (if storage point has site)
  if (storagePoint.siteId && asset.currentSiteId !== storagePoint.siteId) {
    await raiseAlert({
      ruleCode: 'FUEL_ISSUE_UNALLOCATED_ASSET',
      severity: 'warning',
      title: `Fuel Issue to Unallocated Asset`,
      description: `Asset ${asset.assetCode} is not allocated to site ${storagePoint.siteId}`,
      module: 'Fuel Management',
      entityType: 'FuelIssue',
      entityId: data.assetId,
      responsibleRole: 'fuel_officer',
      recommendedAction: 'Verify asset allocation before issuing fuel',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  // Validate fuel quantity doesn't exceed tank capacity (with tolerance)
  const config = await getFuelConfiguration();
  const tankCapacity = asset.tankCapacity || 0;
  if (tankCapacity > 0 && data.quantity > tankCapacity * (1 + config.issueTankCapacityTolerancePercent / 100)) {
    await raiseAlert({
      ruleCode: 'FUEL_ISSUE_EXCEEDS_TANK',
      severity: 'high',
      title: `Fuel Issue Exceeds Tank Capacity`,
      description: `Issue of ${data.quantity}L exceeds tank capacity of ${tankCapacity}L (with ${config.issueTankCapacityTolerancePercent}% tolerance)`,
      module: 'Fuel Management',
      entityType: 'FuelIssue',
      entityId: data.assetId,
      responsibleRole: 'fuel_officer',
      recommendedAction: 'Verify tank capacity and issue quantity',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  // Calculate total cost
  const totalCost = data.quantity * data.costPerLitre;

  // Generate voucher number
  const voucherNumber = `FV-${Date.now()}`;

  const issue: FuelIssue = {
    ...data,
    id: generateId(),
    voucherNumber,
    totalCost,
    status: 'draft',
    postedToInventory: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fuelIssuesStore.create(issue);

  await recordAudit({
    entityType: 'FuelIssue',
    entityId: issue.id,
    action: 'create',
    before: null,
    after: issue as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel issue created',
  });

  return issue;
}

export async function getFuelIssue(id: string): Promise<FuelIssue | null> {
  return fuelIssuesStore.findById(id);
}

export async function getFuelIssueByVoucher(voucherNumber: string): Promise<FuelIssue | null> {
  const all = await fuelIssuesStore.findAll();
  return all.find(i => i.voucherNumber === voucherNumber) || null;
}

export async function listFuelIssues(filters?: {
  storagePointId?: string;
  assetId?: string;
  operatorId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<FuelIssue[]> {
  let issues = await fuelIssuesStore.findAll();

  if (filters?.storagePointId) {
    issues = issues.filter(i => i.storagePointId === filters.storagePointId);
  }
  if (filters?.assetId) {
    issues = issues.filter(i => i.assetId === filters.assetId);
  }
  if (filters?.operatorId) {
    issues = issues.filter(i => i.operatorId === filters.operatorId);
  }
  if (filters?.fromDate) {
    issues = issues.filter(i => i.issueDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    issues = issues.filter(i => i.issueDate <= filters.toDate!);
  }
  if (filters?.status) {
    issues = issues.filter(i => i.status === filters.status);
  }

  return issues.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
}

export async function submitFuelIssue(id: string, userId: string): Promise<FuelIssue> {
  const issue = await fuelIssuesStore.findById(id);
  if (!issue) {
    throw new Error(`Fuel issue ${id} not found`);
  }

  if (issue.status !== 'draft') {
    throw new Error(`Fuel issue is not in draft status (current: ${issue.status})`);
  }

  // Validate meter readings if dispenser is used
  if (issue.dispenserInstrumentId && issue.meterOpening !== undefined && issue.meterClosing !== undefined) {
    if (issue.meterClosing < issue.meterOpening) {
      throw new Error('Meter closing reading cannot be less than opening reading');
    }

    const meterQuantity = issue.meterClosing - issue.meterOpening;
    const variance = Math.abs(meterQuantity - issue.quantity);
    const variancePercent = (variance / issue.quantity) * 100;

    if (variancePercent > 2) {
      await raiseAlert({
        ruleCode: 'FUEL_ISSUE_METER_VARIANCE',
        severity: 'warning',
        title: `Fuel Issue Meter Variance`,
        description: `Meter shows ${meterQuantity}L but voucher is for ${issue.quantity}L (${variancePercent.toFixed(2)}% variance)`,
        module: 'Fuel Management',
        entityType: 'FuelIssue',
        entityId: issue.id,
        responsibleRole: 'fuel_officer',
        recommendedAction: 'Verify dispenser meter and issue quantity',
        dueInHours: 24,
        requestId: generateId(),
      });
    }
  }

  const updated = await fuelIssuesStore.update(id, {
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelIssue',
    entityId: id,
    action: 'submit',
    before: issue as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel issue submitted',
  });

  return updated;
}

export async function approveFuelIssue(id: string, userId: string): Promise<FuelIssue> {
  const issue = await fuelIssuesStore.findById(id);
  if (!issue) {
    throw new Error(`Fuel issue ${id} not found`);
  }

  if (issue.status !== 'submitted') {
    throw new Error(`Fuel issue is not in submitted status (current: ${issue.status})`);
  }

  // Post to inventory ledger (simulated)
  const updated = await fuelIssuesStore.update(id, {
    status: 'approved',
    approvingOfficerId: userId,
    postedToInventory: true,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelIssue',
    entityId: id,
    action: 'approve',
    before: issue as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel issue approved and posted to inventory',
  });

  return updated;
}

// ============================================================================
// Retail Fuel Fills
// ============================================================================

export async function createRetailFuelFill(data: Omit<RetailFuelFill, 'id' | 'totalCost' | 'createdAt' | 'updatedAt'>): Promise<RetailFuelFill> {
  // Calculate total cost
  const totalCost = data.quantity * data.rate;

  // Check for duplicate fuel card transaction
  if (data.fuelCardTransactionId) {
    const existingFills = await retailFillsStore.findAll();
    const duplicate = existingFills.find(f => 
      f.fuelCardTransactionId === data.fuelCardTransactionId
    );

    if (duplicate) {
      await raiseAlert({
        ruleCode: 'DUPLICATE_FUEL_CARD_TRANSACTION',
        severity: 'high',
        title: `Duplicate Fuel Card Transaction`,
        description: `Fuel card transaction ${data.fuelCardTransactionId} already exists`,
        module: 'Fuel Management',
        entityType: 'RetailFuelFill',
        entityId: data.fuelCardTransactionId,
        responsibleRole: 'fuel_officer',
        recommendedAction: 'Verify fuel card statement and remove duplicate',
        dueInHours: 24,
        requestId: generateId(),
      });

      throw new Error(`Duplicate fuel card transaction: ${data.fuelCardTransactionId}`);
    }
  }

  const fill: RetailFuelFill = {
    ...data,
    id: generateId(),
    totalCost,
    status: 'draft',
    matchedToVoucher: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await retailFillsStore.create(fill);

  await recordAudit({
    entityType: 'RetailFuelFill',
    entityId: fill.id,
    action: 'create',
    before: null,
    after: fill as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Retail fuel fill created',
  });

  return fill;
}

export async function getRetailFuelFill(id: string): Promise<RetailFuelFill | null> {
  return retailFillsStore.findById(id);
}

export async function listRetailFuelFills(filters?: {
  assetId?: string;
  operatorId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<RetailFuelFill[]> {
  let fills = await retailFillsStore.findAll();

  if (filters?.assetId) {
    fills = fills.filter(f => f.assetId === filters.assetId);
  }
  if (filters?.operatorId) {
    fills = fills.filter(f => f.operatorId === filters.operatorId);
  }
  if (filters?.fromDate) {
    fills = fills.filter(f => f.fillDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    fills = fills.filter(f => f.fillDate <= filters.toDate!);
  }
  if (filters?.status) {
    fills = fills.filter(f => f.status === filters.status);
  }

  return fills.sort((a, b) => new Date(b.fillDate).getTime() - new Date(a.fillDate).getTime());
}

export async function matchRetailFillToVoucher(fillId: string, voucherId: string): Promise<RetailFuelFill> {
  const fill = await retailFillsStore.findById(fillId);
  if (!fill) {
    throw new Error(`Retail fuel fill ${fillId} not found`);
  }

  const updated = await retailFillsStore.update(fillId, {
    matchedToVoucher: true,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'RetailFuelFill',
    entityId: fillId,
    action: 'update',
    before: fill as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Matched to voucher ${voucherId}`,
  });

  return updated;
}

// ============================================================================
// Issue Statistics
// ============================================================================

export async function getIssueStatistics(filters?: {
  storagePointId?: string;
  assetId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalIssues: number;
  totalQuantity: number;
  totalCost: number;
  averageCostPerLitre: number;
}> {
  let issues = await fuelIssuesStore.findAll();

  if (filters?.storagePointId) {
    issues = issues.filter(i => i.storagePointId === filters.storagePointId);
  }
  if (filters?.assetId) {
    issues = issues.filter(i => i.assetId === filters.assetId);
  }
  if (filters?.fromDate) {
    issues = issues.filter(i => i.issueDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    issues = issues.filter(i => i.issueDate <= filters.toDate!);
  }

  const approvedIssues = issues.filter(i => i.status === 'approved');

  return {
    totalIssues: approvedIssues.length,
    totalQuantity: approvedIssues.reduce((sum, i) => sum + i.quantity, 0),
    totalCost: approvedIssues.reduce((sum, i) => sum + i.totalCost, 0),
    averageCostPerLitre: approvedIssues.length > 0
      ? approvedIssues.reduce((sum, i) => sum + i.totalCost, 0) / 
        approvedIssues.reduce((sum, i) => sum + i.quantity, 0)
      : 0,
  };
}
