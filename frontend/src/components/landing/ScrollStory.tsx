import React, { Suspense } from 'react';
import { useDeviceTier } from '../../hooks/useDeviceTier';
import { STORY_STAGES } from './story/stages';
import { Activity } from 'lucide-react';

const LazyCinematicStory = React.lazy(() => import('./story/CinematicStory'));
const LazyLiteStory = React.lazy(() => import('./story/LiteStory'));

export const ScrollStory: React.FC = () => {
  const tier = useDeviceTier();

  // 1. Static fallback: Plain numbered list
  if (tier === 'static') {
    return (
      <section className="container-page py-20 sm:py-24">
        <div className="max-w-2xl mb-12">
          <div className="eyebrow mb-3 text-primary">The emergency journey</div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-ink">
            Coordinated, five-stage protocol
          </h2>
          <p className="mt-4 text-ink-muted">
            From the initial distress call to clinical bedside handover.
          </p>
        </div>

        <ol className="grid gap-4 sm:gap-6">
          {STORY_STAGES.map((s, idx) => (
            <li key={s.id} className="panel p-5 sm:p-6 flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-6">
              <span className="font-mono text-primary font-bold text-lg shrink-0">
                0{idx + 1} · {s.tag.toUpperCase()}
              </span>
              <p className="text-sm sm:text-base text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  // 2. Lite tier: SVG-based pinned story
  if (tier === 'lite') {
    return (
      <Suspense
        fallback={
          <div className="h-screen w-full flex items-center justify-center bg-[#06111F] text-ink-muted font-mono text-xs">
            LOADING STORYLINE…
          </div>
        }
      >
        <LazyLiteStory />
      </Suspense>
    );
  }

  // 3. Full tier: 3D Pinned WebGL Cinematic Story
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#06111F] text-ink-muted font-mono text-xs space-y-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />
          <span>INITIALIZING 3D MISSION ENGINE…</span>
        </div>
      }
    >
      <LazyCinematicStory />
    </Suspense>
  );
};

export default ScrollStory;
