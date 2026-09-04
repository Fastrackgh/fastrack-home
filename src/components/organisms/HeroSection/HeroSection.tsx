'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Stack, Group, Text, Badge, UnstyledButton } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { ActionButton } from '@/components/atoms';
import { DashboardPreview } from '@/components/organisms/DashboardPreview/DashboardPreview';
import {
  ShieldCheck,
  GraduationCap,
  CreditCard,
  MessageSquare,
  Users,
} from 'lucide-react';

interface HeroSlide {
  id: string;
  badge: string;
  badgeColor: string;
  badgeIcon: React.ReactNode;
  titlePrefix: string;
  titleHighlight: string;
  titleHighlightColor: string;
  subtitle: string;
  bgImage: string;
  chips: string[];
}

const slides: HeroSlide[] = [
  {
    id: 'fees-momo',
    badge: 'Mobile Money Fee Automation',
    badgeColor: '#f97316',
    badgeIcon: <CreditCard size={14} color="#f97316" />,
    titlePrefix: 'Collect School Fees with Zero Leakages via ',
    titleHighlight: 'MoMo & Bank Gateways',
    titleHighlightColor: '#f97316',
    subtitle:
      'Parents pay tuition effortlessly via MTN Mobile Money and Telecel Cash. Bursars get instant payment receipts, automated debtor lists, and real-time reconciled cashbooks.',
    bgImage: '/teacher_with_laptop.jpg',
    chips: ['Instant MoMo SMS Receipts', 'Automatic Cashbook Reconciliation', 'Zero Fee Leakages'],
  },
  {
    id: 'academics-grading',
    badge: 'Automated Academic Grading',
    badgeColor: '#e01a2b',
    badgeIcon: <GraduationCap size={14} color="#e01a2b" />,
    titlePrefix: 'Generate Error-Free Terminal Report Cards in ',
    titleHighlight: 'Just a Few Clicks',
    titleHighlightColor: '#ff4d5e',
    subtitle:
      'Teachers enter continuous assessment scores on phone or laptop. Fastrack automatically computes GPAs, class positions, and remarks aligned with GES and Cambridge standards.',
    bgImage: '/students_running_to_school.jpg',
    chips: ['GES & Cambridge Aligned', 'Instant Report Card Printing', 'Automated GPA Computation'],
  },
  {
    id: 'attendance-sms',
    badge: 'Attendance & Parent Alerts',
    badgeColor: '#f97316',
    badgeIcon: <MessageSquare size={14} color="#f97316" />,
    titlePrefix: 'Keep Every Parent Connected with Instant ',
    titleHighlight: 'Morning Attendance SMS',
    titleHighlightColor: '#f97316',
    subtitle:
      'Mark morning attendance in under 30 seconds. Parents receive instant SMS notifications when their wards arrive, increasing parent trust and student accountability.',
    bgImage: '/mother_child_phone.jpg',
    chips: ['Instant Morning SMS Alerts', 'Custom School Sender ID', 'Parent Portal on Phone'],
  },
  {
    id: 'admissions-payroll',
    badge: 'Student Biodata & Staff Payroll',
    badgeColor: '#38bdf8',
    badgeIcon: <Users size={14} color="#38bdf8" />,
    titlePrefix: '100% Paperless Student Records & ',
    titleHighlight: 'Automated SSNIT/GRA Payroll',
    titleHighlightColor: '#38bdf8',
    subtitle:
      'Maintain comprehensive student academic and medical biodata in one central repository, while generating monthly GRA PAYE and SSNIT deduction schedules with zero manual math.',
    bgImage: '/school_assembly.jpg',
    chips: ['100% Paperless Biodata', 'GRA PAYE & SSNIT Ready', 'Multi-Campus Consolidation'],
  },
];

