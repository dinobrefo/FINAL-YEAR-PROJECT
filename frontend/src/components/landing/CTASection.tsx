import React from 'react';
import { Link } from 'react-router';
import { ArrowRight, Mail } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <section id="cta" className="relative py-24 sm:py-32 overflow-hidden bg-[#06111F]">
      {/* Background Faint Grid */}
      <div className="absolute inset-0 bg-grid [background-size:44px_44px] opacity-35 pointer-events-none" />

      {/* Large Centered Ambient Red Glow Blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[150px] pointer-events-none" />

      <div className="container-page relative z-10 flex flex-col items-center text-center space-y-8">
        <div className="eyebrow text-primary font-semibold">Ready for deployment</div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-ink max-w-2xl leading-tight">
          The future of emergency response starts with connection.
        </h2>

        <p className="max-w-xl text-ink-muted sm:text-lg leading-relaxed">
          Transform clinical resource visibility and ambulance dispatching across Ghana with zero commercial API licensing overhead.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="mailto:contact@ierbms.gov.gh?subject=IERBMS%20Implementation%20Demo%20Request"
            className="btn-primary px-7 py-3.5 text-sm font-semibold gap-2"
          >
            <Mail className="h-4 w-4" />
            <span>Request Demo</span>
          </a>

          <Link
            to="/login"
            className="btn-ghost px-7 py-3.5 text-sm font-medium gap-2"
          >
            <span>Explore Platform</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
