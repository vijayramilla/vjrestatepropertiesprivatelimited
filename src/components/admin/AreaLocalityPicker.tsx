import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlass, MapPin, X, CaretDown, Check, Buildings } from '@phosphor-icons/react';
import {
  BANGALORE_AREA_NAMES,
  BANGALORE_ZONES,
  searchBangaloreAreas,
  type BangaloreArea,
} from '@/data/bangaloreAreas';

interface AreaLocalityPickerProps {
  value: string;
  onChange: (area: string) => void;
  error?: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

/**
 * Searchable area/locality picker covering every Bangalore area
 * (A–Z, all zones incl. outskirts). Type-to-filter, zone chips,
 * grouped list, fully keyboard & mobile friendly.
 */
export default function AreaLocalityPicker({
  value,
  onChange,
  error,
  label = 'Area / Locality',
  required = true,
  placeholder = 'Search any Bangalore area — e.g. Kadubasanahalli, HSR, Electronic City…',
}: AreaLocalityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeZone, setActiveZone] = useState<'All' | BangaloreArea['zone']>('All');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useMemo(() => `area-picker-list-${Math.random().toString(36).slice(2, 8)}`, []);

  // Close on outside tap (mobile-friendly: no hover dependence)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: TouchEvent | MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  const matches = useMemo(() => searchBangaloreAreas(query, 400), [query]);

  const zoneFiltered = useMemo(() => {
    if (activeZone === 'All') return matches;
    return matches.filter((a) => a.zone === activeZone);
  }, [matches, activeZone]);

  // Group by zone for the dropdown list
  const grouped = useMemo(() => {
    const map = new Map<BangaloreArea['zone'], BangaloreArea[]>();
    for (const a of zoneFiltered) {
      const list = map.get(a.zone) ?? [];
      list.push(a);
      map.set(a.zone, list);
    }
    return map;
  }, [zoneFiltered]);

  const pick = (area: string) => {
    onChange(area);
    setQuery('');
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label className="mb-2 block font-sans text-xs text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="ml-1 text-gray-400">({BANGALORE_AREA_NAMES.length} Bangalore areas)</span>
      </label>

      {/* Trigger — looks like a select but opens the search sheet */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 60);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-xl border bg-white px-4 py-2.5 text-left text-sm transition-colors ${
          error
            ? 'border-red-300 focus:border-red-400'
            : open
              ? 'border-[#C9A84C] ring-2 ring-[#C9A84C]/20'
              : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin size={15} className="shrink-0 text-[#C9A84C]" />
          {value ? (
            <span className="truncate font-medium text-gray-900">{value}</span>
          ) : (
            <span className="truncate text-gray-400">Select Area / Locality</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selected area"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  clear();
                }
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={12} />
            </span>
          )}
          <CaretDown
            size={13}
            className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_24px_64px_rgba(10,22,40,0.18)]"
          >
            {/* Search input */}
            <div className="border-b border-gray-100 p-3">
              <div className="relative">
                <MagnifyingGlass
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-controls={listId}
                  aria-expanded={open}
                  autoComplete="off"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="min-h-[44px] w-full rounded-xl border border-gray-200 bg-gray-50/60 pl-9 pr-9 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#C9A84C] focus:bg-white focus:ring-2 focus:ring-[#C9A84C]/20"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Zone chips — horizontally scrollable on mobile */}
              <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(['All', ...BANGALORE_ZONES] as const).map((z) => {
                  const active = activeZone === z;
                  return (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setActiveZone(z)}
                      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                        active
                          ? 'bg-[#0A1628] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {z === 'All' ? 'All Zones' : z}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grouped list */}
            <div
              id={listId}
              role="listbox"
              className="max-h-[min(46vh,340px)] overflow-y-auto overscroll-contain p-2"
            >
              {zoneFiltered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Buildings size={22} className="text-gray-300" />
                  <p className="text-xs text-gray-400">
                    No area matches &ldquo;{query.trim()}&rdquo;
                    <br />
                    Try a shorter spelling or another zone.
                  </p>
                </div>
              ) : (
                [...grouped.entries()].map(([zone, areas]) => (
                  <div key={zone} className="mb-1">
                    <p className="sticky top-0 z-10 bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400 backdrop-blur-sm">
                      {zone}
                    </p>
                    {areas.map((a) => {
                      const selected = a.name === value;
                      return (
                        <button
                          key={a.name}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => pick(a.name)}
                          className={`flex min-h-[42px] w-full items-center justify-between gap-2 rounded-lg px-3 text-left text-sm transition-colors ${
                            selected ? 'bg-[#0A1628] text-white' : 'text-gray-800 hover:bg-[#C9A84C]/10'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <MapPin
                              size={12}
                              className={selected ? 'text-[#C9A84C]' : 'text-gray-300'}
                            />
                            <span className="truncate">{a.name}</span>
                          </span>
                          {selected && <Check size={13} className="shrink-0 text-[#C9A84C]" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/60 px-4 py-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
                {zoneFiltered.length} areas
                {activeZone !== 'All' ? ` · ${activeZone}` : ''}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#C9A84C] transition-colors hover:text-[#0A1628]"
              >
                Done
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
