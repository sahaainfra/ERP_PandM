import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { listOperators, checkExpiringDocuments } from '../services/operatorManagement';
import { Operator } from '../services/assetLifecycleTypes';

export default function OperatorList() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [expiringOperators, setExpiringOperators] = useState<Operator[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [operatorsData, expiringData] = await Promise.all([
        listOperators(),
        checkExpiringDocuments(30),
      ]);
      setOperators(operatorsData);
      setExpiringOperators(expiringData);
    } catch (error) {
      console.error('Failed to load ', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOperators = operators.filter(operator => {
    if (filters.type && operator.type !== filters.type) return false;
    if (filters.status && operator.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        operator.fullName.toLowerCase().includes(searchLower) ||
        operator.contactPhone.includes(searchLower) ||
        (operator.licenceNumber && operator.licenceNumber.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading operators...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Operators & Drivers</h1>
            <p className="text-gray-600 mt-1">
              {operators.length} operators • {expiringOperators.length} with expiring documents
            </p>
          </div>
          <Link
            to="/operators/new"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Operator
          </Link>
        </div>
      </div>

      {/* Expiring Documents Alert */}
      {expiringOperators.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900">Documents Expiring Soon</h3>
              <p className="text-sm text-yellow-800 mt-1">
                {expiringOperators.length} operator(s) have documents expiring within 30 days
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringOperators.slice(0, 5).map(operator => (
                  <Link
                    key={operator.id}
                    to={`/operators/${operator.id}`}
                    className="text-xs bg-yellow-100 text-yellow-900 px-2 py-1 rounded hover:bg-yellow-200"
                  >
                    {operator.fullName}
                  </Link>
                ))}
                {expiringOperators.length > 5 && (
                  <span className="text-xs text-yellow-700">
                    +{expiringOperators.length - 5} more
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Name, phone, licence..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="internal">Internal</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="hired">Hired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operator Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Licence</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Certificates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documents</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOperators.map(operator => {
                const hasExpiringDocs = expiringOperators.some(o => o.id === operator.id);
                const expiredCerts = operator.certificates.filter(c => new Date(c.expiryDate) < new Date());
                const validCerts = operator.certificates.filter(c => new Date(c.expiryDate) >= new Date());

                return (
                  <tr key={operator.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/operators/${operator.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-900"
                      >
                        {operator.fullName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {operator.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.contactPhone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.licenceNumber || '—'}
                      {operator.licenceExpiryDate && (
                        <span className="block text-xs">
                          Exp: {new Date(operator.licenceExpiryDate).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {operator.certificates.length} total
                      {expiredCerts.length > 0 && (
                        <span className="block text-xs text-red-600">{expiredCerts.length} expired</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        operator.status === 'active' ? 'bg-green-100 text-green-800' :
                        operator.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        operator.status === 'suspended' ? 'bg-red-100 text-red-800' :
                        'bg-gray-200 text-gray-900'
                      }`}>
                        {operator.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasExpiringDocs ? (
                        <span className="flex items-center gap-1 text-xs text-yellow-700">
                          <AlertTriangle className="w-3 h-3" />
                          Expiring
                        </span>
                      ) : expiredCerts.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Expired
                        </span>
                      ) : operator.certificates.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Valid
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No docs</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link
                        to={`/operators/${operator.id}`}
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

        {filteredOperators.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No operators found</p>
          </div>
        )}
      </div>
    </div>
  );
}
