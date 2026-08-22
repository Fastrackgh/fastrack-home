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

  const logoHeight = size === 'sm' ? 28 : size === 'lg' ? 82 : 56;
  const logoWidth = Math.round(logoHeight * 2.5);

  return (
    <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
      <Box
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isDarkBg ? '4px 8px' : '0',
          background: isDarkBg ? '#ffffff' : 'transparent',
          borderRadius: isDarkBg ? '6px' : '0',
        }}
      >
        <Image
          src="/logo(1).png"
          alt="Fastrack Management Services"
          width={logoWidth}
          height={logoHeight}
          style={{
            height: `${logoHeight}px`,
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
