import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';

export interface HospitalCapacityItem {
  id: string;
  name: string;
  shortName: string;
  region: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  occupancyRate: number; // 0 - 100
  icuTotal: number;
  icuAvailable: number;
  icuOccupied: number;
  icuOccupancy: number; // 0 - 100
  color: string;
  icuColor: string;
  status: 'Optimal' | 'Moderate' | 'Critical';
}

export interface Analytics3DProps {
  analyticsData?: any;
  hospitals?: any[];
  height?: number | string;
}

// Utility to safely detect WebGL support without throwing
const checkWebGLSupport = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return !!(gl && gl instanceof WebGLRenderingContext);
  } catch (e) {
    return false;
  }
};

// Normalizes data from either hospitals array or analyticsData
const parseCapacityData = (hospitals?: any[], analyticsData?: any): HospitalCapacityItem[] => {
  if (hospitals && Array.isArray(hospitals) && hospitals.length > 0) {
    // Filter facilities with bed capacity and pick top regional centers
    const sorted = [...hospitals]
      .filter(h => (h.totalBeds || h.total_general_beds || 0) > 0)
      .sort((a, b) => (b.totalBeds || b.total_general_beds || 0) - (a.totalBeds || a.total_general_beds || 0))
      .slice(0, 8);

    return sorted.map((h, idx) => {
      const name = h.name || `Facility ${idx + 1}`;
      const totalGen = h.totalBeds || h.total_general_beds || 100;
      const availGen = h.availableBeds != null ? h.availableBeds : (totalGen - (h.occupied_general_beds || 0));
      const occGen = Math.max(0, totalGen - availGen);
      const occRate = Math.min(100, Math.round((occGen / Math.max(1, totalGen)) * 100));

      const icuTotal = h.icuBeds?.total || h.total_icu_beds || 10;
      const icuAvail = h.icuBeds?.available != null ? h.icuBeds.available : (icuTotal - (h.occupied_icu_beds || 0));
      const icuOcc = Math.max(0, icuTotal - icuAvail);
      const icuRate = Math.min(100, Math.round((icuOcc / Math.max(1, icuTotal)) * 100));

      const color = occRate > 85 ? '#ef4444' : occRate > 60 ? '#f59e0b' : '#10b981';
      const icuColor = icuRate > 85 ? '#dc2626' : icuRate > 60 ? '#f97316' : '#06b6d4';
      const status = occRate > 85 || icuRate > 85 ? 'Critical' : occRate > 60 ? 'Moderate' : 'Optimal';

      let shortName = name.replace(/Teaching Hospital|Regional Hospital|Government Hospital|General Hospital|Medical Centre|Hospital/gi, '').trim();
      if (!shortName) shortName = name.substring(0, 14);

      return {
        id: h.id || `hosp-${idx}`,
        name,
        shortName: shortName.length > 12 ? shortName.substring(0, 11) + '…' : shortName,
        region: h.region || (name.toLowerCase().includes('kumasi') || name.toLowerCase().includes('komfo') || name.toLowerCase().includes('knust') ? 'Ashanti' : 'Greater Accra'),
        totalBeds: totalGen,
        availableBeds: availGen,
        occupiedBeds: occGen,
        occupancyRate: occRate,
        icuTotal,
        icuAvailable: icuAvail,
        icuOccupied: icuOcc,
        icuOccupancy: icuRate,
        color,
        icuColor,
        status
      };
    });
  }

  if (analyticsData?.bedOccupancy && Array.isArray(analyticsData.bedOccupancy)) {
    return analyticsData.bedOccupancy.slice(0, 8).map((entry: any, idx: number) => {
      const occRate = Math.min(100, Math.max(0, entry.occupancy || 0));
      const color = occRate > 85 ? '#ef4444' : occRate > 60 ? '#f59e0b' : '#10b981';
      const name = entry.name || `Center ${idx + 1}`;
      let shortName = name.replace(/Teaching Hospital|Regional Hospital|Hospital/gi, '').trim();

      return {
        id: `analytic-${idx}`,
        name,
        shortName: shortName.length > 12 ? shortName.substring(0, 11) + '…' : shortName,
        region: 'Ghana',
        totalBeds: 250,
        availableBeds: Math.round(250 * (1 - occRate / 100)),
        occupiedBeds: Math.round(250 * (occRate / 100)),
        occupancyRate: occRate,
        icuTotal: 20,
        icuAvailable: Math.max(1, Math.round(20 * (1 - occRate / 100))),
        icuOccupied: Math.round(20 * (occRate / 100)),
        icuOccupancy: occRate,
        color,
        icuColor: occRate > 85 ? '#dc2626' : '#06b6d4',
        status: occRate > 85 ? 'Critical' : occRate > 60 ? 'Moderate' : 'Optimal'
      };
    });
  }

  return [];
};

