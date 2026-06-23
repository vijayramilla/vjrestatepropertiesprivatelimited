import type { CSSProperties } from 'react';
import type { Property } from '@/data/properties';
import {
  isCommercialProperty,
  isPlotProperty,
  getPlotSubtype,
} from '@/data/properties';
import { getAreaSizeLabel } from '@/lib/propertyAreaLabel';

const fontUI: CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" };

type DetailRow = { label: string; value: string };

function str(extra: Record<string, string | number> | undefined, key: string, fallback = '—'): string {
  const v = extra?.[key];
  return v !== undefined && v !== '' ? String(v) : fallback;
}

function buildDetailRows(property: Property): DetailRow[] {
  const extra = property.extraDetails ?? {};
  const plotSub = getPlotSubtype(property);

  if (property.type === 'PG Building') {
    return [
      { label: getAreaSizeLabel(property.type), value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Built-up Area', value: `${property.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft` },
      { label: 'Plot Dimensions', value: property.dimensions },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Total Rooms', value: String(property.total_units) },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'Amenities', value: property.amenities.join(', ') || '—' },
    ];
  }

  if (property.type === 'Residential Rental Income') {
    return [
      { label: getAreaSizeLabel(property.type), value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Built-up Area', value: `${property.builtUpAreaSqFt.toLocaleString('en-IN')} sq.ft` },
      { label: 'Plot Dimensions', value: property.dimensions },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Total Units', value: String(property.total_units) },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'Rental Yield', value: property.rental_yield ? `${property.rental_yield}%` : '—' },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Loan Eligible', value: str(extra, 'Loan Eligible', 'Yes') },
    ];
  }

  if (isCommercialProperty(property.type)) {
    const sub = property.commercial_subtype ?? 'Office Space';
    const base: DetailRow[] = [
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: getAreaSizeLabel(property.type), value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
      { label: 'Total Floors', value: String(property.floor_count) },
      { label: 'Facing', value: property.facing },
      { label: 'Age', value: property.age },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
    ];

    const subtypeRows: Record<string, DetailRow[]> = {
      'Office Space': [
        { label: 'Cabins', value: str(extra, 'Cabins') },
        { label: 'Meeting Rooms', value: str(extra, 'Meeting Rooms') },
        { label: 'Car Parking', value: str(extra, 'Car Parking') },
        { label: 'Power Backup', value: str(extra, 'Power Backup') },
      ],
      'Mall / Retail': [
        { label: 'Total Shops', value: str(extra, 'Shops') },
        { label: 'Anchor Tenant', value: str(extra, 'Anchor Tenant') },
        { label: 'Daily Footfall', value: str(extra, 'Footfall/Day') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Warehouse / Industrial': [
        { label: 'Floor Height', value: str(extra, 'Floor Height (ft)', '24 ft') },
        { label: 'Dock Doors', value: str(extra, 'Dock Doors') },
        { label: 'Power Load (KVA)', value: str(extra, 'Power Load (KVA)') },
        { label: 'Water Supply', value: str(extra, 'Water Supply', 'Yes') },
      ],
      'Hospital / Clinic': [
        { label: 'Total Beds', value: str(extra, 'Beds') },
        { label: 'OPD Rooms', value: str(extra, 'OPD Rooms') },
        { label: 'ICU', value: str(extra, 'ICU') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Hotel / Hospitality': [
        { label: 'Total Rooms', value: str(extra, 'Rooms') },
        { label: 'Restaurant', value: str(extra, 'Restaurant') },
        { label: 'Banquet Hall', value: str(extra, 'Banquet') },
      ],
      'Factory / Manufacturing': [
        { label: 'Floor Space', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
        { label: 'Power Load', value: str(extra, 'Power Load') },
        { label: 'Water Supply', value: str(extra, 'Water Supply', 'Yes') },
        { label: 'Road Access', value: str(extra, 'Road Access', 'Yes') },
      ],
      Showroom: [
        { label: 'Ground Floor Area', value: `${property.area_sqft.toLocaleString('en-IN')} sq.ft` },
        { label: 'Frontage (ft)', value: str(extra, 'Frontage (ft)') },
        { label: 'Height (ft)', value: str(extra, 'Height (ft)') },
        { label: 'Parking', value: str(extra, 'Parking') },
      ],
      'Mixed Use': [
        { label: 'Commercial Area', value: str(extra, 'Commercial Area') },
        { label: 'Residential Area', value: str(extra, 'Residential Area') },
        { label: 'Total Floors', value: String(property.floor_count) },
      ],
      'Flex Space': [
        { label: 'Commercial Area', value: str(extra, 'Commercial Area') },
        { label: 'Residential Area', value: str(extra, 'Residential Area') },
        { label: 'Total Floors', value: String(property.floor_count) },
      ],
    };

    return [...base, ...(subtypeRows[sub] ?? subtypeRows['Office Space'])];
  }

  if (plotSub === 'Residential Plot') {
    return [
      { label: getAreaSizeLabel('Residential Plot'), value: property.area_sqft.toLocaleString('en-IN') },
      { label: 'Dimensions', value: property.dimensions },
      { label: 'Facing', value: property.facing },
      { label: 'Road Width', value: str(extra, 'Road Width') },
      { label: 'Zone', value: str(extra, 'Zone') },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Water Source', value: str(extra, 'Water Source') },
      { label: 'Soil Type', value: str(extra, 'Soil Type') },
      { label: 'Nearest Landmark', value: str(extra, 'Nearest Landmark') },
    ];
  }

  if (plotSub === 'Commercial Plot') {
    return [
      { label: getAreaSizeLabel('Commercial Plot'), value: property.area_sqft.toLocaleString('en-IN') },
      { label: 'Dimensions', value: property.dimensions },
      { label: 'Facing', value: property.facing },
      { label: 'Road Width', value: str(extra, 'Road Width') },
      { label: 'Zone', value: str(extra, 'Zone') },
      { label: 'FSI / FAR', value: str(extra, 'FSI') },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Road Access', value: str(extra, 'Road Access') },
      { label: 'Nearest Landmark', value: str(extra, 'Nearest Landmark') },
    ];
  }

  if (plotSub === 'Agriculture Land') {
    return [
      { label: getAreaSizeLabel('Agriculture Land'), value: `${(property.plotSizeSqFt / 43560).toFixed(2)} acres` },
      { label: 'Survey Number', value: str(extra, 'Survey No.') },
      { label: 'Facing', value: property.facing },
      { label: 'Road Access', value: str(extra, 'Road Access') },
      { label: 'Water Source', value: str(extra, 'Water Source') },
      { label: 'Soil Type', value: str(extra, 'Soil Type') },
      { label: 'Crop Suitability', value: str(extra, 'Crop Suitability') },
      { label: 'Electricity', value: str(extra, 'Electricity') },
      { label: 'Distance from City', value: str(extra, 'Distance from City') },
      { label: 'Legal Status', value: str(extra, 'Legal Status', 'Clear Title') },
    ];
  }

  return [];
}

function getHeroMetrics(property: Property): DetailRow[] {
  if (property.type === 'PG Building') {
    return [
      { label: 'Total Rooms', value: property.total_units > 0 ? String(property.total_units) : '—' },
      { label: 'Floors', value: property.floor_count > 0 ? String(property.floor_count) : '—' },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
    ];
  }

  if (property.type === 'Residential Rental Income' || isCommercialProperty(property.type)) {
    return [
      { label: getAreaSizeLabel(property.type), value: property.area_sqft > 0 ? `${property.area_sqft.toLocaleString('en-IN')} sq.ft` : '—' },
      { label: 'Monthly Income', value: property.monthly_rental ?? '—' },
      { label: 'Annual Income', value: property.annual_income ?? '—' },
      { label: 'Rental Yield', value: property.rental_yield ? `${property.rental_yield}%` : '—' },
    ];
  }

  const plotSub = getPlotSubtype(property);
  if (isPlotProperty(property.type)) {
    const areaVal =
      plotSub === 'Agriculture Land'
        ? `${(property.plotSizeSqFt / 43560).toFixed(2)} acres`
        : property.area_sqft > 0
          ? `${property.area_sqft.toLocaleString('en-IN')} sq.ft`
          : '—';
    return [
      { label: getAreaSizeLabel(plotSub ?? property.type), value: areaVal },
      { label: 'Facing', value: property.facing || '—' },
      { label: 'Dimensions', value: property.dimensions || '—' },
      { label: 'BBMP Approved', value: property.bbmpApproved ? 'Yes' : 'No' },
    ];
  }

  return [];
}

function getTypeLabel(property: Property): string {
  if (property.type === 'PG Building') return 'PG Building';
  if (property.commercial_subtype) return property.commercial_subtype;
  const plotSub = getPlotSubtype(property);
  if (plotSub) return plotSub;
  return property.type;
}

function groupRows(rows: DetailRow[]): { title: string; rows: DetailRow[] }[] {
  const incomeLabels = new Set(['Monthly Income', 'Annual Income', 'Rental Yield']);
  const dimensionLabels = new Set([
    'Built-up Area',
    'Plot Dimensions',
    'Dimensions',
    'Total Floors',
    'Total Rooms',
    'Total Units',
    'Floor Space',
    'Ground Floor Area',
  ]);
  const areaLabel = rows.find((r) =>
    ['Built-up Area', 'Plot Size', 'Land Area'].some((l) => r.label.includes(l)) ||
    r.label === getAreaSizeLabel('PG Building'),
  )?.label;

  const income: DetailRow[] = [];
  const dimensions: DetailRow[] = [];
  const legal: DetailRow[] = [];
  const other: DetailRow[] = [];

  for (const row of rows) {
    if (incomeLabels.has(row.label)) {
      income.push(row);
    } else if (
      dimensionLabels.has(row.label) ||
      row.label === areaLabel ||
      row.label.includes('Area') ||
      row.label.includes('Dimensions') ||
      row.label.includes('Floors') ||
      row.label.includes('Rooms') ||
      row.label.includes('Units')
    ) {
      dimensions.push(row);
    } else if (
      ['BBMP Approved', 'Facing', 'Age', 'Loan Eligible', 'Legal Status', 'Zone', 'FSI / FAR'].includes(row.label)
    ) {
      legal.push(row);
    } else {
      other.push(row);
    }
  }

  const groups: { title: string; rows: DetailRow[] }[] = [];
  if (dimensions.length) groups.push({ title: 'Dimensions & Layout', rows: dimensions });
  if (income.length) groups.push({ title: 'Income & Returns', rows: income });
  if (legal.length) groups.push({ title: 'Legal & Orientation', rows: legal });
  if (other.length) groups.push({ title: 'Additional Details', rows: other });
  return groups;
}

function HeroMetric({ label, value }: DetailRow) {
  return (
    <div className="flex min-h-[76px] flex-col justify-center border border-[#e8e8e8] bg-white px-4 py-3.5">
      <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#999]" style={fontUI}>
        {label}
      </p>
      <p className="mt-1.5 font-numeric text-[17px] font-semibold leading-tight text-black sm:text-[19px]" style={fontUI}>
        {value}
      </p>
    </div>
  );
}

function SpecRow({ label, value }: DetailRow) {
  return (
    <div className="flex min-h-[48px] items-center justify-between gap-4 border-b border-[#f0f0f0] px-4 py-3 last:border-b-0 sm:px-5">
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#999]" style={fontUI}>
        {label}
      </span>
      <span className="max-w-[55%] text-right text-[13px] font-medium leading-snug text-black sm:text-[14px]" style={fontUI}>
        {value}
      </span>
    </div>
  );
}

export default function PropertyDetailsPanel({ property }: { property: Property }) {
  const allRows = buildDetailRows(property);
  const heroMetrics = getHeroMetrics(property);
  const heroLabels = new Set(heroMetrics.map((m) => m.label));
  const detailRows = allRows.filter((r) => !heroLabels.has(r.label));
  const groups = groupRows(detailRows);

  return (
    <article className="mt-4 overflow-hidden rounded-xl border border-[#e8e8e8] bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-[#e8e8e8] bg-black px-4 py-4 sm:px-5">
        <div>
          <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#888]" style={fontUI}>
            {getTypeLabel(property)}
          </p>
          <h3 className="mt-0.5 text-[15px] font-semibold text-white sm:text-[16px]" style={fontUI}>
            Property Details
          </h3>
        </div>
        <span className="rounded-full border border-[#333] bg-[#111] px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[#ccc]" style={fontUI}>
          Specs
        </span>
      </header>

      {heroMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-[#e8e8e8] p-px sm:grid-cols-4">
          {heroMetrics.map((metric) => (
            <HeroMetric key={metric.label} {...metric} />
          ))}
        </div>
      )}

      {groups.map((group) => (
        <section key={group.title} className="border-t border-[#e8e8e8]">
          <div className="bg-[#fafafa] px-4 py-2.5 sm:px-5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#666]" style={fontUI}>
              {group.title}
            </p>
          </div>
          <div className="bg-white">
            {group.rows.map((row) => (
              <SpecRow key={row.label} {...row} />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
