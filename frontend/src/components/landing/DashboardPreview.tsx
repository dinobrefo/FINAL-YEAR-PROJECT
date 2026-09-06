import React, { useState, useEffect } from 'react';
import { Section } from '../ui/Section';
import { Navigation, Activity, Radio, BedDouble, AlertTriangle, Heart, Zap, Shield, CheckCircle2 } from 'lucide-react';

interface Incident {
  id: string;
  type: 'CRITICAL' | 'MODERATE';
  title: string;
  location: string;
  eta: string;
  distance: string;
  unit: string;
  speed: string;
  dest: string;
  destStatus: string;
  vitals: {
    hr: number;
    spo2: number;
    bp: string;
  };
}

export const DashboardPreview: React.FC = () => {
  const [activeIncidentId, setActiveIncidentId] = useState<string>('inc-1');
  const [liveSpeed, setLiveSpeed] = useState<number>(82);
  const [liveHr, setLiveHr] = useState<number>(114);
  const [activeLogIndex, setActiveLogIndex] = useState<number>(0);

  const incidents: Incident[] = [
    {
      id: 'inc-1',
      type: 'CRITICAL',
      title: 'Severe Trauma / RTA',
      location: 'KNUST Commercial Bypass',
      eta: '4m 12s',
      distance: '2.8 km',
      unit: 'AMB-201',
      speed: '82 km/h',
      dest: 'Komfo Anokye Teaching Hospital',
      destStatus: 'Bay 3 Reserved · Surgical Team Ready',
      vitals: { hr: 114, spo2: 97, bp: '126/82' },
    },
    {
      id: 'inc-2',
      type: 'MODERATE',
      title: 'Acute Respiratory Distress',
      location: 'Bantama Market Junction',
      eta: '8m 45s',
      distance: '5.1 km',
      unit: 'AMB-104',
      speed: '68 km/h',
      dest: 'Kumasi South Regional Hospital',
      destStatus: 'Oxygen Port 4 Allocated',
      vitals: { hr: 98, spo2: 91, bp: '138/88' },
    },
  ];

  const dispatchLogs = [
    'AMB-201 acquired dynamic green corridor on Western Bypass',
    'KATH ER Trauma Bay 3 reserved · On-call surgeon alerted',
    'Real-time vitals packet synchronized · Latency 24ms',
    'Traffic preemption activated at Harper Road intersection',
    'Suntreso District Hospital flagged at 88% capacity — redirected to KATH',
  ];

  // Fluctuate speed and heart rate slightly to convey real live data stream
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveSpeed((prev) => 79 + Math.floor(Math.random() * 8));
      setLiveHr((prev) => 112 + Math.floor(Math.random() * 6));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Rotate dispatch logs every 4 seconds
  useEffect(() => {
    const logTimer = setInterval(() => {
      setActiveLogIndex((prev) => (prev + 1) % dispatchLogs.length);
    }, 4000);
    return () => clearInterval(logTimer);
  }, [dispatchLogs.length]);

  const currentInc = incidents.find((i) => i.id === activeIncidentId) || incidents[0];

  return (
    <Section
      eyebrow="Operations"
      title="Command the emergency, in real time"
      intro="One command view of the live map, active emergencies, hospital capacity and ambulance ETAs."
    >
      <div className="panel overflow-hidden border border-white/15 shadow-2xl rounded-2xl bg-[#081827]">
        {/* Console Header Bar */}
        <div className="px-5 py-3.5 bg-[#081827] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold text-white tracking-wide">IERBMS · COMMAND TELEMETRY VIEW</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              DISPATCH NODE 01
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            {/* Live Ticker Item */}
            <div className="hidden md:flex items-center gap-2 text-[11px] text-cyan-400/90 font-mono bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/20 max-w-sm truncate">
              <Zap className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
              <span className="truncate">{dispatchLogs[activeLogIndex]}</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>GRID SYNCED</span>
            </div>
          </div>
        </div>

        {/* Interior Console Grid */}
        <div className="grid lg:grid-cols-[1.65fr_1fr] gap-px bg-white/10">
          {/* Left Column: Animated Tactical Live Map Preview */}
          <div className="bg-[#06111F] p-5 sm:p-6 relative flex flex-col justify-between min-h-[460px] overflow-hidden">
            {/* Tactical Grid Background */}
            <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-40 pointer-events-none" />

            {/* Rotating Radar Sweep Beam */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full pointer-events-none overflow-hidden opacity-25">
              <div
                className="w-full h-full rounded-full animate-spin [animation-duration:8s] [animation-timing-function:linear]"
                style={{
                  background:
                    'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(0, 229, 255, 0.05) 320deg, rgba(0, 229, 255, 0.4) 360deg)',
                }}
              />
            </div>

            {/* Top Tactical Map Overlay Bar */}
            <div className="relative z-10 flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <div className="flex items-center gap-2 bg-[#0B1B2B]/80 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-semibold">{currentInc.unit}</span>
                <span className="text-cyan-400 font-bold">{liveSpeed} km/h</span>
                <span className="text-slate-500">|</span>
                <span>GPS LOCK: 99.9%</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-[#0B1B2B]/80 px-3 py-1.5 rounded-lg border border-white/10 text-[11px]">
                <span className="text-slate-400">ETA:</span>
                <span className="text-emerald-400 font-bold">{currentInc.eta}</span>
                <span className="text-slate-500">({currentInc.distance})</span>
              </div>
            </div>

            {/* Animated SVG Map Layer */}
            <div className="relative z-10 w-full flex-1 flex items-center justify-center my-2">
              <svg viewBox="0 0 540 340" className="w-full h-auto max-h-[340px] drop-shadow-2xl select-none" aria-hidden="true">
                <defs>
                  {/* Primary Route Path (Incident 1 to KATH) */}
                  <path id="route-path-1" d="M 70 270 C 150 270, 190 190, 280 180 S 390 130, 460 70" />

                  {/* Secondary Route Path (Incident 2 to Kumasi South) */}
                  <path id="route-path-2" d="M 130 110 C 200 110, 260 170, 310 210 S 380 250, 440 270" />

                  {/* Route Gradient */}
                  <linearGradient id="route-grad-active" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="60%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>

                  {/* Road Glow Filter */}
                  <filter id="corridor-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Road Network Grid Lines */}
                <path d="M 30 180 L 510 180" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 6" />
                <path d="M 280 20 L 280 320" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 6" />
                <circle cx="280" cy="180" r="140" stroke="rgba(0,229,255,0.06)" strokeWidth="1" fill="none" />
                <circle cx="280" cy="180" r="80" stroke="rgba(0,229,255,0.08)" strokeWidth="1" fill="none" />

                {/* Secondary Inactive Route (Ghosted Corridor) */}
                <path
                  d="M 130 110 C 200 110, 260 170, 310 210 S 380 250, 440 270"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.2)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Primary Route Corridor - Glow Underlayer */}
                <path
                  d="M 70 270 C 150 270, 190 190, 280 180 S 390 130, 460 70"
                  fill="none"
                  stroke="url(#route-grad-active)"
                  strokeWidth="8"
                  opacity="0.25"
                  filter="url(#corridor-glow)"
                />

                {/* Primary Route Corridor - Flowing Dashes */}
                <path
                  d="M 70 270 C 150 270, 190 190, 280 180 S 390 130, 460 70"
                  fill="none"
                  stroke="url(#route-grad-active)"
                  strokeWidth="3.5"
                  strokeDasharray="8 6"
                  strokeLinecap="round"
                >
                  <animate attributeName="stroke-dashoffset" from="28" to="0" dur="1.2s" repeatCount="indefinite" />
                </path>

                {/* Secondary Ambulance (AMB-104) Moving Along Route 2 */}
                <g>
                  <animateMotion dur="14s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#route-path-2" />
                  </animateMotion>
                  <circle r="8" fill="rgba(56, 189, 248, 0.25)" className="animate-ping" />
                  <circle r="4.5" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="1" />
                  <text y="-8" textAnchor="middle" fill="#38BDF8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                    AMB-104
                  </text>
                </g>

                {/* Primary Ambulance (AMB-201) Moving Along Route 1 */}
                <g>
                  <animateMotion dur="9s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#route-path-1" />
                  </animateMotion>

                  {/* Pulsing Radar Aura */}
                  <circle r="14" fill="rgba(0, 229, 255, 0.2)" className="animate-ping" />
                  <circle r="8" fill="rgba(0, 229, 255, 0.35)" />

                  {/* Vehicle Body Representation */}
                  <rect x="-8" y="-4.5" width="16" height="9" rx="2.5" fill="#0B1B2B" stroke="#00E5FF" strokeWidth="1.5" />

                  {/* Emergency Rooftop Strobes (Red / Blue alternating) */}
                  <circle cx="-2" cy="0" r="2.2" fill="#FF2A4D">
                    <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="2" cy="0" r="2.2" fill="#00E5FF">
                    <animate attributeName="opacity" values="0.2;1;0.2" dur="0.5s" repeatCount="indefinite" />
                  </circle>

                  {/* Real-time Dynamic Tag */}
                  <g transform="translate(0, -14)">
                    <rect x="-26" y="-8" width="52" height="14" rx="4" fill="#06111F" stroke="#00E5FF" strokeWidth="0.8" opacity="0.9" />
                    <text y="2.5" textAnchor="middle" fill="#00E5FF" fontSize="8" fontWeight="bold" fontFamily="monospace">
                      AMB-201
                    </text>
                  </g>
                </g>

                {/* Incident Origin 1: KNUST RTA Site */}
                <g transform="translate(70, 270)">
                  <circle r="22" fill="#EF4444" opacity="0.2" className="animate-ping" />
                  <circle r="12" fill="#EF4444" opacity="0.3" />
                  <circle r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  <g transform="translate(0, 20)">
                    <rect x="-55" y="-7" width="110" height="18" rx="4" fill="#0B1B2B" stroke="#EF4444" strokeWidth="1" opacity="0.9" />
                    <text y="5" textAnchor="middle" fill="#EF4444" fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                      CRITICAL: RTA INCIDENT
                    </text>
                  </g>
                </g>

                {/* Candidate Hospital: Suntreso District Hospital */}
                <g transform="translate(290, 230)">
                  <circle r="6" fill="#F59E0B" stroke="#0B1B2B" strokeWidth="1.5" />
                  <text y="16" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="sans-serif">
                    Suntreso District
                  </text>
                  <text y="26" textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="monospace">
                    88% CAP (DIVERTED)
                  </text>
                </g>

                {/* Secondary Hospital: Kumasi South */}
                <g transform="translate(440, 270)">
                  <circle r="7" fill="#38BDF8" stroke="#0B1B2B" strokeWidth="1.5" />
                  <text y="16" textAnchor="middle" fill="#CBD5E1" fontSize="9" fontFamily="sans-serif">
                    Kumasi South Regional
                  </text>
                  <text y="26" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">
                    4 ICU FREE
                  </text>
                </g>

                {/* Recommended Receiving Hospital: KATH */}
                <g transform="translate(460, 70)">
                  <circle r="24" fill="#10B981" opacity="0.2" className="animate-ping" />
                  <circle r="14" fill="#10B981" opacity="0.3" />
                  <circle r="8" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

                  <g transform="translate(0, -18)">
                    <rect x="-85" y="-14" width="170" height="22" rx="4" fill="#06111F" stroke="#10B981" strokeWidth="1.2" />
                    <text y="1" textAnchor="middle" fill="#10B981" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                      KATH · TRAUMA BAY 3 RESERVED
                    </text>
                  </g>

                  <text y="24" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold" fontFamily="sans-serif">
                    Komfo Anokye Teaching Hosp.
                  </text>
                  <text y="36" textAnchor="middle" fill="#10B981" fontSize="8" fontFamily="monospace">
                    SCORE 98.4% · 38/45 ICU FREE
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom Telemetry HUD: Live Vitals & Transmission Stream */}
            <div className="relative z-10 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-[#0B1B2B]/90 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">PATIENT HR</div>
                  <div className="font-bold text-white text-sm">{liveHr} BPM</div>
                </div>
              </div>

              <div className="bg-[#0B1B2B]/90 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                <div className="w-full">
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>SpO2</span>
                    <span className="text-cyan-400 font-bold">{currentInc.vitals.spo2}%</span>
                  </div>
                  {/* Mini Animated ECG Line */}
                  <svg className="w-full h-4 mt-0.5" viewBox="0 0 80 16">
                    <path
                      d="M 0 8 L 16 8 L 20 2 L 24 14 L 28 8 L 40 8 L 44 1 L 48 15 L 52 8 L 64 8 L 68 5 L 72 11 L 76 8 L 80 8"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    >
                      <animate attributeName="stroke-dashoffset" from="80" to="0" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                </div>
              </div>

              <div className="bg-[#0B1B2B]/90 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">EST. ARRIVAL</div>
                  <div className="font-bold text-emerald-400 text-sm">{currentInc.eta}</div>
                </div>
              </div>

              <div className="bg-[#0B1B2B]/90 p-2 rounded-lg border border-white/10 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-400">RECEIVING ER</div>
                  <div className="font-bold text-purple-300 text-xs truncate">KATH Level 1</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Mini Dashboard Telemetry Cards & Active Incidents */}
          <div className="bg-[#081827] p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            {/* Active Emergencies Mini-List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  ACTIVE INCIDENTS ({incidents.length})
                </span>
                <span className="text-cyan-400">CLICK TO TRACK</span>
              </div>

              <div className="space-y-2.5">
                {incidents.map((inc) => {
                  const isSelected = inc.id === activeIncidentId;
                  return (
                    <div
                      key={inc.id}
                      onClick={() => setActiveIncidentId(inc.id)}
                      className={`rounded-xl p-3.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0F2B48] border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/30'
                          : 'bg-[#0B1B2B] border-white/5 hover:border-white/20 hover:bg-[#0B1B2B]/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              inc.type === 'CRITICAL'
                                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {inc.type}
                          </span>
                          <span className="font-semibold text-white text-xs">{inc.title}</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold text-xs">{inc.eta}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="truncate max-w-[170px]">{inc.location}</span>
                        <span className="text-cyan-300 font-semibold">{inc.unit}</span>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-white/10 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                          <span>→ {inc.dest.split(' ')[0]} ER</span>
                          <span className="text-slate-400">{inc.destStatus}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-time Hospital Capacity Bars with Dynamic Utilization */}
            <div className="space-y-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-cyan-400" />
                  REGIONAL ER CAPACITY
                </span>
                <span className="text-emerald-400 text-[10px]">LIVE POLLING</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-white font-medium">Komfo Anokye Teaching Hosp.</span>
                    <span className="font-mono text-emerald-400 font-bold">38/45 Beds Free</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      className="h-full bg-emerald-500 rounded-full w-[68%] relative overflow-hidden transition-all duration-1000"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-white font-medium">Kumasi South Regional</span>
                    <span className="font-mono text-amber-400 font-bold">4/15 ICU Free</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                    <div
                      className="h-full bg-amber-500 rounded-full w-[86%] relative overflow-hidden transition-all duration-1000"
                    >
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1.5">
                    <span className="text-white font-medium">Suntreso District Hospital</span>
                    <span className="font-mono text-red-400 font-bold">1/12 Beds (Full)</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                    <div className="h-full bg-red-500 rounded-full w-[94%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Status & Operational Summary */}
            <div className="pt-3 border-t border-white/10 space-y-2 text-[11px] font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>ACTIVE FLEET:</span>
                <span className="text-white font-bold">8 UNITS DISPATCHED</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>TELEMETRY STREAM:</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> 100% ONLINE (24ms)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default DashboardPreview;

