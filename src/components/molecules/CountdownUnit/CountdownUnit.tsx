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
        padding: 'clamp(8px, 1.5vw, 12px) clamp(10px, 2vw, 16px)',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        minWidth: 'clamp(58px, 18vw, 76px)',
        textAlign: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
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
          color: '#ea580c',
          marginTop: 4,
          fontSize: 'clamp(0.58rem, 1.2vw, 0.65rem)',
        }}
      >
        {label}
      </Text>
    </Box>
  );
};
