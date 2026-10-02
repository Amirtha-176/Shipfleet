import React, { useState, useEffect } from 'react';
import {
  Ship,
  Plus,
  Search,
  Filter,
  Download,
  Edit2,
  Trash2,
  ExternalLink,
  Anchor,
  Compass,
  Fuel,
  X,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { vesselService, reportService } from '../services/api.ts';
import { IVessel, VesselStatus } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface VesselsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const VesselsPage: React.FC<VesselsPageProps> = ({ onNavigate }) => {
  const { isAdmin, isViewer } = useAuth();
  const { showToast } = useToast();

  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVessel, setEditingVessel] = useState<IVessel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm State
  const [vesselToDelete, setVesselToDelete] = useState<IVessel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    imoNumber: '',
    vesselType: 'Container Ship' as IVessel['vesselType'],
    flag: 'Panama',
    owner: 'FleetOps Global Ocean Line',
    captain: '',
    capacity: 20000,
    deadweightTonnage: 210000,
    grossTonnage: 195000,
    length: 399,
    width: 61,
    draft: 16.5,
    engineType: 'MAN B&W 11G95ME-C9.5',
    enginePower: 75000,
    fuelType: 'VLSFO' as IVessel['fuelType'],
    fuelCapacity: 12000,
    currentFuel: 8500,
    status: 'Active' as VesselStatus,
    yearBuilt: 2022,
    portOrArea: 'Port of Rotterdam',
    lat: 51.95,
    lng: 4.13
  });

  const loadVessels = async () => {
    try {
      setIsLoading(true);
      const data = await vesselService.getAll({
        search: search || undefined,
        status: statusFilter !== 'All' ? statusFilter : undefined,
        type: typeFilter !== 'All' ? typeFilter : undefined
      });
      setVessels(data);
    } catch (err) {
      showToast('error', 'Error', 'Failed to retrieve vessels from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVessels();
  }, [statusFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadVessels();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setEditingVessel(null);
    setFormData({
      name: '',
      imoNumber: '',
      vesselType: 'Container Ship',
      flag: 'Panama',
      owner: 'FleetOps Maritime Lines',
      captain: '',
      capacity: 15000,
      deadweightTonnage: 140000,
      grossTonnage: 130000,
      length: 320,
      width: 48,
      draft: 14,
      engineType: 'MAN B&W 8G80ME-C9',
      enginePower: 45000,
      fuelType: 'VLSFO',
      fuelCapacity: 6000,
      currentFuel: 4200,
      status: 'Active',
      yearBuilt: 2023,
      portOrArea: 'Singapore Anchorage',
      lat: 1.28,
      lng: 103.85
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vessel: IVessel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVessel(vessel);
    setFormData({
      name: vessel.name,
      imoNumber: vessel.imoNumber,
      vesselType: vessel.vesselType,
      flag: vessel.flag,
      owner: vessel.owner,
      captain: vessel.captain,
      capacity: vessel.capacity,
      deadweightTonnage: vessel.deadweightTonnage,
      grossTonnage: vessel.grossTonnage,
      length: vessel.length,
      width: vessel.width,
      draft: vessel.draft,
      engineType: vessel.engineType,
      enginePower: vessel.enginePower,
      fuelType: vessel.fuelType,
      fuelCapacity: vessel.fuelCapacity,
      currentFuel: vessel.currentFuel,
      status: vessel.status,
      yearBuilt: vessel.yearBuilt,
      portOrArea: vessel.currentLocation.portOrArea,
      lat: vessel.currentLocation.lat,
      lng: vessel.currentLocation.lng
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingVessel) {
        await vesselService.update(editingVessel._id, formData);
        showToast('success', 'Vessel Updated', `Saved changes to ${formData.name}`);
      } else {
        await vesselService.create(formData);
        showToast('success', 'Vessel Registered', `MV ${formData.name} added to fleet`);
      }
      setIsModalOpen(false);
      loadVessels();
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.response?.data?.message || 'Could not save vessel record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!vesselToDelete) return;
    setIsDeleting(true);

    try {
      await vesselService.delete(vesselToDelete._id);
      showToast('success', 'Vessel Decommissioned', `${vesselToDelete.name} has been removed from fleet records.`);
      setVesselToDelete(null);
      loadVessels();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.response?.data?.message || 'Failed to delete vessel');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Ship className="w-7 h-7 text-blue-400" />
            <span>Fleet Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Registered commercial vessels, propulsion engines, bunker capacities &amp; classification profiles.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={reportService.exportCsvUrl('fleet')}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fleet CSV</span>
          </a>

          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Vessel</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vessel name, IMO, captain, flag..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="In Transit">In Transit</option>
              <option value="Docked">Docked</option>
              <option value="Active">Active</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Idle">Idle</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-300">
            <span>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Types</option>
              <option value="Container Ship">Container Ship</option>
              <option value="Bulk Carrier">Bulk Carrier</option>
              <option value="Oil Tanker">Oil Tanker</option>
              <option value="LNG Carrier">LNG Carrier</option>
              <option value="General Cargo">General Cargo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vessels Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading fleet vessels from MongoDB...
          </div>
        ) : vessels.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Anchor className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">No Vessels Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No registered fleet vessels matched your query criteria.
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenAdd}
                className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all"
              >
                Register First Vessel
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Vessel / IMO</th>
                  <th className="py-3.5 px-4">Type / Flag</th>
                  <th className="py-3.5 px-4">Captain</th>
                  <th className="py-3.5 px-4">Current Location</th>
                  <th className="py-3.5 px-4">Fuel Reserve</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {vessels.map((vsl) => {
                  const fuelPct = Math.round((vsl.currentFuel / vsl.fuelCapacity) * 100);
                  const statusBadgeColor =
                    vsl.status === 'In Transit'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      : vsl.status === 'Docked'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : vsl.status === 'Maintenance'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : vsl.status === 'Active'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-slate-700 text-slate-300 border-slate-600';

                  return (
                    <tr
                      key={vsl._id}
                      onClick={() => onNavigate('vessel-details', vsl._id)}
                      className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4">
                        <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                          {vsl.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {vsl.imoNumber} • {vsl.vesselId}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-200 font-medium">{vsl.vesselType}</div>
                        <div className="text-[11px] text-slate-400">Flag: {vsl.flag}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-300 font-medium">
                        {vsl.captain || 'Unassigned'}
                      </td>

                      <td className="py-4 px-4">
                        <div className="text-slate-200 font-medium truncate max-w-xs">
                          {vsl.currentLocation.portOrArea}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {vsl.currentLocation.speedKnots} kts • {vsl.currentLocation.lat.toFixed(2)}°, {vsl.currentLocation.lng.toFixed(2)}°
                        </div>
                      </td>

                      <td className="py-4 px-4 min-w-[120px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-semibold text-slate-300">{vsl.currentFuel.toLocaleString()} MT</span>
                          <span className={fuelPct < 25 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                            {fuelPct}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fuelPct < 25
                                ? 'bg-rose-500'
                                : fuelPct < 50
                                ? 'bg-amber-400'
                                : 'bg-cyan-400'
                            }`}
                            style={{ width: `${fuelPct}%` }}
                          ></div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${statusBadgeColor}`}>
                          {vsl.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onNavigate('vessel-details', vsl._id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="View Details"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={(e) => handleOpenEdit(vsl, e)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                              title="Edit Vessel"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setVesselToDelete(vsl);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                              title="Decommission Vessel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Vessel Modal (Admin Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl my-8 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1 flex items-center space-x-2">
              <Ship className="w-5 h-5 text-blue-400" />
              <span>{editingVessel ? `Edit Vessel: ${editingVessel.name}` : 'Register New Fleet Vessel'}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Enter official maritime specifications, IMO registry, engine type &amp; propulsion limits.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vessel Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. MV Pacific Titan"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">IMO Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.imoNumber}
                    onChange={(e) => setFormData({ ...formData, imoNumber: e.target.value })}
                    placeholder="e.g. IMO9839438"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vessel Type</label>
                  <select
                    value={formData.vesselType}
                    onChange={(e) => setFormData({ ...formData, vesselType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Container Ship">Container Ship</option>
                    <option value="Bulk Carrier">Bulk Carrier</option>
                    <option value="Oil Tanker">Oil Tanker</option>
                    <option value="LNG Carrier">LNG Carrier</option>
                    <option value="General Cargo">General Cargo</option>
                    <option value="Ro-Ro">Ro-Ro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Flag Registry</label>
                  <input
                    type="text"
                    value={formData.flag}
                    onChange={(e) => setFormData({ ...formData, flag: e.target.value })}
                    placeholder="e.g. Panama, Liberia, Singapore"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deadweight Tonnage (DWT)</label>
                  <input
                    type="number"
                    value={formData.deadweightTonnage}
                    onChange={(e) => setFormData({ ...formData, deadweightTonnage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Capacity (TEU / CBM)</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Master Captain</label>
                  <input
                    type="text"
                    value={formData.captain}
                    onChange={(e) => setFormData({ ...formData, captain: e.target.value })}
                    placeholder="e.g. Capt. Henrik Lindqvist"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Operational Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Docked">Docked</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Idle">Idle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Main Engine Type</label>
                  <input
                    type="text"
                    value={formData.engineType}
                    onChange={(e) => setFormData({ ...formData, engineType: e.target.value })}
                    placeholder="e.g. MAN B&W 11G95ME-C9.5"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fuel Capacity (MT)</label>
                  <input
                    type="number"
                    value={formData.fuelCapacity}
                    onChange={(e) => setFormData({ ...formData, fuelCapacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current Fuel Level (MT)</label>
                  <input
                    type="number"
                    value={formData.currentFuel}
                    onChange={(e) => setFormData({ ...formData, currentFuel: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current Port / Geographical Area</label>
                  <input
                    type="text"
                    value={formData.portOrArea}
                    onChange={(e) => setFormData({ ...formData, portOrArea: e.target.value })}
                    placeholder="e.g. Port of Rotterdam"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{editingVessel ? 'Update Vessel' : 'Save Vessel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vessel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!vesselToDelete}
        title="Confirm Vessel Decommission"
        message={`Are you sure you want to permanently delete vessel "${vesselToDelete?.name}" (${vesselToDelete?.imoNumber}) from MongoDB? This action cannot be reversed.`}
        confirmLabel="Decommission & Delete"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setVesselToDelete(null)}
      />
    </div>
  );
};
