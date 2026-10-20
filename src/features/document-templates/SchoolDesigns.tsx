'use client';

import { useMemo } from 'react';
import { documentTemplatesApi } from './api';
import { TemplateBuilder } from './builder/TemplateBuilder';

/** A school's bill and report designs, for Fastrack staff (platform console). */
export function SchoolDesigns({ schoolId }: { schoolId: string }) {
  const api = useMemo(() => documentTemplatesApi(schoolId, true), [schoolId]);
  return <TemplateBuilder api={api} canManage isStaff />;
}
