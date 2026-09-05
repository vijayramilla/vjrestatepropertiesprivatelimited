import { useMemo, useState, type ReactNode } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import { Users, Phone, MapPin, ChevronDown, ClipboardList, Save, MessageSquare, Search, Calendar, Clock, Plus, X, Loader2 } from 'lucide-react';

const CLIENT_STATUSES = ['Site Visit', 'Token Done', 'Visit Done', 'Closed'];

const STATUS_PILL: Record<string, string> = {
  'Site Visit': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  'Token Done': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'Visit Done': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  Closed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

const LEAD_TYPE_PILL: Record<string, string> = {
  'new lead': 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
  'old lead': 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
};

function leadTypeLabel(v: string | undefined | null): string {
  const s = (v ?? 'new lead').toLowerCase();
  return s === 'old lead' ? 'Old Lead' : 'New Lead';
}

function Pill({ value, leadType }: { value: string; leadType?: string }) {
  if (value) {
    return (
      <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[value] ?? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>
        {value}
      </span>
    );
  }
  // Fresh leads carry no pipeline status — the lead type tells the story.
  const lt = leadTypeLabel(leadType);
  const ltKey = (leadType ?? 'new lead').toLowerCase();
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${LEAD_TYPE_PILL[ltKey] ?? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'}`}>
      {lt}
    </span>
  );
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function fmtTime12(t: string | null | undefined): string {
  if (!t) return '';
  const raw = t.length >= 8 ? t.slice(0, 5) : t;
  const [hStr, mStr] = raw.split(':').map(Number);
  if (hStr == null || mStr == null || Number.isNaN(hStr)) return raw;
  const h = hStr % 12 === 0 ? 12 : hStr % 12;
  const suffix = hStr < 12 ? 'AM' : 'PM';
  return `${h}:${String(mStr).padStart(2, '0')} ${suffix}`;
}

function fmtDateShort(d: string | null | undefined): string {
  if (!d) return '';
  return new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/** Indian phone → wa.me deep link. */
function waLink(phone: string, name: string, agentName: string): string | null {
  let digits = (phone ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  else if (digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  const text = encodeURIComponent(`Hi ${name}, this is ${agentName} from VJR Estate.`);
  return `https://wa.me/${digits}?text=${text}`;
}

export function WhatsAppIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type Props = {
  clients: any[];
  visits: any[];
  me: any;
  preview?: boolean;
  onChanged?: () => void;
  extra?: (client: any) => ReactNode;
};

export default function EmployeeClientsSection({ clients, visits, me, preview = false, onChanged, extra }: Props) {
  const [filter, setFilter] = useState('All');
  const [leadTypeFilter, setLeadTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedSno, setExpandedSno] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<number, { status: string; note: string }>>({});
  const [savingStatus, setSavingStatus] = useState<number | null>(null);
  const [reqDraft, setReqDraft] = useState<Record<number, { requirements: string; notes: string }>>({});
  const [reqSaving, setReqSaving] = useState<number | null>(null);
  const [visitDate, setVisitDate] = useState<Record<number, string>>({});
  const [visitTime, setVisitTime] = useState<Record<number, string>>({});
  const [savingVisit, setSavingVisit] = useState<number | null>(null);
  // Add-client sheet (telecallers can create leads straight from the portal)
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', type: '', budget: '', location: '', requirements: '', lead_type: 'new lead' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const visitByClient = useMemo(() => {
    const m: Record<number, any> = {};
    visits.forEach((v: any) => {
      if (!m[v.client_sno] || v.visit_date > m[v.client_sno].visit_date) m[v.client_sno] = v;
    });
    return m;
  }, [visits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c: any) => {
      if (filter !== 'All' && c.status !== filter) return false;
      if (leadTypeFilter !== 'All' && (c.lead_type ?? 'new lead') !== leadTypeFilter) return false;
      if (q && !((c.name ?? '').toLowerCase().includes(q) || String(c.phone ?? '').includes(q))) return false;
      return true;
    });
  }, [clients, filter, leadTypeFilter, search]);

  /** One-tap pipeline update from the collapsed card (Salesforce-path style). */
  const handleQuickStatus = async (client: any, nextStatus: string) => {
    if ((statusDraft[client.sno]?.status ?? client.status) === nextStatus) return;
    setSavingStatus(client.sno);
    try {
      await leadSupabase.crmClients.updateStatus(client.sno, nextStatus, '');
      setStatusDraft((m) => ({ ...m, [client.sno]: { status: nextStatus, note: m[client.sno]?.note ?? '' } }));
      onChanged?.();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to update status');
    } finally {
      setSavingStatus(null);
    }
  };

  const handleUpdateStatus = async (client: any) => {
    const draft = statusDraft[client.sno];
    if (!draft?.status) return;
    setSavingStatus(client.sno);
    try {
      await leadSupabase.crmClients.updateStatus(client.sno, draft.status, draft.note);
      setStatusDraft((m) => ({ ...m, [client.sno]: { status: draft.status, note: '' } }));
      onChanged?.();
    } catch (e: any) { alert(e?.message ?? 'Failed to update status'); }
    finally { setSavingStatus(null); }
  };

  const handleSaveVisit = async (client: any) => {
    const date = visitDate[client.sno];
    if (!date) return;
    setSavingVisit(client.sno);
    try {
      await leadSupabase.visits.add(client.sno, date, 'Visit date updated from dashboard', undefined, visitTime[client.sno] || undefined);
      setVisitDate((m) => ({ ...m, [client.sno]: '' }));
      setVisitTime((m) => ({ ...m, [client.sno]: '' }));
      onChanged?.();
    } catch (e: any) { alert(e?.message ?? 'Failed to schedule visit'); }
    finally { setSavingVisit(null); }
  };

  const reqFor = (c: any) => reqDraft[c.sno] ?? { requirements: c.requirements ?? '', notes: c.notes ?? '' };

  const handleSaveDetail = async (client: any) => {
    const d = reqDraft[client.sno];
    if (!d) return;
    setReqSaving(client.sno);
    try {
      await leadSupabase.employees.updateClientDetail(client.sno, { requirements: d.requirements, notes: d.notes });
      setReqDraft((m) => ({ ...m, [client.sno]: { requirements: d.requirements, notes: d.notes } }));
      onChanged?.();
    } catch (e: any) { alert(e?.message ?? 'Failed to save requirement'); }
    finally { setReqSaving(null); }
  };

  const handleAddClient = async () => {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    setAddError('');
    try {
      await leadSupabase.crmClients.create({
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
        type: addForm.type.trim(),
        budget: addForm.budget.trim(),
        location: addForm.location.trim(),
        requirements: addForm.requirements.trim(),
        lead_type: addForm.lead_type,
      });
      setAddForm({ name: '', phone: '', type: '', budget: '', location: '', requirements: '', lead_type: 'new lead' });
      setAddOpen(false);
      onChanged?.();
    } catch (e: any) {
      setAddError(e?.message ?? 'Failed to add client');
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <CrmCard className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3 sm:px-5 sm:py-4">
        <Users className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">My Clients</p>
        <span className="rounded-full bg-[#C9A84C]/[0.16] px-2 py-0.5 text-[9.5px] font-bold text-[#D6B85D]">{filtered.length} shown</span>
        {!preview && (
          <button
            onClick={() => setAddOpen(true)}
            className="ml-auto inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] px-3 text-[10.5px] font-bold text-[#0A1628] shadow-[0_2px_8px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05] active:scale-[0.98]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} /> Add Client
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        {/* Filters — pipeline status, horizontal scroll on mobile */}
        <div className="mb-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
          <div className="flex gap-1.5 sm:flex-wrap" style={{ minWidth: 'max-content' }}>
            {['All', ...CLIENT_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all duration-200 ${
                  filter === s
                    ? 'border-[#C9A84C]/60 bg-[#C9A84C]/[0.14] text-[#8a6d1f] shadow-sm'
                    : 'border-black/10 bg-white text-[#6b7280] hover:bg-black/[0.03]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Filters — lead type (new / old) */}
        <div className="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Lead</span>
          {['All', 'new lead', 'old lead'].map((lt) => (
            <button
              key={lt}
              onClick={() => setLeadTypeFilter(lt)}
              className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[10.5px] font-bold transition-all duration-200 ${
                leadTypeFilter === lt
                  ? 'border-[#0A1628]/40 bg-[#0A1628] text-white shadow-sm'
                  : 'border-black/10 bg-white text-[#6b7280] hover:bg-black/[0.03]'
              }`}
            >
              {lt === 'All' ? 'All' : leadTypeLabel(lt)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" strokeWidth={1.8} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className={`${CRM_INPUT} h-9 pl-9 text-[11.5px]`}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#9ca3af]">No clients match — try another filter or search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((c: any) => {
              const open = expandedSno === c.sno;
              const draft = statusDraft[c.sno];
              const d = reqFor(c);
              const visit = visitByClient[c.sno];
              const wa = waLink(c.phone, c.name, me?.name);
              return (
                <div key={c.sno} className={`overflow-hidden rounded-xl border bg-white transition-all duration-200 ${open ? 'border-[#C9A84C]/50 shadow-[0_4px_16px_rgba(201,168,76,0.12)]' : 'border-black/[0.06] shadow-[0_1px_2px_rgba(10,22,40,0.04)]'}`}>
                  {/* ── Card header (tap to expand) ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpandedSno(open ? null : c.sno)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSno(open ? null : c.sno); } }}
                    className="flex cursor-pointer items-center gap-3 px-3 py-3 sm:px-4"
                  >
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[11px] font-extrabold text-[#D6B85D] ring-1 ring-[#C9A84C]/20">
                      {initials(c.name)}
                    </div>

                    {/* Name + meta — fills available space */}
                    <div className="min-w-0 flex-1">
                      {/* Line 1: name + status/lead type */}
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-bold text-[#0A1628]">{c.name || `Client #${c.sno}`}</p>
                        <Pill value={draft?.status || c.status} leadType={c.lead_type} />
                      </div>
                      {/* Line 2: phone + visit */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-[#6b7280]">
                        <a
                          href={c.phone ? `tel:${c.phone.replace(/[^\d+]/g, '')}` : undefined}
                          onClick={(e) => e.stopPropagation()}
                          className={`inline-flex items-center gap-1 font-semibold ${c.phone ? 'text-[#96782A]' : 'text-[#9ca3af]'}`}
                        >
                          <Phone className="h-3 w-3" strokeWidth={2} /> {c.phone || '—'}
                        </a>
                        <span className="inline-flex items-center gap-1 text-[#9ca3af]">
                          <MapPin className="h-2.5 w-2.5" strokeWidth={2} />
                          {visit ? `${fmtDateShort(visit.visit_date)}${visit.visit_time ? ` · ${fmtTime12(visit.visit_time)}` : ''}` : 'No visit'}
                        </span>
                      </div>
                    </div>

                    {/* Actions — WhatsApp + expand */}
                    <div className="flex shrink-0 items-center gap-2">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-[0_2px_8px_rgba(37,211,102,0.3)] transition-all hover:brightness-110 active:scale-95"
                          title="Chat on WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                        </a>
                      )}
                      <ChevronDown className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
                    </div>
                  </div>

                  {/* ── Pipeline path — one-tap status update (Salesforce Lightning style) ── */}
                  {!preview && (
                    <div className="border-t border-black/[0.05] bg-white px-2 py-2 sm:px-3">
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ minWidth: '100%' }}>
                        <span className="hidden shrink-0 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:inline">Move to</span>
                        {CLIENT_STATUSES.map((st) => {
                          const current = statusDraft[c.sno]?.status ?? c.status;
                          const active = current === st;
                          const busy = savingStatus === c.sno;
                          const dotCls = active
                            ? st === 'Closed' ? 'bg-emerald-500' : st === 'Visit Done' ? 'bg-purple-500' : st === 'Token Done' ? 'bg-blue-500' : 'bg-[#96782A]'
                            : 'bg-black/15';
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickStatus(c, st)}
                              disabled={busy}
                              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all duration-150 disabled:opacity-60 ${
                                active
                                  ? st === 'Closed'
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : st === 'Visit Done'
                                      ? 'border-purple-200 bg-purple-50 text-purple-700'
                                      : st === 'Token Done'
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-[#C9A84C]/60 bg-[#C9A84C]/[0.14] text-[#8a6d1f] shadow-sm'
                                  : 'border-black/[0.07] bg-white text-[#6b7280] hover:border-[#C9A84C]/40 hover:text-[#0A1628]'
                              }`}
                              title={`Move ${c.name || 'client'} to ${st}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
                              {st}
                              {active && busy && <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Expanded details ── */}
                  {open && (
                    <div className="space-y-3 border-t border-black/[0.05] bg-[#fafafa] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                      {/* Lead type quick switch */}
                      {!preview && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Lead type</span>
                          {['new lead', 'old lead'].map((lt) => (
                            <button
                              key={lt}
                              onClick={async () => {
                                try {
                                  await leadSupabase.crmClients.updateStatus(c.sno, c.status || '', '', { leadType: lt });
                                  onChanged?.();
                                } catch (e: any) { alert(e?.message ?? 'Failed to update lead type'); }
                              }}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all ${
                                (c.lead_type ?? 'new lead') === lt
                                  ? 'border-[#0A1628]/50 bg-[#0A1628] text-white'
                                  : 'border-black/10 bg-white text-[#6b7280] hover:bg-black/[0.03]'
                              }`}
                            >
                              {leadTypeLabel(lt)}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Requirement + Note */}
                      <div className="space-y-2">
                        <div>
                          <label className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
                            <ClipboardList className="h-2.5 w-2.5 text-[#96782A]" strokeWidth={1.8} /> Requirement
                          </label>
                          <input
                            value={d.requirements}
                            onChange={(e) => setReqDraft((m) => ({ ...m, [c.sno]: { ...m[c.sno], requirements: e.target.value, notes: m[c.sno]?.notes ?? c.notes ?? '' } }))}
                            readOnly={preview}
                            placeholder="Location, budget, type…"
                            className={`${CRM_INPUT} h-8 w-full text-[11px]`}
                          />
                        </div>
                        <div>
                          <label className="mb-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
                            <MessageSquare className="h-2.5 w-2.5 text-[#96782A]" strokeWidth={1.8} /> Note
                          </label>
                          <input
                            value={d.notes}
                            onChange={(e) => setReqDraft((m) => ({ ...m, [c.sno]: { ...m[c.sno], notes: e.target.value, requirements: m[c.sno]?.requirements ?? c.requirements ?? '' } }))}
                            readOnly={preview}
                            placeholder="What the client said…"
                            className={`${CRM_INPUT} h-8 w-full text-[11px]`}
                          />
                        </div>
                        {!preview && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSaveDetail(c)}
                              disabled={reqSaving === c.sno}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0A1628] px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-[#1E3852] disabled:opacity-50"
                            >
                              {reqSaving === c.sno ? <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-2.5 w-2.5" />}
                              Save
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Visit + Status — stack on mobile, row on sm+ */}
                      <div className="space-y-2 border-t border-black/[0.04] pt-2.5 sm:flex sm:items-center sm:justify-between sm:space-y-0">
                        {/* Visit controls */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-[#C9A84C]/[0.1] px-2 py-1 text-[10px] font-bold text-[#96782A]">
                            <Calendar className="h-3 w-3" strokeWidth={1.8} />
                            {visit ? `${fmtDateShort(visit.visit_date)}${visit.visit_time ? ` · ${fmtTime12(visit.visit_time)}` : ''}` : 'No visit'}
                          </span>
                          <input
                            type="date"
                            min={today}
                            value={visitDate[c.sno] ?? ''}
                            onChange={(e) => setVisitDate((m) => ({ ...m, [c.sno]: e.target.value }))}
                            className={`${CRM_INPUT} h-7 w-[120px] text-[10px]`}
                          />
                          <input
                            type="time"
                            value={visitTime[c.sno] ?? ''}
                            onChange={(e) => setVisitTime((m) => ({ ...m, [c.sno]: e.target.value }))}
                            className={`${CRM_INPUT} h-7 w-[80px] text-[10px]`}
                          />
                          <button
                            onClick={() => handleSaveVisit(c)}
                            disabled={!visitDate[c.sno] || savingVisit === c.sno}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#C9A84C]/40 bg-white px-2 py-1 text-[10px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1] disabled:opacity-50"
                          >
                            <Clock className="h-2.5 w-2.5" strokeWidth={2} />
                            {savingVisit === c.sno ? '…' : 'Set Visit'}
                          </button>
                        </div>

                        {/* Status update */}
                        <div className="flex items-center gap-1.5">
                          <select
                            value={draft?.status ?? c.status}
                            onChange={(e) => setStatusDraft((m) => ({ ...m, [c.sno]: { status: e.target.value, note: m[c.sno]?.note ?? '' } }))}
                            className={`${CRM_INPUT} h-7 flex-1 sm:w-[120px] text-[10px]`}
                          >
                            <option value="">{leadTypeLabel(c.lead_type)} — fresh</option>
                            {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button
                            onClick={() => handleUpdateStatus(c)}
                            disabled={!draft?.status || savingStatus === c.sno}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0A1628] px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-[#1E3852] disabled:opacity-50"
                          >
                            {savingStatus === c.sno ? '…' : 'Update'}
                          </button>
                        </div>
                      </div>

                      {extra?.(c)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Client sheet (telecaller self-service) ── */}
      {addOpen && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[#050b14]/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => { if (!addSaving) setAddOpen(false); }}>
          <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:rounded-[24px]">
            <div className="flex shrink-0 justify-center bg-white pt-2.5 sm:hidden">
              <div className="h-1 w-9 rounded-full bg-black/15" />
            </div>
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:px-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
                <Plus className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Add New Client</p>
                <p className="text-[10px] font-semibold text-white/45">Creates the lead under your name — admins see it instantly</p>
              </div>
              <button onClick={() => setAddOpen(false)} disabled={addSaving} className="min-h-[40px] min-w-[40px] shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div>
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Client Name <span className="text-red-500">*</span></label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className={CRM_INPUT}
                />
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Contact Number</label>
                <input
                  value={addForm.phone}
                  onChange={(e) => setAddForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                  inputMode="tel"
                  className={CRM_INPUT}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Lead Type</label>
                  <select
                    value={addForm.lead_type}
                    onChange={(e) => setAddForm((f) => ({ ...f, lead_type: e.target.value }))}
                    className={CRM_INPUT}
                  >
                    <option value="new lead">New Lead</option>
                    <option value="old lead">Old Lead</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Property Type</label>
                  <input
                    value={addForm.type}
                    onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
                    placeholder="PG Building, plot…"
                    className={CRM_INPUT}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Budget</label>
                  <input
                    value={addForm.budget}
                    onChange={(e) => setAddForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="e.g. 4 Cr"
                    className={CRM_INPUT}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Preferred Location</label>
                  <input
                    value={addForm.location}
                    onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Marathalli, Whitefield…"
                    className={CRM_INPUT}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Requirement / Notes</label>
                <textarea
                  value={addForm.requirements}
                  onChange={(e) => setAddForm((f) => ({ ...f, requirements: e.target.value }))}
                  placeholder="What the client is looking for…"
                  rows={3}
                  className={`${CRM_INPUT} h-auto resize-none py-2.5`}
                />
              </div>
              {addError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">{addError}</p>}
            </div>

            <div className="shrink-0 border-t border-black/[0.06] bg-[#fafafa] p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <button
                onClick={handleAddClient}
                disabled={addSaving || !addForm.name.trim()}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] px-5 text-[13px] font-bold text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={2.2} />}
                {addSaving ? 'Adding…' : 'Add Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CrmCard>
  );
}