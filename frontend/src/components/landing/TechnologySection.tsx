import React from 'react';
import { Section } from '../ui/Section';

export const TechnologySection: React.FC = () => {
  return (
    <Section
      id="technology"
      eyebrow="Infrastructure"
      title="Built for real-time decisions"
      intro="A layered architecture where every operational value originates from PostgreSQL, authorised APIs, real GPS or authenticated user input."
    >
      <div className="panel p-6 sm:p-8 overflow-x-auto bg-[#081827]">
        <div className="min-w-[660px] flex items-center justify-center py-4">
          <svg viewBox="0 0 660 260" className="w-full max-w-[660px] h-auto drop-shadow-lg" aria-label="System Architecture Diagram">
            <defs>
              {/* Arrowhead marker */}
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 8 5 L 0 9 z" fill="#475569" />
              </marker>
            </defs>

            {/* Connecting Edges with Arrowhead */}
            {/* 1. Frontend to API */}
            <path d="M 330 54 L 330 96" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* 2. API to PostgreSQL */}
            <path d="M 330 156 L 330 176 L 110 176 L 110 196" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* 3. API to ML Engine */}
            <path d="M 330 156 L 330 196" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* 4. API to Routing Engine */}
            <path d="M 330 156 L 330 176 L 550 176 L 550 196" stroke="#475569" strokeWidth="2" markerEnd="url(#arrow)" />

            {/* Top Node: Frontend */}
            <g transform="translate(190, 8)">
              <rect width="280" height="46" rx="8" fill="#111C2D" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="140" y="22" textAnchor="middle" fill="#F8FAFC" fontSize="13" fontWeight="600" fontFamily="sans-serif">
                Client Dashboard & HUD
              </text>
              <text x="140" y="38" textAnchor="middle" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                React · TypeScript · Vite · Leaflet · R3F
              </text>
            </g>

            {/* Middle Node: Real-time API Layer */}
            <g transform="translate(160, 102)">
              <rect width="340" height="52" rx="8" fill="#111C2D" stroke="rgba(239,68,68,0.3)" strokeWidth="1.5" />
              <text x="170" y="24" textAnchor="middle" fill="#F8FAFC" fontSize="13" fontWeight="600" fontFamily="sans-serif">
                Real-Time Telemetry API Gateway
              </text>
              <text x="170" y="42" textAnchor="middle" fill="#EF4444" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                Node.js · Express · Socket.IO · JWT · RBAC
              </text>
            </g>

            {/* Bottom Left Node: PostgreSQL Database */}
            <g transform="translate(20, 202)">
              <rect width="180" height="48" rx="8" fill="#111C2D" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="90" y="22" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="600" fontFamily="sans-serif">
                PostgreSQL + PostGIS
              </text>
              <text x="90" y="38" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                Relational & Spatial Geometries
              </text>
            </g>

            {/* Bottom Middle Node: ML Engine */}
            <g transform="translate(240, 202)">
              <rect width="180" height="48" rx="8" fill="#111C2D" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="90" y="22" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="600" fontFamily="sans-serif">
                AI / Predictive Engine
              </text>
              <text x="90" y="38" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                Python · FastAPI · Random Forest
              </text>
            </g>

            {/* Bottom Right Node: Routing Provider */}
            <g transform="translate(460, 202)">
              <rect width="180" height="48" rx="8" fill="#111C2D" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <text x="90" y="22" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="600" fontFamily="sans-serif">
                Geospatial Routing
              </text>
              <text x="90" y="38" textAnchor="middle" fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                OSRM · OpenStreetMap · CartoDB
              </text>
            </g>
          </svg>
        </div>
      </div>
    </Section>
  );
};

export default TechnologySection;
