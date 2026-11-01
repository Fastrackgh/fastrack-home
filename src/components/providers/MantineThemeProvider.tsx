'use client';

import { MantineProvider, localStorageColorSchemeManager } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { ThemeToggle } from '@/components/atoms';
import { isParentPath } from '@/lib/rbac/routes';
import { theme } from '@/theme/theme';

export function MantineThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const managerRef = useRef<ReturnType<typeof localStorageColorSchemeManager> | null>(null);

  if (!managerRef.current) {
    managerRef.current = localStorageColorSchemeManager({ key: 'fastrack-color-scheme' });
  }

  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="light"
      colorSchemeManager={managerRef.current}
    >
      <Notifications position="top-right" zIndex={1000} />
      {/* The parent portal has a bottom tab bar and its own appearance setting. */}
      {!isParentPath(pathname ?? '') && <ThemeToggle />}
      {children}
    </MantineProvider>
  );
}
