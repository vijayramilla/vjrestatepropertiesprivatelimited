import { BANGALORE_AREAS, resolveLocalityName } from '@/data/properties';

/** Default filter ceiling — treat as "no max" for price/rental sliders. */
export const FILTER_RANGE_UNLIMITED = Number.MAX_SAFE_INTEGER;

/** Map public filter labels to Firestore `type` values (admin may use plural variants). */
export const TYPE_FILTER_ALIASES: Record<string, string[]> = {
  'PG Buildings': ['PG Building', 'PG Buildings', 'PG'],
  'PG Building': ['PG Building', 'PG Buildings', 'PG'],
  'Residential Rental Income': [
    'Residential Rental Income',
    'Residential Rental',
    'Residential',
  ],
  'Commercial Properties': ['Commercial Properties', 'Commercial'],
  'Residential Plot': ['Residential Plot'],
  'Commercial Plot': ['Commercial Plot'],
  'JD Land': ['JD Land'],
};

/** Display order for property categories on the listings page. */
export const PROPERTY_CATEGORIES = [
  'PG Buildings',
  'Residential Rental Income',
  'Commercial Properties',
  'Residential Plot',
  'Commercial Plot',
  'JD Land',
] as const;

export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

const ALL_TYPE_ALIASES = new Set(
  Object.values(TYPE_FILTER_ALIASES).flat().map((t) => t.toLowerCase()),
);

export type PropertyFilterInput = {
  type?: string | null;
  plot_subtype?: string | null;
  area?: string | null;
  location?: string | null;
  title?: string | null;
  price?: unknown;
  monthly_rental?: number | string | null;
  monthly_rental_label?: string | null;
};

export type PropertyListFilters = {
  types?: string[];
  localities?: string[];
  plotSubtype?: string;
  priceRange?: [number, number];
  rentalRange?: [number, number];
};

export function compactLocality(value: string): string {
  return value.trim().toLowerCase().replace(/[\s./-]+/g, '');
}

function localityTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s,./-]+/)
    .filter(Boolean);
}

/** Canonical locality name from list, or trimmed input. */
export function normalizeLocalityInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  return resolveLocalityName(trimmed) ?? trimmed;
}

/** Try to find a known Bangalore area mentioned in free text (e.g. property title). */
export function extractLocalityFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const resolved = resolveLocalityForSearch(trimmed);
  if (resolved) return resolved;

  const lower = trimmed.toLowerCase();
  for (const area of BANGALORE_AREAS) {
    if (lower.includes(area.toLowerCase())) return area;
  }

  const compactText = compactLocality(trimmed);
  for (const area of BANGALORE_AREAS) {
    const compactArea = compactLocality(area);
    if (compactArea.length >= 3 && compactText.includes(compactArea)) return area;
  }

  return '';
}

/** Resolve typed search text to a canonical Bangalore locality, if possible. */
export function resolveLocalityForSearch(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const exact = resolveLocalityName(trimmed);
  if (exact) return exact;

  const fromList = (BANGALORE_AREAS as readonly string[]).find(
    (area) => area.toLowerCase() === trimmed.toLowerCase(),
  );
  if (fromList) return fromList;

  const compact = compactLocality(trimmed);
  const compactMatch = (BANGALORE_AREAS as readonly string[]).find(
    (area) => compactLocality(area) === compact,
  );
  if (compactMatch) return compactMatch;

  const token = localityTokens(trimmed)[0];
  if (token && token.length >= 3) {
    const tokenMatch = (BANGALORE_AREAS as readonly string[]).find((area) => {
      const areaToken = localityTokens(area)[0];
      return areaToken === token || areaToken.startsWith(token) || token.startsWith(areaToken);
    });
    if (tokenMatch) return tokenMatch;
  }

  return null;
}

