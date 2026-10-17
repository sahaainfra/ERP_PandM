/**
 * Part 24 — Evidence Pack Generator
 */

import React, { useState } from 'react';
import { generateEvidencePack, exportEvidencePack, verifyEvidencePack } from '../services/evidencePackService';
import { EvidencePack } from '../services/reportTypes';
import { FileText, Download, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

export default function EvidencePackGenerator() {
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'zip'>('pdf');
  const [loading, setLoading] = useState(false);
  const [evidencePack, setEvidencePack] = useState<EvidencePack | null>(null);
  const [verification, setVerification] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const handleGenerate = async () => {
    if (!entityType || !entityId) {
      alert('Please enter both entity type and entity ID');
      return;
    }

    setLoading(true);
    try {
      const pack = await generateEvidencePack(entityType, entityId, 'current_user', exportFormat);
      setEvidencePack(pack);
      
      // Verify the pack
      const verifyResult = await verifyEvidencePack(pack.id);
      setVerification(verifyResult);
    } catch (error) {
      console.error('Failed to generate evidence pack:', error);
      alert('Failed to generate evidence pack: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!evidencePack) return;

    try {
      const result = await exportEvidencePack(evidencePack.id, 'current_user');
      alert(`Evidence pack exported successfully!\n\nFile: ${result.fileName}\nHash: ${result.hash}\nDownload URL: ${result.downloadUrl}`);
    } catch (error) {
      console.error('Failed to export evidence pack:', error);
      alert('Failed to export: ' + (error as Error).message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Evidence Pack Generator
        </h1>
        <p className="text-gray-600 mt-1">
          Generate comprehensive evidence packages for any record with full audit trail
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate Evidence Pack</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type <span className="text-red-600">*</span>
            </label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select entity type...</option>
              <option value="Asset">Asset</option>
              <option value="WorkOrder">Work Order</option>
              <option value="FuelVerification">Fuel Verification</option>
              <option value="FuelInvestigation">Fuel Investigation</option>
              <option value="Batch">Batch</option>
              <option value="Dispatch">Dispatch</option>
              <option value="OperatorSubmission">Operator Submission</option>
              <option value="NCR">Nonconformance Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter entity ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="pdf">PDF</option>
              <option value="zip">ZIP (with attachments)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={loading || !entityType || !entityId}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </span>
            ) : (
              'Generate Evidence Pack'
            )}
          </button>
        </div>
      </div>

      {/* Verification Results */}
      {verification && (
        <div className={`rounded-lg shadow p-6 mb-6 ${
          verification.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {verification.valid ? (
              <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-semibold ${verification.valid ? 'text-green-900' : 'text-red-900'}`}>
                {verification.valid ? 'Evidence Pack Verified' : 'Verification Issues Found'}
              </h3>
              {verification.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                    {verification.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {verification.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-amber-800">Warnings:</p>
                  <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
                    {verification.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evidence Pack Details */}
      {evidencePack && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Evidence Pack Details</h2>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Entity Type</p>
              <p className="text-lg font-medium text-gray-900">{evidencePack.entityType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Entity ID</p>
              <p className="text-lg font-medium text-gray-900">{evidencePack.entityId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Generated</p>
              <p className="text-lg font-medium text-gray-900">
                {new Date(evidencePack.generatedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Format</p>
              <p className="text-lg font-medium text-gray-900 uppercase">{evidencePack.exportFormat}</p>
            </div>
          </div>

          {/* Contents Summary */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-md font-semibold text-gray-900 mb-3">Contents</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Revisions</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.revisions.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Attachments</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.attachments.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.approvals.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Chat References</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.chatReferences.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.alerts.length}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Audit Entries</p>
                <p className="text-2xl font-bold text-gray-900">{evidencePack.auditTrail.length}</p>
              </div>
            </div>
          </div>

          {/* Attachments with Hashes */}
          {evidencePack.attachments.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Attachments (with SHA-256 Hashes)</h3>
              <div className="space-y-2">
                {evidencePack.attachments.map((attachment, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{attachment.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {attachment.mimeType} • {(attachment.sizeBytes / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">SHA-256</p>
                        <p className="text-xs font-mono text-gray-700">
                          {attachment.sha256.slice(0, 16)}...
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail Summary */}
          {evidencePack.auditTrail.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-3">Audit Trail Summary</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {evidencePack.auditTrail.slice(0, 10).map((entry, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{entry.action}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      By: {entry.actorId} ({entry.actorRole})
                    </p>
                    {entry.reason && (
                      <p className="text-xs text-gray-600 mt-1">Reason: {entry.reason}</p>
                    )}
                  </div>
                ))}
                {evidencePack.auditTrail.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    + {evidencePack.auditTrail.length - 10} more entries
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Export Hash */}
          {evidencePack.exportHash && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-2">Export Hash</h3>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">SHA-256 Hash of Complete Evidence Pack</p>
                <p className="text-sm font-mono text-gray-900 break-all">{evidencePack.exportHash}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
