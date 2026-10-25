'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { emailInputProps } from '@/lib/email-input';
import { errorMessage } from '@/lib/api-client';
import { fieldSetter } from '@/lib/state';
import {
  GUARDIAN_FIELDS,
  accountsSharingContact,
  studentsApi,
  type Guardians,
  type HistoryEntry,
  type LinkBlock,
  type LinkedParent,
  type StudentDetail,
} from './api';

const FIELD_LABELS: Record<string, string> = {
  motherName: "Mother's name",
  motherContact: "Mother's phone",
  motherEmail: "Mother's email",
  motherOccupation: "Mother's occupation",
  fatherName: "Father's name",
  fatherContact: "Father's phone",
  fatherEmail: "Father's email",
  fatherOccupation: "Father's occupation",
  emergencyContactName: 'Emergency contact',
  emergencyContactPhone: 'Emergency phone',
  emergencyContactRelationship: 'Emergency relationship',
};

const ACTION_LABELS: Record<string, string> = {
  'student.guardians.updated': 'Changed guardian contacts',
  'student.parent.linked': 'Linked a parent account',
  'student.parent.unlinked': 'Unlinked a parent account',
  'student.parent.blocked': 'Blocked a parent from linking',
  'student.parent.unblocked': 'Allowed a parent to link again',
};

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const shown = (value: unknown) =>
  value === null || value === undefined || value === '' ? '(empty)' : String(value);

/**
 * Guardian contacts (parents link in the parent app with a code sent to the
 * phone or email here), the linked parent accounts, relink blocks and the
 * change history. Editing needs `students:update`; the contacts, blocks and
 * history need `students:read_sensitive`, without which the backend blanks them.
 */
