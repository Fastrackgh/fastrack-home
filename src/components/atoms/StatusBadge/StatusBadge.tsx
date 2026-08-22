import React from 'react';
import { Box, Text } from '@mantine/core';

interface StatusBadgeProps {
  children: React.ReactNode;
  variantStyle?: 'red-subtle' | 'neutral' | 'pulse' | 'neip';
  pulseColor?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  children,
  variantStyle = 'red-subtle',
  style,
}) => {
  let bg = '#fef2f3';
  let color = '#e01a2b';
  let border = '1px solid #fecdd3';

  if (variantStyle === 'neutral') {
    bg = '#f8fafc';
    color = '#475569';
    border = '1px solid #e2e8f0';
  } else if (variantStyle === 'neip') {
    bg = '#0f172a';
    color = '#ffffff';
    border = '1px solid #334155';
  }

  return (
    <Box
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 12px',
        borderRadius: '6px',
        background: bg,
        border,
        fontSize: '0.75rem',
        fontWeight: 600,
        color,
        letterSpacing: '0.01em',
        fontFamily: 'var(--font-inter)',
        ...style,
      }}
    >
      <Text component="span" size="xs" fw={600} style={{ color: 'inherit' }}>
        {children}
      </Text>
    </Box>
  );
};
