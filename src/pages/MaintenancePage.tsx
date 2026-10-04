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
  ShieldAlert,
  Lock,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { maintenanceService, vesselService, userService } from '../services/api.ts';
import { IMaintenance, IVessel, MaintenancePriority, MaintenanceType, IUser } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface MaintenancePageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = () => {
  const { isAdmin, isUser } = useAuth();
  const { showToast } = useToast();

  const [records, setRecords] = useState<IMaintenance[]>([]);
  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Delete modal
  const [recordToDelete, setRecordToDelete] = useState<IMaintenance | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const [maintData, vesselsData, usersData] = await Promise.all([
        maintenanceService.getAll({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
          ...(isAdmin && userFilter !== 'All' ? { userId: userFilter } as any : {})
        }),
        vesselService.getAll(),
        isAdmin ? userService.getAll().catch(() => []) : Promise.resolve([])
      ]);
      setRecords(maintData);
      setVessels(vesselsData);
      if (usersData && usersData.length > 0) {
        setUsers(usersData);
      }
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
  }, [statusFilter, priorityFilter, userFilter]);

  const handleDeleteMaintenance = async () => {
    if (!recordToDelete) return;
    try {
      setIsDeleting(true);
      await maintenanceService.delete(recordToDelete._id);
      showToast('success', 'Deleted', `Maintenance record removed.`);
      setRecordToDelete(null);
      loadMaintenance();
    } catch (err: any) {
      showToast('error', 'Delete Denied', err.response?.data?.message || 'Could not delete maintenance record.');
    } finally {
      setIsDeleting(false);
    }
  };

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

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-900/40 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Maintenance</span>
        </button>
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
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

          {isAdmin && users.length > 0 && (
            <div className="flex items-center space-x-2">
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>Created By:</span>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
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

      {/* Maintenance Work Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No maintenance tasks found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Order / Description</th>
                  <th className="py-3.5 px-4">Vessel</th>
                  <th className="py-3.5 px-4">Type &amp; Priority</th>
                  <th className="py-3.5 px-4">Schedule Dates</th>
                  <th className="py-3.5 px-4">Technician / Yard</th>
                  <th className="py-3.5 px-4">Cost (USD)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Scheduled By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {records.map((m) => {
                  const priorityBadge =
                    m.priority === 'Critical'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : m.priority === 'High'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

                  return (
                    <tr key={m._id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-cyan-400 font-bold text-xs">{m.maintenanceId}</div>
                        <div className="font-semibold text-white mt-0.5">{m.description}</div>
                        {m.notes && <div className="text-[10px] text-slate-400 italic mt-0.5 max-w-xs truncate">"{m.notes}"</div>}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-blue-400">
                        {m.vesselName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityBadge}`}>
                            {m.priority}
                          </span>
                          <span className="text-[10px] text-slate-300 font-medium">
                            {m.maintenanceType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-200">{m.startDate}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Exp: {m.expectedCompletion}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">{m.technician}</div>
                        {m.partsUsed && m.partsUsed.length > 0 && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {m.partsUsed.join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ${m.costUSD.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            m.status === 'Completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.status === 'In Progress'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{m.createdByName || 'Standard User'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{m.createdByEmail || 'user@shipfleet.com'}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {m.status !== 'Completed' ? (
                            <button
                              onClick={() => handleComplete(m)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-semibold flex items-center space-x-1 transition-all text-[11px]"
                              title="Mark Task Completed"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Done</span>
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-semibold text-[10px] flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Certified</span>
                            </span>
                          )}

                          {isAdmin ? (
                            <button
                              onClick={() => setRecordToDelete(m)}
                              className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete Maintenance Record (Admin Only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 inline-flex items-center space-x-1 pl-1" title="Upload permanent: only admin can delete">
                              <Lock className="w-3 h-3 text-slate-500" />
                              <span>Protected</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog (Admin Only) */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="Delete Maintenance Record"
        message={`Are you sure you want to permanently delete work order ${recordToDelete?.maintenanceId} for ${recordToDelete?.vesselName}?`}
        confirmLabel="Delete Record"
        onConfirm={handleDeleteMaintenance}
        onCancel={() => setRecordToDelete(null)}
        isLoading={isDeleting}
      />

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
