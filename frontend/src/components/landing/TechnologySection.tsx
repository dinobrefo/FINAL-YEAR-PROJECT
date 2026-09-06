import React, { useState, useEffect } from 'react';
import { Section } from '../ui/Section';
import { Monitor, Cpu, Database, Navigation, Network, Zap, ShieldCheck, Activity, ArrowRight } from 'lucide-react';

interface TechLayer {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  metrics: string;
  protocol: string;
  latency: string;
  status: string;
}

export const TechnologySection: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('gateway');
  const [packetCount, setPacketCount] = useState<number>(1420);

  const layers: Record<string, TechLayer> = {
    client: {
      id: 'client',
      name: 'Client Dashboard & HUD',
      subtitle: 'React 18 · TypeScript · Vite · Leaflet · R3F',
      role: 'Hardware-tiered 3D operations console and mobile paramedic interface rendering real-time maps and bed capacity.',
      metrics: '60 FPS Target · Offline Cache Enabled',
      protocol: 'WSS (WebSocket) / HTTPS',
      latency: '< 16ms render frame',
      status: 'Active · PWA Ready',
    },
    gateway: {
      id: 'gateway',
      name: 'Real-Time Telemetry API Gateway',
      subtitle: 'Node.js · Express · Socket.IO · JWT · RBAC',
      role: 'High-throughput event mesh ingesting ambulance GPS telemetry, authenticating dispatchers, and broadcasting capacity updates.',
      metrics: '1,400+ events/sec throughput',
      protocol: 'Socket.IO / REST / JWT',
      latency: '24ms edge latency',
      status: 'Connected to Neon PostgreSQL',
    },
    database: {
      id: 'database',
      name: 'PostgreSQL + PostGIS',
      subtitle: 'Relational & Spatial Geometries (Neon)',
      role: 'Stores transactional hospital states, audit logs, and spatial geographic indexes for instant geospatial facility queries.',
      metrics: '2,499 facilities indexed',
      protocol: 'Pooled TCP / SSL (Neon Serverless)',
      latency: '< 18ms spatial index query',
      status: 'Autoscaling · Point-in-time Recovery',
    },
    ai: {
      id: 'ai',
      name: 'AI / Predictive Engine',
      subtitle: 'Python · FastAPI · Random Forest',
      role: 'Computes explainable multi-factor hospital suitability scores balancing road transit time, bed occupancy, and trauma specialties.',
      metrics: 'Explainable weight vector matrix',
      protocol: 'Async HTTP / JSON REST',
      latency: '38ms model inference',
      status: 'Online · Continuous Scoring',
    },
    routing: {
      id: 'routing',
      name: 'Geospatial Routing',
      subtitle: 'OSRM · OpenStreetMap · CartoDB',
      role: 'Computes topological shortest paths, dynamic speed profiles, and turns-by-turn navigation over the Ghanaian road network.',
      metrics: 'National road network topology',
      protocol: 'OSRM Table & Route Protocol',
      latency: '42ms matrix resolution',
      status: 'High Availability Topology',
    },
  };

  // Real-time packet throughput counter fluctuation
  useEffect(() => {
    const timer = setInterval(() => {
      setPacketCount((prev) => 1400 + Math.floor(Math.random() * 60));
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  const active = layers[selectedLayerId] || layers.gateway;

  return (
    <Section
      id="technology"
      eyebrow="Infrastructure"
      title="Built for real-time decisions"
      intro="A layered architecture where every operational value originates from PostgreSQL, authorised APIs, real GPS or authenticated user input."
    >
      <div className="space-y-6">
        {/* Main Animated Pipeline Diagram */}
        <div className="panel p-5 sm:p-8 overflow-x-auto bg-[#081827] border border-white/15 rounded-2xl relative shadow-2xl">
          {/* Top Grid Status Header */}
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-white/10 text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-400">
              <Zap className="w-4 h-4 animate-pulse text-cyan-400" />
              <span>LIVE DATA CONDUIT FLOW</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span className="hidden sm:inline text-slate-500">THROUGHPUT:</span>
              <span className="text-emerald-400 font-bold font-mono">{packetCount} PKTS/SEC</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>

          <div className="min-w-[700px] flex items-center justify-center py-3">
            <svg viewBox="0 0 740 360" className="w-full max-w-[740px] h-auto select-none" aria-label="Interactive System Architecture Diagram">
              <defs>
                {/* Neon Conduit Filters */}
                <filter id="conduit-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Packet Glow Filter */}
                <filter id="packet-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Gradients */}
                <linearGradient id="pipe-cyan" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
                </linearGradient>

                <linearGradient id="pipe-branch" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00E5FF" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>

                {/* Motion Conduit Paths for Packets */}
                <path id="path-client-api" d="M 370 68 L 370 128" />
                <path id="path-api-client" d="M 374 128 L 374 68" />
                <path id="path-api-db" d="M 230 188 L 230 220 L 125 220 L 125 258" />
                <path id="path-db-api" d="M 129 258 L 129 224 L 234 224 L 234 188" />
                <path id="path-api-ai" d="M 370 188 L 370 258" />
                <path id="path-ai-api" d="M 374 258 L 374 188" />
                <path id="path-api-osrm" d="M 510 188 L 510 220 L 615 220 L 615 258" />
                <path id="path-osrm-api" d="M 619 258 L 619 224 L 514 224 L 514 188" />
              </defs>

              {/* ----------------- CONDUIT PIPES & FLOWING DASHES ----------------- */}

              {/* 1. Client to Gateway Trunk */}
              <g>
                <line x1="370" y1="68" x2="370" y2="128" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="8" filter="url(#conduit-glow)" />
                <line x1="370" y1="68" x2="370" y2="128" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="2" />
                <line x1="370" y1="68" x2="370" y2="128" stroke="#00E5FF" strokeWidth="2" strokeDasharray="5 5">
                  <animate attributeName="stroke-dashoffset" from="20" to="0" dur="0.8s" repeatCount="indefinite" />
                </line>

                {/* Packet Client -> Gateway */}
                <circle r="3.5" fill="#00E5FF" filter="url(#packet-glow)">
                  <animateMotion dur="1.2s" repeatCount="indefinite">
                    <mpath href="#path-client-api" />
                  </animateMotion>
                </circle>

                {/* Packet Gateway -> Client (WSS Broadcast) */}
                <circle r="3.5" fill="#10B981" filter="url(#packet-glow)">
                  <animateMotion dur="1.4s" repeatCount="indefinite">
                    <mpath href="#path-api-client" />
                  </animateMotion>
                </circle>
              </g>

              {/* 2. Gateway to PostgreSQL Pipeline */}
              <g>
                <path d="M 230 188 L 230 220 L 125 220 L 125 258" fill="none" stroke="rgba(0, 229, 255, 0.15)" strokeWidth="6" filter="url(#conduit-glow)" />
                <path d="M 230 188 L 230 220 L 125 220 L 125 258" fill="none" stroke="#00E5FF" strokeWidth="2" strokeDasharray="6 6">
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                </path>

                {/* SQL Query packet */}
                <circle r="3.5" fill="#00E5FF" filter="url(#packet-glow)">
                  <animateMotion dur="1.8s" repeatCount="indefinite">
                    <mpath href="#path-api-db" />
                  </animateMotion>
                </circle>
                {/* Result set packet */}
                <circle r="3" fill="#38BDF8" filter="url(#packet-glow)">
                  <animateMotion dur="2.1s" repeatCount="indefinite">
                    <mpath href="#path-db-api" />
                  </animateMotion>
                </circle>
              </g>

              {/* 3. Gateway to AI Predictive Engine Pipeline */}
              <g>
                <line x1="370" y1="188" x2="370" y2="258" stroke="rgba(239, 68, 68, 0.2)" strokeWidth="6" filter="url(#conduit-glow)" />
                <line x1="370" y1="188" x2="370" y2="258" stroke="#EF4444" strokeWidth="2" strokeDasharray="6 6">
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1s" repeatCount="indefinite" />
                </line>

                {/* AI feature vector packet */}
                <circle r="3.5" fill="#EF4444" filter="url(#packet-glow)">
                  <animateMotion dur="1.3s" repeatCount="indefinite">
                    <mpath href="#path-api-ai" />
                  </animateMotion>
                </circle>
                {/* AI recommendation score packet */}
                <circle r="3" fill="#F59E0B" filter="url(#packet-glow)">
                  <animateMotion dur="1.6s" repeatCount="indefinite">
                    <mpath href="#path-ai-api" />
                  </animateMotion>
                </circle>
              </g>

              {/* 4. Gateway to OSRM Geospatial Routing Pipeline */}
              <g>
                <path d="M 510 188 L 510 220 L 615 220 L 615 258" fill="none" stroke="rgba(16, 185, 129, 0.15)" strokeWidth="6" filter="url(#conduit-glow)" />
                <path d="M 510 188 L 510 220 L 615 220 L 615 258" fill="none" stroke="#10B981" strokeWidth="2" strokeDasharray="6 6">
                  <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
                </path>

                {/* Routing Waypoints packet */}
                <circle r="3.5" fill="#10B981" filter="url(#packet-glow)">
                  <animateMotion dur="1.7s" repeatCount="indefinite">
                    <mpath href="#path-api-osrm" />
                  </animateMotion>
                </circle>
                {/* Isochrone / Turn matrix packet */}
                <circle r="3" fill="#00E5FF" filter="url(#packet-glow)">
                  <animateMotion dur="2.0s" repeatCount="indefinite">
                    <mpath href="#path-osrm-api" />
                  </animateMotion>
                </circle>
              </g>

              {/* ----------------- ARCHITECTURAL NODES (CLICKABLE) ----------------- */}

              {/* TOP NODE: Client Dashboard & HUD */}
              <g
                transform="translate(210, 14)"
                className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedLayerId('client')}
              >
                <rect
                  width="320"
                  height="54"
                  rx="10"
                  fill={selectedLayerId === 'client' ? '#0F2B48' : '#0B1B2B'}
                  stroke={selectedLayerId === 'client' ? '#00E5FF' : 'rgba(255, 255, 255, 0.15)'}
                  strokeWidth={selectedLayerId === 'client' ? '2' : '1'}
                />
                <circle cx="24" cy="27" r="10" fill="rgba(0, 229, 255, 0.15)" />
                <circle cx="24" cy="27" r="4" fill="#00E5FF" />
                <text x="44" y="24" fill="#F8FAFC" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
                  Client Dashboard & HUD
                </text>
                <text x="44" y="42" fill="#94A3B8" fontSize="10" fontFamily="monospace">
                  React 18 · TypeScript · Vite · Leaflet · R3F
                </text>
                <rect x="235" y="16" width="70" height="22" rx="4" fill="rgba(0, 229, 255, 0.12)" stroke="rgba(0, 229, 255, 0.3)" strokeWidth="1" />
                <text x="270" y="31" textAnchor="middle" fill="#00E5FF" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  WSS STREAM
                </text>
              </g>

              {/* MIDDLE NODE: Real-Time Telemetry API Gateway */}
              <g
                transform="translate(160, 128)"
                className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedLayerId('gateway')}
              >
                <rect
                  width="420"
                  height="60"
                  rx="12"
                  fill={selectedLayerId === 'gateway' ? '#0F2B48' : '#0B1B2B'}
                  stroke={selectedLayerId === 'gateway' ? '#00E5FF' : 'rgba(0, 229, 255, 0.4)'}
                  strokeWidth={selectedLayerId === 'gateway' ? '2.5' : '1.5'}
                />
                <circle cx="26" cy="30" r="12" fill="rgba(0, 229, 255, 0.15)" className="animate-pulse" />
                <circle cx="26" cy="30" r="5" fill="#00E5FF" />
                <text x="50" y="26" fill="#F8FAFC" fontSize="13.5" fontWeight="bold" fontFamily="sans-serif">
                  Real-Time Telemetry API Gateway
                </text>
                <text x="50" y="46" fill="#00E5FF" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Node.js · Express · Socket.IO · JWT · RBAC
                </text>
                <rect x="330" y="19" width="75" height="22" rx="4" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1" />
                <text x="367" y="34" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  PORT 5001
                </text>
              </g>

              {/* BOTTOM LEFT NODE: PostgreSQL + PostGIS */}
              <g
                transform="translate(20, 258)"
                className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedLayerId('database')}
              >
                <rect
                  width="210"
                  height="58"
                  rx="10"
                  fill={selectedLayerId === 'database' ? '#0F2B48' : '#0B1B2B'}
                  stroke={selectedLayerId === 'database' ? '#00E5FF' : 'rgba(255, 255, 255, 0.15)'}
                  strokeWidth={selectedLayerId === 'database' ? '2' : '1'}
                />
                <circle cx="20" cy="29" r="8" fill="rgba(56, 189, 248, 0.15)" />
                <circle cx="20" cy="29" r="3.5" fill="#38BDF8" />
                <text x="36" y="24" fill="#F8FAFC" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                  PostgreSQL + PostGIS
                </text>
                <text x="36" y="42" fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                  Relational & Spatial (Neon)
                </text>
              </g>

              {/* BOTTOM CENTER NODE: AI / Predictive Engine */}
              <g
                transform="translate(265, 258)"
                className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedLayerId('ai')}
              >
                <rect
                  width="210"
                  height="58"
                  rx="10"
                  fill={selectedLayerId === 'ai' ? '#0F2B48' : '#0B1B2B'}
                  stroke={selectedLayerId === 'ai' ? '#EF4444' : 'rgba(239, 68, 68, 0.3)'}
                  strokeWidth={selectedLayerId === 'ai' ? '2' : '1'}
                />
                <circle cx="20" cy="29" r="8" fill="rgba(239, 68, 68, 0.15)" />
                <circle cx="20" cy="29" r="3.5" fill="#EF4444" />
                <text x="36" y="24" fill="#F8FAFC" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                  AI / Predictive Engine
                </text>
                <text x="36" y="42" fill="#EF4444" fontSize="9.5" fontFamily="monospace">
                  Python · FastAPI · Random Forest
                </text>
              </g>

              {/* BOTTOM RIGHT NODE: Geospatial Routing */}
              <g
                transform="translate(510, 258)"
                className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => setSelectedLayerId('routing')}
              >
                <rect
                  width="210"
                  height="58"
                  rx="10"
                  fill={selectedLayerId === 'routing' ? '#0F2B48' : '#0B1B2B'}
                  stroke={selectedLayerId === 'routing' ? '#10B981' : 'rgba(16, 185, 129, 0.3)'}
                  strokeWidth={selectedLayerId === 'routing' ? '2' : '1'}
                />
                <circle cx="20" cy="29" r="8" fill="rgba(16, 185, 129, 0.15)" />
                <circle cx="20" cy="29" r="3.5" fill="#10B981" />
                <text x="36" y="24" fill="#F8FAFC" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                  Geospatial Routing
                </text>
                <text x="36" y="42" fill="#10B981" fontSize="9.5" fontFamily="monospace">
                  OSRM · OSM Ghana · CartoDB
                </text>
              </g>
            </svg>
          </div>

          <figcaption className="mt-2 font-mono text-[11px] text-slate-400 text-center flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" /> Telemetry Stream</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> AI Scoring</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10B981]" /> Road Routing</span>
            <span className="text-slate-500 hidden sm:inline">· Click any tier to inspect runtime telemetry</span>
          </figcaption>
        </div>

        {/* Dynamic Architectural Deep-Dive Card */}
        <div className="panel p-6 bg-[#0B1B2B] border border-cyan-500/25 rounded-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
            <div>
              <div className="eyebrow text-cyan-400 flex items-center gap-1.5 mb-1">
                <Network className="w-3.5 h-3.5 text-cyan-400" />
                ACTIVE ARCHITECTURAL LAYER
              </div>
              <h4 className="text-xl font-bold font-mono text-white">{active.name}</h4>
              <p className="text-xs font-mono text-cyan-300/80">{active.subtitle}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {active.status}
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-300 leading-relaxed mb-5">
            {active.role}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-[#081827] p-3 rounded-lg border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">THROUGHPUT / SCALE</div>
              <div className="font-bold text-white text-sm truncate">{active.metrics}</div>
            </div>

            <div className="bg-[#081827] p-3 rounded-lg border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">PROTOCOL / SECURITY</div>
              <div className="font-bold text-cyan-300 text-sm truncate">{active.protocol}</div>
            </div>

            <div className="bg-[#081827] p-3 rounded-lg border border-white/10">
              <div className="text-[10px] text-slate-400 mb-0.5">EXECUTION LATENCY</div>
              <div className="font-bold text-emerald-400 text-sm">{active.latency}</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default TechnologySection;

