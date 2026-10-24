/*
 * How term results are worked out, as pure functions. The backend computes
 * the published results; this copy previews them while marks are typed, and
 * both are checked against docs/api/results-fixtures.json. The rules are in
 * docs/api/results.md ("Calculation").
 */

export type MarkStatus = 'scored' | 'absent' | 'exempt';

/** One test, exercise or exam paper. `null` means no mark entered yet. */
export type ItemMark = { status: MarkStatus; raw?: number | null; maxRaw: number } | null;

export interface SchemeComponent {
  key: string;
  /** Share of the subject's 100; a scheme's weights total 100. */
  weight: number;
  /** Count only the best N items; null counts all of them. */
  bestOf?: number | null;
}

export interface GradeBand {
  label: string;
  /** Lowest total that earns this band; the lowest band starts at 0. */
  minScore: number;
  points?: number | null;
  remark?: string | null;
  isPass?: boolean;
}

export interface ResultsSettings {
  scoreDecimals: number;
  averageDecimals: number;
  absentCountsAsZero: boolean;
  /** Below this share of the weight (after exemptions) a subject is incomplete. */
  minCountedWeight: number;
  averageBasis: 'all_taken' | 'core_only';
  rankBy: 'average' | 'total' | 'aggregate';
  /** Share of the class's assessed subjects a pupil needs a result in to be ranked. */
  minSubjectsForRankingPct: number;
  aggregate?: { coreCount: number; bestOtherCount: number } | null;
}

export const DEFAULT_SETTINGS: ResultsSettings = {
  scoreDecimals: 0,
  averageDecimals: 1,
  absentCountsAsZero: true,
  minCountedWeight: 50,
  averageBasis: 'all_taken',
  rankBy: 'average',
  minSubjectsForRankingPct: 50,
  aggregate: null,
};

/**
 * Rounds half away from zero. The 12-significant-digit step drops binary
 * noise first, so 79.49999999999999 (from 0.795 × 100) counts as 79.5.
 */
export function roundHalfUp(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  const scaled = Number((Math.abs(x) * scale).toPrecision(12));
  return (Math.sign(x) * Math.round(scaled)) / scale;
}

/** The band a printed total falls in: the highest band whose minimum it reaches. */
export function gradeFor(total: number, bands: GradeBand[]): GradeBand | null {
  const sorted = [...bands].sort((a, b) => b.minScore - a.minScore);
  return sorted.find((band) => total >= band.minScore) ?? null;
}

export type SubjectStatus = 'ok' | 'incomplete' | 'exempt' | 'missing';

export interface SubjectResult {
  status: SubjectStatus;
  /** Each component's printed score; null when exempt from it. */
  componentScores: { key: string; score: number | null }[];
  total: number | null;
  grade: string | null;
  points: number | null;
  /** True when exemptions left less than 100 of the weight and the total was scaled up. */
  reweighted: boolean;
}

/**
 * One pupil's result in one subject. `marks[key]` lists the component's items
 * in order. A component with no items, or any item without a mark, makes the
 * subject `missing`, which blocks submitting the mark sheet.
 */
export function subjectResult(
  components: SchemeComponent[],
  marks: Record<string, ItemMark[]>,
  bands: GradeBand[],
  settings: ResultsSettings,
): SubjectResult {
  const d = settings.scoreDecimals;
  const fractions = new Map<string, number | null>();
  for (const c of components) {
    const items = marks[c.key] ?? [];
    if (items.length === 0 || items.some((item) => item === null)) {
      return {
        status: 'missing',
        componentScores: components.map(({ key }) => ({ key, score: null })),
        total: null,
        grade: null,
        points: null,
        reweighted: false,
      };
    }
    const counted = (items as Exclude<ItemMark, null>[]).flatMap((item) => {
      if (item.status === 'scored') return [(item.raw ?? 0) / item.maxRaw];
      if (item.status === 'absent' && settings.absentCountsAsZero) return [0];
      return [];
    });
    const kept = [...counted]
      .sort((a, b) => b - a)
      .slice(0, c.bestOf ? Math.min(c.bestOf, counted.length) : counted.length);
    fractions.set(c.key, kept.length ? kept.reduce((sum, f) => sum + f, 0) / kept.length : null);
  }

  const componentScores = components.map(({ key, weight }) => {
    const f = fractions.get(key);
    return { key, score: f == null ? null : roundHalfUp(f * weight, d) };
  });
  const included = components.filter(({ key }) => fractions.get(key) != null);
  const countedWeight = included.reduce((sum, c) => sum + c.weight, 0);

  if (included.length === 0) {
    return {
      status: 'exempt',
      componentScores,
      total: null,
      grade: null,
      points: null,
      reweighted: false,
    };
  }
  if (countedWeight < settings.minCountedWeight) {
    return {
      status: 'incomplete',
      componentScores,
      total: null,
      grade: null,
      points: null,
      reweighted: false,
    };
  }

  const reweighted = countedWeight < 100;
  const total = reweighted
    ? roundHalfUp(
        (included.reduce((sum, c) => sum + fractions.get(c.key)! * c.weight, 0) * 100) /
          countedWeight,
        d,
      )
    : roundHalfUp(
        componentScores.reduce((sum, c) => sum + (c.score ?? 0), 0),
        d,
      );
  const band = gradeFor(total, bands);
  return {
    status: 'ok',
    componentScores,
    total,
    grade: band?.label ?? null,
    points: band?.points ?? null,
    reweighted,
  };
}

