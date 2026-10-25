'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  FileButton,
  Group,
  Loader,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useMediaQuery } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  Code2,
  Copy,
  FilePlus2,
  Maximize2,
  Minimize2,
  Redo2,
  Rocket,
  Undo2,
  Upload,
} from 'lucide-react';
import {
  KIND_LABELS,
  type DesignImage,
  type DocumentKind,
  type DocumentKindInfo,
  type DocumentLayout,
  type DocumentTemplate,
  type DocumentTemplatesApi,
  type TemplateSample,
  type TemplateStatus,
} from '../api';
import { TemplateEditor } from '../TemplateEditor';
import { BlockIcon } from './BlockIcon';
import { BlockPalette } from './BlockPalette';
import {
  createBlock,
  duplicateBlock,
  insertBlock,
  locate,
  moveBlock,
  moveTo,
  removeBlock,
  toggleHidden,
  updateProps,
  updateStyle,
  type BlockSlot,
} from './layout-ops';
import { Outline } from './Outline';
import { paperWidthFor, PreviewFrame, type PreviewZoom } from './PreviewFrame';
import { PropertyField, type FieldContext } from './PropertyField';
import { StarterGallery } from './StarterGallery';
import classes from './TemplateBuilder.module.css';
import { useDraftAutosave } from './useDraftAutosave';
import { useLayoutHistory } from './useLayoutHistory';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusColor: Record<TemplateStatus, string> = {
  DRAFT: 'orange',
  PUBLISHED: 'teal',
  ARCHIVED: 'gray',
};
const statusLabel: Record<TemplateStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Live',
  ARCHIVED: 'Old version',
};

/**
 * The no-code designer for a school's fee bill and terminal report: pick a
 * starter, add and arrange sections, set their options, and compare the live
 * preview with the school's own sample. Drafts save automatically.
 */
