'use client';

import React from 'react';
import { Box, Text, Group, Badge, Stack } from '@mantine/core';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CorporateService } from '@/data/businessInfo';

interface ServiceCardProps {
  service: CorporateService;
  icon: React.ReactNode;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, icon }) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Box
        style={{
          padding: 'clamp(12px, 2.5vw, 24px)',
          borderRadius: '16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#fdba74';
          e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(249, 115, 22, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
        }}
      >
        <Box>
          {/* Top Row: Icon & Badge */}
          <Group justify="space-between" align="center" mb={{ base: 'xs', sm: 'md' }} wrap="nowrap" gap={6}>
            <Box
              style={{
                width: 'clamp(34px, 4.5vw, 46px)',
                height: 'clamp(34px, 4.5vw, 46px)',
                borderRadius: 10,
                background: 'rgba(249, 115, 22, 0.12)',
                color: '#ea580c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'clamp(7px, 1vw, 10px)',
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
                fontSize: 'clamp(8px, 1vw, 11px)',
                padding: '3px 8px',
                height: 'auto',
                flexShrink: 0,
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
              fontSize: 'clamp(0.85rem, 1.3vw, 1.15rem)',
              color: '#0f172a',
              lineHeight: 1.25,
              marginBottom: 6,
            }}
          >
            {service.title}
          </Text>

          {/* Short Description */}
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.45,
              fontSize: 'clamp(0.72rem, 1.05vw, 0.86rem)',
              marginBottom: 12,
            }}
          >
            {service.shortDesc}
          </Text>

          {/* Bullet Points */}
          <Stack gap={6} mb="md">
            {service.bulletPoints.map((point, index) => (
              <Group key={index} gap={6} wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 14,
                    height: 14,
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
                  <Check size={9} strokeWidth={3} />
                </Box>
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    color: '#475569',
                    lineHeight: 1.35,
                    fontWeight: 500,
                    fontSize: 'clamp(0.68rem, 0.95vw, 0.8rem)',
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
            padding: 'clamp(8px, 1.5vw, 12px)',
            borderRadius: '10px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
          }}
        >
          <Text
            size="xs"
            fw={700}
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontSize: 'clamp(0.58rem, 0.8vw, 0.65rem)',
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
              color: '#334155',
              lineHeight: 1.35,
              fontSize: 'clamp(0.66rem, 0.9vw, 0.78rem)',
            }}
          >
            {service.coreObjective}
          </Text>
        </Box>
      </Box>
    </motion.div>
  );
};
