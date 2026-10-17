/**
 * Part 13 — Plant Control Board
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPlant, listPlantEquipment, getPlantStatistics } from '../services/rmcPlantService';
import { listBatches, getBatchStatistics } from '../services/batchService';
import { getOrderQueue, getProductionOrderStatistics } from '../services/productionOrderService';
import { getActiveStoppages, getDowntimeStatistics } from '../services/stoppageService';
import { calculatePlantKPIs } from '../services/plantKPIService';
import { RMCPlant, PlantEquipment } from '../services/rmcPlantTypes';
import { format } from 'date-fns';
import { Factory, Package, Clock, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';

export default function PlantControlBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plant, setPlant] = useState<RMCPlant | null>(null);
  const [equipment, setEquipment] = useState<PlantEquipment[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [todayBatches, setTodayBatches] = useState<any[]>([]);
  const [batchStats, setBatchStats] = useState<any>(null);
  const [orderQueue, setOrderQueue] = useState<any[]>([]);
  const [activeStoppages, setActiveStoppages] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [plantData, equipmentList, plantStats, batches, bStats, queue, stoppages] = await Promise.all([
        getPlant(id!),
        listPlantEquipment(id!),
        getPlantStatistics(id!),
        listBatches({ plantId: id, fromDate: today, toDate: today }),
        getBatchStatistics(id!, today, today),
        getOrderQueue(id!, today),
        getActiveStoppages(id!),
      ]);

      setPlant(plantData);
      setEquipment(equipmentList);
      setStats(plantStats);
      setTodayBatches(batches);
      setBatchStats(bStats);
      setOrderQueue(queue);
      setActiveStoppages(stoppages);

      // Calculate KPIs for today
      const todayKPIs = await calculatePlantKPIs(id!, today, today);
      setKpis(todayKPIs);
    } catch (error) {
      console.error('Failed to load plant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDataSourceLabel = (dataSource: string) => {
    switch (dataSource) {
      case 'integrated_live':
        return { label: 'LIVE', color: 'bg-green-500' };
      case 'integrated_delayed':
        return { label: 'DELAYED', color: 'bg-yellow-500' };
      case 'imported':
        return { label: 'IMPORTED', color: 'bg-blue-500' };
      case 'manual':
        return { label: 'MANUAL', color: 'bg-gray-500' };
      default:
        return { label: dataSource.toUpperCase(), color: 'bg-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading plant control board...</div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Plant not found</p>
          <button
            onClick={() => navigate('/rmc/plants')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            ← Back to Plants
          </button>
        </div>
      </div>
    );
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const productionProgress = plant.dailyTarget 
    ? (batchStats?.totalVolume || 0) / plant.dailyTarget * 100 
    : 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/rmc/plants')}
          className="text-blue-600 hover:text-blue-900 mb-2"
        >
          ← Back to Plants
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{plant.name}</h1>
            <p className="text-gray-600 mt-1">{plant.plantCode} • {plant.city}, {plant.state}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-sm font-medium rounded ${
              plant.operatingStatus === 'operational' ? 'bg-green-100 text-green-800' :
              plant.operatingStatus === 'maintenance' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {plant.operatingStatus}
            </span>
            <button
              onClick={() => navigate(`/rmc/plants/${id}/batches/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Package className="w-4 h-4" />
              New Batch
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Today's Production</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.actualProduction} m³</p>
            <p className="text-xs text-gray-500 mt-1">Target: {plant.dailyTarget} m³</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Batches</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.totalBatches}</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.batchesPerHour}/hr</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Utilization</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.plantUtilization}%</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.operatingHours}h / {kpis.availableHours}h</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Efficiency</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.productionEfficiency}%</p>
            <p className="text-xs text-gray-500 mt-1">
              {kpis.productionEfficiency >= 100 ? (
                <span className="text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> On target
                </span>
              ) : (
                <span className="text-orange-600 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Below target
                </span>
              )}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Avg Cycle Time</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.averageBatchCycleTime} min</p>
            <p className="text-xs text-gray-500 mt-1">Per batch</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-gray-600 mb-1">Rejected</p>
            <p className="text-2xl font-bold text-gray-900">{kpis.rejectedBatches}</p>
            <p className="text-xs text-gray-500 mt-1">{kpis.rejectedBatchesPercent}% of total</p>
          </div>
        </div>
      )}

      {/* Production Progress */}
      {plant.dailyTarget && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">Daily Production Progress</h3>
            <span className="text-sm text-gray-600">
              {batchStats?.totalVolume || 0} / {plant.dailyTarget} m³
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full ${
                productionProgress >= 100 ? 'bg-green-500' :
                productionProgress >= 75 ? 'bg-blue-500' :
                productionProgress >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${Math.min(productionProgress, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{productionProgress.toFixed(1)}% complete</p>
        </div>
      )}

      {/* Active Stoppages Alert */}
      {activeStoppages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Active Stoppages ({activeStoppages.length})</h3>
              <div className="mt-2 space-y-2">
                {activeStoppages.map((stoppage) => (
                  <div key={stoppage.id} className="text-sm text-red-800">
                    <span className="font-medium">{stoppage.reason.replace('_', ' ')}</span>
                    {stoppage.reasonDetails && <span> - {stoppage.reasonDetails}</span>}
                    <span className="text-xs text-red-600 ml-2">
                      Started: {format(new Date(stoppage.startTime), 'HH:mm')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Equipment Status
          </h2>
          <div className="space-y-3">
            {equipment.map((eq) => (
              <div key={eq.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{eq.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{eq.equipmentType.replace('_', ' ')}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getEquipmentStatusColor(eq.status)}`}>
                  {eq.status}
                </span>
              </div>
            ))}
            {equipment.length === 0 && (
              <p className="text-center text-gray-500 py-8">No equipment registered</p>
            )}
          </div>
        </div>

        {/* Production Order Queue */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Production Queue ({orderQueue.length})
          </h2>
          <div className="space-y-3">
            {orderQueue.slice(0, 5).map((order) => (
              <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    order.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    order.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {order.grade} • {order.orderedQuantity} m³
                </p>
                {order.scheduledStartTime && (
                  <p className="text-xs text-gray-500 mt-1">
                    Scheduled: {order.scheduledStartTime}
                  </p>
                )}
              </div>
            ))}
            {orderQueue.length === 0 && (
              <p className="text-center text-gray-500 py-8">No orders in queue</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Batches ({todayBatches.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch #</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {todayBatches.slice(0, 10).map((batch) => {
                const sourceLabel = getDataSourceLabel(batch.dataSource);
                return (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{batch.batchNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{batch.grade}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{batch.actualVolume} m³</td>
                    <td className="px-4 py-2 text-sm text-gray-500">
                      {format(new Date(batch.batchStartTime), 'HH:mm')}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 text-xs font-medium text-white rounded ${sourceLabel.color}`}>
                        {sourceLabel.label}
                      </span>
                      {batch.dataSource === 'manual' && !batch.manualEntryApproved && (
                        <span className="ml-1 text-xs text-orange-600">⚠ Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        batch.qualityStatus === 'approved' ? 'bg-green-100 text-green-800' :
                        batch.qualityStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {batch.qualityStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {todayBatches.length === 0 && (
          <p className="text-center text-gray-500 py-8">No batches today</p>
        )}
      </div>
    </div>
  );
}
