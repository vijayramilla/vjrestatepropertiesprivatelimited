import { collection, getDocs, getDoc, doc, limit, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { mapFirestoreToProperty, type FirestorePropertyDoc } from '@/lib/firestoreProperties';
import { formatINR } from '@/lib/formatPrice';

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH LAYER
// The AI system NEVER touches Firebase directly. Every read goes through these
// controlled functions so we can shape, filter, and redact data consistently.
// ─────────────────────────────────────────────────────────────────────────────

export interface AiProperty {
  id: string;
  title: string;
  type: string;
  location: string;
  area: string;
  price: number;
  monthlyRental: number;
  areaSqft: number;
  areaAcres: number | null;
  areaGuntas: number | null;
  pricePerSqft: number;
  katha: string;
  facing: string;
  status: string;
  images: string[];
  highlights: string[];
  description: string;
  featured: boolean;
  createdAt?: Date;
}

export interface PropertySearchParams {
  types?: string[];
  localities?: string[];
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  katha?: string;
  facing?: string;
  status?: string;
  limitCount?: number;
}

// Simple TTL cache so repeated chat turns don't re-fetch the whole collection.
const PROPERTIES_CACHE_TTL_MS = 60_000;
let propertiesCache: { at: number; data: AiProperty[] } | null = null;

function normalizeType(type: string): string {
  const map: Record<string, string> = {
    'PG Building': 'PG Building',
    'PG Buildings': 'PG Building',
    'Residential Rental Income': 'Residential Rental',
    'Commercial Properties': 'Commercial',
    'Residential Plot': 'Residential Plot',
    'PG Plot': 'Residential Plot',
    'Commercial Plot': 'Commercial Plot',
    'JD Land': 'JD Land',
  };
  return map[type] ?? type;
}

function toAiProperty(id: string, raw: FirestorePropertyDoc): AiProperty {
  const p = mapFirestoreToProperty(id, raw);
  const areaSqft = p.area_sqft || p.plotSizeSqFt || p.builtUpAreaSqFt || 0;
  return {
    id,
    title: p.title || `${p.type} for Sale`,
    type: normalizeType(p.type),
    location: p.location || p.area || '',
    area: p.area || p.location || '',
    price: p.price || 0,
    monthlyRental: p.monthlyRentalIncome || 0,
    areaSqft,
    areaAcres: p.area_acres ?? null,
    areaGuntas: p.area_guntas ?? null,
    pricePerSqft: p.price_per_sqft || (areaSqft ? Math.round(p.price / areaSqft) : 0),
    katha: p.katha && p.katha !== '—' ? p.katha : '',
    facing: p.facing && p.facing !== '—' ? p.facing : '',
    status: (raw.status as string) ?? '',
    images: p.images ?? [],
    highlights: p.highlights ?? [],
    description: p.description ?? '',
    featured: p.featured ?? false,
    createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
  };
}

/** Fetch the property catalog (capped + cached). */
export async function getAllProperties(cap = 300): Promise<AiProperty[]> {
  const now = Date.now();
  if (propertiesCache && now - propertiesCache.at < PROPERTIES_CACHE_TTL_MS) {
    return propertiesCache.data.slice(0, cap);
  }
  const snap = await getDocs(query(collection(db, 'properties'), limit(cap)));
  const data = snap.docs.map((d) => toAiProperty(d.id, d.data() as FirestorePropertyDoc));
  propertiesCache = { at: now, data };
  return data;
}

export function invalidatePropertiesCache(): void {
  propertiesCache = null;
}

/** Fetch a single property by id. */
export async function getProperty(id: string): Promise<AiProperty | null> {
  const snap = await getDoc(doc(db, 'properties', id));
  if (!snap.exists()) return null;
  return toAiProperty(snap.id, snap.data() as FirestorePropertyDoc);
}

/**
 * In-memory filtered search. The catalog is small enough (a few hundred
 * listings) that filtering client-side avoids Firestore composite-index
 * requirements entirely.
 */
export async function searchProperties(params: PropertySearchParams = {}): Promise<AiProperty[]> {
  const all = await getAllProperties(300);
  const q = params.localities?.map((l) => l.toLowerCase()) ?? [];

  const filtered = all.filter((p) => {
    if (params.types && params.types.length > 0 && !params.types.includes(p.type)) return false;

    if (params.localities && params.localities.length > 0) {
      const area = (p.area || '').toLowerCase();
      const location = (p.location || '').toLowerCase();
      if (!q.some((loc) => area.includes(loc) || location.includes(loc))) return false;
    }

    if (params.minPrice != null && p.price < params.minPrice) return false;
    if (params.maxPrice != null && p.price > params.maxPrice) return false;
    if (params.minArea != null && p.areaSqft < params.minArea) return false;
    if (params.maxArea != null && p.areaSqft > params.maxArea) return false;
    if (params.katha && !p.katha.toLowerCase().includes(params.katha.toLowerCase())) return false;
    if (params.facing && !p.facing.toLowerCase().includes(params.facing.toLowerCase())) return false;
    if (params.status && p.status.toLowerCase() !== params.status.toLowerCase()) return false;
    return true;
  });

  return filtered.slice(0, params.limitCount ?? 20);
}

// ─── AUCTIONS ────────────────────────────────────────────────────────────────

export interface AiAuction {
  id: string;
  title: string;
  category: string;
  location: string;
  city: string;
  startingBid: number;
  currentBid: number;
  bidIncrement: number;
  totalBids: number;
  status: string;
  areaSqft: number;
  images: string[];
  auctionEndTime?: Date;
}

export async function getAuctions(): Promise<AiAuction[]> {
  const snap = await getDocs(query(collection(db, 'auctions'), orderBy('auctionEndTime', 'asc'), limit(50)));
  return snap.docs.map((d) => {
    const raw = d.data() as Record<string, unknown>;
    const end = raw.auctionEndTime as { toDate?: () => Date } | Date | undefined;
    return {
      id: d.id,
      title: (raw.title as string) ?? 'Auction',
      category: (raw.category as string) ?? '',
      location: (raw.location as string) ?? '',
      city: (raw.city as string) ?? 'Bangalore',
      startingBid: (raw.startingBid as number) ?? 0,
      currentBid: (raw.currentBid as number) ?? (raw.startingBid as number) ?? 0,
      bidIncrement: (raw.bidIncrement as number) ?? 100000,
      totalBids: (raw.totalBids as number) ?? 0,
      status: (raw.status as string) ?? 'upcoming',
      areaSqft: (raw.areaSqft as number) ?? 0,
      images: (raw.images as string[]) ?? [],
      auctionEndTime: end && typeof end === 'object' && 'toDate' in end && end.toDate ? end.toDate() : end instanceof Date ? end : undefined,
    };
  });
}

// ─── REQUIREMENTS ────────────────────────────────────────────────────────────

export interface AiRequirement {
  id: string;
  reqId: string;
  propertyType: string;
  locations: string[];
  budgetMin: number;
  budgetMax: number;
  purpose: string;
  timeline: string;
  status: string;
}

export async function getOpenRequirements(): Promise<AiRequirement[]> {
  const snap = await getDocs(query(collection(db, 'requirements'), limit(50)));
  return snap.docs
    .map((d) => {
      const r = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        reqId: (r.reqId as string) ?? d.id,
        propertyType: (r.propertyType as string) ?? '',
        locations: (r.locations as string[]) ?? [],
        budgetMin: (r.budgetMin as number) ?? 0,
        budgetMax: (r.budgetMax as number) ?? 0,
        purpose: (r.purpose as string) ?? '',
        timeline: (r.timeline as string) ?? '',
        status: (r.status as string) ?? 'open',
      };
    })
    .filter((r) => r.status === 'open');
}

