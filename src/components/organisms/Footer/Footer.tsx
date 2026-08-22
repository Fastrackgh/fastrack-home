'use client';

import React from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  Stack,
  Text,
  Group,
  Divider,
} from '@mantine/core';
import { BrandLogo } from '@/components/atoms';
import { businessInfo } from '@/data/businessInfo';
import { Phone, Mail, MapPin, Navigation, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      style={{
        background: '#0b0f17',
        color: '#ffffff',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingTop: '64px',
        paddingBottom: '36px',
      }}
    >
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xl" mb="xl">
          {/* Column 1: Brand & Bio */}
          <Stack gap="md">
            <BrandLogo variant="dark" size="md" withTagline />
            <Text size="xs" style={{ color: '#94a3b8', lineHeight: 1.6 }}>
              A leading ICT consultancy and software engineering provider in Accra, Ghana.
              Delivering high-impact, value-driven technology solutions since 2014.
            </Text>
          </Stack>

          {/* Column 2: School ERP Modules */}
          <Stack gap="sm">
            <Text size="sm" fw={700} style={{ color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fastrack EduSuite
            </Text>
            {[
              'Student Admissions & Biodata',
              'Academic Grading & Reports',
              'Tuition Fees & MoMo Auditing',
              'Integrated Bulk SMS Gateway',
              'Mobile Portals (Parents & Staff)',
              'Staff Payroll & SSNIT Compliance',
            ].map((item, idx) => (
              <Text key={idx} size="xs" style={{ color: '#94a3b8', lineHeight: 1.5 }}>
                {item}
              </Text>
            ))}
          </Stack>

          {/* Column 3: Corporate Services */}
          <Stack gap="sm">
            <Text size="sm" fw={700} style={{ color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Enterprise Services
            </Text>
            {businessInfo.services.map((svc) => (
              <Text key={svc.id} size="xs" style={{ color: '#94a3b8', lineHeight: 1.5 }}>
                {svc.title}
              </Text>
            ))}
          </Stack>

          {/* Column 4: Contact & Office */}
          <Stack gap="sm">
            <Text size="sm" fw={700} style={{ color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Corporate Office
            </Text>

            <Group gap="xs" wrap="nowrap" align="flex-start">
              <MapPin size={15} color="#e01a2b" style={{ flexShrink: 0, marginTop: 2 }} />
              <Text size="xs" style={{ color: '#cbd5e1' }}>
                {businessInfo.poBox}
              </Text>
            </Group>

            <Group gap="xs" wrap="nowrap" align="flex-start">
              <Navigation size={15} color="#e01a2b" style={{ flexShrink: 0, marginTop: 2 }} />
              <Text size="xs" style={{ color: '#cbd5e1' }}>
                Digital Address: {businessInfo.digitalAddress}
              </Text>
            </Group>

            <Group gap="xs" wrap="nowrap" align="center">
              <Phone size={15} color="#e01a2b" style={{ flexShrink: 0 }} />
              <Text
                component="a"
                href={`tel:${businessInfo.phoneRaw}`}
                size="xs"
                style={{ color: '#cbd5e1', textDecoration: 'none' }}
              >
                Tel: {businessInfo.phone}
              </Text>
            </Group>

            <Group gap="xs" wrap="nowrap" align="center">
              <Mail size={15} color="#e01a2b" style={{ flexShrink: 0 }} />
              <Text
                component="a"
                href={`mailto:${businessInfo.email}`}
                size="xs"
                style={{ color: '#cbd5e1', textDecoration: 'none' }}
              >
                {businessInfo.email}
              </Text>
            </Group>
          </Stack>
        </SimpleGrid>

        <Divider my="lg" color="rgba(255, 255, 255, 0.08)" />

        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <Text size="xs" style={{ color: '#64748b' }}>
            © {new Date().getFullYear()} Fastrack Management Services. All rights reserved. Mallam – Accra, Ghana.
          </Text>

          <Group gap="lg">
            <Link href="/coming-soon" style={{ textDecoration: 'none' }}>
              <Text size="xs" style={{ color: '#e01a2b', fontWeight: 600 }}>
                Join School Waitlist →
              </Text>
            </Link>
          </Group>
        </Group>
      </Container>
    </Box>
  );
};
