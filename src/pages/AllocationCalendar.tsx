import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Filter, Plus, ArrowRight } from 'lucide-react';
import { listAssets } from '../services/assets';
import { getAllocationHistory, getActiveAllocation, calculateUtilization } from '../services/assetAllocation';
import { Asset } from '../services/assetTypes';
import { AssetAllocation } from '../services/assetLifecycleTypes';

export default function AllocationCalendar() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<Map<string, AssetAllocation[]>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      const assetsData = await listAssets();
      setAssets(assetsData);

      // Load allocations for each asset
      const allocMap = new Map<string, AssetAllocation[]>();
      for (const asset of assetsData) {
        const history = await getAllocationHistory(asset.id);
        allocMap.set(asset.id, history);
      }
      setAllocations(allocMap);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    for (let d = firstDay; d <= lastDay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const days = getDaysInMonth(selectedMonth);

  const isAllocated = (assetId: string, date: Date): boolean => {
    const assetAllocations = allocations.get(assetId) || [];
    const dateStr = date.toISOString().split('T')[0];
    
    return assetAllocations.some(alloc => {
      const startDate = alloc.plannedStartDate.split('T')[0];
      const endDate = alloc.plannedEndDate ? alloc.plannedEndDate.split('T')[0] : alloc.plannedStartDate.split('T')[0];
      return dateStr >= startDate && dateStr <= endDate && alloc.status !== 'cancelled';
    });
  };

  const getAllocationStatus = (assetId: string, date: Date): string | null => {
    const assetAllocations = allocations.get(assetId) || [];
    const dateStr = date.toISOString().split('T')[0];
    
    const alloc = assetAllocations.find(a => {
      const startDate = a.plannedStartDate.split('T')[0];
      const endDate = a.plannedEndDate ? a.plannedEndDate.split('T')[0] : a.plannedStartDate.split('T')[0];
      return dateStr >= startDate && dateStr <= endDate && a.status !== 'cancelled';
    });

    return alloc?.status || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'planned': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading allocation calendar...</div>
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
              <Calendar className="w-7 h-7" />
              Allocation Calendar
            </h1>
            <p className="text-gray-600 mt-1">
              {assets.length} assets • {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Previous
            </button>
            <button
              onClick={() => setSelectedMonth(new Date())}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Today
            </button>
            <button
              onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Active</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Completed</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 min-w-[200px]">
                  Asset
                </th>
                {days.map(day => (
                  <th
                    key={day.toISOString()}
                    className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[40px]"
                  >
                    {day.getDate()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                    <Link to={`/assets/${asset.id}`} className="text-blue-600 hover:text-blue-900">
                      {asset.assetCode}
                    </Link>
                    <div className="text-xs text-gray-500">{asset.make} {asset.model}</div>
                  </td>
                  {days.map(day => {
                    const allocated = isAllocated(asset.id, day);
                    const status = getAllocationStatus(asset.id, day);
                    
                    return (
                      <td key={day.toISOString()} className="px-1 py-2 text-center">
                        {allocated && status && (
                          <div
                            className={`w-6 h-6 rounded ${getStatusColor(status)} mx-auto`}
                            title={`${asset.assetCode} - ${status}`}
                          ></div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No assets found
        </div>
      )}
    </div>
  );
}
