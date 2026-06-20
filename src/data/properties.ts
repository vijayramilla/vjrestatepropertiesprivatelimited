export interface Property {
  id: string;
  name: string;
  title: string;
  type: "PG Building" | "Residential Rental Income" | "Commercial Properties" | "Residential Plot" | "Commercial Plot";
  location: string;
  area: string;
  price: number;
  monthlyRentalIncome: number;
  monthly_rental: string | null;
  rental_yield: number | null;
  annual_income: string | null;
  plotSizeSqFt: number;
  builtUpAreaSqFt: number;
  area_sqft: number;
  floors: number;
  tenants: number;
  occupancyPercent: number;
  bbmpApproved: boolean;
  description: string;
  featured: boolean;
  createdAt: string;
  commercial_subtype?: string;
  plot_subtype?: "Residential Plot" | "Commercial Plot" | "Agriculture Land";
  age: string;
  facing: string;
  floor_count: number;
  available_units: number;
  total_units: number;
  occupancy_percent: number;
  amenities: string[];
  highlights: string[];
  listed_days_ago: number;
  dimensions: string;
  extraDetails?: Record<string, string | number>;
  images?: string[];
  katha?: string;
}

/** Bangalore localities A–Z — used for search autocomplete & filters */
export const BANGALORE_AREAS = [
  'Adyar',
  'Agara',
  'Airport Road',
  'Anekal',
  'Arekere',
  'Ashok Nagar',
  'Attibele',
  'Austin Town',
  'Bagalur',
  'Banashankari',
  'Banaswadi',
  'Bannerghatta',
  'Bannerghatta Road',
  'Basavanagudi',
  'Basaveshwara Nagar',
  'Begur',
  'Bellandur',
  'BEML Layout',
  'Benson Town',
  'Bidadi',
  'Bilekahalli',
  'Bommanahalli',
  'Brigade Road',
  'Brookefield',
  'BTM Layout',
  'Byatarayanapura',
  'Cambridge Layout',
  'Chamrajpet',
  'Channasandra',
  'Chikkabanavara',
  'Chikkajala',
  'Cox Town',
  'Cunningham Road',
  'Dasarahalli',
  'Deepanjali Nagar',
  'Devanahalli',
  'Doddakannelli',
  'Domlur',
  'Ejipura',
  'Electronic City',
  'Electronic City Phase 1',
  'Electronic City Phase 2',
  'Frazer Town',
  'Goraguntepalya',
  'Gottigere',
  'Gunjur',
  'HAL',
  'Halasuru',
  'Haralur',
  'HBR Layout',
  'Hebbal',
  'Hegde Nagar',
  'Hennur',
  'Hennur Road',
  'Hoodi',
  'Horamavu',
  'Hosa Road',
  'Hosahalli',
  'Hoskote',
  'Hosur Road',
  'HSR Layout',
  'Hulimavu',
  'Immadihalli',
  'Indiranagar',
  'ITPL',
  'Jakkur',
  'Jalahalli',
  'Jalahalli Cross',
  'Jayamahal',
  'Jayanagar',
  'Jeevan Bheema Nagar',
  'Jigani',
  'JP Nagar',
  'Judiciary Layout',
  'Kadugodi',
  'Kaggadasapura',
  'Kalena Agrahara',
  'Kammanahalli',
  'Kanaka Nagar',
  'Kanakapura Road',
  'Kasturi Nagar',
  'Kempapura',
  'Kengeri',
  'Kengeri Satellite Town',
  'Kodigehalli',
  'Kodihalli',
  'Kogilu',
  'Konanakunte',
  'Koramangala',
  'Kothanur',
  'KR Puram',
  'Kumaraswamy Layout',
  'Kundalahalli',
  'Lalbagh Road',
  'Langford Town',
  'Lavelle Road',
  'Magadi Road',
  'Mahadevapura',
  'Madivala',
  'Madiwala',
  'Malleshwaram',
  'Marathahalli',
  'Mathikere',
  'Millers Road',
  'Mysore Road',
  'Nagarbhavi',
  'Nagavara',
  'Nayanda Halli',
  'Nelamangala',
  'Netaji Nagar',
  'New Thippasandra',
  'NRI Layout',
  'Old Airport Road',
  'Old Madras Road',
  'Outer Ring Road',
  'Padmanabhanagar',
  'Panathur',
  'Peenya',
  'Race Course Road',
  'Rajajinagar',
  'Ramamurthy Nagar',
  'Rayasandra',
  'Richmond Town',
  'RT Nagar',
  'Sadahalli',
  'Sahakara Nagar',
  'Sanjay Nagar',
  'Sarjapur',
  'Sarjapur Road',
  'Seshadripuram',
  'Shivajinagar',
  'Singasandra',
  'Sompura',
  'Thanisandra',
  'Thippasandra',
  'Tumkur Road',
  'Ulsoor',
  'Uttarahalli',
  'Varthur',
  'Vasanth Nagar',
  'Vidyaranyapura',
  'Vijayanagar',
  'Vishweshwaraiah Layout',
  'Whitefield',
  'Wilson Garden',
  'Yelahanka',
  'Yelahanka New Town',
  'Yeshwanthpur',
] as const;

/** Max localities a user can select in search (properties page & home hero). */
export const MAX_LOCALITY_SELECTIONS = 4;

/** Max used for "Any budget" presets — no upper cap on listings. */
export const UNLIMITED_FILTER_MAX = Number.MAX_SAFE_INTEGER;

