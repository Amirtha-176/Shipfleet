import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Truck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { cargoService, voyageService } from '../services/api.ts';
import { ICargo, IVoyage, CargoStatus } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface CargoPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const CargoPage: React.FC<CargoPageProps> = () => {
  const { isAdmin, isOperator, isViewer } = useAuth();
  const { showToast } = useToast();

  const [cargoList, setCargoList] = useState<ICargo[]>([]);
  const [voyages, setVoyages] = useState<IVoyage[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<ICargo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete
  const [cargoToDelete, setCargoToDelete] = useState<ICargo | null>(null);

  const [formData, setFormData] = useState({
    cargoType: 'Containerized' as any,
    description: '',
    weightTons: 10000,
    containerCount: 500,
    shipper: '',
    consignee: '',
    loadingPort: 'Port of Rotterdam',
    dischargePort: 'Port of Singapore',
    loadingDate: new Date().toISOString().split('T')[0],
    expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
    voyageId: ''
  });

  const loadCargo = async () => {
    try {
      setIsLoading(true);
      const [cargoData, voyagesData] = await Promise.all([
        cargoService.getAll({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          type: typeFilter !== 'All' ? typeFilter : undefined,
          search: search || undefined
        }),
        voyageService.getAll()
      ]);
      setCargoList(cargoData);
      setVoyages(voyagesData);
    } catch (err) {
      showToast('error', 'Sync Failed', 'Failed to retrieve cargo manifests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCargo();
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    const t = setTimeout(loadCargo, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingCargo(null);
    setFormData({
      cargoType: 'Containerized',
      description: '',
      weightTons: 12000,
      containerCount: 600,
      shipper: '',
      consignee: '',
      loadingPort: 'Port of Rotterdam',
      dischargePort: 'Port of Singapore',
      loadingDate: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
      voyageId: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCargo) {
        await cargoService.update(editingCargo._id, formData);
        showToast('success', 'Manifest Updated', `Cargo ${editingCargo.cargoId} details saved.`);
      } else {
        await cargoService.create(formData);
        showToast('success', 'Manifest Registered', 'New cargo booking created and saved.');
      }
      setIsModalOpen(false);
      loadCargo();
    } catch (err: any) {
      showToast('error', 'Save Error', err.response?.data?.message || 'Failed to save cargo manifest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!cargoToDelete) return;
    try {
      await cargoService.delete(cargoToDelete._id);
      showToast('success', 'Deleted', `Manifest ${cargoToDelete.cargoId} removed.`);
      setCargoToDelete(null);
      loadCargo();
    } catch (err) {
      showToast('error', 'Error', 'Failed to delete cargo manifest.');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Package className="w-7 h-7 text-emerald-400" />
            <span>Cargo Management &amp; Manifests</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Commercial bills of lading, hazardous cargo ratings, containerized consignments &amp; customs release.
          </p>
        </div>

        {(isAdmin || isOperator) && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Cargo Manifest</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shipper, consignee, cargo..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs text-slate-300">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Booked">Booked</option>
              <option value="Loaded">Loaded</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Cargo Types</option>
              <option value="Containerized">Containerized</option>
              <option value="Bulk Grain">Bulk Grain</option>
              <option value="Crude Oil">Crude Oil</option>
              <option value="Refined Petroleum">Refined Petroleum</option>
              <option value="Liquefied Gas">Liquefied Gas</option>
              <option value="Heavy Machinery">Heavy Machinery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cargo Manifest Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cargoList.map((c) => {
          const statusColor =
            c.status === 'In Transit'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
              : c.status === 'Delivered'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/30';

          return (
            <div
              key={c._id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5 hover:border-slate-700 transition-all text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-cyan-400 font-bold text-sm">{c.cargoId}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-semibold text-[10px]">
                      {c.cargoType}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusColor}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm mt-1">{c.description}</div>
                </div>

                <div className="text-right">
                  <div className="font-black text-white text-base">{c.weightTons.toLocaleString()} MT</div>
                  {c.containerCount && (
                    <div className="text-[11px] text-slate-400 font-semibold">{c.containerCount} Containers</div>
                  )}
                </div>
              </div>

              {/* Shippers */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Shipper:</span>
                  <span className="font-semibold text-slate-200">{c.shipper}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Consignee:</span>
                  <span className="font-semibold text-slate-200">{c.consignee}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 text-[10px]">
                  <span className="text-slate-400">Routing:</span>
                  <span className="text-cyan-400 font-medium">
                    {c.loadingPort} ➔ {c.dischargePort}
                  </span>
                </div>
              </div>

              {/* Voyage attachment & actions */}
              <div className="flex items-center justify-between pt-1 text-slate-400 text-[11px]">
                <div>
                  {c.voyageCode ? (
                    <span>
                      Voyage: <strong className="text-white">{c.voyageCode}</strong> ({c.vesselName})
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">Unassigned to voyage</span>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setCargoToDelete(c)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400"
                    title="Delete Manifest"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Cargo Modal */}
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
              <Package className="w-5 h-5 text-emerald-400" />
              <span>Create Cargo Manifest</span>
            </h2>
            <p className="text-slate-400 mb-6">
              Enter bill of lading specifications, tonnage, shipper and consignee entities.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Cargo Description *</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Semiconductor Fabrication Components"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cargo Type</label>
                  <select
                    value={formData.cargoType}
                    onChange={(e) => setFormData({ ...formData, cargoType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Containerized">Containerized</option>
                    <option value="Bulk Grain">Bulk Grain</option>
                    <option value="Crude Oil">Crude Oil</option>
                    <option value="Refined Petroleum">Refined Petroleum</option>
                    <option value="Liquefied Gas">Liquefied Gas</option>
                    <option value="Heavy Machinery">Heavy Machinery</option>
                    <option value="Refrigerated">Refrigerated</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Weight (Metric Tons) *</label>
                  <input
                    type="number"
                    required
                    value={formData.weightTons}
                    onChange={(e) => setFormData({ ...formData, weightTons: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Shipper *</label>
                  <input
                    type="text"
                    required
                    value={formData.shipper}
                    onChange={(e) => setFormData({ ...formData, shipper: e.target.value })}
                    placeholder="e.g. Siemens Global Logistics"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Consignee *</label>
                  <input
                    type="text"
                    required
                    value={formData.consignee}
                    onChange={(e) => setFormData({ ...formData, consignee: e.target.value })}
                    placeholder="e.g. Tokyo Electron Supply"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Loading Port</label>
                  <input
                    type="text"
                    value={formData.loadingPort}
                    onChange={(e) => setFormData({ ...formData, loadingPort: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Discharge Port</label>
                  <input
                    type="text"
                    value={formData.dischargePort}
                    onChange={(e) => setFormData({ ...formData, dischargePort: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assign to Active Voyage (Optional)</label>
                <select
                  value={formData.voyageId}
                  onChange={(e) => setFormData({ ...formData, voyageId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No Voyage Assigned (Booked) --</option>
                  {voyages.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.voyageId} ({v.vesselName} • {v.originPort} ➔ {v.destinationPort})
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!cargoToDelete}
        title="Delete Cargo Manifest"
        message={`Are you sure you want to remove cargo manifest "${cargoToDelete?.cargoId}" (${cargoToDelete?.description})?`}
        confirmLabel="Delete Manifest"
        onConfirm={handleDelete}
        onCancel={() => setCargoToDelete(null)}
      />
    </div>
  );
};
