import {
  BANGALORE_AREAS,
  PROPERTY_TYPES,
  filterLocalities,
  PRICE_BUDGET_PRESETS,
  RENTAL_BUDGET_PRESETS,
  UNLIMITED_FILTER_MAX,
  MAX_LOCALITY_SELECTIONS,
} from '@/data/properties';
import {
  filterProperties,
  normalizeLocalityList,
  type PropertyFilterInput,
} from '@/lib/propertyFilters';
import { formatPrice } from '@/lib/formatPrice';

export interface SmartSearchResult {
  localities: string[];
  types: string[];
  priceRange: [number, number] | null;
  rentalRange: [number, number] | null;
  minAreaSqft: number | null;
  matchCount: number;
  confidence: 'high' | 'medium' | 'low';
  chips: string[];
  label: string;
  showSmartBlock: boolean;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match a name only when it sits on word boundaries (avoids "hal" in "Jalahalli"). */
function findWordBoundaryMatches(text: string, candidates: readonly string[]): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const candidate of candidates) {
    const c = candidate.toLowerCase();
    const re = new RegExp(`(?:^|[^a-z])${escapeRegex(c)}(?:$|[^a-z])`);
    if (re.test(lower)) hits.push(candidate);
  }
  return hits;
}

/** Words that are not locality abbreviations — prevents "in" → Indiranagar,
 *  "cross" → Jalahalli Cross, "under" → (nothing) false positives. */
const LOCALITY_TOKEN_STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'and', 'or', 'to', 'by', 'with', 'from',
  'under', 'over', 'above', 'below', 'near', 'around', 'about', 'between', 'within',
  'across', 'off', 'up', 'down', 'into', 'onto', 'per', 'plus', 'minus', 'max', 'min',
  'new', 'old', 'road', 'cross', 'layout', 'nagar', 'east', 'west', 'north', 'south',
  'rent', 'rental', 'income', 'price', 'budget', 'property', 'properties', 'building',
  'buildings', 'plot', 'plots', 'land', 'commercial', 'residential', 'pg', 'sq', 'sqft',
  'feet', 'thousand', 'crore', 'cr', 'lakh', 'lacs', 'lac', 'villa', 'villas', 'house',
  'area', 'locality', 'show', 'find', 'search', 'looking', 'want', 'need', 'available',
  'good', 'best', 'all', 'any', 'buy', 'sale', 'near', 'square', 'ft', 'k', 'l', 'rs',
]);

function detectLocalities(q: string): string[] {
  const found = new Set<string>();

  findWordBoundaryMatches(q, BANGALORE_AREAS).forEach((area) => found.add(area));

  // Fuzzy per-token matching for abbreviations (e.g. "hsr" → HSR Layout, "btm" → BTM Layout).
  // Common English words are excluded so search phrases don't match area names by accident.
  const tokens = q
    .split(/[\s,]+/)
    .filter((t) => t.length >= 2 && /^[a-z0-9]+$/i.test(t))
    .filter((t) => !LOCALITY_TOKEN_STOPWORDS.has(t.toLowerCase()));
  for (const token of tokens) {
    const hit = filterLocalities(token, 1)[0];
    if (hit && (BANGALORE_AREAS as readonly string[]).includes(hit)) found.add(hit);
  }

  return normalizeLocalityList([...found]).slice(0, MAX_LOCALITY_SELECTIONS);
}

function detectTypes(q: string): string[] {
  const types: string[] = [];
  const push = (t: string) => {
    if (!types.includes(t) && (PROPERTY_TYPES as readonly string[]).includes(t)) types.push(t);
  };

  // Specific patterns first — e.g. "commercial plot" must win over the generic
  // "plot" and "commercial" fallbacks, otherwise both plot types and commercial
  // properties get wrongly included.
  if (/commercial plot/i.test(q)) push('Commercial Plot');
  else if (/residential plot|house plot/i.test(q)) push('Residential Plot');

  if (/paying guest|\bpg\b/i.test(q)) push('PG Buildings');
  if (/residential rental|rental income|\brental\b/i.test(q)) push('Residential Rental Income');
  if (/jd land|agricultur|farm land/i.test(q)) push('JD Land');

  // Generic fallbacks only when nothing specific matched.
  if (types.length === 0) {
    if (/\bplots?\b/i.test(q)) {
      push('Residential Plot');
      push('Commercial Plot');
    }
    if (/\bcommercial\b/i.test(q)) push('Commercial Properties');
    if (/\bland\b/i.test(q)) push('JD Land');
  }

  return types;
}

