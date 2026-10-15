/**
 * Part 10 — Asset Fuel History
 * 
 * Chart showing actual fuel consumption rate against benchmark with tolerance bands
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { listVerifications } from '../services/verificationEngine';
import { getAsset } from '../services/assets';
import { getBenchmark } from '../services/benchmarkService';
import { DailyFuelVerification } from '../services/fuelVerificationTypes';
import { Asset } from '../services/assetTypes';
import { FuelBenchmark } from '../services/fuelVerificationTypes';

export default function AssetFuelHistory() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [benchmark, setBenchmark] = useState<FuelBenchmark | null>(null);
  const [verifications, setVerifications] = useState<DailyFuelVerification[]>([]);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load asset
      const assetData = await getAsset(id!);
      setAsset(assetData);

      // Load verifications
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const verifs = await listVerifications({ 
        assetId: id,
        fromDate: startDate.toISOString().split('T')[0],
        toDate: endDate.toISOString().split('T')[0]
      });
      setVerifications(verifs);

      // Load benchmark (use the most recent one)
      if (verifs.length > 0 && verifs[0].benchmarkId) {
        const benchmarkData = await getBenchmark(verifs[0].benchmarkId);
        setBenchmark(benchmarkData);
      }
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = verifications
    .filter(v => v.resultStatus !== 'missing' && v.resultStatus !== 'not_evaluable')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(v => ({
      date: new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      actualRate: v.actualRate,
      benchmarkRate: benchmark?.baseValue || 0,
      warningUpper: benchmark ? benchmark.baseValue * (1 + benchmark.warningToleranceUpper / 100) : 0,
      warningLower: benchmark ? benchmark.baseValue * (1 + benchmark.warningToleranceLower / 100) : 0,
      criticalUpper: benchmark ? benchmark.baseValue * (1 + benchmark.criticalToleranceUpper / 100) : 0,
      criticalLower: benchmark ? benchmark.baseValue * (1 + benchmark.criticalToleranceLower / 100) : 0,
      status: v.resultStatus,
      varianceLitres: v.varianceLitres,
      variancePercent: v.variancePercent,
    }));

  // Calculate statistics
  const totalVariance = verifications.reduce((sum, v) => sum + v.varianceLitres, 0);
  const averageVariance = verifications.length > 0 ? totalVariance / verifications.length : 0;
  const withinToleranceCount = verifications.filter(v => v.resultStatus === 'within_tolerance').length;
  const withinTolerancePercent = verifications.length > 0 ? (withinToleranceCount / verifications.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading fuel history...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Asset not found</p>
          <Link to="/assets" className="text-blue-600 hover:text-blue-900 mt-4 inline-block">
            ← Back to Assets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/assets/${id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Asset
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-7 h-7" />
              Fuel Consumption History
            </h1>
            <p className="text-gray-600 mt-1">
              {asset.assetCode} - {asset.make} {asset.model}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('7')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                dateRange === '7' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateRange('30')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                dateRange === '30' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setDateRange('90')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                dateRange === '90' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Verifications</p>
          <p className="text-2xl font-bold text-gray-900">{verifications.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <p className="text-sm text-green-700">Within Tolerance</p>
          <p className="text-2xl font-bold text-green-900">{withinTolerancePercent.toFixed(1)}%</p>
          <p className="text-xs text-green-600">{withinToleranceCount} of {verifications.length}</p>
        </div>
        <div className={`rounded-lg shadow p-4 border ${
          averageVariance > 0 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <p className={`text-sm ${averageVariance > 0 ? 'text-red-700' : 'text-blue-700'}`}>
            Average Variance
          </p>
          <p className={`text-2xl font-bold ${averageVariance > 0 ? 'text-red-900' : 'text-blue-900'}`}>
            {averageVariance > 0 ? '+' : ''}{averageVariance.toFixed(1)}L
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total Variance</p>
          <p className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-700' : 'text-blue-700'}`}>
            {totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(1)}L
          </p>
        </div>
      </div>

      {/* Benchmark Info */}
      {benchmark && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Benchmark</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Base Rate</p>
              <p className="font-semibold text-gray-900">{benchmark.baseValue} {benchmark.unit}</p>
            </div>
            <div>
              <p className="text-gray-500">Warning Band</p>
              <p className="font-semibold text-amber-700">
                ±{benchmark.warningToleranceUpper}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Critical Band</p>
              <p className="font-semibold text-red-700">
                ±{benchmark.criticalToleranceUpper}%
              </p>
            </div>
            <div>
              <p className="text-gray-500">Source</p>
              <p className="font-semibold text-gray-900">{benchmark.source.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actual Rate vs Benchmark</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis label={{ value: benchmark?.unit || 'L/hr', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-gray-900">{data.date}</p>
                      <p className="text-sm text-gray-700">
                        Actual: <span className="font-medium">{data.actualRate.toFixed(2)} {benchmark?.unit}</span>
                      </p>
                      <p className="text-sm text-gray-700">
                        Benchmark: <span className="font-medium">{data.benchmarkRate.toFixed(2)} {benchmark?.unit}</span>
                      </p>
                      <p className={`text-sm ${data.varianceLitres > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        Variance: {data.varianceLitres > 0 ? '+' : ''}{data.varianceLitres.toFixed(1)}L ({data.variancePercent.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Status: {data.status}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {/* Critical bands */}
            <Area 
              type="monotone" 
              dataKey="criticalUpper" 
              stroke="none" 
              fill="#fee2e2" 
              fillOpacity={0.3}
              name="Critical Upper"
            />
            <Area 
              type="monotone" 
              dataKey="criticalLower" 
              stroke="none" 
              fill="#fee2e2" 
              fillOpacity={0.3}
              name="Critical Lower"
            />
            
            {/* Warning bands */}
            <Area 
              type="monotone" 
              dataKey="warningUpper" 
              stroke="none" 
              fill="#fef3c7" 
              fillOpacity={0.5}
              name="Warning Upper"
            />
            <Area 
              type="monotone" 
              dataKey="warningLower" 
              stroke="none" 
              fill="#fef3c7" 
              fillOpacity={0.5}
              name="Warning Lower"
            />
            
            {/* Benchmark line */}
            <Line 
              type="monotone" 
              dataKey="benchmarkRate" 
              stroke="#3b82f6" 
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Benchmark"
              dot={false}
            />
            
            {/* Actual rate line */}
            <Line 
              type="monotone" 
              dataKey="actualRate" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Actual Rate"
              dot={(props) => {
                const { cx, cy, payload } = props;
                const color = payload.status === 'within_tolerance' ? '#10b981' :
                             payload.status === 'warning' ? '#f59e0b' :
                             payload.status === 'critical' || payload.status === 'fuel_without_usage' ? '#ef4444' :
                             '#6b7280';
                return <circle cx={cx} cy={cy} r={4} fill={color} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Verifications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Verifications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumed (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verifications
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(v.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {v.fuelConsumed.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {v.approvedUsageHours > 0 
                        ? `${v.approvedUsageHours.toFixed(1)}h`
                        : `${v.approvedUsageKilometres}km`
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {v.actualRate.toFixed(2)} {benchmark?.unit || 'L/hr'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={v.varianceLitres > 0 ? 'text-red-600' : v.varianceLitres < 0 ? 'text-blue-600' : 'text-gray-900'}>
                        {v.varianceLitres > 0 ? '+' : ''}{v.varianceLitres.toFixed(1)}L
                        <span className="text-xs ml-1">({v.variancePercent.toFixed(1)}%)</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        v.resultStatus === 'within_tolerance' ? 'bg-green-100 text-green-800' :
                        v.resultStatus === 'warning' ? 'bg-amber-100 text-amber-800' :
                        v.resultStatus === 'critical' || v.resultStatus === 'fuel_without_usage' ? 'bg-red-100 text-red-800' :
                        v.resultStatus === 'missing' ? 'bg-gray-100 text-gray-800' :
                        v.resultStatus === 'unverified' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {v.resultStatus.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {verifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No verifications found for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}
