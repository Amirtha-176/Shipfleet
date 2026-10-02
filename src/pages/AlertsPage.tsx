import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  ShieldAlert,
  Ship,
  Info,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { alertService } from '../services/api.ts';
import { IAlert } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface AlertsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = () => {
  const { isAdmin, isOperator } = useAuth();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [resolvedFilter, setResolvedFilter] = useState('false');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await alertService.getAll({
        resolved: resolvedFilter !== 'All' ? resolvedFilter : undefined,
        severity: severityFilter !== 'All' ? severityFilter : undefined
      });
      setAlerts(data);
    } catch (err) {
      showToast('error', 'Error', 'Failed to retrieve operational alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [resolvedFilter, severityFilter]);

  const handleResolve = async (id: string) => {
    try {
      await alertService.resolve(id);
      showToast('success', 'Alert Resolved', 'The operational alert has been acknowledged and marked resolved.');
      loadAlerts();
    } catch (err) {
      showToast('error', 'Action Denied', 'Could not resolve alert.');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
            <span>Operational Alert Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time anomalies, fuel depletion thresholds, delay variances &amp; technical maintenance urgencies.
          </p>
        </div>

        <button
          onClick={loadAlerts}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl text-xs text-slate-300">
        <div className="flex items-center space-x-3">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="false">Active / Unresolved Only</option>
            <option value="true">Resolved Archive</option>
            <option value="All">All Historical Alerts</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <span>Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="Warning">Warning</option>
            <option value="Info">Info</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No Alerts In Selected Category</h3>
            <p className="text-xs text-slate-400">All fleet systems operating within standard safety tolerances.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'Critical';
            const isWarning = alert.severity === 'Warning';

            return (
              <div
                key={alert._id}
                className={`p-5 rounded-2xl border transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
                  alert.resolved
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                    : isCritical
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : isWarning
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCritical
                        ? 'bg-rose-500/20 text-rose-400'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {isCritical ? (
                      <ShieldAlert className="w-5 h-5 animate-bounce" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="font-bold text-white text-sm">{alert.alertType}</span>
                      {alert.vesselName && (
                        <span className="text-cyan-400 font-semibold">• {alert.vesselName}</span>
                      )}
                    </div>

                    <p className="text-slate-300 leading-relaxed max-w-3xl">{alert.message}</p>

                    <div className="text-[11px] text-slate-500 flex items-center space-x-3 pt-0.5">
                      <span>Logged: {new Date(alert.createdAt).toLocaleString()}</span>
                      {alert.resolved && (
                        <span className="text-emerald-400 font-medium">
                          ✓ Resolved by {alert.resolvedByName || 'Operator'} ({new Date(alert.resolvedAt || '').toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!alert.resolved && (isAdmin || isOperator) && (
                  <button
                    onClick={() => handleResolve(alert._id)}
                    className="self-end sm:self-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-900/30 transition-all flex items-center space-x-1.5 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Resolve Alert</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
