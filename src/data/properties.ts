export interface Property {
  id: string;
  propertyCode?: string;
  name: string;
  title: string;
  type: "PG Building" | "Residential Rental Income" | "Commercial Properties" | "Residential Plot" | "Commercial Plot" | "JD Land";
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
  area_unit?: string;
  area_acres?: number;
  area_guntas?: number;
  price_per_sqft?: number;
  floors: number;
  tenants: number;
  occupancyPercent: number;
  bbmpApproved: boolean;
  description: string;
  featured: boolean;
  createdAt: string;
  commercial_subtype?: string;
  plot_subtype?: "Residential Plot" | "Commercial Plot" | "JD Land";
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
  contact_name?: string;
  contact_phone?: string;
  listed_by?: string;
}

/** Bangalore localities A–Z — used for search autocomplete & filters */
export const BANGALORE_AREAS = [
  // ── Central Bangalore ──
  'Ashok Nagar',
  'Austin Town',
  'Brigade Road',
  'Cambridge Layout',
  'Cantonment',
  'Chamrajpet',
  'Cox Town',
  'Cunningham Road',
  'Domlur',
  'Frazer Town',
  'Halasuru',
  'Indiranagar',
  'Jeevan Bheema Nagar',
  'Jayamahal',
  'Lalbagh Road',
  'Langford Town',
  'Lavelle Road',
  'MG Road',
  'Malleshwaram',
  'Murphy Town',
  'Richmond Town',
  'Race Course Road',
  'RT Nagar',
  'Sadashivanagar',
  'Seshadripuram',
  'Shivajinagar',
  'Ulsoor',
  'Vasanth Nagar',
  'Wilson Garden',
  // ── East Bangalore ──
  'Bellandur',
  'Brookefield',
  'CV Raman Nagar',
  'Devarabisanahalli',
  'Ejipura',
  'HAL',
  'Hoodi',
  'ITPL',
  'Kadugodi',
  'Kaggadasapura',
  'Kannamangala',
  'Kasturi Nagar',
  'Kodihalli',
  'Kondapur',
  'KR Puram',
  'Kundalahalli',
  'Mahadevapura',
  'Marathahalli',
  'Munnekollal',
  'Nagavara',
  'Nagawara',
  'Old Airport Road',
  'Old Madras Road',
  'Outer Ring Road',
  'Panathur',
  'TC Palaya',
  'Thubarahalli',
  'Varthur',
  'Whitefield',
  // ── South-East Bangalore ──
  'Agara',
  'Agara Lake',
  'Ambalipura',
  'Bommanahalli',
  'BTM Layout 1st Stage',
  'BTM Layout 2nd Stage',
  'BTM Layout 3rd Stage',
  'BTM Layout',
  'Garudachar Palya',
  'Harlur',
  'Hosa Road',
  'HSR Layout 1st Sector',
  'HSR Layout 2nd Sector',
  'HSR Layout 3rd Sector',
  'HSR Layout 4th Sector',
  'HSR Layout 5th Sector',
  'HSR Layout 6th Sector',
  'HSR Layout 7th Sector',
  'HSR Layout',
  'Immadihalli',
  'Jogupalya',
  'Koramangala 1st Block',
  'Koramangala 2nd Block',
  'Koramangala 3rd Block',
  'Koramangala 4th Block',
  'Koramangala 5th Block',
  'Koramangala 6th Block',
  'Koramangala 7th Block',
  'Koramangala 8th Block',
  'Koramangala',
  'Kudlu',
  'Kudlu Gate',
  'Madivala',
  'Madiwala',
  'Sarjapur Road',
  'Sarjapur',
  'Silk Board',
  // ── South Bangalore ──
  'Adugodi',
  'Adyar',
  'Arekere',
  'Banaswadi',
  'Banashankari 1st Stage',
  'Banashankari 2nd Stage',
  'Banashankari 3rd Stage',
  'Banashankari',
  'Basavanagudi',
  'Begur',
  'Begur Road',
  'Bilekahalli',
  'Chikkalasandra',
  'Doddakammanahalli',
  'Girinagar',
  'Gottigere',
  'Gubbalal',
  'Hulimavu',
  'JP Nagar 1st Phase',
  'JP Nagar 2nd Phase',
  'JP Nagar 3rd Phase',
  'JP Nagar 4th Phase',
  'JP Nagar 5th Phase',
  'JP Nagar 6th Phase',
  'JP Nagar 7th Phase',
  'JP Nagar 8th Phase',
  'JP Nagar 9th Phase',
  'JP Nagar',
  'Jayanagar 1st Block',
  'Jayanagar 2nd Block',
  'Jayanagar 3rd Block',
  'Jayanagar 4th Block',
  'Jayanagar 5th Block',
  'Jayanagar 6th Block',
  'Jayanagar 7th Block',
  'Jayanagar 8th Block',
  'Jayanagar 9th Block',
  'Jayanagar',
  'Jayadeva Hospital',
  'Konanakunte',
  'Kothanur',
  'Kumaraswamy Layout',
  'Padmanabhanagar',
  'Uttarahalli',
  'Vijaya Bank Layout',
  // ── South-East Corridor (Electronic City / Hosur Road) ──
  'Anekal',
  'Attibele',
  'Chandapura',
  'Electronic City Phase 1',
  'Electronic City Phase 2',
  'Electronic City',
  'Hosur Road',
  'Jigani',
  'Kasanehalli',
  'Kodathi',
  'Naganathapura',
  'Singasandra',
  'Thavarekere',
  // ── South-West Bangalore ──
  'Bapujinagar',
  'Bommasandra',
  'Chandapura',
  'Hosa Belandur',
  'Kambipura',
  'Kumbalgodu',
  'Kengeri',
  'Kengeri Satellite Town',
  'Nanjangud Road',
  'Rajankaunte',
  'Somanahalli',
  'Vijayanagar',
  // ── West Bangalore ──
  'Basaveshwara Nagar',
  'Chandra Layout',
  'Deepanjali Nagar',
  'Goraguntepalya',
  'Kamakshipalya',
  'Kangaroo Layout',
  'Magadi Road',
  'Mahalakshmi Layout',
  'Mallasandra',
  'Nagarbhavi',
  'Nayandahalli',
  'RPC Layout',
  'Vijayanagar',
  // ── North-West Bangalore ──
  'Chord Road',
  'Dasarahalli',
  'Jalahalli',
  'Jalahalli East',
  'Jalahalli West',
  'Mathikere',
  'Peenya',
  'Yeshwanthpur',
  // ── North Bangalore ──
  'Amruthahalli',
  'Bagalur',
  'Byatarayanapura',
  'Chikkajala',
  'Dasanapura',
  'Devanahalli',
  'Geddalahalli',
  'Hebbal',
  'Hegde Nagar',
  'Jakkur',
  'Kogilu',
  'Kodigehalli',
  'Kempapura',
  'Rajankunte',
  'Sahakara Nagar',
  'Sanjay Nagar',
  'Thanisandra',
  'Vidyaranyapura',
  'Yelahanka 1st Stage',
  'Yelahanka 2nd Stage',
  'Yelahanka 3rd Stage',
  'Yelahanka New Town',
  'Yelahanka',
  // ── North-East Bangalore ──
  'Banaswadi',
  'HBR Layout 1st Stage',
  'HBR Layout 2nd Stage',
  'HBR Layout 3rd Stage',
  'HBR Layout',
  'Horamavu',
  'Horamavu Agara',
  'Horamavu Banaswadi',
  'Kammanahalli',
  'Kalyan Nagar',
  'Lingarajapuram',
  'Ramamurthy Nagar',
  // ── Roads & Corridors ──
  'Airport Road',
  'Bannerghatta Road',
  'Bellary Road',
  'Hennur Road',
  'Kanakapura Road',
  'Mysore Road',
  'NICE Road',
  'Tumkur Road',
  // ── Peripheral / Emerging ──
  'Bidadi',
  'Channasandra',
  'Chikkabanavara',
  'Doddaballapura',
  'Hesaraghatta',
  'Hoskote',
  'Kalena Agrahara',
  'Kaval Byrasandra',
  'Nelamangala',
  'NRI Layout',
  'Rayasandra',
  'Sadahalli',
  'Sompura',
  // ── Misc / Landmarks used as localities ──
  'BEML Layout',
  'Benson Town',
  'Bommasandra',
  'Judiciary Layout',
  'New Thippasandra',
  'Thippasandra',
  'Immadihalli',
  'Gunjur',
  'Doddakannelli',
  'Panathur',
  'Begur',
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

  const matches = scored.slice(0, limit).map(({ area }) => area);
  if (matches.length === 0) return [query.trim()];
  return matches;
}

