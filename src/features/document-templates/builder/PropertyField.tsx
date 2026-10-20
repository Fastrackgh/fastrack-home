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
import { Plus, Trash2, Upload, Wand2 } from 'lucide-react';
import type { DesignImage, Placeholder, PropSchema } from '../api';

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
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => remove(index)}
                  aria-label="Remove"
                >
                  <Trash2 size={14} />
                </ActionIcon>
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
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => remove(index)}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </ActionIcon>
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
