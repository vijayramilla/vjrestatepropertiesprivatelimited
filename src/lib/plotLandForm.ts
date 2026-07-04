export const GUNTA_SQFT = 43560 / 40;
export const SQFT_PER_ACRE = 43560;

export const PLOT_LAND_TYPES = [
  'Residential Plot',
  'Commercial Plot',
  'Agriculture Land',
  'PG Plot',
] as const;

export type AreaUnit = 'sqft' | 'acres';

export function sqftToAcresGuntas(sqft: number): { acres: number; guntas: number } {
  const safe = Math.max(0, Math.round(sqft));
  return {
    acres: Math.floor(safe / SQFT_PER_ACRE),
    guntas: Math.round((safe % SQFT_PER_ACRE) / GUNTA_SQFT),
  };
}

export function acresGuntasToSqft(acres: number, guntas: number): number {
  return Math.round(acres * SQFT_PER_ACRE + guntas * GUNTA_SQFT);
}

export function computePlotLandAreaSqft(
  areaUnit: AreaUnit,
  areaSqft: number,
  acres: number,
  guntas: number,
): number {
  if (areaUnit === 'acres') {
    return acresGuntasToSqft(acres, guntas);
  }
  return Math.max(0, Math.round(areaSqft));
}

export function formatDimensionsDisplay(dimensions?: string): string {
  if (!dimensions?.trim() || dimensions === '—') return '—';
  return dimensions.replace(/\s*[x×X]\s*/g, ' × ').trim();
}

/** Decimal acres display — e.g. 1.25 Acres (never guntas, never "Ac") */
export function formatArea(
  areaUnit: string | undefined,
  areaSqft: number,
  areaAcres?: number,
  areaGuntas?: number,
): string {
  if (areaUnit === 'acres') {
    const totalAcres = (areaAcres || 0) + (areaGuntas || 0) / 40;
    if (totalAcres === 0 && areaSqft > 0) {
      const calcAcres = areaSqft / SQFT_PER_ACRE;
      return `${calcAcres.toFixed(2)} Acres`;
    }
    return `${totalAcres.toFixed(2)} Acres`;
  }
  return areaSqft ? `${areaSqft.toLocaleString('en-IN')} sq.ft` : '—';
}

export function shouldShowPlotDimensions(
  _areaUnit: string | undefined,
  dimensions?: string,
): boolean {
  if (_areaUnit === 'acres') return false;
  const d = dimensions?.trim();
  return !!d && d !== '—';
}

/** @deprecated Use formatArea — kept for callers migrating */
export function formatPlotLandAreaCompact(input: {
  area_unit?: string;
  area_sqft: number;
  area_acres?: number;
  area_guntas?: number;
}): string {
  return formatArea(input.area_unit, input.area_sqft, input.area_acres, input.area_guntas);
}

export function formatPlotSizeSqft(input: { area_sqft: number }): string {
  return input.area_sqft > 0 ? `${input.area_sqft.toLocaleString('en-IN')} sq.ft` : '—';
}

export function formatPlotLandCardArea(input: {
  area_unit?: string;
  area_sqft: number;
  area_acres?: number;
  area_guntas?: number;
}): string {
  return formatArea(input.area_unit, input.area_sqft, input.area_acres, input.area_guntas);
}

export function formatPlotLandAreaDisplay(input: {
  area_unit?: string;
  area_sqft: number;
  area_acres?: number;
  area_guntas?: number;
}): string {
  return formatArea(input.area_unit, input.area_sqft, input.area_acres, input.area_guntas);
}
