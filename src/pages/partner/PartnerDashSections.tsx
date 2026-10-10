import { Link } from 'react-router-dom';
import {
  PlusCircle, Clock, Building2, Users, CalendarCheck, Receipt,
  Wallet, FileText, Bell, History, AlertCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  fmtDateProps, fmtDateTimeProps, fmtMoney, partnerStageFromLead, PARTNER_STAGES,
  type PDashData, type PDashView, type PartnerDashboardView,
} from '@/services/partnerDashboard';
import PartnerSupportSection from './PartnerSupportSection';
import PartnerProfileSection from './PartnerProfileSection';

/**
 * Section renderers — every number and row comes from the `partner.dashboard`
 * backend action; genuine zero vs unavailable data is always distinguished
 * (— for none/not loaded, 0 only when the server actually returned 0).
 */

type Gotype = (v: PDashView) => void;
interface SecProps {
  data: PDashData;
  view: PartnerDashboardView;
  go: Gotype;
  greetingName: string;
  isOwner: boolean;
  isActive: boolean;
  welcomeMsg: string | null;
  reloadDashboard?: () => void;
  fmtDateProps: typeof fmtDateProps;
  fmtDateTimeProps: typeof fmtDateTimeProps;
  fmtMoney: typeof fmtMoney;
  stageOf: typeof partnerStageFromLead;
}

const card = 'rounded-xl border border-[#E4E7EC] bg-white';
const muted = 'text-[#667085]';
const tiny = 'text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]';

