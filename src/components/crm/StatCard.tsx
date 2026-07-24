import type { ReactNode } from 'react';

export default function StatCard({
  icon,
  label,
  value,
  subtext,
  trend,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  subtext?: string;
  trend?: { direction: 'up' | 'down'; value: string };
  iconBg?: string;
  iconColor?: string;
}) {
  return (
    <div className="bg-card border border-border/60 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            <span>{trend.direction === 'up' ? '\u2191' : '\u2193'}</span>
            {trend.value}
          </span>
        )}
      </div>
      <div className="font-['Fraunces',serif] text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[12px] text-muted-foreground mt-1">{label}</div>
      {subtext && <div className="text-[10px] text-muted-foreground/70 mt-0.5">{subtext}</div>}
    </div>
  );
}