const AMOUNT_SUFFIX_CRORE = /(?:crore|cr\b)/;

function toRupees(match: RegExpMatchArray): number {
  const value = parseFloat(match[1]);
  return AMOUNT_SUFFIX_CRORE.test(match[0]) ? value * 1_00_00_000 : value * 1_00_000;
}

function parsePrice(q: string): [number, number] | null {
  const rupee = /(?:₹|rs\.?\s*)?/;
  const under = new RegExp(
    `(?:under|below|within|less than|upto|up to|max|around|about)\\s*${rupee.source}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:crore|cr\\b)`,
    'i',
  );
  const underLakh = new RegExp(
    `(?:under|below|within|less than|upto|up to|max|around|about)\\s*${rupee.source}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:lakh|lacs?|l\\b)`,
    'i',
  );
  const above = new RegExp(
    `(?:above|over|more than|minimum|min)\\s*${rupee.source}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:crore|cr\\b)`,
    'i',
  );
  const aboveLakh = new RegExp(
    `(?:above|over|more than|minimum|min)\\s*${rupee.source}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:lakh|lacs?|l\\b)`,
    'i',
  );
  const plain = new RegExp(`${rupee.source}\\b(\\d+(?:\\.\\d+)?)\\s*(?:crore|cr\\b)`, 'i');
  const plainLakh = new RegExp(`\\b(\\d+(?:\\.\\d+)?)\\s*(?:lakh|lacs?|l\\b)`, 'i');

  let m = q.match(under);
  if (m) return [0, parseFloat(m[1]) * 1_00_00_000];
  m = q.match(underLakh);
  if (m) return [0, parseFloat(m[1]) * 1_00_000];
  m = q.match(above);
  if (m) return [parseFloat(m[1]) * 1_00_00_000, UNLIMITED_FILTER_MAX];
  m = q.match(aboveLakh);
  if (m) return [parseFloat(m[1]) * 1_00_000, UNLIMITED_FILTER_MAX];
  m = q.match(plain) ?? q.match(plainLakh);
  if (m) {
    const value = toRupees(m);
    const preset = PRICE_BUDGET_PRESETS.find((p) => value >= p.range[0] && value <= p.range[1]);
    return preset ? (preset.range as [number, number]) : [value * 0.8, value * 1.2];
  }
  return null;
}

function parseRental(q: string): [number, number] | null {
  const m = q.match(
    /(?:rent|rental|income)\s*(?:is\s*)?(above|over|under|below|within|upto|up to|max|around|about)?\s*(?:₹|rs\.?\s*)?\s*(\d+(?:\.\d+)?)\s*(k|lakh|lacs?|l|thousand)?/i,
  );
  if (!m) return null;
  const num = parseFloat(m[2]);
  const suffix = (m[3] || '').toLowerCase();
  let value = num;
  if (suffix === 'k' || suffix === 'thousand') value = num * 1000;
  else if (suffix === 'l' || suffix === 'lakh' || suffix === 'lacs') value = num * 1_00_000;

  const direction = (m[1] || '').toLowerCase();
  if (direction === 'above' || direction === 'over') return [value, UNLIMITED_FILTER_MAX];
  if (direction === 'under' || direction === 'below' || direction === 'within' || direction === 'upto' || direction === 'max') {
    return [0, value];
  }
  const preset = RENTAL_BUDGET_PRESETS.find((p) => value >= p.range[0] && value <= p.range[1]);
  return preset ? (preset.range as [number, number]) : [0, value];
}

function parseArea(q: string): number | null {
  const m = q.match(/(\d{3,})\s*(?:sq\.?\s?ft|sqft|square\s*feet)/i);
  return m ? parseInt(m[1], 10) : null;
}

