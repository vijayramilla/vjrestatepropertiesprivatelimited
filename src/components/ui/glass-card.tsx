import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  compact?: boolean;
  interactive?: boolean;
  as?: 'div' | 'button' | 'a';
  onClick?: () => void;
  href?: string;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(function GlassCard(
  { children, className = '', glow = false, compact = false, interactive = false, onClick, href, as: Component = 'div' },
  ref,
) {
  const classes = cn(
    'relative rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl',
    'shadow-[0_8px_32px_rgba(15,23,42,0.06)]',
    'before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent',
    compact ? 'p-3' : 'p-4',
    glow ? 'shadow-[0_8px_32px_rgba(15,23,42,0.06),0_0_60px_-15px_rgba(15,23,42,0.10)]' : '',
    interactive
      ? 'transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-[0_12px_40px_rgba(15,23,42,0.10)] cursor-pointer'
      : '',
    className,
  );

  if (Component === 'button') {
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type="button"
        className={classes}
        onClick={onClick}
      >
        {children}
      </button>
    );
  }

  if (Component === 'a' && href) {
    return (
      <a ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  return (
    <div ref={ref} className={classes}>
      {children}
    </div>
  );
});

GlassCard.displayName = 'GlassCard';
export default GlassCard;
