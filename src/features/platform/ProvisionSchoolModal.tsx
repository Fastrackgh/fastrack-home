'use client';

import { useState } from 'react';
import { Button, Group, Modal, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Building2 } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { emailInputProps } from '@/lib/email-input';
import { fieldSetter } from '@/lib/state';
import { platformApi } from './api';

const EMPTY = { name: '', code: '', address: '', phone: '', email: '', website: '' };

/** Creates a school; only the name is required (the code is generated when left empty). */
export function ProvisionSchoolModal({
  opened,
  onClose,
  onProvisioned,
}: {
  opened: boolean;
  onClose: () => void;
  onProvisioned: () => void;
}) {
  const [school, setSchool] = useState(EMPTY);
  const setField = fieldSetter(setSchool);
  const [submitting, setSubmitting] = useState(false);

  const provision = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = school.name.trim();
    if (!name) {
      notifications.show({
        color: 'red',
        title: 'Validation Error',
        message: 'School name is required.',
      });
      return;
    }
    const optional = (value: string) => value.trim() || undefined;
    setSubmitting(true);
    try {
      await platformApi.createSchool({
        name,
        code: optional(school.code),
        address: optional(school.address),
        phone: optional(school.phone),
        email: optional(school.email),
        website: optional(school.website),
      });
      notifications.show({
        color: 'green',
        title: 'School Provisioned',
        message: `${name} has been successfully created.`,
      });
      setSchool(EMPTY);
      onClose();
      onProvisioned();
    } catch (err) {
      notifications.show({
        color: 'red',
        title: 'Provisioning Failed',
        message: errorMessage(err, 'Failed to provision school'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" color="red" variant="light">
            <Building2 size={16} />
          </ThemeIcon>
          <Text fw={700} size="md">
            Provision New Tenant School
          </Text>
        </Group>
      }
      centered
      size="md"
      radius="md"
      closeOnClickOutside={false}
    >
      <form onSubmit={provision}>
        <Stack gap="md">
          <TextInput
            label="School Name"
            placeholder="e.g. Morning Star International"
            required
            value={school.name}
            onChange={(e) => setField('name', e.currentTarget.value)}
          />
          <TextInput
            label="School Code (Optional)"
            placeholder="e.g. MSI-001 (auto-generated if empty)"
            value={school.code}
            onChange={(e) => setField('code', e.currentTarget.value)}
          />
          <TextInput
            label="Contact Email"
            placeholder="admin@morningstar.edu.gh"
            {...emailInputProps}
            autoComplete="off"
            value={school.email}
            onChange={(e) => setField('email', e.currentTarget.value)}
          />
          <TextInput
            label="Phone Number"
            placeholder="+233 24 000 1122"
            value={school.phone}
            onChange={(e) => setField('phone', e.currentTarget.value)}
          />
          <TextInput
            label="Physical Address / Campus"
            placeholder="10 Cantonments Road, Accra"
            value={school.address}
            onChange={(e) => setField('address', e.currentTarget.value)}
          />
          <TextInput
            label="Website URL"
            placeholder="https://morningstar.edu.gh"
            value={school.website}
            onChange={(e) => setField('website', e.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              color="fastrackRed"
              loading={submitting}
              style={{
                background: 'linear-gradient(135deg, #e01a2b 0%, #b31422 100%)',
              }}
            >
              Provision School
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
