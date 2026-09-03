import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  Clock,
  MapPin,
  TrendingUp,
  Sparkles,
  Building2,
  IndianRupee,
  Ruler,
} from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { BANGALORE_AREAS, PROPERTY_TYPES, filterLocalities, PRICE_BUDGET_PRESETS, RENTAL_BUDGET_PRESETS, MAX_LOCALITY_SELECTIONS, UNLIMITED_FILTER_MAX } from '../data/properties';
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
import {
  parseSmartQuery,
  matchesMinArea,
  priceRangeLabel,
  rentalRangeLabel,
} from '@/lib/smartSearch';
import { usePropertiesFeed } from '@/hooks/usePropertiesFeed';
import { Button } from '@/components/ui/liquid-glass-button';
import VJRAIButton from '../components/ai/VJRAIButton';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import {
  fetchBangalorePlacesSuggestions,
  type GooglePlacesSuggestion,
} from '@/lib/googlePlacesSearch';

type SortOption = 'price_asc' | 'price_desc' | 'rental_desc' | 'newest';
type BudgetMode = 'price' | 'rental';

type TrendingItem = { label: string };

const TRENDING_SEARCHES: TrendingItem[] = [
  { label: 'Koramangala' },
  { label: 'Whitefield' },
  { label: 'Indiranagar' },
  { label: 'HSR Layout' },
  { label: 'Electronic City' },
  { label: 'Hebbal' },
  { label: 'Jayanagar' },
  { label: 'Marathahalli' },
  { label: 'Bellandur' },
  { label: 'Sarjapur Road' },
  { label: 'Yelahanka' },
  { label: 'Banashankari' },
  { label: 'BTM Layout' },
];

const PRICE_SLIDER_MAX = 100_000_000;
const RENTAL_SLIDER_MAX = 500_000;
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

const SMART_EXAMPLES = [
  'PG building in Whitefield under ₹2 Cr',
  'Commercial property near Electronic City',
  'Rental income above ₹50K',
  '1500 sq ft in HSR Layout',
];

function budgetToPriceRange(budget: string): [number, number] {
  const preset = PRICE_BUDGET_PRESETS.find((p) => p.label === budget);
  return preset?.range ?? [0, PRICE_SLIDER_MAX];
}

