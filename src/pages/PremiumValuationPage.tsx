import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Keyhole, Building, MapTrifold, Ruler, Calendar, Compass, Square, Stack, CheckCircle, House } from '@phosphor-icons/react';
import { SparklesCore } from '@/components/ui/sparkles';
import { AnimatedStatNumber } from '@/components/ui/animated-blur-number';
import GlassCard from '@/components/ui/glass-card';
import { getPropertyValuation, type ValuationInput, type ValuationResult } from '@/utils/aiValuation';
import { cn } from '@/lib/utils';
import { BANGALORE_AREAS, filterLocalities } from '@/data/properties';

/* ─── Types ─── */
interface PremiumButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

const EASE_LUXE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/* ─── Reusable Premium Button ─── */
function PremiumButton({ onClick, disabled, loading, children, className }: PremiumButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative overflow-hidden rounded-xl px-7 py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-300',
        'bg-gray-950 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]',
        'hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] hover:scale-[1.02] active:scale-[0.98]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
        className,
      )}
    >
      {/* Cursor-following sheen */}
      <div
        className={cn('pointer-events-none absolute inset-0 transition-opacity duration-300', hovered ? 'opacity-100' : 'opacity-0')}
        style={{ background: `radial-gradient(600px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.14), transparent 40%)` }}
      />
      {/* Top hairline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      {/* Sweep shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Valuating…
          </>
        ) : children}
      </span>
    </button>
  );
}

/* ─── FAQ Section ─── */
function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const FAQs = [
    { q: 'How accurate is the AI valuation?', a: 'Our AI analyzes comparable sales, circle rates, and 30+ market signals across Bangalore. Confidence scores above 80% are highly reliable.' },
    { q: 'What data does the valuation use?', a: 'Property type, locality, area, age, floor, facing, BHK, and construction status. The AI is trained on Bangalore-specific real estate data.' },
    { q: 'Is this a government-approved valuation?', a: 'This is an AI-powered market estimate, not a government-approved valuation. For legal purposes, consult a registered valuer.' },
    { q: 'How often is the market data updated?', a: 'The AI model incorporates the latest available market trends and recent comparable sales in your locality.' },
    { q: 'Can I use this for loan applications?', a: 'Banks require their own approved valuers. Use this estimate as a reference for your property\'s market standing.' },
  ];
  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-xl relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gray-900/8 before:via-transparent before:to-transparent before:pointer-events-none">
        {FAQs.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={i} className={cn(i > 0 && 'border-t border-gray-100')}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-gray-50/60"
              >
                <span className={cn('text-sm font-medium transition-colors', isOpen ? 'text-gray-950' : 'text-gray-700')}>{faq.q}</span>
                <span className={cn('relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300', isOpen ? 'rotate-45 border-gray-900 bg-gray-900' : 'border-gray-200 bg-white')}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isOpen ? '#fff' : '#111'} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                    <div className="px-6 pb-5 text-sm leading-relaxed text-gray-500">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Data ─── */
const STEPS = [
  { num: '01', title: 'Enter Property Details', desc: 'Select type, locality, size, age, and other key parameters. Our form guides you step-by-step.' },
  { num: '02', title: 'AI Market Analysis', desc: 'Our AI cross-references 30+ market signals including recent sales, circle rates, and locality trends across Bangalore.' },
  { num: '03', title: 'Get Your Valuation', desc: 'Receive a comprehensive report with market value, price per sq.ft, rental yield, and confidence score.' },
];

const MARKET_STATS = [
  { label: 'Properties Analyzed', value: 15420, suffix: '+' },
  { label: 'Localities Covered', value: 186, suffix: '' },
  { label: 'Avg. Accuracy', value: 92, suffix: '%' },
  { label: 'Happy Users', value: 8340, suffix: '+' },
];

function formatIndian(num: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
}

/* ─── Sub-components ─── */

function StepIndicator({ step, steps }: { step: number; steps: { label: string; title: string }[] }) {
  return (
    <div className="mb-10">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
          return (
            <div key={s.label} className={cn('flex items-center', i < steps.length - 1 && 'flex-1')}>
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-500',
                    isDone || isActive ? 'bg-gray-950 text-white shadow-[0_6px_16px_-6px_rgba(0,0,0,0.5)]' : 'border border-gray-200 bg-white text-gray-400',
                  )}
                >
                  {isActive && (
                    <>
                      <span className="absolute -inset-1.5 rounded-full border border-gray-900/15" aria-hidden />
                      <span className="absolute -inset-2.5 animate-ping rounded-full bg-gray-900/5" aria-hidden />
                    </>
                  )}
                  {isDone ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <span className="font-serif">{i + 1}</span>
                  )}
                </div>
                <span className={cn('hidden text-xs font-medium tracking-wide transition-colors sm:inline', isActive ? 'font-semibold text-gray-950' : isDone ? 'text-gray-600' : 'text-gray-400')}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="relative mx-3 h-px flex-1 overflow-hidden rounded-full bg-gray-200 sm:mx-4">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gray-950"
                    initial={false}
                    animate={{ width: i < step ? '100%' : '0%' }}
                    transition={{ duration: 0.6, ease: EASE_LUXE }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* Shared premium field styles */
const fieldLabel = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500';
const fieldInput = 'w-full h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/[0.06]';
const fieldSelect = 'w-full h-12 appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-gray-900 focus:ring-4 focus:ring-gray-900/[0.06]';

function SelectChevron() {
  return (
    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
    </span>
  );
}

/* ─── Main Page ─── */
export default function PremiumValuationPage() {
  const [result, setResult] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  /* Form State */
  const [step, setStep] = useState(0);
  const [propertyType, setPropertyType] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [locality, setLocality] = useState('');
  const [areaSqft, setAreaSqft] = useState('');
  const [age, setAge] = useState('');
  const [facing, setFacing] = useState('');
  const [floor, setFloor] = useState('');
  const [bhk, setBhk] = useState('');
  const [status, setStatus] = useState('');
  const [localityQuery, setLocalityQuery] = useState('');
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);

  const formSteps = [
    { label: 'Type', title: 'Select Property Type' },
    { label: 'Location', title: 'Choose Location' },
    { label: 'Details', title: 'Property Details' },
  ];

  const handleValuate = useCallback(async () => {
    setLoading(true);
    setError('');
    setResult(null);
    setShowResults(false);
    const input: ValuationInput = {
      propertyType: subCategory ? `${propertyType} - ${subCategory}` : propertyType,
      locality,
      areaSqft: Number(areaSqft) || 1000,
      age: age || 'New Construction',
      facing: facing || 'East',
      floor: floor || 'Ground',
      bhk: bhk || '2 BHK',
      status: status || 'Ready to Move',
    };
    const data = await getPropertyValuation(input);
    if (!data) {
      setError('Could not get valuation. Please try again or check your API key.');
      setLoading(false);
      return;
    }
    setResult(data);
    setLoading(false);
    setTimeout(() => setShowResults(true), 100);
  }, [subCategory, propertyType, locality, areaSqft, age, facing, floor, bhk, status]);

  const canProceed = () => {
    if (step === 0) {
      if (!propertyType) return false;
      if ((propertyType === 'Plot / Land' || propertyType === 'Commercial') && !subCategory) return false;
      return true;
    }
    if (step === 1) return !!locality;
    return true;
  };

  const handleLocalitySearch = (q: string) => {
    setLocalityQuery(q);
    if (q.trim().length > 0) setLocalitySuggestions(filterLocalities(q, 6));
    else setLocalitySuggestions([]);
  };

  useEffect(() => {
    document.title = 'AI Property Valuation | VJR Estate';
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fafafa]">
      <div className="pointer-events-none fixed inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)', backgroundSize: '40px 40px' }} aria-hidden />
      <SparklesCore particleColor="#000000" particleDensity={8} minSize={0.3} maxSize={1.1} speed={1.2} className="pointer-events-none absolute inset-0 opacity-[0.15]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }}
          animate={prefersReducedMotion ? undefined : { x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.05, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 h-[700px] w-[700px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #000 0%, transparent 70%)' }}
          animate={prefersReducedMotion ? undefined : { x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-16 sm:px-6 md:pt-32 lg:px-8">
        {/* HERO */}
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE_LUXE }} className="mb-16 text-center md:mb-20">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-[500px] opacity-[0.07]" aria-hidden>
            <div className="h-full w-full rounded-full bg-gradient-to-r from-transparent via-gray-900 to-transparent blur-3xl" />
          </div>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-gray-200/70 bg-white/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            AI Property Valuation
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl font-serif text-4xl tracking-tight md:text-5xl lg:text-6xl">
            Know what your property
            <span className="mt-1 block italic">
              <span className="bg-gradient-to-r from-gray-950 via-gray-600 to-gray-950 bg-clip-text text-transparent">is truly worth.</span>
            </span>
          </h1>

          {/* Hairline flourish */}
          <div className="mx-auto mt-7 flex w-full max-w-[220px] items-center gap-3" aria-hidden>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-300" />
            <div className="h-1 w-1 rotate-45 bg-gray-900" />
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-300" />
          </div>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-gray-500">
            An instant, AI-backed market appraisal for any property in Bangalore — built on comparable sales, circle rates, and 30+ live market signals.
          </p>

          {/* Trust row */}
          <div className="mx-auto mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle weight="fill" size={13} className="text-emerald-600" /> 92% avg. accuracy</span>
            <span className="hidden h-3 w-px bg-gray-200 sm:block" aria-hidden />
            <span className="flex items-center gap-1.5"><MapTrifold weight="fill" size={13} className="text-gray-400" /> 186 localities</span>
            <span className="hidden h-3 w-px bg-gray-200 sm:block" aria-hidden />
            <span>Free · Instant · No sign-up</span>
          </div>
        </motion.div>

        {/* FORM + RESULTS */}
        <div className="grid gap-8 lg:grid-cols-5 lg:gap-12">
          <div className="lg:col-span-3">
            <GlassCard className="w-full !p-8 sm:!p-10 relative before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gray-900/10 before:via-transparent before:to-transparent before:pointer-events-none">
              <StepIndicator step={step} steps={formSteps} />
              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease: EASE_LUXE }}>
                    <p className="mb-6 text-center font-serif text-lg text-gray-950">{formSteps[0].title}</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {[
                        { id: 'Apartment', icon: Building, label: 'Apartment' },
                        { id: 'Independent House', icon: House, label: 'Independent House' },
                        { id: 'Plot / Land', icon: MapTrifold, label: 'Plot / Land' },
                        { id: 'Commercial', icon: Stack, label: 'Commercial' },
                        { id: 'PG Building', icon: Keyhole, label: 'PG Building' },
                      ].map((t) => {
                        const selected = propertyType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => { setPropertyType(t.id); setSubCategory(''); }}
                            className={cn(
                              'group relative flex flex-col items-center gap-3 overflow-hidden rounded-xl border p-5 transition-all duration-300',
                              selected
                                ? 'border-gray-950 bg-gray-950 text-white shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)]'
                                : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-[0_10px_24px_-12px_rgba(15,23,42,0.18)]',
                            )}
                          >
                            {selected && <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />}
                            <t.icon size={28} weight={selected ? 'fill' : 'duotone'} className="transition-transform duration-300 group-hover:scale-110" />
                            <span className="text-xs font-bold tracking-wide">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {propertyType && (propertyType === 'Plot / Land' || propertyType === 'Commercial') && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 border-t border-gray-100 pt-6">
                        <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Select {propertyType === 'Plot / Land' ? 'Land' : 'Commercial'} Type</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {(propertyType === 'Plot / Land' ? ['Residential Plot', 'Commercial Plot', 'JD Land'] : ['Office Space', 'Retail / Showroom', 'Warehouse / Godown', 'Commercial Land']).map((sc) => (
                            <button
                              key={sc}
                              type="button"
                              onClick={() => setSubCategory(sc)}
                              className={cn(
                                'rounded-xl border px-4 py-3 text-xs font-bold tracking-wide transition-all duration-300',
                                subCategory === sc
                                  ? 'border-gray-950 bg-gray-950 text-white shadow-[0_10px_24px_-12px_rgba(0,0,0,0.5)]'
                                  : 'border-gray-200 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-gray-300',
                              )}
                            >
                              {sc}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease: EASE_LUXE }}>
                    <p className="mb-6 text-center font-serif text-lg text-gray-950">{formSteps[1].title}</p>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search Bangalore localities..."
                        value={localityQuery}
                        onChange={(e) => handleLocalitySearch(e.target.value)}
                        className={cn(fieldInput, 'pr-12')}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!navigator.geolocation) return;
                          navigator.geolocation.getCurrentPosition(async (pos) => {
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
                              const data = await res.json();
                              const address = (data.display_name || '').toLowerCase();
                              const match = BANGALORE_AREAS.find((a) => address.includes(a.toLowerCase()));
                              if (match) { setLocality(match); setLocalityQuery(match); }
                            } catch {/* noop */}
                          }, () => { /* noop */ }, { timeout: 5000 });
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-900"
                        aria-label="Detect my location"
                      >
                        <Compass size={18} weight="duotone" />
                      </button>
                    </div>
                    {localitySuggestions.length > 0 && (
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15)]">
                        {localitySuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setLocality(s); setLocalityQuery(s); setLocalitySuggestions([]); }}
                            className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition', locality === s ? 'bg-gray-950 font-semibold text-white' : 'text-gray-700 hover:bg-gray-50')}
                          >
                            <MapTrifold size={14} className={cn('shrink-0', locality === s ? 'text-white/70' : 'text-gray-400')} />
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35, ease: EASE_LUXE }}>
                    <p className="mb-6 text-center font-serif text-lg text-gray-950">{formSteps[2].title}</p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className={fieldLabel}><Ruler size={14} /> Area (sq.ft)</label>
                        <input type="number" placeholder="e.g. 1500" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} className={fieldInput} />
                      </div>
                      <div className="space-y-2">
                        <label className={fieldLabel}><Square size={14} /> BHK</label>
                        <div className="relative">
                          <select value={bhk} onChange={(e) => setBhk(e.target.value)} className={fieldSelect}>
                            <option value="">Select BHK</option>
                            {['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={fieldLabel}><Calendar size={14} /> Age</label>
                        <div className="relative">
                          <select value={age} onChange={(e) => setAge(e.target.value)} className={fieldSelect}>
                            <option value="">Select Age</option>
                            {['New Construction', '0-5 Years', '5-10 Years', '10-20 Years', '20+ Years'].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={fieldLabel}><Compass size={14} /> Facing</label>
                        <div className="relative">
                          <select value={facing} onChange={(e) => setFacing(e.target.value)} className={fieldSelect}>
                            <option value="">Select Facing</option>
                            {['East', 'West', 'North', 'South', 'North-East', 'North-West', 'South-East', 'South-West'].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={fieldLabel}><Stack size={14} /> Floor</label>
                        <div className="relative">
                          <select value={floor} onChange={(e) => setFloor(e.target.value)} className={fieldSelect}>
                            <option value="">Select Floor</option>
                            {['Ground', '1st', '2nd', '3rd', '4th', '5th+', 'Penthouse'].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className={fieldLabel}><CheckCircle size={14} /> Status</label>
                        <div className="relative">
                          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldSelect}>
                            <option value="">Select Status</option>
                            {['Ready to Move', 'Under Construction', 'New Launch'].map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <SelectChevron />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation */}
              <div className="mt-10 flex items-center justify-between border-t border-gray-100 pt-6">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(s => Math.max(s - 1, 0))} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> Back
                  </button>
                ) : <div />}
                {step < 2 ? (
                  <button
                    type="button"
                    onClick={() => setStep(s => Math.min(s + 1, 2))}
                    disabled={!canProceed()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gray-950 px-7 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  >
                    Next <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </button>
                ) : (
                  <PremiumButton onClick={handleValuate} disabled={loading} loading={loading} className="min-w-[180px]">
                    Get Valuation
                  </PremiumButton>
                )}
              </div>
            </GlassCard>

            {error && (
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
                {error}
              </motion.p>
            )}
          </div>

          {/* Results sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-24 space-y-6">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-5 h-14 w-14">
                      <div className="absolute -inset-2 rounded-full border border-gray-200/60" aria-hidden />
                      <div className="absolute inset-0 rounded-full border-2 border-gray-200" />
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-gray-950 border-t-transparent" />
                      <div className="absolute inset-3 flex items-center justify-center">
                        <span className="font-serif text-sm text-gray-900">₹</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-950">Analyzing market data…</p>
                    <p className="mt-1 text-xs text-gray-400">Cross-referencing comparable sales</p>
                  </motion.div>
                ) : result && showResults ? (
                  <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: EASE_LUXE }} className="space-y-5">
                    <div className="relative overflow-hidden rounded-2xl bg-gray-950 p-8 text-center shadow-[0_30px_60px_-15px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
                      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.10), transparent 55%)' }} aria-hidden />
                      <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-white/20 via-transparent to-transparent opacity-50" aria-hidden />
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
                      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/40">Estimated Market Value</p>
                      <p className="mt-3 font-serif text-4xl tracking-tight text-white md:text-5xl">
                        ₹<AnimatedStatNumber value={result.marketValue} locale="en-IN" format={{ maximumFractionDigits: 0 }} countDuration={1800} />
                      </p>
                      <div className="mx-auto mt-4 flex w-full max-w-[160px] items-center gap-3" aria-hidden>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20" />
                        <div className="h-1 w-1 rotate-45 bg-white/40" />
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20" />
                      </div>
                      <p className="mt-3 text-xs text-white/40">₹{formatIndian(result.pricePerSqft)} / sq.ft</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <GlassCard compact className="!p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Rental Yield</p>
                        <p className="mt-1.5 text-lg font-bold text-gray-950">₹{formatIndian(result.rentalYield)} <span className="text-xs font-medium text-gray-400">/mo</span></p>
                      </GlassCard>
                      <GlassCard compact className="!p-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Circle Rate</p>
                        <p className="mt-1.5 text-lg font-bold text-gray-950">₹{formatIndian(result.circleRate)}</p>
                      </GlassCard>
                      <GlassCard compact className="col-span-2 !p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Confidence</p>
                            <p className="mt-1 text-2xl font-bold text-gray-950">{result.confidenceScore}<span className="text-sm font-medium text-gray-400">%</span></p>
                          </div>
                          <div className="h-10 w-32 self-end">
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gray-700 to-gray-950"
                                initial={{ width: 0 }}
                                animate={{ width: `${result.confidenceScore}%` }}
                                transition={{ duration: 1.5, ease: EASE_LUXE, delay: 0.5 }}
                              />
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </div>

                    <GlassCard compact className="!p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Market Trend</p>
                        <span className={cn('text-sm font-bold', result.trend === 'up' ? 'text-emerald-600' : result.trend === 'down' ? 'text-red-600' : 'text-gray-600')}>
                          {result.trend === 'up' ? '↑' : result.trend === 'down' ? '↓' : '→'} {result.trendPercentage > 0 ? '+' : ''}{result.trendPercentage}%
                        </span>
                      </div>
                    </GlassCard>

                    {result.explanation && (
                      <GlassCard className="!p-5">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">AI Analysis</p>
                        <p className="text-sm leading-relaxed text-gray-700">{result.explanation}</p>
                      </GlassCard>
                    )}

                    {result.comparableLocalities && result.comparableLocalities.length > 0 && (
                      <GlassCard className="!p-5">
                        <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">Comparable Localities</p>
                        <div className="flex flex-wrap gap-2">
                          {result.comparableLocalities.map((loc) => (
                            <span key={loc} className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">{loc}</span>
                          ))}
                        </div>
                      </GlassCard>
                    )}

                    <div className="pt-2 text-center">
                      <button type="button" onClick={() => { setResult(null); setShowResults(false); }} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg> New Valuation
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                      <div className="absolute -inset-3 rounded-3xl border border-gray-200/70" aria-hidden />
                      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-gray-900/5 via-transparent to-transparent opacity-60" aria-hidden />
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-950 to-gray-700 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] ring-1 ring-black/5">
                        <span className="font-serif text-3xl text-white">₹</span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-950">Your valuation appears here</p>
                    <p className="mt-1 max-w-[210px] text-xs leading-relaxed text-gray-400">Fill in the form and click &quot;Get Valuation&quot; to see your AI-powered estimate.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="mt-28 mb-20">
          <div className="mb-14 text-center">
            <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">The Process</span>
            <h2 className="font-serif text-3xl text-gray-950 md:text-4xl">How It Works</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-gray-500">Three simple steps to your property valuation.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.15, ease: EASE_LUXE }}>
            <GlassCard interactive className="relative h-full overflow-hidden !p-8 before:absolute before:-inset-px before:rounded-2xl before:bg-gradient-to-b before:from-gray-900/8 before:via-transparent before:to-transparent before:pointer-events-none">
              <span className="pointer-events-none absolute -top-4 right-3 select-none font-serif text-[88px] leading-none text-gray-950/[0.05]" aria-hidden>{s.num}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-400">Step {s.num}</span>
              <h3 className="mt-3 font-serif text-lg text-gray-950">{s.title}</h3>
              <div className="mt-3 h-px w-10 bg-gray-900/20" aria-hidden />
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{s.desc}</p>
            </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>

        {/* MARKET STATS — dark inverted band */}
        <section className="mb-24">
          <div className="relative overflow-hidden rounded-3xl bg-gray-950 px-8 py-12 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)] ring-1 ring-white/10 md:px-14 md:py-14">
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-b from-white/15 via-transparent to-transparent opacity-60" aria-hidden />
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(110% 90% at 50% 0%, rgba(255,255,255,0.07), transparent 55%)' }} aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" aria-hidden />
            <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
              {MARKET_STATS.map((stat, i) => (
                <div key={stat.label} className={cn('text-center', i > 0 && 'md:border-l md:border-white/10')}>
                  <p className="font-serif text-3xl text-white md:text-4xl">
                    <AnimatedStatNumber value={stat.value} locale="en-IN" format={{ maximumFractionDigits: 0 }} countDuration={2000} />
                    <span>{stat.suffix}</span>
                  </p>
                  <p className="mt-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <div className="mb-10 text-center">
            <span className="mb-3 inline-block text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Support</span>
            <h2 className="font-serif text-3xl text-gray-950 md:text-4xl">Frequently Asked Questions</h2>
          </div>
          <FaqSection />
        </section>
      </div>
    </div>
  );
}
