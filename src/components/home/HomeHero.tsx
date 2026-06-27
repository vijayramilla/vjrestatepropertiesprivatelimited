import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  ArrowUpRight,
  X,
  Check,
} from '@phosphor-icons/react';
import {
  BANGALORE_AREAS,
  MAX_LOCALITY_SELECTIONS,
  filterLocalities,
} from '@/data/properties';
import { resolveLocalityForSearch } from '@/lib/propertyFilters';
import { useLocationPermission } from '@/hooks/useLocationPermission';

const HERO_BG =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&auto=format&fit=crop&q=80';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

const HERO_TABS = [
  { label: 'All', value: 'All' },
  { label: 'PG Buildings', value: 'PG Buildings' },
  { label: 'Residential', value: 'Residential' },
  { label: 'Commercial', value: 'Commercial' },
  { label: 'Plot', value: 'Plot' },
  { label: 'Agriculture', value: 'Agriculture' },
] as const;

const TRENDING_AREAS = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'HSR Layout',
  'Electronic City',
  'Hebbal',
  'Sarjapur Road',
] as const;

interface HomeHeroProps {
  propertyType: string;
  setPropertyType: (v: string) => void;
  selectedLocalities: string[];
  onToggleLocality: (area: string) => void;
  localityNotice: string;
  onSearch: () => void;
  onTrendingClick: (area: string) => void;
}

