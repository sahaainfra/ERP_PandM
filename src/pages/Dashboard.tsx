import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { Truck, Fuel, Factory, AlertTriangle, TrendingUp, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { fuelTrendData, productionData, equipmentUtilization, alerts, operatorLogs, rmcOrders } from '../data/mockData';
import { formatINR, formatNumber } from '../components/Badges';

const kpis = [
  { label: 'Equipment Operational', value: '6 / 8', sub: '75% fleet utilization', icon: Truck, color: 'bg-emerald-500', change: 5 },
  { label: 'Fuel Today', value: '545 L', sub: `Variance: +42L (8.4%)`, icon: Fuel, color: 'bg-blue-500', change: -3 },
  { label: 'RMC Production', value: '156 m³', sub: `Target: 200 m³`, icon: Factory, color: 'bg-purple-500', change: 12 },
  { label: 'Open Alerts', value: '4', sub: '1 critical, 2 high', icon: AlertTriangle, color: 'bg-red-500', change: -2 },
];

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function Dashboard() {
  const pendingLogs = operatorLogs.filter(l => l.status === 'pending_approval' || l.status === 'submitted').length;
  const pendingOrders = rmcOrders.filter(o => o.status === 'submitted' || o.status === 'pending_approval').length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{kpi.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{kpi.sub}</p>
                </div>
                <div className={`${kpi.color} p-2.5 rounded-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
              </div>
              {kpi.change !== undefined && (
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${kpi.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  <TrendingUp size={12} className={kpi.change < 0 ? 'rotate-180' : ''} />
                  {Math.abs(kpi.change)}% from last week
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fuel Consumption Trend (Litres)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={fuelTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="issued" stroke="#f59e0b" strokeWidth={2} name="Issued" dot={false} />
              <Line type="monotone" dataKey="consumed" stroke="#3b82f6" strokeWidth={2} name="Consumed" dot={false} />
              <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Expected" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Equipment Utilization */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Equipment Utilization (%)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={equipmentUtilization} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="utilization" radius={[0, 4, 4, 0]}>
                {equipmentUtilization.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Production & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RMC Production */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">RMC Monthly Production (m³)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="production" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Actual" />
              <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Target" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pending Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Pending Actions</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
              <Clock size={18} className="text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{pendingLogs} Operator Logs</p>
                <p className="text-xs text-gray-500">Awaiting your approval</p>
              </div>
              <span className="text-amber-700 font-bold text-lg">{pendingLogs}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Factory size={18} className="text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{pendingOrders} RMC Orders</p>
                <p className="text-xs text-gray-500">Pending confirmation</p>
              </div>
              <span className="text-blue-700 font-bold text-lg">{pendingOrders}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">12 Tasks Completed</p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
              <span className="text-emerald-700 font-bold text-lg">12</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <XCircle size={18} className="text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">1 Log Rejected</p>
                <p className="text-xs text-gray-500">Needs resubmission</p>
              </div>
              <span className="text-red-700 font-bold text-lg">1</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Critical Alerts</h3>
          <div className="space-y-3">
            {alerts.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 4).map(alert => (
              <div key={alert.id} className="flex items-start gap-3 p-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{alert.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.module} • {alert.responsiblePerson}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Financial Summary - January 2026</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Revenue</p>
            <p className="text-lg font-bold text-emerald-700">{formatINR(480000)}</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Expenses</p>
            <p className="text-lg font-bold text-red-700">{formatINR(233000)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Fuel Cost</p>
            <p className="text-lg font-bold text-blue-700">{formatINR(45000)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-gray-500 font-medium">Net Profit</p>
            <p className="text-lg font-bold text-purple-700">{formatINR(247000)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
