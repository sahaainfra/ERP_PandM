/**
 * Part 22 — Operator Reporting Dashboard
 */

import React, { useState, useEffect } from 'react';
import { getDefaultLayoutForRole, generateDashboardData } from '../services/dashboardFramework';
import { DashboardLayout, DashboardData, DashboardFilter } from '../services/dashboardTypes';
import { format } from 'date-fns';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function OperatorReportingDashboard() {
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
      const defaultLayout = await getDefaultLayoutForRole('site_manager');
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
              <Users className="w-7 h-7" />
              Operator Reporting Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor operator submissions, approvals, and compliance • Last updated: {format(new Date(dashboardData.generatedAt), 'dd MMM yyyy HH:mm')}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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

      {/* Approval Queue */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Pending Approval Queue
        </h2>
        <div className="space-y-3">
          {/* Mock approval items */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Operator Submission #{item}</p>
                  <p className="text-sm text-gray-600">Submitted 2 hours ago</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                  Approve
                </button>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <CheckCircle className="w-6 h-6 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Review Submissions</p>
              <p className="text-sm text-gray-600">Process pending approvals</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Users className="w-6 h-6 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">View Operators</p>
              <p className="text-sm text-gray-600">Manage operator profiles</p>
            </div>
          </button>
          <button className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Exception Reports</p>
              <p className="text-sm text-gray-600">View compliance issues</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
