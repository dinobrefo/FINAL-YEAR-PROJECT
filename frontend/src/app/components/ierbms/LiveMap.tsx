import * as React from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer, InfoWindowF } from '@react-google-maps/api';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { StatusBadge } from './StatusBadge';
import { cn } from '../ui/utils';

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

// Helper to generate a pulsing standard blue dot for user location tracking
const createUserLocationMarker = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
      <circle cx="15" cy="15" r="10" fill="#2563eb" opacity="0.3">
        <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="15" cy="15" r="6" fill="#3b82f6" stroke="white" stroke-width="2" />
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
  const [showDetailedRoute, setShowDetailedRoute] = React.useState(false);
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | null>(null);

  // Watch the user's actual browser/device location to show a pulsing blue dot
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

  // Pan the map to focus on the user's actual coordinates when first loaded (if not routing)
  React.useEffect(() => {
    if (map && userCoords && !activeRouteCaseId) {
      map.panTo(userCoords);
    }
  }, [map, userCoords, activeRouteCaseId]);
  
  // Ref to track the last requested route to prevent infinite calls
  const lastRequestedRouteRef = React.useRef<string>("");

  // Find the active ambulance coordinates
  const activeEmergency = React.useMemo(() => {
    return activeRouteCaseId ? emergencies.find(e => e.id === activeRouteCaseId) : null;
  }, [activeRouteCaseId, emergencies]);

  const activeAmbulance = React.useMemo(() => {
    if (!activeEmergency) return null;
    return ambulances.find(a => 
      a.id === activeEmergency.ambulanceId || a.assignedEmergency === activeEmergency.id
    ) || ambulances[0];
  }, [activeEmergency, ambulances]);

  const ambulanceCoords = activeAmbulance?.location;

  // Haversine distance formula to calculate distance between two lat/lng coordinates in meters
  const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Compute dynamic turn-by-turn routing info based on user device position or live ambulance location
  const dynamicRouteInfo = React.useMemo(() => {
    const routeLeg = directionsResponse?.routes?.[0]?.legs?.[0];
    const trackerCoords = userCoords || ambulanceCoords;

    if (!routeLeg || !trackerCoords?.lat) {
      return {
        nextStep: null,
        remainingDistance: "",
        remainingDuration: "",
        routeSteps: [],
        currentStepIdx: 0
      };
    }

    const steps = routeLeg.steps || [];
    
    // Find the step closest to the tracker coordinates
    let closestStepIdx = 0;
    let minDistance = Infinity;

    steps.forEach((step, idx) => {
      const stepStart = step.start_location;
      const dist = getDistance(
        trackerCoords.lat,
        trackerCoords.lng,
        stepStart.lat(),
        stepStart.lng()
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestStepIdx = idx;
      }
    });

    // If the tracker is closest to step closestStepIdx, but we are very close to its end, 
    // transition to the next step.
    const currentStep = steps[closestStepIdx];
    if (currentStep) {
      const stepEnd = currentStep.end_location;
      const distToEnd = getDistance(
        trackerCoords.lat,
        trackerCoords.lng,
        stepEnd.lat(),
        stepEnd.lng()
      );
      // If within 30 meters of the step's end, and there is a next step, transition to next step
      if (distToEnd < 30 && closestStepIdx < steps.length - 1) {
        closestStepIdx++;
      }
    }

    // Now, slice the remaining steps
    const remainingSteps = steps.slice(closestStepIdx);
    
    // Sum up the remaining distance and duration
    let totalMeters = 0;
    let totalSeconds = 0;

    // For the very first remaining step, estimate remaining distance from the tracker's current position to the end of this step
    if (remainingSteps.length > 0) {
      const currentRemainingStep = remainingSteps[0];
      const distToEnd = getDistance(
        trackerCoords.lat,
        trackerCoords.lng,
        currentRemainingStep.end_location.lat(),
        currentRemainingStep.end_location.lng()
      );
      
      totalMeters += distToEnd;
      
      // Linearly estimate duration based on distance ratio
      const stepTotalDist = currentRemainingStep.distance?.value || 1;
      const stepTotalDuration = currentRemainingStep.duration?.value || 1;
      const durationRatio = distToEnd / stepTotalDist;
      totalSeconds += stepTotalDuration * Math.min(1, durationRatio);

      // Add the rest of the steps
      for (let j = 1; j < remainingSteps.length; j++) {
        totalMeters += remainingSteps[j].distance?.value || 0;
        totalSeconds += remainingSteps[j].duration?.value || 0;
      }
    }

    // Format remaining distance
    let formattedDistance = "";
    if (totalMeters >= 1000) {
      formattedDistance = `${(totalMeters / 1000).toFixed(1)} km`;
    } else {
      formattedDistance = `${Math.round(totalMeters)} m`;
    }

    // Format remaining duration
    let formattedDuration = "";
    if (totalSeconds >= 60) {
      formattedDuration = `${Math.round(totalSeconds / 60)} mins`;
    } else {
      formattedDuration = `${Math.round(totalSeconds)} secs`;
    }

    return {
      nextStep: remainingSteps[0] || null,
      remainingDistance: formattedDistance,
      remainingDuration: formattedDuration,
      routeSteps: steps,
      currentStepIdx: closestStepIdx
    };
  }, [directionsResponse, ambulanceCoords, userCoords]);

  const routeLeg = directionsResponse?.routes?.[0]?.legs?.[0];
  const { nextStep, remainingDistance, remainingDuration, routeSteps, currentStepIdx } = dynamicRouteInfo;

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

    // Decide the origin coordinates for directions:
    // Prefer the user's actual browser/device GPS location (userCoords) if available,
    // otherwise fall back to the assigned ambulance's database location.
    const originCoords = userCoords || (ambulance ? { lat: ambulance.location.lat, lng: ambulance.location.lng } : null);

    if (!hospital || !originCoords || !originCoords.lat || !hospital.location?.lat) {
      setDirectionsResponse(null);
      lastRequestedRouteRef.current = "";
      return;
    }

    // Only request directions if the case ID, ambulance ID, hospital ID, or rounded user coordinates change.
    // Rounding to 3 decimal places (approx. 110 meters) prevents spamming the API while updating the route on significant movement.
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
        } else {
          console.error(`Directions request failed: ${status}`);
          lastRequestedRouteRef.current = ""; // Reset on error to allow retry
        }
      }
    );
  }, [activeRouteCaseId, emergencies, ambulances, hospitals, isLoaded, userCoords]);

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
      {/* Floating turn-by-turn navigation overlay */}
      {routeLeg && (
        <div className="absolute top-4 left-4 z-[999] w-80 max-h-[90%] flex flex-col bg-background/90 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden text-foreground">
          {/* Active Navigation Header */}
          <div className="bg-blue-600 px-4 py-3 text-white flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold opacity-80">Emergency Routing</p>
              <h3 className="font-bold text-sm truncate max-w-[180px]">
                To: {routeLeg.end_address.split(',')[0]}
              </h3>
            </div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {/* Primary Next Direction Indicator */}
            {nextStep && (
              <div className="flex items-start gap-3 p-3 bg-accent/40 rounded-lg border border-border/50">
                {/* Arrow Icon based on instruction (turn left, turn right, etc.) */}
                <div className="h-10 w-10 flex-shrink-0 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-bold text-xl">
                  {nextStep.maneuver?.includes("left") ? "←" : nextStep.maneuver?.includes("right") ? "→" : "↑"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">NEXT DIRECTION</p>
                  <p 
                    className="text-sm font-medium mt-0.5 leading-snug break-words"
                    dangerouslySetInnerHTML={{ __html: nextStep.instructions }}
                  />
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {nextStep.distance?.text} • {nextStep.duration?.text}
                  </p>
                </div>
              </div>
            )}

            {/* Travel Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/50 rounded-lg border text-center">
                <p className="text-xl font-bold text-blue-500">{remainingDuration}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">EST. TIME (ETA)</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg border text-center">
                <p className="text-xl font-bold text-blue-500">{remainingDistance}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground mt-0.5">REMAINING DIST.</p>
              </div>
            </div>

            {/* Toggler button for detailed steps list */}
            <button
              onClick={() => setShowDetailedRoute(!showDetailedRoute)}
              className="w-full py-2 px-3 text-xs font-semibold bg-secondary hover:bg-secondary/80 rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{showDetailedRoute ? "Hide" : "Show"} Detailed Route</span>
              <span>{showDetailedRoute ? "▲" : "▼"}</span>
            </button>

            {/* Expandable Step-by-Step Directions List */}
            {showDetailedRoute && (
              <div className="space-y-2 border-t pt-3 max-h-60 overflow-y-auto pr-1">
                {routeSteps.map((step, idx) => {
                  const isCompleted = idx < currentStepIdx;
                  const isCurrent = idx === currentStepIdx;
                  return (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex gap-2.5 items-start text-xs border-b border-border/30 pb-2 last:border-0 last:pb-0 transition-opacity",
                        isCompleted ? "opacity-40" : "opacity-100"
                      )}
                    >
                      <span className={cn(
                        "font-mono mt-0.5 text-[10px] flex-shrink-0 w-4 text-center",
                        isCurrent ? "text-blue-500 font-bold" : "text-muted-foreground"
                      )}>
                        {isCompleted ? "✓" : isCurrent ? "▶" : `${idx + 1}`}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p 
                          className={cn(
                            "leading-snug break-words", 
                            isCurrent && "font-semibold text-blue-500"
                          )}
                          dangerouslySetInnerHTML={{ __html: step.instructions }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                          {step.distance?.text} ({step.duration?.text})
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

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

        {/* Render Pulsing User Geolocation Blue Dot */}
        {userCoords && (
          <MarkerF
            position={userCoords}
            icon={{
              url: createUserLocationMarker(),
              scaledSize: new window.google.maps.Size(30, 30),
              anchor: new window.google.maps.Point(15, 15)
            }}
            zIndex={1000}
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
