/**
 * Rental yield calculations — gross vs net yield, cash-flow breakdown and
 * Indian-market benchmark verdicts, with dedicated models per property type.
 *
 * Core formulas (industry standard across property portals):
 *   Gross yield %  = annual gross rent / property price x 100
 *   Net yield %    = (annual gross rent - annual expenses) / property price x 100
 *
 * Type-specific models:
 * - Residential: a single tenant (or family) pays one rent; owner bears
 *   maintenance, property tax and vacant weeks.
 * - PG Building: income is earned PER BED. Beds × per-bed rent × occupancy
 *   gives gross income; owner runs the operation (staff, utilities, food,
 *   internet, marketing), which typically consumes 35–50% of collections.
 * - Commercial: single corporate/retail tenant on a multi-year lease with
 *   5–15% escalation every 3 years; deposits of 6–12 months; CAM and most
 *   outgoings are billed to the tenant, so owner costs stay minimal.
 */

export type PropertyType = 'residential' | 'pg' | 'commercial';

export interface TypeMeta {
  label: string;
  tagline: string;
  /** Short hint shown under the type selector. */
  hint: string;
}

export const PROPERTY_TYPES: Record<PropertyType, TypeMeta> = {
  residential: {
    label: 'Residential',
    tagline: 'Flat, house or apartment block rented to a single tenant or family',
    hint: 'One rent, one tenant. Lower yield, simplest to run.',
  },
  pg: {
    label: 'PG Building',
    tagline: 'Paying-guest or co-living building earning rent per bed',
    hint: 'Rent per bed × occupancy. Higher yield, active operations.',
  },
  commercial: {
    label: 'Commercial',
    tagline: 'Office, retail or warehouse leased to a company on a long lease',
    hint: 'Corporate lease with escalation. Stable income, tenant pays outgoings.',
  },
};

export interface CommonExpenses {
  /** Annual property tax (₹/year). */
  propertyTax: number;
  /** Annual insurance / other fixed costs (₹/year). */
  insurance: number;
  /** Expected vacant weeks per year when the unit earns nothing. */
  vacancyWeeks: number;
}

export interface ResidentialExpenses extends CommonExpenses {
  /** Monthly society / building maintenance borne by owner (₹/month). */
  maintenance: number;
}

export interface PgExpenses {
  /** Total beds available in the building. */
  beds: number;
  /** Rent charged per bed per month (₹). */
  rentPerBed: number;
  /** Expected occupancy (%). */
  occupancy: number;
  /** Operating cost per occupied bed per month: staff, food, utilities, internet, marketing (₹). */
  opexPerBed: number;
  /** Annual property tax (₹/year). */
  propertyTax: number;
  /** Annual insurance / other fixed costs (₹/year). */
  insurance: number;
}

export interface CommercialExpenses {
  /** Monthly lease rent (₹/month). */
  monthlyRent: number;
  /** Annual rent escalation (% every escalationYears years). */
  escalation: number;
  /** Escalation frequency (years). */
  escalationYears: number;
  /** Security deposit held (months of rent). */
  depositMonths: number;
  /** Annual property tax borne by owner (₹/year) — often passed to tenant. */
  propertyTax: number;
  /** Annual owner-borne costs that CAM does not cover (₹/year). */
  otherCosts: number;
  /** Expected vacant weeks between tenants. */
  vacancyWeeks: number;
}

export interface YieldResult {
  propertyPrice: number;
  annualGrossRent: number;
  annualExpenses: number;
  annualNetRent: number;
  monthlyNetRent: number;
  grossYield: number;
  netYield: number;
  /** Months of rent needed to recover 1% of the property price. */
  monthsPerPercent: number;
  /** Simple payback: price / annual net income (years, Infinity when net is 0). */
  paybackYears: number;
  /** Rent earned per ₹1,000 invested, per month. */
  rentPerThousand: number;
}

export interface ResidentialResult extends YieldResult {
  monthlyRent: number;
}

export interface PgResult extends YieldResult {
  beds: number;
  rentPerBed: number;
  occupancy: number;
  occupiedBeds: number;
  /** Average collected rent per bed, per month, after opex. */
  netPerBed: number;
  /** Share of collections consumed by operations (%). */
  opexRatio: number;
}

export interface CommercialResult extends YieldResult {
  monthlyRent: number;
  /** Annualised growth of rent over a 9-year hold (%). */
  escalationCagr: number;
  /** Rent in year 9 after two escalation cycles (₹/month). */
  rentAtYear9: number;
  /** Cash held as deposit (₹) — returned, not earned, but improves safety. */
  depositHeld: number;
  /** Deposit as weeks of gross rent — how safe the income is if the tenant exits. */
  safetyWeeks: number;
}

// ─── Calculations ──────────────────────────────────────────────────────────