export function resolveLocalityName(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if ((BANGALORE_AREAS as readonly string[]).includes(trimmed)) return trimmed;
  const matches = filterLocalities(trimmed, 1);
  return matches[0] ?? null;
}

export const PROPERTY_TYPES = [
  'PG Buildings',
  'Residential Rental Income',
  'Commercial Properties',
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
  return type === "Residential Plot" || type === "Commercial Plot" || type === "JD Land";
}

/** Plots, agriculture land, and land listings — no monthly rental display. */
export function isLandOrPlotType(type: string): boolean {
  if (type === "Residential Plot" || type === "Commercial Plot" || type === "JD Land") return true;
  const t = type.toLowerCase();
  return t.includes("plot") || t.includes("land");
}

export function isLandOrPlotProperty(
  property: Pick<Property, "type" | "plot_subtype">,
): boolean {
  return isPlotProperty(property.type) || (!!property.plot_subtype && isPlotProperty(property.plot_subtype));
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
  if (type === "JD Land") return "JD Land";
  return "Plot";
}

export function getPlotSubtype(property: Property): string | undefined {
  if (property.plot_subtype) return property.plot_subtype;
  if (property.type === "Residential Plot") return "Residential Plot";
  if (property.type === "Commercial Plot") return "Commercial Plot";
  if (property.type === "JD Land") return "JD Land";
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
