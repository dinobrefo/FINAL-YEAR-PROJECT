import { useState, useEffect } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

export type DeviceTier = 'full' | 'lite' | 'static';

function computeDeviceTier(reducedMotion: boolean): DeviceTier {
  if (typeof window === 'undefined') return 'static';

  // URL query parameter overrides for testing / power users
  const searchParams = new URLSearchParams(window.location.search);
  if (searchParams.has('static')) return 'static';
  if (searchParams.has('lite')) return 'lite';
  if (searchParams.has('full')) return 'full';

  // 1. Static conditions
  if (reducedMotion) return 'static';

  const width = window.innerWidth;
  if (width < 768) return 'static';

  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (isCoarsePointer && width < 1024) return 'static';

  // 2. Lite conditions
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 8;

  if (cores <= 4 || memory <= 4 || width < 1024) {
    return 'lite';
  }

  // 3. Full tier
  return 'full';
}

export function useDeviceTier(): DeviceTier {
  const reducedMotion = usePrefersReducedMotion();
  const [tier, setTier] = useState<DeviceTier>(() => computeDeviceTier(reducedMotion));

  useEffect(() => {
    const handleResize = () => {
      setTier(computeDeviceTier(reducedMotion));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [reducedMotion]);

  return tier;
}
