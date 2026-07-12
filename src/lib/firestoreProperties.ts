import type { ListingProperty } from '../data/listingProperties';
import type { Property } from '../data/properties';
import { siteContact } from '@/data/siteContact';
import { formatPrice, formatRental } from './formatPrice';

export interface FirestorePropertyDoc {
  title?: string;
  type?: string;
  commercial_subtype?: string;
  plot_subtype?: string;
  area?: string;
  location?: string;
  price?: number;
  price_label?: string;
  monthly_rental?: number;
  monthly_rental_label?: string;
  rental_yield?: number | null;
  area_sqft?: number;
  area_unit?: string;
  area_acres?: number;
  area_guntas?: number;
  price_per_sqft?: number;
  built_up_area_sqft?: number;
  dimensions?: string;
  floor_count?: number;
  total_units?: number;
  available_units?: number;
  occupancy_percent?: number;
  facing?: string;
  age?: string;
  status?: string;
  featured?: boolean;
  bbmp_approved?: boolean;
  bank_loan_eligible?: boolean;
  clear_title?: boolean;
  katha?: string;
  highlights?: string[];
  amenities?: string[];
  description?: string;
  listed_days_ago?: number;
  createdAt?: { toDate?: () => Date };
  extra_details?: Record<string, string | number>;
  images?: string[];
  listed_by?: string;
  contact_name?: string;
  contact_phone?: string;
}

const DISPLAY_TYPE_MAP: Record<string, string> = {
  'PG Building': 'PG Building',
  'PG Buildings': 'PG Building',
  'Residential Rental Income': 'Residential Rental',
  'Commercial Properties': 'Commercial',
  'Residential Plot': 'Residential Plot',
  'PG Plot': 'Residential Plot',
  'Commercial Plot': 'Commercial Plot',
  'JD Land': 'JD Land',
};

export function normalizePropertyType(type: string): string {
  return DISPLAY_TYPE_MAP[type] ?? type;
}

export function isFirestoreLandOrPlot(data: FirestorePropertyDoc): boolean {
  const type = data.type ?? '';
  if (type.includes('Plot') || type === 'JD Land') return true;
  const lower = type.toLowerCase();
  return lower.includes('plot') || lower.includes('land');
}

export function mapFirestoreToListing(id: string, data: FirestorePropertyDoc): ListingProperty {
  const isPlot = isFirestoreLandOrPlot(data);
  const createdAt = data.createdAt?.toDate?.();
  const listedDays = data.listed_days_ago ?? (createdAt
    ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 1);

  const statusRaw = data.status ?? 'Ready';
  const status: ListingProperty['status'] =
    statusRaw === 'New Launch' ? 'New Launch' : 'Ready to Move';

  return {
    id,
    title: data.title ?? 'Untitled Property',
    type: normalizePropertyType(data.type ?? ''),
    location: data.location ?? data.area ?? '',
    area: data.area ?? '',
    area_sqft: data.area_sqft ?? 0,
    area_unit: data.area_unit,
    area_acres: data.area_acres,
    area_guntas: data.area_guntas,
    price_per_sqft: data.price_per_sqft,
    price: data.price ?? 0,
    price_label: data.price_label ?? formatPrice(data.price),
    monthly_rental: isPlot ? '—' : (data.monthly_rental_label ?? formatRental(data.monthly_rental)),
    rental_yield: isPlot ? null : (data.rental_yield ?? null),
    status,
    units: data.total_units ?? 0,
    listed_days_ago: listedDays,
    tags: data.highlights?.slice(0, 3) ?? [],
    description: data.description ?? '',
    highlights: data.highlights ?? [],
    dimensions: data.dimensions ?? '—',
    facing: data.facing ?? '—',
    age: data.age ?? '—',
    parking: '—',
    contact_name: data.contact_name || 'VJR Estate',
    contact_phone: data.contact_phone || siteContact.phoneDisplay,
    posted_date: createdAt?.toISOString() ?? new Date().toISOString(),
    plot_subtype: data.plot_subtype,
    raw_type: data.type,
    commercial_subtype: data.commercial_subtype,
    images: data.images ?? [],
    katha: data.katha ?? '—',
    dc_conversion:
      data.extra_details?.['DC Conversion Done'] === 'Yes'
        ? 'Done'
        : data.extra_details?.['DC Conversion Done'] === 'No'
          ? 'Pending'
          : undefined,
    listed_by: data.listed_by,
  };
}

export function mapFirestoreToProperty(id: string, data: FirestorePropertyDoc): Property {
  const isPlot = isFirestoreLandOrPlot(data);
  const createdAt = data.createdAt?.toDate?.();
  const monthlyRentalNum = isPlot ? 0 : (data.monthly_rental ?? 0);
  const annualIncome = isPlot
    ? null
    : monthlyRentalNum > 0
      ? formatRental(monthlyRentalNum * 12)
      : null;

  let propertyType: Property['type'] = 'PG Building';
  if (data.type === 'PG Building' || data.type === 'PG Buildings') propertyType = 'PG Building';
  else if (data.type === 'Residential Rental Income') propertyType = 'Residential Rental Income';
  else if (data.type === 'Commercial Properties') propertyType = 'Commercial Properties';
  else if (data.type === 'Commercial Plot') propertyType = 'Commercial Plot';
  else if (data.type === 'Residential Plot' || data.type === 'PG Plot') propertyType = 'Residential Plot';
  else if (data.type === 'JD Land') propertyType = 'JD Land';
  else if (data.type) propertyType = data.type as Property['type'];

  return {
    id,
    name: data.title ?? 'Untitled Property',
    title: data.title ?? 'Untitled Property',
    type: propertyType ?? 'PG Building',
    location: data.location ?? data.area ?? '',
    area: data.area ?? '',
    price: data.price ?? 0,
    monthlyRentalIncome: isPlot ? 0 : (data.monthly_rental ?? 0),
    monthly_rental: isPlot ? null : (data.monthly_rental_label ?? formatRental(data.monthly_rental)),
    rental_yield: isPlot ? null : (data.rental_yield ?? null),
    annual_income: annualIncome,
    plotSizeSqFt: isPlot ? (data.area_sqft ?? 0) : (data.area_sqft ?? 0),
    builtUpAreaSqFt: data.built_up_area_sqft ?? data.area_sqft ?? 0,
    area_sqft: data.area_sqft ?? 0,
    area_unit: data.area_unit,
    area_acres: data.area_acres,
    area_guntas: data.area_guntas,
    price_per_sqft: data.price_per_sqft,
    floors: data.floor_count ?? 0,
    tenants: data.total_units ?? 0,
    occupancyPercent: data.occupancy_percent ?? 0,
    bbmpApproved: data.bbmp_approved ?? false,
    description: data.description ?? '',
    featured: data.featured ?? false,
    createdAt: createdAt?.toISOString() ?? new Date().toISOString(),
    commercial_subtype: data.commercial_subtype,
    plot_subtype: data.plot_subtype as Property['plot_subtype'],
    age: data.age ?? '—',
    facing: data.facing ?? '—',
    floor_count: data.floor_count ?? 0,
    available_units: data.available_units ?? 0,
    total_units: data.total_units ?? 0,
    occupancy_percent: data.occupancy_percent ?? 0,
    amenities: data.amenities ?? [],
    highlights: data.highlights ?? [],
    listed_days_ago: data.listed_days_ago ?? 0,
    dimensions: data.dimensions ?? '—',
    extraDetails: data.extra_details,
    images: data.images ?? [],
    katha: data.katha?.trim() || '—',
  };
}
