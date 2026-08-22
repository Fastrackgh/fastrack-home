import React from 'react';
import { Group, Box, Text } from '@mantine/core';

interface ContactInfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subvalue?: string;
  href?: string;
}

export const ContactInfoItem: React.FC<ContactInfoItemProps> = ({
  icon,
  label,
  value,
  subvalue,
  href,
}) => {
  const content = (
    <Group gap="md" wrap="nowrap" align="flex-start">
      <Box
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(224, 26, 43, 0.08)',
          border: '1px solid rgba(224, 26, 43, 0.2)',
          color: '#e01a2b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Text
          size="xs"
          c="dimmed"
          style={{
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 600,
            fontSize: '0.7rem',
            marginBottom: 2,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: 'var(--font-inter)',
            fontWeight: 700,
            fontSize: '0.95rem',
            color: '#0f172a',
            lineHeight: 1.3,
          }}
        >
          {value}
        </Text>
        {subvalue && (
          <Text
            size="xs"
            c="dimmed"
            style={{
              fontFamily: 'var(--font-inter)',
              marginTop: 2,
            }}
          >
            {subvalue}
          </Text>
        )}
      </Box>
    </Group>
  );

  if (href) {
    return (
      <a
        href={href}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          transition: 'opacity 0.2s ease',
        }}
      >
        {content}
      </a>
    );
  }

  return content;
};
