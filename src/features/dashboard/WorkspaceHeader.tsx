'use client';
import { Alert, NativeSelect } from '@mantine/core';
import { CalendarDays, Lock } from 'lucide-react';
import { dataScopeOf } from '@/lib/rbac';
import { PageHeader, PreviewNotice } from '@/features/workspace';
import { sampleTerms } from './fixtures';
import { useWorkspace } from './WorkspaceProvider';

/** Page header for preview pages, with the sample term (and child) pickers. */
export function WorkspaceHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { viewer, term, termClosed, setTerm, child, setChild } = useWorkspace();
  return (
    <>
      <PreviewNotice>
        Sample data · Changes last until you switch child or term, or reload.
      </PreviewNotice>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {dataScopeOf(viewer.role) === 'own_children' && (
              <NativeSelect
                aria-label="Selected child"
                value={child}
                onChange={(e) => setChild(e.target.value)}
                data={[
                  { value: 'abena', label: 'Abena Osei · Primary 2' },
                  { value: 'kwesi', label: 'Kwesi Osei · Primary 4' },
                ]}
              />
            )}
            <NativeSelect
              aria-label="Academic term"
              leftSection={<CalendarDays size={15} />}
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              data={sampleTerms}
            />
          </>
        }
      />
      {termClosed && (
        <Alert color="gray" icon={<Lock size={16} />} mb="lg">
          This term is closed. Its records are read-only: you can view and export them, but not add
          or change anything.
        </Alert>
      )}
    </>
  );
}
