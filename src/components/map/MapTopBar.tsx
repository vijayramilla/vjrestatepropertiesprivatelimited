import { useState } from 'react';
import { List, SlidersHorizontal } from 'lucide-react';
import { CATEGORY_CONFIG, LAND_TYPES, type BudgetFilter } from '@/data/mapConfig';
import MapPlacesSearch from '@/components/map/MapPlacesSearch';

interface MapTopBarProps {
  searchValue: string;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  onLocateMe: () => void;
  onSearchClear: () => void;
  onSearchInputChange: (value: string) => void;
  onOpenFilters: () => void;
  onToggleList: () => void;
  isListOpen: boolean;
  activeBudget: BudgetFilter;
  activeCategories: string[];
  onToggleCategory: (name: string) => void;
}

export default function MapTopBar({
  searchValue,
  onPlaceSelected,
  onLocateMe,
  onSearchClear,
  onSearchInputChange,
  onOpenFilters,
  onToggleList,
  isListOpen,
  activeBudget,
  activeCategories,
  onToggleCategory,
}: MapTopBarProps) {
  const [searchFocused, setSearchFocused] = useState(false);
  const activeFilterCount =
    (activeBudget.label !== 'All Budgets' ? 1 : 0) +
    (activeCategories.length > 0 && activeCategories.length < LAND_TYPES.length
      ? 1
      : 0);

  return (
    <div
      className={`pointer-events-none absolute top-4 right-4 z-[110] flex flex-col items-start gap-3 overflow-visible transition-[left] duration-300 ${
        isListOpen ? 'left-[calc(min(100vw,380px)+1rem)]' : 'left-4'
      }`}
    >
      <div className="pointer-events-auto flex w-full items-center gap-2 overflow-visible">
        <MapPlacesSearch
          value={searchValue}
          onPlaceSelected={onPlaceSelected}
          onLocateMe={onLocateMe}
          onClear={onSearchClear}
          onInputChange={onSearchInputChange}
          onFocusChange={setSearchFocused}
        />

        <button
          type="button"
          onClick={onToggleList}
          className={`relative flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold whitespace-nowrap shadow-lg transition-all hover:shadow-xl ${
            isListOpen
              ? 'border-black bg-black text-white'
              : 'border-gray-100 bg-white text-gray-700'
          }`}
        >
          <List size={16} />
          List
        </button>

        <button
          type="button"
          onClick={onOpenFilters}
          className="relative flex shrink-0 items-center gap-2 rounded-full border border-gray-100 bg-white px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-gray-700 shadow-lg transition-all hover:shadow-xl"
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {!searchFocused && (
      <div className="pointer-events-auto relative z-[40] flex max-w-full items-center gap-2 overflow-x-auto pb-1">
        {LAND_TYPES.map((type) => {
          const isActive = activeCategories.includes(type);
          const config = CATEGORY_CONFIG[type];
          return (
            <button
              key={type}
              type="button"
              onClick={() => onToggleCategory(type)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap shadow-md transition-all duration-200"
              style={
                isActive
                  ? {
                      backgroundColor: config.color,
                      color: '#fff',
                      boxShadow: `0 4px 12px ${config.color}66`,
                    }
                  : {
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      color: '#6b7280',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }
              }
            >
              {config.label}
              {isActive && <span className="ml-1 opacity-70">×</span>}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}
