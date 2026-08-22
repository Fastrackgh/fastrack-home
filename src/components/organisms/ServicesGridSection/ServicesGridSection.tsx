'use client';

import React from 'react';
import { Box, Container, Stack, Text, SimpleGrid } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DisplayHeading, StatusBadge } from '@/components/atoms';
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
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const ServicesGridSection: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck size={26} strokeWidth={2.2} />;
      case 'Database':
        return <Database size={26} strokeWidth={2.2} />;
      case 'Code':
        return <Code size={26} strokeWidth={2.2} />;
      case 'Smartphone':
        return <Smartphone size={26} strokeWidth={2.2} />;
      case 'MessageSquare':
        return <MessageSquare size={26} strokeWidth={2.2} />;
      case 'Calculator':
        return <Calculator size={26} strokeWidth={2.2} />;
      default:
        return <Code size={26} strokeWidth={2.2} />;
    }
  };

  return (
    <Box
      id="services"
      component="section"
      py={{ base: 60, md: 100 }}
      style={{
        background: '#ffffff',
      }}
    >
      <Container size="xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="sm" mb="xl">
            

            <DisplayHeading
              level={2}
              align="center"
              highlightWord="Excellence"
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
              }}
            >
              Delivering high-impact, affordable, and value-driven technology solutions
              tailored to enterprise operations, database infrastructure, mobile apps, and statutory compliance.
            </Text>
          </Stack>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mt="xl">
            {businessInfo.services.map((svc) => (
              <motion.div key={svc.id} variants={itemVariants}>
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
