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

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[\s.,\-/#]+/g, '');
}

function matchesText(propertyLocality: string, propertyTitle: string, query: string): boolean {
  const locality = propertyLocality.toLowerCase();
  const title = (propertyTitle || '').toLowerCase();

  if (
    locality.includes(query) ||
    query.includes(locality) ||
    title.includes(query) ||
    query.split(',')[0]?.trim() === locality
  ) {
    return true;
  }

  const normQuery = normalizeText(query);
  const normLocality = normalizeText(locality);
  const normTitle = normalizeText(title);

  return (
    normLocality.includes(normQuery) ||
    normQuery.includes(normLocality) ||
    normTitle.includes(normQuery)
  );
}

export function matchesMapSearch(
  property: { lat: number; lng: number; locality: string; title: string },
  search: MapSearchFilter,
): boolean {
  const hasQuery = search.query.trim().length > 0;
  const hasCenter = search.center !== null;

  if (!hasQuery && !hasCenter) return true;

  let withinRadius = false;
  if (hasCenter) {
    const distance = haversineKm(
      search.center!.lat,
      search.center!.lng,
      property.lat,
      property.lng,
    );
    withinRadius = distance <= search.radiusKm;
  }

  let textMatch = false;
  if (hasQuery) {
    const q = search.query.trim().toLowerCase();
    textMatch = matchesText(property.locality, property.title, q);
  }

  if (hasCenter && hasQuery) return withinRadius && textMatch;
  if (hasCenter) return withinRadius;
  if (hasQuery) return textMatch;

  return false;
}
