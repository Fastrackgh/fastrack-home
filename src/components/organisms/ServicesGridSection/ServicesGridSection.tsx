'use client';

import React from 'react';
import { Box, Container, Stack, Text, SimpleGrid, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { ServiceCard } from '@/components/molecules';
import { SectionEyebrow } from '@/components/atoms';
import { businessInfo } from '@/data/businessInfo';
import {
  ShieldCheck,
  Database,
  Code,
  Smartphone,
  MessageSquare,
  Calculator,
  Layers,
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

export const ServicesGridSection: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      case 'Database':
        return <Database strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      case 'Code':
        return <Code strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      case 'Smartphone':
        return <Smartphone strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      case 'MessageSquare':
        return <MessageSquare strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      case 'Calculator':
        return <Calculator strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
      default:
        return <Code strokeWidth={2.2} style={{ width: '100%', height: '100%' }} />;
    }
  };

  return (
    <Box
      id="services"
      component="section"
      py={{ base: 64, md: 104 }}
      style={{
        background: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderBottom: '1px solid #e2e8f0',
      }}
    >
      <Container size="xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" mb={{ base: 32, md: 52 }}>
            <SectionEyebrow label="Enterprise IT Capabilities" />

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.9rem, 3.4vw, 3rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                textAlign: 'center',
                color: '#0f172a',
                margin: '0 auto',
                maxWidth: 780,
              }}
            >
              End-to-End ICT & Management{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #eb5969 0%, #e01a2b 60%, #a80d1a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Excellence
              </span>
            </h2>

            <Text
              size="md"
              style={{
                maxWidth: 640,
                textAlign: 'center',
                lineHeight: 1.6,
                color: '#64748b',
                marginTop: 4,
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Delivering high-impact, affordable, and value-driven technology solutions
              tailored to enterprise operations, database infrastructure, mobile apps, and statutory compliance.
            </Text>
          </Stack>
        </motion.div>

        {/* 1 col on Mobile, 2 on Tablet, 3 on Desktop */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'md', sm: 'md', md: 'lg' }}>
            {businessInfo.services.map((svc) => (
              <motion.div key={svc.id} variants={itemVariants} style={{ height: '100%' }}>
                <ServiceCard
                  service={svc}
                  icon={getIcon(svc.iconName)}
                />
              </motion.div>
            ))}
          </SimpleGrid>
        </motion.div>
      </Container>
    </Box>
  );
};

