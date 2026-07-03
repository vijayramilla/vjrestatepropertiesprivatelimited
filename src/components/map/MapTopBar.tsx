import { SlidersHorizontal, Navigation, Loader2 } from 'lucide-react';
import { LAND_TYPES, type BudgetFilter } from '@/data/mapConfig';

interface MapTopBarProps {
  onLocateMe: () => void;
  onOpenFilters: () => void;
  activeBudget: BudgetFilter;
  activeCategories: string[];
  isLocating?: boolean;
}

export default function MapTopBar({
  onLocateMe,
  onOpenFilters,
  activeBudget,
  activeCategories,
  isLocating = false,
}: MapTopBarProps) {
  const activeFilterCount =
    (activeBudget.label !== 'All Budgets' ? 1 : 0) +
    (activeCategories.length > 0 && activeCategories.length < LAND_TYPES.length
      ? 1
      : 0);

  return (
    <>
      <button
        type="button"
        onClick={onLocateMe}
        disabled={isLocating}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-500 shadow-lg transition-colors hover:bg-blue-600 disabled:opacity-70 disabled:cursor-wait"
        aria-label="Locate me"
      >
        {isLocating ? (
          <Loader2 size={16} className="text-white animate-spin" />
        ) : (
          <Navigation size={16} className="text-white" />
        )}
      </button>

      <button
        type="button"
        onClick={onOpenFilters}
        className="relative flex shrink-0 items-center gap-2 rounded-full border border-gray-700 bg-black px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white shadow-lg transition-all hover:bg-gray-900"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
            {activeFilterCount}
          </span>
        )}
      </button>
    </>
  );
}
