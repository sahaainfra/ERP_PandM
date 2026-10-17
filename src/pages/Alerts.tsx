import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, XCircle, Bell, Filter, ChevronDown, Shield } from 'lucide-react';
import { alerts } from '../data/mockData';
import { SeverityBadge, formatDateTime } from '../components/Badges';
import { Severity } from '../types';

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = alerts.filter(a => {
    const matchSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSeverity && matchStatus;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical' && a.status === 'open').length;
  const highCount = alerts.filter(a => a.severity === 'high' && a.status === 'open').length;
  const openCount = alerts.filter(a => a.status === 'open').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  const getIcon = (severity: Severity) => {
    switch (severity) {
      case 'critical': return <XCircle size={18} className="text-red-600" />;
      case 'high': return <AlertTriangle size={18} className="text-orange-600" />;
      case 'medium': return <Clock size={18} className="text-amber-600" />;
      default: return <Bell size={18} className="text-blue-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />;
      case 'acknowledged': return <span className="w-2 h-2 bg-amber-500 rounded-full" />;
      case 'resolved': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'dismissed': return <span className="w-2 h-2 bg-gray-400 rounded-full" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">System alerts, threshold breaches and action items</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield size={14} className="text-emerald-500" />
          All alerts logged with audit trail
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Critical Open</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{criticalCount}</p>
          <p className="text-xs text-red-600 mt-1">Immediate action required</p>
        </div>
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <p className="text-xs text-gray-500 font-medium">High Priority</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{highCount}</p>
          <p className="text-xs text-orange-600 mt-1">Action within 24 hours</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Open</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Resolved Today</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none bg-white"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <div
            key={alert.id}
            className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
              alert.severity === 'critical' ? 'border-red-200 bg-red-50/30' :
              alert.severity === 'high' ? 'border-orange-200' :
              'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getIcon(alert.severity)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{alert.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getStatusIcon(alert.status)}
                    <SeverityBadge severity={alert.severity} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Bell size={12} /> {alert.module}
                  </span>
                  <span>Responsible: <span className="font-medium text-gray-700">{alert.responsiblePerson}</span></span>
                  <span>Created: {formatDateTime(alert.createdAt)}</span>
                  {alert.dueAt && <span className="text-red-600 font-medium">Due: {formatDateTime(alert.dueAt)}</span>}
                  {alert.affectedRecord && <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{alert.affectedRecord}</span>}
                </div>

                <div className="mt-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 font-medium">Recommended Action</p>
                  <p className="text-sm text-gray-700 mt-0.5">{alert.recommendedAction}</p>
                </div>

                {alert.status === 'open' && (
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg hover:bg-amber-600 transition-colors">
                      Acknowledge
                    </button>
                    <button className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Assign
                    </button>
                    <button className="px-3 py-1.5 border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
          <h3 className="font-semibold text-gray-900">All clear!</h3>
          <p className="text-sm text-gray-500 mt-1">No alerts match the current filters.</p>
        </div>
      )}
    </div>
  );
}
