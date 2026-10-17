/**
 * Part 24 — Export Service
 */

import { storage } from './storage';
import { ExportJob, ReportFormat, ExportJobStatus } from './reportTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getReportExecution } from './reportEngine';
import { hasPermission } from './permissions';

const exportJobsStore = storage.getAdapter<ExportJob>('export_jobs');

// ============================================================================
// Export Job Management
// ============================================================================

export async function createExportJob(params: {
  reportId: string;
  executionId: string;
  format: ReportFormat;
  requestedBy: string;
}): Promise<ExportJob> {
  // Check permission
  await hasPermission({
    userId: params.requestedBy,
    role: 'general_staff',
    action: 'export',
    resource: 'report',
  });

  const execution = await getReportExecution(params.executionId);
  if (!execution) {
    throw new Error(`Report execution ${params.executionId} not found`);
  }

  const fileName = generateFileName(params.reportId, params.format);
  
  const job: ExportJob = {
    id: generateId(),
    reportId: params.reportId,
    executionId: params.executionId,
    format: params.format,
    fileName,
    status: 'pending',
    progress: 0,
    requestedBy: params.requestedBy,
    requestedAt: new Date().toISOString(),
    rowCount: execution.totalRows,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await exportJobsStore.create(job);

  await recordAudit({
    entityType: 'ExportJob',
    entityId: job.id,
    action: 'create',
    before: null,
    after: { reportId: params.reportId, format: params.format, rowCount: execution.totalRows } as any,
    actorId: params.requestedBy,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Export job created: ${fileName}`,
  });

  // Process export asynchronously (simulated)
  processExportJob(job.id);

  return job;
}

export async function getExportJob(id: string): Promise<ExportJob | null> {
  return exportJobsStore.findById(id);
}

export async function listExportJobs(filters?: {
  requestedBy?: string;
  status?: ExportJobStatus;
  fromDate?: string;
  toDate?: string;
}): Promise<ExportJob[]> {
  let jobs = await exportJobsStore.findAll();

  if (filters?.requestedBy) {
    jobs = jobs.filter(j => j.requestedBy === filters.requestedBy);
  }
  if (filters?.status) {
    jobs = jobs.filter(j => j.status === filters.status);
  }
  if (filters?.fromDate) {
    jobs = jobs.filter(j => j.requestedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    jobs = jobs.filter(j => j.requestedAt <= filters.toDate!);
  }

  return jobs.sort((a, b) => 
    new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

// ============================================================================
// Export Processing
// ============================================================================

async function processExportJob(jobId: string): Promise<void> {
  const job = await exportJobsStore.findById(jobId);
  if (!job) {
    throw new Error(`Export job ${jobId} not found`);
  }

  try {
    // Update status to processing
    await exportJobsStore.update(jobId, {
      status: 'processing',
      progress: 10,
      updatedAt: new Date().toISOString(),
    });

    const execution = await getReportExecution(job.executionId);
    if (!execution) {
      throw new Error(`Report execution ${job.executionId} not found`);
    }

    // Generate file based on format
    let fileContent: string;
    let fileSize: number;

    switch (job.format) {
      case 'csv':
        fileContent = generateCSV(execution.data, execution);
        fileSize = fileContent.length;
        break;
      case 'excel':
        fileContent = generateExcel(execution.data, execution);
        fileSize = fileContent.length;
        break;
      case 'pdf':
        fileContent = generatePDF(execution.data, execution);
        fileSize = fileContent.length;
        break;
      case 'json':
        fileContent = JSON.stringify(execution.data, null, 2);
        fileSize = fileContent.length;
        break;
      default:
        throw new Error(`Unsupported format: ${job.format}`);
    }

    await exportJobsStore.update(jobId, {
      status: 'processing',
      progress: 50,
      updatedAt: new Date().toISOString(),
    });

    // Simulate file storage (in real implementation, would upload to S3/Azure)
    const downloadUrl = `/api/exports/${jobId}/download`;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    await exportJobsStore.update(jobId, {
      status: 'completed',
      progress: 100,
      fileSize,
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await recordAudit({
      entityType: 'ExportJob',
      entityId: jobId,
      action: 'update',
      before: { status: 'processing' },
      after: { status: 'completed', fileSize, downloadUrl } as any,
      actorId: 'system',
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: `Export completed: ${job.fileName}`,
    });

  } catch (error) {
    await exportJobsStore.update(jobId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date().toISOString(),
    });

    await recordAudit({
      entityType: 'ExportJob',
      entityId: jobId,
      action: 'update',
      before: { status: 'processing' },
      after: { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' } as any,
      actorId: 'system',
      actorRole: 'super_admin',
      requestId: generateId(),
      reason: `Export failed: ${job.fileName}`,
    });
  }
}

// ============================================================================
// File Generation (Stub implementations)
// ============================================================================

function generateCSV(data: any[], execution: any): string {
  if (data.length === 0) return '';

  // Generate header
  const headers = Object.keys(data[0]);
  const csvHeader = headers.join(',') + '\n';

  // Generate rows
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',');
  }).join('\n');

  return csvHeader + csvRows;
}

function generateExcel(data: any[], execution: any): string {
  // Stub implementation - would use a library like exceljs
  // For now, return a placeholder
  return `Excel file with ${data.length} rows`;
}

function generatePDF(data: any[], execution: any): string {
  // Stub implementation - would use a library like pdfkit
  // For now, return a placeholder
  return `PDF file with ${data.length} rows`;
}

function generateFileName(reportId: string, format: ReportFormat): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = format === 'excel' ? 'xlsx' : format;
  return `report_${reportId}_${timestamp}.${extension}`;
}

// ============================================================================
// Download Management
// ============================================================================

export async function getDownloadUrl(jobId: string, userId: string): Promise<string> {
  const job = await exportJobsStore.findById(jobId);
  if (!job) {
    throw new Error(`Export job ${jobId} not found`);
  }

  // Check if user has permission to download
  if (job.requestedBy !== userId) {
    // Check if user has admin role
    await hasPermission({
      userId,
      role: 'general_staff',
      action: 'view',
      resource: 'report',
    });
  }

  // Check if download URL has expired
  if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
    throw new Error('Download URL has expired');
  }

  if (!job.downloadUrl) {
    throw new Error('Export is not yet ready for download');
  }

  await recordAudit({
    entityType: 'ExportJob',
    entityId: jobId,
    action: 'update',
    before: null,
    after: { downloaded: true } as any,
    actorId: userId,
    actorRole: 'general_staff',
    requestId: generateId(),
    reason: `Export downloaded: ${job.fileName}`,
  });

  return job.downloadUrl;
}

// ============================================================================
// Export Statistics
// ============================================================================

export async function getExportStatistics(filters?: {
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalExports: number;
  completedExports: number;
  failedExports: number;
  totalRowsExported: number;
  totalFileSize: number;
  byFormat: Record<ReportFormat, number>;
}> {
  let jobs = await exportJobsStore.findAll();

  if (filters?.fromDate) {
    jobs = jobs.filter(j => j.requestedAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    jobs = jobs.filter(j => j.requestedAt <= filters.toDate!);
  }

  const completedJobs = jobs.filter(j => j.status === 'completed');
  const failedJobs = jobs.filter(j => j.status === 'failed');

  const byFormat: Record<ReportFormat, number> = {
    pdf: 0,
    excel: 0,
    csv: 0,
    json: 0,
  };

  for (const job of jobs) {
    byFormat[job.format]++;
  }

  return {
    totalExports: jobs.length,
    completedExports: completedJobs.length,
    failedExports: failedJobs.length,
    totalRowsExported: completedJobs.reduce((sum, j) => sum + (j.rowCount || 0), 0),
    totalFileSize: completedJobs.reduce((sum, j) => sum + (j.fileSize || 0), 0),
    byFormat,
  };
}
