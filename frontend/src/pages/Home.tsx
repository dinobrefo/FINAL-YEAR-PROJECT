import React from 'react';
import { Navbar } from '../components/landing/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { ScrollStory } from '../components/landing/ScrollStory';
import { LiveSystemOverview } from '../components/landing/LiveSystemOverview';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { HowItWorks } from '../components/landing/HowItWorks';
import { ImpactMetrics } from '../components/landing/ImpactMetrics';
import { GhanaNetwork } from '../components/landing/GhanaNetwork';
import { TechnologySection } from '../components/landing/TechnologySection';
import { DashboardPreview } from '../components/landing/DashboardPreview';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#06111F] text-[#F8FAFC] font-sans antialiased selection:bg-primary/30 selection:text-white">
      <Navbar />
      <main>
        <HeroSection />
        <ScrollStory />
        <LiveSystemOverview />
        <FeaturesSection />
        <HowItWorks />
        <ImpactMetrics />
        <GhanaNetwork />
        <TechnologySection />
        <DashboardPreview />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
