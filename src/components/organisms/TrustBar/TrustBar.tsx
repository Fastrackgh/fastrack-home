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
      staggerChildren: 0.1,
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
      label: 'In Operation Since 2014',
      icon: <Clock size={20} />,
      color: '#f97316',
    },
    {
      value: '99.9%',
      unit: '',
      label: 'Cloud Gateway Uptime',
      icon: <TrendingUp size={20} />,
      color: '#38bdf8',
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
      color: '#e01a2b',
    },
  ];

  return (
    <Box
      component="section"
      style={{
        background: '#0f172a',
        paddingTop: 'clamp(28px, 4vw, 40px)',
        paddingBottom: 'clamp(28px, 4vw, 40px)',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '1px solid #1e293b',
      }}
    >
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
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Box
                style={{
                  textAlign: 'center',
                  padding: 'clamp(14px, 2.5vw, 20px) clamp(10px, 2vw, 24px)',
                  position: 'relative',
                }}
                className={`trust-item trust-item-${idx}`}
              >
                {/* Icon badge */}
                <Box
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: `${m.color}18`,
                    border: `1px solid ${m.color}35`,
                    color: m.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}
                >
                  {m.icon}
                </Box>

                {/* Value */}
                <Box style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                  <Text
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: 'clamp(1.4rem, 2.5vw, 2.1rem)',
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
                        fontSize: '0.9rem',
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
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 500,
                    marginTop: 6,
                    lineHeight: 1.35,
                    fontSize: 'clamp(0.72rem, 1vw, 0.8rem)',
                  }}
                >
                  {m.label}
                </Text>
              </Box>
            </motion.div>
          ))}
        </motion.div>
      </Container>

      <style>{`
        .trust-item {
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .trust-item-3 {
          border-right: none;
        }
        @media (max-width: 640px) {
          .trust-bar-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px 0 !important;
          }
          .trust-item-0, .trust-item-2 {
            border-right: 1px solid rgba(255,255,255,0.08);
          }
          .trust-item-1, .trust-item-3 {
            border-right: none;
          }
        }
      `}</style>
    </Box>
  );
};
