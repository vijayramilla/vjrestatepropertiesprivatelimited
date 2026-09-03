import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';

/* ────────────────────────────────────────────────────────────────────────────
   VJR CRM — Platinum design system
   Palette: ink navy #0A1628 (authority), gold #C9A84C (premium brand accent),
   emerald (money), warm neutrals. Inter for UI and display (Salesforce Sans-style).
   Mobile-first: all motion is GPU-friendly and disabled below lg breakpoint
   so phones stay 60fps.
   ──────────────────────────────────────────────────────────────────────────── */

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/** Entrance reveal — animated only on desktop, plain on mobile (lag-free). */
export function MotionReveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Premium page body — warm canvas, fluid padding per device. */
export function CrmPageBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1600px] px-4 pb-6 pt-[74px] sm:px-6 lg:px-8 lg:py-8">{children}</div>;
}

export function CrmPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A3842E]">
            <span className="h-px w-6 bg-gradient-to-r from-[#C9A84C] to-transparent" />
            {eyebrow}
          </p>
        )}
        <h1 className="m-0 font-['Inter',sans-serif] text-[24px] font-semibold tracking-tight text-[#0A1628] sm:text-[30px] lg:text-[32px]">
          {title}
        </h1>
        {description && <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b7280] sm:text-[13.5px]">{description}</p>}
      </div>
      {actions && <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">{actions}</div>}
    </div>
  );
}

export function CrmCard({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] ${onClick ? 'cursor-pointer transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(10,22,40,0.08)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

const TONE_ICON: Record<string, string> = {
  navy: 'bg-[#0A1628]/[0.06] text-[#0A1628]',
  gold: 'bg-[#C9A84C]/[0.14] text-[#96782A]',
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  purple: 'bg-purple-50 text-purple-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-500',
};

export function CrmStatCard({
  icon,
  label,
  value,
  subtext,
  tone = 'navy',
  accent = true,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  tone?: keyof typeof TONE_ICON;
  accent?: boolean;
}) {
  return (
    <CrmCard className="group relative overflow-hidden p-4 sm:p-5">
      {accent && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#C9A84C] via-[#D6B85D] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_ICON[tone]}`}>{icon}</div>
        {subtext && <span className="text-[10px] font-semibold text-[#9ca3af]">{subtext}</span>}
      </div>
      <p className="mt-3 font-['Inter',sans-serif] text-[22px] font-bold leading-none tracking-tight text-[#0A1628] tabular-nums sm:text-[26px]">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] font-medium text-[#6b7280]">{label}</p>
      <div className="mt-3 h-0.5 w-8 rounded-full bg-gradient-to-r from-[#C9A84C] to-[#D6B85D]/40 transition-all duration-300 group-hover:w-14" />
    </CrmCard>
  );
}

export function CrmStatGrid({ children }: { children: ReactNode }) {
  return <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">{children}</div>;
}

type CrmBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'danger' };

export function CrmBtn({ variant = 'primary', className = '', children, ...rest }: CrmBtnProps) {
  const styles: Record<string, string> = {
    primary: 'bg-[#0A1628] text-white hover:bg-[#1E3852] shadow-sm',
    gold: 'bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] text-[#0A1628] hover:brightness-[1.05] shadow-[0_2px_8px_rgba(201,168,76,0.35)]',
    ghost: 'border border-black/10 bg-white text-[#4b5563] hover:bg-black/[0.03] hover:text-[#0A1628]',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
  };
  return (
    <button
      type="button"
      className={`inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CrmChip({
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
      className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${
        active
          ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]'
          : 'border-black/10 bg-white text-[#6b7280] hover:bg-black/[0.03]'
      }`}
    >
      {children}
    </button>
  );
}

export function CrmBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {children}
    </span>
  );
}

/** Input/select styling shared across CRM pages. */
export const CRM_INPUT = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-[#0A1628] outline-none transition-colors focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20';
