import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { STORY_STAGES } from './stages';
import { CheckCircle2, ShieldCheck, Navigation } from 'lucide-react';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';

export interface StoryOverlayProps {
  stageIndex: number;
  progress: number;
}

export const StoryOverlay: React.FC<StoryOverlayProps> = ({ stageIndex, progress }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const currentStage = STORY_STAGES[stageIndex] || STORY_STAGES[0];
  const statRef = useRef<HTMLDivElement>(null);

  // GSAP animation for stage 4 stats
  useEffect(() => {
    if (stageIndex === 3 && statRef.current && !prefersReducedMotion) {
      gsap.fromTo(
        statRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.12, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [stageIndex, prefersReducedMotion]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-6 sm:p-12 lg:p-16">
      {/* Top Header Information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#081827]/80 backdrop-blur-md border border-white/10 text-xs font-mono text-ink">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span>STAGE {stageIndex + 1} OF 5</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-ink-muted">
          <span>PROGRESS</span>
          <span className="text-primary font-bold">{Math.round(progress * 100)}%</span>
        </div>
      </div>

      {/* Main Center-Left Dynamic Stage Content Card */}
      <div className="max-w-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage?.id ?? 0}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -20 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.35 }}
            className="rounded-2xl border border-white/10 bg-[#081827]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-primary font-mono text-xs font-bold uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{currentStage?.tag}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              {currentStage?.title}
            </h3>

            <p className="text-ink-muted sm:text-base leading-relaxed">
              {currentStage?.body}
            </p>

            {/* Stage 4: Live Distance / ETA Statistics */}
            {currentStage?.stats && (
              <div ref={statRef} className="pt-4 border-t border-white/10 grid grid-cols-3 gap-3">
                {currentStage.stats.map((s, idx) => (
                  <div key={idx} className="rounded-lg bg-card/60 p-2.5 border border-white/5">
                    <span className="block text-[11px] text-ink-faint font-mono uppercase">{s.label}</span>
                    <span className="text-sm sm:text-base font-mono font-bold text-ink">{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Stage 5: Handover Readiness Checklist */}
            {currentStage?.checklist && (
              <div className="pt-4 border-t border-white/10 space-y-2">
                {currentStage.checklist.map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.12 }}
                    className="flex items-center gap-2 text-xs sm:text-sm text-state-success font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-state-success" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slim Progress Rail on Right Edge */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-3">
        {STORY_STAGES.map((s, idx) => {
          const isActive = idx === stageIndex;
          const isPassed = idx < stageIndex;
          return (
            <div key={s.id} className="flex items-center gap-2 justify-end">
              <span
                className={`text-[10px] font-mono transition-opacity duration-300 ${
                  isActive ? 'opacity-100 text-primary font-bold' : 'opacity-0'
                }`}
              >
                {s.tag}
              </span>
              <div
                className={`h-8 w-1 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-primary scale-y-125 shadow-glow'
                    : isPassed
                    ? 'bg-primary/50'
                    : 'bg-white/10'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Subtitle / Scroll Prompt */}
      <div className="text-[11px] font-mono text-ink-faint flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Navigation className="h-3 w-3 text-primary animate-pulse" />
          SCROLL TO ADVANCE MISSION SEQUENCE
        </span>
        <span className="hidden sm:inline">IERBMS PROTOCOL v4.2</span>
      </div>
    </div>
  );
};

export default StoryOverlay;
