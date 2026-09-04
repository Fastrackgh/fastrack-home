'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Stack,
  Group,
  Text,
  Grid,
  Badge,
} from '@mantine/core';
import { BrandLogo } from '@/components/atoms';
import { CountdownUnit } from '@/components/molecules';
import { WaitlistForm } from '@/components/organisms';
import {
  Home,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
  GraduationCap,
  CreditCard,
  MessageSquare,
  MapPin,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { businessInfo } from '@/data/businessInfo';
import { motion } from 'framer-motion';

export const ComingSoonTemplate: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 45,
    hours: 18,
    minutes: 24,
    seconds: 30,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        paddingTop: 'clamp(16px, 3vw, 24px)',
        paddingBottom: 'clamp(48px, 6vw, 80px)',
      }}
    >
      {/* 1. Header Navigation Bar */}
      <Container size="xl" mb={{ base: 24, md: 36 }}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <BrandLogo variant="light" size="md" withTagline />

          <Link href="/" style={{ textDecoration: 'none' }}>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Group
                gap={6}
                style={{
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#0f172a',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Home size={16} color="#ea580c" />
                <span>Home</span>
              </Group>
            </motion.div>
          </Link>
        </Group>
      </Container>

      {/* 2. Hero Headline & Countdown Section */}
      <Container size="xl">
        <Stack align="center" gap="xs" mb={{ base: 28, md: 44 }} style={{ textAlign: 'center' }}>
          <Badge
            size="sm"
            variant="light"
            style={{
              background: '#fff7ed',
              color: '#ea580c',
              border: '1px solid #fed7aa',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 700,
              padding: '6px 14px',
              height: 'auto',
            }}
          >
            Fastrack EduSuite • National Launch
          </Badge>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(1.85rem, 3.6vw, 2.9rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              maxWidth: '780px',
              color: '#0f172a',
              margin: '0 auto',
            }}
          >
            Transforming School Operations Across Ghana
          </h1>

          <Text
            size="md"
            style={{
              maxWidth: 620,
              lineHeight: 1.6,
              color: '#64748b',
              margin: '0 auto',
              fontSize: 'clamp(0.88rem, 1.2vw, 1rem)',
            }}
          >
            We are finalizing national cloud deployment. Reserve priority onboarding for your school to receive complimentary data migration, staff training, and bulk SMS credits.
          </Text>

          {/* Launch Countdown Ticker */}
          <Group gap={8} justify="center" mt="sm" wrap="nowrap">
            <CountdownUnit value={timeLeft.days} label="Days" />
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            <CountdownUnit value={timeLeft.minutes} label="Mins" />
            <CountdownUnit value={timeLeft.seconds} label="Secs" />
          </Group>
        </Stack>

        {/* 3. Main Two-Column Layout (Form on Left, Perks & Support on Right) */}
        <Grid gutter={{ base: 'md', md: 'xl' }} align="start">
          {/* Left Column: Waitlist Form */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <WaitlistForm />
          </Grid.Col>

          {/* Right Column: Early Adopter Perks & Support Info */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="md">
              {/* Early Adopter VIP Perks Box */}
              <Box
                style={{
                  padding: 'clamp(18px, 2.5vw, 24px)',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <Group gap="xs" mb="sm" align="center">
                  <Box
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: '#fff7ed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={16} color="#ea580c" />
                  </Box>
                  <Text
                    size="xs"
                    fw={800}
                    style={{
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    Priority Onboarding Benefits
                  </Text>
                </Group>

                <Stack gap={10}>
                  {[
                    '3 Months Complimentary Bulk SMS Credits',
                    '100% Free Legacy Student Data Migration',
                    'Dedicated On-Site Training Specialist in Accra',
                    'Automated Staff Payroll & GRA/SSNIT Schedules',
                    'Guaranteed Lifetime Discounted Cloud Licensing',
                  ].map((perk, idx) => (
                    <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
                      <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                      <Text size="xs" fw={500} style={{ color: '#334155', lineHeight: 1.45 }}>
                        {perk}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>

              {/* Modules Ready in Fastrack EduSuite */}
              <Box
                style={{
                  padding: 'clamp(18px, 2.5vw, 24px)',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  mb="sm"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  EduSuite Modules in Staging
                </Text>

                <Stack gap={8}>
                  {[
                    { title: 'Continuous Assessment & Report Cards', icon: <GraduationCap size={15} color="#f97316" />, tag: 'Ready' },
                    { title: 'Mobile Money Fee Reconciliation', icon: <CreditCard size={15} color="#16a34a" />, tag: 'Ready' },
                    { title: 'Morning Attendance & Bulk SMS', icon: <MessageSquare size={15} color="#ea580c" />, tag: 'Ready' },
                    { title: 'Staff Payroll & GRA/SSNIT Filing', icon: <Building2 size={15} color="#2563eb" />, tag: 'Ready' },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        {item.icon}
                        <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                          {item.title}
                        </Text>
                      </Group>
                      <Badge size="xs" variant="light" color="green" style={{ fontSize: '9px' }}>
                        {item.tag}
                      </Badge>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Direct Support & Accra Office Box */}
              <Box
                style={{
                  padding: 'clamp(16px, 2vw, 20px)',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.03)',
                }}
              >
                <Text
                  size="xs"
                  fw={700}
                  c="dimmed"
                  mb="xs"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Direct Consultation & Inquiries
                </Text>

                <Stack gap={8}>
                  <Group gap={8} wrap="nowrap">
                    <Phone size={14} color="#ea580c" style={{ flexShrink: 0 }} />
                    <Text
                      component="a"
                      href={`tel:${businessInfo.phoneRaw}`}
                      size="xs"
                      fw={700}
                      style={{ color: '#0f172a', textDecoration: 'none' }}
                    >
                      {businessInfo.phone}
                    </Text>
                  </Group>

                  <Group gap={8} wrap="nowrap">
                    <Mail size={14} color="#ea580c" style={{ flexShrink: 0 }} />
                    <Text
                      component="a"
                      href={`mailto:${businessInfo.email}`}
                      size="xs"
                      fw={600}
                      style={{ color: '#0f172a', textDecoration: 'none' }}
                    >
                      {businessInfo.email}
                    </Text>
                  </Group>

                  <Group gap={8} wrap="nowrap">
                    <MapPin size={14} color="#ea580c" style={{ flexShrink: 0 }} />
                    <Text size="xs" c="dimmed">
                      {businessInfo.digitalAddress} • Mallam – Accra, Ghana
                    </Text>
                  </Group>
                </Stack>
              </Box>
            </Stack>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
};