function KpiCard({ icon: Icon, label, value, sub, onClick, active }: { icon: LucideIcon; label: string; value: string | number; sub?: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${card} ${onClick ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(10,22,40,0.08)]' : 'cursor-default'} p-4 text-left ${active ? 'ring-2 ring-[#C9A84C]/50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#475467]"><Icon className="h-4.5 w-4.5" strokeWidth={1.7} aria-hidden="true" /></div>
        {sub && <span className="text-[10px] font-semibold text-[#98A2B3]">{sub}</span>}
      </div>
      <p className="mt-3 text-[22px] font-bold leading-none tabular-nums text-[#101828]">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-[#667085]">{label}</p>
    </button>
  );
}

function Empty({ icon: Icon, title, desc, action, to }: { icon: LucideIcon; title: string; desc: string; action?: string; to?: string }) {
  return (
    <div className={`${card} flex flex-col items-center justify-center px-6 py-12 text-center`}>
      <Icon className="h-8 w-8 text-[#D0D5DD]" aria-hidden="true" />
      <p className="mt-3 text-[13.5px] font-semibold text-[#101828]">{title}</p>
      <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#667085]">{desc}</p>
      {action && to && <Link to={to} className="admin-btn-primary mt-4 no-underline min-h-[44px] items-center justify-center">{action}</Link>}
    </div>
  );
}

export function PartnerDashSections(p: SecProps) {
  const { data, view } = p;
  const leadList = data.leads ?? [];
  const stages = useMemoStageCounts(leadList);

  switch (view) {
    case 'overview': return Overview(p);
    case 'properties': return Properties(p);
    case 'leads': return Leads(p);
    case 'visits': return Visits(p);
    case 'offers': return Offers(p);
    case 'transactions': return Transactions(p);
    case 'revenue': return Revenue(p);
    case 'documents': return Documents(p);
    case 'messages': return Messages(p);
    case 'activity': return Activity(p);
    case 'terms': return Terms(p);
    case 'profile': return Profile(p);
    case 'support': return Support(p);
    default: return null;
  }

  function Overview({ data, go, greetingName, isOwner, isActive, welcomeMsg }: SecProps) {
    const recent = (data.activity ?? []).slice(0, 6);
    const recentLeads = (data.leads ?? []).slice(0, 5);
    const c = data.counts;
    return (
      <div className="space-y-6">
        <div className={`${card} p-5 sm:p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className={tiny}>Partner overview</p>
              <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#101828] sm:text-[26px]">Welcome back, {greetingName}</h1>
              <p className="mt-1.5 text-[13px] text-[#667085]">
                {data.partner.partner_type} partner{data.partner.partner_code ? ` · ${data.partner.partner_code}` : ''} · member since {fmtDateProps(data.partner.created_at)}
              </p>
              {welcomeMsg && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-800 ring-1 ring-amber-200">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {welcomeMsg}
                </p>
              )}
            </div>
            {isActive && (
              <Link to="/list-property" className="admin-btn-primary no-underline min-h-[44px] shrink-0 items-center justify-center gap-2">
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> List Your Property
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={Building2} label="Total Properties" value={c.properties} sub={c.properties === 0 ? 'none yet' : undefined} onClick={isActive ? () => go('properties') : undefined} active={false} />
          <KpiCard icon={Users} label="Total Leads" value={c.leads} sub={c.leads === 0 ? 'none yet' : undefined} onClick={() => go('leads')} active={false} />
          <KpiCard icon={CalendarCheck} label="Upcoming Site Visits" value={c.visitsUpcoming} sub={c.visitsUpcoming === 0 ? 'none scheduled' : undefined} onClick={() => go('visits')} active={false} />
          <KpiCard icon={Receipt} label="Open Transactions" value={c.transactionsOpen} sub={c.transactionsOpen === 0 ? 'none in progress' : undefined} onClick={() => go('transactions')} active={false} />
        </div>

        {isOwner ? (
          <div className={`${card} p-5`}>
            <p className={tiny}>Owner commercial model</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#101828]">1% service charge on qualifying successful sale transactions · zero listing fee.</p>
          </div>
        ) : (
          <div className={`${card} p-5`}>
            <p className={tiny}>{data.partner.partner_type} commercial model</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#101828]">50:50 share of Net Partnership Revenue actually received — not of the property sale price.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[#101828]">Recent activity</h2>
            {recent.length === 0 ? (
              <div className={`${card} p-6 text-center text-[12.5px] text-[#98A2B3]`}>No recorded activity yet.</div>
            ) : (
              <div className={`${card} divide-y divide-[#F2F4F7]`}>
                {recent.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-semibold text-[#101828]">{a.action}</p>
                      {a.description && <p className="mt-0.5 line-clamp-2 text-[11.5px] text-[#667085]">{a.description}</p>}
                      <p className="mt-0.5 text-[10.5px] text-[#98A2B3]">{fmtDateTimeProps(a.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-[15px] font-bold text-[#101828]">Recent enquiries</h2>
            {recentLeads.length === 0 ? (
              <div className={`${card} p-6 text-center text-[12.5px] text-[#98A2B3]`}>No enquiries yet — they will appear here as buyers contact you.</div>
            ) : (
              <div className={`${card} divide-y divide-[#F2F4F7]`}>
                {recentLeads.map((l) => (
                  <div key={l.id} className="px-4 py-3">
                    <p className="text-[12.5px] font-semibold text-[#101828]">{l.buyer_name ?? 'Buyer'} · <span className={muted}>{l.property_title ?? 'Property'}</span></p>
                    <p className="mt-0.5 text-[11.5px] text-[#667085]">{p.stageOf(l)} · {fmtDateProps(l.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    );
  }

  function Properties({ data, isActive, go: _go }: SecProps) {
    const listings = data.listings ?? [];
    if (!listings.length) {
      return (
        <Empty
          icon={Building2}
          title="No properties listed yet"
          desc={isActive ? 'Add your first eligible property to start receiving enquiries from buyers across Bangalore.' : 'Property listing unlocks once your partnership is approved. Complete the review process to get started.'}
          action={isActive ? 'List Your Property' : undefined}
          to={isActive ? '/list-property' : undefined}
        />
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {listings.map((l) => (
          <Link key={l.id} to={`/properties/${l.id}`} className={`${card} block overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgba(10,22,40,0.08)]`}>
            {l.images && (Array.isArray(l.images) ? l.images[0] : String(l.images).split(',')[0]) && (
              <img src={Array.isArray(l.images) ? l.images[0] : String(l.images).split(',')[0]} alt="" className="h-36 w-full object-cover" />
            )}
            <div className="p-4">
              <p className="truncate text-[13.5px] font-semibold text-[#101828]">{l.title}</p>
              <p className="mt-0.5 font-mono text-[10.5px] text-[#98A2B3]">{l.property_code ?? l.id.slice(0, 8)}</p>
              <p className="mt-1 text-[11.5px] text-[#667085]">{[l.area, l.location].filter(Boolean).join(' · ') || '—'}</p>
              <p className="mt-2 text-[13px] font-bold text-emerald-600">{fmtMoney(l.price ?? l.monthly_rental)}{l.price_label ? ` ${l.price_label}` : l.monthly_rental_label ? ` ${l.monthly_rental_label}` : ''}</p>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="inline-flex rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-bold text-[#475467]">{l.status ?? 'Unknown'}</span>
                <span className="text-[10.5px] text-[#98A2B3]">{fmtDateProps(l.created_at)}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    );
  }

  function Leads({ data }: SecProps) {
    const leads = data.leads ?? [];
    if (!leads.length) {
      return <Empty icon={Users} title="No enquiries yet" desc="Buyer enquiries for your listings will appear here with status and follow-up context." />;
    }
    return (
      <div className="space-y-5">
        <div className={`${card} flex flex-wrap gap-2 p-3`}>
          {PARTNER_STAGES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E7EC] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#475467]">
              {s} <span className="rounded-full bg-[#F2F4F7] px-1.5 text-[10px] font-bold">{stages[s] ?? 0}</span>
            </span>
          ))}
        </div>
        <div className={`${card} divide-y divide-[#F2F4F7]`}>
          {leads.map((l) => (
            <div key={l.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#101828]">{l.buyer_name ?? 'Buyer'}<span className="ml-2 font-mono text-[10.5px] font-normal text-[#98A2B3]">{l.property_title ?? ''}</span></p>
                <p className="mt-0.5 text-[11.5px] text-[#667085]">{[l.property_type, l.property_area].filter(Boolean).join(' · ')} · {fmtDateProps(l.created_at)}</p>
                {l.message && <p className="mt-1 line-clamp-1 text-[11.5px] text-[#98A2B3]">“{l.message}”</p>}
              </div>
              <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10.5px] font-bold text-[#475467]">{p.stageOf(l)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Visits({ data }: SecProps) {
    const today = new Date().toISOString().slice(0, 10);
    const all = (data.leads ?? []).filter((l) => l.visit_date);
    const upcoming = all.filter((l) => String(l.visit_date) >= today);
    const past = all.filter((l) => String(l.visit_date) < today);
    if (!all.length) {
      return <Empty icon={CalendarCheck} title="No site visits scheduled" desc="When a buyer books a visit to one of your properties, it appears here with date, time and coordination details." />;
    }
    const Group = ({ title, rows }: { title: string; rows: typeof all }) => (
      <section>
        <h2 className="mb-2.5 text-[13px] font-bold text-[#101828]">{title} ({rows.length})</h2>
        {rows.length === 0 ? <div className={`${card} p-5 text-center text-[12px] text-[#98A2B3]`}>None.</div> : (
          <div className={`${card} divide-y divide-[#F2F4F7]`}>
            {rows.map((l) => (
              <div key={l.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#101828]">{l.buyer_name ?? 'Buyer'} · <span className={muted}>{l.property_title ?? ''}</span></p>
                  <p className="text-[11.5px] text-[#667085]">{fmtDateProps(l.visit_date)}{l.visit_time ? ` at ${l.visit_time}` : ''}</p>
                </div>
                <span className="shrink-0 text-[10.5px] text-[#98A2B3]">{p.stageOf(l)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
    return (
      <div className="space-y-5">
        <Group title="Upcoming" rows={upcoming} />
        <Group title="Completed / Past" rows={past} />
      </div>
    );
  }

  function Offers({ data }: SecProps) {
    const rows = (data.transactions ?? []).filter((t) => ['PENDING', 'NEGOTIATION', 'AGREED'].includes(String(t.txn_status ?? '').toUpperCase()));
    if (!rows.length) {
      return <Empty icon={Receipt} title="No offers or negotiations in progress" desc="When a buyer proposes an amount and it enters negotiation, the offer, status and next required action will appear here." />;
    }
    return (
      <div className={`${card} divide-y divide-[#F2F4F7]`}>
        {rows.map((t) => (
          <div key={t.id} className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#101828]">{t.property_title ?? 'Property'}</p>
              <p className="mt-0.5 text-[11.5px] text-[#667085]">{t.counterparty_name ?? 'Counterparty'} · {t.txn_type ?? 'Sale'} · started {fmtDateProps(t.created_at)}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[13px] font-bold tabular-nums text-[#101828]">{fmtMoney(t.transaction_value)}</p>
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-[#8a6d1f]">{String(t.txn_status ?? '').toUpperCase()}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function Transactions({ data, isOwner }: SecProps) {
    const rows = data.transactions ?? [];
    if (!rows.length) {
      return <Empty icon={Receipt} title="No transactions yet" desc="Deals progressed with VJR Estate support will appear here with stage, value and outstanding requirements." />;
    }
    return (
      <div className={`${card} overflow-x-auto`}>
        <table className="w-full min-w-[620px] text-left text-[12.5px]">
          <thead>
            <tr className="border-b border-[#E4E7EC] text-[10px] font-bold uppercase tracking-[0.1em] text-[#98A2B3]">
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Value</th>
              <th className="px-4 py-3">Stage</th>
              <th className="px-4 py-3">{isOwner ? 'Service charge' : 'Your share'}</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7]">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3 font-semibold text-[#101828]">{t.property_title ?? '—'}</td>
                <td className="px-4 py-3 text-[#667085]">{t.txn_type ?? '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(t.transaction_value)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[10px] font-bold text-[#475467]">{t.txn_status ?? '—'}</span></td>
                <td className="px-4 py-3 tabular-nums">{fmtMoney(isOwner ? t.vjr_amount : t.partner_amount)}</td>
                <td className="px-4 py-3 text-[#475467]">{t.payment_status ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function Revenue({ data, isOwner }: SecProps) {
    const c = data.counts;
    const rows = (data.transactions ?? []).filter((t) => t.txn_status === 'CLOSED');
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard icon={Wallet} label={isOwner ? 'Service charges (closed deals)' : 'Your earnings (closed deals)'} value={fmtMoney(c.partnerEarnings)} />
          <KpiCard icon={Wallet} label="Paid to date" value={fmtMoney(c.partnerPaid)} />
          <KpiCard icon={Wallet} label="Outstanding" value={fmtMoney(c.partnerDue)} />
        </div>
        <div className={`${card} p-5`}>
          <p className={tiny}>How this is calculated</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#667085]">
            {isOwner
              ? 'Each qualifying closed sale carries a 1% service charge of the transaction value; lease/rental facilitation fees follow the separately defined Partner Commercial Terms.'
              : 'Your 50% share is applied to the agreed commission/referral/facilitation revenue actually received by VJR Estate (Net Partnership Revenue) — never to the property sale price.'}{' '}
            Amounts shown only for backend-confirmed closed transactions. Payment is subject to the settlement terms — nothing on this page constitutes a payout promise.
          </p>
        </div>
        {rows.length === 0 ? (
          <Empty icon={Wallet} title="No closed transactions yet" desc="Settlement records appear here once deals are confirmed closed in the system." />
        ) : (
          <div className={`${card} divide-y divide-[#F2F4F7]`}>
            {rows.map((t) => (
              <div key={t.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#101828]">{t.property_title ?? '—'}</p>
                  <p className="text-[11px] text-[#98A2B3]">closed {fmtDateProps(t.closure_date ?? t.created_at)} · payment {t.payment_status ?? '—'}</p>
                </div>
                <p className="text-[13px] font-bold tabular-nums text-[#101828]">{fmtMoney(isOwner ? t.vjr_amount : t.partner_amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Documents({ data, isActive }: SecProps) {
    const vs = String(data.partner.verification_status ?? 'UNVERIFIED');
    return (
      <div className="space-y-5">
        <div className={`${card} p-5`}>
          <p className={tiny}>Partnership verification</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex rounded-full bg-[#F2F4F7] px-3 py-1.5 text-[11.5px] font-bold text-[#475467]">{vs}</span>
            <p className="text-[12.5px] text-[#667085]">
              {vs === 'VERIFIED' ? 'Your partnership documents are verified.' : 'VJR Estate may request ownership, mandate or business documents during review. You will be contacted with specifics when needed.'}
            </p>
          </div>
        </div>
        <Empty icon={FileText} title="No document uploads yet" desc={isActive ? 'Documents specific to your listings or mandate (if requested) will be collected through VJR Estate and appear here with verification status.' : 'Complete the partnership review first; document requests follow approval.'} />
        {(data.disputes ?? []).filter((d) => d.dispute_status && !['RESOLVED', 'CLOSED'].includes(String(d.dispute_status).toUpperCase())).length > 0 && (
          <div className={`${card} border-amber-200 bg-amber-50 p-4`}>
            <p className="flex items-start gap-2 text-[12.5px] font-medium text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              You have open dispute items that may require documents or clarification. The VJR Estate team will guide you through them.
            </p>
          </div>
        )}
      </div>
    );
  }

  function Messages({ data }: SecProps) {
    const events = (data.activity ?? []).slice(0, 20);
    if (!events.length) {
      return <Empty icon={Bell} title="No notifications yet" desc="Enquiry, listing, verification and settlement updates will appear here as they happen." />;
    }
    return <ActivityList rows={events} />;
  }

  function Activity({ data }: SecProps) {
    const rows = data.activity ?? [];
    if (!rows.length) {
      return <Empty icon={History} title="No activity recorded yet" desc="Registration, listing and transaction events are logged automatically and appear here in reverse-chronological order." />;
    }
    return <ActivityList rows={rows} />;
  }

  function ActivityList({ rows }: { rows: PDashData['activity'] }) {
    return (
      <div className={`${card} divide-y divide-[#F2F4F7]`}>
        {rows.map((a) => (
          <div key={a.id} className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#C9A84C]" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-[#101828]">{a.action}</p>
              {a.description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#667085]">{a.description}</p>}
              <p className="mt-1 text-[10.5px] text-[#98A2B3]">{fmtDateTimeProps(a.created_at)}{a.actor ? ` · ${a.actor_type === 'admin' ? 'VJR Estate team' : a.actor_type === 'system' ? 'System' : a.actor}` : ''}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function Terms({ data }: SecProps) {
    return (
      <div className="space-y-5">
        <div className={`${card} p-5 sm:p-6`}>
          <p className={tiny}>Applicable commercial model</p>
          <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-[#101828]">
            {data.partner.partner_type === 'Owner' ? (
              <>
                <p><span className="font-semibold">Sale service charge:</span> 1% of Transaction Value on qualifying successful sale transactions, per the Partner Terms &amp; Conditions.</p>
                <p><span className="font-semibold">Lease / rental:</span> separately defined facilitation fee under the applicable Partner Commercial Terms.</p>
                <p><span className="font-semibold">Listing &amp; subscription:</span> zero.</p>
              </>
            ) : (
              <>
                <p><span className="font-semibold">Transactions:</span> 50:50 share of the agreed partnership revenue or commission actually received by VJR Estate under the applicable agreement.</p>
                <p className="text-[#667085]">The split is on Net Partnership Revenue — <span className="font-semibold text-[#101828]">not</span> 50% of the property's sale price. Not every enquiry or offer automatically qualifies; eligibility is defined in the terms.</p>
                <p><span className="font-semibold">Listing &amp; subscription:</span> zero.</p>
              </>
            )}
          </div>
        </div>
        <div className={`${card} p-5`}>
          <p className={tiny}>Accepted versions</p>
          <dl className="mt-3 grid grid-cols-1 gap-3 text-[12.5px] sm:grid-cols-2">
            <div className="rounded-lg bg-[#F8F9FB] p-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Partner Terms</dt>
              <dd className="mt-1 font-semibold text-[#101828]">
                {data.partner.terms_accepted_at ? `${fmtDateTimeProps(data.partner.terms_accepted_at)}${data.partner.terms_version ? ` · v${data.partner.terms_version}` : ''}` : 'Not recorded'}
              </dd>
            </div>
            <div className="rounded-lg bg-[#F8F9FB] p-3">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#98A2B3]">Partner Privacy Policy</dt>
              <dd className="mt-1 font-semibold text-[#101828]">{data.partner.privacy_accepted_at ? fmtDateTimeProps(data.partner.privacy_accepted_at) : 'Not recorded'}</dd>
            </div>
          </dl>
          <p className="mt-4 text-[12px] leading-relaxed text-[#667085]">
            Read the full documents: <Link to="/partner-terms" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Terms &amp; Conditions</Link> · <Link to="/partner-privacy" target="_blank" className="font-semibold text-[#101828] underline underline-offset-2">Partner Privacy Policy</Link>.
            If the published terms are amended, you will be asked to acknowledge the new version before it applies to you.
          </p>
        </div>
      </div>
    );
  }

  function Profile({ data, isOwner }: SecProps) {
    return <PartnerProfileSection data={data} isOwner={isOwner} onRefresh={p.reloadDashboard} />;
  }

  function Support(_: SecProps) {
    return <PartnerSupportSection partnerCode={data.partner.partner_code ?? ''} />;
  }
}

function useMemoStageCounts(leads: PDashData['leads']): Record<string, number> {
  // Simple derived counts, recomputed on render; the leads list is capped
  // server-side so this stays cheap without adding state machinery.
  const counts: Record<string, number> = {};
  for (const l of leads) {
    const s = partnerStageFromLead(l);
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}
