/**
 * 2.8 API Conventions
 *
 * Standard error format, pagination, filtering, sorting, search,
 * API versioning, request IDs, and structured logs.
 */

import { ApiError, PaginatedResponse, SortParam, FilterParam, ApiRequestContext } from './types';
import { generateRequestId } from './utils';

// ============================================================================
// Error Codes
// ============================================================================

export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  WORKFLOW_TRANSITION_INVALID: 'WORKFLOW_TRANSITION_INVALID',
  SEPARATION_OF_DUTIES: 'SEPARATION_OF_DUTIES',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
} as const;

// ============================================================================
// Error Factory
// ============================================================================

/**
 * Create a standardized API error.
 */
export function createApiError(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    details,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a validation error with field-level details.
 */
export function createValidationError(
  fields: Record<string, string>,
  requestId: string
): ApiError {
  return {
    code: ErrorCodes.VALIDATION_ERROR,
    message: 'Validation failed',
    details: { fields },
    requestId,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Paginate an array of results.
 */
export function paginate<T>(
  data: T[],
  params: PaginationParams
): PaginatedResponse<T> {
  const { page, pageSize } = params;
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// ============================================================================
// Filtering
// ============================================================================

/**
 * Apply filters to an array of data.
 */
export function applyFilters<T extends Record<string, unknown>>(
  data: T[],
  filters: FilterParam[]
): T[] {
  return data.filter(item => {
    return filters.every(filter => {
      const value = item[filter.field];

      switch (filter.operator) {
        case 'eq':
          return value === filter.value;
        case 'ne':
          return value !== filter.value;
        case 'gt':
          return typeof value === 'number' && value > (filter.value as number);
        case 'gte':
          return typeof value === 'number' && value >= (filter.value as number);
        case 'lt':
          return typeof value === 'number' && value < (filter.value as number);
        case 'lte':
          return typeof value === 'number' && value <= (filter.value as number);
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(value);
        case 'like':
          return typeof value === 'string' && typeof filter.value === 'string' &&
            value.toLowerCase().includes(filter.value.toLowerCase());
        case 'between':
          if (Array.isArray(filter.value) && filter.value.length === 2) {
            const [min, max] = filter.value;
            return typeof value === 'number' && value >= min && value <= max;
          }
          return false;
        default:
          return true;
      }
    });
  });
}

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sort an array of data.
 */
export function applySorting<T extends Record<string, unknown>>(
  data: T[],
  sorts: SortParam[]
): T[] {
  return [...data].sort((a, b) => {
    for (const sort of sorts) {
      const aVal = a[sort.field];
      const bVal = b[sort.field];

      let comparison = 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else if (aVal instanceof Date && bVal instanceof Date) {
        comparison = aVal.getTime() - bVal.getTime();
      }

      if (comparison !== 0) {
        return sort.direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  });
}

// ============================================================================
// Search
// ============================================================================

/**
 * Search across multiple fields.
 */
export function applySearch<T extends Record<string, unknown>>(
  data: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query || query.trim().length === 0) return data;

  const lowerQuery = query.toLowerCase();

  return data.filter(item => {
    return fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      if (typeof value === 'number') {
        return value.toString().includes(query);
      }
      return false;
    });
  });
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Create a request context for API calls.
 */
export function createRequestContext(params: {
  userId: string;
  userRole: import('./types').UserRole;
  companyId: string;
  scopes: import('./types').UserScope[];
  ipAddress?: string;
  deviceId?: string;
}): ApiRequestContext {
  return {
    requestId: generateRequestId(),
    userId: params.userId,
    userRole: params.userRole,
    companyId: params.companyId,
    scopes: params.scopes,
    ipAddress: params.ipAddress,
    deviceId: params.deviceId,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Structured Logging
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Structured logger.
 */
export const logger = {
  debug(message: string, metadata?: Record<string, unknown>): void {
    log('debug', message, metadata);
  },

  info(message: string, metadata?: Record<string, unknown>): void {
    log('info', message, metadata);
  },

  warn(message: string, metadata?: Record<string, unknown>): void {
    log('warn', message, metadata);
  },

  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    log('error', message, { ...metadata, error: error?.message });
  },
};

function log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // In production, this would send to a logging service
  // For demo, we log to console
  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] ${message}`, metadata);
  } else if (level === 'warn') {
    console.warn(`[${level.toUpperCase()}] ${message}`, metadata);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`, metadata);
  }
}

// ============================================================================
// API Versioning
// ============================================================================

export const API_VERSION = 'v1';

/**
 * Build an API path with version prefix.
 */
export function apiPath(path: string): string {
  return `/api/${API_VERSION}${path}`;
}
