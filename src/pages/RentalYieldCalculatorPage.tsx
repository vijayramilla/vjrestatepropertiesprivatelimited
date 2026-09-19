import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  HouseLine,
  Storefront,
  Wallet,
  Wrench,
  TrendUp,
  ArrowRight,
  WhatsappLogo,
  CheckCircle,
  Info,
  Bed,
  Users,
  ChartLine,
} from '@phosphor-icons/react';
import { setDefaultSiteMeta } from '@/lib/siteMeta';
import {
  calcResidentialYield,
  calcPgYield,
  calcCommercialYield,
  getVerdict,
  BENCHMARKS,
  PROPERTY_TYPES,
  formatINR,
  formatINRFull,
  formatYield,
  formatPayback,
  parseAmount,
  type PropertyType,
  type ResidentialExpenses,
  type PgExpenses,
  type CommercialExpenses,
} from '@/components/rentalYield/calculations';
import { openWhatsAppPropertyEnquiry } from '@/utils/whatsappProperty';

const DM_SANS = "'DM Sans', system-ui, sans-serif";
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const TYPE_ICONS = { residential: HouseLine, pg: Buildings, commercial: Storefront } as const;

const DEFAULT_RESIDENTIAL: ResidentialExpenses = {
  maintenance: 0,
  propertyTax: 0,
  insurance: 0,
  vacancyWeeks: 0,
};

const DEFAULT_PG: PgExpenses = {
  beds: 30,
  rentPerBed: 10000,
  occupancy: 85,
  opexPerBed: 4500,
  propertyTax: 40000,
  insurance: 15000,
};

const DEFAULT_COMMERCIAL: CommercialExpenses = {
  monthlyRent: 120000,
  escalation: 5,
  escalationYears: 3,
  depositMonths: 6,
  propertyTax: 0,
  otherCosts: 50000,
  vacancyWeeks: 0,
};

/** Per-type starting examples so the calculator opens with a realistic scenario. */
const TYPE_DEFAULTS: Record<PropertyType, { price: number }> = {
  residential: { price: 10000000 },
  pg: { price: 45000000 },
  commercial: { price: 60000000 },
};

const EXPLAINERS: Record<PropertyType, { title: string; formula: string; body: string }[]> = {
  residential: [
    {
      title: 'Gross yield',
      formula: '(Monthly rent × 12) ÷ Price × 100',
      body: 'The quick screen every investor runs first. It ignores costs, so use it to compare properties side by side, then verify with net yield.',
    },
    {
      title: 'Net yield',
      formula: '(Annual rent − Costs) ÷ Price × 100',
      body: 'Subtracts maintenance, property tax, insurance and vacant weeks. This is the money that actually reaches your account.',
    },
    {
      title: 'What good looks like',
      formula: 'Residential 2–4% · Bengaluru avg ~4.2%',
      body: 'Bengaluru leads Indian metros. Yields near 4% are healthy; above that usually means a strong micro-market or a below-market purchase.',
    },
  ],
  pg: [
    {
      title: 'PG gross yield',
      formula: 'Beds × Rent × Occupancy × 12 ÷ Price × 100',
      body: 'Income scales per bed, so a full building earns many small rents instead of one. Occupancy is the lever that moves everything.',
    },
    {
      title: 'Operations eat 35–50%',
      formula: 'Opex = staff + food + utilities + marketing',
      body: 'Unlike a flat, a PG is a running business. Enter realistic per-bed costs; 45–50% of collections is a safe planning number.',
    },
    {
      title: 'What good looks like',
      formula: 'Self-run 5–7% · Managed 6–8%',
      body: 'Well-run Bengaluru PG buildings earn roughly double the residential yield. Numbers above 9% deserve a hard look at occupancy claims.',
    },
  ],
  commercial: [
    {
      title: 'Commercial yield',
      formula: '(Monthly rent × 12) ÷ Price × 100',
      body: 'One corporate tenant, one clean number. The lease terms (lock-in, escalation, deposit) decide how dependable that number stays.',
    },
    {
      title: 'Escalation compounds',
      formula: 'Rent × (1 + escalation)^cycles',
      body: 'Indian leases typically escalate 5–15% every 3 years. That grows your yield without lifting a finger, as the projection card shows.',
    },
    {
      title: 'What good looks like',
      formula: 'Offices 6–8% · Retail 7–9%',
      body: 'Below 5% only makes sense for a blue-chip tenant on a long lease. Above 9% usually signals a weak tenant or a lease ending soon.',
    },
  ],
};

