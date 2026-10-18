'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Text } from '@mantine/core';

export default function PlatformSchoolsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/school-admin/platform');
  }, [router]);

  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <Text c="dimmed">Redirecting to Platform Console...</Text>
    </Box>
  );
}
