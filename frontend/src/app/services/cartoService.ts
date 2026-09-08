// CARTO Location Data Services (LDS) Client Service
// Integrates CARTO TravelTime Isolines, TomTom Routing, and Ghana Geocoding

export interface CartoIsolineResponse {
  status: string;
  provider: string;
  range_seconds: number;
  range_mins: number;
  origin: [number, number];
  geoJson: GeoJSON.FeatureCollection;
  source: string;
}

export interface CartoRouteResponse {
  status: string;
  provider: string;
  distance_km: number;
  duration_mins: number;
  coordinates: [number, number][]; // [lat, lng] array
  source: string;
}

export interface CartoGeocodeResult {
  id: string;
  title: string;
  subtitle: string;
  coords: [number, number]; // [lat, lng]
  provider: string;
}

// Client-side cache to minimize redundant network roundtrips
const clientIsolineCache = new Map<string, CartoIsolineResponse>();
const clientGeocodeCache = new Map<string, CartoGeocodeResult[]>();

export const cartoService = {
  /**
   * Fetches the 15-minute emergency drive catchment area (isochrone) for a hospital
   */
  async fetchHospitalIsoline(
    latitude: number, 
    longitude: number, 
    rangeSeconds: number = 900
  ): Promise<CartoIsolineResponse | null> {
    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}_${rangeSeconds}`;
    if (clientIsolineCache.has(key)) {
      return clientIsolineCache.get(key)!;
    }

    try {
      const res = await fetch('/api/carto/isoline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude,
          longitude,
          rangeSeconds,
          mode: 'car'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: CartoIsolineResponse = await res.json();
      if (data && data.geoJson) {
        clientIsolineCache.set(key, data);
        return data;
      }
      return null;
    } catch (err) {
      console.warn('CARTO Isoline fetch fallback:', err);
      return null;
    }
  },

  /**
   * Computes an enterprise TomTom route between two GPS coordinates
   */
  async fetchCartoRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<CartoRouteResponse | null> {
    try {
      const res = await fetch('/api/carto/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originLat,
          originLng,
          destLat,
          destLng,
          mode: 'car'
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('CARTO Route fetch fallback:', err);
      return null;
    }
  },

  /**
   * Resolves Ghanaian street addresses, university campuses, and landmarks into GPS coordinates
   */
  async searchGhanaPlaces(query: string): Promise<CartoGeocodeResult[]> {
    const cleanQuery = query.trim().toLowerCase();
    if (cleanQuery.length < 2) return [];

    if (clientGeocodeCache.has(cleanQuery)) {
      return clientGeocodeCache.get(cleanQuery)!;
    }

    try {
      const res = await fetch(`/api/carto/geocode?query=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const results: CartoGeocodeResult[] = data.results || [];
      if (results.length > 0) {
        clientGeocodeCache.set(cleanQuery, results);
      }
      return results;
    } catch (err) {
      console.warn('CARTO Geocode lookup notice:', err);
      return [];
    }
  }
};
