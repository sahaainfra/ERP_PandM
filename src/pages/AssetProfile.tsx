import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, AlertTriangle, CheckCircle, FileText, Gauge, MapPin, Wrench, DollarSign, QrCode } from 'lucide-react';
import { getAsset, getAllocationHistory } from '../services/assets';
import { getCategory } from '../services/assetCategories';
import { Asset, AssetCategoryDefinition, AssetAllocation } from '../services/assetTypes';

type Tab = 'details' | 'documents' | 'meters' | 'allocations' | 'logbooks' | 'fuel' | 'maintenance' | 'costs';

export default function AssetProfile() {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [category, setCategory] = useState<AssetCategoryDefinition | null>(null);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const assetData = await getAsset(id!);
      if (assetData) {
        setAsset(assetData);
        const categoryData = await getCategory(assetData.category);
        setCategory(categoryData);
        const allocationsData = await getAllocationHistory(assetData.id);
        setAllocations(allocationsData);
      }
    } catch (error) {
      console.error('Failed to load asset', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading asset...</div>
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
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

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'meters', label: 'Meters', icon: <Gauge className="w-4 h-4" /> },
    { id: 'allocations', label: 'Allocations', icon: <MapPin className="w-4 h-4" /> },
    { id: 'logbooks', label: 'Logbooks', icon: <FileText className="w-4 h-4" /> },
    { id: 'fuel', label: 'Fuel', icon: <FileText className="w-4 h-4" /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench className="w-4 h-4" /> },
    { id: 'costs', label: 'Costs', icon: <DollarSign className="w-4 h-4" /> },
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link to="/assets" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{asset.assetCode}</h1>
              <span className={`px-3 py-1 text-sm font-medium rounded ${getStatusColor(asset.status)}`}>
                {asset.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-600 mt-1">
              {asset.make} {asset.model} {asset.variant && `• ${asset.variant}`} • {asset.year}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Reg: {asset.registrationNumber} • Serial: {asset.serialNumber}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              <QrCode className="w-4 h-4" />
              QR Code
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Identity</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Asset Code</dt>
                <dd className="text-sm text-gray-900">{asset.assetCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Registration</dt>
                <dd className="text-sm text-gray-900">{asset.registrationNumber}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Country</dt>
                <dd className="text-sm text-gray-900">{asset.country}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Make</dt>
                <dd className="text-sm text-gray-900">{asset.make}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Model</dt>
                <dd className="text-sm text-gray-900">{asset.model}</dd>
              </div>
              {asset.variant && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Variant</dt>
                  <dd className="text-sm text-gray-900">{asset.variant}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Year</dt>
                <dd className="text-sm text-gray-900">{asset.year}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Serial Number</dt>
                <dd className="text-sm text-gray-900">{asset.serialNumber}</dd>
              </div>
              {asset.chassisNumber && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Chassis Number</dt>
                  <dd className="text-sm text-gray-900">{asset.chassisNumber}</dd>
                </div>
              )}
              {asset.engineNumber && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Engine Number</dt>
                  <dd className="text-sm text-gray-900">{asset.engineNumber}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="text-sm text-gray-900">{category?.name || asset.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Sub-Category</dt>
                <dd className="text-sm text-gray-900">{asset.subCategory.replace('_', ' ')}</dd>
              </div>
              {asset.colour && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Colour</dt>
                  <dd className="text-sm text-gray-900">{asset.colour}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Ownership & Finance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ownership & Finance</h3>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Ownership Type</dt>
                <dd className="text-sm text-gray-900 capitalize">{asset.ownershipType}</dd>
              </div>
              {asset.ownerVendorId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Owner/Vendor</dt>
                  <dd className="text-sm text-gray-900">{asset.ownerVendorId}</dd>
                </div>
              )}
              {asset.contractReference && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Contract Reference</dt>
                  <dd className="text-sm text-gray-900">{asset.contractReference}</dd>
                </div>
              )}
              {asset.purchaseDate && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Purchase Date</dt>
                  <dd className="text-sm text-gray-900">{new Date(asset.purchaseDate).toLocaleDateString()}</dd>
                </div>
              )}
              {asset.purchaseCost && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Purchase Cost</dt>
                  <dd className="text-sm text-gray-900">₹{asset.purchaseCost.toLocaleString()}</dd>
                </div>
              )}
              {asset.depreciationMethod && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Depreciation Method</dt>
                  <dd className="text-sm text-gray-900">{asset.depreciationMethod}</dd>
                </div>
              )}
              {asset.bookValue && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Book Value</dt>
                  <dd className="text-sm text-gray-900">₹{asset.bookValue.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Assignment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Assignment</h3>
            <dl className="space-y-3">
              {asset.currentProjectId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Project</dt>
                  <dd className="text-sm text-gray-900">{asset.currentProjectId}</dd>
                </div>
              )}
              {asset.currentSiteId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Site</dt>
                  <dd className="text-sm text-gray-900">{asset.currentSiteId}</dd>
                </div>
              )}
              {asset.currentPlantId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Plant</dt>
                  <dd className="text-sm text-gray-900">{asset.currentPlantId}</dd>
                </div>
              )}
              {asset.departmentId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Department</dt>
                  <dd className="text-sm text-gray-900">{asset.departmentId}</dd>
                </div>
              )}
              {asset.supervisorId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Supervisor</dt>
                  <dd className="text-sm text-gray-900">{asset.supervisorId}</dd>
                </div>
              )}
              {asset.defaultOperatorId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Default Operator</dt>
                  <dd className="text-sm text-gray-900">{asset.defaultOperatorId}</dd>
                </div>
              )}
              {asset.location && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Location</dt>
                  <dd className="text-sm text-gray-900">{asset.location}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Fuel & Telematics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel & Telematics</h3>
            <dl className="space-y-3">
              {asset.tankCapacity && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Tank Capacity</dt>
                  <dd className="text-sm text-gray-900">{asset.tankCapacity} L</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Fuel Type</dt>
                <dd className="text-sm text-gray-900 capitalize">{asset.fuelType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Fuel Sensor</dt>
                <dd className="text-sm text-gray-900">
                  {asset.fuelSensorPresent ? (
                    <span className="text-green-600">✓ Present</span>
                  ) : (
                    <span className="text-gray-400">Not present</span>
                  )}
                </dd>
              </div>
              {asset.telematicsDeviceId && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Telematics Device</dt>
                  <dd className="text-sm text-gray-900">{asset.telematicsDeviceId}</dd>
                </div>
              )}
              {asset.telematicsProvider && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">Telematics Provider</dt>
                  <dd className="text-sm text-gray-900">{asset.telematicsProvider}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance Documents</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <FileText className="w-4 h-4" />
              Add Document
            </button>
          </div>

          {asset.documents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No documents added yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asset.documents.map((doc) => {
                    const expiryDate = new Date(doc.expiryDate);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiring = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                    const isExpired = daysUntilExpiry <= 0;

                    return (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doc.type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doc.documentNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(doc.issueDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {expiryDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isExpired ? (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                              Expired
                            </span>
                          ) : isExpiring ? (
                            <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {daysUntilExpiry} days
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'meters' && (
        <div className="space-y-6">
          {/* Current Readings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Meter Readings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {asset.currentHourMeter !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Hour Meter</p>
                  <p className="text-3xl font-bold text-gray-900">{asset.currentHourMeter.toLocaleString()} hrs</p>
                  {asset.hourMeterApprovedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last approved: {new Date(asset.hourMeterApprovedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
              {asset.currentOdometer !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Odometer</p>
                  <p className="text-3xl font-bold text-gray-900">{asset.currentOdometer.toLocaleString()} km</p>
                  {asset.odometerApprovedAt && (
                    <p className="text-xs text-gray-500 mt-2">
                      Last approved: {new Date(asset.odometerApprovedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Meter Replacement History */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Meter Replacement History</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Gauge className="w-4 h-4" />
                Replace Meter
              </button>
            </div>

            {asset.meterReplacements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No meter replacements recorded
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Final</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Start</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.meterReplacements.map((replacement) => (
                      <tr key={replacement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(replacement.replacementDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {replacement.meterType.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {replacement.oldMeterFinalReading.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {replacement.newMeterStartReading.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {replacement.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {replacement.approvedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'allocations' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Allocation History</h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <MapPin className="w-4 h-4" />
              New Allocation
            </button>
          </div>

          {allocations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No allocation history
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated By</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allocations.map((allocation) => (
                    <tr key={allocation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(allocation.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {allocation.endDate ? new Date(allocation.endDate).toLocaleDateString() : 'Present'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {allocation.projectId || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {allocation.siteId || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {allocation.plantId || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {allocation.allocatedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'logbooks' || activeTab === 'fuel' || activeTab === 'maintenance' || activeTab === 'costs') && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">This tab will be populated in future parts</p>
          <p className="text-sm text-gray-400 mt-2">
            {activeTab === 'logbooks' && 'Operator logbooks will appear here (Part 05)'}
            {activeTab === 'fuel' && 'Fuel consumption records will appear here (Part 06)'}
            {activeTab === 'maintenance' && 'Maintenance history will appear here (Part 07)'}
            {activeTab === 'costs' && 'Cost breakdown will appear here (Part 08)'}
          </p>
        </div>
      )}
    </div>
  );
}
