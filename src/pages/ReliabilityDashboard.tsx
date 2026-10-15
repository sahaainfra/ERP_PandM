/**
 * Part 11 — Reliability Dashboard
 */

import React, { useState, useEffect } from 'react';
import { calculateFleetReliabilityMetrics, listReliabilityMetrics } from '../services/reliabilityMetricsService';
import { listAssets } from '../services/assets';
import { ReliabilityMetrics } from '../services/maintenanceTypes';
import { format, subDays } from 'date-fns';
import { TrendingUp, Clock, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function ReliabilityDashboard() {
  const [fleetMetrics, setFleetMetrics] = useState<any>(null);
  const [assetMetrics, setAssetMetrics] = useState<ReliabilityMetrics[]>([]);
  const [period, setPeriod] = useState<'30' | '90' | '180'>('90');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      const startDate = format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd');

      const [fleet, assets] = await Promise.all([
        calculateFleetReliabilityMetrics(startDate, endDate),
        listReliabilityMetrics({ startDate, endDate }),
      ]);

      setFleetMetrics(fleet);
      setAssetMetrics(assets);
    } catch (error) {
      console.error('Failed to load reliability metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-orange-600';
      default:
        return 'text-gray-400';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
      default:
        return 'Insufficient Data';
    }
  };

  // Prepare chart data
  const chartData = assetMetrics.map(m => ({
    asset: m.assetId.substring(0, 8),
    mtbf: m.mtbf || 0,
    mttr: m.mttr || 0,
    availability: m.availability || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading reliability metrics...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reliability Dashboard</h1>
            <p className="text-gray-600 mt-1">Fleet-wide reliability metrics and performance indicators</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('30')}
              className={`px-4 py-2 rounded-lg ${
                period === '30' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('90')}
              className={`px-4 py-2 rounded-lg ${
                period === '90' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Days
            </button>
            <button
              onClick={() => setPeriod('180')}
              className={`px-4 py-2 rounded-lg ${
                period === '180' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              180 Days
            </button>
          </div>
        </div>
      </div>

      {/* Fleet-Wide Metrics */}
      {fleetMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">Fleet Availability</p>
            </div>
            {fleetMetrics.averageAvailability !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{fleetMetrics.averageAvailability}%</p>
                <p className="text-xs text-gray-500 mt-1">Across {fleetMetrics.totalAssets} assets</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Insufficient data</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Avg MTBF</p>
            </div>
            {fleetMetrics.averageMTBF !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{fleetMetrics.averageMTBF} hrs</p>
                <p className="text-xs text-gray-500 mt-1">Mean time between failures</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Insufficient data</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <p className="text-sm text-gray-600">Avg MTTR</p>
            </div>
            {fleetMetrics.averageMTTR !== null ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{fleetMetrics.averageMTTR} hrs</p>
                <p className="text-xs text-gray-500 mt-1">Mean time to repair</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">Insufficient data</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600">Total Breakdowns</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{fleetMetrics.totalBreakdowns}</p>
            <p className="text-xs text-gray-500 mt-1">{fleetMetrics.totalDowntimeHours}h downtime</p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* MTBF Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">MTBF by Asset (Hours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="asset" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="mtbf" fill="#3b82f6" name="MTBF" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Availability Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability by Asset (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="asset" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="availability" fill="#10b981" name="Availability" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Asset Metrics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Asset Reliability Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Operating Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Breakdowns
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MTBF (hrs)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MTTR (hrs)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Availability
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assetMetrics.map((metrics) => (
                <tr key={metrics.assetId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {metrics.assetId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metrics.totalOperatingHours} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metrics.breakdownCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metrics.mtbf !== null ? metrics.mtbf : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metrics.mttr !== null ? metrics.mttr : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {metrics.availability !== null ? `${metrics.availability}%` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium ${getConfidenceColor(metrics.mtbfConfidence)}`}>
                      {getConfidenceLabel(metrics.mtbfConfidence)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {assetMetrics.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No reliability metrics available for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}
