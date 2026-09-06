import { useState, useEffect, useMemo, useCallback, useRef, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  ChevronDown,
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { PROPERTY_TYPES, PRICE_BUDGET_PRESETS, MAX_LOCALITY_SELECTIONS } from '../data/properties';
import { searchBangaloreAreas } from '@/data/bangaloreAreas';
import { toggleLocalitySelection } from '@/lib/localitySelection';
import {
  filterProperties,
  getMonthlyRentalValue,
  getNumericPrice,
  getPropertyCategory,
  normalizeLocalityList,
  PROPERTY_CATEGORIES,
  resolveLocalityForSearch,
  type PropertyFilterInput,
} from '@/lib/propertyFilters';
import { formatPrice } from '@/lib/formatPrice';
import { matchesMinArea } from '@/lib/smartSearch';
import { usePropertiesFeed } from '@/hooks/usePropertiesFeed';
import { setPageMeta } from '@/lib/siteMeta';
import { Button } from '@/components/ui/liquid-glass-button';
import VJRAIButton from '../components/ai/VJRAIButton';
import SearchBarDropdown from '@/components/properties/SearchBarDropdown';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import {
  fetchBangalorePlacesSuggestions,
  type GooglePlacesSuggestion,
} from '@/lib/googlePlacesSearch';

type SortOption = 'price_asc' | 'price_desc' | 'rental_desc' | 'newest';

const TRENDING_SEARCHES: string[] = [
  'Koramangala',
  'Whitefield',
  'Indiranagar',
  'HSR Layout',
  'Electronic City',
  'Hebbal',
  'Jayanagar',
  'Marathahalli',
  'Bellandur',
  'Sarjapur Road',
  'Yelahanka',
  'Banashankari',
  'BTM Layout',
];

const PRICE_SLIDER_MAX = 100_000_000;
const TOOLBAR_HEIGHT = 44;
/** Properties revealed per batch — scroll or "Show More" reveals all of them. */
const LOAD_MORE_STEP = 20;

const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest First',
  price_asc: 'Price: Low to High',
  price_desc: 'Price: High to Low',
  rental_desc: 'Rental Income: High to Low',
};

const RECENT_SEARCHES_KEY = 'vjr-recent-searches';

function budgetToPriceRange(budget: string): [number, number] {
  const preset = PRICE_BUDGET_PRESETS.find((p) => p.label === budget);
  return preset?.range ?? [0, PRICE_SLIDER_MAX];
}

function formatSliderPrice(value: number): string {
  if (value >= PRICE_SLIDER_MAX) return '10 Cr+';
  if (value === 0) return '₹0';
  return formatPrice(value);
}

function BudgetRangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  format,
  reset,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  format: (v: number) => string;
  reset: () => void;
}) {
  const lo = Math.max(min, Math.min(value[0], max));
  const hi = Math.min(max, Math.max(value[1], min));
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const gap = step * 2;
  const isDefault = lo === min && hi === max;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-[#0A1628] px-3.5 py-1.5 text-[11px] font-semibold text-white">
          {format(lo)} – {format(hi)}
        </span>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 transition hover:text-black"
          >
            Reset
          </button>
        )}
      </div>
      <div className="prop-range">
        <div className="prop-range-track" />
        <div
          className="prop-range-fill"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label="Minimum budget"
          onChange={(e) => onChange([Math.min(Number(e.target.value), hi - gap), hi])}
          className="prop-range-input"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label="Maximum budget"
          onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo + gap)])}
          className="prop-range-input"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-gray-400">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * One dismissal owner for the anchored locality dropdown: taps outside the
 * toolbar (i.e. on the listings below) and the Escape key both close it.
 * Clicks anywhere inside the toolbar/dropdown never close it — the input is
 * inside the same container, so typing cannot trigger close-and-reopen.
 */
function useDropdownDismiss(
  open: boolean,
  close: () => void,
  containerRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: TouchEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, containerRef]);
}