export default function RentalYieldCalculatorPage() {
  useEffect(() => {
    document.title = 'Rental Yield Calculator | VJR Estate';
    return () => setDefaultSiteMeta();
  }, []);

  const [type, setType] = useState<PropertyType>('residential');

  // Shared
  const [priceRes, setPriceRes] = useState(TYPE_DEFAULTS.residential.price);
  const [pricePg, setPricePg] = useState(TYPE_DEFAULTS.pg.price);
  const [priceComm, setPriceComm] = useState(TYPE_DEFAULTS.commercial.price);

  // Residential
  const [monthlyRent, setMonthlyRent] = useState(45000);
  const [resExpenses, setResExpenses] = useState<ResidentialExpenses>(DEFAULT_RESIDENTIAL);
  const [showResExpenses, setShowResExpenses] = useState(false);

  // PG
  const [pg, setPg] = useState<PgExpenses>(DEFAULT_PG);

  // Commercial
  const [comm, setComm] = useState<CommercialExpenses>(DEFAULT_COMMERCIAL);

  const resResult = useMemo(
    () => calcResidentialYield(priceRes, monthlyRent, resExpenses),
    [priceRes, monthlyRent, resExpenses],
  );
  const pgResult = useMemo(() => calcPgYield(pricePg, pg), [pricePg, pg]);
  const commResult = useMemo(() => calcCommercialYield(priceComm, comm), [priceComm, comm]);

  const result = type === 'pg' ? pgResult : type === 'commercial' ? commResult : resResult;
  const price = type === 'pg' ? pricePg : type === 'commercial' ? priceComm : priceRes;
  const verdict = getVerdict(result.grossYield, type);
  const netVerdict = getVerdict(result.netYield, type);
  const benchmarks = BENCHMARKS[type];
  const maxBenchmark = Math.max(...benchmarks.map((b) => b.value), result.grossYield);

  const waEnquiry = () =>
    openWhatsAppPropertyEnquiry(
      {
        id: 'rental-yield-calculator',
        title: 'Rental Yield Calculator Enquiry',
        type: PROPERTY_TYPES[type].label,
        area: '',
        price_label: `${formatINR(price)} @ ${formatYield(result.grossYield)} gross yield`,
        monthly_rental_label:
          type === 'pg' ? `${formatINRFull(pg.rentPerBed)} per bed` : formatINR(comm.monthlyRent),
      },
      { source: 'rental-yield-calculator', leadType: 'whatsapp' },
    );

  const switchType = (t: PropertyType) => setType(t);

  return (
    <div className="min-h-screen bg-white pt-[72px]" style={{ fontFamily: DM_SANS }}>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#0A1628]">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[760px] -translate-x-1/2 rounded-full bg-[#C9A84C]/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="max-w-3xl"
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#C9A84C]">
              <TrendUp size={14} weight="fill" />
              Investment Tools
            </p>
            <h1 className="font-display mt-5 text-3xl font-bold leading-[1.08] tracking-[-0.02em] text-white sm:text-4xl md:text-5xl">
              Rental Yield
              <span className="text-[#E4C877]"> Calculator</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/60 md:text-base">
              Pick your asset type, enter the price and income, and get the gross and net
              yield instantly — benchmarked against Bengaluru's market for that exact class.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-14 lg:px-16">
        {/* ── Property type selector ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(PROPERTY_TYPES) as PropertyType[]).map((t) => {
            const Icon = TYPE_ICONS[t];
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => switchType(t)}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition-all ${
                  active
                    ? 'border-[#C9A84C] bg-[#0A1628] shadow-[0_12px_32px_rgba(10,22,40,0.25)]'
                    : 'border-[#EBEBEB] bg-white shadow-sm hover:border-[#C9A84C]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                      active ? 'bg-[#C9A84C]/15 text-[#E4C877]' : 'bg-[#0A1628]/5 text-[#0A1628]'
                    }`}
                  >
                    <Icon size={20} weight={active ? 'fill' : 'regular'} />
                  </span>
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-white' : 'text-[#0A1628]'}`}>
                      {PROPERTY_TYPES[t].label}
                    </p>
                    <p className={`mt-0.5 text-[11px] leading-snug ${active ? 'text-white/50' : 'text-gray-400'}`}>
                      {PROPERTY_TYPES[t].hint}
                    </p>
                  </div>
                </div>
                {active && (
                  <motion.span
                    layoutId="type-glow"
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#C9A84C]/20 blur-2xl"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* ── Inputs ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                {PROPERTY_TYPES[type].label} Details
              </h2>
              <p className="mt-1 text-[12px] text-gray-400">{PROPERTY_TYPES[type].tagline}</p>

              <AnimatePresence mode="wait">
                <motion.div
                  key={type}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  {/* ═══ RESIDENTIAL ═══ */}
                  {type === 'residential' && (
                    <>
                      <PriceInput label="Property Price" value={priceRes} onChange={setPriceRes} />
                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between">
                          <label htmlFor="ry-rent" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <Wallet size={12} className="text-[#C9A84C]" weight="fill" />
                            Monthly Rent
                          </label>
                          <span className="font-numeric text-lg font-extrabold tracking-tight text-[#0A1628]">
                            {formatINRFull(monthlyRent)}
                          </span>
                        </div>
                        <input
                          id="ry-rent"
                          type="range"
                          min={5000}
                          max={1000000}
                          step={1000}
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(Number(e.target.value))}
                          className="premium-slider w-full"
                          aria-label="Monthly rent"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                          <span>₹5,000</span><span>₹10 L</span>
                        </div>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={monthlyRent ? monthlyRent.toLocaleString('en-IN') : ''}
                          onChange={(e) => setMonthlyRent(parseAmount(e.target.value))}
                          placeholder="Enter exact rent"
                          className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-700 outline-none transition-all focus:border-[#C9A84C] focus:bg-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowResExpenses((v) => !v)}
                        className="mt-6 flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-left transition-colors hover:border-[#C9A84C]/50"
                      >
                        <span className="flex items-center gap-2 text-[12px] font-semibold text-[#0A1628]">
                          <Wrench size={13} className="text-[#C9A84C]" weight="fill" />
                          Expenses &amp; vacancy
                          <span className="rounded-full bg-[#C9A84C]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#8a6d1f]">
                            Optional · Net yield
                          </span>
                        </span>
                        <motion.span animate={{ rotate: showResExpenses ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <ArrowRight size={14} className="text-gray-400" />
                        </motion.span>
                      </button>

                      {showResExpenses && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <NumField
                              id="ry-maintenance"
                              label="Maintenance"
                              sub="₹ / month"
                              value={resExpenses.maintenance}
                              max={200000}
                              step={500}
                              onChange={(v) => setResExpenses((p) => ({ ...p, maintenance: v }))}
                            />
                            <NumField
                              id="ry-propertyTax"
                              label="Property Tax"
                              sub="₹ / year"
                              value={resExpenses.propertyTax}
                              max={1000000}
                              step={1000}
                              onChange={(v) => setResExpenses((p) => ({ ...p, propertyTax: v }))}
                            />
                            <NumField
                              id="ry-insurance"
                              label="Insurance & Other"
                              sub="₹ / year"
                              value={resExpenses.insurance}
                              max={500000}
                              step={1000}
                              onChange={(v) => setResExpenses((p) => ({ ...p, insurance: v }))}
                            />
                            <NumField
                              id="ry-vacancy"
                              label="Vacancy"
                              sub="weeks / yr"
                              value={resExpenses.vacancyWeeks}
                              max={52}
                              step={1}
                              onChange={(v) => setResExpenses((p) => ({ ...p, vacancyWeeks: v }))}
                            />
                          </div>
                          <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
                            <Info size={12} className="mt-0.5 shrink-0" />
                            Net yield subtracts these running costs from annual rent — the truest
                            picture of what the asset actually pays you.
                          </p>
                        </motion.div>
                      )}
                    </>
                  )}

                  {/* ═══ PG BUILDING ═══ */}
                  {type === 'pg' && (
                    <>
                      <PriceInput label="Building Price" value={pricePg} onChange={setPricePg} />

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <NumField
                          id="pg-beds"
                          label={<><Bed size={10} className="inline" weight="fill" /> Total Beds</>}
                          sub="beds"
                          value={pg.beds}
                          max={500}
                          step={1}
                          onChange={(v) => setPg((p) => ({ ...p, beds: v }))}
                        />
                        <NumField
                          id="pg-rentbed"
                          label="Rent per Bed"
                          sub="₹ / month"
                          value={pg.rentPerBed}
                          max={100000}
                          step={500}
                          onChange={(v) => setPg((p) => ({ ...p, rentPerBed: v }))}
                        />
                      </div>

                      {/* Occupancy — the PG hero control */}
                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between">
                          <label htmlFor="pg-occupancy" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <Users size={12} className="text-[#C9A84C]" weight="fill" />
                            Occupancy
                          </label>
                          <span className="font-numeric text-lg font-extrabold tracking-tight text-[#0A1628]">
                            {pg.occupancy}%
                          </span>
                        </div>
                        <input
                          id="pg-occupancy"
                          type="range"
                          min={30}
                          max={100}
                          step={1}
                          value={pg.occupancy}
                          onChange={(e) => setPg((p) => ({ ...p, occupancy: Number(e.target.value) }))}
                          className="premium-slider w-full"
                          aria-label="Occupancy"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                          <span>30%</span><span>100% full</span>
                        </div>
                        <p className="mt-2 rounded-lg bg-[#0A1628]/[0.04] px-3 py-2 text-[11px] leading-relaxed text-gray-500">
                          {pgResult.occupiedBeds} of {pg.beds} beds occupied, collecting{' '}
                          {formatINRFull(pgResult.annualGrossRent / 12)} per month at current occupancy.
                        </p>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <NumField
                          id="pg-opex"
                          label="Cost per Bed"
                          sub="₹ / month"
                          value={pg.opexPerBed}
                          max={30000}
                          step={250}
                          onChange={(v) => setPg((p) => ({ ...p, opexPerBed: v }))}
                        />
                        <NumField
                          id="pg-tax"
                          label="Property Tax"
                          sub="₹ / year"
                          value={pg.propertyTax}
                          max={1000000}
                          step={5000}
                          onChange={(v) => setPg((p) => ({ ...p, propertyTax: v }))}
                        />
                        <NumField
                          id="pg-insurance"
                          label="Insurance & Other"
                          sub="₹ / year"
                          value={pg.insurance}
                          max={500000}
                          step={5000}
                          onChange={(v) => setPg((p) => ({ ...p, insurance: v }))}
                        />
                      </div>
                      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        Cost per bed covers staff, food, electricity, internet and marketing —
                        typically 35–50% of what each bed collects.
                      </p>
                    </>
                  )}

                  {/* ═══ COMMERCIAL ═══ */}
                  {type === 'commercial' && (
                    <>
                      <PriceInput label="Property Price" value={priceComm} onChange={setPriceComm} />

                      <div className="mt-6">
                        <div className="mb-2 flex items-center justify-between">
                          <label htmlFor="comm-rent" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            <Wallet size={12} className="text-[#C9A84C]" weight="fill" />
                            Monthly Lease Rent
                          </label>
                          <span className="font-numeric text-lg font-extrabold tracking-tight text-[#0A1628]">
                            {formatINRFull(comm.monthlyRent)}
                          </span>
                        </div>
                        <input
                          id="comm-rent"
                          type="range"
                          min={25000}
                          max={5000000}
                          step={5000}
                          value={comm.monthlyRent}
                          onChange={(e) => setComm((p) => ({ ...p, monthlyRent: Number(e.target.value) }))}
                          className="premium-slider w-full"
                          aria-label="Monthly lease rent"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                          <span>₹25,000</span><span>₹50 L</span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <NumField
                          id="comm-esc"
                          label="Escalation"
                          sub="% per cycle"
                          value={comm.escalation}
                          max={20}
                          step={0.5}
                          onChange={(v) => setComm((p) => ({ ...p, escalation: v }))}
                        />
                        <NumField
                          id="comm-esc-years"
                          label="Every"
                          sub="years"
                          value={comm.escalationYears}
                          max={5}
                          step={1}
                          onChange={(v) => setComm((p) => ({ ...p, escalationYears: Math.max(1, v) }))}
                        />
                        <NumField
                          id="comm-deposit"
                          label="Deposit Held"
                          sub="months of rent"
                          value={comm.depositMonths}
                          max={12}
                          step={1}
                          onChange={(v) => setComm((p) => ({ ...p, depositMonths: v }))}
                        />
                        <NumField
                          id="comm-vacancy"
                          label="Vacancy"
                          sub="weeks / yr"
                          value={comm.vacancyWeeks}
                          max={52}
                          step={1}
                          onChange={(v) => setComm((p) => ({ ...p, vacancyWeeks: v }))}
                        />
                        <NumField
                          id="comm-tax"
                          label="Property Tax"
                          sub="₹ / year"
                          value={comm.propertyTax}
                          max={1000000}
                          step={5000}
                          onChange={(v) => setComm((p) => ({ ...p, propertyTax: v }))}
                        />
                        <NumField
                          id="comm-other"
                          label="Owner Costs"
                          sub="₹ / year"
                          value={comm.otherCosts}
                          max={1000000}
                          step={5000}
                          onChange={(v) => setComm((p) => ({ ...p, otherCosts: v }))}
                        />
                      </div>
                      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        Indian commercial leases run 5–15% escalation every 3 years with 6–12
                        month deposits; CAM and utilities are usually billed to the tenant.
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* ── Results ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            className="space-y-6 lg:col-span-7"
          >
            {/* Verdict card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="relative overflow-hidden rounded-2xl bg-[#0A1628] p-6 shadow-lg md:p-8"
              >
                <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#C9A84C]/10 blur-3xl" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9A84C]">
                      {type === 'pg' ? 'PG Gross Yield' : type === 'commercial' ? 'Lease Yield' : 'Gross Rental Yield'}
                    </p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-numeric text-5xl font-extrabold tracking-tight text-white md:text-6xl">
                        {formatYield(result.grossYield)}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${verdict.chipClass}`}>
                        {verdict.label}
                      </span>
                    </div>
                    <p className="mt-3 max-w-md text-[13px] leading-relaxed text-white/60">
                      {verdict.message}
                    </p>
                  </div>
                  <YieldDial value={result.grossYield} color={verdict.color} max={type === 'residential' ? 10 : 12} />
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Metric grid — type-specific middle card */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Metric label="Net Yield" value={formatYield(result.netYield)} sub={`${netVerdict.label} after costs`} />
              <Metric
                label="Gross Income / yr"
                value={formatINR(result.annualGrossRent)}
                sub={type === 'pg' ? 'all beds, all year' : 'rent × 12'}
              />
              <Metric label="Net Income / yr" value={formatINR(result.annualNetRent)} sub="after costs & vacancy" />
              <Metric label="Payback" value={formatPayback(result.paybackYears)} sub="to recover full price" />
            </div>

            {/* Type-specific insight card */}
            {type === 'pg' && (
              <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                  <Bed size={13} className="text-[#C9A84C]" weight="fill" />
                  Per-Bed Economics
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MiniStat label="Beds occupied" value={`${pgResult.occupiedBeds} / ${pgResult.beds}`} />
                  <MiniStat label="Rent per bed" value={formatINRFull(pgResult.rentPerBed)} />
                  <MiniStat label="Net per bed" value={`${formatINRFull(pgResult.netPerBed)} / mo`} />
                  <MiniStat
                    label="Opex ratio"
                    value={`${Math.round(pgResult.opexRatio)}%`}
                    tone={pgResult.opexRatio > 55 ? 'text-red-600' : pgResult.opexRatio > 45 ? 'text-amber-600' : 'text-emerald-600'}
                  />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0A1628] to-[#C9A84C]"
                    style={{ width: `${pgResult.occupancy}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  Occupancy bar — every 5 points of occupancy moves the yield more than any other input.
                </p>
              </div>
            )}

            {type === 'commercial' && (
              <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                  <ChartLine size={13} className="text-[#C9A84C]" weight="fill" />
                  Lease Growth & Safety
                </h3>
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <MiniStat label="Rent at year 9" value={`${formatINRFull(commResult.rentAtYear9)} / mo`} />
                  <MiniStat label="Rent CAGR" value={`${commResult.escalationCagr.toFixed(1)}%`} />
                  <MiniStat label="Deposit held" value={formatINR(commResult.depositHeld)} />
                  <MiniStat
                    label="Income safety"
                    value={`${commResult.safetyWeeks} wks`}
                    tone={commResult.safetyWeeks >= 26 ? 'text-emerald-600' : commResult.safetyWeeks >= 12 ? 'text-amber-600' : 'text-red-600'}
                  />
                </div>
                <div className="mt-4 flex items-end gap-1.5" aria-hidden>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((yr) => {
                    const cycles = Math.floor(yr / Math.max(1, comm.escalationYears));
                    const rent = comm.monthlyRent * Math.pow(1 + comm.escalation / 100, cycles);
                    const h = (rent / commResult.rentAtYear9) * 100;
                    return (
                      <div key={yr} className="flex flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-t-md bg-gradient-to-t from-[#0A1628] to-[#1E3852]" style={{ height: `${Math.max(6, h * 0.6)}px` }} />
                        <span className="text-[8px] text-gray-400">Y{yr + 1}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                  Rent climbs with each escalation cycle — your yield grows even if the price stays flat.
                </p>
              </div>
            )}

            {type === 'residential' && (
              <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                  Where the money goes
                </h3>
                <div className="mt-5 space-y-3">
                  <MoneyRow label="Gross rent collected" value={resResult.annualGrossRent} widthPct={100} tone="bg-[#0A1628]" note={`${formatINRFull(monthlyRent)} × 12 months`} />
                  {resResult.annualExpenses > 0 && (
                    <MoneyRow label="Running costs" value={-resResult.annualExpenses} widthPct={(resResult.annualExpenses / Math.max(resResult.annualGrossRent, 1)) * 100} tone="bg-red-400" note="maintenance + tax + insurance" />
                  )}
                  {resExpenses.vacancyWeeks > 0 && (
                    <MoneyRow label={`Vacancy (${resExpenses.vacancyWeeks} weeks)`} value={-(resResult.annualGrossRent * resExpenses.vacancyWeeks / 52)} widthPct={((resResult.annualGrossRent * resExpenses.vacancyWeeks / 52) / Math.max(resResult.annualGrossRent, 1)) * 100} tone="bg-amber-400" note="weeks the unit sits empty" />
                  )}
                  <div className="border-t border-dashed border-gray-200 pt-3">
                    <MoneyRow label="Net in your pocket" value={resResult.annualNetRent} widthPct={resResult.annualGrossRent > 0 ? (resResult.annualNetRent / resResult.annualGrossRent) * 100 : 0} tone="bg-emerald-500" note={`${formatINRFull(resResult.monthlyNetRent)} / month`} strong />
                  </div>
                </div>
              </div>
            )}

            {/* Benchmark comparison */}
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                How you compare · {PROPERTY_TYPES[type].label}
              </h3>
              <div className="mt-5 space-y-4">
                {benchmarks.map((b) => {
                  const inBand = result.grossYield >= b.range[0] && result.grossYield <= b.range[1];
                  return (
                    <div key={b.label}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className={`font-semibold ${inBand ? 'text-[#0A1628]' : 'text-gray-500'}`}>
                          {b.label}
                          {inBand && <CheckCircle size={12} weight="fill" className="ml-1.5 inline text-emerald-600" />}
                        </span>
                        <span className="font-numeric text-gray-400">
                          {b.range[0]}–{b.range[1]}%
                        </span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-gray-100">
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gray-200" style={{ width: `${(b.value / maxBenchmark) * 100}%` }} />
                        {inBand && (
                          <div
                            className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-[#0A1628]"
                            style={{ left: `${Math.min(98, (result.grossYield / maxBenchmark) * 100)}%` }}
                            aria-hidden
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
                Bands reflect published Indian averages for this asset class. The dark marker
                shows where your {formatYield(result.grossYield)} sits.
              </p>
            </div>

            {/* Net money breakdown (all types) */}
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 shadow-sm md:p-8">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0A1628]">
                Where the money goes
              </h3>
              <div className="mt-5 space-y-3">
                <MoneyRow
                  label={type === 'pg' ? 'All beds, full collections' : 'Gross rent collected'}
                  value={result.annualGrossRent}
                  widthPct={100}
                  tone="bg-[#0A1628]"
                  note={
                    type === 'pg'
                      ? `${pgResult.occupiedBeds} beds × ${formatINRFull(pg.rentPerBed)} × 12`
                      : type === 'commercial'
                        ? `${formatINRFull(comm.monthlyRent)} × 12 months`
                        : `${formatINRFull(monthlyRent)} × 12 months`
                  }
                />
                {result.annualExpenses > 0 && (
                  <MoneyRow
                    label={type === 'pg' ? 'PG operations' : type === 'commercial' ? 'Owner costs' : 'Running costs'}
                    value={-result.annualExpenses}
                    widthPct={(result.annualExpenses / Math.max(result.annualGrossRent, 1)) * 100}
                    tone="bg-red-400"
                    note={
                      type === 'pg'
                        ? 'staff, food, utilities, tax + insurance'
                        : type === 'commercial'
                          ? 'tax + costs not passed to tenant'
                          : 'maintenance + tax + insurance'
                    }
                  />
                )}
                {result.annualGrossRent > result.annualExpenses + result.annualNetRent + 1 && (
                  <MoneyRow
                    label="Vacancy loss"
                    value={-(result.annualGrossRent - result.annualExpenses - result.annualNetRent)}
                    widthPct={((result.annualGrossRent - result.annualExpenses - result.annualNetRent) / Math.max(result.annualGrossRent, 1)) * 100}
                    tone="bg-amber-400"
                    note="income lost to empty periods"
                  />
                )}
                <div className="border-t border-dashed border-gray-200 pt-3">
                  <MoneyRow
                    label="Net in your pocket"
                    value={result.annualNetRent}
                    widthPct={result.annualGrossRent > 0 ? (result.annualNetRent / result.annualGrossRent) * 100 : 0}
                    tone="bg-emerald-500"
                    note={`${formatINRFull(result.monthlyNetRent)} / month`}
                    strong
                  />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rent per ₹1,000 invested</p>
                  <p className="font-numeric mt-1 text-lg font-extrabold text-[#0A1628]">
                    ₹{result.rentPerThousand.toFixed(1)}
                    <span className="text-xs font-medium text-gray-400"> / month</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Years to earn 1% back</p>
                  <p className="font-numeric mt-1 text-lg font-extrabold text-[#0A1628]">
                    {Number.isFinite(result.monthsPerPercent) ? `${Math.ceil(result.monthsPerPercent)} mo` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#C9A84C]/30 bg-gradient-to-br from-[#C9A84C]/10 to-transparent p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-[#0A1628]">Want assets that beat this yield?</p>
                <p className="mt-1 text-[12px] text-gray-500">
                  We curate PG buildings, residential blocks and pre-leased commercial assets with verified rent rolls.
                </p>
              </div>
              <button
                type="button"
                onClick={waEnquiry}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 text-sm font-bold text-white shadow-[0_4px_12px_rgba(37,211,102,0.3)] transition-all hover:-translate-y-0.5 hover:bg-[#1ebe5b]"
              >
                <WhatsappLogo size={16} weight="fill" />
                Ask an Advisor
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── Understanding yield ── */}
        <section className="mt-14 border-t border-[#EBEBEB] pt-10">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#0A1628]">
            Understand your numbers
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {EXPLAINERS[type].map((e) => (
              <div key={e.title} className="rounded-2xl border border-[#EBEBEB] bg-[#F8F9FA] p-6">
                <h3 className="text-sm font-bold text-[#0A1628]">{e.title}</h3>
                <p className="font-numeric mt-2 rounded-lg bg-white px-3 py-2 text-[12px] font-semibold text-[#8a6d1f] ring-1 ring-[#C9A84C]/25">
                  {e.formula}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{e.body}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <HouseLine size={12} className="text-[#C9A84C]" weight="fill" />
          {label}
        </span>
        <span className="font-numeric text-lg font-extrabold tracking-tight text-[#0A1628]">
          {formatINR(value)}
        </span>
      </div>
      <input
        type="range"
        min={1000000}
        max={200000000}
        step={500000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="premium-slider w-full"
        aria-label={label}
      />
      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
        <span>₹10 L</span><span>₹20 Cr</span>
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={value ? value.toLocaleString('en-IN') : ''}
        onChange={(e) => onChange(parseAmount(e.target.value))}
        placeholder="Enter exact price"
        className="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-2.5 text-sm text-gray-700 outline-none transition-all focus:border-[#C9A84C] focus:bg-white"
      />
    </div>
  );
}

function NumField({
  id,
  label,
  sub,
  value,
  max,
  step,
  onChange,
}: {
  id: string;
  label: React.ReactNode;
  sub: string;
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        {label} <span className="normal-case text-gray-300">({sub})</span>
      </label>
      <input
        id={id}
        type="number"
        min={0}
        max={max}
        step={step}
        value={value || ''}
        onChange={(e) => onChange(Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
        placeholder="0"
        className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm text-gray-700 outline-none transition-all focus:border-[#C9A84C] focus:bg-white"
      />
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="font-numeric mt-1.5 text-xl font-extrabold tracking-tight text-[#0A1628]">{value}</p>
      <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}

function MiniStat({ label, value, tone = 'text-[#0A1628]' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`font-numeric mt-1 text-base font-extrabold ${tone}`}>{value}</p>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  widthPct,
  tone,
  note,
  strong = false,
}: {
  label: string;
  value: number;
  widthPct: number;
  tone: string;
  note: string;
  strong?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className={strong ? 'font-bold text-[#0A1628]' : 'text-gray-500'}>{label}</span>
        <span className={`font-numeric ${strong ? 'text-base font-extrabold text-emerald-600' : 'font-semibold text-gray-700'}`}>
          {value < 0 ? `− ${formatINRFull(-value)}` : formatINRFull(value)}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, Math.max(0, widthPct))}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] text-gray-400">{note}</p>
    </div>
  );
}

function YieldDial({ value, color, max = 10 }: { value: number; color: string; max?: number }) {
  const clamped = Math.max(0, Math.min(max, value));
  const r = 52;
  const circumference = (270 / 360) * 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-32 w-32 shrink-0 sm:mx-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-[135deg]">
        <circle
          cx="60" cy="60" r={r}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"
          strokeDasharray={`${circumference} 999`}
          strokeLinecap="round"
        />
        <motion.circle
          cx="60" cy="60" r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference} 999`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (clamped / max) * circumference }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-numeric text-2xl font-extrabold text-white">{formatYield(value)}</span>
        <span className="text-[9px] uppercase tracking-wider text-white/40">of {max}% scale</span>
      </div>
    </div>
  );
}
