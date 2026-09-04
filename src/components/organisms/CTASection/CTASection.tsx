'use client';

import React from 'react';
import { Box, Container, Stack, Group, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import { ActionButton } from '@/components/atoms';
import Image from 'next/image';

export const CTASection: React.FC = () => {
  return (
    <Box
      component="section"
      py={{ base: 48, md: 80 }}
      style={{
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background image */}
      <Image
        src="/school_assembly.jpg"
        alt="Ghanaian school assembly"
        fill
        style={{ objectFit: 'cover' }}
        sizes="100vw"
        priority={false}
      />

      {/* Dark overlay */}
      <Box
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.95) 100%)',
          zIndex: 1,
        }}
      />

      <Container size="md" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                textAlign: 'center',
                color: '#ffffff',
                maxWidth: '640px',
                margin: 0,
              }}
            >
              Ready to Deploy Fastrack EduSuite in Your Institution?
            </h2>

            <Text
              size="sm"
              style={{
                color: '#cbd5e1',
                maxWidth: 540,
                lineHeight: 1.6,
                fontSize: 'clamp(0.85rem, 1.1vw, 0.95rem)',
              }}
            >
              Join school administrators across Ghana preparing to modernize admissions, terminal grading, tuition reconciliation, and parent communication.
            </Text>

            <Group gap="md" mt="xs" justify="center">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}>
                <ActionButton
                  href="/coming-soon"
                  variantStyle="primary"
                  size="md"
                  style={{
                    paddingLeft: 28,
                    paddingRight: 28,
                    height: 48,
                    fontSize: '0.98rem',
                    background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
                    boxShadow: '0 6px 20px rgba(249, 115, 22, 0.4)',
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
