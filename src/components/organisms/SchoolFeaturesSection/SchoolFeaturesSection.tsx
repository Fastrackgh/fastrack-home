'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Group,
  Text,
  SimpleGrid,
  Badge,
  UnstyledButton,
} from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { schoolModules } from '@/data/schoolModules';
import { SectionEyebrow } from '@/components/atoms';
import {
  UserCheck,
  GraduationCap,
  CreditCard,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  Building2,
  ArrowRight,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const SchoolFeaturesSection: React.FC = () => {
  const [activeModuleId, setActiveModuleId] = useState<string>(schoolModules[0].id);

  const activeModule =
    schoolModules.find((m) => m.id === activeModuleId) || schoolModules[0];

  const getIcon = (id: string, size = 20) => {
    switch (id) {
      case 'admissions':
        return <UserCheck size={size} />;
      case 'academics':
        return <GraduationCap size={size} />;
      case 'fees':
        return <CreditCard size={size} />;
      case 'sms':
        return <MessageSquare size={size} />;
      case 'mobile-portals':
        return <Smartphone size={size} />;
      case 'staff-payroll':
        return <Building2 size={size} />;
      default:
        return <UserCheck size={size} />;
    }
  };

  const activeIdx = schoolModules.findIndex((m) => m.id === activeModuleId);

  return (
    <Box
      id="school-erp"
      component="section"
      style={{
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: 'clamp(64px, 8vw, 104px)',
        paddingBottom: 'clamp(64px, 8vw, 104px)',
      }}
    >
      <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="md" mb={{ base: 32, md: 52 }}>
            <SectionEyebrow label="School ERP Architecture" />

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
              Everything your school needs,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #eb5969 0%, #e01a2b 60%, #a80d1a 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                one unified platform
              </span>
            </h2>

            <Text
              size="md"
              style={{
                maxWidth: 620,
                textAlign: 'center',
                lineHeight: 1.6,
                color: '#64748b',
                marginTop: 4,
                fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              }}
            >
              Six deeply integrated modules that automate your school&apos;s entire workflow — from initial admissions to terminal grading and staff payroll.
            </Text>
          </Stack>
        </motion.div>

        {/* Mobile Horizontal Selector Pills */}
        <Box
          hiddenFrom="md"
          mb="lg"
          style={{
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '8px',
            display: 'flex',
            gap: '8px',
          }}
        >
          {schoolModules.map((mod) => {
            const isActive = activeModuleId === mod.id;
            return (
              <UnstyledButton
                key={mod.id}
                onClick={() => setActiveModuleId(mod.id)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '999px',
                  background: isActive ? '#0f172a' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.15)' : 'none',
                }}
              >
                <Box style={{ color: isActive ? '#e01a2b' : '#64748b' }}>{getIcon(mod.id, 16)}</Box>
                <span>{mod.shortTitle || mod.title}</span>
              </UnstyledButton>
            );
          })}
        </Box>

        {/* Desktop Layout: Module list + detail card */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 340px) 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
          className="modules-desktop-grid"
        >
          {/* Left: module list (Visible on Desktop) */}
          <Box visibleFrom="md">
            <Stack gap={10}>
              {schoolModules.map((mod, idx) => {
                const isActive = activeModuleId === mod.id;
                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Box
                      onClick={() => setActiveModuleId(mod.id)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: isActive ? '#0b0f17' : '#ffffff',
                        border: isActive ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        boxShadow: isActive
                          ? '0 12px 28px -6px rgba(11, 15, 23, 0.25)'
                          : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.25s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        position: 'relative',
                      }}
                    >
                      {/* Icon */}
                      <Box
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '10px',
                          background: isActive ? 'rgba(224,26,43,0.16)' : '#f8fafc',
                          border: isActive ? '1px solid rgba(224,26,43,0.32)' : '1px solid #e2e8f0',
                          color: isActive ? '#e01a2b' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.25s ease',
                        }}
                      >
                        {getIcon(mod.id, 18)}
                      </Box>

                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          size="sm"
                          fw={700}
                          style={{
                            color: isActive ? '#ffffff' : '#0f172a',
                            lineHeight: 1.3,
                            fontSize: '0.92rem',
                          }}
                        >
                          {mod.title}
                        </Text>
                        <Badge
                          size="xs"
                          variant="light"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                            color: isActive ? '#f9b8c0' : '#64748b',
                            border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                            textTransform: 'none',
                            fontWeight: 600,
                            marginTop: 4,
                          }}
                        >
                          {mod.badge}
                        </Badge>
                      </Box>

                      <ChevronRight
                        size={16}
                        style={{
                          color: isActive ? '#e01a2b' : '#cbd5e1',
                          flexShrink: 0,
                          transform: isActive ? 'translateX(2px)' : 'none',
                        }}
                      />
                    </Box>
                  </motion.div>
                );
              })}
            </Stack>
          </Box>

          {/* Right: active module detail card */}
          <Box style={{ width: '100%' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #0b0f17 0%, #1e293b 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.22)',
                  overflow: 'hidden',
                }}
              >
                {/* Card Top Bar */}
                <Box
                  style={{
                    padding: 'clamp(20px, 3.5vw, 32px)',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <motion.div
                      whileHover={{ scale: 1.06, rotate: 3 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '14px',
                        background: 'rgba(224,26,43,0.16)',
                        border: '1px solid rgba(224,26,43,0.32)',
                        color: '#e01a2b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {getIcon(activeModule.id, 24)}
                    </motion.div>

                    <Box style={{ textAlign: 'right' }}>
                      <Badge
                        size="sm"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          color: '#f9b8c0',
                          border: '1px solid rgba(255,255,255,0.15)',
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {activeModule.badge}
                      </Badge>
                      <Text size="xs" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        {activeModule.metricLabel}: <strong style={{ color: '#f9b8c0' }}>{activeModule.metricValue}</strong>
                      </Text>
                    </Box>
                  </Group>

                  <Text
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 'clamp(1.3rem, 2.2vw, 1.75rem)',
                      color: '#ffffff',
                      lineHeight: 1.25,
                      marginTop: 18,
                      marginBottom: 8,
                    }}
                  >
                    {activeModule.headline}
                  </Text>

                  <Text
                    size="sm"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      lineHeight: 1.65,
                      fontSize: 'clamp(0.88rem, 1.1vw, 0.98rem)',
                    }}
                  >
                    {activeModule.description}
                  </Text>
                </Box>

                {/* Features Grid */}
                <Box style={{ padding: 'clamp(20px, 3.5vw, 32px)' }}>
                  <Text
                    size="xs"
                    fw={700}
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 16,
                    }}
                  >
                    Core Capabilities & Automations
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {activeModule.features.map((feat, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04, duration: 0.25 }}
                      >
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                          <Box
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: '50%',
                              background: 'rgba(249,115,22,0.2)',
                              border: '1px solid rgba(249,115,22,0.4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            <CheckCircle2 size={13} color="#f97316" />
                          </Box>
                          <Text
                            size="xs"
                            style={{
                              color: 'rgba(255,255,255,0.85)',
                              lineHeight: 1.5,
                              fontWeight: 500,
                              fontSize: '0.86rem',
                            }}
                          >
                            {feat}
                          </Text>
                        </Group>
                      </motion.div>
                    ))}
                  </SimpleGrid>
                </Box>

                {/* Footer CTA */}
                <Box
                  style={{
                    padding: '16px clamp(20px, 3.5vw, 32px)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text size="xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Module {activeIdx + 1} of {schoolModules.length} • Fastrack EduSuite Cloud
                  </Text>

                  <motion.div whileHover={{ scale: 1.03, x: 2 }} whileTap={{ scale: 0.97 }}>
                    <Box
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 20px',
                        borderRadius: '999px',
                        background: 'linear-gradient(135deg, #e01a2b 0%, #a80d1a 100%)',
                        color: '#ffffff',
                        fontSize: '0.86rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(224,26,43,0.4)',
                      }}
                      onClick={() => (window.location.href = '/coming-soon')}
                    >
                      Request Early Access
                      <ArrowRight size={14} />
                    </Box>
                  </motion.div>
                </Box>
              </motion.div>
            </AnimatePresence>
          </Box>
        </Box>
      </Container>

      <style>{`
        @media (max-width: 991px) {
          .modules-desktop-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Box>
  );
};

