/**
 * Part 23 — Alert Action Center
 */

import React, { useState, useEffect } from 'react';
import { 
  listAlertActionCenters, 
  acknowledgeAlert, 
  assignAlert, 
  addComment,
  escalateAlert,
  resolveAlert,
  closeAlert,
  bulkAcknowledgeAlerts,
  calculateAlertMetrics,
  getMyAlerts,
  getOverdueAlerts
} from '../services/alertActionCenter';
import { AlertActionCenter, AlertMetrics, AlertStatus } from '../services/dashboardPart23Types';
import { format } from 'date-fns';
import { Bell, CheckCircle, Clock, AlertTriangle, Users, Filter, MessageSquare } from 'lucide-react';

export default function AlertActionCenterPage() {
  const [alerts, setAlerts] = useState<AlertActionCenter[]>([]);
  const [metrics, setMetrics] = useState<AlertMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'all' | 'my' | 'overdue'>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAlert, setSelectedAlert] = useState<AlertActionCenter | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [comment, setComment] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [closureNote, setClosureNote] = useState('');

  useEffect(() => {
    loadAlerts();
    loadMetrics();
  }, [view, severityFilter, statusFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      let alertList: AlertActionCenter[];
      
      if (view === 'my') {
        alertList = await getMyAlerts('current_user'); // Would get from auth context
      } else if (view === 'overdue') {
        alertList = await getOverdueAlerts();
      } else {
        alertList = await listAlertActionCenters();
      }

      // Apply filters
      if (severityFilter !== 'all') {
        alertList = alertList.filter(a => a.severity === severityFilter);
      }
      if (statusFilter !== 'all') {
        alertList = alertList.filter(a => a.status === statusFilter);
      }

      setAlerts(alertList);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const metricsData = await calculateAlertMetrics(
        'monthly',
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId, 'current_user');
      await loadAlerts();
      if (selectedAlert?.alertId === alertId) {
        const updated = await listAlertActionCenters();
        const alert = updated.find(a => a.alertId === alertId);
        if (alert) setSelectedAlert(alert);
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      alert('Failed to acknowledge alert');
    }
  };

  const handleAssign = async () => {
    if (!selectedAlert || !assignTo) return;
    
    try {
      await assignAlert(selectedAlert.alertId, assignTo, 'current_user', comment);
      setShowAssignModal(false);
      setAssignTo('');
      setComment('');
      await loadAlerts();
    } catch (error) {
      console.error('Failed to assign alert:', error);
      alert('Failed to assign alert');
    }
  };

  const handleAddComment = async () => {
    if (!selectedAlert || !comment) return;
    
    try {
      await addComment(selectedAlert.alertId, 'current_user', comment);
      setShowCommentModal(false);
      setComment('');
      await loadAlerts();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleEscalate = async () => {
    if (!selectedAlert || !assignTo) return;
    
    try {
      await escalateAlert(selectedAlert.alertId, assignTo, 'current_user', comment);
      setShowAssignModal(false);
      setAssignTo('');
      setComment('');
      await loadAlerts();
    } catch (error) {
      console.error('Failed to escalate alert:', error);
      alert('Failed to escalate alert');
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert || !resolutionNote) return;
    
    try {
      await resolveAlert(selectedAlert.alertId, 'current_user', resolutionNote);
      setShowResolveModal(false);
      setResolutionNote('');
      await loadAlerts();
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      alert('Failed to resolve alert');
    }
  };

  const handleClose = async () => {
    if (!selectedAlert) return;
    
    try {
      await closeAlert(selectedAlert.alertId, 'current_user', 'manager', closureNote);
      setShowCloseModal(false);
      setClosureNote('');
      await loadAlerts();
    } catch (error) {
      console.error('Failed to close alert:', error);
      alert((error as Error).message);
    }
  };

  const handleBulkAcknowledge = async () => {
    const selectedIds = alerts
      .filter(a => a.severity === 'info' || a.severity === 'warning')
      .map(a => a.alertId);
    
    if (selectedIds.length === 0) {
      alert('No low-severity alerts to acknowledge');
      return;
    }

    try {
      const result = await bulkAcknowledgeAlerts(selectedIds, 'current_user');
      alert(`Acknowledged ${result.acknowledged} alerts, ${result.failed} failed`);
      await loadAlerts();
    } catch (error) {
      console.error('Failed to bulk acknowledge:', error);
      alert('Failed to bulk acknowledge alerts');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'acknowledged': return 'bg-amber-100 text-amber-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-indigo-100 text-indigo-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Bell className="w-7 h-7" />
              Alert Action Center
            </h1>
            <p className="text-gray-600 mt-1">
              Manage and resolve alerts across all modules
            </p>
          </div>
          <button
            onClick={handleBulkAcknowledge}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Bulk Acknowledge (Low Severity)
          </button>
        </div>
      </div>

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Open Alerts</p>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.openBySeverity.critical + metrics.openBySeverity.high + metrics.openBySeverity.warning + metrics.openBySeverity.info}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Mean Time to Acknowledge</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.meanTimeToAcknowledge}h</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Mean Time to Resolve</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.meanTimeToResolve}h</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Overdue %</p>
            <p className="text-2xl font-bold text-red-600">{metrics.overduePercent}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{metrics.totalResolved}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Alerts</option>
              <option value="my">My Alerts</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="assigned">Assigned</option>
              <option value="escalated">Escalated</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert List */}
        <div className="lg:col-span-2 space-y-4">
          {alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-500">No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${
                  selectedAlert?.id === alert.id ? 'border-blue-500' : 'border-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(alert.status)}`}>
                      {alert.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Age: {alert.ageingHours}h
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{alert.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{alert.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Assigned to: {alert.responsiblePerson}</span>
                  <span>Created: {format(new Date(alert.createdAt), 'dd MMM yyyy HH:mm')}</span>
                </div>
                {alert.dueAt && (
                  <div className="mt-2 text-xs text-red-600">
                    Due: {format(new Date(alert.dueAt), 'dd MMM yyyy HH:mm')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Alert Details */}
        {selectedAlert && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Details</h2>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Title</p>
                <p className="text-base text-gray-900">{selectedAlert.title}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Description</p>
                <p className="text-sm text-gray-600">{selectedAlert.description}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Recommended Action</p>
                <p className="text-sm text-gray-600">{selectedAlert.recommendedAction}</p>
              </div>

              {selectedAlert.affectedRecordType && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Affected Record</p>
                  <button className="text-sm text-blue-600 hover:text-blue-900">
                    {selectedAlert.affectedRecordType} #{selectedAlert.affectedRecordId} →
                  </button>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-700">Assigned To</p>
                <p className="text-sm text-gray-900">{selectedAlert.responsiblePerson} ({selectedAlert.responsibleRole})</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Timeline</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Created: {format(new Date(selectedAlert.createdAt), 'dd MMM yyyy HH:mm')}</p>
                  {selectedAlert.acknowledgedAt && (
                    <p>Acknowledged: {format(new Date(selectedAlert.acknowledgedAt), 'dd MMM yyyy HH:mm')}</p>
                  )}
                  {selectedAlert.assignedAt && (
                    <p>Assigned: {format(new Date(selectedAlert.assignedAt), 'dd MMM yyyy HH:mm')}</p>
                  )}
                  {selectedAlert.resolvedAt && (
                    <p>Resolved: {format(new Date(selectedAlert.resolvedAt), 'dd MMM yyyy HH:mm')}</p>
                  )}
                  {selectedAlert.closedAt && (
                    <p>Closed: {format(new Date(selectedAlert.closedAt), 'dd MMM yyyy HH:mm')}</p>
                  )}
                </div>
              </div>

              {selectedAlert.timeToAcknowledge && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Time to Acknowledge</p>
                  <p className="text-sm text-gray-900">{selectedAlert.timeToAcknowledge} hours</p>
                </div>
              )}

              {selectedAlert.timeToResolve && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Time to Resolve</p>
                  <p className="text-sm text-gray-900">{selectedAlert.timeToResolve} hours</p>
                </div>
              )}

              {/* Action History */}
              {selectedAlert.actions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Action History</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedAlert.actions.map((action, idx) => (
                      <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                        <p className="font-medium text-gray-900">{action.action}</p>
                        <p className="text-gray-600">By: {action.performedBy} at {format(new Date(action.performedAt), 'dd MMM yyyy HH:mm')}</p>
                        {action.comment && <p className="text-gray-600">Comment: {action.comment}</p>}
                        {action.resolutionNote && <p className="text-gray-600">Resolution: {action.resolutionNote}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t border-gray-200">
                {selectedAlert.status === 'open' && (
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.alertId)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Acknowledge
                  </button>
                )}

                {(selectedAlert.status === 'open' || selectedAlert.status === 'acknowledged') && (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Assign / Escalate
                  </button>
                )}

                <button
                  onClick={() => setShowCommentModal(true)}
                  className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Add Comment
                </button>

                {selectedAlert.status !== 'resolved' && selectedAlert.status !== 'closed' && (
                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Resolve
                  </button>
                )}

                {selectedAlert.status === 'resolved' && (
                  <button
                    onClick={() => setShowCloseModal(true)}
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Enter your comment..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCommentModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign/Escalate Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Assign / Escalate Alert</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <input
                  type="text"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="User ID or name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comment / Reason</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter reason or instructions..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
              <button
                onClick={handleEscalate}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Escalate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Resolve Alert</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Note</label>
              <textarea
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe how the issue was resolved..."
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowResolveModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Close Alert</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Closure Note (Optional)</label>
              <textarea
                value={closureNote}
                onChange={(e) => setClosureNote(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Add any final notes..."
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
              >
                Close Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
