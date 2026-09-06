import React from 'react';
import { Section } from '../ui/Section';
import { AnimatedCounter } from './AnimatedCounter';

export const ImpactMetrics: React.FC = () => {
  return (
    <Section
      id="impact"
      eyebrow="Real impact. Real possibilities."
      title="Designed to reduce delays and improve care"
      intro="Simulated projections based on regional dispatch modeling and bed-turnaround optimization."
    >
      <div className="panel overflow-hidden">
        {/* Mandatory Warning Header per Data Integrity Rule §3.2 */}
        <div className="px-6 py-3.5 bg-[#081827] border-b border-white/10 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-state-warning animate-pulse" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-state-warning">
            Simulated Impact Model — projected, not verified outcomes
          </span>
        </div>

        {/* Hairline Grid Data List */}
        <dl className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10">
          {/* Cell 1: -35% Response Time */}
          <div className="bg-card p-6 sm:p-8 space-y-2">
            <dd className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
              <AnimatedCounter value={35} prefix="−" suffix="%" />
            </dd>
            <dt className="text-sm text-ink-muted leading-snug">
              Potential reduction in response time
            </dt>
          </div>

          {/* Cell 2: +28% Resource Utilisation */}
          <div className="bg-card p-6 sm:p-8 space-y-2">
            <dd className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
              <AnimatedCounter value={28} prefix="+" suffix="%" />
            </dd>
            <dt className="text-sm text-ink-muted leading-snug">
              Improved resource utilisation
            </dt>
          </div>

          {/* Cell 3: 24/7 Live Monitoring */}
          <div className="bg-card p-6 sm:p-8 space-y-2">
            <dd className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
              24/7
            </dd>
            <dt className="text-sm text-ink-muted leading-snug">
              Real-time monitoring
            </dt>
          </div>

          {/* Cell 4: End-to-end Emergency Coordination */}
          <div className="bg-card p-6 sm:p-8 space-y-2">
            <dd className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
              End-to-end
            </dd>
            <dt className="text-sm text-ink-muted leading-snug">
              Emergency coordination
            </dt>
          </div>
        </dl>
      </div>
    </Section>
  );
};

export default ImpactMetrics;
