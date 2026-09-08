'use client';

import React from 'react';
import { Box, Text, Group, Badge, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { CorporateService } from '@/data/businessInfo';

interface ServiceCardProps {
  service: CorporateService;
  icon: React.ReactNode;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, icon }) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Box
        style={{
          padding: 'clamp(18px, 2.5vw, 26px)',
          borderRadius: '18px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 14px rgba(15, 23, 42, 0.03)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#f9b8c0';
          e.currentTarget.style.boxShadow = '0 16px 32px -8px rgba(224, 26, 43, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 23, 42, 0.03)';
        }}
      >
        {/* Subtle accent bar at top */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #e01a2b 0%, #a80d1a 100%)',
            opacity: 0.8,
          }}
        />

        <Box>
          {/* Top Row: Icon & Badge */}
          <Group justify="space-between" align="center" mb="md" wrap="nowrap" gap={6}>
            <Box
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(224, 26, 43, 0.1)',
                color: '#e01a2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>

            <Badge
              variant="light"
              color="gray"
              size="xs"
              style={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#475569',
                fontSize: '0.72rem',
                padding: '4px 9px',
                height: 'auto',
                flexShrink: 0,
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
              }}
            >
              {service.badge}
            </Badge>
          </Group>

          {/* Title */}
          <Text
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 'clamp(1rem, 1.3vw, 1.18rem)',
              color: '#0f172a',
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            {service.title}
          </Text>

          {/* Short Description */}
          <Text
            size="sm"
            style={{
              fontFamily: 'var(--font-inter)',
              color: '#64748b',
              lineHeight: 1.55,
              fontSize: '0.88rem',
              marginBottom: 16,
            }}
          >
            {service.shortDesc}
          </Text>

          {/* Bullet Points */}
          <Stack gap={8} mb="md">
            {service.bulletPoints.map((point, index) => (
              <Group key={index} gap={8} wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: 'rgba(249, 115, 22, 0.15)',
                    color: '#ea580c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Check size={10} strokeWidth={3} />
                </Box>
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    color: '#334155',
                    lineHeight: 1.4,
                    fontWeight: 500,
                    fontSize: '0.82rem',
                  }}
                >
                  {point}
                </Text>
              </Group>
            ))}
          </Stack>
        </Box>

        {/* Core Objective Callout */}
        <Box
          style={{
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
            marginTop: 8,
          }}
        >
          <Text
            size="xs"
            fw={700}
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.68rem',
              color: '#ea580c',
              marginBottom: 2,
            }}
          >
            Core Objective
          </Text>
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-inter)',
              color: '#475569',
              lineHeight: 1.4,
              fontSize: '0.8rem',
            }}
          >
            {service.coreObjective}
          </Text>
        </Box>
      </Box>
    </motion.div>
  );
};

