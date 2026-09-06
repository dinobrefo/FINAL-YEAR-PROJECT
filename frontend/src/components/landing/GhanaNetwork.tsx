import React from 'react';
import { Section } from '../ui/Section';
import { AnimatedCounter } from './AnimatedCounter';

export const GhanaNetwork: React.FC = () => {
  // 11 Approximate major regional nodes
  const nodes = [
    { name: 'Accra', x: 170, y: 315, isHub: true },
    { name: 'Tema', x: 185, y: 310, isHub: false },
    { name: 'Cape Coast', x: 130, y: 325, isHub: false },
    { name: 'Takoradi', x: 95, y: 335, isHub: false },
    { name: 'Koforidua', x: 175, y: 275, isHub: false },
    { name: 'Kumasi', x: 135, y: 235, isHub: true },
    { name: 'Sunyani', x: 85, y: 205, isHub: false },
    { name: 'Ho', x: 220, y: 260, isHub: false },
    { name: 'Tamale', x: 160, y: 115, isHub: true },
    { name: 'Wa', x: 65, y: 80, isHub: false },
    { name: 'Bolgatanga', x: 180, y: 50, isHub: false },
  ];

  // 6 Primary Inter-City Telemetry Corridors
  const corridors = [
    { id: 'corridor-1', d: 'M 170 315 L 135 235', dur: '3.2s' }, // Accra - Kumasi
    { id: 'corridor-2', d: 'M 135 235 L 160 115', dur: '4.0s' }, // Kumasi - Tamale
    { id: 'corridor-3', d: 'M 160 115 L 180 50', dur: '2.5s' },  // Tamale - Bolgatanga
    { id: 'corridor-4', d: 'M 135 235 L 85 205', dur: '2.8s' },  // Kumasi - Sunyani
    { id: 'corridor-5', d: 'M 170 315 L 130 325', dur: '2.6s' }, // Accra - Cape Coast
    { id: 'corridor-6', d: 'M 170 315 L 220 260', dur: '3.0s' }, // Accra - Ho
  ];

  return (
    <Section
      eyebrow="Nationwide coverage"
      title="Connected healthcare network across Ghana"
      intro="Linking regional teaching hospitals, district health centres, and remote facilities under one telemetry grid."
    >
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
        {/* Left Column: Interactive Stylized Ghana Map */}
        <figure className="panel p-6 sm:p-8 flex flex-col items-center justify-center bg-[#081827] relative overflow-hidden">
          <div className="w-full max-w-[340px] aspect-[300/360] relative">
            <svg viewBox="0 0 300 360" className="w-full h-full drop-shadow-xl" aria-hidden="true">
              {/* Simplified Ghana Country Outline */}
              <path
                d="M 60,75 L 115,30 L 195,25 L 235,45 L 230,120 L 250,190 L 240,250 L 230,305 L 185,325 L 130,340 L 80,335 L 55,275 L 45,190 L 50,120 Z"
                fill="rgba(239,68,68,0.04)"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />

              {/* Inter-City Trunk Corridors */}
              {corridors.map((c) => (
                <g key={c.id}>
                  <path id={c.id} d={c.d} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1" strokeDasharray="3 3" />
                  {/* Moving signal pulse dot */}
                  <circle r="2.5" fill="#EF4444">
                    <animateMotion dur={c.dur} repeatCount="indefinite">
                      <mpath href={`#${c.id}`} />
                    </animateMotion>
                  </circle>
                </g>
              ))}

              {/* City Nodes */}
              {nodes.map((node) => (
                <g key={node.name} transform={`translate(${node.x}, ${node.y})`}>
                  {node.isHub ? (
                    <>
                      <circle r="9" fill="rgba(239,68,68,0.2)" className="animate-pulse" />
                      <circle r="4.5" fill="#EF4444" />
                      <text
                        y="-10"
                        textAnchor="middle"
                        fill="#F8FAFC"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {node.name.toUpperCase()}
                      </text>
                    </>
                  ) : (
                    <>
                      <circle r="2.5" fill="#94A3B8" />
                      <text
                        y="10"
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="7.5"
                        fontFamily="sans-serif"
                      >
                        {node.name}
                      </text>
                    </>
                  )}
                </g>
              ))}
            </svg>
          </div>

          <figcaption className="mt-4 font-mono text-[11px] text-ink-faint text-center">
            * Simplified outline; approximate city and corridor positions.
          </figcaption>
        </figure>

        {/* Right Column: Projected Network Targets */}
        <div className="space-y-6">
          <div className="panel p-6 sm:p-7 space-y-2">
            <div className="eyebrow text-state-info">Administrative Integration</div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-ink">
              <AnimatedCounter value={16} suffix=" Regions" />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Target architectural footprint spanning Ashanti, Greater Accra, Central, Northern, Volta, and all regional directorates.
            </p>
          </div>

          <div className="panel p-6 sm:p-7 space-y-2">
            <div className="eyebrow text-state-success">Facility Ingestion Scope</div>
            <div className="text-3xl sm:text-4xl font-mono font-bold text-ink">
              <AnimatedCounter value={2500} suffix="+" />
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">
              Validated health centers, clinics, regional hospitals, and teaching facilities from the UN OCHA/HOTOSM registry.
            </p>
          </div>

          <p className="font-mono text-xs text-ink-faint italic">
            Note: Network targets reflect the total modeled registry capacity across Ghana.
          </p>
        </div>
      </div>
    </Section>
  );
};

export default GhanaNetwork;
