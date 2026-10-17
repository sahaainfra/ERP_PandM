/**
 * Part 06 — Asset Logbook History with Charts
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Clock, Fuel, FileText } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { listLogbooks, calculateAssetUtilization } from '../services/logbookService';
import { getAsset } from '../services/assets';
import { EquipmentLogbook } from '../services/logbookTypes';
import { Asset } from '../services/assetTypes';

export default function AssetLogbookHistory() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [logbooks, setLogbooks] = useState<EquipmentLogbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    loadData();
  }, [id, dateRange]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const assetData = await getAsset(id);
      setAsset(assetData);

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const logs = await listLogbooks({ 
        assetId: id,
        date: startDate.toISOString().split('T')[0]
      });
      
      setLogbooks(logs);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = logbooks.map(log => ({
    date: new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    operatingHours: log.calculatedOperatingHours || 0,
    kilometres: log.calculatedKilometres || 0,
    productiveHours: log.productiveHours || 0,
    idleHours: log.idleHours || 0,
    standbyHours: log.standbyHours || 0,
    breakdownHours: log.breakdownHours || 0,
    fuelConsumed: log.fuelAtStart && log.fuelAtClose 
      ? (log.fuelAtStart + (log.fuelReceived || 0)) - log.fuelAtClose 
      : 0,
  }));

  // Calculate totals
  const totals = logbooks.reduce((acc, log) => ({
    operatingHours: acc.operatingHours + (log.calculatedOperatingHours || 0),
    kilometres: acc.kilometres + (log.calculatedKilometres || 0),
    productiveHours: acc.productiveHours + (log.productiveHours || 0),
    idleHours: acc.idleHours + (log.idleHours || 0),
    standbyHours: acc.standbyHours + (log.standbyHours || 0),
    breakdownHours: acc.breakdownHours + (log.breakdownHours || 0),
    fuelConsumed: acc.fuelConsumed + (
      log.fuelAtStart && log.fuelAtClose 
        ? (log.fuelAtStart + (log.fuelReceived || 0)) - log.fuelAtClose 
        : 0
    ),
  }), {
    operatingHours: 0,
    kilometres: 0,
    productiveHours: 0,
    idleHours: 0,
    standbyHours: 0,
    breakdownHours: 0,
    fuelConsumed: 0,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading logbook history...</div>
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
              <FileText className="w-7 h-7" />
              Logbook History
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Hours</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.operatingHours.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-gray-600">Total km</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.kilometres.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Fuel className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-gray-600">Fuel Consumed</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totals.fuelConsumed.toFixed(1)}L</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <p className="text-sm text-gray-600">Logbooks</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{logbooks.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Operating Hours Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="productiveHours" fill="#10b981" name="Productive" />
              <Bar dataKey="idleHours" fill="#f59e0b" name="Idle" />
              <Bar dataKey="standbyHours" fill="#6366f1" name="Standby" />
              <Bar dataKey="breakdownHours" fill="#ef4444" name="Breakdown" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kilometres Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Kilometres</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="kilometres" stroke="#3b82f6" strokeWidth={2} name="Kilometres" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Fuel Consumption Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Consumption</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="fuelConsumed" fill="#f59e0b" name="Fuel Consumed (L)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Logbooks Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Logbook Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">km</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel (L)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logbooks.map((logbook) => {
                const fuelConsumed = logbook.fuelAtStart && logbook.fuelAtClose 
                  ? (logbook.fuelAtStart + (logbook.fuelReceived || 0)) - logbook.fuelAtClose 
                  : 0;

                return (
                  <tr key={logbook.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(logbook.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {logbook.shift}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {logbook.operatorId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {logbook.calculatedOperatingHours?.toFixed(1) || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {logbook.calculatedKilometres?.toLocaleString() || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {fuelConsumed > 0 ? fuelConsumed.toFixed(1) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        logbook.status === 'approved' ? 'bg-green-100 text-green-800' :
                        logbook.status === 'submitted' ? 'bg-amber-100 text-amber-800' :
                        logbook.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {logbook.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link to={`/logbooks/${logbook.id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
