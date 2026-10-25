'use client';

import { useRef } from 'react';
import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  ColorInput,
  FileButton,
  Group,
  Image,
  Menu,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  UnstyledButton,
} from '@mantine/core';
import { ChevronDown, ChevronUp, Plus, Trash2, Upload, Wand2 } from 'lucide-react';
import type { DateLine, DesignImage, Placeholder, PropSchema } from '../api';
import { moveItem } from './layout-ops';

/** What property inputs need from the page: fields, images and fee types. */
export interface FieldContext {
  placeholders: Placeholder[];
  images: DesignImage[];
  uploadImage: (file: File) => Promise<DesignImage | null>;
  feeTypes: Array<{ id: string; name: string }>;
  readOnly: boolean;
}

interface Props {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  ctx: FieldContext;
}

/** One property input, chosen by the property's type. */
export function PropertyField({ schema, value, onChange, ctx }: Props) {
  const common = { label: schema.label, description: schema.help, disabled: ctx.readOnly };
  switch (schema.type) {
    case 'text':
      return (
        <TextInput
          {...common}
          value={asText(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
    case 'multiline':
      return (
        <Textarea
          {...common}
          autosize
          minRows={2}
          value={asText(value)}
          onChange={(e) => onChange(e.currentTarget.value)}
        />
      );
    case 'richtext':
      return <RichTextField {...{ schema, value, onChange, ctx }} />;
    case 'toggle':
      return (
        <Switch
          label={schema.label}
          description={schema.help}
          disabled={ctx.readOnly}
          checked={value === true}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
      );
    case 'select': {
      const options = schema.options ?? [];
      return options.length <= 3 ? (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {schema.label}
          </Text>
          <SegmentedControl
            fullWidth
            size="xs"
            disabled={ctx.readOnly}
            value={asText(value)}
            onChange={onChange}
            data={options}
          />
        </Stack>
      ) : (
        <Select
          {...common}
          data={options}
          value={asText(value)}
          onChange={(v) => v && onChange(v)}
          allowDeselect={false}
        />
      );
    }
    case 'multiselect':
      return (
        <Checkbox.Group
          {...common}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        >
          <SimpleGrid cols={2} spacing={4} mt={4}>
            {(schema.options ?? []).map((o) => (
              <Checkbox key={o.value} value={o.value} label={o.label} disabled={ctx.readOnly} />
            ))}
          </SimpleGrid>
        </Checkbox.Group>
      );
    case 'color':
      return <ColorInput {...common} format="hex" value={asText(value)} onChange={onChange} />;
    case 'number':
      return (
        <NumberInput
          {...common}
          min={schema.min}
          max={schema.max}
          value={typeof value === 'number' ? value : Number(value) || 0}
          onChange={(v) => onChange(Number(v))}
        />
      );
    case 'image':
      return <ImageField {...{ schema, value, onChange, ctx }} />;
    case 'list':
      return <ListField {...{ schema, value, onChange, ctx }} />;
    case 'feeGroups':
      return <FeeGroupsField {...{ schema, value, onChange, ctx }} />;
    case 'dateLines':
      return <DateLinesField {...{ schema, value, onChange, ctx }} />;
  }
}

const asText = (value: unknown) =>
  typeof value === 'string' ? value : value == null ? '' : String(value);

/** Text with "Insert field" chips such as [[student.fullName]]. */
function RichTextField({ schema, value, onChange, ctx }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const text = asText(value);
  const insert = (path: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    onChange(`${text.slice(0, start)}[[${path}]]${text.slice(end)}`);
  };
  const labels = new Map(ctx.placeholders.map((p) => [p.path, p.label]));
  return (
    <Stack gap={4}>
      <Group justify="space-between" align="end">
        <Text size="sm" fw={500}>
          {schema.label}
        </Text>
        <Menu shadow="md" position="bottom-end" withinPortal disabled={ctx.readOnly}>
          <Menu.Target>
            <Button
              size="compact-xs"
              variant="light"
              leftSection={<Wand2 size={12} />}
              disabled={ctx.readOnly}
            >
              Insert field
            </Button>
          </Menu.Target>
          <Menu.Dropdown mah={320} style={{ overflowY: 'auto' }}>
            {ctx.placeholders.map((p) => (
              <Menu.Item key={p.path} onClick={() => insert(p.path)}>
                {p.label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
      {schema.help && (
        <Text size="xs" c="dimmed">
          {schema.help}
        </Text>
      )}
      <Textarea
        ref={ref}
        autosize
        minRows={2}
        disabled={ctx.readOnly}
        value={text}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
      {text.includes('[[') && (
        <Text size="xs" c="dimmed">
          Filled in automatically:{' '}
          {[...text.matchAll(/\[\[([\w.]+)\]\]/g)]
            .map((m) => labels.get(m[1]) ?? m[1])
            .join(', ') || 'none'}
        </Text>
      )}
    </Stack>
  );
}

/** Pick an uploaded design image, or upload a new one. */
function ImageField({ schema, value, onChange, ctx }: Props) {
  const selected = typeof value === 'string' ? value : null;
  return (
    <Stack gap={4}>
      <Group justify="space-between">
        <Text size="sm" fw={500}>
          {schema.label}
        </Text>
        <FileButton
          accept="image/png,image/jpeg,image/webp"
          disabled={ctx.readOnly}
          onChange={async (file) => {
            if (!file) return;
            const uploaded = await ctx.uploadImage(file);
            if (uploaded) onChange(uploaded.id);
          }}
        >
          {(props) => (
            <Button {...props} size="compact-xs" variant="light" leftSection={<Upload size={12} />}>
              Upload image
            </Button>
          )}
        </FileButton>
      </Group>
      {schema.help && (
        <Text size="xs" c="dimmed">
          {schema.help}
        </Text>
      )}
      <SimpleGrid cols={4} spacing={6}>
        <UnstyledButton
          onClick={() => onChange(null)}
          disabled={ctx.readOnly}
          style={{
            border: `2px solid ${selected ? 'var(--mantine-color-gray-3)' : 'var(--mantine-color-blue-6)'}`,
            borderRadius: 6,
            height: 56,
            fontSize: 11,
          }}
        >
          None
        </UnstyledButton>
        {ctx.images.map((img) => (
          <UnstyledButton
            key={img.id}
            onClick={() => onChange(img.id)}
            disabled={ctx.readOnly}
            title={img.originalFilename ?? undefined}
            aria-label={`Use image ${img.originalFilename ?? ''}`.trim()}
            aria-pressed={selected === img.id}
            style={{
              border: `2px solid ${selected === img.id ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-gray-3)'}`,
              borderRadius: 6,
              height: 56,
              overflow: 'hidden',
            }}
          >
            <Image src={img.url} alt="" h={52} fit="contain" />
          </UnstyledButton>
        ))}
      </SimpleGrid>
    </Stack>
  );
}

/** A list of text items, or of small forms (e.g. bank accounts, signers). */
function ListField({ schema, value, onChange, ctx }: Props) {
  const items = Array.isArray(value) ? (value as unknown[]) : [];
  const setItem = (index: number, item: unknown) =>
    onChange(items.map((v, i) => (i === index ? item : v)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const move = (index: number, delta: -1 | 1) => onChange(moveItem(items, index, delta));
  const add = () =>
    onChange([
      ...items,
      schema.itemFields
        ? Object.fromEntries(schema.itemFields.map((f) => [f.key, structuredClone(f.default)]))
        : '',
    ]);
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {schema.label}
      </Text>
      {schema.help && (
        <Text size="xs" c="dimmed">
          {schema.help}
        </Text>
      )}
      {items.map((item, index) =>
        schema.itemFields ? (
          <Card key={index} withBorder padding="xs">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                #{index + 1}
              </Text>
              {!ctx.readOnly && (
                <Group gap={2}>
                  <MoveButtons index={index} count={items.length} onMove={move} />
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() => remove(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
            <Stack gap={6}>
              {schema.itemFields.map((field) => (
                <PropertyField
                  key={field.key}
                  schema={field}
                  value={(item as Record<string, unknown>)[field.key]}
                  onChange={(v) =>
                    setItem(index, { ...(item as Record<string, unknown>), [field.key]: v })
                  }
                  ctx={ctx}
                />
              ))}
            </Stack>
          </Card>
        ) : (
          <Group key={index} gap={4} wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              disabled={ctx.readOnly}
              value={asText(item)}
              onChange={(e) => setItem(index, e.currentTarget.value)}
            />
            {!ctx.readOnly && (
              <>
                <MoveButtons index={index} count={items.length} onMove={move} />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => remove(index)}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2 size={14} />
                </ActionIcon>
              </>
            )}
          </Group>
        ),
      )}
      {!ctx.readOnly && (
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<Plus size={12} />}
          onClick={add}
          w="fit-content"
        >
          Add
        </Button>
      )}
    </Stack>
  );
}

/** Up and down arrows for one item of a reorderable list. */
function MoveButtons({
  index,
  count,
  onMove,
  name = `item ${index + 1}`,
}: {
  index: number;
  count: number;
  onMove: (index: number, delta: -1 | 1) => void;
  name?: string;
}) {
  return (
    <Group gap={0} wrap="nowrap">
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        disabled={index === 0}
        onClick={() => onMove(index, -1)}
        aria-label={`Move ${name} up`}
      >
        <ChevronUp size={14} />
      </ActionIcon>
      <ActionIcon
        size="sm"
        variant="subtle"
        color="gray"
        disabled={index === count - 1}
        onClick={() => onMove(index, 1)}
        aria-label={`Move ${name} down`}
      >
        <ChevronDown size={14} />
      </ActionIcon>
    </Group>
  );
}

/** What each Dates line is called here, and where it gets its date when left empty. */
const DATE_LINES: Record<DateLine['key'], { name: string; auto: string; source: string }> = {
  termPeriod: {
    name: 'Term period',
    auto: 'term start–end',
    source: "Left empty, it uses the term's start and end dates.",
  },
  dueDate: {
    name: 'Payment deadline',
    auto: 'due date',
    source: "Left empty, it uses the bill's due date.",
  },
  vacation: {
    name: 'Vacation date',
    auto: 'term end',
    source: "Left empty, it uses the term's end date.",
  },
  reopening: {
    name: 'Reopening date',
    auto: 'next term start',
    source: "Left empty, it uses the next term's start date.",
  },
};

/**
 * The lines of a bill's Dates section: their order, which ones print, the
 * words before each date, and an optional typed date in place of the term's.
 */
function DateLinesField({ schema, value, onChange, ctx }: Props) {
  const lines = Array.isArray(value) ? (value as DateLine[]) : [];
  const set = (index: number, change: Partial<DateLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...change } : line)));
  const move = (index: number, delta: -1 | 1) => onChange(moveItem(lines, index, delta));
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {schema.label}
      </Text>
      {schema.help && (
        <Text size="xs" c="dimmed">
          {schema.help}
        </Text>
      )}
      {lines.map((line, index) => {
        const info = DATE_LINES[line.key] ?? { name: line.key, auto: '', source: '' };
        return (
          <Card key={line.key} withBorder padding="xs" opacity={line.show ? 1 : 0.6}>
            <Group justify="space-between" wrap="nowrap" mb={line.show ? 6 : 0}>
              <Switch
                size="xs"
                label={info.name}
                checked={line.show}
                disabled={ctx.readOnly}
                onChange={(e) => set(index, { show: e.currentTarget.checked })}
              />
              {!ctx.readOnly && (
                <MoveButtons index={index} count={lines.length} onMove={move} name={info.name} />
              )}
            </Group>
            {line.show && (
              <SimpleGrid cols={2} spacing={6}>
                <TextInput
                  size="xs"
                  label="Words before it"
                  aria-label={`Words before the ${info.name.toLowerCase()}`}
                  placeholder="None"
                  maxLength={80}
                  disabled={ctx.readOnly}
                  value={line.label}
                  onChange={(e) => set(index, { label: e.currentTarget.value })}
                />
                <TextInput
                  size="xs"
                  label="Date"
                  aria-label={`${info.name}, typed in`}
                  placeholder={info.auto && `Auto: ${info.auto}`}
                  title={info.source}
                  maxLength={80}
                  disabled={ctx.readOnly}
                  value={line.text}
                  onChange={(e) => set(index, { text: e.currentTarget.value })}
                />
                <ColorInput
                  size="xs"
                  label="Colour"
                  aria-label={`${info.name} colour`}
                  placeholder="As the section"
                  format="hex"
                  disabled={ctx.readOnly}
                  value={line.color ?? ''}
                  onChange={(color) => set(index, { color })}
                  style={{ gridColumn: '1 / -1' }}
                />
              </SimpleGrid>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

interface FeeGroup {
  label: string;
  feeTypeIds: string[];
}

/** Groups of fees shown as one line each, e.g. "School Fees". */
function FeeGroupsField({ schema, value, onChange, ctx }: Props) {
  const groups = Array.isArray(value) ? (value as FeeGroup[]) : [];
  const set = (index: number, group: FeeGroup) =>
    onChange(groups.map((g, i) => (i === index ? group : g)));
  const options = ctx.feeTypes.map((f) => ({ value: f.id, label: f.name }));
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        {schema.label}
      </Text>
      {schema.help && (
        <Text size="xs" c="dimmed">
          {schema.help}
        </Text>
      )}
      {groups.map((group, index) => (
        <Card key={index} withBorder padding="xs">
          <Group gap={4} wrap="nowrap" align="end">
            <TextInput
              label="Line name"
              style={{ flex: 1 }}
              disabled={ctx.readOnly}
              value={group.label}
              onChange={(e) => set(index, { ...group, label: e.currentTarget.value })}
            />
            {!ctx.readOnly && (
              <ActionIcon
                variant="subtle"
                color="red"
                mb={4}
                onClick={() => onChange(groups.filter((_, i) => i !== index))}
                aria-label="Remove group"
              >
                <Trash2 size={14} />
              </ActionIcon>
            )}
          </Group>
          <MultiSelect
            mt={6}
            label="Fees in this line"
            placeholder={options.length ? 'Pick fees' : 'No fee types set up yet'}
            data={options}
            value={group.feeTypeIds}
            disabled={ctx.readOnly}
            onChange={(ids) => set(index, { ...group, feeTypeIds: ids })}
            searchable
          />
        </Card>
      ))}
      {!ctx.readOnly && (
        <Button
          size="compact-xs"
          variant="light"
          leftSection={<Plus size={12} />}
          w="fit-content"
          onClick={() => onChange([...groups, { label: 'School Fees', feeTypeIds: [] }])}
        >
          Add a fee line
        </Button>
      )}
    </Stack>
  );
}