export const PRICE_BUDGET_PRESETS: { label: string; range: [number, number] }[] = [
  { label: 'Under ₹50L', range: [0, 5_000_000] },
  { label: '₹50L – ₹1Cr', range: [5_000_000, 10_000_000] },
  { label: '₹1Cr – ₹2Cr', range: [10_000_000, 20_000_000] },
  { label: '₹2Cr – ₹5Cr', range: [20_000_000, 50_000_000] },
  { label: 'Above ₹5Cr', range: [50_000_000, 100_000_000] },
];

export const RENTAL_BUDGET_PRESETS: { label: string; range: [number, number] }[] = [
  { label: 'Under ₹50K', range: [0, 50_000] },
  { label: '₹50K – ₹1L', range: [50_000, 100_000] },
  { label: '₹1L – ₹2L', range: [100_000, 200_000] },
  { label: '₹2L – ₹5L', range: [200_000, 500_000] },
  { label: 'Any Rental', range: [0, UNLIMITED_FILTER_MAX] },
];

/** Match localities by name, word-start, or compact spelling (e.g. "hsr" → HSR Layout) */
export function filterLocalities(query: string, limit = 20): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const compactQ = q.replace(/[\s./-]+/g, '');

  const scored = BANGALORE_AREAS.map((area) => {
    const lower = area.toLowerCase();
    const compact = lower.replace(/[\s./-]+/g, '');
    const words = lower.split(/[\s,/-]+/).filter(Boolean);
    let score = 0;

    if (lower === q) score = 100;
    else if (lower.startsWith(q)) score = 95;
    else if (words.some((w) => w.startsWith(q))) score = 85;
    else if (compact.startsWith(compactQ)) score = 80;
    else if (compact.includes(compactQ)) score = 70;
    else if (lower.includes(q)) score = 60;

    return { area, score };
  })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.area.localeCompare(b.area));

  return scored.slice(0, limit).map(({ area }) => area);
}

export function resolveLocalityName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if ((BANGALORE_AREAS as readonly string[]).includes(trimmed)) return trimmed;
  const matches = filterLocalities(trimmed, 1);
  return matches[0] ?? null;
}

export const PROPERTY_TYPES = [
  "PG Building", "Residential Rental Income", "Commercial Properties", "Residential Plot", "Commercial Plot",
];

/** Live listings come from Firestore — no mock cards. */
const rawProperties: Omit<
  Property,
  "title" | "monthly_rental" | "rental_yield" | "annual_income" | "area_sqft"
>[] = [];

export function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)}L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export function formatMonthlyIncome(income: number): string {
  if (income <= 0) return "—";
  if (income >= 100000) return `₹${(income / 100000).toFixed(1)}L`;
  return `₹${income.toLocaleString("en-IN")}`;
}

export function formatMonthlyIncomeFull(income: number): string {
  if (income <= 0) return "—";
  return `₹${income.toLocaleString("en-IN")}`;
}

export function getRentalYield(price: number, monthlyIncome: number): number | null {
  if (price <= 0 || monthlyIncome <= 0) return null;
  return Math.round(((monthlyIncome * 12) / price) * 1000) / 10;
}

export function getPropertyById(): Property | undefined {
  return undefined;
}

export function isPlotProperty(type: Property["type"]): boolean {
  return type === "Residential Plot" || type === "Commercial Plot";
}

/** Plots, agriculture land, and land listings — no monthly rental display. */
export function isLandOrPlotType(type: string): boolean {
  if (type === "Residential Plot" || type === "Commercial Plot") return true;
  const t = type.toLowerCase();
  return t.includes("plot") || t.includes("agriculture") || t.includes("land");
}

export function isLandOrPlotProperty(
  property: Pick<Property, "type" | "plot_subtype">,
): boolean {
  if (property.plot_subtype === "Agriculture Land") return true;
  return isPlotProperty(property.type);
}

export function showsRentalIncome(
  property: Pick<Property, "type" | "plot_subtype">,
): boolean {
  return !isLandOrPlotProperty(property);
}

export function isCommercialProperty(type: Property["type"]): boolean {
  return type === "Commercial Properties";
}

export function getDisplayCategory(type: Property["type"]): string {
  if (type === "PG Building") return "PG Building";
  if (type === "Residential Rental Income") return "Residential Rental Income";
  if (type === "Commercial Properties") return "Commercial";
  return "Plot";
}

export function getPlotSubtype(property: Property): string | undefined {
  if (property.plot_subtype) return property.plot_subtype;
  if (property.type === "Residential Plot") return "Residential Plot";
  if (property.type === "Commercial Plot") return "Commercial Plot";
  return undefined;
}

function enrichProperty(
  p: Omit<Property, "title" | "monthly_rental" | "rental_yield" | "annual_income" | "area_sqft">
): Property {
  const isPlot = isLandOrPlotProperty(p);
  const area_sqft = isPlot ? p.plotSizeSqFt : p.builtUpAreaSqFt;
  const rental_yield = isPlot ? null : getRentalYield(p.price, p.monthlyRentalIncome);
  const monthly_rental = isPlot
    ? null
    : p.monthlyRentalIncome > 0
      ? formatMonthlyIncomeFull(p.monthlyRentalIncome)
      : null;
  const annual_income = isPlot
    ? null
    : p.monthlyRentalIncome > 0
      ? formatMonthlyIncomeFull(p.monthlyRentalIncome * 12)
      : null;

  return {
    ...p,
    title: p.name,
    area_sqft,
    monthly_rental,
    rental_yield,
    annual_income,
  };
}

export const properties: Property[] = rawProperties.map(enrichProperty);
