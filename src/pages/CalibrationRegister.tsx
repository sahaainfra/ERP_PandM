/**
 * Part 10 — Calibration Register
 * 
 * Manage instrument calibrations with due dates and status tracking
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react';
import { listCalibrationRecords, getCalibrationStatistics } from '../services/calibrationService';
import { listMeasuringInstruments } from '../services/fuelMasters';
import { CalibrationRecord } from '../services/fuelVerificationTypes';
import { MeasuringInstrument } from '../services/fuelTypes';

interface CalibrationWithInstrument extends CalibrationRecord {
  instrument?: MeasuringInstrument;
}

export default function CalibrationRegister() {
  const [calibrations, setCalibrations] = useState<CalibrationWithInstrument[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'due_soon' | 'overdue' | 'check_failed' | 'out_of_service'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load calibrations
      const cals = await listCalibrationRecords();
      
      // Load instruments
      const instruments = await listMeasuringInstruments();
      
      // Combine data
      const calsWithInstruments: CalibrationWithInstrument[] = cals.map(c => {
        const instrument = instruments.find(i => i.id === c.instrumentId);
        return { ...c, instrument };
      });

      // Filter by status
      const filtered = filter === 'all' 
        ? calsWithInstruments 
        : calsWithInstruments.filter(c => c.status === filter);

      setCalibrations(filtered);

      // Load statistics
      const stats = await getCalibrationStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'due_soon':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'check_failed':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'out_of_service':
        return <Wrench className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'due_soon':
        return 'bg-amber-100 text-amber-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'check_failed':
        return 'bg-orange-100 text-orange-800';
      case 'out_of_service':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading calibration register...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calibration Register</h1>
        <p className="text-gray-600 mt-1">Manage instrument calibrations and track due dates</p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Instruments</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalInstruments}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
            <p className="text-sm text-green-700">Valid</p>
            <p className="text-2xl font-bold text-green-900">{statistics.valid}</p>
          </div>
          <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
            <p className="text-sm text-amber-700">Due Soon</p>
            <p className="text-2xl font-bold text-amber-900">{statistics.dueSoon}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <p className="text-sm text-red-700">Overdue</p>
            <p className="text-2xl font-bold text-red-900">{statistics.overdue}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Compliance %</p>
            <p className="text-2xl font-bold text-gray-900">{statistics.compliancePercent.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({calibrations.length})
          </button>
          <button
            onClick={() => setFilter('valid')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'valid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Valid
          </button>
          <button
            onClick={() => setFilter('due_soon')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'due_soon' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Due Soon
          </button>
          <button
            onClick={() => setFilter('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'overdue' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Overdue
          </button>
          <button
            onClick={() => setFilter('check_failed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'check_failed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Check Failed
          </button>
        </div>
      </div>

      {/* Calibrations Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instrument</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Calibration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Due</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calibrations.map((cal) => (
                <tr key={cal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cal.instrument?.serialNumber || cal.instrumentId}
                    </div>
                    {cal.instrument?.storagePointId && (
                      <div className="text-xs text-gray-500">
                        Storage: {cal.instrument.storagePointId}
                      </div>
                    )}
                    {cal.instrument?.assetId && (
                      <div className="text-xs text-gray-500">
                        Asset: {cal.instrument.assetId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cal.instrument?.type.replace(/_/g, ' ') || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cal.calibrationDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(cal.nextDueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cal.certificateNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {cal.performingAgency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      cal.result === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {cal.result}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(cal.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(cal.status)}`}>
                        {cal.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {calibrations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No calibrations found</p>
          </div>
        )}
      </div>
    </div>
  );
}
