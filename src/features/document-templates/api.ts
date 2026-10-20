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

export type PropType =
  | 'text'
  | 'multiline'
  | 'richtext'
  | 'toggle'
  | 'select'
  | 'multiselect'
  | 'color'
  | 'number'
  | 'image'
  | 'list'
  | 'feeGroups';

/** One editable property of a section; the builder draws its form from this. */
export interface PropSchema {
  key: string;
  label: string;
  type: PropType;
  default: unknown;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  itemFields?: PropSchema[];
}

/** A section type of the visual builder. */
export interface BlockSchema {
  type: string;
  label: string;
  description: string;
  icon: string;
  container: boolean;
  props: PropSchema[];
  /** Where the section can sit on the page (width, position, spacing, alignment). */
  layoutProps?: PropSchema[];
}

/** A field a text can show, e.g. the student's name. */
export interface Placeholder {
  path: string;
  label: string;
  format?: 'money' | 'date';
}

export interface LayoutBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  hidden?: boolean;
  /** Placement on the page; absent when everything is at its default. */
  style?: Record<string, unknown>;
  children?: { left: LayoutBlock[]; right: LayoutBlock[] };
}

export interface DocumentLayout {
  version: 1;
  theme: Record<string, unknown>;
  blocks: LayoutBlock[];
}

export interface StarterDesign {
  key: string;
  label: string;
  description: string;
  layout: DocumentLayout;
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
  placeholders: Placeholder[];
  blocks: BlockSchema[];
  themeProps: PropSchema[];
  starters: StarterDesign[];
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
  /** The visual design; null for code-mode templates. */
  layout: DocumentLayout | null;
  mode: 'visual' | 'code';
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

/** An image a school uploaded to place in its designs (public URL). */
export interface DesignImage {
  id: string;
  url: string;
  originalFilename: string | null;
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
      input: {
        kind: DocumentKind;
        name?: string;
        basedOnId?: string;
        starter?: string;
        layout?: DocumentLayout;
      } & Partial<TemplateParts>,
    ) {
      return (await apiClient.post<DocumentTemplate>(base, input)).data;
    },
    async update(
      id: string,
      input: { name?: string; layout?: DocumentLayout } & Partial<TemplateParts>,
    ) {
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
    /** Renders a saved version (allowed for principals, even code-mode ones). */
    async previewSaved(id: string, invoiceId?: string) {
      const res = await apiClient.post<{ html: string }>(
        `${one(id)}/preview`,
        invoiceId ? { invoiceId } : {},
      );
      return res.data.html;
    },
    /** Renders an unsaved visual design (live builder preview). */
    async previewLayout(kind: DocumentKind, layout: DocumentLayout, invoiceId?: string) {
      const res = await apiClient.post<{ html: string }>(`${base}/preview`, {
        kind,
        layout,
        ...(invoiceId ? { invoiceId } : {}),
      });
      return res.data.html;
    },
    /** Fastrack staff only: detach a draft from the visual builder. */
    async convertToCode(id: string) {
      return (await apiClient.post<DocumentTemplate>(`${one(id)}/convert-to-code`)).data;
    },
    async images() {
      const params = new URLSearchParams({
        ownerType: 'SCHOOL',
        ownerId: schoolId,
        purpose: 'TEMPLATE_ASSET',
      });
      return (await apiClient.get<DesignImage[]>(`/media?${params}`)).data ?? [];
    },
    async uploadImage(file: File) {
      const form = new FormData();
      form.append('purpose', 'TEMPLATE_ASSET');
      form.append('ownerType', 'SCHOOL');
      form.append('ownerId', schoolId);
      form.append('file', file);
      return (await apiClient.postForm<DesignImage>('/media', form)).data;
    },
    /** The school's fee types, for grouping fees in the fee table. */
    async feeTypes() {
      const path = asPlatform
        ? `/super-admin/schools/${encodeURIComponent(schoolId)}/fee-types`
        : '/schools/me/fee-types';
      return (await apiClient.get<Array<{ id: string; name: string }>>(path)).data ?? [];
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
