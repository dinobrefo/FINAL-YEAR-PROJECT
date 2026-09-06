import React from 'react';
import { motion } from 'framer-motion';
import { Section } from '../ui/Section';
import { Navigation, BedDouble, Radio, BellRing, BarChart3 } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: Navigation,
      title: "Intelligent Routing",
      body: "Ranks hospitals on travel time, real-time capacity, patient severity and clinical capability — never just proximity.",
    },
    {
      icon: BedDouble,
      title: "Real-Time Bed Management",
      body: "Live visibility into general, emergency, ICU, trauma and pediatric capacity, updated by authorised hospital staff.",
    },
    {
      icon: Radio,
      title: "Live Ambulance Tracking",
      body: "Location, heading, speed, mission state and ETA streamed over authenticated WebSockets.",
    },
    {
      icon: BellRing,
      title: "Instant Hospital Alerts",
      body: "Destination hospitals are notified before arrival with severity, type, ETA and required resources.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Intelligence",
      body: "Every metric is aggregated from real emergency records — response time, turnaround, occupancy, load.",
    },
  ];

  return (
    <Section
      id="features"
      eyebrow="Capabilities"
      title="Smarter decisions. Stronger emergency systems."
      intro="Five connected capabilities built to modernize emergency response operations across Ghana."
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <motion.article
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              className="panel p-6 sm:p-7 space-y-4 hover:border-white/20 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
                <Icon className="h-5 w-5 text-primary" />
              </div>

              <h3 className="text-xl font-semibold text-ink tracking-tight">
                {feat.title}
              </h3>

              <p className="text-sm text-ink-muted leading-relaxed">
                {feat.body}
              </p>
            </motion.article>
          );
        })}
      </div>
    </Section>
  );
};

export default FeaturesSection;
