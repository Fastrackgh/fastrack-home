'use client';

import React from 'react';
import { Box, Container, Stack, Text, SimpleGrid, Group, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DisplayHeading } from '@/components/atoms';
import { businessInfo } from '@/data/businessInfo';
import { Smartphone, LineChart, BarChart3, Check, Sparkles } from 'lucide-react';
import Image from 'next/image';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export const BusinessInsightsSection: React.FC = () => {
  const icons = [
    <Smartphone key="1" size={26} color="#f97316" />,
    <LineChart key="2" size={26} color="#ea580c" />,
    <BarChart3 key="3" size={26} color="#e01a2b" />,
  ];

  return (
    <Box
      id="insights"
      component="section"
      py={{ base: 48, md: 88 }}
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
          <Stack align="center" gap="sm" mb={{ base: 28, md: 48 }}>
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
              Institutional Intelligence
            </Badge>

            <DisplayHeading
              level={2}
              align="center"
              maxWidth={780}
            >
              Actionable Insights & Mobile Freedom
            </DisplayHeading>

            <Text
              size="md"
              c="dimmed"
              style={{
                maxWidth: 640,
                textAlign: 'center',
                lineHeight: 1.6,
                fontSize: 'clamp(0.9rem, 1.3vw, 1rem)',
              }}
            >
              Go beyond simple static reporting. Aggregate multi-source data, extract actionable
              operational intelligence, and control your institution anywhere, anytime.
            </Text>
          </Stack>
        </motion.div>

        {/* Cinematic image banner with responsive mobile height */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7 }}
        >
          <Box
            mb={{ base: 32, md: 48 }}
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              minHeight: '260px',
              height: 'clamp(260px, 35vw, 420px)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e2e8f0',
            }}
          >
            <Image
              src="/teacher_with_laptop.jpg"
              alt="Ghanaian school administrator using Fastrack dashboard on laptop"
              fill
              style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              sizes="(max-width: 768px) 100vw, 1200px"
            />
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 50%, rgba(15,23,42,0.1) 100%)',
              }}
            />
            <Box
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 'clamp(16px, 3.5vw, 36px)',
              }}
            >
              <Group gap={6} mb={4}>
                <BarChart3 size={14} color="#fdba74" />
                <Text
                  size="xs"
                  fw={700}
                  style={{
                    color: '#fdba74',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    fontSize: 'clamp(0.7rem, 1.1vw, 0.8rem)',
                  }}
                >
                  Real-Time School Operations Control
                </Text>
              </Group>
              <Text
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  fontSize: 'clamp(1.1rem, 2.2vw, 1.6rem)',
                  color: '#ffffff',
                  lineHeight: 1.25,
                  maxWidth: '680px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                }}
              >
                Every metric your school needs — one unified screen, zero administrative friction.
              </Text>
            </Box>
          </Box>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={{ base: 'md', md: 'xl' }} mt="md">
            {businessInfo.benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <Box
                  style={{
                    padding: 'clamp(24px, 3vw, 36px) clamp(20px, 2.5vw, 28px)',
                    borderRadius: '20px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fdba74';
                    e.currentTarget.style.boxShadow = '0 20px 40px -8px rgba(249, 115, 22, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Box>
                    <motion.div
                      whileHover={{ scale: 1.08, rotate: 4 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 18,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      {icons[idx]}
                    </motion.div>

                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)',
                        color: '#0f172a',
                        lineHeight: 1.3,
                        marginBottom: 10,
                      }}
                    >
                      {benefit.title}
                    </Text>

                    <Text
                      size="sm"
                      c="dimmed"
                      style={{
                        lineHeight: 1.6,
                        fontFamily: 'var(--font-inter)',
                        fontSize: 'clamp(0.85rem, 1.1vw, 0.92rem)',
                      }}
                    >
                      {benefit.description}
                    </Text>
                  </Box>

                  <Group gap="xs" mt="lg" pt="md" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <Check size={16} color="#f97316" strokeWidth={2.5} />
                    <Text size="xs" fw={700} c="dark">
                      Built-in to Fastrack Cloud ERP
                    </Text>
                  </Group>
                </Box>
              </motion.div>
            ))}
          </SimpleGrid>
        </motion.div>
      </Container>
    </Box>
  );
};
