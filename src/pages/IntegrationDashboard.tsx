/**
 * Part 12 — Integration Dashboard
 */

import React, { useState, useEffect } from 'react';
import { listConnectors, checkAllConnectorsHealth, getIntegrationMetrics } from '../services/integrationFramework';
import { IntegrationConnector } from '../services/integrationTypes';
import { format } from 'date-fns';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function IntegrationDashboard() {
  const [connectors, setConnectors] = useState<IntegrationConnector[]>([]);
  const [healthStatus, setHealthStatus] = useState<{ healthy: number; degraded: number; unhealthy: number }>({ healthy: 0, degraded: 0, unhealthy: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [connectorList, health] = await Promise.all([
        listConnectors(),
        checkAllConnectorsHealth(),
      ]);
      setConnectors(connectorList);
      setHealthStatus(health);
    } catch (error) {
      console.error('Failed to load integration data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'configured_untested':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'unavailable':
        return <WifiOff className="w-5 h-5 text-gray-600" />;
      case 'failed':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'configured_untested':
        return 'bg-amber-100 text-amber-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSystemIcon = (system: string) => {
    switch (system) {
      case 'telematics':
        return '📡';
      case 'batching_plant':
        return '🏭';
      case 'weighbridge':
        return '⚖️';
      case 'email':
        return '📧';
      case 'sms':
        return '💬';
      case 'file_storage':
        return '💾';
      default:
        return '🔌';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading integration dashboard...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integration Dashboard</h1>
        <p className="text-gray-600 mt-1">Monitor external system integrations and data flow</p>
      </div>

      {/* Health Overview */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-700">Healthy</p>
          </div>
          <p className="text-2xl font-bold text-green-900">{healthStatus.healthy}</p>
        </div>
        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-700">Degraded</p>
          </div>
          <p className="text-2xl font-bold text-amber-900">{healthStatus.degraded}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-700">Unhealthy</p>
          </div>
          <p className="text-2xl font-bold text-red-900">{healthStatus.unhealthy}</p>
        </div>
      </div>

      {/* Connectors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Integration Connectors</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Latency SLA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {connectors.map((connector) => (
                <tr key={connector.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getSystemIcon(connector.system)}</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {connector.system.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {connector.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      connector.environment === 'production' ? 'bg-green-100 text-green-800' :
                      connector.environment === 'staging' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {connector.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(connector.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(connector.status)}`}>
                        {connector.status.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {connector.lastSuccessfulSync ? (
                      format(new Date(connector.lastSuccessfulSync), 'dd MMM yyyy HH:mm')
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {connector.dataLatencySLAMinutes} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">
                      Configure
                    </button>
                    <button className="text-green-600 hover:text-green-900">
                      Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {connectors.length === 0 && (
          <div className="text-center py-12">
            <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No integration connectors configured</p>
          </div>
        )}
      </div>

      {/* Note about unavailable integrations */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Integration Status</h3>
            <p className="text-sm text-blue-800 mt-1">
              All connectors are currently marked as <strong>unavailable</strong> because real credentials and devices are not configured. 
              Adapter interfaces and contract tests are in place. Manual entry fallbacks are available for all integrations.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              To activate an integration, configure credentials in the secrets manager and update the connector status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
