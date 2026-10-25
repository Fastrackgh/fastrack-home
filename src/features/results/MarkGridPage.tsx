'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Menu,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, MoreVertical, Plus } from 'lucide-react';

import { PageHeader } from '@/features/workspace';
import { ApiError, errorDetails, errorMessage } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import { DescriptorCell, PupilCell, ScoreCell, shortDate } from './MarkCells';
import { ItemModal, ReturnModal } from './MarkSheetModals';
import { marksApi, type Item, type RosterRow } from './marks-api';
import {
  cellKey,
  descriptorChange,
  emptyComponents,
  isNotRequired,
  localPreview,
  markFor,
  missingFor,
  otherTotal,
  showMark,
} from './marks-model';
import { STATUS } from './MarkSheetsPage';
import { useMarkSheet } from './useMarkSheet';

/**
 * One class's marks for one subject this term. Teachers type marks, "a" or
 * "x"; changes save on their own a moment later. The total and grade beside
 * each pupil are worked out with the school's own settings.
 */
export function MarkGridPage() {
  const params = useSearchParams();
  const termId = params.get('termId') ?? '';
  const classId = params.get('classId') ?? '';
  const subjectId = params.get('subjectId') ?? '';
  const { can } = useAuth();
  const isHead = can('reports:approve');

  const marks = useMarkSheet(termId, classId, subjectId);
  const { data, setData, load, items, rows, drafts, cellErrors, conflicts } = marks;
  const [itemModal, setItemModal] = useState<{ componentKey: string; item?: Item } | null>(null);
  const [returning, setReturning] = useState(false);
  /** A test a head asked to remove that already has marks, waiting for "yes". */
  const [removing, setRemoving] = useState<{ item: Item; marks: number } | null>(null);

  const sheet = data?.sheet ?? null;
  const editable =
    !!data?.canEdit && !!sheet && (sheet.status === 'draft' || (isHead && !sheet.notAssessed));
  const descriptor = data?.scheme.mode === 'descriptor';
  // Descriptor marks are saved by band id; without ids the picker can't save anything.
  const bandsUsable = !descriptor || !!data?.scale.bands.every((b) => b.id);

  const shown = (row: RosterRow, item: Item) => {
    const key = cellKey(row.schoolStudentId, item.componentKey, item.itemIndex);
    return key in drafts ? drafts[key] : showMark(markFor(row, item), item.maxRaw);
  };

  const carriedHint = (row: RosterRow, item: Item) => {
    const mark = markFor(row, item);
    if (!otherTotal(mark, item.maxRaw)) return '';
    const from = row.flags.movedFrom ? ` in ${row.flags.movedFrom.className}` : ' in another class';
    return `Marked out of ${mark!.maxRaw}${from}; it counts as ${mark!.rawScore} of ${mark!.maxRaw}. Type a new mark to replace it.`;
  };

  const missing = rows.reduce((n, r) => n + missingFor(r, items), 0);
  const noItems = data ? emptyComponents({ scheme: data.scheme, items }) : [];

  const onPaste = (
    rowIndex: number,
    colIndex: number,
    e: React.ClipboardEvent<HTMLInputElement>,
  ) => {
    const text = e.clipboardData.getData('text');
    if (!/[\t\n]/.test(text.trim())) return;
    e.preventDefault();
    // Rows go down, tab-separated values go across, as copied from a spreadsheet.
    const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
    const nextDrafts: Record<string, string> = {};
    lines.forEach((line, i) =>
      line.split('\t').forEach((value, j) => {
        const row = rows[rowIndex + i];
        const item = items[colIndex + j];
        if (!row || !item) return;
        nextDrafts[cellKey(row.schoolStudentId, item.componentKey, item.itemIndex)] = value.trim();
        marks.commit(row, item, value);
      }),
    );
    marks.setDrafts((all) => ({ ...all, ...nextDrafts }));
  };

  const submit = async () => {
    if (!sheet) return;
    if (marks.hasUnsaved()) await marks.flush();
    try {
      await marksApi.submit(sheet.id, marks.rowVersion() ?? sheet.rowVersion);
      notifications.show({
        color: 'green',
        title: 'Marks submitted',
        message: 'A head reviews them next.',
      });
      marks.clearConflicts();
      load();
    } catch (err) {
      const list =
        errorDetails<{ missing?: { fullName: string; missing: number }[] }>(err)?.missing ?? [];
      notifications.show({
        color: 'red',
        title: 'Not submitted',
        message: list.length
          ? `Marks still missing for ${list.map((m) => `${m.fullName} (${m.missing})`).join(', ')}.`
          : errorMessage(err, 'Try again.'),
        autoClose: false,
      });
    }
  };

  const setNotAssessed = async (on: boolean) => {
    if (!sheet) return;
    try {
      await marksApi.setNotAssessed(sheet.id, sheet.rowVersion, on);
      load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not changed',
        message: errorMessage(err, 'Try again.'),
      });
    }
  };

  /** Removing a test with marks deletes them too, so a head is asked first (QA-267). */
  const askToRemove = (item: Item) => {
    const marks = rows.filter((r) => markFor(r, item)).length;
    if (marks && isHead) setRemoving({ item, marks });
    else removeItem(item);
  };

  const removeItem = async (item: Item) => {
    if (!sheet) return;
    setRemoving(null);
    const marked = rows.some((r) => markFor(r, item));
    try {
      const res = await marksApi.deleteItem(sheet.id, item.id, sheet.rowVersion, marked && isHead);
      setData((d) =>
        d && d.sheet
          ? { ...d, items: res.items, sheet: { ...d.sheet, rowVersion: res.rowVersion } }
          : d,
      );
      if (marked) load();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: `Could not remove ${item.label}`,
        message: errorMessage(err, 'Try again.'),
      });
      if (err instanceof ApiError && err.statusCode === 409) load();
    }
  };

  const back = (
    <Button
      component={Link}
      href={APP_ROUTES.marks.path}
      variant="subtle"
      leftSection={<ArrowLeft size={16} />}
      px={0}
      mb="xs"
    >
      Mark sheets
    </Button>
  );

  if (marks.loadError)
    return (
      <>
        {back}
        <Alert color="red" title="Unable to open the mark sheet">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{marks.loadError}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      </>
    );
  if (!data) return <Loader />;

  const status = sheet ? STATUS[sheet.status] : STATUS.not_started;
  const componentOf = (key: string) => data.scheme.components.find((c) => c.key === key);

  return (
    <>
      {back}
      <PageHeader
        title={
          data.context ? `${data.context.subjectName}, ${data.context.className}` : 'Mark sheet'
        }
        subtitle={[
          data.context && `${data.context.termLabel}, ${data.context.yearLabel}`,
          `${data.scheme.name} · grades: ${data.scale.name}`,
        ]
          .filter(Boolean)
          .join(' · ')}
      />
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <Badge variant="light" color={status.color}>
            {status.label}
          </Badge>
          {sheet?.notAssessed && (
            <Badge variant="light" color="gray">
              Not assessed this term
            </Badge>
          )}
          <Text size="sm" c={marks.saving || marks.hasUnsaved() ? 'blue' : 'dimmed'}>
            {marks.saving
              ? 'Saving…'
              : marks.hasUnsaved()
                ? 'Unsaved changes'
                : 'All changes saved'}
          </Text>
        </Group>
        {isHead && sheet && (
          <Group gap="sm">
            <Switch
              label="Not assessed this term"
              checked={sheet.notAssessed}
              onChange={(e) => setNotAssessed(e.currentTarget.checked)}
              color="fastrackRed"
            />
            {sheet.status === 'submitted' && (
              <Button variant="light" color="orange" radius="md" onClick={() => setReturning(true)}>
                Return to teacher
              </Button>
            )}
          </Group>
        )}
      </Group>

      {!sheet ? (
        <Alert color="gray" mb="md" title="View only">
          You can see this class&apos;s marks; only its subject teachers and heads can enter them.
        </Alert>
      ) : sheet.returnReason && sheet.status === 'draft' ? (
        <Alert color="orange" mb="md" title="Returned by a head">
          {sheet.returnReason}
        </Alert>
      ) : sheet.status !== 'draft' && !isHead ? (
        <Alert color="gray" mb="md" title={`${status.label}`}>
          Ask a head to return the sheet if a mark needs changing.
        </Alert>
      ) : sheet.status !== 'draft' && isHead ? (
        <Alert color="yellow" mb="md" title={`${status.label}: changing marks as a head`}>
          Your changes are recorded against your name.
          {sheet.status === 'approved'
            ? ' A published report changes only after it is reopened and published again.'
            : ''}
        </Alert>
      ) : null}

      {!bandsUsable && (
        <Alert color="red" mb="md" title="This sheet can't be marked yet">
          Its descriptors arrived without the ids needed to save a choice. This has been reported;
          try again later.
        </Alert>
      )}

      {noItems.length > 0 && editable && (
        <Alert color="blue" mb="md" title="Add the first class test">
          {noItems.map((c) => c.label).join(', ')} {noItems.length === 1 ? 'has' : 'have'} no tests
          yet, so no pupil can be complete.{' '}
          {noItems.map((c) => (
            <Button
              key={c.key}
              size="compact-xs"
              variant="light"
              ml={6}
              onClick={() => setItemModal({ componentKey: c.key })}
            >
              Add to {c.label}
            </Button>
          ))}
        </Alert>
      )}

      <Card withBorder radius="lg" p={0}>
        <ScrollArea>
          <Table verticalSpacing={4} horizontalSpacing="xs" stickyHeader miw={500}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th rowSpan={2} miw={200}>
                  Pupil
                </Table.Th>
                {data.scheme.components.map((c) => {
                  const own = items.filter((i) => i.componentKey === c.key);
                  return (
                    <Table.Th
                      key={c.key}
                      colSpan={Math.max(own.length, 1) + (c.entry === 'items' && editable ? 1 : 0)}
                      ta="center"
                    >
                      {c.label}
                      {!descriptor && (
                        <Text span size="xs" c="dimmed">
                          {' '}
                          ({c.weight}%{c.bestOf ? `, best ${c.bestOf}` : ''})
                        </Text>
                      )}
                    </Table.Th>
                  );
                })}
                {!descriptor && (
                  <>
                    <Table.Th rowSpan={2} ta="right">
                      Total
                    </Table.Th>
                    <Table.Th rowSpan={2}>Grade</Table.Th>
                  </>
                )}
              </Table.Tr>
              <Table.Tr>
                {data.scheme.components.map((c) => {
                  const own = items.filter((i) => i.componentKey === c.key);
                  return [
                    ...(own.length
                      ? own.map((item) => (
                          <Table.Th key={item.id} miw={76}>
                            <Group gap={2} wrap="nowrap" justify="center">
                              <Text size="xs" fw={600}>
                                {item.label}
                                {item.maxRaw != null && (
                                  <Text span c="dimmed" size="xs">
                                    {' '}
                                    /{item.maxRaw}
                                  </Text>
                                )}
                              </Text>
                              {editable && (
                                <Menu position="bottom-end" withinPortal>
                                  <Menu.Target>
                                    <ActionIcon
                                      size="xs"
                                      variant="subtle"
                                      color="gray"
                                      aria-label={`${item.label} options`}
                                    >
                                      <MoreVertical size={12} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item
                                      onClick={() => setItemModal({ componentKey: c.key, item })}
                                    >
                                      Edit
                                    </Menu.Item>
                                    {c.entry === 'items' && (
                                      <Menu.Item color="red" onClick={() => askToRemove(item)}>
                                        Remove
                                      </Menu.Item>
                                    )}
                                  </Menu.Dropdown>
                                </Menu>
                              )}
                            </Group>
                            {item.takenOn && (
                              <Text size="xs" c="dimmed" ta="center">
                                {shortDate(item.takenOn)}
                              </Text>
                            )}
                          </Table.Th>
                        ))
                      : [
                          <Table.Th key={`${c.key}-none`}>
                            <Text size="xs" c="dimmed" ta="center">
                              No tests
                            </Text>
                          </Table.Th>,
                        ]),
                    ...(c.entry === 'items' && editable
                      ? [
                          <Table.Th key={`${c.key}-add`} w={36}>
                            <Tooltip label={`Add a test to ${c.label}`}>
                              <ActionIcon
                                size="sm"
                                variant="light"
                                color="fastrackRed"
                                onClick={() => setItemModal({ componentKey: c.key })}
                                aria-label={`Add a test to ${c.label}`}
                              >
                                <Plus size={14} />
                              </ActionIcon>
                            </Tooltip>
                          </Table.Th>,
                        ]
                      : []),
                  ];
                })}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.map((row, rowIndex) => {
                const preview =
                  marks.hasUnsaved() || Object.keys(drafts).length
                    ? localPreview(
                        row,
                        { scheme: data.scheme, scale: data.scale, items },
                        data.settings,
                      )
                    : row.preview;
                let col = -1;
                return (
                  <Table.Tr key={row.schoolStudentId} opacity={row.flags.leftOn ? 0.7 : 1}>
                    <Table.Td>
                      <PupilCell row={row} />
                    </Table.Td>
                    {data.scheme.components.map((c) => {
                      const own = items.filter((i) => i.componentKey === c.key);
                      return [
                        ...(own.length
                          ? own.map((item) => {
                              col++;
                              const myCol = col;
                              const key = cellKey(
                                row.schoolStudentId,
                                item.componentKey,
                                item.itemIndex,
                              );
                              const notRequired = isNotRequired(row, item);
                              if (descriptor && !bandsUsable) return <Table.Td key={item.id} />;
                              return (
                                <Table.Td key={item.id}>
                                  {descriptor ? (
                                    <DescriptorCell
                                      row={row}
                                      item={item}
                                      bands={data.scale.bands}
                                      notRequired={notRequired}
                                      editable={editable}
                                      onChange={(value, base) => {
                                        marks.queue(
                                          {
                                            schoolStudentId: row.schoolStudentId,
                                            componentKey: item.componentKey,
                                            itemIndex: item.itemIndex,
                                            ...descriptorChange(value),
                                          },
                                          base,
                                        );
                                        marks.setDraft(key, value ?? '');
                                      }}
                                    />
                                  ) : (
                                    <ScoreCell
                                      row={row}
                                      item={item}
                                      position={{ row: rowIndex, col: myCol }}
                                      value={shown(row, item)}
                                      error={cellErrors[key]}
                                      conflict={conflicts.has(key)}
                                      carriedHint={carriedHint(row, item)}
                                      notRequired={notRequired}
                                      editable={editable}
                                      onDraft={(value) => marks.setDraft(key, value)}
                                      onCommit={(value) => marks.commit(row, item, value)}
                                      onPaste={(e) => onPaste(rowIndex, myCol, e)}
                                    />
                                  )}
                                </Table.Td>
                              );
                            })
                          : [<Table.Td key={`${c.key}-none`} />]),
                        ...(c.entry === 'items' && editable
                          ? [<Table.Td key={`${c.key}-add`} />]
                          : []),
                      ];
                    })}
                    {!descriptor && (
                      <>
                        <Table.Td ta="right">
                          <Text
                            size="sm"
                            fw={600}
                            c={preview.status === 'ok' ? undefined : 'dimmed'}
                          >
                            {preview.status === 'ok'
                              ? preview.total
                              : preview.status === 'incomplete'
                                ? 'INC'
                                : preview.status === 'exempt'
                                  ? 'EX'
                                  : '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={700}>
                            {preview.grade ?? ''}
                          </Text>
                        </Table.Td>
                      </>
                    )}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Group justify="space-between" mt="md">
        <Text size="sm" c={missing ? undefined : 'green'}>
          {data.roster.length === 0
            ? 'No pupils in this class this term.'
            : missing
              ? `${missing} mark${missing === 1 ? '' : 's'} still to enter. Type a mark, “a” for absent or “x” for exempt.`
              : 'Every mark is in.'}
        </Text>
        {sheet && sheet.status === 'draft' && data.canEdit && (
          <Button
            color="fastrackRed"
            radius="md"
            onClick={submit}
            disabled={(missing > 0 || noItems.length > 0) && !sheet.notAssessed}
          >
            Submit marks
          </Button>
        )}
      </Group>

      {itemModal && sheet && (
        <ItemModal
          sheetId={sheet.id}
          rowVersion={sheet.rowVersion}
          componentLabel={componentOf(itemModal.componentKey)?.label ?? ''}
          componentKey={itemModal.componentKey}
          defaultMax={componentOf(itemModal.componentKey)?.defaultMaxRaw ?? 10}
          numeric={!descriptor}
          next={items.filter((i) => i.componentKey === itemModal.componentKey).length + 1}
          item={itemModal.item}
          onClose={() => setItemModal(null)}
          onSaved={(res) => {
            setItemModal(null);
            setData((d) =>
              d && d.sheet
                ? { ...d, items: res.items, sheet: { ...d.sheet, rowVersion: res.rowVersion } }
                : d,
            );
          }}
          onStale={() => {
            setItemModal(null);
            load();
          }}
        />
      )}

      <Modal
        opened={!!removing}
        onClose={() => setRemoving(null)}
        title={removing ? `Remove ${removing.item.label}?` : ''}
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {removing &&
              `${removing.item.label} and its ${removing.marks} mark${removing.marks === 1 ? '' : 's'} will be deleted. This can't be undone.`}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" radius="md" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button color="red" radius="md" onClick={() => removing && removeItem(removing.item)}>
              Remove test and marks
            </Button>
          </Group>
        </Stack>
      </Modal>

      {returning && sheet && (
        <ReturnModal
          onClose={() => setReturning(false)}
          onReturn={async (reason) => {
            try {
              await marksApi.returnSheet(sheet.id, sheet.rowVersion, reason);
              setReturning(false);
              notifications.show({
                color: 'green',
                title: 'Returned to the teacher',
                message: reason,
              });
              load();
            } catch (err) {
              notifications.show({
                color: 'red',
                title: 'Not returned',
                message: errorMessage(err, 'Try again.'),
              });
            }
          }}
        />
      )}
    </>
  );
}
