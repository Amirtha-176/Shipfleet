import React, { useState, useEffect } from 'react';
import {
  Compass,
  Ship,
  Navigation,
  Activity,
  Layers,
  Search,
  Radio,
  Clock,
  Wind
} from 'lucide-react';
import { trackingService } from '../services/api.ts';
import { ITrackingItem } from '../types/client.ts';
import { LeafletMap } from '../components/LeafletMap.tsx';
import { useSocket } from '../context/SocketContext.tsx';

interface RouteTrackingPageProps {
  onNavigate: (page: string, param?: string) => void;
}

export const RouteTrackingPage: React.FC<RouteTrackingPageProps> = ({ onNavigate }) => {
  const [vessels, setVessels] = useState<ITrackingItem[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { telemetryUpdates } = useSocket();

  const loadTracking = async () => {
    try {
      const data = await trackingService.getAll();
      setVessels(data);
      if (data.length > 0 && !selectedVesselId) {
        setSelectedVesselId(data[0].vesselId);
      }
    } catch (err) {
      console.error('Failed to load tracking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    const interval = setInterval(loadTracking, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync telemetry updates from Socket.io
  useEffect(() => {
    if (Object.keys(telemetryUpdates).length > 0) {
      setVessels((prev) =>
        prev.map((v) => {
          const update = telemetryUpdates[v.vesselId];
          if (update) {
            return {
              ...v,
              lat: update.lat,
              lng: update.lng,
              speedKnots: update.speedKnots,
              updatedAt: update.updatedAt
            };
          }
          return v;
        })
      );
    }
  }, [telemetryUpdates]);

  const filteredVessels = vessels.filter((v) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.imoNumber.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q) ||
      (v.voyage && v.voyage.destination.toLowerCase().includes(q))
    );
  });

  const selectedVessel = vessels.find((v) => v.vesselId === selectedVesselId);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Compass className="w-7 h-7 text-cyan-400" />
            <span>Live Maritime Route Tracking</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global ocean passage tracking, vessel waypoints, dead-reckoning vectors &amp; live AIS speed reporting.
          </p>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-semibold text-cyan-400">Satellite AIS Sync: Active</span>
        </div>
      </div>

      {/* Main Map + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Interactive List */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find vessel..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[550px] overflow-y-auto pr-1">
            {filteredVessels.map((v) => {
              const isSelected = v.vesselId === selectedVesselId;
              const statusColor =
                v.status === 'In Transit'
                  ? 'text-cyan-400'
                  : v.status === 'Docked'
                  ? 'text-emerald-400'
                  : 'text-amber-400';

              return (
                <div
                  key={v.vesselId}
                  onClick={() => setSelectedVesselId(v.vesselId)}
                  className={`p-3 rounded-2xl cursor-pointer transition-all border text-xs ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">{v.name}</span>
                    <span className={`text-[10px] font-bold ${statusColor}`}>{v.status}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {v.type} • {v.speedKnots} kts
                  </div>

                  {v.voyage ? (
                    <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800/60 pt-1">
                      Dest: <strong className="text-slate-200">{v.voyage.destination}</strong>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 mt-1">In Port / Anchor</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Map & Telemetry Panel */}
        <div className="lg:col-span-3 space-y-4">
          <LeafletMap
            vessels={vessels}
            selectedVesselId={selectedVesselId}
            onSelectVessel={(id) => setSelectedVesselId(id)}
            height="550px"
            zoom={3}
            showRoutes={true}
          />

          {/* Selected Vessel Telemetry Strip */}
          {selectedVessel && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Selected Vessel</span>
                <div className="font-black text-white text-sm">{selectedVessel.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{selectedVessel.imoNumber}</div>
              </div>

              <div>
                <span className="text-slate-400">Position &amp; Speed</span>
                <div className="font-bold text-cyan-400 text-sm">{selectedVessel.speedKnots} Knots</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {selectedVessel.lat.toFixed(4)}° N, {selectedVessel.lng.toFixed(4)}° E ({selectedVessel.heading}°)
                </div>
              </div>

              <div>
                <span className="text-slate-400">Voyage Destination</span>
                <div className="font-bold text-white text-sm">
                  {selectedVessel.voyage?.destination || selectedVessel.portOrArea}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedVessel.voyage
                    ? `ETA: ${new Date(selectedVessel.voyage.eta).toLocaleDateString()}`
                    : 'Docked'}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => onNavigate('vessel-details', selectedVessel.vesselId)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  Full Vessel Profile &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
