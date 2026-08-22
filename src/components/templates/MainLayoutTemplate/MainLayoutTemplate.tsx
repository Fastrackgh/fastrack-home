'use client';

import React from 'react';
import { Box } from '@mantine/core';
import { Navbar, Footer } from '@/components/organisms';

interface MainLayoutTemplateProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export const MainLayoutTemplate: React.FC<MainLayoutTemplateProps> = ({
  children,
  hideFooter = false,
}) => {
  return (
    <Box style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box component="main" style={{ flex: 1 }}>
        {children}
      </Box>
      {!hideFooter && <Footer />}
    </Box>
  );
};
