'use client';

import React from 'react';
import { Box, Container, Stack, Group, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { ActionButton, SectionEyebrow } from '@/components/atoms';
import { Sparkles } from 'lucide-react';

export const CTASection: React.FC = () => {
  return (
    <Box
      component="section"
      py={{ base: 64, md: 104 }}
      style={{
        background: 'linear-gradient(145deg, #0b0f17 0%, #1a2233 100%)',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Subtle ambient light glow */}
      <Box
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224, 26, 43, 0.14) 0%, rgba(168, 13, 26, 0.06) 50%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <Container size="md" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
            <SectionEyebrow label="Transform Your School Operations" onDark />

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                textAlign: 'center',
                color: '#ffffff',
                maxWidth: '680px',
                margin: 0,
              }}
            >
              Ready to Deploy Fastrack EduSuite in Your Institution?
            </h2>

            <Text
              size="md"
              style={{
                color: '#cbd5e1',
                maxWidth: 560,
                lineHeight: 1.6,
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Join forward-thinking school administrators across Ghana modernizing admissions, terminal grading, tuition reconciliation, and parent alerts.
            </Text>

            <Group gap="md" mt="sm" justify="center">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <ActionButton
                  href="/coming-soon"
                  variantStyle="primary"
                  size="md"
                  withArrow
                  style={{
                    paddingLeft: 30,
                    paddingRight: 30,
                    height: 50,
                    fontSize: '1rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #e01a2b 0%, #a80d1a 100%)',
                    boxShadow: '0 8px 24px -4px rgba(224, 26, 43, 0.45)',
                  }}
                >
                  Join Priority Waitlist
                </ActionButton>
              </motion.div>
            </Group>
          </Stack>
        </motion.div>
      </Container>
    </Box>
  );
};

