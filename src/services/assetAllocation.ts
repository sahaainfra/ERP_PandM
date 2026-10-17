/**
 * Part 05 — Asset Allocation Service
 * 
 * Manages asset allocation to projects/sites/plants with overlap prevention,
 * transfer workflows, and utilization tracking.
 */

import { storage } from './storage';
import { AssetAllocation, AssetTransfer, Mobilization, ConditionChecklist } from './assetLifecycleTypes';
import { Asset } from './assetTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getAsset, updateAsset } from './assets';
import { hasPermission } from './permissions';

const allocationsStore = storage.getAdapter<AssetAllocation>('asset_allocations');
const transfersStore = storage.getAdapter<AssetTransfer>('asset_transfers');
const mobilizationsStore = storage.getAdapter<Mobilization>('asset_mobilizations');

// ============================================================================
// Allocation Management
// ============================================================================

export async function createAllocation(
  data: Omit<AssetAllocation, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'createdBy' | 'updatedBy'>,
  userId: string
): Promise<AssetAllocation> {
  // Check permissions
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'create',
    resource: 'asset_allocation',
  });

  // Validate no overlapping allocations
  const overlapping = await checkOverlappingAllocations(
    data.assetId,
    data.plannedStartDate,
    data.plannedEndDate
  );

  if (overlapping.length > 0) {
    throw new Error(
      `Asset is already allocated during this period. Conflicting allocation: ${overlapping[0].id}`
    );
  }

  // Validate asset status
  const asset = await getAsset(data.assetId);
  if (!asset) {
    throw new Error(`Asset ${data.assetId} not found`);
  }

  if (asset.status === 'breakdown' || asset.status === 'out_of_service') {
    throw new Error(`Cannot allocate asset in ${asset.status} status`);
  }

  // Check for expired mandatory documents
  const expiredDocs = checkExpiredDocuments(asset);
  if (expiredDocs.length > 0) {
    throw new Error(
      `Cannot allocate asset with expired documents: ${expiredDocs.join(', ')}`
    );
  }

  const allocation: AssetAllocation = {
    ...data,
    id: generateId(),
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: userId,
    updatedBy: userId,
  };

  await allocationsStore.create(allocation);

  // Update asset status
  await updateAsset(data.assetId, { status: 'deployed' }, userId, generateId());

  // Audit
  await recordAudit({
    entityType: 'AssetAllocation',
    entityId: allocation.id,
    action: 'create',
    before: null,
    after: allocation as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: `Asset allocated to ${data.siteId || data.projectId || data.plantId}`,
  });

  return allocation;
}

export async function approveAllocation(
  allocationId: string,
  userId: string
): Promise<AssetAllocation> {
  await hasPermission({
    userId,
    role: 'project_manager',
    action: 'approve',
    resource: 'asset_allocation',
  });

  const allocation = await allocationsStore.findById(allocationId);
  if (!allocation) {
    throw new Error(`Allocation ${allocationId} not found`);
  }

  if (allocation.status !== 'planned') {
    throw new Error(`Allocation is not in planned status (current: ${allocation.status})`);
  }

  const updated = await allocationsStore.update(allocationId, {
    status: 'active',
    actualStartDate: new Date().toISOString(),
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  await recordAudit({
    entityType: 'AssetAllocation',
    entityId: allocationId,
    action: 'approve',
    before: allocation as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'project_manager',
    requestId: generateId(),
    reason: 'Allocation approved',
  });

  return updated;
}

export async function completeAllocation(
  allocationId: string,
  closingHourMeter: number | undefined,
  closingOdometer: number | undefined,
  userId: string
): Promise<AssetAllocation> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'asset_allocation',
  });

  const allocation = await allocationsStore.findById(allocationId);
  if (!allocation) {
    throw new Error(`Allocation ${allocationId} not found`);
  }

  if (allocation.status !== 'active') {
    throw new Error(`Allocation is not active (current: ${allocation.status})`);
  }

  const updated = await allocationsStore.update(allocationId, {
    status: 'completed',
    actualEndDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  });

  // Update asset status back to available
  await updateAsset(allocation.assetId, { status: 'available' }, userId, generateId());

  await recordAudit({
    entityType: 'AssetAllocation',
    entityId: allocationId,
    action: 'update',
    before: allocation as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Allocation completed',
  });

  return updated;
}

