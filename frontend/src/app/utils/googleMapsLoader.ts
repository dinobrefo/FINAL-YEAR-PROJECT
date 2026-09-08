/**
 * Google Maps Platform Loader & Geospatial Service Utility
 * 
 * Provides robust, singleton-based loading of the Google Maps JavaScript API
 * with automatic fallback to offline/OSRM zero-key modes when API key is not present.
 */

declare global {
  interface Window {
    google?: any;
    __googleMapsLoaderPromise?: Promise<any>;
  }
}

export interface GooglePlaceResult {
  id: string;
  title: string;
  subtitle: string;
  coords: [number, number];
}

export interface TrafficSegment {
  points: Array<[number, number]>;
  level: 'fast' | 'moderate' | 'heavy';
  color: string;
  speedKmh: number;
}

export interface NavigationManeuver {
  instruction: string;
  distanceText: string;
  durationText?: string;
  maneuver?: string;
}

export interface RouteAlternative {
  id: number;
  summary: string;
  distanceKm: string;
  durationMins: number;
  sirenDurationMins: number;
  points: Array<[number, number]>;
  trafficSegments: TrafficSegment[];
  maneuvers: NavigationManeuver[];
}

export interface GoogleDirectionsResult {
  points: Array<[number, number]>;
  distanceKm: string;
  durationMins: number;
  sirenDurationMins: number;
  inTraffic: boolean;
  summary?: string;
  trafficSegments: TrafficSegment[];
  maneuvers: NavigationManeuver[];
  alternatives: RouteAlternative[];
}

/**
 * Returns the configured Google Maps API key from Vite environment variables.
 */
export const getGoogleMapsApiKey = (): string | null => {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || typeof key !== 'string') return null;
  const cleaned = key.trim();
  if (!cleaned || cleaned.startsWith('your_') || cleaned === 'YOUR_API_KEY') return null;
  return cleaned;
};

/**
 * Checks if Google Maps is configured with a valid API key.
 */
export const isGoogleMapsConfigured = (): boolean => {
  return Boolean(getGoogleMapsApiKey());
};

/**
 * Dynamically loads the Google Maps JavaScript SDK if not already loaded.
 */
export const loadGoogleMapsScript = (): Promise<any | null> => {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.resolve(null);
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (window.__googleMapsLoaderPromise) {
    return window.__googleMapsLoaderPromise;
  }

  window.__googleMapsLoaderPromise = new Promise((resolve) => {
    // Check if script element already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google));
      existingScript.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,routes,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("✓ Google Maps Platform SDK loaded successfully.");
      resolve(window.google);
    };

    script.onerror = (err) => {
      console.warn("Google Maps Platform SDK failed to load, falling back to OpenStreetMap:", err);
      resolve(null);
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoaderPromise;
};

/**
 * Decodes an encoded Google Maps Polyline string into an array of [lat, lng] coordinates.
 */
export const decodePolyline = (encoded: string): Array<[number, number]> => {
  const poly: Array<[number, number]> = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }

  return poly;
};

/**
 * Searches Ghanaian places, landmarks, and intersections using Google Places Autocomplete.
 */
export const searchGooglePlaces = async (
  query: string,
  _locationBias?: [number, number]
): Promise<GooglePlaceResult[]> => {
  if (!query || query.trim().length < 2) return [];

  const google = await loadGoogleMapsScript();
  if (!google?.maps?.places?.AutocompleteService) {
    return [];
  }

  return new Promise((resolve) => {
    try {
      const autocompleteService = new google.maps.places.AutocompleteService();
      const geocoder = new google.maps.Geocoder();

      autocompleteService.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'gh' }, // Restrict search to Ghana
          types: ['geocode', 'establishment']
        },
        async (predictions: any[], status: any) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            resolve([]);
            return;
          }

          const topPredictions = predictions.slice(0, 5);
          const results: GooglePlaceResult[] = [];

          for (const pred of topPredictions) {
            try {
              const geocodeRes = await new Promise<any>((geoResolve) => {
                geocoder.geocode({ placeId: pred.place_id }, (geoResults: any[], geoStatus: any) => {
                  if (geoStatus === 'OK' && geoResults && geoResults[0]) {
                    geoResolve(geoResults[0]);
                  } else {
                    geoResolve(null);
                  }
                });
              });

              if (geocodeRes?.geometry?.location) {
                const lat = geocodeRes.geometry.location.lat();
                const lng = geocodeRes.geometry.location.lng();
                results.push({
                  id: pred.place_id,
                  title: pred.structured_formatting?.main_text || pred.description,
                  subtitle: pred.structured_formatting?.secondary_text || 'Ghana',
                  coords: [lat, lng]
                });
              }
            } catch {
              // skip failed geocode
            }
          }

          resolve(results);
        }
      );
    } catch (e) {
      console.warn("Google Places Autocomplete error:", e);
      resolve([]);
    }
  });
};

export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

// High-Speed In-Memory TTL Cache for Directions (60-second sliding shield)
const DIRECTIONS_CACHE = new Map<string, { expiresAt: number; data: GoogleDirectionsResult }>();
const DIRECTIONS_CACHE_TTL_MS = 60 * 1000;

const getDirectionsCacheKey = (origin: [number, number], dest: [number, number]): string => {
  return `${origin[0].toFixed(4)},${origin[1].toFixed(4)}->${dest[0].toFixed(4)},${dest[1].toFixed(4)}`;
};

