import React, { useState, useEffect } from 'react';
import {
  Navigation,
  Plus,
  Search,
  Filter,
  Package,
  Calendar,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { voyageService, vesselService, portService, cargoService } from '../services/api.ts';
import { IVoyage, IVessel, IPort, ICargo } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface VoyagesPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const VoyagesPage: React.FC<VoyagesPageProps> = ({ onNavigate }) => {
  const { isAdmin, isOperator, isViewer } = useAuth();
  const { showToast } = useToast();

  const [voyages, setVoyages] = useState<IVoyage[]>([]);
  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [ports, setPorts] = useState<IPort[]>([]);
  const [availableCargo, setAvailableCargo] = useState<ICargo[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Voyage Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    vesselId: '',
    originPort: 'Port of Rotterdam',
    destinationPort: 'Port of Singapore',
    departureDate: new Date().toISOString().split('T')[0],
    estimatedArrival: new Date(Date.now() + 1000 * 60 * 60 * 24 * 16).toISOString().split('T')[0],
    distanceNauticalMiles: 8450,
    cargoDescription: 'Commercial Containerized Cargo Manifest'
  });

  // Status Change Modal
  const [selectedVoyageForStatus, setSelectedVoyageForStatus] = useState<IVoyage | null>(null);
  const [newStatus, setNewStatus] = useState('In Transit');
  const [delayReason, setDelayReason] = useState('');

  // Assign Cargo Modal
  const [selectedVoyageForCargo, setSelectedVoyageForCargo] = useState<IVoyage | null>(null);
  const [selectedCargoId, setSelectedCargoId] = useState('');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [voyagesData, vesselsData, portsData, cargoData] = await Promise.all([
        voyageService.getAll({ status: statusFilter !== 'All' ? statusFilter : undefined }),
        vesselService.getAll(),
        portService.getAll(),
        cargoService.getAll()
      ]);

      setVoyages(voyagesData);
      setVessels(vesselsData);
      setPorts(portsData);
      setAvailableCargo(cargoData);
      if (vesselsData.length > 0 && !formData.vesselId) {
        setFormData((prev) => ({ ...prev, vesselId: vesselsData[0]._id }));
      }
    } catch (err) {
      showToast('error', 'Sync Failed', 'Failed to retrieve voyage schedules.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleCreateVoyage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vesselId) {
      showToast('error', 'Validation Error', 'Please select an assigned vessel.');
      return;
    }

    setIsSubmitting(true);
    try {
      await voyageService.create(formData);
      showToast('success', 'Voyage Scheduled', 'New ocean voyage dispatched and saved to database.');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Schedule Error', err.response?.data?.message || 'Failed to create voyage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoyageForStatus) return;

    try {
      await voyageService.updateStatus(selectedVoyageForStatus._id, newStatus, delayReason);
      showToast('success', 'Status Updated', `Voyage ${selectedVoyageForStatus.voyageId} set to ${newStatus}`);
      setSelectedVoyageForStatus(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.response?.data?.message || 'Failed to update voyage status.');
    }
  };

  const handleAssignCargo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoyageForCargo || !selectedCargoId) return;

    try {
      await voyageService.assignCargo(selectedVoyageForCargo._id, selectedCargoId);
      showToast('success', 'Cargo Assigned', `Assigned cargo manifest to voyage ${selectedVoyageForCargo.voyageId}`);
      setSelectedVoyageForCargo(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Assignment Failed', err.response?.data?.message || 'Failed to link cargo.');
    }
  };

  const filteredVoyages = voyages.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.voyageId.toLowerCase().includes(q) ||
      v.vesselName.toLowerCase().includes(q) ||
      v.originPort.toLowerCase().includes(q) ||
      v.destinationPort.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Navigation className="w-7 h-7 text-cyan-400" />
            <span>Voyage Management &amp; Scheduling</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global maritime trade lanes, estimated arrivals, ocean route status &amp; cargo manifest attachments.
          </p>
        </div>

        {(isAdmin || isOperator) && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Voyage</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voyages, vessels, ports..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="In Transit">In Transit</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Planned">Planned</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        </div>
      </div>

      {/* Voyage Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVoyages.map((vyg) => {
          const progressPct = Math.min(100, Math.round((vyg.distanceCovered / vyg.distanceNauticalMiles) * 100));
          const badgeClass =
            vyg.status === 'In Transit'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              : vyg.status === 'Completed'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : vyg.status === 'Delayed'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-blue-500/20 text-blue-300 border-blue-500/30';

          return (
            <div
              key={vyg._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-base text-white">{vyg.voyageId}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                      {vyg.status}
                    </span>
                  </div>
                  <div className="text-xs text-blue-400 font-semibold mt-0.5">{vyg.vesselName}</div>
                </div>

                <div className="text-right text-xs">
                  <div className="font-mono text-cyan-400 font-bold">{vyg.distanceNauticalMiles.toLocaleString()} NM</div>
                  <div className="text-[10px] text-slate-400">Total Distance</div>
                </div>
              </div>

              {/* Route */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Origin Port</div>
                  <div className="font-bold text-slate-200">{vyg.originPort}</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Dep: {new Date(vyg.departureDate).toLocaleDateString()}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-cyan-400 mx-2 flex-shrink-0" />

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Destination</div>
                  <div className="font-bold text-slate-200">{vyg.destinationPort}</div>
                  <div className="text-[10px] text-cyan-400 font-mono">
                    ETA: {new Date(vyg.estimatedArrival).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Covered: {vyg.distanceCovered.toLocaleString()} NM</span>
                  <span className="font-semibold text-slate-200">{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  ></div>
                </div>
              </div>

              {vyg.delayReason && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Delay Notice: {vyg.delayReason}</span>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Assigned Cargo: <strong>{vyg.assignedCargoIds?.length || 0} manifests</strong>
                </span>

                {(isAdmin || isOperator) && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedVoyageForCargo(vyg);
                        setSelectedCargoId('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium flex items-center space-x-1"
                      title="Assign Cargo to Voyage"
                    >
                      <Package className="w-3 h-3 text-cyan-400" />
                      <span>Assign Cargo</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedVoyageForStatus(vyg);
                        setNewStatus(vyg.status);
                        setDelayReason(vyg.delayReason || '');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-semibold"
                    >
                      Update Status
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Voyage Modal (Operator & Admin) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
              <Navigation className="w-5 h-5 text-blue-400" />
              <span>Create New Ocean Voyage</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Dispatch vessel along international route waypoints and assign arrival deadlines.
            </p>

            <form onSubmit={handleCreateVoyage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Vessel *</label>
                <select
                  required
                  value={formData.vesselId}
                  onChange={(e) => setFormData({ ...formData, vesselId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Assigned Vessel --</option>
                  {vessels.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.vesselType} • {v.imoNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Origin Port</label>
                  <select
                    value={formData.originPort}
                    onChange={(e) => setFormData({ ...formData, originPort: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ports.map((p) => (
                      <option key={p._id} value={p.name}>
                        {p.name} ({p.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Destination Port</label>
                  <select
                    value={formData.destinationPort}
                    onChange={(e) => setFormData({ ...formData, destinationPort: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ports.map((p) => (
                      <option key={p._id} value={p.name}>
                        {p.name} ({p.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Arrival (ETA)</label>
                  <input
                    type="date"
                    required
                    value={formData.estimatedArrival}
                    onChange={(e) => setFormData({ ...formData, estimatedArrival: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Total Distance (Nautical Miles)</label>
                <input
                  type="number"
                  value={formData.distanceNauticalMiles}
                  onChange={(e) => setFormData({ ...formData, distanceNauticalMiles: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">General Cargo Description</label>
                <input
                  type="text"
                  value={formData.cargoDescription}
                  onChange={(e) => setFormData({ ...formData, cargoDescription: e.target.value })}
                  placeholder="e.g. 18,000 TEU Automotive and Electronics"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/30 flex items-center space-x-2"
                >
                  {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                  <span>Dispatch Voyage</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Voyage Status Modal */}
      {selectedVoyageForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setSelectedVoyageForStatus(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1">
              Update Voyage Status: {selectedVoyageForStatus.voyageId}
            </h3>
            <p className="text-slate-400 mb-4">
              Vessel: <strong>{selectedVoyageForStatus.vesselName}</strong>
            </p>

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Voyage Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Planned">Planned</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Arrived">Arrived</option>
                  <option value="Completed">Completed</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {newStatus === 'Delayed' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Reason for Delay</label>
                  <textarea
                    rows={3}
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                    placeholder="Enter weather conditions, port congestion, or mechanical holdup details..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedVoyageForStatus(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Cargo Modal (Follows Diagram) */}
      {selectedVoyageForCargo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-xs">
            <button
              onClick={() => setSelectedVoyageForCargo(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-1 flex items-center space-x-2">
              <Package className="w-5 h-5 text-cyan-400" />
              <span>Assign Cargo to Voyage</span>
            </h3>
            <p className="text-slate-400 mb-4">
              Voyage: <strong>{selectedVoyageForCargo.voyageId}</strong> ({selectedVoyageForCargo.originPort} ➔ {selectedVoyageForCargo.destinationPort})
            </p>

            <form onSubmit={handleAssignCargo} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Cargo Manifest</label>
                <select
                  required
                  value={selectedCargoId}
                  onChange={(e) => setSelectedCargoId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose Cargo to Load --</option>
                  {availableCargo.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.cargoId} • {c.description} ({c.weightTons.toLocaleString()} Tons)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedVoyageForCargo(null)}
                  className="px-4 py-2 rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedCargoId}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold disabled:opacity-50"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
