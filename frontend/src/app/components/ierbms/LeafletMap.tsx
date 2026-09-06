import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';
import { audioTelemetry } from '../../utils/audioTelemetry';
import { cn } from '../ui/utils';
import {
  Search,
  Volume2,
  VolumeX,
  Flame,
  LocateFixed,
  Layers,
  Navigation,
  Crosshair,
  MapPin,
  Phone,
  Building2,
  Globe
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

/**
 * Universal Coordinate Extractor
 * Gracefully extracts [lat, lng] from varied backend, API, and mock data formats.
 */
export const extractCoordinates = (item: any): [number, number] | null => {
  if (!item) return null;
  const latVal = item.location?.lat ?? item.latitude ?? item.lat ?? item.current_latitude ?? item.patient_vitals?.latitude;
  const lngVal = item.location?.lng ?? item.longitude ?? item.lng ?? item.current_longitude ?? item.patient_vitals?.longitude;

  const lat = typeof latVal === 'string' ? parseFloat(latVal) : Number(latVal);
  const lng = typeof lngVal === 'string' ? parseFloat(lngVal) : Number(lngVal);

  if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
    return [lat, lng];
  }
  return null;
};

/**
 * Great-circle Haversine distance in kilometers
 */
export const calculateDistanceKm = (c1: [number, number], c2: [number, number]): number => {
  const R = 6371; // Earth radius in km
  const dLat = (c2[0] - c1[0]) * (Math.PI / 180);
  const dLng = (c2[1] - c1[1]) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(c1[0] * (Math.PI / 180)) *
      Math.cos(c2[0] * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// SVG Markers with pulsing animation support
const createPulsingLeafletIcon = (color: string, emoji: string, isPulsing = false) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 36px; height: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${isPulsing ? `
          <div style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: ${color};
            opacity: 0.35;
            animation: leaflet-pulse 2s infinite ease-in-out;
            pointer-events: none;
          "></div>
        ` : ''}
        <svg width="34" height="44" viewBox="0 0 34 44" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); pointer-events: none;">
          <path d="M17 2 C9 2 3 8 3 16 C3 25 17 42 17 42 C17 42 31 25 31 16 C31 8 25 2 17 2 Z" fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="17" cy="16" r="10" fill="#ffffff"/>
        </svg>
        <span style="position: absolute; z-index: 10; font-size: 14px; top: 7px; left: 10px; pointer-events: none;">${emoji}</span>
      </div>
    `,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -42]
  });
};

interface LeafletMapProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  center?: [number, number];
  zoom?: number;
  activeRouteCaseId?: string | null;
  isEmergencyMode?: boolean;
  userCoords?: [number, number] | null;
  onExitEmergencyMode?: () => void;
}

// Controller component to smoothly pan/zoom, invalidate size and handle search selection
const MapController: React.FC<{
  hospitals: Hospital[];
  ambulances: Ambulance[];
  emergencies: Emergency[];
  targetCoords: [number, number] | null;
  targetZoom?: number;
  routeBounds?: [[number, number], [number, number]] | null;
  autoFitInitial?: boolean;
}> = ({ hospitals, ambulances, emergencies, targetCoords, targetZoom = 15, routeBounds, autoFitInitial = false }) => {
  const map = useMap();
  const initialFitDone = React.useRef(false);
  const routeBoundsKeyRef = React.useRef<string | null>(null);

  // Invalidate size on mount and window resize so Leaflet tile bounds and marker hitboxes are 100% accurate
  React.useEffect(() => {
    const handleResize = () => map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  // Smooth flyTo on target selection
  React.useEffect(() => {
    if (targetCoords) {
      map.flyTo(targetCoords, targetZoom, { duration: 1.2 });
    }
  }, [map, targetCoords, targetZoom]);

  // Auto-fit bounds to user location and destination when taking an emergency
  React.useEffect(() => {
    if (routeBounds && routeBounds[0] && routeBounds[1]) {
      const key = `${routeBounds[0][0].toFixed(4)},${routeBounds[0][1].toFixed(4)}-${routeBounds[1][0].toFixed(4)},${routeBounds[1][1].toFixed(4)}`;
      if (routeBoundsKeyRef.current !== key) {
        routeBoundsKeyRef.current = key;
        const bounds = L.latLngBounds(routeBounds[0], routeBounds[1]);
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 15 });
      }
    }
  }, [map, routeBounds]);

  // Initial bounds fitting (only if autoFitInitial requested)
  React.useEffect(() => {
    if (!autoFitInitial || initialFitDone.current) return;
    const bounds = L.latLngBounds([]);
    let hasPoints = false;

    hospitals.forEach(h => {
      const coords = extractCoordinates(h);
      if (coords) {
        bounds.extend(coords);
        hasPoints = true;
      }
    });
    ambulances.forEach(a => {
      const coords = extractCoordinates(a);
      if (coords) {
        bounds.extend(coords);
        hasPoints = true;
      }
    });
    emergencies.forEach(e => {
      const coords = extractCoordinates(e);
      if (coords) {
        bounds.extend(coords);
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      initialFitDone.current = true;
    }
  }, [map, hospitals, ambulances, emergencies, autoFitInitial]);

  return null;
};

// Map click listener hook component: lets user click anywhere to inspect that point
const MapClickHandler: React.FC<{
  onMapClick: (coords: [number, number]) => void;
}> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    }
  });
  return null;
};

export const LeafletMap: React.FC<LeafletMapProps> = ({
  emergencies,
  ambulances,
  hospitals,
  center = [5.6037, -0.1870],
  zoom = 13,
  activeRouteCaseId = null,
  isEmergencyMode = false,
  userCoords = null,
  onExitEmergencyMode
}) => {
  // Tile Layer options: dark (CartoDB Dark Matter), street (CartoDB Voyager), satellite (Esri World Imagery)
  const [mapTheme, setMapTheme] = React.useState<'dark' | 'street' | 'satellite'>('dark');
  const [showHotspots, setShowHotspots] = React.useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = React.useState<boolean>(audioTelemetry.getMuted());
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = React.useState<boolean>(false);
  const [flyTarget, setFlyTarget] = React.useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = React.useState<[number, number] | null>(null);
  const [inspectedPoint, setInspectedPoint] = React.useState<[number, number] | null>(null);

  // Turn-by-turn road route states
  const [osrmRoutePoints, setOsrmRoutePoints] = React.useState<Array<[number, number]> | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = React.useState<string | null>(null);
  const [routeDurationMins, setRouteDurationMins] = React.useState<number | null>(null);

  // Emergency Focus Mode: when taking an emergency, default to showing ONLY user's location, route and destination
  const [showOnlyEmergencyRoute, setShowOnlyEmergencyRoute] = React.useState<boolean>(true);

  // Auto-acquire device GPS on mount if permitted
  React.useEffect(() => {
    if (!userLocation && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    }
  }, []);

  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Historic high-risk emergency corridors across Ghana
  const accidentHotspots = React.useMemo(() => [
    { name: "Kwame Nkrumah Interchange (Circle)", lat: 5.5560, lng: -0.2100, radius: 450, risk: "Critical" },
    { name: "Kasoa Toll Booth Corridor", lat: 5.5420, lng: -0.3750, radius: 550, risk: "High" },
    { name: "Kejetia Roundabout (Kumasi)", lat: 6.6970, lng: -1.6240, radius: 500, risk: "High" },
    { name: "Tema Motorway Corridor", lat: 5.6690, lng: -0.0160, radius: 600, risk: "Critical" },
    { name: "Madina Zongo Junction", lat: 5.6680, lng: -0.1650, radius: 400, risk: "Elevated" },
    { name: "Anloga Junction (Kumasi)", lat: 6.6910, lng: -1.5870, radius: 450, risk: "Elevated" },
    { name: "Takoradi Harbour Corridor", lat: 4.9239, lng: -1.7433, radius: 450, risk: "High" }
  ], []);

  // Resolve active dispatch pair
  const activeEmergency = React.useMemo(() => {
    if (activeRouteCaseId) {
      return emergencies.find(e => e.id === activeRouteCaseId) || null;
    }
    if (isEmergencyMode) {
      return emergencies.find(e => e.status === 'in-transit') || emergencies.find(e => e.status === 'active') || null;
    }
    return emergencies.find(e => e.status === 'in-transit') || null;
  }, [activeRouteCaseId, isEmergencyMode, emergencies]);

  const isTakingEmergency = Boolean(activeRouteCaseId || isEmergencyMode || (activeEmergency && activeEmergency.status === 'in-transit'));
  const isEmergencyFocusActive = isTakingEmergency && showOnlyEmergencyRoute;

  const activeHospital = React.useMemo(() => {
    if (!activeEmergency) return null;
    const target = activeEmergency.assignedHospital;
    if (!target) return hospitals[0] || null;

    let found = hospitals.find(h => h.id === target);
    if (found) return found;

    found = hospitals.find(h => h.name?.toLowerCase() === target.toLowerCase());
    if (found) return found;

    found = hospitals.find(h => 
      h.name?.toLowerCase().includes(target.toLowerCase()) || 
      target.toLowerCase().includes(h.name?.toLowerCase())
    );
    if (found) return found;

    return hospitals[0] || null;
  }, [activeEmergency, hospitals]);

  const activeAmbulance = React.useMemo(() => {
    if (!activeEmergency) return ambulances[0] || null;
    if (activeEmergency.ambulanceId) {
      const found = ambulances.find(a => 
        a.id === activeEmergency.ambulanceId || 
        a.plateNumber === activeEmergency.ambulanceId ||
        a.assignedEmergency === activeEmergency.id
      );
      if (found) return found;
    }
    const assigned = ambulances.find(a => a.assignedEmergency === activeEmergency.id);
    if (assigned) return assigned;

    return ambulances[0] || null;
  }, [activeEmergency, ambulances]);

  const effectiveUserCoords = React.useMemo<[number, number] | null>(() => {
    if (userCoords && !isNaN(userCoords[0]) && !isNaN(userCoords[1])) return userCoords;
    if (userLocation && !isNaN(userLocation[0]) && !isNaN(userLocation[1])) return userLocation;
    const ambCoords = extractCoordinates(activeAmbulance);
    if (ambCoords) return ambCoords;
    const emgCoords = extractCoordinates(activeEmergency);
    if (emgCoords) return emgCoords;
    return null;
  }, [userCoords, userLocation, activeAmbulance, activeEmergency]);

  const destinationCoords = React.useMemo<[number, number] | null>(() => {
    return extractCoordinates(activeHospital);
  }, [activeHospital]);

  const routeBounds = React.useMemo<[[number, number], [number, number]] | null>(() => {
    if (isEmergencyFocusActive && effectiveUserCoords && destinationCoords) {
      return [effectiveUserCoords, destinationCoords];
    }
    return null;
  }, [isEmergencyFocusActive, effectiveUserCoords, destinationCoords]);

  // Turn-by-turn road snapping via OSRM
  React.useEffect(() => {
    const origin = effectiveUserCoords;
    const dest = destinationCoords;

    if (!origin || !dest) {
      setOsrmRoutePoints(null);
      setRouteDistanceKm(null);
      setRouteDurationMins(null);
      return;
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          if (route.geometry?.coordinates) {
            const points = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            setOsrmRoutePoints(points);
            setRouteDistanceKm((route.distance / 1000).toFixed(1));
            setRouteDurationMins(Math.ceil(route.duration / 60));
            audioTelemetry.speak(`Emergency route locked to ${activeHospital?.name || 'facility'}. Estimated driving time: ${Math.ceil(route.duration / 60)} minutes.`);
          }
        }
      })
      .catch(err => {
        console.warn("OSRM road route fetch fallback error:", err);
        const distKm = calculateDistanceKm(origin, dest);
        const durMins = Math.max(4, Math.ceil(distKm * 2.2));
        setRouteDistanceKm(distKm.toFixed(1));
        setRouteDurationMins(durMins);
        audioTelemetry.speak(`Direct dispatch route active to ${activeHospital?.name || 'facility'}. Estimated transit time: ${durMins} minutes.`);
      });
  }, [effectiveUserCoords, destinationCoords, activeHospital]);

  // Direct line fallback if OSRM is unreachable
  const routePolyline = React.useMemo(() => {
    if (!activeEmergency) return null;
    if (osrmRoutePoints && osrmRoutePoints.length > 0) return osrmRoutePoints;
    const origin = effectiveUserCoords;
    const dest = destinationCoords;
    if (!origin || !dest) return null;
    return [origin, dest] as Array<[number, number]>;
  }, [activeEmergency, osrmRoutePoints, effectiveUserCoords, destinationCoords]);

  // Calculate nearest hospital to an inspected click point
  const closestHospitalToInspected = React.useMemo(() => {
    if (!inspectedPoint) return null;
    let closest: { hospital: Hospital; distKm: number } | null = null;
    hospitals.forEach(h => {
      const coords = extractCoordinates(h);
      if (coords) {
        const dist = calculateDistanceKm(inspectedPoint, coords);
        if (!closest || dist < closest.distKm) {
          closest = { hospital: h, distKm: dist };
        }
      }
    });
    return closest;
  }, [inspectedPoint, hospitals]);

  // Autocomplete search across all facilities, ambulances, emergencies
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return hospitals.slice(0, 6).map(h => {
        const coords = extractCoordinates(h) || [5.6037, -0.1870];
        return {
          type: 'hospital' as const,
          id: h.id,
          title: h.name,
          subtitle: `${h.availableBeds ?? 0} beds free | ${h.address || 'Ghana'}`,
          coords: coords as [number, number]
        };
      });
    }

    const q = searchQuery.toLowerCase();
    const results: Array<{
      type: 'hospital' | 'ambulance' | 'emergency';
      id: string;
      title: string;
      subtitle: string;
      coords: [number, number];
    }> = [];

    hospitals.forEach(h => {
      const coords = extractCoordinates(h);
      if (coords && (h.name.toLowerCase().includes(q) || (h.address && h.address.toLowerCase().includes(q)))) {
        results.push({
          type: 'hospital',
          id: h.id,
          title: h.name,
          subtitle: `${h.availableBeds ?? 0} beds free • ICU: ${h.icuBeds?.available ?? 0}`,
          coords
        });
      }
    });

    ambulances.forEach(a => {
      const coords = extractCoordinates(a);
      const label = a.plateNumber || a.id;
      if (coords && (label.toLowerCase().includes(q) || a.status.toLowerCase().includes(q))) {
        results.push({
          type: 'ambulance',
          id: a.id,
          title: `Unit ${label}`,
          subtitle: `Status: ${a.status.toUpperCase()}`,
          coords
        });
      }
    });

    emergencies.forEach(e => {
      const coords = extractCoordinates(e);
      if (coords && (e.patientName?.toLowerCase().includes(q) || e.emergencyType.toLowerCase().includes(q))) {
        results.push({
          type: 'emergency',
          id: e.id,
          title: e.emergencyType,
          subtitle: `Patient: ${e.patientName || 'Unknown'} (${e.severity.toUpperCase()})`,
          coords
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, hospitals, ambulances, emergencies]);

  const handleSelectResult = (res: { coords: [number, number]; title: string }) => {
    setFlyTarget(res.coords);
    setInspectedPoint(res.coords);
    setIsSearchFocused(false);
    audioTelemetry.speak(`Locating ${res.title}`);
  };

  const toggleAudio = () => {
    const muted = audioTelemetry.toggleMute();
    setIsAudioMuted(muted);
    if (!muted) {
      audioTelemetry.playAlertBeep('success');
      audioTelemetry.speak("Voice HUD telemetry active");
    }
  };

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setInspectedPoint(coords);
          setFlyTarget(coords);
          audioTelemetry.speak("Camera centered on your current location.");
        },
        (err) => {
          console.warn("Geolocation permission or network error:", err);
          if (ambulances[0]) {
            const ambCoords = extractCoordinates(ambulances[0]);
            if (ambCoords) {
              setUserLocation(ambCoords);
              setInspectedPoint(ambCoords);
              setFlyTarget(ambCoords);
            }
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const handleFocusActiveDispatch = () => {
    const ambCoords = extractCoordinates(activeAmbulance);
    if (ambCoords) {
      setFlyTarget(ambCoords);
      setInspectedPoint(ambCoords);
      audioTelemetry.speak(`Camera locked to active unit ${activeAmbulance?.plateNumber || activeAmbulance?.id}`);
    }
  };

  // Map Tile URLs
  const tileUrls = {
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    street: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  return (
    <div className="h-full w-full relative z-0 overflow-hidden select-none">
      {/* Top Floating Bar: Tactical Mission Bar when taking emergency, standard search in overview */}
      {isTakingEmergency ? (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xl px-4 flex flex-col items-center gap-2">
          <div className="w-full bg-slate-900/95 backdrop-blur-md border border-teal-500/40 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
                <Navigation className="h-5 w-5 text-teal-400 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Emergency Mission
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    Destination: {activeHospital?.name || "Target Facility"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 truncate mt-0.5">
                  {routeDurationMins ? `ETA ~${routeDurationMins} mins` : "Computing route..."}
                  {routeDistanceKm ? ` • ${routeDistanceKm} km` : ""}
                  {" • "}
                  <span className={showOnlyEmergencyRoute ? "text-teal-400 font-semibold" : "text-amber-300 font-semibold"}>
                    {showOnlyEmergencyRoute ? "Focus: User, Route & Destination Only" : "Showing All Regional Pins"}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowOnlyEmergencyRoute(prev => !prev)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow",
                  showOnlyEmergencyRoute
                    ? "bg-teal-600 hover:bg-teal-500 text-white border-teal-400 shadow-teal-500/20"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                )}
                title={showOnlyEmergencyRoute ? "Click to view all regional hospital & unit pins" : "Click to focus on emergency route only"}
              >
                {showOnlyEmergencyRoute ? (
                  <>
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>Route Only</span>
                  </>
                ) : (
                  <>
                    <Layers className="h-3.5 w-3.5" />
                    <span>Show All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div ref={searchContainerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xl px-4 flex flex-col gap-2">
          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-teal-500 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search hospitals, ambulances, or emergency cases..."
                className="w-full pl-10 pr-9 py-2.5 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 focus:border-teal-500 rounded-xl shadow-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/40 text-white transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Autocomplete Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 z-[1001] max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between items-center">
                  <span>{searchQuery ? "Search Matches" : "Quick Hospital Suggestions"}</span>
                  <span className="text-teal-400 text-[10px]">OSM Live</span>
                </div>
                {searchResults.map((res) => (
                  <button
                    key={res.type + res.id}
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left p-3 hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">
                        {res.type === 'hospital' ? '🏥' : res.type === 'ambulance' ? '🚑' : '⚠️'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-white group-hover:text-teal-300 truncate">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">{res.subtitle}</p>
                      </div>
                    </div>
                    <Crosshair className="h-3.5 w-3.5 text-slate-400 group-hover:text-teal-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Regional Focus Pills */}
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={handleLocateMe}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 shadow backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <LocateFixed className="h-3 w-3" />
              My Location
            </button>
            <button
              onClick={() => {
                setFlyTarget([6.6961, -1.6310]);
                setInspectedPoint([6.6961, -1.6310]);
                audioTelemetry.speak("Viewing Kumasi Metropolitan Area.");
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-teal-300 border border-teal-500/30 shadow backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Building2 className="h-3 w-3 text-teal-400" />
              Kumasi Metro
            </button>
            <button
              onClick={() => {
                setFlyTarget([5.6037, -0.1870]);
                setInspectedPoint([5.6037, -0.1870]);
                audioTelemetry.speak("Viewing Greater Accra Metropolitan Area.");
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 shadow backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Building2 className="h-3 w-3 text-emerald-400" />
              Accra Metro
            </button>
            <button
              onClick={() => {
                setFlyTarget([7.95, -1.03]);
                audioTelemetry.speak("National facilities overview active.");
              }}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-900/80 hover:bg-slate-800 text-purple-300 border border-purple-500/30 shadow backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Globe className="h-3 w-3 text-purple-400" />
              All Ghana
            </button>
          </div>
        </div>
      )}

      {/* Turn-by-Turn Road Route HUD Banner */}
      {routePolyline && activeHospital && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-md border border-slate-700 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs max-w-sm">
          <div className="h-9 w-9 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
            <Navigation className="h-5 w-5 text-teal-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <span>Road Snapped Route</span>
              {routeDurationMins && (
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px]">
                  ~{routeDurationMins} mins
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              To: <span className="font-medium text-white">{activeHospital.name}</span>
              {routeDistanceKm && ` • ${routeDistanceKm} km`}
            </p>
          </div>
        </div>
      )}

      {/* Floating Tactical Controls Toolbar (Right Side) */}
      <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-2xl">
        {/* Layer Switcher */}
        <button
          onClick={() => setMapTheme(prev => prev === 'dark' ? 'street' : prev === 'street' ? 'satellite' : 'dark')}
          className="p-2 rounded-lg hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center"
          title={`Current Layer: ${mapTheme.toUpperCase()} (Click to toggle)`}
        >
          <Layers className="h-4 w-4 text-teal-400" />
        </button>

        {/* Hotspot Toggle */}
        <button
          onClick={() => setShowHotspots(prev => !prev)}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center",
            showHotspots ? "bg-amber-500/20 text-amber-300" : "hover:bg-slate-800 text-slate-400"
          )}
          title="Toggle Accident Hotspots"
        >
          <Flame className="h-4 w-4" />
        </button>

        {/* Audio Telemetry Toggle */}
        <button
          onClick={toggleAudio}
          className={cn(
            "p-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center",
            !isAudioMuted ? "bg-teal-500/20 text-teal-300" : "hover:bg-slate-800 text-slate-400"
          )}
          title={isAudioMuted ? "Unmute Voice HUD" : "Mute Voice HUD"}
        >
          {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* Locate Me */}
        <button
          onClick={handleLocateMe}
          className="p-2 rounded-lg hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center"
          title="Center on My Location"
        >
          <LocateFixed className="h-4 w-4 text-blue-400" />
        </button>

        {/* Focus Active Dispatch Unit */}
        {activeAmbulance && (
          <button
            onClick={handleFocusActiveDispatch}
            className="p-2 rounded-lg hover:bg-slate-800 text-white transition-colors cursor-pointer flex items-center justify-center"
            title="Track Active Ambulance"
          >
            <Crosshair className="h-4 w-4 text-rose-400" />
          </button>
        )}
      </div>

      {/* Primary Leaflet Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: '#0f0f16' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrls[mapTheme]}
          maxZoom={19}
        />

        <MapController
          hospitals={hospitals}
          ambulances={ambulances}
          emergencies={emergencies}
          targetCoords={flyTarget}
          routeBounds={routeBounds}
          autoFitInitial={false}
        />

        {/* Click anywhere listener: drops inspector pin with live facility metrics */}
        <MapClickHandler
          onMapClick={(coords) => {
            setInspectedPoint(coords);
            audioTelemetry.playAlertBeep('info');
          }}
        />

        {/* Turn-by-Turn Road Route Polyline (interactive: false so clicks pass through) */}
        {routePolyline && (
          <>
            <Polyline
              positions={routePolyline}
              pathOptions={{ color: '#06b6d4', weight: 8, opacity: 0.45, lineCap: 'round', interactive: false }}
            />
            <Polyline
              positions={routePolyline}
              pathOptions={{ color: '#14b8a6', weight: 4.5, opacity: 0.95, dashArray: '10, 10', lineCap: 'round', interactive: false }}
            />
          </>
        )}

        {/* TACTICAL EMERGENCY MODE: When taking an emergency, ONLY user location and destination show! */}
        {isEmergencyFocusActive ? (
          <>
            {/* 1. User's Location Marker */}
            {effectiveUserCoords && (
              <Marker
                position={effectiveUserCoords}
                icon={createPulsingLeafletIcon('#0284c7', '🚑', true)}
                zIndexOffset={1000}
              >
                <Popup>
                  <div className="text-white font-sans p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-sky-400">
                        <Navigation className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
                        <span>Your Live Location</span>
                      </div>
                      <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        Responding
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white">{activeAmbulance?.plateNumber || "Paramedic Unit"}</h4>
                    <p className="text-xs text-slate-300 font-mono bg-slate-950 p-1.5 rounded border border-slate-800 mt-1 mb-1.5">
                      GPS: {effectiveUserCoords[0].toFixed(5)}, {effectiveUserCoords[1].toFixed(5)}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-800/80 p-1.5 rounded">
                      <span>Destination:</span>
                      <span className="font-semibold text-teal-300 truncate max-w-[130px]">{activeHospital?.name || "Target Facility"}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 2. Destination Hospital Marker */}
            {destinationCoords && activeHospital && (
              <Marker
                position={destinationCoords}
                icon={createPulsingLeafletIcon('#10b981', '🏥', true)}
                zIndexOffset={999}
              >
                <Popup>
                  <div className="text-white font-sans p-1 min-w-[240px]">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                        <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Target Destination</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Assigned ER
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-white mb-2">{activeHospital.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                        <span className="block text-[10px] text-emerald-300 font-semibold">Beds Free</span>
                        <span className="text-base font-extrabold text-white">{activeHospital.availableBeds ?? 0}</span>
                      </div>
                      <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-1.5 text-center">
                        <span className="block text-[10px] text-blue-300 font-semibold">ICU Free</span>
                        <span className="text-base font-extrabold text-white">{activeHospital.icuBeds?.available ?? 0}</span>
                      </div>
                    </div>
                    {routeDistanceKm && routeDurationMins && (
                      <div className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[11px] text-teal-300 flex items-center justify-between mb-1.5 font-semibold">
                        <span>Distance: {routeDistanceKm} km</span>
                        <span>ETA: ~{routeDurationMins} mins</span>
                      </div>
                    )}
                    {activeHospital.address && (
                      <p className="text-[11px] text-slate-300 truncate mb-1">📍 {activeHospital.address}</p>
                    )}
                    <p className="text-[11px] text-slate-300 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> <span className="text-white font-medium">{activeHospital.phone || "+233 302 662 000"}</span>
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </>
        ) : (
          <>
            {/* OVERVIEW MODE: Render all regional facilities, ambulances, incidents, hotspots */}
            {showHotspots && accidentHotspots.map((spot, idx) => (
              <Circle
                key={idx}
                center={[spot.lat, spot.lng]}
                radius={spot.radius}
                pathOptions={{
                  color: spot.risk === 'Critical' ? '#ef4444' : '#f59e0b',
                  fillColor: spot.risk === 'Critical' ? '#ef4444' : '#f59e0b',
                  fillOpacity: 0.25,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-white font-sans p-1 min-w-[190px]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-400 mb-1">
                      <Flame className="h-3.5 w-3.5 text-rose-400" />
                      Accident Hotspot
                    </div>
                    <h4 className="font-bold text-sm text-white">{spot.name}</h4>
                    <p className="text-xs text-slate-200 mt-1">Severity: <span className="font-semibold text-rose-300">{spot.risk}</span></p>
                    <p className="text-[11px] text-slate-400 mt-0.5">High collision incidence rate zone</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {userLocation && (
              <Marker
                position={userLocation}
                icon={createPulsingLeafletIcon('#3b82f6', '📍', true)}
              >
                <Popup>
                  <div className="text-white font-sans p-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-400 mb-1">
                      <LocateFixed className="h-3.5 w-3.5 text-blue-400" />
                      Your Device Location
                    </div>
                    <p className="text-xs text-slate-200 font-mono bg-slate-950 p-1.5 rounded border border-slate-700">
                      {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">Live active GPS transmitter point</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {inspectedPoint && (
              <Marker
                position={inspectedPoint}
                icon={createPulsingLeafletIcon('#06b6d4', '🎯', true)}
              >
                <Popup>
                  <div className="text-white font-sans p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                      <span className="text-xs font-bold text-teal-300 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-400" />
                        Inspected Location
                      </span>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
                        GPS Point
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-mono bg-slate-950 p-1.5 rounded border border-slate-800 mb-2">
                      Lat: {inspectedPoint[0].toFixed(5)} | Lng: {inspectedPoint[1].toFixed(5)}
                    </p>
                    {closestHospitalToInspected && (
                      <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2 text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Nearest Facility</span>
                        <p className="font-bold text-white truncate">{closestHospitalToInspected.hospital.name}</p>
                        <p className="text-[11px] text-teal-300 font-semibold mt-0.5">
                          ~{closestHospitalToInspected.distKm.toFixed(1)} km away • {closestHospitalToInspected.hospital.availableBeds ?? 0} beds free
                        </p>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* All Hospitals */}
            {hospitals.map(hospital => {
              const coords = extractCoordinates(hospital);
              if (!coords) return null;
              const bedCount = hospital.availableBeds ?? 0;
              const pinColor = bedCount > 5 ? '#10b981' : bedCount > 0 ? '#f59e0b' : '#ef4444';

              return (
                <Marker
                  key={hospital.id}
                  position={coords}
                  icon={createPulsingLeafletIcon(pinColor, '🏥', bedCount <= 2)}
                >
                  <Popup>
                    <div className="text-white font-sans p-1 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
                        <h4 className="font-bold text-sm text-white truncate">{hospital.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                          <span className="block text-[10px] text-emerald-300 font-semibold">Beds Free</span>
                          <span className="text-base font-extrabold text-white">{hospital.availableBeds}</span>
                        </div>
                        <div className="bg-blue-500/20 border border-blue-500/40 rounded-lg p-1.5 text-center">
                          <span className="block text-[10px] text-blue-300 font-semibold">ICU Free</span>
                          <span className="text-base font-extrabold text-white">{hospital.icuBeds?.available ?? 0}</span>
                        </div>
                      </div>
                      {hospital.address && (
                        <p className="text-[11px] text-slate-200 truncate mb-1">📍 {hospital.address}</p>
                      )}
                      <p className="text-[11px] text-slate-300 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> <span className="text-white font-medium">{hospital.phone || "+233 302 662 000"}</span>
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* All Ambulances */}
            {ambulances.map(ambulance => {
              const coords = extractCoordinates(ambulance);
              if (!coords) return null;
              const isBusy = ambulance.status === 'engaged' || ambulance.status === 'busy' || ambulance.status === 'transporting';
              const pinColor = isBusy ? '#ef4444' : '#0d9488';

              return (
                <Marker
                  key={ambulance.id}
                  position={coords}
                  icon={createPulsingLeafletIcon(pinColor, '🚑', isBusy)}
                >
                  <Popup>
                    <div className="text-white font-sans p-1 min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                        <h4 className="font-bold text-sm text-white">{ambulance.plateNumber || ambulance.id}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                          isBusy 
                            ? "bg-rose-500/25 text-rose-200 border-rose-500/40" 
                            : "bg-teal-500/25 text-teal-200 border-teal-500/40"
                        )}>
                          {ambulance.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200">Unit ID: <span className="font-mono font-semibold text-white">{ambulance.id}</span></p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* All Emergency Incidents */}
            {emergencies.map(emergency => {
              const coords = extractCoordinates(emergency);
              if (!coords) return null;
              const isCritical = emergency.severity === 'critical';
              const pinColor = isCritical ? '#ef4444' : emergency.severity === 'high' ? '#f97316' : '#eab308';

              return (
                <Marker
                  key={emergency.id}
                  position={coords}
                  icon={createPulsingLeafletIcon(pinColor, '⚠️', isCritical)}
                >
                  <Popup>
                    <div className="text-white font-sans p-1 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-1.5">
                        <h4 className="font-bold text-sm text-white truncate">{emergency.emergencyType}</h4>
                        <StatusBadge status={emergency.severity} className="text-xs">
                          {emergency.severity}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-slate-200">Patient: <span className="font-semibold text-white">{emergency.patientName || 'Emergency Patient'}</span></p>
                      <p className="text-xs text-slate-300 mt-1">Assigned: <span className="font-semibold text-teal-300">{emergency.assignedHospital || 'Seeking Facility...'}</span></p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;
