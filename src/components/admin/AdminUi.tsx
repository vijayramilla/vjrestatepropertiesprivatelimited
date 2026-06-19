import type { ReactNode } from 'react';

export function AdminPageShell({ children }: { children: ReactNode }) {
  return <div className="px-3 py-5 sm:px-8 sm:py-8">{children}</div>;
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
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 sm:text-xs">
          {eyebrow}
        </p>
      )}
      <h1 className="admin-heading mt-1 text-2xl font-medium text-black sm:text-3xl">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{description}</p>
      )}
    </header>
  );
}

export function AdminStatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card group p-4 transition-shadow duration-200 hover:shadow-md hover:shadow-black/10 sm:p-5">
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value mt-2">{value}</p>
      <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-black to-gray-400 opacity-60 transition-all group-hover:w-12" />
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
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <p className="admin-heading text-xl text-black">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function AdminSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="admin-card h-24 animate-pulse bg-gray-100 sm:h-28" />
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
    default: 'bg-black text-white',
    success: 'border border-black bg-black text-white',
    whatsapp: 'border border-gray-400 bg-white text-gray-800',
    muted: 'border border-gray-200 bg-gray-50 text-gray-700',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[variant]}`}
    >
      {children}
    </span>
  );
}
