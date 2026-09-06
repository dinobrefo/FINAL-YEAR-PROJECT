import React, { Suspense, Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { Activity, Radio, Cpu, BedDouble, Navigation, ArrowRight } from 'lucide-react';
import { useDeviceTier } from '../../hooks/useDeviceTier';

const LazyAmbulanceScene = React.lazy(() => import('./AmbulanceScene'));

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class WebGLErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Hero WebGL encountered error, falling back to static visual:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export const HeroSection: React.FC = () => {
  const tier = useDeviceTier();

  const chips = [
    { icon: Radio, label: 'Real-Time Tracking' },
    { icon: Cpu, label: 'Intelligent Recommendations' },
    { icon: BedDouble, label: 'Live Capacity' },
  ];

  const renderStaticHeroCard = () => (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 bg-[#081827] overflow-hidden">
      {/* Ambient Pulsing Glow and Radar Ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-64 w-64 rounded-full border border-primary/30 animate-pulseRing" />
        <div className="h-44 w-44 rounded-full border border-primary/20 animate-ping" />
        <div className="h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Telemetry Card */}
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-white/10 bg-[#111C2D]/95 backdrop-blur-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
              Ambulance En Route
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-state-success bg-state-success/15 border border-state-success/30 px-2 py-0.5 rounded">
            ETA 12 MIN
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-ink-muted">
            <span>Dispatched Unit:</span>
            <span className="font-mono text-ink font-semibold">NAS Unit #201</span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Assigned Center:</span>
            <span className="text-ink font-semibold text-right">Komfo Anokye Teaching Hosp.</span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Clinical Severity:</span>
            <span className="font-mono text-primary font-bold">Priority Red (TEWS 8)</span>
          </div>
          <div className="flex items-center justify-between text-ink-muted">
            <span>Beds Reserved:</span>
            <span className="font-mono text-state-success font-semibold">1 ICU Bed Held</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-ink-muted">
          <span className="flex items-center gap-1.5 font-mono text-ink">
            <Navigation className="h-3 w-3 text-state-info animate-pulse" />
            Turn-by-turn routing active
          </span>
          <span className="font-mono text-ink-muted">OSRM GPS</span>
        </div>
      </div>
    </div>
  );

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-24">
      {/* Background Faint Grid Pattern */}
      <div className="absolute inset-0 bg-grid [background-size:44px_44px] opacity-35 pointer-events-none" />

      {/* Ambient Red Glow Blob (top-right) */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full bg-primary/20 blur-[140px] pointer-events-none" />

      <div className="container-page relative z-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          {/* Left Column: Mission Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="eyebrow text-primary font-semibold">Intelligent emergency coordination</div>

            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-semibold leading-[1.08] tracking-tight text-ink">
              Saving lives through intelligent routing and better outcomes.
            </h1>

            <p className="max-w-xl text-ink-muted sm:text-lg leading-relaxed">
              IERBMS connects ambulances and hospitals through real-time data, explainable hospital
              recommendations, and live capacity monitoring — so every patient reaches the right care,
              faster.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/login" className="btn-primary px-6 py-3 text-sm font-semibold gap-2">
                <span>Explore Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#how-it-works" className="btn-ghost px-6 py-3 text-sm font-medium">
                See How It Works
              </a>
            </div>

            {/* Capability Chips */}
            <dl className="pt-6 border-t border-white/10 flex flex-wrap gap-4 sm:gap-6 text-xs text-ink-muted">
              {chips.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-ink">{label}</span>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Right Column: 3D Scene / Static Card Frame */}
          <div className="relative h-[360px] sm:h-[440px] lg:h-[520px] rounded-xl border border-white/10 bg-[#081827]/60 overflow-hidden shadow-2xl">
            {tier !== 'static' ? (
              <WebGLErrorBoundary fallback={renderStaticHeroCard()}>
                <Suspense
                  fallback={
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#06111F] text-ink-muted font-mono text-xs space-y-2">
                      <Activity className="h-5 w-5 text-primary animate-pulse" />
                      <span>LOADING 3D ENGINE…</span>
                    </div>
                  }
                >
                  <LazyAmbulanceScene tier={tier} />
                </Suspense>
              </WebGLErrorBoundary>
            ) : (
              renderStaticHeroCard()
            )}

            {/* Bottom-left telemetry status chip */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#081827]/90 backdrop-blur-md border border-white/15 text-[11px] font-mono shadow-lg">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-bold text-ink tracking-wider">EMERGENCY ROUTE · LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
