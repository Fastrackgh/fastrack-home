'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { CheckCircle, Clock } from 'lucide-react';
import { errorMessage } from '@/lib/api-client';
import { termOption, termRuns, type TermInYear } from '@/features/school-setup/api';
import { feesApi, type AcademicContext } from './api';
import { TermWarning } from './TermWarning';

export function GenerateInvoicesModal({
  opened,
  onClose,
  term,
  terms,
  classOptions,
  onGenerated,
}: {
  opened: boolean;
  onClose: () => void;
  /** The current term, chosen by default. */
  term: AcademicContext | null;
  terms: TermInYear[];
  classOptions: { value: string; label: string }[];
  onGenerated: () => void;
}) {
  const [termId, setTermId] = useState<string | null>(term?.termId ?? null);
  const [classId, setClassId] = useState('all');
  // Each opening starts on the current term; staff can pick another (QA-061).
  useEffect(() => {
    if (opened) setTermId(term?.termId ?? null);
  }, [opened, term?.termId]);
  const chosen = terms.find((t) => t.termId === termId);
  const [dueDate, setDueDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    if (!termId) {
      notifications.show({
        title: 'Pick a term',
        message: 'Choose the term these bills are for.',
        color: 'red',
      });
      return;
    }
    setGenerating(true);
    try {
      const result = await feesApi.generateInvoices({
        academicTermId: termId,
        classId: classId === 'all' ? undefined : classId,
        dueDate: dueDate || undefined,
      });
      notifications.show({
        title: result.generatedCount > 0 ? 'Invoices generated' : 'No new invoices',
        message:
          result.message ||
          `Generated ${result.generatedCount}, skipped ${result.skippedCount} that already had one.`,
        color: 'green',
        icon: <CheckCircle size={18} />,
        autoClose: 5000,
      });
      onClose();
      onGenerated();
    } catch (err) {
      notifications.show({
        title: 'Invoice Generation Failed',
        message: errorMessage(err, 'Could not generate invoices.'),
        color: 'red',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Box>
          <Title order={4} style={{ fontFamily: 'var(--font-heading)' }}>
            Batch Invoice Generation
          </Title>
          <Text size="xs" c="dimmed">
            Bills every pupil in the chosen classes for one term
          </Text>
        </Box>
      }
      radius="lg"
      centered
    >
      <Stack gap="md">
        <Select
          label="Term"
          description={termRuns(chosen)}
          data={terms.map(termOption)}
          value={termId}
          onChange={setTermId}
          allowDeselect={false}
          required
          radius="md"
          id="modal-gen-term"
        />
        <TermWarning termId={termId} terms={terms} />
        <Select
          label="Class Cohort"
          description="Select class or bill entire school"
          data={[{ value: 'all', label: 'All classes' }, ...classOptions]}
          value={classId}
          onChange={(v) => setClassId(v || 'all')}
          radius="md"
          id="modal-gen-class"
        />

        <TextInput
          label="Payment Due Date (Optional)"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.currentTarget.value)}
          radius="md"
          id="modal-gen-due-date"
        />

        <Alert icon={<Clock size={16} />} color="blue" radius="md">
          <Text size="xs">
            Fee schedules and prior term arrears will be computed automatically into each
            student&apos;s billing statement.
          </Text>
        </Alert>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} radius="md">
            Cancel
          </Button>
          <Button
            color="fastrackRed"
            onClick={generate}
            loading={generating}
            disabled={!termId}
            radius="md"
            id="btn-confirm-generate"
          >
            Generate Invoices Now
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
