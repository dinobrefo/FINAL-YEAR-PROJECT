import * as React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';
import { audioTelemetry } from '../../utils/audioTelemetry';
import { cartoService } from '../../services/cartoService';
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
  Globe,
  Radio,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  CornerUpRight,
  CornerUpLeft,
  RotateCw,
  Zap,
  Siren,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Compass,
  Eye,
  X
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import {
  isGoogleMapsConfigured,
  loadGoogleMapsScript,
  searchGooglePlaces,
  fetchGoogleDirections,
  getGoogleMapsApiKey,
  GooglePlaceResult,
  TrafficSegment,
  NavigationManeuver,
  RouteAlternative
} from '../../utils/googleMapsLoader';
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

/**
 * Clock arrival time formatter for Google Maps Navigation HUD
 */
export const formatArrivalTime = (durationMins: number | null): string => {
  if (!durationMins || durationMins <= 0) return '';
  const arrival = new Date(Date.now() + durationMins * 60000);
  return arrival.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

// Animated En-Route Siren Ambulance Marker Icon with Heading Rotation & Dual Strobe
const createSirenVehicleIcon = (headingDeg = 0, isSirenActive = true) => {
  return L.divIcon({
    className: 'custom-siren-vehicle-marker',
    html: `
      <div style="position: relative; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        ${isSirenActive ? `
          <!-- Emergency Dual Siren Flash Rings (Red & Blue Strobe) -->
          <div style="
            position: absolute;
            width: 46px;
            height: 46px;
            border-radius: 50%;
            border: 3px solid #ef4444;
            opacity: 0.85;
            animation: siren-pulse-red 0.9s infinite cubic-bezier(0.4, 0, 0.6, 1);
            pointer-events: none;
          "></div>
          <div style="
            position: absolute;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: 3px solid #3b82f6;
            opacity: 0.85;
            animation: siren-pulse-blue 0.9s infinite cubic-bezier(0.4, 0, 0.6, 1) 0.45s;
            pointer-events: none;
          "></div>
        ` : ''}

        <!-- Vehicle Core Body (Rotated towards live Heading) -->
        <div style="
          transform: rotate(${headingDeg}deg);
          transition: transform 0.2s ease-out;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          border: 2px solid #38bdf8;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.65), 0 6px 12px rgba(0,0,0,0.6);
        ">
          <span style="font-size: 20px; line-height: 1; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🚑</span>
        </div>

        <!-- Code 1 Siren Beacon Indicator -->
        <div style="
          position: absolute;
          top: 1px;
          right: 1px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          animation: beacon-blink 0.4s infinite alternate;
        "></div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// Google Maps Authentic Origin Concentric Blue Marker (matches Crunchmasters marker in screenshot)
const createGoogleOriginIcon = () => {
  return L.divIcon({
    className: 'custom-google-origin-marker',
    html: `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ffffff;
          border: 2.5px solid #1a73e8;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.55);
        ">
          <div style="
            width: 9px;
            height: 9px;
            border-radius: 50%;
            background: #1a73e8;
          "></div>
        </div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11]
  });
};

// Google Maps Authentic Red Teardrop Destination Pin (matches Amakom pin in screenshot)
const createGoogleDestinationIcon = () => {
  return L.divIcon({
    className: 'custom-google-dest-marker',
    html: `
      <div style="position: relative; width: 32px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.55));">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 26.5 16 42 16 42C16 42 32 26.5 32 16C32 7.163 24.837 0 16 0Z" fill="#EA4335" stroke="#FFFFFF" stroke-width="1.5"/>
          <ellipse cx="16" cy="15" rx="5.5" ry="5.5" fill="#A50E0E"/>
        </svg>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42]
  });
};

// Google Maps Turn Waypoint Dot (matches intermediate junction dots in screenshot)
const createGoogleWaypointDotIcon = () => {
  return L.divIcon({
    className: 'custom-google-waypoint-dot',
    html: `
      <div style="
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #ffffff;
        border: 2px solid #1a73e8;
        box-shadow: 0 1px 4px rgba(0,0,0,0.65);
        pointer-events: none;
      "></div>
    `,
    iconSize: [8, 8],
    iconAnchor: [4, 4]
  });
};

// Google Maps Floating On-Route ETA Tooltip (matches the white 18 min / 7.9 km card in screenshot)
const createRouteEtaBadgeIcon = (durationMins: number | null, distanceKm: string | null) => {
  const timeText = durationMins ? `${durationMins} min` : '18 min';
  const rawDist = distanceKm ? String(distanceKm).replace(/\s*km/gi, '').trim() : '7.9';
  const distText = `${rawDist} km`;

  return L.divIcon({
    className: 'custom-google-route-eta-badge',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 96px;
        background: #ffffff;
        color: #202124;
        padding: 6px 10px;
        border-radius: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.38), 0 0 2px rgba(0,0,0,0.15);
        border: 1px solid rgba(0,0,0,0.14);
        font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        text-align: center;
        box-sizing: border-box;
        user-select: none;
        cursor: pointer;
      ">
        <!-- Line 1: Google Monochrome Vector Car + Bold Duration -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 5px; font-weight: 700; font-size: 13px; line-height: 16px; color: #202124; white-space: nowrap;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color: #3c4043; flex-shrink: 0; display: inline-block;">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z"/>
            <circle cx="7.5" cy="14.5" r="1.5"/>
            <circle cx="16.5" cy="14.5" r="1.5"/>
          </svg>
          <span style="letter-spacing: -0.2px;">${timeText}</span>
        </div>

        <!-- Line 2: Distance in Kilometers -->
        <div style="font-size: 11px; font-weight: 500; color: #5f6368; line-height: 14px; margin-top: 2px; white-space: nowrap;">
          ${distText}
        </div>

        <!-- Downward Pointer Triangle Anchored to Polyline -->
        <div style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid #ffffff;
        "></div>
      </div>
    `,
    iconSize: [96, 52],
    iconAnchor: [48, 52]
  });
};

