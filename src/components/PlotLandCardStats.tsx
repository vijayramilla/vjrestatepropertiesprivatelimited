import type { PropertyStatsView } from '@/data/listingProperties';
import { isAgricultureLandListing } from '@/data/listingProperties';
import {
  formatArea,
  formatDimensionsDisplay,
  shouldShowPlotDimensions,
} from '@/lib/plotLandForm';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

function AreaValueOnly({
  value,
  variant,
  className = '',
}: {
  value: string;
  variant: 'card' | 'detail' | 'compact';
  className?: string;
}) {
  const valueClass =
    variant === 'detail'
      ? 'font-numeric text-[15px] text-[#000] font-semibold'
      : variant === 'compact'
        ? 'font-numeric text-[10px] font-semibold text-gray-900 truncate'
        : 'font-numeric text-[13px] font-semibold text-gray-900 truncate';

  return (
    <div className={`min-w-0 ${className}`}>
      <p className={valueClass}>{value}</p>
    </div>
  );
}

function StatCell({
  label,
  value,
  variant,
  className = '',
}: {
  label: string;
  value: string;
  variant: 'card' | 'detail' | 'compact';
  className?: string;
}) {
  const labelClass =
    variant === 'detail'
      ? 'font-sans text-[10px] font-medium text-[#aaa] uppercase tracking-[0.08em]'
      : variant === 'compact'
        ? 'font-sans text-[7px] font-medium uppercase tracking-wide text-gray-400'
        : 'font-sans text-[10px] font-medium uppercase tracking-wide text-gray-400';

  const valueClass =
    variant === 'detail'
      ? 'font-numeric text-[15px] text-[#000] font-semibold mt-1'
      : variant === 'compact'
        ? 'font-numeric text-[10px] font-semibold text-gray-900 truncate'
        : 'font-numeric text-[13px] font-semibold text-gray-900 mt-0.5 truncate';

  return (
    <div className={`min-w-0 ${className}`}>
      <p className={labelClass} style={{ fontFamily: DM_SANS }}>
        {label}
      </p>
      <p className={valueClass}>{value}</p>
    </div>
  );
}

function formatKatha(katha?: string): string {
  const value = katha?.trim();
  if (!value || value === 'Not Available') return '—';
  return value;
}

function formatFacing(facing?: string): string {
  const value = facing?.trim();
  if (!value || value === '—') return '—';
  return value;
}

interface PlotLandCardStatsProps {
  property: PropertyStatsView;
  variant?: 'card' | 'detail' | 'compact';
  className?: string;
}

export default function PlotLandCardStats({
  property,
  variant = 'card',
  className = '',
}: PlotLandCardStatsProps) {
  const isLand = isAgricultureLandListing(property);
  const areaUnit = property.area_unit;
  const areaValue = formatArea(
    areaUnit,
    property.area_sqft,
    property.area_acres,
    property.area_guntas,
  );
  const showDimensions = shouldShowPlotDimensions(areaUnit, property.dimensions);
  const dimensions = formatDimensionsDisplay(property.dimensions);

  const containerClass =
    variant === 'detail'
      ? `grid grid-cols-2 gap-4 bg-[#f9f9f9] border border-[#e8e8e8] p-5 ${className}`
      : variant === 'compact'
        ? `grid grid-cols-2 gap-x-1 gap-y-0.5 border-t border-gray-100 pt-1 mt-1 ${className}`
        : `grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-gray-100 pt-2.5 mt-2.5 ${className}`;

  if (isLand) {
    const dcValue = property.dc_conversion ?? '—';
    return (
      <div className={containerClass}>
        <StatCell label="LAND AREA" value={areaValue} variant={variant} />
        <StatCell label="DC CONVERSION" value={dcValue} variant={variant} />
        <div className="col-span-2">
          <StatCell label="KHATA TYPE" value={formatKatha(property.katha)} variant={variant} />
        </div>
      </div>
    );
  }

  if (areaUnit === 'acres') {
    return (
      <div className={containerClass}>
        {variant === 'card' ? (
          <AreaValueOnly value={areaValue} variant={variant} />
        ) : (
          <StatCell label="PLOT AREA" value={areaValue} variant={variant} />
        )}
        <StatCell label="FACING" value={formatFacing(property.facing)} variant={variant} />
        <div className="col-span-2">
          <StatCell label="KHATA TYPE" value={formatKatha(property.katha)} variant={variant} />
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <StatCell label="PLOT AREA" value={areaValue} variant={variant} />
      {showDimensions ? (
        <>
          <StatCell label="DIMENSIONS" value={dimensions} variant={variant} />
          <StatCell label="FACING" value={formatFacing(property.facing)} variant={variant} />
          <StatCell label="KHATA TYPE" value={formatKatha(property.katha)} variant={variant} />
        </>
      ) : (
        <>
          <StatCell label="FACING" value={formatFacing(property.facing)} variant={variant} />
          <div className="col-span-2">
            <StatCell label="KHATA TYPE" value={formatKatha(property.katha)} variant={variant} />
          </div>
        </>
      )}
    </div>
  );
}
