'use client';

import { Badge, Modal, Paper, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import type { StarterDesign } from '../api';

/** "New design": pick a ready-made design to start from. */
export function StarterGallery({
  opened,
  starters,
  onClose,
  onPick,
}: {
  opened: boolean;
  starters: StarterDesign[];
  onClose: () => void;
  onPick: (starter: StarterDesign) => void;
}) {
  return (
    <Modal opened={opened} onClose={onClose} title="Start a new design" size="lg">
      <Text size="sm" c="dimmed" mb="sm">
        Pick the design closest to the school&apos;s sample. You can change every section
        afterwards.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: starters.length > 2 ? 3 : 2 }} spacing="sm">
        {starters.map((starter, index) => (
          <UnstyledButton key={starter.key} onClick={() => onPick(starter)}>
            <Paper withBorder p="md" radius="md" style={{ height: '100%' }}>
              <Stack gap={6}>
                <Text fw={700}>{starter.label}</Text>
                {index === 0 && (
                  <Badge size="xs" variant="light" w="fit-content">
                    Recommended
                  </Badge>
                )}
                <Text size="xs" c="dimmed">
                  {starter.description}
                </Text>
                <Text size="xs" c="dimmed">
                  {starter.layout.blocks.length} sections
                </Text>
              </Stack>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Modal>
  );
}
