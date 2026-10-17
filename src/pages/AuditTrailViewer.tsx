/**
 * Part 24 — Audit Trail Viewer
 */

import React, { useState, useEffect } from 'react';
import { queryAuditTrail, getAuditStatistics } from '../services/auditViewer';
import { AuditTrailEntry } from '../services/reportTypes';
import { format } from 'date-fns';
import { History, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';

export default function AuditTrailViewer() {
  const [entries, setEntries] = useState<AuditTrailEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  
  // Filters
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    loadAuditTrail();
    loadStatistics();
  }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const result = await queryAuditTrail({
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        actorId: actorId || undefined,
        action: action || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        limit,
        offset: 0,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getAuditStatistics({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        entityType: entityType || undefined,
      });
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleFilter = () => {
    loadAuditTrail();
    loadStatistics();
  };

  const handleReset = () => {
    setEntityType('');
    setEntityId('');
    setActorId('');
    setAction('');
    setFromDate('');
    setToDate('');
    setLimit(100);
  };

  const handleExport = async () => {
    // Would call export service
    alert('Export functionality would generate CSV/JSON of audit trail');
  };

  const toggleExpand = (entryId: string) => {
    setExpandedEntry(expandedEntry === entryId ? null : entryId);
  };

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      delete: 'bg-red-100 text-red-800',
      approve: 'bg-emerald-100 text-emerald-800',
      reject: 'bg-orange-100 text-orange-800',
      submit: 'bg-indigo-100 text-indigo-800',
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading audit trail...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History className="w-7 h-7" />
          Audit Trail Viewer
        </h1>
        <p className="text-gray-600 mt-1">
          View and filter audit trail entries across all modules
        </p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalEntries}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Entity Types</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(statistics.byEntityType).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Unique Actors</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(statistics.byActor).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Actions</p>
            <p className="text-2xl font-bold text-gray-900">
              {Object.keys(statistics.byAction).length}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity Type
            </label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Asset, WorkOrder"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Entity ID
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Entity identifier"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor ID
            </label>
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="User who performed action"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action
            </label>
            <input
              type="text"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., create, update, approve"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={50}>50 entries</option>
              <option value={100}>100 entries</option>
              <option value={200}>200 entries</option>
              <option value={500}>500 entries</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleFilter}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Reset
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4 inline mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* Audit Trail Entries */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Audit Trail ({total} entries)
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {entries.map((entry) => (
            <div key={entry.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {entry.entityType}
                    </span>
                    <span className="text-sm text-gray-500">
                      #{entry.entityId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Actor:</span> {entry.actorId} ({entry.actorRole})
                  </div>
                  {entry.reason && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Reason:</span> {entry.reason}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {format(new Date(entry.timestamp), 'dd MMM yyyy HH:mm:ss')}
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="ml-4 p-2 hover:bg-gray-200 rounded-lg"
                >
                  {expandedEntry === entry.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedEntry === entry.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Before</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(entry.beforeValues, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">After</h4>
                      <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-x-auto">
                        {JSON.stringify(entry.afterValues, null, 2)}
                      </pre>
                    </div>
                  </div>
                  {entry.changedFields.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Changed Fields</h4>
                      <div className="flex flex-wrap gap-2">
                        {entry.changedFields.map((field) => (
                          <span
                            key={field}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audit trail entries found</p>
          </div>
        )}
      </div>

      {/* Statistics Breakdown */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* By Action */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Action</h3>
            <div className="space-y-2">
              {Object.entries(statistics.byAction)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 10)
                .map(([action, count]) => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{action}</span>
                    <span className="text-sm font-medium text-gray-900">{Number(count)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* By Entity Type */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">By Entity Type</h3>
            <div className="space-y-2">
              {Object.entries(statistics.byEntityType)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 10)
                .map(([entityType, count]) => (
                  <div key={entityType} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{entityType}</span>
                    <span className="text-sm font-medium text-gray-900">{Number(count)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