export function TemplateBuilder({
  api,
  canManage,
  isStaff = false,
  feesEnabled = true,
}: {
  api: DocumentTemplatesApi;
  canManage: boolean;
  /** Fastrack staff also get the Advanced (code) editor. */
  isStaff?: boolean;
  /** Without the fees module there are no fee types to group by, so none are asked for (QA-265). */
  feesEnabled?: boolean;
}) {
  const [advanced, setAdvanced] = useState(false);
  const [kind, setKind] = useState<DocumentKind>('invoice.bill');
  const [kinds, setKinds] = useState<DocumentKindInfo[]>([]);
  const [versions, setVersions] = useState<DocumentTemplate[] | null>(null);
  const [samples, setSamples] = useState<TemplateSample[]>([]);
  const [images, setImages] = useState<DesignImage[]>([]);
  const [feeTypes, setFeeTypes] = useState<Array<{ id: string; name: string }>>([]);
  const [current, setCurrent] = useState<DocumentTemplate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addSlot, setAddSlot] = useState<BlockSlot | null>(null);
  const [startersOpen, setStartersOpen] = useState(false);
  const [view, setView] = useState<'preview' | 'sample' | 'both'>('preview');
  const [zoom, setZoom] = useState<PreviewZoom>('fit');
  /** Hides the side panels so the preview gets the whole width. */
  const [focus, setFocus] = useState(false);
  /** Which side panel shows when there is room for only one. */
  const [panel, setPanel] = useState<'sections' | 'settings'>('sections');
  const wide = useMediaQuery('(min-width: 105em)');
  const [invoiceId, setInvoiceId] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  // The preview's error is kept apart from the save's, so fixing one clears it (QA-070).
  const [previewProblem, setPreviewProblem] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const history = useLayoutHistory(null);
  const { layout, change, reset } = history;

  const info = kinds.find((k) => k.kind === kind);
  const editable = canManage && current?.status === 'DRAFT' && current.mode === 'visual';
  const autosave = useDraftAutosave({ api, templateId: current?.id ?? null, layout, editable });
  const { flush, markSaved } = autosave;
  /** Only the newest load may open a design, so a slow one can't show another kind (QA-070). */
  const loadTicket = useRef(0);

  // Kinds, images and fee types are the same for bills and reports, so they load once (QA-264).
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.kinds(),
      api.images(),
      feesEnabled ? api.feeTypes().catch(() => []) : Promise.resolve([]),
    ])
      .then(([allKinds, imageList, fees]) => {
        if (cancelled) return;
        setKinds(allKinds);
        setImages(imageList);
        setFeeTypes(fees);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(errorMessage(e, 'Could not load designs.'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, feesEnabled]);

  /** The kind's versions; only the newest load may open one. */
  const load = useCallback(async (): Promise<DocumentTemplate[] | null> => {
    const ticket = ++loadTicket.current;
    setLoadError(null);
    try {
      const list = await api.list(kind);
      if (ticket !== loadTicket.current) return null;
      setVersions(list);
      return list;
    } catch (e) {
      if (ticket === loadTicket.current) setLoadError(errorMessage(e, 'Could not load designs.'));
      return null;
    }
  }, [api, kind]);

  // The school's sample is fetched only when it's on screen, and again after an upload.
  const [samplesStamp, setSamplesStamp] = useState(0);
  const showingSample = view !== 'preview';
  useEffect(() => {
    if (!showingSample) return;
    let cancelled = false;
    api
      .samples(kind)
      .then((list) => {
        if (!cancelled) setSamples(list);
      })
      .catch(() => {
        if (!cancelled) setSamples([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api, kind, showingSample, samplesStamp]);

  const open = useCallback(
    (template: DocumentTemplate | null) => {
      markSaved(template?.id ?? null, template?.layout ?? null);
      setCurrent(template);
      setSelectedId(null);
      setPreviewProblem(null);
      reset(template?.layout ?? null);
    },
    [reset, markSaved],
  );

  /**
   * Saves the edit still waiting before leaving the open design. If it can't
   * be saved, asks before the change would be lost (QA-065).
   */
  const settle = useCallback(async () => {
    if (await flush()) return true;
    return window.confirm('Your last change to this design could not be saved. Leave it anyway?');
  }, [flush]);

  // On load / kind change: open the newest draft, else the live version.
  useEffect(() => {
    void load().then((list) => {
      if (!list) return;
      open(
        list.find((t) => t.status === 'DRAFT') ??
          list.find((t) => t.status === 'PUBLISHED') ??
          null,
      );
    });
  }, [load, open]);

  // Live preview of what is on screen.
  const currentId = current?.id;
  // The kind, design and layout wait together, so a layout is never previewed as the
  // other kind while the delay catches up (QA-070).
  const target = useMemo(() => ({ kind, id: currentId, layout }), [kind, currentId, layout]);
  const [previewTarget] = useDebouncedValue(target, 500);
  const [previewInvoice] = useDebouncedValue(invoiceId.trim(), 600);
  useEffect(() => {
    let cancelled = false;
    const { kind: previewKind, id, layout: previewLayout } = previewTarget;
    const invoice = previewKind === 'invoice.bill' ? previewInvoice || undefined : undefined;
    const render = previewLayout
      ? api.previewLayout(previewKind, previewLayout, invoice)
      : id
        ? api.previewSaved(id, invoice)
        : Promise.resolve('');
    render
      .then((html) => {
        if (cancelled) return;
        setPreviewHtml(html);
        setPreviewProblem(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setPreviewProblem(errorMessage(e, 'Preview failed.'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, previewTarget, previewInvoice]);

  const act = async (label: string, run: () => Promise<DocumentTemplate | void>) => {
    setBusy(true);
    try {
      // Whatever happens next opens another design, so the open one is saved first.
      if (!(await settle())) return;
      const result = await run();
      notifications.show({ color: 'teal', title: label, message: 'Done.' });
      const list = (await load()) ?? [];
      open(result ? (list.find((t) => t.id === result.id) ?? result) : (list[0] ?? null));
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

  /** Renames a design, keeping the version list in step; a failure is said, not swallowed (QA-070). */
  const rename = async (id: string, name: string) => {
    const trimmed = name.trim();
    const before = versions?.find((v) => v.id === id)?.name;
    if (!trimmed || trimmed === before) return;
    try {
      await api.update(id, { name: trimmed });
      setVersions((list) => list?.map((v) => (v.id === id ? { ...v, name: trimmed } : v)) ?? list);
    } catch (e) {
      notifications.show({
        color: 'red',
        title: 'Name not saved',
        message: errorMessage(e, 'Try again.'),
      });
      if (before) setCurrent((c) => (c && c.id === id ? { ...c, name: before } : c));
    }
  };

  /** Publishes what is on screen: the waiting edit is saved first, or nothing is published (QA-066). */
  const publish = async (id: string) => {
    if (!(await flush())) {
      notifications.show({
        color: 'red',
        title: 'Not published',
        message:
          'Your latest change isn’t saved yet, so parents would get an older design. Try again.',
      });
      return;
    }
    await act('Published — parents now see this design', () => api.publish(id));
  };

  const ctx: FieldContext = useMemo(
    () => ({
      placeholders: info?.placeholders ?? [],
      images,
      feeTypes,
      readOnly: !editable,
      uploadImage: async (file) => {
        try {
          const uploaded = await api.uploadImage(file);
          setImages((list) => [uploaded, ...list]);
          return uploaded;
        } catch (e) {
          notifications.show({
            color: 'red',
            title: 'Upload failed',
            message: errorMessage(e, 'Try another image.'),
          });
          return null;
        }
      },
    }),
    [api, editable, feeTypes, images, info],
  );

  const selected = layout && selectedId ? locate(layout, selectedId) : null;
  const selectedDef = selected
    ? info?.blocks.find((b) => b.type === selected.block.type)
    : undefined;
  const live = versions?.find((v) => v.status === 'PUBLISHED');

  const sectionsPanel = layout ? (
    <Outline
      layout={layout}
      blocks={info?.blocks ?? []}
      selectedId={selectedId}
      readOnly={!editable}
      onSelect={(id) => {
        setSelectedId(id);
        if (id) setPanel('settings');
      }}
      onMove={(id, d) => change(moveBlock(layout, id, d))}
      onDrop={(id, target) => change(moveTo(layout, id, target))}
      onDuplicate={(id) => change(duplicateBlock(layout, id))}
      onToggleHidden={(id) => change(toggleHidden(layout, id))}
      onRemove={(id) => {
        change(removeBlock(layout, id));
        if (selectedId === id) setSelectedId(null);
      }}
      onAdd={setAddSlot}
    />
  ) : (
    <Text size="sm" c="dimmed">
      This version has no visual sections.
    </Text>
  );

  const settingsPanel = (
    <>
      {current && editable && (
        <TextInput
          label="Design name"
          mb="sm"
          maxLength={120}
          value={current.name}
          onChange={(e) => setCurrent({ ...current, name: e.currentTarget.value })}
          onBlur={() => void rename(current.id, current.name)}
        />
      )}
      {selected && selectedDef ? (
        <Stack gap="sm">
          <Group gap={6}>
            <BlockIcon name={selectedDef.icon} />
            <Text fw={600}>{selectedDef.label}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            {selectedDef.description}
          </Text>
          {selectedDef.props.map((schema) => (
            <PropertyField
              key={`${selected.block.id}-${schema.key}`}
              schema={schema}
              value={selected.block.props[schema.key]}
              onChange={(value) =>
                layout &&
                change(
                  updateProps(layout, selected.block.id, {
                    ...selected.block.props,
                    [schema.key]: value,
                  }),
                )
              }
              ctx={ctx}
            />
          ))}
          {(selectedDef.layoutProps?.length ?? 0) > 0 && (
            <>
              <Divider label="Position on the page" labelPosition="left" mt="xs" />
              {selectedDef.layoutProps!.map((schema) => (
                <PropertyField
                  key={`${selected.block.id}-style-${schema.key}`}
                  schema={schema}
                  value={selected.block.style?.[schema.key] ?? schema.default}
                  onChange={(value) =>
                    layout &&
                    change(
                      updateStyle(layout, selected.block.id, {
                        ...selected.block.style,
                        [schema.key]: value,
                      }),
                    )
                  }
                  ctx={ctx}
                />
              ))}
              {selected.block.style && editable && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  w="fit-content"
                  onClick={() => layout && change(updateStyle(layout, selected.block.id, null))}
                >
                  Reset position
                </Button>
              )}
            </>
          )}
          <Button size="xs" variant="subtle" onClick={() => setSelectedId(null)}>
            Page settings
          </Button>
        </Stack>
      ) : layout ? (
        <Stack gap="sm">
          <Text fw={600}>Page settings</Text>
          <Text size="xs" c="dimmed">
            Paper, font and colours for the whole document. Click a section to change it.
          </Text>
          {(info?.themeProps ?? []).map((schema) => (
            <PropertyField
              key={schema.key}
              schema={schema}
              value={layout.theme[schema.key]}
              onChange={(value) =>
                change({
                  ...layout,
                  theme: { ...layout.theme, [schema.key]: value },
                } as DocumentLayout)
              }
              ctx={ctx}
            />
          ))}
        </Stack>
      ) : null}
    </>
  );

  if (advanced) {
    return (
      <Stack>
        <Group>
          <Button
            variant="default"
            size="xs"
            onClick={() => {
              setAdvanced(false);
              // The code editor may have changed the designs.
              void load();
            }}
          >
            Back to the visual builder
          </Button>
          <Text size="sm" c="dimmed">
            Advanced: design code (Fastrack staff only).
          </Text>
        </Group>
        <TemplateEditor api={api} canManage={canManage} />
      </Stack>
    );
  }
  if (loadError)
    return (
      <Alert color="red" title="Designs unavailable">
        {loadError}
      </Alert>
    );
  if (!versions || !info) return <Loader />;

  return (
    <Stack gap="sm">
      {/* Top bar */}
      <Card withBorder padding="xs">
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            <SegmentedControl
              value={kind}
              onChange={async (value) => {
                if (!(await settle())) return;
                // Clear the open design first, so its layout is never previewed as the other kind.
                open(null);
                setKind(value as DocumentKind);
              }}
              data={(Object.keys(KIND_LABELS) as DocumentKind[]).map((value) => ({
                value,
                label: KIND_LABELS[value],
              }))}
            />
            <Select
              size="xs"
              w={260}
              placeholder={versions.length ? 'Choose a version' : 'No designs yet'}
              data={versions.map((v) => ({
                value: v.id,
                label: `v${v.version} · ${v.name} (${statusLabel[v.status]})`,
              }))}
              value={current?.id ?? null}
              onChange={async (id) => {
                if (id === current?.id || !(await settle())) return;
                open(versions.find((v) => v.id === id) ?? null);
              }}
              allowDeselect={false}
            />
            {current && (
              <Badge color={statusColor[current.status]} variant="light">
                {statusLabel[current.status]}
              </Badge>
            )}
            {editable && (
              <Group gap={4}>
                <Text size="xs" c={autosave.state === 'error' ? 'red' : 'dimmed'}>
                  {
                    {
                      idle: '',
                      pending: 'Unsaved changes',
                      saving: 'Saving…',
                      saved: 'All changes saved',
                      error: 'Not saved',
                    }[autosave.state]
                  }
                </Text>
                {autosave.state === 'error' && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="red"
                    onClick={() => void flush()}
                  >
                    Try again
                  </Button>
                )}
              </Group>
            )}
          </Group>
          <Group gap={6}>
            {editable && (
              <>
                <Tooltip label="Undo">
                  <Button
                    size="xs"
                    variant="default"
                    disabled={!history.canUndo}
                    onClick={history.undo}
                  >
                    <Undo2 size={14} />
                  </Button>
                </Tooltip>
                <Tooltip label="Redo">
                  <Button
                    size="xs"
                    variant="default"
                    disabled={!history.canRedo}
                    onClick={history.redo}
                  >
                    <Redo2 size={14} />
                  </Button>
                </Tooltip>
              </>
            )}
            {canManage && (
              <>
                <FileButton
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(file) =>
                    file &&
                    void act('School sample uploaded', async () => {
                      await api.uploadSample(kind, file);
                      setSamplesStamp((n) => n + 1);
                      setView((v) => (v === 'preview' ? 'both' : v));
                    })
                  }
                >
                  {(props) => (
                    <Button
                      {...props}
                      size="xs"
                      variant="default"
                      leftSection={<Upload size={14} />}
                    >
                      Upload school sample
                    </Button>
                  )}
                </FileButton>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<FilePlus2 size={14} />}
                  onClick={() => setStartersOpen(true)}
                >
                  New design
                </Button>
                {current && current.status !== 'DRAFT' && (
                  <Button
                    size="xs"
                    variant="default"
                    leftSection={<Copy size={14} />}
                    loading={busy}
                    onClick={() =>
                      void act('Copied into a new draft', () => api.duplicate(current.id))
                    }
                  >
                    Edit a copy
                  </Button>
                )}
                {current && current.status !== 'PUBLISHED' && (
                  <Button
                    size="xs"
                    color="teal"
                    leftSection={<Rocket size={14} />}
                    loading={busy}
                    disabled={autosave.state === 'saving'}
                    onClick={() => void publish(current.id)}
                  >
                    Publish
                  </Button>
                )}
                {current?.status === 'PUBLISHED' && (
                  <Button
                    size="xs"
                    color="gray"
                    variant="light"
                    loading={busy}
                    onClick={() =>
                      void act('Unpublished — parents see the standard design', () =>
                        api.archive(current.id),
                      )
                    }
                  >
                    Unpublish
                  </Button>
                )}
              </>
            )}
            {isStaff && (
              <Button
                size="xs"
                variant="subtle"
                leftSection={<Code2 size={14} />}
                onClick={async () => {
                  if (await settle()) setAdvanced(true);
                }}
              >
                Advanced
              </Button>
            )}
          </Group>
        </Group>
      </Card>

      {kind === 'exam.report' && (
        <Alert color="blue" py={6}>
          Reports preview with example pupil data until grading is set up. A design published now
          will be used for real reports.
        </Alert>
      )}
      {autosave.error && (
        <Alert color="red" py={6} title="Your last change isn't saved">
          {autosave.error}
        </Alert>
      )}
      {previewProblem && (
        <Alert color="orange" py={6} withCloseButton onClose={() => setPreviewProblem(null)}>
          Preview: {previewProblem}
        </Alert>
      )}
      {current && current.status !== 'DRAFT' && current.mode === 'visual' && canManage && (
        <Alert color="gray" py={6}>
          This version is {current.status === 'PUBLISHED' ? 'live' : 'an old version'} and
          can&apos;t be changed. Use <b>Edit a copy</b> to make changes
          {current.status === 'ARCHIVED' ? ', or Publish to bring it back' : ''}.
        </Alert>
      )}
      {current?.mode === 'code' && (
        <Alert color="yellow" py={6}>
          This version was built by Fastrack staff with design code, so it can&apos;t be edited
          here.
          {isStaff
            ? ' Use Advanced to change it.'
            : ' Start a New design to use the visual builder.'}
        </Alert>
      )}

      {!current ? (
        <Card withBorder padding="xl">
          <Stack align="center" gap="xs">
            <Text fw={600}>No {KIND_LABELS[kind].toLowerCase()} design yet</Text>
            <Text size="sm" c="dimmed" ta="center" maw={520}>
              Parents currently get Fastrack&apos;s standard {KIND_LABELS[kind].toLowerCase()}. To
              match the school&apos;s own: 1) upload a photo or PDF of their current{' '}
              {KIND_LABELS[kind].toLowerCase()}, 2) start a new design, 3) adjust the sections until
              the preview matches, then Publish.
            </Text>
            {canManage && (
              <Button
                mt="xs"
                leftSection={<FilePlus2 size={16} />}
                onClick={() => setStartersOpen(true)}
              >
                Start a new design
              </Button>
            )}
          </Stack>
        </Card>
      ) : (
        <div className={classes.workspace} data-columns={focus ? 1 : wide ? 3 : 2}>
          {!focus && (
            <Card withBorder padding="xs" className={classes.panel}>
              {wide ? (
                <Text fw={600} size="sm" mb={6}>
                  Sections
                </Text>
              ) : (
                <SegmentedControl
                  size="xs"
                  mb="xs"
                  fullWidth
                  value={panel}
                  onChange={(v) => setPanel(v as typeof panel)}
                  data={[
                    { value: 'sections', label: 'Sections' },
                    {
                      value: 'settings',
                      label: selectedDef ? 'Section settings' : 'Page settings',
                    },
                  ]}
                />
              )}
              <div className={classes.scroll}>
                {wide || panel === 'sections' ? sectionsPanel : settingsPanel}
              </div>
            </Card>
          )}

          {/* Preview / sample */}
          <Card withBorder padding="xs" className={classes.previewPanel}>
            <Group justify="space-between" mb={6} gap="xs">
              <Group gap="xs">
                <SegmentedControl
                  size="xs"
                  value={view}
                  onChange={(v) => setView(v as typeof view)}
                  data={[
                    { value: 'preview', label: 'Preview' },
                    { value: 'sample', label: 'School sample' },
                    { value: 'both', label: 'Side by side' },
                  ]}
                />
                {view !== 'sample' && (
                  <SegmentedControl
                    size="xs"
                    value={String(zoom)}
                    onChange={(v) => setZoom(v === 'fit' ? 'fit' : 1)}
                    data={[
                      { value: 'fit', label: 'Fit' },
                      { value: '1', label: '100%' },
                    ]}
                  />
                )}
              </Group>
              <Group gap="xs">
                {kind === 'invoice.bill' && (
                  <TextInput
                    size="xs"
                    w={220}
                    placeholder="Show a real bill (invoice id)"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.currentTarget.value)}
                  />
                )}
                <Tooltip label={focus ? 'Show the side panels' : 'Make the preview bigger'}>
                  <ActionIcon
                    variant="default"
                    aria-label={focus ? 'Show the side panels' : 'Make the preview bigger'}
                    onClick={() => setFocus((f) => !f)}
                  >
                    {focus ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            <div className={classes.viewer}>
              {view !== 'sample' && (
                <PreviewFrame
                  html={previewHtml}
                  paperWidth={paperWidthFor(layout?.theme.page)}
                  zoom={zoom}
                />
              )}
              {view !== 'preview' && <SamplePane samples={samples} />}
            </div>
          </Card>

          {wide && !focus && (
            <Card withBorder padding="xs" className={classes.panel}>
              <div className={classes.scroll}>{settingsPanel}</div>
            </Card>
          )}
        </div>
      )}

      {live && current?.id !== live.id && (
        <Text size="xs" c="dimmed">
          Parents currently see v{live.version} · {live.name}.
        </Text>
      )}

      <BlockPalette
        opened={addSlot !== null}
        blocks={info.blocks}
        inColumn={!!addSlot?.parentId}
        onClose={() => setAddSlot(null)}
        onPick={(definition) => {
          if (!layout || !addSlot) return;
          const block = createBlock(definition);
          change(insertBlock(layout, block, addSlot));
          setSelectedId(block.id);
          setPanel('settings');
          setAddSlot(null);
        }}
      />
      <StarterGallery
        opened={startersOpen}
        starters={info.starters}
        onClose={() => setStartersOpen(false)}
        onPick={(starter) => {
          setStartersOpen(false);
          void act('New design started', () =>
            api.create({ kind, starter: starter.key, name: starter.label }),
          );
        }}
      />
    </Stack>
  );
}

/** The school's uploaded sample, to compare against the preview. */
function SamplePane({ samples }: { samples: TemplateSample[] }) {
  const [index, setIndex] = useState(0);
  const sample = samples[index];
  if (!sample) {
    return (
      <Stack
        flex={1}
        justify="center"
        align="center"
        style={{
          border: '1px dashed var(--mantine-color-gray-4)',
          borderRadius: 6,
          height: '100%',
        }}
      >
        <Text size="sm" c="dimmed" ta="center" maw={260}>
          Upload a photo or PDF of the school&apos;s current design to compare it here.
        </Text>
      </Stack>
    );
  }
  return (
    <Stack flex={1} gap={4} h="100%" style={{ minWidth: 0 }}>
      {samples.length > 1 && (
        <Select
          size="xs"
          data={samples.map((s, i) => ({
            value: String(i),
            label: s.originalFilename ?? `Sample ${i + 1}`,
          }))}
          value={String(index)}
          onChange={(v) => setIndex(Number(v ?? 0))}
          allowDeselect={false}
        />
      )}
      {sample.mimeType === 'application/pdf' ? (
        <iframe
          title="School sample"
          src={sample.url}
          style={{ width: '100%', flex: 1, minHeight: 0, border: 0 }}
        />
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sample.url} alt="School sample" style={{ width: '100%' }} />
        </div>
      )}
    </Stack>
  );
}
