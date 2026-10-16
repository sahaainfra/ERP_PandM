/**
 * Part 21 — Posting Service
 */

import { storage } from './storage';
import { 
  FinancialPosting, 
  PostingRule, 
  PostingPeriod, 
  TransactionType,
  PostingStatus
} from './financeTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const postingsStore = storage.getAdapter<FinancialPosting>('financial_postings');
const rulesStore = storage.getAdapter<PostingRule>('posting_rules');
const periodsStore = storage.getAdapter<PostingPeriod>('posting_periods');

// ============================================================================
// Posting Rules
// ============================================================================

export async function createPostingRule(params: {
  name: string;
  transactionType: TransactionType;
  debitAccountId: string;
  creditAccountId: string;
  conditions?: Record<string, any>;
  isActive?: boolean;
}): Promise<PostingRule> {
  const rule: PostingRule = {
    ...params,
    id: generateId(),
    isActive: params.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await rulesStore.create(rule);

  await recordAudit({
    entityType: 'PostingRule',
    entityId: rule.id,
    action: 'create',
    before: null,
    after: rule as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Posting rule created for ${rule.transactionType}`,
  });

  return rule;
}

export async function getPostingRule(id: string): Promise<PostingRule | null> {
  return rulesStore.findById(id);
}

export async function getPostingRuleByTransactionType(
  transactionType: TransactionType
): Promise<PostingRule | null> {
  const all = await rulesStore.findAll();
  return all.find(r => r.transactionType === transactionType && r.isActive) || null;
}

export async function listPostingRules(filters?: {
  transactionType?: TransactionType;
  isActive?: boolean;
}): Promise<PostingRule[]> {
  let rules = await rulesStore.findAll();

  if (filters?.transactionType) {
    rules = rules.filter(r => r.transactionType === filters.transactionType);
  }
  if (filters?.isActive !== undefined) {
    rules = rules.filter(r => r.isActive === filters.isActive);
  }

  return rules;
}

// ============================================================================
// Posting Periods
// ============================================================================

export async function createPostingPeriod(params: {
  periodName: string;
  startDate: string;
  endDate: string;
  status?: 'open' | 'closed' | 'locked';
}): Promise<PostingPeriod> {
  const period: PostingPeriod = {
    ...params,
    id: generateId(),
    status: params.status ?? 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await periodsStore.create(period);
  return period;
}

export async function getPostingPeriod(id: string): Promise<PostingPeriod | null> {
  return periodsStore.findById(id);
}

export async function getActivePeriodForDate(date: string): Promise<PostingPeriod | null> {
  const all = await periodsStore.findAll();
  const checkDate = new Date(date);
  
  return all.find(p => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return checkDate >= start && checkDate <= end && p.status === 'open';
  }) || null;
}

export async function closePostingPeriod(
  id: string,
  userId: string
): Promise<PostingPeriod> {
  const period = await periodsStore.findById(id);
  if (!period) {
    throw new Error(`Posting period ${id} not found`);
  }

  if (period.status !== 'open') {
    throw new Error(`Period is not open (current status: ${period.status})`);
  }

  const updated = await periodsStore.update(id, {
    status: 'closed',
    closedBy: userId,
    closedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'PostingPeriod',
    entityId: id,
    action: 'update',
    before: { status: 'open' },
    after: { status: 'closed' },
    actorId: userId,
    actorRole: 'accounts_manager',
    requestId: generateId(),
    reason: 'Period closed',
  });

  return updated;
}

// ============================================================================
// Financial Postings
// ============================================================================

export async function createPosting(params: {
  sourceType: TransactionType;
  sourceId: string;
  sourceReference?: string;
  debitAccountId: string;
  debitAccountName: string;
  creditAccountId: string;
  creditAccountName: string;
  amount: number;
  currency: string;
  postingDate: string;
  description: string;
  notes?: string;
  createdBy: string;
}): Promise<FinancialPosting> {
  // Check for duplicate posting from same source
  const existing = await getPostingBySource(params.sourceType, params.sourceId);
  if (existing && existing.status !== 'reversed') {
    throw new Error(`Posting already exists for ${params.sourceType} ${params.sourceId}`);
  }

  // Check period is open
  const period = await getActivePeriodForDate(params.postingDate);
  if (!period) {
    throw new Error(`No open posting period found for date ${params.postingDate}`);
  }

  // Generate posting number
  const postingNumber = `FP-${Date.now()}`;

  const posting: FinancialPosting = {
    ...params,
    id: generateId(),
    postingNumber,
    periodId: period.id,
    status: 'draft',
    isReversal: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await postingsStore.create(posting);

  await recordAudit({
    entityType: 'FinancialPosting',
    entityId: posting.id,
    action: 'create',
    before: null,
    after: posting as any,
    actorId: params.createdBy,
    actorRole: 'accounts_executive',
    requestId: generateId(),
    reason: `Posting created for ${params.sourceType} ${params.sourceId}`,
  });

  return posting;
}

export async function getPosting(id: string): Promise<FinancialPosting | null> {
  return postingsStore.findById(id);
}

export async function getPostingBySource(
  sourceType: TransactionType,
  sourceId: string
): Promise<FinancialPosting | null> {
  const all = await postingsStore.findAll();
  return all.find(p => p.sourceType === sourceType && p.sourceId === sourceId) || null;
}

export async function listPostings(filters?: {
  sourceType?: TransactionType;
  status?: PostingStatus;
  periodId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<FinancialPosting[]> {
  let postings = await postingsStore.findAll();

  if (filters?.sourceType) {
    postings = postings.filter(p => p.sourceType === filters.sourceType);
  }
  if (filters?.status) {
    postings = postings.filter(p => p.status === filters.status);
  }
  if (filters?.periodId) {
    postings = postings.filter(p => p.periodId === filters.periodId);
  }
  if (filters?.fromDate) {
    postings = postings.filter(p => p.postingDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    postings = postings.filter(p => p.postingDate <= filters.toDate!);
  }

  return postings.sort((a, b) => new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime());
}

export async function approvePosting(
  id: string,
  userId: string
): Promise<FinancialPosting> {
  const posting = await postingsStore.findById(id);
  if (!posting) {
    throw new Error(`Posting ${id} not found`);
  }

  if (posting.status !== 'draft') {
    throw new Error(`Posting is not in draft status (current: ${posting.status})`);
  }

  const updated = await postingsStore.update(id, {
    status: 'approved',
    approvedBy: userId,
    approvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FinancialPosting',
    entityId: id,
    action: 'approve',
    before: { status: 'draft' },
    after: { status: 'approved' },
    actorId: userId,
    actorRole: 'accounts_manager',
    requestId: generateId(),
    reason: 'Posting approved',
  });

  return updated;
}

export async function postPosting(
  id: string,
  userId: string
): Promise<FinancialPosting> {
  const posting = await postingsStore.findById(id);
  if (!posting) {
    throw new Error(`Posting ${id} not found`);
  }

  if (posting.status !== 'approved') {
    throw new Error(`Posting is not approved (current: ${posting.status})`);
  }

  const updated = await postingsStore.update(id, {
    status: 'posted',
    postedBy: userId,
    postedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FinancialPosting',
    entityId: id,
    action: 'post',
    before: { status: 'approved' },
    after: { status: 'posted' },
    actorId: userId,
    actorRole: 'accounts_manager',
    requestId: generateId(),
    reason: 'Posting posted to ledger',
  });

  return updated;
}

export async function reversePosting(
  id: string,
  reason: string,
  userId: string
): Promise<FinancialPosting> {
  const posting = await postingsStore.findById(id);
  if (!posting) {
    throw new Error(`Posting ${id} not found`);
  }

  if (posting.status !== 'posted') {
    throw new Error(`Only posted postings can be reversed (current: ${posting.status})`);
  }

  // Update original posting
  await postingsStore.update(id, {
    status: 'reversed',
    updatedAt: new Date().toISOString(),
  });

  // Create reversal posting
  const reversal = await createPosting({
    sourceType: posting.sourceType,
    sourceId: posting.sourceId,
    sourceReference: posting.sourceReference,
    debitAccountId: posting.creditAccountId, // Reverse debit/credit
    debitAccountName: posting.creditAccountName,
    creditAccountId: posting.debitAccountId,
    creditAccountName: posting.debitAccountName,
    amount: posting.amount,
    currency: posting.currency,
    postingDate: new Date().toISOString().split('T')[0],
    description: `Reversal of ${posting.postingNumber}: ${reason}`,
    notes: reason,
    createdBy: userId,
  });

  // Link reversal to original
  await postingsStore.update(reversal.id, {
    isReversal: true,
    originalPostingId: id,
    reversalReason: reason,
    status: 'posted',
    postedBy: userId,
    postedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'FinancialPosting',
    entityId: id,
    action: 'reverse',
    before: { status: 'posted' },
    after: { status: 'reversed', reversalId: reversal.id, reason },
    actorId: userId,
    actorRole: 'accounts_manager',
    requestId: generateId(),
    reason: `Posting reversed: ${reason}`,
  });

  return reversal;
}

// ============================================================================
// Auto-Posting from Operational Events
// ============================================================================

export async function autoPostTransaction(
  sourceType: TransactionType,
  sourceId: string,
  sourceReference: string,
  amount: number,
  debitAccountId: string,
  debitAccountName: string,
  creditAccountId: string,
  creditAccountName: string,
  postingDate: string,
  description: string,
  userId: string
): Promise<FinancialPosting> {
  // Check if already posted
  const existing = await getPostingBySource(sourceType, sourceId);
  if (existing && existing.status !== 'reversed') {
    return existing; // Idempotent
  }

  // Create posting
  const posting = await createPosting({
    sourceType,
    sourceId,
    sourceReference,
    debitAccountId,
    debitAccountName,
    creditAccountId,
    creditAccountName,
    amount,
    currency: 'INR',
    postingDate,
    description,
    createdBy: userId,
  });

  // Auto-approve and post
  await approvePosting(posting.id, userId);
  const posted = await postPosting(posting.id, userId);

  return posted;
}

// ============================================================================
// Posting Statistics
// ============================================================================

export async function getPostingStatistics(filters?: {
  periodId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalPostings: number;
  postedAmount: number;
  pendingAmount: number;
  byStatus: Record<PostingStatus, number>;
  byType: Record<TransactionType, number>;
}> {
  let postings = await postingsStore.findAll();

  if (filters?.periodId) {
    postings = postings.filter(p => p.periodId === filters.periodId);
  }
  if (filters?.fromDate) {
    postings = postings.filter(p => p.postingDate >= filters.fromDate!);
  }
  if (filters?.toDate) {
    postings = postings.filter(p => p.postingDate <= filters.toDate!);
  }

  const postedAmount = postings
    .filter(p => p.status === 'posted')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = postings
    .filter(p => p.status === 'draft' || p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);

  const byStatus: Record<PostingStatus, number> = {
    draft: 0,
    pending_approval: 0,
    approved: 0,
    posted: 0,
    reversed: 0,
    paid: 0,
  };

  for (const posting of postings) {
    byStatus[posting.status]++;
  }

  const byType: Record<TransactionType, number> = {
    fuel_receipt: 0,
    fuel_issue: 0,
    spare_part_issue: 0,
    work_order_external: 0,
    hire_in: 0,
    hire_out: 0,
    material_receipt: 0,
    material_consumption: 0,
    rmc_sale: 0,
    pumping_charge: 0,
    transport_cost: 0,
    labour_cost: 0,
    overhead_allocation: 0,
  };

  for (const posting of postings) {
    byType[posting.sourceType]++;
  }

  return {
    totalPostings: postings.length,
    postedAmount: Math.round(postedAmount * 100) / 100,
    pendingAmount: Math.round(pendingAmount * 100) / 100,
    byStatus,
    byType,
  };
}

// ============================================================================
// Seed Default Posting Rules
// ============================================================================

export async function seedDefaultPostingRules(): Promise<void> {
  const existing = await rulesStore.findAll();
  if (existing.length > 0) return;

  const rules = [
    {
      name: 'Fuel Receipt',
      transactionType: 'fuel_receipt' as TransactionType,
      debitAccountId: 'fuel_inventory',
      creditAccountId: 'accounts_payable',
      isActive: true,
    },
    {
      name: 'Fuel Issue',
      transactionType: 'fuel_issue' as TransactionType,
      debitAccountId: 'fuel_expense',
      creditAccountId: 'fuel_inventory',
      isActive: true,
    },
    {
      name: 'Spare Part Issue',
      transactionType: 'spare_part_issue' as TransactionType,
      debitAccountId: 'maintenance_expense',
      creditAccountId: 'spare_parts_inventory',
      isActive: true,
    },
    {
      name: 'RMC Sale',
      transactionType: 'rmc_sale' as TransactionType,
      debitAccountId: 'accounts_receivable',
      creditAccountId: 'rmc_revenue',
      isActive: true,
    },
    {
      name: 'Transport Cost',
      transactionType: 'transport_cost' as TransactionType,
      debitAccountId: 'transport_expense',
      creditAccountId: 'accounts_payable',
      isActive: true,
    },
  ];

  for (const rule of rules) {
    await createPostingRule(rule);
  }
}
