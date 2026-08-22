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
        paddingTop: '96px',
        paddingBottom: '96px',
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
          background: 'radial-gradient(circle, rgba(224,26,43,0.08) 0%, transparent 70%)',
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
          <Stack align="center" gap="xs" mb={60}>
            {/* <motion.div whileHover={{ scale: 1.05 }}>
              <Box
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 14px',
                  borderRadius: '999px',
                  background: 'rgba(15,23,42,0.06)',
                  border: '1px solid rgba(15,23,42,0.12)',
                  marginBottom: '4px',
                }}
              >
                <Text size="xs" fw={700} style={{ color: '#0f172a', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  School ERP System Architecture
                </Text>
              </Box>
            </motion.div> */}

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: 'clamp(2rem, 3.5vw, 3.1rem)',
                lineHeight: 1.1,
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
                  background: 'linear-gradient(135deg, #e01a2b 0%, #b91c1c 100%)',
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
                marginTop: 8,
              }}
            >
              Six deeply integrated modules that automate your school's entire workflow — from first enrollment to final grading.
            </Text>
          </Stack>
        </motion.div>

        {/* Module selector + detail panel */}
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: '350px 1fr',
            gap: '24px',
            alignItems: 'start',
          }}
          className="modules-grid"
        >
          {/* Left: module list with staggered motion */}
          <Stack gap={8}>
            {schoolModules.map((mod, idx) => {
              const isActive = activeModuleId === mod.id;
              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  whileHover={{ x: 6 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Box
                    onClick={() => setActiveModuleId(mod.id)}
                    style={{
                      padding: '16px 20px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      background: isActive ? '#0f172a' : '#ffffff',
                      border: isActive ? '1px solid #1e293b' : '1px solid #e2e8f0',
                      boxShadow: isActive
                        ? '0 12px 28px -6px rgba(15, 23, 42, 0.25)'
                        : '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
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
                        background: isActive ? 'rgba(224,26,43,0.15)' : '#f8fafc',
                        border: isActive ? '1px solid rgba(224,26,43,0.3)' : '1px solid #e2e8f0',
                        color: isActive ? '#e01a2b' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                      }}
                    >
                      {getIcon(mod.id, 19)}
                    </Box>

                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="sm"
                        fw={700}
                        style={{
                          color: isActive ? '#ffffff' : '#0f172a',
                          lineHeight: 1.3,
                          transition: 'color 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                        }}
                      >
                        {mod.title}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        style={{
                          background: isActive ? 'rgba(255,255,255,0.08)' : '#f1f5f9',
                          color: isActive ? '#cbd5e1' : '#64748b',
                          border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                          textTransform: 'none',
                          fontWeight: 600,
                          marginTop: 5,
                          transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
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
                        transition: 'all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
                        transform: isActive ? 'translateX(2px)' : 'none',
                      }}
                    />
                  </Box>
                </motion.div>
              );
            })}
          </Stack>

          {/* Right: active module detail card with Framer Motion AnimatePresence */}
          <Box
            style={{
              position: 'sticky',
              top: '96px',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1.0] }}
                style={{
                  borderRadius: '20px',
                  background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                  overflow: 'hidden',
                }}
              >
                {/* Card top bar */}
                <Box
                  style={{
                    padding: '28px 32px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    paddingBottom: '24px',
                  }}
                >
                  <Group justify="space-between" align="flex-start">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: '14px',
                        background: 'rgba(224,26,43,0.15)',
                        border: '1px solid rgba(224,26,43,0.3)',
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
                          background: 'rgba(255,255,255,0.07)',
                          color: 'rgba(255,255,255,0.7)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          textTransform: 'none',
                          fontWeight: 600,
                        }}
                      >
                        {activeModule.badge}
                      </Badge>
                      <Text
                        size="xs"
                        style={{ color: 'rgba(255,255,255,0.4)', marginTop: 6 }}
                      >
                        {activeModule.metricLabel}: <strong style={{ color: '#e01a2b' }}>{activeModule.metricValue}</strong>
                      </Text>
                    </Box>
                  </Group>

                  <Text
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 800,
                      fontSize: '1.55rem',
                      color: '#ffffff',
                      lineHeight: 1.25,
                      marginTop: 18,
                      marginBottom: 10,
                    }}
                  >
                    {activeModule.headline}
                  </Text>

                  <Text
                    size="sm"
                    style={{
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.65,
                    }}
                  >
                    {activeModule.description}
                  </Text>
                </Box>

                {/* Features grid with staggered checkmark animation */}
                <Box style={{ padding: '24px 32px' }}>
                  <Text
                    size="xs"
                    fw={700}
                    style={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'rgba(255,255,255,0.35)',
                      marginBottom: 16,
                    }}
                  >
                    Module Capabilities
                  </Text>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    {activeModule.features.map((feat, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                      >
                        <Group gap="xs" wrap="nowrap" align="flex-start">
                          <Box
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: 'rgba(224,26,43,0.18)',
                              border: '1px solid rgba(224,26,43,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              marginTop: 2,
                            }}
                          >
                            <CheckCircle2 size={12} color="#e01a2b" />
                          </Box>
                          <Text
                            size="xs"
                            style={{
                              color: 'rgba(255,255,255,0.7)',
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
                    padding: '20px 32px',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text size="xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Module {activeIdx + 1} of {schoolModules.length} · Fastrack Early Adopter Program
                  </Text>

                  <motion.div whileHover={{ scale: 1.05, x: 2 }} whileTap={{ scale: 0.95 }}>
                    <Box
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 22px',
                        borderRadius: '8px',
                        background: '#e01a2b',
                        color: '#ffffff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(224,26,43,0.35)',
                      }}
                      onClick={() => window.location.href = '/coming-soon'}
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
        @media (max-width: 768px) {
          .modules-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </Box>
  );
};
