'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  FileButton,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Copy, Eye, FilePlus2, Rocket, Save, Upload } from 'lucide-react';
import {
  KIND_LABELS,
  type DocumentKind,
  type DocumentKindInfo,
  type DocumentTemplate,
  type DocumentTemplatesApi,
  type TemplateSample,
  type TemplateStatus,
} from './api';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusColor: Record<TemplateStatus, string> = {
  DRAFT: 'orange',
  PUBLISHED: 'teal',
  ARCHIVED: 'gray',
};

const codeStyles = {
  input: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
};

interface Draft {
  name: string;
  html: string;
  css: string;
  settingsText: string;
}

const toDraft = (template: DocumentTemplate): Draft => ({
  name: template.name,
  html: template.html,
  css: template.css,
  settingsText: JSON.stringify(template.settings ?? {}, null, 2),
});

function parseSettings(text: string): Record<string, unknown> | string {
  try {
    const value: unknown = JSON.parse(text || '{}');
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : 'Settings must be a JSON object.';
  } catch {
    return 'Settings are not valid JSON.';
  }
}

/**
 * Builds a school's bill/report design from its uploaded sample: versions
 * on the left, the uploaded samples next to the Liquid HTML/CSS editor, and
 * a live preview (sample data or a real invoice) rendered by the backend.
 */
