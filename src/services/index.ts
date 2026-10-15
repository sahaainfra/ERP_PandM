/**
 * Part 02 & 03 — Shared Platform Foundation + Roles & Permissions
 *
 * Main entry point that exports all services and provides initialization.
 */

// Re-export all types
export * from './types';

// Re-export storage
export { storage, InMemoryAdapter } from './storage';
export type { StorageAdapter } from './storage';

// Re-export utilities
export {
  generateId,
  generateRequestId,
  sha256,
  getCurrentFinancialYear,
  isInFinancialYear,
  formatINR,
  formatNumber,
  formatDate,
  formatDateTime,
  deepClone,
  computeDiff,
} from './utils';

// Re-export services
import * as mastersService from './masters';
import * as numberingService from './numbering';
import * as auditService from './audit';
import * as attachmentsService from './attachments';
import * as workflowService from './workflow';
import * as alertsService from './alerts';
import * as idempotencyService from './idempotency';
import * as apiService from './api';
import * as rolesService from './roles';
import * as permissionsService from './permissions';
import * as delegationService from './delegation';
import * as approvalMatrixService from './approvalMatrix';
import * as assetCategoriesService from './assetCategories';
import * as assetsService from './assets';
import * as assetAllocationService from './assetAllocation';
import * as operatorManagementService from './operatorManagement';
import * as workflowConfigService from './workflowConfig';
import * as approvalReviewService from './approvalReview';
import * as amendmentService from './amendmentService';
import * as fuelMastersService from './fuelMasters';
import * as fuelReceiptsService from './fuelReceipts';
import * as fuelIssuesService from './fuelIssues';
import * as fuelTransfersService from './fuelTransfers';
import * as tankReconciliationService from './tankReconciliation';
import * as calibrationService from './calibrationService';
import * as benchmarkService from './benchmarkService';
import * as verificationEngineService from './verificationEngine';
import * as verificationJobService from './verificationJob';
import * as investigationService from './investigationService';

export {
  mastersService as masters,
  numberingService as numbering,
  auditService as audit,
  attachmentsService as attachments,
  workflowService as workflow,
  alertsService as alerts,
  idempotencyService as idempotency,
  apiService as api,
  rolesService as roles,
  permissionsService as permissions,
  delegationService as delegation,
  approvalMatrixService as approvalMatrix,
  assetCategoriesService as assetCategories,
  assetsService as assets,
  assetAllocationService as assetAllocation,
  operatorManagementService as operatorManagement,
  workflowConfigService as workflowConfig,
  approvalReviewService as approvalReview,
  amendmentService as amendments,
  fuelMastersService as fuelMasters,
  fuelReceiptsService as fuelReceipts,
  fuelIssuesService as fuelIssues,
  fuelTransfersService as fuelTransfers,
  tankReconciliationService as tankReconciliation,
  calibrationService as calibration,
  benchmarkService as benchmark,
  verificationEngineService as verificationEngine,
  verificationJobService as verificationJob,
  investigationService as investigation,
};

// ============================================================================
// Initialization
// ============================================================================

import * as workflow from './workflow';
import * as alerts from './alerts';
import * as masters from './masters';
import * as roles from './roles';
import * as permissions from './permissions';
import * as approvalMatrix from './approvalMatrix';
import * as assetCategories from './assetCategories';
import * as workflowConfig from './workflowConfig';
import * as fuelMasters from './fuelMasters';
import * as benchmark from './benchmarkService';
import { logger } from './api';
import { storage } from './storage';

/**
 * Initialize all platform services.
 * Call this once at application startup.
 */
export async function initializePlatform(): Promise<void> {
  logger.info('Initializing platform services...');

  // Initialize default workflows
  await workflow.initializeDefaultWorkflows();
  logger.info('Default workflows initialized');

  // Initialize default alert rules
  await alerts.initializeDefaultAlertRules();
  logger.info('Default alert rules initialized');

  // Seed default UoMs
  await seedDefaultUoMs();
  logger.info('Default UoMs seeded');

  // Seed default roles (Part 03)
  await roles.seedDefaultRoles();
  logger.info('Default roles seeded');

  // Seed default permissions (Part 03)
  await permissions.seedDefaultPermissions();
  logger.info('Default permissions seeded');

  // Seed default approval rules (Part 03)
  await approvalMatrix.seedDefaultApprovalRules();
  logger.info('Default approval rules seeded');

  // Seed asset categories (Part 04)
  await assetCategories.seedAssetCategories();
  logger.info('Asset categories seeded');

  // Seed workflow configuration (Part 08)
  await workflowConfig.seedDefaultRoutingRules();
  await workflowConfig.seedDefaultValidationFlags();
  await workflowConfig.seedDefaultSLAs();
  logger.info('Workflow configuration seeded');

  // Seed fuel masters (Part 09)
  await fuelMasters.seedDefaultFuelTypes();
  logger.info('Fuel masters seeded');

  // Seed fuel benchmarks (Part 10)
  await benchmark.seedDefaultBenchmarks();
  logger.info('Fuel benchmarks seeded');

  logger.info('Platform initialization complete');
}

/**
 * Seed default units of measure.
 */
async function seedDefaultUoMs(): Promise<void> {
  const existing = await masters.listUoMs();
  if (existing.length > 0) return;

  const uoms = [
    { code: 'L', name: 'Litre', category: 'volume' as const, factorToBase: 1, decimalPlaces: 2, roundingRule: 'half_up' as const },
    { code: 'KL', name: 'Kilolitre', category: 'volume' as const, factorToBase: 1000, decimalPlaces: 3, roundingRule: 'half_up' as const },
    { code: 'M3', name: 'Cubic Metre', category: 'volume' as const, factorToBase: 1000, decimalPlaces: 3, roundingRule: 'half_up' as const },
    { code: 'KG', name: 'Kilogram', category: 'weight' as const, factorToBase: 1, decimalPlaces: 2, roundingRule: 'half_up' as const },
    { code: 'TNE', name: 'Tonne', category: 'weight' as const, factorToBase: 1000, decimalPlaces: 3, roundingRule: 'half_up' as const },
    { code: 'HRS', name: 'Hour', category: 'time' as const, factorToBase: 1, decimalPlaces: 2, roundingRule: 'half_up' as const },
    { code: 'KM', name: 'Kilometre', category: 'length' as const, factorToBase: 1, decimalPlaces: 2, roundingRule: 'half_up' as const },
    { code: 'M', name: 'Metre', category: 'length' as const, factorToBase: 0.001, decimalPlaces: 2, roundingRule: 'half_up' as const },
    { code: 'NOS', name: 'Number', category: 'count' as const, factorToBase: 1, decimalPlaces: 0, roundingRule: 'round' as const },
    { code: 'BAG', name: 'Bag (50 kg cement)', category: 'weight' as const, factorToBase: 50, decimalPlaces: 0, roundingRule: 'round' as const },
    { code: 'SQM', name: 'Square Metre', category: 'area' as const, factorToBase: 1, decimalPlaces: 2, roundingRule: 'half_up' as const },
  ];

  for (const uom of uoms) {
    await masters.createUoM({
      code: uom.code,
      name: uom.name,
      category: uom.category,
      factorToBase: uom.factorToBase,
      decimalPlaces: uom.decimalPlaces,
      roundingRule: uom.roundingRule,
    });
  }
}

/**
 * Reset all platform data (for testing).
 */
export function resetPlatform(): void {
  storage.clearAll();
  logger.info('Platform data reset');
}
