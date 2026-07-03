import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PremiumButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function PremiumButton({ onClick, disabled, loading, children, className }: PremiumButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className={cn(
        'relative overflow-hidden rounded-xl px-6 py-3 text-sm font-bold text-white transition-all duration-300',
        'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
        'hover:shadow-[0_0_30px_rgba(0,0,0,0.3)] hover:scale-[1.02]',
        'active:scale-[0.98] active:shadow-inner',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
        className,
      )}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Shine overlay */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-300',
          hovered ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(255,255,255,0.15), transparent 40%)`,
        }}
      />

      {/* Top border shine */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

      {/* Animated shimmer line */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent',
          'transition-all duration-700',
          hovered ? 'translate-x-full' : '-translate-x-full',
        )}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)' }}
      />

      {/* Border glow */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 rounded-xl transition-opacity duration-500',
          'ring-1 ring-inset ring-white/20',
          hovered ? 'ring-gray-400/50' : 'ring-white/20',
        )}
      />

      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>Valuating...</>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
