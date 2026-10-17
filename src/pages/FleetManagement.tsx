import { useState } from 'react';
import { Truck, Search, Filter, Plus, ChevronDown, Eye, Edit2, Wrench } from 'lucide-react';
import { equipment, operatorLogs } from '../data/mockData';
import { EquipmentStatusBadge, StatusBadge, formatNumber } from '../components/Badges';

export default function FleetManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  const filtered = equipment.filter(eq => {
    const matchSearch = eq.name.toLowerCase().includes(search.toLowerCase()) ||
      eq.code.toLowerCase().includes(search.toLowerCase()) ||
      eq.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || eq.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selected = selectedEquipment ? equipment.find(e => e.id === selectedEquipment) : null;
  const selectedLogs = selectedEquipment ? operatorLogs.filter(l => l.equipmentId === selectedEquipment) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Fleet & Equipment Management</h1>
          <p className="text-sm text-gray-500 mt-1">{equipment.length} assets registered • {equipment.filter(e => e.status === 'operational').length} operational</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm">
          <Plus size={16} /> Register Equipment
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search equipment name, code, or project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 appearance-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="idle">Idle</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(eq => (
          <div
            key={eq.id}
            className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${
              selectedEquipment === eq.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-gray-200'
            }`}
            onClick={() => setSelectedEquipment(eq.id === selectedEquipment ? null : eq.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Truck size={20} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{eq.name}</h3>
                  <p className="text-xs text-gray-500">{eq.code} • {eq.registrationNo}</p>
                </div>
              </div>
              <EquipmentStatusBadge status={eq.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Project</p>
                <p className="font-medium text-gray-900 truncate">{eq.project}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Operator</p>
                <p className="font-medium text-gray-900 truncate">{eq.operator || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Running Hours</p>
                <p className="font-medium text-gray-900">{formatNumber(eq.runningHours)} hrs</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-500">Fuel Level</p>
                <div className="flex items-center gap-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${eq.currentFuel / eq.fuelCapacity > 0.3 ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${(eq.currentFuel / eq.fuelCapacity) * 100}%` }}
                    />
                  </div>
                  <span className="font-medium text-gray-900">{formatNumber(eq.currentFuel)}L</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Equipment Detail — {selected.name}</h3>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                <Edit2 size={12} /> Edit
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50">
                <Wrench size={12} /> Schedule Maintenance
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div><p className="text-xs text-gray-500">Type</p><p className="text-sm font-medium capitalize">{selected.type.replace('_', ' ')}</p></div>
            <div><p className="text-xs text-gray-500">Registration</p><p className="text-sm font-medium">{selected.registrationNo}</p></div>
            <div><p className="text-xs text-gray-500">Fuel Capacity</p><p className="text-sm font-medium">{selected.fuelCapacity} L</p></div>
            <div><p className="text-xs text-gray-500">Next Maintenance</p><p className="text-sm font-medium">{selected.nextMaintenance}</p></div>
          </div>

          {selectedLogs.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Operator Logs</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Date</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Operator</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Hours</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Fuel (L)</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLogs.map(log => (
                      <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3">{log.date}</td>
                        <td className="py-2 px-3">{log.operatorName}</td>
                        <td className="py-2 px-3">{log.runningHours}</td>
                        <td className="py-2 px-3">{log.fuelConsumed} / {log.fuelIssued}</td>
                        <td className="py-2 px-3"><StatusBadge status={log.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
