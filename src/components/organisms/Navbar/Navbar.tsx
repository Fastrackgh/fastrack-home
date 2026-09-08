'use client';

import React from 'react';
import { Box, Container, Group, Burger, Drawer, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { motion } from 'framer-motion';
import { BrandLogo, ActionButton } from '@/components/atoms';
import { NavLinks } from '@/components/molecules';
import { Phone, Mail, ArrowRight } from 'lucide-react';
import { businessInfo } from '@/data/businessInfo';

export const Navbar: React.FC = () => {
  const [opened, { toggle, close }] = useDisclosure(false);

  return (
    <Box
      component="header"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        transition: 'all 0.3s ease',
      }}
    >
      <Container size="xl" py={12}>
        <Group justify="space-between" align="center">
          {/* Brand Logo */}
          <BrandLogo withTagline size="md" />

          {/* Desktop Nav Links */}
          <Box visibleFrom="md">
            <NavLinks orientation="horizontal" />
          </Box>

          {/* Action CTAs */}
          <Group gap="sm">
            <Box visibleFrom="sm">
              <motion.div whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}>
                <ActionButton
                  href="/coming-soon"
                  variantStyle="primary"
                  size="sm"
                  withArrow
                  style={{
                    boxShadow: '0 4px 14px -2px rgba(224, 26, 43, 0.35)',
                    fontWeight: 600,
                    padding: '8px 18px',
                  }}
                >
                  Get Started
                </ActionButton>
              </motion.div>
            </Box>

            {/* Mobile Menu Toggle */}
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="md"
              size="sm"
              color="#0b0f17"
              aria-label="Toggle navigation"
            />
          </Group>
        </Group>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        size="md"
        padding="xl"
        title={<BrandLogo size="sm" withTagline />}
        styles={{
          header: { borderBottom: '1px solid #f1f5f9', paddingBottom: 16 },
          body: { paddingTop: 20 },
        }}
      >
        <Stack justify="space-between" style={{ height: 'calc(100vh - 120px)' }}>
          <Stack gap="md">
            <NavLinks orientation="vertical" onItemClick={close} />
            <Box pt="sm">
              <ActionButton
                href="/coming-soon"
                variantStyle="primary"
                fullWidth
                size="md"
                withArrow
                onClick={close}
                style={{
                  background: 'linear-gradient(135deg, #e01a2b 0%, #a80d1a 100%)',
                  boxShadow: '0 6px 20px rgba(224, 26, 43, 0.35)',
                }}
              >
                Get Started (Early Access)
              </ActionButton>
            </Box>
          </Stack>

          {/* Contact quick links in drawer */}
          <Box pt="lg" style={{ borderTop: '1px solid #f1f5f9' }}>
            <Text size="xs" fw={700} c="dimmed" mb="xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direct Support • Accra
            </Text>
            <Group gap="xs" mb={8}>
              <Phone size={14} color="#e01a2b" />
              <Text
                component="a"
                href={`tel:${businessInfo.phoneRaw}`}
                size="xs"
                fw={600}
                c="dark"
                style={{ textDecoration: 'none' }}
              >
                {businessInfo.phone}
              </Text>
            </Group>
            <Group gap="xs">
              <Mail size={14} color="#e01a2b" />
              <Text
                component="a"
                href={`mailto:${businessInfo.email}`}
                size="xs"
                fw={600}
                c="dark"
                style={{ textDecoration: 'none' }}
              >
                {businessInfo.email}
              </Text>
            </Group>
          </Box>
        </Stack>
      </Drawer>
    </Box>
  );
};

