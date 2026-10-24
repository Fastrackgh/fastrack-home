import { gradeFor, roundHalfUp, subjectResult, type ItemMark } from './engine';
import type { Band, Component, Preset, PresetOverrides, Settings } from './api';

/** A school's working copy of one preset's weights and bands while it sets up. */
export interface PresetEdit {
  components: Component[];
  bands: Band[];
}

export const editFrom = (preset: Preset): PresetEdit => ({
  components: preset.scheme.components.map((c) => ({ ...c })),
  bands: preset.scale.bands.map((b) => ({ ...b })),
});

/** Weights add up in hundredths, so 33.33 + 33.33 + 33.34 is exactly 100. */
export const weightTotal = (components: Component[]) =>
  components.reduce((sum, c) => sum + Math.round(c.weight * 100), 0) / 100;

/** Equal weights to two places, with the rounding left on the last one. */
export function evenSplit(components: Component[]): Component[] {
  const n = components.length;
  if (n === 0) return components;
  const share = Math.floor(10000 / n);
  return components.map((c, i) => ({
    ...c,
    weight: (i === n - 1 ? 10000 - share * (n - 1) : share) / 100,
  }));
}

export function weightsProblem(edit: PresetEdit, mode: Preset['scheme']['mode']): string | null {
  if (mode === 'descriptor') return null;
  if (edit.components.some((c) => !(c.weight > 0))) return 'Every part needs a weight above 0.';
  const total = weightTotal(edit.components);
  return total === 100 ? null : `The weights add up to ${total}, not 100.`;
}

/** Bands are highest first; each starts below the one above, and the last starts at 0. */
export function bandsProblem(edit: PresetEdit, mode: Preset['scale']['mode']): string | null {
  const labels = edit.bands.map((b) => b.label.trim());
  if (labels.some((l) => !l)) return 'Every grade needs a label.';
  if (new Set(labels.map((l) => l.toLowerCase())).size !== labels.length)
    return 'Two grades have the same label.';
  if (mode === 'descriptor') return null;
  const mins = edit.bands.map((b) => b.minScore ?? NaN);
  if (mins.some((m) => !(m >= 0 && m <= 100))) return 'Each grade starts between 0 and 100.';
  for (let i = 1; i < mins.length; i++)
    if (!(mins[i] < mins[i - 1]))
      return `${labels[i]} must start below ${labels[i - 1]} (${mins[i - 1]}).`;
  return mins[mins.length - 1] === 0
    ? null
    : `The lowest grade, ${labels.at(-1)}, must start at 0.`;
}

/** What changed from the preset, in the apply body's shape; undefined if nothing did. */
export function overridesFor(preset: Preset, edit: PresetEdit): PresetOverrides | undefined {
  const components: NonNullable<PresetOverrides['components']> = {};
  preset.scheme.components.forEach((original, i) => {
    const now = edit.components[i];
    const change: NonNullable<PresetOverrides['components']>[string] = {};
    if (now.label !== original.label) change.label = now.label;
    if (now.shortLabel !== original.shortLabel) change.shortLabel = now.shortLabel;
    if (preset.scheme.mode === 'numeric') {
      if (now.weight !== original.weight) change.weight = now.weight;
      if (now.bestOf !== original.bestOf) change.bestOf = now.bestOf;
    }
    if (Object.keys(change).length) components[original.key] = change;
  });
  const bands: NonNullable<PresetOverrides['bands']> = [];
  preset.scale.bands.forEach((original, index) => {
    const now = edit.bands[index];
    const change: NonNullable<PresetOverrides['bands']>[number] = { index };
    if (now.label !== original.label) change.label = now.label;
    if (now.remark !== original.remark) change.remark = now.remark;
    if (now.minScore !== original.minScore) change.minScore = now.minScore;
    if (now.points !== original.points) change.points = now.points;
    if (now.isPass !== original.isPass) change.isPass = now.isPass;
    if (Object.keys(change).length > 1) bands.push(change);
  });
  const result: PresetOverrides = {};
  if (Object.keys(components).length) result.components = components;
  if (bands.length) result.bands = bands;
  // The preset's name would describe the old numbers ("GES 30/70" holding 40/60),
  // so an edited copy is named after what it now holds.
  if (Object.values(components).some((c) => c.weight !== undefined))
    result.schemeName = edit.components.map((c) => `${c.label} ${c.weight}`).join(' / ');
  if (bands.length) result.scaleName = `${preset.scale.name} (edited)`;
  return Object.keys(result).length ? result : undefined;
}

const engineBands = (bands: Band[]) =>
  bands.map((b) => ({ label: b.label, minScore: b.minScore ?? 0, points: b.points }));

/** The printed total and grade a raw total would get, as on a report. */
export function tryScore(score: number, edit: PresetEdit, decimals: number) {
  const printed = roundHalfUp(score, decimals);
  return { printed, grade: gradeFor(printed, engineBands(edit.bands))?.label ?? null };
}

/**
 * A made-up pupil's result under these weights: 3 of 4 on every test, and
 * 61 of 80 on the exam, so the school sees the maths worked through.
 */
export function sampleResult(edit: PresetEdit, settings: Settings) {
  const marks: Record<string, ItemMark[]> = {};
  for (const c of edit.components) {
    marks[c.key] =
      c.entry === 'items'
        ? [6, 8, 7, 9].map((raw) => ({ status: 'scored' as const, raw, maxRaw: 10 }))
        : [{ status: 'scored', raw: 61, maxRaw: 80 }];
  }
  return {
    marks,
    result: subjectResult(
      edit.components.map((c) => ({ key: c.key, weight: c.weight, bestOf: c.bestOf })),
      marks,
      engineBands(edit.bands),
      { ...settings, aggregate: null },
    ),
  };
}
