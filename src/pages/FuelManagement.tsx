import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, Cell } from 'recharts';
import { Fuel, AlertTriangle, CheckCircle2, Search, Filter, ChevronDown, Eye } from 'lucide-react';
import { fuelRecords, fuelTrendData } from '../data/mockData';
import { StatusBadge, formatNumber } from '../components/Badges';

const varianceData = fuelRecords.map(r => ({
  name: r.equipmentName.split(' ').slice(0, 2).join(' '),
  variance: r.variancePercent,
  status: r.status,
}));

export default function FuelManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  const filtered = fuelRecords.filter(r => {
    const matchSearch = r.equipmentName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalIssued = fuelRecords.reduce((s, r) => s + r.fuelIssued, 0);
  const totalConsumed = fuelRecords.reduce((s, r) => s + r.fuelConsumed, 0);
  const totalExpected = fuelRecords.reduce((s, r) => s + r.expectedConsumption, 0);
  const totalVariance = totalConsumed - totalExpected;
  const variancePercent = ((totalVariance / totalExpected) * 100);

  const selected = selectedRecord ? fuelRecords.find(r => r.id === selectedRecord) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fuel Management</h1>
          <p className="text-sm text-gray-500 mt-1">Daily calibrated fuel-consumption verification</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm">
          <Fuel size={16} /> Record Fuel Issue
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Issued Today</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatNumber(totalIssued)} L</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Total Consumed</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{formatNumber(totalConsumed)} L</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 font-medium">Expected Consumption</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">{formatNumber(totalExpected)} L</p>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${totalVariance > 0 ? 'border-red-200' : 'border-emerald-200'}`}>
          <p className="text-xs text-gray-500 font-medium">Unexplained Variance</p>
          <p className={`text-xl font-bold mt-1 ${totalVariance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {totalVariance > 0 ? '+' : ''}{formatNumber(totalVariance)} L ({variancePercent.toFixed(1)}%)
          </p>
          {totalVariance > totalExpected * 0.05 && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Exceeds 5% threshold
            </p>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">7-Day Fuel Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={fuelTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="issued" stroke="#f59e0b" strokeWidth={2} name="Issued" />
              <Line type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={2} name="Consumed" />
              <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Expected" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Variance by Equipment (%)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={varianceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                {varianceData.map((entry, index) => (
                  <Cell key={index} fill={entry.variance > 10 ? '#ef4444' : entry.variance > 5 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded" /> ≤5%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded" /> 5-10%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> &gt;10%</span>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-semibold text-gray-900">Today's Fuel Records</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
              <option value="pending_approval">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Equipment</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Issued (L)</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Consumed (L)</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Expected (L)</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Variance</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Source</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(record => (
                <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 font-medium text-gray-900">{record.equipmentName}</td>
                  <td className="py-2.5 px-4">{record.fuelIssued}</td>
                  <td className="py-2.5 px-4">{record.fuelConsumed}</td>
                  <td className="py-2.5 px-4 text-gray-500">{record.expectedConsumption}</td>
                  <td className="py-2.5 px-4">
                    <span className={`font-medium ${record.variancePercent > 10 ? 'text-red-600' : record.variancePercent > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      +{record.variance}L ({record.variancePercent}%)
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{record.dataSource}</span>
                  </td>
                  <td className="py-2.5 px-4"><StatusBadge status={record.status} /></td>
                  <td className="py-2.5 px-4">
                    <button
                      onClick={() => setSelectedRecord(record.id === selectedRecord ? null : record.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Eye size={14} className="text-gray-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Fuel Record Detail — {selected.equipmentName}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-gray-500">Date</p><p className="font-medium">{selected.date}</p></div>
            <div><p className="text-xs text-gray-500">Data Source</p><p className="font-medium capitalize">{selected.dataSource.replace('_', ' ')}</p></div>
            <div><p className="text-xs text-gray-500">Verified By</p><p className="font-medium">{selected.verifiedBy || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={selected.status} /></div>
          </div>
          {selected.variancePercent > 10 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Unexplained variance of {selected.variance} L ({selected.variancePercent}%)</p>
                <p className="text-xs text-red-600 mt-1">Recommended action: Verify fuel meter calibration and check for leaks. Record investigation in notes.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
