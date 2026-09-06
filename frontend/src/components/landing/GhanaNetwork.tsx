import React, { useState } from 'react';
import { Section } from '../ui/Section';
import { AnimatedCounter } from './AnimatedCounter';
import { Radio, Activity, ShieldCheck, MapPin } from 'lucide-react';

interface CityNode {
  id: string;
  name: string;
  region: string;
  facility: string;
  x: number;
  y: number;
  isHub: boolean;
  anchor: 'start' | 'middle' | 'end';
  dx: number;
  dy: number;
  shortLabel?: string;
}

export const GhanaNetwork: React.FC = () => {
  const [activeCityId, setActiveCityId] = useState<string>('accra');

  const nodes: CityNode[] = [
    {
      id: 'accra',
      name: 'ACCRA',
      region: 'Greater Accra',
      facility: 'Korle Bu & 37 Military Teaching Hospitals',
      x: 266.5,
      y: 467,
      isHub: true,
      anchor: 'end',
      dx: -10,
      dy: 14,
    },
    {
      id: 'tema',
      name: 'Tema',
      region: 'Greater Accra',
      facility: 'Tema General Hospital (0° Meridian)',
      x: 280,
      y: 461.8,
      isHub: false,
      anchor: 'start',
      dx: 10,
      dy: -3,
    },
    {
      id: 'cape-coast',
      name: 'Cape Coast',
      region: 'Central Region',
      facility: 'Cape Coast Teaching Hospital (CCTH)',
      x: 183.1,
      y: 506.7,
      isHub: false,
      anchor: 'middle',
      dx: 0,
      dy: 15,
    },
    {
      id: 'takoradi',
      name: 'Takoradi',
      region: 'Western Region',
      facility: 'Effia Nkwanta Regional Hospital',
      x: 143,
      y: 524.2,
      isHub: false,
      anchor: 'middle',
      dx: -5,
      dy: 15,
    },
    {
      id: 'koforidua',
      name: 'Koforidua',
      region: 'Eastern Region',
      facility: 'Eastern Regional Hospital',
      x: 260.9,
      y: 428,
      isHub: false,
      anchor: 'end',
      dx: -8,
      dy: -4,
    },
    {
      id: 'kumasi',
      name: 'KUMASI',
      region: 'Ashanti Region',
      facility: 'Komfo Anokye Teaching Hospital (KATH)',
      x: 153.3,
      y: 380.7,
      isHub: true,
      anchor: 'end',
      dx: -10,
      dy: -4,
    },
    {
      id: 'sunyani',
      name: 'Sunyani',
      region: 'Bono Region',
      facility: 'Sunyani Regional Hospital',
      x: 99.1,
      y: 329.3,
      isHub: false,
      anchor: 'end',
      dx: -8,
      dy: 3,
    },
    {
      id: 'ho',
      name: 'Ho',
      region: 'Volta Region',
      facility: 'Ho Teaching Hospital',
      x: 319,
      y: 386.9,
      isHub: false,
      anchor: 'start',
      dx: 9,
      dy: 3,
    },
    {
      id: 'tamale',
      name: 'TAMALE',
      region: 'Northern Region',
      facility: 'Tamale Teaching Hospital (TTH)',
      x: 215.2,
      y: 165,
      isHub: true,
      anchor: 'start',
      dx: 12,
      dy: 0,
    },
    {
      id: 'wa',
      name: 'Wa',
      region: 'Upper West',
      facility: 'Upper West Regional Hospital',
      x: 83.6,
      y: 112.5,
      isHub: false,
      anchor: 'end',
      dx: -8,
      dy: 3,
    },
    {
      id: 'bol',
      name: 'Bol',
      shortLabel: 'Bolgatanga',
      region: 'Upper East',
      facility: 'Upper East Regional Hospital (Bolgatanga)',
      x: 214.2,
      y: 54.8,
      isHub: false,
      anchor: 'start',
      dx: 9,
      dy: -3,
    },
  ];

  // Telemetry Corridors connecting all nodes
  const corridors = [
    { id: 'c-acc-tma', d: 'M 266.5 467 L 280 461.8', dur: '1.8s' },
    { id: 'c-acc-kms', d: 'M 266.5 467 L 153.3 380.7', dur: '3.4s' },
    { id: 'c-acc-cc', d: 'M 266.5 467 L 183.1 506.7', dur: '2.6s' },
    { id: 'c-cc-tkr', d: 'M 183.1 506.7 L 143 524.2', dur: '2.0s' },
    { id: 'c-acc-kfd', d: 'M 266.5 467 L 260.9 428', dur: '2.1s' },
    { id: 'c-kfd-ho', d: 'M 260.9 428 L 319 386.9', dur: '2.8s' },
    { id: 'c-kms-syn', d: 'M 153.3 380.7 L 99.1 329.3', dur: '2.5s' },
    { id: 'c-kms-tml', d: 'M 153.3 380.7 L 215.2 165', dur: '3.8s' },
    { id: 'c-tml-bol', d: 'M 215.2 165 L 214.2 54.8', dur: '2.4s' },
    { id: 'c-tml-wa', d: 'M 215.2 165 L 83.6 112.5', dur: '3.1s' },
    { id: 'c-syn-wa', d: 'M 99.1 329.3 L 83.6 112.5', dur: '3.6s' },
  ];

  const activeCity = nodes.find(n => n.id === activeCityId) || nodes[0];

  return (
    <Section
      id="coverage"
      eyebrow="Nationwide coverage"
      title="Connected healthcare network across Ghana"
      intro="Linking regional teaching hospitals, district health centres, and remote facilities under one telemetry grid."
    >
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
        {/* Left Column: Authentic Geographically Accurate Ghana Map */}
        <figure className="panel p-4 sm:p-7 flex flex-col items-center justify-center bg-[#081827]/90 relative overflow-hidden border border-white/10 rounded-2xl">
          {/* Header Tag */}
          <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              GHANA EMERGENCY TELEMETRY GRID
            </span>
            <span>WGS84 GEOGRAPHIC PROJECTION</span>
          </div>

          <div className="w-full max-w-[420px] aspect-[400/560] relative">
            <svg viewBox="0 0 400 560" className="w-full h-full drop-shadow-2xl select-none" aria-hidden="true">
              <defs>
                {/* Glow Filter */}
                <filter id="gh-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id="gh-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0F2B48" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#07192C" stopOpacity="0.95" />
                </linearGradient>
              </defs>

              {/* Surrounding Country / Ocean contextual labels */}
              <text x="165" y="20" fill="#334155" fontSize="9" fontFamily="monospace" letterSpacing="3" textAnchor="middle">BURKINA FASO</text>
              <text x="30" y="250" fill="#334155" fontSize="9" fontFamily="monospace" letterSpacing="3" textAnchor="middle" transform="rotate(-90 30 250)">CÔTE D'IVOIRE</text>
              <text x="385" y="250" fill="#334155" fontSize="9" fontFamily="monospace" letterSpacing="3" textAnchor="middle" transform="rotate(90 385 250)">TOGO</text>
              <text x="200" y="548" fill="#334155" fontSize="9" fontFamily="monospace" letterSpacing="3" textAnchor="middle">GULF OF GUINEA</text>

              {/* Greenwich Meridian (0° Longitude passing through Tema) */}
              <line x1="280" y1="30" x2="280" y2="530" stroke="rgba(56, 189, 248, 0.15)" strokeDasharray="3 5" strokeWidth="1" />
              <text x="282" y="535" fill="#38BDF8" opacity="0.5" fontSize="7" fontFamily="monospace">0° PRIME MERIDIAN</text>

              {/* Geographic Parallels */}
              <line x1="45" y1="115" x2="345" y2="115" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="2 4" />
              <text x="48" y="112" fill="#475569" fontSize="7" fontFamily="monospace">10°N</text>
              <line x1="45" y1="275" x2="345" y2="275" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="2 4" />
              <text x="48" y="272" fill="#475569" fontSize="7" fontFamily="monospace">8°N</text>
              <line x1="45" y1="435" x2="345" y2="435" stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="2 4" />
              <text x="48" y="432" fill="#475569" fontSize="7" fontFamily="monospace">6°N</text>

              {/* Ghana Exact Country Outline Silhouette */}
              <path
                d="M 364.9 434.2 L 375.1 427.2 L 375.1 423.2 L 367.2 422.9 L 359.8 409.8 L 352.5 410 L 349.5 406.1 L 340.9 401.1 L 337.9 394.9 L 339.3 389.6 L 334.9 389 L 331.5 385.2 L 332.1 376.2 L 326.7 374.9 L 325.9 371.9 L 327.3 371.6 L 323 369.8 L 325.2 362.8 L 321.9 358.6 L 328.5 354.9 L 329.7 348.7 L 328.5 345.5 L 333.1 331.2 L 332.2 324.9 L 325.4 324.9 L 320.8 319.1 L 322.1 309.2 L 326.8 306.9 L 327.7 299.7 L 329.9 299.9 L 330.3 287.5 L 327.9 269.3 L 329.3 263.1 L 327.9 260.7 L 331.8 256 L 338.4 253.8 L 338.8 250 L 337 244.8 L 333.6 243 L 332 237.3 L 318 228.2 L 311.3 216.8 L 312 213.5 L 320.1 212.1 L 322.9 206.8 L 317 193.1 L 318.3 185.2 L 322.7 180.5 L 321.1 176 L 324.2 172.2 L 325.6 164.9 L 316.5 157.6 L 309.1 157.8 L 307.3 161.5 L 302.8 163.3 L 299.2 160.6 L 299.3 158.7 L 302 159.3 L 305.3 156.8 L 300 155.5 L 300 151.5 L 310.9 150.3 L 309.8 144.2 L 306.1 139.2 L 309 129.8 L 308.8 124.4 L 311.4 122.3 L 309.1 119.1 L 309.1 115 L 313.1 116 L 313.9 113.1 L 308.7 109.7 L 309.6 97.2 L 312.2 93.3 L 306.4 93 L 307.4 91.1 L 303.4 84.2 L 298.1 84.1 L 296.5 85.8 L 291.7 75.1 L 276.2 66.3 L 274.3 60.5 L 279.1 52.3 L 280.4 41.2 L 283.8 39 L 282.7 30.5 L 272.5 30.6 L 269.8 29.4 L 270.1 26.7 L 259.7 24 L 258.3 26.4 L 259.7 28.1 L 254.7 29.5 L 252.8 32.4 L 251.6 28.6 L 249.8 28.2 L 247.2 30 L 246.8 35.4 L 236.4 39.3 L 234.4 44.7 L 232.3 45.6 L 231.3 42.7 L 228.3 41.5 L 229.6 39.3 L 217.1 37.6 L 213.5 38.6 L 212.1 41 L 207.8 38.2 L 171.2 38.6 L 168.5 36.4 L 156.3 36.3 L 155.8 38.7 L 144.1 39.7 L 58 37.5 L 58.7 44.7 L 55.3 47.4 L 53.3 55.8 L 49.6 60.4 L 52 62.7 L 49.3 67.3 L 55.2 81.4 L 62.6 84.1 L 58 86.7 L 56.5 92 L 63.7 98.4 L 60.8 103 L 61 108.9 L 64.4 120.8 L 63 125.9 L 65.8 131 L 61.1 137.4 L 61.1 140.8 L 64.3 145.8 L 63 152 L 69.4 157.4 L 70.3 166.7 L 66.8 172.3 L 71.4 177.2 L 62.6 186.3 L 62.3 192.5 L 64.4 195 L 72.1 196.9 L 71.4 201 L 74.3 204.1 L 76.5 211.4 L 74.1 214 L 77.5 214.5 L 84.8 260.1 L 75 264.6 L 77.4 270.5 L 76.5 273.1 L 70.7 274.3 L 65 282.9 L 62.2 280.4 L 61.4 287.2 L 51 307.6 L 46.7 333.9 L 48.6 337.3 L 42.8 345 L 42.1 350.3 L 37.9 351.8 L 26.9 370.4 L 26.7 374.3 L 29.5 378.7 L 24.9 387 L 26.5 388.1 L 31 416.1 L 32.9 416 L 36.8 423.6 L 38.7 435.2 L 43.5 446.5 L 43 458.8 L 48.4 458.7 L 47.5 464.4 L 50.2 466.4 L 55.9 462.9 L 62.8 466.5 L 66.5 484.9 L 66.4 488.2 L 62.5 488.2 L 61.7 492.5 L 64.2 494.8 L 63.5 498.5 L 66.4 504.1 L 64 507 L 53.8 505.6 L 48.3 508.8 L 42.3 505.7 L 36.2 506.2 L 36.2 507.5 L 95.7 520.5 L 102.6 523.1 L 110.6 531.8 L 115.1 532.5 L 116.5 536 L 125 534.5 L 134.2 527 L 143.3 524.9 L 144.1 521.6 L 151.6 517.4 L 154.3 512.9 L 183.1 507.1 L 196 499.5 L 217.6 498.1 L 224.2 491.3 L 242.2 484.9 L 244.5 480.9 L 252.2 475.7 L 270.9 470.4 L 282.8 464.6 L 286.7 460.2 L 300.1 454.5 L 309.6 452.5 L 339.9 454.6 L 354.1 452.7 L 358.6 448.5 L 359.7 442.4 L 364.9 434.2 Z"
                fill="url(#gh-gradient)"
                stroke="#00E5FF"
                strokeWidth="1.6"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />

              {/* Lake Volta Hydrographic Feature */}
              <path
                d="M 306.5 315.1 L 302.3 330.4 L 306.6 333.7 L 302.9 333.7 L 301.8 342.4 L 305.5 350.6 L 298.6 368.7 L 300.2 383.3 L 306.6 372.9 L 306.1 382.7 L 292.6 387.6 L 289.9 408.3 L 288.7 397.5 L 280.4 408.5 L 272.1 394.7 L 262.4 391.4 L 259.6 386 L 234.3 379.5 L 224.6 368 L 234.9 374 L 239.1 366.4 L 241.3 377.3 L 249.7 378.9 L 251 367.5 L 253.2 380.5 L 265.1 375.1 L 267.5 383.2 L 274.7 386.5 L 280.2 378.4 L 274.3 369.6 L 278.6 365.2 L 282.4 369.6 L 290.4 365.2 L 289.9 362 L 281.3 363.6 L 285.1 356.5 L 291 359.4 L 286.1 354.4 L 291.6 351.6 L 286.7 347.8 L 287.8 343.5 L 281.2 340.4 L 282.4 337.4 L 282.1 340.7 L 289.4 341.8 L 296.8 334.2 L 284 321.1 L 285.6 316.7 L 274.3 315.1 L 277 322.2 L 270.4 320.3 L 268 314.3 L 261.3 314.6 L 271 310.8 L 285.1 313.5 L 276.6 303.9 L 228.4 313 L 248.9 302.1 L 256.6 304.4 L 262.9 300.4 L 259.6 298.7 L 268.1 300.9 L 268.9 296.6 L 274.1 297.3 L 267.3 294.4 L 271.5 290.9 L 268.1 281.9 L 264.8 282.4 L 267.3 277.5 L 255.3 268.2 L 253.5 278 L 245.2 279.4 L 253.1 273.2 L 246.7 268.6 L 237.6 277 L 240.8 270.1 L 237.6 262.8 L 237.2 267.8 L 229.4 271 L 230.3 266.6 L 221.3 269.3 L 223 265 L 234.9 261.7 L 221.7 251.5 L 214.5 251 L 221.4 249.7 L 208.5 228.4 L 200.2 222.8 L 190.9 224.4 L 190.1 233.9 L 187.3 223.1 L 180.3 223.7 L 172.5 216.5 L 165.3 217.1 L 158.7 224.6 L 146.4 226.3 L 151.2 221.1 L 160 222.7 L 163.3 216.5 L 172.8 214.8 L 172.8 209.3 L 183 221.9 L 201.4 221.3 L 200.5 214.8 L 188.3 212.4 L 194.9 212.1 L 188.2 202.6 L 190.6 187.6 L 194.9 195.2 L 191.2 203.4 L 198.9 211.5 L 200.9 206.6 L 204.2 221.6 L 213.3 232.5 L 219.2 227.5 L 214.9 222.2 L 218.6 214.8 L 216.5 221.9 L 223.6 227.9 L 225.7 223.5 L 226.2 227.9 L 216.4 237.8 L 238.7 254.1 L 236.5 258.5 L 241.3 262.3 L 249.9 262.2 L 250.3 256.8 L 264 256.8 L 266.8 262.4 L 255.3 260.6 L 254.8 265.6 L 270.7 274.2 L 277 294.9 L 282.4 291.1 L 280.8 294.4 L 287.8 294.4 L 284.5 281.3 L 289.9 275.9 L 285.6 275.9 L 284.4 270.5 L 296.4 269.3 L 287.9 257.7 L 294.6 257 L 294.7 250.3 L 299.3 248.2 L 288.3 246.1 L 290.4 238.3 L 287 233.1 L 294.3 229.6 L 292.1 223.1 L 298.6 217 L 288.8 240.7 L 289.8 244.6 L 300.8 244.4 L 302 250.1 L 305 249.1 L 296.4 250.8 L 297.5 256.2 L 292.6 259.5 L 298.7 260.3 L 295.2 266.2 L 303.4 267.2 L 291 272.6 L 294.3 277 L 287.2 280.8 L 291.6 281.8 L 290.4 285.2 L 295.2 283.8 L 293.1 292.2 L 302.3 281.3 L 301.8 289 L 297.5 290 L 303.4 293.3 L 304.5 308.6 L 303.4 311.3 L 299.6 308 L 297.5 312.4 L 300.3 319.5 L 307.2 310.8 L 306.5 315.1 Z"
                fill="rgba(0, 229, 255, 0.12)"
                stroke="rgba(0, 229, 255, 0.35)"
                strokeWidth="1"
                strokeLinejoin="round"
              />
              <text x="280" y="335" fill="#00E5FF" opacity="0.5" fontSize="7.5" fontFamily="monospace" letterSpacing="1" textAnchor="middle">LAKE VOLTA</text>

              {/* Active Telemetry Trunk Corridors */}
              {corridors.map((c) => (
                <g key={c.id}>
                  <path
                    id={c.id}
                    d={c.d}
                    fill="none"
                    stroke="rgba(0, 229, 255, 0.25)"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />
                  {/* Moving Telemetry Signal Pulse */}
                  <circle r="2.8" fill="#00E5FF" filter="drop-shadow(0 0 4px #00E5FF)">
                    <animateMotion dur={c.dur} repeatCount="indefinite">
                      <mpath href={'#' + c.id} />
                    </animateMotion>
                  </circle>
                </g>
              ))}

              {/* 11 City Nodes */}
              {nodes.map((node) => {
                const isSelected = node.id === activeCityId;
                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-transform duration-200 hover:scale-110"
                    onClick={() => setActiveCityId(node.id)}
                  >
                    {/* Concentric Pulse Rings for Hubs or Selected City */}
                    {(node.isHub || isSelected) && (
                      <>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 14 : 10}
                          fill={node.isHub ? 'rgba(255, 42, 77, 0.18)' : 'rgba(0, 229, 255, 0.18)'}
                          className="animate-ping"
                          style={{ transformOrigin: node.x + 'px ' + node.y + 'px' }}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isSelected ? 9 : 7}
                          fill={node.isHub ? 'rgba(255, 42, 77, 0.3)' : 'rgba(0, 229, 255, 0.3)'}
                        />
                      </>
                    )}

                    {/* Central Node Dot */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isHub ? 4.5 : 3.5}
                      fill={
                        isSelected
                          ? '#00E5FF'
                          : node.isHub
                          ? '#FF2A4D'
                          : '#94A3B8'
                      }
                      stroke={isSelected ? '#FFFFFF' : '#0B1B2B'}
                      strokeWidth="1.5"
                    />

                    {/* City Label */}
                    <text
                      x={node.x + node.dx}
                      y={node.y + node.dy}
                      textAnchor={node.anchor}
                      fill={
                        isSelected
                          ? '#00E5FF'
                          : node.isHub
                          ? '#FFFFFF'
                          : '#94A3B8'
                      }
                      fontSize={node.isHub ? '9' : '8'}
                      fontWeight={node.isHub || isSelected ? 'bold' : 'normal'}
                      fontFamily={node.isHub ? 'monospace' : 'sans-serif'}
                      className="select-none drop-shadow"
                    >
                      {node.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <figcaption className="mt-3 font-mono text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF2A4D]" /> Major Teaching Hub
            <span className="w-2 h-2 rounded-full bg-[#00E5FF] ml-2" /> Active Corridor
            <span className="w-2 h-2 rounded-full bg-slate-400 ml-2" /> Regional Center
          </figcaption>
        </figure>

        {/* Right Column: Interactive City Directory & Regional Targets */}
        <div className="space-y-6">
          {/* Active Facility Card */}
          <div className="panel p-6 bg-[#0B1B2B] border border-cyan-500/30 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow text-cyan-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {activeCity.region}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {activeCity.isHub ? 'Primary Teaching Hub' : 'Regional Node'}
              </span>
            </div>
            <h3 className="text-2xl font-bold font-mono text-white mb-1">
              {activeCity.name}
              {activeCity.shortLabel && activeCity.shortLabel !== activeCity.name && (
                <span className="text-sm text-slate-400 font-normal ml-2">({activeCity.shortLabel})</span>
              )}
            </h3>
            <p className="text-sm text-slate-300 font-medium mb-3">
              {activeCity.facility}
            </p>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400 pt-3 border-t border-white/10">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Activity className="w-3.5 h-3.5" /> Live Telemetry Linked
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" /> 24/7 Trauma Ready
              </span>
            </div>
          </div>

          {/* 11 Interactive City Badges */}
          <div className="panel p-5 bg-[#0B1B2B]/70 border border-white/10 rounded-2xl">
            <div className="text-xs font-mono text-slate-400 mb-3 uppercase tracking-wider">
              Select City / Regional Node to Inspect
            </div>
            <div className="flex flex-wrap gap-2">
              {nodes.map((n) => {
                const isActive = n.id === activeCityId;
                return (
                  <button
                    key={n.id}
                    onClick={() => setActiveCityId(n.id)}
                    className={'px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ' + (
                      isActive
                        ? 'bg-cyan-500 text-[#06111F] font-bold shadow-lg shadow-cyan-500/20'
                        : n.isHub
                        ? 'bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20'
                        : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                    )}
                  >
                    {n.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Regional Targets */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="panel p-5 bg-[#0B1B2B]/70 border border-white/10 rounded-xl space-y-1.5">
              <div className="eyebrow text-cyan-400">Administrative Scope</div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                <AnimatedCounter value={16} suffix=" Regions" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ashanti, Greater Accra, Central, Northern, Volta, and all regional health directorates.
              </p>
            </div>

            <div className="panel p-5 bg-[#0B1B2B]/70 border border-white/10 rounded-xl space-y-1.5">
              <div className="eyebrow text-emerald-400">Facility Registry</div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white">
                <AnimatedCounter value={2500} suffix="+" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Teaching hospitals, district facilities, and CHPS compounds under unified telemetry.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
};

export default GhanaNetwork;
