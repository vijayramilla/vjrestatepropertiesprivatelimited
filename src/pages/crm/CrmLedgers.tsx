import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, BellRing, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Download, FileText, Gavel, Landmark, Loader2, Plus, RefreshCw, Scale, ShieldCheck,
  Trash2, X, Sparkles,
} from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  fetchLedgerItems, upsertLedgerItem, deleteLedgerItem,
  fetchLedgerCases, upsertLedgerCase, deleteLedgerCase,
  type LedgerComplianceItem, type LedgerLegalCase,
} from '@/lib/supabaseData';
import {
  generateComplianceCalendar, riskBand, daysUntil, complianceToIcs,
  CURRENT_FY, CURRENT_FY_START_YEAR, type RiskBand,
} from '@/data/ledgerComplianceRules';

const LAW_STYLES: Record<string, { chip: string; dot: string; icon: typeof Landmark }> = {
  ROC: { chip: 'bg-[#0A1628]/[0.06] text-[#0A1628]', dot: 'bg-[#0A1628]', icon: Landmark },
  GST: { chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', icon: FileText },
  'Income Tax': { chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', icon: Scale },
  Labour: { chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: ShieldCheck },
  Corporate: { chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: Gavel },
  Other: { chip: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', icon: FileText },
};

const RISK_STYLES: Record<RiskBand, { chip: string; label: string; ring: string }> = {
  overdue: { chip: 'bg-red-50 text-red-700 ring-1 ring-red-200', label: 'OVERDUE', ring: 'border-l-red-500' },
  critical: { chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', label: 'DUE ≤ 7 DAYS', ring: 'border-l-orange-500' },
  warning: { chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', label: 'DUE ≤ 30 DAYS', ring: 'border-l-amber-400' },
  upcoming: { chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', label: 'ON TRACK', ring: 'border-l-emerald-400' },
  done: { chip: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', label: 'FILED', ring: 'border-l-gray-300' },
};

const fmtINR = (n: number) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`);
const fmtDate = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

type Tab = 'dashboard' | 'calendar' | 'cases';

export default function CrmLedgers() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [items, setItems] = useState<LedgerComplianceItem[]>([]);
  const [cases, setCases] = useState<LedgerLegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([fetchLedgerItems(CURRENT_FY), fetchLedgerCases()]);
      setItems((i.data ?? []) as LedgerComplianceItem[]);
      setCases((c.data ?? []) as LedgerLegalCase[]);
    } catch { /* first-run: tables may not exist yet — generator still works client-side */ }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  /* ── Generate the full FY calendar from the rules master and sync to DB ── */
  const seedCalendar = async () => {
    setSeeding(true);
    try {
      const generated = generateComplianceCalendar(CURRENT_FY_START_YEAR);
      const existingKeys = new Set(items.map((i) => `${i.form}|${i.period}`));
      const fresh = generated.filter((g) => !existingKeys.has(`${g.form}|${g.period}`));
      for (const g of fresh) {
        await upsertLedgerItem({ ...g, status: 'pending' } as LedgerComplianceItem);
      }
      await load();
      setSeeded(fresh.length);
      setTimeout(() => setSeeded(false), 4000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate calendar');
    }
    setSeeding(false);
  };

  /* ── Derived dashboard data ── */
  const buckets = useMemo(() => {
    const b: Record<RiskBand, LedgerComplianceItem[]> = { overdue: [], critical: [], warning: [], upcoming: [], done: [] };
    for (const it of items) b[riskBand(it)].push(it);
    b.overdue.sort((a, z) => a.due_date.localeCompare(z.due_date));
    return b;
  }, [items]);

  const penaltyExposure = useMemo(
    () => [...buckets.overdue, ...buckets.critical, ...buckets.warning].reduce((s, i) => s + (i.penalty_exposure ?? 0), 0),
    [buckets],
  );
  const complianceScore = items.length === 0 ? 100 : Math.round(((items.length - buckets.overdue.length) / items.length) * 100);
  const next5 = useMemo(
    () => items.filter((i) => i.status === 'pending' || i.status === 'in_progress').slice(0, 5),
    [items],
  );

  /* ── ICS export ── */
  const exportIcs = () => {
    const blob = new Blob([complianceToIcs(items as never)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vjr-compliance-${CURRENT_FY.replace(/\s/g, '')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Finance & Legal"
            title="Ledgers"
            description="Statutory compliance calendar, legal case register and penalty exposure — FY 2026-27, Karnataka. Rule dates verified Oct 2026; always confirm with your CA/CS."
            actions={
              <div className="flex flex-wrap gap-2">
                <CrmBtn variant="ghost" onClick={exportIcs} disabled={items.length === 0}>
                  <CalendarPlus className="h-3.5 w-3.5" /> Export .ics
                </CrmBtn>
                <CrmBtn variant="ghost" onClick={() => void load()} disabled={loading}>
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </CrmBtn>
                <CrmBtn variant="gold" onClick={() => void seedCalendar()} disabled={seeding}>
                  {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {items.length === 0 ? 'Generate FY 2026-27 Calendar' : 'Sync New Rules'}
                </CrmBtn>
              </div>
            }
          />

          {/* ── Executive summary strip ── */}
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={String(buckets.overdue.length)} sub="file immediately" delay={0} />
            <StatCard icon={Clock} tone="orange" label="Due in 7 days" value={String(buckets.critical.length)} sub="this week" delay={0.05} />
            <StatCard icon={BellRing} tone="amber" label="Due in 30 days" value={String(buckets.warning.length)} sub="plan ahead" delay={0.1} />
            <StatCard icon={Scale} tone="navy" label="Penalty exposure" value={fmtINR(penaltyExposure)} sub="if pending items slip" delay={0.15} />
          </div>

          {/* ── Health score bar ── */}
          <CrmCard className="mb-6 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-[15px] font-extrabold ${complianceScore >= 90 ? 'bg-emerald-50 text-emerald-600' : complianceScore >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                  {complianceScore}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#0A1628]">Compliance health score</p>
                  <p className="text-[11px] text-[#6b7280]">
                    {items.length} tracked obligations · {buckets.overdue.length} overdue · {cases.filter((c) => c.status !== 'closed').length} open legal matters
                  </p>
                </div>
              </div>
              {seeded && (
                <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {seeded} new obligations added
                </motion.span>
              )}
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">{CURRENT_FY} · April–March</p>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${complianceScore}%` }}
                transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                className={`h-full rounded-full ${complianceScore >= 90 ? 'bg-emerald-500' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
              />
            </div>
          </CrmCard>

          {/* ── Tabs ── */}
          <div className="mb-4 flex gap-1.5 overflow-x-auto rounded-xl border border-black/[0.06] bg-white p-1">
            {([['dashboard', 'Priority Queue'], ['calendar', 'Full Calendar'], ['cases', 'Legal Cases']] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative whitespace-nowrap rounded-lg px-4 py-2 text-[12.5px] font-bold transition-colors ${tab === key ? 'text-white' : 'text-[#6b7280] hover:text-[#0A1628]'}`}
              >
                {tab === key && (
                  <motion.span layoutId="ledger-tab" className="absolute inset-0 rounded-lg bg-[#0A1628]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                )}
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'dashboard' && <PriorityQueue buckets={buckets} next5={next5} cases={cases} loading={loading} onChanged={load} />}
              {tab === 'calendar' && <FullCalendar items={items} loading={loading} onChanged={load} />}
              {tab === 'cases' && <LegalCases cases={cases} loading={loading} onChanged={load} />}
            </motion.div>
          </AnimatePresence>

          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] leading-relaxed text-amber-800">
            <strong>Disclaimer:</strong> Ledgers supports — but does not replace — professional advice. Due dates follow
            central + Karnataka rules as verified in Oct 2026; authorities extend deadlines by circular from time to time.
            Confirm every filing with your CA/CS before relying on this calendar.
          </p>
        </CrmPageBody>
      </main>
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, tone, label, value, sub, delay }: { icon: typeof AlertTriangle; tone: 'red' | 'orange' | 'amber' | 'navy'; label: string; value: string; sub: string; delay: number }) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    amber: 'bg-amber-50 text-amber-600',
    navy: 'bg-[#0A1628] text-[#D6B85D]',
  };
  return (
    <CrmCard className="p-4 sm:p-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <p className="mt-2.5 text-[22px] font-extrabold leading-none tracking-tight text-[#0A1628]">{value}</p>
        <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A1628]">{label}</p>
        <p className="text-[10.5px] text-[#9ca3af]">{sub}</p>
      </motion.div>
    </CrmCard>
  );
}

/* ── Priority queue (dashboard tab) ── */
function PriorityQueue({ buckets, next5, cases, loading, onChanged }: {
  buckets: Record<RiskBand, LedgerComplianceItem[]>;
  next5: LedgerComplianceItem[];
  cases: LedgerLegalCase[];
  loading: boolean;
  onChanged: () => void;
}) {
  const hearingSoon = cases
    .filter((c) => c.next_hearing_on && c.status !== 'closed')
    .sort((a, z) => (a.next_hearing_on ?? '').localeCompare(z.next_hearing_on ?? ''))
    .slice(0, 4);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />;

  const sections: [RiskBand, string][] = [['overdue', 'Overdue — act now'], ['critical', 'Due within 7 days'], ['warning', 'Due within 30 days']];

  return (
    <div className="space-y-5">
      {sections.map(([band, label]) => (
        <div key={band}>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A1628]">
            <span className={`h-2 w-2 rounded-full ${band === 'overdue' ? 'animate-pulse bg-red-500' : band === 'critical' ? 'bg-orange-500' : 'bg-amber-400'}`} />
            {label} <span className="text-[#9ca3af]">({buckets[band].length})</span>
          </p>
          {buckets[band].length === 0 ? (
            <p className="rounded-xl border border-dashed border-black/10 bg-white px-4 py-3 text-[12px] text-[#9ca3af]">Nothing here — good.</p>
          ) : (
            <div className="space-y-2">
              {buckets[band].map((it) => <ItemRow key={it.id} item={it} onChanged={onChanged} />)}
            </div>
          )}
        </div>
      ))}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A1628]">Next up</p>
          <CrmCard className="divide-y divide-black/[0.05] p-0">
            {next5.length === 0 && <p className="px-4 py-4 text-[12px] text-[#9ca3af]">Generate the FY calendar to populate this queue.</p>}
            {next5.map((it) => (
              <div key={it.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${LAW_STYLES[it.law]?.dot ?? 'bg-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-[#0A1628]">{it.form} · {it.title}</p>
                  <p className="text-[10.5px] text-[#9ca3af]">{it.period} · {fmtDate(it.due_date)}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-[#96782A]">{daysUntil(it.due_date)}d</span>
              </div>
            ))}
          </CrmCard>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0A1628]">
            <Gavel className="h-3.5 w-3.5 text-[#C9A84C]" /> Hearings & notice replies
          </p>
          <CrmCard className="divide-y divide-black/[0.05] p-0">
            {hearingSoon.length === 0 && <p className="px-4 py-4 text-[12px] text-[#9ca3af]">No upcoming hearings. Add them in Legal Cases.</p>}
            {hearingSoon.map((c) => {
              const d = daysUntil(c.next_hearing_on!);
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-extrabold ${d < 0 ? 'bg-red-50 text-red-600' : d <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-[#0A1628]/[0.06] text-[#0A1628]'}`}>
                    {d < 0 ? '⚠' : `${d}d`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-[#0A1628]">{c.title}</p>
                    <p className="text-[10.5px] text-[#9ca3af]">{c.authority || 'Authority'} · hearing {fmtDate(c.next_hearing_on!)}</p>
                  </div>
                </div>
              );
            })}
          </CrmCard>
        </div>
      </div>
    </div>
  );
}

/* ── Single compliance row with status controls ── */
function ItemRow({ item, onChanged }: { item: LedgerComplianceItem; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const band = riskBand(item);
  const law = LAW_STYLES[item.law] ?? LAW_STYLES.Other;

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await upsertLedgerItem({ id: item.id, status, filed_date: status === 'filed' ? new Date().toISOString().slice(0, 10) : item.filed_date ?? null });
      onChanged();
    } finally { setSaving(false); setOpen(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${item.form} (${item.period}) from the calendar?`)) return;
    setSaving(true);
    try { await deleteLedgerItem(item.id!); onChanged(); } finally { setSaving(false); }
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-shadow hover:shadow-[0_4px_16px_rgba(10,22,40,0.08)] ${RISK_STYLES[band].ring}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left">
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${law.chip}`}>
          <law.icon className="h-3 w-3" /> {item.law}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[#0A1628]">
            {item.form} <span className="font-semibold text-[#6b7280]">· {item.title}</span>
          </p>
          <p className="truncate text-[11px] text-[#9ca3af]">{item.period} · due {fmtDate(item.due_date)} · {item.notes}</p>
        </div>
        <span className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide sm:inline-block ${RISK_STYLES[band].chip}`}>
          {band === 'overdue' ? `${Math.abs(daysUntil(item.due_date))}d LATE` : band === 'done' ? 'FILED' : `${daysUntil(item.due_date)}d`}
        </span>
        {saving && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#96782A]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="grid grid-cols-2 gap-3 border-t border-black/[0.05] bg-[#fafafa] px-4 py-3.5 sm:grid-cols-4">
              <Detail label="Due date" value={fmtDate(item.due_date)} />
              <Detail label="Period" value={item.period} />
              <Detail label="Filed on" value={item.filed_date ? fmtDate(item.filed_date) : '—'} />
              <Detail label="ARN / SRN" value={item.arn || '—'} />
              <div className="col-span-2 sm:col-span-4">
                <Detail label="Penalty rule" value={item.source_url ? `${item.source_url}` : '—'} />
              </div>
              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-4">
                <CrmBtn variant="gold" onClick={() => void setStatus('filed')} disabled={saving}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Mark filed
                </CrmBtn>
                <CrmBtn variant="ghost" onClick={() => void setStatus('in_progress')} disabled={saving}>In progress</CrmBtn>
                <CrmBtn variant="ghost" onClick={() => void setStatus('na')} disabled={saving}>Not applicable</CrmBtn>
                <button type="button" onClick={() => void remove()} className="ml-auto inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-bold text-red-500 transition-colors hover:bg-red-50">
                  <Trash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{label}</p>
      <p className="mt-0.5 text-[12px] font-semibold text-[#0A1628]">{value}</p>
    </div>
  );
}

/* ── Full calendar tab ── */
function FullCalendar({ items, loading, onChanged }: { items: LedgerComplianceItem[]; loading: boolean; onChanged: () => void }) {
  const [lawFilter, setLawFilter] = useState('All');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const byMonth = useMemo(() => {
    const map = new Map<string, LedgerComplianceItem[]>();
    for (const it of items) {
      if (lawFilter !== 'All' && it.law !== lawFilter) continue;
      const key = it.due_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items, lawFilter]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />;
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
        <p className="mt-3 text-sm font-semibold text-[#0A1628]">No calendar yet</p>
        <p className="mt-1 text-xs text-[#9ca3af]">Hit "Generate FY 2026-27 Calendar" above — the engine builds every GST, TDS, ROC, PF/ESI and Karnataka obligation for the year.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {['All', 'GST', 'Income Tax', 'ROC', 'Labour', 'Corporate', 'Other'].map((l) => (
          <button
            key={l}
            onClick={() => setLawFilter(l)}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${lawFilter === l ? 'bg-[#0A1628] text-[#D6B85D]' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="space-y-2.5">
        {byMonth.map(([month, list]) => {
          const monthLabel = new Date(month + '-01T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
          const overdue = list.filter((i) => riskBand(i) === 'overdue').length;
          const isOpen = expandedMonth === month || (expandedMonth === null && overdue > 0);
          return (
            <CrmCard key={month} className="overflow-hidden p-0">
              <button type="button" onClick={() => setExpandedMonth(isOpen && expandedMonth === month ? null : month)} className="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left">
                <ChevronDown className={`h-4 w-4 text-[#9ca3af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="text-[13.5px] font-extrabold text-[#0A1628]">{monthLabel}</span>
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-bold text-[#6b7280]">{list.length} filings</span>
                {overdue > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-extrabold text-red-600">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> {overdue} overdue
                  </span>
                )}
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="space-y-2 border-t border-black/[0.05] p-3">
                      {list.map((it) => <ItemRow key={it.id} item={it} onChanged={onChanged} />)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CrmCard>
          );
        })}
      </div>
    </div>
  );
}

/* ── Legal cases tab ── */
const CASE_STATUSES = ['open', 'reply_filed', 'hearing', 'closed'];

function LegalCases({ cases, loading, onChanged }: { cases: LedgerLegalCase[]; loading: boolean; onChanged: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LedgerLegalCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<LedgerLegalCase>>({});

  const openNew = () => { setEditing(null); setForm({ status: 'open', case_type: 'Notice' }); setShowForm(true); };
  const openEdit = (c: LedgerLegalCase) => { setEditing(c); setForm(c); setShowForm(true); };
  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      await upsertLedgerCase(editing ? { ...form, id: editing.id } : form);
      setShowForm(false); onChanged();
    } catch (e) { alert(e instanceof Error ? e.message : 'Save failed'); }
    setSaving(false);
  };
  const remove = async (id: string) => {
    if (!window.confirm('Delete this case record?')) return;
    try { await deleteLedgerCase(id); onChanged(); } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const statusStyle: Record<string, string> = {
    open: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    reply_filed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    hearing: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    closed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <CrmBtn variant="gold" onClick={openNew}><Plus className="h-3.5 w-3.5" /> New case / notice</CrmBtn>
      </div>

      {showForm && (
        <CrmCard className="mb-5 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">{editing ? 'Edit case' : 'New case / notice'}</p>
            <button onClick={() => setShowForm(false)} className="cursor-pointer rounded-lg p-1 text-[#9ca3af] hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Title *" className="sm:col-span-2"><input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className={CRM_INPUT} placeholder="e.g. GST notice — ITC mismatch FY 24-25" /></Field>
            <Field label="Authority"><input value={form.authority ?? ''} onChange={(e) => setForm((f) => ({ ...f, authority: e.target.value }))} className={CRM_INPUT} placeholder="GST Dept / IT Dept / NCLT…" /></Field>
            <Field label="Type">
              <select value={form.case_type ?? ''} onChange={(e) => setForm((f) => ({ ...f, case_type: e.target.value }))} className={CRM_INPUT}>
                {['Notice', 'Appeal', 'Hearing', 'Inquiry', 'Civil', 'Other'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Case / notice no."><input value={form.case_no ?? ''} onChange={(e) => setForm((f) => ({ ...f, case_no: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Status">
              <select value={form.status ?? 'open'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={CRM_INPUT}>
                {CASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Notice received / filed on"><input type="date" value={form.filed_on ?? ''} onChange={(e) => setForm((f) => ({ ...f, filed_on: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Reply due by"><input type="date" value={form.reply_due_on ?? ''} onChange={(e) => setForm((f) => ({ ...f, reply_due_on: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Next hearing"><input type="date" value={form.next_hearing_on ?? ''} onChange={(e) => setForm((f) => ({ ...f, next_hearing_on: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Advocate"><input value={form.advocate ?? ''} onChange={(e) => setForm((f) => ({ ...f, advocate: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Advocate phone"><input value={form.advocate_phone ?? ''} onChange={(e) => setForm((f) => ({ ...f, advocate_phone: e.target.value }))} className={CRM_INPUT} /></Field>
            <Field label="Documents link" className="sm:col-span-2"><input value={form.documents_url ?? ''} onChange={(e) => setForm((f) => ({ ...f, documents_url: e.target.value }))} className={CRM_INPUT} placeholder="Drive / vault URL" /></Field>
            <Field label="Description" className="sm:col-span-2 lg:col-span-4"><textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${CRM_INPUT} min-h-[64px]`} placeholder="What is the matter about? Next steps…" /></Field>
          </div>
          <div className="mt-4 flex gap-2">
            <CrmBtn onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add case'}</CrmBtn>
            <CrmBtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</CrmBtn>
          </div>
        </CrmCard>
      )}

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
          <Gavel className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
          <p className="mt-3 text-sm font-semibold text-[#0A1628]">No legal matters tracked</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Add GST/IT/ROC/labour notices, court matters and their deadlines — hearings surface on the dashboard automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cases.map((c) => {
            const replyD = c.reply_due_on ? daysUntil(c.reply_due_on) : null;
            const hearingD = c.next_hearing_on ? daysUntil(c.next_hearing_on) : null;
            return (
              <CrmCard key={c.id} className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold text-[#0A1628]">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#6b7280]">{[c.case_no, c.authority, c.case_type].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusStyle[c.status ?? 'open'] ?? statusStyle.open}`}>{(c.status ?? 'open').replace('_', ' ')}</span>
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-[#6b7280]">{c.description}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniDeadline label="Reply due" date={c.reply_due_on} days={replyD} />
                  <MiniDeadline label="Next hearing" date={c.next_hearing_on} days={hearingD} />
                  <MiniDeadline label="Filed on" date={c.filed_on} days={null} />
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3">
                  <p className="min-w-0 flex-1 truncate text-[11px] text-[#6b7280]">
                    {c.advocate && <span className="font-bold text-[#0A1628]">{c.advocate}</span>}{c.advocate_phone ? ` · ${c.advocate_phone}` : ''}
                  </p>
                  {c.documents_url && (
                    <a href={c.documents_url} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]">
                      <Download className="h-3 w-3" /> Docs
                    </a>
                  )}
                  <button onClick={() => openEdit(c)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]">Edit</button>
                  <button onClick={() => c.id && void remove(c.id)} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50"><Trash2 className="h-3 w-3" /></button>
                </div>
              </CrmCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MiniDeadline({ label, date, days }: { label: string; date?: string | null; days: number | null }) {
  const tone = days === null ? 'text-[#6b7280]' : days < 0 ? 'text-red-600' : days <= 7 ? 'text-orange-600' : 'text-[#0A1628]';
  return (
    <div className="rounded-xl bg-[#fafafa] px-2.5 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">{label}</p>
      <p className={`mt-0.5 text-[11.5px] font-bold ${tone}`}>{date ? fmtDate(date) : '—'}</p>
      {days !== null && date && <p className="text-[10px] font-semibold text-[#9ca3af]">{days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}</p>}
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">{label}</label>
      {children}
    </div>
  );
}
