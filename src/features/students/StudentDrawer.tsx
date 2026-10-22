'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Drawer,
  FileButton,
  Group,
  Loader,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Trash2, Upload } from 'lucide-react';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { feesApi, type FeeType } from '@/features/fees/api';
import { useAuth } from '@/lib/auth';
import {
  STATUS_LABELS,
  errorMessage,
  studentsApi,
  type FeePreference,
  type LinkedParent,
  type StudentDetail,
} from './api';
import { EnrolmentTab } from './EnrolmentTab';
import { ProfileTab } from './ProfileTab';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/**
 * One student's record: profile, class history and moves, guardians and
 * optional fees. Every action shows only with the permission it needs, and
 * the backend checks each again for this school.
 */
export function StudentDrawer({
  studentId,
  onClose,
  onChanged,
}: {
  studentId: string | null;
  onClose: () => void;
  /** The list reloads after a change that shows in it (name, class, status). */
  onChanged: () => void;
}) {
  const { can } = useAuth();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const canUpdate = can('students:update');

  const load = useCallback(async () => {
    if (!studentId) return;
    setError(null);
    try {
      setStudent(await studentsApi.get(studentId));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the student.'));
    }
  }, [studentId]);

  useEffect(() => {
    setStudent(null);
    load();
  }, [load]);

  const changed = () => {
    load();
    onChanged();
  };

  const photo = async (run: () => Promise<void>, done: string) => {
    setPhotoBusy(true);
    try {
      await run();
      notifications.show({ title: done, message: student?.fullName, color: 'green' });
      load();
    } catch (err) {
      notifications.show({
        title: 'Could not change the photo',
        message: errorMessage(err, 'Try another image.'),
        color: 'red',
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <Drawer
      opened={studentId !== null}
      onClose={onClose}
      position="right"
      size="xl"
      title={<Text fw={700}>Student record</Text>}
    >
      {error ? (
        <Alert color="red" title="Unable to load the student">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !student ? (
        <Loader />
      ) : (
        <Stack gap="lg">
          <Group gap="md" wrap="nowrap" align="flex-start">
            <Avatar src={student.photoUrl} size={72} radius="md" color="fastrackRed">
              {student.fullName
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Avatar>
            <Stack gap={4} style={{ flex: 1 }}>
              <Text fw={700} size="lg">
                {student.fullName}
              </Text>
              <Group gap={6}>
                <Badge variant="outline" color="dark" tt="none">
                  {student.studentCode}
                </Badge>
                {student.className && (
                  <Badge variant="light" color="blue" tt="none">
                    {student.className}
                  </Badge>
                )}
                <Badge variant="light" color={student.status === 'Active' ? 'green' : 'gray'}>
                  {STATUS_LABELS[student.status] ?? student.status}
                </Badge>
              </Group>
              {canUpdate && (
                <Group gap="xs">
                  <FileButton
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(file) => {
                      if (!file) return;
                      if (file.size > MAX_PHOTO_BYTES) {
                        notifications.show({
                          title: 'That photo is too large',
                          message: 'Use one under 2 MB.',
                          color: 'red',
                        });
                        return;
                      }
                      photo(() => studentsApi.uploadPhoto(student.id, file), 'Photo updated');
                    }}
                  >
                    {(props) => (
                      <Button
                        {...props}
                        size="compact-xs"
                        variant="light"
                        color="fastrackRed"
                        leftSection={<Upload size={12} />}
                        loading={photoBusy}
                      >
                        {student.photoUrl ? 'Replace photo' : 'Add photo'}
                      </Button>
                    )}
                  </FileButton>
                  {student.photoUrl && (
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="red"
                      leftSection={<Trash2 size={12} />}
                      disabled={photoBusy}
                      onClick={() =>
                        photo(() => studentsApi.removePhoto(student.id), 'Photo removed')
                      }
                    >
                      Remove
                    </Button>
                  )}
                </Group>
              )}
            </Stack>
          </Group>

          <Tabs defaultValue="profile" color="fastrackRed" keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="profile">Profile</Tabs.Tab>
              <Tabs.Tab value="class">Class & status</Tabs.Tab>
              <Tabs.Tab value="guardians">Guardians</Tabs.Tab>
              {can('student_fee_preferences:manage') && (
                <Tabs.Tab value="fees">Optional fees</Tabs.Tab>
              )}
            </Tabs.List>
            <Tabs.Panel value="profile">
              <ProfileTab
                key={student.id}
                student={student}
                canEdit={canUpdate}
                onSaved={changed}
              />
            </Tabs.Panel>
            <Tabs.Panel value="class">
              <EnrolmentTab
                student={student}
                canPromote={can('enrollment:manage')}
                canExit={can('students:exit')}
                onChanged={changed}
              />
            </Tabs.Panel>
            <Tabs.Panel value="guardians">
              <GuardiansTab student={student} canUnlink={canUpdate} onChanged={load} />
            </Tabs.Panel>
            {can('student_fee_preferences:manage') && (
              <Tabs.Panel value="fees">
                <OptionalFeesTab studentId={student.id} />
              </Tabs.Panel>
            )}
          </Tabs>
        </Stack>
      )}
    </Drawer>
  );
}

/** Parent accounts linked to the student, who see their bills and reports in the parent app. */
function GuardiansTab({
  student,
  canUnlink,
  onChanged,
}: {
  student: StudentDetail;
  canUnlink: boolean;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState<LinkedParent | null>(null);
  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Parents link themselves in the parent app with the student ID and a code sent to the contact
        on record. Unlink anyone who should no longer see this student.
      </Text>
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
                  <Text size="sm" fw={600}>
                    {p.fullName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {[p.relationship, p.email, p.phone].filter(Boolean).join(' · ')}
                  </Text>
                </Table.Td>
                <Table.Td ta="right">
                  {canUnlink && (
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
      {removing && (
        <ConfirmModal
          title={`Unlink ${removing.fullName}?`}
          confirmLabel="Unlink parent"
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await studentsApi.unlinkParent(student.id, removing.parentId);
            notifications.show({
              title: 'Parent unlinked',
              message: removing.fullName,
              color: 'green',
            });
            onChanged();
          }}
        >
          They will no longer see {student.fullName}&apos;s bills, receipts or reports.
        </ConfirmModal>
      )}
    </Stack>
  );
}

/** Optional fees (bus, lunch, …) the student is billed for. */
function OptionalFeesTab({ studentId }: { studentId: string }) {
  const [feeTypes, setFeeTypes] = useState<FeeType[] | null>(null);
  const [prefs, setPrefs] = useState<Record<string, FeePreference>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [types, current] = await Promise.all([
        feesApi.listFeeTypes(),
        studentsApi.feePreferences(studentId),
      ]);
      setFeeTypes(types.filter((t) => t.isOptional));
      setPrefs(current);
    } catch (err) {
      setError(errorMessage(err, 'Could not load the optional fees.'));
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (feeTypeId: string, enabled: boolean) => {
    setSaving(feeTypeId);
    try {
      await studentsApi.setFeePreference(studentId, feeTypeId, enabled);
      setPrefs((p) => ({ ...p, [feeTypeId]: { ...p[feeTypeId], enabled } }));
    } catch (err) {
      notifications.show({
        title: 'Could not change the optional fee',
        message: errorMessage(err, 'Try again.'),
        color: 'red',
      });
    } finally {
      setSaving(null);
    }
  };

  if (error)
    return (
      <Alert color="red" title="Unable to load optional fees">
        <Button size="xs" variant="light" color="red" onClick={load}>
          Try again
        </Button>
      </Alert>
    );
  if (!feeTypes) return <Loader />;
  if (feeTypes.length === 0)
    return (
      <Text size="sm" c="dimmed">
        The school has no optional fees. Mark a fee type as optional under Fees & Billing.
      </Text>
    );

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Changes apply to bills generated from now on.
      </Text>
      {feeTypes.map((t) => (
        <Switch
          key={t.id}
          label={t.name}
          description={t.description ?? undefined}
          checked={prefs[t.id]?.enabled ?? false}
          disabled={saving === t.id}
          onChange={(e) => toggle(t.id, e.currentTarget.checked)}
          color="fastrackRed"
        />
      ))}
    </Stack>
  );
}