function formatRental(value: number): string {
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(value % 100_000 === 0 ? 0 : 1)}L`;
  if (value >= 1_000) return `₹${Math.round(value / 1_000)}K`;
  return `₹${value.toLocaleString('en-IN')}`;
}

function highlightMatch(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-gray-900">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
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
  const [rentalRange, setRentalRange] = useState<[number, number]>([0, UNLIMITED_FILTER_MAX]);
  const [budgetMode, setBudgetMode] = useState<BudgetMode>('price');
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
  const listingsRef = useRef<HTMLDivElement>(null);

  const { isLoaded: mapsLoaded } = useGoogleMapsLoader();

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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!isMobile && sortRef.current && !sortRef.current.contains(target)) setSortOpen(false);
      if (toolbarRef.current && !toolbarRef.current.contains(target)) setSearchOpen(false);
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
  }, [searchOpen, sortOpen, selectedTypes.length, searchQuery, priceRange, rentalRange, minAreaSqft]);

  const filteredProperties = useMemo(() => {
    let filtered = filterProperties(properties, {
      types: selectedTypes,
      localities: selectedLocations,
      priceRange,
      rentalRange,
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
  }, [properties, selectedTypes, selectedLocations, priceRange, rentalRange, sortBy, minAreaSqft]);

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
  }, [selectedTypes, selectedLocations, priceRange, rentalRange, sortBy, minAreaSqft]);

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
    setRentalRange([0, UNLIMITED_FILTER_MAX]);
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

  const localitySuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const fromList = filterLocalities(searchQuery, 20);
    const fromData = properties
      .map((p) => p.area as string | undefined)
      .filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
      .map((a) => a.trim());
    return Array.from(new Set([...fromList, ...fromData]))
      .filter((a) => a.toLowerCase().includes(q))
      // Drop filterLocalities' raw-query fallback (it echoes the whole query
      // back when nothing matches) unless the text is itself a known area.
      .filter((a) => a.toLowerCase() !== q || (BANGALORE_AREAS as readonly string[]).includes(a))
      .slice(0, 20);
  }, [searchQuery, properties]);
  const isTypingLocality = searchQuery.trim().length > 0;

  // Live natural-language parse of the search box — detects locality, type,
  // budget, rental income, and min area, with a real match count.
  const smart = useMemo(
    () => parseSmartQuery(searchQuery, properties),
    [searchQuery, properties],
  );

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

  // Google suggestions already covered by the canonical locality list or by
  // the smart-parse chips (which for multi-word queries may not surface in
  // localitySuggestions at all).
  const googlePlacesToShow = useMemo(() => {
    if (googlePlaces.length === 0) return [];
    const known = new Set<string>();
    localitySuggestions.forEach((l) => known.add(l.toLowerCase()));
    smart.localities.forEach((l) => known.add(l.toLowerCase()));
    return googlePlaces.filter((g) => !known.has(g.locality.toLowerCase()));
  }, [googlePlaces, localitySuggestions, smart.localities]);

  const budgetPresets = budgetMode === 'price' ? PRICE_BUDGET_PRESETS : RENTAL_BUDGET_PRESETS;
  const activeBudgetRange = budgetMode === 'price' ? priceRange : rentalRange;
  const setActiveBudgetRange = budgetMode === 'price' ? setPriceRange : setRentalRange;

  const isDefaultPrice = priceRange[0] === 0 && priceRange[1] === PRICE_SLIDER_MAX;
  const isDefaultRental =
    rentalRange[0] === 0 &&
    (rentalRange[1] === UNLIMITED_FILTER_MAX || rentalRange[1] >= RENTAL_SLIDER_MAX * 2);

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    !isDefaultPrice ||
    !isDefaultRental ||
    minAreaSqft != null;

  const hasActiveSearch = selectedLocations.length > 0;
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

  const applySmartSearch = () => {
    if (!smart.showSmartBlock) return;

    // If the smart parse found a type/budget but no area (e.g. a sub-locality
    // missing from the static list), pull it from the top Google result.
    const localities =
      smart.localities.length > 0 && smart.localities[0]
        ? smart.localities
        : googlePlacesToShow[0]
          ? [googlePlacesToShow[0].locality]
          : [];

    if (localities.length > 0) {
      setSelectedLocations((prev) => {
        const merged = normalizeLocalityList([...prev, ...localities]);
        if (merged.length > MAX_LOCALITY_SELECTIONS) {
          setLocalityNotice(`You can select up to ${MAX_LOCALITY_SELECTIONS} localities`);
          window.setTimeout(() => setLocalityNotice(''), 2800);
        }
        return merged.slice(0, MAX_LOCALITY_SELECTIONS);
      });
      // Save each parsed locality individually so the Recent Searches list
      // stays valid (re-applying a combined label would become a bogus chip).
      localities.forEach((loc) => saveRecentSearch(loc));
    }
    if (smart.types.length > 0) setSelectedTypes(smart.types);
    if (smart.priceRange) setPriceRange(smart.priceRange);
    if (smart.rentalRange) setRentalRange(smart.rentalRange);
    if (smart.minAreaSqft) setMinAreaSqft(smart.minAreaSqft);
    setSearchQuery('');
    setSearchOpen(false);
    // Scroll to the freshly filtered results.
    listingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const selectGooglePlace = (suggestion: GooglePlacesSuggestion) => {
    toggleLocation(suggestion.locality);
    saveRecentSearch(suggestion.locality);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const handleSearchSubmit = () => {
    // Natural-language queries (type + budget + area) beat the bare locality flow.
    if (smart.showSmartBlock) {
      applySmartSearch();
      return;
    }
    const resolved = resolveLocalityForSearch(searchQuery);
    if (resolved) {
      toggleLocation(resolved);
      saveRecentSearch(resolved);
    } else if (googlePlacesToShow[0]) {
      // Any Bangalore area Google knows about — the static list misses some.
      toggleLocation(googlePlacesToShow[0].locality);
      saveRecentSearch(googlePlacesToShow[0].locality);
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  const applyTrendingItem = (item: TrendingItem) => {
    toggleLocation(item.label);
    setSearchQuery('');
    saveRecentSearch(item.label);
  };

  const applyRecentSearch = (term: string) => {
    toggleLocation(term);
    setSearchQuery('');
    saveRecentSearch(term);
  };

  const selectLocalitySuggestion = (loc: string) => {
    toggleLocation(loc);
    setSearchQuery('');
    saveRecentSearch(loc);
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
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="prop-filter-section-title mb-0">Budget</h3>
          <div className="flex rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setBudgetMode('price')}
              className={`min-h-[36px] flex-1 rounded-lg px-4 text-[12px] font-semibold uppercase tracking-wide transition sm:flex-none ${
                budgetMode === 'price' ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Price
            </button>
            <button
              type="button"
              onClick={() => setBudgetMode('rental')}
              className={`min-h-[36px] flex-1 rounded-lg px-4 text-[12px] font-semibold uppercase tracking-wide transition sm:flex-none ${
                budgetMode === 'rental' ? 'bg-[#0A1628] text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Rental
            </button>
          </div>
        </div>

        <div className="prop-budget-grid">
          {budgetPresets.map((preset) => {
            const isActive =
              activeBudgetRange[0] === preset.range[0] && activeBudgetRange[1] === preset.range[1];
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setActiveBudgetRange(preset.range)}
                className={`prop-budget-chip ${isActive ? 'prop-budget-chip-active' : 'prop-budget-chip-idle'}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
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
      label: `${formatPrice(priceRange[0])} – ${formatPrice(priceRange[1])}`,
      onRemove: () => setPriceRange([0, PRICE_SLIDER_MAX]),
    });
  }
  if (!isDefaultRental) {
    activeFilterChips.push({
      key: 'rental',
      label: `Rental ${formatRental(rentalRange[0])} – ${formatRental(rentalRange[1])}`,
      onRemove: () => setRentalRange([0, UNLIMITED_FILTER_MAX]),
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
    <div className="properties-toolbar min-h-screen bg-[#fafafa] pt-14 md:pt-16">
      <div
        ref={toolbarRef}
        className={`fixed inset-x-0 z-[90] border-b border-gray-200/90 bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.06)] backdrop-blur-lg transition-all duration-300 ${
          navbarHidden ? 'top-0' : 'top-14 md:top-16'
        }`}
      >
        <div className="mx-auto flex w-full items-center gap-1.5 px-4 py-2 sm:gap-2 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-400" />
            <div
              role="search"
              className={`prop-search-shell ${
                searchOpen || hasActiveSearch ? 'prop-search-shell-active' : 'prop-search-shell-idle'
              }`}
              onClick={() => {
                setSearchOpen(true);
                setSortOpen(false);
              }}
            >
              {selectedLocations.length > 0 && (
                <div className="flex max-w-[45%] shrink-0 items-center gap-1 overflow-x-auto sm:max-w-[52%] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {selectedLocations.map((loc) => (
                    <span key={loc} className="prop-loc-chip">
                      <span className="max-w-[4.5rem] truncate sm:max-w-[5.5rem]">{loc}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLocation(loc);
                        }}
                        className="shrink-0 rounded-full p-1 hover:bg-white/20"
                        aria-label={`Remove ${loc}`}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={
                  selectedLocations.length > 0
                    ? localitySlotsLeft > 0
                      ? `Add locality (${localitySlotsLeft} left)...`
                      : 'Maximum 4 localities selected'
                    : 'Search area, type or budget...'
                }
                disabled={localitySlotsLeft <= 0 && !searchQuery}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchOpen(true);
                  setSortOpen(false);
                }}
                onFocus={() => {
                  setSearchOpen(true);
                  setSortOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit();
                }}
                className="prop-search-input"
              />
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

        {(activeFilterChips.length > 0 || selectedLocations.length > 0) && !searchOpen && (
          <div className="prop-active-bar">
            {selectedLocations.map((loc) => (
              <span key={loc} className="prop-active-chip">
                {loc}
                <button
                  type="button"
                  onClick={() => toggleLocation(loc)}
                  className="rounded-full p-1 hover:bg-gray-200"
                  aria-label={`Remove ${loc}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {activeFilterChips.map((chip) => (
              <span key={chip.key} className="prop-active-chip">
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="rounded-full p-1 hover:bg-gray-200"
                  aria-label={`Remove ${chip.label}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={clearEverything}
              className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500 underline underline-offset-2 hover:text-black"
            >
              Clear all
            </button>
          </div>
        )}

        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden border-t border-gray-100 bg-white"
            >
              <div className="mx-auto flex max-h-[min(65dvh,560px)] max-w-7xl flex-col">
                <div className="prop-sheet-handle lg:hidden" />
                {localityNotice && (
                  <p className="mx-3 mt-2 rounded-lg bg-[#0A1628] px-3 py-2 text-center text-[12px] font-medium text-white sm:mx-6">
                    {localityNotice}
                  </p>
                )}
                <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-6 sm:py-4">
                {isTypingLocality ? (
                  <div>
                    {smart.showSmartBlock ? (
                      <div className="mb-4 rounded-2xl border border-[#C9A84C]/40 bg-gradient-to-br from-[#0A1628]/[0.04] to-[#C9A84C]/10 p-3.5">
                        <p className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A1628]">
                          <Sparkles size={13} className="text-[#C9A84C]" />
                          Smart Match
                          <span className="ml-auto font-medium normal-case tracking-normal text-[#C9A84C]">
                            {smart.matchCount} {smart.matchCount === 1 ? 'property' : 'properties'} found
                          </span>
                        </p>
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {smart.localities.map((loc) => (
                            <span
                              key={`loc-${loc}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[#0A1628]/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1628]"
                            >
                              <MapPin size={11} className="text-[#C9A84C]" />
                              {loc}
                            </span>
                          ))}
                          {smart.types.map((type) => (
                            <span
                              key={`type-${type}`}
                              className="inline-flex items-center gap-1 rounded-full border border-[#0A1628]/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1628]"
                            >
                              <Building2 size={11} className="text-[#C9A84C]" />
                              {type}
                            </span>
                          ))}
                          {smart.priceRange && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#0A1628]/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1628]">
                              <IndianRupee size={11} className="text-[#C9A84C]" />
                              {priceRangeLabel(smart.priceRange)}
                            </span>
                          )}
                          {smart.rentalRange && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#0A1628]/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1628]">
                              <TrendingUp size={11} className="text-[#C9A84C]" />
                              {rentalRangeLabel(smart.rentalRange)}
                            </span>
                          )}
                          {smart.minAreaSqft && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#0A1628]/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0A1628]">
                              <Ruler size={11} className="text-[#C9A84C]" />
                              {smart.minAreaSqft.toLocaleString('en-IN')}+ sq.ft
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={applySmartSearch}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0A1628] px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#C9A84C] hover:text-[#0A1628]"
                        >
                          <Search size={14} />
                          {smart.matchCount > 0
                            ? `Show ${smart.matchCount} matching ${smart.matchCount === 1 ? 'property' : 'properties'}`
                            : 'Apply filters'}
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          <span>Locations</span>
                          {localitySuggestions.length > 0 && (
                            <span className="normal-case tracking-normal text-gray-400">
                              {localitySuggestions.length} match{localitySuggestions.length !== 1 ? 'es' : ''}
                            </span>
                          )}
                        </p>
                        {localitySuggestions.length > 0 ? (
                          <div className="space-y-0.5">
                            {localitySuggestions.map((loc) => (
                              <button
                                key={loc}
                                type="button"
                                onClick={() => selectLocalitySuggestion(loc)}
                                className={`flex w-full min-h-[48px] items-center gap-2.5 rounded-xl px-3 py-3 text-left text-[14px] transition active:bg-gray-100 ${
                                  selectedLocations.includes(loc)
                                    ? 'bg-[#0A1628]/5 font-medium text-[#0A1628]'
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <MapPin size={15} className="shrink-0 text-gray-400" />
                                <span className="flex-1 truncate">{highlightMatch(loc, searchQuery.trim())}</span>
                                {selectedLocations.includes(loc) ? (
                                  <span className="shrink-0 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white">
                                    Added
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[11px] text-gray-400">+ Add</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-xl bg-gray-50 px-3 py-4 text-center text-[13px] text-gray-500">
                            No localities match &ldquo;{searchQuery.trim()}&rdquo;. Try a different spelling or area name.
                          </p>
                        )}
                      </>
                    )}

                    {googlePlacesToShow.length > 0 && (
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          <MapPin size={12} className="text-[#C9A84C]" />
                          More areas on Google Maps
                          <span className="ml-auto normal-case tracking-normal text-gray-400">
                            {googlePlacesToShow.length} found
                          </span>
                        </p>
                        <div className="space-y-0.5">
                          {googlePlacesToShow.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              onClick={() => selectGooglePlace(suggestion)}
                              className="flex w-full min-h-[48px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-gray-50 active:bg-gray-100"
                            >
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white">
                                <MapPin size={14} className="text-[#C9A84C]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[14px] font-medium text-gray-800">
                                  {highlightMatch(suggestion.mainText, searchQuery.trim())}
                                </span>
                                <span className="block truncate text-[11px] text-gray-400">
                                  {suggestion.secondaryText}
                                </span>
                              </span>
                              <span className="shrink-0 text-[11px] font-medium text-gray-400">+ Add</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <TrendingUp size={12} />
                        Trending Searches
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {TRENDING_SEARCHES.map((item) => {
                          const isSelected = selectedLocations.includes(item.label);
                          return (
                            <button
                              key={item.label}
                              type="button"
                              onClick={() => applyTrendingItem(item)}
                              disabled={!isSelected && localitySlotsLeft <= 0}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12px] font-medium transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 ${
                                isSelected
                                  ? 'border-[#0A1628] bg-[#0A1628] text-white'
                                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-[#C9A84C]'
                              }`}
                            >
                              <MapPin size={11} className={isSelected ? 'text-white' : 'text-gray-400'} />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <Sparkles size={12} className="text-[#C9A84C]" />
                        Try a Smart Search
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {SMART_EXAMPLES.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => {
                              setSearchQuery(ex);
                              setSearchOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#C9A84C]/50 bg-[#C9A84C]/5 px-3 py-2 text-[12px] font-medium text-[#0A1628] transition hover:border-[#C9A84C] hover:bg-[#C9A84C]/15 active:scale-[0.97]"
                          >
                            <Sparkles size={11} className="text-[#C9A84C]" />
                            {ex}
                          </button>
                        ))}
                      </div>
                    </div>

                    {recentSearches.length > 0 && (
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Recent Searches
                        </p>
                        <div className="space-y-0.5">
                          {recentSearches.map((term) => (
                            <div
                              key={term}
                              className="flex items-center justify-between rounded-xl px-2 py-2.5 active:bg-gray-100"
                            >
                              <button
                                type="button"
                                className="flex flex-1 items-center gap-3 text-left text-[14px] text-gray-700"
                                onClick={() => applyRecentSearch(term)}
                              >
                                <Clock size={15} className="shrink-0 text-gray-400" />
                                {term}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRecentSearch(term)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                aria-label={`Remove ${term}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="mt-4 text-center text-[12px] text-gray-400">
                      Type naturally — e.g. <strong className="font-semibold text-gray-600">&ldquo;PG in Whitefield under ₹2 Cr&rdquo;</strong> — and filters apply automatically.
                    </p>
                  </>
                )}
                </div>

                {!smart.showSmartBlock && (
                  <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                    <button type="button" onClick={handleSearchSubmit} className="prop-apply-btn">
                      Apply Search
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
          <aside className="hidden lg:block w-72 shrink-0 sticky top-24 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
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

      <VJRAIButton userRole="public" />
    </div>
  );
}
