/**
 * Part 13 — Plant List Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listPlants, getPlantStatistics } from '../services/rmcPlantService';
import { RMCPlant, PlantOperatingStatus } from '../services/rmcPlantTypes';
import { Factory, MapPin, Users, TrendingUp, AlertTriangle } from 'lucide-react';

export default function PlantList() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState<(RMCPlant & { stats?: any })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    setLoading(true);
    try {
      const plantList = await listPlants();
      
      // Load statistics for each plant
      const plantsWithStats = await Promise.all(
        plantList.map(async (plant) => {
          const stats = await getPlantStatistics(plant.id);
          return { ...plant, stats };
        })
      );
      
      setPlants(plantsWithStats);
    } catch (error) {
      console.error('Failed to load plants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: PlantOperatingStatus) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'idle':
        return 'bg-gray-100 text-gray-800';
      case 'decommissioned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'stationary':
        return 'Stationary';
      case 'mobile':
        return 'Mobile';
      case 'project_site_captive':
        return 'Project Captive';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading plants...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RMC Plants</h1>
            <p className="text-gray-600 mt-1">Manage batching plants and monitor production</p>
          </div>
          <button
            onClick={() => navigate('/rmc/plants/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Factory className="w-4 h-4" />
            Add Plant
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-gray-600">Total Plants</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{plants.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">Operational</p>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {plants.filter(p => p.operatingStatus === 'operational').length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-lg shadow p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <p className="text-sm text-orange-700">Maintenance</p>
          </div>
          <p className="text-2xl font-bold text-orange-900">
            {plants.filter(p => p.operatingStatus === 'maintenance').length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-sm text-blue-700">Total Staff</p>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {plants.reduce((sum, p) => sum + (p.staffCount || 0), 0)}
          </p>
        </div>
      </div>

      {/* Plants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plants.map((plant) => (
          <div
            key={plant.id}
            onClick={() => navigate(`/rmc/plants/${plant.id}`)}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{plant.name}</h3>
                  <p className="text-sm text-gray-500">{plant.plantCode}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(plant.operatingStatus)}`}>
                  {plant.operatingStatus}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              {/* Location */}
              {plant.city && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{plant.city}, {plant.state}</span>
                </div>
              )}

              {/* Type and Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium text-gray-900">{getTypeLabel(plant.type)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Capacity</p>
                  <p className="text-sm font-medium text-gray-900">{plant.ratedCapacity} m³/hr</p>
                </div>
              </div>

              {/* Equipment Stats */}
              {plant.stats && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Equipment Status</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700">{plant.stats.operationalEquipment} Operational</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-700">{plant.stats.maintenanceEquipment} Maintenance</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-700">{plant.stats.idleEquipment} Idle</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700">{plant.stats.outOfServiceEquipment} Out of Service</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff */}
              {plant.plantManagerName && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Plant Manager</p>
                  <p className="text-sm font-medium text-gray-900">{plant.plantManagerName}</p>
                  {plant.staffCount && (
                    <p className="text-xs text-gray-600 mt-1">{plant.staffCount} staff members</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Mixer: {plant.mixerSize} m³</span>
                <span>Practical: {plant.practicalCapacity} m³/hr</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plants.length === 0 && (
        <div className="text-center py-12">
          <Factory className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No plants found</p>
          <button
            onClick={() => navigate('/rmc/plants/new')}
            className="mt-4 text-blue-600 hover:text-blue-900"
          >
            Add your first plant
          </button>
        </div>
      )}
    </div>
  );
}
