'use client';

import React from 'react';
import { Box, Container, Stack, Text, SimpleGrid, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DisplayHeading } from '@/components/atoms';
import { ServiceCard } from '@/components/molecules';
import { businessInfo } from '@/data/businessInfo';
import {
  ShieldCheck,
  Database,
  Code,
  Smartphone,
  MessageSquare,
  Calculator,
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
      py={{ base: 48, md: 88 }}
      style={{
        background: '#ffffff',
      }}
    >
      <Container size="xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="xs" mb={{ base: 24, md: 44 }}>
            <Badge
              size="sm"
              variant="light"
              style={{
                background: '#fff7ed',
                color: '#ea580c',
                border: '1px solid #fed7aa',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
              }}
            >
              Enterprise IT Capabilities
            </Badge>

            <DisplayHeading
              level={2}
              align="center"
              highlightWord="Excellence"
              highlightColor="#f97316"
              maxWidth={780}
            >
              End-to-End ICT & Management
            </DisplayHeading>

            <Text
              size="md"
              c="dimmed"
              style={{
                maxWidth: 640,
                textAlign: 'center',
                lineHeight: 1.6,
                fontSize: 'clamp(0.88rem, 1.2vw, 1rem)',
              }}
            >
              Delivering high-impact, affordable, and value-driven technology solutions
              tailored to enterprise operations, database infrastructure, mobile apps, and statutory compliance.
            </Text>
          </Stack>
        </motion.div>

        {/* 2 in a Row on Mobile, 2 on Tablet, 3 on Desktop */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }} spacing={{ base: 'xs', sm: 'md', md: 'lg' }} mt="md">
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
