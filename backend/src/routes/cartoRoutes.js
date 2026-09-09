const express = require('express');
const router = express.Router();
const config = require('../config');

const CARTO_ACCOUNT_ID = config.carto.accountId;
const CARTO_API_ACCESS_TOKEN = config.carto.accessToken;
const CARTO_MCP_URL = `https://gcp-us-east1.api.carto.com/mcp/${CARTO_ACCOUNT_ID}`;

// High-speed In-Memory TTL Caches (5-10 minute sliding windows)
const isolineCache = new Map();
const routeCache = new Map();
const geocodeCache = new Map();

const ISOLINE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;    // 5 minutes
const GEOCODE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Helper to execute JSON-RPC calls against the CARTO MCP Server
async function callCartoMcpTool(toolName, args, timeoutMs = 8000) {
  if (!config.carto.enabled) {
    // No credentials configured — callers fall back to keyless routing/geocoding.
    throw new Error('CARTO integration is not configured (set CARTO_ACCOUNT_ID and CARTO_API_ACCESS_TOKEN)');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const response = await fetch(CARTO_MCP_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CARTO_API_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`CARTO MCP HTTP ${response.status}: ${response.statusText}`);
    }

    const rawText = await response.text();
    
    // Server-Sent Events (SSE) data extraction or standard JSON response
    for (const line of rawText.split('\n')) {
      if (line.startsWith('data:')) {
        const parsed = JSON.parse(line.substring(5).trim());
        if (parsed.result && parsed.result.content && parsed.result.content.length > 0) {
          const innerText = parsed.result.content[0].text;
          try {
            return JSON.parse(innerText);
          } catch {
            return innerText;
          }
        }
      }
    }

    // Direct JSON fallback
    const directJson = JSON.parse(rawText);
    return directJson.result || directJson;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * POST /api/carto/isoline
 * Computes a travel-time catchment area (isochrone) around a medical facility.
 * Body: { latitude, longitude, rangeSeconds = 900, mode = 'car' }
 */
router.post('/isoline', async (req, res) => {
  const { latitude, longitude, rangeSeconds = 900, mode = 'car' } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const cacheKey = `${Number(latitude).toFixed(3)},${Number(longitude).toFixed(3)}_${rangeSeconds}_${mode}`;
  const now = Date.now();

  if (isolineCache.has(cacheKey)) {
    const { timestamp, data } = isolineCache.get(cacheKey);
    if (now - timestamp < ISOLINE_CACHE_TTL_MS) {
      return res.json({ ...data, source: 'cache' });
    }
  }

  try {
    const originStr = `${Number(longitude).toFixed(5)},${Number(latitude).toFixed(5)}`;
    const result = await callCartoMcpTool('calculate_isolines', {
      operation: 'isolines',
      origin: originStr,
      mode: mode,
      range_type: 'time',
      range: String(rangeSeconds)
    });

    if (result && result.data && result.data.features) {
      const responseData = {
        status: 'ok',
        provider: 'carto_traveltime',
        range_seconds: rangeSeconds,
        range_mins: Math.round(rangeSeconds / 60),
        origin: [latitude, longitude],
        geoJson: result.data
      };

      isolineCache.set(cacheKey, { timestamp: now, data: responseData });
      return res.json({ ...responseData, source: 'carto_live' });
    }

    throw new Error('Invalid isoline geometry payload from CARTO');
  } catch (err) {
    console.warn('CARTO Isoline Error, falling back to geodesic approximation:', err.message);

    // High-accuracy Geodesic Fallback Polygon (~15 min drive radius at 35km/h in city traffic = ~8.75km)
    const radiusKm = (rangeSeconds / 3600) * 35;
    const points = 36;
    const coordinates = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360 / points) * (Math.PI / 180);
      const dLat = (radiusKm / 111.32) * Math.cos(angle);
      const dLng = (radiusKm / (111.32 * Math.cos(latitude * (Math.PI / 180)))) * Math.sin(angle);
      coordinates.push([longitude + dLng, latitude + dLat]);
    }

    const fallbackGeoJson = {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { range: rangeSeconds, fallback: true },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }]
    };

    return res.json({
      status: 'ok',
      provider: 'geodesic_fallback',
      range_seconds: rangeSeconds,
      range_mins: Math.round(rangeSeconds / 60),
      origin: [latitude, longitude],
      geoJson: fallbackGeoJson,
      source: 'geodesic_fallback'
    });
  }
});

