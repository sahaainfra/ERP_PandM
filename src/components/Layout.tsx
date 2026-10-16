import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Fuel, Factory, MessageSquare,
  DollarSign, Bell, Shield, Menu, X, ChevronDown, User, Settings, LogOut,
  CheckSquare
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assets', label: 'Asset Master', icon: Truck },
  { path: '/allocations', label: 'Allocations', icon: Truck },
  { path: '/operators', label: 'Operators', icon: Truck },
  { path: '/fleet', label: 'Fleet & Equipment', icon: Truck },
  { path: '/fuel', label: 'Fuel Management', icon: Fuel },
  { path: '/fuel/issue', label: 'Issue Fuel', icon: Fuel },
  { path: '/fuel/tanks', label: 'Tank Dashboard', icon: Fuel },
  { path: '/fuel/verification', label: 'Fuel Verification', icon: Fuel },
  { path: '/fuel/benchmarks', label: 'Benchmarks', icon: Fuel },
  { path: '/fuel/calibrations', label: 'Calibrations', icon: Fuel },
  { path: '/maintenance/work-orders', label: 'Work Orders', icon: Truck },
  { path: '/maintenance/pm-plans', label: 'PM Plans', icon: Truck },
  { path: '/maintenance/reliability', label: 'Reliability', icon: Truck },
  { path: '/integrations', label: 'Integrations', icon: Truck },
  { path: '/integrations/telematics', label: 'Telematics', icon: Truck },
  { path: '/rmc', label: 'RMC Operations', icon: Factory },
  { path: '/chat', label: 'Team Chat', icon: MessageSquare },
  { path: '/finance', label: 'Finance & Costing', icon: DollarSign },
  { path: '/alerts', label: 'Alerts', icon: Bell },
  { path: '/approvals/pending', label: 'Approvals', icon: CheckSquare },
  { path: '/admin/permissions', label: 'Permissions Admin', icon: Shield },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm">CE</div>
            <div>
              <h1 className="font-bold text-sm">ConstructERP</h1>
              <p className="text-xs text-slate-400">Fleet • RMC • Finance</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-xs font-medium">SM</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Site Manager</p>
              <p className="text-xs text-slate-400 truncate">admin@construct.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/alerts" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">4</span>
            </Link>

            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-medium">SM</div>
                <ChevronDown size={14} className="text-gray-500 hidden sm:block" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <User size={16} /> Profile
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Settings size={16} /> Settings
                  </button>
                  <hr className="my-1" />
                  <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
