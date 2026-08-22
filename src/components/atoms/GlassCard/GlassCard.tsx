import React from 'react';
import { Paper, PaperProps } from '@mantine/core';

interface GlassCardProps extends Omit<PaperProps, 'style'> {
  variantStyle?: 'light' | 'dark' | 'interactive' | 'dashboard';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variantStyle = 'light',
  children,
  style,
  ...props
}) => {
  let customStyle: React.CSSProperties = {
    borderRadius: '12px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    ...style,
  };

  if (variantStyle === 'light') {
    customStyle = {
      ...customStyle,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    };
  } else if (variantStyle === 'interactive') {
    customStyle = {
      ...customStyle,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
    };
  } else if (variantStyle === 'dark') {
    customStyle = {
      ...customStyle,
      background: '#0f172a',
      border: '1px solid #1e293b',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      color: '#ffffff',
    };
  } else if (variantStyle === 'dashboard') {
    customStyle = {
      ...customStyle,
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.04)',
    };
  }

  return (
    <Paper style={customStyle} {...props}>
      {children}
    </Paper>
  );
};
