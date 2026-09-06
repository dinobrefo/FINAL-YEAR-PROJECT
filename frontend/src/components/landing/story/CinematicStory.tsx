import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useScroll } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { StoryScene } from './StoryScene';
import { StoryOverlay } from './StoryOverlay';

export const CinematicStory: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOnScreen, setIsOnScreen] = useState<boolean>(true);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [progressVal, setProgressVal] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Track stage index and progress for HTML overlay updates
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setProgressVal(latest);
      const stage = Math.min(Math.floor(latest * 5), 4);
      setCurrentStage(stage);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Pause render loop when offscreen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsOnScreen(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative h-[440vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#06111F]">
        <Canvas
          frameloop={isOnScreen ? 'always' : 'never'}
          shadows
          dpr={[1, 1.6]}
          camera={{ position: [-12, 4.5, 2.5], fov: 42 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <Suspense fallback={null}>
            <StoryScene progress={scrollYProgress} />
          </Suspense>
        </Canvas>

        {/* HTML Telemetry & Stage Overlay */}
        <StoryOverlay stageIndex={currentStage} progress={progressVal} />
      </div>
    </div>
  );
};

export default CinematicStory;
