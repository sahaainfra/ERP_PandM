/**
 * Part 07 — Offline Queue Management
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { listOfflineQueueItems, syncOfflineQueue, retryFailedItems, getQueueStatistics, resolveConflict } from '../services/offlineSync';
import { OfflineQueueItem } from '../services/submissionTypes';

export default function OfflineQueueManagement() {
  const [queueItems, setQueueItems] = useState<OfflineQueueItem[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    synced: 0,
    failed: 0,
    conflicts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadData();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await listOfflineQueueItems();
      setQueueItems(items);
      
      const stats = await getQueueStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load queue', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isOnline) {
      alert('Cannot sync while offline');
      return;
    }

    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      alert(`Sync complete: ${result.synced} synced, ${result.failed} failed, ${result.conflicts} conflicts`);
      await loadData();
    } catch (error) {
      console.error('Sync failed', error);
      alert('Sync failed: ' + (error as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRetry = async () => {
    try {
      const result = await retryFailedItems();
      alert(`Retried ${result.retried} items, ${result.failed} items exceeded max retries`);
      await loadData();
    } catch (error) {
      console.error('Retry failed', error);
      alert('Retry failed: ' + (error as Error).message);
    }
  };

  const handleResolveConflict = async (itemId: string, resolution: 'keep_local' | 'keep_server' | 'merge') => {
    try {
      await resolveConflict(itemId, resolution, 'system');
      alert('Conflict resolved');
      await loadData();
    } catch (error) {
      console.error('Resolve failed', error);
      alert('Resolve failed: ' + (error as Error).message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'conflict':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'syncing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'conflict':
        return 'bg-amber-50 border-amber-200';
      case 'syncing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Offline Queue</h1>
            <p className="text-gray-600 mt-1">Manage offline submissions and photos</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <p className="text-sm text-blue-700">Pending</p>
          <p className="text-2xl font-bold text-blue-900">{statistics.pending}</p>
        </div>
        <div className="bg-indigo-50 rounded-lg shadow p-4 border border-indigo-200">
          <p className="text-sm text-indigo-700">Syncing</p>
          <p className="text-2xl font-bold text-indigo-900">{statistics.syncing}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <p className="text-sm text-green-700">Synced</p>
          <p className="text-2xl font-bold text-green-900">{statistics.synced}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <p className="text-sm text-red-700">Failed</p>
          <p className="text-2xl font-bold text-red-900">{statistics.failed}</p>
        </div>
        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <p className="text-sm text-amber-700">Conflicts</p>
          <p className="text-2xl font-bold text-amber-900">{statistics.conflicts}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSync}
          disabled={syncing || !isOnline || statistics.pending === 0}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          onClick={handleRetry}
          disabled={statistics.failed === 0}
          className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Retry Failed
        </button>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Queue Items */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading queue...</div>
        </div>
      ) : queueItems.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-500">Queue is empty</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queueItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-lg shadow p-6 border-l-4 ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(item.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.type === 'submission' ? 'Submission' : 'Photo'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Client UUID: {item.clientUuid}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900 capitalize">{item.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Retry Count</p>
                      <p className="font-medium text-gray-900">{item.retryCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Capture Time</p>
                      <p className="font-medium text-gray-900">
                        {new Date(item.clientCaptureTime).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Encrypted</p>
                      <p className="font-medium text-gray-900">
                        {item.encrypted ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </div>

                  {item.lastError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900">Error</p>
                      <p className="text-xs text-red-800 mt-1">{item.lastError}</p>
                    </div>
                  )}

                  {item.conflictDetails && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-900">Conflict Details</p>
                      <p className="text-xs text-amber-800 mt-1">{item.conflictDetails}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleResolveConflict(item.id, 'keep_local')}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Keep Local
                        </button>
                        <button
                          onClick={() => handleResolveConflict(item.id, 'keep_server')}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                        >
                          Keep Server
                        </button>
                        <button
                          onClick={() => handleResolveConflict(item.id, 'merge')}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700"
                        >
                          Merge
                        </button>
                      </div>
                    </div>
                  )}

                  {item.serverReceiptTime && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-900">Server Receipt</p>
                      <p className="text-xs text-green-800 mt-1">
                        {new Date(item.serverReceiptTime).toLocaleString()}
                      </p>
                      {item.serverId && (
                        <p className="text-xs text-green-800 mt-1">
                          Server ID: {item.serverId}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
