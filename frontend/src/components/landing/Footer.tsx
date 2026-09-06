import React from 'react';
import { Link } from 'react-router';
import { Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#081827] text-ink-muted text-xs">
      <div className="container-page py-14 sm:py-16">
        <div className="grid md:grid-cols-[1.5fr_2fr] gap-12 mb-12">
          {/* Left Column: Brand & Mission */}
          <div className="space-y-4 max-w-sm">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-8 w-8 rounded-md bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <span className="font-mono font-bold text-base tracking-wider text-ink">IERBMS</span>
            </Link>
            <p className="text-ink-muted text-sm leading-relaxed">
              Intelligent Emergency Routing & Bed Management System. Connecting national ambulance logistics with receiving hospital capacity across Ghana.
            </p>
          </div>

          {/* Right Column: 3 Link Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
            {/* Column 1: Product */}
            <div className="space-y-3">
              <h5 className="font-mono font-bold text-ink uppercase tracking-wider text-[11px]">Product</h5>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-ink transition-colors">Capabilities</a></li>
                <li><a href="#how-it-works" className="hover:text-ink transition-colors">Emergency Journey</a></li>
                <li><a href="#live" className="hover:text-ink transition-colors">Live Telemetry</a></li>
                <li><a href="#impact" className="hover:text-ink transition-colors">Impact Model</a></li>
              </ul>
            </div>

            {/* Column 2: Platform */}
            <div className="space-y-3">
              <h5 className="font-mono font-bold text-ink uppercase tracking-wider text-[11px]">Platform</h5>
              <ul className="space-y-2">
                <li><Link to="/ambulance" className="hover:text-ink transition-colors">Paramedic Cockpit</Link></li>
                <li><Link to="/hospital" className="hover:text-ink transition-colors">Hospital Portal</Link></li>
                <li><Link to="/command" className="hover:text-ink transition-colors">Command Center</Link></li>
                <li><Link to="/authority" className="hover:text-ink transition-colors">Regional Census</Link></li>
              </ul>
            </div>

            {/* Column 3: Organization */}
            <div className="space-y-3">
              <h5 className="font-mono font-bold text-ink uppercase tracking-wider text-[11px]">Organization</h5>
              <ul className="space-y-2">
                <li><span className="text-ink-faint">KNUST Capstone</span></li>
                <li><span className="text-ink-faint">Ghana Health Service</span></li>
                <li><span className="text-ink-faint">National Ambulance Service</span></li>
                <li><a href="#technology" className="hover:text-ink transition-colors">Open Tech Stack</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-faint font-mono">
          <div className="flex items-center gap-2">
            <span>© {currentYear} IERBMS. All rights reserved.</span>
            <span>·</span>
            <span className="text-ink-muted">Built for Ghana's emergency healthcare ecosystem.</span>
          </div>
          <p className="text-right">
            * Simulated figures and maps are modelled representations.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
