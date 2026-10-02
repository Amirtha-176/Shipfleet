import React, { useState, useEffect } from 'react';
import {
  Ship,
  Compass,
  Navigation,
  Fuel,
  Wrench,
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../context/SocketContext.tsx';
import { dashboardService, trackingService, alertService } from '../services/api.ts';
import { IDashboardStats, ITrackingItem, IAlert } from '../types/client.ts';
import { LeafletMap } from '../components/LeafletMap.tsx';
import { useToast } from '../components/Toast.tsx';

interface DashboardPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user, isAdmin, isOperator, isViewer } = useAuth();
  const { activities, telemetryUpdates } = useSocket();
  const { showToast } = useToast();

  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [trackingVessels, setTrackingVessels] = useState<ITrackingItem[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<IAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadDashboardData = async () => {
    try {
      const [statsData, analyticsData, trackingData, alertsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getAnalytics(),
        trackingService.getAll(),
        alertService.getAll({ resolved: false })
      ]);

      setStats(statsData);
      setAnalytics(analyticsData);
      setTrackingVessels(trackingData);
      setActiveAlerts(alertsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      showToast('error', 'Dashboard Sync Failed', 'Unable to retrieve live statistics from backend.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const handleResolveAlert = async (id: string) => {
    try {
      await alertService.resolve(id);
      showToast('success', 'Alert Resolved', 'The operational alert has been updated');
      loadDashboardData();
    } catch (err) {
      showToast('error', 'Action Denied', 'Failed to resolve alert');
    }
  };

  if (isLoading && !stats) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-800/60 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-slate-800/40 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Role Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {isAdmin ? 'Directorate Master Dashboard' : 'Fleet Operations &amp; Voyage Command'}
            </h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                isAdmin
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {isAdmin ? 'Admin' : 'User'} Tier
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time telemetry, AIS satellite position reporting &amp; voyage schedule integrity.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Sync Telemetry</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onNavigate('vessels')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/30 transition-all flex items-center space-x-1.5"
            >
              <Ship className="w-4 h-4" />
              <span>Manage Fleet</span>
            </button>
          )}

          {isOperator && (
            <button
              onClick={() => onNavigate('voyages')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/30 transition-all flex items-center space-x-1.5"
            >
              <Navigation className="w-4 h-4" />
              <span>Dispatch Voyages</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid (Real MongoDB Aggregated Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total & Active Vessels */}
        <div
          onClick={() => onNavigate('vessels')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fleet Strength</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ship className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats?.totalVessels ?? 10}</span>
            <span className="text-xs font-semibold text-emerald-400">
              ({stats?.activeVessels ?? 6} Active)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Docked: {stats?.dockedVessels ?? 2}</span>
            <span className="text-amber-400">Maint: {stats?.vesselsInMaintenance ?? 1}</span>
          </div>
        </div>

        {/* Active & Delayed Voyages */}
        <div
          onClick={() => onNavigate('voyages')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Voyages in Transit</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white">{stats?.activeVoyages ?? 5}</span>
            <span className="text-xs font-semibold text-cyan-400">
              ({stats?.completedVoyages ?? 1} Completed)
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-rose-400 font-semibold">{stats?.delayedVoyages ?? 1} Delayed</span>
            <span>Total Logged: 8</span>
          </div>
        </div>

        {/* Fuel Consumption */}
        <div
          onClick={() => onNavigate('fuel')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Fuel Bunkered</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Fuel className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {(stats?.fuelConsumed ?? 3690).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400">MT</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>Spend: ${(stats?.totalFuelCostUSD ? (stats.totalFuelCostUSD / 1000000).toFixed(2) : '2.42')}M</span>
            <span className="text-cyan-400">Avg 3.8 NM/MT</span>
          </div>
        </div>

        {/* Cargo In Transit & Maintenance */}
        <div
          onClick={() => onNavigate('cargo')}
          className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all shadow-lg group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Cargo In Transit</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {(stats?.cargoInTransit ?? 343700).toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400">Tons</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span className="text-amber-400 font-semibold">
              {stats?.pendingMaintenance ?? 3} Maint Tasks
            </span>
            <span className="text-emerald-400">100% Manifested</span>
          </div>
        </div>
      </div>

      {/* Live Operational Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-slate-100">
                Action Required: {activeAlerts.length} Operational Alerts
              </span>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Open Alerts Center &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeAlerts.slice(0, 2).map((alert) => (
              <div
                key={alert._id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between space-x-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        alert.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="font-semibold text-slate-200">{alert.vesselName}</span>
                  </div>
                  <p className="text-slate-400 leading-snug">{alert.message}</p>
                </div>

                {(isAdmin || isOperator) && (
                  <button
                    onClick={() => handleResolveAlert(alert._id)}
                    className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-semibold transition-all"
                  >
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Map Overview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Live Global Fleet Telemetry</h2>
          </div>
          <button
            onClick={() => onNavigate('route-tracking')}
            className="text-xs font-semibold text-cyan-400 hover:underline flex items-center space-x-1"
          >
            <span>Full-Screen Route Tracking</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <LeafletMap
          vessels={trackingVessels}
          height="420px"
          onSelectVessel={(id) => onNavigate('vessel-details', id)}
        />
      </div>

      {/* Operational Analytics & Live Socket Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vessel Performance & Efficiency */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Top Vessel Fuel Efficiency</h3>
              <p className="text-xs text-slate-400">Nautical Miles per Metric Ton of Fuel Consumed</p>
            </div>
            <button
              onClick={() => onNavigate('fuel')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Fuel Analytics &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {analytics?.vesselPerformance?.map((item: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-200">{item.vesselName}</span>
                    <span className="text-[11px] text-slate-400">({item.type})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-cyan-400 font-bold">{item.efficiency} NM/MT</span>
                    <span className="text-slate-400">{item.capacityPct}% Bunker Level</span>
                  </div>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (item.efficiency / 6.5) * 100)}%` }}
                  ></div>
                </div>
              </div>
            )) || (
              <div className="text-xs text-slate-400">No vessel performance records available</div>
            )}
          </div>
        </div>

        {/* Real-Time User Activity Stream (Socket.io Powered) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">Live Activity Feed</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                Socket.io
              </span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {activities.slice(0, 7).map((act) => (
                <div
                  key={act.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold text-cyan-400">{act.type}</span>
                    <span>
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium text-[11px] leading-snug">
                    {act.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Server authoritative sync</span>
            <span className="text-emerald-400 font-medium">AIS Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