// Alternative route ETA badge (Google Maps grey secondary corridor style)
const createRouteAltEtaBadgeIcon = (durationMins: number | null, distanceKm: string | null) => {
  const timeText = durationMins ? `${durationMins} min` : '22 min';
  const rawDist = distanceKm ? String(distanceKm).replace(/\s*km/gi, '').trim() : '8.4';
  const distText = `${rawDist} km`;

  return L.divIcon({
    className: 'custom-google-route-eta-badge',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 88px;
        background: #f1f3f4;
        color: #5f6368;
        padding: 5px 8px;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        border: 1px solid #dadce0;
        font-family: Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        text-align: center;
        box-sizing: border-box;
        user-select: none;
        cursor: pointer;
      ">
        <div style="font-weight: 700; font-size: 12px; line-height: 15px; color: #3c4043; white-space: nowrap;">
          ${timeText}
        </div>
        <div style="font-size: 10px; font-weight: 500; color: #70757a; line-height: 13px; margin-top: 1px; white-space: nowrap;">
          ${distText}
        </div>
        <div style="
          position: absolute;
          bottom: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid #f1f3f4;
        "></div>
      </div>
    `,
    iconSize: [88, 48],
    iconAnchor: [44, 48]
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
  chaseCoords?: [number, number] | null;
  isChaseActive?: boolean;
}> = ({ hospitals, ambulances, emergencies, targetCoords, targetZoom = 15, routeBounds, autoFitInitial = false, chaseCoords, isChaseActive = false }) => {
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

  // Chase Camera: follow animated ambulance in real-time
  React.useEffect(() => {
    if (isChaseActive && chaseCoords) {
      map.panTo(chaseCoords, { animate: true, duration: 0.25 });
    }
  }, [map, chaseCoords, isChaseActive]);

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
  // Tile Layer options: dark, street, satellite, google-traffic, google-hybrid, google-streets
  const { effectiveTheme } = useTheme();
  const [mapTheme, setMapTheme] = React.useState<
    'dark' | 'street' | 'satellite' | 'google-traffic' | 'google-hybrid' | 'google-streets'
  >(effectiveTheme === 'light' ? 'street' : 'dark');
  const userManuallyChangedMapTheme = React.useRef(false);

  React.useEffect(() => {
    if (!userManuallyChangedMapTheme.current) {
      setMapTheme(effectiveTheme === 'light' ? 'street' : 'dark');
    }
  }, [effectiveTheme]);
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
  const [sirenDurationMins, setSirenDurationMins] = React.useState<number | null>(null);
  const [routeTrafficSource, setRouteTrafficSource] = React.useState<'google_live' | 'osrm' | 'direct' | null>(null);
  const [trafficSegments, setTrafficSegments] = React.useState<TrafficSegment[]>([]);
  const [navigationManeuvers, setNavigationManeuvers] = React.useState<NavigationManeuver[]>([]);
  const [routeAlternatives, setRouteAlternatives] = React.useState<RouteAlternative[]>([]);
  const [selectedAltIndex, setSelectedAltIndex] = React.useState<number>(0);
  const [routeSummary, setRouteSummary] = React.useState<string | null>(null);

  // Live Ambulance On-Route Motion Simulation States
  const [isDriving, setIsDriving] = React.useState<boolean>(false);
  const [driveProgress, setDriveProgress] = React.useState<number>(0); // 0.0 to 1.0
  const [animatedCoords, setAnimatedCoords] = React.useState<[number, number] | null>(null);
  const [animatedHeading, setAnimatedHeading] = React.useState<number>(0);
  const [currentSpeedKmh, setCurrentSpeedKmh] = React.useState<number>(0);
  const [playbackRate, setPlaybackRate] = React.useState<number>(1); // 1x, 2x, 4x
  const [isChaseActive, setIsChaseActive] = React.useState<boolean>(false);

  // Google Places search results for live Ghana geocoding
  const [googlePlacesResults, setGooglePlacesResults] = React.useState<GooglePlaceResult[]>([]);

  // CARTO 15-minute emergency catchment isolines
  const [showCartoCatchment, setShowCartoCatchment] = React.useState<boolean>(false);
  const [cartoCatchmentData, setCartoCatchmentData] = React.useState<any | null>(null);
  const [isLoadingCatchment, setIsLoadingCatchment] = React.useState<boolean>(false);
  const [catchmentHospitalName, setCatchmentHospitalName] = React.useState<string>("");

  // Emergency Focus Mode: when taking an emergency, default to showing ONLY user's location, route and destination
  const [showOnlyEmergencyRoute, setShowOnlyEmergencyRoute] = React.useState<boolean>(true);

  // Auto-load Google Maps SDK on mount if key configured
  React.useEffect(() => {
    if (isGoogleMapsConfigured()) {
      loadGoogleMapsScript();
    }
  }, []);

  // Debounced Google Places autocomplete search across Ghana
  React.useEffect(() => {
    if (!isGoogleMapsConfigured() || !searchQuery.trim() || searchQuery.trim().length < 2) {
      setGooglePlacesResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const places = await searchGooglePlaces(searchQuery);
        setGooglePlacesResults(places);
      } catch (err) {
        console.warn("Google Places lookup error:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Fetch CARTO 15-Minute Emergency Catchment Isoline when toggled
  React.useEffect(() => {
    if (!showCartoCatchment) {
      setCartoCatchmentData(null);
      return;
    }

    const targetHospital = activeHospital || hospitals[0];
    if (!targetHospital || !targetHospital.latitude || !targetHospital.longitude) {
      return;
    }

    let isMounted = true;
    setIsLoadingCatchment(true);
    setCatchmentHospitalName(targetHospital.name);

    cartoService.fetchHospitalIsoline(targetHospital.latitude, targetHospital.longitude, 900)
      .then(res => {
        if (!isMounted) return;
        setIsLoadingCatchment(false);
        if (res && res.geoJson && res.geoJson.features && res.geoJson.features[0]) {
          const geom = res.geoJson.features[0].geometry as any;
          if (geom.type === 'Polygon') {
            const leafCoords = geom.coordinates[0].map(([lng, lat]: [number, number]) => [lat, lng]);
            setCartoCatchmentData(leafCoords);
          } else if (geom.type === 'MultiPolygon') {
            const leafCoords = geom.coordinates.map((poly: any) => 
              poly[0].map(([lng, lat]: [number, number]) => [lat, lng])
            );
            setCartoCatchmentData(leafCoords);
          }
        }
      })
      .catch(err => {
        if (!isMounted) return;
        setIsLoadingCatchment(false);
        console.warn('CARTO catchment fetch failed:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [showCartoCatchment, activeHospital, hospitals]);

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

  const primaryRouteRef = React.useRef<{
    points: Array<[number, number]>;
    distanceKm: string;
    durationMins: number;
    sirenDurationMins: number;
    summary: string;
    trafficSegments: TrafficSegment[];
    maneuvers: NavigationManeuver[];
  } | null>(null);

  const handleSelectRouteAlternative = (altIdx: number) => {
    setSelectedAltIndex(altIdx);
    if (altIdx === 0 && primaryRouteRef.current) {
      const p = primaryRouteRef.current;
      setOsrmRoutePoints(p.points);
      setTrafficSegments(p.trafficSegments);
      setNavigationManeuvers(p.maneuvers);
      setRouteDistanceKm(p.distanceKm);
      setRouteDurationMins(p.durationMins);
      setSirenDurationMins(p.sirenDurationMins);
      setRouteSummary(p.summary);
      audioTelemetry.speak(`Primary route via ${p.summary} active.`);
    } else if (routeAlternatives[altIdx - 1]) {
      const alt = routeAlternatives[altIdx - 1];
      setOsrmRoutePoints(alt.points);
      setTrafficSegments(alt.trafficSegments);
      setNavigationManeuvers(alt.maneuvers);
      setRouteDistanceKm(alt.distanceKm);
      setRouteDurationMins(alt.durationMins);
      setSirenDurationMins(alt.sirenDurationMins);
      setRouteSummary(alt.summary);
      audioTelemetry.speak(`Switched to alternate corridor via ${alt.summary}.`);
    }
  };

  // Turn-by-turn road snapping via Google Directions (with Live Traffic) or OSRM Fallback
  React.useEffect(() => {
    const origin = effectiveUserCoords;
    const dest = destinationCoords;

    if (!origin || !dest) {
      setOsrmRoutePoints(null);
      setRouteDistanceKm(null);
      setRouteDurationMins(null);
      setSirenDurationMins(null);
      setRouteTrafficSource(null);
      setTrafficSegments([]);
      setNavigationManeuvers([]);
      setRouteAlternatives([]);
      setRouteSummary(null);
      primaryRouteRef.current = null;
      return;
    }

    let isCancelled = false;

    const computeTurnByTurnRoute = async () => {
      // 1. Primary Tier: Google Directions API with Live Traffic & Alternatives
      if (isGoogleMapsConfigured()) {
        try {
          const gResult = await fetchGoogleDirections(origin, dest);
          if (!isCancelled && gResult && gResult.points.length > 0) {
            primaryRouteRef.current = {
              points: gResult.points,
              distanceKm: gResult.distanceKm,
              durationMins: gResult.durationMins,
              sirenDurationMins: gResult.sirenDurationMins,
              summary: gResult.summary || 'Fastest Route',
              trafficSegments: gResult.trafficSegments || [],
              maneuvers: gResult.maneuvers || []
            };

            setOsrmRoutePoints(gResult.points);
            setTrafficSegments(gResult.trafficSegments || []);
            setNavigationManeuvers(gResult.maneuvers || []);
            setRouteAlternatives(gResult.alternatives || []);
            setSelectedAltIndex(0);
            setRouteDistanceKm(gResult.distanceKm);
            setRouteDurationMins(gResult.durationMins);
            setSirenDurationMins(gResult.sirenDurationMins);
            setRouteSummary(gResult.summary || null);
            setRouteTrafficSource('google_live');
            audioTelemetry.speak(`Google live traffic route locked to ${activeHospital?.name || 'facility'}. Siren ETA: ${gResult.sirenDurationMins} minutes.`);
            return;
          }
        } catch (err) {
          console.warn("Google Directions error, falling back to OSRM:", err);
        }
      }

      // 2. Secondary Tier: OSRM Public Driving Routing Machine (with &steps=true)
      const url = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson&steps=true`;

      try {
        const res = await fetch(url);
        const data = await res.json();
        if (!isCancelled && data.routes && data.routes[0]) {
          const route = data.routes[0];
          if (route.geometry?.coordinates) {
            const points = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
            const distNum = route.distance / 1000;
            const distKm = distNum.toFixed(1);
            const freeFlowMins = Math.ceil(route.duration / 60);

            // Urban congestion model for Kumasi & Accra:
            // Standard consumer driving speeds in Ghanaian metros average 24-28 km/h during daytime.
            // For ~7.9 km, this naturally yields ~18 minutes (identical to Google Maps real-world traffic).
            const currentHour = new Date().getHours();
            const trafficFactor = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 16 && currentHour <= 19)
              ? 1.70
              : (currentHour >= 6 && currentHour <= 21)
              ? 1.55
              : 1.15;

            const carDurationMins = Math.max(1, Math.round(freeFlowMins * trafficFactor));
            // Emergency Vehicle Dynamics (EVD): siren right-of-way yields ~18-22% savings
            const sirenDur = Math.max(1, Math.round(carDurationMins * 0.80));

            // Parse OSRM steps into authentic turn-by-turn maneuvers
            const maneuvers: NavigationManeuver[] = [];
            const rawSteps = route.legs?.[0]?.steps || [];
            for (const step of rawSteps) {
              if (!step.maneuver) continue;
              const type = step.maneuver.type;
              const modifier = step.maneuver.modifier;
              const name = step.name ? step.name.trim() : "";
              let instruction = "";
              if (type === 'depart') {
                instruction = name ? `Head onto ${name}` : 'Depart towards destination';
              } else if (type === 'arrive') {
                instruction = `Arrive at ${activeHospital?.name || 'facility'}`;
              } else if (type === 'roundabout') {
                instruction = name ? `Enter roundabout onto ${name}` : 'Enter roundabout';
              } else if (type === 'merge') {
                instruction = name ? `Merge onto ${name}` : 'Merge ahead';
              } else {
                const turnStr = modifier ? modifier.replace(/-/g, ' ') : 'ahead';
                instruction = name ? `Turn ${turnStr} onto ${name}` : `Continue ${turnStr}`;
              }
              const distMeters = step.distance || 0;
              const distText = distMeters < 1000
                ? `${Math.round(distMeters)} m`
                : `${(distMeters / 1000).toFixed(1)} km`;

              maneuvers.push({
                instruction,
                distanceText: distText,
                maneuver: `${type} ${modifier || ''}`.trim(),
                location: step.maneuver.location ? [step.maneuver.location[1], step.maneuver.location[0]] : undefined
              });
            }

            // Extract primary corridor names for route summary (e.g., "via N6 / Ring Road")
            const streetNames = rawSteps
              .map((s: any) => s.name?.trim())
              .filter((n: string) => Boolean(n && n.length > 0));
            const uniqueStreets = Array.from(new Set(streetNames)) as string[];
            const summaryText = uniqueStreets.length > 0
              ? `via ${uniqueStreets.slice(0, 2).join(' / ')}`
              : 'Primary Highway Route';

            setOsrmRoutePoints(points);
            setTrafficSegments([{
              points,
              level: 'moderate',
              color: '#4285F4',
              casingColor: '#185ABC',
              speedKmh: 28
            }]);
            setNavigationManeuvers(maneuvers);
            setRouteAlternatives([]);
            setSelectedAltIndex(0);
            setRouteDistanceKm(distKm);
            setRouteDurationMins(carDurationMins);
            setSirenDurationMins(sirenDur);
            setRouteSummary(summaryText);
            setRouteTrafficSource('osrm');
            audioTelemetry.speak(`Emergency route locked to ${activeHospital?.name || 'facility'}. Estimated driving time: ${carDurationMins} minutes, Siren ETA: ${sirenDur} minutes.`);
            return;
          }
        }
      } catch (err) {
        console.warn("OSRM road route fetch fallback error:", err);
      }

      // 3. Tertiary Tier: Direct Geodesic Distance Fallback
      if (!isCancelled) {
        const distKm = calculateDistanceKm(origin, dest);
        const durMins = Math.max(4, Math.ceil(distKm * 2.2));
        setOsrmRoutePoints(null);
        setTrafficSegments([]);
        setNavigationManeuvers([]);
        setRouteAlternatives([]);
        setSelectedAltIndex(0);
        setRouteDistanceKm(distKm.toFixed(1));
        setRouteDurationMins(durMins);
        setSirenDurationMins(durMins);
        setRouteSummary('Direct Line');
        setRouteTrafficSource('direct');
        audioTelemetry.speak(`Direct dispatch route active to ${activeHospital?.name || 'facility'}. Estimated transit time: ${durMins} minutes.`);
      }
    };

    computeTurnByTurnRoute();

    return () => {
      isCancelled = true;
    };
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

  // Midpoint coordinate along route for Google Maps floating ETA badge (like in screenshot)
  const routeMidpoint = React.useMemo(() => {
    if (!routePolyline || routePolyline.length === 0) return null;
    const midIdx = Math.floor(routePolyline.length * 0.45);
    return routePolyline[midIdx];
  }, [routePolyline]);

  // Real-time ambulance road navigation traversal effect
  React.useEffect(() => {
    if (!isDriving || !routePolyline || routePolyline.length < 2) {
      if (!isDriving && driveProgress === 0) {
        setAnimatedCoords(null);
        setCurrentSpeedKmh(0);
      }
      return;
    }

    const totalPts = routePolyline.length;
    const intervalMs = 120;
    // Step size adjusted by playbackRate: traverses whole route smoothly in ~25-30s at 1x
    const stepSize = 0.004 * playbackRate;

    const timer = setInterval(() => {
      setDriveProgress(prev => {
        const next = prev + stepSize;
        if (next >= 1.0) {
          setIsDriving(false);
          setAnimatedCoords(routePolyline[totalPts - 1]);
          setCurrentSpeedKmh(0);
          audioTelemetry.speak(`Unit arrived at ${activeHospital?.name || 'medical center'}. Transitioning patient to ER.`);
          return 1.0;
        }

        // Calculate exact point along the multi-point polyline
        const exactIndex = next * (totalPts - 1);
        const idx = Math.floor(exactIndex);
        const frac = exactIndex - idx;
        const p1 = routePolyline[idx];
        const p2 = routePolyline[Math.min(idx + 1, totalPts - 1)];

        const lat = p1[0] + (p2[0] - p1[0]) * frac;
        const lng = p1[1] + (p2[1] - p1[1]) * frac;
        setAnimatedCoords([lat, lng]);

        // Calculate vehicle bearing / heading
        const dLat = (p2[0] - p1[0]) * (Math.PI / 180);
        const dLng = (p2[1] - p1[1]) * (Math.PI / 180);
        const lat1Rad = p1[0] * (Math.PI / 180);
        const lat2Rad = p2[0] * (Math.PI / 180);
        const y = Math.sin(dLng) * Math.cos(lat2Rad);
        const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        setAnimatedHeading(bearing);

        // Realistic emergency speed with dynamic fluctuation
        const baseSpeed = 64;
        const speedJitter = Math.floor(Math.sin(next * 35) * 9);
        setCurrentSpeedKmh(Math.max(28, Math.min(84, baseSpeed + speedJitter)));

        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isDriving, routePolyline, playbackRate, activeHospital]);

  // Auto-reset drive progress when destination or origin changes
  React.useEffect(() => {
    setDriveProgress(0);
    setIsDriving(false);
    setAnimatedCoords(null);
    setCurrentSpeedKmh(0);
  }, [destinationCoords, effectiveUserCoords]);

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
      type: 'hospital' | 'ambulance' | 'emergency' | 'place';
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

    // Append Google Places geocoded results across Ghana
    if (googlePlacesResults && googlePlacesResults.length > 0) {
      googlePlacesResults.forEach((place) => {
        results.push({
          type: 'place',
          id: place.id,
          title: place.title,
          subtitle: `Google Places • ${place.subtitle}`,
          coords: place.coords
        });
      });
    }

    return results.slice(0, 10);
  }, [searchQuery, hospitals, ambulances, emergencies, googlePlacesResults]);

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

  // Map Tile URLs (Supports Clean Zero-Key OpenStreetMap, CARTO Basemaps when key provided, Esri Satellite, and Google Maps)
  const googleKey = getGoogleMapsApiKey();
  const cartoBasemapKey = ((import.meta.env.VITE_CARTO_BASEMAPS_KEY || import.meta.env.VITE_CARTO_API_KEY) as string | undefined)?.trim() || '';

  const tileUrls: Record<string, string> = {
    dark: cartoBasemapKey
      ? `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${cartoBasemapKey}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    street: cartoBasemapKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${cartoBasemapKey}`
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: googleKey
      ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleKey}`
      : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'google-traffic': googleKey
      ? `https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}&key=${googleKey}`
      : 'https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    'google-hybrid': googleKey
      ? `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${googleKey}`
      : 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    'google-streets': googleKey
      ? `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${googleKey}`
      : 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
  };

  return (
    <div className="h-full w-full relative z-0 overflow-hidden select-none">
      {/* 1. Google Maps Authentic Turn-by-Turn Navigation Header */}
      {isTakingEmergency || (routePolyline && activeHospital) ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-xl px-2">
          <div className="w-full bg-[#0f5132]/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* High-visibility Google Turn Maneuver Icon */}
              <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-emerald-700/70 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-lg">
                {navigationManeuvers.length > 0 ? (
                  navigationManeuvers[0].maneuver?.toLowerCase().includes('left') ? (
                    <ArrowUpLeft className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  ) : navigationManeuvers[0].maneuver?.toLowerCase().includes('right') ? (
                    <ArrowUpRight className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  ) : navigationManeuvers[0].maneuver?.toLowerCase().includes('roundabout') ? (
                    <RotateCw className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  ) : (
                    <ArrowUp className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  )
                ) : (
                  <Navigation className="h-6 w-6 sm:h-7 sm:w-7 text-white animate-pulse" />
                )}
              </div>

              {/* Maneuver Distance & Street Name */}
              <div className="min-w-0 flex-1">
                <div className="text-lg sm:text-xl font-black tracking-tight text-white leading-tight">
                  {navigationManeuvers.length > 0 && navigationManeuvers[0].distanceText
                    ? `In ${navigationManeuvers[0].distanceText}`
                    : routeDurationMins
                    ? `${routeDurationMins} min remaining`
                    : "Navigating..."}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-emerald-100 truncate mt-0.5">
                  {navigationManeuvers.length > 0
                    ? navigationManeuvers[0].instruction
                    : routeSummary
                    ? `Follow ${routeSummary}`
                    : `Head towards ${activeHospital?.name || "facility"}`}
                </div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-emerald-200/90 truncate">
                  <span className="truncate">
                    To: <strong className="text-white font-bold">{activeHospital?.name || "Target Facility"}</strong>
                  </span>
                  {routeTrafficSource === 'google_live' && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-400/25 text-emerald-200 text-[10px] font-bold border border-emerald-400/40 shrink-0 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-ping" />
                      Live Traffic
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setShowOnlyEmergencyRoute(prev => !prev)}
                className={cn(
                  "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border shadow",
                  showOnlyEmergencyRoute
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/20"
                    : "bg-black/30 hover:bg-black/40 text-emerald-200 border-emerald-600/40"
                )}
                title={showOnlyEmergencyRoute ? "Click to view all regional pins" : "Click to focus on emergency route only"}
              >
                {showOnlyEmergencyRoute ? (
                  <>
                    <Crosshair className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Route Only</span>
                  </>
                ) : (
                  <>
                    <Layers className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Show All</span>
                  </>
                )}
              </button>

              {onExitEmergencyMode && (
                <button
                  onClick={onExitEmergencyMode}
                  className="h-8 w-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer border border-emerald-500/30"
                  title="Exit Navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. Google Maps Floating Search Bar & Quick Filter Pills */
        <div ref={searchContainerRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[95%] max-w-md flex flex-col gap-2">
          {/* Google Search Card */}
          <div className="relative">
            <div className="relative flex items-center bg-white/95 dark:bg-[#202124]/95 backdrop-blur-md border border-slate-200 dark:border-[#3c4043] rounded-full shadow-lg dark:shadow-2xl hover:border-slate-400 dark:hover:border-[#5f6368] focus-within:border-[#4285f4] focus-within:ring-2 focus-within:ring-[#4285f4]/30 transition-all px-3.5 py-1.5">
              <Search className="h-4 w-4 text-[#1a73e8] dark:text-[#8ab4f8] shrink-0 mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder="Search Google Maps or facilities..."
                className="w-full py-1 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#9aa0a6] bg-transparent focus:outline-none"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:text-[#9aa0a6] dark:hover:text-white transition-colors cursor-pointer"
                  title="Clear Search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0 pl-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title="Google Maps Connected" />
                </div>
              )}
            </div>

            {/* Autocomplete Results Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/98 dark:bg-[#202124]/98 backdrop-blur-md border border-slate-200 dark:border-[#3c4043] rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#303134] z-[1001] max-h-72 overflow-y-auto">
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-[#171717] text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#9aa0a6] flex justify-between items-center">
                  <span>{searchQuery ? "Places & Facilities" : "Suggested Hospitals"}</span>
                  <span className="text-[#1a73e8] dark:text-[#8ab4f8] text-[10px] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1a73e8] dark:bg-[#8ab4f8] animate-pulse" />
                    {isGoogleMapsConfigured() ? "Google Places Live" : "OSM Live"}
                  </span>
                </div>
                {searchResults.map((res) => (
                  <button
                    key={res.type + res.id}
                    onClick={() => handleSelectResult(res)}
                    className="w-full text-left p-3 hover:bg-slate-100 dark:hover:bg-[#303134] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">
                        {res.type === 'hospital' ? '🏥' : res.type === 'ambulance' ? '🚑' : res.type === 'place' ? '📍' : '⚠️'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-slate-900 dark:text-white group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] truncate">
                          {res.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] truncate">{res.subtitle}</p>
                      </div>
                    </div>
                    <Crosshair className="h-3.5 w-3.5 text-slate-400 dark:text-[#9aa0a6] group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Google Category Quick Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <button
              onClick={() => {
                setSearchQuery("hospital");
                setIsSearchFocused(true);
              }}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#3c4043] shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>🏥</span>
              <span>Hospitals</span>
            </button>
            <button
              onClick={() => {
                userManuallyChangedMapTheme.current = true;
                const nextTheme = mapTheme === 'google-traffic' ? 'dark' : 'google-traffic';
                setMapTheme(nextTheme);
                audioTelemetry.speak(`Switched to ${nextTheme === 'google-traffic' ? 'Google live traffic' : 'dark'} layer.`);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold border shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                mapTheme === 'google-traffic'
                  ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                  : "bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
              )}
            >
              <span>🚦</span>
              <span>Traffic</span>
            </button>
            <button
              onClick={() => {
                userManuallyChangedMapTheme.current = true;
                const nextTheme = mapTheme === 'satellite' ? 'dark' : 'satellite';
                setMapTheme(nextTheme);
                audioTelemetry.speak("Switched to satellite view.");
              }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold border shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                mapTheme === 'satellite'
                  ? "bg-sky-600/20 text-sky-700 dark:text-sky-300 border-sky-500/40"
                  : "bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
              )}
            >
              <span>🛰️</span>
              <span>Satellite</span>
            </button>
            <button
              onClick={() => {
                const nextState = !showCartoCatchment;
                setShowCartoCatchment(nextState);
                if (nextState) {
                  audioTelemetry.speak("Displaying CARTO 15-minute emergency catchment area.");
                } else {
                  audioTelemetry.speak("Catchment layer hidden.");
                }
              }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-semibold border shadow-md backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                showCartoCatchment
                  ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/20"
                  : "bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
              )}
              title="Toggle CARTO 15-Minute TravelTime Emergency Catchment"
            >
              <Globe className="h-3 w-3" />
              <span>15-Min Catchment</span>
              {isLoadingCatchment && (
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
              )}
            </button>
            <button
              onClick={() => {
                setFlyTarget([5.6037, -0.1870]);
                setInspectedPoint([5.6037, -0.1870]);
                audioTelemetry.speak("Viewing Greater Accra Metropolitan Area.");
              }}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#3c4043] shadow-md backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>📍</span>
              <span>Accra</span>
            </button>
            <button
              onClick={() => {
                setFlyTarget([6.6961, -1.6310]);
                setInspectedPoint([6.6961, -1.6310]);
                audioTelemetry.speak("Viewing Kumasi Metropolitan Area.");
              }}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#3c4043] shadow-md backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>📍</span>
              <span>Kumasi</span>
            </button>
            <button
              onClick={() => {
                setFlyTarget([7.95, -1.03]);
                audioTelemetry.speak("National facilities overview active.");
              }}
              className="px-3 py-1 rounded-full text-[11px] font-semibold bg-white/90 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#3c4043] shadow-md backdrop-blur-md transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>🇬🇭</span>
              <span>All Ghana</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Google Maps Authentic Bottom ETA & Trip Sheet */}
      {routePolyline && activeHospital && (
        <div className="absolute bottom-4 left-3 right-3 sm:left-6 sm:right-auto sm:w-[440px] z-[1000] bg-white/95 dark:bg-[#202124]/95 backdrop-blur-md border border-slate-200 dark:border-[#3c4043] p-4 rounded-2xl shadow-2xl flex flex-col gap-3 text-slate-900 dark:text-white animate-in fade-in slide-in-from-bottom-3 duration-300">
          {/* Big Bold Google Green ETA Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#1e8e3e] dark:text-[#34a853] leading-none tracking-tight">
                  {sirenDurationMins || routeDurationMins || 8}
                </span>
                <span className="text-base sm:text-lg font-bold text-[#1e8e3e] dark:text-[#34a853]">min</span>
                {routeDurationMins && sirenDurationMins && routeDurationMins > sirenDurationMins && (
                  <span className="text-xs text-slate-400 dark:text-[#9aa0a6] line-through ml-1">
                    {routeDurationMins} min
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9aa0a6] font-medium mt-1">
                <span>{routeDistanceKm || "4.2"} km</span>
                <span>•</span>
                <span>ETA {formatArrivalTime(sirenDurationMins || routeDurationMins) || "10:45 AM"}</span>
                {routeTrafficSource === 'google_live' && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Live Traffic</span>
                  </>
                )}
              </div>
            </div>

            {/* Siren Emergency Clearance Savings Badge */}
            {routeDurationMins && sirenDurationMins && routeDurationMins > sirenDurationMins ? (
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1 shadow-sm animate-pulse">
                  <Siren className="h-3 w-3 text-rose-500 dark:text-rose-400" />
                  Siren -{routeDurationMins - sirenDurationMins}m
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Fastest route</span>
              </div>
            ) : (
              <div className="flex flex-col items-end shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                  Optimal Corridor
                </span>
              </div>
            )}
          </div>

          {/* Google Maps Multi-Color Mini Congestion Ribbon */}
          <div className="flex flex-col gap-1">
            <div className="w-full bg-slate-200 dark:bg-[#303134] rounded-full h-2 overflow-hidden flex shadow-inner">
              {trafficSegments.length > 0 ? (
                trafficSegments.map((seg, sIdx) => {
                  const segColor = seg.level === 'heavy' ? '#ea4335' : seg.level === 'moderate' ? '#fbbc04' : '#34a853';
                  return (
                    <div
                      key={sIdx}
                      style={{ width: `${100 / trafficSegments.length}%`, backgroundColor: segColor }}
                      className="h-full first:rounded-l-full last:rounded-r-full"
                    />
                  );
                })
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#34a853] via-[#fbbc04] to-[#34a853]" />
              )}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#9aa0a6] px-0.5">
              <span>Traffic condition on route</span>
              <span className="text-emerald-600 dark:text-[#34a853] font-semibold">Mostly typical traffic</span>
            </div>
          </div>

          {/* Alternative Route Corridor Chips */}
          {routeAlternatives.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
              <button
                onClick={() => handleSelectRouteAlternative(0)}
                className={cn(
                  "px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 border",
                  selectedAltIndex === 0
                    ? "bg-[#1e8e3e] text-white border-[#34a853] shadow-sm"
                    : "bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
                )}
              >
                Primary ({sirenDurationMins || routeDurationMins}m)
              </button>
              {routeAlternatives.map((alt, idx) => (
                <button
                  key={alt.id}
                  onClick={() => handleSelectRouteAlternative(idx + 1)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer shrink-0 border truncate max-w-[150px]",
                    selectedAltIndex === idx + 1
                      ? "bg-[#1e8e3e] text-white border-[#34a853] shadow-sm"
                      : "bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
                  )}
                  title={`Alternative via ${alt.summary}`}
                >
                  Via {alt.summary} ({alt.sirenDurationMins}m)
                </button>
              ))}
            </div>
          )}

          {/* Real-time Drive Simulation Progress & Cockpit Controls */}
          <div className="pt-2 border-t border-slate-200 dark:border-[#303134] flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                <Gauge className="h-3.5 w-3.5 text-emerald-600 dark:text-[#34a853]" />
                <span>{isDriving ? `${currentSpeedKmh} km/h` : driveProgress > 0 ? "Drive Paused" : "Ready to Dispatch"}</span>
                {isDriving && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                    • 🧭 {Math.round(animatedHeading)}°
                  </span>
                )}
              </div>
              <span className="font-mono text-slate-500 dark:text-[#9aa0a6] font-bold text-[10px]">
                {Math.round(driveProgress * 100)}% Traversed
              </span>
            </div>

            {/* Dynamic Transit Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-[#303134] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#34a853] via-[#4285f4] to-rose-500 h-full transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(2, Math.round(driveProgress * 100))}%` }}
              />
            </div>

            {/* Navigation Action Buttons (Google Style) */}
            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextDriving = !isDriving;
                    setIsDriving(nextDriving);
                    if (nextDriving) {
                      audioTelemetry.speak(`Emergency drive simulation active. Speed ~${currentSpeedKmh || 64} kilometers per hour.`);
                    }
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md",
                    isDriving
                      ? "bg-[#ea4335] hover:bg-[#d93025] text-white"
                      : "bg-[#1e8e3e] hover:bg-[#34a853] text-white"
                  )}
                  title={isDriving ? "Pause drive simulation" : "Start simulated drive along route"}
                >
                  {isDriving ? (
                    <>
                      <Pause className="h-3.5 w-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>{driveProgress > 0 ? "Resume" : "Start Drive"}</span>
                    </>
                  )}
                </button>

                {/* Simulation Speed Pill (1x, 2x, 4x) */}
                <button
                  onClick={() => setPlaybackRate(r => (r === 1 ? 2 : r === 2 ? 4 : 1))}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#3c4043] cursor-pointer"
                  title="Cycle Drive Simulation Speed"
                >
                  {playbackRate}x
                </button>

                {/* Auto-follow / Chase Cam Toggle */}
                <button
                  onClick={() => {
                    const next = !isChaseActive;
                    setIsChaseActive(next);
                    if (next) audioTelemetry.speak("Camera locked to ambulance cockpit.");
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border",
                    isChaseActive
                      ? "bg-[#1a73e8] text-white border-[#4285f4] shadow-sm"
                      : "bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] border-slate-200 dark:border-[#3c4043]"
                  )}
                  title="Auto-pan camera to follow moving ambulance"
                >
                  <Eye className="h-3 w-3" />
                  <span>{isChaseActive ? "Chase ON" : "Follow"}</span>
                </button>
              </div>

              {/* Reset Drive Button */}
              {driveProgress > 0 && (
                <button
                  onClick={() => {
                    setDriveProgress(0);
                    setIsDriving(false);
                    setAnimatedCoords(null);
                    setCurrentSpeedKmh(0);
                    audioTelemetry.speak("Drive simulation reset to start point.");
                  }}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-500 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer border border-slate-200 dark:border-[#3c4043]"
                  title="Reset drive simulation"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Google Maps Circular Floating Action Controls (Right Side) */}
      <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-2.5">
        {/* North Compass Button */}
        <button
          onClick={() => {
            setAnimatedHeading(0);
          }}
          className="h-10 w-10 rounded-full bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043] text-slate-700 dark:text-white shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="North Compass"
        >
          <Compass
            className="h-5 w-5 text-rose-500 dark:text-rose-400 transition-transform duration-300"
            style={{ transform: `rotate(${-animatedHeading}deg)` }}
          />
        </button>

        {/* Locate Me (Google Blue) */}
        <button
          onClick={handleLocateMe}
          className="h-10 w-10 rounded-full bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043] text-[#1a73e8] dark:text-[#4285f4] shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title="Your Location"
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        {/* Google Layer Switcher */}
        <button
          onClick={() => {
            userManuallyChangedMapTheme.current = true;
            const themes: Array<'dark' | 'street' | 'google-traffic' | 'google-hybrid' | 'satellite'> = isGoogleMapsConfigured()
              ? ['dark', 'street', 'google-traffic', 'google-hybrid', 'satellite']
              : ['dark', 'street', 'satellite'];
            const currentIndex = themes.indexOf(mapTheme as any);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            setMapTheme(nextTheme);
            audioTelemetry.speak(`Switched to ${nextTheme.replace('-', ' ')} layer.`);
          }}
          className="h-10 w-10 rounded-full bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043] text-slate-700 dark:text-white shadow-xl flex items-center justify-center transition-all cursor-pointer"
          title={`Layers (Current: ${mapTheme.toUpperCase()})`}
        >
          <Layers className="h-5 w-5 text-blue-600 dark:text-[#8ab4f8]" />
        </button>

        {/* Accident Hotspots Toggle */}
        <button
          onClick={() => setShowHotspots(prev => !prev)}
          className={cn(
            "h-10 w-10 rounded-full border shadow-xl flex items-center justify-center transition-all cursor-pointer",
            showHotspots
              ? "bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40"
              : "bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-500 dark:text-[#9aa0a6] border-slate-200 dark:border-[#3c4043]"
          )}
          title="Toggle High-Risk Corridors"
        >
          <Flame className="h-5 w-5" />
        </button>

        {/* Voice HUD / Audio Telemetry Toggle */}
        <button
          onClick={toggleAudio}
          className={cn(
            "h-10 w-10 rounded-full border shadow-xl flex items-center justify-center transition-all cursor-pointer",
            !isAudioMuted
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
              : "bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] text-slate-500 dark:text-[#9aa0a6] border-slate-200 dark:border-[#3c4043]"
          )}
          title={isAudioMuted ? "Unmute Voice Guidance" : "Mute Voice Guidance"}
        >
          {isAudioMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {/* Focus Active Dispatch Unit */}
        {activeAmbulance && (
          <button
            onClick={handleFocusActiveDispatch}
            className="h-10 w-10 rounded-full bg-white/95 dark:bg-[#202124]/90 hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043] text-rose-500 dark:text-rose-400 shadow-xl flex items-center justify-center transition-all cursor-pointer"
            title="Track Active Ambulance"
          >
            <Crosshair className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Primary Leaflet Map Container */}
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%', background: mapTheme === 'street' ? '#f8fafc' : '#0f0f16' }}
        zoomControl={false}
      >
        <TileLayer
          key={`${mapTheme}-${Boolean(cartoBasemapKey)}`}
          attribution={
            mapTheme.startsWith('google')
              ? '&copy; <a href="https://www.google.com/maps" target="_blank" rel="noreferrer">Google Maps Platform</a>'
              : mapTheme === 'satellite'
              ? '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar'
              : cartoBasemapKey
              ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
              : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          url={tileUrls[mapTheme] || tileUrls.dark}
          maxZoom={mapTheme.startsWith('google') ? 20 : 19}
          className={mapTheme === 'dark' && !cartoBasemapKey ? 'leaflet-dark-mode-tiles' : ''}
        />

        <MapController
          hospitals={hospitals}
          ambulances={ambulances}
          emergencies={emergencies}
          targetCoords={flyTarget}
          routeBounds={routeBounds}
          autoFitInitial={false}
          chaseCoords={animatedCoords}
          isChaseActive={isChaseActive && isDriving}
        />

        {/* Click anywhere listener: drops inspector pin with live facility metrics */}
        <MapClickHandler
          onMapClick={(coords) => {
            setInspectedPoint(coords);
            audioTelemetry.playAlertBeep('info');
          }}
        />

        {/* Authentic Google Maps Route Line: Casing + Core with Live Traffic Slowdown Segments */}
        {trafficSegments && trafficSegments.length > 0 ? (
          trafficSegments.map((seg, idx) => {
            const casingColor =
              seg.casingColor || (seg.level === 'heavy' ? '#8A180E' : seg.level === 'moderate' ? '#B06000' : '#185ABC');
            const coreColor =
              seg.color || (seg.level === 'heavy' ? '#D93025' : seg.level === 'moderate' ? '#FA7B17' : '#4285F4');

            return (
              <React.Fragment key={`traffic-seg-${idx}`}>
                {/* 1. Google Route Outer Casing Border (dark blue / dark amber outline) */}
                <Polyline
                  positions={seg.points}
                  pathOptions={{
                    color: casingColor,
                    weight: 9.5,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                    interactive: false
                  }}
                />
                {/* 2. Google Route Inner Core (Google royal blue or slowdown orange/red) */}
                <Polyline
                  positions={seg.points}
                  pathOptions={{
                    color: coreColor,
                    weight: 6,
                    opacity: 1,
                    lineCap: 'round',
                    lineJoin: 'round',
                    interactive: false
                  }}
                />
              </React.Fragment>
            );
          })
        ) : routePolyline ? (
          <>
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#185ABC',
                weight: 9.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false
              }}
            />
            <Polyline
              positions={routePolyline}
              pathOptions={{
                color: '#4285F4',
                weight: 6,
                opacity: 1,
                lineCap: 'round',
                lineJoin: 'round',
                interactive: false
              }}
            />
          </>
        ) : null}

        {/* CARTO 15-Minute Emergency Isochrone / Catchment Area Polygon */}
        {showCartoCatchment && cartoCatchmentData && (
          <Polygon
            positions={cartoCatchmentData}
            pathOptions={{
              color: '#10b981',
              weight: 2,
              dashArray: '6, 6',
              fillColor: '#10b981',
              fillOpacity: 0.18
            }}
          >
            <Popup>
              <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[180px]">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                  <span>🌐 15-Min Reach Zone</span>
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {catchmentHospitalName || 'Hospital'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  15-minute emergency drive catchment
                </p>
                <div className="mt-1.5 pt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                  <span>CARTO TravelTime LDS</span>
                  <span className="text-emerald-500 font-bold">15m Isochrone</span>
                </div>
              </div>
            </Popup>
          </Polygon>
        )}

        {/* Google Maps Turn Waypoint Dots at Junctions */}
        {navigationManeuvers && navigationManeuvers.length > 0 &&
          navigationManeuvers.map((m, mIdx) => {
            if (!m.location) return null;
            return (
              <Marker
                key={`maneuver-dot-${mIdx}`}
                position={m.location}
                icon={createGoogleWaypointDotIcon()}
                interactive={false}
                zIndexOffset={1200}
              />
            );
          })}

        {/* Floating Google Maps On-Route ETA Card (like in screenshot: 18 min / 7.9 km) */}
        {routePolyline && routeMidpoint && (
          <Marker
            position={routeMidpoint}
            icon={createRouteEtaBadgeIcon(sirenDurationMins || routeDurationMins, routeDistanceKm)}
            zIndexOffset={2500}
          >
            <Popup>
              <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[170px]">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                  <span>🚗 Fast Route Corridor</span>
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Estimated duration: <strong className="text-emerald-600 dark:text-emerald-400">{sirenDurationMins || routeDurationMins} min</strong>
                  {routeDistanceKm && <div className="text-slate-500 dark:text-slate-400 mt-0.5">Total distance: {routeDistanceKm} km</div>}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Secondary Corridor ETA Badges for Alternative Routes */}
        {routeAlternatives && routeAlternatives.length > 0 &&
          routeAlternatives.map((alt, altIdx) => {
            if (!alt.points || alt.points.length === 0) return null;
            const altMidpoint = alt.points[Math.floor(alt.points.length * 0.45)];
            if (!altMidpoint) return null;
            return (
              <Marker
                key={`alt-eta-${alt.id}`}
                position={altMidpoint}
                icon={createRouteAltEtaBadgeIcon(alt.sirenDurationMins || alt.durationMins, alt.distanceKm)}
                zIndexOffset={2200}
                eventHandlers={{
                  click: () => handleSelectRouteAlternative(altIdx + 1)
                }}
              />
            );
          })}

        {/* Dynamic Moving Siren Ambulance Marker (rendered both in emergency and overview when in motion) */}
        {routePolyline && animatedCoords && (isDriving || driveProgress > 0) && (
          <Marker
            position={animatedCoords}
            icon={createSirenVehicleIcon(animatedHeading, isDriving)}
            zIndexOffset={3000}
          >
            <Popup>
              <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[210px]">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1 mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-rose-600 dark:text-rose-400">
                    <Siren className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 animate-pulse" />
                    <span>Unit En Route (Code 1)</span>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                    {isDriving ? "In Motion" : "Paused"}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeAmbulance?.plateNumber || "Paramedic Unit"}</h4>
                <div className="grid grid-cols-2 gap-1.5 my-1.5 text-[11px] font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Speed:</span>
                    <strong className="text-teal-700 dark:text-teal-300">{currentSpeedKmh} km/h</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] block">Heading:</span>
                    <strong className="text-sky-700 dark:text-sky-300">{Math.round(animatedHeading)}°</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-transparent">
                  <span>To:</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300 truncate max-w-[130px]">{activeHospital?.name || "Target Facility"}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* TACTICAL EMERGENCY MODE: When taking an emergency, ONLY user location and destination show! */}
        {isEmergencyFocusActive ? (
          <>
            {/* 1. User's Origin Location Marker (Google Maps Concentric Blue Origin Dot) */}
            {effectiveUserCoords && (!isDriving && driveProgress === 0) && (
              <Marker
                position={effectiveUserCoords}
                icon={createGoogleOriginIcon()}
                zIndexOffset={1000}
              >
                <Popup>
                  <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-sky-600 dark:text-sky-400">
                        <Navigation className="h-3.5 w-3.5 text-sky-500 dark:text-sky-400 animate-pulse" />
                        <span>Your Live Location</span>
                      </div>
                      <span className="text-[10px] font-mono bg-sky-500/15 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                        Origin Point
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activeAmbulance?.plateNumber || "Paramedic Unit"}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 mt-1 mb-1.5">
                      GPS: {effectiveUserCoords[0].toFixed(5)}, {effectiveUserCoords[1].toFixed(5)}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded border border-slate-200 dark:border-transparent">
                      <span>Destination:</span>
                      <span className="font-semibold text-teal-700 dark:text-teal-300 truncate max-w-[130px]">{activeHospital?.name || "Target Facility"}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* 2. Destination Hospital Marker (Google Maps Red Teardrop Pin) */}
            {destinationCoords && activeHospital && (
              <Marker
                position={destinationCoords}
                icon={createGoogleDestinationIcon()}
                zIndexOffset={1100}
              >
                <Popup>
                  <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[240px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400">
                        <Building2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>Target Destination</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40">
                        Assigned ER
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{activeHospital.name}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div className="bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                        <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Beds Free</span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">{activeHospital.availableBeds ?? 0}</span>
                      </div>
                      <div className="bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/40 rounded-lg p-1.5 text-center">
                        <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-semibold">ICU Free</span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white">{activeHospital.icuBeds?.available ?? 0}</span>
                      </div>
                    </div>
                    {routeDistanceKm && routeDurationMins && (
                      <div className="bg-slate-100 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 text-[11px] text-teal-700 dark:text-teal-300 flex items-center justify-between mb-1.5 font-semibold">
                        <span>Distance: {routeDistanceKm} km</span>
                        <span>ETA: ~{routeDurationMins} mins</span>
                      </div>
                    )}
                    {activeHospital.address && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mb-1">📍 {activeHospital.address}</p>
                    )}
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" /> <span className="text-slate-900 dark:text-white font-medium">{activeHospital.phone || "+233 302 662 000"}</span>
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
                  <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[190px]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-rose-600 dark:text-rose-400 mb-1">
                      <Flame className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                      Accident Hotspot
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{spot.name}</h4>
                    <p className="text-xs text-slate-700 dark:text-slate-200 mt-1">Severity: <span className="font-semibold text-rose-600 dark:text-rose-300">{spot.risk}</span></p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">High collision incidence rate zone</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {userLocation && (
              <Marker
                position={userLocation}
                icon={routePolyline ? createGoogleOriginIcon() : createPulsingLeafletIcon('#3b82f6', '📍', true)}
              >
                <Popup>
                  <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[210px]">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-blue-600 dark:text-blue-400 mb-1">
                      <LocateFixed className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                      Your Device Location
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-700">
                      {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Live active GPS transmitter point</p>
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
                  <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-1.5">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                        Inspected Location
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-transparent">
                        GPS Point
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-950 p-1.5 rounded border border-slate-200 dark:border-slate-800 mb-2">
                      Lat: {inspectedPoint[0].toFixed(5)} | Lng: {inspectedPoint[1].toFixed(5)}
                    </p>
                    {closestHospitalToInspected && (
                      <div className="bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-0.5">Nearest Facility</span>
                        <p className="font-bold text-slate-900 dark:text-white truncate">{closestHospitalToInspected.hospital.name}</p>
                        <p className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold mt-0.5">
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
              const isTargetFacility = activeHospital && hospital.id === activeHospital.id && Boolean(routePolyline);
              const bedCount = hospital.availableBeds ?? 0;
              const pinColor = bedCount > 5 ? '#10b981' : bedCount > 0 ? '#f59e0b' : '#ef4444';

              return (
                <Marker
                  key={hospital.id}
                  position={coords}
                  icon={isTargetFacility ? createGoogleDestinationIcon() : createPulsingLeafletIcon(pinColor, '🏥', bedCount <= 2)}
                  zIndexOffset={isTargetFacility ? 1100 : undefined}
                >
                  <Popup>
                    <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{hospital.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div className="bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/40 rounded-lg p-1.5 text-center">
                          <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Beds Free</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">{hospital.availableBeds}</span>
                        </div>
                        <div className="bg-blue-500/15 dark:bg-blue-500/20 border border-blue-500/40 rounded-lg p-1.5 text-center">
                          <span className="block text-[10px] text-blue-700 dark:text-blue-300 font-semibold">ICU Free</span>
                          <span className="text-base font-extrabold text-slate-900 dark:text-white">{hospital.icuBeds?.available ?? 0}</span>
                        </div>
                      </div>
                      {hospital.address && (
                        <p className="text-[11px] text-slate-700 dark:text-slate-200 truncate mb-1">📍 {hospital.address}</p>
                      )}
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Phone className="h-3 w-3 text-slate-400" /> <span className="text-slate-900 dark:text-white font-medium">{hospital.phone || "+233 302 662 000"}</span>
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
                    <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[200px]">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ambulance.plateNumber || ambulance.id}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border",
                          isBusy 
                            ? "bg-rose-500/15 dark:bg-rose-500/25 text-rose-700 dark:text-rose-200 border-rose-500/40" 
                            : "bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-200 border-teal-500/40"
                        )}>
                          {ambulance.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200">Unit ID: <span className="font-mono font-semibold text-slate-900 dark:text-white">{ambulance.id}</span></p>
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
                    <div className="text-slate-900 dark:text-white font-sans p-1 min-w-[220px]">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-1.5 mb-1.5">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{emergency.emergencyType}</h4>
                        <StatusBadge status={emergency.severity} className="text-xs">
                          {emergency.severity}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200">Patient: <span className="font-semibold text-slate-900 dark:text-white">{emergency.patientName || 'Emergency Patient'}</span></p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Assigned: <span className="font-semibold text-teal-700 dark:text-teal-300">{emergency.assignedHospital || 'Seeking Facility...'}</span></p>
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
