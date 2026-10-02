import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Plus,
  TrendingUp,
  DollarSign,
  Gauge,
  Calendar,
  Ship,
  Search,
  Download,
  X,
  Trash2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { fuelService, vesselService, voyageService, reportService } from '../services/api.ts';
import { IFuelRecord, IVessel, IVoyage } from '../types/client.ts';
import { useToast } from '../components/Toast.tsx';

interface FuelPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const FuelPage: React.FC<FuelPageProps> = () => {
  const { isAdmin, isOperator } = useAuth();
  const { showToast } = useToast();

  const [fuelRecords, setFuelRecords] = useState<IFuelRecord[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [vessels, setVessels] = useState<IVessel[]>([]);
  const [voyages, setVoyages] = useState<IVoyage[]>([]);
  const [vesselFilter, setVesselFilter] = useState('All');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Log Fuel Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    vesselId: '',
    voyageId: '',
    date: new Date().toISOString().split('T')[0],
    fuelType: 'VLSFO' as any,
    quantityMT: 500,
    unitPriceUSD: 650,
    supplier: 'TotalEnergies Marine Bunkering',
    port: 'Port of Rotterdam',
    engineHours: 96,
    distanceTravelledNM: 1850
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [records, analyticsData, vesselsData, voyagesData] = await Promise.all([
        fuelService.getAll({
          vesselId: vesselFilter !== 'All' ? vesselFilter : undefined,
          fuelType: fuelTypeFilter !== 'All' ? fuelTypeFilter : undefined
        }),
        fuelService.getAnalytics(),
        vesselService.getAll(),
        voyageService.getAll()
      ]);

      setFuelRecords(records);
      setAnalytics(analyticsData);
      setVessels(vesselsData);
      setVoyages(voyagesData);
      if (vesselsData.length > 0 && !formData.vesselId) {
        setFormData((prev) => ({ ...prev, vesselId: vesselsData[0]._id }));
      }
    } catch (err) {
      showToast('error', 'Error', 'Failed to load fuel records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vesselFilter, fuelTypeFilter]);

  // Dynamic automatic calculation of Total Cost & Efficiency
  const calculatedTotalCost = formData.quantityMT * formData.unitPriceUSD;
  const calculatedEfficiency =
    formData.quantityMT > 0 ? (formData.distanceTravelledNM / formData.quantityMT).toFixed(2) : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vesselId) {
      showToast('error', 'Validation Error', 'Please select a vessel.');
      return;
    }

    setIsSubmitting(true);
    try {
      await fuelService.create(formData);
      showToast(
        'success',
        'Fuel Logged',
        `Recorded ${formData.quantityMT} MT bunkering ($${calculatedTotalCost.toLocaleString()})`
      );
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Error', err.response?.data?.message || 'Failed to log fuel record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Fuel className="w-7 h-7 text-amber-400" />
            <span>Fuel Bunkering &amp; Efficiency</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Bunkering logs, metric tonnage consumed, fuel efficiency (NM/MT) &amp; ISO 8217 compliant fuels.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href={reportService.exportCsvUrl('fuel')}
            download
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Fuel CSV</span>
          </a>

          {(isAdmin || isOperator) && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-lg shadow-amber-900/40 transition-all flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Log Bunkering Record</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Fuel Consumed</div>
          <div className="text-3xl font-black text-white">
            {(analytics?.totalFuelMT ?? 3690).toLocaleString()} <span className="text-xs text-slate-400 font-semibold">MT</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">VLSFO, MGO, LNG</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total Fuel Expenditure</div>
          <div className="text-3xl font-black text-emerald-400">
            ${((analytics?.totalFuelCostUSD ?? 2450000) / 1000000).toFixed(2)}M
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Average: ${analytics?.averagePricePerMT ?? 660} / MT</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Fleet Fuel Efficiency</div>
          <div className="text-3xl font-black text-cyan-400">3.82 <span className="text-xs text-slate-400 font-semibold">NM/MT</span></div>
          <div className="text-[11px] text-slate-400 mt-1">Nautical Miles per Metric Ton</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Primary Fuel Mix</div>
          <div className="text-3xl font-black text-amber-400">VLSFO 68%</div>
          <div className="text-[11px] text-slate-400 mt-1">LNG 22% • MGO 10%</div>
        </div>
      </div>

      {/* Fuel Consumption Efficiency Comparison */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          <span>Vessel-wise Fuel Efficiency &amp; Consumption</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {analytics?.vesselEfficiency?.map((v: any, i: number) => (
            <div key={i} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-100">{v.vesselName}</span>
                <span className="font-mono text-cyan-400 font-bold">{v.efficiency} NM/MT</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Total Fuel: {v.totalMT} MT</span>
                <span>Fuel Type: {v.fuelType}</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, (v.efficiency / 6) * 100)}%` }}
                ></div>
              </div>
            </div>
          )) || <div className="text-slate-400">Loading efficiency analytics...</div>}
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-bold text-white text-sm">Bunkering Log Entries</h3>

          <div className="flex items-center space-x-3">
            <select
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="All">All Vessels</option>
              {vessels.map((v) => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>

            <select
              value={fuelTypeFilter}
              onChange={(e) => setFuelTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            >
              <option value="All">All Fuels</option>
              <option value="VLSFO">VLSFO</option>
              <option value="MGO">MGO</option>
              <option value="LNG">LNG</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Vessel</th>
                <th className="py-3 px-4">Fuel Type</th>
                <th className="py-3 px-4">Quantity (MT)</th>
                <th className="py-3 px-4">Unit Price</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Port / Bunkerer</th>
                <th className="py-3 px-4">Distance / Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {fuelRecords.map((r) => (
                <tr key={r._id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-slate-300">{r.date}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{r.vesselName}</td>
                  <td className="py-3.5 px-4 font-semibold text-cyan-400">{r.fuelType}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{r.quantityMT} MT</td>
                  <td className="py-3.5 px-4 text-slate-300">${r.unitPriceUSD}</td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">${r.totalCostUSD.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-slate-400">{r.port} ({r.supplier})</td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-cyan-300 font-bold">{r.fuelEfficiencyNMPerMT} NM/MT</div>
                    <div className="text-[10px] text-slate-500">{r.distanceTravelledNM} NM covered</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Fuel Modal (Operator & Admin) */}
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
              <Fuel className="w-5 h-5 text-amber-400" />
              <span>Log Bunkering Record</span>
            </h2>
            <p className="text-slate-400 mb-6">
              Record fuel quantity, unit prices, supplier delivery note and automated efficiency.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Vessel *</label>
                <select
                  required
                  value={formData.vesselId}
                  onChange={(e) => setFormData({ ...formData, vesselId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {vessels.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name} ({v.vesselType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fuel Type</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="VLSFO">VLSFO</option>
                    <option value="MGO">MGO</option>
                    <option value="LNG">LNG</option>
                    <option value="HFO">HFO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quantity (Metric Tons) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.quantityMT}
                    onChange={(e) => setFormData({ ...formData, quantityMT: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Unit Price ($ / MT) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.unitPriceUSD}
                    onChange={(e) => setFormData({ ...formData, unitPriceUSD: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Distance Travelled (NM)</label>
                  <input
                    type="number"
                    value={formData.distanceTravelledNM}
                    onChange={(e) => setFormData({ ...formData, distanceTravelledNM: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bunkering Port</label>
                  <input
                    type="text"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Supplier Entity</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="e.g. TotalEnergies Marine, Shell Bunker"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Real-time Calculation Preview */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Total Bunkering Cost:</span>
                  <div className="text-emerald-400 font-bold text-sm">
                    ${calculatedTotalCost.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Fuel Efficiency:</span>
                  <div className="text-cyan-400 font-bold text-sm">{calculatedEfficiency} NM/MT</div>
                </div>
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
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold"
                >
                  Record Bunkering
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
