import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ITrackingItem } from '../types/client.ts';

interface LeafletMapProps {
  vessels: ITrackingItem[];
  selectedVesselId?: string | null;
  onSelectVessel?: (vesselId: string) => void;
  height?: string;
  zoom?: number;
  center?: [number, number];
  showRoutes?: boolean;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  vessels,
  selectedVesselId,
  onSelectVessel,
  height = '500px',
  zoom = 2,
  center = [20, 20],
  showRoutes = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const polylinesRef = useRef<L.Polyline[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        minZoom: 2,
        maxZoom: 14,
        zoomControl: true,
        attributionControl: false
      });

      // Dark maritime tile layer (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old routes
    polylinesRef.current.forEach((line) => line.remove());
    polylinesRef.current = [];

    // Clear old markers that no longer exist
    const currentVesselIds = new Set(vessels.map((v) => v.vesselId));
    Object.keys(markersRef.current).forEach((vId) => {
      if (!currentVesselIds.has(vId)) {
        markersRef.current[vId].remove();
        delete markersRef.current[vId];
      }
    });

    // Create or update markers
    vessels.forEach((vsl) => {
      const isSelected = selectedVesselId === vsl.vesselId;
      const statusColor =
        vsl.status === 'In Transit'
          ? '#06b6d4'
          : vsl.status === 'Docked'
          ? '#10b981'
          : vsl.status === 'Maintenance'
          ? '#f59e0b'
          : vsl.status === 'Delayed'
          ? '#ef4444'
          : '#94a3b8';

      // Custom Ship SVG Icon with heading rotation
      const iconHtml = `
        <div style="transform: rotate(${vsl.heading}deg); transition: transform 0.5s ease-out; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <div style="background-color: ${isSelected ? '#3b82f6' : statusColor}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 0 10px ${statusColor};">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 2 4 8H8l4-8z"/>
              <path d="M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4"/>
              <path d="M12 10v10"/>
            </svg>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-vessel-marker',
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
      });

      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 200px; color: #0f172a; padding: 4px;">
          <div style="font-weight: 700; font-size: 14px; margin-bottom: 2px; color: #1e3a8a;">${vsl.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${vsl.imoNumber} • ${vsl.type}</div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${vsl.status}</span></div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>Speed:</strong> ${vsl.speedKnots} knots (${vsl.heading}°)</div>
          <div style="font-size: 12px; margin-bottom: 4px;"><strong>Area:</strong> ${vsl.portOrArea}</div>
          ${
            vsl.voyage
              ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
                  <div><strong>Voyage:</strong> ${vsl.voyage.voyageId}</div>
                  <div>${vsl.voyage.origin} ➔ ${vsl.voyage.destination}</div>
                  <div><strong>ETA:</strong> ${new Date(vsl.voyage.eta).toLocaleDateString()}</div>
                </div>`
              : ''
          }
        </div>
      `;

      if (markersRef.current[vsl.vesselId]) {
        // Update existing marker
        const existingMarker = markersRef.current[vsl.vesselId];
        existingMarker.setLatLng([vsl.lat, vsl.lng]);
        existingMarker.setIcon(customIcon);
        existingMarker.setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([vsl.lat, vsl.lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(popupContent);
        marker.on('click', () => {
          if (onSelectVessel) {
            onSelectVessel(vsl.vesselId);
          }
        });
        markersRef.current[vsl.vesselId] = marker;
      }

      // Draw Route Polyline if vessel has active voyage and routes enabled
      if (showRoutes && vsl.voyage && vsl.voyage.waypoints && vsl.voyage.waypoints.length > 1) {
        const polyline = L.polyline(vsl.voyage.waypoints, {
          color: isSelected ? '#38bdf8' : '#0284c7',
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.9 : 0.6,
          dashArray: '5, 8'
        }).addTo(map);

        polylinesRef.current.push(polyline);
      }
    });

    // Center map if selected vessel provided
    if (selectedVesselId) {
      const selected = vessels.find((v) => v.vesselId === selectedVesselId);
      if (selected) {
        map.setView([selected.lat, selected.lng], Math.max(map.getZoom(), 4), { animate: true });
        if (markersRef.current[selected.vesselId]) {
          markersRef.current[selected.vesselId].openPopup();
        }
      }
    }
  }, [vessels, selectedVesselId, showRoutes]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 text-xs shadow-lg flex items-center space-x-3 text-slate-300">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <span>In Transit</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <span>Docked</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
          <span>Delayed</span>
        </div>
      </div>
    </div>
  );
};
