/**
 * Part 06 — Daily Coverage Register Service
 */

import { storage } from './storage';
import { DailyCoverageEntry, LogbookConfiguration } from './logbookTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';
import { listAssets } from './assets';
import { getActiveAllocation } from './assetAllocation';
import { listLogbooks } from './logbookService';

const coverageStore = storage.getAdapter<DailyCoverageEntry>('daily_coverage');

// ============================================================================
// Coverage Register Management
// ============================================================================

export async function createDailyCoverage(
  data: Omit<DailyCoverageEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<DailyCoverageEntry> {
  const entry: DailyCoverageEntry = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return coverageStore.create(entry);
}

export async function getDailyCoverage(id: string): Promise<DailyCoverageEntry | null> {
  return coverageStore.findById(id);
}

export async function getDailyCoverageByDateAndAsset(
  date: string,
  assetId: string
): Promise<DailyCoverageEntry | null> {
  return coverageStore.findOne({ date, assetId } as Partial<DailyCoverageEntry>);
}

export async function listDailyCoverage(filters?: {
  date?: string;
  assetId?: string;
  status?: string;
  siteId?: string;
  projectId?: string;
}): Promise<DailyCoverageEntry[]> {
  let entries = await coverageStore.findAll();

  if (filters?.date) {
    entries = entries.filter(e => e.date === filters.date);
  }
  if (filters?.assetId) {
    entries = entries.filter(e => e.assetId === filters.assetId);
  }
  if (filters?.status) {
    entries = entries.filter(e => e.status === filters.status);
  }
  if (filters?.siteId) {
    entries = entries.filter(e => e.siteId === filters.siteId);
  }
  if (filters?.projectId) {
    entries = entries.filter(e => e.projectId === filters.projectId);
  }

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function updateDailyCoverage(
  id: string,
  updates: Partial<DailyCoverageEntry>
): Promise<DailyCoverageEntry> {
  const entry = await coverageStore.findById(id);
  if (!entry) {
    throw new Error(`Coverage entry ${id} not found`);
  }

  return coverageStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

// ============================================================================
// Coverage Generation Job
// ============================================================================

export async function generateDailyCoverage(
  date: string,
  siteId?: string,
  plantId?: string
): Promise<{
  created: number;
  updated: number;
  alertsRaised: number;
}> {
  const stats = {
    created: 0,
    updated: 0,
    alertsRaised: 0,
  };

  // Get all assets
  const allAssets = await listAssets();
  
  // Filter by site/plant if specified
  const assets = allAssets.filter(asset => {
    if (siteId && asset.currentSiteId !== siteId) return false;
    if (plantId && asset.currentPlantId !== plantId) return false;
    return true;
  });

  for (const asset of assets) {
    // Check if asset is allocated
    const allocation = await getActiveAllocation(asset.id);
    if (!allocation) {
      continue; // Skip unallocated assets
    }

    // Check if coverage entry already exists
    const existingEntry = await getDailyCoverageByDateAndAsset(date, asset.id);
    
    if (existingEntry) {
      // Update existing entry with logbook status
      const logbooks = await listLogbooks({
        assetId: asset.id,
        date,
      });

      const submittedLogbookIds = logbooks.map(l => l.id);
      const approvedLogbookIds = logbooks.filter(l => l.status === 'approved').map(l => l.id);

      let status: DailyCoverageEntry['status'] = 'missing';
      if (approvedLogbookIds.length > 0) {
        status = 'approved';
      } else if (submittedLogbookIds.length > 0) {
        status = 'submitted';
      }

      await updateDailyCoverage(existingEntry.id, {
        submittedLogbookIds,
        approvedLogbookIds,
        status,
      });

      stats.updated++;
    } else {
      // Create new coverage entry
      const entry = await createDailyCoverage({
        date,
        assetId: asset.id,
        projectId: allocation.projectId,
        siteId: allocation.siteId,
        plantId: allocation.plantId,
        expectedShifts: ['full_day'], // Default to full day
        submittedLogbookIds: [],
        approvedLogbookIds: [],
        status: 'missing',
        alertRaised: false,
        siteCutoffTime: '23:59',
      });

      stats.created++;

      // Raise alert for missing logbook
      const alertRaised = await raiseAlert({
        ruleCode: 'MISSING_LOGBOOK',
        severity: 'warning',
        title: `Missing Logbook for ${asset.assetCode}`,
        description: `No logbook submitted for asset ${asset.assetCode} on ${date}`,
        module: 'Logbook',
        entityType: 'EquipmentLogbook',
        entityId: entry.id,
        responsibleRole: 'operator',
        recommendedAction: 'Submit daily logbook',
        dueInHours: 24,
        requestId: generateId(),
      });

      if (alertRaised) {
        await updateDailyCoverage(entry.id, {
          alertRaised: true,
          alertId: alertRaised.id,
        });
        stats.alertsRaised++;
      }
    }
  }

  await recordAudit({
    entityType: 'DailyCoverage',
    entityId: 'batch',
    action: 'create',
    before: null,
    after: { date, siteId, plantId, stats },
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: `Daily coverage generated for ${date}`,
  });

  return stats;
}

// ============================================================================
// Coverage Summary
// ============================================================================

export async function getCoverageSummary(
  date: string,
  siteId?: string,
  projectId?: string
): Promise<{
  totalAssets: number;
  submitted: number;
  approved: number;
  idleDeclared: number;
  underMaintenance: number;
  missing: number;
  coveragePercent: number;
}> {
  const entries = await listDailyCoverage({
    date,
    siteId,
    projectId,
  });

  const summary = {
    totalAssets: entries.length,
    submitted: entries.filter(e => e.status === 'submitted').length,
    approved: entries.filter(e => e.status === 'approved').length,
    idleDeclared: entries.filter(e => e.status === 'idle_declared').length,
    underMaintenance: entries.filter(e => e.status === 'under_maintenance').length,
    missing: entries.filter(e => e.status === 'missing').length,
    coveragePercent: 0,
  };

  if (summary.totalAssets > 0) {
    summary.coveragePercent = 
      ((summary.submitted + summary.approved + summary.idleDeclared + summary.underMaintenance) / 
       summary.totalAssets) * 100;
  }

  return summary;
}

// ============================================================================
// Coverage by Asset
// ============================================================================

export async function getAssetCoverage(
  assetId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalDays: number;
  coveredDays: number;
  coveragePercent: number;
  entries: DailyCoverageEntry[];
}> {
  const allEntries = await listDailyCoverage({ assetId });
  
  const entries = allEntries.filter(e => 
    e.date >= startDate && e.date <= endDate
  );

  const totalDays = entries.length;
  const coveredDays = entries.filter(e => 
    e.status === 'submitted' || 
    e.status === 'approved' || 
    e.status === 'idle_declared' || 
    e.status === 'under_maintenance'
  ).length;

  const coveragePercent = totalDays > 0 ? (coveredDays / totalDays) * 100 : 0;

  return {
    totalDays,
    coveredDays,
    coveragePercent,
    entries,
  };
}