export function GuardiansTab({
  student,
  canEdit,
  canReadSensitive,
  onChanged,
}: {
  student: StudentDetail;
  canEdit: boolean;
  canReadSensitive: boolean;
  onChanged: () => void;
}) {
  // Redacted contacts arrive blank: never let them be saved over real ones.
  const editable = canEdit && canReadSensitive;
  const [draft, setDraft] = useState<Guardians>(student.guardians);
  const setDraftField = fieldSetter(setDraft);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<'mother' | 'father' | null>(null);
  const [removing, setRemoving] = useState<LinkedParent | null>(null);
  const [lifting, setLifting] = useState<LinkBlock | null>(null);

  const changed = GUARDIAN_FIELDS.filter((f) => draft[f].trim() !== student.guardians[f]);

  const text = (field: keyof Guardians, label: string, extra: object = {}) => (
    <TextInput
      label={label}
      value={draft[field]}
      onChange={(e) => setDraftField(field, e.currentTarget.value)}
      readOnly={!editable}
      radius="md"
      {...extra}
    />
  );

  const save = async () => {
    setSaving(true);
    try {
      await studentsApi.update(
        student.id,
        Object.fromEntries(changed.map((f) => [f, draft[f]])) as Partial<Guardians>,
      );
      notifications.show({
        title: 'Guardian contacts updated',
        message: student.fullName,
        color: 'green',
      });
      onChanged();
    } catch (err) {
      notifications.show({
        title: 'Could not update the contacts',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const link = async (guardian: 'mother' | 'father') => {
    setLinking(guardian);
    try {
      await studentsApi.linkFromGuardian(student.id, guardian);
      notifications.show({
        title: 'Parent account linked',
        message: `They can now see ${student.fullName} in the parent app.`,
        color: 'green',
      });
      onChanged();
    } catch (err) {
      notifications.show({
        title: 'Could not link a parent account',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setLinking(null);
    }
  };

  /** A guardian can be linked once a saved (not just typed) phone or email exists. */
  const linkButton = (guardian: 'mother' | 'father') => {
    const saved = student.guardians;
    const hasContact =
      guardian === 'mother'
        ? Boolean(saved.motherContact || saved.motherEmail)
        : Boolean(saved.fatherContact || saved.fatherEmail);
    if (!editable || !hasContact) return null;
    return (
      <Button
        size="compact-xs"
        variant="light"
        color="fastrackRed"
        loading={linking === guardian}
        disabled={changed.length > 0}
        title={changed.length > 0 ? 'Save your changes first' : undefined}
        onClick={() => link(guardian)}
      >
        Link parent account
      </Button>
    );
  };

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        Parents link themselves in the parent app with the student ID and a code sent to the phone
        or email below, so keep these correct. Every change is recorded.
      </Text>
      {!canReadSensitive && (
        <Alert color="gray" variant="light">
          Phone numbers and emails are hidden for your role.
        </Alert>
      )}

      <Group justify="space-between">
        <Divider label="Mother" labelPosition="left" style={{ flex: 1 }} />
        {linkButton('mother')}
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {text('motherName', 'Name', { maxLength: 255 })}
        {text('motherContact', 'Phone', { maxLength: 50 })}
        {text('motherEmail', 'Email', { ...emailInputProps, autoComplete: 'off', maxLength: 255 })}
        {text('motherOccupation', 'Occupation', { maxLength: 150 })}
      </SimpleGrid>

      <Group justify="space-between">
        <Divider label="Father" labelPosition="left" style={{ flex: 1 }} />
        {linkButton('father')}
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {text('fatherName', 'Name', { maxLength: 255 })}
        {text('fatherContact', 'Phone', { maxLength: 50 })}
        {text('fatherEmail', 'Email', { ...emailInputProps, autoComplete: 'off', maxLength: 255 })}
        {text('fatherOccupation', 'Occupation', { maxLength: 150 })}
      </SimpleGrid>

      <Divider label="Emergency contact" labelPosition="left" />
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {text('emergencyContactName', 'Name', { maxLength: 255 })}
        {text('emergencyContactPhone', 'Phone', { maxLength: 50 })}
        {text('emergencyContactRelationship', 'Relationship', { maxLength: 50 })}
      </SimpleGrid>

      {editable && (
        <Group justify="flex-end">
          <Button
            variant="default"
            radius="md"
            disabled={saving || changed.length === 0}
            onClick={() => setDraft(student.guardians)}
          >
            Undo changes
          </Button>
          <Button
            color="fastrackRed"
            radius="md"
            loading={saving}
            disabled={changed.length === 0}
            onClick={save}
          >
            Save contacts
          </Button>
        </Group>
      )}

      <Divider label="Linked parent accounts" labelPosition="left" />
      {student.parents.length === 0 ? (
        <Text size="sm" c="dimmed">
          No parent account is linked yet.
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {student.parents.map((p) => (
              <Table.Tr key={p.parentId}>
                <Table.Td>
                  <Group gap={6}>
                    <Text size="sm" fw={600}>
                      {p.fullName}
                    </Text>
                    {canReadSensitive && !p.contactOnRecord && (
                      <Badge size="xs" color="orange" variant="light" tt="none">
                        Contact no longer on record
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed">
                    {[p.relationship, p.email, p.phone].filter(Boolean).join(' · ')}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  {canEdit && (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="red"
                      onClick={() => setRemoving(p)}
                    >
                      Unlink
                    </Button>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {student.linkBlocks.length > 0 && (
        <>
          <Divider label="Blocked from linking" labelPosition="left" color="red" />
          <Table verticalSpacing="xs">
            <Table.Tbody>
              {student.linkBlocks.map((b) => (
                <Table.Tr key={b.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {b.parentName ?? 'Deleted parent account'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {[b.reason, b.blockedBy && `by ${b.blockedBy}`, when(b.blockedAt)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">
                    {canEdit && (
                      <Button size="compact-xs" variant="subtle" onClick={() => setLifting(b)}>
                        Allow again
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </>
      )}

      {canReadSensitive && <ChangeHistory studentId={student.id} />}

      {removing && (
        <UnlinkModal
          student={student}
          parent={removing}
          onClose={() => setRemoving(null)}
          onDone={onChanged}
        />
      )}
      {lifting && (
        <ConfirmModal
          title={`Allow ${lifting.parentName ?? 'this parent'} to link again?`}
          confirmLabel="Allow again"
          onClose={() => setLifting(null)}
          onConfirm={async () => {
            await studentsApi.liftBlock(student.id, lifting.id);
            notifications.show({
              title: 'Block lifted',
              message: student.fullName,
              color: 'green',
            });
            onChanged();
          }}
        >
          They will be able to link to {student.fullName} again with a code sent to the guardian
          contact on record.
        </ConfirmModal>
      )}
    </Stack>
  );
}

/** Name and email, so two accounts of one person can be told apart. */
const accountLabel = (p: LinkedParent) => (p.email ? `${p.fullName} (${p.email})` : p.fullName);

/** Unlink, optionally stopping the parent from linking again (custody disputes, court orders). */
function UnlinkModal({
  student,
  parent,
  onClose,
  onDone,
}: {
  student: StudentDetail;
  parent: LinkedParent;
  onClose: () => void;
  onDone: () => void;
}) {
  const [preventRelink, setPreventRelink] = useState(false);
  const [reason, setReason] = useState('');
  const [working, setWorking] = useState(false);
  const sharing = accountsSharingContact(parent, student.parents);

  const confirm = async () => {
    setWorking(true);
    try {
      await studentsApi.unlinkParent(student.id, parent.parentId, { preventRelink, reason });
      notifications.show({
        title: preventRelink ? 'Parent unlinked and blocked' : 'Parent unlinked',
        message:
          preventRelink && sharing.length > 0
            ? [parent, ...sharing].map(accountLabel).join(', ')
            : parent.fullName,
        color: 'green',
      });
      onDone();
      onClose();
    } catch (err) {
      notifications.show({
        title: `Could not unlink ${parent.fullName}`,
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title={`Unlink ${parent.fullName}?`} radius="lg" centered>
      <Stack gap="md">
        <Text size="sm">
          They will no longer see {student.fullName}&apos;s bills, receipts or reports.
        </Text>
        <Checkbox
          checked={preventRelink}
          onChange={(e) => setPreventRelink(e.currentTarget.checked)}
          label="Prevent this parent from linking again"
          description="Without this, they can link again straight away while their phone or email is on record."
          color="fastrackRed"
        />
        {preventRelink && (
          <Textarea
            label="Reason"
            placeholder="e.g. Court order of 12 Oct 2026"
            value={reason}
            onChange={(e) => setReason(e.currentTarget.value)}
            maxLength={255}
            autosize
            minRows={2}
            radius="md"
          />
        )}
        {preventRelink && sharing.length > 0 && (
          <Alert color="orange" variant="light" radius="md">
            {sharing.length === 1 ? 'Another account uses' : `${sharing.length} other accounts use`}{' '}
            the same phone or email and will be unlinked and blocked too:{' '}
            {sharing.map(accountLabel).join(', ')}.
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} radius="md" disabled={working}>
            Cancel
          </Button>
          <Button color="red" onClick={confirm} loading={working} radius="md">
            {preventRelink ? 'Unlink and block' : 'Unlink parent'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/** Who changed the contacts and linked or unlinked parents, newest first (loaded on demand). */
function ChangeHistory({ studentId }: { studentId: string }) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    if (open) return setOpen(false);
    setOpen(true);
    setError(null);
    try {
      setEntries(await studentsApi.history(studentId));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the history.'));
    }
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <Divider label="Change history" labelPosition="left" style={{ flex: 1 }} />
        <Button size="compact-xs" variant="subtle" onClick={toggle}>
          {open ? 'Hide' : 'Show'}
        </Button>
      </Group>
      {open &&
        (error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : !entries ? (
          <Loader size="sm" />
        ) : entries.length === 0 ? (
          <Text size="sm" c="dimmed">
            No changes recorded yet.
          </Text>
        ) : (
          entries.map((e) => (
            <Stack key={e.id} gap={2}>
              <Text size="sm" fw={600}>
                {ACTION_LABELS[e.action] ?? e.action}
                {typeof e.metadata?.reason === 'string' && e.metadata.reason
                  ? `: ${e.metadata.reason}`
                  : ''}
              </Text>
              <Text size="xs" c="dimmed">
                {[e.actorName ?? 'Parent app', when(e.createdAt)].join(' · ')}
                {e.metadata?.via === 'otp' ? ' · by the parent with a code' : ''}
              </Text>
              {e.changes &&
                Object.entries(e.changes).map(([field, change]) => (
                  <Text key={field} size="xs">
                    {FIELD_LABELS[field] ?? field}: {shown(change.from)} → {shown(change.to)}
                  </Text>
                ))}
            </Stack>
          ))
        ))}
    </Stack>
  );
}