// ─── BUSINESS CALCULATION TOOLS ──────────────────────────────────────────────

export function calculateRentalYield(price: number, monthlyIncome: number): {
  annualYield: number;
  monthlyYield: number;
  grade: string;
  analysis: string;
} {
  if (!price || !monthlyIncome) {
    return { annualYield: 0, monthlyYield: 0, grade: 'N/A', analysis: 'Rental income data not available for this property.' };
  }
  const annualIncome = monthlyIncome * 12;
  const annualYield = (annualIncome / price) * 100;
  const monthlyYield = annualYield / 12;

  let grade = '';
  let analysis = '';
  if (annualYield >= 8) {
    grade = 'EXCELLENT';
    analysis = 'Outstanding rental yield. Top tier for Bangalore.';
  } else if (annualYield >= 6) {
    grade = 'VERY GOOD';
    analysis = 'Above average yield. Strong investment.';
  } else if (annualYield >= 4) {
    grade = 'GOOD';
    analysis = 'Average Bangalore yield. Stable investment.';
  } else if (annualYield >= 2) {
    grade = 'BELOW AVERAGE';
    analysis = 'Below Bangalore average. Consider negotiating the price.';
  } else {
    grade = 'POOR';
    analysis = 'Very low yield. Not recommended as a rental investment.';
  }

  return { annualYield, monthlyYield, grade, analysis };
}

