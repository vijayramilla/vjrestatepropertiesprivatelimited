import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CrmSidebar from '@/components/crm/CrmSidebar';
import {
  CrmBtn,
  CrmCard,
  CrmPageBody,
  CrmPageHeader,
  CRM_INPUT,
} from '@/components/crm/CrmUi';
import { CrmSupportInbox } from '@/components/crm/CrmSupportInbox';
import {
  partnerCrm,
  STATUS_BADGE,
  VERIFICATION_BADGE,
  fmtDate,
  fmtINR,
  type PartnerLifecycle,
  type PartnerRow,
  type PartnerType,
  type VerificationStatus,
} from '@/services/partnerCrm';
import { Loader2, Search, Handshake, ArrowUpRight } from 'lucide-react';

/**
 * Partnership module — complete partner lifecycle management.
 * Views map to ?view= (see ViewTabs below); the default is the partner
 * table with KPI cards. Every KPI card is also a clickable filter.
 */

const AVATAR_BG = ['bg-[#0A1628]', 'bg-[#C9A84C]', 'bg-[#1E3852]', 'bg-[#3b5f8f]', 'bg-[#7a6420]'];

function avatarCls(id: string) {
  let n = 0;
  for (const ch of id) n = (n + ch.charCodeAt(0)) % AVATAR_BG.length;
  return AVATAR_BG[n];
}

type SortKey = 'newest' | 'oldest' | 'listings' | 'leads' | 'transactions' | 'revenue' | 'active';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'listings', label: 'Most Listings' },
  { key: 'leads', label: 'Most Leads' },
  { key: 'transactions', label: 'Most Transactions' },
  { key: 'revenue', label: 'Highest Revenue' },
  { key: 'active', label: 'Last Active' },
];

