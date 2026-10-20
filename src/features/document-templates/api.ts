import { apiClient } from '@/lib/api-client';

/** Parent-facing documents a school can redesign (backend `DocumentKind`). */
export type DocumentKind = 'invoice.bill' | 'exam.report';
export type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export const KIND_LABELS: Record<DocumentKind, string> = {
  'invoice.bill': 'Fee bill',
  'exam.report': 'Terminal report',
};

/** Media `label` for a kind's samples (labels can't contain dots). */
export const sampleLabel = (kind: DocumentKind) => kind.replace('.', '_');

export interface TemplateField {
  path: string;
  type: string;
  description: string;
}

/** A kind's data contract, default design and sample data (`GET …/kinds`). */
export interface DocumentKindInfo {
  kind: DocumentKind;
  label: string;
  contractVersion: number;
  fields: TemplateField[];
  defaultHtml: string;
  defaultCss: string;
  sample: unknown;
}

export interface DocumentTemplate {
  id: string;
  schoolId: string;
  kind: DocumentKind;
  name: string;
  status: TemplateStatus;
  version: number;
  html: string;
  css: string;
  settings: Record<string, unknown>;
  contractVersion: number;
  basedOnId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateParts {
  html: string;
  css: string;
  settings: Record<string, unknown>;
}

/** An uploaded sample design (PDF or image) from `/media`. */
export interface TemplateSample {
  id: string;
  label: string | null;
  mimeType: string;
  originalFilename: string | null;
  url: string;
  createdAt: string;
}

/**
 * Template endpoints for one school. Principals use their own school
 * (`/schools/me/…`); Fastrack staff pass a school id (`/super-admin/…`).
 */
export function documentTemplatesApi(schoolId: string, asPlatform: boolean) {
  const base = asPlatform
    ? `/super-admin/schools/${encodeURIComponent(schoolId)}/document-templates`
    : '/schools/me/document-templates';
  const one = (id: string) => `${base}/${encodeURIComponent(id)}`;

  return {
    async kinds() {
      return (await apiClient.get<DocumentKindInfo[]>(`${base}/kinds`)).data ?? [];
    },
    async list(kind: DocumentKind) {
      const params = new URLSearchParams({ kind });
      return (await apiClient.get<DocumentTemplate[]>(`${base}?${params}`)).data ?? [];
    },
    async create(
      input: { kind: DocumentKind; name?: string; basedOnId?: string } & Partial<TemplateParts>,
    ) {
      return (await apiClient.post<DocumentTemplate>(base, input)).data;
    },
    async update(id: string, input: { name?: string } & Partial<TemplateParts>) {
      return (await apiClient.patch<DocumentTemplate>(one(id), input)).data;
    },
    async preview(kind: DocumentKind, parts: TemplateParts, invoiceId?: string) {
      const res = await apiClient.post<{ html: string }>(`${base}/preview`, {
        kind,
        ...parts,
        ...(invoiceId ? { invoiceId } : {}),
      });
      return res.data.html;
    },
    async publish(id: string) {
      return (await apiClient.post<DocumentTemplate>(`${one(id)}/publish`)).data;
    },
    async archive(id: string) {
      return (await apiClient.post<DocumentTemplate>(`${one(id)}/archive`)).data;
    },
    async duplicate(id: string) {
      return (await apiClient.post<DocumentTemplate>(`${one(id)}/duplicate`)).data;
    },
    async samples(kind: DocumentKind) {
      const params = new URLSearchParams({
        ownerType: 'SCHOOL',
        ownerId: schoolId,
        purpose: 'TEMPLATE_SAMPLE',
      });
      const all = (await apiClient.get<TemplateSample[]>(`/media?${params}`)).data ?? [];
      return all.filter((sample) => sample.label === sampleLabel(kind));
    },
    async uploadSample(kind: DocumentKind, file: File) {
      const form = new FormData();
      form.append('purpose', 'TEMPLATE_SAMPLE');
      form.append('ownerType', 'SCHOOL');
      form.append('ownerId', schoolId);
      form.append('label', sampleLabel(kind));
      form.append('file', file);
      return (await apiClient.postForm<TemplateSample>('/media', form)).data;
    },
    async removeSample(id: string) {
      await apiClient.delete(`/media/${encodeURIComponent(id)}`);
    },
  };
}

export type DocumentTemplatesApi = ReturnType<typeof documentTemplatesApi>;
