export interface ListingProperty {
  id: string;
  title: string;
  type: string;
  location: string;
  area: string;
  area_sqft: number;
  price: number;
  price_label: string;
  monthly_rental: string;
  rental_yield: number | null;
  status: 'Ready to Move' | 'New Launch' | 'Under Construction';
  units: number;
  listed_days_ago: number;
  tags: string[];
  description: string;
  highlights: string[];
  dimensions: string;
  facing: string;
  age: string;
  parking: string;
  contact_name: string;
  contact_phone: string;
  posted_date: string;
  plot_subtype?: string;
  raw_type?: string;
  commercial_subtype?: string;
  images?: string[];
  katha?: string;
}

/** Live listings come from Firestore — no mock cards. */
export const PROPERTIES: ListingProperty[] = [];

export function getPropertyById(_id: string | number): ListingProperty | undefined {
  return undefined;
}

export function getLatestProperties(_count = 3): ListingProperty[] {
  return [];
}

export function getTypeBadgeLabel(type: string): string {
  if (type === 'PG Building') return 'PG BUILDING';
  if (type === 'Residential Rental') return 'RESIDENTIAL';
  if (type === 'Commercial') return 'COMMERCIAL';
  return 'PLOT';
}

export function isPlotType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes('plot') || t.includes('agriculture') || t.includes('land');
}

const RAW_TYPE_LABELS: Record<string, string> = {
  'PG Building': 'PG Building',
  'PG Buildings': 'PG Building',
  'Residential Rental Income': 'Residential Rental Income',
  'Commercial Properties': 'Commercial Properties',
  'Residential Plot': 'Residential Plot',
  'Commercial Plot': 'Commercial Plot',
  'Agriculture Land': 'Agriculture Land',
};

export function getCardSaleTitle(
  property: Pick<ListingProperty, 'type' | 'raw_type' | 'plot_subtype' | 'commercial_subtype'>,
): string {
  const raw = property.raw_type ?? property.type;

  if (raw === 'Commercial Properties' && property.commercial_subtype) {
    return `${property.commercial_subtype} For Sale`;
  }

  if (property.plot_subtype) {
    return `${property.plot_subtype} For Sale`;
  }

  const label = RAW_TYPE_LABELS[raw] ?? raw;
  return `${label} For Sale`;
}

export function getCardCityName(
  property: Pick<ListingProperty, 'area'>,
): string {
  return property.area?.trim() || 'Bangalore';
}

export type PropertyStatsView = Pick<
  ListingProperty,
  'monthly_rental' | 'area_sqft' | 'type' | 'raw_type' | 'units' | 'katha'
>;

export function propertyToStatsView(property: {
  type: string;
  monthly_rental?: string | null;
  area_sqft: number;
  total_units: number;
  katha?: string;
}): PropertyStatsView {
  const isPlot =
    property.type.includes('Plot') || property.type === 'Agriculture Land';

  return {
    monthly_rental: isPlot ? '—' : (property.monthly_rental ?? '—'),
    area_sqft: property.area_sqft,
    type: property.type.includes('Plot') || property.type === 'Agriculture Land'
      ? 'Plot / Agriculture'
      : property.type === 'Residential Rental Income'
        ? 'Residential Rental'
        : property.type === 'Commercial Properties'
          ? 'Commercial'
          : property.type,
    raw_type: property.type,
    units: property.total_units,
    katha: property.katha,
  };
}
