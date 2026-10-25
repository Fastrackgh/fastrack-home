import { apiClient, pathId } from '@/lib/api-client';
import type { ResultsSettings as EngineSettings } from './engine';

/*
 * Grading setup (results phase 1): presets, the school's schemes and scales,
 * which of them each level uses, and the school's results settings. Shapes
 * are in docs/api/results.md ("Grading setup").
 */

export type Mode = 'numeric' | 'descriptor';
export type Visibility = 'show' | 'hide' | 'staff_only';

export interface Component {
  key: string;
  label: string;
  shortLabel: string;
  /** Share of 100; all 0 in a descriptor scheme, whose components are strands. */
  weight: number;
  defaultMaxRaw: number | null;
  entry: 'single' | 'items';
  bestOf: number | null;
  group: 'continuous' | 'exam';
}

export interface Band {
  label: string;
  remark: string;
  /** Null in a descriptor scale. */
  minScore: number | null;
  points: number | null;
  isPass: boolean;
  description: string | null;
}

export interface SchemeContent {
  name: string;
  mode: Mode;
  components: Component[];
}

export interface ScaleContent {
  name: string;
  mode: Mode;
  /** Highest first. */
  bands: Band[];
}

export interface Settings extends Omit<EngineSettings, 'aggregate'> {
  /** The core count comes from the class's subjects marked "Always counted". */
  aggregate: { bestOtherCount: number } | null;
  classPositionVisibility: Visibility;
  subjectPositionVisibility: Visibility;
}

export const DEFAULT_SETTINGS: Settings = {
  scoreDecimals: 0,
  averageDecimals: 1,
  absentCountsAsZero: true,
  minCountedWeight: 50,
  averageBasis: 'all_taken',
  rankBy: 'average',
  minSubjectsForRankingPct: 50,
  aggregate: null,
  classPositionVisibility: 'show',
  subjectPositionVisibility: 'staff_only',
};

export interface Preset {
  key: string;
  name: string;
  description: string;
  suggestedForDepartmentCodes: string[];
  scheme: SchemeContent;
  scale: ScaleContent;
  settings: Partial<Settings>;
  subjects: { subjectCode: string; subjectName: string }[];
}

/** A school's edits to a preset; anything left out stays as the preset has it. */
export interface PresetOverrides {
  schemeName?: string;
  scaleName?: string;
  components?: Record<
    string,
    Partial<Pick<Component, 'label' | 'shortLabel' | 'weight' | 'bestOf'>>
  >;
  bands?: ({ index: number } & Partial<Omit<Band, 'description'>>)[];
}

export interface ApplyInput {
  academicYearId: string;
  defaultPresetKey: string;
  defaultOverrides?: PresetOverrides;
  departments?: { departmentId: string; presetKey: string; overrides?: PresetOverrides }[];
  settings?: Partial<Settings>;
  subjects?: boolean;
}

export interface ApplyResult {
  schemesCreated: number;
  scalesCreated: number;
  assignments: number;
  subjects: { created: number; existing: number };
  classSubjects: { added: number; alreadyThere: number };
}

export interface Scheme extends SchemeContent {
  id: string;
  familyId: string;
  version: number;
  versionCount: number;
  presetKey: string | null;
}

export interface Scale extends ScaleContent {
  id: string;
  familyId: string;
  version: number;
  versionCount: number;
  presetKey: string | null;
}

export type Scope = 'school' | 'department' | 'subject' | 'class' | 'class_subject';

export interface PolicyRow {
  scope: Scope;
  departmentId?: string | null;
  classId?: string | null;
  subjectId?: string | null;
  /** Null: inherit from the level above. */
  schemeFamilyId: string | null;
  scaleFamilyId: string | null;
}

export const resultsApi = {
  async listPresets(): Promise<Preset[]> {
    return (await apiClient.get<Preset[]>('/schools/me/results-presets')).data ?? [];
  },
  async apply(input: ApplyInput): Promise<ApplyResult> {
    return (await apiClient.post<ApplyResult>('/schools/me/results-setup/apply', input)).data;
  },
  async listSchemes(): Promise<Scheme[]> {
    return (await apiClient.get<Scheme[]>('/schools/me/assessment-schemes')).data ?? [];
  },
  async listScales(): Promise<Scale[]> {
    return (await apiClient.get<Scale[]>('/schools/me/grading-scales')).data ?? [];
  },
  async getPolicy(academicYearId: string): Promise<PolicyRow[]> {
    return (
      (
        await apiClient.get<PolicyRow[]>(
          `/schools/me/results-policy?academicYearId=${pathId(academicYearId)}`,
        )
      ).data ?? []
    );
  },
  async getSettings(): Promise<Settings> {
    const raw = (await apiClient.get<Partial<Settings>>('/schools/me/results-settings')).data;
    return { ...DEFAULT_SETTINGS, ...raw };
  },
};