export function normalizeLocalityList(inputs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of inputs) {
    const normalized = normalizeLocalityInput(raw);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function getPropertyLocalityFields(
  property: PropertyFilterInput,
): string[] {
  return [property.area, property.location, property.title]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
}

/**
 * Match property to a selected locality using area, location, and title.
 * Handles canonical names, BTM 2nd Stage → BTM Layout, casing, and partial text.
 */
export function propertyMatchesLocality(
  property: PropertyFilterInput,
  filterLocality: string,
): boolean {
  const canonicalFilter = normalizeLocalityInput(filterLocality);
  if (!canonicalFilter) return true;

  const filterLower = canonicalFilter.toLowerCase();
  const filterCompact = compactLocality(canonicalFilter);
  const filterPrimaryToken = localityTokens(canonicalFilter)[0] ?? '';

  const fields = getPropertyLocalityFields(property);
  if (fields.length === 0) return false;

  for (const field of fields) {
    const canonicalField = normalizeLocalityInput(field) ?? field;
    const fieldLower = field.toLowerCase();
    const fieldCompact = compactLocality(field);
    const canonicalFieldCompact = compactLocality(canonicalField);
    const fieldPrimaryToken = localityTokens(field)[0] ?? '';

    if (canonicalField === canonicalFilter) return true;
    if (fieldLower === filterLower) return true;
    if (fieldCompact === filterCompact) return true;
    if (canonicalFieldCompact === filterCompact) return true;

    if (fieldLower.includes(filterLower) || filterLower.includes(fieldLower)) return true;
    if (fieldCompact.includes(filterCompact) || filterCompact.includes(fieldCompact)) {
      if (filterCompact.length >= 3) return true;
    }

    if (
      filterPrimaryToken.length >= 3 &&
      fieldPrimaryToken.length >= 3 &&
      (fieldPrimaryToken === filterPrimaryToken ||
        fieldPrimaryToken.startsWith(filterPrimaryToken) ||
        filterPrimaryToken.startsWith(fieldPrimaryToken))
    ) {
      return true;
    }
  }

  return false;
}

export function propertyMatchesAnyLocality(
  property: PropertyFilterInput,
  filterLocalities: string[],
): boolean {
  if (filterLocalities.length === 0) return true;
  return filterLocalities.some((loc) => propertyMatchesLocality(property, loc));
}

export function propertyMatchesTypeFilter(
  propertyType: string | undefined,
  filterType: string,
): boolean {
  const raw = String(propertyType ?? '').trim();
  if (!raw) return false;

  const aliases = TYPE_FILTER_ALIASES[filterType] ?? [filterType];
  if (aliases.some((a) => a.toLowerCase() === raw.toLowerCase())) return true;

  const rawLower = raw.toLowerCase();
  if (filterType === 'PG Building' && /\bpg\b/i.test(raw)) return true;

  return aliases.some(
    (a) => rawLower.includes(a.toLowerCase()) || a.toLowerCase().includes(rawLower),
  );
}

export function isKnownPropertyType(type: string | undefined): boolean {
  if (!type?.trim()) return false;
  return ALL_TYPE_ALIASES.has(type.trim().toLowerCase());
}

export function isPgProperty(type: string | undefined): boolean {
  return (
    propertyMatchesTypeFilter(type, 'PG Buildings') ||
    propertyMatchesTypeFilter(type, 'PG Building')
  );
}

/** Resolve a listing to one of the public property categories. */
export function getPropertyCategory(p: {
  type?: string | null;
  plot_subtype?: string | null;
}): PropertyCategory | string {
  const type = canonicalPropertyType(String(p.type ?? ''));

  if (isPgProperty(type)) return 'PG Buildings';
  if (type === 'Residential Rental Income') return 'Residential Rental Income';
  if (type === 'Commercial Properties') return 'Commercial Properties';
  if (type === 'Residential Plot') return 'Residential Plot';
  if (type === 'Commercial Plot') return 'Commercial Plot';
  if (type === 'JD Land') return 'JD Land';

  return type;
}

export function propertyMatchesCategoryFilter(
  property: { type?: string | null; plot_subtype?: string | null },
  filterCategory: string,
): boolean {
  return getPropertyCategory(property) === filterCategory;
}

export function isLandOrPlotProperty(p: {
  type?: string | null;
  plot_subtype?: string | null;
}): boolean {
  const type = String(p.type ?? '');
  return type.includes('Plot') || type === 'JD Land';
}

/** Normalize admin/public type labels before saving to Firestore. */
export function canonicalPropertyType(type: string): string {
  const t = type.trim();
  if (/^pg\s*plot$/i.test(t) || t === 'PG Plot') return 'Residential Plot';
  if (/^pg\s*buildings?$/i.test(t) || t === 'PG') return 'PG Buildings';
  if (/^residential rental/i.test(t)) return 'Residential Rental Income';
  if (/^commercial propert/i.test(t) || t === 'Commercial') return 'Commercial Properties';
  if (t === 'Residential Plot') return 'Residential Plot';
  if (t === 'Commercial Plot') return 'Commercial Plot';
  if (t === 'JD Land' || /^jd\s*land$/i.test(t)) return 'JD Land';
  return t;
}

/** Ensure area is canonical and location is searchable. */
export function normalizePropertyLocationFields(area: string, location: string): {
  area: string;
  location: string;
} {
  const normalizedArea = normalizeLocalityInput(area);
  const trimmedLocation = location.trim();

  if (!normalizedArea) {
    return { area: '', location: trimmedLocation };
  }

  if (!trimmedLocation) {
    return { area: normalizedArea, location: normalizedArea };
  }

  const locationMatchesArea = propertyMatchesLocality(
    { area: normalizedArea, location: trimmedLocation },
    normalizedArea,
  );

  return {
    area: normalizedArea,
    location: locationMatchesArea ? trimmedLocation : `${trimmedLocation}, ${normalizedArea}`,
  };
}

export function getNumericPrice(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) return price;
  if (typeof price === 'string') {
    const digits = price.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }
  return 0;
}