const parseRouteLeg = (route: any, leg: any) => {
  let points: Array<[number, number]> = [];
  if (route.overview_polyline) {
    points = decodePolyline(route.overview_polyline);
  } else if (route.overview_path) {
    points = route.overview_path.map((p: any) => [p.lat(), p.lng()] as [number, number]);
  }

  const distMeters = leg?.distance?.value || 0;
  const durSeconds = leg?.duration_in_traffic?.value || leg?.duration?.value || 0;
  const inTraffic = Boolean(leg?.duration_in_traffic);
  const durationMins = Math.max(1, Math.ceil(durSeconds / 60));

  // Emergency Vehicle Dynamics: ~18% faster in traffic, ~25% in free-flow via siren right-of-way
  const sirenFactor = inTraffic ? 0.82 : 0.75;
  const sirenDurationMins = Math.max(1, Math.round(durationMins * sirenFactor));

  // Extract Turn-by-Turn Navigation Maneuvers
  const maneuvers: NavigationManeuver[] = (leg?.steps || []).map((s: any) => ({
    instruction: stripHtml(s.instructions || ''),
    distanceText: s.distance?.text || '',
    durationText: s.duration?.text || '',
    maneuver: s.maneuver || ''
  })).filter((m: NavigationManeuver) => Boolean(m.instruction));

  // Extract Traffic-Segmented Polylines (Green / Amber / Red based on step velocity)
  const trafficSegments: TrafficSegment[] = [];
  if (leg?.steps && leg.steps.length > 0) {
    for (const s of leg.steps) {
      let stepPoints: Array<[number, number]> = [];
      if (s.path && s.path.length > 0) {
        stepPoints = s.path.map((p: any) => [p.lat(), p.lng()] as [number, number]);
      } else if (s.lat_lngs && s.lat_lngs.length > 0) {
        stepPoints = s.lat_lngs.map((p: any) => [p.lat(), p.lng()] as [number, number]);
      } else if (s.polyline) {
        stepPoints = decodePolyline(s.polyline);
      }

      if (stepPoints.length > 0) {
        const sDist = s.distance?.value || 0;
        const sDur = s.duration_in_traffic?.value || s.duration?.value || 1;
        const speedKmh = sDur > 0 ? (sDist / sDur) * 3.6 : 35;

        let level: 'fast' | 'moderate' | 'heavy' = 'fast';
        let color = '#10b981'; // Green: Free flow > 42 km/h

        if (speedKmh < 20) {
          level = 'heavy';
          color = '#ef4444'; // Red: Severe bottleneck < 20 km/h
        } else if (speedKmh < 42) {
          level = 'moderate';
          color = '#f59e0b'; // Amber: Moderate flow 20-42 km/h
        }

        trafficSegments.push({
          points: stepPoints,
          level,
          color,
          speedKmh: Math.round(speedKmh)
        });
      }
    }
  }

  // Fallback segment if steps lacked individual coordinate arrays
  if (trafficSegments.length === 0 && points.length > 0) {
    trafficSegments.push({
      points,
      level: inTraffic ? 'moderate' : 'fast',
      color: inTraffic ? '#f59e0b' : '#10b981',
      speedKmh: 35
    });
  }

  return {
    points,
    distanceKm: (distMeters / 1000).toFixed(1),
    durationMins,
    sirenDurationMins,
    inTraffic,
    summary: route.summary || leg?.end_address || 'Optimal Route',
    trafficSegments,
    maneuvers
  };
};

/**
 * Requests turn-by-turn driving directions with live traffic, alternative corridors,
 * and high-speed in-memory TTL caching from Google Directions Service.
 */
export const fetchGoogleDirections = async (
  origin: [number, number],
  dest: [number, number]
): Promise<GoogleDirectionsResult | null> => {
  const cacheKey = getDirectionsCacheKey(origin, dest);
  const cached = DIRECTIONS_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  const google = await loadGoogleMapsScript();
  if (!google?.maps?.DirectionsService) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const directionsService = new google.maps.DirectionsService();

      directionsService.route(
        {
          origin: { lat: origin[0], lng: origin[1] },
          destination: { lat: dest[0], lng: dest[1] },
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: google.maps.TrafficModel.BEST_GUESS
          },
          provideRouteAlternatives: true // Evaluate multi-corridor alternatives
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
            const primaryLeg = parseRouteLeg(result.routes[0], result.routes[0].legs?.[0]);

            const alternatives: RouteAlternative[] = result.routes.slice(1).map((r: any, idx: number) => {
              const parsed = parseRouteLeg(r, r.legs?.[0]);
              return {
                id: idx + 1,
                summary: parsed.summary,
                distanceKm: parsed.distanceKm,
                durationMins: parsed.durationMins,
                sirenDurationMins: parsed.sirenDurationMins,
                points: parsed.points,
                trafficSegments: parsed.trafficSegments,
                maneuvers: parsed.maneuvers
              };
            });

            const finalResult: GoogleDirectionsResult = {
              ...primaryLeg,
              alternatives
            };

            DIRECTIONS_CACHE.set(cacheKey, {
              expiresAt: Date.now() + DIRECTIONS_CACHE_TTL_MS,
              data: finalResult
            });

            resolve(finalResult);
          } else {
            console.warn("Google Directions service status not OK:", status);
            resolve(null);
          }
        }
      );
    } catch (e) {
      console.warn("Google Directions Service exception:", e);
      resolve(null);
    }
  });
};
