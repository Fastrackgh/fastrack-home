'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Stack } from '@mantine/core';
import { UserPlus, Users } from 'lucide-react';
import { useActiveWard } from '../data/ActiveWardProvider';
import { parentRoutes } from '../routes';
import type { Ward } from '../types';
import { EmptyState, LinkChildButton, PageTitle, QueryView } from '../ui';
import { UnlinkWardModal } from './UnlinkWardModal';
import { WardCard } from './WardCard';

export function WardsPage() {
  const { query, activeWard, selectWard } = useActiveWard();
  const [unlinking, setUnlinking] = useState<Ward | null>(null);

  return (
    <>
      <PageTitle
        title="My children"
        subtitle="Children linked to your account"
        action={
          <Button
            component={Link}
            href={parentRoutes.linkWard}
            size="sm"
            color="fastrackRed"
            leftSection={<UserPlus size={16} />}
          >
            Link
          </Button>
        }
      />
      <QueryView
        query={query}
        empty={{
          when: (wards) => wards.length === 0,
          render: () => (
            <EmptyState
              icon={<Users size={22} />}
              title="No children linked yet"
              message="Use the student code from your child's school to link them."
              action={<LinkChildButton />}
            />
          ),
        }}
      >
        {(wards) => (
          <Stack gap="sm">
            {wards.map((ward) => (
              <WardCard
                key={ward.studentId}
                ward={ward}
                isActive={ward.studentId === activeWard?.studentId}
                onSelect={() => selectWard(ward.studentId)}
                onUnlink={() => setUnlinking(ward)}
              />
            ))}
          </Stack>
        )}
      </QueryView>

      <UnlinkWardModal
        ward={unlinking}
        onClose={() => setUnlinking(null)}
        onUnlinked={() => {
          setUnlinking(null);
          query.reload();
        }}
      />
    </>
  );
}