// ----------------------------------------------------------------------
// 1. Interactive 2.5D Isometric Standard Mode Mesh
// ----------------------------------------------------------------------
export const StandardCapacityMesh: React.FC<{
  hospitals?: any[];
  analyticsData?: any;
  onSwitchTo3D?: () => void;
  canSwitchTo3D?: boolean;
}> = ({ hospitals, analyticsData, onSwitchTo3D, canSwitchTo3D = true }) => {
  const data = React.useMemo(() => parseCapacityData(hospitals, analyticsData), [hospitals, analyticsData]);
  const [selectedItem, setSelectedItem] = React.useState<HospitalCapacityItem | null>(null);

  const totalBeds = data.reduce((acc, d) => acc + d.totalBeds, 0);
  const totalFreeGen = data.reduce((acc, d) => acc + d.availableBeds, 0);
  const totalFreeIcu = data.reduce((acc, d) => acc + d.icuAvailable, 0);
  const avgOccupancy = data.length > 0 ? Math.round(data.reduce((acc, d) => acc + d.occupancyRate, 0) / data.length) : 0;

  return (
    <div className="w-full h-full min-h-[280px] bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 flex flex-col justify-between select-none">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Live Capacity Mesh (Standard Mode)
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
            <span>Free ER: <strong className="text-slate-200">{totalFreeGen}</strong></span>
            <span>Free ICU: <strong className="text-cyan-400">{totalFreeIcu}</strong></span>
            <span>Avg Load: <strong className={avgOccupancy > 80 ? "text-red-400" : "text-amber-400"}>{avgOccupancy}%</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canSwitchTo3D && onSwitchTo3D && (
            <button
              onClick={onSwitchTo3D}
              className="text-[11px] font-medium px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 shadow-sm"
              title="Launch Three.js 3D WebGL Platform"
            >
              <span>🌐</span>
              <span>Launch 3D WebGL</span>
            </button>
          )}
        </div>
      </div>

      {/* Isometric 2.5D Capacity Mesh Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 py-4 items-end justify-between flex-1">
        {data.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const genHeightPct = Math.max(12, item.occupancyRate);
          const icuHeightPct = Math.max(12, item.icuOccupancy);

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(isSelected ? null : item)}
              onMouseEnter={() => setSelectedItem(item)}
              className={`group relative flex flex-col items-center justify-end h-[160px] p-1.5 rounded-lg transition-all duration-200 cursor-pointer border ${
                isSelected 
                  ? 'bg-slate-900/90 border-emerald-500/80 ring-1 ring-emerald-500/50 scale-[1.03]' 
                  : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              {/* Dual Isometric Tower Column Visualizer */}
              <div className="w-full flex items-end justify-center gap-1.5 h-[100px] mb-2 px-1">
                {/* General / ER Bed Tower */}
                <div className="w-1/2 flex flex-col items-center justify-end h-full">
                  <div 
                    className="w-full rounded-t transition-all duration-500 relative group-hover:brightness-125 shadow-lg"
                    style={{
                      height: `${genHeightPct}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 12px ${item.color}40`
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t" />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono">{item.occupancyRate}%</span>
                </div>

                {/* Critical ICU Bed Tower */}
                <div className="w-1/2 flex flex-col items-center justify-end h-full">
                  <div 
                    className="w-full rounded-t transition-all duration-500 relative group-hover:brightness-125 shadow-lg"
                    style={{
                      height: `${icuHeightPct}%`,
                      backgroundColor: item.icuColor,
                      boxShadow: `0 0 12px ${item.icuColor}40`
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t" />
                  </div>
                  <span className="text-[9px] text-cyan-400 mt-1 font-mono font-bold">{item.icuOccupancy}%</span>
                </div>
              </div>

              {/* Hospital Title Label */}
              <div className="w-full text-center">
                <p className="text-[10px] font-semibold text-slate-200 truncate leading-tight" title={item.name}>
                  {item.shortName}
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    item.status === 'Optimal' ? 'bg-emerald-400' : item.status === 'Moderate' ? 'bg-amber-400' : 'bg-red-400'
                  }`} />
                  <span className="text-[9px] text-slate-400 font-mono">
                    {item.availableBeds} free
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Telemetry Detail Bar */}
      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-[10px] text-slate-300">ER Beds (&lt;60% Normal)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-cyan-500" />
            <span className="text-[10px] text-slate-300">ICU Capacity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span className="text-[10px] text-slate-300">Surge (&gt;85%)</span>
          </div>
        </div>

        {selectedItem ? (
          <div className="hidden sm:flex items-center gap-2 bg-slate-900 px-2.5 py-1 rounded border border-slate-700 text-[11px] text-slate-200 animate-in fade-in">
            <span className="font-semibold text-white">{selectedItem.name}:</span>
            <span>Gen: <strong className="text-emerald-400">{selectedItem.availableBeds}/{selectedItem.totalBeds}</strong> free</span>
            <span>ICU: <strong className="text-cyan-400">{selectedItem.icuAvailable}/{selectedItem.icuTotal}</strong> free</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${
              selectedItem.status === 'Optimal' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
              selectedItem.status === 'Moderate' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
              'bg-red-950 text-red-300 border border-red-800'
            }`}>
              {selectedItem.status}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-500 italic hidden sm:inline">
            Click or hover over any hospital column for real-time triage metrics.
          </span>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 2. Three.js 3D WebGL Mode
// ----------------------------------------------------------------------
const WebGLBar: React.FC<{
  position: [number, number, number];
  height: number;
  color: string;
  item: HospitalCapacityItem;
}> = ({ position, height, color, item }) => {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = React.useState(false);
  const [animHeight, setAnimHeight] = React.useState(0.1);

  useFrame((_, delta) => {
    if (animHeight < height) {
      setAnimHeight(prev => Math.min(prev + delta * height * 2.5, height));
    }
    if (meshRef.current) {
      const targetScale = hovered ? 1.1 : 1.0;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.15);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.15);
    }
  });

  const clampedHeight = Math.max(animHeight, 0.1);

  return (
    <group position={position}>
      <RoundedBox
        ref={meshRef}
        args={[0.6, clampedHeight, 0.6]}
        radius={0.05}
        position={[0, clampedHeight / 2, 0]}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default'; }}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.6 : 0.2}
          metalness={0.4}
          roughness={0.3}
        />
      </RoundedBox>

      {/* Floating HTML Badge for 100% offline font independence */}
      <Html position={[0, clampedHeight + 0.35, 0]} center distanceFactor={12}>
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition shadow-lg pointer-events-none whitespace-nowrap ${
          hovered ? 'bg-white text-slate-950 scale-110' : 'bg-slate-900/90 text-slate-200 border border-slate-700'
        }`}>
          {item.occupancyRate}%
        </div>
      </Html>

      <Html position={[0, -0.35, 0]} center distanceFactor={12}>
        <div className="text-[10px] font-semibold text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 whitespace-nowrap pointer-events-none text-center">
          {item.shortName}
        </div>
      </Html>
    </group>
  );
};

const WebGLPlatform: React.FC<{ width: number; depth: number }> = ({ width, depth }) => {
  return (
    <group position={[0, -0.05, 0]}>
      <RoundedBox args={[width, 0.08, depth]} radius={0.02} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.6}
          roughness={0.2}
        />
      </RoundedBox>
      <gridHelper
        args={[width - 0.5, 10, '#334155', '#1e293b']}
        position={[0, 0.05, 0]}
      />
    </group>
  );
};

// ----------------------------------------------------------------------
// Main Analytics3D Component with Smart Dual-Mode Fallback
// ----------------------------------------------------------------------
export const Analytics3D: React.FC<Analytics3DProps> = ({ analyticsData, hospitals }) => {
  const [viewMode, setViewMode] = React.useState<'3d' | '2.5d'>('2.5d');
  const [webGLSupported] = React.useState<boolean>(() => checkWebGLSupport());
  const [webGLError, setWebGLError] = React.useState<boolean>(false);

  const data = React.useMemo(() => parseCapacityData(hospitals, analyticsData), [hospitals, analyticsData]);

  if (data.length === 0) {
    return (
      <div className="h-full min-h-[260px] w-full flex flex-col items-center justify-center text-muted-foreground bg-slate-950 rounded-xl border border-slate-800 p-6 text-center">
        <p className="text-sm font-medium text-slate-300 mb-1">Live Hospital Mesh Initializing</p>
        <p className="text-xs text-slate-500 animate-pulse">Syncing regional ER & ICU telemetry...</p>
      </div>
    );
  }

  // If WebGL is not supported, or threw an error, or user selected standard mode
  if (viewMode === '2.5d' || !webGLSupported || webGLError) {
    return (
      <StandardCapacityMesh
        hospitals={hospitals}
        analyticsData={analyticsData}
        canSwitchTo3D={webGLSupported && !webGLError}
        onSwitchTo3D={() => setViewMode('3d')}
      />
    );
  }

  const maxValue = Math.max(...data.map(d => d.occupancyRate), 1);
  const barSpacing = 1.3;
  const totalWidth = data.length * barSpacing;

  return (
    <div className="relative h-full min-h-[280px] w-full rounded-xl overflow-hidden border border-slate-800 bg-[#070b14]">
      {/* 3D Top Action Overlay */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded border border-slate-700 pointer-events-auto shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-[11px] font-semibold text-cyan-300">
            3D WebGL Orbital Mesh
          </span>
        </div>

        <button
          onClick={() => setViewMode('2.5d')}
          className="pointer-events-auto text-[11px] font-medium px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 shadow-md"
        >
          <span>⚡</span>
          <span>Switch to Standard Mesh</span>
        </button>
      </div>

      <Canvas
        camera={{ position: [0, 4, 8], fov: 48 }}
        gl={{ antialias: false, alpha: false, powerPreference: 'low-power' }}
        onCreated={({ gl }) => {
          try {
            gl.setClearColor('#070b14');
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.1;
          } catch (e) {
            console.warn("WebGL parameters error:", e);
            setWebGLError(true);
          }
        }}
        onError={() => {
          console.warn("Canvas WebGL error caught, falling back to 2.5D");
          setWebGLError(true);
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={0.9} color="#dbeafe" />
        <pointLight position={[-4, 5, -3]} intensity={0.6} color="#38bdf8" />
        <pointLight position={[4, 5, 3]} intensity={0.4} color="#818cf8" />

        <WebGLPlatform width={totalWidth + 2} depth={3.2} />

        {data.map((item, idx) => {
          const normalizedHeight = (item.occupancyRate / maxValue) * 3.8;
          const xPos = (idx - (data.length - 1) / 2) * barSpacing;
          return (
            <WebGLBar
              key={item.id}
              position={[xPos, 0, 0]}
              height={normalizedHeight}
              color={item.color}
              item={item}
            />
          );
        })}

        <OrbitControls
          enablePan={false}
          minDistance={5}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2.1}
          autoRotate
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
};

export default Analytics3D;

