import React from 'react';
import { Section } from '../ui/Section';
import { AnimatedCounter } from './AnimatedCounter';
import { useSystemOverview } from '../../hooks/useSystemOverview';
import { AlertCircle, RefreshCw, Radio, Building2, Ambulance, Flame } from 'lucide-react';

export const LiveSystemOverview: React.FC = () => {
  const { data, loading, error } = useSystemOverview();

  return (
    <Section
      id="live"
      eyebrow="Live system overview"
      title="Real numbers from the platform"
      intro="These figures are pulled directly from the IERBMS operational database in real time."
    >
      <div className="panel p-6 sm:p-8 relative overflow-hidden">
        {/* Top Status Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-state-success animate-pulse" />
            <span className="text-ink font-semibold">DATABASE TELEMETRY POLLING ACTIVE</span>
          </div>
          <span className="text-ink-muted">POLL INTERVAL: 30S</span>
        </div>

        {/* 1. Loading State */}
        {loading && !data && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-ink-muted">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <p className="font-mono text-xs">Querying PostgreSQL operational telemetry…</p>
          </div>
        )}

        {/* 2. Error / Unreachable State */}
        {error && !data && (
          <div className="py-8 px-6 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-3.5 text-ink">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-mono text-sm font-semibold text-primary">Telemetry Offline</h4>
              <p className="text-sm text-ink-muted">{error}</p>
            </div>
          </div>
        )}

        {/* 3. Empty Data State */}
        {data && !data.hasData && (
          <div className="py-8 px-6 rounded-lg bg-card border border-white/10 text-center space-y-2">
            <p className="font-mono text-sm text-ink-muted">{data.emptyStateMessage}</p>
          </div>
        )}

        {/* 4. Live Real Statistics Grid */}
        {data && data.hasData && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Connected Hospitals */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ink-muted">
                <Building2 className="h-4 w-4 text-state-info" />
                <span className="eyebrow text-ink-muted">Connected Facilities</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
                <AnimatedCounter value={data.connectedHospitals} />
              </div>
              <p className="text-xs text-ink-faint">Verified healthcare facilities</p>
            </div>

            {/* Active Ambulances */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ink-muted">
                <Ambulance className="h-4 w-4 text-primary" />
                <span className="eyebrow text-ink-muted">Active Ambulances</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
                <AnimatedCounter value={data.activeAmbulances} />
              </div>
              <p className="text-xs text-ink-faint">Live telemetry units</p>
            </div>

            {/* Regions Covered */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ink-muted">
                <Radio className="h-4 w-4 text-state-warning" />
                <span className="eyebrow text-ink-muted">Regions Covered</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
                <AnimatedCounter value={data.regionsCovered} suffix=" / 16" />
              </div>
              <p className="text-xs text-ink-faint">Administrative regions in Ghana</p>
            </div>

            {/* Total Emergencies Logged */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ink-muted">
                <Flame className="h-4 w-4 text-state-success" />
                <span className="eyebrow text-ink-muted">Total Emergencies</span>
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-ink">
                <AnimatedCounter value={data.totalEmergencies} />
              </div>
              <p className="text-xs text-ink-faint">Incidents tracked on platform</p>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

export default LiveSystemOverview;
