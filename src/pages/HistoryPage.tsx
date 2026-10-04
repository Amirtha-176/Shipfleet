import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  Navigation,
  Package,
  Fuel,
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { auditService, userService } from '../services/api.ts';
import { IAuditLog, IUser } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface HistoryPageProps {
  onNavigate?: (page: string, param?: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('All');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (selectedUserFilter !== 'All') params.userId = selectedUserFilter;
      if (selectedEntityFilter !== 'All') params.entity = selectedEntityFilter;

      const [logsData, usersData] = await Promise.all([
        auditService.getAll(params),
        isAdmin ? userService.getAll().catch(() => []) : Promise.resolve([])
      ]);

      setLogs(logsData);
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to retrieve operational activity history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [selectedUserFilter, selectedEntityFilter]);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.description.toLowerCase().includes(q) ||
      log.userName.toLowerCase().includes(q) ||
      log.entity.toLowerCase().includes(q)
    );
  });

  const getEntityIcon = (entity: string) => {
    switch (entity.toLowerCase()) {
      case 'voyage':
        return <Navigation className="w-4 h-4 text-cyan-400" />;
      case 'cargo':
        return <Package className="w-4 h-4 text-emerald-400" />;
      case 'fuelrecord':
      case 'fuel':
        return <Fuel className="w-4 h-4 text-amber-400" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-rose-400" />;
      case 'user':
        return <User className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('SCHEDULE') || action.includes('LOG')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    }
    if (action.includes('UPDATE') || action.includes('STATUS')) {
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
    if (action.includes('DELETE')) {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    }
    return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <History className="w-7 h-7 text-cyan-400" />
            <span>Activity Histories &amp; Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Complete multi-user immutable event stream for all fleet voyages, fuel records, cargo, and maintenance.'
              : 'Your personal operational event stream and history of submitted maritime dispatches.'}
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh History</span>
        </button>
      </div>

      {/* Role Scoping Notice */}
      <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <div>
            <div className="font-bold text-white">
              {isAdmin ? 'Administrator Mode (All Users History)' : `Logged in as ${user?.name} (User Mode)`}
            </div>
            <div className="text-slate-300 text-[11px] mt-0.5">
              {isAdmin
                ? 'Displaying system-wide operational activity across all users and fleet personnel.'
                : 'Data Isolation Active: You are viewing only the history records of your account. Records uploaded are permanently tracked.'}
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-block px-2.5 py-1 rounded-full font-mono text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
          MongoDB Stream Active
        </span>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, description, user..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs text-slate-300">
          {/* Entity Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Entity:</span>
            <select
              value={selectedEntityFilter}
              onChange={(e) => setSelectedEntityFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="All">All Operations</option>
              <option value="Voyage">Voyages</option>
              <option value="Cargo">Cargo</option>
              <option value="FuelRecord">Fuel Bunkering</option>
              <option value="Maintenance">Maintenance</option>
              <option value="User">User Accounts</option>
            </select>
          </div>

          {/* User Filter (Admin only) */}
          {isAdmin && users.length > 0 && (
            <div className="flex items-center space-x-2">
              <span>User:</span>
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="All">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Triggered By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <div className="font-semibold text-slate-300">No history records found</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {search ? 'Try clearing your search query' : 'Your activity will be logged here as you create or update fleet data.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5">
                        {getEntityIcon(log.entity)}
                        <span className="font-semibold text-slate-200">{log.entity}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-medium max-w-md">
                      {log.description}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-white">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
