import { cn } from '@/lib/utils';

interface IconProps {
  size?: number;
  className?: string;
  selected?: boolean;
}

function GradientDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6b7280" />
        <stop offset="100%" stopColor="#374151" />
      </linearGradient>
      <linearGradient id={`${id}-grad-light`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#9ca3af" />
        <stop offset="100%" stopColor="#6b7280" />
      </linearGradient>
    </defs>
  );
}

export function ApartmentIcon({ size = 24, className, selected }: IconProps) {
  const id = 'apt';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <GradientDefs id={id} />
      <rect x="3" y="21" width="18" height="3" rx="1" fill={selected ? `url(#${id}-grad)` : '#9ca3af'} opacity={selected ? 1 : 0.5} />
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" fill="none" />
      <rect x="8" y="6" width="3" height="3" rx="0.5" fill={selected ? '#6b7280' : '#d1d5db'} />
      <rect x="13" y="6" width="3" height="3" rx="0.5" fill={selected ? '#6b7280' : '#d1d5db'} />
      <rect x="8" y="11" width="3" height="3" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <rect x="13" y="11" width="3" height="3" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <rect x="8" y="16" width="3" height="3" rx="0.5" fill={selected ? '#374151' : '#f3f4f6'} />
      <rect x="13" y="16" width="3" height="3" rx="0.5" fill={selected ? '#374151' : '#f3f4f6'} />
    </svg>
  );
}

export function HouseIcon({ size = 24, className, selected }: IconProps) {
  const id = 'house';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <GradientDefs id={id} />
      <path d="M3 10.5L12 3L21 10.5" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M5 9V20H19V9" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <rect x="9" y="13" width="6" height="7" rx="1" fill={selected ? `url(#${id}-grad-light)` : '#d1d5db'} opacity={selected ? 0.3 : 0.4} />
      <rect x="10" y="14" width="4" height="3" rx="0.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
      <circle cx="10" cy="9" r="1" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <circle cx="14" cy="9" r="1" fill={selected ? '#4b5563' : '#e5e7eb'} />
    </svg>
  );
}

export function PlotIcon({ size = 24, className, selected }: IconProps) {
  const id = 'plot';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <GradientDefs id={id} />
      <path d="M4 4L20 4" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 20L20 20" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4L4 20" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M20 4L20 20" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="7" width="4" height="4" rx="0.5" fill={selected ? `url(#${id}-grad-light)` : '#d1d5db'} opacity={selected ? 0.4 : 0.3} />
      <rect x="13" y="7" width="4" height="4" rx="0.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
      <rect x="7" y="13" width="4" height="4" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <line x1="11" y1="13" x2="17" y2="13" stroke={selected ? '#374151' : '#e5e7eb'} strokeWidth="1" strokeLinecap="round" />
      <line x1="13" y1="11" x2="13" y2="17" stroke={selected ? '#374151' : '#e5e7eb'} strokeWidth="1" strokeLinecap="round" />
      <circle cx="15" cy="15" r="1" fill={selected ? '#6b7280' : '#f3f4f6'} />
    </svg>
  );
}

export function CommercialIcon({ size = 24, className, selected }: IconProps) {
  const id = 'comm';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <GradientDefs id={id} />
      <rect x="3" y="5" width="18" height="16" rx="2" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" fill="none" />
      <rect x="3" y="5" width="18" height="4" rx="2" fill={selected ? `url(#${id}-grad)` : '#d1d5db'} />
      <rect x="10" y="9" width="4" height="12" fill={selected ? `url(#${id}-grad-light)` : '#e5e7eb'} opacity={selected ? 0.2 : 0.3} />
      <rect x="6" y="11" width="3" height="4" rx="0.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
      <rect x="15" y="11" width="3" height="4" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <rect x="6" y="17" width="3" height="4" rx="0.5" fill={selected ? '#4b5563' : '#f3f4f6'} />
      <rect x="15" y="17" width="3" height="4" rx="0.5" fill={selected ? '#374151' : '#f3f4f6'} />
      <circle cx="12" cy="7" r="1" fill="white" />
    </svg>
  );
}

export function PGBuildingIcon({ size = 24, className, selected }: IconProps) {
  const id = 'pg';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <GradientDefs id={id} />
      <rect x="5" y="3" width="14" height="18" rx="2" stroke={selected ? `url(#${id}-grad)` : '#9ca3af'} strokeWidth="1.5" fill="none" />
      <rect x="5" y="3" width="14" height="4" rx="2" fill={selected ? `url(#${id}-grad)` : '#d1d5db'} />
      <rect x="8" y="8" width="3" height="3" rx="0.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
      <rect x="13" y="8" width="3" height="3" rx="0.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
      <rect x="8" y="13" width="3" height="3" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <rect x="13" y="13" width="3" height="3" rx="0.5" fill={selected ? '#4b5563' : '#e5e7eb'} />
      <rect x="10" y="17" width="4" height="4" rx="1" fill={selected ? `url(#${id}-grad-light)` : '#d1d5db'} opacity={selected ? 0.3 : 0.3} />
      <circle cx="12" cy="19" r="1.5" fill={selected ? '#6b7280' : '#e5e7eb'} />
    </svg>
  );
}

export const PROPERTY_ICONS: Record<string, React.FC<IconProps>> = {
  Apartment: ApartmentIcon,
  'Independent House': HouseIcon,
  'Plot / Land': PlotIcon,
  Commercial: CommercialIcon,
  'PG Building': PGBuildingIcon,
};
