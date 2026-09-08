'use client';

import React from 'react';
import { Box, Container, Stack, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { SectionEyebrow } from '@/components/atoms';
import { DashboardPreview } from '@/components/organisms/DashboardPreview/DashboardPreview';

export const DashboardShowcaseSection: React.FC = () => {
  return (
    <Box
      id="dashboard"
      component="section"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%)',
        borderBottom: '1px solid #eef2f7',
        paddingTop: 'clamp(64px, 8vw, 104px)',
        paddingBottom: 'clamp(64px, 8vw, 104px)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient brand glow */}
      <Box
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 720,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 26, 43, 0.10) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" mb={{ base: 32, md: 52 }} style={{ textAlign: 'center' }}>
            <SectionEyebrow label="Live Product Preview" />
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.9rem, 3.4vw, 3rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: '0 auto',
                maxWidth: 760,
              }}
            >
              Your entire school, on{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #eb5969 0%, #e01a2b 60%, #a80d1a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                one clear dashboard
              </span>
            </h2>
            <Text
              size="md"
              style={{
                maxWidth: 640,
                textAlign: 'center',
                lineHeight: 1.6,
                color: '#64748b',
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Admissions, attendance, fees, bulk SMS, and payroll — all in a single real-time
              workspace built for Ghanaian schools.
            </Text>
          </Stack>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <DashboardPreview />
        </motion.div>
      </Container>
    </Box>
  );
};
