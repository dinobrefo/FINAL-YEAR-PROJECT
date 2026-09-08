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

export interface GoogleDirectionsResult {
  points: Array<[number, number]>;
  distanceKm: string;
  durationMins: number;
  inTraffic: boolean;
  summary?: string;
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

/**
 * Requests turn-by-turn driving directions with live traffic from Google Directions Service.
 */
export const fetchGoogleDirections = async (
  origin: [number, number],
  dest: [number, number]
): Promise<GoogleDirectionsResult | null> => {
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
          provideRouteAlternatives: false
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && result?.routes?.[0]) {
            const route = result.routes[0];
            const leg = route.legs?.[0];

            let points: Array<[number, number]> = [];
            if (route.overview_polyline) {
              points = decodePolyline(route.overview_polyline);
            } else if (route.overview_path) {
              points = route.overview_path.map((p: any) => [p.lat(), p.lng()] as [number, number]);
            }

            const distMeters = leg?.distance?.value || 0;
            const durSeconds = leg?.duration_in_traffic?.value || leg?.duration?.value || 0;
            const inTraffic = Boolean(leg?.duration_in_traffic);

            resolve({
              points,
              distanceKm: (distMeters / 1000).toFixed(1),
              durationMins: Math.max(1, Math.ceil(durSeconds / 60)),
              inTraffic,
              summary: route.summary || leg?.end_address
            });
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
