'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Box,
  Container,
  Group,
  Text,
  SimpleGrid,
  Badge,
  Stack,
  UnstyledButton,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { businessInfo } from '@/data/businessInfo';
import { SectionEyebrow } from '@/components/atoms';
import {
  Compass,
  Eye,
  Building2,
  ShieldCheck,
  Award,
  Zap,
  Target,
  Users,
  Globe,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

type AboutTab = 'story' | 'mission' | 'vision' | 'values';

export const AboutSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AboutTab>('story');

  const tabs: { id: AboutTab; label: string; icon: React.ReactNode }[] = [
    { id: 'story', label: 'Our Story & Heritage', icon: <Building2 size={16} /> },
    { id: 'mission', label: 'Our Mission & Promise', icon: <Compass size={16} /> },
    { id: 'vision', label: 'Our Future Vision', icon: <Eye size={16} /> },
    { id: 'values', label: 'Core Values', icon: <Award size={16} /> },
  ];

  return (
    <Box
      id="about"
      component="section"
      py={{ base: 64, md: 104 }}
      style={{
        background: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid #e2e8f0',
      }}
    >
      <Container size="xl">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" mb={{ base: 32, md: 48 }} style={{ textAlign: 'center' }}>
            <SectionEyebrow label="Proven Track Record Since 2014" />

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.9rem, 3.4vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: 0,
                maxWidth: '780px',
              }}
            >
              Transforming How Ghanaian Organizations Operate
            </h2>

            <Text
              size="md"
              style={{
                color: '#64748b',
                maxWidth: '640px',
                lineHeight: 1.6,
                marginTop: 4,
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Delivering simple, dependable, and high-impact software solutions tailored for Ghanaian educational institutions and corporate enterprises since 2014.
            </Text>
          </Stack>
        </motion.div>

        {/* Tab Navigation Pill Bar */}
        <Box
          mb={{ base: 24, md: 36 }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'auto',
            paddingBottom: '4px',
          }}
        >
          <Group justify="center" gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <UnstyledButton
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    position: 'relative',
                    padding: '9px 20px',
                    borderRadius: '999px',
                    background: isActive ? '#0b0f17' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1px solid #0b0f17' : '1px solid #e2e8f0',
                    boxShadow: isActive ? '0 4px 14px rgba(11, 15, 23, 0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 'clamp(0.8rem, 1.1vw, 0.9rem)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                  }}
                >
                  <Box style={{ color: isActive ? '#e01a2b' : '#64748b', transition: 'color 0.25s ease' }}>
                    {tab.icon}
                  </Box>
                  {tab.label}
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>

        {/* Interactive Content Stage */}
        <Box
          style={{
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
            overflow: 'hidden',
            minHeight: '380px',
          }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'story' && (
              <motion.div
                key="story"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ padding: 0 }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ alignItems: 'stretch' }}>
                  <Stack gap="lg" justify="center" p={{ base: 'xl', md: 48 }}>
                    <SectionEyebrow label="A Decade of Engineering" align="left" />
                    <Text
                      fw={800}
                      c="dark"
                      style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.7rem, 2.8vw, 2.3rem)', lineHeight: 1.15, letterSpacing: '-0.025em' }}
                    >
                      Founded in Mallam – Accra in 2014
                    </Text>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.8, fontSize: '1rem' }}>
                      {businessInfo.about}
                    </Text>
                    <Group gap="xs" pt="xs" wrap="wrap">
                      <Badge size="lg" variant="light" color="gray" radius="sm" style={{ fontWeight: 600, textTransform: 'none' }}>
                        100% Ghanaian Owned
                      </Badge>
                      <Badge size="lg" variant="light" color="gray" radius="sm" style={{ fontWeight: 600, textTransform: 'none' }}>
                        Accra Technical Support
                      </Badge>
                      <Badge size="lg" variant="light" color="fastrackRed" radius="sm" style={{ fontWeight: 700, textTransform: 'none' }}>
                        Tel: {businessInfo.phone}
                      </Badge>
                    </Group>
                  </Stack>

                  <Box
                    style={{
                      position: 'relative',
                      minHeight: '360px',
                      height: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src="/students-in-classroom.jpeg"
                      alt="Students in a Ghanaian classroom during continuous assessment"
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </Box>
                </SimpleGrid>
              </motion.div>
            )}

            {activeTab === 'mission' && (
              <motion.div
                key="mission"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ padding: 0 }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0} style={{ alignItems: 'stretch' }}>
                  <Stack gap="lg" justify="center" p={{ base: 'xl', md: 48 }}>
                    <SectionEyebrow label="Our Core Mission" align="left" />
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.3rem, 2.2vw, 1.85rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.mission}&rdquo;
                    </Text>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.65, fontSize: '0.94rem' }}>
                      We eliminate software frustration by ensuring every system we build is easy to adopt, lightning-fast to navigate, and rock-solid in financial and academic auditing.
                    </Text>
                  </Stack>

                  <Box
                    style={{
                      position: 'relative',
                      minHeight: '360px',
                      height: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src="/mother_child_phone.jpg"
                      alt="Ghanaian parent checking school notifications on phone"
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </Box>
                </SimpleGrid>
              </motion.div>
            )}

            {activeTab === 'vision' && (
              <motion.div
                key="vision"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ padding: 'clamp(24px, 4vw, 48px)' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 44 }} style={{ alignItems: 'center' }}>
                  <Stack gap="md">
                    <SectionEyebrow label="Our Long-Term Vision" align="left" color="#2563eb" />
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.3rem, 2.2vw, 1.85rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.vision}&rdquo;
                    </Text>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.65, fontSize: '0.94rem' }}>
                      Empowering every school, business, and enterprise across Ghana and the West African sub-region with accessible, world-class digital tools.
                    </Text>
                  </Stack>

                  <Stack gap="sm">
                    {[
                      { title: 'Regional Expansion', desc: 'Scaling dependable educational ERP across Ghana and West Africa.', icon: <Globe size={18} color="#e01a2b" /> },
                      { title: 'Mobile-First Experience', desc: 'Seamless portal access for parents, teachers, and proprietors on any device.', icon: <Zap size={18} color="#e01a2b" /> },
                      { title: 'Continuous Software Evolution', desc: 'Regular feature rollouts based directly on feedback from Ghanaian headmasters and bursars.', icon: <Target size={18} color="#e01a2b" /> },
                    ].map((item, i) => (
                      <Box
                        key={i}
                        p="md"
                        style={{
                          borderRadius: '14px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                        }}
                      >
                        <Box style={{ marginTop: 2, flexShrink: 0 }}>{item.icon}</Box>
                        <Box>
                          <Text size="sm" fw={700} c="dark" mb={2}>
                            {item.title}
                          </Text>
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.45 }}>
                            {item.desc}
                          </Text>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </SimpleGrid>
              </motion.div>
            )}

            {activeTab === 'values' && (
              <motion.div
                key="values"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ padding: 'clamp(24px, 4vw, 48px)' }}
              >
                <Stack gap="xl">
                  <Box style={{ textAlign: 'center' }} maw={600} mx="auto">
                    <Box mb={12} style={{ display: 'flex', justifyContent: 'center' }}>
                      <SectionEyebrow label="Operating Principles" />
                    </Box>
                    <Text size="xl" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem' }}>
                      Our 4 Core Operating Values
                    </Text>
                    <Text size="sm" c="dimmed" mt={4}>
                      These principles define how we build products, support schools, and work with clients every day.
                    </Text>
                  </Box>

                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={{ base: 'sm', md: 'md' }}>
                    {[
                      { name: 'Excellence', desc: 'Uncompromising commitment to high software quality, clean code, and zero downtime.', icon: <Award size={22} color="#e01a2b" />, bg: 'rgba(224, 26, 43, 0.1)' },
                      { name: 'Integrity', desc: 'Honest billing, transparent audits, and bank-grade data security with zero hidden fees.', icon: <ShieldCheck size={22} color="#e01a2b" />, bg: 'rgba(224, 26, 43, 0.1)' },
                      { name: 'Innovation', desc: 'Continually engineering modern features that solve real-world administrative challenges.', icon: <Zap size={22} color="#16a34a" />, bg: 'rgba(22, 163, 74, 0.1)' },
                      { name: 'Teamwork', desc: 'Collaborating closely with school owners, bursars, and teachers as a long-term partner.', icon: <Users size={22} color="#2563eb" />, bg: 'rgba(37, 99, 235, 0.1)' },
                    ].map((val, i) => (
                      <Box
                        key={i}
                        p={{ base: 'md', sm: 'lg' }}
                        style={{
                          borderRadius: '16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <Box
                          mb="sm"
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '14px',
                            background: val.bg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {val.icon}
                        </Box>
                        <Text
                          size="md"
                          fw={700}
                          c="dark"
                          mb={4}
                          style={{ fontSize: '1.05rem' }}
                        >
                          {val.name}
                        </Text>
                        <Text
                          size="xs"
                          c="dimmed"
                          style={{ lineHeight: 1.5, fontSize: '0.82rem' }}
                        >
                          {val.desc}
                        </Text>
                      </Box>
                    ))}
                  </SimpleGrid>
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Container>
    </Box>
  );
};

