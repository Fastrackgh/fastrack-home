'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Group, Stack, Text, UnstyledButton } from '@mantine/core';
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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0f17',
      }}
    >
      {/* Full-screen crossfading background images */}
      <AnimatePresence mode="sync">
        <motion.div
          key={active.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${active.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
      </AnimatePresence>

      {/* Legibility overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background:
            'linear-gradient(180deg, rgba(11, 15, 23, 0.55) 0%, rgba(11, 15, 23, 0.72) 55%, rgba(11, 15, 23, 0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Ambient brand glow */}
      <Box
        style={{
          position: 'absolute',
          top: '18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 640,
          height: 420,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 26, 43, 0.20) 0%, transparent 70%)',
          filter: 'blur(70px)',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      <Container
        size="lg"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          paddingTop: 'clamp(56px, 10vh, 96px)',
          paddingBottom: 'clamp(72px, 12vh, 120px)',
        }}
      >
        <Stack align="center" gap="lg" style={{ maxWidth: 840, margin: '0 auto', textAlign: 'center' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id + '-eyebrow'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <SectionEyebrow label={active.caption} onDark />
            </motion.div>
          </AnimatePresence>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: 'clamp(2.3rem, 4.6vw, 3.85rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#ffffff',
              margin: 0,
              textShadow: '0 2px 18px rgba(0, 0, 0, 0.4)',
            }}
          >
            Run your entire school on{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #f0566a 0%, #e01a2b 55%, #ff6b7a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              one trusted platform
            </span>
          </h1>

          <Text
            style={{
              color: 'rgba(241, 245, 249, 0.92)',
              fontSize: 'clamp(1rem, 1.4vw, 1.2rem)',
              lineHeight: 1.65,
              maxWidth: 680,
              textShadow: '0 1px 10px rgba(0, 0, 0, 0.35)',
            }}
          >
            Fastrack EduSuite unifies admissions, attendance, fees, grading, and parent
            communication, so your team spends less time on paperwork and more time running a
            great school.
          </Text>

          <Group gap="sm" justify="center" wrap="wrap" mt={4}>
            {benefits.map((item) => (
              <Group
                key={item}
                gap={8}
                wrap="nowrap"
                px={14}
                py={7}
                style={{
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                }}
              >
                <CheckCircle2 size={14} color="#4ade80" style={{ flexShrink: 0 }} />
                <Text size="sm" fw={600} c="#f8fafc">
                  {item}
                </Text>
              </Group>
            ))}
          </Group>

          <Group gap="md" justify="center" mt="sm">
            <ActionButton
              href="/coming-soon"
              variantStyle="primary"
              size="md"
              withArrow
              style={{
                height: 52,
                paddingLeft: 28,
                paddingRight: 28,
                fontSize: '1rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #e01a2b 0%, #a80d1a 100%)',
                boxShadow: '0 14px 30px -10px rgba(224, 26, 43, 0.7)',
              }}
            >
              Get Started
            </ActionButton>
            <ActionButton
              variantStyle="secondary"
              size="md"
              onClick={scrollToFeatures}
              style={{
                height: 52,
                paddingLeft: 24,
                paddingRight: 24,
                fontSize: '1rem',
                fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.24)',
              }}
            >
              Explore School ERP
            </ActionButton>
          </Group>

          <Group gap="xl" justify="center" mt="lg">
            <Group gap={6} wrap="nowrap">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
              ))}
              <Text size="sm" fw={600} c="#f1f5f9" ml={4}>
                Trusted by 260+ schools
              </Text>
            </Group>
            <Group gap={6} wrap="nowrap">
              <ShieldCheck size={16} color="#4ade80" />
              <Text size="sm" c="#cbd5e1">
                Bank-grade security
              </Text>
            </Group>
          </Group>
        </Stack>
      </Container>

      {/* Pagination dots */}
      <Group
        gap={8}
        justify="center"
        style={{ position: 'absolute', bottom: 26, left: 0, right: 0, zIndex: 3 }}
      >
        {slides.map((s, idx) => {
          const isCurrent = idx === currentSlide;
          return (
            <UnstyledButton
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              style={{ padding: 4 }}
            >
              <motion.div
                animate={{
                  width: isCurrent ? 30 : 9,
                  backgroundColor: isCurrent ? '#e01a2b' : 'rgba(255,255,255,0.4)',
                }}
                transition={{ duration: 0.3 }}
                style={{ height: 8, borderRadius: 999 }}
              />
            </UnstyledButton>
          );
        })}
      </Group>
    </Box>
  );
};

