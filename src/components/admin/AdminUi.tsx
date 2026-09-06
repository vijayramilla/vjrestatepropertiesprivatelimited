import type { ReactNode } from 'react';

export function AdminPageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-8 sm:py-8">{children}</div>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {eyebrow && (
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#96782A] sm:text-[11px]">
          <span className="inline-block h-px w-6 bg-gradient-to-r from-[#C9A84C] to-transparent" />
          {eyebrow}
        </p>
      )}
      <h1 className="admin-heading mt-1.5 text-2xl font-semibold tracking-tight text-[#0A1628] sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{description}</p>
      )}
    </header>
  );
}

export function AdminStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card group relative overflow-hidden p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-16px_rgba(10,22,40,0.25)] sm:p-5">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#C9A84C]/[0.07] blur-xl transition-opacity duration-200 group-hover:opacity-100" />
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value mt-2">{value}</p>
      <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#C9A84C]/20 transition-all duration-300 group-hover:w-14" />
    </div>
  );
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4">{children}</div>
  );
}

export function AdminToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="admin-card mb-4 flex flex-col gap-3 p-3 sm:p-4">{children}</div>
  );
}

export function AdminFilterRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{children}</div>;
}

export function AdminFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-chip ${active ? 'admin-chip-active' : 'admin-chip-idle'}`}
    >
      {children}
    </button>
  );
}

export function AdminEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-card flex flex-col items-center px-6 py-12 text-center sm:py-16">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A84C]/10 text-[#96782A]">
          {icon}
        </div>
      )}
      <p className="admin-heading text-xl font-semibold text-[#0A1628]">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function AdminSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="admin-card h-24 animate-pulse bg-gray-100/70 sm:h-28" />
      ))}
    </div>
  );
}

export function AdminBadge({
  variant = 'default',
  children,
}: {
  variant?: 'default' | 'success' | 'whatsapp' | 'muted';
  children: ReactNode;
}) {
  const styles = {
    default: 'bg-[#0A1628] text-white',
    success: 'bg-[#0A1628] text-[#E9CE7C] ring-1 ring-inset ring-[#C9A84C]/40',
    whatsapp: 'border border-[#C9A84C]/40 bg-[#FBF7EC] text-[#0A1628]',
    muted: 'border border-gray-200 bg-gray-50 text-gray-600',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
