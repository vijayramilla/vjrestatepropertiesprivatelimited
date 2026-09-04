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
  variant?: 'card' | 'detail' | 'compact' | 'listing';
}

function StatCell({
  label,
  value,
  variant,
  valueClassName = '',
}: {
  label: string;
  value: string;
  variant: 'card' | 'detail' | 'compact' | 'listing';
  valueClassName?: string;
}) {
  const valueClass =
    variant === 'detail'
      ? 'font-numeric text-lg text-[#000] font-semibold mt-1'
      : variant === 'compact'
        ? 'font-numeric text-[10px] font-semibold text-gray-900 truncate'
        : variant === 'listing'
          ? 'font-numeric text-[13px] font-semibold text-gray-900 truncate'
          : 'font-numeric text-[15px] font-semibold text-gray-900 truncate';

  return (
    <div className={variant === 'listing' ? 'shrink-0' : 'min-w-0'}>
      <p
        className={
          variant === 'detail'
            ? 'font-sans text-[10px] font-medium text-[#aaa] uppercase tracking-[0.08em]'
            : variant === 'compact'
              ? 'font-sans text-[7px] font-medium uppercase tracking-wide text-gray-400'
              : variant === 'listing'
                ? 'font-sans text-[9px] font-medium uppercase tracking-wide text-gray-400'
                : 'font-sans text-[10px] font-bold uppercase tracking-[0.06em] text-gray-400'
        }
      >
        {label}
      </p>
      <p className={valueClass + (valueClassName ? ` ${valueClassName}` : '')}>{value}</p>
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
      ? `grid gap-4 bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${
          showRentalStats ? 'grid-cols-2 sm:grid-cols-4' : showPricePerSqft ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
        }`
      : variant === 'compact'
        ? `grid gap-x-1 gap-y-0.5 border-t border-gray-100 pt-1 mt-1 grid-cols-2`
        : variant === 'listing'
          ? 'flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#F3F4F6] pt-2 mt-2'
          : `grid gap-x-4 gap-y-[10px] border-t border-[#F3F4F6] pt-3 mt-3 ${
              showRentalStats ? 'grid-cols-2' : showPricePerSqft ? 'grid-cols-2' : 'grid-cols-2'
            }`;

  return (
    <div className={`${containerClass} ${className}`}>
      {showRentalStats && (
        <StatCell
          label="Monthly Rental Income"
          value={property.monthly_rental}
          variant={variant}
          valueClassName="!text-[#22C26E]"
        />
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
