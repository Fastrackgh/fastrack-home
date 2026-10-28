'use client';

import React from 'react';
import { Alert, Button, type AlertProps } from '@mantine/core';
import { AlertCircle } from 'lucide-react';

/** A red alert for a failed action; renders nothing without a message. */
export function ErrorAlert({
  children,
  ...props
}: Omit<AlertProps, 'color' | 'icon'> & { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <Alert color="red" radius="md" icon={<AlertCircle size={16} />} {...props}>
      {children}
    </Alert>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="xs" variant="light" color="red" onClick={onClick}>
      Try again
    </Button>
  );
}
