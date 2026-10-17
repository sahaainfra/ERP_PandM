import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search, Filter, ChevronDown } from 'lucide-react';
import { financeEntries } from '../data/mockData';
import { StatusBadge, formatINR, formatNumber } from '../components/Badges';

const monthlyData = [
  { month: 'Oct', revenue: 3800000, expenses: 2900000 },
  { month: 'Nov', revenue: 4200000, expenses: 3100000 },
  { month: 'Dec', revenue: 4800000, expenses: 3400000 },
  { month: 'Jan', revenue: 3600000, expenses: 2800000 },
];

const costBreakdown = [
  { name: 'Fuel', value: 450000, color: '#f59e0b' },
  { name: 'Labour', value: 1250000, color: '#3b82f6' },
  { name: 'Materials', value: 890000, color: '#10b981' },
  { name: 'Maintenance', value: 350000, color: '#8b5cf6' },
  { name: 'Depreciation', value: 280000, color: '#ef4444' },
  { name: 'Overhead', value: 180000, color: '#06b6d4' },
];

export default function Finance() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = financeEntries.filter(e => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.account.toLowerCase().includes(search.toLowerCase()) ||
      e.project.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalDebit = financeEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = financeEntries.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Finance & Costing</h1>
          <p className="text-sm text-gray-500 mt-1">Project-wise cost tracking, vouchers and financial reports</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors text-sm">
          <DollarSign size={16} /> New Voucher
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-emerald-500" />
            <p className="text-xs text-gray-500 font-medium">Total Revenue</p>
          </div>
          <p className="text-lg font-bold text-emerald-700">{formatINR(totalCredit)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5"><ArrowUpRight size={10} /> +12% vs last month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-xs text-gray-500 font-medium">Total Expenses</p>
          </div>
          <p className="text-lg font-bold text-red-700">{formatINR(totalDebit)}</p>
          <p className="text-xs text-red-600 mt-1 flex items-center gap-0.5"><ArrowDownRight size={10} /> -5% vs last month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-blue-500" />
            <p className="text-xs text-gray-500 font-medium">Net Position</p>
          </div>
          <p className="text-lg font-bold text-blue-700">{formatINR(totalCredit - totalDebit)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-purple-500" />
            <p className="text-xs text-gray-500 font-medium">Pending Vouchers</p>
          </div>
          <p className="text-lg font-bold text-purple-700">{financeEntries.filter(e => e.status === 'submitted' || e.status === 'pending_approval').length}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(value: number) => formatINR(value)} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={costBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {costBreakdown.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatINR(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {costBreakdown.map(item => (
              <div key={item.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Journal Entries */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-semibold text-gray-900">Journal Entries</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">All Status</option>
              <option value="posted">Posted</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Date</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Voucher No</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Account</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Project</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Debit (₹)</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">Credit (₹)</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Description</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-gray-500">{entry.date}</td>
                  <td className="py-2.5 px-4 font-medium text-gray-900">{entry.voucherNo}</td>
                  <td className="py-2.5 px-4">{entry.account}</td>
                  <td className="py-2.5 px-4 text-gray-500">{entry.project}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-red-700">{entry.debit > 0 ? formatNumber(entry.debit) : '—'}</td>
                  <td className="py-2.5 px-4 text-right font-medium text-emerald-700">{entry.credit > 0 ? formatNumber(entry.credit) : '—'}</td>
                  <td className="py-2.5 px-4 text-gray-500 max-w-[200px] truncate">{entry.description}</td>
                  <td className="py-2.5 px-4"><StatusBadge status={entry.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-medium">
              <tr>
                <td colSpan={4} className="py-2.5 px-4 text-right text-sm">Totals:</td>
                <td className="py-2.5 px-4 text-right text-sm text-red-700">{formatNumber(totalDebit)}</td>
                <td className="py-2.5 px-4 text-right text-sm text-emerald-700">{formatNumber(totalCredit)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
