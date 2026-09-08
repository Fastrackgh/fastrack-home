import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Box } from '@mantine/core';

interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'white';
  size?: 'sm' | 'md' | 'lg';
  withTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
}) => {
  const isDarkBg = variant === 'dark' || variant === 'white';

  const logoHeight = size === 'sm' ? 28 : size === 'lg' ? 76 : 50;

  return (
    <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
      <Box
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isDarkBg ? '12px 18px' : '0',
          background: isDarkBg ? '#ffffff' : 'transparent',
          borderRadius: isDarkBg ? '14px' : '0',
          boxShadow: isDarkBg ? '0 10px 28px -10px rgba(0, 0, 0, 0.45)' : 'none',
        }}
      >
        <Image
          src="/logo(1).png"
          alt="Fastrack Management Services"
          width={140}
          height={logoHeight}
          style={{
            height: size === 'sm' ? '28px' : size === 'lg' ? 'clamp(54px, 8vw, 76px)' : 'clamp(38px, 6vw, 50px)',
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          priority
        />
      </Box>
    </Link>
  );
};