function baseResult(
  propertyPrice: number,
  annualGrossRent: number,
  annualExpenses: number,
): YieldResult {
  const annualNetRent = Math.max(0, annualGrossRent - annualExpenses);
  const grossYield = propertyPrice > 0 ? (annualGrossRent / propertyPrice) * 100 : 0;
  const netYield = propertyPrice > 0 ? (annualNetRent / propertyPrice) * 100 : 0;
  return {
    propertyPrice,
    annualGrossRent: Math.round(annualGrossRent),
    annualExpenses: Math.round(annualExpenses),
    annualNetRent: Math.round(annualNetRent),
    monthlyNetRent: Math.round(annualNetRent / 12),
    grossYield,
    netYield,
    monthsPerPercent: grossYield > 0 ? 100 / grossYield : Infinity,
    paybackYears: annualNetRent > 0 ? propertyPrice / annualNetRent : Infinity,
    rentPerThousand: propertyPrice > 0 ? ((annualGrossRent / 12) / propertyPrice) * 1000 : 0,
  };
}

export function calcResidentialYield(
  propertyPrice: number,
  monthlyRent: number,
  expenses: ResidentialExpenses,
): ResidentialResult {
  const annualGrossRent = monthlyRent * 12;
  const annualExpenses =
    expenses.maintenance * 12 +
    expenses.propertyTax +
    expenses.insurance;
  const effectiveRent = annualGrossRent * (1 - expenses.vacancyWeeks / 52);
  return {
    ...baseResult(propertyPrice, effectiveRent, annualExpenses),
    monthlyRent,
  };
}

export function calcPgYield(propertyPrice: number, e: PgExpenses): PgResult {
  const occupiedBeds = Math.round(e.beds * (e.occupancy / 100));
  const monthlyGross = occupiedBeds * e.rentPerBed;
  const monthlyOpex = occupiedBeds * e.opexPerBed + e.propertyTax / 12 + e.insurance / 12;
  const monthlyNet = Math.max(0, monthlyGross - monthlyOpex);

  const annualGrossRent = monthlyGross * 12;
  const annualExpenses = monthlyOpex * 12;

  return {
    ...baseResult(propertyPrice, annualGrossRent, annualExpenses),
    beds: e.beds,
    rentPerBed: e.rentPerBed,
    occupancy: e.occupancy,
    occupiedBeds,
    netPerBed: e.beds > 0 ? monthlyNet / e.beds : 0,
    opexRatio: annualGrossRent > 0 ? (annualExpenses / annualGrossRent) * 100 : 0,
  };
}

export function calcCommercialYield(
  propertyPrice: number,
  e: CommercialExpenses,
): CommercialResult {
  const annualGrossRent = e.monthlyRent * 12;
  const annualExpenses = e.propertyTax + e.otherCosts;
  const effectiveRent = annualGrossRent * (1 - e.vacancyWeeks / 52);

  // Year-9 rent after escalation cycles (3-yearly is the Indian norm).
  const cyclesIn9 = Math.floor(9 / Math.max(1, e.escalationYears));
  const rentAtYear9 = e.monthlyRent * Math.pow(1 + e.escalation / 100, cyclesIn9);
  const escalationCagr = (Math.pow(rentAtYear9 / e.monthlyRent, 1 / 9) - 1) * 100;

  const depositHeld = e.monthlyRent * e.depositMonths;
  const safetyWeeks = e.monthlyRent > 0 ? (depositHeld / e.monthlyRent) * 4.33 : 0;

  return {
    ...baseResult(propertyPrice, effectiveRent, annualExpenses),
    monthlyRent: e.monthlyRent,
    escalationCagr,
    rentAtYear9: Math.round(rentAtYear9),
    depositHeld: Math.round(depositHeld),
    safetyWeeks: Math.round(safetyWeeks),
  };
}

// ─── Indian benchmark verdicts ─────────────────────────────────────────────
// Anchored to published data: Bengaluru gross residential yield ~4.2–4.45%,
// commercial assets 6–9%, PG/co-living 6–10% (opex-heavy models land lower).

export type YieldVerdict = 'low' | 'fair' | 'good' | 'excellent' | 'exceptional';

export interface VerdictInfo {
  label: string;
  message: string;
  chipClass: string;
  color: string;
}

