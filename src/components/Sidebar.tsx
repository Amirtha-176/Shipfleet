import React from 'react';
import {
  LayoutDashboard,
  Ship,
  Navigation,
  Compass,
  Package,
  Fuel,
  Wrench,
  Anchor,
  Users2,
  AlertTriangle,
  FileSpreadsheet,
  UserCog,
  Settings,
  LogOut,
  ChevronRight,
  Code2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isCollapsed
}) => {
  const { user, isAdmin, isUser, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'vessels',
      label: 'Fleet & Vessels',
      icon: Ship,
      badge: '10'
    },
    {
      id: 'voyages',
      label: 'Voyages',
      icon: Navigation,
      badge: null
    },
    {
      id: 'route-tracking',
      label: 'Route Tracking',
      icon: Compass,
      badge: 'Live'
    },
    {
      id: 'cargo',
      label: 'Cargo Management',
      icon: Package,
      badge: null
    },
    {
      id: 'fuel',
      label: 'Fuel Operations',
      icon: Fuel,
      badge: null
    },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      badge: null
    },
    {
      id: 'ports',
      label: 'Port Directory',
      icon: Anchor,
      badge: '15'
    },
    {
      id: 'crew',
      label: 'Crew Management',
      icon: Users2,
      badge: null
    },
    {
      id: 'alerts',
      label: 'Alerts Center',
      icon: AlertTriangle,
      badge: 'Alerts'
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      badge: 'CSV'
    },
    ...(isAdmin
      ? [
          {
            id: 'users',
            label: 'User Administration',
            icon: UserCog,
            badge: 'Admin'
          }
        ]
      : []),
    {
      id: 'api-docs',
      label: 'REST API Docs',
      icon: Code2,
      badge: 'REST'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      badge: null
    }
  ];

  return (
    <aside
      className={`bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Navigation List */}
      <div className="py-4 px-3 space-y-1 overflow-y-auto">
        {/* Role Identity Tag (Admin or User) */}
        {!isCollapsed && (
          <div className="px-3 py-2 mb-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Access Tier:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider ${
                isAdmin
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {isAdmin ? 'Admin' : 'User'}
            </span>
          </div>
        )}

        {navItems.map((item) => {
          const isActive = activePage === item.id || (item.id === 'vessels' && activePage === 'vessel-details');
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center py-3' : 'justify-between px-3 py-2.5'
              } rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    item.badge === 'Live'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                      : item.badge === 'Alerts'
                      ? 'bg-amber-500/20 text-amber-300'
                      : item.badge === 'Admin'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom User Area & Logout */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <button
          onClick={() => {
            logout();
            onNavigate('landing');
          }}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center py-2.5' : 'px-3 py-2'
          } rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors`}
          title={isCollapsed ? 'Log Out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};
