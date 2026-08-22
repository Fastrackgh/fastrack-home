'use client';

import React from 'react';
import { Box, Container, SimpleGrid, Stack, Text, Group, ThemeIcon } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { DisplayHeading } from '@/components/atoms';
import {
  Lock,
  Fingerprint,
  FileCheck2,
  HardDrive,
  Crown,
  GraduationCap,
  Users,
  User,
  ArrowRight,
} from 'lucide-react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const securityLayers = [
  {
    icon: Lock,
    title: 'Encryption',
    desc: '256-bit SSL encryption protects every data transmission between your browser and our servers.',
    color: '#2563eb',
  },
  {
    icon: Fingerprint,
    title: 'Access Control',
    desc: 'Role-based permissions ensure users only see what they are authorized to view and manage.',
    color: '#7c3aed',
  },
  {
    icon: FileCheck2,
    title: 'Audit Logs',
    desc: 'Every score change, payment, and login is timestamped with a permanent, tamper-proof record.',
    color: '#16a34a',
  },
  {
    icon: HardDrive,
    title: 'Automated Backups',
    desc: 'Daily encrypted backups with multi-region redundancy. Instant restore if anything goes wrong.',
    color: '#ea580c',
  },
];

const roles = [
  {
    icon: Crown,
    role: 'Principal',
    access: 'Everything',
    color: '#e01a2b',
    bg: '#fef2f2',
  },
  {
    icon: GraduationCap,
    role: 'Teacher',
    access: 'Assigned classes',
    color: '#2563eb',
    bg: '#eff6ff',
  },
  {
    icon: Users,
    role: 'Parent',
    access: 'Their children',
    color: '#16a34a',
    bg: '#f0fdf4',
  },
  {
    icon: User,
    role: 'Student',
    access: 'Their own records',
    color: '#7c3aed',
    bg: '#f5f3ff',
  },
];

export const PartnershipSection: React.FC = () => {
  return (
    <Box
      id="security"
      component="section"
      py={{ base: 60, md: 100 }}
      style={{
        background: '#ffffff',
      }}
    >
      <Container size="xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="sm" mb={56}>
            <DisplayHeading
              level={2}
              align="center"
              highlightWord="Without Compromise"
              highlightColor="#e01a2b"
            >
              Your School Data, Protected
            </DisplayHeading>

            <Text
              size="md"
              style={{
                color: '#64748b',
                maxWidth: '580px',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              Four layers of protection sit between your data and the outside world.
              No shortcuts, no exceptions.
            </Text>
          </Stack>
        </motion.div>

        {/* Security Layers — 4-column grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb={72}>
            {securityLayers.map((layer, idx) => {
              const Icon = layer.icon;
              return (
                <motion.div key={idx} variants={itemVariants}>
                  <Box
                    style={{
                      padding: '28px 24px',
                      borderRadius: '14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      height: '100%',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Box
                      mb="md"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '10px',
                        background: `${layer.color}12`,
                        border: `1px solid ${layer.color}25`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} color={layer.color} />
                    </Box>

                    <Text
                      size="sm"
                      fw={700}
                      mb={6}
                      style={{ color: '#0f172a', fontFamily: 'var(--font-heading)' }}
                    >
                      {layer.title}
                    </Text>

                    <Text size="xs" style={{ color: '#64748b', lineHeight: 1.55 }}>
                      {layer.desc}
                    </Text>
                  </Box>
                </motion.div>
              );
            })}
          </SimpleGrid>
        </motion.div>

        {/* Role-Based Access — Clean visual breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
        >
          <Box
            style={{
              padding: 'clamp(32px, 4vw, 56px)',
              borderRadius: '18px',
              background: '#0f172a',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Stack align="center" gap="xs" mb={40}>
              <Text
                size="xs"
                fw={700}
                style={{
                  color: '#38bdf8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Role-Based Access
              </Text>

              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.5rem, 2.8vw, 2rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                The right person sees the right information.
              </h3>
            </Stack>

            {/* Role cards in a row */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
              {roles.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08, duration: 0.4 }}
                  >
                    <Box
                      style={{
                        padding: '24px 20px',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        height: '100%',
                      }}
                    >
                      <Box
                        mx="auto"
                        mb="sm"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          background: `${item.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} color={item.color} />
                      </Box>

                      <Text size="md" fw={700} style={{ color: '#ffffff' }} mb={4}>
                        {item.role}
                      </Text>

                      <Group justify="center" gap={4}>
                        <ArrowRight size={13} color={item.color} />
                        <Text size="sm" fw={600} style={{ color: item.color }}>
                          {item.access}
                        </Text>
                      </Group>
                    </Box>
                  </motion.div>
                );
              })}
            </SimpleGrid>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};
