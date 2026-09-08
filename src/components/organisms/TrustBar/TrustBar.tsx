'use client';

import React from 'react';
import { Box, Container, Text, SimpleGrid } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { TrendingUp, Clock, Zap, ShieldCheck } from 'lucide-react';

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
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

export const TrustBar: React.FC = () => {
  const metrics = [
    {
      value: '10+',
      unit: 'Years',
      label: 'Operational Excellence Since 2014',
      icon: <Clock size={20} />,
      color: '#e01a2b',
      bg: 'rgba(224, 26, 43, 0.1)',
    },
    {
      value: '99.9%',
      unit: '',
      label: 'Cloud Infrastructure Uptime',
      icon: <TrendingUp size={20} />,
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.1)',
    },
    {
      value: 'Instant',
      unit: 'SMS',
      label: 'Parent Notification Delivery',
      icon: <Zap size={20} />,
      color: '#16a34a',
      bg: 'rgba(22, 163, 74, 0.1)',
    },
    {
      value: '256-Bit',
      unit: 'SSL',
      label: 'Bank-Grade Data Security',
      icon: <ShieldCheck size={20} />,
      color: '#e01a2b',
      bg: 'rgba(224, 26, 43, 0.1)',
    },
  ];

  return (
    <Box
      component="section"
      style={{
        background: '#ffffff',
        paddingTop: 'clamp(32px, 5vw, 48px)',
        paddingBottom: 'clamp(32px, 5vw, 48px)',
        position: 'relative',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <Container size="xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'sm', md: 'lg' }}>
            {metrics.map((m, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                style={{ height: '100%' }}
              >
                <Box
                  style={{
                    textAlign: 'center',
                    padding: 'clamp(18px, 2.5vw, 24px) clamp(12px, 2vw, 20px)',
                    borderRadius: '16px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 8px 20px -4px rgba(15, 23, 42, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
                  }}
                >
                  {/* Icon badge */}
                  <Box
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      background: m.bg,
                      color: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    {m.icon}
                  </Box>

                  {/* Value */}
                  <Box style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)',
                        fontWeight: 800,
                        color: '#0f172a',
                        lineHeight: 1,
                      }}
                    >
                      {m.value}
                    </Text>
                    {m.unit && (
                      <Text
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          color: m.color,
                          lineHeight: 1,
                        }}
                      >
                        {m.unit}
                      </Text>
                    )}
                  </Box>

                  {/* Label */}
                  <Text
                    size="xs"
                    style={{
                      color: '#64748b',
                      fontWeight: 500,
                      marginTop: 8,
                      lineHeight: 1.4,
                      fontSize: 'clamp(0.75rem, 1vw, 0.84rem)',
                    }}
                  >
                    {m.label}
                  </Text>
                </Box>
              </motion.div>
            ))}
          </SimpleGrid>
        </motion.div>
      </Container>
    </Box>
  );
};

