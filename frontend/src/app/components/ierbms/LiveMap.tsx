import * as React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer, InfoWindowF } from '@react-google-maps/api';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';

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

// Helper to generate dynamic SVG map pin symbols with Drop Shadows
const createSvgMarker = (color: string, emoji: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="black" flood-opacity="0.3"/>
        </filter>
      </defs>
      <path d="M17 2 C9 2 3 8 3 16 C3 25 17 42 17 42 C17 42 31 25 31 16 C31 8 25 2 17 2 Z" fill="${color}" stroke="white" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="17" cy="16" r="10" fill="white"/>
      <text x="17" y="21" font-size="14" text-anchor="middle" font-family="Segoe UI Symbol, Apple Color Emoji">${emoji}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf-8,${encodeURIComponent(svg.trim())}`;
};

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
  center = [5.6037, -0.1870], // Default center (Accra)
  zoom = 12,
  activeRouteCaseId = null
}) => {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: ['places']
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null);
  const [directionsResponse, setDirectionsResponse] = React.useState<google.maps.DirectionsResult | null>(null);
  const [activeMarker, setActiveMarker] = React.useState<{
    id: string;
    type: 'hospital' | 'ambulance' | 'emergency';
    position: { lat: number; lng: number };
    title: string;
    description: React.ReactNode;
  } | null>(null);

  const onLoad = React.useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = React.useCallback(() => {
    setMap(null);
  }, []);

  // Fetch routing coordinates from Google Maps Directions Service
  React.useEffect(() => {
    if (!isLoaded || !activeRouteCaseId) {
      setDirectionsResponse(null);
      return;
    }

    const emergency = emergencies.find(e => e.id === activeRouteCaseId);
    if (!emergency || !emergency.assignedHospital) {
      setDirectionsResponse(null);
      return;
    }

    const hospital = hospitals.find(h =>
      h.id === emergency.assignedHospital || h.name === emergency.assignedHospital
    );

    const ambulance = ambulances.find(a =>
      a.id === emergency.ambulanceId || a.assignedEmergency === emergency.id || a.status === 'engaged'
    ) || ambulances[0];

    if (!hospital || !ambulance || !ambulance.location?.lat || !hospital.location?.lat) {
      setDirectionsResponse(null);
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: ambulance.location.lat, lng: ambulance.location.lng },
        destination: { lat: hospital.location.lat, lng: hospital.location.lng },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
        } else {
          console.error(`Directions request failed: ${status}`);
        }
      }
    );
  }, [activeRouteCaseId, emergencies, ambulances, hospitals, isLoaded]);

  // Fit bounds dynamically to encompass all active map elements
  React.useEffect(() => {
    if (!map || !isLoaded) return;

    if (directionsResponse) {
      // The DirectionsRenderer will automatically adjust bounds to fit the route
      return;
    }

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
      
      // Limit zoom depth if elements are clustered closely
      const listener = window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom()! > 14) {
          map.setZoom(14);
        }
      });
    }
  }, [map, ambulances, emergencies, hospitals, directionsResponse, isLoaded]);

  if (loadError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-red-950/20 border border-red-500/30 rounded-lg p-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-red-500 font-semibold text-lg">Google Maps Load Error</p>
          <p className="text-sm text-red-400">
            Could not initialize Google Maps SDK. Please ensure that a valid API key is set in your 
            <code className="bg-red-950 px-1.5 py-0.5 rounded mx-1 text-red-300">.env</code> file 
            under <code className="bg-red-950 px-1.5 py-0.5 rounded text-red-300">VITE_GOOGLE_MAPS_API_KEY</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--card)] border border-border rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-gradient from-[var(--primary)]/10 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col items-center gap-4 text-center z-10">
          <div className="h-10 w-10 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="font-semibold text-lg">Loading Google Maps...</p>
            <p className="text-xs text-muted-foreground">Syncing live telemetry network</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative z-0">
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
          styles: darkMapStyles
        }}
      >
        {/* Render Google Directions Polyline */}
        {directionsResponse && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#3b82f6", // var(--primary) blue
                strokeOpacity: 0.85,
                strokeWeight: 6
              }
            }}
          />
        )}

        {/* Render Hospitals */}
        {hospitals.map((hospital) => {
          if (!hospital.location?.lat || !hospital.location?.lng) return null;
          return (
            <MarkerF
              key={hospital.id}
              position={{ lat: hospital.location.lat, lng: hospital.location.lng }}
              icon={{
                url: createSvgMarker("#22c55e", "🏥"), // var(--success) green
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onClick={() => setActiveMarker({
                id: hospital.id,
                type: 'hospital',
                position: { lat: hospital.location.lat, lng: hospital.location.lng },
                title: hospital.name,
                description: (
                  <div className="text-gray-900 font-sans p-1">
                    <h4 className="font-bold text-sm text-gray-800">{hospital.name}</h4>
                    <p className="text-xs text-gray-600 mt-1">Available Beds: {hospital.availableBeds}</p>
                    <p className="text-xs text-gray-600">ICU Beds: {hospital.icuBeds.available}</p>
                  </div>
                )
              })}
            />
          );
        })}

        {/* Render Ambulances */}
        {ambulances.map((ambulance) => {
          if (!ambulance.location?.lat || !ambulance.location?.lng) return null;
          return (
            <MarkerF
              key={ambulance.id}
              position={{ lat: ambulance.location.lat, lng: ambulance.location.lng }}
              icon={{
                url: createSvgMarker("#3b82f6", "🚑"), // var(--primary) blue
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onClick={() => setActiveMarker({
                id: ambulance.id,
                type: 'ambulance',
                position: { lat: ambulance.location.lat, lng: ambulance.location.lng },
                title: ambulance.plateNumber || ambulance.id,
                description: (
                  <div className="text-gray-900 font-sans p-1">
                    <h4 className="font-bold text-sm text-gray-800">{ambulance.plateNumber || ambulance.id}</h4>
                    <p className="text-xs text-gray-600 mt-1">Status: {ambulance.status}</p>
                    {ambulance.assignedEmergency && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">Assigned Case: {ambulance.assignedEmergency.substring(0, 8)}...</p>
                    )}
                  </div>
                )
              })}
            />
          );
        })}

        {/* Render Emergencies */}
        {emergencies.map((emergency) => {
          if (!emergency.location?.lat || !emergency.location?.lng) return null;
          return (
            <MarkerF
              key={emergency.id}
              position={{ lat: emergency.location.lat, lng: emergency.location.lng }}
              icon={{
                url: createSvgMarker("#ef4444", "⚠️"), // var(--danger) red
                scaledSize: new window.google.maps.Size(34, 44),
                anchor: new window.google.maps.Point(17, 44)
              }}
              onClick={() => setActiveMarker({
                id: emergency.id,
                type: 'emergency',
                position: { lat: emergency.location.lat, lng: emergency.location.lng },
                title: emergency.emergencyType,
                description: (
                  <div className="text-gray-900 font-sans p-1 min-w-[180px]">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-gray-800">{emergency.emergencyType}</h4>
                      <StatusBadge status={emergency.severity} className="text-xs font-semibold scale-90">
                        {emergency.severity}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">Patient: {emergency.patientName}</p>
                    <p className="text-xs text-gray-600">Status: {emergency.status}</p>
                    {emergency.assignedHospital && (
                      <p className="text-xs text-blue-600 font-semibold mt-1">Assigned: {emergency.assignedHospital}</p>
                    )}
                  </div>
                )
              })}
            />
          );
        })}

        {/* Render Single Info Window */}
        {activeMarker && (
          <InfoWindowF
            position={activeMarker.position}
            onCloseClick={() => setActiveMarker(null)}
          >
            {activeMarker.description}
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
};
