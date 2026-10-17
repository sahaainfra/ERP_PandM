/**
 * Part 12 — Telematics Dashboard
 */

import React, { useState, useEffect } from 'react';
import { listDevices, listPositions, listEngineData, listFaultCodes, getTelematicsStatistics } from '../services/telematicsAdapter';
import { TelematicsDevice, TelematicsPosition, TelematicsEngineData, TelematicsFaultCode } from '../services/integrationTypes';
import { format } from 'date-fns';
import { MapPin, Activity, AlertTriangle, Clock } from 'lucide-react';

export default function TelematicsDashboard() {
  const [devices, setDevices] = useState<TelematicsDevice[]>([]);
  const [positions, setPositions] = useState<TelematicsPosition[]>([]);
  const [engineData, setEngineData] = useState<TelematicsEngineData[]>([]);
  const [faultCodes, setFaultCodes] = useState<TelematicsFaultCode[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deviceList, positionList, engineList, faultList, stats] = await Promise.all([
        listDevices(),
        listPositions(),
        listEngineData(),
        listFaultCodes(),
        getTelematicsStatistics(),
      ]);
      setDevices(deviceList);
      setPositions(positionList);
      setEngineData(engineList);
      setFaultCodes(faultList);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load telematics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading telematics data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Telematics Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor GPS positions, engine data, and fault codes</p>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <p className="text-sm text-gray-600">Total Positions</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalPositions.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">~{statistics.averageDailyPositions}/day</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600" />
              <p className="text-sm text-gray-600">Engine Data Points</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statistics.totalEngineDataPoints.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-gray-600">Active Faults</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{statistics.activeFaults}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <p className="text-sm text-gray-600">Active Devices</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{devices.filter(d => d.status === 'active').length}</p>
          </div>
        </div>
      )}

      {/* Active Fault Codes */}
      {faultCodes.filter(f => f.status === 'active').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Active Fault Codes ({faultCodes.filter(f => f.status === 'active').length})
          </h2>
          <div className="space-y-2">
            {faultCodes.filter(f => f.status === 'active').slice(0, 5).map((fault) => (
              <div key={fault.id} className="bg-white rounded p-3 border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{fault.faultCode}</p>
                    <p className="text-sm text-gray-600">{fault.faultDescription}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Asset: {fault.assetId} • Detected: {format(new Date(fault.detectedAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(fault.severity)}`}>
                    {fault.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Positions */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent GPS Positions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ignition</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {positions.slice(0, 10).map((position) => (
                <tr key={position.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.assetId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.speed ? `${position.speed} km/h` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      position.ignition ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {position.ignition ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(position.recordedAt), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {position.dataSource}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {positions.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No GPS positions available</p>
          </div>
        )}
      </div>

      {/* Recent Engine Data */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Engine Data</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engine Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odometer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fuel Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recorded At</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {engineData.slice(0, 10).map((data) => (
                <tr key={data.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.assetId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.engineHours.toFixed(1)} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.odometer ? `${data.odometer.toLocaleString()} km` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {data.fuelLevel !== undefined ? `${data.fuelLevel}%` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(data.recordedAt), 'dd MMM yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {data.dataSource}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {engineData.length === 0 && (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No engine data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
