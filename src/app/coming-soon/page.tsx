import React from 'react';
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates';

export const metadata: Metadata = {
  title: 'Coming Soon | Fastrack EduSuite School Management System',
  description:
    'Join the priority waitlist for Fastrack EduSuite ERP. Early adopter schools receive 3 months complimentary SMS credits and free data migration.',
};

export default function ComingSoonPage() {
  return <ComingSoonTemplate />;
}
