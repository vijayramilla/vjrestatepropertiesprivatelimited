import type { Icon } from '@phosphor-icons/react';

export default function RequirementMetaRow({
  icon: IconComponent,
  label,
  value,
}: {
  icon: Icon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-gray-200 bg-gray-50">
        <IconComponent size={16} weight="thin" className="text-gray-700" />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-gray-900">{value}</p>
      </div>
    </div>
  );
}
