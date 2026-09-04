import React from 'react';
import Link from 'next/link';
import { Button, ButtonProps, ActionIcon } from '@mantine/core';
import { Play, ArrowRight } from 'lucide-react';

interface ActionButtonProps extends Omit<ButtonProps, 'style'> {
  variantStyle?: 'primary' | 'secondary' | 'play' | 'ghost' | 'dark' | 'outline-red';
  href?: string;
  withArrow?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  variantStyle = 'primary',
  href,
  withArrow = false,
  children,
  onClick,
  style,
  ...props
}) => {
  // Play Button Variant (Circle with Lucide Play Icon)
  if (variantStyle === 'play') {
    const playContent = (
      <ActionIcon
        size={46}
        radius="xl"
        variant="white"
        onClick={onClick}
        style={{
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          color: '#0b0f17',
          transition: 'all 0.2s ease',
          ...style,
        }}
      >
        <Play size={18} fill="#0b0f17" style={{ marginLeft: 2 }} />
      </ActionIcon>
    );

    return href ? <Link href={href}>{playContent}</Link> : playContent;
  }

  // Determine styles by variant
  let customStyle: React.CSSProperties = {
    fontFamily: 'var(--font-inter)',
    fontWeight: 600,
    fontSize: '0.9rem',
    borderRadius: '9999px',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    ...style,
  };

  let rootColor = 'fastrackRed';
  let buttonVariant: ButtonProps['variant'] = 'filled';

  if (variantStyle === 'primary') {
    customStyle = {
      ...customStyle,
      background: '#e01a2b',
      color: '#ffffff',
      boxShadow: '0 8px 18px -10px rgba(224, 26, 43, 0.5)',
    };
  } else if (variantStyle === 'dark') {
    customStyle = {
      ...customStyle,
      background: '#0b0f17',
      color: '#ffffff',
      boxShadow: '0 8px 16px -12px rgba(11, 15, 23, 0.35)',
    };
  } else if (variantStyle === 'secondary') {
    buttonVariant = 'default';
    customStyle = {
      ...customStyle,
      background: '#ffffff',
      color: '#1e293b',
      border: '1px solid #e2e8f0',
      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
    };
  } else if (variantStyle === 'outline-red') {
    buttonVariant = 'outline';
    customStyle = {
      ...customStyle,
      color: '#e01a2b',
      borderColor: 'rgba(224, 26, 43, 0.35)',
      background: 'rgba(224, 26, 43, 0.03)',
    };
  } else if (variantStyle === 'ghost') {
    buttonVariant = 'subtle';
    customStyle = {
      ...customStyle,
      color: '#64748b',
    };
  }

  const rightSection = withArrow ? <ArrowRight size={16} /> : props.rightSection;

  if (href) {
    return (
      <Button
        component={Link}
        href={href}
        variant={buttonVariant}
        color={rootColor}
        style={customStyle}
        rightSection={rightSection}
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button
      variant={buttonVariant}
      color={rootColor}
      style={customStyle}
      rightSection={rightSection}
      onClick={onClick}
      {...props}
    >
      {children}
    </Button>
  );
};