export async function getAllocationHistory(assetId: string): Promise<AssetAllocation[]> {
  const allocations = await allocationsStore.findAll({ assetId } as Partial<AssetAllocation>);
  return allocations.sort((a, b) => 
    new Date(b.plannedStartDate).getTime() - new Date(a.plannedStartDate).getTime()
  );
}

export async function getActiveAllocation(assetId: string): Promise<AssetAllocation | null> {
  const allocations = await allocationsStore.findAll({ 
    assetId,
    status: 'active' 
  } as Partial<AssetAllocation>);
  return allocations[0] || null;
}

// ============================================================================
// Overlap Detection
// ============================================================================

async function checkOverlappingAllocations(
  assetId: string,
  startDate: string,
  endDate?: string
): Promise<AssetAllocation[]> {
  const allocations = await allocationsStore.findAll({ assetId } as Partial<AssetAllocation>);
  
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Infinity;

  return allocations.filter(alloc => {
    if (alloc.status === 'cancelled' || alloc.status === 'completed') {
      return false;
    }

    const allocStart = new Date(alloc.plannedStartDate).getTime();
    const allocEnd = alloc.plannedEndDate 
      ? new Date(alloc.plannedEndDate).getTime() 
      : Infinity;

    // Check for overlap
    return start < allocEnd && end > allocStart;
  });
}

// ============================================================================
// Document Validation
// ============================================================================

function checkExpiredDocuments(asset: Asset): string[] {
  const expired: string[] = [];
  const now = new Date();

  const mandatoryDocs = ['insurance', 'fitness_certificate', 'pollution_certificate'];
  
  for (const doc of asset.documents) {
    if (mandatoryDocs.includes(doc.type)) {
      const expiryDate = new Date(doc.expiryDate);
      if (expiryDate < now) {
        expired.push(doc.type);
      }
    }
  }

  return expired;
}

// ============================================================================
// Transfer Management
// ============================================================================

export async function requestTransfer(
  data: Omit<AssetTransfer, 'id' | 'transferNumber' | 'status' | 'createdAt' | 'updatedAt' | 'requestedAt'>,
  userId: string
): Promise<AssetTransfer> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'create',
    resource: 'asset_transfer',
  });

  // Validate asset is currently allocated
  const activeAllocation = await getActiveAllocation(data.assetId);
  if (!activeAllocation) {
    throw new Error('Asset must be actively allocated to request transfer');
  }

  // Generate transfer number
  const transferNumber = `TRF-${Date.now()}`;

  const transfer: AssetTransfer = {
    ...data,
    id: generateId(),
    transferNumber,
    status: 'requested',
    requestedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await transfersStore.create(transfer);

  // Update asset status to in_transit
  await updateAsset(data.assetId, { status: 'in_transit' }, userId, generateId());

  await recordAudit({
    entityType: 'AssetTransfer',
    entityId: transfer.id,
    action: 'create',
    before: null,
    after: transfer as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: `Transfer requested from ${data.fromLocation} to ${data.toLocation}`,
  });

  return transfer;
}

export async function approveTransfer(
  transferId: string,
  userId: string
): Promise<AssetTransfer> {
  await hasPermission({
    userId,
    role: 'project_manager',
    action: 'approve',
    resource: 'asset_transfer',
  });

  const transfer = await transfersStore.findById(transferId);
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`);
  }

  if (transfer.status !== 'requested') {
    throw new Error(`Transfer is not in requested status (current: ${transfer.status})`);
  }

  const updated = await transfersStore.update(transferId, {
    status: 'approved',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AssetTransfer',
    entityId: transferId,
    action: 'approve',
    before: transfer as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'project_manager',
    requestId: generateId(),
    reason: 'Transfer approved',
  });

  return updated;
}

export async function dispatchTransfer(
  transferId: string,
  transportVendorId: string,
  transportCost: number,
  transportDate: string,
  userId: string
): Promise<AssetTransfer> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'asset_transfer',
  });

  const transfer = await transfersStore.findById(transferId);
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`);
  }

  if (transfer.status !== 'approved') {
    throw new Error(`Transfer is not approved (current: ${transfer.status})`);
  }

  const updated = await transfersStore.update(transferId, {
    status: 'dispatched',
    transportVendorId,
    transportCost,
    transportDate,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AssetTransfer',
    entityId: transferId,
    action: 'update',
    before: transfer as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Transfer dispatched',
  });

  return updated;
}

