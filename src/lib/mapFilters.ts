import type { BudgetFilter, LandType } from '@/data/mapConfig';

export interface MapSearchFilter {
  query: string;
  center: { lat: number; lng: number } | null;
  radiusKm: number;
}

export const DEFAULT_MAP_SEARCH: MapSearchFilter = {
  query: '',
  center: null,
  radiusKm: 8,
};

export function parseMapPrice(raw: Record<string, unknown>): number {
  const direct = Number(raw.price ?? raw.askingPrice ?? raw.totalPrice ?? 0);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const label = String(raw.price_label ?? raw.priceLabel ?? '').trim();
  if (!label) return 0;

  const normalized = label.replace(/[₹,\s]/g, '').toLowerCase();
  const crMatch = normalized.match(/([\d.]+)\s*cr/);
  if (crMatch) return parseFloat(crMatch[1]) * 10000000;

  const lacMatch = normalized.match(/([\d.]+)\s*(l|lac|lakh|lakhs)/);
  if (lacMatch) return parseFloat(lacMatch[1]) * 100000;

  const digits = normalized.replace(/[^\d.]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function matchesMapCategory(
  propertyType: LandType,
  activeCategories: string[],
): boolean {
  if (activeCategories.length === 0) return true;
  return activeCategories.includes(propertyType);
}

export function matchesMapBudget(price: number, budget: BudgetFilter): boolean {
  const safePrice = Number.isFinite(price) ? price : 0;
  if (budget.label === 'All Budgets') return true;
  if (safePrice <= 0) return false;
  return safePrice >= budget.min && safePrice <= budget.max;
}

export function matchesMapSearch(
  property: { lat: number; lng: number; locality: string; title: string },
  search: MapSearchFilter,
): boolean {
  if (!search.query.trim() && !search.center) return true;

  if (search.center) {
    const distance = haversineKm(
      search.center.lat,
      search.center.lng,
      property.lat,
      property.lng,
    );
    if (distance <= search.radiusKm) return true;
  }

  const query = search.query.trim().toLowerCase();
  if (!query) return false;

  const locality = property.locality.toLowerCase();
  const title = (property.title || '').toLowerCase();

  return (
    locality.includes(query) ||
    query.includes(locality) ||
    title.includes(query) ||
    query.split(',')[0]?.trim() === locality
  );
}
