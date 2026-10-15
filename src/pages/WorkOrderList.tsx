/**
 * Part 11 — Work Order List
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listWorkOrders, getWorkOrderStatistics } from '../services/workOrderService';
import { WorkOrder, WorkOrderType, WorkOrderStatus } from '../services/maintenanceTypes';
import { format } from 'date-fns';
import { AlertTriangle, Clock, CheckCircle, XCircle, Wrench } from 'lucide-react';

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [filters, setFilters] = useState({
    type: '' as WorkOrderType | '',
    status: '' as WorkOrderStatus | '',
    priority: '',
    isSafetyCritical: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, stats] = await Promise.all([
        listWorkOrders(filters as any),
        getWorkOrderStatistics(),
      ]);
      setWorkOrders(orders);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: WorkOrderStatus) => {
    const colors: Record<WorkOrderStatus, string> = {
      reported: 'bg-blue-100 text-blue-800',
      triaged: 'bg-indigo-100 text-indigo-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      awaiting_parts: 'bg-orange-100 text-orange-800',
      awaiting_external_vendor: 'bg-purple-100 text-purple-800',
      testing: 'bg-cyan-100 text-cyan-800',
      released: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      critical: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  const getTypeIcon = (type: WorkOrderType) => {
    switch (type) {
      case 'pm':
        return <Clock className="w-4 h-4" />;
      case 'breakdown':
        return <AlertTriangle className="w-4 h-4" />;
      case 'accident':
        return <XCircle className="w-4 h-4" />;
      case 'overhaul':
        return <Wrench className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading work orders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
            <p className="text-gray-600 mt-1">Manage corrective and preventive maintenance work orders</p>
          </div>
          <button
            onClick={() => navigate('/maintenance/work-orders/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Wrench className="w-4 h-4" />
            New Work Order
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Work Orders</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalWorkOrders}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <p className="text-sm text-yellow-700">Open</p>
            <p className="text-2xl font-bold text-yellow-900">{statistics.openWorkOrders}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <p className="text-sm text-red-700">Safety Critical</p>
            <p className="text-2xl font-bold text-red-900">{statistics.safetyCriticalCount}</p>
          </div>
          <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
            <p className="text-sm text-blue-700">Avg Completion</p>
            <p className="text-2xl font-bold text-blue-900">{statistics.averageCompletionTime}h</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-sm text-green-700">Total Cost</p>
            <p className="text-2xl font-bold text-green-900">₹{statistics.totalCost.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as WorkOrderType | '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="pm">Preventive Maintenance</option>
              <option value="breakdown">Breakdown</option>
              <option value="accident">Accident</option>
              <option value="overhaul">Overhaul</option>
              <option value="modification">Modification</option>
              <option value="warranty">Warranty</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as WorkOrderStatus | '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="triaged">Triaged</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_parts">Awaiting Parts</option>
              <option value="awaiting_external_vendor">Awaiting Vendor</option>
              <option value="testing">Testing</option>
              <option value="released">Released</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.isSafetyCritical}
                onChange={(e) => setFilters({ ...filters, isSafetyCritical: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Safety Critical Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work Order #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reported
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {wo.isSafetyCritical && (
                        <span title="Safety Critical">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </span>
                      )}
                      <span className="text-sm font-medium text-gray-900">{wo.workOrderNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{wo.assetCode || wo.assetId}</div>
                    {wo.location && (
                      <div className="text-xs text-gray-500">{wo.location}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      {getTypeIcon(wo.type)}
                      <span className="capitalize">{wo.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium capitalize ${getPriorityColor(wo.priority)}`}>
                      {wo.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(wo.status)}`}>
                      {wo.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(wo.reportedAt), 'dd MMM yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{wo.totalCost.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/maintenance/work-orders/${wo.id}`)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {workOrders.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No work orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
