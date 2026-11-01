'use client';

import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tooltip label={isDark ? 'Switch to light mode' : 'Switch to dark mode'} position="left">
      <ActionIcon
        aria-label="Toggle color scheme"
        variant="filled"
        color={isDark ? 'yellow' : 'gray'}
        radius="xl"
        size="lg"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          zIndex: 200,
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}
