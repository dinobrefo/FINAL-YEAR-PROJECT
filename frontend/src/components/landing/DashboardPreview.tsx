import React from 'react';
import { Section } from '../ui/Section';
import { Navigation, Activity, Radio, BedDouble, AlertTriangle } from 'lucide-react';

export const DashboardPreview: React.FC = () => {
  return (
    <Section
      eyebrow="Operations"
      title="Command the emergency, in real time"
      intro="One command view of the live map, active emergencies, hospital capacity and ambulance ETAs."
    >
      <div className="panel overflow-hidden border border-white/15 shadow-2xl">
        {/* Console Header Bar */}
        <div className="px-5 py-3 bg-[#081827] border-b border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-state-success animate-pulse" />
            <span className="font-semibold text-ink">IERBMS · COMMAND TELEMETRY VIEW</span>
          </div>
          <div className="flex items-center gap-3 text-ink-muted">
            <span className="hidden sm:inline">CENTRAL DISPATCH CONSOLE</span>
            <span className="text-primary font-bold">GRID SYNCED</span>
          </div>
        </div>

        {/* Interior Two-Column Console Grid */}
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-px bg-white/10">
          {/* Left Column: Faux Live Map Preview */}
          <div className="bg-[#06111F] p-6 relative flex flex-col justify-between min-h-[380px] overflow-hidden">
            <div className="absolute inset-0 bg-grid [background-size:28px_28px] opacity-35" />

            {/* Faux Map Vector Elements */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <svg viewBox="0 0 400 300" className="w-full max-w-md h-auto drop-shadow-xl" aria-hidden="true">
                {/* Road Corridor Polyline */}
                <path
                  d="M 60 240 C 140 240, 170 140, 340 70"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3.5"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />

                {/* Incident Origin Pulse */}
                <g transform="translate(60, 240)">
                  <circle r="14" fill="#EF4444" opacity="0.25" className="animate-ping" />
                  <circle r="7" fill="#EF4444" />
                  <text y="20" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                    INCIDENT (RTA)
                  </text>
                </g>

                {/* En-Route Ambulance Marker */}
                <g transform="translate(160, 195)">
                  <circle r="9" fill="#38BDF8" opacity="0.4" />
                  <circle r="5" fill="#38BDF8" />
                  <text y="-12" textAnchor="middle" fill="#38BDF8" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    AMB-201
                  </text>
                </g>

                {/* Candidate Hospital A (Suntreso) */}
                <g transform="translate(260, 210)">
                  <circle r="5.5" fill="#F59E0B" />
                  <text y="16" textAnchor="middle" fill="#94A3B8" fontSize="9" fontFamily="sans-serif">
                    Suntreso (85% full)
                  </text>
                </g>

                {/* Recommended Hospital B (KATH) */}
                <g transform="translate(340, 70)">
                  <circle r="16" fill="#10B981" opacity="0.25" className="animate-pulse" />
                  <circle r="8" fill="#10B981" />
                  <text y="-14" textAnchor="middle" fill="#10B981" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                    KATH (Assigned ER)
                  </text>
                </g>
              </svg>
            </div>

            {/* Bottom Caption per Data-Integrity Rule */}
            <div className="relative z-10 font-mono text-[11px] text-ink-faint flex items-center justify-between pt-2">
              <span>* Illustrative — not live data.</span>
              <span className="text-primary font-semibold">ETA ~8 MINS · HIGH SPEED</span>
            </div>
          </div>

          {/* Right Column: Mini Dashboard Telemetry Cards */}
          <div className="bg-[#081827] p-5 sm:p-6 space-y-5">
            {/* Active Emergencies Mini-List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-ink-muted">
                <span>ACTIVE INCIDENTS</span>
                <span className="text-primary">2 CRITICAL</span>
              </div>

              <div className="space-y-2">
                <div className="rounded-lg bg-card p-3 border border-white/5 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/20 text-primary border border-primary/30">
                        CRITICAL
                      </span>
                      <span className="font-semibold text-ink">Severe Trauma / RTA</span>
                    </div>
                    <p className="text-[11px] text-ink-muted">KNUST Commercial Area</p>
                  </div>
                  <span className="font-mono text-state-warning font-bold text-xs">ETA 4m</span>
                </div>

                <div className="rounded-lg bg-card p-3 border border-white/5 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-state-warning/20 text-state-warning border border-state-warning/30">
                        MODERATE
                      </span>
                      <span className="font-semibold text-ink">Respiratory Distress</span>
                    </div>
                    <p className="text-[11px] text-ink-muted">Bantama Market</p>
                  </div>
                  <span className="font-mono text-ink-muted font-bold text-xs">ETA 9m</span>
                </div>
              </div>
            </div>

            {/* Real-time Hospital Capacity Bars */}
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-ink-muted">
                <span>HOSPITAL ER CAPACITY</span>
                <span>STATUS</span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-ink font-medium">Komfo Anokye Teaching Hosp.</span>
                    <span className="font-mono text-state-success">38/45 ICU Free</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-state-success rounded-full w-[65%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-ink font-medium">Kumasi South Regional</span>
                    <span className="font-mono text-state-warning">4/15 ICU Free</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-state-warning rounded-full w-[88%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Fleet Status Chips */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span>ACTIVE FLEET: <strong className="text-ink">8 UNITS</strong></span>
              <span className="text-state-success">100% ONLINE</span>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default DashboardPreview;
