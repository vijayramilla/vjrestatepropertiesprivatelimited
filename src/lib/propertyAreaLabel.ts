import { formatPlotLandCardArea, formatArea } from '@/lib/plotLandForm';

/** Area stat label shown on property cards (replaces "Sq.ft"). Values are unchanged. */
export function getAreaSizeLabel(propertyType: string): string {
  const t = propertyType.trim();

  if (
    t === 'PG Building' ||
    t === 'PG Buildings' ||
    t === 'Residential Rental' ||
    t === 'Residential Rental Income' ||
    t === 'Commercial Property' ||
    t === 'Commercial Properties' ||
    t === 'Commercial'
  ) {
    return 'Built-up Area';
  }

  if (t === 'Residential Plot' || t === 'Commercial Plot') {
    return 'Plot Size';
  }

  if (t === 'Agriculture Land') {
    return 'Land Area';
  }

  if (t.includes('Plot') || t.includes('Agriculture') || t.includes('Land')) {
    if (t.includes('Commercial')) return 'Plot Size';
    if (t.includes('Residential')) return 'Plot Size';
    return 'Land Area';
  }

  return 'Built-up Area';
}

/** Card display label including units where relevant */
export function getCardAreaLabel(propertyType: string): string {
  if (propertyType.trim() === 'Agriculture Land') {
    return 'Land Area (acres)';
  }
  return getAreaSizeLabel(propertyType);
}

export function isBuildingPropertyType(propertyType: string): boolean {
  const t = propertyType.trim();
  return (
    t === 'PG Building' ||
    t === 'PG Buildings' ||
    t === 'Residential Rental Income' ||
    t === 'Commercial Properties'
  );
}

export function isPlotOrLandPropertyType(propertyType: string): boolean {
  const t = propertyType.trim();
  return (
    t === 'Residential Plot' ||
    t === 'Commercial Plot' ||
    t === 'PG Plot' ||
    t === 'Agriculture Land' ||
    t.includes('Plot') ||
    t.includes('Agriculture') ||
    t === 'Plot / Agriculture'
  );
}

export function getCardAreaValue(property: {
  area_sqft: number;
  area_unit?: string;
  area_acres?: number;
  area_guntas?: number;
  raw_type?: string;
  type?: string;
}): string {
  const raw = (property.raw_type ?? property.type ?? '').trim();
  if (
    raw === 'Residential Plot' ||
    raw === 'Commercial Plot' ||
    raw === 'Agriculture Land' ||
    raw.includes('Plot') ||
    raw.includes('Agriculture')
  ) {
    return formatArea(
      property.area_unit,
      property.area_sqft,
      property.area_acres,
      property.area_guntas,
    );
  }
  return property.area_sqft > 0
    ? `${property.area_sqft.toLocaleString('en-IN')} sq.ft`
    : '—';
}
