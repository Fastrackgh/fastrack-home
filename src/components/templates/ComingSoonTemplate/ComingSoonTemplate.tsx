'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Stack,
  Group,
  Text,
  SimpleGrid,
  Badge,
} from '@mantine/core';
import { BrandLogo, StatusBadge } from '@/components/atoms';
import { CountdownUnit } from '@/components/molecules';
import { WaitlistForm } from '@/components/organisms';
import {
  ArrowLeft,
  Phone,
  Mail,
  ShieldCheck,
  Zap,
  GraduationCap,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { businessInfo } from '@/data/businessInfo';

export const ComingSoonTemplate: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 60,
    hours: 14,
    minutes: 35,
    seconds: 42,
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
        background: '#ffffff',
        color: '#0f172a',
        paddingTop: '24px',
        paddingBottom: '80px',
      }}
    >
      {/* Top Header / Navigation */}
      <Container size="xl" mb={{ base: 36, md: 48 }}>
        <Group justify="space-between" align="center">
          <BrandLogo variant="light" size="md" withTagline />

          <Link href="/" style={{ textDecoration: 'none' }}>
            <Group
              gap="xs"
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Homepage</span>
            </Group>
          </Link>
        </Group>
      </Container>

      <Container size="xl">
        <Stack align="center" gap="md" mb={{ base: 36, md: 48 }} style={{ textAlign: 'center' }}>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(2rem, 3.8vw, 3rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              textAlign: 'center',
              maxWidth: '780px',
              color: '#0f172a',
              margin: 0,
            }}
          >
            Fastrack is Launching Soon
          </h1>

          <Text
            size="md"
            c="dimmed"
            style={{
              maxWidth: 640,
              lineHeight: 1.6,
              fontFamily: 'var(--font-inter)',
            }}
          >
            We are finalizing deployment for our cloud school management platform. Request early access below to reserve priority onboarding for your institution.
          </Text>

          {/* Launch Countdown Ticker */}
          <Group gap="sm" justify="center" mt="xs">
            <CountdownUnit value={timeLeft.days} label="Days" />
            <CountdownUnit value={timeLeft.hours} label="Hours" />
            <CountdownUnit value={timeLeft.minutes} label="Minutes" />
            <CountdownUnit value={timeLeft.seconds} label="Seconds" />
          </Group>
        </Stack>

        {/* Waitlist Form and Early Access Perks Grid */}
        <SimpleGrid cols={{ base: 1, md: 12 }} spacing="xl">
          {/* Left: Waitlist Form */}
          <Box style={{ gridColumn: 'span 7' }}>
            <WaitlistForm />
          </Box>

          {/* Right: Early Access Benefits */}
          <Box style={{ gridColumn: 'span 5' }}>
            <Stack gap="md">
              {/* Early Adopter VIP Perks Box */}
              <Box
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Group gap="xs" mb="sm">
                  <Zap size={16} color="#e01a2b" />
                  <Text size="xs" fw={700} style={{ color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-heading)' }}>
                    Early Adopter Program Benefits
                  </Text>
                </Group>

                <Stack gap="xs">
                  {[
                    '3 Months Complimentary Bulk SMS Credits',
                    'Zero-Fee Legacy Student Data Migration',
                    'Dedicated Fastrack On-Site Training Specialist',
                    'Automated Staff Payroll & GRA/SSNIT Schedule Generator',
                    'Guaranteed Lifetime Discounted Cloud Licensing',
                  ].map((perk, idx) => (
                    <Group key={idx} gap="xs" wrap="nowrap" align="flex-start">
                      <ShieldCheck size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                      <Text size="xs" fw={500} style={{ color: '#334155', lineHeight: 1.4 }}>
                        {perk}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Box>

              {/* Modules in Staging */}
              <Box
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase' }}>
                  Modules Ready for Launch
                </Text>

                <Stack gap="xs">
                  {[
                    { title: 'Automated GPA & Terminal Reports', icon: <GraduationCap size={15} color="#64748b" /> },
                    { title: 'MoMo & Cashbook Reconciliation', icon: <CreditCard size={15} color="#64748b" /> },
                    { title: 'Parent Portal & Instant SMS Dispatcher', icon: <MessageSquare size={15} color="#64748b" /> },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Group gap="xs">
                        {item.icon}
                        <Text size="xs" fw={600} style={{ color: '#0f172a' }}>
                          {item.title}
                        </Text>
                      </Group>
                      <Badge size="xs" variant="outline" color="green" style={{ fontSize: '8px' }}>
                        Ready
                      </Badge>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {/* Support Contact Box */}
              <Box
                style={{
                  padding: '16px 20px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase' }}>
                  Consultation & Inquiries
                </Text>
                <Group gap="md">
                  <Group gap={6}>
                    <Phone size={13} color="#e01a2b" />
                    <Text
                      component="a"
                      href={`tel:${businessInfo.phoneRaw}`}
                      size="xs"
                      fw={600}
                      style={{ color: '#0f172a', textDecoration: 'none' }}
                    >
                      {businessInfo.phone}
                    </Text>
                  </Group>
                  <Group gap={6}>
                    <Mail size={13} color="#e01a2b" />
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
                </Group>
              </Box>
            </Stack>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
};
