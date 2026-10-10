import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmBtn, CrmCard, CrmPageBody, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  partnerCrm,
  fmtDate,
  fmtDateTime,
  fmtINR,
  NOTE_TYPES,
  SUSPENSION_REASONS,
  TERMINATION_REASONS,
  VERIFICATION_ITEMS,
  type PartnerDetail,
  type PartnerDispute,
  type PartnerLifecycle,
  type PartnerTransaction,
} from '@/services/partnerCrm';
import { StatusBadge, TypeChip, VerificationBadge } from './CrmPartnership';
import {
  ArrowLeft, BadgeCheck, Ban, FileWarning, Mail, MessageCircle, Phone, PlayCircle,
  ShieldCheck, SquarePen, StickyNote, X,
} from 'lucide-react';

/**
 * Partner 360° — dedicated partner detail page at
 * /crm/partnership/partners/{partnerId}. Complete history: listings, leads,
 * transactions, revenue, documents, verification, activity, notes, terms
 * and disputes — all scoped to the partner ID.
 */

type TabKey =
  | 'overview' | 'listings' | 'leads' | 'transactions' | 'revenue' | 'documents'
  | 'verification' | 'activity' | 'notes' | 'terms' | 'disputes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'listings', label: 'Listings' },
  { key: 'leads', label: 'Leads' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'documents', label: 'Documents' },
  { key: 'verification', label: 'Verification' },
  { key: 'activity', label: 'Activity' },
  { key: 'notes', label: 'Notes' },
  { key: 'terms', label: 'Partnership Terms' },
  { key: 'disputes', label: 'Disputes' },
];

type DialogKind = 'suspend' | 'terminate' | 'reinstate' | 'verify' | 'edit' | 'note' | 'txn' | 'dispute' | 'docRequest' | null;

