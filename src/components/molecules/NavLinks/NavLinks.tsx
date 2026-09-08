'use client';

import React from 'react';
import { Group, UnstyledButton, Text, Box } from '@mantine/core';

interface NavLinksProps {
  orientation?: 'horizontal' | 'vertical';
  onItemClick?: () => void;
}

export const navItems = [
  { label: 'School ERP', href: '#school-erp' },
  { label: 'Enterprise Services', href: '#services' },
  { label: 'Security & Cloud', href: '#security' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
];

export const NavLinks: React.FC<NavLinksProps> = ({
  orientation = 'horizontal',
  onItemClick,
}) => {
  const handleScroll = (href: string) => {
    if (onItemClick) onItemClick();
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <Group
      gap={orientation === 'horizontal' ? 'lg' : 'sm'}
      style={{
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        alignItems: orientation === 'horizontal' ? 'center' : 'flex-start',
        width: orientation === 'vertical' ? '100%' : 'auto',
      }}
    >
      {navItems.map((item) => (
        <UnstyledButton
          key={item.label}
          onClick={() => handleScroll(item.href)}
          style={{
            padding: orientation === 'horizontal' ? '6px 10px' : '10px 12px',
            borderRadius: '8px',
            position: 'relative',
            transition: 'all 0.2s ease',
            width: orientation === 'vertical' ? '100%' : 'auto',
          }}
          onMouseEnter={(e) => {
            if (orientation === 'vertical') {
              e.currentTarget.style.backgroundColor = '#f8fafc';
            }
          }}
          onMouseLeave={(e) => {
            if (orientation === 'vertical') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <Text
            size="sm"
            style={{
              fontFamily: 'var(--font-inter)',
              fontWeight: 500,
              color: '#334155',
              fontSize: '0.9rem',
              transition: 'color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e01a2b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#334155';
            }}
          >
            {item.label}
          </Text>
        </UnstyledButton>
      ))}
    </Group>
  );
};

