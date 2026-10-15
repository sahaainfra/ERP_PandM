/**
 * Part 09 — Tank Dashboard
 * 
 * Dashboard for monitoring fuel storage points and reconciliation status
 */

import React, { useState, useEffect } from 'react';
import { Fuel, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listStoragePoints, listMeasuringInstruments } from '../services/fuelMasters';
import { listFuelReceipts, getReceiptStatistics } from '../services/fuelReceipts';
import { listFuelIssues, getIssueStatistics } from '../services/fuelIssues';
import { listDailyReconciliations, getReconciliationStatistics, getStoragePointStock } from '../services/tankReconciliation';
import { StoragePoint, MeasuringInstrument, DailyTankReconciliation } from '../services/fuelTypes';

export default function TankDashboard() {
  const [storagePoints, setStoragePoints] = useState<StoragePoint[]>([]);
  const [instruments, setInstruments] = useState<MeasuringInstrument[]>([]);
  const [reconciliations, setReconciliations] = useState<DailyTankReconciliation[]>([]);
  const [selectedStoragePoint, setSelectedStoragePoint] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);

  const [receiptStats, setReceiptStats] = useState({ totalReceipts: 0, totalQuantity: 0, totalValue: 0, averageVariance: 0 });
  const [issueStats, setIssueStats] = useState({ totalIssues: 0, totalQuantity: 0, totalCost: 0, averageCostPerLitre: 0 });
  const [reconciliationStats, setReconciliationStats] = useState({ totalReconciliations: 0, reconciled: 0, variances: 0, pending: 0, totalVariance: 0 });

  useEffect(() => {
    loadData();
  }, [selectedStoragePoint, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storagePointsData, instrumentsData, reconciliationsData] = await Promise.all([
        listStoragePoints(),
        listMeasuringInstruments(),
        listDailyReconciliations(),
      ]);

      setStoragePoints(storagePointsData);
      setInstruments(instrumentsData);
      setReconciliations(reconciliationsData);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const fromDate = startDate.toISOString().split('T')[0];
      const toDate = endDate.toISOString().split('T')[0];

      // Get statistics
      const filters = {
        fromDate,
        toDate,
        ...(selectedStoragePoint !== 'all' && { storagePointId: selectedStoragePoint }),
      };

      const [receiptStatsData, issueStatsData, reconciliationStatsData] = await Promise.all([
        getReceiptStatistics(filters),
        getIssueStatistics(filters),
        getReconciliationStatistics(filters),
      ]);

      setReceiptStats(receiptStatsData);
      setIssueStats(issueStatsData);
      setReconciliationStats(reconciliationStatsData);
    } catch (error) {
      console.error('Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const reconciliationTrend = reconciliations
    .filter(r => selectedStoragePoint === 'all' || r.storagePointId === selectedStoragePoint)
    .slice(0, 30)
    .reverse()
    .map(r => ({
      date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      variance: r.variance,
      variancePercent: r.variancePercent,
    }));

  const storagePointStock = storagePoints.map(sp => {
    const latestReconciliation = reconciliations
      .filter(r => r.storagePointId === sp.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return {
      name: sp.name,
      currentStock: latestReconciliation?.closingVolume || 0,
      capacity: sp.capacity,
      utilization: latestReconciliation ? (latestReconciliation.closingVolume / sp.capacity) * 100 : 0,
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Fuel className="w-7 h-7" />
          Tank Dashboard
        </h1>
        <p className="text-gray-600 mt-1">Monitor fuel storage, receipts, issues, and reconciliation</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Storage Point</label>
            <select
              value={selectedStoragePoint}
              onChange={(e) => setSelectedStoragePoint(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Storage Points</option>
              {storagePoints.map(sp => (
                <option key={sp.id} value={sp.id}>{sp.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Receipts</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{receiptStats.totalReceipts}</p>
          <p className="text-sm text-gray-500">{receiptStats.totalQuantity.toFixed(0)}L received</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Total Issues</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{issueStats.totalIssues}</p>
          <p className="text-sm text-gray-500">{issueStats.totalQuantity.toFixed(0)}L issued</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <p className="text-sm text-gray-600">Reconciled</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{reconciliationStats.reconciled}</p>
          <p className="text-sm text-gray-500">{reconciliationStats.totalReconciliations} total</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Variances</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{reconciliationStats.variances}</p>
          <p className="text-sm text-gray-500">{reconciliationStats.totalVariance.toFixed(1)}L total</p>
        </div>
      </div>

      {/* Storage Point Stock Levels */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Storage Point Stock Levels</h2>
        <div className="space-y-4">
          {storagePointStock.map((sp, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{sp.name}</h3>
                <span className="text-sm text-gray-500">
                  {sp.currentStock.toFixed(0)}L / {sp.capacity}L
                </span>
              </div>
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full transition-all ${
                    sp.utilization > 90 ? 'bg-red-500' :
                    sp.utilization > 70 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(sp.utilization, 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900">
                  {sp.utilization.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Reconciliation Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation Variance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reconciliationTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="variance" stroke="#f59e0b" strokeWidth={2} name="Variance (L)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Receipts vs Issues */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipts vs Issues</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: 'Receipts', value: receiptStats.totalQuantity, fill: '#10b981' },
              { name: 'Issues', value: issueStats.totalQuantity, fill: '#3b82f6' },
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="Quantity (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reconciliations */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Reconciliations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Point</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opening</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Closing</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reconciliations
                .filter(r => selectedStoragePoint === 'all' || r.storagePointId === selectedStoragePoint)
                .slice(0, 10)
                .map((reconciliation) => {
                  const storagePoint = storagePoints.find(sp => sp.id === reconciliation.storagePointId);
                  return (
                    <tr key={reconciliation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(reconciliation.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {storagePoint?.name || reconciliation.storagePointId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reconciliation.openingVolume.toFixed(0)}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        +{reconciliation.receiptsVolume.toFixed(0)}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        -{reconciliation.issuesVolume.toFixed(0)}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {reconciliation.closingVolume.toFixed(0)}L
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={reconciliation.variance > 0 ? 'text-red-600' : reconciliation.variance < 0 ? 'text-amber-600' : 'text-gray-900'}>
                          {reconciliation.variance > 0 ? '+' : ''}{reconciliation.variance.toFixed(2)}L
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          reconciliation.status === 'reconciled' ? 'bg-green-100 text-green-800' :
                          reconciliation.status === 'variance_detected' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {reconciliation.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