export default function CrmPartnerDetail() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PartnerDetail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('overview');
  // Deep link: ?openDialog=suspend opens the lifecycle dialog directly
  // (row-menu shortcut from the Partnership list).
  const [dialog, setDialog] = useState<DialogKind>(
    () => (new URLSearchParams(window.location.search).get('openDialog') as DialogKind) ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const load = useCallback(() => {
    if (!partnerId) return;
    partnerCrm
      .detail(partnerId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load partner'));
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  const p = detail?.partner;
  const stats = useMemo(() => {
    const listings = detail?.listings ?? [];
    const leads = detail?.leads ?? [];
    const txns = detail?.transactions ?? [];
    return {
      listings: {
        total: listings.length,
        active: listings.filter((l) => l.status === 'Ready' || l.status === 'New Launch').length,
      },
      leads: {
        total: leads.length,
        contacted: leads.filter((l) => l.status !== 'new').length,
      },
      txns: {
        total: txns.length,
        closed: txns.filter((t) => t.txn_status === 'CLOSED').length,
        pending: txns.filter((t) => !['CLOSED', 'CANCELLED'].includes(t.txn_status)).length,
      },
      fin: {
        gross: txns.reduce((n, t) => n + Number(t.transaction_value ?? 0), 0),
        vjr: txns.reduce((n, t) => n + Number(t.vjr_amount ?? 0), 0),
        partner: txns.reduce((n, t) => n + Number(t.partner_amount ?? 0), 0),
        paid: txns.reduce((n, t) => n + Number(t.paid_amount ?? 0), 0),
        gst: txns.reduce((n, t) => n + Number(t.gst_amount ?? 0), 0),
        pending: txns.filter((t) => t.txn_status === 'CLOSED' && t.payment_status !== 'PAID').reduce((n, t) => n + Number(t.vjr_amount ?? 0) + Number(t.gst_amount ?? 0) - Number(t.paid_amount ?? 0), 0),
        open: txns.filter((t) => !['CLOSED', 'CANCELLED'].includes(t.txn_status)).length,
        openValue: txns.filter((t) => !['CLOSED', 'CANCELLED'].includes(t.txn_status)).reduce((n, t) => n + Number(t.vjr_amount ?? 0), 0),
      },
    };
  }, [detail]);

  async function runStatus(status: PartnerLifecycle, body: Record<string, unknown>) {
    if (!partnerId) return;
    setBusy(true);
    setDialogError('');
    try {
      await partnerCrm.setStatus({ id: partnerId, status, ...body } as Parameters<typeof partnerCrm.setStatus>[0]);
      setDialog(null);
      load();
    } catch (e) {
      setDialogError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f2] font-['Inter',sans-serif] text-[#0A1628] antialiased">
      <CrmSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          <CrmCard className="p-8 text-center">
            <FileWarning className="mx-auto h-8 w-8 text-red-400" />
            <p className="mt-3 text-sm text-red-600">{error}</p>
            <CrmBtn variant="ghost" className="mt-4" onClick={() => navigate('/crm/partnership?view=all')}>Back to Partnership</CrmBtn>
          </CrmCard>        </CrmPageBody>
      </main>
    </div>


    );
  }

  if (!p || !detail) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f2] font-['Inter',sans-serif] text-[#0A1628] antialiased">
      <CrmSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody><p className="py-24 text-center text-sm text-gray-500">Loading partner…</p></CrmPageBody>
      </main>
    </div>
    );
  }

  const canSuspend = p.status === 'active';
  const canReinstate = p.status === 'suspended' || p.status === 'pending';
  const canTerminate = p.status === 'active' || p.status === 'suspended';

  return (
    <div className="flex h-screen overflow-hidden bg-[#f6f6f2] font-['Inter',sans-serif] text-[#0A1628] antialiased">
      <CrmSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
        <Link to="/crm/partnership?view=all" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#6b7280] transition-colors hover:text-[#0A1628]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Partnership
        </Link>

        {/* ── Header ── */}
        <CrmCard className="mb-5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0A1628] text-lg font-bold text-[#C9A84C]">
                {p.full_name?.[0]?.toUpperCase() ?? '?'}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-[#0A1628] sm:text-2xl">{p.full_name}</h1>
                  <TypeChip type={p.partner_type} />
                  <StatusBadge status={p.status} />
                  <VerificationBadge status={p.verification_status} />
                </div>
                <p className="mt-1 font-mono text-[12px] font-semibold text-[#96782A]">{p.partner_code ?? p.id}</p>
                <p className="mt-1 text-[12.5px] text-gray-600">
                  {p.company_name ? `${p.company_name} · ` : ''}{p.mobile} · {p.email}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-[11.5px] text-gray-500 sm:grid-cols-3">
                  <span>Joined: <strong className="text-[#0A1628]">{fmtDate(p.created_at)}</strong></span>
                  <span>Last status change: <strong className="text-[#0A1628]">{fmtDate(p.status_changed_at)}</strong></span>
                  <span>Commercial model: <strong className="text-[#0A1628]">{p.partner_type === 'Owner' ? '1% service charge' : '50:50 share'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <a href={`tel:${p.mobile}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03]"><Phone className="h-3.5 w-3.5" /> Call</a>
              <a href={`mailto:${p.email}`} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03]"><Mail className="h-3.5 w-3.5" /> Email</a>
              <a href={`https://wa.me/91${p.mobile}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03]"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
              <CrmBtn variant="ghost" onClick={() => setDialog('edit')}><SquarePen className="h-3.5 w-3.5" /> Edit</CrmBtn>
              <CrmBtn variant="ghost" onClick={() => setDialog('verify')}><BadgeCheck className="h-3.5 w-3.5" /> Verify</CrmBtn>
              <CrmBtn variant="ghost" onClick={() => setDialog('note')}><StickyNote className="h-3.5 w-3.5" /> Add Note</CrmBtn>
              {canReinstate && <CrmBtn variant="gold" onClick={() => setDialog('reinstate')}><PlayCircle className="h-3.5 w-3.5" /> Reinstate</CrmBtn>}
              {canSuspend && <CrmBtn variant="danger" onClick={() => setDialog('suspend')}><Ban className="h-3.5 w-3.5" /> Suspend</CrmBtn>}
              {canTerminate && <CrmBtn variant="danger" className="!bg-red-600 !text-white" onClick={() => setDialog('terminate')}><ShieldCheck className="h-3.5 w-3.5" /> Terminate</CrmBtn>}
            </div>
          </div>

          {(p.status === 'suspended' || p.status === 'terminated') && p.status_reason && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-[12px] ${p.status === 'terminated' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
              <strong>{p.status === 'terminated' ? 'Terminated' : 'Suspended'}</strong> — {p.status_reason}
              {p.status_note ? ` · ${p.status_note}` : ''}
              {p.status_changed_by ? ` · by ${p.status_changed_by}` : ''}
            </div>
          )}
        </CrmCard>

        {/* ── Quick stats ── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: 'Listings', value: stats.listings.total },
            { label: 'Leads', value: stats.leads.total },
            { label: 'Transactions', value: stats.txns.total },
            { label: 'Closed', value: stats.txns.closed },
            { label: 'VJR Revenue', value: fmtINR(stats.fin.vjr) },
            { label: 'Pending Payments', value: fmtINR(Math.max(0, stats.fin.pending)) },
          ].map((s) => (
            <CrmCard key={s.label} className="p-3.5">
              <p className="text-lg font-bold tracking-tight text-[#0A1628] tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-gray-500">{s.label}</p>
            </CrmCard>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-[12px] font-bold transition-colors ${
                tab === t.key ? 'bg-[#0A1628] text-white' : 'text-gray-500 hover:bg-white hover:text-[#0A1628]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab detail={detail} stats={stats} />}
        {tab === 'listings' && <ListingsTab detail={detail} />}
        {tab === 'leads' && <LeadsTab detail={detail} />}
        {tab === 'transactions' && <TransactionsTab detail={detail} onChanged={load} setDialog={setDialog} />}
        {tab === 'revenue' && <RevenueTab detail={detail} />}
        {tab === 'documents' && <DocumentsTab detail={detail} setDialog={setDialog} />}
        {tab === 'verification' && <VerificationTab detail={detail} onChanged={load} />}
        {tab === 'activity' && <ActivityTab detail={detail} />}
        {tab === 'notes' && <NotesTab detail={detail} />}
        {tab === 'terms' && <TermsTab detail={detail} />}
        {tab === 'disputes' && <DisputesTab detail={detail} onChanged={load} setDialog={setDialog} />}

        {/* ── Dialogs ── */}
        {dialog === 'suspend' && (
          <SuspendDialog busy={busy} error={dialogError} onClose={() => setDialog(null)} onSubmit={(body) => runStatus('suspended', body)} />
        )}
        {dialog === 'terminate' && (
          <TerminateDialog busy={busy} error={dialogError} stats={stats} partnerName={p.full_name} onClose={() => setDialog(null)} onSubmit={(body) => runStatus('terminated', body)} />
        )}
        {dialog === 'reinstate' && (
          <SimpleReasonDialog
            title="Reinstate Partner"
            description={`This will set ${p.full_name} back to ACTIVE. The reinstatement is recorded in the activity history.`}
            reasonLabel="Reason for reinstatement"
            busy={busy}
            error={dialogError}
            submitLabel="Reinstate Partner"
            onClose={() => setDialog(null)}
            onSubmit={(reason, note) => runStatus('active', { reason, note })}
          />
        )}
        {dialog === 'verify' && (
          <VerifyDialog partnerId={p.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        {dialog === 'edit' && (
          <EditDialog partner={p} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        {dialog === 'note' && (
          <NoteDialog partnerId={p.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        {dialog === 'txn' && (
          <TransactionDialog partnerId={p.id} listings={detail.listings} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        {dialog === 'dispute' && (
          <DisputeDialog partnerId={p.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        {dialog === 'docRequest' && (
          <DocRequestDialog partnerId={p.id} onClose={() => setDialog(null)} onDone={() => { setDialog(null); load(); }} />
        )}
        </CrmPageBody>
      </main>
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <CrmCard className="p-5">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A3842E]">{title}</h3>
      {children}
    </CrmCard>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/[0.04] py-1.5 last:border-0">
      <span className="shrink-0 text-[11.5px] text-gray-500">{k}</span>
      <span className="min-w-0 truncate text-right text-[12.5px] font-semibold text-[#0A1628]">{v}</span>
    </div>
  );
}

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-[#0A1628]">{title}</h3>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-black/[0.05] hover:text-[#0A1628]"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogError({ error }: { error: string }) {
  if (!error) return null;
  return <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">{error}</p>;
}

/* ── Overview tab ────────────────────────────────────────────────────────── */

interface OverviewStats {
  listings: { total: number; active: number };
  leads: { total: number; contacted: number };
  txns: { total: number; closed: number; pending: number };
  fin: { gross: number; vjr: number; partner: number; paid: number; gst: number; pending: number; open: number; openValue: number };
}

function OverviewTab({ detail, stats }: { detail: PartnerDetail; stats: OverviewStats }) {
  const p = detail.partner;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <Section title="Partner Information">
          <KV k="Partner ID" v={<span className="font-mono">{p.partner_code ?? p.id}</span>} />
          <KV k="Partner Type" v={<TypeChip type={p.partner_type} />} />
          <KV k="Full Name" v={p.full_name} />
          <KV k="Partner Status" v={<StatusBadge status={p.status} />} />
          <KV k="Verification" v={<VerificationBadge status={p.verification_status} />} />
          <KV k="Joined" v={fmtDateTime(p.created_at)} />
          <KV k="Commercial Model" v={p.partner_type === 'Owner' ? 'Owner service charge: 1% of Transaction Value (facilitated sales)' : '50:50 partnership revenue share (Net Partnership Revenue)'} />
        </Section>
        <Section title="Contact & Business Information">
          <KV k="Mobile" v={<a href={`tel:${p.mobile}`} className="hover:underline">{p.mobile}</a>} />
          <KV k="Email" v={<a href={`mailto:${p.email}`} className="break-all hover:underline">{p.email}</a>} />
          <KV k="Company / Firm" v={p.company_name || '—'} />
          <KV k="Experience" v={p.experience_years ? `${p.experience_years} years` : '—'} />
          <KV k="City" v={p.city} />
          <KV k="Operating Areas" v={(p.areas ?? []).join(', ') || '—'} />
        </Section>
        {/* Device-reported registration location — aid for verification only,
            NEVER proof of the partner's address. Coordinates and map stay
            internal to CRM. */}
        {p.latitude != null && p.longitude != null && (
          <Section title="Registration Location (Device-Reported)">
            <KV k="Coordinates" v={<span className="font-mono text-[12px]">{p.latitude}, {p.longitude}</span>} />
            <KV k="Resolved address" v={p.resolved_address || 'Could not be resolved'} />
            <KV k="Reported accuracy" v={p.accuracy_meters != null ? `± ${Math.round(Number(p.accuracy_meters))} m` : 'Not reported'} />
            <KV k="Captured at" v={p.captured_at ? fmtDateTime(p.captured_at) : '—'} />
            <KV k="Capture status" v={p.location_capture_status ?? '—'} />
            {p.captured_at && (
              <a
                className="mt-2 block overflow-hidden rounded-lg ring-1 ring-black/[0.06]"
                href={`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open location in Google Maps"
              >
                <img
                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${p.latitude},${p.longitude}&zoom=16&size=640x280&scale=2&markers=color:0xC9A84C%7C${p.latitude},${p.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? ''}`}
                  alt="Map of the partner's captured registration location"
                  className="h-[180px] w-full object-cover"
                  loading="lazy"
                />
              </a>
            )}
            <p className="mt-2 text-[10.5px] text-gray-400">
              Captured from the partner's device browser during registration ({p.capture_method === 'browser_geolocation_gps' ? 'device GPS' : p.capture_method ?? 'device'}). This is a device-reported location, not independently verified proof of the partner's residential address.
            </p>
          </Section>
        )}
        <Section title="RERA Information">
          <KV k="RERA Number" v={p.rera_number ? <span className="font-mono">{p.rera_number}</span> : 'Not provided (optional)'} />
          <KV k="RERA Verification" v={(p.verification_items ?? {})['RERA Verification']?.status ?? 'Not verified'} />
          <p className="mt-2 text-[10.5px] text-gray-400">RERA details are provided by the Partner. Registration on VJR Estate does not constitute RERA registration.</p>
        </Section>
        <Section title="Account & Status History">
          <KV k="Status" v={<StatusBadge status={p.status} />} />
          <KV k="Status reason" v={p.status_reason || '—'} />
          <KV k="Changed by" v={p.status_changed_by ? `${p.status_changed_by} · ${fmtDateTime(p.status_changed_at)}` : '—'} />
          <KV k="Terms version" v={p.terms_version ?? '—'} />
          <KV k="Terms accepted" v={fmtDateTime(p.terms_accepted_at)} />
        </Section>
      </div>
      <div className="space-y-4">
        <Section title="Performance Summary">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#FBF9F3] p-3"><p className="text-lg font-bold text-[#0A1628] tabular-nums">{stats.listings.total}</p><p className="text-[10px] text-gray-500">Listings</p></div>
            <div className="rounded-xl bg-[#FBF9F3] p-3"><p className="text-lg font-bold text-[#0A1628] tabular-nums">{stats.leads.total}</p><p className="text-[10px] text-gray-500">Leads</p></div>
            <div className="rounded-xl bg-[#FBF9F3] p-3"><p className="text-lg font-bold text-[#0A1628] tabular-nums">{stats.txns.total}</p><p className="text-[10px] text-gray-500">Transactions</p></div>
          </div>
          <div className="mt-3">
            <KV k="Leads contacted" v={`${stats.leads.contacted} of ${stats.leads.total}`} />
            <KV k="Transactions closed" v={`${stats.txns.closed} of ${stats.txns.total}`} />
            <KV k="Open transactions" v={stats.txns.pending} />
          </div>
        </Section>
        <Section title="Financial Summary">
          <KV k="Gross Transaction Value" v={fmtINR(stats.fin.gross)} />
          <KV k="VJR service charge / share" v={fmtINR(stats.fin.vjr)} />
          <KV k="Partner revenue share" v={fmtINR(stats.fin.partner)} />
          <KV k="GST" v={fmtINR(stats.fin.gst)} />
          <KV k="Paid" v={fmtINR(stats.fin.paid)} />
          <KV k="Pending" v={<span className={stats.fin.pending > 0 ? 'text-amber-700' : ''}>{fmtINR(Math.max(0, stats.fin.pending))}</span>} />
          <KV k="Overdue / open value" v={fmtINR(stats.fin.openValue)} />
        </Section>
        <Section title="Recent Activity">
          {detail.activity.length === 0 ? (
            <p className="py-3 text-[12px] text-gray-400">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.activity.slice(0, 20).map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#0A1628]">{a.action.replace(/_/g, ' ')}</p>
                    <p className="truncate text-[11px] text-gray-500">{a.description}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-gray-400">{fmtDateTime(a.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ── Listings tab ────────────────────────────────────────────────────────── */

function ListingsTab({ detail }: { detail: PartnerDetail }) {
  const navigate = useNavigate();
  const listings = detail.listings;
  if (!listings.length) return <CrmCard className="p-12 text-center text-sm text-gray-400">No listings submitted by this partner yet.</CrmCard>;
  return (
    <CrmCard className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/[0.06] text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Published</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id} className="border-b border-black/[0.04] transition-colors hover:bg-[#FBF9F3]">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {l.images?.[0]
                    ? <img src={l.images[0]} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    : <span className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0A1628]">{l.title}</p>
                    <p className="font-mono text-[10.5px] text-gray-400">{l.property_code ?? l.id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[12px] text-gray-600">{l.type}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600">{l.area}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{l.price_label || (l.monthly_rental_label ?? '—')}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600">{l.status}</td>
              <td className="px-4 py-3 text-[12px] text-gray-500">{fmtDate(l.created_at)}</td>
              <td className="px-4 py-3">
                <CrmBtn variant="ghost" className="!min-h-[34px] !px-3 !text-[11px]" onClick={() => navigate(`/properties/${l.id}`)}>Open</CrmBtn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CrmCard>
  );
}

/* ── Leads tab ───────────────────────────────────────────────────────────── */

function LeadsTab({ detail }: { detail: PartnerDetail }) {
  const leads = detail.leads;
  if (!leads.length) return <CrmCard className="p-12 text-center text-sm text-gray-400">No enquiries or leads generated for this partner's listings yet.</CrmCard>;
  return (
    <CrmCard className="overflow-x-auto">
      <table className="w-full min-w-[850px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-black/[0.06] text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">
            <th className="px-4 py-3">Buyer / Tenant</th>
            <th className="px-4 py-3">Property</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Lead Status</th>
            <th className="px-4 py-3">Received</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id} className="border-b border-black/[0.04] transition-colors hover:bg-[#FBF9F3]">
              <td className="px-4 py-3">
                <p className="font-semibold text-[#0A1628]">{l.buyer_name || 'Unknown'}</p>
                <p className="text-[11px] text-gray-500">{l.buyer_phone ?? ''}</p>
              </td>
              <td className="px-4 py-3 max-w-[220px] truncate text-[12px] text-gray-600">{l.property_title}</td>
              <td className="px-4 py-3 text-[12px] text-gray-600">{l.source ?? l.lead_type ?? '—'}</td>
              <td className="px-4 py-3"><span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">{l.status}</span></td>
              <td className="px-4 py-3 text-[12px] text-gray-500">{fmtDateTime(l.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CrmCard>
  );
}

/* ── Transactions & Revenue tabs ─────────────────────────────────────────── */

function TransactionsTab({ detail, onChanged, setDialog }: { detail: PartnerDetail; onChanged: () => void; setDialog: (d: DialogKind) => void }) {
  const txns = detail.transactions;
  const [busyId, setBusyId] = useState('');

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await partnerCrm.updateTransaction({ id, ...body });
      onChanged();
    } catch { /* surfaced via activity; retry by re-saving */ }
    setBusyId('');
  };

  return (
    <>
      <div className="mb-3 flex justify-end">
        <CrmBtn variant="primary" onClick={() => setDialog('txn')}>Record Transaction</CrmBtn>
      </div>
      {!txns.length ? (
        <CrmCard className="p-12 text-center text-sm text-gray-400">No transactions recorded. Transactions are historical records — they can be updated but never deleted.</CrmCard>
      ) : (
        <div className="space-y-3">
          {txns.map((t) => (
            <TxnCard key={t.id} t={t} busy={busyId === t.id} onPatch={patch} />
          ))}
        </div>
      )}
    </>
  );
}

function TxnCard({ t, busy, onPatch }: { t: PartnerTransaction; busy: boolean; onPatch: (id: string, body: Record<string, unknown>) => void }) {
  const pending = Math.max(0, Number(t.vjr_amount ?? 0) + Number(t.gst_amount ?? 0) - Number(t.paid_amount ?? 0));
  const statusCls: Record<string, string> = {
    CLOSED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    CANCELLED: 'bg-gray-100 text-gray-600 ring-gray-200',
    DISPUTED: 'bg-red-50 text-red-700 ring-red-200',
    AGREED: 'bg-sky-50 text-sky-700 ring-sky-200',
    NEGOTIATION: 'bg-amber-50 text-amber-700 ring-amber-200',
    PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  };
  const payCls: Record<string, string> = {
    PAID: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    PARTIAL: 'bg-amber-50 text-amber-700 ring-amber-200',
    UNPAID: 'bg-red-50 text-red-700 ring-red-200',
  };
  return (
    <CrmCard className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13.5px] font-bold text-[#0A1628]">{t.property_title || 'Transaction'}</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusCls[t.txn_status] ?? ''}`}>{t.txn_status}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${payCls[t.payment_status] ?? ''}`}>{t.payment_status}</span>
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">{t.txn_type}</span>
          </div>
          <p className="mt-1.5 text-[12px] text-gray-600">
            {t.counterparty_name ? `Counterparty: ${t.counterparty_name} · ` : ''}
            {t.closure_date ? `Closed: ${fmtDate(t.closure_date)} · ` : ''}
            Recorded {fmtDate(t.created_at)} by {t.created_by}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[15px] font-bold text-[#0A1628] tabular-nums">{fmtINR(t.transaction_value)}</p>
          <p className="text-[11px] text-gray-500">Transaction Value</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-[#FBF9F3] p-3 text-[11.5px] sm:grid-cols-4">
        <span>VJR share: <strong className="text-[#0A1628]">{fmtINR(t.vjr_amount)}</strong>{t.commission_percent != null ? ` (${t.commission_percent}%)` : ''}</span>
        <span>Partner share: <strong className="text-[#0A1628]">{fmtINR(t.partner_amount)}</strong></span>
        <span>GST: <strong className="text-[#0A1628]">{fmtINR(t.gst_amount)}</strong></span>
        <span>Paid: <strong className={pending > 0 ? 'text-amber-700' : 'text-emerald-700'}>{fmtINR(t.paid_amount)}</strong>{pending > 0 ? ` · pending ${fmtINR(pending)}` : ''}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {t.txn_status !== 'CLOSED' && (
          <CrmBtn variant="ghost" disabled={busy} className="!min-h-[34px] !text-[11px]" onClick={() => onPatch(t.id, { txn_status: 'CLOSED', closure_date: new Date().toISOString().slice(0, 10) })}>Mark Closed</CrmBtn>
        )}
        {t.txn_status !== 'CANCELLED' && (
          <CrmBtn variant="danger" disabled={busy} className="!min-h-[34px] !text-[11px]" onClick={() => onPatch(t.id, { txn_status: 'CANCELLED' })}>Mark Cancelled</CrmBtn>
        )}
      </div>
    </CrmCard>
  );
}

function RevenueTab({ detail }: { detail: PartnerDetail }) {
  const txns = detail.transactions;
  const p = detail.partner;
  const isOwner = p.partner_type === 'Owner';
  const totals = txns.reduce(
    (acc, t) => ({
      gross: acc.gross + Number(t.transaction_value ?? 0),
      vjr: acc.vjr + Number(t.vjr_amount ?? 0),
      partner: acc.partner + Number(t.partner_amount ?? 0),
      gst: acc.gst + Number(t.gst_amount ?? 0),
      paid: acc.paid + Number(t.paid_amount ?? 0),
    }),
    { gross: 0, vjr: 0, partner: 0, gst: 0, paid: 0 },
  );
  const pending = txns.filter((t) => t.txn_status === 'CLOSED' && t.payment_status !== 'PAID').reduce((n, t) => n + Number(t.vjr_amount ?? 0) + Number(t.gst_amount ?? 0) - Number(t.paid_amount ?? 0), 0);
  if (!txns.length) return <CrmCard className="p-12 text-center text-sm text-gray-400">No revenue entries yet. Revenue entries are created automatically from recorded transactions.</CrmCard>;
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          isOwner ? 'Transaction Value' : 'Gross Applicable Revenue',
          isOwner ? 'Service Charge' : 'VJR Share',
          isOwner ? 'Owner Net' : `${p.partner_type} Share`,
          'GST',
          'Paid / Pending',
        ].map((label, i) => {
          const val = [totals.gross, totals.vjr, totals.partner, totals.gst, `${fmtINR(totals.paid)} / ${fmtINR(Math.max(0, pending))}`][i];
          return (
            <CrmCard key={label} className="p-3.5">
              <p className="text-[13px] font-bold text-[#0A1628] tabular-nums">{typeof val === 'number' ? fmtINR(val) : val}</p>
              <p className="mt-0.5 text-[10.5px] font-medium text-gray-500">{label}</p>
            </CrmCard>
          );
        })}
      </div>
      <CrmCard className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-black/[0.06] text-[10.5px] font-bold uppercase tracking-[0.1em] text-gray-400">
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3 text-right">{isOwner ? 'Transaction Value' : 'Gross Revenue'}</th>
              <th className="px-4 py-3 text-right">VJR Share</th>
              <th className="px-4 py-3 text-right">Partner Share</th>
              <th className="px-4 py-3 text-right">GST</th>
              <th className="px-4 py-3">Payment</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b border-black/[0.04]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-[#0A1628]">{t.property_title || 'Transaction'}</p>
                  <p className="text-[10.5px] text-gray-400">{fmtDate(t.closure_date ?? t.created_at)}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtINR(t.transaction_value)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtINR(t.vjr_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtINR(t.partner_amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtINR(t.gst_amount)}</td>
                <td className="px-4 py-3"><span className="rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 bg-gray-50 text-gray-600 ring-gray-200">{t.payment_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CrmCard>
    </>
  );
}

/* ── Documents, Verification, Activity, Notes, Terms, Disputes tabs ────── */

function DocumentsTab({ detail, setDialog }: { detail: PartnerDetail; setDialog: (d: DialogKind) => void }) {
  const verificationItems = Object.entries(detail.partner.verification_items ?? {});
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CrmBtn variant="primary" onClick={() => setDialog('docRequest')}><FileWarning className="h-3.5 w-3.5" /> Request Document</CrmBtn>
      </div>
      <CrmCard className="p-5">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A3842E]">Document / Verification Records</h3>
        <p className="mb-4 text-[11.5px] leading-relaxed text-gray-500">
          Partner documents (identity, ownership/authority letters, mandates, RERA certificates, company documents)
          are recorded as verification items. Private documents are never publicly accessible — they are stored
          with access controls and used for verification only.
        </p>
        {verificationItems.length === 0 ? (
          <p className="py-4 text-center text-[12.5px] text-gray-400">No documents or verification records yet. Use "Request Document" to ask the partner for a specific document — the request is recorded in the activity history.</p>
        ) : (
          <div className="space-y-2">
            {verificationItems.map(([key, item]) => (
              <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/[0.05] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#0A1628]">{key}</p>
                  <p className="text-[11px] text-gray-500">{item.by ? `By ${item.by} · ${fmtDateTime(item.at)}` : fmtDateTime(item.at)}{item.notes ? ` · ${item.notes}` : ''}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600 ring-1 ring-gray-200">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </CrmCard>
    </div>
  );
}

function VerificationTab({ detail, onChanged }: { detail: PartnerDetail; onChanged: () => void }) {
  const p = detail.partner;
  const items = p.verification_items ?? {};
  return (
    <CrmCard className="divide-y divide-black/[0.04]">
      {VERIFICATION_ITEMS.map((item) => {
        const rec = items[item];
        const verStatus = (rec?.status ?? '—') as string;
        const cls = verStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : verStatus === 'REJECTED' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-gray-100 text-gray-600 ring-gray-200';
        return (
          <div key={item} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#0A1628]">{item}</p>
              <p className="text-[11px] text-gray-500">
                {rec ? `Verified by ${rec.by} · ${fmtDateTime(rec.at)}${rec.notes ? ` · ${rec.notes}` : ''}` : 'Not yet verified'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${cls}`}>{verStatus}</span>
              <VerifyItemButtons partnerId={p.id} item={item} onChanged={onChanged} />
            </div>
          </div>
        );
      })}
    </CrmCard>
  );
}

function VerifyItemButtons({ partnerId, item, onChanged }: { partnerId: string; item: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  type VerStatus = 'VERIFIED' | 'REJECTED' | 'VERIFICATION REQUIRED';
  const act = async (verificationStatus: VerStatus, notes: string) => {
    setBusy(true);
    try {
      await partnerCrm.setVerification({ id: partnerId, item, verificationStatus, notes });
      onChanged();
    } catch { /* logged server-side */ }
    setBusy(false);
  };
  return (
    <>
      <CrmBtn variant="ghost" disabled={busy} className="!min-h-[32px] !px-2.5 !text-[10.5px] text-emerald-700" onClick={() => act('VERIFIED', 'Approved from Partner 360° verification tab')}>Approve</CrmBtn>
      <CrmBtn variant="ghost" disabled={busy} className="!min-h-[32px] !px-2.5 !text-[10.5px] text-red-600" onClick={() => act('REJECTED', window.prompt('Reason for rejection (recorded in activity history):') ?? '')}>Reject</CrmBtn>
      <CrmBtn variant="ghost" disabled={busy} className="!min-h-[32px] !px-2.5 !text-[10.5px]" onClick={() => act('VERIFICATION REQUIRED', window.prompt('What should the partner provide or correct?') ?? '')}>Request Correction</CrmBtn>
    </>
  );
}

function ActivityTab({ detail }: { detail: PartnerDetail }) {
  const activity = detail.activity;
  if (!activity.length) return <CrmCard className="p-12 text-center text-sm text-gray-400">No activity recorded yet. Registration, listing, lead, transaction, verification and status events appear here automatically.</CrmCard>;
  let lastDay = '';
  return (
    <CrmCard className="p-5">
      <div className="relative space-y-4 pl-5">
        <span className="absolute left-[5px] top-2 bottom-2 w-px bg-[#e7e4dc]" />
        {activity.map((a) => {
          const day = fmtDate(a.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={a.id}>
              {showDay && <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-gray-400">{day}</p>}
              <div className="relative">
                <span className="absolute -left-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#C9A84C] shadow" />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-[#0A1628]">{a.action.replace(/_/g, ' ')}</p>
                  <span className="text-[10.5px] text-gray-400">{fmtDateTime(a.created_at).split(', ').pop()}</span>
                </div>
                {a.description && <p className="mt-0.5 text-[11.5px] leading-relaxed text-gray-600">{a.description}</p>}
                <p className="mt-0.5 text-[10.5px] text-gray-400">
                  {a.actor_type === 'admin' ? `Admin: ${a.actor || 'VJR Admin'}` : a.actor_type === 'partner' ? `Partner: ${a.actor}` : 'System'}
                  {a.prev_value ? ` · Previous: ${a.prev_value}` : ''}
                  {a.new_value ? ` · New: ${a.new_value}` : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-[10.5px] italic text-gray-500">
        This timeline is generated automatically from system events. Activity records are immutable — admins cannot silently delete history.
      </p>
    </CrmCard>
  );
}

function NotesTab({ detail }: { detail: PartnerDetail }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">Internal notes are never visible to the partner.</p>
      {!detail.notes.length && <CrmCard className="p-10 text-center text-sm text-gray-400">No internal notes yet.</CrmCard>}
      {detail.notes.map((n) => (
        <CrmCard key={n.id} className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[10px] font-bold uppercase text-gray-600">{n.note_type}</span>
            {n.priority !== 'Normal' && <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${n.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{n.priority}</span>}
            <span className="ml-auto text-[10.5px] text-gray-400">{n.author_email} · {fmtDateTime(n.created_at)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#0A1628]">{n.body}</p>
        </CrmCard>
      ))}
      <p className="text-[10.5px] text-gray-400">Use the "Add Note" button in the header to add a note.</p>
    </div>
  );
}

function TermsTab({ detail }: { detail: PartnerDetail }) {
  const p = detail.partner;
  const consents = (p.consents ?? {}) as Record<string, { version?: string; at?: string } | null>;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="Commercial Model">
        <KV k="Partner Type" v={<TypeChip type={p.partner_type} />} />
        <KV k="Model" v={p.partner_type === 'Owner' ? '1% service charge on Transaction Value (facilitated sales); lease/rental fee per Partner Commercial Terms' : '50:50 revenue share on Net Partnership Revenue'} />
        <KV k="Commission percent (recorded)" v={`${p.commission_percent}%`} />
        <p className="mt-2 text-[10.5px] text-gray-400">Operative commercial terms for each Partner are set out in the signed Partner Commercial Terms, which form part of the Partner Terms &amp; Conditions at /partner-terms.</p>
      </Section>
      <Section title="Acceptance Record">
        <KV k="Terms version" v={p.terms_version ? <span className="font-mono">v{p.terms_version}</span> : '—'} />
        <KV k="Partner Terms accepted" v={fmtDateTime(p.terms_accepted_at)} />
        <KV k="Privacy Policy acknowledged" v={fmtDateTime(p.privacy_accepted_at)} />
        <KV k="Authority declared" v={fmtDateTime(consents.authority?.at ?? null)} />
        <KV k="Marketing consent" v={consents.marketing?.at ? `Given ${fmtDateTime(consents.marketing.at)}` : 'Not given (optional)'} />
        <p className="mt-2 text-[10.5px] text-gray-400">Accepted terms are versioned and never overwritten — historical versions remain available per the retention policy.</p>
      </Section>
    </div>
  );
}

function DisputesTab({ detail, onChanged, setDialog }: { detail: PartnerDetail; onChanged: () => void; setDialog: (d: DialogKind) => void }) {
  const [busyId, setBusyId] = useState('');
  const disputes = detail.disputes;
  const update = async (id: string, body: Record<string, unknown>) => {
    setBusyId(id);
    try {
      await partnerCrm.updateDispute({ id, ...body });
      onChanged();
    } catch { /* logged server-side */ }
    setBusyId('');
  };
  return (
    <>
      <div className="mb-3 flex justify-end">
        <CrmBtn variant="primary" onClick={() => setDialog('dispute')}>Open Dispute</CrmBtn>
      </div>
      {!disputes.length ? (
        <CrmCard className="p-12 text-center text-sm text-gray-400">No disputes recorded for this partner.</CrmCard>
      ) : (
        <div className="space-y-3">
          {disputes.map((d: PartnerDispute) => (
            <CrmCard key={d.id} className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13.5px] font-bold text-[#0A1628]">{d.dispute_type}</p>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">{d.dispute_status}</span>
                <span className="ml-auto text-[10.5px] text-gray-400">Opened {fmtDate(d.created_at)} · {d.assigned_admin}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-gray-700">{d.description}</p>
              {d.resolution && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11.5px] text-emerald-800">Resolution: {d.resolution} ({fmtDate(d.resolution_date)})</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {(['UNDER_REVIEW', 'WAITING_FOR_DOCUMENTS', 'RESOLVED', 'CLOSED'] as const)
                  .filter((s) => s !== d.dispute_status)
                  .map((s) => (
                    <CrmBtn key={s} variant="ghost" disabled={busyId === d.id} className="!min-h-[32px] !text-[10.5px]" onClick={() => update(d.id, { disputeStatus: s, resolution: s === 'RESOLVED' || s === 'CLOSED' ? window.prompt('Resolution note (recorded in history):') ?? '' : d.resolution })}>
                      {s.replace(/_/g, ' ')}
                    </CrmBtn>
                  ))}
              </div>
            </CrmCard>
          ))}
        </div>
      )}
    </>
  );
}

/* ── Action dialogs ──────────────────────────────────────────────────────── */

const inputCls = `${CRM_INPUT} !h-auto py-2.5`;

function SuspendDialog({ busy, error, onClose, onSubmit }: {
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [duration, setDuration] = useState<'TEMPORARY' | 'INDEFINITE'>('INDEFINITE');
  return (
    <Modal title="Suspend Partner" onClose={onClose}>
      <p className="mb-4 rounded-xl bg-orange-50 px-3.5 py-3 text-[11.5px] leading-relaxed text-orange-800">
        The partner will be blocked from creating and publishing listings. Leads, transactions and historical
        records are preserved — partner data is never deleted.
      </p>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Suspension reason *</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
        <option value="">Select a reason…</option>
        {SUSPENSION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Suspension duration</label>
      <div className="flex gap-2">
        {(['TEMPORARY', 'INDEFINITE'] as const).map((d) => (
          <button key={d} type="button" onClick={() => setDuration(d)} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-[11.5px] font-bold ${duration === d ? 'border-[#0A1628] bg-[#0A1628] text-white' : 'border-black/10 text-gray-600'}`}>{d}</button>
        ))}
      </div>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Internal note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={inputCls} placeholder="Internal context (not visible to the partner)" />
      <DialogError error={error} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="danger" className="flex-1" disabled={busy || !reason} onClick={() => onSubmit({ reason, note, suspensionType: duration })}>
          {busy ? 'Suspending…' : 'Suspend Partner'}
        </CrmBtn>
      </div>
    </Modal>
  );
}

function TerminateDialog({ busy, error, stats, partnerName, onClose, onSubmit }: {
  busy: boolean;
  error: string;
  stats: OverviewStats;
  partnerName: string;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [settlement, setSettlement] = useState('No outstanding financial obligations');
  const [confirmText, setConfirmText] = useState('');
  return (
    <Modal title="Terminate Partnership" onClose={onClose}>
      <p className="mb-4 rounded-xl bg-red-50 px-3.5 py-3 text-[11.5px] leading-relaxed text-red-800">
        <strong>High-risk action.</strong> Terminating this partnership will prevent the partner from operating
        as an active VJR Estate Partner. Historical listings, leads, transactions, financial records, documents
        and activity logs will be retained according to VJR Estate's retention requirements.
      </p>
      <div className="mb-4 rounded-xl bg-[#FBF9F3] px-3.5 py-3 text-[11.5px] text-gray-700 ring-1 ring-[#e7e4dc]">
        <p className="mb-1 font-bold text-[#0A1628]">Termination settlement review</p>
        <p>Open transactions: <strong>{stats.txns.pending}</strong> · Open value: <strong>{fmtINR(stats.fin.openValue)}</strong> · Pending payments: <strong>{fmtINR(Math.max(0, stats.fin.pending))}</strong></p>
        <p className="mt-1 text-gray-500">Termination does not cancel legitimate financial obligations.</p>
      </div>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Termination reason *</label>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
        <option value="">Select a reason…</option>
        {TERMINATION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Effective date</label>
          <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Settlement status</label>
          <input value={settlement} onChange={(e) => setSettlement(e.target.value)} className={inputCls} />
        </div>
      </div>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Admin note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Type TERMINATE to confirm *</label>
      <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className={inputCls} placeholder={`TERMINATE — terminating ${partnerName}`} />
      <DialogError error={error} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="danger" className="flex-1 !bg-red-600 !text-white" disabled={busy || !reason || confirmText !== 'TERMINATE'} onClick={() => onSubmit({ reason, note, effectiveDate, settlement })}>
          {busy ? 'Terminating…' : 'Terminate Permanently'}
        </CrmBtn>
      </div>
    </Modal>
  );
}

function SimpleReasonDialog({ title, description, reasonLabel, submitLabel, busy, error, onClose, onSubmit }: {
  title: string;
  description: string;
  reasonLabel: string;
  submitLabel: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <p className="mb-4 text-[12px] leading-relaxed text-gray-600">{description}</p>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">{reasonLabel} *</label>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className={inputCls} />
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Admin note</label>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputCls} />
      <DialogError error={error} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy || !reason.trim()} onClick={() => onSubmit(reason.trim(), note.trim())}>{busy ? 'Working…' : submitLabel}</CrmBtn>
      </div>
    </Modal>
  );
}

function VerifyDialog({ partnerId, onClose, onDone }: { partnerId: string; onClose: () => void; onDone: () => void }) {
  const [item, setItem] = useState<string>(VERIFICATION_ITEMS[0]);
  const [status, setStatus] = useState<'VERIFIED' | 'VERIFICATION REQUIRED'>('VERIFIED');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.setVerification({ id: partnerId, item, verificationStatus: status, notes });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Update Verification" onClose={onClose}>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Verification item</label>
      <select value={item} onChange={(e) => setItem(e.target.value)} className={inputCls}>
        {VERIFICATION_ITEMS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Set status</label>
      <div className="flex gap-2">
        {(['VERIFIED', 'VERIFICATION REQUIRED'] as const).map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-[11px] font-bold ${status === s ? 'border-[#0A1628] bg-[#0A1628] text-white' : 'border-black/10 text-gray-600'}`}>{s}</button>
        ))}
      </div>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Notes</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} placeholder="Recorded in the activity history" />
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save Verification'}</CrmBtn>
      </div>
    </Modal>
  );
}

function EditDialog({ partner, onClose, onDone }: { partner: PartnerDetail['partner']; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    full_name: partner.full_name,
    mobile: partner.mobile,
    company_name: partner.company_name ?? '',
    rera_number: partner.rera_number ?? '',
    city: partner.city,
    areas: (partner.areas ?? []).join(', '),
    partner_type: partner.partner_type,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.update({
        id: partner.id,
        full_name: form.full_name.trim(),
        mobile: form.mobile.replace(/\D/g, '').slice(0, 10),
        company_name: form.company_name.trim(),
        rera_number: form.rera_number.trim().toUpperCase(),
        city: form.city.trim(),
        areas: form.areas.split(',').map((a) => a.trim()).filter(Boolean),
        partner_type: form.partner_type,
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Edit Partner" onClose={onClose}>
      <p className="mb-3 text-[11px] text-gray-500">Sensitive changes (partner type, RERA number) are recorded in the audit history.</p>
      {([['full_name', 'Full name'], ['mobile', 'Mobile'], ['company_name', 'Company / Firm'], ['rera_number', 'RERA number'], ['city', 'City'], ['areas', 'Operating areas (comma-separated)']] as const).map(([key, label]) => (
        <div key={key} className="mb-3">
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">{label}</label>
          <input value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputCls} />
        </div>
      ))}
      <div className="mb-3">
        <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Partner type (sensitive)</label>
        <select value={form.partner_type} onChange={(e) => set('partner_type', e.target.value)} className={inputCls}>
          {['Owner', 'Builder', 'Agent'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save Changes'}</CrmBtn>
      </div>
    </Modal>
  );
}

function NoteDialog({ partnerId, onClose, onDone }: { partnerId: string; onClose: () => void; onDone: () => void }) {
  const [body, setBody] = useState('');
  const [noteType, setNoteType] = useState<string>('General');
  const [priority, setPriority] = useState('Normal');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.addNote({ id: partnerId, body, noteType, priority });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Add Internal Note" onClose={onClose}>
      <p className="mb-3 text-[11px] text-gray-500">Internal notes are never visible to the partner.</p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Type</label>
          <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className={inputCls}>
            {NOTE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
            {['Low', 'Normal', 'High'].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Note *</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={inputCls} />
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy || !body.trim()} onClick={submit}>{busy ? 'Saving…' : 'Add Note'}</CrmBtn>
      </div>
    </Modal>
  );
}

function TransactionDialog({ partnerId, listings, onClose, onDone }: { partnerId: string; listings: PartnerDetail['listings']; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ propertyTitle: '', counterpartyName: '', txnType: 'sale', transactionValue: '', commissionPercent: '', gstAmount: '', closureDate: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.createTransaction({
        partnerId,
        propertyTitle: form.propertyTitle.trim(),
        counterpartyName: form.counterpartyName.trim(),
        txnType: form.txnType,
        transactionValue: Number(form.transactionValue) || 0,
        commissionPercent: form.commissionPercent === '' ? null : Number(form.commissionPercent),
        gstAmount: Number(form.gstAmount) || 0,
        closureDate: form.closureDate || undefined,
        notes: form.notes.trim(),
      });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Record Transaction" onClose={onClose} wide>
      <p className="mb-3 text-[11px] text-gray-500">VJR share is computed from the commission percent; the Owner default is 1% of Transaction Value, Agents/Builders default to 50% of Net Partnership Revenue.</p>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Property</label>
          <select value={listings.some((l) => l.title === form.propertyTitle) ? form.propertyTitle : ''} onChange={(e) => set('propertyTitle', e.target.value)} className={inputCls}>
            <option value="">Select listing…</option>
            {listings.map((l) => <option key={l.id} value={l.title}>{l.title}</option>)}
          </select>
          <input value={form.propertyTitle} onChange={(e) => set('propertyTitle', e.target.value)} className={`${inputCls} mt-2`} placeholder="Or type the property / project title" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Counterparty (buyer/tenant)</label>
          <input value={form.counterpartyName} onChange={(e) => set('counterpartyName', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Transaction type</label>
          <select value={form.txnType} onChange={(e) => set('txnType', e.target.value)} className={inputCls}>
            <option value="sale">Sale</option>
            <option value="lease">Lease</option>
            <option value="rental">Rental</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Transaction Value (₹) *</label>
          <input type="number" value={form.transactionValue} onChange={(e) => set('transactionValue', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">VJR commission % (auto if blank)</label>
          <input type="number" value={form.commissionPercent} onChange={(e) => set('commissionPercent', e.target.value)} className={inputCls} placeholder="e.g. 1 or 50" />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">GST (₹)</label>
          <input type="number" value={form.gstAmount} onChange={(e) => set('gstAmount', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Closure date</label>
          <input type="date" value={form.closureDate} onChange={(e) => set('closureDate', e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Notes</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputCls} />
        </div>
      </div>
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy || !Number(form.transactionValue)} onClick={submit}>{busy ? 'Saving…' : 'Record Transaction'}</CrmBtn>
      </div>
    </Modal>
  );
}

function DisputeDialog({ partnerId, onClose, onDone }: { partnerId: string; onClose: () => void; onDone: () => void }) {
  const [disputeType, setDisputeType] = useState('Commercial');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.createDispute({ partnerId, disputeType, description });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Open Dispute" onClose={onClose}>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Dispute type</label>
      <select value={disputeType} onChange={(e) => setDisputeType(e.target.value)} className={inputCls}>
        {['VJR Estate vs Partner', 'Partner vs Buyer/Tenant', 'Partner vs Other Partner', 'Commercial', 'Payment', 'Compliance', 'Other'].map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">Description *</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy || !description.trim()} onClick={submit}>{busy ? 'Saving…' : 'Open Dispute'}</CrmBtn>
      </div>
    </Modal>
  );
}

function DocRequestDialog({ partnerId, onClose, onDone }: { partnerId: string; onClose: () => void; onDone: () => void }) {
  const [item, setItem] = useState<string>(VERIFICATION_ITEMS[0]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await partnerCrm.setVerification({ id: partnerId, item, verificationStatus: 'VERIFICATION REQUIRED', notes: notes || `Document requested: ${item}` });
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  };
  return (
    <Modal title="Request Document" onClose={onClose}>
      <p className="mb-3 text-[11px] text-gray-500">Records a document request against the selected verification item. The request and its history are logged in the partner's activity timeline.</p>
      <label className="mb-1.5 block text-[11px] font-semibold text-gray-600">Related verification item</label>
      <select value={item} onChange={(e) => setItem(e.target.value)} className={inputCls}>
        {VERIFICATION_ITEMS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <label className="mb-1.5 mt-3 block text-[11px] font-semibold text-gray-600">What should the partner provide?</label>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls} placeholder="e.g. Ownership document or authority letter for the Whitefield property" />
      <DialogError error={err} />
      <div className="mt-5 flex gap-2">
        <CrmBtn variant="ghost" className="flex-1" onClick={onClose}>Cancel</CrmBtn>
        <CrmBtn variant="primary" className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Request Document'}</CrmBtn>
      </div>
    </Modal>
  );
}