export const HeroSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  const goToSlide = (idx: number) => {
    setCurrentSlide(idx);
  };

  // Autoplay timer: changes slide smoothly every 7 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 7000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  const scrollToFeatures = () => {
    const el = document.getElementById('school-erp');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const active = slides[currentSlide];

  return (
    <Box component="section">
      {/* 1. HERO SWIPER CONTAINER */}
      <Box
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 72px)',
          overflow: 'hidden',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Animated Background Image Swiper with Smooth Crossfade */}
        <AnimatePresence mode="sync">
          <motion.div
            key={active.id + '-bg'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${active.bgImage})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
              zIndex: 0,
            }}
          />
        </AnimatePresence>

        {/* Clean, high-contrast dark overlay for optimal text readability */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background: 'rgba(15, 23, 42, 0.72)',
            pointerEvents: 'none',
          }}
        />

        {/* Main Swiper Content Stage */}
        <Container
          size="xl"
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            paddingTop: 'clamp(44px, 8vh, 76px)',
            paddingBottom: 'clamp(56px, 9vh, 88px)',
          }}
        >
          {/* Smooth Text Transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <Stack align="center" gap="md" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
                {/* Category Badge */}
                <Box
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 16px',
                    borderRadius: '999px',
                    background: 'rgba(15, 23, 42, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: 'none',
                  }}
                >
                  {active.badgeIcon}
                  <Text
                    size="xs"
                    fw={700}
                    style={{
                      color: '#ffffff',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontSize: '0.78rem',
                    }}
                  >
                    {active.badge}
                  </Text>
                </Box>

                {/* Main Headline */}
                <h1
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 'clamp(2rem, 4.2vw, 3.6rem)',
                    lineHeight: 1.16,
                    letterSpacing: '-0.03em',
                    textAlign: 'center',
                    color: '#ffffff',
                    margin: 0,
                    textShadow: '0 2px 14px rgba(0, 0, 0, 0.7)',
                  }}
                >
                  {active.titlePrefix}
                  <span style={{ color: active.titleHighlightColor }}>
                    {active.titleHighlight}
                  </span>
                </h1>

                {/* Subtitle Description */}
                <Text
                  size="lg"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    maxWidth: '740px',
                    textAlign: 'center',
                    lineHeight: 1.65,
                    fontSize: 'clamp(0.95rem, 1.5vw, 1.15rem)',
                    color: 'rgba(241, 245, 249, 0.92)',
                    textShadow: '0 1px 8px rgba(0, 0, 0, 0.6)',
                    margin: '0 auto',
                  }}
                >
                  {active.subtitle}
                </Text>

                {/* Key Benefits Chips */}
                <Group gap="xs" justify="center" wrap="wrap">
                  {active.chips.map((chip, idx) => (
                    <Badge
                      key={idx}
                      size="sm"
                      variant="light"
                      style={{
                        background: 'rgba(255, 255, 255, 0.12)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        textTransform: 'none',
                        fontWeight: 600,
                        padding: '6px 14px',
                      }}
                    >
                      ✓ {chip}
                    </Badge>
                  ))}
                </Group>

                {/* Action Buttons */}
                <Group
                  gap="md"
                  mt="xs"
                  justify="center"
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                  }}
                >
                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                    <ActionButton
                      href="/coming-soon"
                      variantStyle="primary"
                      size="md"
                      style={{
                        paddingLeft: 26,
                        paddingRight: 26,
                        height: 48,
                        fontSize: '0.98rem',
                        background: '#e01a2b',
                        boxShadow: 'none',
                      }}
                    >
                      Get Started (Early Access)
                    </ActionButton>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}>
                    <ActionButton
                      variantStyle="secondary"
                      size="md"
                      onClick={scrollToFeatures}
                      style={{
                        paddingLeft: 22,
                        paddingRight: 22,
                        height: 48,
                        fontSize: '0.98rem',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: 'none',
                      }}
                    >
                      View System Modules
                    </ActionButton>
                  </motion.div>
                </Group>

                {/* Trust Indicator */}
                <Group gap={6} mt={4} justify="center" wrap="nowrap">
                  <ShieldCheck size={16} color="#4ade80" />
                  <Text
                    size="xs"
                    fw={500}
                    style={{
                      color: '#cbd5e1',
                      fontSize: 'clamp(0.75rem, 1.2vw, 0.82rem)',
                    }}
                  >
                    Serving Ghanaian schools & corporate enterprises since 2014 • Mallam – Accra
                  </Text>
                </Group>
              </Stack>
            </motion.div>
          </AnimatePresence>
        </Container>

        {/* Clean Swiper Pagination Indicators (No Arrows) */}
        <Box
          style={{
            position: 'absolute',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3,
          }}
        >
          <Group gap={8} justify="center">
            {slides.map((s, idx) => {
              const isCurrent = idx === currentSlide;
              return (
                <UnstyledButton
                  key={s.id}
                  onClick={() => goToSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}`}
                  style={{
                    padding: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <motion.div
                    animate={{
                      width: isCurrent ? 32 : 10,
                      backgroundColor: isCurrent ? '#f97316' : 'rgba(255, 255, 255, 0.35)',
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{
                      height: 8,
                      borderRadius: 999,
                    }}
                  />
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>
      </Box>

      {/* 2. STANDALONE DASHBOARD PREVIEW SECTION — Clean, Non-AI Enterprise Presentation */}
      <Box
        id="live-preview"
        component="section"
        style={{
          background: '#0f172a',
          paddingTop: 'clamp(56px, 8vw, 88px)',
          paddingBottom: 'clamp(64px, 10vw, 96px)',
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <Container size="xl" style={{ position: 'relative', zIndex: 1, paddingLeft: 16, paddingRight: 16 }}>
          {/* Section header */}
          <Box style={{ textAlign: 'center', marginBottom: 'clamp(28px, 5vw, 48px)' }}>
            <Badge
              size="sm"
              variant="light"
              style={{
                background: 'rgba(249, 115, 22, 0.15)',
                color: '#fdba74',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Live System Demonstration
            </Badge>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.2vw, 2.75rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                margin: '0 auto 12px',
                maxWidth: 680,
              }}
            >
              Experience the{' '}
              <span style={{ color: '#f97316' }}>
                Fastrack EduSuite Interface
              </span>
            </h2>

            <Text
              size="md"
              style={{
                color: '#94a3b8',
                maxWidth: 560,
                margin: '0 auto',
                lineHeight: 1.6,
                fontSize: 'clamp(0.88rem, 1.2vw, 1rem)',
              }}
            >
              Explore how school administrators, bursars, and teachers manage admissions, fees, terminal grading, and bulk SMS in one unified workspace.
            </Text>
          </Box>

          {/* Clean Dashboard Card Wrapper */}
          <Box
            style={{
              position: 'relative',
              borderRadius: '16px',
              border: '1px solid #334155',
              boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.5)',
              background: '#ffffff',
              overflow: 'hidden',
            }}
          >
            <DashboardPreview fullWidth={false} />
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
