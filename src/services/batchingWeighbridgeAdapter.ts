/**
 * Part 12 — Batching Plant and Weighbridge Adapters
 */

import { storage } from './storage';
import { BatchRecord, WeighbridgeTicket } from './integrationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { processInboundEvent } from './integrationFramework';

const batchRecordsStore = storage.getAdapter<BatchRecord>('batch_records');
const weighbridgeTicketsStore = storage.getAdapter<WeighbridgeTicket>('weighbridge_tickets');

// ============================================================================
// Batching Plant
// ============================================================================

export async function ingestBatchRecord(
  connectorId: string,
  batch: Omit<BatchRecord, 'id' | 'receivedAt' | 'createdAt' | 'updatedAt'>
): Promise<BatchRecord> {
  // Process through integration framework
  await processInboundEvent(
    connectorId,
    'BatchRecordImported',
    batch.batchNumber,
    batch as any,
    batch.batchEndTime
  );

  // Store batch record
  const batchRecord: BatchRecord = {
    ...batch,
    id: generateId(),
    receivedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await batchRecordsStore.create(batchRecord);

  await recordAudit({
    entityType: 'BatchRecord',
    entityId: batchRecord.id,
    action: 'create',
    before: null,
    after: batchRecord as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Batch record imported from batching plant',
  });

  return batchRecord;
}

export async function getBatchRecord(id: string): Promise<BatchRecord | null> {
  return batchRecordsStore.findById(id);
}

export async function getBatchRecordByNumber(batchNumber: string): Promise<BatchRecord | null> {
  const all = await batchRecordsStore.findAll();
  return all.find(b => b.batchNumber === batchNumber) || null;
}

export async function listBatchRecords(filters?: {
  plantId?: string;
  mixDesignId?: string;
  fromDate?: string;
  toDate?: string;
  qualityStatus?: string;
}): Promise<BatchRecord[]> {
  let batches = await batchRecordsStore.findAll();

  if (filters?.plantId) {
    batches = batches.filter(b => b.plantId === filters.plantId);
  }
  if (filters?.mixDesignId) {
    batches = batches.filter(b => b.mixDesignId === filters.mixDesignId);
  }
  if (filters?.fromDate) {
    batches = batches.filter(b => b.batchEndTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    batches = batches.filter(b => b.batchEndTime <= filters.toDate!);
  }
  if (filters?.qualityStatus) {
    batches = batches.filter(b => b.qualityStatus === filters.qualityStatus);
  }

  return batches.sort((a, b) => new Date(b.batchEndTime).getTime() - new Date(a.batchEndTime).getTime());
}

export async function updateBatchQualityStatus(
  id: string,
  qualityStatus: 'pending' | 'approved' | 'rejected',
  qualityNotes: string | undefined,
  userId: string
): Promise<BatchRecord> {
  const batch = await batchRecordsStore.findById(id);
  if (!batch) {
    throw new Error(`Batch record ${id} not found`);
  }

  const updated = await batchRecordsStore.update(id, {
    qualityStatus,
    qualityNotes,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'BatchRecord',
    entityId: id,
    action: 'update',
    before: { qualityStatus: batch.qualityStatus },
    after: { qualityStatus, qualityNotes },
    actorId: userId,
    actorRole: 'qc_manager',
    requestId: generateId(),
    reason: 'Batch quality status updated',
  });

  return updated;
}

// ============================================================================
// Weighbridge
// ============================================================================

export async function ingestWeighbridgeTicket(
  connectorId: string,
  ticket: Omit<WeighbridgeTicket, 'id' | 'receivedAt' | 'createdAt' | 'updatedAt' | 'duplicateDetected' | 'tareAnomaly'>
): Promise<WeighbridgeTicket> {
  // Check for duplicate ticket
  const existingTicket = await getWeighbridgeTicketByNumber(ticket.ticketNumber);
  if (existingTicket) {
    await raiseAlert({
      ruleCode: 'DUPLICATE_WEIGHBRIDGE_TICKET',
      severity: 'warning',
      title: `Duplicate Weighbridge Ticket: ${ticket.ticketNumber}`,
      description: `Ticket ${ticket.ticketNumber} already exists in the system`,
      module: 'Integration',
      entityType: 'WeighbridgeTicket',
      entityId: ticket.ticketNumber,
      responsibleRole: 'store_keeper',
      recommendedAction: 'Verify if this is a legitimate duplicate or data entry error',
      dueInHours: 24,
      requestId: generateId(),
    });

    // Return existing ticket with duplicate flag
    return {
      ...existingTicket,
      duplicateDetected: true,
    };
  }

  // Check for tare anomaly (significant deviation from typical tare weight)
  const tareAnomaly = checkTareAnomaly(ticket.vehicleNumber, ticket.tareWeight);

  // Process through integration framework
  await processInboundEvent(
    connectorId,
    'WeighbridgeTicket',
    ticket.ticketNumber,
    ticket as any,
    ticket.weighTime
  );

  // Store ticket
  const ticketRecord: WeighbridgeTicket = {
    ...ticket,
    id: generateId(),
    receivedAt: new Date().toISOString(),
    duplicateDetected: false,
    tareAnomaly,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await weighbridgeTicketsStore.create(ticketRecord);

  if (tareAnomaly) {
    await raiseAlert({
      ruleCode: 'WEIGHBRIDGE_TARE_ANOMALY',
      severity: 'warning',
      title: `Weighbridge Tare Anomaly: ${ticket.vehicleNumber}`,
      description: `Vehicle ${ticket.vehicleNumber} tare weight ${ticket.tareWeight}kg deviates significantly from historical average`,
      module: 'Integration',
      entityType: 'WeighbridgeTicket',
      entityId: ticketRecord.id,
      responsibleRole: 'store_keeper',
      recommendedAction: 'Verify vehicle tare weight',
      dueInHours: 24,
      requestId: generateId(),
    });
  }

  await recordAudit({
    entityType: 'WeighbridgeTicket',
    entityId: ticketRecord.id,
    action: 'create',
    before: null,
    after: ticketRecord as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Weighbridge ticket imported',
  });

  return ticketRecord;
}

function checkTareAnomaly(vehicleNumber: string, tareWeight: number): boolean {
  // In a real implementation, would check against historical tare weights for this vehicle
  // For now, return false (no anomaly)
  return false;
}

export async function getWeighbridgeTicket(id: string): Promise<WeighbridgeTicket | null> {
  return weighbridgeTicketsStore.findById(id);
}

export async function getWeighbridgeTicketByNumber(ticketNumber: string): Promise<WeighbridgeTicket | null> {
  const all = await weighbridgeTicketsStore.findAll();
  return all.find(t => t.ticketNumber === ticketNumber) || null;
}

export async function listWeighbridgeTickets(filters?: {
  weighbridgeId?: string;
  transactionType?: string;
  materialType?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<WeighbridgeTicket[]> {
  let tickets = await weighbridgeTicketsStore.findAll();

  if (filters?.weighbridgeId) {
    tickets = tickets.filter(t => t.weighbridgeId === filters.weighbridgeId);
  }
  if (filters?.transactionType) {
    tickets = tickets.filter(t => t.transactionType === filters.transactionType);
  }
  if (filters?.materialType) {
    tickets = tickets.filter(t => t.materialType === filters.materialType);
  }
  if (filters?.fromDate) {
    tickets = tickets.filter(t => t.weighTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    tickets = tickets.filter(t => t.weighTime <= filters.toDate!);
  }

  return tickets.sort((a, b) => new Date(b.weighTime).getTime() - new Date(a.weighTime).getTime());
}

export async function getWeighbridgeStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalTickets: number;
  totalReceiptWeight: number;
  totalDispatchWeight: number;
  duplicateCount: number;
  tareAnomalyCount: number;
}> {
  let tickets = await weighbridgeTicketsStore.findAll();

  if (filters?.fromDate) {
    tickets = tickets.filter(t => t.weighTime >= filters.fromDate!);
  }
  if (filters?.toDate) {
    tickets = tickets.filter(t => t.weighTime <= filters.toDate!);
  }

  const receipts = tickets.filter(t => t.transactionType === 'receipt');
  const dispatches = tickets.filter(t => t.transactionType === 'dispatch');

  return {
    totalTickets: tickets.length,
    totalReceiptWeight: receipts.reduce((sum, t) => sum + t.netWeight, 0),
    totalDispatchWeight: dispatches.reduce((sum, t) => sum + t.netWeight, 0),
    duplicateCount: tickets.filter(t => t.duplicateDetected).length,
    tareAnomalyCount: tickets.filter(t => t.tareAnomaly).length,
  };
}
