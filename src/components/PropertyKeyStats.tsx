import type { PropertyStatsView } from '@/data/listingProperties';
import { isPlotType } from '@/data/listingProperties';
import {
  getCardAreaLabel,
  getCardAreaValue,
  isBuildingPropertyType,
  isPlotOrLandPropertyType,
} from '@/lib/propertyAreaLabel';

export function getCardUnitsLabel(property: Pick<PropertyStatsView, 'raw_type'>): string {
  return property.raw_type === 'PG Building' ? 'Rooms' : 'Units';
}

export function getCardUnitsValue(property: Pick<PropertyStatsView, 'type' | 'units'>): string {
  if (isPlotType(property.type)) return '—';
  return property.units > 0 ? String(property.units) : '—';
}

export function getCardSqftValue(property: Pick<PropertyStatsView, 'area_sqft'>): string {
  return property.area_sqft > 0
    ? `${property.area_sqft.toLocaleString('en-IN')} sq.ft`
    : '—';
}

export function getCardKathaValue(property: Pick<PropertyStatsView, 'katha'>): string {
  const value = property.katha?.trim();
  if (!value || value === 'Not Available') return '—';
  return value;
}

interface PropertyKeyStatsProps {
  property: PropertyStatsView;
  className?: string;
  variant?: 'card' | 'detail';
}

function StatCell({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: 'card' | 'detail';
}) {
  const valueClass =
    variant === 'detail'
      ? 'font-numeric text-[15px] text-[#000] font-semibold mt-1'
      : 'font-numeric text-[13px] font-semibold text-gray-900 mt-0.5 truncate';

  return (
    <div className="min-w-0">
      <p
        className={
          variant === 'detail'
            ? 'font-sans text-[10px] font-medium text-[#aaa] uppercase tracking-[0.08em]'
            : 'font-sans text-[10px] font-medium uppercase tracking-wide text-gray-400'
        }
      >
        {label}
      </p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}

export default function PropertyKeyStats({
  property,
  className = '',
  variant = 'card',
}: PropertyKeyStatsProps) {
  const rawType = property.raw_type ?? property.type;
  const showRentalStats = isBuildingPropertyType(rawType);
  const showPricePerSqft =
    isPlotOrLandPropertyType(rawType) && (property.price_per_sqft ?? 0) > 0;
  const unitsLabel = getCardUnitsLabel(property);
  const areaLabel = getCardAreaLabel(rawType);
  const areaValue = getCardAreaValue(property);
  const pricePerSqftValue =
    (property.price_per_sqft ?? 0) > 0
      ? `₹${property.price_per_sqft!.toLocaleString('en-IN')}/sq.ft`
      : '—';
  const containerClass =
    variant === 'detail'
      ? `grid gap-4 bg-[#f9f9f9] border border-[#e8e8e8] p-5 ${
          showRentalStats ? 'grid-cols-2 sm:grid-cols-4' : showPricePerSqft ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
        }`
      : `grid gap-x-3 gap-y-2.5 border-t border-gray-100 pt-2.5 mt-2.5 ${
          showRentalStats ? 'grid-cols-2' : showPricePerSqft ? 'grid-cols-2' : 'grid-cols-2'
        }`;

  return (
    <div className={`${containerClass} ${className}`}>
      {showRentalStats && (
        <StatCell label="Monthly Income" value={property.monthly_rental} variant={variant} />
      )}
      <StatCell label={areaLabel} value={areaValue} variant={variant} />
      {showPricePerSqft && (
        <StatCell label="Price / sq.ft" value={pricePerSqftValue} variant={variant} />
      )}
      {showRentalStats && (
        <StatCell label={unitsLabel} value={getCardUnitsValue(property)} variant={variant} />
      )}
      <StatCell label="Khata" value={getCardKathaValue(property)} variant={variant} />
    </div>
  );
}
