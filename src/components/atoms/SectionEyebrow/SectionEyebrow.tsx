import React from 'react';
import { Box, Group, Text } from '@mantine/core';

interface SectionEyebrowProps {
  label: string;
  align?: 'left' | 'center';
  color?: string;
  onDark?: boolean;
}

export const SectionEyebrow: React.FC<SectionEyebrowProps> = ({
  label,
  align = 'center',
  color = '#e01a2b',
  onDark = false,
}) => {
  return (
    <Group
      gap={12}
      justify={align === 'center' ? 'center' : 'flex-start'}
      align="center"
      wrap="nowrap"
    >
      {/* <Box style={{ width: 26, height: 2, borderRadius: 2, background: color }} /> */}
      <Text
        component="span"
        style={{
          color: onDark ? '#f9b8c0' : color,
          fontWeight: 700,
          fontSize: '0.76rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-inter)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Text>
    </Group>
  );
};
