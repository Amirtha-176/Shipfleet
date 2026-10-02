import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Search,
  Filter,
  X,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { maintenanceService, vesselService } from '../services/api.ts';
import { IMaintenance, IVessel, MaintenancePriority, MaintenanceType } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface MaintenancePageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<IMaintenance[]>([]);
  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Schedule Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vesselId: '',
    maintenanceType: 'Preventive' as MaintenanceType,
    description: '',
    priority: 'Medium' as MaintenancePriority,
    startDate: new Date().toISOString().split('T')[0],
    expectedCompletion: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0],
    technician: 'ClassNK Certified Technicians',
    costUSD: 14000,
    partsUsed: 'Cylinder Liners, Gaskets, Filter Assemblies',
    notes: ''
  });

  const loadMaintenance = async () => {
    try {
      setIsLoading(true);
      const [maintData, vesselsData] = await Promise.all([
        maintenanceService.getAll({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined
        }),
        vesselService.getAll()
      ]);
      setRecords(maintData);
      setVessels(vesselsData);
      if (vesselsData.length > 0 && !formData.vesselId) {
        setFormData((prev) => ({ ...prev, vesselId: vesselsData[0]._id }));
      }
    } catch (err) {
      showToast('error', 'Sync Failed', 'Failed to retrieve maintenance records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, [statusFilter, priorityFilter]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vesselId || !formData.description) {
      showToast('error', 'Validation Error', 'Vessel and description are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await maintenanceService.create({
        ...formData,
        partsUsed: formData.partsUsed.split(',').map((p) => p.trim())
      });
      showToast('success', 'Maintenance Scheduled', 'Work order registered and queued.');
      setIsModalOpen(false);
      loadMaintenance();
    } catch (err: any) {
      showToast('error', 'Scheduling Failed', err.response?.data?.message || 'Could not schedule maintenance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (m: IMaintenance) => {
    try {
      await maintenanceService.update(m._id, {
        status: 'Completed',
        actualCompletion: new Date().toISOString().split('T')[0]
      });
      showToast('success', 'Task Completed', `Maintenance ${m.maintenanceId} marked as completed.`);
      loadMaintenance();
    } catch (err) {
      showToast('error', 'Update Failed', 'Failed to update maintenance task.');
    }
  };

  const upcomingCount = records.filter((r) => r.status === 'Scheduled').length;
  const inProgressCount = records.filter((r) => r.status === 'In Progress').length;
  const completedCount = records.filter((r) => r.status === 'Completed').length;
  const totalCost = records.reduce((sum, r) => sum + r.costUSD, 0);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Wrench className="w-7 h-7 text-rose-400" />
            <span>Vessel Maintenance &amp; Class Surveys</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Engine overhauls, drydock cycles, propeller servicing &amp; SOLAS compliance certifications.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-900/40 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Maintenance</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Active Work Orders</div>
          <div className="text-3xl font-black text-amber-400">{inProgressCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently being serviced</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Upcoming Scheduled</div>
          <div className="text-3xl font-black text-cyan-400">{upcomingCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting port arrival</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Completed Cycles</div>
          <div className="text-3xl font-black text-emerald-400">{completedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Certified with Class surveys</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Maintenance Spend</div>
          <div className="text-3xl font-black text-white">${totalCost.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Parts &amp; Specialist Labor</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl text-xs text-slate-300">
        <div className="flex items-center space-x-3">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <span>Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Work Orders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {records.map((m) => {
          const priorityBadge =
            m.priority === 'Critical'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : m.priority === 'High'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

          return (
            <div
              key={m._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-cyan-400 font-bold">{m.maintenanceId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityBadge}`}>
                      {m.priority} Priority
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {m.maintenanceType}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm mt-1">{m.description}</h4>
                  <div className="text-blue-400 font-semibold mt-0.5">{m.vesselName}</div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-emerald-400 text-base">${m.costUSD.toLocaleString()}</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {m.status}
                  </span>
                </div>
              </div>

              {/* Details box */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                <div>Technician / Class: <strong className="text-slate-200">{m.technician}</strong></div>
                <div>Schedule: {m.startDate} ➔ Expected {m.expectedCompletion}</div>
                <div>Parts: <span className="text-slate-300">{m.partsUsed?.join(', ')}</span></div>
                {m.notes && <div className="text-slate-400 italic mt-1">"{m.notes}"</div>}
              </div>

              {isAdmin && m.status !== 'Completed' && (
                <div className="flex justify-end pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleComplete(m)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-semibold flex items-center space-x-1.5 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark Completed</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule Maintenance Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 text-xs">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
              <Wrench className="w-5 h-5 text-rose-400" />
              <span>Schedule Vessel Maintenance</span>
            </h2>
            <p className="text-slate-400 mb-6">
              Assign inspection teams, drydock work orders, and replacement equipment.
            </p>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Vessel *</label>
                <select
                  required
                  value={formData.vesselId}
                  onChange={(e) => setFormData({ ...formData, vesselId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {vessels.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.vesselType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Main Engine Fuel Pump & Governor Overhaul"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Type</label>
                  <select
                    value={formData.maintenanceType}
                    onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Preventive">Preventive</option>
                    <option value="Corrective">Corrective</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expected Completion</label>
                  <input
                    type="date"
                    required
                    value={formData.expectedCompletion}
                    onChange={(e) => setFormData({ ...formData, expectedCompletion: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Estimated Cost (USD)</label>
                <input
                  type="number"
                  value={formData.costUSD}
                  onChange={(e) => setFormData({ ...formData, costUSD: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Technician / Survey Body</label>
                <input
                  type="text"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Parts &amp; Components Used (comma separated)</label>
                <input
                  type="text"
                  value={formData.partsUsed}
                  onChange={(e) => setFormData({ ...formData, partsUsed: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Confirm Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