export function getVerdict(yieldPct: number, type: PropertyType): VerdictInfo {
  if (type === 'pg') {
    if (yieldPct < 4) {
      return {
        label: 'Weak For PG',
        message: 'Well-run PG buildings in Bengaluru earn 6–8% net. Under 4% suggests low occupancy or rents below the per-bed market.',
        chipClass: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        color: '#ef4444',
      };
    }
    if (yieldPct < 6) {
      return {
        label: 'Fair',
        message: 'Workable, but a full building at market per-bed rents should do better. Check occupancy assumptions and food/utility costs.',
        chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        color: '#f59e0b',
      };
    }
    if (yieldPct < 8) {
      return {
        label: 'Excellent',
        message: 'The sweet spot for professionally run PG assets — roughly double a typical residential yield.',
        chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        color: '#10b981',
      };
    }
    return {
      label: 'Exceptional',
      message: 'Top of the market. Verify the rent per bed and occupancy are real, sustained numbers before you commit.',
      chipClass: 'bg-[#C9A84C]/10 text-[#8a6d1f] ring-1 ring-[#C9A84C]/40',
      color: '#C9A84C',
    };
  }

  if (type === 'commercial') {
    if (yieldPct < 5) {
      return {
        label: 'Below Market',
        message: 'Pre-leased commercial assets in Bengaluru trade at 6–9%. Below 5% only makes sense with exceptional appreciation or a Blue-chip tenant.',
        chipClass: 'bg-red-50 text-red-700 ring-1 ring-red-200',
        color: '#ef4444',
      };
    }
    if (yieldPct < 6) {
      return {
        label: 'Fair',
        message: 'Approaching commercial norms. Check tenant quality and lease lock-in — they justify the lower entry yield.',
        chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        color: '#f59e0b',
      };
    }
    if (yieldPct < 9) {
      return {
        label: 'Excellent',
        message: ' squarely in the commercial sweet spot: 6–9% with a corporate tenant, escalation built in and outgoings passed through.',
        chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        color: '#10b981',
      };
    }
    return {
      label: 'Exceptional',
      message: 'Yields above 9% usually signal a weaker tenant, a short lease balance, or a catch-up rent. Diligence the lease carefully.',
      chipClass: 'bg-[#C9A84C]/10 text-[#8a6d1f] ring-1 ring-[#C9A84C]/40',
      color: '#C9A84C',
    };
  }

  // residential
  if (yieldPct < 2) {
    return {
      label: 'Below Market',
      message: 'Yield is under the typical Indian residential range. The price looks rich for this rent — negotiate or expect appreciation to do the heavy lifting.',
      chipClass: 'bg-red-50 text-red-700 ring-1 ring-red-200',
      color: '#ef4444',
    };
  }
  if (yieldPct < 3) {
    return {
      label: 'Fair',
      message: 'In the common band for Indian apartments, but the same capital in a PG or commercial asset would earn noticeably more.',
      chipClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
      color: '#f59e0b',
    };
  }
  if (yieldPct < 4.5) {
    return {
      label: 'Good',
      message: 'Matches or beats the Bengaluru metro average (~4.2%). A healthy residential yield with steady tenant demand.',
      chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      color: '#10b981',
    };
  }
  if (yieldPct < 7) {
    return {
      label: 'Excellent',
      message: 'Well above the metro residential average — this is commercial-grade income from your capital.',
      chipClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      color: '#059669',
    };
  }
  return {
    label: 'Exceptional',
    message: 'PG / co-living territory. If this is a plain apartment, double-check the rent figure is realistic and repeatable.',
    chipClass: 'bg-[#C9A84C]/10 text-[#8a6d1f] ring-1 ring-[#C9A84C]/40',
    color: '#C9A84C',
  };
}

/** Indian reference bands per property type, for the comparison bars. */
export const BENCHMARKS: Record<PropertyType, { label: string; range: [number, number]; value: number }[]> = {
  residential: [
    { label: 'Luxury apartments', range: [2, 3], value: 2.5 },
    { label: 'Residential (India avg)', range: [2, 4], value: 3.2 },
    { label: 'Bengaluru metro avg', range: [4.2, 4.45], value: 4.3 },
    { label: 'Strong rental micro-markets', range: [4.5, 5.5], value: 5 },
    { label: 'Commercial-grade residential', range: [5.5, 7], value: 6.2 },
  ],
  pg: [
    { label: 'Single flat let per room', range: [3, 4.5], value: 3.8 },
    { label: 'Self-run PG (light ops)', range: [5, 7], value: 6 },
    { label: 'Managed co-living', range: [6, 8], value: 7 },
    { label: 'Prime tech-park micro-market', range: [7, 9], value: 8 },
    { label: 'Over-optimistic (verify ops)', range: [9, 12], value: 10 },
  ],
  commercial: [
    { label: 'Long lease, blue-chip tenant', range: [5, 6.5], value: 5.8 },
    { label: 'Bengaluru office avg', range: [6, 8], value: 7 },
    { label: 'Retail / high-street', range: [7, 9], value: 8 },
    { label: 'Warehouse / industrial', range: [6.5, 8.5], value: 7.5 },
    { label: 'Distressed / short lease', range: [9, 12], value: 10 },
  ],
};

// ─── Indian number formatting (lakh / crore system) ────────────────────────

/** Compact: ₹1.25 Cr / ₹45 L / ₹80,000. */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹—';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${trimZeros(cr)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${trimZeros(l)} L`;
  }
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function trimZeros(v: number): string {
  const rounded = Math.round(v * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2);
}

/** Full Indian digit grouping: ₹1,25,00,000. */
export function formatINRFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

/** 2-decimal yield like 4.35% */
export function formatYield(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  return `${(Math.round(pct * 100) / 100).toFixed(2)}%`;
}

/** Human payback: "18 yrs 6 mo" */
export function formatPayback(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return '—';
  const totalMonths = Math.round(years * 12);
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  if (y === 0) return `${m} mo`;
  return m === 0 ? `${y} yrs` : `${y} yrs ${m} mo`;
}

/** Parse a raw digit string (user-typed) into a number. */
export function parseAmount(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}
