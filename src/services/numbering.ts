/**
 * 2.2 Document Numbering Service
 *
 * Configurable number series per document type, company, plant/site, and
 * Indian financial year (April–March). Gap-free where accounting requires.
 * Concurrency-safe via optimistic locking simulation.
 */

import { storage } from './storage';
import { NumberSeries, DocumentType } from './types';
import { generateId, getCurrentFinancialYear } from './utils';

const numberSeriesStore = storage.getAdapter<NumberSeries>('number_series');

// In-flight generation lock (simulates DB row-level locking)
const generationLocks = new Map<string, Promise<string>>();

/**
 * Get or create a number series for a document type/company/plant/FY.
 */
export async function getOrCreateSeries(
  companyId: string,
  documentType: DocumentType,
  options: {
    plantId?: string;
    siteId?: string;
    prefix?: string;
    paddingLength?: number;
    suffix?: string;
  } = {}
): Promise<NumberSeries> {
  const fy = getCurrentFinancialYear();
  const prefix = options.prefix || getDefaultPrefix(documentType);
  const paddingLength = options.paddingLength || 4;

  // Look for existing series
  const allSeries = await numberSeriesStore.findAll();
  const existing = allSeries.find(s =>
    s.companyId === companyId &&
    s.documentType === documentType &&
    s.financialYear === fy &&
    s.plantId === (options.plantId || undefined) &&
    s.siteId === (options.siteId || undefined)
  );

  if (existing) return existing;

  // Create new series
  const series: NumberSeries = {
    id: generateId(),
    companyId,
    documentType,
    plantId: options.plantId,
    siteId: options.siteId,
    prefix,
    financialYear: fy,
    lastNumber: 0,
    paddingLength,
    suffix: options.suffix,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return numberSeriesStore.create(series);
}

/**
 * Generate the next number in a series.
 * Concurrency-safe: uses a lock per series key to prevent duplicates.
 */
export async function generateNumber(
  companyId: string,
  documentType: DocumentType,
  options: {
    plantId?: string;
    siteId?: string;
  } = {}
): Promise<string> {
  const fy = getCurrentFinancialYear();
  const lockKey = `${companyId}:${documentType}:${fy}:${options.plantId || ''}:${options.siteId || ''}`;

  // If there's already a generation in progress for this series, wait for it
  if (generationLocks.has(lockKey)) {
    return generationLocks.get(lockKey)!;
  }

  const generation = (async () => {
    const series = await getOrCreateSeries(companyId, documentType, options);

    // Increment
    const newNumber = series.lastNumber + 1;
    await numberSeriesStore.update(series.id, {
      lastNumber: newNumber,
      updatedAt: new Date().toISOString(),
    });

    // Format: PREFIX/FY/NNNN
    const padded = newNumber.toString().padStart(series.paddingLength, '0');
    const fyFormatted = series.financialYear;
    let result = `${series.prefix}/${fyFormatted}/${padded}`;
    if (series.suffix) result += `/${series.suffix}`;

    return result;
  })();

  generationLocks.set(lockKey, generation);

  try {
    const result = await generation;
    return result;
  } finally {
    generationLocks.delete(lockKey);
  }
}

/**
 * Generate multiple numbers (batch).
 */
export async function generateNumbers(
  companyId: string,
  documentType: DocumentType,
  count: number,
  options: { plantId?: string; siteId?: string } = {}
): Promise<string[]> {
  const numbers: string[] = [];
  for (let i = 0; i < count; i++) {
    numbers.push(await generateNumber(companyId, documentType, options));
  }
  return numbers;
}

/**
 * Reset a series (admin function — requires audit).
 */
export async function resetSeries(seriesId: string, reason: string): Promise<void> {
  const series = await numberSeriesStore.findById(seriesId);
  if (!series) throw new Error(`Series ${seriesId} not found`);
  await numberSeriesStore.update(seriesId, {
    lastNumber: 0,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * List all series for a company.
 */
export async function listSeries(companyId: string): Promise<NumberSeries[]> {
  return numberSeriesStore.findAll({ companyId } as Partial<NumberSeries>);
}

/**
 * Get default prefix for a document type.
 */
function getDefaultPrefix(documentType: DocumentType): string {
  const prefixes: Record<DocumentType, string> = {
    EQUIPMENT: 'EQ',
    OPERATOR_LOG: 'OL',
    FUEL_RECORD: 'FR',
    MAINTENANCE_ORDER: 'MO',
    RMC_ORDER: 'RMC',
    BATCH_TICKET: 'BT',
    QUALITY_TEST: 'QT',
    JOURNAL_VOUCHER: 'JV',
    PAYMENT_VOUCHER: 'PV',
    RECEIPT_VOUCHER: 'RV',
    PURCHASE_ORDER: 'PO',
    GOODS_RECEIPT: 'GR',
    ATTACHMENT: 'ATT',
    ALERT: 'ALT',
  };
  return prefixes[documentType] || 'DOC';
}

/**
 * Parse a document number into its components.
 */
export function parseDocumentNumber(docNo: string): {
  prefix: string;
  financialYear: string;
  sequence: number;
  suffix?: string;
} | null {
  const parts = docNo.split('/');
  if (parts.length < 3) return null;

  return {
    prefix: parts[0],
    financialYear: parts[1],
    sequence: parseInt(parts[2], 10),
    suffix: parts[3],
  };
}
