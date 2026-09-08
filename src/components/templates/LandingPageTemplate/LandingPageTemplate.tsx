'use client';

import React from 'react';
import { Box } from '@mantine/core';
import {
  HeroSection,
  TrustBar,
  DashboardShowcaseSection,
  SchoolFeaturesSection,
  ServicesGridSection,
  PartnershipSection,
  AboutSection,
  ContactSection,
  CTASection,
} from '@/components/organisms';

export const LandingPageTemplate: React.FC = () => {
  return (
    <Box>
      {/* 1. High Impact Hero */}
      <HeroSection />

      {/* 2. Live Dashboard Product Preview */}
      <DashboardShowcaseSection />

      {/* 3. Trust Bar Metrics & Longevity */}
      <TrustBar />

      {/* 3. Flagship School Management Modules */}
      <SchoolFeaturesSection />

      {/* 4. Comprehensive Corporate Services */}
      <ServicesGridSection />

      {/* 5. Enterprise Cloud & Data Security Architecture */}
      <PartnershipSection />

      {/* 6. About Fastrack, Mission, Vision, and Values */}
      <AboutSection />

      {/* 7. Accra Corporate Office & Consultation Request */}
      <ContactSection />

      {/* 8. Final Early Adopter CTA Banner */}
      <CTASection />
    </Box>
  );
};

