/**
 * Part 23 — Dispatch and Logistics Dashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  calculateDispatchLogisticsKPI, 
  getMixerUtilization, 
  getDeliveryExceptions,
  getQuantityReconciliation
} from '../services/dispatchLogisticsDashboard';
import { DispatchLogisticsKPI, MixerUtilization, DeliveryException } from '../services/dashboardPart23Types';
import { format } from 'date-fns';
import { Truck, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function DispatchLogisticsDashboard() {
  const [kpi, setKpi] = useState<DispatchLogisticsKPI | null>(null);
  const [mixerUtilization, setMixerUtilization] = useState<MixerUtilization[]>([]);
  const [exceptions, setExceptions] = useState<DeliveryException[]>([]);
  const [reconciliation, setReconciliation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'daily') {
        startDate.setDate(startDate.getDate() - 1);
      } else if (period === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setMonth(startDate.getMonth() - 1);
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const [kpiData, mixerData, exceptionData, reconData] = await Promise.all([
        calculateDispatchLogisticsKPI(period, startDateStr, endDateStr),
        getMixerUtilization(startDateStr, endDateStr),
        getDeliveryExceptions(startDateStr, endDateStr),
        getQuantityReconciliation(startDateStr, endDateStr),
      ]);

      setKpi(kpiData);
      setMixerUtilization(mixerData);
      setExceptions(exceptionData);
      setReconciliation(reconData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!kpi) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Prepare chart data
  const mixerChartData = mixerUtilization.slice(0, 10).map(m => ({
    name: m.mixerNumber,
    utilization: m.utilizationPercent,
    trips: m.totalTrips,
  }));

  const reconciliationChartData = reconciliation ? [
    { name: 'Ordered', value: reconciliation.ordered },
    { name: 'Produced', value: reconciliation.produced },
    { name: 'Dispatched', value: reconciliation.dispatched },
    { name: 'Delivered', value: reconciliation.delivered },
    { name: 'Invoiced', value: reconciliation.invoiced },
  ] : [];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7" />
              Dispatch & Logistics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor dispatch operations, delivery performance, and logistics efficiency • Last updated: {format(new Date(kpi.lastRefreshedAt), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('daily')}
              className={`px-4 py-2 rounded-lg ${
                period === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-4 py-2 rounded-lg ${
                period === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-4 py-2 rounded-lg ${
                period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Delivered</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.deliveredOrders}</p>
          <p className="text-xs text-gray-500 mt-1">of {kpi.dispatchedOrders} dispatched</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">On-Time Delivery</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.onTimeDeliveryPercent}%</p>
          <p className="text-xs text-gray-500 mt-1">Performance rate</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Avg Transit Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.averageTransitTime} min</p>
          <p className="text-xs text-gray-500 mt-1">Plant to site</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Transport Cost</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{kpi.transportCostPerM3.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">per m³ delivered</p>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-900">{kpi.scheduledOrders}</p>
            <p className="text-xs text-blue-700">Scheduled</p>
          </div>
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <p className="text-2xl font-bold text-indigo-900">{kpi.batchedOrders}</p>
            <p className="text-xs text-indigo-700">Batched</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-900">{kpi.dispatchedOrders}</p>
            <p className="text-xs text-purple-700">Dispatched</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-900">{kpi.deliveredOrders}</p>
            <p className="text-xs text-green-700">Delivered</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-900">{kpi.delayedOrders}</p>
            <p className="text-xs text-red-700">Delayed</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-900">{kpi.cancelledOrders}</p>
            <p className="text-xs text-gray-700">Cancelled</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Mixer Utilization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mixer Utilization (Top 10)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mixerChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="utilization" fill="#3b82f6" name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quantity Reconciliation */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quantity Reconciliation (m³)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reconciliationChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#10b981" name="Quantity (m³)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Duration Metrics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Duration Metrics (minutes)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-900">{kpi.averageLoadingTime}</p>
            <p className="text-sm text-blue-700 mt-2">Avg Loading Time</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-900">{kpi.averageWaitingTime}</p>
            <p className="text-sm text-amber-700 mt-2">Avg Waiting Time</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-900">{kpi.averageTransitTime}</p>
            <p className="text-sm text-purple-700 mt-2">Avg Transit Time</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-900">{kpi.averageUnloadingTime}</p>
            <p className="text-sm text-green-700 mt-2">Avg Unloading Time</p>
          </div>
        </div>
      </div>

      {/* Resource Availability */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transit Mixer Availability</h2>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Available</span>
            <span className="text-2xl font-bold text-green-600">{kpi.availableMixers} / {kpi.totalMixers}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full"
              style={{ width: `${(kpi.availableMixers / kpi.totalMixers) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {((kpi.availableMixers / kpi.totalMixers) * 100).toFixed(1)}% availability
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pump Availability</h2>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-600">Available</span>
            <span className="text-2xl font-bold text-blue-600">{kpi.availablePumps} / {kpi.totalPumps}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-500 h-3 rounded-full"
              style={{ width: `${kpi.totalPumps > 0 ? (kpi.availablePumps / kpi.totalPumps) * 100 : 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {kpi.totalPumps > 0 ? ((kpi.availablePumps / kpi.totalPumps) * 100).toFixed(1) : 0}% availability
          </p>
        </div>
      </div>

      {/* Delivery Exceptions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          Delivery Exceptions ({exceptions.length})
        </h2>
        {exceptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p>No delivery exceptions in this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.slice(0, 5).map((exception) => (
              <div key={exception.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                  exception.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{exception.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Type: {exception.exceptionType} • Created: {format(new Date(exception.createdAt), 'dd MMM yyyy HH:mm')}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  exception.severity === 'high' ? 'bg-red-100 text-red-800' :
                  exception.severity === 'medium' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {exception.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
