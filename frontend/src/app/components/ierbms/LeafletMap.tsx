import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';
import { cn } from '../ui/utils';
import 'leaflet/dist/leaflet.css';

// Custom Leaflet DivIcons matching dashboard styling
const createLeafletIcon = (color: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        position: relative;
        width: 32px;
        height: 42px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));
      ">
        <svg width="32" height="42" viewBox="0 0 34 44" style="position: absolute; inset: 0;">
          <path d="M17 2 C9 2 3 8 3 16 C3 25 17 42 17 42 C17 42 31 25 31 16 C31 8 25 2 17 2 Z" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="17" cy="16" r="10" fill="white"/>
        </svg>
        <span style="position: relative; z-index: 10; font-size: 13px; top: -5px;">${emoji}</span>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38]
  });
};

interface LeafletMapProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  center?: [number, number];
  zoom?: number;
  activeRouteCaseId?: string | null;
  onRetryGoogleMaps?: () => void;
  isFallbackMode?: boolean;
}

// Controller component to pan/fit bounds dynamically in Leaflet
const MapController: React.FC<{
  hospitals: Hospital[];
  ambulances: Ambulance[];
  emergencies: Emergency[];
  center: [number, number];
  zoom: number;
}> = ({ hospitals, ambulances, emergencies }) => {
  const map = useMap();

  React.useEffect(() => {
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    hospitals.forEach(h => {
      if (h.location?.lat && h.location?.lng) {
        bounds.extend([h.location.lat, h.location.lng]);
        hasPoints = true;
      }
    });

    ambulances.forEach(a => {
      if (a.location?.lat && a.location?.lng) {
        bounds.extend([a.location.lat, a.location.lng]);
        hasPoints = true;
      }
    });

    emergencies.forEach(e => {
      if (e.location?.lat && e.location?.lng) {
        bounds.extend([e.location.lat, e.location.lng]);
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, hospitals, ambulances, emergencies]);

  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  emergencies,
  ambulances,
  hospitals,
  center = [5.6037, -0.1870],
  zoom = 12,
  activeRouteCaseId = null,
  onRetryGoogleMaps,
  isFallbackMode = true
}) => {
  const [osrmRoutePoints, setOsrmRoutePoints] = React.useState<Array<[number, number]> | null>(null);

  const activeEmergency = React.useMemo(() => {
    return activeRouteCaseId ? (emergencies.find(e => e.id === activeRouteCaseId) || emergencies[0]) : null;
  }, [activeRouteCaseId, emergencies]);

  const activeHospital = React.useMemo(() => {
    if (!activeEmergency) return hospitals[0];
    return hospitals.find(h => h.id === activeEmergency.assignedHospital || h.name === activeEmergency.assignedHospital) || hospitals[0];
  }, [activeEmergency, hospitals]);

  const activeAmbulance = React.useMemo(() => {
    if (!activeEmergency) return ambulances[0];
    return ambulances.find(a => a.id === activeEmergency.ambulanceId || a.assignedEmergency === activeEmergency.id) || ambulances[0];
  }, [activeEmergency, ambulances]);

  // Fetch turn-by-turn road route via OSRM engine for Leaflet
  React.useEffect(() => {
    if (!activeHospital?.location || !activeAmbulance?.location) {
      setOsrmRoutePoints(null);
      return;
    }
    const origin = activeAmbulance.location;
    const dest = activeHospital.location;

    fetch(`https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]?.geometry?.coordinates) {
          const points = data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
          setOsrmRoutePoints(points);
        }
      })
      .catch(err => console.warn("Leaflet OSRM fetch error:", err));
  }, [activeHospital, activeAmbulance]);

  const routePolyline = React.useMemo(() => {
    if (osrmRoutePoints && osrmRoutePoints.length > 0) {
      return osrmRoutePoints;
    }
    if (!activeHospital?.location || !activeAmbulance?.location) return null;
    return [
      [activeAmbulance.location.lat, activeAmbulance.location.lng] as [number, number],
      [activeHospital.location.lat, activeHospital.location.lng] as [number, number]
    ];
  }, [osrmRoutePoints, activeHospital, activeAmbulance]);

  return (
    <div className="h-full w-full relative z-0">
      {/* Top Banner Notice when fallback mode is active */}
      {isFallbackMode && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] max-w-xl w-[90%] bg-amber-950/90 backdrop-blur-md border border-amber-500/40 text-amber-200 px-3.5 py-2 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🗺️</span>
            <div>
              <p className="font-semibold text-amber-100">Using OpenStreetMap Free Engine</p>
              <p className="text-[11px] text-amber-300/80">Turn-by-turn road route snapped via OSRM Engine.</p>
            </div>
          </div>
          {onRetryGoogleMaps && (
            <button
              onClick={onRetryGoogleMaps}
              className="px-2.5 py-1 text-[11px] font-semibold bg-amber-500 text-black hover:bg-amber-400 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            >
              Retry Google Maps
            </button>
          )}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem', background: '#0f0f16' }}
        zoomControl={true}
      >
        {/* CartoDB Dark Matter Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapController
          hospitals={hospitals}
          ambulances={ambulances}
          emergencies={emergencies}
          center={center}
          zoom={zoom}
        />

        {/* Turn-by-Turn Road Route Polyline */}
        {routePolyline && (
          <Polyline
            positions={routePolyline}
            pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.9 }}
          />
        )}

        {/* Hospitals */}
        {hospitals.map(hospital => {
          if (!hospital.location?.lat || !hospital.location?.lng) return null;
          const bedCount = hospital.availableBeds ?? 0;
          const pinColor = bedCount > 5 ? '#22c55e' : bedCount > 0 ? '#eab308' : '#ef4444';

          return (
            <Marker
              key={hospital.id}
              position={[hospital.location.lat, hospital.location.lng]}
              icon={createLeafletIcon(pinColor, '🏥')}
            >
              <Popup>
                <div className="text-gray-900 font-sans p-1 min-w-[190px]">
                  <h4 className="font-bold text-sm text-gray-900">{hospital.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">Available Beds: <span className="font-semibold text-emerald-600">{hospital.availableBeds}</span></p>
                  <p className="text-xs text-gray-600">ICU Beds: <span className="font-semibold">{hospital.icuBeds?.available ?? 0}</span></p>
                  <p className="text-xs text-gray-500 mt-1">Phone: {hospital.phone || "+233 302 662 000"}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulances */}
        {ambulances.map(ambulance => {
          if (!ambulance.location?.lat || !ambulance.location?.lng) return null;
          const isEngaged = ambulance.status === 'engaged' || ambulance.assignedEmergency;

          return (
            <Marker
              key={ambulance.id}
              position={[ambulance.location.lat, ambulance.location.lng]}
              icon={createLeafletIcon(isEngaged ? '#ef4444' : '#3b82f6', '🚑')}
            >
              <Popup>
                <div className="text-gray-900 font-sans p-1 min-w-[170px]">
                  <h4 className="font-bold text-sm text-gray-900">{ambulance.plateNumber || ambulance.id}</h4>
                  <p className="text-xs text-gray-600 mt-1">Status: <span className="font-semibold text-blue-600 capitalize">{ambulance.status}</span></p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Emergencies */}
        {emergencies.map(emergency => {
          if (!emergency.location?.lat || !emergency.location?.lng) return null;

          return (
            <Marker
              key={emergency.id}
              position={[emergency.location.lat, emergency.location.lng]}
              icon={createLeafletIcon('#ef4444', '⚠️')}
            >
              <Popup>
                <div className="text-gray-900 font-sans p-1 min-w-[190px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-1">
                    <h4 className="font-bold text-sm text-gray-900">{emergency.emergencyType}</h4>
                    <StatusBadge status={emergency.severity} className="text-xs">
                      {emergency.severity}
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-gray-600">Patient: <span className="font-semibold">{emergency.patientName}</span></p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
