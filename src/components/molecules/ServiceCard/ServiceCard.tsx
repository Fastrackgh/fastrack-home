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
      whileHover={{ y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%' }}
    >
      <Box
        style={{
          padding: '32px 28px',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e1';
          e.currentTarget.style.boxShadow = '0 20px 40px -8px rgba(11, 15, 23, 0.09)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)';
        }}
      >
        <Box>
          <Group justify="space-between" align="center" mb="lg">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
              transition={{ duration: 0.4 }}
            >
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(224, 26, 43, 0.08)',
                  color: '#e01a2b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {icon}
              </Box>
            </motion.div>
            <Badge
              variant="light"
              color="gray"
              size="sm"
              style={{
                textTransform: 'none',
                fontWeight: 600,
                color: '#475569',
              }}
            >
              {service.badge}
            </Badge>
          </Group>

          <Text
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '1.2rem',
              color: '#0f172a',
              lineHeight: 1.3,
              marginBottom: 8,
            }}
          >
            {service.title}
          </Text>

          <Text
            size="sm"
            c="dimmed"
            style={{
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.5,
              marginBottom: 20,
            }}
          >
            {service.shortDesc}
          </Text>

          <Stack gap={10} mb="xl">
            {service.bulletPoints.map((point, index) => (
              <Group key={index} gap="xs" wrap="nowrap" align="flex-start">
                <Box
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'rgba(224, 26, 43, 0.08)',
                    color: '#e01a2b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Check size={12} strokeWidth={3} />
                </Box>
                <Text
                  size="xs"
                  style={{
                    fontFamily: 'var(--font-inter)',
                    color: '#475569',
                    lineHeight: 1.4,
                    fontWeight: 500,
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
            padding: '14px 16px',
            borderRadius: '12px',
            background: '#f8fafc',
            border: '1px solid #f1f5f9',
          }}
        >
          <Text
            size="xs"
            fw={700}
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.65rem',
              color: '#e01a2b',
              marginBottom: 4,
            }}
          >
            Core Objective
          </Text>
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-inter)',
              color: '#334155',
              lineHeight: 1.4,
            }}
          >
            {service.coreObjective}
          </Text>
        </Box>
      </Box>
    </motion.div>
  );
};