export function getMonthlyRentalValue(p: {
  monthly_rental?: number | string | null;
  monthly_rental_label?: string | null;
}): number {
  const raw = p.monthly_rental;
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const digits = raw.replace(/[^\d]/g, '');
    if (digits) return Number(digits);
  }
  const label = p.monthly_rental_label;
  if (typeof label === 'string' && label !== '—') {
    const digits = label.replace(/[^\d]/g, '');
    if (digits) return Number(digits);
  }
  return 0;
}

function effectiveRentalMax(max: number): number {
  return max >= 999_999_999 ? FILTER_RANGE_UNLIMITED : max;
}

function effectivePriceMax(max: number): number {
  return max >= 100_000_000 ? FILTER_RANGE_UNLIMITED : max;
}

export function propertyMatchesPriceRange(
  property: PropertyFilterInput,
  range: [number, number],
): boolean {
  const price = getNumericPrice(property.price);
  const [min, max] = range;
  return price >= min && price <= effectivePriceMax(max);
}

export function propertyMatchesRentalRange(
  property: PropertyFilterInput,
  range: [number, number],
): boolean {
  if (isLandOrPlotProperty(property)) return true;
  const rental = getMonthlyRentalValue(property);
  const [min, max] = range;
  return rental >= min && rental <= effectiveRentalMax(max);
}

/** Normalize Firestore property fields at read time so filters always work. */
export function normalizePropertyRecord<T extends Record<string, unknown>>(
  raw: T,
): T & PropertyFilterInput {
  const area = typeof raw.area === 'string' ? raw.area : '';
  const location = typeof raw.location === 'string' ? raw.location : '';
  const title = typeof raw.title === 'string' ? raw.title : '';
  const inferredArea =
    area || extractLocalityFromText(location) || extractLocalityFromText(title);
  const { area: normArea, location: normLocation } = normalizePropertyLocationFields(
    inferredArea,
    location || title,
  );

  return {
    ...raw,
    type: canonicalPropertyType(String(raw.type ?? '')),
    area: normArea,
    location: normLocation,
    price: getNumericPrice(raw.price),
    monthly_rental: getMonthlyRentalValue(raw as PropertyFilterInput),
  };
}

export function filterProperties<T extends PropertyFilterInput>(
  properties: T[],
  filters: PropertyListFilters,
): T[] {
  const {
    types = [],
    localities = [],
    plotSubtype = '',
    priceRange = [0, FILTER_RANGE_UNLIMITED],
    rentalRange = [0, FILTER_RANGE_UNLIMITED],
  } = filters;

  let result = [...properties];

  if (types.length > 0) {
    result = result.filter((p) =>
      types.some((t) => propertyMatchesCategoryFilter(p, t)),
    );
  }

  if (plotSubtype === 'Residential Plot') {
    result = result.filter((p) => getPropertyCategory(p) === 'Residential Plot');
  } else if (plotSubtype === 'Commercial Plot') {
    result = result.filter((p) => getPropertyCategory(p) === 'Commercial Plot');
  } else if (plotSubtype === 'JD Land') {
    result = result.filter((p) => getPropertyCategory(p) === 'JD Land');
  }

  if (localities.length > 0) {
    result = result.filter((p) => propertyMatchesAnyLocality(p, localities));
  }

  result = result.filter((p) => propertyMatchesPriceRange(p, priceRange));
  result = result.filter((p) => propertyMatchesRentalRange(p, rentalRange));

  return result;
}

/** Validate area exists in master list (warn in dev if custom). */
export function isCanonicalBangaloreArea(area: string): boolean {
  return (BANGALORE_AREAS as readonly string[]).includes(area);
}
