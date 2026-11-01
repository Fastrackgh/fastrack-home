import { apiClient } from '@/lib/api-client';

/*
 * Moving whole classes up a year (QA-207). The backend suggests each class's
 * next class from the classes' order numbers; a run is all or nothing, so a
 * 400 means nothing was moved.
 */

export interface PromotionPupil {
  /** The school-student id, as sent back in `exceptStudentIds`. */
  id: string;
  studentCode: string;
  fullName: string;
}

export type SuggestedAction = 'promote' | 'graduate' | 'choose';

export interface ClassOption {
  id: string;
  className: string;
}

export interface PromotionClass {
  classId: string;
  classCode: string;
  className: string;
  sequenceOrder: number;
  departmentName: string | null;
  pupilCount: number;
  pupils: PromotionPupil[];
  suggestion: {
    /** `choose`: several classes share the next number. */
    action: SuggestedAction;
    toClass: ClassOption | null;
    options: ClassOption[];
  };
}

export interface PromotionClassRun {
  fromClassId: string;
  /** Leave out `toClassId` and set `graduate` for pupils leaving the school. */
  toClassId?: string;
  graduate?: true;
  /** Pupils who repeat the year and stay in the class. */
  exceptStudentIds?: string[];
}

export interface PromotionRun {
  /** The term pupils start in their new class. */
  termId: string;
  /** YYYY-MM-DD; recorded for pupils who graduate. */
  exitDate?: string;
  classes: PromotionClassRun[];
}

export interface PromotionResult {
  termId: string;
  promoted: number;
  graduated: number;
  kept: number;
  classes: {
    fromClassId: string;
    fromClassName: string;
    toClassId: string | null;
    toClassName: string | null;
    graduated: boolean;
    moved: number;
    kept: number;
  }[];
}

export const promotionsApi = {
  async preview(): Promise<PromotionClass[]> {
    const res = await apiClient.get<{ classes: PromotionClass[] }>(
      '/schools/me/promotions/preview',
    );
    return res.data?.classes ?? [];
  },
  async run(run: PromotionRun): Promise<PromotionResult> {
    const res = await apiClient.post<PromotionResult>('/schools/me/promotions', run);
    return res.data;
  },
};
