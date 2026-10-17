/**
 * Part 23 — RMC Production Dashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  calculateRMCProductionKPI, 
  getRMCProductionByPlant, 
  getRMCProductionByGrade,
  getStockLevels,
  getConsumptionVariance
} from '../services/rmcProductionDashboard';
import { RMCProductionKPI, RMCProductionByPlant, RMCProductionByGrade } from '../services/dashboardPart23Types';
import { format } from 'date-fns';
import { Factory, TrendingUp, AlertTriangle, Package, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function RMCProductionDashboard() {
  const [kpi, setKpi] = useState<RMCProductionKPI | null>(null);
  const [byPlant, setByPlant] = useState<RMCProductionByPlant[]>([]);
  const [byGrade, setByGrade] = useState<RMCProductionByGrade[]>([]);
  const [stockLevels, setStockLevels] = useState<any[]>([]);
  const [consumptionVariance, setConsumptionVariance] = useState<any[]>([]);
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

      const [kpiData, plantData, gradeData, stockData, varianceData] = await Promise.all([
        calculateRMCProductionKPI(period, startDateStr, endDateStr),
        getRMCProductionByPlant(startDateStr, endDateStr),
        getRMCProductionByGrade(startDateStr, endDateStr),
        getStockLevels(),
        getConsumptionVariance(startDateStr, endDateStr),
      ]);

      setKpi(kpiData);
      setByPlant(plantData);
      setByGrade(gradeData);
      setStockLevels(stockData);
      setConsumptionVariance(varianceData);
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
  const plantChartData = byPlant.map(p => ({
    name: p.plantName,
    planned: p.plannedProduction,
    actual: p.actualProduction,
  }));

  const gradeChartData = byGrade.map(g => ({
    name: g.grade,
    value: g.totalProduction,
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Factory className="w-7 h-7" />
              RMC Production Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor production, utilization, and costs • Last updated: {format(new Date(kpi.lastRefreshedAt), 'dd MMM yyyy HH:mm')}
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
            <Package className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Production</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.actualProduction} m³</p>
          <p className={`text-xs mt-1 ${kpi.productionVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpi.productionVariance >= 0 ? '+' : ''}{kpi.productionVariance} m³ ({kpi.productionVariancePercent}%)
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Batches</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.totalBatches}</p>
          <p className="text-xs text-gray-500 mt-1">Avg: {kpi.averageBatchDuration} min</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Utilization</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.plantUtilization}%</p>
          <p className="text-xs text-gray-500 mt-1">Plant capacity</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Cost per m³</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">₹{kpi.costPerM3.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">Production cost</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Production by Plant */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Production by Plant</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={plantChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" fill="#94a3b8" name="Planned (m³)" />
              <Bar dataKey="actual" fill="#3b82f6" name="Actual (m³)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Production by Grade */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Production by Grade</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={gradeChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value} m³`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {gradeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality and Schedule Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Quality Metrics</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Wastage</span>
              <span className="text-sm font-medium text-gray-900">{kpi.wastageM3} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Rejected</span>
              <span className="text-sm font-medium text-red-600">{kpi.rejectedM3} m³</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Returned</span>
              <span className="text-sm font-medium text-amber-600">{kpi.returnedM3} m³</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Schedule Adherence</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Adherence</span>
              <span className="text-sm font-medium text-gray-900">{kpi.scheduleAdherence}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Order Backlog</span>
              <span className="text-sm font-medium text-gray-900">{kpi.orderBacklog}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  kpi.scheduleAdherence >= 90 ? 'bg-green-500' :
                  kpi.scheduleAdherence >= 75 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${kpi.scheduleAdherence}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Data Quality</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Source</span>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {kpi.dataSource.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Last Refresh</span>
              <span className="text-xs text-gray-500">
                {format(new Date(kpi.lastRefreshedAt), 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Levels */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Levels</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days of Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockLevels.map((stock, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.material}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stock.currentStock.toLocaleString()} {stock.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stock.reorderLevel.toLocaleString()} {stock.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{stock.daysOfStock}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      stock.stockOutRisk === 'high' ? 'bg-red-100 text-red-800' :
                      stock.stockOutRisk === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {stock.stockOutRisk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consumption Variance */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Consumption Variance</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Theoretical</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consumptionVariance.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.material}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.theoretical}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.actual}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={item.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {item.variance > 0 ? '+' : ''}{item.variance} ({item.variancePercent}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      item.status === 'critical' ? 'bg-red-100 text-red-800' :
                      item.status === 'warning' ? 'bg-amber-100 text-amber-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
