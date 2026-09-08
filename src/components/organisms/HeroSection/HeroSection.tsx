'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Grid, Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ShieldCheck, Star } from 'lucide-react';
import { ActionButton, SectionEyebrow } from '@/components/atoms';

const benefits = [
  'Automated fees & MoMo reconciliation',
  'Instant attendance SMS to every parent',
  'Error-free terminal report cards',
];

const slides = [
  {
    id: 'fees',
    image: '/teacher_with_laptop.jpg',
    caption: 'Mobile Money fee automation',
  },
  {
    id: 'academics',
    image: '/students_running_to_school.jpg',
    caption: 'Attendance & parent SMS alerts',
  },
  {
    id: 'attendance',
    image: '/mother_child_phone.jpg',
    caption: 'Parent portal on any phone',
  },
];

export const HeroSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  const active = slides[currentSlide];

  const scrollToFeatures = () => {
    const el = document.getElementById('school-erp');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Box
      component="section"
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #fbfcfe 0%, #ffffff 55%)',
        borderBottom: '1px solid #eef2f7',
      }}
    >
      {/* Ambient brand glow */}
      <Box
        style={{
          position: 'absolute',
          top: -180,
          right: -140,
          width: 560,
          height: 560,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 26, 43, 0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle grid */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(circle at 72% 12%, black 0%, transparent 62%)',
          WebkitMaskImage: 'radial-gradient(circle at 72% 12%, black 0%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />

      <Container
        size="xl"
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: 'clamp(48px, 8vh, 92px)',
          paddingBottom: 'clamp(56px, 9vh, 104px)',
        }}
      >
        <Grid gutter={{ base: 40, lg: 56 }} align="center">
          {/* Left: message */}
          <Grid.Col span={{ base: 12, lg: 5 }}>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Stack gap="lg">
                <SectionEyebrow label="School ERP · Trusted since 2014" align="left" />

                <h1
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 'clamp(2.2rem, 3.6vw, 3.4rem)',
                    lineHeight: 1.08,
                    letterSpacing: '-0.03em',
                    color: '#0f172a',
                    margin: 0,
                  }}
                >
                  Run your entire school on{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #f0566a 0%, #e01a2b 55%, #a80d1a 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    one trusted platform
                  </span>
                </h1>

                <Text
                  style={{
                    color: '#475569',
                    fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
                    lineHeight: 1.65,
                    maxWidth: 520,
                  }}
                >
                  Fastrack EduSuite unifies admissions, attendance, fees, grading, and parent
                  communication — so your team spends less time on paperwork and more time running a
                  great school.
                </Text>

                <Stack gap={10} mt={4}>
                  {benefits.map((item) => (
                    <Group key={item} gap="sm" wrap="nowrap">
                      <CheckCircle2 size={18} color="#e01a2b" style={{ flexShrink: 0 }} />
                      <Text size="sm" fw={500} c="#334155">
                        {item}
                      </Text>
                    </Group>
                  ))}
                </Stack>

                <Group gap="md" mt="xs">
                  <ActionButton
                    href="/coming-soon"
                    variantStyle="primary"
                    size="md"
                    withArrow
                    style={{
                      height: 50,
                      paddingLeft: 26,
                      paddingRight: 26,
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #e01a2b 0%, #a80d1a 100%)',
                      boxShadow: '0 12px 26px -10px rgba(224, 26, 43, 0.6)',
                    }}
                  >
                    Get Started
                  </ActionButton>
                  <ActionButton
                    variantStyle="secondary"
                    size="md"
                    onClick={scrollToFeatures}
                    style={{ height: 50, paddingLeft: 22, paddingRight: 22, fontSize: '1rem', fontWeight: 600 }}
                  >
                    Explore School ERP
                  </ActionButton>
                </Group>

                <Group gap="xl" mt="sm">
                  <Group gap={6} wrap="nowrap">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                    ))}
                    <Text size="sm" fw={600} c="#334155" ml={4}>
                      Trusted by 260+ schools
                    </Text>
                  </Group>
                  <Group gap={6} wrap="nowrap">
                    <ShieldCheck size={16} color="#16a34a" />
                    <Text size="sm" c="dimmed">
                      Bank-grade security
                    </Text>
                  </Group>
                </Group>
              </Stack>
            </motion.div>
          </Grid.Col>

          {/* Right: rotating slide images */}
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Box style={{ position: 'relative' }}>
                <Box
                  style={{
                    position: 'absolute',
                    inset: '-6% -4%',
                    background: 'radial-gradient(circle at 60% 40%, rgba(224, 26, 43, 0.12), transparent 60%)',
                    filter: 'blur(34px)',
                    pointerEvents: 'none',
                  }}
                />

                <Box
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  style={{
                    position: 'relative',
                    borderRadius: 24,
                    overflow: 'hidden',
                    aspectRatio: '4 / 3',
                    border: '1px solid #e8edf3',
                    boxShadow: '0 30px 60px -22px rgba(15, 23, 42, 0.32)',
                    background: '#0b0f17',
                  }}
                >
                  <AnimatePresence mode="sync">
                    <motion.div
                      key={active.id}
                      initial={{ opacity: 0, scale: 1.06 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: 'easeInOut' }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${active.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  </AnimatePresence>

                  {/* Bottom gradient + caption */}
                  <Box
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, transparent 45%, rgba(11, 15, 23, 0.72) 100%)',
                      pointerEvents: 'none',
                    }}
                  />
                  <Group
                    justify="space-between"
                    align="center"
                    style={{ position: 'absolute', left: 20, right: 20, bottom: 18 }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={active.id + '-cap'}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.35 }}
                      >
                        <Group gap={8} wrap="nowrap">
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 10px #22c55e',
                            }}
                          />
                          <Text size="sm" fw={600} c="#ffffff">
                            {active.caption}
                          </Text>
                        </Group>
                      </motion.div>
                    </AnimatePresence>

                    <Group gap={6} wrap="nowrap">
                      {slides.map((s, idx) => {
                        const isCurrent = idx === currentSlide;
                        return (
                          <UnstyledButton
                            key={s.id}
                            onClick={() => setCurrentSlide(idx)}
                            aria-label={`Go to slide ${idx + 1}`}
                            style={{ padding: 3 }}
                          >
                            <motion.div
                              animate={{
                                width: isCurrent ? 24 : 8,
                                backgroundColor: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.45)',
                              }}
                              transition={{ duration: 0.3 }}
                              style={{ height: 7, borderRadius: 999 }}
                            />
                          </UnstyledButton>
                        );
                      })}
                    </Group>
                  </Group>
                </Box>
              </Box>
            </motion.div>
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
};

