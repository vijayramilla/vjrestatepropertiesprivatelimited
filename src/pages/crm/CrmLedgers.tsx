import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, BellRing, Building2, CalendarDays, CalendarPlus,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock, Download, FileText,
  Gavel, History, Landmark, Loader2, Pencil, Plus, RefreshCw, Scale, Search, Settings2,
  ShieldCheck, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  fetchLedgerItems, upsertLedgerItem, deleteLedgerItem,
  fetchLedgerCases, upsertLedgerCase, deleteLedgerCase,
  fetchLedgerProfile, saveLedgerProfile, fetchLedgerActivity, uploadLedgerLogo,
  fetchLedgerPayments, fetchLedgerNotices, fetchLedgerDirectors, fetchLedgerDocuments,
  generateLedgerCalendar, fetchLedgerNotifications, runLedgerReminders,
  markLedgerNotificationRead, markAllLedgerNotificationsRead,
  fetchGstProfile, saveGstProfile, fetchGstTurnover, saveGstTurnover, evaluateGstThreshold,
  fetchCompanyMaster, saveCompanyMasterRow, upsertLedgerRow,
  type GstProfile, type GstTurnoverRecord, type GstEvaluation, type GstThresholdEvent, type GstStatus,
  type CompanyMasterData, type LedgerShareholder, type LedgerMoaObject,
  type LedgerNotification,
  type LedgerComplianceItem, type LedgerLegalCase, type LedgerCompanyProfile,
  type LedgerPayment, type LedgerNotice, type LedgerDirector, type LedgerDocument,
} from '@/lib/supabaseData';
import { kycState, deriveKyc } from '@/data/directorKyc';
import { PaymentsRegister, NoticesRegister, DirectorsRegister, DocumentsRegister, type DocLink } from '@/pages/crm/LedgerRegisters';
import {
  riskBand, daysUntil, complianceToIcs,
  ENTITY_TYPES, REGISTRATION_OPTIONS, currentFyLabel, availableFyLabels,
  type RiskBand,
} from '@/data/ledgerComplianceRules';

/* ── Palette / shared styles ── */