type AreaFields = { area_sqft?: unknown; area_acres?: unknown; area_guntas?: unknown };

/** Area in sq.ft from sqft or acres/guntas fields (0 when unknown). */
export function getPropertyAreaSqft(p: PropertyFilterInput): number {
  const areaFields = p as unknown as AreaFields;
  const sqft = Number(areaFields.area_sqft);
  if (sqft > 0) return sqft;
  const acres = Number(areaFields.area_acres) || 0;
  const guntas = Number(areaFields.area_guntas) || 0;
  if (acres || guntas) return (acres + guntas / 40) * 43560;
  return 0;
}

export function matchesMinArea(p: PropertyFilterInput, minArea: number | null): boolean {
  if (!minArea) return true;
  const area = getPropertyAreaSqft(p);
  return area === 0 || area >= minArea;
}

export function rentalRangeLabel(range: [number, number]): string {
  const [min, max] = range;
  if (min === 0) return `Rent under ₹${Math.round(max / 1000)}K`;
  if (max >= UNLIMITED_FILTER_MAX) return `Rent above ₹${Math.round(min / 1000)}K`;
  return `Rent ₹${Math.round(min / 1000)}K – ₹${Math.round(max / 1000)}K`;
}

export function priceRangeLabel(range: [number, number]): string {
  const [min, max] = range;
  const preset = PRICE_BUDGET_PRESETS.find((p) => p.range[0] === min && p.range[1] === max);
  if (preset) return preset.label;
  if (min === 0) return `Under ${formatPrice(max)}`;
  if (max >= UNLIMITED_FILTER_MAX) return `Above ${formatPrice(min)}`;
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

export function parseSmartQuery(
  query: string,
  properties: PropertyFilterInput[],
): SmartSearchResult {
  const q = query.trim();
  if (!q) {
    return {
      localities: [], types: [], priceRange: null, rentalRange: null, minAreaSqft: null,
      matchCount: 0, confidence: 'low', chips: [], label: '', showSmartBlock: false,
    };
  }

  const localities = detectLocalities(q);
  const types = detectTypes(q);
  const priceRange = parsePrice(q);
  const rentalRange = parseRental(q);
  const minAreaSqft = parseArea(q);

  const matched = filterProperties(properties, {
    types,
    localities,
    priceRange: priceRange ?? undefined,
    rentalRange: rentalRange ?? undefined,
  });
  const matchCount = minAreaSqft
    ? matched.filter((p) => matchesMinArea(p, minAreaSqft)).length
    : matched.length;

  const chips: string[] = [];
  if (localities.length) chips.push(localities.join(', '));
  if (types.length) chips.push(types.join(' + '));
  if (priceRange) chips.push(priceRangeLabel(priceRange));
  if (rentalRange) chips.push(rentalRangeLabel(rentalRange));
  if (minAreaSqft) chips.push(`${minAreaSqft.toLocaleString('en-IN')}+ sq.ft`);

  const kinds =
    (localities.length > 0 ? 1 : 0) +
    (types.length > 0 ? 1 : 0) +
    (priceRange ? 1 : 0) +
    (rentalRange ? 1 : 0) +
    (minAreaSqft ? 1 : 0);

  // Words left after removing the matched localities — tells us the query
  // is richer than a bare locality name.
  let leftover = q;
  localities.forEach((loc) => {
    leftover = leftover.replace(new RegExp(escapeRegex(loc), 'ig'), ' ');
  });
  leftover = leftover.replace(/[^a-z0-9]/gi, ' ');
  const hasExtras = leftover.trim().split(/\s+/).some((w) => w.length >= 2);

  const showSmartBlock =
    kinds >= 2 ||
    types.length > 0 ||
    priceRange != null ||
    rentalRange != null ||
    minAreaSqft != null ||
    (localities.length > 0 && hasExtras);

  const confidence: SmartSearchResult['confidence'] =
    kinds >= 2 ? 'high' : kinds === 1 ? 'medium' : 'low';

  return {
    localities, types, priceRange, rentalRange, minAreaSqft,
    matchCount, confidence, chips, label: chips.join(' · '), showSmartBlock,
  };
}