export default function CrmPartnership() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') ?? 'all';
  const setView = (v: string) => setSearchParams(v === 'all' ? {} : { view: v });

  const [partners, setPartners] = useState<PartnerRow[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | PartnerType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PartnerLifecycle>('all');
  const [verFilter, setVerFilter] = useState<'all' | VerificationStatus>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  useEffect(() => {
    let cancelled = false;
    partnerCrm
      .list()
      .then((r) => { if (!cancelled) setPartners(r.partners); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load partners'); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let rows = partners ?? [];
    if (view === 'owners') rows = rows.filter((p) => p.partner_type === 'Owner');
    else if (view === 'builders') rows = rows.filter((p) => p.partner_type === 'Builder');
    else if (view === 'agents') rows = rows.filter((p) => p.partner_type === 'Agent');
    else if (view === 'active') rows = rows.filter((p) => p.status === 'active');
    else if (view === 'suspended') rows = rows.filter((p) => p.status === 'suspended');
    else if (view === 'terminated') rows = rows.filter((p) => p.status === 'terminated');
    else if (view === 'applications' || view === 'pending') rows = rows.filter((p) => p.status === 'pending' || p.status === 'rejected');
    else if (view === 'pending-verification') rows = rows.filter((p) => p.verification_status !== 'VERIFIED');
    if (view === 'all' || view.startsWith('owners') || ['owners', 'builders', 'agents', 'active', 'suspended', 'terminated', 'applications', 'pending-verification', 'all'].includes(view)) {
      if (typeFilter !== 'all') rows = rows.filter((p) => p.partner_type === typeFilter);
      if (statusFilter !== 'all') rows = rows.filter((p) => p.status === statusFilter);
      if (verFilter !== 'all') rows = rows.filter((p) => p.verification_status === verFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) =>
        [p.full_name, p.partner_code, p.id, p.mobile, p.email, p.company_name, p.rera_number]
          .some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }
    const sorted = [...rows];
    switch (sort) {
      case 'oldest': sorted.sort((a, b) => a.created_at.localeCompare(b.created_at)); break;
      case 'listings': sorted.sort((a, b) => (b.listingsCount ?? 0) - (a.listingsCount ?? 0)); break;
      case 'leads': sorted.sort((a, b) => (b.leadsCount ?? 0) - (a.leadsCount ?? 0)); break;
      case 'transactions': sorted.sort((a, b) => (b.transactionsCount ?? 0) - (a.transactionsCount ?? 0)); break;
      case 'revenue': sorted.sort((a, b) => (b.vjrRevenue ?? 0) - (a.vjrRevenue ?? 0)); break;
      case 'active': sorted.sort((a, b) => (b.status_changed_at ?? b.updated_at).localeCompare(a.status_changed_at ?? a.updated_at)); break;
      default: sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }
    return sorted;
  }, [partners, view, typeFilter, statusFilter, verFilter, query, sort]);

  const kpis = useMemo(() => {
    const rows = partners ?? [];
    const sum = (f: (p: PartnerRow) => number) => rows.reduce((n, p) => n + f(p), 0);
    return [
      { key: 'all', label: 'Total Partners', value: rows.length, tone: 'navy' as const },
      { key: 'active', label: 'Active Partners', value: rows.filter((p) => p.status === 'active').length, tone: 'emerald' as const },
      { key: 'applications', label: 'Pending Applications', value: rows.filter((p) => p.status === 'pending').length, tone: 'amber' as const },
      { key: 'pending-verification', label: 'Pending Verification', value: rows.filter((p) => p.verification_status !== 'VERIFIED').length, tone: 'amber' as const },
      { key: 'owners', label: 'Owners', value: rows.filter((p) => p.partner_type === 'Owner').length, tone: 'navy' as const },
      { key: 'builders', label: 'Builders', value: rows.filter((p) => p.partner_type === 'Builder').length, tone: 'navy' as const },
      { key: 'agents', label: 'Agents', value: rows.filter((p) => p.partner_type === 'Agent').length, tone: 'navy' as const },
      { key: 'suspended', label: 'Suspended Partners', value: rows.filter((p) => p.status === 'suspended').length, tone: 'red' as const },
      { key: 'terminated', label: 'Terminated Partners', value: rows.filter((p) => p.status === 'terminated').length, tone: 'red' as const },
      { key: 'all', label: 'Total Active Listings', value: sum((p) => p.listingsCount ?? 0), tone: 'blue' as const },
      { key: 'all', label: 'Total Partner Leads', value: sum((p) => p.leadsCount ?? 0), tone: 'blue' as const },
      { key: 'transactions', label: 'Partner Transactions', value: sum((p) => p.transactionsCount ?? 0), tone: 'purple' as const },
      { key: 'revenue', label: 'VJR Revenue', value: fmtINR(sum((p) => p.vjrRevenue ?? 0)), tone: 'gold' as const },
      { key: 'revenue', label: 'Pending Payments', value: fmtINR(sum((p) => p.pendingPayments ?? 0)), tone: 'amber' as const },
    ];
  }, [partners]);

  const VIEW_TITLES: Record<string, { title: string; desc: string }> = {
    support: { title: 'Partner Support / Live Chat', desc: 'Support conversations opened by partners from their Help & Support workspace.' },
    all: { title: 'Partnership', desc: 'Complete lifecycle management for Owners, Builders and Agents — register, verify, list, transact, suspend or terminate.' },
    owners: { title: 'Owner Partners', desc: 'Partners listing property they own or are authorised to market.' },
    builders: { title: 'Builder / Developer Partners', desc: 'Partners listing projects and inventory.' },
    agents: { title: 'Agent / Broker Partners', desc: 'Partners listing properties backed by valid client mandates.' },
    applications: { title: 'Partner Applications', desc: 'New registrations awaiting review. Approve to activate the partnership.' },
    'pending-verification': { title: 'Pending Verification', desc: 'Partners whose verification is not yet complete.' },
    active: { title: 'Active Partners', desc: 'Partners currently approved and able to list.' },
    suspended: { title: 'Suspended Partners', desc: 'Partners temporarily suspended. Reinstate or terminate from the Partner 360° page.' },
    terminated: { title: 'Terminated Partners', desc: 'Permanently terminated partnerships. History is retained.' },
    activity: { title: 'Partner Activity', desc: 'Latest lifecycle events across all partners.' },
    transactions: { title: 'Partner Transactions', desc: 'Transaction volume by partner. Open a partner for the full ledger.' },
    revenue: { title: 'Partner Revenue', desc: 'Service charges and revenue shares by partner.' },
    disputes: { title: 'Partner Disputes', desc: 'Partners with disputes. Manage them in the Partner 360° Disputes tab.' },
  };
  const head = VIEW_TITLES[view] ?? VIEW_TITLES.all;

  // Page-level view tabs — the sidebar shows Partnership as a single link,
  // so all views are reachable here. Shares the same ?view= values as the
  // KPI cards and the old sidebar submenu for full backward compatibility.
  const VIEW_TABS: { key: string; label: string }[] = [
    { key: 'support', label: 'Support / Live Chat' },
    { key: 'all', label: 'All Partners' },
    { key: 'owners', label: 'Owners' },
    { key: 'builders', label: 'Builders' },
    { key: 'agents', label: 'Agents' },
    { key: 'applications', label: 'Applications' },
    { key: 'pending-verification', label: 'Verification' },
    { key: 'active', label: 'Active' },
    { key: 'suspended', label: 'Suspended' },
    { key: 'terminated', label: 'Terminated' },
    { key: 'activity', label: 'Activity' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'disputes', label: 'Disputes' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f2] font-['Inter',sans-serif] text-[#0A1628] antialiased">
      <CrmSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
        <CrmPageHeader
          eyebrow="Partnership"
          title={head.title}
          description={head.desc}
        />

          {/* View tabs — clickable, URL-driven ?view= state */}
          <div className="mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
            {VIEW_TABS.map((t) => {
              const active = view === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setView(t.key)}
                  className={`flex min-h-[38px] shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all duration-200 ${
                    active ? 'bg-[#0A1628] text-[#D6B85D] shadow-sm' : 'text-[#6b7280] hover:bg-black/[0.03] hover:text-[#0A1628]'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

        {error && (
          <CrmCard className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</CrmCard>
        )}

        {!partners && !error && (
          <div className="flex items-center justify-center gap-3 py-24 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading partners…
          </div>
        )}

        {partners && (view === 'support' ? (
          <CrmSupportInbox onOpenPartner={(id) => navigate(`/crm/partnership/partners/${id}`)} />
        ) : (
          <>
            {/* KPI cards — every card is a clickable filter */}
            <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
              {kpis.map((k) => (
                <button
                  key={k.label}
                  type="button"
                  onClick={() => setView(k.key)}
                  className={`cursor-pointer rounded-2xl border bg-white p-4 text-left shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,22,40,0.1)] ${
                    view === k.key ? 'border-[#C9A84C] ring-1 ring-[#C9A84C]/40' : 'border-black/[0.06]'
                  }`}
                >
                  <p className="font-['Inter',sans-serif] text-[22px] font-bold leading-none tracking-tight text-[#0A1628] tabular-nums">{k.value}</p>
                  <p className="mt-1.5 text-[11px] font-medium text-[#6b7280]">{k.label}</p>
                </button>
              ))}
            </div>

            {/* Search + filters */}
            <CrmCard className="mb-5 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, partner ID, mobile, email, company or RERA number…"
                  className={`${CRM_INPUT} pl-9`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className={`${CRM_INPUT} !h-10 w-auto min-w-[110px]`}>
                  <option value="all">All Types</option>
                  <option value="Owner">Owner</option>
                  <option value="Builder">Builder</option>
                  <option value="Agent">Agent</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className={`${CRM_INPUT} !h-10 w-auto min-w-[120px]`}>
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="terminated">Terminated</option>
                  <option value="rejected">Rejected</option>
                </select>
                <select value={verFilter} onChange={(e) => setVerFilter(e.target.value as typeof verFilter)} className={`${CRM_INPUT} !h-10 w-auto min-w-[150px]`}>
                  <option value="all">All Verification</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="PARTIALLY VERIFIED">Partially Verified</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="VERIFICATION REQUIRED">Verification Required</option>
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={`${CRM_INPUT} !h-10 w-auto min-w-[140px]`}>
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </CrmCard>

            {view === 'activity' ? (
              <ActivityView partners={partners} />
            ) : (
              <>
                {/* Desktop table */}
                <CrmCard className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[1050px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">
                        <th className="px-4 py-3">Partner ID</th>
                        <th className="px-4 py-3">Partner</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Contact</th>
                        <th className="px-4 py-3">RERA</th>
                        <th className="px-4 py-3 text-right">Listings</th>
                        <th className="px-4 py-3 text-right">Leads</th>
                        <th className="px-4 py-3 text-right">Txns</th>
                        <th className="px-4 py-3 text-right">VJR Revenue</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Verification</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => (
                        <tr key={p.id} className="cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-[#FBF9F3]" onClick={() => navigate(`/crm/partnership/partners/${p.id}`)}>
                          <td className="px-4 py-3 font-mono text-[11.5px] font-semibold text-[#0A1628]">{p.partner_code ?? '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarCls(p.id)}`}>
                                {p.full_name?.[0]?.toUpperCase() ?? '?'}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#0A1628]">{p.full_name}</p>
                                <p className="truncate text-[11px] text-gray-400">{p.company_name ?? p.city}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3"><TypeChip type={p.partner_type} /></td>
                          <td className="px-4 py-3">
                            <p className="text-[12px] text-[#0A1628]">{p.mobile}</p>
                            <p className="max-w-[180px] truncate text-[11px] text-gray-400">{p.email}</p>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{p.rera_number || '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.listingsCount ?? 0}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.leadsCount ?? 0}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{p.transactionsCount ?? 0}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtINR(p.vjrRevenue ?? 0)}</td>
                          <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                          <td className="px-4 py-3"><VerificationBadge status={p.verification_status} /></td>
                          <td className="px-4 py-3 text-[12px] text-gray-500">{fmtDate(p.created_at)}</td>
                          <td className="px-4 py-3">
                            <CrmBtn variant="ghost" className="!min-h-[34px] !px-3 !text-[11px]" onClick={(e) => { e.stopPropagation(); navigate(`/crm/partnership/partners/${p.id}`); }}>
                              View <ArrowUpRight className="h-3.5 w-3.5" />
                            </CrmBtn>
                          </td>
                        </tr>
                      ))}
                      {!filtered.length && (
                        <tr><td colSpan={13} className="px-4 py-16 text-center text-sm text-gray-400">No partners match the current filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CrmCard>

                {/* Mobile partner cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
                  {filtered.map((p) => (
                    <CrmCard key={p.id} className="p-4" onClick={() => navigate(`/crm/partnership/partners/${p.id}`)}>
                      <div className="flex items-center gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${avatarCls(p.id)}`}>
                          {p.full_name?.[0]?.toUpperCase() ?? '?'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-[#0A1628]">{p.full_name}</p>
                          <p className="font-mono text-[10.5px] text-gray-400">{p.partner_code ?? p.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <TypeChip type={p.partner_type} />
                        <StatusBadge status={p.status} />
                        <VerificationBadge status={p.verification_status} />
                      </div>
                      <p className="mt-3 truncate text-[12px] text-gray-500">{p.company_name ? `${p.company_name} · ` : ''}{p.mobile}</p>
                      {(p.areas ?? []).length > 0 && (
                        <p className="mt-1 truncate text-[11px] text-gray-400">{p.areas.join(' | ')}</p>
                      )}
                      <div className="mt-3 flex items-center gap-4 border-t border-black/[0.05] pt-3 text-[11.5px] text-gray-600">
                        <span><strong className="text-[#0A1628]">{p.listingsCount ?? 0}</strong> Listings</span>
                        <span><strong className="text-[#0A1628]">{p.leadsCount ?? 0}</strong> Leads</span>
                        <span><strong className="text-[#0A1628]">{p.transactionsCount ?? 0}</strong> Txns</span>
                      </div>
                    </CrmCard>
                  ))}
                  {!filtered.length && (
                    <CrmCard className="p-10 text-center text-sm text-gray-400 sm:col-span-2">No partners match the current filters.</CrmCard>
                  )}
                </div>
              </>
            )}
          </>
        ))}
        </CrmPageBody>
      </main>
    </div>
  );

  function ActivityView({ partners }: { partners: PartnerRow[] }) {
    const events = partners
      .filter((p) => p.status_changed_at)
      .sort((a, b) => (b.status_changed_at ?? '').localeCompare(a.status_changed_at ?? ''))
      .slice(0, 60);
    if (!events.length) {
      return <CrmCard className="p-12 text-center text-sm text-gray-400">No lifecycle events recorded yet. Status changes, suspensions, reinstatements and terminations will appear here.</CrmCard>;
    }
    return (
      <CrmCard className="divide-y divide-black/[0.04]">
        {events.map((p) => {
          const badge = STATUS_BADGE[p.status];
          return (
            <button key={p.id} type="button" onClick={() => navigate(`/crm/partnership/partners/${p.id}`)} className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#FBF9F3]">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarCls(p.id)}`}>
                {p.full_name?.[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0A1628]">
                  {p.full_name} <span className="font-mono text-[10.5px] font-normal text-gray-400">{p.partner_code ?? ''}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-gray-600">
                  Status: <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${badge.cls}`}>{badge.label}</span>
                  {p.status_reason ? ` — ${p.status_reason}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">{fmtDate(p.status_changed_at)}</span>
            </button>
          );
        })}
      </CrmCard>
    );
  }
}

export function TypeChip({ type }: { type: PartnerType }) {
  const cls = type === 'Owner' ? 'bg-[#0A1628]/[0.06] text-[#0A1628]' : type === 'Builder' ? 'bg-[#C9A84C]/[0.14] text-[#96782A]' : 'bg-sky-50 text-sky-700';
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{type}</span>;
}

export function StatusBadge({ status }: { status: PartnerLifecycle }) {
  const b = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${b.cls}`}>{b.label}</span>;
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const b = VERIFICATION_BADGE[status] ?? VERIFICATION_BADGE.UNVERIFIED;
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${b.cls}`}>{b.label}</span>;
}

export const PARTNER_ICON = Handshake;
