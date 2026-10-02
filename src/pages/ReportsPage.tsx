import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Ship,
  Navigation,
  Fuel,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { dashboardService, reportService } from '../services/api.ts';
import { IDashboardStats } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface ReportsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = () => {
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    dashboardService.getStats().then(setStats).catch(() => {});
  }, []);

  const handleExport = (type: 'fleet' | 'voyages' | 'fuel' | 'maintenance', name: string) => {
    showToast('info', 'Export Started', `Generating official CSV report for ${name}`);
    window.location.href = reportService.exportCsvUrl(type);
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
          <FileSpreadsheet className="w-7 h-7 text-emerald-400" />
          <span>Operational Reports &amp; CSV Export</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Export standardized CSV datasets for maritime accounting, voyage audits, and classification bodies.
        </p>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fleet Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Ship className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Fleet Register &amp; Classification Report</h3>
                <span className="text-[11px] text-slate-400">Complete fleet inventory &amp; specifications</span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Contains all IMO registrations, vessel classifications, deadweight tonnage, gross tonnage, draft limits,
            bunker capacities, current fuel status, and class renewal dates.
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Registered Vessels: <strong className="text-white">{stats?.totalVessels ?? 10}</strong></span>
            <span>Active in Service: <strong className="text-emerald-400">{stats?.activeVessels ?? 6}</strong></span>
          </div>

          <button
            onClick={() => handleExport('fleet', 'Fleet Inventory')}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-blue-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Download Fleet CSV</span>
          </button>
        </div>

        {/* Voyage Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Voyage Schedule &amp; Delays Report</h3>
                <span className="text-[11px] text-slate-400">Voyage logistics, origins &amp; destinations</span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Contains voyage codes, departure dates, estimated vs actual arrivals, nautical miles logged, delay reasons,
            and assigned Master Captains.
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>In Transit: <strong className="text-cyan-400">{stats?.activeVoyages ?? 5}</strong></span>
            <span>Completed: <strong className="text-emerald-400">{stats?.completedVoyages ?? 1}</strong></span>
          </div>

          <button
            onClick={() => handleExport('voyages', 'Voyage Schedules')}
            className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Download Voyages CSV</span>
          </button>
        </div>

        {/* Fuel Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Fuel Bunkering &amp; Efficiency Report</h3>
                <span className="text-[11px] text-slate-400">Metric tonnage, unit rates &amp; efficiency</span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Contains all bunkering transaction dates, fuel grades (VLSFO, LNG, MGO), metric tons pumped, unit rates,
            total costs, ports, and calculated fuel efficiency (NM/MT).
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Total Fuel: <strong className="text-white">{(stats?.fuelConsumed ?? 3690).toLocaleString()} MT</strong></span>
            <span>Spend: <strong className="text-emerald-400">${((stats?.totalFuelCostUSD ?? 2450000) / 1000000).toFixed(2)}M</strong></span>
          </div>

          <button
            onClick={() => handleExport('fuel', 'Fuel Bunkering')}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Download Fuel CSV</span>
          </button>
        </div>

        {/* Maintenance Report */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Vessel Maintenance &amp; Class Survey Log</h3>
                <span className="text-[11px] text-slate-400">Technical work orders &amp; expenditures</span>
              </div>
            </div>
          </div>

          <p className="text-slate-300 leading-relaxed">
            Contains historical and scheduled work orders, equipment descriptions, priorities, technical contractors,
            parts deployed, and verified costs.
          </p>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>Pending Work Orders: <strong className="text-amber-400">{stats?.pendingMaintenance ?? 3}</strong></span>
            <span>Total Cost: <strong className="text-white">${(stats?.totalMaintenanceCost ?? 132100).toLocaleString()}</strong></span>
          </div>

          <button
            onClick={() => handleExport('maintenance', 'Maintenance Records')}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all flex items-center justify-center space-x-2 shadow-lg shadow-rose-900/30"
          >
            <Download className="w-4 h-4" />
            <span>Download Maintenance CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};
