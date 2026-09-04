import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, ArrowUpRight, Building2 } from 'lucide-react';
import { BANGALORE_AREAS } from '@/data/properties';

const TYPE_CATEGORIES = [
  { label: 'PG Buildings', values: ['PG Buildings'] },
  { label: 'Residential', values: ['Residential Rental Income'] },
  { label: 'Commercial', values: ['Commercial Properties'] },
];

const BUY_BUDGET_LABELS = [
  'Under ₹50L',
  '₹50L – ₹1Cr',
  '₹1Cr – ₹2Cr',
  '₹2Cr – ₹3Cr',
  '₹3Cr – ₹5Cr',
  'Above ₹5Cr',
];

const TABS = ['PG Buildings', 'Residential', 'Commercial'];

const TAB_TYPE_MAP: Record<string, string> = {
  'PG Buildings': 'PG Buildings',
  Residential: 'Residential',
  Commercial: 'Commercial',
};

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomeSearchBar() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('PG Buildings');
  const [location, setLocation] = useState('');
  const [showLocations, setShowLocations] = useState(false);
  const [selectedType, setSelectedType] = useState('PG Buildings');
  const [selectedBudget, setSelectedBudget] = useState('');

  const filteredAreas = useMemo(
    () =>
      location
        ? BANGALORE_AREAS.filter((a) =>
            a.toLowerCase().includes(location.toLowerCase()),
          ).slice(0, 8)
        : [],
    [location],
  );

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setSelectedType(TAB_TYPE_MAP[tab] ?? '');
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (selectedType) {
      const cat = TYPE_CATEGORIES.find((c) => c.label === selectedType);
      if (cat) params.set('type', cat.values.join(','));
    }
    if (selectedBudget) params.set('budget', selectedBudget);
    navigate(`/properties?${params.toString()}`);
  };

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabClick(tab)}
              className={`relative whitespace-nowrap rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-5 ${
                active
                  ? 'bg-white text-[#0A1628] shadow-[0_-4px_16px_rgba(0,0,0,0.15)]'
                  : 'bg-[#0A1628]/50 text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
              {active && (
                <motion.span
                  layoutId="homeSearchActiveTab"
                  className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#C9A84C]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Search card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.15 }}
        className="rounded-b-2xl rounded-tr-2xl border border-white/30 bg-white/20 p-3 shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MapPin
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0A1628]/60"
            />
            <input
              type="text"
              placeholder="Search by locality — Koramangala, Whitefield..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setShowLocations(true);
              }}
              onFocus={() => setShowLocations(true)}
              onBlur={() => setTimeout(() => setShowLocations(false), 200)}
              className="min-h-[48px] w-full rounded-xl border border-white/40 bg-white pl-10 pr-9 text-sm text-[#0A1628] outline-none transition-all placeholder:text-[#0A1628]/40 focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/30"
            />
            {location && (
              <button
                type="button"
                aria-label="Clear locality"
                onClick={() => {
                  setLocation('');
                  setShowLocations(true);
                }}
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[#0A1628]/50 transition-colors hover:bg-[#0A1628]/5 hover:text-[#0A1628]"
              >
                <X size={14} />
              </button>
            )}

            <AnimatePresence>
              {showLocations && filteredAreas.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-64 overflow-y-auto overscroll-contain rounded-xl border border-white/40 bg-white/95 p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.25)] backdrop-blur-xl"
                >
                  {filteredAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onMouseDown={() => {
                        setLocation(area);
                        setShowLocations(false);
                      }}
                      className="flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm text-[#0A1628] transition-colors hover:bg-[#C9A84C]/10"
                    >
                      <MapPin size={14} className="shrink-0 text-[#C9A84C]" />
                      {area}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={handleSearch}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A1628] px-6 text-sm font-bold text-white shadow-lg shadow-[#0A1628]/30 transition-colors hover:bg-[#1E3852]"
          >
            <Search size={16} />
            Search
          </motion.button>
        </div>

        {/* Budget chips */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="mr-1 shrink-0 text-[11px] font-bold uppercase tracking-wider text-white/70">
            Budget
          </span>
          {BUY_BUDGET_LABELS.map((label) => {
            const active = selectedBudget === label;
            return (
              <motion.button
                key={label}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedBudget(active ? '' : label)}
                className={`flex min-h-[38px] shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'bg-white text-[#0A1628] shadow-md'
                    : 'border border-white/25 bg-white/10 text-white/85 hover:bg-white/20 hover:text-white'
                }`}
              >
                {active && (
                  <Building2 size={11} className="mr-1.5 text-[#C9A84C]" fill="currentColor" />
                )}
                {label}
              </motion.button>
            );
          })}
        </div>

        {/* Quick hint */}
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/60">
          <ArrowUpRight size={11} className="text-[#C9A84C]" />
          Property type &amp; budget filters apply on the results page
        </p>
      </motion.div>
    </div>
  );
}
