/**
 * Part 10 — Benchmark Register
 * 
 * Manage fuel consumption benchmarks with versioning and approval workflow
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { listBenchmarks, approveBenchmark } from '../services/benchmarkService';
import { FuelBenchmark } from '../services/fuelVerificationTypes';

export default function BenchmarkRegister() {
  const [benchmarks, setBenchmarks] = useState<FuelBenchmark[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'approved' | 'superseded'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBenchmarks();
  }, [filter]);

  const loadBenchmarks = async () => {
    setLoading(true);
    try {
      const data = await listBenchmarks(filter !== 'all' ? { status: filter } : undefined);
      setBenchmarks(data);
    } catch (error) {
      console.error('Failed to load benchmarks', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this benchmark?')) {
      return;
    }

    try {
      // In a real app, get current user from auth context
      const userId = 'maintenance_manager_1';
      await approveBenchmark(id, userId);
      alert('Benchmark approved successfully');
      loadBenchmarks();
    } catch (error) {
      alert('Failed to approve: ' + (error as Error).message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'draft':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'superseded':
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-amber-100 text-amber-800';
      case 'superseded':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading benchmarks...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fuel Consumption Benchmarks</h1>
            <p className="text-gray-600 mt-1">Manage fuel consumption benchmarks with versioning and approval</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            New Benchmark
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({benchmarks.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'approved' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'draft' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setFilter('superseded')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'superseded' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Superseded
          </button>
        </div>
      </div>

      {/* Benchmarks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tolerances</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {benchmarks.map((benchmark) => (
                <tr key={benchmark.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {benchmark.assetId ? `Asset: ${benchmark.assetId}` :
                       benchmark.make && benchmark.model ? `${benchmark.make} ${benchmark.model}` :
                       benchmark.assetCategory || '—'}
                    </div>
                    {benchmark.isComposite && (
                      <div className="text-xs text-gray-500">Composite benchmark</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {benchmark.baseValue} {benchmark.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>Warning: ±{benchmark.warningToleranceUpper}%</div>
                    <div>Critical: ±{benchmark.criticalToleranceUpper}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {benchmark.source.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    v{benchmark.version}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>From: {new Date(benchmark.effectiveFrom).toLocaleDateString()}</div>
                    {benchmark.effectiveTo && (
                      <div>To: {new Date(benchmark.effectiveTo).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(benchmark.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(benchmark.status)}`}>
                        {benchmark.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {benchmark.status === 'draft' && (
                        <button
                          onClick={() => handleApprove(benchmark.id)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {benchmarks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No benchmarks found</p>
          </div>
        )}
      </div>
    </div>
  );
}
