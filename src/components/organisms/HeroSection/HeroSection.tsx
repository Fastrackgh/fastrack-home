'use client';

import React from 'react';
import { Box, Container, Stack, Group, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { StatusBadge, ActionButton } from '@/components/atoms';
import { DashboardPreview } from '@/components/organisms/DashboardPreview/DashboardPreview';
import { ShieldCheck, ArrowDown } from 'lucide-react';

import type { Variants } from 'framer-motion';

interface HeroSectionProps {
  bgImage?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

export const HeroSection: React.FC<HeroSectionProps> = ({ bgImage = '/students_running_to_school.jpg' }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('school-erp');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToPreview = () => {
    const el = document.getElementById('live-preview');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const activeBg = bgImage || '/students_running_to_school.jpg';

  return (
    <Box component="section">
      {/* Main Hero Header Block */}
      <Box
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 72px)',
          overflow: 'hidden',
          backgroundColor: '#0b0f19',
          backgroundImage: `url(${activeBg})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '64px',
          paddingBottom: '64px',
        }}
      >
        {/* Cinematic dark overlay for maximum text contrast while keeping background visible */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              'linear-gradient(180deg, rgba(8, 12, 22, 0.82) 0%, rgba(15, 23, 42, 0.70) 50%, rgba(8, 12, 22, 0.88) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Ambient floating tech accents */}
        <motion.div
          animate={{
            y: [-10, 10, -10],
            rotate: [0, 8, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '18%',
            left: '8%',
            zIndex: 1,
            pointerEvents: 'none',
            display: 'none',
          }}
          className="ambient-bubble"
        >
          <Box
            style={{
              width: 80,
              height: 80,
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(224,26,43,0.15), rgba(14,165,233,0.1))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(224,26,43,0.1)',
            }}
          />
        </motion.div>

        {/* Direct Hero Content Stack with Framer Motion */}
        <Container size="xl" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <Stack align="center" gap="lg" style={{ maxWidth: '860px', margin: '0 auto' }}>
              {/* Title */}
              <motion.div variants={itemVariants} style={{ width: '100%', textAlign: 'center' }}>
                <h1
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: 'clamp(2.2rem, 4.4vw, 3.75rem)',
                    lineHeight: 1.15,
                    letterSpacing: '-0.03em',
                    textAlign: 'center',
                    maxWidth: '860px',
                    color: '#ffffff',
                    textShadow: '0 4px 24px rgba(0, 0, 0, 0.7)',
                    margin: 0,
                  }}
                >
                  Integrated School Management &{' '}
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #ff4d5e 0%, #ef4444 60%, #fb7185 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 2px 10px rgba(224, 26, 43, 0.35))',
                    }}
                  >
                    Cloud ERP Solutions
                  </span>
                </h1>
              </motion.div>

              {/* Subtitle */}
              <motion.div variants={itemVariants}>
                <Text
                  size="lg"
                  c="white"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    maxWidth: '720px',
                    textAlign: 'center',
                    lineHeight: 1.65,
                    fontSize: 'clamp(0.98rem, 1.6vw, 1.15rem)',
                    color: 'rgba(241, 245, 249, 0.95)',
                    textShadow: '0 2px 12px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  Fastrack Management Services delivers complete operational software for schools in Ghana.
                  Streamline student admissions, terminal grading, Mobile Money tuition collection, and parent Bulk SMS communications.
                </Text>
              </motion.div>

              {/* Action Buttons */}
              <motion.div variants={itemVariants}>
                <Group gap="md" mt="xs" justify="center">
                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                    <ActionButton
                      href="/coming-soon"
                      variantStyle="primary"
                      size="md"
                      style={{
                        paddingLeft: 26,
                        paddingRight: 26,
                        height: 48,
                        fontSize: '0.98rem',
                        boxShadow: '0 8px 24px rgba(224, 26, 43, 0.45)',
                      }}
                    >
                      Get Started (Early Access)
                    </ActionButton>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                    <ActionButton
                      variantStyle="secondary"
                      size="md"
                      onClick={scrollToFeatures}
                      style={{
                        paddingLeft: 22,
                        paddingRight: 22,
                        height: 48,
                        fontSize: '0.98rem',
                        background: 'rgba(255, 255, 255, 0.14)',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.35)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                      }}
                    >
                      View System Modules
                    </ActionButton>
                  </motion.div>
                </Group>
              </motion.div>

              {/* Trust indicator */}
              <motion.div variants={itemVariants}>
                <Group gap={6} mt={2} justify="center">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldCheck size={16} color="#4ade80" />
                  </motion.div>
                  <Text
                    size="xs"
                    fw={500}
                    style={{
                      color: '#cbd5e1',
                      textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
                    }}
                  >
                    Serving Ghanaian educational institutions and corporate clients since 2014
                  </Text>
                </Group>
              </motion.div>
             
            </Stack>
          </motion.div>
        </Container>
      </Box>

      {/* Standalone Dashboard Preview Section — Dark Immersive with Framer Motion */}
      <Box
        id="live-preview"
        component="section"
        style={{
          background: '#0f172a',
          paddingTop: '88px',
          paddingBottom: '96px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background ambient glow */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.9, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '950px',
            height: '650px',
            background: 'radial-gradient(ellipse at center, rgba(224,26,43,0.18) 0%, rgba(14,165,233,0.08) 45%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* Grid dot overlay */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
          {/* Section header animated on scroll */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ textAlign: 'center', marginBottom: '48px' }}
          >


            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.9rem, 3.2vw, 2.8rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                margin: '0 auto 14px',
                maxWidth: 650,
              }}
            >
              Your school, fully{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #e01a2b 0%, #ff4b5c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                digitized & automated
              </span>
            </h2>

            <Text
              size="md"
              style={{
                color: 'rgba(255,255,255,0.5)',
                maxWidth: 520,
                margin: '0 auto',
                lineHeight: 1.6,
              }}
            >
              Click through the modules below to see how Fastrack unifies admissions, MoMo fees, terminal grading, and SMS in real time.
            </Text>
          </motion.div>

          {/* Dashboard card with glow ring & scroll animation */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'relative',
                borderRadius: '20px',
                padding: '2px',
                background: 'linear-gradient(135deg, rgba(224,26,43,0.5) 0%, rgba(14,165,233,0.35) 50%, rgba(124,58,237,0.25) 100%)',
                boxShadow: '0 0 90px rgba(224,26,43,0.18), 0 40px 90px rgba(0,0,0,0.6)',
              }}
            >
              <Box style={{ borderRadius: '18px', overflow: 'hidden' }}>
                <DashboardPreview fullWidth={false} />
              </Box>
            </motion.div>
          </motion.div>
        </Container>
      </Box>
    </Box>
  );
};
