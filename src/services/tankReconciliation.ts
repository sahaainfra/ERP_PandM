/**
 * Part 09 — Tank Reconciliation Service
 * 
 * Manages daily tank reconciliation and stock variance detection
 */

import { storage } from './storage';
import { DailyTankReconciliation } from './fuelTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { getStoragePoint, dipToVolume, getStrappingChartByInstrument, listMeasuringInstruments } from './fuelMasters';
import { listFuelReceipts } from './fuelReceipts';
import { listFuelIssues } from './fuelIssues';
import { listFuelTransfers, listFuelReturns } from './fuelTransfers';
import { getFuelConfiguration } from './fuelReceipts';

const reconciliationsStore = storage.getAdapter<DailyTankReconciliation>('tank_reconciliations');

// ============================================================================
// Tank Reconciliation
// ============================================================================

export async function createDailyReconciliation(data: Omit<DailyTankReconciliation, 'id' | 'bookClosingVolume' | 'variance' | 'variancePercent' | 'dispenserVariance' | 'createdAt' | 'updatedAt'>): Promise<DailyTankReconciliation> {
  // Calculate book closing volume
  const bookClosingVolume = data.openingVolume + 
    data.receiptsVolume + 
    data.transfersInVolume - 
    data.issuesVolume - 
    data.transfersOutVolume;

  // Calculate variance
  const variance = bookClosingVolume - data.closingVolume;
  const variancePercent = data.openingVolume > 0 ? (variance / data.openingVolume) * 100 : 0;

  // Calculate dispenser variance
  const dispenserVariance = data.dispenserMeterTotal - data.issueVouchersTotal;

  const reconciliation: DailyTankReconciliation = {
    ...data,
    id: generateId(),
    bookClosingVolume,
    variance,
    variancePercent,
    dispenserVariance,
    status: 'pending',
    alertRaised: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await reconciliationsStore.create(reconciliation);

  await recordAudit({
    entityType: 'DailyTankReconciliation',
    entityId: reconciliation.id,
    action: 'create',
    before: null,
    after: reconciliation as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Daily tank reconciliation created',
  });

  return reconciliation;
}

export async function getDailyReconciliation(id: string): Promise<DailyTankReconciliation | null> {
  return reconciliationsStore.findById(id);
}

export async function getDailyReconciliationByDateAndStorage(
  date: string, 
  storagePointId: string
): Promise<DailyTankReconciliation | null> {
  const all = await reconciliationsStore.findAll();
  return all.find(r => r.date === date && r.storagePointId === storagePointId) || null;
}

export async function listDailyReconciliations(filters?: {
  storagePointId?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<DailyTankReconciliation[]> {
  let reconciliations = await reconciliationsStore.findAll();

  if (filters?.storagePointId) {
    reconciliations = reconciliations.filter(r => r.storagePointId === filters.storagePointId);
  }
  if (filters?.fromDate) {
    reconciliations = reconciliations.filter(r => r.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    reconciliations = reconciliations.filter(r => r.date <= filters.toDate!);
  }
  if (filters?.status) {
    reconciliations = reconciliations.filter(r => r.status === filters.status);
  }

  return reconciliations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function reconcileDailyTank(
  id: string,
  userId: string
): Promise<DailyTankReconciliation> {
  const reconciliation = await reconciliationsStore.findById(id);
  if (!reconciliation) {
    throw new Error(`Daily reconciliation ${id} not found`);
  }

  if (reconciliation.status !== 'pending') {
    throw new Error(`Reconciliation is not in pending status (current: ${reconciliation.status})`);
  }

  // Check variance tolerance
  const config = await getFuelConfiguration();
  const varianceExceedsTolerance = 
    Math.abs(reconciliation.variancePercent) > config.tankVarianceTolerancePercent ||
    Math.abs(reconciliation.variance) > config.tankVarianceToleranceLitres;

  const dispenserVarianceExceedsTolerance = Math.abs(reconciliation.dispenserVariance) > 1; // 1 litre tolerance

  let status: 'reconciled' | 'variance_detected' = 'reconciled';
  let alertRaised = false;
  let alertId: string | undefined;

  if (varianceExceedsTolerance || dispenserVarianceExceedsTolerance) {
    status = 'variance_detected';
    
    // Raise alert
    const alert = await raiseAlert({
      ruleCode: 'TANK_STOCK_VARIANCE',
      severity: 'high',
      title: `Tank Stock Variance Detected`,
      description: `Storage point has variance of ${reconciliation.variance.toFixed(2)}L (${reconciliation.variancePercent.toFixed(2)}%) on ${reconciliation.date}`,
      module: 'Fuel Management',
      entityType: 'DailyTankReconciliation',
      entityId: reconciliation.id,
      responsibleRole: 'fuel_officer',
      recommendedAction: 'Investigate variance - check for leaks, theft, or measurement errors',
      dueInHours: 24,
      requestId: generateId(),
    });

    if (alert) {
      alertRaised = true;
      alertId = alert.id;
    }
  }

  const updated = await reconciliationsStore.update(id, {
    status,
    alertRaised,
    alertId,
    reconciledBy: userId,
    reconciledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'DailyTankReconciliation',
    entityId: id,
    action: 'update',
    before: reconciliation as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'fuel_officer',
    requestId: generateId(),
    reason: `Tank reconciliation ${status === 'reconciled' ? 'completed' : 'variance detected'}`,
  });

  return updated;
}

// ============================================================================
// Automated Reconciliation Job
// ============================================================================

export async function runDailyReconciliationJob(date: string): Promise<{
  reconciled: number;
  variances: number;
  errors: string[];
}> {
  const result = {
    reconciled: 0,
    variances: 0,
    errors: [] as string[],
  };

  // Get all active storage points
  const storagePoints = await listMeasuringInstruments();
  const storagePointIds = [...new Set(storagePoints.map(i => i.storagePointId).filter(Boolean))];

  for (const storagePointId of storagePointIds) {
    if (!storagePointId) continue;

    try {
      const storagePoint = await getStoragePoint(storagePointId);
      if (!storagePoint) {
        result.errors.push(`Storage point ${storagePointId} not found`);
        continue;
      }

      // Check if reconciliation already exists for this date
      const existing = await getDailyReconciliationByDateAndStorage(date, storagePointId);
      if (existing) {
        result.errors.push(`Reconciliation already exists for ${storagePoint.code} on ${date}`);
        continue;
      }

      // Get opening dip (from previous day's closing or manual entry)
      const previousReconciliations = await listDailyReconciliations({
        storagePointId,
        toDate: date,
      });
      
      const previousReconciliation = previousReconciliations.find(r => r.date < date);
      const openingDip = previousReconciliation?.closingDip || 0;
      
      // Convert dip to volume using strapping chart
      const instruments = await listMeasuringInstruments({ storagePointId });
      const dipInstrument = instruments.find(i => i.type === 'dipstick' || i.type === 'tank_gauge');
      
      let openingVolume = openingDip;
      if (dipInstrument?.strappingChartId) {
        const chart = await getStrappingChartByInstrument(dipInstrument.id);
        if (chart) {
          openingVolume = dipToVolume(openingDip, chart);
        }
      }

      // Get receipts for the day
      const receipts = await listFuelReceipts({
        storagePointId,
        fromDate: date,
        toDate: date,
        status: 'approved',
      });
      const receiptsVolume = receipts.reduce((sum, r) => sum + r.measuredQuantity, 0);

      // Get issues for the day
      const issues = await listFuelIssues({
        storagePointId,
        fromDate: date,
        toDate: date,
        status: 'approved',
      });
      const issuesVolume = issues.reduce((sum, i) => sum + i.quantity, 0);

      // Get transfers in for the day
      const transfersIn = await listFuelTransfers({
        toStoragePointId: storagePointId,
        fromDate: date,
        toDate: date,
        status: 'completed',
      });
      const transfersInVolume = transfersIn.reduce((sum, t) => sum + t.quantity, 0);

      // Get transfers out for the day
      const transfersOut = await listFuelTransfers({
        fromStoragePointId: storagePointId,
        fromDate: date,
        toDate: date,
        status: 'completed',
      });
      const transfersOutVolume = transfersOut.reduce((sum, t) => sum + t.quantity, 0);

      // Get returns for the day
      const returns = await listFuelReturns({
        toStoragePointId: storagePointId,
        fromDate: date,
        toDate: date,
        status: 'completed',
      });
      const returnsVolume = returns.reduce((sum, r) => sum + r.quantity, 0);

      // Get dispenser meter total
      const dispenserInstruments = instruments.filter(i => i.type === 'dispenser_meter');
      let dispenserMeterTotal = 0;
      // In a real implementation, this would read from the dispenser meter
      // For now, we'll use the sum of issues
      dispenserMeterTotal = issuesVolume;

      // Get issue vouchers total
      const issueVouchersTotal = issuesVolume;

      // Create reconciliation (closing dip would be entered manually or from sensor)
      // For now, we'll use book closing as closing volume (this would be overridden in practice)
      const closingDip = openingDip; // Placeholder
      const closingVolume = openingVolume; // Placeholder

      const reconciliation = await createDailyReconciliation({
        date,
        storagePointId,
        openingDip,
        openingVolume,
        receiptsVolume,
        transfersInVolume: transfersInVolume + returnsVolume,
        issuesVolume,
        transfersOutVolume,
        closingDip,
        closingVolume,
        dispenserMeterTotal,
        issueVouchersTotal,
        status: 'pending',
        alertRaised: false,
      });

      // Auto-reconcile
      await reconcileDailyTank(reconciliation.id, 'system');

      const updated = await getDailyReconciliation(reconciliation.id);
      if (updated?.status === 'reconciled') {
        result.reconciled++;
      } else {
        result.variances++;
      }
    } catch (error) {
      result.errors.push(`Error processing ${storagePointId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  await recordAudit({
    entityType: 'DailyTankReconciliation',
    entityId: 'batch',
    action: 'create',
    before: null,
    after: { date, result } as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Daily reconciliation job completed for ${date}`,
  });

  return result;
}

// ============================================================================
// Reconciliation Statistics
// ============================================================================

export async function getReconciliationStatistics(filters?: {
  storagePointId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalReconciliations: number;
  reconciled: number;
  variances: number;
  pending: number;
  totalVariance: number;
}> {
  let reconciliations = await reconciliationsStore.findAll();

  if (filters?.storagePointId) {
    reconciliations = reconciliations.filter(r => r.storagePointId === filters.storagePointId);
  }
  if (filters?.fromDate) {
    reconciliations = reconciliations.filter(r => r.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    reconciliations = reconciliations.filter(r => r.date <= filters.toDate!);
  }

  return {
    totalReconciliations: reconciliations.length,
    reconciled: reconciliations.filter(r => r.status === 'reconciled').length,
    variances: reconciliations.filter(r => r.status === 'variance_detected').length,
    pending: reconciliations.filter(r => r.status === 'pending').length,
    totalVariance: reconciliations.reduce((sum, r) => sum + Math.abs(r.variance), 0),
  };
}

export async function getStoragePointStock(storagePointId: string, asOfDate: string): Promise<{
  currentStock: number;
  lastReconciliation?: DailyTankReconciliation;
}> {
  const reconciliations = await listDailyReconciliations({
    storagePointId,
    toDate: asOfDate,
  });

  const latestReconciliation = reconciliations[0];

  if (!latestReconciliation) {
    return {
      currentStock: 0,
    };
  }

  return {
    currentStock: latestReconciliation.closingVolume,
    lastReconciliation: latestReconciliation,
  };
}
