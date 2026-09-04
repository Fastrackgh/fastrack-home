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
      py={{ base: 48, md: 88 }}
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
          <Stack align="center" gap="xs" mb={{ base: 28, md: 44 }} style={{ textAlign: 'center' }}>
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
              Proven Track Record Since 2014
            </Badge>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.9rem, 3.5vw, 3rem)',
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
                fontSize: 'clamp(0.9rem, 1.2vw, 1rem)',
              }}
            >
              Delivering simple, dependable, and high-impact software solutions tailored for Ghanaian educational institutions and corporate enterprises since 2014.
            </Text>
          </Stack>
        </motion.div>

        {/* Tab Navigation Pill Bar (Scrollable on Mobile) */}
        <Box
          mb={{ base: 20, md: 32 }}
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
                    padding: '9px 18px',
                    borderRadius: '999px',
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    boxShadow: isActive ? '0 4px 12px rgba(15, 23, 42, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 'clamp(0.78rem, 1.1vw, 0.88rem)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    transition: 'all 0.25s ease',
                    cursor: 'pointer',
                  }}
                >
                  <Box style={{ color: isActive ? '#f97316' : '#64748b', transition: 'color 0.25s ease' }}>
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
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
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
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ padding: 'clamp(20px, 4vw, 44px)' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 40 }}>
                  <Stack gap="md">
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        background: '#fff7ed',
                        color: '#ea580c',
                        border: '1px solid #fed7aa',
                        width: 'fit-content',
                      }}
                    >
                      A DECADE OF ENGINEERING
                    </Badge>
                    <Text
                      size="xl"
                      fw={800}
                      c="dark"
                      style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)' }}
                    >
                      Founded in Mallam – Accra in 2014
                    </Text>
                    <Text size="md" c="dimmed" style={{ lineHeight: 1.7, fontSize: 'clamp(0.88rem, 1.1vw, 0.96rem)' }}>
                      {businessInfo.about}
                    </Text>
                    <Group gap="xs" pt="xs" wrap="wrap">
                      <Badge size="md" variant="outline" color="gray">
                        100% Ghanaian Owned
                      </Badge>
                      <Badge size="md" variant="outline" color="gray">
                        Accra Technical Support
                      </Badge>
                      <Badge size="md" variant="outline" color="orange">
                        Tel: {businessInfo.phone}
                      </Badge>
                    </Group>
                  </Stack>

                  <Box
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: '220px',
                      height: 'clamp(220px, 30vw, 340px)',
                      border: '1px solid #e2e8f0',
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
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ padding: 'clamp(20px, 4vw, 44px)' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 40 }}>
                  <Stack gap="md">
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        background: '#fef2f2',
                        color: '#e01a2b',
                        border: '1px solid #fecaca',
                        width: 'fit-content',
                      }}
                    >
                      OUR CORE MISSION
                    </Badge>
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.25rem, 2.2vw, 1.85rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.mission}&rdquo;
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6, fontSize: 'clamp(0.88rem, 1.1vw, 0.95rem)' }}>
                      We eliminate software frustration by ensuring every system we build is easy to adopt, lightning-fast to navigate, and rock-solid in financial and academic auditing.
                    </Text>
                  </Stack>

                  <Box
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: '220px',
                      height: 'clamp(220px, 30vw, 340px)',
                      border: '1px solid #e2e8f0',
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
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ padding: 'clamp(20px, 4vw, 44px)' }}
              >
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: 24, md: 40 }}>
                  <Stack gap="md">
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        width: 'fit-content',
                      }}
                    >
                      OUR LONG-TERM VISION
                    </Badge>
                    <Text
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'clamp(1.25rem, 2.2vw, 1.85rem)',
                        fontWeight: 700,
                        lineHeight: 1.35,
                        color: '#0f172a',
                      }}
                    >
                      &ldquo;{businessInfo.vision}&rdquo;
                    </Text>
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.6, fontSize: 'clamp(0.88rem, 1.1vw, 0.95rem)' }}>
                      Empowering every school, business, and enterprise across Ghana and the West African sub-region with accessible, world-class digital tools.
                    </Text>
                  </Stack>

                  <Stack gap="sm">
                    {[
                      { title: 'Regional Expansion', desc: 'Scaling dependable educational ERP across Ghana and West Africa.', icon: <Globe size={18} color="#f97316" /> },
                      { title: 'Mobile-First Experience', desc: 'Seamless portal access for parents, teachers, and proprietors on any device.', icon: <Zap size={18} color="#f97316" /> },
                      { title: 'Continuous Software Evolution', desc: 'Regular feature rollouts based directly on feedback from Ghanaian headmasters and bursars.', icon: <Target size={18} color="#f97316" /> },
                    ].map((item, i) => (
                      <Box
                        key={i}
                        p="sm"
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
                          <Text size="sm" fw={700} c="dark">
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
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{ padding: 'clamp(20px, 4vw, 44px)' }}
              >
                <Stack gap="lg">
                  <Box style={{ textAlign: 'center' }} maw={600} mx="auto">
                    <Badge
                      size="sm"
                      variant="light"
                      style={{
                        background: '#fff7ed',
                        color: '#ea580c',
                        border: '1px solid #fed7aa',
                        marginBottom: 8,
                      }}
                    >
                      WHAT GUIDES OUR WORK
                    </Badge>
                    <Text size="xl" fw={800} c="dark" style={{ fontFamily: 'var(--font-heading)' }}>
                      Our 4 Core Operating Values
                    </Text>
                    <Text size="xs" c="dimmed">
                      These principles define how we build products, support schools, and work with clients every single day.
                    </Text>
                  </Box>

                  <SimpleGrid cols={{ base: 2, sm: 2, md: 4 }} spacing={{ base: 'xs', sm: 'md' }}>
                    {[
                      { name: 'Excellence', desc: 'Uncompromising commitment to high software quality, clean code, and zero downtime.', icon: <Award size={20} color="#e01a2b" /> },
                      { name: 'Integrity', desc: 'Honest billing, transparent audits, and bank-grade data security with zero hidden fees.', icon: <ShieldCheck size={20} color="#f97316" /> },
                      { name: 'Innovation', desc: 'Continually engineering modern features that solve real-world administrative challenges.', icon: <Zap size={20} color="#16a34a" /> },
                      { name: 'Teamwork', desc: 'Collaborating closely with school owners, bursars, and teachers as a long-term partner.', icon: <Users size={20} color="#2563eb" /> },
                    ].map((val, i) => (
                      <Box
                        key={i}
                        p={{ base: 'xs', sm: 'md' }}
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
                          mb={{ base: 'xs', sm: 'sm' }}
                          style={{
                            width: 'clamp(36px, 4.5vw, 48px)',
                            height: 'clamp(36px, 4.5vw, 48px)',
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
                        <Text
                          size="sm"
                          fw={700}
                          c="dark"
                          mb={2}
                          style={{ fontSize: 'clamp(0.85rem, 1.2vw, 1rem)' }}
                        >
                          {val.name}
                        </Text>
                        <Text
                          size="xs"
                          c="dimmed"
                          style={{ lineHeight: 1.45, fontSize: 'clamp(0.7rem, 0.95vw, 0.8rem)' }}
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
