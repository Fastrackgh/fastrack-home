'use client';

import React from 'react';
import { Box, Container, Text } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { TrendingUp, Clock, Zap, ShieldCheck } from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const TrustBar: React.FC = () => {
  const metrics = [
    {
      value: '10+',
      unit: 'Years',
      label: 'In Operation Since 2014',
      icon: <Clock size={20} />,
      color: '#e01a2b',
    },
    {
      value: '99.9%',
      unit: '',
      label: 'Cloud Gateway Uptime',
      icon: <TrendingUp size={20} />,
      color: '#0ea5e9',
    },
    {
      value: 'Instant',
      unit: 'SMS',
      label: 'Parent Notification Speed',
      icon: <Zap size={20} />,
      color: '#16a34a',
    },
    {
      value: '256-Bit',
      unit: 'SSL',
      label: 'Bank-Grade Data Encryption',
      icon: <ShieldCheck size={20} />,
      color: '#7c3aed',
    },
  ];

  return (
    <Box
      component="section"
      style={{
        background: '#0f172a',
        paddingTop: '40px',
        paddingBottom: '40px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle animated gradient accent line at top */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #e01a2b 30%, #7c3aed 70%, transparent)',
          backgroundSize: '200% 200%',
        }}
      />

      <Container size="xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0px',
          }}
          className="trust-bar-grid"
        >
          {metrics.map((m, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                style={{
                  textAlign: 'center',
                  padding: '20px 24px',
                  borderRight: idx < metrics.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  position: 'relative',
                }}
              >
                {/* Icon badge */}
                <motion.div
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Box
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '10px',
                      background: `${m.color}18`,
                      border: `1px solid ${m.color}35`,
                      color: m.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    {m.icon}
                  </Box>
                </motion.div>

                {/* Value */}
                <Box style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                  <Text
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1,
                    }}
                  >
                    {m.value}
                  </Text>
                  {m.unit && (
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1rem',
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
                    color: 'rgba(255,255,255,0.45)',
                    fontWeight: 500,
                    marginTop: 6,
                    lineHeight: 1.4,
                    letterSpacing: '0.01em',
                  }}
                >
                  {m.label}
                </Text>
              </Box>
            </motion.div>
          ))}
        </motion.div>
      </Container>

      {/* Bottom gradient accent line */}
      <Box
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      <style>{`
        @media (max-width: 640px) {
          .trust-bar-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </Box>
  );
};
