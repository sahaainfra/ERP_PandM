import { useState } from 'react';
import { Factory, Package, Beaker, Truck as TruckIcon, Plus, Search, Eye } from 'lucide-react';
import { rmcOrders, mixDesigns } from '../data/mockData';
import { StatusBadge, formatNumber } from '../components/Badges';

type Tab = 'orders' | 'mixdesigns' | 'dispatch';

export default function RMCOperations() {
  const [tab, setTab] = useState<Tab>('orders');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const filteredOrders = rmcOrders.filter(o =>
    o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
    o.projectName.toLowerCase().includes(search.toLowerCase()) ||
    o.grade.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrdered = rmcOrders.reduce((s, o) => s + o.quantity, 0);
  const totalDelivered = rmcOrders.reduce((s, o) => s + o.delivered, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">RMC Plant Operations</h1>
          <p className="text-sm text-gray-500 mt-1">Ready-Mix Concrete — Plants, Mix Designs, Orders & Dispatch</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm">
          <Plus size={16} /> New Order
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-purple-500" />
            <p className="text-xs text-gray-500 font-medium">Total Ordered</p>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatNumber(totalOrdered)} m³</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TruckIcon size={16} className="text-blue-500" />
            <p className="text-xs text-gray-500 font-medium">Delivered</p>
          </div>
          <p className="text-xl font-bold text-blue-700">{formatNumber(totalDelivered)} m³</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Factory size={16} className="text-emerald-500" />
            <p className="text-xs text-gray-500 font-medium">Active Mix Designs</p>
          </div>
          <p className="text-xl font-bold text-emerald-700">{mixDesigns.filter(m => m.status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Beaker size={16} className="text-amber-500" />
            <p className="text-xs text-gray-500 font-medium">Pending Orders</p>
          </div>
          <p className="text-xl font-bold text-amber-700">{rmcOrders.filter(o => o.status === 'submitted' || o.status === 'pending_approval').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {([['orders', 'Orders'], ['mixdesigns', 'Mix Designs'], ['dispatch', 'Dispatch']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-amber-500 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Order No</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Project / Site</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Grade</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Qty (m³)</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Delivered</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Delivery Date</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Mixers</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-4 font-medium text-gray-900">{order.orderNo}</td>
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-gray-900">{order.projectName}</p>
                        <p className="text-xs text-gray-500">{order.siteName}</p>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{order.grade}</span>
                      </td>
                      <td className="py-2.5 px-4">{order.quantity}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <span>{order.delivered}</span>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(order.delivered / order.quantity) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-gray-500">{order.deliveryDate}</td>
                      <td className="py-2.5 px-4">{order.transitMixers}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => setSelectedOrder(order.id === selectedOrder ? null : order.id)}
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

          {selectedOrder && (() => {
            const order = rmcOrders.find(o => o.id === selectedOrder);
            if (!order) return null;
            return (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Order Detail — {order.orderNo}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><p className="text-xs text-gray-500">Plant</p><p className="font-medium">{order.plant}</p></div>
                  <div><p className="text-xs text-gray-500">Project</p><p className="font-medium">{order.projectName}</p></div>
                  <div><p className="text-xs text-gray-500">Site</p><p className="font-medium">{order.siteName}</p></div>
                  <div><p className="text-xs text-gray-500">Grade</p><p className="font-medium">{order.grade}</p></div>
                  <div><p className="text-xs text-gray-500">Quantity</p><p className="font-medium">{order.quantity} m³</p></div>
                  <div><p className="text-xs text-gray-500">Delivered</p><p className="font-medium">{order.delivered} m³</p></div>
                  <div><p className="text-xs text-gray-500">Pump Required</p><p className="font-medium">{order.pumpRequired ? 'Yes' : 'No'}</p></div>
                  <div><p className="text-xs text-gray-500">Order Date</p><p className="font-medium">{order.orderDate}</p></div>
                </div>
                {order.specialInstructions && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-800">Special Instructions</p>
                    <p className="text-sm text-amber-700 mt-1">{order.specialInstructions}</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Mix Designs Tab */}
      {tab === 'mixdesigns' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Code</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Grade</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Cement (kg/m³)</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Sand (kg/m³)</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Agg 20mm</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Agg 12mm</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Water (L)</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">W/C</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Slump (mm)</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Target (MPa)</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {mixDesigns.map(md => (
                  <tr key={md.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{md.code}</td>
                    <td className="py-2.5 px-4"><span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{md.grade}</span></td>
                    <td className="py-2.5 px-4">{md.cement}</td>
                    <td className="py-2.5 px-4">{md.sand}</td>
                    <td className="py-2.5 px-4">{md.aggregate20mm}</td>
                    <td className="py-2.5 px-4">{md.aggregate12mm}</td>
                    <td className="py-2.5 px-4">{md.water}</td>
                    <td className="py-2.5 px-4">{md.wcratio}</td>
                    <td className="py-2.5 px-4">{md.slump}</td>
                    <td className="py-2.5 px-4">{md.targetStrength}</td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        md.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        md.status === 'approved' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{md.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Tab */}
      {tab === 'dispatch' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <TruckIcon size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-semibold text-gray-900 mb-2">Live Dispatch Tracking</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Real-time transit mixer tracking requires GPS integration. This interface is ready for integration with GPS tracking devices.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            GPS Integration: Awaiting device configuration
          </div>
        </div>
      )}
    </div>
  );
}
