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
