import React from 'react';
import { Box, Text } from '@mantine/core';

interface CountdownUnitProps {
  value: number | string;
  label: string;
}

export const CountdownUnit: React.FC<CountdownUnitProps> = ({ value, label }) => {
  return (
    <Box
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        minWidth: '72px',
        textAlign: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.75rem',
          fontWeight: 800,
          lineHeight: 1,
          color: '#0f172a',
        }}
      >
        {typeof value === 'number' ? String(value).padStart(2, '0') : value}
      </Text>
      <Text
        size="xs"
        style={{
          fontFamily: 'var(--font-inter)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
          color: '#e01a2b',
          marginTop: 4,
          fontSize: '0.65rem',
        }}
      >
        {label}
      </Text>
    </Box>
  );
};
