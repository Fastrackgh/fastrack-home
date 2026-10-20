/**
 * Money is held as whole pesewas (1 GHS = 100 pesewas) so totals never pick
 * up floating-point drift. The API speaks decimal cedis: convert with
 * `toPesewas` on the way in and `toCedis` on the way out.
 */
export type Pesewas = number;

export function toPesewas(cedis: unknown): Pesewas {
  const value = Number(cedis);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function toCedis(pesewas: Pesewas): number {
  return pesewas / 100;
}

const ghs = new Intl.NumberFormat('en-GH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `GHS 1,400.00`; negative amounts keep their sign (`GHS -300.00`). */
export function formatGhs(pesewas: Pesewas): string {
  return `GHS ${ghs.format(toCedis(pesewas))}`;
}

export function sumPesewas<T>(items: readonly T[], amount: (item: T) => Pesewas): Pesewas {
  return items.reduce((total, item) => total + amount(item), 0);
}
