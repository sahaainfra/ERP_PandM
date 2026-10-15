/**
 * Shared utilities for Part 02 services.
 */

/**
 * Generate a unique ID (UUID v4 format).
 * In production, this would come from the server. For demo, we use crypto.randomUUID
 * with a fallback.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: simple random ID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a request ID for API tracing.
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * SHA-256 hash (async, uses Web Crypto API).
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get current Indian financial year string (e.g., '2026-27').
 * Indian FY runs April 1 to March 31.
 */
export function getCurrentFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  // If month is Jan-Mar (0-2), FY started previous year
  const fyStart = month < 3 ? year - 1 : year;
  const fyEnd = fyStart + 1;
  return `${fyStart}-${fyEnd.toString().slice(-2)}`;
}

/**
 * Check if a date falls within a given financial year.
 */
export function isInFinancialYear(date: Date, fy: string): boolean {
  const [startStr, endStr] = fy.split('-');
  const startYear = parseInt(startStr, 10);
  const endYear = parseInt('20' + endStr, 10);
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month < 3) { // Jan-Mar
    return year === endYear;
  }
  return year === startYear;
}

/**
 * Format INR with Indian digit grouping.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format number with Indian digit grouping.
 */
export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format date in Indian locale.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format datetime in Indian timezone.
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Deep clone an object (for audit before/after snapshots).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compute diff between two objects (for audit trail).
 */
export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): { changed: boolean; changes: Record<string, { old: unknown; new: unknown }> } {
  if (!before && !after) return { changed: false, changes: {} };
  if (!before || !after) return { changed: true, changes: {} };

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of allKeys) {
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }

  return { changed: Object.keys(changes).length > 0, changes };
}
