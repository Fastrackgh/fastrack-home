'use client';

import React from 'react';
import { Box, Container, Stack, Text, SimpleGrid, Group } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DisplayHeading, StatusBadge } from '@/components/atoms';
import { businessInfo } from '@/data/businessInfo';
import { Smartphone, LineChart, BarChart3, Check } from 'lucide-react';
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
    <Smartphone key="1" size={26} color="#e01a2b" />,
    <LineChart key="2" size={26} color="#e01a2b" />,
    <BarChart3 key="3" size={26} color="#e01a2b" />,
  ];

  return (
    <Box
      id="insights"
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
              }}
            >
              Go beyond simple static reporting. Aggregate multi-source data, extract actionable
              operational intelligence, and control your institution anywhere, anytime.
            </Text>
          </Stack>
        </motion.div>

        {/* Cinematic image banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7 }}
        >
          <Box
            mb={48}
            style={{
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              aspectRatio: '16 / 7',
            }}
          >
            <Image
              src="/teacher_with_laptop.jpg"
              alt="Ghanaian school administrator using Fastrack dashboard on laptop"
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, 1200px"
            />
            <Box
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15,23,42,0.6) 0%, transparent 60%)',
              }}
            />
            <Box
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 'clamp(20px, 3vw, 36px)',
              }}
            >
              <Text
                size="xs"
                fw={600}
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                Real-time School Operations Dashboard
              </Text>
              <Text
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
                  color: '#ffffff',
                  lineHeight: 1.3,
                  marginTop: 4,
                }}
              >
                Every metric your school needs — one screen, zero friction.
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
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl" mt="xl">
            {businessInfo.benefits.map((benefit, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.25 }}
                style={{ height: '100%' }}
              >
                <Box
                  style={{
                    padding: '36px 28px',
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
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 20px 40px -8px rgba(11, 15, 23, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Box>
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
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
                        marginBottom: 20,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      {icons[idx]}
                    </motion.div>

                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '1.2rem',
                        color: '#0f172a',
                        lineHeight: 1.3,
                        marginBottom: 12,
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
                      }}
                    >
                      {benefit.description}
                    </Text>
                  </Box>

                  <Group gap="xs" mt="lg" pt="md" style={{ borderTop: '1px solid #e2e8f0' }}>
                    <Check size={16} color="#e01a2b" strokeWidth={2.5} />
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
