import * as React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer, InfoWindowF, TrafficLayer, HeatmapLayerF } from '@react-google-maps/api';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';
import { cn } from '../ui/utils';
import { LeafletMap } from './LeafletMap';
import { audioTelemetry } from '../../utils/audioTelemetry';
import { Volume2, VolumeX, Flame } from 'lucide-react';

// Premium Dark styling for Google Maps to fit the dashboard theme
const darkMapStyles = [
  { stylers: [{ hue: "#222" }, { saturation: -20 }, { lightness: -20 }] },
  { elementType: "geometry", stylers: [{ color: "#1e1e2d" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a5a5b5" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e1e2d" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3d3d5c" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#c5c5d5" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#e1e1eb" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#a5a5b5" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1a231a" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#85a385" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2d2d3f" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7a7a95" }] },
  { featureType: "road.arterial", elementType: "geometry.fill", stylers: [{ color: "#36364f" }] },
  { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#424263" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#54547a" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#6e6e85" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f0f16" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#47476b" }] }
];

const createSvgMarker = (color: string, emoji: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="black" flood-opacity="0.4"/>
        </filter>
      </defs>
      <path d="M17 2 C9 2 3 8 3 16 C3 25 17 42 17 42 C17 42 31 25 31 16 C31 8 25 2 17 2 Z" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="17" cy="16" r="10" fill="white"/>
      <text x="17" y="21" font-size="14" text-anchor="middle" font-family="Segoe UI Symbol, Apple Color Emoji">${emoji}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg.trim())}`;
};

const createUserLocationMarker = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="12" fill="#2563eb" opacity="0.35">
        <animate attributeName="r" values="8;15;8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="16" cy="16" r="7" fill="#3b82f6" stroke="white" stroke-width="2.5" />
    </svg>
  `;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg.trim())}`;
};

export interface MarkerDetails {
  id: string;
  type: 'hospital' | 'ambulance' | 'emergency';
  position: { lat: number; lng: number };
  title: string;
  description: React.ReactNode;
}

interface LiveMapProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
  center?: [number, number];
  zoom?: number;
  activeRouteCaseId?: string | null;
}

export const LiveMap: React.FC<LiveMapProps> = ({
  emergencies,
  ambulances,
  hospitals,
  center = [5.6037, -0.1870],
  zoom = 15,
  activeRouteCaseId = null
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: ['places', 'visualization']
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [directionsResponse, setDirectionsResponse] = React.useState<google.maps.DirectionsResult | null>(null);
  
  // Marker Popup & Audio State
  const [activeMarker, setActiveMarker] = React.useState<MarkerDetails | null>(null);
  const [hoveredMarker, setHoveredMarker] = React.useState<MarkerDetails | null>(null);
  const [isAudioMuted, setIsAudioMuted] = React.useState<boolean>(audioTelemetry.getMuted());
  const [showHeatmap, setShowHeatmap] = React.useState<boolean>(false);
  
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  // Controls & Fallback State — DEFAULT 3D TILT 60° ON BOOT
  const [mapTheme, setMapTheme] = React.useState<'dark' | 'light' | 'hybrid'>('dark');
  const [showTraffic, setShowTraffic] = React.useState<boolean>(true);
  const [tilt3D, setTilt3D] = React.useState<number>(60);
  const [heading, setHeading] = React.useState<number>(0);
  const [useOsmFallback, setUseOsmFallback] = React.useState<boolean>(false);
  const [authFailed, setAuthFailed] = React.useState<boolean>(false);

  // Search Bar State
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = React.useState<boolean>(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  const is3DActive = tilt3D > 0;
  const initialFitDoneRef = React.useRef<boolean>(false);

  // Active Popup to Display (Clicked/Searched marker > Hovered marker)
  const displayedMarker = activeMarker || hoveredMarker;

  // Historic Ghana Emergency Incident Hotspots (Circle, Accra Central, Kaneshie, KNUST, Tema)
  const heatmapData = React.useMemo(() => {
    if (!isLoaded || typeof window === 'undefined' || !window.google) return [];
    
    const points = [
      { lat: 5.556, lng: -0.205, weight: 8 }, // Circle Interchange
      { lat: 5.548, lng: -0.201, weight: 7 }, // Accra Central
      { lat: 5.562, lng: -0.233, weight: 6 }, // Kaneshie Market
      { lat: 5.603, lng: -0.187, weight: 5 }, // Ridge Hospital Hub
      { lat: 6.673, lng: -1.565, weight: 7 }, // KNUST Junction (Kumasi)
      { lat: 5.669, lng: -0.016, weight: 5 }, // Tema Motorway
    ];

    emergencies.forEach(e => {
      if (e.location?.lat && e.location?.lng) {
        points.push({
          lat: e.location.lat,
          lng: e.location.lng,
          weight: e.severity === 'critical' ? 10 : 5
        });
      }
    });

    return points.map(p => ({
      location: new window.google.maps.LatLng(p.lat, p.lng),
      weight: p.weight
    }));
  }, [isLoaded, emergencies]);

  // Close search dropdown on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Intercept Google Maps Auth Failure
  React.useEffect(() => {
    (window as any).gm_authFailure = () => {
      console.warn("Google Maps Auth Failure detected. Auto-switching to OpenStreetMap.");
      setAuthFailed(true);
    };
  }, []);

  // Watch browser physical location
  React.useEffect(() => {
    if ("geolocation" in navigator) {
      const id = navigator.geolocation.watchPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => console.error("Error watching user location in LiveMap:", err),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    }
  }, []);

  const lastRequestedRouteRef = React.useRef<string>("");

  // Dynamic Search & Suggestion Results
  const searchResults = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    
    if (!q) {
      return hospitals.slice(0, 6).map(h => ({
        id: h.id,
        title: h.name,
        subtitle: `${h.availableBeds} beds available • ${h.location?.address || 'Ghana'}`,
        type: 'hospital' as const,
        lat: h.location.lat,
        lng: h.location.lng,
        raw: h
      }));
    }

    const matchedHospitals = hospitals.filter(h => 
      h.name.toLowerCase().includes(q) || h.location?.address?.toLowerCase().includes(q)
    ).map(h => ({
      id: h.id,
      title: h.name,
      subtitle: `${h.availableBeds} beds free • ${h.location?.address || 'Hospital'}`,
      type: 'hospital' as const,
      lat: h.location.lat,
      lng: h.location.lng,
      raw: h
    }));

    const matchedEmergencies = emergencies.filter(e => 
      e.emergencyType.toLowerCase().includes(q) || e.patientName.toLowerCase().includes(q)
    ).map(e => ({
      id: e.id,
      title: `${e.emergencyType} (${e.patientName})`,
      subtitle: `Severity: ${e.severity} • Status: ${e.status}`,
      type: 'emergency' as const,
      lat: e.location.lat,
      lng: e.location.lng,
      raw: e
    }));

    const matchedAmbulances = ambulances.filter(a => 
      (a.plateNumber && a.plateNumber.toLowerCase().includes(q)) || a.id.toLowerCase().includes(q)
    ).map(a => ({
      id: a.id,
      title: `Ambulance ${a.plateNumber || a.id}`,
      subtitle: `Status: ${a.status}`,
      type: 'ambulance' as const,
      lat: a.location.lat,
      lng: a.location.lng,
      raw: a
    }));

    return [...matchedHospitals, ...matchedEmergencies, ...matchedAmbulances].slice(0, 7);
  }, [searchQuery, hospitals, emergencies, ambulances]);

  // Helper to construct marker details
  const getHospitalMarkerDetails = (h: Hospital): MarkerDetails => {
    const bedCount = h.availableBeds ?? 0;
    return {
      id: h.id,
      type: 'hospital',
      position: { lat: h.location.lat, lng: h.location.lng },
      title: h.name,
      description: (
        <div className="font-sans min-w-[210px]">
          <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 mb-2">
            <h4 className="font-bold text-sm text-foreground truncate">{h.name}</h4>
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-bold rounded-full text-white flex-shrink-0",
              bedCount > 5 ? "bg-emerald-600" : bedCount > 0 ? "bg-amber-600" : "bg-red-600"
            )}>
              {bedCount > 0 ? `${bedCount} Beds Free` : "FULL"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Emergency Contact: <span className="font-semibold text-foreground">{h.phone || "+233 302 662 000"}</span></p>
          <p className="text-xs text-muted-foreground mt-1">ICU Capacity: <span className="font-semibold text-blue-500">{h.icuBeds?.available ?? 0} available</span></p>
        </div>
      )
    };
  };

  const getAmbulanceMarkerDetails = (a: Ambulance): MarkerDetails => ({
    id: a.id,
    type: 'ambulance',
    position: { lat: a.location.lat, lng: a.location.lng },
    title: a.plateNumber || a.id,
    description: (
      <div className="font-sans min-w-[180px]">
        <h4 className="font-bold text-sm text-foreground">{a.plateNumber || a.id}</h4>
        <p className="text-xs text-muted-foreground mt-1">Status: <span className="font-semibold text-blue-500 capitalize">{a.status}</span></p>
        {a.assignedEmergency && (
          <p className="text-xs text-blue-500 font-semibold mt-1">Assigned Case: {a.assignedEmergency.substring(0, 8)}...</p>
        )}
      </div>
    )
  });

  const getEmergencyMarkerDetails = (e: Emergency): MarkerDetails => ({
    id: e.id,
    type: 'emergency',
    position: { lat: e.location.lat, lng: e.location.lng },
    title: e.emergencyType,
    description: (
      <div className="font-sans min-w-[200px]">
        <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2 mb-2">
          <h4 className="font-bold text-sm text-foreground">{e.emergencyType}</h4>
          <StatusBadge status={e.severity} className="text-xs font-semibold scale-90">
            {e.severity}
          </StatusBadge>
        </div>
        <p className="text-xs text-muted-foreground">Patient: <span className="font-semibold text-foreground">{e.patientName}</span></p>
        <p className="text-xs text-muted-foreground mt-1">Status: <span className="font-semibold text-foreground capitalize">{e.status}</span></p>
        {e.assignedHospital && (
          <p className="text-xs text-blue-500 font-semibold mt-1">Hospital: {e.assignedHospital}</p>
        )}
      </div>
    )
  });

  // Smooth Camera Flight Animation to selected item
  const handleSelectSearchResult = (result: typeof searchResults[0]) => {
    if (!result.lat || !result.lng) return;

    setSearchQuery("");
    setIsSearchFocused(false);

    if (map) {
      map.panTo({ lat: result.lat, lng: result.lng });
      map.setZoom(17);
      setTilt3D(60);
      setHeading(35);
      audioTelemetry.speak(`Navigating 3D camera to ${result.title}`);
    }

    if (result.type === 'hospital') {
      setActiveMarker(getHospitalMarkerDetails(result.raw as Hospital));
    } else if (result.type === 'ambulance') {
      setActiveMarker(getAmbulanceMarkerDetails(result.raw as Ambulance));
    } else if (result.type === 'emergency') {
      setActiveMarker(getEmergencyMarkerDetails(result.raw as Emergency));
    }
  };

  const handleClosePopup = () => {
    setActiveMarker(null);
    setHoveredMarker(null);
  };

  const toggleAudio = () => {
    const muted = audioTelemetry.toggleMute();
    setIsAudioMuted(muted);
    if (!muted) {
      audioTelemetry.playAlertBeep('success');
      audioTelemetry.speak("Voice HUD telemetry active");
    }
  };

  const onLoad = React.useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  // Directions routing for active emergency dispatch
  React.useEffect(() => {
    if (!isLoaded || !activeRouteCaseId || useOsmFallback || authFailed) {
      setDirectionsResponse(null);
      lastRequestedRouteRef.current = "";
      return;
    }

    const emergency = emergencies.find(e => e.id === activeRouteCaseId);
    if (!emergency || !emergency.assignedHospital) {
      setDirectionsResponse(null);
      lastRequestedRouteRef.current = "";
      return;
    }

    const hospital = hospitals.find(h =>
      h.id === emergency.assignedHospital || h.name === emergency.assignedHospital
    );

    const ambulance = ambulances.find(a =>
      a.id === emergency.ambulanceId || a.assignedEmergency === emergency.id || a.status === 'engaged'
    ) || ambulances[0];

    const originCoords = userCoords || (ambulance ? { lat: ambulance.location.lat, lng: ambulance.location.lng } : null) || (emergency.location);

    if (!hospital || !originCoords || !originCoords.lat || !hospital.location?.lat) {
      setDirectionsResponse(null);
      lastRequestedRouteRef.current = "";
      return;
    }

    const userLatRound = userCoords ? userCoords.lat.toFixed(3) : "no-user-gps";
    const userLngRound = userCoords ? userCoords.lng.toFixed(3) : "no-user-gps";
    const routeKey = `${activeRouteCaseId}-${ambulance?.id || "no-amb"}-${hospital.id}-${userLatRound}-${userLngRound}`;
    if (lastRequestedRouteRef.current === routeKey) {
      return;
    }

    lastRequestedRouteRef.current = routeKey;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: originCoords.lat, lng: originCoords.lng },
        destination: { lat: hospital.location.lat, lng: hospital.location.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
          audioTelemetry.playAlertBeep('warning');
          audioTelemetry.speak(`3D Cockpit active. Driving route set to ${hospital.name}.`);
        } else {
          console.error(`Directions request failed: ${status}`);
          lastRequestedRouteRef.current = "";
        }
      }
    );
  }, [activeRouteCaseId, emergencies, ambulances, hospitals, isLoaded, userCoords, useOsmFallback, authFailed]);

  // Automatically pan camera to user's physical GPS location & set 3D cockpit tilt when route is active
  React.useEffect(() => {
    if (!map || !isLoaded || !activeRouteCaseId) return;

    const emergency = emergencies.find(e => e.id === activeRouteCaseId);
    const ambulance = ambulances.find(a => 
      a.id === emergency?.ambulanceId || a.assignedEmergency === activeRouteCaseId
    );
    const origin = userCoords || (ambulance?.location) || (emergency?.location);

    if (origin && origin.lat && origin.lng) {
      map.panTo({ lat: origin.lat, lng: origin.lng });
      map.setZoom(17);
      setTilt3D(60);
      setHeading(35);
    }
  }, [map, isLoaded, activeRouteCaseId, userCoords, emergencies, ambulances]);

  // Fit bounds helper (Runs ONLY on explicit button click or initial mount)
  const fitAllBounds = React.useCallback(() => {
    if (!map || !isLoaded) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    ambulances.forEach(a => {
      if (a.location?.lat && a.location?.lng) {
        bounds.extend({ lat: a.location.lat, lng: a.location.lng });
        hasPoints = true;
      }
    });
    emergencies.forEach(e => {
      if (e.location?.lat && e.location?.lng) {
        bounds.extend({ lat: e.location.lat, lng: e.location.lng });
        hasPoints = true;
      }
    });
    hospitals.forEach(h => {
      if (h.location?.lat && h.location?.lng) {
        bounds.extend({ lat: h.location.lat, lng: h.location.lng });
        hasPoints = true;
      }
    });

    if (hasPoints) {
      map.fitBounds(bounds);
    }
  }, [map, isLoaded, ambulances, emergencies, hospitals]);

  // Initial map positioning (Runs ONLY ONCE on initial map load if no active route)
  React.useEffect(() => {
    if (!map || !isLoaded || initialFitDoneRef.current) return;
    initialFitDoneRef.current = true;
    if (!activeRouteCaseId) {
      fitAllBounds();
    }
  }, [map, isLoaded, activeRouteCaseId, fitAllBounds]);

  if (authFailed || useOsmFallback || loadError) {
    return (
      <LeafletMap
        emergencies={emergencies}
        ambulances={ambulances}
        hospitals={hospitals}
        center={center}
        zoom={zoom}
        activeRouteCaseId={activeRouteCaseId}
        isFallbackMode={true}
        onRetryGoogleMaps={() => {
          setAuthFailed(false);
          setUseOsmFallback(false);
        }}
      />
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--card)] text-foreground border border-border rounded-lg relative overflow-hidden">
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-semibold text-lg text-foreground">Loading 3D Google Maps...</p>
            <p className="text-xs text-muted-foreground">Initializing 3D building extrusions & telemetry</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative z-0">
      {/* Prominent Top Floating Search Bar */}
      <div ref={searchContainerRef} className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-md px-4">
        <div className="relative">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-blue-500 text-sm font-bold">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              placeholder="Search hospital, ambulance, or emergency..."
              className="w-full pl-10 pr-9 py-2.5 bg-card/95 backdrop-blur-md border-2 border-blue-500/60 rounded-xl shadow-2xl text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-blue-500/40 text-foreground transition-all placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 text-muted-foreground hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isSearchFocused && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden divide-y divide-border/40 z-[1001] max-h-72 overflow-y-auto">
              <div className="px-3 py-1.5 bg-muted/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>{searchQuery ? "Search Matches" : "Quick Hospital Suggestions"}</span>
                <span>Click to Fly 3D ✈️</span>
              </div>
              {searchResults.map((res) => (
                <button
                  key={res.type + res.id}
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-3 hover:bg-accent/60 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground group-hover:text-blue-500 truncate">{res.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{res.subtitle}</p>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all flex-shrink-0">
                    Fly 3D ✈️
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Controls Panel (Top Right) */}
      <div className="absolute top-4 right-4 z-[999] flex flex-col gap-2 bg-card/90 backdrop-blur-md border border-border p-2.5 rounded-xl shadow-2xl text-foreground">
        <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-lg">
          <button
            onClick={() => setMapTheme('dark')}
            title="Dark Theme"
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
              mapTheme === 'dark' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
            )}
          >
            🌙 Dark
          </button>
          <button
            onClick={() => setMapTheme('light')}
            title="Light Theme"
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
              mapTheme === 'light' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
            )}
          >
            ☀️ Light
          </button>
          <button
            onClick={() => setMapTheme('hybrid')}
            title="Satellite Theme"
            className={cn(
              "px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
              mapTheme === 'hybrid' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-accent text-muted-foreground"
            )}
          >
            🛰️ Sat
          </button>
          <button
            onClick={() => setUseOsmFallback(true)}
            title="Switch to Free OpenStreetMap Engine"
            className="px-2 py-1 text-xs font-semibold rounded-md hover:bg-amber-500/20 text-amber-500 border border-amber-500/40 transition-all cursor-pointer"
          >
            🗺️ OSM
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 pt-1">
          <button
            onClick={() => setShowTraffic(!showTraffic)}
            title="Toggle Traffic Layer"
            className={cn(
              "py-1.5 px-1.5 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer",
              showTraffic ? "bg-amber-500/20 border-amber-500/50 text-amber-500 font-semibold" : "bg-card border-border hover:bg-accent text-foreground"
            )}
          >
            🚦 Traffic
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            title="Toggle Incident Density Heatmap"
            className={cn(
              "py-1.5 px-1.5 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer",
              showHeatmap ? "bg-red-500/20 border-red-500/50 text-red-400 font-semibold" : "bg-card border-border hover:bg-accent text-foreground"
            )}
          >
            <Flame className="h-3.5 w-3.5 text-red-500" /> Heat
          </button>

          <button
            onClick={toggleAudio}
            title="Toggle Voice HUD Prompt"
            className={cn(
              "py-1.5 px-1.5 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer",
              !isAudioMuted ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-semibold" : "bg-card border-border hover:bg-accent text-muted-foreground"
            )}
          >
            {!isAudioMuted ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />} Voice
          </button>

          <button
            onClick={fitAllBounds}
            title="Fit All Facilities & Vehicles"
            className="py-1.5 px-1.5 text-xs font-medium bg-card border-border hover:bg-accent text-foreground rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            🗺️ Fit
          </button>
        </div>

        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          <button
            onClick={() => {
              if (is3DActive) {
                setTilt3D(0);
                setHeading(0);
              } else {
                setTilt3D(60);
                if (map) map.setZoom(17);
              }
            }}
            title="Toggle 3D Mode"
            className={cn(
              "flex-1 py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer",
              is3DActive ? "bg-violet-500/20 border-violet-500/50 text-violet-400 font-semibold" : "bg-card border-border hover:bg-accent text-foreground"
            )}
          >
            🏙️ 3D {is3DActive ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setHeading(prev => (prev + 45) % 360)}
            disabled={!is3DActive}
            title="Rotate Camera 45°"
            className="flex-1 py-1.5 px-2 text-xs font-medium bg-card border-border hover:bg-accent text-foreground rounded-lg border transition-all flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            🔄 Rotate
          </button>
          <button
            onClick={() => { setTilt3D(0); setHeading(0); }}
            disabled={!is3DActive}
            title="Flatten Camera to 2D"
            className="flex-1 py-1.5 px-2 text-xs font-medium bg-card border-border hover:bg-accent text-foreground rounded-lg border transition-all flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
          >
            ⬆️ Flat
          </button>
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
        center={{ lat: center[0], lng: center[1] }}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          mapTypeId: mapTheme === 'hybrid' ? 'hybrid' : 'roadmap',
          tilt: tilt3D,
          heading: heading,
          styles: mapTheme === 'dark' ? darkMapStyles : undefined
        }}
      >
        {showTraffic && <TrafficLayer />}

        {showHeatmap && heatmapData.length > 0 && (
          <HeatmapLayerF
            data={heatmapData}
            options={{
              radius: 40,
              opacity: 0.75
            }}
          />
        )}

        {directionsResponse && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              preserveViewport: false,
              polylineOptions: {
                strokeColor: "#3b82f6",
                strokeOpacity: 0.9,
                strokeWeight: 6
              }
            }}
          />
        )}

        {userCoords && (
          <MarkerF
            position={userCoords}
            icon={{
              url: createUserLocationMarker(),
              scaledSize: new window.google.maps.Size(32, 32),
              anchor: new window.google.maps.Point(16, 16)
            }}
            zIndex={1000}
          />
        )}

        {/* Hospitals — Supports Hover & Click Events */}
        {hospitals.map((hospital) => {
          if (!hospital.location?.lat || !hospital.location?.lng) return null;
          
          const bedCount = hospital.availableBeds ?? 0;
          const pinColor = bedCount > 5 ? "#22c55e" : bedCount > 0 ? "#eab308" : "#ef4444";
          const details = getHospitalMarkerDetails(hospital);

          return (
            <MarkerF
              key={hospital.id}
              position={{ lat: hospital.location.lat, lng: hospital.location.lng }}
              icon={{
                url: createSvgMarker(pinColor, "🏥"),
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onMouseOver={() => setHoveredMarker(details)}
              onClick={() => {
                setActiveMarker(details);
                setHoveredMarker(null);
              }}
            />
          );
        })}

        {/* Ambulances — Supports Hover & Click Events */}
        {ambulances.map((ambulance) => {
          if (!ambulance.location?.lat || !ambulance.location?.lng) return null;
          const isEngaged = ambulance.status === 'engaged' || ambulance.assignedEmergency;
          const details = getAmbulanceMarkerDetails(ambulance);

          return (
            <MarkerF
              key={ambulance.id}
              position={{ lat: ambulance.location.lat, lng: ambulance.location.lng }}
              icon={{
                url: createSvgMarker(isEngaged ? "#ef4444" : "#3b82f6", "🚑"),
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onMouseOver={() => setHoveredMarker(details)}
              onClick={() => {
                setActiveMarker(details);
                setHoveredMarker(null);
              }}
            />
          );
        })}

        {/* Emergencies — Supports Hover & Click Events */}
        {emergencies.map((emergency) => {
          if (!emergency.location?.lat || !emergency.location?.lng) return null;
          const details = getEmergencyMarkerDetails(emergency);

          return (
            <MarkerF
              key={emergency.id}
              position={{ lat: emergency.location.lat, lng: emergency.location.lng }}
              icon={{
                url: createSvgMarker("#ef4444", "⚠️"),
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onMouseOver={() => setHoveredMarker(details)}
              onClick={() => {
                setActiveMarker(details);
                setHoveredMarker(null);
              }}
            />
          );
        })}

        {/* InfoWindow Popup (Renders for Active Clicked OR Hovered Marker, Closes Cleanly) */}
        {displayedMarker && (
          <InfoWindowF
            position={displayedMarker.position}
            onCloseClick={handleClosePopup}
          >
            {displayedMarker.description}
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};

export default LiveMap;