export default function HomeHero({
  propertyType,
  setPropertyType,
  selectedLocalities,
  onToggleLocality,
  localityNotice,
  onSearch,
  onTrendingClick,
}: HomeHeroProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const { showLocationModal } = useLocationPermission();

  useEffect(() => {
    const id = 'dm-sans-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e: MouseEvent) => {
      if (searchRef.current?.contains(e.target as Node)) return;
      setPickerOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [pickerOpen]);

  const suggestions = useMemo(() => filterLocalities(query, 16), [query]);
  const slotsLeft = MAX_LOCALITY_SELECTIONS - selectedLocalities.length;
  const isTyping = query.trim().length > 0;

  const pickLocality = useCallback(
    (area: string) => {
      onToggleLocality(area);
      setQuery('');
    },
    [onToggleLocality],
  );

  return (
    <section className="relative flex h-[100svh] w-full flex-col overflow-hidden md:h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_BG})`, backgroundPosition: 'center top' }}
      />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(160deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.50) 45%, rgba(0,0,0,0.65) 100%)',
        }}
      />

      <div className="relative z-[2] flex flex-1 flex-col items-center justify-center px-4 pb-36 pt-16 text-center md:px-6 md:pb-32">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-[860px] font-serif text-[36px] font-normal leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px] md:text-[68px]"
        >
          Invest in Bangalore
          <br />
          Real Estate
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-4 mb-8 max-w-[320px] font-sans text-sm font-light text-[rgba(255,255,255,0.75)] md:mb-10 md:max-w-[520px] md:text-[17px]"
        >
          PG buildings, rental properties &amp; commercial assets with transparent returns
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: 'easeOut' }}
          className="mx-auto w-full max-w-[780px] overflow-visible text-left"
        >
          <div
            className="flex w-full justify-center gap-0 overflow-x-auto border-b border-[rgba(255,255,255,0.25)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {HERO_TABS.map((tab) => {
              const isActive = propertyType === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setPropertyType(tab.value)}
                  className="relative shrink-0 cursor-pointer px-3 py-2 transition-colors duration-200 md:px-5 md:py-[10px]"
                  style={{
                    fontFamily: DM_SANS,
                    fontSize: '10px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
                  }}
                >
                  <span className="md:text-[12px]">{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-white"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div ref={searchRef} className="relative mt-0">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_rgba(0,0,0,0.28)] md:rounded-none md:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
              <div className="flex min-h-[52px] flex-col md:min-h-[60px] md:flex-row md:items-stretch">
                <div className="flex flex-1 flex-col justify-center border-b border-[#eee] px-4 py-3 md:border-b-0 md:border-r md:py-0 md:pl-5 md:pr-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <MapPin size={12} weight="regular" color="#999" />
                    <span
                      className="text-[9px] uppercase tracking-[0.14em] text-[#999]"
                      style={{ fontFamily: DM_SANS }}
                    >
                      Locality {selectedLocalities.length > 0 && `· ${selectedLocalities.length}/${MAX_LOCALITY_SELECTIONS}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedLocalities.map((loc) => (
                      <span
                        key={loc}
                        className="inline-flex max-w-[140px] items-center gap-0.5 rounded-full bg-black py-0.5 pl-2 pr-0.5 text-[10px] font-medium text-white sm:max-w-[160px] sm:text-[11px]"
                      >
                        <span className="truncate">{loc}</span>
                        <button
                          type="button"
                          onClick={() => onToggleLocality(loc)}
                          className="rounded-full p-0.5 hover:bg-white/20"
                          aria-label={`Remove ${loc}`}
                        >
                          <X size={10} weight="bold" />
                        </button>
                      </span>
                    ))}
                    <input
                      type="search"
                      enterKeyHint="search"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPickerOpen(true);
                      }}
                      onFocus={() => {
                        showLocationModal(() => setPickerOpen(true));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const resolved = resolveLocalityForSearch(query);
                          if (resolved) pickLocality(resolved);
                          onSearch();
                        }
                      }}
                      disabled={slotsLeft <= 0 && !query}
                      placeholder={
                        selectedLocalities.length === 0
                          ? 'Search Bangalore localities...'
                          : slotsLeft > 0
                            ? `Add locality (${slotsLeft} left)...`
                            : 'Max 4 localities — remove one to add'
                      }
                      className="min-h-[40px] min-w-[120px] flex-1 border-0 bg-transparent text-base text-black outline-none placeholder:text-[#bbb] disabled:cursor-not-allowed md:min-h-[44px] md:text-[15px]"
                      style={{ fontFamily: DM_SANS }}
                    />
                  </div>
                </div>

                <motion.button
                  type="button"
                  onClick={onSearch}
                  whileTap={{ scale: 0.98 }}
                  className="hidden min-h-[60px] w-[120px] shrink-0 items-center justify-center bg-black text-white transition-colors hover:bg-[#111] md:flex"
                  style={{
                    fontFamily: DM_SANS,
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Search
                </motion.button>
              </div>

              <AnimatePresence>
                {pickerOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-[#eee]"
                  >
                    <div className="max-h-[min(45vh,320px)] overflow-y-auto overscroll-contain p-3 md:p-4">
                      {localityNotice && (
                        <p className="mb-2 rounded-lg bg-black px-3 py-2 text-center text-[11px] font-medium text-white">
                          {localityNotice}
                        </p>
                      )}
                      {isTyping ? (
                        suggestions.length > 0 ? (
                          <div className="space-y-0.5">
                            {suggestions.map((loc) => {
                              const selected = selectedLocalities.includes(loc);
                              return (
                                <button
                                  key={loc}
                                  type="button"
                                  onClick={() => pickLocality(loc)}
                                  disabled={!selected && slotsLeft <= 0}
                                  className="flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] transition hover:bg-[#f5f5f5] disabled:opacity-40"
                                  style={{ fontFamily: DM_SANS }}
                                >
                                  <span className="flex items-center gap-2">
                                    <MapPin size={14} className="text-[#aaa]" />
                                    {loc}
                                  </span>
                                  {selected ? (
                                    <Check size={14} weight="bold" />
                                  ) : (
                                    <span className="text-[11px] text-[#aaa]">+ Add</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="py-4 text-center text-[13px] text-[#888]" style={{ fontFamily: DM_SANS }}>
                            No localities match &ldquo;{query.trim()}&rdquo;
                          </p>
                        )
                      ) : (
                        <p className="py-2 text-center text-[11px] leading-relaxed text-[#999]" style={{ fontFamily: DM_SANS }}>
                          Pick up to {MAX_LOCALITY_SELECTIONS} localities · {BANGALORE_AREAS.length} areas covered.
                          <br />
                          Property type &amp; budget filters are on the results page.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              type="button"
              onClick={onSearch}
              whileTap={{ scale: 0.98 }}
              className="mt-2 flex h-[50px] w-full items-center justify-center rounded-2xl bg-black text-white transition-colors hover:bg-[#111] md:hidden"
              style={{
                fontFamily: DM_SANS,
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Search Properties
            </motion.button>
          </div>

          <div
            className="mt-3 flex items-center gap-2 overflow-x-auto md:mt-4 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <span
              className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.45)] sm:text-[11px]"
              style={{ fontFamily: DM_SANS }}
            >
              Trending:
            </span>
            {TRENDING_AREAS.map((area, i) => (
              <motion.button
                key={area}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.04, duration: 0.4 }}
                onClick={() => onTrendingClick(area)}
                className="group flex shrink-0 items-center gap-1 border border-[rgba(255,255,255,0.2)] bg-transparent px-3 py-2 text-[10px] text-[rgba(255,255,255,0.7)] transition-all duration-200 hover:border-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white sm:text-[11px]"
                style={{ fontFamily: DM_SANS }}
              >
                {area}
                <ArrowUpRight
                  size={10}
                  weight="regular"
                  className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                />
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
