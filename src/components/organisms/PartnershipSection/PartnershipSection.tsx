'use client';

import React from 'react';
import { Box, Container, SimpleGrid, Stack, Text, Group } from '@mantine/core';
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
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
};

const securityLayers = [
  {
    icon: Lock,
    title: '256-Bit SSL Encryption',
    desc: 'Encrypted channels protect all data transmissions between user devices and our secure cloud servers.',
    color: '#f97316',
  },
  {
    icon: Fingerprint,
    title: 'Role-Based Access',
    desc: 'Fine-grained permissions ensure proprietors, teachers, bursars, and parents access only authorized views.',
    color: '#7c3aed',
  },
  {
    icon: FileCheck2,
    title: 'Tamper-Proof Audit Logs',
    desc: 'Every score alteration, fee entry, and system login is permanently timestamped with strict auditing.',
    color: '#16a34a',
  },
  {
    icon: HardDrive,
    title: 'Automated Off-Site Backups',
    desc: 'Automated multi-region cloud snapshots with one-click disaster recovery for continuous school continuity.',
    color: '#e01a2b',
  },
];

const roles = [
  {
    icon: Crown,
    role: 'Proprietor & Headmaster',
    access: 'Full Operations & Financials',
    color: '#f97316',
  },
  {
    icon: GraduationCap,
    role: 'Teacher & Form Master',
    access: 'Assigned Classes & Grading',
    color: '#38bdf8',
  },
  {
    icon: Users,
    role: 'Parent & Guardian',
    access: 'Ward Attendance & Fees',
    color: '#16a34a',
  },
  {
    icon: User,
    role: 'Enrolled Student',
    access: 'Terminal Reports & Timetable',
    color: '#e01a2b',
  },
];

export const PartnershipSection: React.FC = () => {
  return (
    <Box
      id="security"
      component="section"
      py={{ base: 48, md: 88 }}
      style={{
        background: '#ffffff',
      }}
    >
      <Container size="xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="xs" mb={{ base: 28, md: 48 }}>
            <DisplayHeading
              level={2}
              align="center"
              highlightWord="Without Compromise"
              highlightColor="#f97316"
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
                fontSize: 'clamp(0.9rem, 1.2vw, 1rem)',
              }}
            >
              Four layers of protection sit between your school records and the outside world.
              Zero compromises on student privacy and financial security.
            </Text>
          </Stack>
        </motion.div>

        {/* Security Layers — 2-column mobile, 4-column desktop */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'xs', sm: 'md' }} mb={{ base: 32, md: 64 }}>
            {securityLayers.map((layer, idx) => {
              const Icon = layer.icon;
              return (
                <motion.div key={idx} variants={itemVariants} style={{ height: '100%' }}>
                  <Box
                    style={{
                      padding: 'clamp(14px, 2vw, 24px)',
                      borderRadius: '16px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Box>
                      <Box
                        mb={{ base: 'xs', sm: 'sm' }}
                        style={{
                          width: 'clamp(36px, 4.5vw, 44px)',
                          height: 'clamp(36px, 4.5vw, 44px)',
                          borderRadius: '10px',
                          background: `${layer.color}15`,
                          border: `1px solid ${layer.color}30`,
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
                        mb={4}
                        style={{
                          color: '#0f172a',
                          fontFamily: 'var(--font-heading)',
                          fontSize: 'clamp(0.85rem, 1.2vw, 1rem)',
                          lineHeight: 1.25,
                        }}
                      >
                        {layer.title}
                      </Text>

                      <Text
                        size="xs"
                        style={{
                          color: '#64748b',
                          lineHeight: 1.45,
                          fontSize: 'clamp(0.72rem, 0.95vw, 0.82rem)',
                        }}
                      >
                        {layer.desc}
                      </Text>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </SimpleGrid>
        </motion.div>

        {/* Role-Based Access — Clean visual breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
        >
          <Box
            style={{
              padding: 'clamp(20px, 3.5vw, 48px)',
              borderRadius: '20px',
              background: '#0f172a',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Stack align="center" gap="xs" mb={{ base: 24, md: 36 }}>
              <Text
                size="xs"
                fw={700}
                style={{
                  color: '#fdba74',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontSize: 'clamp(0.7rem, 1vw, 0.78rem)',
                }}
              >
                Granular Role-Based Access
              </Text>

              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.25rem, 2.5vw, 1.85rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}
              >
                The right stakeholder sees the right information.
              </h3>
            </Stack>

            {/* Role cards: 2 in a row on mobile, 4 on desktop */}
            <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'xs', sm: 'md' }}>
              {roles.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06, duration: 0.35 }}
                    style={{ height: '100%' }}
                  >
                    <Box
                      style={{
                        padding: 'clamp(14px, 2vw, 22px) clamp(10px, 1.5vw, 18px)',
                        borderRadius: '14px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box
                        mx="auto"
                        mb={{ base: 'xs', sm: 'sm' }}
                        style={{
                          width: 'clamp(36px, 4.5vw, 46px)',
                          height: 'clamp(36px, 4.5vw, 46px)',
                          borderRadius: '10px',
                          background: `${item.color}25`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={20} color={item.color} />
                      </Box>

                      <Text
                        size="sm"
                        fw={700}
                        style={{
                          color: '#ffffff',
                          fontSize: 'clamp(0.8rem, 1.1vw, 0.95rem)',
                          lineHeight: 1.2,
                          marginBottom: 4,
                        }}
                      >
                        {item.role}
                      </Text>

                      <Group justify="center" gap={3} wrap="nowrap">
                        <ArrowRight size={11} color={item.color} style={{ flexShrink: 0 }} />
                        <Text
                          size="xs"
                          fw={600}
                          style={{
                            color: item.color,
                            fontSize: 'clamp(0.68rem, 0.9vw, 0.8rem)',
                            lineHeight: 1.2,
                          }}
                        >
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
