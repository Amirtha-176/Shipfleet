import React, { useState, useEffect } from 'react';
import {
  Ship,
  ArrowLeft,
  Navigation,
  Compass,
  Fuel,
  Wrench,
  Package,
  Users2,
  Calendar,
  Shield,
  Activity,
  MapPin,
  Clock,
  Gauge
} from 'lucide-react';
import { vesselService } from '../services/api.ts';
import { IVessel } from '../types/client.ts';
import { LeafletMap } from '../components/LeafletMap.tsx';

interface VesselDetailsPageProps {
  vesselId: string;
  onNavigate: (page: string, param?: string) => void;
}

export const VesselDetailsPage: React.FC<VesselDetailsPageProps> = ({ vesselId, onNavigate }) => {
  const [vessel, setVessel] = useState<IVessel | null>(null);
  const [activeTab, setActiveTab] = useState<'specs' | 'location' | 'voyage' | 'fuel' | 'maintenance' | 'crew' | 'cargo'>('specs');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVessel = async () => {
      try {
        setIsLoading(true);
        const data = await vesselService.getById(vesselId);
        setVessel(data);
      } catch (err) {
        console.error('Failed to load vessel details:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVessel();
  }, [vesselId]);

  if (isLoading || !vessel) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-slate-400 text-xs animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-36"></div>
        <div className="h-28 bg-slate-800 rounded-2xl"></div>
        <div className="h-96 bg-slate-800 rounded-2xl"></div>
      </div>
    );
  }

  const fuelPct = Math.round((vessel.currentFuel / vessel.fuelCapacity) * 100);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => onNavigate('vessels')}
        className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Fleet Roster</span>
      </button>

      {/* Header Profile Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-cyan-500 p-0.5 shadow-xl shadow-blue-900/30 flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Ship className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{vessel.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                {vessel.vesselType}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  vessel.status === 'In Transit'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : vessel.status === 'Docked'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {vessel.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-cyan-400 font-semibold">{vessel.imoNumber}</span>
              <span>•</span>
              <span>Flag: <strong>{vessel.flag}</strong></span>
              <span>•</span>
              <span>Master: <strong>{vessel.captain || 'Assigned per Voyage'}</strong></span>
              <span>•</span>
              <span>Built: <strong>{vessel.yearBuilt}</strong></span>
            </div>
          </div>
        </div>

        {/* Bunker Status */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 min-w-[200px] text-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="font-bold flex items-center space-x-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              <span>Bunker Fuel</span>
            </span>
            <span className="font-bold text-white">{fuelPct}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-1.5">
            <div
              className={`h-full rounded-full ${fuelPct < 25 ? 'bg-rose-500' : 'bg-cyan-400'}`}
              style={{ width: `${fuelPct}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400 flex justify-between">
            <span>{vessel.currentFuel.toLocaleString()} MT</span>
            <span>Cap: {vessel.fuelCapacity.toLocaleString()} MT</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'specs', label: 'Technical Specs', icon: Gauge },
          { id: 'location', label: 'Location & Telemetry', icon: MapPin },
          { id: 'voyage', label: 'Active Voyage', icon: Navigation },
          { id: 'fuel', label: 'Fuel Logs', icon: Fuel },
          { id: 'maintenance', label: 'Maintenance History', icon: Wrench },
          { id: 'crew', label: 'Assigned Crew', icon: Users2 },
          { id: 'cargo', label: 'Cargo Manifests', icon: Package }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-400 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      {activeTab === 'specs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
          {/* Dimensions & Tonnage */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
              Hull Dimensions &amp; Tonnage
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Deadweight Tonnage (DWT)</span>
                <span className="font-semibold text-slate-100">{vessel.deadweightTonnage.toLocaleString()} DWT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Gross Tonnage (GT)</span>
                <span className="font-semibold text-slate-100">{vessel.grossTonnage.toLocaleString()} GT</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Length Overall (LOA)</span>
                <span className="font-semibold text-slate-100">{vessel.length} meters</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Beam / Width</span>
                <span className="font-semibold text-slate-100">{vessel.width} meters</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Maximum Draft</span>
                <span className="font-semibold text-slate-100">{vessel.draft} meters</span>
              </div>
            </div>
          </div>

          {/* Engine & Propulsion */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
              Main Propulsion &amp; Machinery
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Engine Type</span>
                <span className="font-semibold text-slate-100">{vessel.engineType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Continuous Rating Power</span>
                <span className="font-semibold text-slate-100">{vessel.enginePower.toLocaleString()} kW</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Primary Fuel Type</span>
                <span className="font-semibold text-cyan-400">{vessel.fuelType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Bunker Capacity</span>
                <span className="font-semibold text-slate-100">{vessel.fuelCapacity.toLocaleString()} MT</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Service Speed</span>
                <span className="font-semibold text-slate-100">18.5 - 22.0 knots</span>
              </div>
            </div>
          </div>

          {/* Classification & Compliance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
              Surveys &amp; Certification
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Last Class Survey</span>
                <span className="font-semibold text-slate-100">{vessel.lastInspection}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Next Scheduled Inspection</span>
                <span className="font-semibold text-emerald-400">{vessel.nextInspection}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">P&amp;I Marine Insurance Expiry</span>
                <span className="font-semibold text-slate-100">{vessel.insuranceExpiry}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Owner Entity</span>
                <span className="font-semibold text-slate-100">{vessel.owner}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'location' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-400">Current Geographical Area:</span>
              <div className="text-base font-bold text-white">{vessel.currentLocation.portOrArea}</div>
            </div>
            <div>
              <span className="text-slate-400">GPS Coordinates:</span>
              <div className="font-mono text-cyan-400 font-bold">
                {vessel.currentLocation.lat.toFixed(4)}° N, {vessel.currentLocation.lng.toFixed(4)}° E
              </div>
            </div>
            <div>
              <span className="text-slate-400">Speed Over Ground:</span>
              <div className="text-white font-bold">{vessel.currentLocation.speedKnots} knots</div>
            </div>
            <div>
              <span className="text-slate-400">True Heading:</span>
              <div className="text-white font-bold">{vessel.currentLocation.heading}°</div>
            </div>
          </div>

          <LeafletMap
            vessels={[
              {
                vesselId: vessel._id,
                name: vessel.name,
                imoNumber: vessel.imoNumber,
                type: vessel.vesselType,
                status: vessel.status,
                lat: vessel.currentLocation.lat,
                lng: vessel.currentLocation.lng,
                speedKnots: vessel.currentLocation.speedKnots,
                heading: vessel.currentLocation.heading,
                portOrArea: vessel.currentLocation.portOrArea,
                updatedAt: vessel.currentLocation.updatedAt,
                voyage: vessel.activeVoyage
                  ? {
                      voyageId: vessel.activeVoyage.voyageId,
                      origin: vessel.activeVoyage.originPort,
                      destination: vessel.activeVoyage.destinationPort,
                      originCoords: vessel.activeVoyage.originCoords,
                      destinationCoords: vessel.activeVoyage.destinationCoords,
                      waypoints: vessel.activeVoyage.routeWaypoints,
                      eta: vessel.activeVoyage.estimatedArrival,
                      distanceCovered: vessel.activeVoyage.distanceCovered,
                      totalDistance: vessel.activeVoyage.distanceNauticalMiles
                    }
                  : null
              }
            ]}
            selectedVesselId={vessel._id}
            height="460px"
            zoom={5}
            center={[vessel.currentLocation.lat, vessel.currentLocation.lng]}
          />
        </div>
      )}

      {activeTab === 'voyage' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs">
          {vessel.activeVoyage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="font-bold text-base text-white">{vessel.activeVoyage.voyageId}</span>
                  <div className="text-slate-400">
                    {vessel.activeVoyage.originPort} ➔ {vessel.activeVoyage.destinationPort}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  {vessel.activeVoyage.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Departure</span>
                  <div className="font-bold text-white">
                    {new Date(vessel.activeVoyage.departureDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Estimated Arrival (ETA)</span>
                  <div className="font-bold text-cyan-400">
                    {new Date(vessel.activeVoyage.estimatedArrival).toLocaleDateString()}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Distance</span>
                  <div className="font-bold text-white">
                    {vessel.activeVoyage.distanceCovered} / {vessel.activeVoyage.distanceNauticalMiles} NM
                  </div>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Weather Report</span>
                  <div className="font-semibold text-slate-200 truncate">
                    {vessel.activeVoyage.weatherConditions || 'Calm Sea State'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">
              No active voyages currently dispatched for this vessel.
            </div>
          )}
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Fuel Type</th>
                <th className="p-3.5">Quantity (MT)</th>
                <th className="p-3.5">Unit Price (USD)</th>
                <th className="p-3.5">Total Cost</th>
                <th className="p-3.5">Port / Supplier</th>
                <th className="p-3.5">Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vessel.fuelRecords && vessel.fuelRecords.length > 0 ? (
                vessel.fuelRecords.map((f) => (
                  <tr key={f._id} className="hover:bg-slate-800/50">
                    <td className="p-3.5 font-medium text-slate-200">{f.date}</td>
                    <td className="p-3.5 text-cyan-400 font-semibold">{f.fuelType}</td>
                    <td className="p-3.5 font-semibold text-white">{f.quantityMT} MT</td>
                    <td className="p-3.5 text-slate-300">${f.unitPriceUSD}</td>
                    <td className="p-3.5 font-semibold text-emerald-400">${f.totalCostUSD.toLocaleString()}</td>
                    <td className="p-3.5 text-slate-400">{f.port} ({f.supplier})</td>
                    <td className="p-3.5 font-mono text-cyan-300 font-bold">{f.fuelEfficiencyNMPerMT} NM/MT</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No fuel bunkering records found for this vessel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-3 text-xs">
          {vessel.maintenance && vessel.maintenance.length > 0 ? (
            vessel.maintenance.map((m) => (
              <div key={m._id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{m.maintenanceId} - {m.description}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.priority === 'Critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'}`}>
                      {m.priority}
                    </span>
                  </div>
                  <div className="text-slate-400 mt-1">
                    Technician: <strong>{m.technician}</strong> • Start: {m.startDate} • Completion: {m.expectedCompletion}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400">${m.costUSD.toLocaleString()}</div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {m.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
              No active or scheduled maintenance for this vessel.
            </div>
          )}
        </div>
      )}

      {activeTab === 'crew' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {vessel.crew && vessel.crew.length > 0 ? (
            vessel.crew.map((c) => (
              <div key={c._id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{c.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-semibold">
                    {c.role}
                  </span>
                </div>
                <div className="text-slate-400 space-y-0.5 text-[11px]">
                  <div>Nationality: {c.nationality}</div>
                  <div>Cert: {c.certification}</div>
                  <div>Contract Exp: {c.contractExpiry}</div>
                  <div>Contact: {c.contact}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
              No assigned crew members registered for this vessel.
            </div>
          )}
        </div>
      )}

      {activeTab === 'cargo' && (
        <div className="space-y-3 text-xs">
          {vessel.cargo && vessel.cargo.length > 0 ? (
            vessel.cargo.map((crg) => (
              <div key={crg._id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">{crg.cargoId} • {crg.description}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Shipper: {crg.shipper} ➔ Consignee: {crg.consignee} • {crg.loadingPort} to {crg.dischargePort}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-cyan-400">{crg.weightTons.toLocaleString()} Tons</div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    {crg.status}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
              No commercial cargo manifests currently linked with this vessel.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
