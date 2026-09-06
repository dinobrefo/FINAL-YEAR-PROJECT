import * as React from 'react';
import GlobeComponent from 'react-globe.gl';
import { Emergency, Ambulance, Hospital } from '../../utils/mockData';
import { useNavigate } from 'react-router';

// Safe resolution for react-globe.gl default export in ESM/Vite
const Globe = (GlobeComponent as any)?.default || GlobeComponent;

interface GlobeViewProps {
  emergencies: Emergency[];
  ambulances: Ambulance[];
  hospitals: Hospital[];
}

const GHANA_POLYGON = {
  type: 'Feature' as const,
  properties: { name: 'Ghana' },
  geometry: {
    type: 'Polygon' as const,
    coordinates: [[
      [-3.24437, 5.10159], [-2.98585, 5.10159], [-1.60089, 4.77078],
      [0.02380, 5.58692], [1.19998, 6.10004], [1.18283, 6.92732],
      [0.36758, 6.57427], [0.36758, 7.71674], [0.49957, 8.30052],
      [-0.04900, 8.71439], [-0.04900, 9.49600], [-0.06813, 9.92988],
      [-0.34175, 10.61480], [-0.68828, 10.95200], [-1.02105, 11.11070],
      [-2.17682, 11.05940], [-2.69102, 10.77010], [-2.83024, 10.53920],
      [-2.81893, 9.64246], [-2.92431, 7.69340], [-3.24437, 6.25047],
      [-3.24437, 5.10159]
    ]]
  }
};

