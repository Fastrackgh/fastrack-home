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
      py={{ base: 60, md: 80 }}
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
          background: 'linear-gradient(to bottom, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.92) 100%)',
          zIndex: 1,
        }}
      />

      <Container size="md" style={{ position: 'relative', zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.8rem, 3.2vw, 2.6rem)',
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
                maxWidth: 560,
                lineHeight: 1.6,
              }}
            >
              Join school administrators across Ghana preparing to modernize admissions, terminal grading, tuition reconciliation, and parent communication.
            </Text>

            <Group gap="md" mt="xs" justify="center">
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.96 }}>
                <ActionButton
                  href="/coming-soon"
                  variantStyle="primary"
                  size="md"
                  style={{ paddingLeft: 28, paddingRight: 28, height: 48, fontSize: '0.98rem' }}
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
