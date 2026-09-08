'use client';

import React from 'react';
import { Box, Container, Stack, Text, Button } from '@mantine/core';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <Box
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        background: '#ffffff',
      }}
    >
      <Container size="sm">
        <Stack align="center" gap="md">
          <Text
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(4rem, 8vw, 7rem)',
              fontWeight: 900,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            404
          </Text>
          <Text
            size="xl"
            fw={800}
            style={{ fontFamily: 'var(--font-heading)', color: '#0f172a' }}
          >
            Page Not Found
          </Text>
          <Text size="md" c="dimmed" style={{ maxWidth: 420 }}>
            The page you are looking for doesn&apos;t exist or has been moved.
          </Text>
          <Link href="/" style={{ textDecoration: 'none', marginTop: 12 }}>
            <Button
              size="md"
              radius="xl"
              leftSection={<ArrowLeft size={16} />}
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #e01a2b 100%)',
                fontWeight: 600,
              }}
            >
              Return Home
            </Button>
          </Link>
        </Stack>
      </Container>
    </Box>
  );
}