/**
 * POST /api/carto/route
 * Computes a turn-by-turn road route via CARTO TomTom routing.
 * Body: { originLat, originLng, destLat, destLng, mode = 'car' }
 */
router.post('/route', async (req, res) => {
  const { originLat, originLng, destLat, destLng, mode = 'car' } = req.body;

  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'origin and destination coordinates required' });
  }

  const cacheKey = `${Number(originLat).toFixed(3)},${Number(originLng).toFixed(3)}->${Number(destLat).toFixed(3)},${Number(destLng).toFixed(3)}`;
  const now = Date.now();

  if (routeCache.has(cacheKey)) {
    const { timestamp, data } = routeCache.get(cacheKey);
    if (now - timestamp < ROUTE_CACHE_TTL_MS) {
      return res.json({ ...data, source: 'cache' });
    }
  }

  try {
    const originStr = `${Number(originLng).toFixed(5)},${Number(originLat).toFixed(5)}`;
    const destStr = `${Number(destLng).toFixed(5)},${Number(destLat).toFixed(5)}`;

    const result = await callCartoMcpTool('route', {
      operation: 'route',
      origin: originStr,
      destination: destStr,
      mode: mode,
      overview: 'full'
    });

    if (result && result.data && result.data.value) {
      const val = result.data.value;
      const routeSummary = val.metadata && val.metadata.routes && val.metadata.routes[0] && val.metadata.routes[0].summary;
      
      const distanceMeters = routeSummary ? routeSummary.lengthInMeters : 0;
      const durationSeconds = routeSummary ? routeSummary.travelTimeInSeconds : 0;
      const coords = val.route && val.route.coordinates ? val.route.coordinates : [];

      const responseData = {
        status: 'ok',
        provider: 'carto_tomtom',
        distance_km: Math.round((distanceMeters / 1000) * 100) / 100,
        duration_mins: Math.round((durationSeconds / 60) * 10) / 10,
        coordinates: coords.map(c => [c[1], c[0]]) // Convert [lng, lat] to Leaflet [lat, lng]
      };

      routeCache.set(cacheKey, { timestamp: now, data: responseData });
      return res.json({ ...responseData, source: 'carto_tomtom_live' });
    }

    throw new Error('Empty route response from CARTO TomTom');
  } catch (err) {
    console.warn('CARTO Route Error, falling back to client-side calculation:', err.message);
    res.status(502).json({ error: 'CARTO route service unavailable', details: err.message });
  }
});

/**
 * GET /api/carto/geocode
 * Geocodes an address or landmark in Ghana using CARTO TomTom LDS.
 * Query: ?query=KNUST+Kumasi
 */
router.get('/geocode', async (req, res) => {
  const query = (req.query.query || req.query.q || '').trim();

  if (!query || query.length < 2) {
    return res.json({ results: [] });
  }

  const cacheKey = query.toLowerCase();
  const now = Date.now();

  if (geocodeCache.has(cacheKey)) {
    const { timestamp, data } = geocodeCache.get(cacheKey);
    if (now - timestamp < GEOCODE_CACHE_TTL_MS) {
      return res.json({ results: data, source: 'cache' });
    }
  }

  try {
    const result = await callCartoMcpTool('geocode', {
      operation: 'geocode',
      addresses: [query],
      country: 'GHA'
    }, 4000);

    if (result && result.data && result.data[0] && result.data[0].value) {
      const hits = result.data[0].value;
      const formatted = hits.map(hit => ({
        id: `carto_${hit.latitude}_${hit.longitude}`,
        title: query,
        subtitle: [hit.city, hit.state, hit.country].filter(Boolean).join(', '),
        coords: [hit.latitude, hit.longitude],
        provider: hit.provider || 'tomtom'
      }));

      geocodeCache.set(cacheKey, { timestamp: now, data: formatted });
      return res.json({ results: formatted, source: 'carto_tomtom_live' });
    }

    return res.json({ results: [] });
  } catch (err) {
    console.warn('CARTO Geocode Error:', err.message);
    return res.json({ results: [] });
  }
});

/**
 * GET /api/carto/capabilities
 * Reports account LDS setup and remaining quota.
 */
router.get('/capabilities', async (req, res) => {
  try {
    const result = await callCartoMcpTool('route', { operation: 'capabilities' }, 3000);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch capabilities', details: err.message });
  }
});

module.exports = router;