export const GlobeView: React.FC<GlobeViewProps> = ({
  emergencies,
  ambulances,
  hospitals
}) => {
  const globeRef = React.useRef<any>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [dimensions, setDimensions] = React.useState({ width: 800, height: 600 });
  const [globeTexture, setGlobeTexture] = React.useState<'satellite' | 'night' | 'dark'>('satellite');

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  React.useEffect(() => {
    if (globeRef.current && typeof globeRef.current.pointOfView === 'function') {
      try {
        globeRef.current.pointOfView({ lat: 7.9465, lng: -1.0232, altitude: 1.8 }, 1500);
      } catch (err) {
        console.error("Globe POV error:", err);
      }
    }
  }, []);

  const getTextureUrl = () => {
    switch (globeTexture) {
      case 'satellite':
        return '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
      case 'night':
        return '//unpkg.com/three-globe/example/img/earth-night.jpg';
      case 'dark':
        return '//unpkg.com/three-globe/example/img/earth-dark.jpg';
    }
  };

  const pointsData = React.useMemo(() => {
    const pts: Array<{
      lat: number;
      lng: number;
      size: number;
      color: string;
      label: string;
      type: string;
    }> = [];

    hospitals.forEach(h => {
      if (h.location?.lat && h.location?.lng) {
        pts.push({
          lat: h.location.lat,
          lng: h.location.lng,
          size: 0.12,
          color: h.availableBeds > 5 ? '#22c55e' : h.availableBeds > 0 ? '#eab308' : '#ef4444',
          label: `🏥 ${h.name} (${h.availableBeds} beds)`,
          type: 'hospital'
        });
      }
    });

    emergencies.forEach(e => {
      if (e.location?.lat && e.location?.lng) {
        pts.push({
          lat: e.location.lat,
          lng: e.location.lng,
          size: e.severity === 'critical' ? 0.18 : 0.12,
          color: e.severity === 'critical' ? '#ef4444' : e.severity === 'moderate' ? '#f97316' : '#eab308',
          label: `⚠️ ${e.emergencyType} — ${e.patientName} (${e.severity})`,
          type: 'emergency'
        });
      }
    });

    ambulances.forEach(a => {
      if (a.location?.lat && a.location?.lng) {
        pts.push({
          lat: a.location.lat,
          lng: a.location.lng,
          size: 0.1,
          color: a.status === 'engaged' ? '#f97316' : '#3b82f6',
          label: `🚑 ${a.plateNumber || a.id} (${a.status})`,
          type: 'ambulance'
        });
      }
    });

    return pts;
  }, [hospitals, emergencies, ambulances]);

  const arcsData = React.useMemo(() => {
    const arcs: Array<{
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
      color: [string, string];
      label: string;
    }> = [];

    emergencies.forEach(em => {
      if (!em.ambulanceId || !em.assignedHospital) return;
      const amb = ambulances.find(a => a.id === em.ambulanceId);
      const hosp = hospitals.find(h => h.id === em.assignedHospital || h.name === em.assignedHospital);
      if (!amb?.location?.lat || !hosp?.location?.lat) return;

      const arcColor = em.severity === 'critical' ? '#ef4444' : em.severity === 'moderate' ? '#f97316' : '#22c55e';

      arcs.push({
        startLat: amb.location.lat,
        startLng: amb.location.lng,
        endLat: hosp.location.lat,
        endLng: hosp.location.lng,
        color: [arcColor, arcColor],
        label: `${em.emergencyType} → ${hosp.name}`
      });
    });

    return arcs;
  }, [emergencies, ambulances, hospitals]);

  const ringsData = React.useMemo(() => {
    return emergencies
      .filter(e => e.location?.lat && e.location?.lng && e.status !== 'completed')
      .map(e => ({
        lat: e.location.lat,
        lng: e.location.lng,
        maxR: e.severity === 'critical' ? 3 : 1.5,
        propagationSpeed: e.severity === 'critical' ? 4 : 2,
        repeatPeriod: 800,
        color: e.severity === 'critical' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(249, 115, 22, 0.5)'
      }));
  }, [emergencies]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden rounded-lg min-h-[600px]">
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-50 bg-background/85 backdrop-blur-md rounded-xl border border-border px-4 py-3 space-y-1.5 shadow-lg">
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Telemetry Legend</p>
        <div className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Hospitals</div>
        <div className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> Emergencies</div>
        <div className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Ambulances</div>
        <div className="flex items-center gap-2 text-xs"><span className="h-1 w-5 bg-gradient-to-r from-red-500 to-red-400 inline-block rounded" /> Active Dispatch Arc</div>
      </div>

      {/* Globe Texture Controls & Navigation Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-background/85 backdrop-blur-md p-1.5 rounded-xl border border-border shadow-lg">
        {/* Texture Toggles */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
          <button
            onClick={() => setGlobeTexture('satellite')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              globeTexture === 'satellite' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
            }`}
            title="High-Resolution Satellite Terrain"
          >
            🛰️ Satellite
          </button>
          <button
            onClick={() => setGlobeTexture('night')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              globeTexture === 'night' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
            }`}
            title="Night City Lights"
          >
            🌙 Night
          </button>
          <button
            onClick={() => setGlobeTexture('dark')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              globeTexture === 'dark' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-accent text-muted-foreground'
            }`}
            title="Dark Vector Map"
          >
            🗺️ Vector
          </button>
        </div>

        {/* Focus Ghana */}
        <button
          onClick={() => {
            if (globeRef.current && typeof globeRef.current.pointOfView === 'function') {
              globeRef.current.pointOfView({ lat: 7.9465, lng: -1.0232, altitude: 1.8 }, 1000);
            }
          }}
          className="px-2.5 py-1 text-xs font-semibold bg-secondary hover:bg-secondary/80 border rounded-lg transition-all cursor-pointer"
        >
          🇬🇭 Ghana
        </button>

        {/* Switch to Live Tactical Map */}
        <button
          onClick={() => navigate('/command/map')}
          className="px-2.5 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1"
        >
          🗺️ Live Tactical Map
        </button>
      </div>

      {Globe ? (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl={getTextureUrl()}
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.25}

          polygonsData={[GHANA_POLYGON]}
          polygonCapColor={() => 'rgba(59, 130, 246, 0.2)'}
          polygonSideColor={() => 'rgba(59, 130, 246, 0.1)'}
          polygonStrokeColor={() => '#3b82f6'}
          polygonAltitude={0.01}

          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.02}
          pointRadius="size"
          pointLabel="label"

          arcsData={arcsData}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={1500}
          arcStroke={0.5}
          arcLabel="label"

          ringsData={ringsData}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius="maxR"
          ringPropagationSpeed="propagationSpeed"
          ringRepeatPeriod="repeatPeriod"
          ringColor="color"

          enablePointerInteraction={true}
          animateIn={true}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
          Loading 3D Globe View...
        </div>
      )}
    </div>
  );
};

export default GlobeView;
