/**
 * Part 23 — Financial and Profitability Dashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  calculateFinancialKPI, 
  getProjectProfitability, 
  getPlantCostBreakdown,
  getCostTrends,
  getBudgetVsActual
} from '../services/financialDashboard';
import { FinancialKPI, ProjectProfitability, PlantCostBreakdown } from '../services/dashboardPart23Types';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export default function FinancialDashboard() {
  const [kpi, setKpi] = useState<FinancialKPI | null>(null);
  const [projectProfitability, setProjectProfitability] = useState<ProjectProfitability[]>([]);
  const [plantCosts, setPlantCosts] = useState<PlantCostBreakdown[]>([]);
  const [costTrends, setCostTrends] = useState<any[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [hasPermission, setHasPermission] = useState(true); // Would check actual permission

  useEffect(() => {
    if (hasPermission) {
      loadDashboard();
    }
  }, [period, hasPermission]);

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

      const [kpiData, projectData, plantData, trendData, budgetData] = await Promise.all([
        calculateFinancialKPI(period, startDateStr, endDateStr),
        getProjectProfitability(startDateStr, endDateStr),
        getPlantCostBreakdown(startDateStr, endDateStr),
        getCostTrends(6),
        getBudgetVsActual(startDateStr, endDateStr),
      ]);

      setKpi(kpiData);
      setProjectProfitability(projectData);
      setPlantCosts(plantData);
      setCostTrends(trendData);
      setBudgetVsActual(budgetData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
          <Lock className="w-12 h-12 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-amber-900 mb-2">Access Restricted</h2>
          <p className="text-amber-800">
            You don't have permission to view financial data. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

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
  const costBreakdownData = [
    { name: 'Material', value: kpi.materialCost },
    { name: 'Fuel', value: kpi.fuelCost },
    { name: 'Labour', value: kpi.labourCost },
    { name: 'Maintenance', value: kpi.maintenanceCost },
    { name: 'Transport', value: kpi.transportCost },
    { name: 'Overhead', value: kpi.overheadCost },
  ];

  const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-7 h-7" />
              Financial & Profitability Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor revenue, expenses, and profitability • Last updated: {format(new Date(kpi.lastRefreshedAt), 'dd MMM yyyy HH:mm')}
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
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Revenue</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpi.totalRevenue)}</p>
          <p className={`text-xs mt-1 ${kpi.revenueVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpi.revenueVariance >= 0 ? '+' : ''}{formatCurrency(kpi.revenueVariance)} vs budget
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <p className="text-sm text-gray-600">Expenses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpi.totalExpenses)}</p>
          <p className={`text-xs mt-1 ${kpi.expenseVariance <= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {kpi.expenseVariance >= 0 ? '+' : ''}{formatCurrency(kpi.expenseVariance)} vs budget
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Gross Profit</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(kpi.grossProfit)}</p>
          <p className="text-xs text-gray-500 mt-1">Margin: {kpi.grossMargin}%</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Unposted</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{kpi.unpostedTransactions}</p>
          <p className="text-xs text-gray-500 mt-1">{formatCurrency(kpi.unpostedAmount)} pending</p>
        </div>
      </div>

      {/* Data Status Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Data Status Breakdown</p>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-xs text-blue-800">Posted Actuals: {formatCurrency(kpi.postedActuals)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded"></div>
                <span className="text-xs text-blue-800">Approved Unposted: {formatCurrency(kpi.approvedUnposted)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs text-blue-800">Estimates: {formatCurrency(kpi.estimates)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded"></div>
                <span className="text-xs text-blue-800">Forecasts: {formatCurrency(kpi.forecasts)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cost Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={costBreakdownData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {costBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends (6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `₹${(value / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="materialCost" stroke="#3b82f6" name="Material" />
              <Line type="monotone" dataKey="fuelCost" stroke="#f59e0b" name="Fuel" />
              <Line type="monotone" dataKey="labourCost" stroke="#10b981" name="Labour" />
              <Line type="monotone" dataKey="totalCost" stroke="#ef4444" name="Total" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Budget vs Actual */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Budgeted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {budgetVsActual.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.budgeted)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.actual)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={item.variance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)} ({item.variancePercent}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      item.status === 'favorable' ? 'bg-green-100 text-green-800' :
                      item.status === 'unfavorable' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
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

      {/* Project Profitability */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Profitability</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expenses</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projectProfitability.map((project, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{project.projectName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(project.revenue)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(project.expenses)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={project.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(project.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={project.margin >= 20 ? 'text-green-600' : project.margin >= 10 ? 'text-amber-600' : 'text-red-600'}>
                      {project.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receivables and Payables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Receivables</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Receivables</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(kpi.totalReceivables)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overdue Receivables</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(kpi.overdueReceivables)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(kpi.overdueReceivables / kpi.totalReceivables) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {((kpi.overdueReceivables / kpi.totalReceivables) * 100).toFixed(1)}% overdue
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payables</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Payables</span>
              <span className="text-lg font-bold text-gray-900">{formatCurrency(kpi.totalPayables)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overdue Payables</span>
              <span className="text-lg font-bold text-amber-600">{formatCurrency(kpi.overduePayables)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className="bg-amber-500 h-2 rounded-full"
                style={{ width: `${(kpi.overduePayables / kpi.totalPayables) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {((kpi.overduePayables / kpi.totalPayables) * 100).toFixed(1)}% overdue
            </p>
          </div>
        </div>
      </div>

      {/* Cash Flow Indicator */}
      <div className={`rounded-lg shadow p-6 ${
        kpi.cashFlowIndicator === 'positive' ? 'bg-green-50 border border-green-200' :
        kpi.cashFlowIndicator === 'negative' ? 'bg-red-50 border border-red-200' :
        'bg-gray-50 border border-gray-200'
      }`}>
        <h2 className="text-lg font-semibold mb-2">
          <span className={
            kpi.cashFlowIndicator === 'positive' ? 'text-green-900' :
            kpi.cashFlowIndicator === 'negative' ? 'text-red-900' :
            'text-gray-900'
          }>
            Cash Flow Status: {kpi.cashFlowIndicator.toUpperCase()}
          </span>
        </h2>
        <p className={`text-sm ${
          kpi.cashFlowIndicator === 'positive' ? 'text-green-800' :
          kpi.cashFlowIndicator === 'negative' ? 'text-red-800' :
          'text-gray-800'
        }`}>
          {kpi.cashFlowIndicator === 'positive' && 'Positive cash flow indicates healthy financial position'}
          {kpi.cashFlowIndicator === 'negative' && 'Negative cash flow requires attention to receivables and payables management'}
          {kpi.cashFlowIndicator === 'neutral' && 'Neutral cash flow position'}
        </p>
      </div>
    </div>
  );
}
