import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, ArrowRight, BellRing, Building2, CalendarDays, CalendarPlus,
  Check, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Clock, Download, FileText,
  Gavel, History, Landmark, Loader2, Pencil, Plus, RefreshCw, Scale, Search, Settings2,
  ShieldCheck, Sparkles, Trash2, Upload, X,
} from 'lucide-react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  fetchLedgerItems, upsertLedgerItem, deleteLedgerItem,
  fetchLedgerCases, upsertLedgerCase, deleteLedgerCase,
  fetchLedgerProfile, saveLedgerProfile, fetchLedgerActivity, uploadLedgerLogo,
  type LedgerComplianceItem, type LedgerLegalCase, type LedgerCompanyProfile,
} from '@/lib/supabaseData';
import {
  generateComplianceCalendar, riskBand, daysUntil, complianceToIcs,
  ENTITY_TYPES, REGISTRATION_OPTIONS, currentFyLabel, availableFyLabels,
  rulesForProfile, type RiskBand, type EntityType,
} from '@/data/ledgerComplianceRules';

/* ── Palette / shared styles ── */
const NAVY = '#0A1628';

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

type Tab = 'dashboard' | 'calendar' | 'cases' | 'audit' | 'profile';

export default function CrmLedgers() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [profile, setProfile] = useState<LedgerCompanyProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [items, setItems] = useState<LedgerComplianceItem[]>([]);
  const [cases, setCases] = useState<LedgerLegalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seededCount, setSeededCount] = useState<number | null>(null);
  const [selectedFy, setSelectedFy] = useState('');

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

  const loadItems = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([fetchLedgerItems(selectedFy || undefined), fetchLedgerCases()]);
      setItems((i.data ?? []) as LedgerComplianceItem[]);
      setCases((c.data ?? []) as LedgerLegalCase[]);
    } catch { /* tables may not exist yet */ }
    setLoading(false);
  };
  useEffect(() => { if (selectedFy) void loadItems(); }, [selectedFy]);

  const saveProfile = async (p: Partial<LedgerCompanyProfile>) => {
    const merged = { ...profile, ...p } as LedgerCompanyProfile;
    setProfile(merged); // optimistic
    await saveLedgerProfile(merged);
  };

  /* ── Generate calendar from profile + rules engine ── */
  const seedCalendar = async () => {
    if (!profile) return;
    setSeeding(true);
    try {
      const fyStartYear = Number(selectedFy.split(' ')[1]);
      const generated = generateComplianceCalendar({
        fyStartYear,
        entityType: (profile.entity_type as EntityType) ?? 'pvtltd',
        registrations: profile.registrations ?? [],
        incorporatedOn: profile.incorporated_on,
        gstScheme: (profile.gst_scheme as 'monthly' | 'qrmp') ?? 'monthly',
        // Compliance cleared till today: past-due obligations in this FY are
        // seeded as 'filed' (with the due date as filed date) so the queue
        // opens with only upcoming work. Flip any of them manually if missed.
        markPastFiled: true,
      });
      const existingKeys = new Set(items.map((i) => `${i.form}|${i.period}`));
      const fresh = generated.filter((g) => !existingKeys.has(`${g.form}|${g.period}`));
      for (const g of fresh) {
        await upsertLedgerItem({ ...g, status: 'pending' } as unknown as LedgerComplianceItem);
      }
      await loadItems();
      setSeededCount(fresh.length);
      setTimeout(() => setSeededCount(null), 5000);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not generate calendar');
    }
    setSeeding(false);
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
                ? `${profile.name} · ${entityLabel(profile.entity_type)}${profile.incorporated_on ? ` · incorporated ${fmtDate(profile.incorporated_on)}` : ''} · ${selectedFy}`
                : 'Company compliance calendar, legal register and penalty exposure.'
            }
            actions={
              !showOnboarding && (
                <div className="flex flex-wrap gap-2">
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
              <OnboardingWizard key="onboard" onDone={(p) => { setProfile(p); setSelectedFy(currentFyLabel(p.fy_start_month)); setTab('dashboard'); }} />
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

                {/* Health score */}
                <CrmCard className="mb-6 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[15px] font-extrabold ${complianceScore >= 90 ? 'bg-emerald-50 text-emerald-600' : complianceScore >= 70 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                        {complianceScore}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold">Compliance health score</p>
                        <p className="text-[11px] text-[#6b7280]">{items.length} tracked obligations · {buckets.overdue.length} overdue · {openCases} legal matters</p>
                      </div>
                    </div>
                    {seededCount !== null && (
                      <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {seededCount} obligations added
                      </motion.span>
                    )}
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

                {/* Tabs */}
                <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-white p-1 [scrollbar-width:none]">
                  {([['dashboard', 'Priority Queue'], ['calendar', 'Full Calendar'], ['cases', 'Legal Cases'], ['audit', 'Audit Trail'], ['profile', 'Company Profile']] as [Tab, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`relative whitespace-nowrap rounded-lg px-3.5 py-2 text-[12.5px] font-bold transition-colors sm:px-4 ${tab === key ? 'text-white' : 'text-[#6b7280] hover:text-[#0A1628]'}`}
                    >
                      {tab === key && <motion.span layoutId="ledger-tab" className="absolute inset-0 rounded-lg bg-[#0A1628]" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {tab === 'dashboard' && <PriorityQueue buckets={buckets} cases={cases} loading={loading} onChanged={loadItems} />}
                    {tab === 'calendar' && <FullCalendar items={items} loading={loading} onChanged={loadItems} />}
                    {tab === 'cases' && <LegalCases cases={cases} loading={loading} onChanged={loadItems} />}
                    {tab === 'audit' && <AuditTrail />}
                    {tab === 'profile' && <ProfileEditor profile={profile!} onSave={saveProfile} onChanged={loadItems} />}
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

function ProfileEditor({ profile, onSave, onChanged }: { profile: LedgerCompanyProfile; onSave: (p: Partial<LedgerCompanyProfile>) => Promise<void>; onChanged: () => void }) {
  const [f, setF] = useState<Partial<LedgerCompanyProfile>>(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => setF(profile), [profile]);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const url = await uploadLedgerLogo(file);
      setF((x) => ({ ...x, logo_url: url }));
      await onSave({ logo_url: url }); // persist immediately
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

  const inputCls = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-[13px] outline-none transition-colors focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <CrmCard className="p-4 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><Building2 className="h-3.5 w-3.5" /> Company identity</p>
        <div className="mb-4 flex items-center gap-4">
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
            <p className="text-[13px] font-bold">Company logo</p>
            <p className="text-[11px] text-[#6b7280]">Click the tile to upload — saves instantly.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label>Company name</Label><input value={f.name ?? ''} onChange={(e) => setF((x) => ({ ...x, name: e.target.value }))} className={inputCls} /></div>
          <div>
            <Label>Entity type</Label>
            <select value={f.entity_type} onChange={(e) => setF((x) => ({ ...x, entity_type: e.target.value }))} className={inputCls}>
              {ENTITY_TYPES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div><Label>Incorporated on</Label><input type="date" value={f.incorporated_on ?? ''} onChange={(e) => setF((x) => ({ ...x, incorporated_on: e.target.value || null }))} className={inputCls} /></div>
          <div className="sm:col-span-2"><Label>Registered office</Label><input value={f.registered_office ?? ''} onChange={(e) => setF((x) => ({ ...x, registered_office: e.target.value }))} className={inputCls} /></div>
          <div><Label>CIN / LLPIN</Label><input value={f.cin ?? ''} onChange={(e) => setF((x) => ({ ...x, cin: e.target.value.toUpperCase() }))} className={inputCls} /></div>
          <div><Label>PAN</Label><input value={f.pan ?? ''} onChange={(e) => setF((x) => ({ ...x, pan: e.target.value.toUpperCase() }))} className={inputCls} maxLength={10} /></div>
          <div><Label>TAN</Label><input value={f.tan ?? ''} onChange={(e) => setF((x) => ({ ...x, tan: e.target.value.toUpperCase() }))} className={inputCls} maxLength={10} /></div>
          <div><Label>GSTIN</Label><input value={f.gstin ?? ''} onChange={(e) => setF((x) => ({ ...x, gstin: e.target.value.toUpperCase() }))} className={inputCls} maxLength={15} /></div>
        </div>
      </CrmCard>

      <CrmCard className="p-4 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]"><ShieldCheck className="h-3.5 w-3.5" /> Registrations held</p>
        <div className="flex flex-wrap gap-2">
          {REGISTRATION_OPTIONS.map((r) => {
            const on = (f.registrations ?? []).includes(r.value);
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setF((x) => ({ ...x, registrations: on ? (x.registrations ?? []).filter((v) => v !== r.value) : [...(x.registrations ?? []), r.value] }))}
                className={`cursor-pointer rounded-full px-3.5 py-2 text-[11.5px] font-bold transition-all duration-200 ${on ? 'bg-[#0A1628] text-[#D6B85D] shadow-[0_2px_8px_rgba(10,22,40,0.2)]' : 'bg-black/[0.05] text-[#6b7280] hover:bg-black/[0.09]'}`}
              >
                {on && <Check className="mr-1 inline h-3 w-3" strokeWidth={3} />}{r.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-[#9ca3af]">Changing registrations or entity type changes which obligations the generator creates — hit “Sync New” on the header afterwards.</p>
      </CrmCard>

      <CrmCard className="p-4 sm:p-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Scale & advisors</p>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div>
            <Label>Approx. employees</Label>
            <input inputMode="numeric" value={f.employee_count ?? ''} onChange={(e) => setF((x) => ({ ...x, employee_count: Number(e.target.value.replace(/\D/g, '')) || 0 }))} className={inputCls} />
          </div>
          <div>
            <Label>Turnover band</Label>
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
          <div><Label>CA</Label><input value={f.ca_name ?? ''} onChange={(e) => setF((x) => ({ ...x, ca_name: e.target.value }))} className={inputCls} /></div>
          <div><Label>CS</Label><input value={f.cs_name ?? ''} onChange={(e) => setF((x) => ({ ...x, cs_name: e.target.value }))} className={inputCls} /></div>
        </div>
      </CrmCard>

      <div className="flex items-center gap-3">
        <CrmBtn variant="gold" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save profile
        </CrmBtn>
        {saved && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[12px] font-bold text-emerald-600">Profile saved</motion.span>}
      </div>
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

function PriorityQueue({ buckets, cases, loading, onChanged }: { buckets: Record<RiskBand, LedgerComplianceItem[]>; cases: LedgerLegalCase[]; loading: boolean; onChanged: () => void }) {
  const hearingSoon = cases
    .filter((c) => (c.next_hearing_on || c.reply_due_on) && c.status !== 'closed')
    .sort((a, z) => (a.next_hearing_on ?? a.reply_due_on ?? '').localeCompare(z.next_hearing_on ?? z.reply_due_on ?? ''))
    .slice(0, 5);

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

      {hearingSoon.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]">
            <Gavel className="h-3.5 w-3.5 text-[#C9A84C]" /> Hearings & notice replies
          </p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {hearingSoon.map((c) => {
              const target = c.next_hearing_on ?? c.reply_due_on!;
              const d = daysUntil(target);
              return (
                <CrmCard key={c.id} className="flex items-center gap-3 p-3.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${d < 0 ? 'bg-red-50 text-red-600' : d <= 7 ? 'bg-orange-50 text-orange-600' : 'bg-[#0A1628]/[0.06]'}`}>
                    {d < 0 ? `${Math.abs(d)}d↑` : `${d}d`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold">{c.title}</p>
                    <p className="text-[10.5px] text-[#9ca3af]">{c.authority || 'Authority'} · {fmtDate(target)}</p>
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
  const [edit, setEdit] = useState({ arn: item.arn ?? '', assignee: item.assignee ?? '', challan_url: item.challan_url ?? '', notes: item.notes ?? '' });
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
      await upsertLedgerItem({ id: item.id, ...edit } as Partial<LedgerComplianceItem>);
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
                <div><Label>Challan / proof link</Label><input value={edit.challan_url} onChange={(e) => { setEdit((x) => ({ ...x, challan_url: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="Drive link to challan or receipt" /></div>
                <div><Label>Notes</Label><input value={edit.notes} onChange={(e) => { setEdit((x) => ({ ...x, notes: e.target.value })); setDirty(true); }} className={CRM_INPUT} placeholder="Anything notable" /></div>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-4">
                <CrmBtn variant="gold" onClick={() => void setStatus('filed')} disabled={saving}><CheckCircle2 className="h-3.5 w-3.5" /> Mark filed</CrmBtn>
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
