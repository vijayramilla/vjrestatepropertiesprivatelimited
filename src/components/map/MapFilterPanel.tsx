import { useState, useEffect, useCallback } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { Check, SlidersHorizontal, X } from 'lucide-react';
import { BUDGET_FILTERS, CATEGORY_CONFIG, LAND_TYPES, type BudgetFilter } from '@/data/mapConfig';
import GlassCard from '@/components/ui/glass-card';

interface MapFilterPanelProps {
  open: boolean;
  onClose: () => void;
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  activeBudget: BudgetFilter;
  onSelectBudget: (budget: BudgetFilter) => void;
  onClearAll: () => void;
  resultCount: number;
}

export default function MapFilterPanel({
  open,
  onClose,
  activeCategories,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  activeBudget,
  onSelectBudget,
  onClearAll,
  resultCount,
}: MapFilterPanelProps) {
  const allSelected = activeCategories.length === LAND_TYPES.length;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSheetDragEnd = useCallback(
    (_: React.ComponentType<unknown>, info: PanInfo) => {
      if (info.offset.y > 100 || info.velocity.y > 500) {
        onClose();
      }
    },
    [onClose],
  );

  const filterHeader = (
    <div className="relative flex items-center justify-between px-6 pt-5 pb-4">
      <div className="flex items-center gap-3">
        <GlassCard compact className="!p-2">
          <SlidersHorizontal size={14} className="text-gray-700" />
        </GlassCard>
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Filters</h2>
          <p className="text-[11px] text-gray-400">Refine your search</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs font-medium text-gray-400 underline-offset-2 transition-colors hover:text-gray-800 hover:underline"
        >
          Clear All
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close filters"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );

  const filterCategories = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
          Property Type
        </p>
        <button
          type="button"
          onClick={allSelected ? onDeselectAllCategories : onSelectAllCategories}
          className="text-[11px] font-semibold text-black underline-offset-2 transition-colors hover:underline"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {LAND_TYPES.map((name) => {
          const config = CATEGORY_CONFIG[name];
          const active = activeCategories.includes(name);
          return (
            <button
              key={name}
              type="button"
              onClick={() => onToggleCategory(name)}
              className={`group relative flex items-center gap-3 rounded-2xl border p-3.5 text-left text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                active
                  ? 'shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl'
                  : 'border-slate-200/60 bg-white/60 text-gray-500 hover:border-slate-300 hover:bg-white/80 hover:text-gray-700'
              }`}
            >
              {active && (
                <div
                  className="absolute inset-0 rounded-2xl opacity-10 pointer-events-none"
                  style={{ backgroundColor: config.color }}
                />
              )}
              {active && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{
                    border: `1.5px solid ${config.color}`,
                    boxShadow: `0 0 0 1px ${config.color}15`,
                  }}
                />
              )}
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-full transition-transform duration-200 ${
                  active ? 'scale-110' : ''
                }`}
                style={{ backgroundColor: config.color }}
              />
              <span className="flex-1 text-xs leading-tight font-medium">{config.label}</span>
              {active && (
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: config.color }}
                >
                  <Check size={10} className="text-white" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  const filterBudget = (
    <div>
      <p className="mb-3 text-[11px] font-bold tracking-wider text-gray-500 uppercase">
        Budget
      </p>
      <div className="flex flex-wrap gap-2">
        {BUDGET_FILTERS.map((budget) => {
          const isActive = activeBudget.label === budget.label;
          return (
            <button
              key={budget.label}
              type="button"
              onClick={() => onSelectBudget(budget)}
              className={`rounded-xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-black text-white border-black shadow-[0_4px_16px_rgba(0,0,0,0.15)]'
                  : 'border-slate-200/60 bg-white/60 text-gray-600 shadow-sm backdrop-blur-sm hover:border-slate-300 hover:bg-white/80'
              }`}
            >
              {budget.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const filterBottomBar = (
    <div className="border-t border-slate-200/60 bg-white/50 backdrop-blur-sm px-6 py-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0.5rem))' }}>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClearAll}
          className="flex h-12 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-sm px-5 text-sm font-medium text-gray-500 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:text-gray-700 active:scale-[0.98]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-black text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-gray-800 active:scale-[0.98]"
        >
          <span>Show {resultCount.toLocaleString('en-IN')}</span>
          <span className="text-gray-400">{resultCount === 1 ? 'Property' : 'Properties'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-0 top-14 bottom-0 z-[90] bg-black/40 backdrop-blur-sm md:top-16"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {isMobile ? (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: open ? 0 : '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 300 }}
          dragElastic={{ top: 0, bottom: 0.5 }}
          onDragEnd={handleSheetDragEnd}
          className="fixed bottom-0 left-0 right-0 z-[100] flex max-h-[85dvh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-4px_60px_rgba(15,23,42,0.15)]"
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
        >
          <div className="flex justify-center pt-2 pb-1 shrink-0">
            <div className="h-1.5 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="flex items-center justify-between px-6 pt-1 pb-4">
            <div className="flex items-center gap-3">
              <GlassCard compact className="!p-2">
                <SlidersHorizontal size={14} className="text-gray-700" />
              </GlassCard>
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">Filters</h2>
                <p className="text-[11px] text-gray-400">Refine your search</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close filters"
            >
              <X size={15} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4">
            {filterCategories}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            {filterBudget}
          </div>

          {filterBottomBar}
        </motion.div>
      ) : (
        <div
          className={`fixed top-14 bottom-0 left-0 z-[100] flex w-[min(100vw,400px)] flex-col bg-white/95 backdrop-blur-xl border-r border-slate-200/80 shadow-[0_20px_60px_rgba(15,23,42,0.15)] transition-transform duration-300 ease-out md:top-16 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent before:pointer-events-none ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          aria-hidden={!open}
        >
          {filterHeader}

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 pb-4">
            {filterCategories}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            {filterBudget}
          </div>

          {filterBottomBar}
        </div>
      )}
    </>
  );
}
