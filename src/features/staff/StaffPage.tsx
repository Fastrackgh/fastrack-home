'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NativeSelect,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { MailPlus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { ROLE_LABELS } from '@/lib/rbac';
import {
  INVITABLE_ROLES,
  staffApi,
  type InvitableRole,
  type Invitation,
  type StaffMember,
} from './api';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const statusColor: Record<Invitation['status'], string> = {
  PENDING: 'orange',
  ACCEPTED: 'teal',
  EXPIRED: 'gray',
  REVOKED: 'red',
};

/** The school's teaching staff and, for those who manage staff, invitations. */
export function StaffPage() {
  const { can } = useAuth();
  const mayManage = can('staff:manage');
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [members, invites] = await Promise.all([
        staffApi.listStaff(),
        mayManage ? staffApi.listInvitations() : Promise.resolve(null),
      ]);
      setStaff(members);
      setInvitations(invites);
    } catch (e) {
      setError(errorMessage(e, 'Could not load staff.'));
    }
  }, [mayManage]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label: string, run: () => Promise<void>) => {
    try {
      await run();
      notifications.show({ color: 'teal', title: label, message: 'Done.' });
      await load();
    } catch (e) {
      notifications.show({
        color: 'red',
        title: `${label} failed`,
        message: errorMessage(e, 'Try again.'),
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Teaching staff, and invitations for new school users."
        actions={
          <>
            <Button variant="default" leftSection={<RefreshCw size={15} />} onClick={load}>
              Refresh
            </Button>
            {mayManage && (
              <Button
                color="fastrackRed"
                leftSection={<MailPlus size={15} />}
                onClick={() => setInviting(true)}
              >
                Invite user
              </Button>
            )}
          </>
        }
      />
      {error ? (
        <Alert color="red" title="Unable to load staff">
          {error}
        </Alert>
      ) : (
        <Stack gap="lg">
          <Section title="Teaching staff" loading={staff === null}>
            <Table.ScrollContainer minWidth={700}>
              <Table verticalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Position</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {staff?.map((p) => (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {p.firstName} {p.lastName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {p.staffCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {[p.position, p.department].filter(Boolean).join(' · ') || '—'}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{p.email}</Text>
                        <Text size="xs" c="dimmed">
                          {p.phone}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={p.isActive ? 'teal' : 'gray'}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {staff?.length === 0 && <Empty text="No teaching staff yet." />}
          </Section>

          {mayManage && (
            <Section title="Invitations" loading={invitations === null}>
              <Table.ScrollContainer minWidth={700}>
                <Table verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Invited user</Table.Th>
                      <Table.Th>Role</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Expires</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {invitations?.map((inv) => (
                      <Table.Tr key={inv.id}>
                        <Table.Td>
                          <Text fw={600} size="sm">
                            {inv.userName || inv.email}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {inv.email}
                          </Text>
                        </Table.Td>
                        <Table.Td>{ROLE_LABELS[inv.role] ?? inv.role}</Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={statusColor[inv.status]}>
                            {inv.status.toLowerCase()}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{new Date(inv.expiresAt).toLocaleString('en-GB')}</Table.Td>
                        <Table.Td>
                          {inv.status !== 'ACCEPTED' && (
                            <Group gap="xs" justify="flex-end" wrap="nowrap">
                              <Button
                                size="compact-xs"
                                variant="subtle"
                                onClick={() =>
                                  act('Invitation resent', () => staffApi.resend(inv.id))
                                }
                              >
                                Resend
                              </Button>
                              {inv.status === 'PENDING' && (
                                <Button
                                  size="compact-xs"
                                  variant="subtle"
                                  color="red"
                                  onClick={() =>
                                    act('Invitation revoked', () => staffApi.revoke(inv.id))
                                  }
                                >
                                  Revoke
                                </Button>
                              )}
                            </Group>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
              {invitations?.length === 0 && <Empty text="No invitations sent yet." />}
            </Section>
          )}
        </Stack>
      )}
      {inviting && (
        <InviteModal
          onClose={() => setInviting(false)}
          onSent={async () => {
            setInviting(false);
            await load();
          }}
        />
      )}
    </>
  );
}

function InviteModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [role, setRole] = useState<InvitableRole>('TEACHER');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Enter the person's name and email.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await staffApi.invite({
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      notifications.show({
        color: 'teal',
        title: 'Invitation sent',
        message: `${email.trim()} will receive an email to set up their account.`,
      });
      onSent();
    } catch (err) {
      setError(errorMessage(err, 'Could not send the invitation.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Invite a school user" centered>
      <form onSubmit={send}>
        <Stack>
          <NativeSelect
            label="Role"
            value={role}
            onChange={(e) => setRole(e.currentTarget.value as InvitableRole)}
            data={INVITABLE_ROLES.map((r) => ({
              value: r,
              label: ROLE_LABELS[r],
            }))}
          />
          <SimpleGrid cols={2}>
            <TextInput
              label="First name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
            />
            <TextInput
              label="Last name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
            />
          </SimpleGrid>
          <TextInput
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <TextInput
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
          />
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving}>
              Send invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

function Section({
  title,
  loading,
  children,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
}) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Text fw={700} mb="md">
        {title}
      </Text>
      {loading ? (
        <Group justify="center" py="xl">
          <Loader color="red" size="sm" />
        </Group>
      ) : (
        children
      )}
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Text c="dimmed" size="sm" ta="center" py="lg">
      {text}
    </Text>
  );
}
