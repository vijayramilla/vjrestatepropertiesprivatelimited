import type { CSSProperties } from 'react';
import { Buildings, Bed, ChartLineUp } from '@phosphor-icons/react';
import type { Property } from '@/data/properties';

const fontUI: CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" };

type SpecRow = { label: string; value: string };

function HeroMetric({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: typeof Buildings;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[72px] flex-col justify-center px-4 py-3.5 sm:min-h-[80px] sm:px-5 ${
        accent ? 'bg-[#0a0a0a] text-white' : 'bg-white'
      }`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon size={13} weight="duotone" className={accent ? 'text-[#888]' : 'text-[#bbb]'} />
        <p
          className={`text-[9px] font-medium uppercase tracking-[0.14em] ${
            accent ? 'text-[#888]' : 'text-[#aaa]'
          }`}
          style={fontUI}
        >
          {label}
        </p>
      </div>
      <p
        className={`font-numeric text-[18px] font-semibold leading-none sm:text-[20px] ${
          accent ? 'text-white' : 'text-[#000]'
        }`}
        style={fontUI}
      >
        {value}
      </p>
    </div>
  );
}

function SpecCell({ label, value }: SpecRow) {
  return (
    <div className="flex min-h-[52px] flex-col justify-center gap-1 border-b border-[#f2f2f2] px-4 py-3.5 last:border-b-0 sm:min-h-[56px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#aaa]" style={fontUI}>
        {label}
      </span>
      <span
        className="text-[14px] font-medium leading-snug text-[#000] sm:max-w-[58%] sm:text-right"
        style={fontUI}
      >
        {value}
      </span>
    </div>
  );
}

export default function PgBuildingDetailsCard({ property }: { property: Property }) {
  const totalRooms = property.total_units > 0 ? String(property.total_units) : '—';
  const occupancy =
    property.occupancy_percent > 0 ? `${property.occupancy_percent}%` : '—';
  const floors = property.floor_count > 0 ? String(property.floor_count) : '—';

  const specRows: SpecRow[] = [
    { label: 'Total Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
    { label: 'Built-up Area', value: `${property.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft` },
    { label: 'Plot Dimensions', value: property.dimensions || '—' },
    { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
    { label: 'Facing', value: property.facing || '—' },
    { label: 'Age', value: property.age || '—' },
    {
      label: 'Amenities',
      value: property.amenities.length > 0 ? property.amenities.join(', ') : '—',
    },
  ];

  return (
    <article className="mt-4 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 bg-[#000] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#666]" style={fontUI}>
            PG Building
          </p>
          <h3 className="mt-0.5 truncate text-[15px] font-semibold text-white sm:text-[16px]" style={fontUI}>
            Property Details
          </h3>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#333] bg-[#111]">
          <Buildings size={18} weight="duotone" className="text-white" />
        </div>
      </header>

      <div className="grid grid-cols-3 gap-px bg-[#e8e8e8]">
        <HeroMetric label="Total Rooms" value={totalRooms} icon={Bed} />
        <HeroMetric label="Occupancy" value={occupancy} icon={ChartLineUp} accent />
        <HeroMetric label="Floors" value={floors} icon={Buildings} />
      </div>

      <div className="grid grid-cols-1 gap-px border-b border-[#f0f0f0] bg-[#f0f0f0] sm:grid-cols-2">
        <div className="flex min-h-[68px] flex-col justify-center bg-[#fafafa] px-4 py-3.5 sm:px-5">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#aaa]" style={fontUI}>
            Monthly Income
          </p>
          <p className="mt-1 font-numeric text-[22px] font-bold leading-none text-[#000] sm:text-[24px]" style={fontUI}>
            {property.monthly_rental ?? '—'}
          </p>
        </div>
        <div className="flex min-h-[68px] flex-col justify-center bg-white px-4 py-3.5 sm:px-5">
          <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#aaa]" style={fontUI}>
            Annual Income
          </p>
          <p className="mt-1 font-numeric text-[22px] font-bold leading-none text-[#000] sm:text-[24px]" style={fontUI}>
            {property.annual_income ?? '—'}
          </p>
        </div>
      </div>

      <div className="divide-y divide-[#f2f2f2]">
        {specRows.map((row) => (
          <SpecCell key={row.label} label={row.label} value={row.value} />
        ))}
      </div>
    </article>
  );
}
