'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Alert,
  Autocomplete,
  Badge,
  Button,
  Card,
  Drawer,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ArrowLeft, CheckCircle2, Printer } from 'lucide-react';
import { errorMessage, setupApi, type SchoolClass } from '@/features/school-setup/api';
import { PageHeader } from '@/features/workspace';
import { errorDetails } from '@/lib/api-client';
import { useAuth } from '@/lib/auth';
import { APP_ROUTES } from '@/lib/rbac';
import {
  reportsApi,
  type BankRemark,
  type Batch,
  type Blocker,
  type PupilReport,
  type RemarksChange,
} from './reports-api';
import { BATCH_STATUS } from './ReportsBoardPage';

const PUPIL_STATUS: Record<PupilReport['status'], { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'green' },
  incomplete: { label: 'Incomplete', color: 'yellow' },
  left: { label: 'Left', color: 'gray' },
};

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${tail}`;
};

/** Opens the school's report design in a new tab, ready to print. */
function openPrintable(html: string) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * One class's term reports: each pupil's results and remarks, then approval
 * and publishing. Class teachers write remarks for their own class; heads
 * write the head's remark and approve.
 */
export function ClassReportPage() {
  const params = useSearchParams();
  const termId = params.get('termId') ?? '';
  const classId = params.get('classId') ?? '';
  const { user, can } = useAuth();
  const isHead = can('reports:approve');
  const canGenerate = can('reports:generate');

  const [batch, setBatch] = useState<Batch | null | undefined>(undefined);
  const [pupils, setPupils] = useState<PupilReport[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [bank, setBank] = useState<BankRemark[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<PupilReport | null>(null);
  const [reopening, setReopening] = useState(false);

  const schoolClass = classes.find((c) => c.id === classId);
  // The class teacher writes remarks for their own class only; heads for any.
  const canRemark =
    isHead || (!!user && can('reports:remark') && schoolClass?.homeroomStaffId === user.id);
  const locked = batch?.status === 'approved' || batch?.status === 'published';

  const load = useCallback(async () => {
    setError(null);
    try {
      const [res, board] = await Promise.all([
        reportsApi.batch(termId, classId),
        reportsApi.board(termId),
      ]);
      setBatch(res?.batch ?? null);
      setPupils(res?.pupils ?? []);
      setBlockers(board.find((b) => b.classId === classId)?.blockers ?? []);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the reports.'));
    }
  }, [termId, classId]);

  useEffect(() => {
    load();
    setupApi
      .allClasses()
      .then(setClasses)
      .catch(() => setClasses([]));
    reportsApi
      .remarkBank()
      .then(setBank)
      .catch(() => setBank([]));
  }, [load]);

  const run = async (label: string, fn: () => Promise<unknown>, done: string) => {
    setBusy(label);
    try {
      await fn();
      notifications.show({ color: 'green', title: done, message: schoolClass?.className ?? '' });
      await load();
    } catch (err) {
      const list = errorDetails<{ blockers?: Blocker[] }>(err)?.blockers ?? [];
      if (list.length) setBlockers(list);
      notifications.show({
        color: 'red',
        title: `Could not ${label}`,
        message: list.length
          ? 'Some mark sheets aren’t submitted yet; see the list above.'
          : errorMessage(err, 'Try again.'),
        autoClose: list.length ? 5000 : false,
      });
    } finally {
      setBusy(null);
    }
  };

  const printAll = async () => {
    setBusy('print');
    try {
      openPrintable(await reportsApi.classDocuments(termId, classId));
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not open the reports',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setBusy(null);
    }
  };

  const sheetBlockers = blockers.filter(
    (b): b is Extract<Blocker, { type: 'sheet_not_submitted' }> => b.type === 'sheet_not_submitted',
  );
  const status = batch ? BATCH_STATUS[batch.status] : BATCH_STATUS.not_started;
  const ranked = batch?.rankedCount ?? 0;
  const replace = (row: PupilReport) => {
    setPupils((list) => list.map((p) => (p.termReportId === row.termReportId ? row : p)));
    setOpen((current) => (current?.termReportId === row.termReportId ? row : current));
  };

  const back = (
    <Button
      component={Link}
      href={APP_ROUTES.reports.path}
      variant="subtle"
      leftSection={<ArrowLeft size={16} />}
      px={0}
      mb="xs"
    >
      Term reports
    </Button>
  );
  if (error)
    return (
      <>
        {back}
        <Alert color="red" title="Unable to load the reports">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      </>
    );
  if (batch === undefined) return <Loader />;

  return (
    <>
      {back}
      <PageHeader
        title={`${schoolClass?.className ?? 'Class'} term reports`}
        subtitle={
          batch
            ? `${batch.onRoll} on roll, ${batch.rankedCount} ranked${batch.computedAt ? ` · worked out ${new Date(batch.computedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}`
            : 'Not worked out yet'
        }
      />
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <Badge variant="light" color={status.color}>
            {status.label}
          </Badge>
          {batch && batch.revision > 0 && (
            <Text size="sm" c="dimmed">
              Published version {batch.revision}
            </Text>
          )}
        </Group>
        <Group gap="xs">
          {canGenerate && !locked && (
            <Button
              variant="light"
              radius="md"
              loading={busy === 'work out the reports'}
              onClick={() =>
                run(
                  'work out the reports',
                  () => reportsApi.compute(termId, classId),
                  'Reports worked out',
                )
              }
            >
              {batch ? 'Update from the marks' : 'Work out reports'}
            </Button>
          )}
          {isHead &&
            batch &&
            (batch.status === 'open' ||
              batch.status === 'in_review' ||
              batch.status === 'reopened') && (
              <Button
                color="fastrackRed"
                radius="md"
                loading={busy === 'approve'}
                onClick={() =>
                  run(
                    'approve',
                    () => reportsApi.action(termId, classId, 'approve'),
                    'Reports approved',
                  )
                }
              >
                Approve
              </Button>
            )}
          {isHead && batch?.status === 'approved' && (
            <Button
              color="green"
              radius="md"
              loading={busy === 'publish'}
              onClick={() =>
                run(
                  'publish',
                  () => reportsApi.action(termId, classId, 'publish'),
                  'Reports published; parents have been emailed',
                )
              }
            >
              Publish to parents
            </Button>
          )}
          {isHead && locked && (
            <Button variant="default" radius="md" onClick={() => setReopening(true)}>
              Reopen
            </Button>
          )}
          {canGenerate && batch && (
            <Button
              variant="default"
              radius="md"
              leftSection={<Printer size={16} />}
              loading={busy === 'print'}
              onClick={printAll}
            >
              Print all
            </Button>
          )}
        </Group>
      </Group>

      {batch?.reopenReason && batch.status === 'reopened' && (
        <Alert color="orange" mb="md" title="Reopened">
          {batch.reopenReason}. Parents still see the published version until you publish again.
        </Alert>
      )}
      {batch?.status === 'published' && (
        <Alert color="green" mb="md" icon={<CheckCircle2 size={18} />} title="Published">
          Parents can see these reports. Reopen to correct one; they keep seeing this version until
          you publish again.
        </Alert>
      )}
      {sheetBlockers.length > 0 && !locked && (
        <Alert color="yellow" mb="md" title="Waiting on mark sheets">
          {sheetBlockers.map((b) => b.subjectName).join(', ')}{' '}
          {sheetBlockers.length === 1 ? 'isn’t' : 'aren’t'} submitted yet. Reports can be worked out
          and previewed meanwhile, but not approved.
        </Alert>
      )}

      {!batch ? (
        <Text c="dimmed" ta="center" py="xl">
          {canGenerate
            ? 'Work out the reports to see each pupil’s results.'
            : 'A head hasn’t worked out these reports yet.'}
        </Text>
      ) : (
        <Card withBorder radius="lg" p={0}>
          <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Pupil</Table.Th>
                <Table.Th ta="right">Average</Table.Th>
                <Table.Th ta="right">Position</Table.Th>
                <Table.Th>Attendance</Table.Th>
                <Table.Th>Remark</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {pupils.map((p) => (
                <Table.Tr
                  key={p.termReportId}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setOpen(p)}
                >
                  <Table.Td>
                    <Group gap={6}>
                      <Text size="sm" fw={600}>
                        {p.fullName}
                      </Text>
                      <Badge size="xs" variant="light" color={PUPIL_STATUS[p.status].color}>
                        {PUPIL_STATUS[p.status].label}
                      </Badge>
                      {p.withheld && (
                        <Badge size="xs" variant="outline" color="red">
                          Withheld
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">{p.average ?? '—'}</Table.Td>
                  <Table.Td ta="right">
                    {p.position ? `${ordinal(p.position)} of ${ranked}` : '—'}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={p.attendance ? undefined : 'dimmed'}>
                      {p.attendance
                        ? `${p.attendance.present} of ${p.attendance.total}`
                        : 'Not recorded'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text
                      size="sm"
                      c={p.classTeacherRemark ? undefined : 'dimmed'}
                      lineClamp={1}
                      maw={260}
                    >
                      {p.classTeacherRemark ?? 'Not written'}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    <Button size="compact-xs" variant="subtle">
                      {canRemark && !locked ? 'Remarks' : 'View'}
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      {open && batch && (
        <PupilDrawer
          key={open.termReportId}
          pupil={open}
          batch={batch}
          bank={bank}
          classes={classes}
          canRemark={canRemark && !locked}
          isHead={isHead}
          onClose={() => setOpen(null)}
          onChanged={replace}
        />
      )}
      {reopening && (
        <ReopenModal
          onClose={() => setReopening(false)}
          onReopen={(reason) => {
            setReopening(false);
            run('reopen', () => reportsApi.reopen(termId, classId, reason), 'Reports reopened');
          }}
        />
      )}
    </>
  );
}

function PupilDrawer({
  pupil,
  batch,
  bank,
  classes,
  canRemark,
  isHead,
  onClose,
  onChanged,
}: {
  pupil: PupilReport;
  batch: Batch;
  bank: BankRemark[];
  classes: SchoolClass[];
  canRemark: boolean;
  isHead: boolean;
  onClose: () => void;
  onChanged: (row: PupilReport) => void;
}) {
  const [form, setForm] = useState({
    classTeacherRemark: pupil.classTeacherRemark ?? '',
    headRemark: pupil.headRemark ?? '',
    conduct: pupil.conduct ?? '',
    attitude: pupil.attitude ?? '',
    interest: pupil.interest ?? '',
  });
  const [promotion, setPromotion] = useState(pupil.promotion);
  const [attendance, setAttendance] = useState({
    present: pupil.attendance?.present ?? ('' as number | string),
    total: pupil.attendance?.total ?? ('' as number | string),
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [withholding, setWithholding] = useState(false);

  // Suggestions from the remark bank, the ones that fit this pupil's average first.
  const suggestions = useMemo(() => {
    const fits = (r: BankRemark) =>
      pupil.average == null ||
      ((r.minAverage == null || pupil.average >= r.minAverage) &&
        (r.maxAverage == null || pupil.average <= r.maxAverage));
    return (kind: BankRemark['kind']) => [
      ...new Set(bank.filter((r) => r.kind === kind && fits(r)).map((r) => r.text)),
    ];
  }, [bank, pupil.average]);

  const manualAttendance = !pupil.attendance || pupil.attendance.source === 'manual';
  const change = (): RemarksChange => {
    const out: RemarksChange = {};
    const text = (v: string) => (v.trim() ? v.trim() : null);
    if (text(form.classTeacherRemark) !== pupil.classTeacherRemark)
      out.classTeacherRemark = text(form.classTeacherRemark);
    if (text(form.conduct) !== pupil.conduct) out.conduct = text(form.conduct);
    if (text(form.attitude) !== pupil.attitude) out.attitude = text(form.attitude);
    if (text(form.interest) !== pupil.interest) out.interest = text(form.interest);
    if (isHead && text(form.headRemark) !== pupil.headRemark)
      out.headRemark = text(form.headRemark);
    if (promotion && JSON.stringify(promotion) !== JSON.stringify(pupil.promotion))
      out.promotion = { status: promotion.status, toClassId: promotion.toClassId };
    if (manualAttendance && attendance.present !== '' && attendance.total !== '') {
      const next = { present: Number(attendance.present), total: Number(attendance.total) };
      if (next.present !== pupil.attendance?.present || next.total !== pupil.attendance?.total)
        out.attendance = next;
    }
    return out;
  };
  const attendanceProblem =
    manualAttendance &&
    attendance.present !== '' &&
    attendance.total !== '' &&
    Number(attendance.present) > Number(attendance.total)
      ? 'Days present can’t be more than school days.'
      : null;

  const save = async () => {
    const body = change();
    if (Object.keys(body).length === 0) return onClose();
    setSaving(true);
    try {
      onChanged(await reportsApi.saveRemarks(pupil.termReportId, body));
      notifications.show({ color: 'green', title: 'Saved', message: pupil.fullName });
      onClose();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not saved',
        message: errorMessage(err, 'Try again.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const showPreview = async () => {
    try {
      setPreview(await reportsApi.document(pupil.termReportId));
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Could not show the report',
        message: errorMessage(err, 'Try again.'),
      });
    }
  };

  const release = async () => {
    try {
      onChanged(await reportsApi.release(pupil.termReportId));
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Not released',
        message: errorMessage(err, 'Try again.'),
      });
    }
  };

  const field = (key: 'conduct' | 'attitude' | 'interest', label: string) => (
    <Autocomplete
      label={label}
      data={suggestions(key)}
      value={form[key]}
      onChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
      readOnly={!canRemark}
      maxLength={500}
      radius="md"
    />
  );
  const nextClasses = classes.map((c) => ({ value: c.id, label: c.className }));

  return (
    <Drawer opened onClose={onClose} position="right" size="lg" title={pupil.fullName} padding="lg">
      <Stack gap="md">
        <Group gap="xs">
          <Badge variant="light" color={PUPIL_STATUS[pupil.status].color}>
            {PUPIL_STATUS[pupil.status].label}
          </Badge>
          {pupil.average != null && <Text size="sm">Average {pupil.average}</Text>}
          {pupil.aggregate != null && <Text size="sm">· Aggregate {pupil.aggregate}</Text>}
          {pupil.position != null && (
            <Text size="sm">
              · {ordinal(pupil.position)} of {batch.rankedCount}
            </Text>
          )}
        </Group>
        {pupil.withheld && (
          <Alert color="red" title="Withheld from parents">
            <Stack gap="xs" align="flex-start">
              <Text size="sm">{pupil.withheldReason}</Text>
              {isHead && (
                <Button size="xs" variant="light" onClick={release}>
                  {pupil.status === 'left' ? 'Issue report anyway' : 'Release'}
                </Button>
              )}
            </Stack>
          </Alert>
        )}

        <Table verticalSpacing={4}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Subject</Table.Th>
              <Table.Th ta="right">Total</Table.Th>
              <Table.Th>Grade</Table.Th>
              <Table.Th ta="right">Position</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pupil.subjects.map((s) => (
              <Table.Tr key={s.subjectId} c={s.status === 'ok' ? undefined : 'dimmed'}>
                <Table.Td>{s.subjectName}</Table.Td>
                <Table.Td ta="right">
                  {s.status === 'ok'
                    ? s.total
                    : {
                        incomplete: 'INC',
                        exempt: 'EX',
                        missing: 'Marks missing',
                        not_assessed: 'Not assessed',
                      }[s.status]}
                </Table.Td>
                <Table.Td>{s.grade ?? ''}</Table.Td>
                <Table.Td ta="right">{s.position ? ordinal(s.position) : ''}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>

        <Textarea
          label="Class teacher's remark"
          value={form.classTeacherRemark}
          onChange={(e) => {
            // Read now: React clears currentTarget before the updater runs (QA-212).
            const { value } = e.currentTarget;
            setForm((f) => ({ ...f, classTeacherRemark: value }));
          }}
          readOnly={!canRemark}
          autosize
          minRows={2}
          maxLength={500}
          radius="md"
        />
        {canRemark && suggestions('class_teacher').length > 0 && (
          <Select
            placeholder="Use a saved remark"
            data={suggestions('class_teacher')}
            value={null}
            onChange={(v) => v && setForm((f) => ({ ...f, classTeacherRemark: v }))}
            size="xs"
            radius="md"
          />
        )}
        <SimpleGrid cols={3}>
          {field('conduct', 'Conduct')}
          {field('attitude', 'Attitude')}
          {field('interest', 'Interest')}
        </SimpleGrid>
        {(isHead || pupil.headRemark) && (
          <Textarea
            label="Head's remark"
            value={form.headRemark}
            onChange={(e) => {
              // Read now: React clears currentTarget before the updater runs (QA-212).
              const { value } = e.currentTarget;
              setForm((f) => ({ ...f, headRemark: value }));
            }}
            readOnly={!canRemark || !isHead}
            autosize
            minRows={2}
            maxLength={500}
            radius="md"
          />
        )}
        {batch.isLastTerm && promotion && (
          <Group grow align="flex-end">
            <Select
              label="End of year"
              data={[
                { value: 'promoted', label: 'Promoted' },
                { value: 'repeated', label: 'Repeats the year' },
                { value: 'graduated', label: 'Graduates' },
              ]}
              value={promotion.status}
              onChange={(v) =>
                v &&
                setPromotion((p) => ({
                  status: v as typeof promotion.status,
                  toClassId: v === 'promoted' ? (p?.toClassId ?? null) : null,
                  toClassName: v === 'promoted' ? (p?.toClassName ?? null) : null,
                }))
              }
              readOnly={!canRemark}
              allowDeselect={false}
              radius="md"
            />
            {promotion.status === 'promoted' && (
              <Select
                label="To"
                data={nextClasses}
                value={promotion.toClassId}
                onChange={(v) =>
                  setPromotion(
                    (p) =>
                      p && {
                        ...p,
                        toClassId: v,
                        toClassName: classes.find((c) => c.id === v)?.className ?? null,
                      },
                  )
                }
                readOnly={!canRemark}
                radius="md"
              />
            )}
          </Group>
        )}
        <Group grow align="flex-start">
          <NumberInput
            label="Days present"
            value={attendance.present}
            onChange={(v) => setAttendance((a) => ({ ...a, present: v }))}
            readOnly={!canRemark || !manualAttendance}
            min={0}
            allowDecimal={false}
            error={attendanceProblem}
            radius="md"
          />
          <NumberInput
            label="School days"
            description={manualAttendance ? undefined : 'From the attendance register'}
            value={attendance.total}
            onChange={(v) => setAttendance((a) => ({ ...a, total: v }))}
            readOnly={!canRemark || !manualAttendance}
            min={0}
            allowDecimal={false}
            radius="md"
          />
        </Group>

        <Group justify="space-between">
          <Group gap="xs">
            <Button variant="default" radius="md" onClick={showPreview}>
              Preview report
            </Button>
            {isHead && !pupil.withheld && (
              <Button variant="subtle" color="red" radius="md" onClick={() => setWithholding(true)}>
                Withhold
              </Button>
            )}
          </Group>
          {canRemark && (
            <Button
              color="fastrackRed"
              radius="md"
              loading={saving}
              disabled={!!attendanceProblem}
              onClick={save}
            >
              Save
            </Button>
          )}
        </Group>
      </Stack>

      {preview !== null && (
        <Modal
          opened
          onClose={() => setPreview(null)}
          title={`${pupil.fullName}'s report`}
          size="xl"
          radius="lg"
        >
          <iframe
            title="Report preview"
            srcDoc={preview}
            sandbox=""
            style={{ width: '100%', height: '70vh', border: 0 }}
          />
          <Group justify="flex-end" mt="sm">
            <Button
              variant="default"
              leftSection={<Printer size={16} />}
              onClick={() => openPrintable(preview)}
            >
              Open to print
            </Button>
          </Group>
        </Modal>
      )}
      {withholding && (
        <ReasonModal
          title="Withhold this report"
          label="Why"
          description="Parents won't see it; the pupil still counts in positions"
          action="Withhold"
          onClose={() => setWithholding(false)}
          onSubmit={async (reason) => {
            setWithholding(false);
            try {
              onChanged(await reportsApi.withhold(pupil.termReportId, reason));
            } catch (err) {
              notifications.show({
                color: 'red',
                title: 'Not withheld',
                message: errorMessage(err, 'Try again.'),
              });
            }
          }}
        />
      )}
    </Drawer>
  );
}

function ReasonModal({
  title,
  label,
  description,
  action,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  description: string;
  action: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <Modal opened onClose={onClose} title={title} radius="lg" centered>
      <Stack gap="md">
        <Textarea
          label={label}
          description={description}
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          autosize
          minRows={2}
          maxLength={500}
          radius="md"
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            color="orange"
            radius="md"
            disabled={!reason.trim()}
            onClick={() => onSubmit(reason.trim())}
          >
            {action}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function ReopenModal({
  onClose,
  onReopen,
}: {
  onClose: () => void;
  onReopen: (reason: string) => void;
}) {
  return (
    <ReasonModal
      title="Reopen these reports"
      label="What needs correcting"
      description="Parents keep seeing the published version until you publish again"
      action="Reopen"
      onClose={onClose}
      onSubmit={onReopen}
    />
  );
}
