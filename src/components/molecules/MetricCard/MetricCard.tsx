'use client';

import React from 'react';
import { Box, Text, Group } from '@mantine/core';

interface MetricCardProps {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  sublabel,
  icon,
}) => {
  return (
    <Box
      style={{
        padding: '24px 20px',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = '#cbd5e1';
        e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(11, 15, 23, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#e2e8f0';
        e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.03)';
      }}
    >
      <Group justify="space-between" align="flex-start" mb="sm">
        <Text
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2.25rem',
            fontWeight: 800,
            lineHeight: 1,
            color: '#0b0f17',
            letterSpacing: '-0.03em',
          }}
        >
          {value}
        </Text>
        {icon && (
          <Box
            style={{
              padding: 8,
              borderRadius: 10,
              background: 'rgba(224, 26, 43, 0.08)',
              color: '#e01a2b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        )}
      </Group>

      <Box>
        <Text
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#0f172a',
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {label}
        </Text>
        {sublabel && (
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily: 'var(--font-inter)',
              lineHeight: 1.4,
            }}
          >
            {sublabel}
          </Text>
        )}
      </Box>
    </Box>
  );
};