const LAW_STYLES: Record<string, { chip: string; dot: string; icon: typeof Landmark }> = {
  ROC: { chip: 'bg-[#0A1628]/[0.06] text-[#0A1628]', dot: 'bg-[#0A1628]', icon: Landmark },
  LLP: { chip: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500', icon: FileText },
  GST: { chip: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', icon: FileText },
  'Income Tax': { chip: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500', icon: Scale },
  Labour: { chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', icon: ShieldCheck },
  Corporate: { chip: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500', icon: Gavel },
  Licences: { chip: 'bg-cyan-50 text-cyan-700', dot: 'bg-cyan-500', icon: Building2 },
  Other: { chip: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', icon: FileText },
};

const RISK_STYLES: Record<RiskBand, { chip: string; ring: string }> = {
  overdue: { chip: 'bg-red-50 text-red-700 ring-1 ring-red-200', ring: 'border-l-red-500' },
  critical: { chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', ring: 'border-l-orange-500' },
  warning: { chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', ring: 'border-l-amber-400' },
  upcoming: { chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', ring: 'border-l-emerald-400' },
  done: { chip: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200', ring: 'border-l-gray-300' },
};

const fmtINR = (n: number) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${n.toLocaleString('en-IN')}`);
const fmtDate = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const entityLabel = (v: string) => ENTITY_TYPES.find((e) => e.value === v)?.label ?? v;

const HeaderChip = ({ k, v }: { k: string; v: string }) => (
  <span className="rounded-lg bg-white/70 px-2 py-1 ring-1 ring-black/[0.06]">
    <span className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{k} </span>
    <span className="text-[11px] font-bold text-[#0A1628]">{v}</span>
  </span>
);

type Tab = 'compliances' | 'dashboard' | 'calendar' | 'gst' | 'payments' | 'notices' | 'documents' | 'directors' | 'cases' | 'audit' | 'profile';

export default function CrmLedgers() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('compliances');
  const [profile, setProfile] = useState<LedgerCompanyProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [items, setItems] = useState<LedgerComplianceItem[]>([]);
  const [cases, setCases] = useState<LedgerLegalCase[]>([]);
  const [notices, setNotices] = useState<LedgerNotice[]>([]);
  const [payments, setPayments] = useState<LedgerPayment[]>([]);
  const [directors, setDirectors] = useState<LedgerDirector[]>([]);
  const [documents, setDocuments] = useState<LedgerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seededCount, setSeededCount] = useState<number | null>(null);
  const [genError, setGenError] = useState('');
  const [genSummary, setGenSummary] = useState<{ rulesEvaluated: number; applicable: number; notApplicable: number; saved: number; skippedDuplicates: number } | null>(null);
  const [selectedFy, setSelectedFy] = useState('');
  // ── GST engine state (spec §66: status / monitoring / generation) ──
  const [gstProfile, setGstProfile] = useState<GstProfile | null>(null);
  const [gstEval, setGstEval] = useState<GstEvaluation | null>(null);
  const [gstEvent, setGstEvent] = useState<GstThresholdEvent | null>(null);

  /* ── Load profile first — drives everything else ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchLedgerProfile();
        if (res.data) setProfile(res.data as LedgerCompanyProfile);
      } catch { /* first run — profile simply doesn't exist yet */ }
      setProfileLoaded(true);
    })();
  }, []);

  const fy = profile?.fy_start_month ? currentFyLabel(profile.fy_start_month) : currentFyLabel(4);
  useEffect(() => { if (!selectedFy && profile) setSelectedFy(fy); }, [profile, fy, selectedFy]);

  // Reload items once the profile arrives from the DB — the wizard's optimistic
  // setProfile alone never triggers a fetch, which is why the queue stayed at 0
  // after setup until a manual refresh.
  const profileKey = profile?.name ? 'loaded' : 'none';
  useEffect(() => { if (profileKey === 'loaded' && selectedFy) void loadItems(); }, [profileKey]);

  const loadItems = async () => {
    setLoading(true);
    // Each register degrades to [] on its own — an older proxy or a missing
    // table must never blank out the registers that did load. Older ledger
    // fetchers resolve to { data: [...] }, newer ones to a plain array —
    // normalise both so state is always a real array.
    const safe = async <T,>(p: Promise<T[] | { data?: unknown[] }>): Promise<T[]> => {
      try {
        const r = await p;
        return (Array.isArray(r) ? r : (r?.data ?? [])) as T[];
      } catch { return []; }
    };
    const [i, c, n, p, dr, dc] = await Promise.all([
      safe<LedgerComplianceItem>(fetchLedgerItems(selectedFy || undefined)),
      safe<LedgerLegalCase>(fetchLedgerCases()),
      safe<LedgerNotice>(fetchLedgerNotices()),
      safe<LedgerPayment>(fetchLedgerPayments(selectedFy || undefined)),
      safe<LedgerDirector>(fetchLedgerDirectors()),
      safe<LedgerDocument>(fetchLedgerDocuments()),
    ]);
    setItems(i);
    setCases(c);
    setNotices(n);
    setPayments(p);
    setDirectors(dr);
    setDocuments(dc);
    setLoading(false);
  };
  useEffect(() => { if (selectedFy) void loadItems(); }, [selectedFy]);

  const saveProfile = async (p: Partial<LedgerCompanyProfile>) => {
    const merged = { ...profile, ...p } as LedgerCompanyProfile;
    setProfile(merged); // optimistic
    await saveLedgerProfile(merged);
  };

  /* ── Generate calendar — the rule engine runs SERVER-side in the data proxy,
     so statutory logic never depends on the browser and each obligation is
     stamped with the rule version that produced it. Existing rows (manual
     edits, filed status, ARN) are never touched. ── */
  const seedCalendar = async () => {
    if (!profile) return;
    setSeeding(true);
    setGenError('');
    try {
      // Label is "FY 2026-27" — take the first 4-digit year (the FY start).
      // Number("2026-27") would be NaN and silently abort generation.
      const fyStartYear = Number(selectedFy.match(/(\d{4})/)?.[1]);
      if (!Number.isFinite(fyStartYear)) {
        setGenError('No financial year selected — pick an FY in the dropdown and try again.');
        setSeeding(false);
        return;
      }
      const result = await generateLedgerCalendar(fyStartYear);
      await loadItems();
      // Spec §46: show the full evaluation summary after every generation.
      const s = (result as { summary?: { rulesEvaluated?: number; applicable?: number; notApplicable?: number } }).summary;
      setGenSummary({
        rulesEvaluated: s?.rulesEvaluated ?? result.generated ?? 0,
        applicable: s?.applicable ?? result.generated ?? 0,
        notApplicable: s?.notApplicable ?? 0,
        saved: result.saved ?? 0,
        skippedDuplicates: (result as { skippedDuplicates?: number }).skippedDuplicates ?? 0,
      });
      setTimeout(() => setGenSummary(null), 8000);
      void loadGst(); // thresholds may have been crossed by new turnover data
      if ((result.saved ?? 0) === 0) {
        setGenError(`Nothing new to add — every evaluated obligation for ${selectedFy} already exists. Rule version v${result.ruleVersion}.`);
      } else {
        setSeededCount(result.saved);
        setTimeout(() => setSeededCount(null), 5000);
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Could not generate calendar');
    }
    setSeeding(false);
  };

  /* ── Reminder bell (server scan + in-app notifications) ── */
  const [notifs, setNotifs] = useState<LedgerNotification[]>([]);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [remindersRunning, setRemindersRunning] = useState(false);
  const loadNotifs = useCallback(async () => {
    try {
      const r = await fetchLedgerNotifications();
      setNotifs(Array.isArray(r?.data) ? r.data : []);
    } catch { setNotifs([]); }
  }, []);
  useEffect(() => { void loadNotifs(); }, [loadNotifs]);

  /* ── GST engine loaders — profile + threshold evaluation for this FY ── */
  const loadGst = useCallback(async () => {
    if (!selectedFy) return;
    try {
      const [p, e] = await Promise.all([
        fetchGstProfile().catch(() => ({ data: null })),
        evaluateGstThreshold(selectedFy).catch(() => null),
      ]);
      setGstProfile(p.data);
      if (e) { setGstEval(e.eval); setGstEvent(e.event); }
    } catch { /* GST tables may not exist yet — card simply hides */ }
  }, [selectedFy]);
  useEffect(() => { void loadGst(); }, [loadGst]);

  const unread = notifs.filter((n) => !n.read_at).length;
  const runReminders = async () => {
    setRemindersRunning(true);
    try {
      await runLedgerReminders();
      await loadNotifs();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Reminder scan failed');
    }
    setRemindersRunning(false);
  };
  const markAllRead = async () => {
    try { await markAllLedgerNotificationsRead(); setNotifs((ns) => ns.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))); } catch { /* noop */ }
  };
  const markRead = async (id: string) => {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)));
    try { await markLedgerNotificationRead(id); } catch { /* noop */ }
  };

  /* ── Derived ── */
  const buckets = useMemo(() => {
    const b: Record<RiskBand, LedgerComplianceItem[]> = { overdue: [], critical: [], warning: [], upcoming: [], done: [] };
    for (const it of items) b[riskBand(it)].push(it);
    for (const k of Object.keys(b) as RiskBand[]) b[k].sort((a, z) => a.due_date.localeCompare(z.due_date));
    return b;
  }, [items]);

  const penaltyExposure = useMemo(
    () => [...buckets.overdue, ...buckets.critical, ...buckets.warning].reduce((s, i) => s + (i.penalty_exposure ?? 0), 0),
    [buckets],
  );
  const complianceScore = items.length === 0 ? 100 : Math.round(((items.length - buckets.overdue.length) / items.length) * 100);
  const openCases = cases.filter((c) => c.status !== 'closed').length;

  // Everything a document can be attached to — feeds the Documents vault picker.
  const docLinks: DocLink[] = useMemo(() => [
    ...items.filter((i) => i.id).map((i) => ({ type: 'item', id: i.id!, label: `${i.form} · ${i.title}` })),
    ...cases.filter((c) => c.id).map((c) => ({ type: 'case', id: c.id!, label: c.title })),
    ...notices.filter((n) => n.id).map((n) => ({ type: 'notice', id: n.id!, label: n.subject ?? 'Notice' })),
    ...payments.filter((p) => p.id).map((p) => ({ type: 'payment', id: p.id!, label: p.title ?? 'Payment' })),
    ...directors.filter((d) => d.id).map((d) => ({ type: 'director', id: d.id!, label: d.name ?? 'Director' })),
  ], [items, cases, notices, payments, directors]);

  const exportIcs = () => {
    const blob = new Blob([complianceToIcs(items, profile?.name || 'VJR Estate')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-${selectedFy.replace(/\s/g, '')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [
      ['Law', 'Form', 'Title', 'Period', 'FY', 'Due date', 'Status', 'Filed on', 'ARN/SRN', 'Assignee', 'Priority', 'Penalty exposure', 'Rule / source'],
      ...items.map((i) => [i.law, i.form, i.title, i.period, i.fy, i.due_date, i.status, i.filed_date ?? '', i.arn ?? '', i.assignee ?? '', i.priority ?? 'normal', String(i.penalty_exposure ?? 0), i.source_url ?? '']),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-${selectedFy.replace(/\s/g, '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const showOnboarding = profileLoaded && !profile?.name;

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Finance & Legal"
            title="Ledgers"
            description={
              profile?.name
                ? `${entityLabel(profile.entity_type)}${profile.incorporated_on ? ` · incorporated ${fmtDate(profile.incorporated_on)}` : ''} · ${selectedFy}`
                : 'Company compliance calendar, legal register and penalty exposure.'
            }
            titleExtra={
              profile?.name ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-r from-[#C9A84C]/[0.08] to-transparent px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0A1628] shadow-[0_2px_8px_rgba(10,22,40,0.25)]">
                      <Building2 className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.6} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-['Instrument_Serif',Georgia,serif] text-[17px] leading-tight text-[#0A1628]">{profile.name}</span>
                      {profile.cin && <span className="block truncate text-[10px] font-semibold tracking-wide text-[#9ca3af]">CIN {profile.cin}</span>}
                    </span>
                  </span>
                  {profile.pan && <HeaderChip k="PAN" v={profile.pan} />}
                  {profile.gstin && <HeaderChip k="GSTIN" v={profile.gstin} />}
                  {profile.tan && <HeaderChip k="TAN" v={profile.tan} />}
                </div>
              ) : undefined
            }
            actions={
              !showOnboarding && (
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <CrmBtn variant="ghost" onClick={() => setNotifsOpen((o) => !o)} aria-label="Reminders">
                      <Bell className={`h-3.5 w-3.5 ${unread > 0 ? 'text-[#96782A]' : ''}`} />
                      <span className="hidden sm:inline">Reminders</span>
                      {unread > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">{unread}</span>
                      )}
                    </CrmBtn>
                    {notifsOpen && (
                      <div className="absolute right-0 z-30 mt-2 w-[360px] max-w-[92vw] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_40px_rgba(10,22,40,0.18)]">
                        <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em]">Reminders</p>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => void runReminders()} disabled={remindersRunning} className="cursor-pointer rounded-lg px-2 py-1 text-[10.5px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1] disabled:opacity-50">
                              {remindersRunning ? 'Scanning…' : 'Scan now'}
                            </button>
                            {unread > 0 && (
                              <button type="button" onClick={() => void markAllRead()} className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold text-[#6b7280] transition-colors hover:bg-black/[0.04]">
                                <CheckCheck className="h-3 w-3" /> Mark read
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-[380px] divide-y divide-black/[0.04] overflow-y-auto">
                          {notifs.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                              <BellRing className="mx-auto h-6 w-6 text-[#C9A84C]" strokeWidth={1.5} />
                              <p className="mt-2 text-[12px] font-semibold">No reminders yet</p>
                              <p className="mx-auto mt-1 max-w-[260px] text-[10.5px] leading-relaxed text-[#9ca3af]">
                                A nightly job scans every deadline (filings, hearings, notices, payments, KYC, document expiry) and posts 30/15/7/3/1-day and overdue alerts here. “Scan now” runs the same check immediately.
                              </p>
                            </div>
                          ) : (
                            notifs.map((n) => {
                              const sev = n.severity ?? 'info';
                              return (
                                <button key={n.id} type="button" onClick={() => n.id && void markRead(n.id)} className={`flex w-full cursor-pointer gap-2.5 px-4 py-3 text-left transition-colors hover:bg-[#C9A84C]/[0.04] ${n.read_at ? 'opacity-55' : ''}`}>
                                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${sev === 'urgent' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12px] font-bold">{n.title}</span>
                                    <span className="mt-0.5 block text-[10.5px] leading-relaxed text-[#6b7280]">{n.body}</span>
                                    <span className="mt-1 block text-[9.5px] font-semibold uppercase tracking-wide text-[#9ca3af]">
                                      {n.kind ?? 'reminder'}{n.created_at ? ` · ${new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}
                                    </span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <CrmBtn variant="ghost" onClick={() => setTab('profile')}>
                    <Settings2 className="h-3.5 w-3.5" /> Company
                  </CrmBtn>
                  <CrmBtn variant="ghost" onClick={exportIcs} disabled={items.length === 0}>
                    <CalendarPlus className="h-3.5 w-3.5" /> .ics
                  </CrmBtn>
                  <CrmBtn variant="ghost" onClick={exportCsv} disabled={items.length === 0}>
                    <Download className="h-3.5 w-3.5" /> CSV
                  </CrmBtn>
                  <CrmBtn variant="ghost" onClick={() => void loadItems()} disabled={loading}>
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </CrmBtn>
                  <CrmBtn variant="gold" onClick={() => void seedCalendar()} disabled={seeding}>
                    {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{items.length === 0 ? 'Generate Calendar' : 'Sync New'}</span>
                  </CrmBtn>
                </div>
              )
            }
          />

          <AnimatePresence mode="wait">
            {showOnboarding ? (
              <OnboardingWizard key="onboard" onDone={(p) => { setProfile(p); setSelectedFy(currentFyLabel(p.fy_start_month)); setTab('compliances'); }} />
            ) : (
              <motion.div key="main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                {/* FY selector + summary */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  {profile?.logo_url ? (
                    <img src={profile.logo_url} alt="Company logo" className="h-11 w-11 rounded-xl border border-black/[0.08] bg-white object-contain p-1 shadow-sm" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A1628] text-[14px] font-extrabold text-[#D6B85D] shadow-sm">
                      {(profile?.name || 'V').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 rounded-xl border border-black/[0.08] bg-white px-3 py-1.5">
                    <CalendarDays className="h-3.5 w-3.5 text-[#96782A]" />
                    <select
                      value={selectedFy}
                      onChange={(e) => setSelectedFy(e.target.value)}
                      className="cursor-pointer bg-transparent text-[12px] font-bold text-[#0A1628] outline-none"
                    >
                      {availableFyLabels(profile?.incorporated_on, profile?.fy_start_month ?? 4).map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <span className="text-[11px] text-[#9ca3af]">{items.length} obligations tracked · {openCases} open legal matters</span>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <StatCard icon={AlertTriangle} tone="red" label="Overdue" value={String(buckets.overdue.length)} sub="act immediately" delay={0} />
                  <StatCard icon={Clock} tone="orange" label="Due in 7 days" value={String(buckets.critical.length)} sub="this week" delay={0.05} />
                  <StatCard icon={BellRing} tone="amber" label="Due in 30 days" value={String(buckets.warning.length)} sub="plan ahead" delay={0.1} />
                  <StatCard icon={Scale} tone="navy" label="Penalty exposure" value={fmtINR(penaltyExposure)} sub="if pending items slip" delay={0.15} />
                </div>

                {/* Health score — "Not assessed" until real obligations exist */}
                <CrmCard className="mb-6 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {items.length === 0 ? (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-[10px] font-extrabold text-gray-500">N/A</div>
                      ) : (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-extrabold ${complianceScore >= 90 ? 'bg-emerald-50 text-emerald-600' : complianceScore >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                          {complianceScore}
                        </div>
                      )}
                      <div>
                        <p className="text-[13px] font-bold">{items.length === 0 ? 'Compliance health — Not assessed' : 'Compliance health score'}</p>
                        <p className="text-[11px] text-[#6b7280]">
                          {items.length === 0
                            ? 'No compliance obligations have been generated for this financial year yet.'
                            : `${items.length} tracked obligations · ${buckets.overdue.length} overdue · ${openCases} legal matters`}
                        </p>
                      </div>
                    </div>
                    {seededCount !== null && (
                      <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {seededCount} obligations added
                      </motion.span>
                    )}
                    {genError && (
                      <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="w-full rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[12px] font-semibold text-red-700">
                        {genError}
                      </motion.p>
                    )}
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: items.length === 0 ? '0%' : `${complianceScore}%` }}
                      transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                      className={`h-full rounded-full ${complianceScore >= 90 ? 'bg-emerald-500' : complianceScore >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    />
                  </div>
                </CrmCard>

                {/* GST status card (spec §18/§61) — three independent concepts */}
                {gstEval && <GstStatusCard gst={gstEval} event={gstEvent} onOpen={() => setTab('gst')} />}

                {/* Tabs — sticky on mobile for one-hand reach, 44px targets */}
                <div className="mb-4 sticky top-[64px] z-20 -mx-4 overflow-x-auto rounded-xl border border-black/[0.06] bg-white/95 px-4 py-1 backdrop-blur [scrollbar-width:none] sm:mx-0 sm:px-1">
                  {([['compliances', 'Legal Compliances'], ['dashboard', 'Priority Queue'], ['calendar', 'Calendar'], ['gst', 'GST Monitor'], ['payments', 'Payments'], ['notices', 'Notices'], ['documents', 'Documents'], ['directors', 'Directors'], ['cases', 'Legal Cases'], ['audit', 'Audit Trail'], ['profile', 'Company Profile']] as [Tab, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      aria-current={tab === key ? 'page' : undefined}
                      className={`relative inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap rounded-lg px-3.5 text-[12.5px] font-bold transition-colors sm:min-h-[40px] sm:px-4 ${tab === key ? 'text-white' : 'text-[#6b7280] hover:text-[#0A1628]'}`}
                    >
                      {tab === key && <motion.span layoutId="ledger-tab" className="absolute inset-0 rounded-lg bg-[#0A1628]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {tab === 'compliances' && <LegalCompliancesTable items={items} loading={loading} />}
                    {tab === 'dashboard' && <PriorityQueue buckets={buckets} cases={cases} notices={notices} payments={payments} directors={directors} loading={loading} onChanged={loadItems} />}
                    {tab === 'calendar' && <FullCalendar items={items} loading={loading} onChanged={loadItems} />}
                    {tab === 'gst' && <GstMonitor gst={gstProfile} evalResult={gstEval} event={gstEvent} fy={selectedFy} onChanged={() => { void loadGst(); void loadItems(); }} />}
                    {tab === 'payments' && <PaymentsRegister payments={payments} items={items} fy={selectedFy} loading={loading} onChanged={loadItems} />}
                    {tab === 'notices' && <NoticesRegister notices={notices} loading={loading} onChanged={loadItems} />}
                    {tab === 'documents' && <DocumentsRegister documents={documents} fy={selectedFy} links={docLinks} loading={loading} onChanged={loadItems} />}
                    {tab === 'directors' && <DirectorsRegister directors={directors} fy={selectedFy} incorporatedOn={profile?.incorporated_on} items={items} loading={loading} onChanged={loadItems} />}
                    {tab === 'cases' && <LegalCases cases={cases} loading={loading} onChanged={loadItems} />}
                    {tab === 'audit' && <AuditTrail />}
                    {tab === 'profile' && <CompanyMaster profile={profile!} onSave={saveProfile} onChanged={loadItems} />}
                  </motion.div>
                </AnimatePresence>

                <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] leading-relaxed text-amber-800">
                  <strong>Disclaimer:</strong> Ledgers supports — but does not replace — professional advice. Dates follow
                  central + Karnataka rules verified Oct 2026; authorities extend deadlines by circular. Confirm every filing
                  with your CA/CS.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </CrmPageBody>
      </main>
    </div>
  );
}

/* ═══════════════ GST ENGINE UI (spec §3/§18/§44/§52/§66) ═══════════════
 *
 * GST registration status, threshold monitoring and compliance generation
 * are three independent concepts. The monitor tracks PAN-based aggregate
 * turnover against the rule-driven threshold; a crossing creates a review
 * event — never a filing. Regular/Composition are exclusive modes.
 */

const GST_STATUS_LABELS: Record<GstStatus, string> = {
  not_registered: 'Not Registered',
  registration_required: 'Registration Required',
  application_in_progress: 'Application In Progress',
  registered_regular: 'Registered — Regular',
  registered_composition: 'Registered — Composition',
  voluntarily_registered: 'Voluntarily Registered',
  cancelled: 'Cancelled',
  suspended: 'Suspended',
  requires_review: 'Requires Review',
};

const GST_TONE: Partial<Record<GstStatus, string>> = {
  registered_regular: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  registered_composition: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  voluntarily_registered: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  registration_required: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  application_in_progress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  cancelled: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  suspended: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  requires_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  not_registered: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
};

function GstStatusCard({ gst, event, onOpen }: { gst: GstEvaluation; event: GstThresholdEvent | null; onOpen: () => void }) {
  const crossed = gst.crossed || gst.status === 'registration_required';
  const registered = gst.registered;
  const tone = crossed ? 'border-red-300 bg-red-50/[0.5]' : registered ? 'border-emerald-200 bg-emerald-50/[0.4]' : 'border-black/[0.06] bg-white';
  return (
    <CrmCard className={`mb-6 p-4 sm:p-5 ${tone}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${crossed ? 'bg-red-100 text-red-600' : registered ? 'bg-emerald-100 text-emerald-600' : 'bg-[#0A1628] text-[#D6B85D]'}`}>
          <Landmark className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
            GST
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${GST_TONE[gst.status] ?? GST_TONE.not_registered}`}>
              {GST_STATUS_LABELS[gst.status]}
            </span>
            {gst.monitoring && !registered && <span className="text-[10.5px] font-semibold text-[#6b7280]">· Threshold monitoring ON</span>}
          </p>
          {registered ? (
            <p className="mt-1 text-[11.5px] text-[#6b7280]">GST compliance generation active — see Legal Compliances for GSTR obligations.</p>
          ) : crossed ? (
            <p className="mt-1 text-[11.5px] text-red-700">
              Threshold crossed: ₹{(gst.turnover / 100000).toFixed(2)}L / ₹{(gst.threshold / 100000).toFixed(2)}L{event?.crossing_date ? ` on ${fmtDate(event.crossing_date)}` : ''} — registration review required.
            </p>
          ) : (
            <p className="mt-1 text-[11.5px] text-[#6b7280]">
              FY turnover ₹{(gst.turnover / 100000).toFixed(2)}L of ₹{(gst.threshold / 100000).toFixed(2)}L threshold ({gst.pctUsed}%) · Remaining ₹{(gst.remaining / 100000).toFixed(2)}L · No registration trigger detected.
            </p>
          )}
        </div>
        <CrmBtn variant={crossed ? 'gold' : 'ghost'} onClick={onOpen}>
          {crossed ? 'Review Now' : 'GST Monitor'} <ArrowRight className="h-3.5 w-3.5" />
        </CrmBtn>
      </div>
      {!registered && gst.monitoring && (
        <div className="mt-3.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, gst.pctUsed)}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              className={`h-full rounded-full ${gst.pctUsed >= 100 ? 'bg-red-500' : gst.pctUsed >= 90 ? 'bg-orange-500' : gst.pctUsed >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
          <p className="mt-1.5 text-[10.5px] font-semibold text-[#9ca3af]">
            {gst.pctUsed >= 100 ? 'THRESHOLD CROSSED — ACTION REQUIRED' : gst.pctUsed >= 90 ? 'GST threshold approaching' : `${gst.pctUsed}% of threshold used`}
          </p>
        </div>
      )}
    </CrmCard>
  );
}

function GstMonitor({ gst, evalResult, event, fy, onChanged }: { gst: GstProfile | null; evalResult: GstEvaluation | null; event: GstThresholdEvent | null; fy: string; onChanged: () => void }) {
  const [f, setF] = useState<Partial<GstProfile>>(gst ?? {});
  const [turnover, setTurnover] = useState('');
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => setF(gst ?? {}), [gst]);

  const save = async (patch: Partial<GstProfile>) => {
    setSaving(true);
    try {
      await saveGstProfile(patch);
      setSavedMsg('GST settings saved');
      setTimeout(() => setSavedMsg(''), 2500);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save GST settings');
    }
    setSaving(false);
  };

  const recordTurnover = async () => {
    const v = Number(turnover.replace(/[^\d.]/g, ''));
    if (!v || v <= 0) { alert('Enter a valid aggregate turnover amount'); return; }
    setSaving(true);
    try {
      await saveGstTurnover({ period: fy, period_type: 'annual', fy, aggregate_turnover: v, as_of_date: asOf, source: 'Manual' });
      setTurnover('');
      setSavedMsg('Turnover recorded');
      setTimeout(() => setSavedMsg(''), 2500);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not record turnover');
    }
    setSaving(false);
  };

  const setStatus = (status: GstStatus) => {
    // Activation requires registration facts (spec §13); cancellation keeps history (§54).
    if (['registered_regular', 'registered_composition', 'voluntarily_registered'].includes(status) && !f.gstin) {
      const gin = window.prompt('Enter the GSTIN to activate GST compliance:');
      if (!gin) return;
      setF((x) => ({ ...x, gstin: gin.trim().toUpperCase(), status }));
      void save({ gstin: gin.trim().toUpperCase(), status, effective_date: f.effective_date ?? new Date().toISOString().slice(0, 10), compliance_generation_enabled: true });
      return;
    }
    setF((x) => ({ ...x, status }));
    void save({ status });
  };

  const inputCls = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20';
  const e = evalResult;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Threshold monitor */}
      {e && (
        <CrmCard className="p-4 sm:p-6">
          <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><Landmark className="h-3.5 w-3.5" /> GST threshold monitor — {fy}</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[24px] font-extrabold leading-none tracking-tight">₹{e.turnover.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-[11px] text-[#9ca3af]">Aggregate turnover · threshold ₹{e.threshold.toLocaleString('en-IN')}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold ${e.crossed ? 'bg-red-100 text-red-700' : e.pctUsed >= 90 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {e.crossed ? 'THRESHOLD CROSSED' : `${e.pctUsed}% · Monitoring`}
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, e.pctUsed)}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${e.pctUsed >= 100 ? 'bg-red-500' : e.pctUsed >= 90 ? 'bg-orange-500' : e.pctUsed >= 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          </div>
          {e.crossed && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-[12.5px] font-bold text-red-800">GST REGISTRATION REVIEW REQUIRED</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-red-700">
                Aggregate turnover ₹{e.turnover.toLocaleString('en-IN')} crossed the ₹{e.threshold.toLocaleString('en-IN')} threshold{event?.crossing_date ? ` on ${fmtDate(event.crossing_date)}` : ''}.
                Evaluate compulsory-registration conditions with your CA — the registration deadline is calculated from the actual liability date, never from a fixed calendar date.
              </p>
              {event?.registration_deadline && <p className="mt-2 text-[11.5px] font-bold text-red-800">Registration deadline: {fmtDate(event.registration_deadline)}</p>}
            </div>
          )}
          {e.reviewRequired && !e.crossed && e.unknownExceptions > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11.5px] leading-relaxed text-amber-800">
              GST applicability review required — {e.unknownExceptions} registration condition{e.unknownExceptions > 1 ? 's' : ''} not yet confirmed (inter-state supplies, compulsory-registration categories, exempt-only supplies, e-commerce, agent, reverse-charge). Answer them below.
            </div>
          )}
        </CrmCard>
      )}

      {/* Turnover entry (spec §7 mode A) */}
      <CrmCard className="p-4 sm:p-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Record aggregate turnover — {fy}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_170px_auto]">
          <div><Label>Current aggregate turnover (₹)</Label><input inputMode="numeric" value={turnover} onChange={(ev) => setTurnover(ev.target.value)} className={inputCls} placeholder="e.g. 1420000" /></div>
          <div><Label>As of date</Label><input type="date" value={asOf} onChange={(ev) => setAsOf(ev.target.value)} className={inputCls} /></div>
          <div className="flex items-end"><CrmBtn variant="gold" onClick={() => void recordTurnover()} disabled={saving || !turnover}>Record</CrmBtn></div>
        </div>
        <p className="mt-2.5 text-[11px] text-[#9ca3af]">PAN-based all-India aggregate: taxable + exempt + exports + inter-state supplies, minus excluded taxes. Crossing the threshold creates a review event — never a filing.</p>
      </CrmCard>

      {/* GST control center (spec §5/§52) */}
      <CrmCard className="p-4 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><Settings2 className="h-3.5 w-3.5" /> GST control center</p>

        <div className="space-y-4">
          <div>
            <Label>GST registration status</Label>
            <div className="flex flex-wrap gap-2">
              {(['not_registered', 'application_in_progress', 'registered_regular', 'registered_composition', 'voluntarily_registered', 'cancelled', 'suspended', 'requires_review'] as GstStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-all duration-200 ${f.status === s ? 'bg-[#0A1628] text-[#D6B85D] shadow-[0_2px_8px_rgba(10,22,40,0.2)]' : 'bg-black/[0.05] text-[#6b7280] hover:bg-black/[0.09]'}`}
                >
                  {GST_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#9ca3af]">Regular and Composition are mutually exclusive taxpayer modes — choosing one clears the other. Cancelling preserves all GST history.</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>GSTIN</Label>
              <input value={f.gstin ?? ''} onChange={(ev) => setF((x) => ({ ...x, gstin: ev.target.value.toUpperCase() }))} className={inputCls} maxLength={15} placeholder="29ABCDE1234F1Z5" />
            </div>
            <div>
              <Label>Registration effective date</Label>
              <input type="date" value={f.effective_date ?? ''} onChange={(ev) => setF((x) => ({ ...x, effective_date: ev.target.value || null }))} className={inputCls} />
            </div>
            <div>
              <Label>Filing frequency</Label>
              <select value={f.filing_frequency ?? 'monthly'} onChange={(ev) => setF((x) => ({ ...x, filing_frequency: ev.target.value as 'monthly' | 'qrmp' }))} className={inputCls}>
                <option value="monthly">Monthly</option>
                <option value="qrmp">QRMP (quarterly)</option>
              </select>
            </div>
            <div>
              <Label>Applicable threshold (₹)</Label>
              <input inputMode="numeric" value={f.threshold_amount ?? 2000000} onChange={(ev) => setF((x) => ({ ...x, threshold_amount: Number(ev.target.value.replace(/\D/g, '')) || 0 }))} className={inputCls} />
            </div>
          </div>

          {/* Exception conditions (spec §11) — never inferred */}
          <div className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Registration conditions — answer from company facts</p>
            <div className="mt-3 space-y-2.5">
              {([
                ['interstate_taxable_supply', 'Inter-State taxable outward supplies?'],
                ['compulsory_registration_condition', 'Falls under any compulsory-registration category (Sec 24)?'],
                ['exempt_supply_only', 'Makes exclusively exempt / non-taxable supplies?'],
                ['ecommerce_condition', 'Sells through an e-commerce operator?'],
                ['agent_condition', 'Acts as an agent of a taxable principal?'],
                ['reverse_charge_condition', 'Receives supplies under reverse charge?'],
                ['other_state_registration', 'GST registrations in other states under the same PAN?'],
              ] as [keyof GstProfile, string][]).map(([key, label]) => (
                <TriStateRow
                  key={String(key)}
                  label={label}
                  value={(f[key] as boolean | null | undefined) ?? null}
                  onChange={(v) => { setF((x) => ({ ...x, [key]: v })); void save({ [key]: v } as Partial<GstProfile>); }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <CrmBtn variant="gold" onClick={() => void save(f)} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save GST settings
            </CrmBtn>
            {savedMsg && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] font-bold text-emerald-600">{savedMsg}</motion.span>}
          </div>
        </div>
      </CrmCard>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11.5px] leading-relaxed text-amber-800">
        Threshold: services ₹20 lakh (Sec 22, CGST Act — Karnataka) unless changed above. Exceptions and compulsory-registration
        categories (Sec 24) change this — confirm applicability and registration deadlines with your CA/CS.
      </p>
    </div>
  );
}

function TriStateRow({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const opts: [string, boolean | null][] = [['Yes', true], ['No', false], ['Unknown', null]];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="min-w-0 flex-1 text-[12px] font-semibold text-[#374151]">{label}</p>
      <div className="flex gap-1.5">
        {opts.map(([lbl, v]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={value === v}
            className={`min-h-[36px] cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors sm:min-h-[30px] sm:px-2.5 sm:text-[10.5px] ${value === v ? 'bg-[#0A1628] text-white' : 'bg-black/[0.05] text-[#6b7280] hover:bg-black/[0.09]'}`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ ONBOARDING WIZARD ═══════════════ */

function OnboardingWizard({ onDone }: { onDone: (p: LedgerCompanyProfile) => void }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [f, setF] = useState<Partial<LedgerCompanyProfile>>({
    entity_type: 'pvtltd',
    fy_start_month: 4,
    // Karnataka pvtltd real-estate brokerage, turnover below ₹20L: no GST yet.
    // PTEC (₹2,500/yr company PT) is the baseline; PTRC only when employees.
    registrations: ['rera_agent', 'shops', 'trade_licence', 'ptec', 'tds'],
    gst_scheme: 'monthly',
    employee_count: 0,
    turnover_band: 'lt_2cr',
    registered_office: '',
  });

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadLedgerLogo(file);
      setF((x) => ({ ...x, logo_url: url }));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Logo upload failed — you can add it later in Company Profile.');
    }
    setLogoUploading(false);
  };

  const steps = ['Company', 'Entity', 'Registrations', 'Advisors'];
  const entity = ENTITY_TYPES.find((e) => e.value === f.entity_type);

  const finish = async () => {
    setSaving(true);
    const p = { ...f, name: f.name ?? '' } as LedgerCompanyProfile;
    try {
      await saveLedgerProfile(p);
      onDone(p);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save company profile');
    }
    setSaving(false);
  };

  const inputCls = 'h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-[14px] outline-none transition-colors focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20';

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <CrmCard className="mx-auto max-w-2xl overflow-hidden p-0">
        {/* Wizard header */}
        <div className="relative overflow-hidden bg-[#0A1628] px-6 py-6 sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#C9A84C]/15 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] shadow-[0_4px_16px_rgba(201,168,76,0.4)]">
              <Building2 className="h-5 w-5 text-[#0A1628]" strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">Ledgers · Setup</p>
              <p className="text-[16px] font-bold text-white sm:text-[18px]">Set up your company's compliance</p>
            </div>
          </div>
          {/* Steps */}
          <div className="relative mt-5 flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={s} className="flex flex-1 flex-col gap-1.5">
                <div className={`h-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-[#C9A84C]' : 'bg-white/15'}`} />
                <p className={`text-[9.5px] font-bold uppercase tracking-wider ${i <= step ? 'text-[#E8D48B]' : 'text-white/35'}`}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-7">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <label className="group relative shrink-0 cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
                      {f.logo_url ? (
                        <img src={f.logo_url} alt="Company logo" className="h-16 w-16 rounded-2xl border border-black/10 bg-white object-contain p-1.5 shadow-sm" />
                      ) : (
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-black/15 bg-[#fafafa] text-[#9ca3af] transition-colors group-hover:border-[#C9A84C]/60 group-hover:text-[#96782A]">
                          {logoUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" strokeWidth={1.8} />}
                        </span>
                      )}
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[#0A1628] text-white shadow">
                        <Upload className="h-3 w-3" strokeWidth={2.2} />
                      </span>
                    </label>
                    <div>
                      <WizardQ title="Company logo" hint="Optional — PNG or JPG. Shown on the Ledgers dashboard." />
                    </div>
                  </div>
                  <WizardQ title="What is your company called?" />
                  <input autoFocus value={f.name ?? ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} className={inputCls} placeholder="e.g. VJR Estate Properties Private Limited" />
                  <WizardQ title="When was it incorporated / started?" hint="Your entire compliance calendar anchors to this date — first filings, first AGM, first GST period." />
                  <input type="date" value={f.incorporated_on ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setF((x) => ({ ...x, incorporated_on: e.target.value || null }))} className={inputCls} />
                  <WizardQ title="Registered office" hint="Optional" />
                  <input value={f.registered_office ?? ''} onChange={(e) => setF((x) => ({ ...x, registered_office: e.target.value }))} className={inputCls} placeholder="e.g. HSR Layout, Bengaluru, Karnataka" />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <WizardQ title="What type of entity is it?" hint="This decides which laws apply — companies file ROC forms, proprietorships don't." />
                  {ENTITY_TYPES.map((e) => (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => setF((x) => ({ ...x, entity_type: e.value }))}
                      className={`flex w-full cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${f.entity_type === e.value ? 'border-[#C9A84C] bg-[#C9A84C]/[0.08] ring-2 ring-[#C9A84C]/25' : 'border-black/10 bg-white hover:border-[#C9A84C]/50'}`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${f.entity_type === e.value ? 'border-[#C9A84C] bg-[#C9A84C]' : 'border-black/20'}`}>
                        {f.entity_type === e.value && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-bold text-[#0A1628]">{e.label}</span>
                        <span className="block text-[11px] text-[#6b7280]">{e.blurb}</span>
                      </span>
                      {e.roc && <span className="ml-auto shrink-0 rounded-full bg-[#0A1628]/[0.07] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#0A1628]">MCA</span>}
                    </button>
                  ))}

                  {(f.entity_type === 'pvtltd' || f.entity_type === 'opc') && (
                    <div className="grid grid-cols-1 gap-3 rounded-xl border border-black/[0.08] bg-[#fafafa] p-3.5 sm:grid-cols-2">
                      <div><Label>CIN (optional)</Label><input value={f.cin ?? ''} onChange={(e) => setF((x) => ({ ...x, cin: e.target.value }))} className={inputCls} placeholder="U12345KA2026PTC000000" /></div>
                      <div>
                        <Label>GST filing scheme</Label>
                        <select value={f.gst_scheme ?? 'monthly'} onChange={(e) => setF((x) => ({ ...x, gst_scheme: e.target.value }))} className={inputCls}>
                          <option value="monthly">Monthly (turnover &gt; ₹1.5cr)</option>
                          <option value="qrmp">QRMP quarterly (≤ ₹5cr)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <WizardQ title="Which registrations does the company hold?" hint="Prefilled for a Karnataka real-estate brokerage — untick anything you don't hold. Only obligations for held registrations are generated." />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {REGISTRATION_OPTIONS.map((r) => {
                      const on = (f.registrations ?? []).includes(r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setF((x) => ({ ...x, registrations: on ? (x.registrations ?? []).filter((v) => v !== r.value) : [...(x.registrations ?? []), r.value] }))}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${on ? 'border-[#0A1628] bg-[#0A1628] text-white' : 'border-black/10 bg-white text-[#374151] hover:border-[#C9A84C]/60'}`}
                        >
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${on ? 'border-[#D6B85D] bg-[#C9A84C]' : 'border-black/20'}`}>
                            {on && <Check className="h-2.5 w-2.5 text-[#0A1628]" strokeWidth={4} />}
                          </span>
                          <span className="min-w-0 truncate text-[12px] font-semibold">{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {!(f.registrations ?? []).includes('gst') && !(f.registrations ?? []).includes('gst_composition') && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-[11.5px] leading-relaxed text-blue-800">
                      <strong>GST not selected — correct if your turnover is under ₹20 lakh.</strong> As a Karnataka service provider you need GST registration only when aggregate turnover crosses ₹20 lakh in a FY. When that happens, tick “GST (regular)” here (or in Company Profile) and hit Sync New — GSTR-1/3B, the ₹20L threshold watch and brokerage-GST items appear automatically.
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div><Label>PAN</Label><input value={f.pan ?? ''} onChange={(e) => setF((x) => ({ ...x, pan: e.target.value.toUpperCase() }))} className={inputCls} placeholder="ABCDE1234F" maxLength={10} /></div>
                    <div><Label>TAN</Label><input value={f.tan ?? ''} onChange={(e) => setF((x) => ({ ...x, tan: e.target.value.toUpperCase() }))} className={inputCls} placeholder="BLRA12345A" maxLength={10} /></div>
                    <div><Label>GSTIN</Label><input value={f.gstin ?? ''} onChange={(e) => setF((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))} className={inputCls} maxLength={15} /></div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Approx. employees</Label>
                      <input inputMode="numeric" value={f.employee_count ?? ''} onChange={(e) => setF((x) => ({ ...x, employee_count: Number(e.target.value.replace(/\D/g, '')) || 0 }))} className={inputCls} placeholder="e.g. 12" />
                    </div>
                    <div>
                      <Label>Annual turnover band</Label>
                      <select value={f.turnover_band ?? ''} onChange={(e) => setF((x) => ({ ...x, turnover_band: e.target.value }))} className={inputCls}>
                        <option value="">Select…</option>
                        <option value="lt_20l">Under ₹20 lakh (no GST needed)</option>
                        <option value="20l_1cr">₹20 lakh – 1 crore</option>
                        <option value="1_2cr">₹1 – 2 crore</option>
                        <option value="2_10cr">₹2 – 10 crore</option>
                        <option value="10_50cr">₹10 – 50 crore</option>
                        <option value="gt_50cr">Above ₹50 crore</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <WizardQ title="Who are your advisors?" hint="Optional — shown on the dashboard so the team knows who to call." />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div><Label>Chartered Accountant</Label><input value={f.ca_name ?? ''} onChange={(e) => setF((x) => ({ ...x, ca_name: e.target.value }))} className={inputCls} placeholder="CA name / firm" /></div>
                    <div><Label>Company Secretary</Label><input value={f.cs_name ?? ''} onChange={(e) => setF((x) => ({ ...x, cs_name: e.target.value }))} className={inputCls} placeholder="CS name / firm" /></div>
                  </div>
                  <div className="rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/[0.07] p-4">
                    <p className="flex items-center gap-2 text-[12px] font-bold text-[#0A1628]"><Sparkles className="h-3.5 w-3.5 text-[#96782A]" /> Ready to generate</p>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#6b7280]">
                      Based on your answers, Ledgers will build a calendar with only the filings that apply to a{' '}
                      <strong className="text-[#0A1628]">{entity?.label}</strong>
                      {(f.incorporated_on) && <> incorporated <strong className="text-[#0A1628]">{fmtDate(f.incorporated_on)}</strong> (first-year dates anchored to that date)</>}
                      . You can adjust everything later in Company Profile.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="mt-6 flex items-center justify-between border-t border-black/[0.06] pt-4">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-bold text-[#6b7280] transition-colors hover:text-[#0A1628] disabled:opacity-30">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 0 && !f.name?.trim()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0A1628] px-5 py-2.5 text-[12.5px] font-bold text-white shadow-[0_4px_14px_rgba(10,22,40,0.25)] transition-all hover:bg-[#1E3852] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={saving || !f.name?.trim()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#C9A84C] px-5 py-2.5 text-[12.5px] font-extrabold text-[#0A1628] shadow-[0_4px_14px_rgba(201,168,76,0.4)] transition-all hover:bg-[#E8C76A] disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {saving ? 'Saving…' : 'Save & Open Ledgers'}
              </button>
            )}
          </div>
        </div>
      </CrmCard>
    </motion.div>
  );
}

function WizardQ({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <p className="text-[14px] font-bold text-[#0A1628]">{title}</p>
      {hint && <p className="mt-0.5 text-[11.5px] text-[#6b7280]">{hint}</p>}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">{children}</label>;
}

/* ═══════════════ PROFILE EDITOR ═══════════════ */

/* ═══════════════ COMPANY MASTER (premium, provenance-driven) ═══════════════
 *
 * Presents the incorporation baseline (COI · MOA · AOA · SPICe+ · DIN letter)
 * with source + verification status on every fact, alongside the editable
 * operating profile. Ownership % is CALCULATED from share counts; historical
 * records are shown as historical, never silently merged into "current".
 * Design: platinum system — navy/gold, serif display, GPU-friendly motion.
 */

const VERIF_STYLE: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  unverified: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  needs_review: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  conflicting: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  expired: 'bg-gray-100 text-gray-400 ring-1 ring-gray-200',
};

const VERIF_LABEL: Record<string, string> = {
  confirmed: 'Confirmed',
  unverified: 'Unverified',
  needs_review: 'Needs verification',
  conflicting: 'Conflict',
  expired: 'Expired',
};

function VerifBadge({ status }: { status?: string }) {
  const s = status ?? 'unverified';
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${VERIF_STYLE[s] ?? VERIF_STYLE.unverified}`}>{VERIF_LABEL[s] ?? s}</span>;
}

function MasterField({ label, value, mono, hint }: { label: string; value?: string | null; mono?: boolean; hint?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{label}</p>
      <p className={`mt-1 truncate text-[13px] font-semibold text-[#0A1628] ${mono ? 'font-mono tracking-tight' : ''}`} title={value ?? ''}>{value?.trim() ? value : '—'}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[#9ca3af]">{hint}</p>}
    </div>
  );
}

function SectionHead({ icon: Icon, title, note }: { icon: typeof Building2; title: string; note?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-black/[0.05] pb-3">
      <p className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#A3842E]">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A1628] text-[#D6B85D]"><Icon className="h-3.5 w-3.5" strokeWidth={1.8} /></span>
        {title}
      </p>
      {note && <span className="text-[10px] font-semibold text-[#9ca3af]">{note}</span>}
    </div>
  );
}

function CompanyMaster({ profile, onSave, onChanged }: { profile: LedgerCompanyProfile; onSave: (p: Partial<LedgerCompanyProfile>) => Promise<void>; onChanged: () => void }) {
  const [f, setF] = useState<Partial<LedgerCompanyProfile>>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [master, setMaster] = useState<CompanyMasterData | null>(null);
  const [masterLoading, setMasterLoading] = useState(true);

  useEffect(() => setF(profile), [profile]);
  useEffect(() => {
    fetchCompanyMaster().then(setMaster).catch(() => setMaster(null)).finally(() => setMasterLoading(false));
  }, []);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadLedgerLogo(file);
      setF((x) => ({ ...x, logo_url: url }));
      await onSave({ logo_url: url });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Logo upload failed');
    }
    setLogoUploading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(f);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onChanged();
    } finally { setSaving(false); }
  };

  const inputCls = 'h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20 sm:h-10';

  // Derived capital + ownership (spec: calculate, never store percentages)
  const cap = master?.ledger_share_capital?.[0];
  const holdings = (master?.ledger_shareholding ?? []).filter((h) => h.snapshot_type === 'incorporation');
  const totalShares = holdings.reduce((s, h) => s + (h.shares_held || 0), 0) || cap?.subscribed_shares || 0;
  const shareholders = (master?.ledger_shareholders ?? []).map((sh) => {
    const h = holdings.find((x) => x.shareholder_id === sh.id);
    return { ...sh, holding: h, pct: h && totalShares ? (h.shares_held / totalShares) * 100 : 0 };
  }).sort((a, z) => (z.holding?.shares_held ?? 0) - (a.holding?.shares_held ?? 0));
  const unissued = (cap?.authorised_shares ?? 0) - (cap?.subscribed_shares ?? 0);
  const remainingAuth = (cap?.authorised_amount ?? 0) - (cap?.subscribed_amount ?? 0);
  const incAddress = (master?.ledger_address_history ?? []).find((a) => a.address_type === 'incorporation_registered_address');

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* ── Legal identity — serif display, gold seal ── */}
      <CrmCard className="overflow-hidden p-0">
        <div className="relative bg-[#0A1628] px-5 py-6 sm:px-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#C9A84C]/15 blur-3xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <label className="group relative shrink-0 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickLogo(e.target.files?.[0])} />
                {f.logo_url ? (
                  <img src={f.logo_url} alt="Company logo" className="h-14 w-14 rounded-2xl border border-white/20 bg-white object-contain p-1.5" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C9A84C] to-[#E8C76A] text-[18px] font-extrabold text-[#0A1628] shadow-[0_4px_16px_rgba(201,168,76,0.4)]">
                    {logoUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : (f.name || 'V').slice(0, 1).toUpperCase()}
                  </span>
                )}
              </label>
              <div className="min-w-0">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-[#C9A84C]">Company Master</p>
                <h2 className="mt-1 font-['Instrument_Serif',Georgia,serif] text-[24px] leading-tight text-white sm:text-[28px]">{profile.name}</h2>
                <p className="mt-1 font-mono text-[11px] tracking-wide text-white/50">{profile.cin || 'CIN —'}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
              <ShieldCheck className="h-3 w-3" /> Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4 sm:p-7">
          <MasterField label="Legal name" value={profile.name} />
          <MasterField label="Entity type" value="Private Company Limited by Shares" />
          <MasterField label="Incorporated" value={profile.incorporated_on ? fmtDate(profile.incorporated_on) : null} hint="COI · 15 Oct 2025" />
          <MasterField label="ROC" value="Registrar of Companies, Karnataka" hint="Jurisdiction: Karnataka" />
          <MasterField label="CIN" value={profile.cin || 'U68100KA2025PTC209772'} mono />
          <MasterField label="PAN" value={profile.pan || 'AALCV5120G'} mono hint="COI · confirmed" />
          <MasterField label="TAN" value={profile.tan || 'BLRV32731G'} mono hint="COI · confirmed" />
          <MasterField label="Company status" value="ACTIVE" hint="Editable · audited" />
        </div>
      </CrmCard>

      {/* ── Capital structure ── */}
      <CrmCard className="p-5 sm:p-7">
        <SectionHead icon={Landmark} title="Share capital" note={cap ? `SPICe+ · ${VERIF_LABEL[cap.verification_status ?? 'unverified']}` : masterLoading ? 'Loading…' : 'No records'} />
        {cap ? (
          <>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <MasterField label="Authorised capital" value={`₹${(cap.authorised_amount ?? 0).toLocaleString('en-IN')}`} />
              <MasterField label="Subscribed capital" value={`₹${(cap.subscribed_amount ?? 0).toLocaleString('en-IN')}`} />
              <MasterField label="Face value" value={`₹${cap.face_value ?? 10}`} />
              <MasterField label="Share class" value={cap.class_name} />
              <MasterField label="Authorised shares" value={String(cap.authorised_shares ?? 0)} mono />
              <MasterField label="Subscribed shares" value={String(cap.subscribed_shares ?? 0)} mono />
              <MasterField label="Unissued shares" value={String(unissued)} mono hint="Allotment capacity" />
              <MasterField label="Remaining authorised" value={`₹${remainingAuth.toLocaleString('en-IN')}`} hint="Capital capacity, not cash" />
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-[10px] font-bold text-[#6b7280]"><span>Capital utilisation</span><span>{cap.authorised_amount ? Math.round((cap.subscribed_amount / cap.authorised_amount) * 100) : 0}%</span></div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${cap.authorised_amount ? Math.min(100, (cap.subscribed_amount / cap.authorised_amount) * 100) : 0}%` }} transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} className="h-full rounded-full bg-gradient-to-r from-[#D6B85D] to-[#C9A84C]" />
              </div>
            </div>
          </>
        ) : (
          <p className="text-[12px] text-[#9ca3af]">{masterLoading ? 'Loading capital records…' : 'Capital records not available.'}</p>
        )}
      </CrmCard>

      {/* ── Shareholders (incorporation snapshot, ownership calculated) ── */}
      <CrmCard className="p-5 sm:p-7">
        <SectionHead icon={Scale} title="Shareholders — incorporation position" note="15 Oct 2025 · MOA / SPICe+" />
        <div className="space-y-3">
          {shareholders.map((sh) => (
            <motion.div key={sh.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-black/[0.06] bg-[#fafaf9] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-bold text-[#0A1628]">
                    {sh.name}
                    {sh.original_subscriber && <span className="rounded-full bg-[#C9A84C]/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#96782A]">Original subscriber</span>}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6b7280]">{sh.holding?.shares_held ?? 0} equity shares · ₹{(sh.holding?.subscription_value ?? 0).toLocaleString('en-IN')} subscribed · {sh.holding?.share_class ?? 'Equity Class A'}</p>
                </div>
                <p className="font-['Instrument_Serif',Georgia,serif] text-[26px] leading-none text-[#0A1628]">{sh.pct.toFixed(0)}<span className="text-[14px] text-[#9ca3af]">%</span></p>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.05]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${sh.pct}%` }} transition={{ duration: 0.7 }} className={`h-full rounded-full ${sh.pct >= 50 ? 'bg-[#0A1628]' : 'bg-[#C9A84C]'}`} />
              </div>
            </motion.div>
          ))}
          <div className="flex justify-between rounded-xl bg-[#0A1628] px-4 py-3 text-[12px] font-bold text-white">
            <span>Total · {totalShares.toLocaleString('en-IN')} shares</span>
            <span>100%</span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-[#9ca3af]">
            Ownership calculated as shares held ÷ total issued shares — never stored as a fixed percentage. Current shareholding after incorporation: based on available records (no transactions entered yet).
          </p>
        </div>
      </CrmCard>

      {/* ── Registered address history ── */}
      <CrmCard className="p-5 sm:p-7">
        <SectionHead icon={Building2} title="Registered office history" note="Historical records preserved" />
        <div className="space-y-3">
          {incAddress ? (
            <div className="rounded-2xl border border-[#C9A84C]/30 bg-[#C9A84C]/[0.05] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#96782A]">Incorporation registered address</p>
                <VerifBadge status={incAddress.verification_status} />
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-[#0A1628]">{incAddress.full_address}</p>
              <p className="mt-1.5 text-[10.5px] text-[#6b7280]">Effective {fmtDate(incAddress.effective_from)} · Source: {incAddress.source}</p>
            </div>
          ) : (
            <p className="text-[12px] text-[#9ca3af]">{masterLoading ? 'Loading…' : 'No address records yet.'}</p>
          )}
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
            <p className="text-[11.5px] font-semibold leading-relaxed text-amber-800">
              Current registered office: not yet verified. If it differs from the incorporation record, add it as a new record — the incorporation address is never overwritten.
            </p>
          </div>
        </div>
      </CrmCard>

      {/* ── MOA objects (permitted ≠ conducted) ── */}
      <CrmCard className="p-5 sm:p-7">
        <SectionHead icon={FileText} title="MOA principal objects" note="Permitted by charter — not necessarily conducted" />
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {(master?.ledger_moa_objects ?? []).map((o) => (
            <div key={o.id} className="rounded-xl border border-black/[0.06] bg-[#fafaf9] p-3.5">
              <p className="text-[12px] font-bold text-[#0A1628]">{o.title}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-[#6b7280]">{o.description}</p>
            </div>
          ))}
          {masterLoading && <p className="text-[12px] text-[#9ca3af]">Loading MOA objects…</p>}
        </div>
        <p className="mt-3 text-[10.5px] text-[#9ca3af]">MOA object ≠ actual business activity. Record what the company actually conducts to drive the compliance engine.</p>
      </CrmCard>

      {/* ── Operating profile (editable) ── */}
      <CrmCard className="p-5 sm:p-7">
        <SectionHead icon={Settings2} title="Operating profile" note="Editable" />
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Company name</Label><input value={f.name ?? ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} className={inputCls} /></div>
          <div>
            <Label>Entity type</Label>
            <select value={f.entity_type} onChange={(e) => setF((x) => ({ ...x, entity_type: e.target.value }))} className={inputCls}>
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div><Label>Incorporated on</Label><input type="date" value={f.incorporated_on ?? ''} onChange={(e) => setF((x) => ({ ...x, incorporated_on: e.target.value || null }))} className={inputCls} /></div>
          <div><Label>PAN</Label><input value={f.pan ?? ''} onChange={(e) => setF((x) => ({ ...x, pan: e.target.value.toUpperCase() }))} className={`${inputCls} font-mono`} maxLength={10} /></div>
          <div><Label>TAN</Label><input value={f.tan ?? ''} onChange={(e) => setF((x) => ({ ...x, tan: e.target.value.toUpperCase() }))} className={`${inputCls} font-mono`} maxLength={10} /></div>
          <div><Label>CIN / LLPIN</Label><input value={f.cin ?? ''} onChange={(e) => setF((x) => ({ ...x, cin: e.target.value.toUpperCase() }))} className={`${inputCls} font-mono`} /></div>
          <div><Label>Current registered office</Label><input value={f.registered_office ?? ''} onChange={(e) => setF((x) => ({ ...x, registered_office: e.target.value }))} className={inputCls} placeholder="Current operating address" /></div>
          <div>
            <Label>Approx. employees</Label>
            <input inputMode="numeric" value={f.employee_count ?? ''} onChange={(e) => setF((x) => ({ ...x, employee_count: Number(e.target.value.replace(/\D/g, '')) || 0 }))} className={inputCls} />
          </div>
          <div><Label>CA</Label><input value={f.ca_name ?? ''} onChange={(e) => setF((x) => ({ ...x, ca_name: e.target.value }))} className={inputCls} /></div>
          <div><Label>CS</Label><input value={f.cs_name ?? ''} onChange={(e) => setF((x) => ({ ...x, cs_name: e.target.value }))} className={inputCls} /></div>
        </div>
        <div className="mt-5 flex items-center gap-3">
          <CrmBtn variant="gold" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save changes
          </CrmBtn>
          {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] font-bold text-emerald-600">Saved</motion.span>}
        </div>
        <p className="mt-3 text-[10.5px] text-[#9ca3af]">Legal-identity fields mirror the incorporation record — changes are audit-logged. GST, registrations and labour settings live in their own tabs.</p>
      </CrmCard>
    </div>
  );
}


/* ═══════════════ DASHBOARD ═══════════════ */

function StatCard({ icon: Icon, tone, label, value, sub, delay }: { icon: typeof AlertTriangle; tone: 'red' | 'orange' | 'amber' | 'navy'; label: string; value: string; sub: string; delay: number }) {
  const tones = { red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600', amber: 'bg-amber-50 text-amber-600', navy: 'bg-[#0A1628] text-[#D6B85D]' };
  return (
    <CrmCard className="p-4 sm:p-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }}>
        <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </div>
        <p className="mt-2.5 text-[20px] font-extrabold leading-none tracking-tight sm:text-[22px]">{value}</p>
        <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] sm:text-[11px]">{label}</p>
        <p className="text-[10.5px] text-[#9ca3af]">{sub}</p>
      </motion.div>
    </CrmCard>
  );
}

function PriorityQueue({ buckets, cases, notices, payments, directors, loading, onChanged }: { buckets: Record<RiskBand, LedgerComplianceItem[]>; cases: LedgerLegalCase[]; notices: LedgerNotice[]; payments: LedgerPayment[]; directors: LedgerDirector[]; loading: boolean; onChanged: () => void }) {
  // Court hearings + notice response deadlines + unpaid payment dues — one
  // rule-based list, nearest date first. Every entry shows what, when and why.
  const deadlines = useMemo(() => {
    const list: { key: string; title: string; date: string; meta: string }[] = [];
    for (const c of cases) {
      if (c.status === 'closed') continue;
      if (c.next_hearing_on) list.push({ key: `case-h-${c.id}`, title: c.title, date: c.next_hearing_on, meta: `Hearing · ${c.authority || 'court'}` });
      if (c.reply_due_on) list.push({ key: `case-r-${c.id}`, title: c.title, date: c.reply_due_on, meta: `Reply due · ${c.authority || 'authority'}` });
    }
    for (const n of notices) {
      if (n.status === 'closed' || n.status === 'resolved' || !n.response_deadline) continue;
      list.push({ key: `notice-${n.id}`, title: n.subject ?? 'Notice', date: n.response_deadline, meta: `Notice reply · ${n.authority || n.notice_type || 'authority'}` });
    }
    for (const p of payments) {
      if (p.status === 'paid' || p.status === 'reconciled' || !p.due_date) continue;
      list.push({ key: `pay-${p.id}`, title: p.title ?? 'Payment', date: p.due_date, meta: `Payment · ${p.payment_type || 'due'}${(p.amount ?? 0) > 0 ? ` · ${fmtINR(p.amount ?? 0)}` : ''}` });
    }
    // Director KYC dues — pending + stored date, same state machine as the
    // directors register. Overdue auto-fill: pending + no stored date yet →
    // write the derived statutory date once so the nightly reminder job
    // (which reads the persisted column) stays in sync.
    for (const d of directors) {
      if (d.resignation_date) continue;
      if (d.kyc_status === 'pending' && d.kyc_due_date) {
        const s = kycState(d.kyc_status, d.kyc_due_date);
        if (s === 'overdue' || s === 'due') list.push({ key: `kyc-${d.id}`, title: `DIR-3 KYC — ${d.name ?? 'director'}`, date: d.kyc_due_date, meta: `Director KYC · DIN ${d.din || '—'} · ₹5,000 penalty` });
      } else if (d.kyc_status === 'pending' && !d.kyc_due_date) {
        void upsertLedgerRow('directors', { id: d.id, kyc_due_date: deriveKyc().dueDate }).catch(() => null);
      }
    }
    return list.sort((a, z) => a.date.localeCompare(z.date)).slice(0, 8);
  }, [cases, notices, payments, directors]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />;
  if (buckets.overdue.length + buckets.critical.length + buckets.warning.length + buckets.upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
        <p className="mt-3 text-sm font-semibold">No obligations yet</p>
        <p className="mt-1 text-xs text-[#9ca3af]">Hit “Generate Calendar” in the top bar — the engine builds every filing that applies to your entity.</p>
      </div>
    );
  }

  const sections: [RiskBand, string][] = [['overdue', 'Overdue — act now'], ['critical', 'Due within 7 days'], ['warning', 'Due within 30 days'], ['upcoming', 'Later this year']];

  return (
    <div className="space-y-5">
      {sections.map(([band, label]) => (
        <div key={band}>
          <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className={`h-2 w-2 rounded-full ${band === 'overdue' ? 'animate-pulse bg-red-500' : band === 'critical' ? 'bg-orange-500' : band === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {label} <span className="text-[#9ca3af]">({buckets[band].length})</span>
          </p>
          {buckets[band].length === 0 ? (
            band !== 'upcoming' && <p className="rounded-xl border border-dashed border-black/10 bg-white px-4 py-3 text-[12px] text-[#9ca3af]">Nothing here — good.</p>
          ) : (
            <div className="space-y-2">
              {buckets[band].slice(0, band === 'upcoming' ? 8 : 50).map((it) => <ItemRow key={it.id} item={it} onChanged={onChanged} />)}
            </div>
          )}
        </div>
      ))}

      {deadlines.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Gavel className="h-3.5 w-3.5 text-[#C9A84C]" /> Hearings, notice replies & payment dues
          </p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {deadlines.map((e) => {
              const d = daysUntil(e.date);
              return (
                <CrmCard key={e.key} className="flex items-center gap-3 p-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${d < 0 ? 'bg-red-50 text-red-600' : d <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-[#0A1628]/[0.06]'}`}>
                    {d < 0 ? `${Math.abs(d)}d↑` : `${d}d`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold">{e.title}</p>
                    <p className="text-[10.5px] text-[#9ca3af]">{e.meta} · {fmtDate(e.date)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#c9c9c9]" />
                </CrmCard>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ ITEM ROW ═══════════════ */

function ItemRow({ item, onChanged }: { item: LedgerComplianceItem; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({ arn: item.arn ?? '', assignee: item.assignee ?? '', challan_url: item.challan_url ?? '', notes: item.notes ?? '', amount_paid: item.amount_paid != null ? String(item.amount_paid) : '', proof_url: item.proof_url ?? '' });
  const [dirty, setDirty] = useState(false);
  const band = riskBand(item);
  const law = LAW_STYLES[item.law] ?? LAW_STYLES.Other;

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await upsertLedgerItem({ id: item.id, status, filed_date: status === 'filed' ? new Date().toISOString().slice(0, 10) : item.filed_date ?? null } as Partial<LedgerComplianceItem>);
      onChanged();
    } finally { setSaving(false); setOpen(false); }
  };
  const saveDetails = async () => {
    setSaving(true);
    try {
      await upsertLedgerItem({ id: item.id, ...edit, amount_paid: edit.amount_paid ? Number(edit.amount_paid) : undefined } as unknown as Partial<LedgerComplianceItem>);
      setDirty(false);
      onChanged();
    } finally { setSaving(false); }
  };
  const remove = async () => {
    if (!window.confirm(`Remove ${item.form} (${item.period}) from the calendar?`)) return;
    setSaving(true);
    try { await deleteLedgerItem(item.id!); onChanged(); } finally { setSaving(false); }
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-l-4 border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-shadow hover:shadow-[0_4px_16px_rgba(10,22,40,0.08)] ${RISK_STYLES[band].ring}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-3 text-left sm:gap-3 sm:px-4">
        <ChevronRight className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <span className={`hidden shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold sm:inline-flex ${law.chip}`}>
          <law.icon className="h-3 w-3" /> {item.law}
        </span>
        {item.assignee && !open && (
          <span className="hidden shrink-0 rounded-full bg-[#0A1628]/[0.05] px-2 py-0.5 text-[9.5px] font-bold text-[#0A1628] md:inline-flex">{item.assignee}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-bold sm:text-[13px]">
            {item.form} <span className="font-semibold text-[#6b7280]">· {item.title}</span>
          </p>
          <p className="truncate text-[10.5px] text-[#9ca3af]">{item.period} · due {fmtDate(item.due_date)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-extrabold tracking-wide sm:px-2.5 ${RISK_STYLES[band].chip}`}>
          {band === 'overdue' ? `${Math.abs(daysUntil(item.due_date))}d LATE` : band === 'done' ? (item.filed_date ? `FILED ${fmtDate(item.filed_date)}` : 'FILED') : `${daysUntil(item.due_date)}d`}
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
              <Detail label="Penalty if missed" value={fmtINR(item.penalty_exposure ?? 0)} />
              <div className="col-span-2 sm:col-span-4"><Detail label="Rule & source" value={item.source_url || '—'} /></div>

              {/* Filing details — ARN, assignee, challan, notes */}
              <div className="col-span-2 grid grid-cols-1 gap-3 sm:col-span-4 sm:grid-cols-2">
                <div><Label>ARN / SRN / acknowledgement</Label><input value={edit.arn} onChange={(e) => { setEdit((x) => ({ ...x, arn: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="e.g. AAABCS1234567890" /></div>
                <div><Label>Assignee</Label><input value={edit.assignee} onChange={(e) => { setEdit((x) => ({ ...x, assignee: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="Who owns this filing?" /></div>
                <div><Label>Challan link</Label><input value={edit.challan_url} onChange={(e) => { setEdit((x) => ({ ...x, challan_url: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="Challan / receipt URL" /></div>
                <div><Label>Amount paid (₹)</Label><input inputMode="decimal" value={edit.amount_paid} onChange={(e) => { setEdit((x) => ({ ...x, amount_paid: e.target.value.replace(/[^0-9.]/g, '') })); setDirty(true); }} className={CRM_INPUT} placeholder="e.g. 2500" /></div>
                <div className="sm:col-span-2"><Label>Proof URL (upload to Drive, paste link)</Label><input value={edit.proof_url} onChange={(e) => { setEdit((x) => ({ ...x, proof_url: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder=" acknowledgement PDF / receipt link" /></div>
                <div className="sm:col-span-2"><Label>Notes</Label><input value={edit.notes} onChange={(e) => { setEdit((x) => ({ ...x, notes: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="Anything notable" /></div>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-4">
                <CrmBtn variant="gold" onClick={() => void setStatus('filed')} disabled={saving}><CheckCircle2 className="h-3.5 w-3.5" /> Mark as Completed</CrmBtn>
                <CrmBtn variant="ghost" onClick={() => void setStatus('in_progress')} disabled={saving}>In progress</CrmBtn>
                <CrmBtn variant="ghost" onClick={() => void setStatus('na')} disabled={saving}>N/A</CrmBtn>
                {dirty && (
                  <CrmBtn onClick={() => void saveDetails()} disabled={saving}><Check className="h-3.5 w-3.5" /> Save details</CrmBtn>
                )}
                {edit.challan_url && !dirty && (
                  <a href={edit.challan_url} target="_blank" rel="noopener noreferrer" className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-2 text-[11.5px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]">
                    <FileText className="h-3.5 w-3.5" /> Open challan
                  </a>
                )}
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
      <p className="mt-0.5 break-words text-[12px] font-semibold">{value}</p>
    </div>
  );
}

/* ═══════════════ FULL CALENDAR ═══════════════ */

function FullCalendar({ items, loading, onChanged }: { items: LedgerComplianceItem[]; loading: boolean; onChanged: () => void }) {
  const [lawFilter, setLawFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const laws = useMemo(() => ['All', ...new Set(items.map((i) => i.law))], [items]);

  const byMonth = useMemo(() => {
    const map = new Map<string, LedgerComplianceItem[]>();
    for (const it of items) {
      if (lawFilter !== 'All' && it.law !== lawFilter) continue;
      if (statusFilter === 'pending' && (it.status === 'filed' || it.status === 'na')) continue;
      if (statusFilter === 'filed' && it.status !== 'filed' && it.status !== 'na') continue;
      if (search && !`${it.form} ${it.title}`.toLowerCase().includes(search.toLowerCase())) continue;
      const key = it.due_date.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items, lawFilter, statusFilter, search]);

  if (loading) return <div className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />;
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
        <p className="mt-3 text-sm font-semibold">No calendar yet</p>
        <p className="mt-1 text-xs text-[#9ca3af]">Hit “Generate Calendar” — the engine builds every applicable filing for the year.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-xl border border-black/10 bg-white pl-8 pr-3 text-[12px] outline-none focus:border-[#C9A84C]/60" placeholder="Search form or title…" />
        </div>
        <div className="flex gap-1.5">
          {['pending', 'all', 'filed'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-colors ${statusFilter === s ? 'bg-[#0A1628] text-[#D6B85D]' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}>
              {s === 'pending' ? 'Open' : s}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {laws.map((l) => (
          <button key={l} onClick={() => setLawFilter(l)} className={`cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${lawFilter === l ? 'bg-[#0A1628] text-[#D6B85D]' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}>
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
              <button type="button" onClick={() => setExpandedMonth(isOpen && expandedMonth === month ? null : month)} className="flex w-full cursor-pointer flex-wrap items-center gap-2.5 px-4 py-3.5 text-left">
                <ChevronDown className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                <span className="text-[13.5px] font-extrabold">{monthLabel}</span>
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

/* ═══════════════ LEGAL CASES ═══════════════ */

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

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <CrmCard className="mb-5 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><Pencil className="h-3 w-3" /> {editing ? 'Edit case' : 'New case / notice'}</p>
                <button onClick={() => setShowForm(false)} className="cursor-pointer rounded-lg p-1 text-[#9ca3af] hover:bg-black/[0.04]"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2"><Label>Title *</Label><input value={form.title ?? ''} onChange={(e) => setForm((x) => ({ ...x, title: e.target.value }))} className={CRM_INPUT} placeholder="e.g. GST notice — ITC mismatch FY 24-25" /></div>
                <div><Label>Authority</Label><input value={form.authority ?? ''} onChange={(e) => setForm((x) => ({ ...x, authority: e.target.value }))} className={CRM_INPUT} placeholder="GST Dept / IT / NCLT…" /></div>
                <div>
                  <Label>Type</Label>
                  <select value={form.case_type ?? ''} onChange={(e) => setForm((x) => ({ ...x, case_type: e.target.value }))} className={CRM_INPUT}>
                    {['Notice', 'Appeal', 'Hearing', 'Inquiry', 'Civil', 'Other'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><Label>Case / notice no.</Label><input value={form.case_no ?? ''} onChange={(e) => setForm((x) => ({ ...x, case_no: e.target.value }))} className={CRM_INPUT} /></div>
                <div>
                  <Label>Status</Label>
                  <select value={form.status ?? 'open'} onChange={(e) => setForm((x) => ({ ...x, status: e.target.value }))} className={CRM_INPUT}>
                    {CASE_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div><Label>Notice / filed on</Label><input type="date" value={form.filed_on ?? ''} onChange={(e) => setForm((x) => ({ ...x, filed_on: e.target.value }))} className={CRM_INPUT} /></div>
                <div><Label>Reply due by</Label><input type="date" value={form.reply_due_on ?? ''} onChange={(e) => setForm((x) => ({ ...x, reply_due_on: e.target.value }))} className={CRM_INPUT} /></div>
                <div><Label>Next hearing</Label><input type="date" value={form.next_hearing_on ?? ''} onChange={(e) => setForm((x) => ({ ...x, next_hearing_on: e.target.value }))} className={CRM_INPUT} /></div>
                <div><Label>Advocate</Label><input value={form.advocate ?? ''} onChange={(e) => setForm((x) => ({ ...x, advocate: e.target.value }))} className={CRM_INPUT} /></div>
                <div><Label>Advocate phone</Label><input value={form.advocate_phone ?? ''} onChange={(e) => setForm((x) => ({ ...x, advocate_phone: e.target.value }))} className={CRM_INPUT} /></div>
                <div className="sm:col-span-2"><Label>Documents link</Label><input value={form.documents_url ?? ''} onChange={(e) => setForm((x) => ({ ...x, documents_url: e.target.value }))} className={CRM_INPUT} placeholder="Drive / vault URL" /></div>
                <div className="sm:col-span-2 lg:col-span-4"><Label>Description</Label><textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))} className={`${CRM_INPUT} min-h-[64px]`} placeholder="What is the matter about? Next steps…" /></div>
              </div>
              <div className="mt-4 flex gap-2">
                <CrmBtn onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add case'}</CrmBtn>
                <CrmBtn variant="ghost" onClick={() => setShowForm(false)}>Cancel</CrmBtn>
              </div>
            </CrmCard>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : cases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
          <Gavel className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
          <p className="mt-3 text-sm font-semibold">No legal matters tracked</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Add GST/IT/ROC/labour notices and court matters — hearings surface on the dashboard automatically.</p>
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
                    <p className="truncate text-[14px] font-bold">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#6b7280]">{[c.case_no, c.authority, c.case_type].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${statusStyle[c.status ?? 'open'] ?? statusStyle.open}`}>{(c.status ?? 'open').replace('_', ' ')}</span>
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-[11.5px] leading-relaxed text-[#6b7280]">{c.description}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniDeadline label="Reply due" date={c.reply_due_on} days={replyD} />
                  <MiniDeadline label="Hearing" date={c.next_hearing_on} days={hearingD} />
                  <MiniDeadline label="Filed" date={c.filed_on} days={null} />
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

/* ═══════════════ LEGAL COMPLIANCES TABLE ═══════════════ */

const STATUS_LABEL: Record<string, string> = {
  pending: 'Upcoming',
  in_progress: 'In progress',
  filed: 'Filed',
  na: 'N/A',
};

function LegalCompliancesTable({ items, loading }: { items: LedgerComplianceItem[]; loading: boolean }) {
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'filed' | 'all'>('upcoming');
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    return items
      .filter((i) => {
        if (statusFilter === 'upcoming' && (i.status === 'filed' || i.status === 'na')) return false;
        if (statusFilter === 'filed' && i.status !== 'filed' && i.status !== 'na') return false;
        if (search && !`${i.form} ${i.title} ${i.period}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
  }, [items, statusFilter, search]);

  const upcoming = items.filter((i) => i.status !== 'filed' && i.status !== 'na');
  const next = upcoming[0];

  return (
    <div>
      {/* Next-up banner — the single most important date */}
      {next && (
        <CrmCard className="mb-4 overflow-hidden border border-[#C9A84C]/40 p-0">
          <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:px-5">
            <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#C9A84C] text-[#0A1628] shadow-[0_3px_12px_rgba(201,168,76,0.45)]">
              <span className="text-[15px] font-extrabold leading-none">{next.due_date.slice(8, 10)}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider">{new Date(next.due_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9.5px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]">Next legal compliance due</p>
              <p className="truncate text-[14px] font-bold text-white">{next.form} · {next.title}</p>
              <p className="text-[11px] text-white/60">{next.period} · by {fmtDate(next.due_date)} · {daysUntil(next.due_date)} days left</p>
            </div>
            {next.assignee && <span className="hidden shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-white sm:inline-block">{next.assignee}</span>}
          </div>
        </CrmCard>
      )}

      {/* Controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-xl border border-black/10 bg-white pl-8 pr-3 text-[12px] outline-none focus:border-[#C9A84C]/60" placeholder="Search form, title or period…" />
        </div>
        <div className="flex gap-1.5">
          {(['upcoming', 'filed', 'all'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`cursor-pointer rounded-full px-3.5 py-1.5 text-[11px] font-bold capitalize transition-colors ${statusFilter === s ? 'bg-[#0A1628] text-[#D6B85D]' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}>
              {s === 'upcoming' ? `Upcoming (${upcoming.length})` : s === 'filed' ? `Filed (${items.length - upcoming.length})` : `All (${items.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Structured register — every date always visible, no clicking needed */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
          <p className="mt-3 text-sm font-semibold">{items.length === 0 ? 'No compliances yet' : 'Nothing in this view'}</p>
          <p className="mt-1 text-xs text-[#9ca3af]">{items.length === 0 ? 'Hit “Generate Calendar” in the top bar — your FY obligations appear here with due dates and status.' : 'Try the other filter or clear the search.'}</p>
        </div>
      ) : (
        <CrmCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-black/[0.06] bg-[#fafafa]">
                  {['Compliance', 'Period', 'Due date', 'Days left', 'Last filed', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#6b7280] sm:px-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {rows.map((it) => {
                  const band = riskBand(it);
                  const d = daysUntil(it.due_date);
                  return (
                    <tr key={it.id} className="group transition-colors hover:bg-[#C9A84C]/[0.04]">
                      <td className="max-w-[260px] px-3 py-3 sm:px-4">
                        <p className="truncate text-[12.5px] font-bold text-[#0A1628]">
                          <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${LAW_STYLES[it.law]?.dot ?? 'bg-gray-400'}`} />
                          {it.form}
                        </p>
                        <p className="truncate pl-3.5 text-[10.5px] text-[#9ca3af]">{it.title}</p>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] font-semibold text-[#374151] sm:px-4">{it.period}</td>
                      <td className="px-3 py-3 text-[11.5px] font-bold text-[#0A1628] sm:px-4">{fmtDate(it.due_date)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${RISK_STYLES[band].chip}`}>
                          {it.status === 'filed' || it.status === 'na' ? '—' : d < 0 ? `${Math.abs(d)}d late` : `${d}d`}
                        </span>
                        <p className="mt-0.5 whitespace-nowrap text-[10px] font-semibold text-[#6b7280]">due {fmtDate(it.due_date)}</p>
                      </td>
                      <td className="px-3 py-3 text-[11.5px] text-[#374151] sm:px-4">
                        {it.filed_date ? fmtDate(it.filed_date) : <span className="text-[#c9c9c9]">Not yet</span>}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          it.status === 'filed' ? 'bg-emerald-50 text-emerald-700' : it.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : it.status === 'na' ? 'bg-gray-100 text-gray-500' : band === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {it.status === 'filed' && <CheckCircle2 className="h-2.5 w-2.5" />}
                          {STATUS_LABEL[it.status] ?? it.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CrmCard>
      )}
      <p className="mt-2 text-[10.5px] text-[#9ca3af]">Tip: click a row's details in Priority Queue to mark filed / edit ARN & assignee. This table is the full register — every date visible at a glance.</p>
    </div>
  );
}

/* ═══════════════ AUDIT TRAIL ═══════════════ */

interface LogRow { id: string; entity_type: string; entity_id: string; action: string; summary: string; actor: string; created_at: string }

function AuditTrail() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchLedgerActivity();
        setRows((res.data ?? []) as LogRow[]);
      } catch { /* table may not exist yet */ }
      setLoading(false);
    })();
  }, []);

  const actionStyle: Record<string, string> = {
    created: 'bg-blue-50 text-blue-700',
    updated: 'bg-amber-50 text-amber-700',
    filed: 'bg-emerald-50 text-emerald-700',
    deleted: 'bg-red-50 text-red-600',
  };

  if (loading) return <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />;
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
        <History className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
        <p className="mt-3 text-sm font-semibold">No activity yet</p>
        <p className="mt-1 max-w-sm text-xs text-[#9ca3af]">Every change — generating the calendar, editing a filing, marking one filed — is recorded here with who did it and when. Auditors love this tab.</p>
      </div>
    );
  }

  return (
    <CrmCard className="p-0">
      <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]"><ClipboardList className="h-3.5 w-3.5 text-[#96782A]" /> Change log</p>
        <span className="text-[10.5px] text-[#9ca3af]">Newest first · last {rows.length} events</span>
      </div>
      <div className="max-h-[540px] divide-y divide-black/[0.04] overflow-y-auto">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2.5 px-4 py-3">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase ${actionStyle[r.action] ?? 'bg-gray-100 text-gray-600'}`}>{r.action.replace('_', ' ')}</span>
            <p className="min-w-0 flex-1 truncate text-[12px] font-semibold">{r.summary}</p>
            <span className="shrink-0 text-[10.5px] text-[#9ca3af]">{r.actor || '—'}</span>
            <span className="shrink-0 text-[10.5px] text-[#9ca3af]">
              {new Date(r.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </CrmCard>
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
