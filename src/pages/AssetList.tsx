import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, Download, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { listAssets, checkExpiringDocuments } from '../services/assets';
import { getAllCategories } from '../services/assetCategories';
import { Asset, AssetCategoryDefinition, AssetStatus } from '../services/assetTypes';

export default function AssetList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategoryDefinition[]>([]);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    search: '',
  });
  const [expiringAssets, setExpiringAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, categoriesData, expiringData] = await Promise.all([
        listAssets(),
        getAllCategories(),
        checkExpiringDocuments(30),
      ]);
      setAssets(assetsData);
      setCategories(categoriesData);
      setExpiringAssets(expiringData);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter(asset => {
    if (filters.category && asset.category !== filters.category) return false;
    if (filters.status && asset.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        asset.assetCode.toLowerCase().includes(searchLower) ||
        asset.registrationNumber.toLowerCase().includes(searchLower) ||
        asset.make.toLowerCase().includes(searchLower) ||
        asset.model.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusColor = (status: AssetStatus) => {
    const colors: Record<AssetStatus, string> = {
      available: 'bg-green-100 text-green-800',
      deployed: 'bg-blue-100 text-blue-800',
      idle: 'bg-gray-100 text-gray-800',
      standby: 'bg-yellow-100 text-yellow-800',
      under_maintenance: 'bg-orange-100 text-orange-800',
      breakdown: 'bg-red-100 text-red-800',
      out_of_service: 'bg-red-200 text-red-900',
      in_transit: 'bg-purple-100 text-purple-800',
      disposed: 'bg-gray-200 text-gray-900',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assets...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Master Register</h1>
            <p className="text-gray-600 mt-1">
              {assets.length} assets registered • {expiringAssets.length} with expiring documents
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/assets/import"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Upload className="w-4 h-4" />
              Bulk Import
            </Link>
            <Link
              to="/assets/new"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              New Asset
            </Link>
          </div>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {expiringAssets.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Documents Expiring Soon</h3>
              <p className="text-sm text-yellow-800 mt-1">
                {expiringAssets.length} asset(s) have documents expiring within 30 days
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringAssets.slice(0, 5).map(asset => (
                  <Link
                    key={asset.id}
                    to={`/assets/${asset.id}`}
                    className="text-xs bg-yellow-100 text-yellow-900 px-2 py-1 rounded hover:bg-yellow-200"
                  >
                    {asset.assetCode}
                  </Link>
                ))}
                {expiringAssets.length > 5 && (
                  <span className="text-xs text-yellow-700">
                    +{expiringAssets.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Asset code, registration, make, model..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.code} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="deployed">Deployed</option>
              <option value="idle">Idle</option>
              <option value="standby">Standby</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="breakdown">Breakdown</option>
              <option value="out_of_service">Out of Service</option>
              <option value="in_transit">In Transit</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Make / Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.map((asset) => {
                const category = categories.find(c => c.code === asset.category);
                const hasExpiringDocs = expiringAssets.some(e => e.id === asset.id);

                return (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/assets/${asset.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {asset.assetCode}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {asset.registrationNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{asset.make}</div>
                      <div className="text-sm text-gray-500">{asset.model}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {category?.name || asset.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(asset.status)}`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.location || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasExpiringDocs ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-700">
                          <AlertTriangle className="w-3 h-3" />
                          Expiring
                        </span>
                      ) : asset.documents.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          {asset.documents.length} docs
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No docs</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        to={`/assets/${asset.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAssets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No assets found</p>
          </div>
        )}
      </div>
    </div>
  );
}
