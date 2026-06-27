import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  House,
  Buildings,
  MapPin,
  CurrencyInr,
  Clock,
  Funnel,
} from '@phosphor-icons/react';
import {
  subscribeRequirements,
  toPublicRequirement,
  formatBudgetRange,
  REQUIREMENT_PROPERTY_TYPES,
  REQUIREMENT_TIMELINES,
  type PublicRequirement,
  type RequirementDoc,
} from '@/lib/requirements';
import RequirementMatchModal from '@/components/RequirementMatchModal';
import RequirementStatusBadge from '@/components/requirements/RequirementStatusBadge';
import RequirementMetaRow from '@/components/requirements/RequirementMetaRow';
import { BANGALORE_AREAS } from '@/data/properties';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

const BUDGET_FILTERS = [
  { label: 'All Budgets', min: 0, max: Infinity },
  { label: 'Under ₹50 L', min: 0, max: 5000000 },
  { label: '₹50 L – ₹1 Cr', min: 5000000, max: 10000000 },
  { label: '₹1 Cr – ₹5 Cr', min: 10000000, max: 50000000 },
  { label: 'Above ₹5 Cr', min: 50000000, max: Infinity },
];

function purposeLabel(req: PublicRequirement): string {
  if (req.purpose === 'Other' && req.purposeOther) return req.purposeOther;
  return req.purpose;
}

function typeLabel(req: PublicRequirement): string {
  if (req.propertyType === 'Other' && req.propertyTypeOther) return req.propertyTypeOther;
  return req.propertyType;
}

export default function RequirementsBoardPage() {
  const [all, setAll] = useState<RequirementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [budgetFilter, setBudgetFilter] = useState('All Budgets');
  const [timelineFilter, setTimelineFilter] = useState('All Timelines');
  const [matchTarget, setMatchTarget] = useState<PublicRequirement | null>(null);

  useEffect(() => {
    const unsub = subscribeRequirements(
      (items) => {
        setAll(items);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const openRequirements = useMemo(
    () =>
      all
        .filter((r) => r.status === 'open')
        .map((r) => toPublicRequirement(r.id!, r)),
    [all],
  );

  const filtered = useMemo(() => {
    const budgetPreset = BUDGET_FILTERS.find((b) => b.label === budgetFilter) ?? BUDGET_FILTERS[0];
    return openRequirements.filter((req) => {
      if (typeFilter !== 'All Types' && req.propertyType !== typeFilter) return false;
      if (locationFilter !== 'All Locations' && !req.locations.includes(locationFilter)) return false;
      if (timelineFilter !== 'All Timelines' && req.timeline !== timelineFilter) return false;
      if (budgetFilter !== 'All Budgets') {
        const overlaps =
          req.budgetMax >= budgetPreset.min && req.budgetMin <= budgetPreset.max;
        if (!overlaps) return false;
      }
      return true;
    });
  }, [openRequirements, typeFilter, locationFilter, budgetFilter, timelineFilter]);

  const selectClass =
    'rounded-none border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium uppercase tracking-[0.08em] text-gray-800 focus:border-black focus:outline-none';

  return (
    <div className="min-h-screen bg-white pt-[72px]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black px-4 py-12 md:px-8 md:py-16"
      >
        <div className="mx-auto max-w-5xl">
          <p
            className="text-[10px] uppercase tracking-[0.22em] text-gray-500"
            style={{ fontFamily: DM_SANS }}
          >
            Buyer Requirements
          </p>
          <h1 className="font-display mt-3 text-3xl text-white md:text-5xl">Requirements Board</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-gray-400 md:text-base">
            Curated buyer mandates across Bangalore — match your listing with active investor and end-user
            requirements.
          </p>
        </div>
      </motion.div>

      <div className="mx-auto max-w-5xl px-4 py-10 md:py-12">
        <div className="mb-8 flex flex-wrap items-center gap-3 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-2 text-gray-400">
            <Funnel size={14} weight="thin" />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em]">Filter</span>
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={selectClass}>
            <option>All Types</option>
            {REQUIREMENT_PROPERTY_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className={selectClass}
          >
            <option>All Locations</option>
            {BANGALORE_AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
            className={selectClass}
          >
            {BUDGET_FILTERS.map((b) => (
              <option key={b.label}>{b.label}</option>
            ))}
          </select>
          <select
            value={timelineFilter}
            onChange={(e) => setTimelineFilter(e.target.value)}
            className={selectClass}
          >
            <option>All Timelines</option>
            {REQUIREMENT_TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} open requirement{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse border border-gray-100 bg-gray-50" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-gray-200 py-20 text-center">
            <p className="text-sm text-gray-500">No open requirements match your filters.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {filtered.map((req, index) => (
              <motion.article
                key={req.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                className="border border-gray-200 bg-white transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 md:px-6">
                  <p className="font-mono text-xs font-semibold tracking-wide text-black md:text-sm">
                    {req.reqId}
                  </p>
                  <RequirementStatusBadge status={req.status} />
                </div>

                <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 md:px-6 md:py-6">
                  <RequirementMetaRow icon={House} label="Purpose" value={purposeLabel(req)} />
                  <RequirementMetaRow icon={Buildings} label="Property Type" value={typeLabel(req)} />
                  <RequirementMetaRow
                    icon={MapPin}
                    label="Location"
                    value={req.locations.join(', ')}
                  />
                  <RequirementMetaRow
                    icon={CurrencyInr}
                    label="Budget"
                    value={formatBudgetRange(req.budgetMin, req.budgetMax)}
                  />
                  <RequirementMetaRow icon={Clock} label="Timeline" value={req.timeline} />
                </div>

                {req.notes && (
                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-4 md:px-6">
                    <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                      Special Requirements
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{req.notes}</p>
                  </div>
                )}

                <div className="border-t border-gray-100 px-5 py-4 md:px-6">
                  <button
                    type="button"
                    onClick={() => setMatchTarget(req)}
                    className="h-11 w-full border border-black bg-black text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-black"
                  >
                    I Have a Matching Property
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>

      <RequirementMatchModal
        requirement={matchTarget}
        open={!!matchTarget}
        onClose={() => setMatchTarget(null)}
      />
    </div>
  );
}
