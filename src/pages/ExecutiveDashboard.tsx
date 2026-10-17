/**
 * Part 22 — Executive Dashboard
 */

import React, { useState, useEffect } from 'react';
import { getDefaultLayoutForRole, generateDashboardData } from '../services/dashboardFramework';
import { DashboardLayout, DashboardData, DashboardFilter } from '../services/dashboardTypes';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function ExecutiveDashboard() {
  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilter>({
    id: 'default',
    name: 'Default',
    period: 'daily',
    isSaved: false,
    createdBy: 'system',
    createdAt: new Date().toISOString(),
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const defaultLayout = await getDefaultLayoutForRole('executive');
      if (defaultLayout) {
        setLayout(defaultLayout);
        const data = await generateDashboardData(defaultLayout.id, filters, 'system');
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: 'daily' | 'weekly' | 'monthly') => {
    setFilters({ ...filters, period });
    loadDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!layout || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No dashboard layout found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Overview of key business metrics • Last updated: {format(new Date(dashboardData.generatedAt), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodChange('daily')}
              className={`px-4 py-2 rounded-lg ${
                filters.period === 'daily' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => handlePeriodChange('weekly')}
              className={`px-4 py-2 rounded-lg ${
                filters.period === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => handlePeriodChange('monthly')}
              className={`px-4 py-2 rounded-lg ${
                filters.period === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* Stale Data Warnings */}
      {dashboardData.staleDataWarnings.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Stale Data Warning</h3>
              <p className="text-sm text-amber-800 mt-1">
                {dashboardData.staleDataWarnings.length} widget(s) have data older than 1 hour
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {dashboardData.widgetsData.map((widgetData) => {
          const widget = layout.widgets.find(w => w.id === widgetData.widgetId);
          if (!widget) return null;

          return (
            <div key={widget.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">{widget.title}</h3>
                {widgetData.status === 'stale' && (
                  <Clock className="w-4 h-4 text-amber-500" />
                )}
                {widgetData.status === 'error' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </div>
              
              {widgetData.status === 'success' || widgetData.status === 'stale' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">
                      {widgetData.value?.toLocaleString('en-IN')}
                    </p>
                    {widgetData.changePercent !== undefined && (
                      <span className={`text-sm font-medium ${
                        widgetData.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {widgetData.changePercent > 0 ? '+' : ''}{widgetData.changePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  {widgetData.trend && widgetData.trend.length === 2 && (
                    <div className="mt-4 flex items-center gap-2">
                      {widgetData.trend[1] > widgetData.trend[0] ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span className="text-xs text-gray-500">vs previous period</span>
                    </div>
                  )}

                  {widgetData.breakdown && Object.keys(widgetData.breakdown).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-1">
                        {Object.entries(widgetData.breakdown).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-medium text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-20">
                  <p className="text-sm text-gray-500">
                    {widgetData.status === 'error' ? 'Error loading data' : 'Loading...'}
                  </p>
                </div>
              )}

              {/* Data Source Labels */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>Sources:</span>
                  {Object.entries(widgetData.sourceLabels)
                    .filter(([_, count]) => count > 0)
                    .map(([label, count]) => (
                      <span key={label} className="px-2 py-0.5 bg-gray-100 rounded">
                        {label.replace('_', ' ')}: {count}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refresh Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">Dashboard Performance:</span> Generated in {dashboardData.refreshDuration}ms
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
