"use client";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { Download, Plus, Search } from "lucide-react";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "date" | "time" | "number" | "email" | "textarea" | "file";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
};
export type Values = Record<string, string>;
export const f = (
  key: string,
  label: string,
  type: Field["type"] = "text",
  options?: string[],
  required = true,
): Field => ({ key, label, type, options, required });
export function Editor({
  title,
  fields,
  initial = {},
  onClose,
  onSave,
}: {
  title: string;
  fields: Field[];
  initial?: Values;
  onClose: () => void;
  onSave: (
    values: Values,
    file: File | null,
  ) => string | void | Promise<string | void>;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal
      opened
      onClose={() => {
        if (!saving) onClose();
      }}
      closeOnClickOutside={!saving}
      closeOnEscape={!saving}
      title={title}
      size="lg"
      centered
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (saving) return;
          setError("");
          if (
            fields.some(
              (field) =>
                field.required &&
                field.type !== "file" &&
                !values[field.key]?.trim(),
            )
          ) {
            setError("Complete all required fields.");
            return;
          }
          if (
            fields.some(
              (field) =>
                field.type === "number" &&
                values[field.key] &&
                (!Number.isFinite(Number(values[field.key])) ||
                  (field.min !== undefined &&
                    Number(values[field.key]) < field.min) ||
                  (field.max !== undefined &&
                    Number(values[field.key]) > field.max)),
            )
          ) {
            setError("Check the allowed numeric ranges.");
            return;
          }
          if (file && file.size > 10 * 1024 * 1024) {
            setError("Choose a file up to 10 MB.");
            return;
          }
          setSaving(true);
          try {
            const result = await onSave(values, file);
            if (result) setError(result);
            else onClose();
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Unable to save. Please try again.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <Stack>
          <Alert color="blue">
            Frontend preview: saves update this workspace only. No data is sent
            to the school.
          </Alert>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            {fields.map((field) => {
              const common = {
                label: field.label,
                required: field.required,
                value: values[field.key] ?? "",
                onChange: (
                  e: React.ChangeEvent<
                    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                  >,
                ) => setValues({ ...values, [field.key]: e.target.value }),
              };
              return field.type === "file" ? (
                <TextInput
                  key={field.key}
                  type="file"
                  label={field.label}
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  description="PDF, image or text · 10 MB maximum"
                />
              ) : field.options ? (
                <NativeSelect
                  key={field.key}
                  {...common}
                  data={["", ...field.options]}
                />
              ) : field.type === "textarea" ? (
                <Textarea key={field.key} {...common} minRows={3} />
              ) : (
                <TextInput
                  key={field.key}
                  {...common}
                  type={field.type}
                  min={field.min}
                  max={field.max}
                  step={
                    field.step ?? (field.type === "number" ? "any" : undefined)
                  }
                />
              );
            })}
          </SimpleGrid>
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving}>
              Save preview
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
export function Report({
  title,
  subtitle,
  columns,
  rows,
  onOpen,
  add,
  children,
  exportable = true,
}: {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  onOpen?: (index: number) => void;
  add?: () => void;
  children?: React.ReactNode;
  exportable?: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) =>
      row.join(" ").toLowerCase().includes(query.toLowerCase()),
    );
  const exportCsv = () => {
    const escape = (v: string | number) => {
      let text = String(v);
      if (/^[\s]*[=+@\-]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const url = URL.createObjectURL(
      new Blob(
        [
          "\uFEFF" +
            [columns, ...visible.map((r) => r.row)]
              .map((r) => r.map(escape).join(","))
              .join("\r\n"),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `preview-${title.replaceAll(" ", "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={3} size="h4">
            {title}
          </Title>
          {subtitle && (
            <Text c="dimmed" size="sm">
              {subtitle}
            </Text>
          )}
        </div>
        <Group>
          {exportable && (
            <Button
              variant="default"
              size="xs"
              leftSection={<Download size={14} />}
              disabled={!visible.length}
              onClick={exportCsv}
            >
              Export report
            </Button>
          )}
          {add && (
            <Button
              size="xs"
              color="fastrackRed"
              leftSection={<Plus size={14} />}
              onClick={add}
            >
              Add record
            </Button>
          )}
        </Group>
      </Group>
      {children}
      <TextInput
        aria-label={`Search ${title}`}
        placeholder="Search this report…"
        leftSection={<Search size={15} />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        maw={360}
      />
      <Table.ScrollContainer minWidth={650}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              {columns.map((c) => (
                <Table.Th key={c}>{c}</Table.Th>
              ))}
              {onOpen && <Table.Th>Details</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {visible.map(({ row, index }) => (
              <Table.Tr key={index}>
                {row.map((cell, i) => (
                  <Table.Td key={i}>{cell}</Table.Td>
                ))}
                {onOpen && (
                  <Table.Td>
                    <Button
                      variant="subtle"
                      size="compact-xs"
                      onClick={() => onOpen(index)}
                    >
                      Open
                    </Button>
                  </Table.Td>
                )}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {!visible.length && (
        <Alert color="gray">No records match these filters.</Alert>
      )}
      <Text size="xs" c="dimmed">
        {visible.length} records · Preview data
      </Text>
    </Stack>
  );
}
export function Summary({
  items,
}: {
  items: { label: string; value: string | number }[];
}) {
  return (
    <SimpleGrid cols={{ base: 2, md: Math.min(4, items.length) }}>
      {items.map((i) => (
        <div
          key={i.label}
          style={{
            padding: 16,
            border: "1px solid #e8ebef",
            borderRadius: 10,
            background: "#fafbfc",
          }}
        >
          <Text size="xs" c="dimmed">
            {i.label}
          </Text>
          <Text fw={700} size="xl" mt={6}>
            {i.value}
          </Text>
        </div>
      ))}
    </SimpleGrid>
  );
}
export function Preview({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal opened onClose={onClose} title={title} size="xl">
      <Stack data-print-preview>
        <Group justify="space-between">
          <Title order={3}>Fastrack International School</Title>
          <Badge color="orange">Preview · not official</Badge>
        </Group>
        <Text size="sm">{title}</Text>
        {children}
      </Stack>
      <Button mt="lg" variant="default" onClick={() => window.print()}>
        Print preview
      </Button>
    </Modal>
  );
}
export const id = () => crypto.randomUUID();
