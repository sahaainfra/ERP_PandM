/**
 * Part 10 — Daily Fuel Verification Sheet
 * 
 * Desktop/tablet interface for reviewing and signing off daily fuel verifications
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Clock, FileText, TrendingUp } from 'lucide-react';
import { listVerifications, getVerificationStatistics } from '../services/verificationEngine';
import { getDailySignOff, signOffDailyVerification, checkOverdueSignOffs } from '../services/verificationJob';
import { getAsset } from '../services/assets';
import { getBenchmark } from '../services/benchmarkService';
import { DailyFuelVerification } from '../services/fuelVerificationTypes';
import { Asset } from '../services/assetTypes';
import { FuelBenchmark } from '../services/fuelVerificationTypes';

interface VerificationWithDetails extends DailyFuelVerification {
  asset?: Asset | null;
  benchmark?: FuelBenchmark | null;
}

export default function DailyVerificationSheet() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSite, setSelectedSite] = useState('');
  const [verifications, setVerifications] = useState<VerificationWithDetails[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [signOff, setSignOff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'within_tolerance' | 'warning' | 'critical' | 'missing' | 'unverified'>('all');

  useEffect(() => {
    loadData();
    checkOverdueSignOffs();
  }, [selectedDate, selectedSite]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load verifications
      const verifs = await listVerifications({ fromDate: selectedDate, toDate: selectedDate });
      
      // Load asset and benchmark details
      const verifsDetails: VerificationWithDetails[] = await Promise.all(
        verifs.map(async (v) => {
          const asset = await getAsset(v.assetId);
          const benchmark = v.benchmarkId ? await getBenchmark(v.benchmarkId) : undefined;
          return { ...v, asset: asset || undefined, benchmark };
        })
      );

      setVerifications(verifsDetails);

      // Load statistics
      const stats = await getVerificationStatistics({ fromDate: selectedDate, toDate: selectedDate });
      setStatistics(stats);

      // Load sign-off
      const signOffData = await getDailySignOff(selectedDate, selectedSite || undefined, undefined);
      setSignOff(signOffData);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOff = async () => {
    if (!confirm('Are you sure you want to sign off this daily verification sheet?')) {
      return;
    }

    try {
      // In a real app, get current user from auth context
      const userId = 'fleet_supervisor_1';
      const updated = await signOffDailyVerification(selectedDate, selectedSite || undefined, undefined, userId);
      setSignOff(updated);
      alert('Daily verification signed off successfully');
    } catch (error) {
      alert('Failed to sign off: ' + (error as Error).message);
    }
  };

  const filteredVerifications = verifications.filter(v => {
    if (filter === 'all') return true;
    return v.resultStatus === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'within_tolerance':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'critical':
      case 'fuel_without_usage':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'missing':
        return <Clock className="w-5 h-5 text-gray-600" />;
      case 'unverified':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'not_evaluable':
        return <FileText className="w-5 h-5 text-blue-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'within_tolerance':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      case 'critical':
      case 'fuel_without_usage':
        return 'bg-red-50 border-red-200';
      case 'missing':
        return 'bg-gray-50 border-gray-200';
      case 'unverified':
        return 'bg-orange-50 border-orange-200';
      case 'not_evaluable':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'within_tolerance':
        return 'Within Tolerance';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      case 'fuel_without_usage':
        return 'Fuel Without Usage';
      case 'missing':
        return 'Missing';
      case 'unverified':
        return 'Unverified';
      case 'not_evaluable':
        return 'Not Evaluable';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading verification sheet...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7" />
          Daily Fuel Verification Sheet
        </h1>
        <p className="text-gray-600 mt-1">{selectedDate}</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
            <input
              type="text"
              value={selectedSite}
              onChange={(e) => setSelectedSite(e.target.value)}
              placeholder="All sites"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All ({verifications.length})</option>
              <option value="within_tolerance">Within Tolerance ({statistics?.withinTolerance || 0})</option>
              <option value="warning">Warning ({statistics?.warning || 0})</option>
              <option value="critical">Critical ({statistics?.critical || 0})</option>
              <option value="missing">Missing ({statistics?.missing || 0})</option>
              <option value="unverified">Unverified ({statistics?.unverified || 0})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalVerifications}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-sm text-green-700">Within Tolerance</p>
            <p className="text-2xl font-bold text-green-900">{statistics.withinTolerance}</p>
          </div>
          <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
            <p className="text-sm text-amber-700">Warning</p>
            <p className="text-2xl font-bold text-amber-900">{statistics.warning}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <p className="text-sm text-red-700">Critical</p>
            <p className="text-2xl font-bold text-red-900">{statistics.critical}</p>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Missing</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.missing}</p>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 border border-orange-200">
            <p className="text-sm text-orange-700">Unverified</p>
            <p className="text-2xl font-bold text-orange-900">{statistics.unverified}</p>
          </div>
        </div>
      )}

      {/* Verification Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumed (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Rate</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Benchmark</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVerifications.map((v) => (
                <tr key={v.id} className={`hover:bg-gray-50 border-l-4 ${getStatusColor(v.resultStatus)}`}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(v.resultStatus)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {v.asset?.assetCode || v.assetId}
                        </div>
                        <div className="text-xs text-gray-500">
                          {v.asset?.make} {v.asset?.model}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {v.consumptionMethod.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {v.fuelConsumed.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {v.approvedUsageHours > 0 
                      ? `${v.approvedUsageHours.toFixed(1)}h`
                      : `${v.approvedUsageKilometres}km`
                    }
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {v.actualRate.toFixed(2)} {v.benchmark?.unit || 'L/hr'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {v.benchmark ? `${v.benchmark.baseValue} ${v.benchmark.unit}` : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <div className={v.varianceLitres > 0 ? 'text-red-600' : v.varianceLitres < 0 ? 'text-blue-600' : 'text-gray-900'}>
                      {v.varianceLitres > 0 ? '+' : ''}{v.varianceLitres.toFixed(1)}L
                      <div className="text-xs">({v.variancePercent.toFixed(1)}%)</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      v.resultStatus === 'within_tolerance' ? 'bg-green-100 text-green-800' :
                      v.resultStatus === 'warning' ? 'bg-amber-100 text-amber-800' :
                      v.resultStatus === 'critical' || v.resultStatus === 'fuel_without_usage' ? 'bg-red-100 text-red-800' :
                      v.resultStatus === 'missing' ? 'bg-gray-100 text-gray-800' :
                      v.resultStatus === 'unverified' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {getStatusLabel(v.resultStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {(v.resultStatus === 'warning' || v.resultStatus === 'critical' || v.resultStatus === 'fuel_without_usage') && (
                      <button className="text-blue-600 hover:text-blue-900">
                        Investigate
                      </button>
                    )}
                    {v.resultStatus === 'missing' && (
                      <button className="text-blue-600 hover:text-blue-900">
                        Follow Up
                      </button>
                    )}
                    {v.resultStatus === 'within_tolerance' && (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVerifications.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No verifications found for the selected criteria</p>
          </div>
        )}
      </div>

      {/* Sign-Off Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Sign-Off</h2>
        
        {signOff ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total Asset-Days</p>
                <p className="text-lg font-semibold text-gray-900">{signOff.totalAssetDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-lg font-semibold text-green-700">{signOff.verifiedCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Warnings</p>
                <p className="text-lg font-semibold text-amber-700">{signOff.warningCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Critical</p>
                <p className="text-lg font-semibold text-red-700">{signOff.criticalCount}</p>
              </div>
            </div>

            {signOff.status === 'signed_off' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Signed Off</p>
                    <p className="text-sm text-green-700">
                      By {signOff.signedOffBy} at {new Date(signOff.signedOffAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : signOff.status === 'overdue' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Overdue</p>
                    <p className="text-sm text-red-700">
                      Sign-off deadline was {new Date(signOff.signOffDeadline).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {signOff.status === 'pending' && (
              <button
                onClick={handleSignOff}
                disabled={signOff.criticalCount > 0 && !confirm('There are critical variances. Are you sure you want to sign off?')}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
              >
                Sign Off Daily Verification
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sign-off record found for this date
          </div>
        )}
      </div>
    </div>
  );
}