function FilterTypePill({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      className={`prop-type-pill ${checked ? 'prop-type-pill-active' : 'prop-type-pill-idle'}`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-white/30 bg-white/20' : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
      </span>
      <span className="line-clamp-2 leading-snug">{label}</span>
    </button>
);
}

interface PropertyListItem extends PropertyFilterInput {
  id: string;
  title?: string;
  type?: string;
  area?: string;
  location?: string;
  price?: number;
  price_label?: string;
  monthly_rental?: number;
  monthly_rental_label?: string;
  rental_yield?: string;
  area_sqft?: number;
  area_unit?: string;
  area_acres?: number;
  area_guntas?: number;
  price_per_sqft?: number;
  total_units?: number;
  plot_subtype?: string;
  facing?: string;
  description?: string;
  highlights?: string[];
  amenities?: string[];
  katha?: string;
  featured?: boolean;
  listed_days_ago?: number;
  createdAt?: Record<string, unknown> | string | number | Date;
  images?: string[];
}

export default function PropertiesPage() {
  const [searchParams] = useSearchParams();
  const { properties: feed, loading } = usePropertiesFeed();
  const properties = feed as unknown as PropertyListItem[];
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, PRICE_SLIDER_MAX]);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [visibleCount, setVisibleCount] = useState(LOAD_MORE_STEP);
  const [searchQuery, setSearchQuery] = useState('');
  const [minAreaSqft, setMinAreaSqft] = useState<number | null>(null);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlacesSuggestion[]>([]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [navbarHidden, setNavbarHidden] = useState(false);
  const [localityNotice, setLocalityNotice] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [toolbarHeight, setToolbarHeight] = useState(TOOLBAR_HEIGHT);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );

  const sortRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  useDropdownDismiss(searchOpen, closeSearch, toolbarRef);
  const listingsRef = useRef<HTMLDivElement>(null);

  const { isLoaded: mapsLoaded, requestMaps } = useGoogleMapsLoader();

  // Performance: the Maps SDK is deferred app-wide. Request it only when
  // the locality search opens, so Places suggestions keep working without
  // loading the SDK during the initial page render.
  useEffect(() => {
    if (searchOpen && !mapsLoaded) requestMaps();
  }, [searchOpen, mapsLoaded, requestMaps]);

  useEffect(() => {
    setPageMeta(
      'Rental Income Properties for Sale in Bangalore | VJR Estate',
      'Browse curated PG buildings, residential rental buildings and commercial properties in Bangalore with monthly income data. Rental income specialists for Bangalore.',
    );
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      const types = typeParam.split(',').map((t) => t.trim());
      const valid = types.filter((t) => PROPERTY_TYPES.includes(t));
      if (valid.length > 0) setSelectedTypes(valid);
    }

    const areaParams = [
      ...searchParams.getAll('area'),
      ...(searchParams.get('location') ? [searchParams.get('location')!] : []),
    ].filter(Boolean);
    if (areaParams.length > 0) {
      setSelectedLocations(
        normalizeLocalityList(areaParams).slice(0, MAX_LOCALITY_SELECTIONS),
      );
    }

    const budgetParam = searchParams.get('budget');
    if (budgetParam) setPriceRange(budgetToPriceRange(budgetParam));
  }, [searchParams]);

  useEffect(() => {
    // Only the desktop sort dropdown needs outside-click dismissal. The
    // locality search is a modal panel that owns its own dismissal (backdrop,
    // X button, Done) — closing it here on any document tap re-opened the
    // panel on top of itself, producing the duplicate-popup bug.
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!isMobile && sortRef.current && !sortRef.current.contains(target)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen || (sortOpen && isMobile) ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [filtersOpen, sortOpen, isMobile]);

  useEffect(() => {
    // The header is hidden on scroll only on mobile; on desktop it stays
    // pinned, so the toolbar must never jump up over it.
    let prev = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setNavbarHidden(isMobile && y > 120 && y > prev);
      prev = y;
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const updateHeight = () => setToolbarHeight(el.getBoundingClientRect().height);
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [searchOpen, sortOpen, selectedTypes.length, searchQuery, priceRange, minAreaSqft]);

  const filteredProperties = useMemo(() => {
    let filtered = filterProperties(properties, {
      types: selectedTypes,
      localities: selectedLocations,
      priceRange,
    });
    if (minAreaSqft) {
      filtered = filtered.filter((p) => matchesMinArea(p, minAreaSqft));
    }
    const sorted = [...filtered];
    const categoryIndex = (p: PropertyListItem) => {
      const cat = getPropertyCategory(p);
      const idx = PROPERTY_CATEGORIES.indexOf(cat as (typeof PROPERTY_CATEGORIES)[number]);
      return idx >= 0 ? idx : PROPERTY_CATEGORIES.length;
    };
    switch (sortBy) {
      case 'price_asc':
        sorted.sort((a, b) => {
          const byCat = categoryIndex(a) - categoryIndex(b);
          return byCat !== 0 ? byCat : getNumericPrice(a.price) - getNumericPrice(b.price);
        });
        break;
      case 'price_desc':
        sorted.sort((a, b) => {
          const byCat = categoryIndex(a) - categoryIndex(b);
          return byCat !== 0 ? byCat : getNumericPrice(b.price) - getNumericPrice(a.price);
        });
        break;
      case 'rental_desc':
        sorted.sort((a, b) => {
          const byCat = categoryIndex(a) - categoryIndex(b);
          if (byCat !== 0) return byCat;
          return getMonthlyRentalValue(b) - getMonthlyRentalValue(a);
        });
        break;
      case 'newest':
        // Feed is already sorted newest-first once at fetch time, and
        // filterProperties preserves order — no per-comparison date parsing.
        return filtered;
    }
    return sorted;
  }, [properties, selectedTypes, selectedLocations, priceRange, sortBy, minAreaSqft]);

  const showCategoryHeaders = selectedTypes.length !== 1;

  // Progressive reveal — starts with one batch, then grows on scroll /
  // "Show More" until every filtered property is on the page.
  const visibleProperties = useMemo(
    () => filteredProperties.slice(0, visibleCount),
    [filteredProperties, visibleCount],
  );

  const hasMore = visibleCount < filteredProperties.length;

  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(filteredProperties.length, c + LOAD_MORE_STEP));
  }, [filteredProperties.length]);

  useEffect(() => {
    setVisibleCount(LOAD_MORE_STEP);
  }, [selectedTypes, selectedLocations, priceRange, sortBy, minAreaSqft]);

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const clearAllFilters = () => {
    setSelectedTypes([]);
    setPriceRange([0, PRICE_SLIDER_MAX]);
    setMinAreaSqft(null);
  };

  const clearEverything = () => {
    clearAllFilters();
    setSelectedLocations([]);
    setSearchQuery('');
    setLocalityNotice('');
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) => {
      const { next, limited } = toggleLocalitySelection(prev, location);
      if (limited) {
        setLocalityNotice(`You can select up to ${MAX_LOCALITY_SELECTIONS} localities`);
        window.setTimeout(() => setLocalityNotice(''), 2800);
      }
      return next;
    });
  };


  // Google Places suggestions — covers every Bangalore locality A–Z, including
  // areas missing from the static list, so no location is ever left out.
  useEffect(() => {
    if (!searchOpen || !searchQuery.trim() || !mapsLoaded) {
      setGooglePlaces([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await fetchBangalorePlacesSuggestions(searchQuery);
      if (!cancelled) setGooglePlaces(results);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchOpen, mapsLoaded]);


  const isDefaultPrice = priceRange[0] === 0 && priceRange[1] === PRICE_SLIDER_MAX;

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    !isDefaultPrice ||
    minAreaSqft != null;

  const localitySlotsLeft = MAX_LOCALITY_SELECTIONS - selectedLocations.length;

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => {
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, 5);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeRecentSearch = (term: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((s) => s !== term);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  };

  /** Live suggestions for the typed query — static area list first, then Google extras. */
  const searchSuggestions = useMemo(() => {
    if (!searchOpen || !searchQuery.trim()) return [];
    const matches = searchBangaloreAreas(searchQuery, 40).map((a) => a.name);
    const known = new Set(matches.map((m) => m.toLowerCase()));
    const extras = googlePlaces
      .map((g) => g.locality)
      .filter((s) => !known.has(s.toLowerCase()));
    return [...matches, ...extras];
  }, [searchOpen, searchQuery, googlePlaces]);

  const handleSearchSubmit = () => {
    const resolved = resolveLocalityForSearch(searchQuery);
    if (resolved) {
      toggleLocation(resolved);
      saveRecentSearch(resolved);
    } else if (searchSuggestions[0]) {
      // Any Bangalore area the static list or Google knows about.
      toggleLocation(searchSuggestions[0]);
      saveRecentSearch(searchSuggestions[0]);
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  const filtersPanelContent = (
    <div className="space-y-4 sm:space-y-5">
      <div className="prop-filter-section">
        <h3 className="prop-filter-section-title">Property Type</h3>
        <div className="prop-type-grid">
          {PROPERTY_TYPES.map((type) => (
            <FilterTypePill
              key={type}
              checked={selectedTypes.includes(type)}
              onChange={() => toggleType(type)}
              label={type}
            />
          ))}
        </div>
      </div>

      <div className="prop-filter-section">
        <h3 className="prop-filter-section-title mb-4">Budget</h3>
        <BudgetRangeSlider
          min={0}
          max={PRICE_SLIDER_MAX}
          step={1_000_000}
          value={priceRange}
          onChange={setPriceRange}
          format={formatSliderPrice}
          reset={() => setPriceRange([0, PRICE_SLIDER_MAX])}
        />
      </div>
    </div>
  );

  const activeFilterChips: { key: string; label: string; onRemove: () => void }[] = [];
  selectedTypes.forEach((type) => {
    activeFilterChips.push({
      key: `type-${type}`,
      label: type,
      onRemove: () => toggleType(type),
    });
  });
  if (!isDefaultPrice) {
    activeFilterChips.push({
      key: 'price',
      label: `${formatSliderPrice(priceRange[0])} – ${formatSliderPrice(priceRange[1])}`,
      onRemove: () => setPriceRange([0, PRICE_SLIDER_MAX]),
    });
  }
  if (minAreaSqft) {
    activeFilterChips.push({
      key: 'area',
      label: `${minAreaSqft.toLocaleString('en-IN')}+ sq.ft`,
      onRemove: () => setMinAreaSqft(null),
    });
  }

  const sortSheet = (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-[2px]"
        onClick={() => setSortOpen(false)}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="prop-sheet z-[120]"
      >
        <div className="prop-sheet-handle" />
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <p className="properties-toolbar-heading text-sm font-medium text-black">Sort By</p>
          <button type="button" onClick={() => setSortOpen(false)} aria-label="Close sort">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="overflow-y-auto p-2">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setSortBy(option);
                setSortOpen(false);
              }}
              className={`flex min-h-[48px] w-full items-center justify-between rounded-xl px-4 py-3 text-left text-[15px] transition ${
                sortBy === option ? 'bg-[#0A1628] font-medium text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {SORT_LABELS[option]}
              {sortBy === option && <Check size={16} />}
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );

  return (
    <div className="properties-toolbar min-h-screen bg-[#fafafa] pt-12 md:pt-14">
      <div
        ref={toolbarRef}
        className={`fixed inset-x-0 z-[90] border-b border-gray-200/90 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg transition-all duration-300 ${
          navbarHidden ? 'top-0' : 'top-12 md:top-14'
        }`}
      >
        <div className="mx-auto flex w-full items-center gap-1.5 px-4 py-2 sm:gap-2 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          {/* The search bar IS the input — suggestions expand beneath it.
              Entire bar (input + chips + button) sits inside toolbarRef, so
              taps while typing can never dismiss the dropdown. */}
          <div className="relative min-w-0 flex-1">
            <div
              className={`prop-searchbar group ${
                searchOpen ? 'prop-searchbar-open' : ''
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  searchOpen ? 'bg-[#C9A84C]/15 text-[#C9A84C]' : 'bg-[#0A1628] text-[#C9A84C]'
                } transition-colors duration-200 group-hover:bg-[#1E3852]`}
              >
                <Search size={15} />
              </span>

              {selectedLocations.length > 0 ? (
                <span className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {selectedLocations.map((loc) => (
                    <span key={loc} className="prop-loc-chip">
                      <span className="max-w-[5rem] truncate sm:max-w-[6rem]">{loc}</span>
                      <button
                        type="button"
                        onClick={() => toggleLocation(loc)}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-white/25"
                        aria-label={`Remove ${loc}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </span>
              ) : null}

              <input
                ref={searchInputRef}
                type="text"
                autoComplete="off"
                enterKeyHint="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!searchOpen) setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchSubmit();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    if (searchQuery) setSearchQuery('');
                    else setSearchOpen(false);
                  }
                }}
                aria-label="Search Bangalore localities"
                placeholder="Search any Bangalore area…"
                className="min-w-[6rem] flex-1 min-h-[44px] border-0 bg-transparent text-[13.5px] font-medium text-[#0A1628] outline-none placeholder:text-gray-400 sm:text-[14.5px]"
              />

              {searchQuery ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={14} />
                </button>
              ) : (
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-gray-300 transition-transform duration-200 ${
                    searchOpen ? 'rotate-180 text-[#C9A84C]' : 'group-hover:text-[#C9A84C]'
                  }`}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFiltersOpen(true);
              setSortOpen(false);
              setSearchOpen(false);
            }}
            className="prop-tool-btn-icon lg:hidden"
            aria-label="Open filters"
          >
            <SlidersHorizontal size={16} />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0A1628] px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {activeFilterChips.length}
              </span>
            )}
          </button>

          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setSortOpen((o) => !o);
                setSearchOpen(false);
              }}
              className="prop-tool-btn-icon"
              aria-label="Sort properties"
              aria-expanded={sortOpen}
            >
              <ArrowUpDown size={16} />
              <span className="hidden sm:inline">Sort</span>
            </button>

            <AnimatePresence>
              {sortOpen && !isMobile && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setSortOpen(false);
                      }}
                      className={`flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left text-[14px] transition ${
                        sortBy === option ? 'bg-[#0A1628] font-medium text-white' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {SORT_LABELS[option]}
                      {sortBy === option && <Check size={16} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Locality suggestions — anchored directly beneath the search bar.
            No second input here: the bar above is the one and only search bar. */}
        <SearchBarDropdown
          open={searchOpen}
          onClose={closeSearch}
          selected={selectedLocations}
          onToggle={toggleLocation}
          notice={localityNotice}
          trending={TRENDING_SEARCHES}
          recentSearches={recentSearches}
          onRemoveRecent={removeRecentSearch}
          slotsLeft={localitySlotsLeft}
          suggestions={searchSuggestions}
          onSelectExtra={(loc) => {
            toggleLocation(loc);
            saveRecentSearch(loc);
          }}
        />
      </div>

      {/* Spacer for fixed toolbar (includes expanded search panel height) */}
      <div aria-hidden style={{ height: toolbarHeight }} className="shrink-0" />

      {/* Filters panel — mobile/tablet only; desktop uses sidebar */}
      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] lg:hidden"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="prop-sheet z-[110] lg:hidden"
            >
              <div className="prop-sheet-handle lg:hidden" />
              <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
                <p className="properties-toolbar-heading text-base font-medium text-black">Filters</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-sm font-semibold uppercase tracking-wide text-gray-500 hover:text-black"
                  >
                    Clear All
                  </button>
                  <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                    <X size={20} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{filtersPanelContent}</div>

              <div className="shrink-0 border-t border-gray-100 p-4 sm:p-5">
                <button type="button" onClick={() => setFiltersOpen(false)} className="prop-apply-btn">
                  Show {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile sort sheet */}
      <AnimatePresence>{sortOpen && isMobile && sortSheet}</AnimatePresence>

      {/* Listings */}
      <div ref={listingsRef} className="w-full scroll-mt-24 px-4 py-6 sm:px-6 md:px-8 lg:px-12 xl:px-16">
        <div className="flex gap-6 lg:items-start">
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <p className="properties-toolbar-heading mb-4 text-sm font-medium text-black">Filters</p>
            {filtersPanelContent}
          </aside>

          <main className="min-w-0 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[12px] text-gray-400">{SORT_LABELS[sortBy]}</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 2xl:grid-cols-3 lg:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="aspect-[16/9] bg-gray-200" />
                <div className="space-y-2 p-4">
                  <div className="h-3 w-4/5 rounded bg-gray-200" />
                  <div className="h-2.5 w-1/2 rounded bg-gray-100" />
                  <div className="h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-8 rounded-xl bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProperties.length > 0 ? (
          <>
            {showCategoryHeaders ? (
              <div className="space-y-10">
                {PROPERTY_CATEGORIES.map((category) => {
                  const items = visibleProperties.filter(
                    (p) => getPropertyCategory(p) === category,
                  );
                  if (items.length === 0) return null;
                  return (
                    <section key={category}>
                      <h2 className="properties-toolbar-heading mb-4 border-b border-gray-200 pb-3 text-lg font-medium text-black md:text-xl">
                        {category}
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          ({items.length})
                        </span>
                      </h2>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 2xl:grid-cols-3 lg:gap-6">
                        {items.map((property, index) => (
                          <motion.div
                            key={property.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.05 }}
                            className="h-full"
                          >
                            <PropertyCard property={property as never} index={index} listing />
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 2xl:grid-cols-3 lg:gap-6">
                {visibleProperties.map((property, index) => (
                  <motion.div
                    key={property.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="h-full"
                  >
                    <PropertyCard property={property as never} index={index} listing />
                  </motion.div>
                ))}
              </div>
            )}

            {hasMore && (
              <div className="mt-10 flex flex-col items-center gap-3">
                <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                <p className="text-[12px] text-gray-400">
                  Showing {visibleProperties.length} of {filteredProperties.length}{' '}
                  {filteredProperties.length === 1 ? 'property' : 'properties'}
                </p>
                <Button
                  type="button"
                  onClick={loadMore}
                  variant="default"
                  className="h-auto px-8 py-3 text-[13px] uppercase tracking-[0.1em]"
                >
                  Show More Properties
                </Button>
              </div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-200 bg-white py-16 text-center"
          >
            <p className="mb-5 text-[16px] text-gray-400">No properties match your filters.</p>
            <Button
              onClick={clearEverything}
              variant="default"
              className="h-auto px-6 py-3 text-[13px] uppercase tracking-[0.1em]"
            >
              Clear All
            </Button>
          </motion.div>
        )}
          </main>
        </div>
      </div>

      {/* Inline locality search dropdown — anchored to the toolbar like housing.com */}

      <VJRAIButton userRole="public" />
    </div>
  );
}
