/**
 * Part 10 — Daily Verification Job Service
 * 
 * Runs daily fuel verification for all allocated assets
 */

import { storage } from './storage';
import { DailyFuelVerification, DailyFuelSignOff } from './fuelVerificationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { listAssets } from './assets';
import { listDailyCoverage } from './coverageRegister';
import { calculateDailyVerification, listVerifications } from './verificationEngine';

const signOffsStore = storage.getAdapter<DailyFuelSignOff>('daily_fuel_signoffs');

// ============================================================================
// Daily Verification Job
// ============================================================================

export async function runDailyVerificationJob(
  date: string,
  siteId?: string,
  plantId?: string
): Promise<{
  processed: number;
  verified: number;
  warnings: number;
  critical: number;
  missing: number;
  errors: string[];
}> {
  const result = {
    processed: 0,
    verified: 0,
    warnings: 0,
    critical: 0,
    missing: 0,
    errors: [] as string[],
  };

  try {
    // Get coverage register for the date
    const coverageEntries = await listDailyCoverage({ date, siteId });

    // Process each allocated asset
    for (const entry of coverageEntries) {
      if (entry.status === 'missing') {
        result.missing++;
        continue;
      }

      try {
        // Check if verification already exists (idempotency)
        const existing = await listVerifications({ assetId: entry.assetId, date });
        if (existing.length > 0) {
          // Already verified - skip
          result.processed++;
          continue;
        }

        // Calculate verification
        const verification = await calculateDailyVerification(entry.assetId, date);
        result.processed++;

        // Count by status
        switch (verification.resultStatus) {
          case 'within_tolerance':
            result.verified++;
            break;
          case 'warning':
            result.warnings++;
            break;
          case 'critical':
          case 'fuel_without_usage':
            result.critical++;
            break;
          case 'missing':
            result.missing++;
            break;
        }
      } catch (error) {
        result.errors.push(`Asset ${entry.assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create daily sign-off record
    await createDailySignOff(date, siteId, plantId, result);

    await recordAudit({
      entityType: 'DailyVerificationJob',
      entityId: date,
      action: 'create',
      before: null,
      after: result as any,
      actorId: 'system',
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: `Daily verification job completed for ${date}`,
    });

    return result;
  } catch (error) {
    await recordAudit({
      entityType: 'DailyVerificationJob',
      entityId: date,
      action: 'create',
      before: null,
      after: { error: error instanceof Error ? error.message : 'Unknown error' } as any,
      actorId: 'system',
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: `Daily verification job failed for ${date}`,
    });

    throw error;
  }
}

// ============================================================================
// Daily Sign-Off
// ============================================================================

async function createDailySignOff(
  date: string,
  siteId?: string,
  plantId?: string,
  stats?: {
    processed: number;
    verified: number;
    warnings: number;
    critical: number;
    missing: number;
  }
): Promise<DailyFuelSignOff> {
  // Get all verifications for the date
  const verifications = await listVerifications({ date });

  // Calculate summary
  const totalAssetDays = verifications.length;
  const verifiedCount = verifications.filter(v => 
    v.resultStatus === 'within_tolerance' || 
    v.resultStatus === 'warning' || 
    v.resultStatus === 'critical'
  ).length;
  const withinToleranceCount = verifications.filter(v => v.resultStatus === 'within_tolerance').length;
  const warningCount = verifications.filter(v => v.resultStatus === 'warning').length;
  const criticalCount = verifications.filter(v => 
    v.resultStatus === 'critical' || 
    v.resultStatus === 'fuel_without_usage'
  ).length;
  const missingCount = verifications.filter(v => v.resultStatus === 'missing').length;
  const unverifiedCount = verifications.filter(v => v.resultStatus === 'unverified').length;

  // Set sign-off deadline (12:00 next day)
  const signOffDeadline = new Date(date);
  signOffDeadline.setDate(signOffDeadline.getDate() + 1);
  signOffDeadline.setHours(12, 0, 0, 0);

  const signOff: DailyFuelSignOff = {
    id: generateId(),
    date,
    siteId,
    plantId,
    totalAssetDays,
    verifiedCount,
    withinToleranceCount,
    warningCount,
    criticalCount,
    missingCount,
    unverifiedCount,
    signedOffBy: '',
    signedOffAt: '',
    signOffDeadline: signOffDeadline.toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await signOffsStore.create(signOff);

  return signOff;
}

export async function getDailySignOff(date: string, siteId?: string, plantId?: string): Promise<DailyFuelSignOff | null> {
  const signOffs = await signOffsStore.findAll();
  return signOffs.find(s => 
    s.date === date && 
    s.siteId === siteId && 
    s.plantId === plantId
  ) || null;
}

export async function signOffDailyVerification(
  date: string,
  siteId: string | undefined,
  plantId: string | undefined,
  signedOffBy: string
): Promise<DailyFuelSignOff> {
  const signOff = await getDailySignOff(date, siteId, plantId);
  if (!signOff) {
    throw new Error(`Daily sign-off not found for ${date}`);
  }

  if (signOff.status === 'signed_off') {
    throw new Error('Daily verification already signed off');
  }

  // Check if signer is authorized (not a fuel attendant who issued fuel)
  // In a real implementation, would check against fuel issues for the day
  // For demo, just record the sign-off

  const updated = await signOffsStore.update(signOff.id, {
    signedOffBy,
    signedOffAt: new Date().toISOString(),
    status: 'signed_off',
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'DailyFuelSignOff',
    entityId: signOff.id,
    action: 'update',
    before: signOff as any,
    after: updated as any,
    actorId: signedOffBy,
    actorRole: 'fleet_supervisor',
    requestId: generateId(),
    reason: 'Daily fuel verification signed off',
  });

  return updated;
}

export async function listDailySignOffs(filters?: {
  fromDate?: string;
  toDate?: string;
  siteId?: string;
  plantId?: string;
  status?: string;
}): Promise<DailyFuelSignOff[]> {
  let signOffs = await signOffsStore.findAll();

  if (filters?.fromDate) {
    signOffs = signOffs.filter(s => s.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    signOffs = signOffs.filter(s => s.date <= filters.toDate!);
  }
  if (filters?.siteId) {
    signOffs = signOffs.filter(s => s.siteId === filters.siteId);
  }
  if (filters?.plantId) {
    signOffs = signOffs.filter(s => s.plantId === filters.plantId);
  }
  if (filters?.status) {
    signOffs = signOffs.filter(s => s.status === filters.status);
  }

  return signOffs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ============================================================================
// Sign-Off SLA Monitoring
// ============================================================================

export async function checkOverdueSignOffs(): Promise<number> {
  const now = new Date();
  const signOffs = await signOffsStore.findAll({ status: 'pending' } as any);
  
  let overdueCount = 0;

  for (const signOff of signOffs) {
    const deadline = new Date(signOff.signOffDeadline);
    if (now > deadline) {
      // Mark as overdue
      await signOffsStore.update(signOff.id, {
        status: 'overdue',
        updatedAt: new Date().toISOString(),
      });

      // Raise alert
      await raiseAlert({
        ruleCode: 'DAILY_FUEL_SIGNOFF_OVERDUE',
        severity: 'high',
        title: `Daily Fuel Sign-Off Overdue`,
        description: `Fuel verification for ${signOff.date} has not been signed off by the deadline`,
        module: 'Fuel Verification',
        entityType: 'DailyFuelSignOff',
        entityId: signOff.id,
        responsibleRole: 'fleet_manager',
        recommendedAction: 'Review and sign off daily fuel verification sheet',
        dueInHours: 4,
        requestId: generateId(),
      });

      overdueCount++;
    }
  }

  return overdueCount;
}

// ============================================================================
// Verification Statistics
// ============================================================================

export async function getVerificationCoverageStatistics(
  fromDate: string,
  toDate: string,
  siteId?: string,
  plantId?: string
): Promise<{
  expectedAssetDays: number;
  verifiedAssetDays: number;
  coveragePercent: number;
  withinTolerancePercent: number;
  unexplainedVarianceLitres: number;
}> {
  // Get all coverage entries for the date range
  const allCoverage = await listDailyCoverage({ siteId });
  const coverageEntries = allCoverage.filter(e => 
    e.date >= fromDate && 
    e.date <= toDate &&
    (!plantId || e.plantId === plantId)
  );
  const expectedAssetDays = coverageEntries.filter(e => e.status !== 'missing').length;

  // Get all verifications
  const verifications = await listVerifications({ fromDate, toDate });
  const verifiedAssetDays = verifications.filter(v => 
    v.resultStatus !== 'missing' && 
    v.resultStatus !== 'not_evaluable'
  ).length;

  // Calculate coverage percentage
  const coveragePercent = expectedAssetDays > 0 
    ? (verifiedAssetDays / expectedAssetDays) * 100 
    : 0;

  // Calculate within tolerance percentage
  const withinToleranceCount = verifications.filter(v => v.resultStatus === 'within_tolerance').length;
  const withinTolerancePercent = verifiedAssetDays > 0 
    ? (withinToleranceCount / verifiedAssetDays) * 100 
    : 0;

  // Calculate unexplained variance
  const unexplainedVarianceLitres = verifications
    .filter(v => v.resultStatus === 'critical' || v.resultStatus === 'fuel_without_usage')
    .reduce((sum, v) => sum + Math.abs(v.varianceLitres), 0);

  return {
    expectedAssetDays,
    verifiedAssetDays,
    coveragePercent: Math.round(coveragePercent * 10) / 10,
    withinTolerancePercent: Math.round(withinTolerancePercent * 10) / 10,
    unexplainedVarianceLitres: Math.round(unexplainedVarianceLitres * 10) / 10,
  };
}
