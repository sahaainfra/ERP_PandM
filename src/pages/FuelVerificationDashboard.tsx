/**
 * Part 22 — Fuel Verification Dashboard
 */

import React, { useState, useEffect } from 'react';
import { getDefaultLayoutForRole, generateDashboardData } from '../services/dashboardFramework';
import { DashboardLayout, DashboardData, DashboardFilter } from '../services/dashboardTypes';
import { format } from 'date-fns';
import { Fuel, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function FuelVerificationDashboard() {
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
              <Fuel className="w-7 h-7" />
              Fuel Verification Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor fuel consumption, verification coverage, and compliance • Last updated: {format(new Date(dashboardData.generatedAt), 'dd MMM yyyy HH:mm')}
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
              </div>
              
              {widgetData.status === 'success' || widgetData.status === 'stale' ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-gray-900">
                      {widgetData.value?.toLocaleString('en-IN')}
                      {widget.kpiId === '5' && '%'}
                      {widget.kpiId === '4' && ' ₹'}
                      {widget.kpiId === '14' && '%'}
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

      {/* Fuel Verification Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Verification Coverage */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Verification Coverage
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Today's Coverage</span>
                <span className="text-sm font-medium text-gray-900">92.3%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '92.3%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">This Week</span>
                <span className="text-sm font-medium text-gray-900">88.7%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88.7%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium text-gray-900">90.1%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '90.1%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Variance Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Variance Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">Within Tolerance</p>
                  <p className="text-sm text-gray-600">85 assets</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-700">78.5%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="font-medium text-gray-900">Warning Level</p>
                  <p className="text-sm text-gray-600">18 assets</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-700">16.6%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium text-gray-900">Critical Level</p>
                  <p className="text-sm text-gray-600">5 assets</p>
                </div>
              </div>
              <span className="text-lg font-bold text-red-700">4.6%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calibration Compliance */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Calibration Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-700">88.5%</p>
            <p className="text-sm text-gray-600 mt-2">Valid Calibration</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-700">8.2%</p>
            <p className="text-sm text-gray-600 mt-2">Due Soon</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-3xl font-bold text-red-700">3.3%</p>
            <p className="text-sm text-gray-600 mt-2">Overdue</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-700">0%</p>
            <p className="text-sm text-gray-600 mt-2">Failed</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Fuel className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Verifications</p>
              <p className="text-sm text-gray-600">Detailed fuel verification data</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Calibration Schedule</p>
              <p className="text-sm text-gray-600">Manage instrument calibration</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Investigate Variances</p>
              <p className="text-sm text-gray-600">Review critical fuel variances</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