export function TemplateEditor({
  api,
  canManage,
}: {
  api: DocumentTemplatesApi;
  canManage: boolean;
}) {
  const [kind, setKind] = useState<DocumentKind>('invoice.bill');
  const [kinds, setKinds] = useState<DocumentKindInfo[]>([]);
  const [versions, setVersions] = useState<DocumentTemplate[] | null>(null);
  const [samples, setSamples] = useState<TemplateSample[]>([]);
  const [selected, setSelected] = useState<DocumentTemplate | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const kindInfo = kinds.find((k) => k.kind === kind);
  const editable = canManage && selected?.status === 'DRAFT';

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [allKinds, list, sampleList] = await Promise.all([
        api.kinds(),
        api.list(kind),
        api.samples(kind),
      ]);
      setKinds(allKinds);
      setVersions(list);
      setSamples(sampleList);
    } catch (e) {
      setLoadError(errorMessage(e, 'Could not load templates.'));
    }
  }, [api, kind]);

  useEffect(() => {
    setSelected(null);
    setDraft(null);
    void load();
  }, [load]);

  const open = (template: DocumentTemplate) => {
    setSelected(template);
    setDraft(toDraft(template));
  };

  // Live preview of what is in the editor (or the live/default design).
  const previewParts = useMemo(() => {
    if (draft) {
      const settings = parseSettings(draft.settingsText);
      return typeof settings === 'string'
        ? settings
        : { html: draft.html, css: draft.css, settings };
    }
    if (!kindInfo) return null;
    const live = versions?.find((v) => v.status === 'PUBLISHED');
    return live
      ? { html: live.html, css: live.css, settings: live.settings }
      : { html: kindInfo.defaultHtml, css: kindInfo.defaultCss, settings: {} };
  }, [draft, kindInfo, versions]);
  const [debouncedParts] = useDebouncedValue(previewParts, 600);
  const [debouncedInvoice] = useDebouncedValue(invoiceId.trim(), 600);

  useEffect(() => {
    if (!debouncedParts) return;
    if (typeof debouncedParts === 'string') {
      setPreviewError(debouncedParts);
      return;
    }
    let cancelled = false;
    api
      .preview(
        kind,
        debouncedParts,
        kind === 'invoice.bill' ? debouncedInvoice || undefined : undefined,
      )
      .then((html) => {
        if (cancelled) return;
        setPreviewHtml(html);
        setPreviewError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPreviewError(errorMessage(e, 'Preview failed.'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, kind, debouncedParts, debouncedInvoice]);

  const act = async (label: string, run: () => Promise<DocumentTemplate | void>) => {
    setBusy(true);
    try {
      const result = await run();
      notifications.show({ color: 'teal', title: label, message: 'Done.' });
      await load();
      if (result) open(result);
    } catch (e) {
      notifications.show({
        color: 'red',
        title: `${label} failed`,
        message: errorMessage(e, 'Try again.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!selected || !draft) return;
    const settings = parseSettings(draft.settingsText);
    if (typeof settings === 'string') {
      notifications.show({ color: 'red', title: 'Cannot save', message: settings });
      return;
    }
    void act('Draft saved', () =>
      api.update(selected.id, { name: draft.name, html: draft.html, css: draft.css, settings }),
    );
  };

  const upload = (file: File | null) => {
    if (!file) return;
    void act('Sample uploaded', async () => {
      await api.uploadSample(kind, file);
    });
  };

  if (loadError)
    return (
      <Alert color="red" title="Templates unavailable">
        {loadError}
      </Alert>
    );
  if (!versions) return <Loader />;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <SegmentedControl
          value={kind}
          onChange={(value) => setKind(value as DocumentKind)}
          data={(Object.keys(KIND_LABELS) as DocumentKind[]).map((value) => ({
            value,
            label: KIND_LABELS[value],
          }))}
        />
        {canManage && (
          <Group gap="xs">
            <FileButton onChange={upload} accept="application/pdf,image/png,image/jpeg,image/webp">
              {(props) => (
                <Button
                  {...props}
                  variant="default"
                  leftSection={<Upload size={15} />}
                  loading={busy}
                >
                  Upload sample
                </Button>
              )}
            </FileButton>
            <Button
              color="fastrackRed"
              leftSection={<FilePlus2 size={15} />}
              loading={busy}
              onClick={() => void act('Draft created', () => api.create({ kind }))}
            >
              New draft
            </Button>
          </Group>
        )}
      </Group>

      {kind === 'exam.report' && (
        <Alert color="blue">
          Terminal reports preview with sample data until grading is available. Designs published
          now will be used as soon as reports are generated.
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <Stack gap="md">
          <Card withBorder padding="sm">
            <Text fw={600} mb="xs">
              Versions
            </Text>
            {versions.length === 0 ? (
              <Text size="sm" c="dimmed">
                No designs yet: parents see Fastrack&apos;s default{' '}
                {KIND_LABELS[kind].toLowerCase()}.
              </Text>
            ) : (
              <Table striped highlightOnHover verticalSpacing={4}>
                <Table.Tbody>
                  {versions.map((v) => (
                    <Table.Tr
                      key={v.id}
                      bg={v.id === selected?.id ? 'var(--mantine-color-blue-light)' : undefined}
                    >
                      <Table.Td>
                        v{v.version} · {v.name}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColor[v.status]} variant="light">
                          {v.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end">
                          <Button
                            size="compact-xs"
                            variant="subtle"
                            leftSection={<Eye size={12} />}
                            onClick={() => open(v)}
                          >
                            Open
                          </Button>
                          {canManage && (
                            <Button
                              size="compact-xs"
                              variant="subtle"
                              leftSection={<Copy size={12} />}
                              onClick={() =>
                                void act('Copied to a new draft', () => api.duplicate(v.id))
                              }
                            >
                              Duplicate
                            </Button>
                          )}
                          {canManage && v.status !== 'PUBLISHED' && (
                            <Button
                              size="compact-xs"
                              color="teal"
                              variant="light"
                              leftSection={<Rocket size={12} />}
                              onClick={() => void act('Published', () => api.publish(v.id))}
                            >
                              Publish
                            </Button>
                          )}
                          {canManage && v.status === 'PUBLISHED' && (
                            <Button
                              size="compact-xs"
                              color="gray"
                              variant="light"
                              onClick={() =>
                                void act('Archived (default design restored)', () =>
                                  api.archive(v.id),
                                )
                              }
                            >
                              Unpublish
                            </Button>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>

          <Card withBorder padding="sm">
            <Text fw={600} mb="xs">
              School samples
            </Text>
            {samples.length === 0 ? (
              <Text size="sm" c="dimmed">
                Upload the school&apos;s current {KIND_LABELS[kind].toLowerCase()} (PDF or photo) to
                build from.
              </Text>
            ) : (
              <Tabs defaultValue={samples[0].id}>
                <Tabs.List>
                  {samples.map((s, i) => (
                    <Tabs.Tab key={s.id} value={s.id}>
                      {s.originalFilename ?? `Sample ${i + 1}`}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
                {samples.map((s) => (
                  <Tabs.Panel key={s.id} value={s.id} pt="xs">
                    {s.mimeType === 'application/pdf' ? (
                      <iframe
                        title="Sample"
                        src={s.url}
                        style={{ width: '100%', height: 420, border: 0 }}
                      />
                    ) : (
                      <ScrollArea h={420}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.url} alt="Sample design" style={{ width: '100%' }} />
                      </ScrollArea>
                    )}
                    {canManage && (
                      <Button
                        mt="xs"
                        size="compact-xs"
                        color="red"
                        variant="subtle"
                        onClick={() => void act('Sample removed', () => api.removeSample(s.id))}
                      >
                        Remove sample
                      </Button>
                    )}
                  </Tabs.Panel>
                ))}
              </Tabs>
            )}
          </Card>

          {selected && draft && (
            <Card withBorder padding="sm">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>
                  Editing v{selected.version}{' '}
                  <Badge color={statusColor[selected.status]} variant="light">
                    {selected.status}
                  </Badge>
                </Text>
                {editable ? (
                  <Button size="xs" leftSection={<Save size={14} />} loading={busy} onClick={save}>
                    Save draft
                  </Button>
                ) : (
                  canManage && (
                    <Text size="xs" c="dimmed">
                      Published and archived versions are read-only: duplicate to edit.
                    </Text>
                  )
                )}
              </Group>
              <TextInput
                label="Name"
                value={draft.name}
                readOnly={!editable}
                onChange={(e) => setDraft({ ...draft, name: e.currentTarget.value })}
                mb="xs"
              />
              <Tabs defaultValue="html">
                <Tabs.List>
                  <Tabs.Tab value="html">HTML (Liquid)</Tabs.Tab>
                  <Tabs.Tab value="css">CSS</Tabs.Tab>
                  <Tabs.Tab value="settings">Settings</Tabs.Tab>
                  <Tabs.Tab value="fields">Fields</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="html" pt="xs">
                  <Textarea
                    autosize
                    minRows={14}
                    maxRows={28}
                    styles={codeStyles}
                    value={draft.html}
                    readOnly={!editable}
                    onChange={(e) => setDraft({ ...draft, html: e.currentTarget.value })}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="css" pt="xs">
                  <Textarea
                    autosize
                    minRows={14}
                    maxRows={28}
                    styles={codeStyles}
                    value={draft.css}
                    readOnly={!editable}
                    onChange={(e) => setDraft({ ...draft, css: e.currentTarget.value })}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="settings" pt="xs">
                  <Text size="xs" c="dimmed" mb={4}>
                    School values the design reads as settings.*, e.g. motto, notes, paymentOptions,
                    and feeGroups (show several fees as one row such as &quot;School Fees&quot;).
                  </Text>
                  <Textarea
                    autosize
                    minRows={10}
                    styles={codeStyles}
                    value={draft.settingsText}
                    readOnly={!editable}
                    onChange={(e) => setDraft({ ...draft, settingsText: e.currentTarget.value })}
                  />
                </Tabs.Panel>
                <Tabs.Panel value="fields" pt="xs">
                  <Table verticalSpacing={2} fz="xs">
                    <Table.Tbody>
                      {(kindInfo?.fields ?? []).map((f) => (
                        <Table.Tr key={f.path}>
                          <Table.Td>
                            <code>{f.path}</code>
                          </Table.Td>
                          <Table.Td>{f.description}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Tabs.Panel>
              </Tabs>
            </Card>
          )}
        </Stack>

        <Card withBorder padding="sm">
          <Group justify="space-between" mb="xs">
            <Text fw={600}>
              Preview{' '}
              <Text span size="xs" c="dimmed">
                {draft ? '(unsaved changes)' : '(live design)'}
              </Text>
            </Text>
            {kind === 'invoice.bill' && (
              <TextInput
                size="xs"
                placeholder="Real invoice id (optional)"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.currentTarget.value)}
                w={260}
              />
            )}
          </Group>
          {previewError && (
            <Alert color="red" mb="xs">
              {previewError}
            </Alert>
          )}
          <iframe
            title="Document preview"
            sandbox=""
            srcDoc={previewHtml}
            style={{
              width: '100%',
              height: 900,
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: 6,
            }}
          />
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
