'use client';

import { Badge, Group, Select, Text, TextInput, Tooltip } from '@mantine/core';

import type { Item, OpenSheet, RosterRow } from './marks-api';
import { descriptorValue, markFor } from './marks-model';

/** "12 Oct": test dates and join/leave dates in the grid. */
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** The pupil column: name, code and how they came to (or left) the class. */
export function PupilCell({ row }: { row: RosterRow }) {
  const { flags, carried } = row;
  return (
    <>
      <Text size="sm" fw={600}>
        {row.fullName}
      </Text>
      <Group gap={4}>
        <Text size="xs" c="dimmed">
          {row.studentCode}
        </Text>
        {flags.joinedOn && (
          <Badge size="xs" variant="light" color="blue">
            Joined {shortDate(flags.joinedOn)}
          </Badge>
        )}
        {flags.movedFrom && (
          <Tooltip label={`Marks from ${flags.movedFrom.className} came with them`}>
            <Badge size="xs" variant="light" color="grape">
              From {flags.movedFrom.className}
            </Badge>
          </Tooltip>
        )}
        {flags.leftOn && (
          <Badge size="xs" variant="light" color="gray">
            Left {shortDate(flags.leftOn)}
          </Badge>
        )}
        {carried.length > 0 && (
          <Tooltip
            label={`${carried.length} mark${carried.length === 1 ? '' : 's'} from ${carried[0].fromClass.className} with no matching test here; kept, not counted`}
          >
            <Badge size="xs" variant="outline" color="gray">
              +{carried.length} kept
            </Badge>
          </Tooltip>
        )}
      </Group>
    </>
  );
}

interface ScoreCellProps {
  row: RosterRow;
  item: Item;
  /** Grid position, for moving between cells with Enter and the arrow keys. */
  position: { row: number; col: number };
  value: string;
  error?: string;
  conflict: boolean;
  /** Why a mark from another class shows as "40/50"; empty when it doesn't. */
  carriedHint: string;
  notRequired: boolean;
  editable: boolean;
  onDraft: (value: string) => void;
  onCommit: (value: string) => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
}

const focusCell = (row: number, col: number) => {
  const el = document.querySelector<HTMLInputElement>(`[data-cell="${row}:${col}"]`);
  el?.focus();
  el?.select();
};

/** A typed mark: a number, "a" for absent or "x" for exempt. */
export function ScoreCell({
  row,
  item,
  position,
  value,
  error,
  conflict,
  carriedHint,
  notRequired,
  editable,
  onDraft,
  onCommit,
  onPaste,
}: ScoreCellProps) {
  return (
    <Tooltip
      label={error ?? (conflict ? 'Changed by someone else; check it' : carriedHint)}
      disabled={!error && !conflict && !carriedHint}
      color={error ? 'red' : 'orange'}
    >
      <TextInput
        data-cell={`${position.row}:${position.col}`}
        aria-label={`${item.label} for ${row.fullName}`}
        value={value}
        placeholder={notRequired ? 'n/a' : ''}
        onChange={(e) => onDraft(e.currentTarget.value)}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onKeyDown={(e) => {
          const step =
            e.key === 'Enter' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          onCommit(e.currentTarget.value);
          focusCell(position.row + step, position.col);
        }}
        onPaste={onPaste}
        readOnly={!editable}
        variant={editable ? 'default' : 'filled'}
        error={!!error}
        size="xs"
        w={68}
        styles={{
          input: {
            textAlign: 'right',
            ...(conflict ? { borderColor: 'var(--mantine-color-orange-6)' } : {}),
          },
        }}
      />
    </Tooltip>
  );
}

/** A descriptor mark: one of the scale's bands, absent or exempt. */
export function DescriptorCell({
  row,
  item,
  bands,
  notRequired,
  editable,
  onChange,
}: {
  row: RosterRow;
  item: Item;
  bands: OpenSheet['scale']['bands'];
  notRequired: boolean;
  editable: boolean;
  /** The new value, and the value it replaces. */
  onChange: (value: string | null, base: string) => void;
}) {
  const saved = descriptorValue(markFor(row, item));
  return (
    <Select
      aria-label={`${item.label} for ${row.fullName}`}
      data={[
        ...bands.map((b) => ({ value: b.id, label: b.label })),
        { value: 'absent', label: 'Absent' },
        { value: 'exempt', label: 'Exempt' },
      ]}
      value={saved}
      onChange={(v) => onChange(v, saved ?? '')}
      placeholder={notRequired ? 'Not required' : '—'}
      readOnly={!editable}
      variant={editable ? 'default' : 'filled'}
      clearable
      size="xs"
      w={130}
      comboboxProps={{ withinPortal: true }}
    />
  );
}