export interface SubjectLine {
  total: number | null;
  points?: number | null;
  countsInAverage?: boolean;
  isCore?: boolean;
  aggregateRole?: 'none' | 'core' | 'pool';
}

export interface PupilSummary {
  subjectsCounted: number;
  total: number | null;
  outOf: number | null;
  average: number | null;
  /** Lower is better; null when a core subject or enough pool subjects lack points. */
  aggregate: number | null;
}

/** A pupil's average, total and (when the school uses it) BECE-style aggregate. */
export function pupilSummary(subjects: SubjectLine[], settings: ResultsSettings): PupilSummary {
  const counted = subjects.filter(
    (s) =>
      s.total != null &&
      s.countsInAverage !== false &&
      (settings.averageBasis === 'all_taken' || s.isCore),
  );
  const n = counted.length;
  const sum = counted.reduce((acc, s) => acc + (s.total ?? 0), 0);
  return {
    subjectsCounted: n,
    total: n ? roundHalfUp(sum, settings.scoreDecimals) : null,
    outOf: n ? n * 100 : null,
    average: n ? roundHalfUp(sum / n, settings.averageDecimals) : null,
    aggregate: aggregateOf(subjects, settings.aggregate),
  };
}

function aggregateOf(subjects: SubjectLine[], rule: ResultsSettings['aggregate']): number | null {
  if (!rule) return null;
  const core = subjects.filter((s) => s.aggregateRole === 'core');
  if (core.length < rule.coreCount || core.some((s) => s.points == null)) return null;
  const pool = subjects
    .filter((s) => s.aggregateRole === 'pool' && s.points != null)
    .map((s) => s.points as number)
    .sort((a, b) => a - b);
  if (pool.length < rule.bestOtherCount) return null;
  const corePoints = core.reduce((acc, s) => acc + (s.points as number), 0);
  return corePoints + pool.slice(0, rule.bestOtherCount).reduce((acc, p) => acc + p, 0);
}

/**
 * Competition ranking (1, 2, 2, 4) on printed values. `null` values are not
 * ranked. Higher ranks first unless `lowerIsBetter` (aggregates).
 */
export function competitionRanks(
  values: (number | null)[],
  lowerIsBetter = false,
): (number | null)[] {
  const better = (a: number, b: number) => (lowerIsBetter ? a < b : a > b);
  return values.map((v) =>
    v == null ? null : 1 + values.filter((other) => other != null && better(other, v)).length,
  );
}

export interface RankablePupil {
  average: number | null;
  total: number | null;
  aggregate: number | null;
  /** Subjects this pupil has a result in, out of the class's assessed subjects. */
  subjectsWithResult: number;
}

/** Class positions; pupils with too few results, or nothing to rank by, get null. */
export function classPositions(
  pupils: RankablePupil[],
  subjectsAssessed: number,
  settings: ResultsSettings,
): (number | null)[] {
  const eligible = (p: RankablePupil) =>
    subjectsAssessed > 0 &&
    (p.subjectsWithResult * 100) / subjectsAssessed >= settings.minSubjectsForRankingPct;
  const values = pupils.map((p) => (eligible(p) ? p[settings.rankBy] : null));
  return competitionRanks(values, settings.rankBy === 'aggregate');
}
