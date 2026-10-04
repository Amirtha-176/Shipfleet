import React, { useState, useEffect } from 'react';
import {
  Anchor,
  Search,
  Plus,
  MapPin,
  Clock,
  Phone,
  Globe2,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { portService } from '../services/api.ts';
import { IPort } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface PortsPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const PortsPage: React.FC<PortsPageProps> = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [ports, setPorts] = useState<IPort[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    city: '',
    portCode: '',
    lat: 0,
    lng: 0,
    capacityTEU: 5000000,
    contact: '',
    operatingHours: '24/7 Operations',
    status: 'Open' as any
  });

  const loadPorts = async () => {
    try {
      const data = await portService.getAll({ search: search || undefined });
      setPorts(data);
    } catch (err) {
      console.error('Failed to load ports:', err);
    }
  };

  useEffect(() => {
    loadPorts();
  }, []);

  useEffect(() => {
    const t = setTimeout(loadPorts, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await portService.create(formData);
      showToast('success', 'Port Added', `${formData.name} added to global directory.`);
      setIsModalOpen(false);
      loadPorts();
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.message || 'Failed to add port.');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Anchor className="w-7 h-7 text-blue-400" />
            <span>Global Port Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Major international deepwater terminals, canal transit locks &amp; bunker replenishment anchorages.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-lg shadow-blue-900/40 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Terminal / Port</span>
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search port name, country, UN/LOCODE code..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">
          {ports.length} Global Ports Listed
        </span>
      </div>

      {/* Ports Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {ports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No ports found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Port / Code</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Coordinates</th>
                  <th className="py-3.5 px-4">Annual Capacity</th>
                  <th className="py-3.5 px-4">Operating Hours</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {ports.map((port) => (
                  <tr key={port._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{port.name}</div>
                      <span className="font-mono text-cyan-400 font-bold text-[11px]">{port.portCode}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200 font-medium flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        <span>{port.city ? `${port.city}, ` : ''}{port.country}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {port.lat.toFixed(2)}°, {port.lng.toFixed(2)}°
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {(port.capacityTEU / 1000000).toFixed(1)}M TEU
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {port.operatingHours}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-xs">
                      {port.contact}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                          port.status === 'Open'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : port.status === 'Congested'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {port.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Port Modal */}
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
              <Anchor className="w-5 h-5 text-blue-400" />
              <span>Add Port to Global Directory</span>
            </h2>
            <p className="text-slate-400 mb-6">
              Enter terminal metadata, UN/LOCODE code, and exact navigation coordinates.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Port Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Port of Singapore"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Port Code (UN/LOCODE) *</label>
                  <input
                    type="text"
                    required
                    value={formData.portCode}
                    onChange={(e) => setFormData({ ...formData, portCode: e.target.value })}
                    placeholder="e.g. SGSIN"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Congested">Congested</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Restricted">Restricted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lat}
                    onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.lng}
                    onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Port Authority Contact</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="e.g. +65 6375 1600 / marine@mpa.gov.sg"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                >
                  Save Port
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
