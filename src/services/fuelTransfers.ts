/**
 * Part 09 — Fuel Transfers Service
 * 
 * Manages fuel transfers between storage points and returns from assets
 */

import { storage } from './storage';
import { FuelTransfer, FuelReturn } from './fuelTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getStoragePoint } from './fuelMasters';

const fuelTransfersStore = storage.getAdapter<FuelTransfer>('fuel_transfers');
const fuelReturnsStore = storage.getAdapter<FuelReturn>('fuel_returns');

// ============================================================================
// Fuel Transfers
// ============================================================================

export async function createFuelTransfer(data: Omit<FuelTransfer, 'id' | 'transferNumber' | 'createdAt' | 'updatedAt'>): Promise<FuelTransfer> {
  // Validate source storage point
  const fromStoragePoint = await getStoragePoint(data.fromStoragePointId);
  if (!fromStoragePoint) {
    throw new Error(`Source storage point ${data.fromStoragePointId} not found`);
  }

  // Validate destination storage point
  const toStoragePoint = await getStoragePoint(data.toStoragePointId);
  if (!toStoragePoint) {
    throw new Error(`Destination storage point ${data.toStoragePointId} not found`);
  }

  // Validate fuel types match
  if (fromStoragePoint.fuelTypeId !== toStoragePoint.fuelTypeId) {
    throw new Error('Cannot transfer between different fuel types');
  }

  // Generate transfer number
  const transferNumber = `FT-${Date.now()}`;

  const transfer: FuelTransfer = {
    ...data,
    id: generateId(),
    transferNumber,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fuelTransfersStore.create(transfer);

  await recordAudit({
    entityType: 'FuelTransfer',
    entityId: transfer.id,
    action: 'create',
    before: null,
    after: transfer as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel transfer created',
  });

  return transfer;
}

export async function getFuelTransfer(id: string): Promise<FuelTransfer | null> {
  return fuelTransfersStore.findById(id);
}

export async function getFuelTransferByNumber(transferNumber: string): Promise<FuelTransfer | null> {
  const all = await fuelTransfersStore.findAll();
  return all.find(t => t.transferNumber === transferNumber) || null;
}

export async function listFuelTransfers(filters?: {
  fromStoragePointId?: string;
  toStoragePointId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<FuelTransfer[]> {
  let transfers = await fuelTransfersStore.findAll();

  if (filters?.fromStoragePointId) {
    transfers = transfers.filter(t => t.fromStoragePointId === filters.fromStoragePointId);
  }
  if (filters?.toStoragePointId) {
    transfers = transfers.filter(t => t.toStoragePointId === filters.toStoragePointId);
  }
  if (filters?.fromDate) {
    transfers = transfers.filter(t => t.transferDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    transfers = transfers.filter(t => t.transferDate <= filters.toDate!);
  }
  if (filters?.status) {
    transfers = transfers.filter(t => t.status === filters.status);
  }

  return transfers.sort((a, b) => new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime());
}

export async function submitFuelTransfer(id: string, userId: string): Promise<FuelTransfer> {
  const transfer = await fuelTransfersStore.findById(id);
  if (!transfer) {
    throw new Error(`Fuel transfer ${id} not found`);
  }

  if (transfer.status !== 'draft') {
    throw new Error(`Fuel transfer is not in draft status (current: ${transfer.status})`);
  }

  // Validate measurements if meters are used
  if (transfer.fromMeterOpening !== undefined && transfer.fromMeterClosing !== undefined) {
    if (transfer.fromMeterClosing < transfer.fromMeterOpening) {
      throw new Error('Source meter closing reading cannot be less than opening reading');
    }

    const meterQuantity = transfer.fromMeterClosing - transfer.fromMeterOpening;
    const variance = Math.abs(meterQuantity - transfer.quantity);
    const variancePercent = (variance / transfer.quantity) * 100;

    if (variancePercent > 2) {
      throw new Error(`Source meter variance of ${variancePercent.toFixed(2)}% exceeds 2% tolerance`);
    }
  }

  if (transfer.toMeterOpening !== undefined && transfer.toMeterClosing !== undefined) {
    if (transfer.toMeterClosing < transfer.toMeterOpening) {
      throw new Error('Destination meter closing reading cannot be less than opening reading');
    }

    const meterQuantity = transfer.toMeterClosing - transfer.toMeterOpening;
    const variance = Math.abs(meterQuantity - transfer.quantity);
    const variancePercent = (variance / transfer.quantity) * 100;

    if (variancePercent > 2) {
      throw new Error(`Destination meter variance of ${variancePercent.toFixed(2)}% exceeds 2% tolerance`);
    }
  }

  const updated = await fuelTransfersStore.update(id, {
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelTransfer',
    entityId: id,
    action: 'submit',
    before: transfer as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel transfer submitted',
  });

  return updated;
}

export async function completeFuelTransfer(id: string, userId: string): Promise<FuelTransfer> {
  const transfer = await fuelTransfersStore.findById(id);
  if (!transfer) {
    throw new Error(`Fuel transfer ${id} not found`);
  }

  if (transfer.status !== 'submitted') {
    throw new Error(`Fuel transfer is not in submitted status (current: ${transfer.status})`);
  }

  const updated = await fuelTransfersStore.update(id, {
    status: 'completed',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelTransfer',
    entityId: id,
    action: 'update',
    before: transfer as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel transfer completed',
  });

  return updated;
}

// ============================================================================
// Fuel Returns
// ============================================================================

export async function createFuelReturn(data: Omit<FuelReturn, 'id' | 'returnNumber' | 'createdAt' | 'updatedAt'>): Promise<FuelReturn> {
  // Validate destination storage point
  const storagePoint = await getStoragePoint(data.toStoragePointId);
  if (!storagePoint) {
    throw new Error(`Storage point ${data.toStoragePointId} not found`);
  }

  // Generate return number
  const returnNumber = `FR-${Date.now()}`;

  const fuelReturn: FuelReturn = {
    ...data,
    id: generateId(),
    returnNumber,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await fuelReturnsStore.create(fuelReturn);

  await recordAudit({
    entityType: 'FuelReturn',
    entityId: fuelReturn.id,
    action: 'create',
    before: null,
    after: fuelReturn as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Fuel return created',
  });

  return fuelReturn;
}

export async function getFuelReturn(id: string): Promise<FuelReturn | null> {
  return fuelReturnsStore.findById(id);
}

export async function getFuelReturnByNumber(returnNumber: string): Promise<FuelReturn | null> {
  const all = await fuelReturnsStore.findAll();
  return all.find(r => r.returnNumber === returnNumber) || null;
}

export async function listFuelReturns(filters?: {
  toStoragePointId?: string;
  assetId?: string;
  operatorId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<FuelReturn[]> {
  let returns = await fuelReturnsStore.findAll();

  if (filters?.toStoragePointId) {
    returns = returns.filter(r => r.toStoragePointId === filters.toStoragePointId);
  }
  if (filters?.assetId) {
    returns = returns.filter(r => r.assetId === filters.assetId);
  }
  if (filters?.operatorId) {
    returns = returns.filter(r => r.operatorId === filters.operatorId);
  }
  if (filters?.fromDate) {
    returns = returns.filter(r => r.returnDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    returns = returns.filter(r => r.returnDate <= filters.toDate!);
  }
  if (filters?.status) {
    returns = returns.filter(r => r.status === filters.status);
  }

  return returns.sort((a, b) => new Date(b.returnDate).getTime() - new Date(a.returnDate).getTime());
}

export async function submitFuelReturn(id: string, userId: string): Promise<FuelReturn> {
  const fuelReturn = await fuelReturnsStore.findById(id);
  if (!fuelReturn) {
    throw new Error(`Fuel return ${id} not found`);
  }

  if (fuelReturn.status !== 'draft') {
    throw new Error(`Fuel return is not in draft status (current: ${fuelReturn.status})`);
  }

  // Validate dip measurements if used
  if (fuelReturn.dipBefore !== undefined && fuelReturn.dipAfter !== undefined) {
    if (fuelReturn.dipAfter < fuelReturn.dipBefore) {
      throw new Error('Dip after return cannot be less than dip before return');
    }
  }

  const updated = await fuelReturnsStore.update(id, {
    status: 'submitted',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelReturn',
    entityId: id,
    action: 'submit',
    before: fuelReturn as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel return submitted',
  });

  return updated;
}

export async function completeFuelReturn(id: string, userId: string): Promise<FuelReturn> {
  const fuelReturn = await fuelReturnsStore.findById(id);
  if (!fuelReturn) {
    throw new Error(`Fuel return ${id} not found`);
  }

  if (fuelReturn.status !== 'submitted') {
    throw new Error(`Fuel return is not in submitted status (current: ${fuelReturn.status})`);
  }

  const updated = await fuelReturnsStore.update(id, {
    status: 'completed',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FuelReturn',
    entityId: id,
    action: 'update',
    before: fuelReturn as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: 'Fuel return completed',
  });

  return updated;
}

// ============================================================================
// Transfer Statistics
// ============================================================================

export async function getTransferStatistics(filters?: {
  fromStoragePointId?: string;
  toStoragePointId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalTransfers: number;
  totalQuantity: number;
}> {
  let transfers = await fuelTransfersStore.findAll();

  if (filters?.fromStoragePointId) {
    transfers = transfers.filter(t => t.fromStoragePointId === filters.fromStoragePointId);
  }
  if (filters?.toStoragePointId) {
    transfers = transfers.filter(t => t.toStoragePointId === filters.toStoragePointId);
  }
  if (filters?.fromDate) {
    transfers = transfers.filter(t => t.transferDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    transfers = transfers.filter(t => t.transferDate <= filters.toDate!);
  }

  const completedTransfers = transfers.filter(t => t.status === 'completed');

  return {
    totalTransfers: completedTransfers.length,
    totalQuantity: completedTransfers.reduce((sum, t) => sum + t.quantity, 0),
  };
}

export async function getReturnStatistics(filters?: {
  toStoragePointId?: string;
  assetId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalReturns: number;
  totalQuantity: number;
}> {
  let returns = await fuelReturnsStore.findAll();

  if (filters?.toStoragePointId) {
    returns = returns.filter(r => r.toStoragePointId === filters.toStoragePointId);
  }
  if (filters?.assetId) {
    returns = returns.filter(r => r.assetId === filters.assetId);
  }
  if (filters?.fromDate) {
    returns = returns.filter(r => r.returnDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    returns = returns.filter(r => r.returnDate <= filters.toDate!);
  }

  const completedReturns = returns.filter(r => r.status === 'completed');

  return {
    totalReturns: completedReturns.length,
    totalQuantity: completedReturns.reduce((sum, r) => sum + r.quantity, 0),
  };
}
