export const LAND_TYPES = [
  'Residential Plot',
  'Commercial Plot',
  'Agriculture Land',
  'PG Plot',
] as const;

export type LandType = (typeof LAND_TYPES)[number];

export const CATEGORY_CONFIG: Record<
  LandType,
  { color: string; label: string }
> = {
  'Residential Plot': { color: '#EF4444', label: 'Residential Plot' },
  'Commercial Plot': { color: '#F97316', label: 'Commercial Plot' },
  'Agriculture Land': { color: '#15803D', label: 'Agriculture Land' },
  'PG Plot': { color: '#7C3AED', label: 'PG Plot' },
};

export const BUDGET_FILTERS = [
  { label: 'All Budgets', min: 0, max: Infinity },
  { label: 'Under ₹50L', min: 0, max: 5000000 },
  { label: '₹50L - ₹1Cr', min: 5000000, max: 10000000 },
  { label: '₹1Cr - ₹2Cr', min: 10000000, max: 20000000 },
  { label: '₹2Cr - ₹5Cr', min: 20000000, max: 50000000 },
  { label: 'Above ₹5Cr', min: 50000000, max: Infinity },
] as const;

export type BudgetFilter = (typeof BUDGET_FILTERS)[number];

export function formatMapINR(amount: number): string {
  if (!amount) return '—';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
}

export const BANGALORE_BOUNDS = {
  north: 13.215,
  south: 12.75,
  west: 77.35,
  east: 77.85,
};
