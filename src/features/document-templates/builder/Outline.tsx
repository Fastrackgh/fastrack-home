'use client';

import { useState, type DragEvent } from 'react';
import { ActionIcon, Badge, Button, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react';
import type { BlockSchema, DocumentLayout, LayoutBlock } from '../api';
import { BlockIcon } from './BlockIcon';
import type { BlockSlot } from './layout-ops';
import classes from './Outline.module.css';

interface OutlineProps {
  layout: DocumentLayout;
  blocks: BlockSchema[];
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDrop: (dragId: string, target: { beforeId?: string; slot?: BlockSlot }) => void;
  onDuplicate: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (slot: BlockSlot) => void;
}

const DRAG_TYPE = 'application/x-fastrack-block';

/** The page's sections in order: select one to edit it, drag to reorder. */
export function Outline(props: OutlineProps) {
  const { layout } = props;
  return (
    <Stack gap={6}>
      <BlockList {...props} list={layout.blocks} slot={{ parentId: null }} />
      {!props.readOnly && (
        <Button
          variant="light"
          leftSection={<Plus size={14} />}
          onClick={() => props.onAdd({ parentId: null })}
        >
          Add section
        </Button>
      )}
    </Stack>
  );
}

function BlockList(props: OutlineProps & { list: LayoutBlock[]; slot: BlockSlot }) {
  const { list, slot, readOnly, onDrop } = props;
  const [over, setOver] = useState(false);
  const allowDrop = (e: DragEvent) => {
    if (readOnly || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    setOver(true);
  };
  return (
    <Stack
      gap={4}
      onDragOver={list.length === 0 ? allowDrop : undefined}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (list.length !== 0) return;
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_TYPE);
        if (id) onDrop(id, { slot });
      }}
      style={
        list.length === 0
          ? {
              minHeight: 34,
              border: `1px dashed ${over ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-gray-4)'}`,
              borderRadius: 6,
              justifyContent: 'center',
              padding: 6,
            }
          : undefined
      }
    >
      {list.length === 0 && (
        <Text size="xs" c="dimmed" ta="center">
          Empty — drag a section here
        </Text>
      )}
      {list.map((block, index) => (
        <BlockRow key={block.id} {...props} block={block} index={index} count={list.length} />
      ))}
    </Stack>
  );
}

function BlockRow(
  props: OutlineProps & { block: LayoutBlock; index: number; count: number; slot: BlockSlot },
) {
  const { block, blocks, selectedId, readOnly, index, count } = props;
  const definition = blocks.find((b) => b.type === block.type);
  const selected = selectedId === block.id;
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        if (readOnly || !e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.stopPropagation();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        const id = e.dataTransfer.getData(DRAG_TYPE);
        if (id && id !== block.id) props.onDrop(id, { beforeId: block.id });
      }}
      style={{
        borderTop: over ? '3px solid var(--mantine-color-blue-5)' : '3px solid transparent',
      }}
    >
      <Paper
        withBorder
        p={6}
        radius="sm"
        className={classes.row}
        data-selected={selected || undefined}
        draggable={!readOnly}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, block.id);
          e.dataTransfer.effectAllowed = 'move';
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          props.onSelect(block.id);
        }}
        style={{
          cursor: 'pointer',
          background: selected ? 'var(--mantine-color-blue-light)' : undefined,
          borderColor: selected ? 'var(--mantine-color-blue-5)' : undefined,
          opacity: block.hidden ? 0.55 : 1,
        }}
      >
        <Group gap={6} wrap="nowrap">
          {!readOnly && <GripVertical size={14} style={{ cursor: 'grab', flexShrink: 0 }} />}
          <BlockIcon name={definition?.icon ?? ''} />
          <Text size="sm" fw={selected ? 600 : 400} style={{ flex: 1 }} truncate>
            {definition?.label ?? block.type}
          </Text>
          {block.hidden && (
            <Badge size="xs" color="gray" variant="light">
              hidden
            </Badge>
          )}
          {!readOnly && (
            <Group
              gap={0}
              wrap="nowrap"
              className={classes.actions}
              onClick={(e) => e.stopPropagation()}
            >
              <Tooltip label="Move up">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  disabled={index === 0}
                  onClick={() => props.onMove(block.id, -1)}
                >
                  <ArrowUp size={13} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Move down">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  disabled={index === count - 1}
                  onClick={() => props.onMove(block.id, 1)}
                >
                  <ArrowDown size={13} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label={block.hidden ? 'Show' : 'Hide'}>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  onClick={() => props.onToggleHidden(block.id)}
                >
                  {block.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Duplicate">
                <ActionIcon size="sm" variant="subtle" onClick={() => props.onDuplicate(block.id)}>
                  <Copy size={13} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete">
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => props.onRemove(block.id)}
                >
                  <Trash2 size={13} />
                </ActionIcon>
              </Tooltip>
            </Group>
          )}
        </Group>
        {block.children && (
          <Stack gap={8} mt={6} onClick={(e) => e.stopPropagation()}>
            {(['left', 'right'] as const).map((side) => (
              <Stack key={side} gap={4} className={classes.column}>
                <Text size="xs" c="dimmed">
                  {side === 'left' ? 'Left column' : 'Right column'}
                </Text>
                <BlockList
                  {...props}
                  list={block.children![side]}
                  slot={{ parentId: block.id, side }}
                />
                {!readOnly && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    leftSection={<Plus size={12} />}
                    onClick={() => props.onAdd({ parentId: block.id, side })}
                  >
                    Add here
                  </Button>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </div>
  );
}
