/**
 * Part 06 — Supervisor Daily Sheet
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Filter, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';
import { listLogbooks } from '../services/logbookService';
import { getAsset } from '../services/assets';
import { getOperator } from '../services/operatorManagement';
import { EquipmentLogbook } from '../services/logbookTypes';
import { Asset } from '../services/assetTypes';
import { Operator } from '../services/assetLifecycleTypes';

interface LogbookWithDetails extends EquipmentLogbook {
  asset?: Asset;
  operator?: Operator;
}

export default function SupervisorDailySheet() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSite, setSelectedSite] = useState('');
  const [logbooks, setLogbooks] = useState<LogbookWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadLogbooks();
  }, [selectedDate, selectedSite]);

  const loadLogbooks = async () => {
    setLoading(true);
    try {
      const logs = await listLogbooks({ date: selectedDate, siteId: selectedSite || undefined });
      
      // Load asset and operator details for each logbook
      const logsWithDetails: LogbookWithDetails[] = await Promise.all(
        logs.map(async (log) => {
          const asset = await getAsset(log.assetId);
          const operator = await getOperator(log.operatorId);
          return { ...log, asset: asset || undefined, operator: operator || undefined };
        })
      );
      
      setLogbooks(logsWithDetails);
    } catch (error) {
      console.error('Failed to load logbooks', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogbooks = logbooks.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'pending') return log.status === 'submitted';
    if (filter === 'approved') return log.status === 'approved';
    if (filter === 'rejected') return log.status === 'rejected';
    return true;
  });

  const pendingCount = logbooks.filter(l => l.status === 'submitted').length;
  const approvedCount = logbooks.filter(l => l.status === 'approved').length;
  const rejectedCount = logbooks.filter(l => l.status === 'rejected').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'submitted':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200';
      case 'submitted':
        return 'bg-amber-50 border-amber-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-7 h-7" />
          Supervisor Daily Sheet
        </h1>
        <p className="text-gray-600 mt-1">Review and approve daily logbooks</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <input
              type="text"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              placeholder="All sites"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All ({logbooks.length})</option>
              <option value="pending">Pending ({pendingCount})</option>
              <option value="approved">Approved ({approvedCount})</option>
              <option value="rejected">Rejected ({rejectedCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Logbooks</p>
          <p className="text-2xl font-bold text-gray-900">{logbooks.length}</p>
        </div>
        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <p className="text-sm text-amber-700">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-900">{pendingCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <p className="text-sm text-green-700">Approved</p>
          <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <p className="text-sm text-red-700">Rejected</p>
          <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
        </div>
      </div>

      {/* Logbooks List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading logbooks...</div>
        </div>
      ) : filteredLogbooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No logbooks found for the selected criteria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogbooks.map((logbook) => (
            <div
              key={logbook.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${getStatusColor(logbook.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(logbook.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {logbook.asset?.assetCode || logbook.assetId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {logbook.asset?.make} {logbook.asset?.model}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Operator</p>
                      <p className="font-medium text-gray-900">
                        {logbook.operator?.fullName || logbook.operatorId}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Shift</p>
                      <p className="font-medium text-gray-900 capitalize">{logbook.shift}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Operating Hours</p>
                      <p className="font-medium text-gray-900">
                        {logbook.calculatedOperatingHours?.toFixed(1) || '—'}h
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Activity</p>
                      <p className="font-medium text-gray-900">
                        {logbook.activityCode || '—'}
                      </p>
                    </div>
                  </div>

                  {logbook.validationFlags && logbook.validationFlags.length > 0 && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-900">
                        {logbook.validationFlags.length} validation flag(s)
                      </p>
                      <ul className="mt-1 text-xs text-yellow-800 list-disc list-inside">
                        {logbook.validationFlags.slice(0, 3).map((flag, idx) => (
                          <li key={idx}>{flag.message}</li>
                        ))}
                        {logbook.validationFlags.length > 3 && (
                          <li>+{logbook.validationFlags.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  {logbook.status === 'submitted' && (
                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/logbooks/${logbook.id}/review`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Review & Approve
                      </Link>
                      <Link
                        to={`/logbooks/${logbook.id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  )}

                  {logbook.status !== 'submitted' && (
                    <div className="mt-4">
                      <Link
                        to={`/logbooks/${logbook.id}`}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
