'use client';

import { useMemo } from 'react';
import { Alert } from '@mantine/core';
import { PageHeader } from '@/features/workspace';
import { useAuth } from '@/lib/auth';
import { documentTemplatesApi } from './api';
import { TemplateBuilder } from './builder/TemplateBuilder';

/** The principal's designs for the bill and terminal report parents receive. */
export function DocumentTemplatesPage() {
  const { user, can } = useAuth();
  const schoolId = user?.schoolId ?? null;
  const api = useMemo(() => (schoolId ? documentTemplatesApi(schoolId, false) : null), [schoolId]);

  return (
    <>
      <PageHeader
        title="Bill & report designs"
        subtitle="Design how fee bills and terminal reports look to parents: pick a starting design, arrange the sections, then publish."
      />
      {api ? (
        <TemplateBuilder api={api} canManage={can('document_templates:manage')} />
      ) : (
        <Alert color="red">Your account is not linked to a school.</Alert>
      )}
    </>
  );
}