export async function receiveTransfer(
  transferId: string,
  receivedMeterReading: {
    hourMeter?: number;
    odometer?: number;
    takenAt: string;
    takenBy: string;
    photoAttachmentId?: string;
  },
  receivedCondition: ConditionChecklist,
  userId: string
): Promise<AssetTransfer> {
  await hasPermission({
    userId,
    role: 'site_manager',
    action: 'edit',
    resource: 'asset_transfer',
  });

  const transfer = await transfersStore.findById(transferId);
  if (!transfer) {
    throw new Error(`Transfer ${transferId} not found`);
  }

  if (transfer.status !== 'dispatched') {
    throw new Error(`Transfer is not dispatched (current: ${transfer.status})`);
  }

  const updated = await transfersStore.update(transferId, {
    status: 'received',
    receivedAt: new Date().toISOString(),
    receivedBy: userId,
    receivedMeterReading,
    receivedCondition,
    updatedAt: new Date().toISOString(),
  });

  // Create new allocation at destination
  await createAllocation({
    assetId: transfer.assetId,
    projectId: transfer.toProjectId,
    siteId: transfer.toSiteId,
    plantId: transfer.toPlantId,
    plannedStartDate: new Date().toISOString(),
    openingHourMeter: receivedMeterReading.hourMeter,
    openingOdometer: receivedMeterReading.odometer,
    allocatedBy: userId,
    reason: `Transfer ${transfer.transferNumber}`,
  }, userId);

  // Update asset status
  await updateAsset(transfer.assetId, { status: 'deployed' }, userId, generateId());

  await recordAudit({
    entityType: 'AssetTransfer',
    entityId: transferId,
    action: 'update',
    before: transfer as unknown as Record<string, unknown>,
    after: updated as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'site_manager',
    requestId: generateId(),
    reason: 'Transfer received',
  });

  return updated;
}

export async function getTransferHistory(assetId: string): Promise<AssetTransfer[]> {
  const transfers = await transfersStore.findAll({ assetId } as Partial<AssetTransfer>);
  return transfers.sort((a, b) => 
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

export async function getPendingTransfers(): Promise<AssetTransfer[]> {
  const transfers = await transfersStore.findAll();
  return transfers.filter(t => t.status === 'requested' || t.status === 'approved' || t.status === 'dispatched');
}

// ============================================================================
// Mobilization / Demobilization
// ============================================================================

export async function createMobilization(
  data: Omit<Mobilization, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<Mobilization> {
  await hasPermission({
    userId,
    role: 'project_manager',
    action: 'create',
    resource: 'asset_mobilization',
  });

  const mobilization: Mobilization = {
    ...data,
    id: generateId(),
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await mobilizationsStore.create(mobilization);

  await recordAudit({
    entityType: 'Mobilization',
    entityId: mobilization.id,
    action: 'create',
    before: null,
    after: mobilization as unknown as Record<string, unknown>,
    actorId: userId,
    actorRole: 'project_manager',
    requestId: generateId(),
    reason: `${data.type} scheduled`,
  });

  return mobilization;
}

// ============================================================================
// Utilization Metrics
// ============================================================================

export async function calculateUtilization(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalDays: number;
  allocatedDays: number;
  utilizationPercent: number;
  allocations: AssetAllocation[];
}> {
  const allocations = await allocationsStore.findAll({ assetId } as Partial<AssetAllocation>);
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate allocated days
  let allocatedDays = 0;
  const relevantAllocations: AssetAllocation[] = [];

  for (const alloc of allocations) {
    const allocStart = new Date(alloc.plannedStartDate);
    const allocEnd = alloc.plannedEndDate ? new Date(alloc.plannedEndDate) : end;

    // Check if allocation overlaps with period
    if (allocStart <= end && allocEnd >= start) {
      const overlapStart = allocStart > start ? allocStart : start;
      const overlapEnd = allocEnd < end ? allocEnd : end;
      const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24));
      allocatedDays += days;
      relevantAllocations.push(alloc);
    }
  }

  const utilizationPercent = totalDays > 0 ? (allocatedDays / totalDays) * 100 : 0;

  return {
    totalDays,
    allocatedDays,
    utilizationPercent,
    allocations: relevantAllocations,
  };
}
