'use client';

import React from 'react';
import { Box } from '@mantine/core';
import {
  HeroSection,
  TrustBar,
  SchoolFeaturesSection,
  ServicesGridSection,
  PartnershipSection,
  BusinessInsightsSection,
  AboutSection,
  ContactSection,
  CTASection,
} from '@/components/organisms';

export const LandingPageTemplate: React.FC = () => {
  return (
    <Box>
      {/* 1. High Impact Hero with Live Dashboard Preview */}
      <HeroSection />

      {/* 2. Trust Bar Metrics & Longevity */}
      <TrustBar />

      {/* 3. Flagship School Management Modules (Admissions, Academics, Fees, SMS, Payroll & Governance) */}
      <SchoolFeaturesSection />

      {/* 4. Comprehensive Corporate Services (IT Consultancy, DB, Mobile, Software, SMS, Auditing) */}
      <ServicesGridSection />

      {/* 5. Enterprise Cloud & Data Security Architecture (256-Bit SSL, GES Alignment, Backups) */}
      <PartnershipSection />

      {/* 6. Business Intelligence, Dashboards & Mobile Freedom */}
      <BusinessInsightsSection />

      {/* 7. About Fastrack, Mission, Vision, and Values */}
      <AboutSection />

      {/* 8. Accra Corporate Office & Consultation Request */}
      <ContactSection />

      {/* 9. Final Early Adopter CTA Banner */}
      <CTASection />
    </Box>
  );
};
