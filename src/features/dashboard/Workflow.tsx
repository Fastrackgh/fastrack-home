'use client';
import { useState } from 'react';
import { Alert, Button, Group, Modal, Select, Stack, Textarea, TextInput } from '@mantine/core';
import { can, dataScopeOf, type AccessPermission } from '@/lib/rbac';
import { Area, Panel, RecordRow, Viewer } from './model';

/**
 * The permission behind each summary panel's primary action. Areas with
 * their own workspace or live page carry their actions there instead.
 */
const workflowPermission: Partial<Record<Area, AccessPermission>> = {
  communication: 'messages:send',
};

export function workflowAllowed(viewer: Viewer, area: Area) {
  const permission = workflowPermission[area];
  return permission !== undefined && can(viewer, permission);
}

/** Recipients follow the viewer's data scope: families write to the school, staff to groups. */
function recipientsFor(viewer: Viewer) {
  return dataScopeOf(viewer.role) === 'own_children'
    ? ['School office', 'Class teacher']
    : [
        'All parents',
        'Primary parents',
        'JHS parents',
        'All students',
        'Primary students',
        'JHS students',
      ];
}

export function Workflow({
  area,
  panel,
  viewer,
  onClose,
  onSave,
}: {
  area: Area;
  panel: Panel;
  viewer: Viewer;
  onClose: () => void;
  onSave: (rows: RecordRow[]) => void;
}) {
  const [subject, setSubject] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!workflowAllowed(viewer, area)) {
      setError('This role cannot perform this action.');
      return;
    }
    if (!subject.trim() || !recipient || !message.trim()) {
      setError('Complete the required fields.');
      return;
    }
    const row: RecordRow = {
      id: crypto.randomUUID(),
      name: subject.trim(),
      group: recipient,
      value: 'Local preview',
      status: 'Draft',
      note: message.trim(),
    };
    onSave([row, ...panel.rows]);
  };
  return (
    <Modal opened onClose={onClose} title={panel.action} size="lg" centered>
      <form onSubmit={submit}>
        <Stack gap="md">
          <Alert color="yellow" title="Preview workspace">
            Changes stay in this browser session. No message is sent.
          </Alert>
          <TextInput
            required
            label="Title / subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter a subject"
          />
          <Select
            required
            label="Recipient"
            placeholder="Select an option"
            value={recipient || null}
            onChange={(v) => setRecipient(v ?? '')}
            data={recipientsFor(viewer)}
          />
          <Textarea
            required
            label="Message"
            minRows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {error && (
            <Alert color="red" role="alert">
              {error}
            </Alert>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" color="fastrackRed">
              Save preview draft
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
