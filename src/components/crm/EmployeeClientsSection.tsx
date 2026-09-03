import { useMemo, useState, type ReactNode } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import { Users, Phone, MapPin, ChevronDown, ClipboardList, Save, MessageSquare, Search, Calendar, Clock } from 'lucide-react';

const CLIENT_STATUSES = ['New Lead', 'Site Visit', 'Negotiation', 'Closed', 'Lost'];

const STATUS_PILL: Record<string, string> = {
  'New Lead': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'Site Visit': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Negotiation: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  Closed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Lost: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

function Pill({ value }: { value: string }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_PILL[value] ?? 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>
      {value || '—'}
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
  const [search, setSearch] = useState('');
  const [expandedSno, setExpandedSno] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<number, { status: string; note: string }>>({});
  const [savingStatus, setSavingStatus] = useState<number | null>(null);
  const [reqDraft, setReqDraft] = useState<Record<number, { requirements: string; notes: string }>>({});
  const [reqSaving, setReqSaving] = useState<number | null>(null);
  const [visitDate, setVisitDate] = useState<Record<number, string>>({});
  const [visitTime, setVisitTime] = useState<Record<number, string>>({});
  const [savingVisit, setSavingVisit] = useState<number | null>(null);

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
      if (q && !((c.name ?? '').toLowerCase().includes(q) || String(c.phone ?? '').includes(q))) return false;
      return true;
    });
  }, [clients, filter, search]);

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

  return (
    <CrmCard className="overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3 sm:px-5 sm:py-4">
        <Users className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">My Clients</p>
        <span className="rounded-full bg-[#C9A84C]/[0.16] px-2 py-0.5 text-[9.5px] font-bold text-[#D6B85D]">{filtered.length} shown</span>
      </div>

      <div className="p-3 sm:p-4 lg:p-5">
        {/* Filters — horizontal scroll on mobile */}
        <div className="mb-3 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0">
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
          <div className="space-y-2">
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
                      {/* Line 1: name + status */}
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-bold text-[#0A1628]">{c.name || `Client #${c.sno}`}</p>
                        <Pill value={draft?.status || c.status} />
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

                  {/* ── Expanded details ── */}
                  {open && (
                    <div className="space-y-3 border-t border-black/[0.05] bg-[#fafafa] px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
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
    </CrmCard>
  );
}
