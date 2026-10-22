'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Pagination,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { Search, UserPlus } from 'lucide-react';
import { ConfirmModal } from '@/features/fees/ConfirmModal';
import { useAuth } from '@/lib/auth';
import { PAGE_SIZE, type Page } from '@/lib/pagination';
import { errorMessage, platformApi, type PlatformUser } from './api';

/** Fastrack's own Super Admin accounts. Nobody can switch off their own account here. */
export function PlatformUsersPanel() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 300);
  const [result, setResult] = useState<Page<PlatformUser> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<PlatformUser | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setResult(await platformApi.listUsers(page, query));
    } catch (err) {
      setError(errorMessage(err, 'Could not load the platform users.'));
    }
  }, [page, query]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [query]);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <TextInput
          placeholder="Search by name or email"
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          radius="md"
          w={300}
        />
        <Button
          color="fastrackRed"
          radius="md"
          leftSection={<UserPlus size={16} />}
          onClick={() => setAdding(true)}
        >
          Add Super Admin
        </Button>
      </Group>

      {error ? (
        <Alert color="red" title="Unable to load platform users">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{error}</Text>
            <Button size="xs" variant="light" color="red" onClick={load}>
              Try again
            </Button>
          </Stack>
        </Alert>
      ) : !result ? (
        <Loader />
      ) : (
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {result.items.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" ta="center" py="lg">
                    No platform user matches that search.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              result.items.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Text size="sm" fw={600}>
                      {u.firstName} {u.lastName}
                      {u.id === user?.id && (
                        <Text span size="xs" c="dimmed">
                          {' '}
                          (you)
                        </Text>
                      )}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{u.email}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={u.isActive ? 'teal' : 'gray'} variant="light">
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="right">
                    {u.id !== user?.id && (
                      <Button
                        size="compact-xs"
                        variant="subtle"
                        color={u.isActive ? 'red' : 'teal'}
                        onClick={() => setToggling(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      )}

      {result && result.total > PAGE_SIZE && (
        <Group justify="flex-end">
          <Pagination
            total={Math.ceil(result.total / PAGE_SIZE)}
            value={page}
            onChange={setPage}
            color="fastrackRed"
          />
        </Group>
      )}

      {adding && (
        <AddPlatformUserModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {toggling && (
        <ConfirmModal
          title={`${toggling.isActive ? 'Deactivate' : 'Reactivate'} ${toggling.firstName} ${toggling.lastName}?`}
          confirmLabel={toggling.isActive ? 'Deactivate' : 'Reactivate'}
          onClose={() => setToggling(null)}
          onConfirm={async () => {
            await platformApi.setUserActive(toggling.id, !toggling.isActive);
            notifications.show({
              title: toggling.isActive ? 'Account deactivated' : 'Account reactivated',
              message: toggling.email,
              color: 'green',
            });
            load();
          }}
        >
          {toggling.isActive
            ? 'They will be signed out and unable to reach the platform console.'
            : 'They will be able to sign in to the platform console again.'}
        </ConfirmModal>
      )}
    </Stack>
  );
}

function AddPlatformUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await platformApi.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      notifications.show({
        title: 'Super Admin invited',
        message: `${email.trim()} will get an email to set a password.`,
        color: 'green',
      });
      onAdded();
    } catch (err) {
      setError(errorMessage(err, 'Could not add the user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal opened onClose={onClose} title="Add a Super Admin" radius="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Super Admins can open every school&apos;s records. Add only Fastrack staff.
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <SimpleGrid cols={2}>
            <TextInput
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              required
              radius="md"
            />
            <TextInput
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              required
              radius="md"
            />
          </SimpleGrid>
          <TextInput
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
            radius="md"
          />
          <TextInput
            label="Phone"
            placeholder="Optional"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
            radius="md"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose} radius="md" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed" loading={saving} radius="md">
              Send invitation
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
