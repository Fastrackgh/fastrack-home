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
      py={{ base: 60, md: 100 }}
      style={{
        background: '#f8fafc',
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: '80px',
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
          <Stack align="center" gap="xs" mb={{ base: 36, md: 48 }} style={{ textAlign: 'center' }}>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.1rem, 3.6vw, 3rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                color: '#0f172a',
                margin: 0,
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
                fontSize: '1rem',
              }}
            >
              Delivering simple, dependable, and high-impact software solutions tailored for Ghana since 2014.
            </Text>
          </Stack>
        </motion.div>

        {/* Tab Navigation Pill Bar */}
        <Group justify="center" gap="sm" mb={{ base: 24, md: 32 }} wrap="wrap">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <UnstyledButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  position: 'relative',
                  padding: '10px 20px',
                  borderRadius: '999px',
                  background: isActive ? '#0f172a' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                  cursor: 'pointer',
                }}
              >
                <Box style={{ color: isActive ? '#e01a2b' : '#64748b', transition: 'color 0.35s ease' }}>
                  {tab.icon}
                </Box>
                {tab.label}
              </UnstyledButton>
            );
          })}
        </Group>

        {/* Interactive Content Stage */}
        <Box
          style={{
            borderRadius: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden',
            minHeight: '380px',
          }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'story' && (
              <motion.div
                key="story"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
                style={{ padding: '40px 48px' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
                  <Stack gap="md">
                    <Badge size="sm" variant="light" color="red" w="fit-content">
                      A DECADE OF ENGINEERING
                    </Badge>
                    <Text size="xl" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Founded in Mallam – Accra in 2014
                    </Text>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.7 }}>
                      {businessInfo.about}
                    </Text>
                    <Group gap="md" pt="xs">
                      <Badge size="md" variant="outline" color="gray">
                        100% Ghanaian Owned
                      </Badge>
                      <Badge size="md" variant="outline" color="gray">
                        Accra Technical Support
                      </Badge>
                    </Group>
                  </Stack>

                  <Box
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      aspectRatio: '4 / 3',
                    }}
                  >
                    <Image
                      src="/students-in-classroom.jpeg"
                      alt="Students in a Ghanaian classroom during an examination"
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
                style={{ padding: '48px' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
                  <Stack gap="md">
                    <Badge size="sm" variant="light" color="red" w="fit-content">
                      OUR CORE MISSION
                    </Badge>
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.mission}&rdquo;
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      We eliminate software frustration by ensuring every system we build is easy to adopt, lightning-fast to navigate, and rock-solid in financial and academic auditing.
                    </Text>
                  </Stack>

                  <Box
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      aspectRatio: '4 / 3',
                    }}
                  >
                    <Image
                      src="/mother_child_phone.jpg"
                      alt="Ghanaian parent checking school notifications on phone at school gate"
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
                style={{ padding: '48px' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={40}>
                  <Stack gap="md">
                    <Badge size="sm" variant="light" color="cyan" w="fit-content">
                      OUR LONG-TERM VISION
                    </Badge>
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.vision}&rdquo;
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                      Empowering every school, business, and enterprise across Ghana and the West African sub-region with accessible, world-class digital tools.
                    </Text>
                  </Stack>

                  <Stack gap="sm">
                    {[
                      { title: 'Regional Expansion', desc: 'Scaling dependable educational ERP across Ghana and West Africa.', icon: <Globe size={18} color="#0ea5e9" /> },
                      { title: 'Mobile-First Experience', desc: 'Seamless portal access for parents, teachers, and proprietors on any device.', icon: <Zap size={18} color="#0ea5e9" /> },
                      { title: 'Continuous Software Evolution', desc: 'Regular feature rollouts based directly on feedback from Ghanaian headmasters and bursars.', icon: <Target size={18} color="#0ea5e9" /> },
                    ].map((item, i) => (
                      <Box
                        key={i}
                        p="md"
                        style={{
                          borderRadius: '12px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                        }}
                      >
                        <Box style={{ marginTop: 2, flexShrink: 0 }}>{item.icon}</Box>
                        <Box>
                          <Text size="sm" fw={700} c="dark">{item.title}</Text>
                          <Text size="xs" c="dimmed" style={{ lineHeight: 1.45 }}>{item.desc}</Text>
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
                style={{ padding: '48px' }}
              >
                <Stack gap="lg">
                  <Box style={{ textAlign: 'center' }} maw={600} mx="auto">
                    <Badge size="sm" variant="light" color="red" mb="xs">
                      WHAT GUIDES OUR WORK
                    </Badge>
                    <Text size="xl" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Our 4 Core Operating Values
                    </Text>
                    <Text size="xs" c="dimmed">
                      These principles define how we build products, support schools, and work with clients every single day.
                    </Text>
                  </Box>

                  <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                    {[
                      { name: 'Excellence', desc: 'Uncompromising commitment to high software quality, clean code, and zero downtime.', icon: <Award size={22} color="#e01a2b" /> },
                      { name: 'Integrity', desc: 'Honest billing, transparent audits, and bank-grade data security with zero hidden fees.', icon: <ShieldCheck size={22} color="#0ea5e9" /> },
                      { name: 'Innovation', desc: 'Continually engineering modern features that solve real-world administrative challenges.', icon: <Zap size={22} color="#16a34a" /> },
                      { name: 'Teamwork', desc: 'Collaborating closely with school owners, bursars, and teachers as a long-term partner.', icon: <Users size={22} color="#8b5cf6" /> },
                    ].map((val, i) => (
                      <Box
                        key={i}
                        p="lg"
                        style={{
                          borderRadius: '16px',
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          textAlign: 'center',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                        }}
                      >
                        <Box
                          mb="sm"
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {val.icon}
                        </Box>
                        <Text size="md" fw={700} c="dark" mb={4}>{val.name}</Text>
                        <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>{val.desc}</Text>
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