export function calculatePricePerSqft(price: number, areaSqft: number): number {
  if (!areaSqft || areaSqft === 0) return 0;
  return Math.round(price / areaSqft);
}

export function calculateEMI(
  principal: number,
  annualRate = 8.5,
  tenureYears = 20,
): { monthlyEMI: number; totalPayment: number; totalInterest: number } {
  if (!principal || principal <= 0) return { monthlyEMI: 0, totalPayment: 0, totalInterest: 0 };
  const monthlyRate = annualRate / 100 / 12;
  const months = tenureYears * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return {
    monthlyEMI: Math.round(emi),
    totalPayment: Math.round(emi * months),
    totalInterest: Math.round(emi * months - principal),
  };
}

export function compareProperties(properties: AiProperty[]) {
  return properties.map((p) => ({
    id: p.id,
    title: p.title,
    locality: p.location || p.area,
    price: p.price,
    priceFormatted: formatINR(p.price),
    pricePerSqft: p.pricePerSqft,
    areaSqft: p.areaSqft,
    landAcres: p.areaAcres ? (p.areaAcres + (p.areaGuntas ?? 0) / 40).toFixed(2) : null,
    monthlyRental: p.monthlyRental,
    rentalYield: p.monthlyRental ? calculateRentalYield(p.price, p.monthlyRental) : null,
    katha: p.katha,
    facing: p.facing,
    status: p.status,
    type: p.type,
  }));
}

export interface MarketAnalysis {
  avgPrice: number;
  avgPricePerSqft: number;
  priceRange: { min: number; max: number };
  totalListings: number;
  byType: Record<string, number>;
  byLocality: Record<string, number>;
  avgRentalYield: number;
  topLocalities: string[];
}

export function analyzeMarket(properties: AiProperty[]): MarketAnalysis {
  if (properties.length === 0) {
    return {
      avgPrice: 0, avgPricePerSqft: 0, priceRange: { min: 0, max: 0 },
      totalListings: 0, byType: {}, byLocality: {}, avgRentalYield: 0, topLocalities: [],
    };
  }

  const prices = properties.map((p) => p.price).filter((v) => v > 0);
  const ppsf = properties.map((p) => p.pricePerSqft).filter((v) => v > 0);
  const byType: Record<string, number> = {};
  const byLocality: Record<string, number> = {};

  properties.forEach((p) => {
    const type = p.type || 'Unknown';
    const loc = p.location || p.area || 'Unknown';
    byType[type] = (byType[type] ?? 0) + 1;
    byLocality[loc] = (byLocality[loc] ?? 0) + 1;
  });

  const yieldable = properties.filter((p) => p.price > 0 && p.monthlyRental > 0);
  const avgRentalYield =
    yieldable.length > 0
      ? yieldable.reduce((sum, p) => sum + calculateRentalYield(p.price, p.monthlyRental).annualYield, 0) / yieldable.length
      : 0;

  const topLocalities = Object.entries(byLocality)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([loc]) => loc);

  return {
    avgPrice: prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    avgPricePerSqft: ppsf.length ? Math.round(ppsf.reduce((a, b) => a + b, 0) / ppsf.length) : 0,
    priceRange: {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
    },
    totalListings: properties.length,
    byType,
    byLocality,
    avgRentalYield: Math.round(avgRentalYield * 100) / 100,
    topLocalities,
  };
}

export { formatINR };
