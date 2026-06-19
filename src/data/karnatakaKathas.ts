/**
 * Karnataka property Khata types — BBMP/GBA urban (e-Aasthi) and Gram Panchayat rural (e-Swathu).
 * Sources: BBMP e-Aasthi, Karnataka RDPR e-Swathu 2.0, Karnataka Panchayat Raj Rules 2006.
 */

export interface KarnatakaKathaOption {
  value: string;
  label: string;
  hint?: string;
}

export interface KarnatakaKathaGroup {
  id: string;
  label: string;
  description: string;
  options: KarnatakaKathaOption[];
}

/** Grouped Khata options for admin property form (Karnataka). */
export const KARNATAKA_KATHA_GROUPS: KarnatakaKathaGroup[] = [
  {
    id: 'urban',
    label: 'Urban — BBMP / GBA / ULB (e-Aasthi)',
    description:
      'Bengaluru (BBMP & GBA), Mysuru MCC, Mangaluru, Hubballi-Dharwad, and other city corporations. E-Khata is the mandatory digital format since 2024.',
    options: [
      {
        value: 'A Khata',
        label: 'A Khata',
        hint: 'Fully compliant — building plan, OC, loans, and trade licence eligible',
      },
      {
        value: 'B Khata',
        label: 'B Khata',
        hint: 'Secondary BBMP register — compliance gaps; regularisation possible',
      },
      {
        value: 'E-Khata (A Khata)',
        label: 'E-Khata (A Khata)',
        hint: 'Digital A Khata via BBMP/ULB e-Aasthi portal',
      },
      {
        value: 'E-Khata (B Khata)',
        label: 'E-Khata (B Khata)',
        hint: 'Digital B Khata — same compliance status as paper B Khata',
      },
      {
        value: 'Khata Certificate',
        label: 'Khata Certificate',
        hint: 'Official ownership certificate from BBMP/ULB revenue officer',
      },
      {
        value: 'Khata Extract (Khata Uthara)',
        label: 'Khata Extract (Khata Uthara)',
        hint: 'Detailed extract from municipal Khata register',
      },
    ],
  },
  {
    id: 'panchayat',
    label: 'Rural — Gram Panchayat (e-Swathu)',
    description:
      'Properties in Gram Panchayat limits outside BBMP/BDA/GBA — village sites, gramathana layouts, converted lands.',
    options: [
      {
        value: 'Panchayat Khata (Form 9 + Form 11)',
        label: 'Panchayat Khata (Form 9 + Form 11)',
        hint: 'Combined ownership + tax assessment — standard Panchayat record',
      },
      {
        value: 'Form 9 / Form 11 (9/11 Khata)',
        label: 'Form 9 / Form 11 (9/11 Khata)',
        hint: 'Form 9 = demand register; Form 11 = assessment register',
      },
      {
        value: 'Form 11A (e-Swathu)',
        label: 'Form 11A (e-Swathu)',
        hint: 'Digital tax assessment register on e-Swathu 2.0',
      },
      {
        value: 'Form 11B (e-Swathu)',
        label: 'Form 11B (e-Swathu)',
        hint: 'Digital sketch/measurement record on e-Swathu 2.0',
      },
      {
        value: 'Panchayat E-Khata',
        label: 'Panchayat E-Khata',
        hint: 'Digitally issued Panchayat Khata via e-Swathu portal',
      },
      {
        value: 'Manual Panchayat Khata',
        label: 'Manual Panchayat Khata',
        hint: 'Paper-based Panchayat record (pre-digitisation)',
      },
    ],
  },
  {
    id: 'bda',
    label: 'BDA / KHB / Layout Sites',
    description: 'Sites allotted by BDA, KHB, or approved layout authorities before municipal Khata transfer.',
    options: [
      {
        value: 'BDA Site — A Khata',
        label: 'BDA Site — A Khata',
        hint: 'BDA-approved layout with municipal A Khata transferred',
      },
      {
        value: 'BDA Site — Khata Pending',
        label: 'BDA Site — Khata Pending',
        hint: 'BDA possession/allotment done; ULB Khata transfer pending',
      },
      {
        value: 'KHB Site — Khata Pending',
        label: 'KHB Site — Khata Pending',
        hint: 'Karnataka Housing Board allotment — Khata not yet issued',
      },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue / Land Records',
    description: 'Agricultural land, RTC, and DC conversion status before non-agricultural Khata.',
    options: [
      {
        value: 'RTC (Record of Rights)',
        label: 'RTC (Record of Rights)',
        hint: 'Bhoomi land record — agricultural / revenue land',
      },
      {
        value: 'DC Conversion Done',
        label: 'DC Conversion Done',
        hint: 'Deputy Commissioner conversion to non-agricultural use completed',
      },
      {
        value: 'DC Conversion Pending',
        label: 'DC Conversion Pending',
        hint: 'Land conversion application pending — Khata not yet applicable',
      },
      {
        value: 'Mutation Done (Revenue)',
        label: 'Mutation Done (Revenue)',
        hint: 'Ownership updated in revenue/Bhoomi records',
      },
    ],
  },
  {
    id: 'status',
    label: 'Status / Not Applicable',
    description: 'Use when Khata is not yet obtained or not applicable to the listing.',
    options: [
      { value: 'Khata Pending', label: 'Khata Pending', hint: 'Application in progress' },
      { value: 'Under Process', label: 'Under Process', hint: 'Khata transfer or regularisation underway' },
      { value: 'Not Available', label: 'Not Available', hint: 'Khata document not available' },
      { value: 'Not Applicable', label: 'Not Applicable', hint: 'Khata not relevant for this asset type' },
    ],
  },
];

export const KARNATAKA_KATHA_CUSTOM_VALUE = 'Other (Specify)';

export const ALL_KARNATAKA_KATHA_VALUES: string[] = [
  ...KARNATAKA_KATHA_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
  KARNATAKA_KATHA_CUSTOM_VALUE,
];

export function findKathaOption(value: string): KarnatakaKathaOption | undefined {
  for (const group of KARNATAKA_KATHA_GROUPS) {
    const match = group.options.find((o) => o.value === value);
    if (match) return match;
  }
  return undefined;
}

export function getKathaSelectValue(stored: string | undefined): string {
  const trimmed = stored?.trim() ?? '';
  if (!trimmed || trimmed === '—') return '';
  if (ALL_KARNATAKA_KATHA_VALUES.includes(trimmed)) return trimmed;
  if (findKathaOption(trimmed)) return trimmed;
  return KARNATAKA_KATHA_CUSTOM_VALUE;
}

export function getKathaCustomText(stored: string | undefined): string {
  const trimmed = stored?.trim() ?? '';
  if (!trimmed || trimmed === '—') return '';
  if (getKathaSelectValue(trimmed) === KARNATAKA_KATHA_CUSTOM_VALUE) return trimmed;
  return '';
}

/** Suggested Khata group by property type in admin form. */
export function getSuggestedKathaGroupId(propertyType: string): string {
  if (propertyType === 'Agriculture Land') return 'revenue';
  if (propertyType === 'Residential Plot' || propertyType === 'Commercial Plot') return 'panchayat';
  return 'urban';
}

/** Official Karnataka portals for admin reference. */
export const KARNATAKA_KATHA_PORTALS = [
  { name: 'BBMP e-Aasthi (Bengaluru)', url: 'https://bbmpeaasthi.karnataka.gov.in' },
  { name: 'Karnataka e-Aasthi (ULBs)', url: 'https://eaasthi.karnataka.gov.in' },
  { name: 'e-Swathu 2.0 (Panchayat)', url: 'https://eswathu.karnataka.gov.in' },
  { name: 'Bhoomi RTC (Revenue)', url: 'https://landrecords.karnataka.gov.in' },
] as const;
