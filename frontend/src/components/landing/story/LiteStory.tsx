import React, { useRef, useState, useEffect } from 'react';
import { useScroll, motion } from 'framer-motion';
import { StoryOverlay } from './StoryOverlay';

export const LiteStory: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [progressVal, setProgressVal] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setProgressVal(latest);
      const stage = Math.min(Math.floor(latest * 5), 4);
      setCurrentStage(stage);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // SVG route path coordinates
  const pathLength = 680;
  const strokeDashoffset = pathLength * (1 - progressVal);

  return (
    <div ref={containerRef} className="relative h-[340vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#06111F] flex items-center justify-center">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-grid [background-size:36px_36px] opacity-25" />

        {/* Dynamic 2D SVG Mission Map */}
        <div className="relative w-full max-w-4xl h-[480px] p-6 flex items-center justify-center">
          <svg viewBox="0 0 800 500" className="w-full h-full drop-shadow-2xl">
            {/* Background Corridor Baseline */}
            <path
              d="M 120 380 Q 240 180, 420 320 T 700 160"
              fill="none"
              stroke="#1E293B"
              strokeWidth="6"
              strokeLinecap="round"
            />

            {/* Glowing Active Route drawn by scroll progress */}
            <path
              d="M 120 380 Q 240 180, 420 320 T 700 160"
              fill="none"
              stroke="#EF4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={pathLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-75"
            />

            {/* Start / Incident Node */}
            <g transform="translate(120, 380)">
              <circle r="18" fill="#EF4444" opacity="0.25" className="animate-ping" />
              <circle r="8" fill="#EF4444" />
              <text y="-16" textAnchor="middle" fill="#94A3B8" fontSize="11" fontFamily="monospace">
                INCIDENT GPS
              </text>
            </g>

            {/* Alternative Hospital A */}
            <g transform="translate(380, 110)">
              <circle r="6" fill="#64748B" opacity={currentStage >= 2 ? 0.3 : 0.8} />
              <text y="20" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                DISTRICT HOSP
              </text>
            </g>

            {/* Alternative Hospital B */}
            <g transform="translate(540, 420)">
              <circle r="6" fill="#64748B" opacity={currentStage >= 2 ? 0.3 : 0.8} />
              <text y="20" textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                REGIONAL CLINIC
              </text>
            </g>

            {/* Chosen Target Hospital Destination */}
            <g transform="translate(700, 160)">
              <circle
                r="22"
                fill={currentStage >= 2 ? '#10B981' : '#38BDF8'}
                opacity="0.3"
                className="animate-pulse"
              />
              <circle r="10" fill={currentStage >= 2 ? '#10B981' : '#38BDF8'} />
              <text y="-20" textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="bold" fontFamily="sans-serif">
                KOMFO ANOKYE (KATH)
              </text>
              <text y="32" textAnchor="middle" fill={currentStage >= 2 ? '#10B981' : '#94A3B8'} fontSize="10" fontFamily="monospace">
                {currentStage >= 2 ? 'RESERVED ER BAY' : 'CANDIDATE #1'}
              </text>
            </g>
          </svg>
        </div>

        {/* Telemetry HTML Overlay */}
        <StoryOverlay stageIndex={currentStage} progress={progressVal} />
      </div>
    </div>
  );
};

export default LiteStory;
