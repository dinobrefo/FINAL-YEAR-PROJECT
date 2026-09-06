import React from 'react';
import { motion } from 'framer-motion';
import { Section } from '../ui/Section';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Emergency Occurs",
      body: "Distress call is logged with GPS coordinates and caller information.",
    },
    {
      num: "02",
      title: "Ambulance Dispatched",
      body: "Nearest operational ambulance unit is assigned and deployed immediately.",
    },
    {
      num: "03",
      title: "Patient Data Captured",
      body: "Paramedics enter vital signs and SATS/TEWS clinical triage assessment.",
    },
    {
      num: "04",
      title: "Intelligent Matching",
      body: "AI models rank hospitals on capacity, capabilities, and transit time.",
    },
    {
      num: "05",
      title: "Navigation Generated",
      body: "Turn-by-turn road route snaps to live traffic avoiding congestion.",
    },
    {
      num: "06",
      title: "Hospital Prepares",
      body: "Receiving ER locks emergency bed and trauma team prepares for arrival.",
    },
    {
      num: "07",
      title: "Patient Arrives",
      body: "Direct bedside handover with digital vitals transfer and audit logging.",
    },
  ];

  return (
    <Section
      id="how-it-works"
      eyebrow="Workflow"
      title="One connected emergency journey"
      intro="From incident call to bedside clinical handover, each second is synchronized across the national network."
    >
      {/* Desktop Horizontal Connected Timeline (lg+) */}
      <div className="hidden lg:block relative py-8">
        {/* Continuous Gradient Hairline Connector Line */}
        <div className="absolute top-[52px] left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent pointer-events-none" />

        <ol className="grid grid-cols-7 gap-4 relative z-10">
          {steps.map((step, idx) => (
            <motion.li
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
              className="flex flex-col items-center text-center space-y-3"
            >
              <div className="h-10 w-10 rounded-full border border-primary/50 bg-[#081827] flex items-center justify-center text-xs font-mono font-bold text-primary shadow-glow">
                {step.num}
              </div>
              <h4 className="text-sm font-semibold text-ink leading-tight">
                {step.title}
              </h4>
              <p className="text-xs text-ink-muted leading-relaxed">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>
      </div>

      {/* Mobile & Tablet Vertical Timeline (< lg) */}
      <div className="lg:hidden border-l border-primary/30 ml-4 pl-6 space-y-8 py-2">
        {steps.map((step, idx) => (
          <motion.div
            key={step.num}
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: idx * 0.06, duration: 0.4 }}
            className="relative space-y-1.5"
          >
            <div className="absolute -left-[35px] top-0 h-7 w-7 rounded-full border border-primary/50 bg-[#081827] flex items-center justify-center text-[10px] font-mono font-bold text-primary">
              {step.num}
            </div>
            <h4 className="text-base font-semibold text-ink">
              {step.title}
            </h4>
            <p className="text-sm text-ink-muted leading-relaxed">
              {step.body}
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
};

export default HowItWorks;
