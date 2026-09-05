/**
 * Indian numbering system helpers.
 *
 * Indian digit grouping keeps the last three digits together and then groups
 * by two (lakh / crore): 1,00,000 (1 lakh) · 1,00,00,000 (1 crore).
 * Intl.NumberFormat('en-IN') applies that grouping natively.
 */

/** ₹1,50,000 — Indian grouping, symbol on by default. */
export function formatINR(value: number | string | null | undefined, showSymbol = true): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '—';
  const formatted = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n);
  return showSymbol ? `₹${formatted}` : formatted;
}

/** Compact phrasing used in hints: 150000 → "₹1.5 lakh", 12000000 → "₹1.2 crore". */
export function indianScale(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return formatINR(0);
  const crore = n / 10000000;
  const lakh = n / 100000;
  const tidy = (v: number) => {
    const r = Math.round(v * 100) / 100;
    return String(r % 1 === 0 ? r : r.toFixed(r >= 10 ? 1 : 2)).replace(/\.?0+$/, '');
  };
  if (crore >= 1) return `₹${tidy(crore)} crore`;
  if (lakh >= 1) return `₹${tidy(lakh)} lakh`;
  return formatINR(n);
}
