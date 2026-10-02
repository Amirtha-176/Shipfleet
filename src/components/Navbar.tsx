import React, { useState, useEffect, useRef } from 'react';
import {
  Ship,
  Search,
  Bell,
  Users,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Code2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { alertService, vesselService, voyageService, cargoService } from '../services/api.ts';
import { IAlert } from '../types/client.ts';
import { useToast } from './Toast.tsx';

interface NavbarProps {
  onNavigate: (page: string, param?: string) => void;
  activePage: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, activePage }) => {
  const { user, logout, switchUserRoleDemo, isAdmin, isUser } = useAuth();
  const { onlineCount, onlineUsers } = useSocket();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState<number>(0);
  const [isAlertOpen, setIsAlertOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isPresenceOpen, setIsPresenceOpen] = useState<boolean>(false);

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    vessels: any[];
    voyages: any[];
    cargo: any[];
  }>({ vessels: [], voyages: [], cargo: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const alertRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const presenceRef = useRef<HTMLDivElement>(null);

  const fetchAlerts = async () => {
    try {
      const data = await alertService.getAll({ resolved: false });
      setAlerts(data);
      setUnreadAlertCount(data.length);
    } catch (err) {
      console.warn('Failed to load alerts:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  // Handle global search
  useEffect(() => {
    const runSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults({ vessels: [], voyages: [], cargo: [] });
        setIsSearchOpen(false);
        return;
      }

      try {
        const [vsls, vygs, crgs] = await Promise.all([
          vesselService.getAll({ search: searchQuery }).catch(() => []),
          voyageService.getAll({ destination: searchQuery }).catch(() => []),
          cargoService.getAll({ search: searchQuery }).catch(() => [])
        ]);

        setSearchResults({
          vessels: vsls.slice(0, 4),
          voyages: vygs.slice(0, 3),
          cargo: crgs.slice(0, 3)
        });
        setIsSearchOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      }
    };

    const timer = setTimeout(runSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setIsAlertOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (presenceRef.current && !presenceRef.current.contains(e.target as Node)) {
        setIsPresenceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResolveAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await alertService.resolve(id);
      showToast('success', 'Alert Resolved', 'The operational alert has been archived');
      fetchAlerts();
    } catch (err) {
      showToast('error', 'Action Failed', 'Failed to resolve alert');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => onNavigate('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-cyan-500 p-0.5 shadow-lg shadow-blue-900/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Ship className="w-5 h-5 text-cyan-400 group-hover:rotate-6 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">ShipFleet</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30">
                  FleetOps
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium tracking-wide">
                Maritime Operations & Voyage Control
              </div>
            </div>
          </div>

          {/* Global Search Bar */}
          <div ref={searchRef} className="hidden md:flex flex-1 max-w-md mx-6 relative">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vessels, voyages, cargo, ports..."
                className="w-full pl-9 pr-4 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 p-2 text-xs">
                {searchResults.vessels.length === 0 &&
                searchResults.voyages.length === 0 &&
                searchResults.cargo.length === 0 ? (
                  <div className="p-3 text-slate-400 text-center">No maritime records match your search</div>
                ) : (
                  <div className="space-y-2">
                    {searchResults.vessels.length > 0 && (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1">
                          Vessels
                        </div>
                        {searchResults.vessels.map((v) => (
                          <div
                            key={v._id}
                            onClick={() => {
                              onNavigate('vessel-details', v._id);
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-200"
                          >
                            <div className="font-semibold text-blue-400">{v.name}</div>
                            <span className="text-[11px] text-slate-400">{v.imoNumber} • {v.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.voyages.length > 0 && (
                      <div className="border-t border-slate-800 pt-1">
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 px-2 py-1">
                          Voyages
                        </div>
                        {searchResults.voyages.map((vyg) => (
                          <div
                            key={vyg._id}
                            onClick={() => {
                              onNavigate('voyages');
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-slate-200"
                          >
                            <div>{vyg.voyageId} ({vyg.originPort} ➔ {vyg.destinationPort})</div>
                            <span className="text-cyan-400 font-semibold">{vyg.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Area: Presence + Alerts + Role Switcher + User Profile */}
          <div className="flex items-center space-x-3">
            {/* Live Socket Presence Indicator */}
            <div ref={presenceRef} className="relative">
              <button
                onClick={() => setIsPresenceOpen(!isPresenceOpen)}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300 hover:border-slate-600 transition-colors"
                title="Active connections on FleetOps"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-emerald-400">{onlineCount}</span>
                <span className="text-slate-400 hidden sm:inline">Online</span>
              </button>

              {isPresenceOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs">
                  <div className="font-bold text-slate-200 mb-2 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>Live Active Sessions</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                      {onlineCount} Connected
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {onlineUsers.length > 0 ? (
                      onlineUsers.map((u, i) => (
                        <div key={i} className="p-1.5 rounded-lg bg-slate-800/60 flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-200">{u.name || 'Anonymous User'}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                          <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                            {u.role || 'viewer'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-center py-2">Real-time sync active</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Direct REST API Docs Button */}
            <button
              onClick={() => onNavigate('api-docs')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activePage === 'api-docs'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/80'
              }`}
              title="REST API Documentation & Endpoints Specification"
            >
              <Code2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">API Docs</span>
            </button>

            {/* Quick Demo Role Switcher (2 Logins: Admin and User) */}
            <div className="hidden lg:flex items-center bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/80 text-xs">
              <button
                onClick={() => switchUserRoleDemo('admin')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isAdmin
                    ? 'bg-rose-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to Admin account (full CRUD & User Management)"
              >
                Admin
              </button>
              <button
                onClick={() => switchUserRoleDemo('user')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  !isAdmin
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Switch to User account (Voyages, Fleet, Cargo, Fuel & Monitoring)"
              >
                User
              </button>
            </div>

            {/* Operational Alerts Bell */}
            <div ref={alertRef} className="relative">
              <button
                onClick={() => setIsAlertOpen(!isAlertOpen)}
                className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                title="Operational Alerts"
              >
                <Bell className="w-5 h-5" />
                {unreadAlertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-lg animate-pulse">
                    {unreadAlertCount}
                  </span>
                )}
              </button>

              {isAlertOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50">
                  <div className="p-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Operational Alerts</span>
                    </div>
                    <button
                      onClick={() => {
                        onNavigate('alerts');
                        setIsAlertOpen(false);
                      }}
                      className="text-xs text-blue-400 hover:underline flex items-center space-x-1"
                    >
                      <span>View All</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
                        All fleet systems operational. No active alerts.
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div key={alert._id} className="p-3 hover:bg-slate-800/50 transition-colors text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                                alert.severity === 'Critical'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {alert.alertType}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300 leading-snug">{alert.message}</p>
                          {(isAdmin || isUser) && (
                            <div className="pt-1.5 flex justify-end">
                              <button
                                onClick={(e) => handleResolveAlert(alert._id, e)}
                                className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[10px] font-semibold transition-all"
                              >
                                Resolve Alert
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 hover:border-slate-600 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight flex items-center space-x-1.5">
                    <span>{user?.name || 'Authorized User'}</span>
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                    {user?.role || 'Guest'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <div className="font-semibold text-slate-200">{user?.name}</div>
                    <div className="text-slate-400 text-[11px] truncate">{user?.email}</div>
                    <div className="mt-1.5 flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span className="capitalize font-bold text-[11px] text-cyan-400">
                        {user?.role} Permissions
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate('settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Settings & Security</span>
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          onNavigate('users');
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-800 flex items-center space-x-2"
                      >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>User Administration</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileOpen(false);
                        onNavigate('landing');
                      }}
                      className="w-full text-left px-4 py-2 text-rose-400 hover:bg-rose-500/10 flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
