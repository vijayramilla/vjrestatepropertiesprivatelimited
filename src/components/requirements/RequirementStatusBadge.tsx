import { getStatusBadge, type RequirementStatus } from '@/lib/requirements';

const DOT_CLASS: Record<'success' | 'warning' | 'muted', string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  muted: 'bg-gray-400',
};

export default function RequirementStatusBadge({
  status,
  className = '',
}: {
  status: RequirementStatus;
  className?: string;
}) {
  const badge = getStatusBadge(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-700 ${className}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[badge.variant]}`} />
      {badge.label}
    </span>
  );
}
