import React, { useState, useEffect } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Ship,
  Award,
  Calendar,
  X,
  Trash2,
  Edit2,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { crewService, vesselService } from '../services/api.ts';
import { ICrew, IVessel } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';

interface CrewPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const CrewPage: React.FC<CrewPageProps> = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [crewList, setCrewList] = useState<ICrew[]>([]);
  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<ICrew | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crewToDelete, setCrewToDelete] = useState<ICrew | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Deck Officer' as any,
    vesselId: '',
    nationality: 'United Kingdom',
    certification: 'Master Mariner STCW II/2 Unlimited',
    joiningDate: new Date().toISOString().split('T')[0],
    contractExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
    contact: '+44 7700 900142',
    status: 'On Duty' as any
  });

  const loadCrew = async () => {
    try {
      setIsLoading(true);
      const [crewData, vesselsData] = await Promise.all([
        crewService.getAll({
          role: roleFilter !== 'All' ? roleFilter : undefined,
          status: statusFilter !== 'All' ? statusFilter : undefined
        }),
        vesselService.getAll()
      ]);
      setCrewList(crewData);
      setVessels(vesselsData);
      if (vesselsData.length > 0 && !formData.vesselId) {
        setFormData((prev) => ({ ...prev, vesselId: vesselsData[0]._id }));
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to retrieve crew roster.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCrew();
  }, [roleFilter, statusFilter]);

  const handleOpenAdd = () => {
    setEditingCrew(null);
    setFormData({
      name: '',
      role: 'Deck Officer',
      vesselId: vessels[0]?._id || '',
      nationality: 'International',
      certification: 'STCW Certified Mariner',
      joiningDate: new Date().toISOString().split('T')[0],
      contractExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().split('T')[0],
      contact: '+1 555 0199',
      status: 'On Duty'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (crew: ICrew) => {
    setEditingCrew(crew);
    setFormData({
      name: crew.name,
      role: crew.role,
      vesselId: crew.vesselId || '',
      nationality: crew.nationality,
      certification: crew.certification,
      joiningDate: crew.joiningDate,
      contractExpiry: crew.contractExpiry,
      contact: crew.contact,
      status: crew.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingCrew) {
        await crewService.update(editingCrew._id, formData);
        showToast('success', 'Roster Updated', `Updated details for ${formData.name}`);
      } else {
        await crewService.create(formData);
        showToast('success', 'Crew Enrolled', `${formData.name} added to marine roster`);
      }
      setIsModalOpen(false);
      loadCrew();
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.message || 'Could not save crew record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!crewToDelete) return;
    try {
      await crewService.delete(crewToDelete._id);
      showToast('success', 'Crew Removed', `Removed ${crewToDelete.name} from roster.`);
      setCrewToDelete(null);
      loadCrew();
    } catch (err) {
      showToast('error', 'Error', 'Failed to remove crew member.');
    }
  };

  const filteredCrew = crewList.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.vesselName && c.vesselName.toLowerCase().includes(q)) ||
      c.nationality.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Users2 className="w-7 h-7 text-indigo-400" />
            <span>Crew Management &amp; Rosters</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Certified marine masters, chief engineers, deck officers, endorsements &amp; STCW compliance.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-900/40 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Enlist Crew Member</span>
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search crew name, role, vessel..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
          >
            <option value="All">All Marine Roles</option>
            <option value="Captain">Captain</option>
            <option value="Chief Engineer">Chief Engineer</option>
            <option value="Deck Officer">Deck Officer</option>
            <option value="Deck Crew">Deck Crew</option>
            <option value="Electrical Officer">Electrical Officer</option>
          </select>
        </div>
      </div>

      {/* Crew Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {filteredCrew.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No crew members found matching query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Member / Role</th>
                  <th className="py-3.5 px-4">Assigned Vessel</th>
                  <th className="py-3.5 px-4">Certification</th>
                  <th className="py-3.5 px-4">Nationality</th>
                  <th className="py-3.5 px-4">Contract Expiry</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Status</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredCrew.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-inner flex-shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{c.name}</div>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            {c.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {c.vesselName || <span className="text-slate-400 font-normal">Shore / Standby</span>}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-300 font-medium">
                      {c.certification}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.nationality}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {c.contractExpiry}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 truncate max-w-[140px]">
                      {c.contact}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        {c.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1 rounded text-slate-400 hover:text-blue-400 transition-colors"
                            title="Edit Crew"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCrewToDelete(c)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Crew"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Crew Modal */}
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
              <Users2 className="w-5 h-5 text-indigo-400" />
              <span>{editingCrew ? `Edit Crew: ${editingCrew.name}` : 'Enlist Crew Member'}</span>
            </h2>
            <p className="text-slate-400 mb-6">
              Enter official STCW credentials, vessel assignment, and contract durations.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Capt. Henrik Lindqvist"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rank / Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Captain">Captain</option>
                    <option value="Chief Engineer">Chief Engineer</option>
                    <option value="Second Engineer">Second Engineer</option>
                    <option value="Deck Officer">Deck Officer</option>
                    <option value="Deck Crew">Deck Crew</option>
                    <option value="Electrical Officer">Electrical Officer</option>
                    <option value="Cook">Cook</option>
                    <option value="Safety Officer">Safety Officer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Vessel</label>
                  <select
                    value={formData.vesselId}
                    onChange={(e) => setFormData({ ...formData, vesselId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Standby / Unassigned --</option>
                    {vessels.map((v) => (
                      <option key={v._id} value={v._id}>{v.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Nationality</label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Duty Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="On Duty">On Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Standby">Standby</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Joining Date</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contract Expiry</label>
                  <input
                    type="date"
                    value={formData.contractExpiry}
                    onChange={(e) => setFormData({ ...formData, contractExpiry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Certification &amp; Endorsement</label>
                <input
                  type="text"
                  value={formData.certification}
                  onChange={(e) => setFormData({ ...formData, certification: e.target.value })}
                  placeholder="e.g. Master Mariner STCW II/2 Unlimited"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Emergency Contact / Email</label>
                <input
                  type="text"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  Save Crew Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!crewToDelete}
        title="Remove Crew Member"
        message={`Are you sure you want to remove "${crewToDelete?.name}" (${crewToDelete?.role}) from the active roster?`}
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setCrewToDelete(null)}
      />
    </div>
  );
};
