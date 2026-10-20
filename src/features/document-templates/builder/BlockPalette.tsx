'use client';

import { Modal, Paper, SimpleGrid, Text, Group, UnstyledButton } from '@mantine/core';
import type { BlockSchema } from '../api';
import { BlockIcon } from './BlockIcon';

/** "Add section": every section type with a plain description. */
export function BlockPalette({
  opened,
  blocks,
  inColumn,
  onClose,
  onPick,
}: {
  opened: boolean;
  blocks: BlockSchema[];
  /** Columns can't be placed inside a column. */
  inColumn: boolean;
  onClose: () => void;
  onPick: (block: BlockSchema) => void;
}) {
  const available = blocks.filter((b) => !(inColumn && b.container));
  return (
    <Modal opened={opened} onClose={onClose} title="Add a section" size="lg">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        {available.map((block) => (
          <UnstyledButton key={block.type} onClick={() => onPick(block)}>
            <Paper withBorder p="sm" radius="md" style={{ height: '100%' }}>
              <Group gap={8} mb={4} wrap="nowrap">
                <BlockIcon name={block.icon} size={18} />
                <Text fw={600} size="sm">
                  {block.label}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {block.description}
              </Text>
            </Paper>
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Modal>
  );
}
