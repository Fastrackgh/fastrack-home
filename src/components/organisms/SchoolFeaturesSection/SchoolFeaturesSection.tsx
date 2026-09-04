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
        paddingTop: 'clamp(56px, 8vw, 96px)',
        paddingBottom: 'clamp(56px, 8vw, 96px)',
      }}
    >
      {/* Decorative background gradient blob */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-120px',
          width: '550px',
          height: '550px',
          background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container size="xl" style={{ position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <Stack align="center" gap="xs" mb={{ base: 32, md: 56 }}>
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
              School ERP System Architecture
            </Badge>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(1.9rem, 3.5vw, 3.1rem)',
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
                  background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
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
                maxWidth: 600,
                textAlign: 'center',
                lineHeight: 1.6,
                color: '#64748b',
                marginTop: 6,
                fontSize: 'clamp(0.9rem, 1.2vw, 1rem)',
              }}
            >
              Six deeply integrated modules that automate your school's entire workflow — from first enrollment to final grading.
            </Text>
          </Stack>
        </motion.div>

        {/* Mobile Horizontal Selector Pills (Visible on Mobile & Tablet) */}
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
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: isActive ? '#0f172a' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  border: isActive ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.15)' : 'none',
                }}
              >
                <Box style={{ color: isActive ? '#f97316' : '#64748b' }}>{getIcon(mod.id, 16)}</Box>
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
            <Stack gap={8}>
              {schoolModules.map((mod, idx) => {
                const isActive = activeModuleId === mod.id;
                return (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05, duration: 0.35 }}
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Box
                      onClick={() => setActiveModuleId(mod.id)}
                      style={{
                        padding: '14px 18px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        background: isActive ? '#0f172a' : '#ffffff',
                        border: isActive ? '1px solid #1e293b' : '1px solid #e2e8f0',
                        boxShadow: isActive
                          ? '0 12px 28px -6px rgba(15, 23, 42, 0.25)'
                          : '0 2px 6px rgba(0,0,0,0.02)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        position: 'relative',
                      }}
                    >
                      {/* Icon */}
                      <Box
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          background: isActive ? 'rgba(249,115,22,0.18)' : '#f8fafc',
                          border: isActive ? '1px solid rgba(249,115,22,0.35)' : '1px solid #e2e8f0',
                          color: isActive ? '#f97316' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.3s ease',
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
                          }}
                        >
                          {mod.title}
                        </Text>
                        <Badge
                          size="xs"
                          variant="light"
                          style={{
                            background: isActive ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                            color: isActive ? '#fdba74' : '#64748b',
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
                          color: isActive ? '#f97316' : '#cbd5e1',
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
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
                      whileHover={{ scale: 1.08, rotate: 4 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: '14px',
                        background: 'rgba(249,115,22,0.18)',
                        border: '1px solid rgba(249,115,22,0.35)',
                        color: '#f97316',
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
                          color: '#fdba74',
                          border: '1px solid rgba(255,255,255,0.15)',
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {activeModule.badge}
                      </Badge>
                      <Text size="xs" style={{ color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                        {activeModule.metricLabel}: <strong style={{ color: '#f97316' }}>{activeModule.metricValue}</strong>
                      </Text>
                    </Box>
                  </Group>

                  <Text
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: 'clamp(1.25rem, 2.2vw, 1.65rem)',
                      color: '#ffffff',
                      lineHeight: 1.25,
                      marginTop: 16,
                      marginBottom: 8,
                    }}
                  >
                    {activeModule.headline}
                  </Text>

                  <Text
                    size="sm"
                    style={{
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.65,
                      fontSize: 'clamp(0.88rem, 1.1vw, 0.95rem)',
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
                      marginBottom: 14,
                    }}
                  >
                    Core Capabilities & Automations
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {activeModule.features.map((feat, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                      >
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                          <Box
                            style={{
                              width: 20,
                              height: 20,
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
                            <CheckCircle2 size={12} color="#f97316" />
                          </Box>
                          <Text
                            size="xs"
                            style={{
                              color: 'rgba(255,255,255,0.8)',
                              lineHeight: 1.5,
                              fontWeight: 500,
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
                  <Text size="xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Module {activeIdx + 1} of {schoolModules.length} · Fastrack EduSuite Cloud
                  </Text>

                  <motion.div whileHover={{ scale: 1.04, x: 2 }} whileTap={{ scale: 0.96 }}>
                    <Box
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 20px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(249,115,22,0.4)',
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
