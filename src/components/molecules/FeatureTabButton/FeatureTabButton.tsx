'use client';

import React from 'react';
import { UnstyledButton, Group, Box, Text, Badge } from '@mantine/core';

interface FeatureTabButtonProps {
  id: string;
  title: string;
  badge?: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

export const FeatureTabButton: React.FC<FeatureTabButtonProps> = ({
  title,
  badge,
  icon,
  isActive,
  onClick,
}) => {
  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: '14px',
        background: isActive ? '#ffffff' : 'transparent',
        border: isActive ? '1px solid #e2e8f0' : '1px solid transparent',
        boxShadow: isActive ? '0 8px 20px -4px rgba(11, 15, 23, 0.06)' : 'none',
        transition: 'all 0.2s ease',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <Group justify="space-between" wrap="nowrap" align="center">
        <Group gap="sm" wrap="nowrap">
          <Box
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive
                ? 'linear-gradient(135deg, #e01a2b 0%, #cb1323 100%)'
                : 'rgba(226, 232, 240, 0.7)',
              color: isActive ? '#ffffff' : '#64748b',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Text
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: isActive ? 700 : 600,
                fontSize: '0.95rem',
                color: isActive ? '#0f172a' : '#475569',
                lineHeight: 1.2,
              }}
            >
              {title}
            </Text>
          </Box>
        </Group>

        {badge && (
          <Badge
            size="xs"
            radius="sm"
            variant={isActive ? 'filled' : 'outline'}
            color={isActive ? 'fastrackRed' : 'gray'}
            style={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.65rem',
              flexShrink: 0,
            }}
          >
            {badge}
          </Badge>
        )}
      </Group>
    </UnstyledButton>
  );
};
