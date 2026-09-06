import * as React from "react";

export interface HospitalCapacityItem {
  id: string;
  name: string;
  shortName: string;
  region: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  icuTotal: number;
  icuAvailable: number;
  icuOccupied: number;
  icuOccupancy: number;
  color: string;
  icuColor: string;
  status: "Optimal" | "Moderate" | "Critical";
  specialists?: string[];
  equipment?: Record<string, number>;
}

export interface HospitalCapacityMeshProps {
  hospitals?: any[];
  analyticsData?: any;
  height?: number | string;
}

export const parseHospitalCapacity = (hospitals?: any[], analyticsData?: any): HospitalCapacityItem[] => {
  if (hospitals && Array.isArray(hospitals) && hospitals.length > 0) {
    const sorted = [...hospitals]
      .filter(h => (h.totalBeds || h.total_general_beds || 0) > 0)
      .sort((a, b) => (b.totalBeds || b.total_general_beds || 0) - (a.totalBeds || a.total_general_beds || 0))
      .slice(0, 8);

    return sorted.map((h, idx) => {
      const name = h.name || `Facility ${idx + 1}`;
      const totalGen = Number(h.totalBeds || h.total_general_beds || 100);
      const availGen = h.availableBeds != null ? Number(h.availableBeds) : (totalGen - Number(h.occupied_general_beds || 0));
      const occGen = Math.max(0, totalGen - availGen);
      const occRate = Math.min(100, Math.max(0, Math.round((occGen / Math.max(1, totalGen)) * 100)));

      const icuTotal = Number(h.icuBeds?.total || h.total_icu_beds || 10);
      const icuAvail = h.icuBeds?.available != null ? Number(h.icuBeds.available) : (icuTotal - Number(h.occupied_icu_beds || 0));
      const icuOcc = Math.max(0, icuTotal - icuAvail);
      const icuRate = icuTotal > 0 ? Math.min(100, Math.max(0, Math.round((icuOcc / icuTotal) * 100))) : 0;

      const color = occRate > 85 ? "#ef4444" : occRate > 60 ? "#f59e0b" : "#10b981";
      const icuColor = icuRate > 85 ? "#dc2626" : icuRate > 60 ? "#f97316" : "#06b6d4";
      const status = occRate > 85 || icuRate > 85 ? "Critical" : occRate > 60 ? "Moderate" : "Optimal";

      let shortName = String(name).replace(/Teaching Hospital|Regional Hospital|Government Hospital|General Hospital|Medical Centre|Hospital/gi, "").trim();
      if (!shortName) shortName = String(name).substring(0, 14);

      return {
        id: String(h.id || `hosp-${idx}`),
        name: String(name),
        shortName: shortName.length > 12 ? shortName.substring(0, 11) + "…" : shortName,
        region: h.region || (name.toLowerCase().includes("kumasi") || name.toLowerCase().includes("komfo") || name.toLowerCase().includes("knust") ? "Ashanti" : "Greater Accra"),
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
        status,
        specialists: h.specialists,
        equipment: h.equipment
      };
    });
  }

  if (analyticsData?.bedOccupancy && Array.isArray(analyticsData.bedOccupancy)) {
    return analyticsData.bedOccupancy.slice(0, 8).map((entry: any, idx: number) => {
      const occRate = Math.min(100, Math.max(0, Number(entry.occupancy || 0)));
      const color = occRate > 85 ? "#ef4444" : occRate > 60 ? "#f59e0b" : "#10b981";
      const name = String(entry.name || `Center ${idx + 1}`);
      let shortName = name.replace(/Teaching Hospital|Regional Hospital|Hospital/gi, "").trim();

      return {
        id: `analytic-${idx}`,
        name,
        shortName: shortName.length > 12 ? shortName.substring(0, 11) + "…" : shortName,
        region: "Ghana",
        totalBeds: 250,
        availableBeds: Math.round(250 * (1 - occRate / 100)),
        occupiedBeds: Math.round(250 * (occRate / 100)),
        occupancyRate: occRate,
        icuTotal: 20,
        icuAvailable: Math.max(1, Math.round(20 * (1 - occRate / 100))),
        icuOccupied: Math.round(20 * (occRate / 100)),
        icuOccupancy: occRate,
        color,
        icuColor: occRate > 85 ? "#dc2626" : "#06b6d4",
        status: occRate > 85 ? "Critical" : occRate > 60 ? "Moderate" : "Optimal"
      };
    });
  }

  return [];
};

