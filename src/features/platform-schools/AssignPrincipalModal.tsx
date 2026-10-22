'use client';

import { useState } from 'react';
import { Alert, Button, Group, Modal, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { platformSchoolsApi as api } from './api';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/**
 * Creates the school's principal account. They get an email invitation to
 * set their own password; a school can have one active principal.
 */
export function AssignPrincipalModal({
  schoolId,
  schoolName,
  onClose,
  onAssigned,
}: {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
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
      await api.assignPrincipal(schoolId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      notifications.show({
        title: 'Principal invited',
        message: `${firstName.trim()} will get an email to set a password.`,
        color: 'green',
      });
      onAssigned();
    } catch (err) {
      setError(errorMessage(err, 'Could not assign the principal.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={`Assign a principal to ${schoolName}`}
      radius="lg"
      centered
    >
      <form onSubmit={submit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            The principal runs the school&apos;s workspace and invites the rest of its staff.
          </Text>
          {error && <Alert color="red">{error}</Alert>}
          <SimpleGrid cols={2}>
            <TextInput
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.currentTarget.value)}
              maxLength={100}
              required
              radius="md"
            />
            <TextInput
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.currentTarget.value)}
              maxLength={100}
              required
              radius="md"
            />
          </SimpleGrid>
          <TextInput
            type="email"
            label="Email"
            description="The invitation goes here"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            maxLength={255}
            required
            radius="md"
          />
          <TextInput
            label="Phone"
            placeholder="Optional"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
            maxLength={50}
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
