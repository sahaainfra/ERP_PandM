/**
 * Part 22 — Fleet Dashboard
 */

import React, { useState, useEffect } from 'react';
import { getDefaultLayoutForRole, generateDashboardData } from '../services/dashboardFramework';
import { DashboardLayout, DashboardData, DashboardFilter } from '../services/dashboardTypes';
import { format } from 'date-fns';
import { Truck, AlertTriangle, Clock, TrendingUp } from 'lucide-react';

export default function FleetDashboard() {
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
      const defaultLayout = await getDefaultLayoutForRole('fleet_manager');
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
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-7 h-7" />
              Fleet Management Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor fleet utilization, maintenance, and costs • Last updated: {format(new Date(dashboardData.generatedAt), 'dd MMM yyyy HH:mm')}
            </p>
          </div>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
              </div>
              
              {widgetData.status === 'success' || widgetData.status === 'stale' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">
                      {widgetData.value?.toLocaleString('en-IN')}
                      {widget.kpiId === '2' && '%'}
                      {widget.kpiId === '11' && ' hrs'}
                      {widget.kpiId === '6' && ' ₹'}
                    </p>
                    {widgetData.changePercent !== undefined && (
                      <span className={`text-sm font-medium ${
                        widgetData.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {widgetData.changePercent > 0 ? '+' : ''}{widgetData.changePercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  {widgetData.breakdown && Object.keys(widgetData.breakdown).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2">
                        {Object.entries(widgetData.breakdown).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</span>
                            <span className="text-sm font-medium text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-20">
                  <p className="text-sm text-gray-500">Error loading data</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Truck className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Assets</p>
              <p className="text-sm text-gray-600">Manage fleet assets</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Utilization Report</p>
              <p className="text-sm text-gray-600">View detailed analysis</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Maintenance Alerts</p>
              <p className="text-sm text-gray-600">View pending work orders</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
