import { useEffect, useMemo, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';
import {
  CalendarClock, CalendarX2, Clock, EyeOff,
  Phone, Search, Building2,
} from 'lucide-react';
import EmployeePortalLayout from '@/components/crm/EmployeePortalLayout';
import { WhatsAppIcon } from '@/components/crm/EmployeeClientsSection';

type Status = 'new' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

const STATUS_META: Record<Status, { label: string; badge: string }> = {
  new: { label: 'Requested', badge: 'bg-blue-50 text-blue-700' },
  confirmed: { label: 'Confirmed', badge: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-50 text-red-600' },
  no_show: { label: 'No Show', badge: 'bg-gray-100 text-gray-600' },
};

function initials(name: string) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length === 0 ? '?' : parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function parseVisitDate(label?: string | null): Date | null {
  if (!label) return null;
  const text = String(label).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const clean = text.replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const d = new Date(clean);
  return Number.isNaN(d.getTime()) ? null : d;
}

function waLink(phone: string, name: string): string | null {
  let digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) digits = `91${digits}`;
  const text = encodeURIComponent(`Hi ${name}, this is the team from VJR Estate regarding your site visit.`);
  return `https://wa.me/${digits}?text=${text}`;
}

const TERMINAL: Status[] = ['completed', 'cancelled', 'no_show'];

export default function CrmMyBookings() {
  useEmployeeSession();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'today' | 'upcoming'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | ''>('');

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const fetchAll = async () => {
    try {
      const res = await leadSupabase.bookings.mine();
      setRows(res.data ?? []);
      setDenied(false);
    } catch (e: any) {
      setDenied(String(e?.message ?? '').includes('turned off'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(
    () =>
      rows.map((r) => {
        const raw = String(r.status ?? 'new');
        const status = (Object.keys(STATUS_META).includes(raw) ? raw : 'new') as Status;
        return {
          id: r.id,
          name: r.buyer_name ?? '',
          phone: r.buyer_phone ?? '',
          propertyTitle: r.property_title ?? '',
          propertyType: r.property_type ?? '',
          propertyArea: r.property_area ?? '',
          propertyPrice: r.property_price ?? '',
          visitDate: r.visit_date ?? '',
          visitTime: r.visit_time ?? '',
          status,
          createdAt: r.created_at ? new Date(r.created_at) : null,
          visitDateObj: parseVisitDate(r.visit_date),
        };
      }),
    [rows],
  );

  const counts = useMemo(() => {
    let todayCount = 0;
    let upcoming = 0;
    for (const b of parsed) {
      if (b.visitDateObj) {
        const same = b.visitDateObj.getTime() === todayStart.getTime();
        if (same) todayCount += 1;
        if (!TERMINAL.includes(b.status) && b.visitDateObj.getTime() >= todayStart.getTime()) upcoming += 1;
      }
    }
    return {
      total: parsed.length,
      today: todayCount,
      upcoming,
      byStatus: parsed.reduce<Record<string, number>>((m, b) => {
        m[b.status] = (m[b.status] ?? 0) + 1;
        return m;
      }, {}),
    };
  }, [parsed, todayStart]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parsed.filter((b) => {
      if (q && ![b.name, b.phone, b.propertyTitle, b.propertyArea].some((v) => String(v ?? '').toLowerCase().includes(q))) return false;
      if (scope === 'today' && !(b.visitDateObj && b.visitDateObj.getTime() === todayStart.getTime())) return false;
      if (scope === 'upcoming' && !(b.visitDateObj && !TERMINAL.includes(b.status) && b.visitDateObj.getTime() >= todayStart.getTime())) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
  }, [parsed, search, scope, statusFilter, todayStart]);

  return (
    <EmployeePortalLayout tab="bookings">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A3842E]">
            <span className="h-px w-6 bg-gradient-to-r from-[#C9A84C] to-transparent" /> Site Visits
          </p>
          <h1 className="font-['Inter',sans-serif] text-[22px] font-semibold tracking-tight text-[#0A1628] sm:text-[26px]">Bookings</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">Visitors who booked a property visit on the website — call them to confirm and follow up.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all' as const, label: 'All', value: counts.total },
            { key: 'today' as const, label: 'Today', value: counts.today },
            { key: 'upcoming' as const, label: 'Upcoming', value: counts.upcoming },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setScope(c.key)}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                scope === c.key ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'
              }`}
            >
              {c.label} <span className="opacity-60">{c.value}</span>
            </button>
          ))}
        </div>
      </div>

      {denied && !loading ? (
        <div className="rounded-2xl border border-black/[0.06] bg-white py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C9A84C]/[0.12] text-[#96782A]">
            <EyeOff className="h-5 w-5" strokeWidth={1.6} />
          </div>
          <p className="text-sm font-bold text-[#0A1628]">Bookings are hidden for now</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#6b7280]">
            Your admin has switched off booking visibility for telecaller & sales agents. This page appears again the moment access is turned on.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mb-4 max-w-[520px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, mobile or property…"
              className="h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-3 text-sm text-[#0A1628] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20"
            />
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#6b7280] ring-1 ring-black/5">
              Status
            </span>
            {(Object.keys(STATUS_META) as Status[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${
                  statusFilter === s ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'
                }`}
              >
                {STATUS_META[s].label} <span className="opacity-60">{counts.byStatus[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-52 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.06] bg-white py-14 text-center">
              <CalendarX2 className="mx-auto mb-3 h-7 w-7 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="text-sm font-semibold text-[#0A1628]">{parsed.length === 0 ? 'No bookings yet' : 'Nothing matches these filters'}</p>
              <p className="mt-1 text-xs text-[#9ca3af]">New website bookings appear here automatically, live.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {filtered.map((b) => {
                const wa = waLink(b.phone, b.name);
                const when = b.visitDateObj
                  ? b.visitDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                  : b.visitDate || 'Date not set';
                return (
                  <div key={b.id} className="flex flex-col rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[12px] font-extrabold text-[#D6B85D]">
                        {initials(b.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[14px] font-bold text-[#0A1628]">{b.name || 'Unknown visitor'}</p>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${STATUS_META[b.status].badge}`}>{STATUS_META[b.status].label}</span>
                        </div>
                        <a href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`} className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#96782A]">
                          <Phone className="h-3 w-3" strokeWidth={2} /> {b.phone || 'No mobile'}
                        </a>
                      </div>
                    </div>

                    {b.propertyTitle && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#fafafa] px-3 py-2.5">
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#96782A]" strokeWidth={1.6} />
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-bold text-[#0A1628]">{b.propertyTitle}</p>
                          {(b.propertyType || b.propertyArea || b.propertyPrice) && (
                            <p className="mt-0.5 truncate text-[10.5px] text-[#6b7280]">
                              {[b.propertyType, b.propertyArea, b.propertyPrice].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#0A1628]">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#C9A84C]/[0.12] px-2 py-1 text-[10.5px] font-bold text-[#8a6d1f]">
                        <CalendarClock className="h-3 w-3" strokeWidth={1.8} /> {when}
                      </span>
                      {b.visitTime && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#C9A84C]/[0.12] px-2 py-1 text-[10.5px] font-bold text-[#8a6d1f]">
                          <Clock className="h-3 w-3" strokeWidth={1.8} /> {b.visitTime}
                        </span>
                      )}
                    </div>

                    <div className="mt-auto flex items-center gap-2 border-t border-black/[0.05] pt-3" style={{ marginTop: 'auto' }}>
                      <a href={`tel:${String(b.phone).replace(/[^\d+]/g, '')}`} className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0A1628] text-[11px] font-bold text-white transition-colors hover:bg-[#1E3852]">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                      {wa && (
                        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] text-[11px] font-bold text-white transition-all hover:brightness-110">
                          <WhatsAppIcon className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <p className="pb-2 pt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
        VJR Estate — site visit bookings · refreshes every 30s
      </p>
    </EmployeePortalLayout>
  );
}