export const HospitalCapacityMesh: React.FC<HospitalCapacityMeshProps> = ({ hospitals, analyticsData }) => {
  const data = React.useMemo(() => parseHospitalCapacity(hospitals, analyticsData), [hospitals, analyticsData]);
  const [selectedItem, setSelectedItem] = React.useState<HospitalCapacityItem | null>(null);

  const totalBeds = data.reduce((acc, d) => acc + d.totalBeds, 0);
  const totalFreeGen = data.reduce((acc, d) => acc + d.availableBeds, 0);
  const totalFreeIcu = data.reduce((acc, d) => acc + d.icuAvailable, 0);
  const avgOccupancy = data.length > 0 ? Math.round(data.reduce((acc, d) => acc + d.occupancyRate, 0) / data.length) : 0;

  if (data.length === 0) {
    return (
      <div className="w-full h-full min-h-[260px] bg-slate-950 text-slate-100 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Telemetry Mesh Synchronizing</p>
        </div>
        <p className="text-xs text-slate-400">Loading real-time regional hospital ER & ICU telemetry...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[280px] bg-slate-950 text-slate-100 p-4 rounded-xl border border-slate-800 flex flex-col justify-between select-none">
      {/* Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              3D Hospital Capacity Mesh
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 pl-2 border-l border-slate-800">
            <span>Total Beds: <strong className="text-slate-200">{totalBeds}</strong></span>
            <span>Free ER: <strong className="text-emerald-400">{totalFreeGen}</strong></span>
            <span>Free ICU: <strong className="text-cyan-400">{totalFreeIcu}</strong></span>
            <span>Load: <strong className={avgOccupancy > 80 ? "text-red-400" : "text-amber-400"}>{avgOccupancy}%</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            {data.length} Monitored Centers
          </span>
        </div>
      </div>

      {/* 2.5D Isometric Capacity Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 py-4 items-end justify-between flex-1">
        {data.map((item) => {
          const isSelected = selectedItem?.id === item.id;
          const genHeightPct = Math.max(14, item.occupancyRate);
          const icuHeightPct = Math.max(14, item.icuOccupancy);

          return (
            <div
              key={item.id}
              onClick={() => setSelectedItem(isSelected ? null : item)}
              onMouseEnter={() => setSelectedItem(item)}
              className={`group relative flex flex-col items-center justify-end h-[165px] p-2 rounded-lg transition-all duration-200 cursor-pointer border ${
                isSelected 
                  ? "bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/50 scale-[1.03] shadow-lg shadow-emerald-500/10" 
                  : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/70 hover:border-slate-700"
              }`}
            >
              {/* Dual Isometric Towers */}
              <div className="w-full flex items-end justify-center gap-2 h-[100px] mb-2 px-1">
                {/* General / ER Bed Tower */}
                <div className="w-1/2 flex flex-col items-center justify-end h-full">
                  <div 
                    className="w-full rounded-t transition-all duration-500 relative group-hover:brightness-125"
                    style={{
                      height: `${genHeightPct}%`,
                      backgroundColor: item.color,
                      boxShadow: `0 0 10px ${item.color}50`
                    }}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-white/40 rounded-t" />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 font-mono font-medium">{item.occupancyRate}%</span>
                </div>

                {/* Critical ICU Bed Tower */}
                <div className="w-1/2 flex flex-col items-center justify-end h-full">
                  <div 
                    className="w-full rounded-t transition-all duration-500 relative group-hover:brightness-125"
                    style={{
                      height: `${icuHeightPct}%`,
                      backgroundColor: item.icuColor,
                      boxShadow: `0 0 10px ${item.icuColor}50`
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
                    item.status === "Optimal" ? "bg-emerald-400" : item.status === "Moderate" ? "bg-amber-400" : "bg-red-400"
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

      {/* Detail Footer */}
      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-[10px] text-slate-300">ER Beds (Left)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-cyan-500" />
            <span className="text-[10px] text-slate-300">ICU Beds (Right)</span>
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
              selectedItem.status === "Optimal" ? "bg-emerald-950 text-emerald-300 border border-emerald-800" :
              selectedItem.status === "Moderate" ? "bg-amber-950 text-amber-300 border border-amber-800" :
              "bg-red-950 text-red-300 border border-red-800"
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

export default HospitalCapacityMesh;
