'use client';

import React from 'react';
import { Box, Container, SimpleGrid, Stack, Text, Group } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { SectionEyebrow } from '@/components/atoms';
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
  ShieldAlert,
  ShieldCheck,
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
    color: '#e01a2b',
    bg: 'rgba(224, 26, 43, 0.1)',
  },
  {
    icon: Fingerprint,
    title: 'Role-Based Access',
    desc: 'Fine-grained permissions ensure proprietors, teachers, bursars, and parents access only authorized views.',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
  },
  {
    icon: FileCheck2,
    title: 'Tamper-Proof Audit Logs',
    desc: 'Every score alteration, fee entry, and system login is permanently timestamped with strict auditing.',
    color: '#16a34a',
    bg: 'rgba(22, 163, 74, 0.1)',
  },
  {
    icon: HardDrive,
    title: 'Automated Off-Site Backups',
    desc: 'Automated multi-region cloud snapshots with one-click disaster recovery for continuous school continuity.',
    color: '#e01a2b',
    bg: 'rgba(224, 26, 43, 0.1)',
  },
];

const roles = [
  {
    icon: Crown,
    role: 'Proprietor & Headmaster',
    access: 'Full Operations & Financials',
    color: '#e01a2b',
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
      py={{ base: 64, md: 104 }}
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
          <Stack align="center" gap="md" mb={{ base: 32, md: 52 }}>
            <SectionEyebrow label="Enterprise Data Protection" />

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
                maxWidth: 720,
              }}
            >
              Your School Data, Protected{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #eb5969 0%, #e01a2b 60%, #a80d1a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Without Compromise
              </span>
            </h2>

            <Text
              size="md"
              style={{
                color: '#64748b',
                maxWidth: '600px',
                textAlign: 'center',
                lineHeight: 1.6,
                marginTop: 4,
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Four layers of protection safeguard your school records, student grades, and financial transactions.
              Zero compromises on privacy.
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
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={{ base: 'md', md: 'lg' }} mb={{ base: 36, md: 64 }}>
            {securityLayers.map((layer, idx) => {
              const Icon = layer.icon;
              return (
                <motion.div key={idx} variants={itemVariants} style={{ height: '100%' }}>
                  <Box
                    style={{
                      padding: 'clamp(20px, 2.5vw, 26px)',
                      borderRadius: '18px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = layer.color;
                      e.currentTarget.style.boxShadow = `0 12px 28px -6px ${layer.color}25`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.02)';
                    }}
                  >
                    <Box>
                      <Box
                        mb="md"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: layer.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} color={layer.color} />
                      </Box>

                      <Text
                        size="md"
                        fw={700}
                        mb={6}
                        style={{
                          color: '#0f172a',
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.05rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {layer.title}
                      </Text>

                      <Text
                        size="sm"
                        style={{
                          color: '#64748b',
                          lineHeight: 1.55,
                          fontSize: '0.86rem',
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

        {/* Role-Based Access Matrix */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
        >
          <Box
            style={{
              padding: 'clamp(24px, 4vw, 44px)',
              borderRadius: '24px',
              background: 'linear-gradient(145deg, #0b0f17 0%, #1e293b 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <Stack align="center" gap="md" mb={{ base: 24, md: 36 }}>
              <SectionEyebrow label="Granular Role-Based Permissions" onDark />

              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.3rem, 2.5vw, 1.85rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: 0,
                  textAlign: 'center',
                  lineHeight: 1.25,
                }}
              >
                The right stakeholder sees only authorized information
              </h3>
            </Stack>

            {/* Role cards: 2 in a row on mobile, 4 on desktop */}
            <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'sm', md: 'md' }}>
              {roles.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05, duration: 0.3 }}
                    style={{ height: '100%' }}
                  >
                    <Box
                      style={{
                        padding: 'clamp(16px, 2.5vw, 24px) clamp(12px, 2vw, 18px)',
                        borderRadius: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        textAlign: 'center',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <Box
                        mx="auto"
                        mb="sm"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: '12px',
                          background: `${item.color}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={22} color={item.color} />
                      </Box>

                      <Text
                        size="sm"
                        fw={700}
                        style={{
                          color: '#ffffff',
                          fontSize: '0.92rem',
                          lineHeight: 1.3,
                          marginBottom: 6,
                        }}
                      >
                        {item.role}
                      </Text>

                      <Group justify="center" gap={4} wrap="nowrap">
                        <ArrowRight size={12} color={item.color} style={{ flexShrink: 0 }} />
                        <Text
                          size="xs"
                          fw={600}
                          style={{
                            color: item.color,
                            fontSize: '0.8rem',
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

