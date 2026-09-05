import { useCallback, useEffect, useMemo, useState } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import {
  CrmBtn,
  CrmCard,
  CrmChip,
  CRM_INPUT,
  CrmPageBody,
  CrmPageHeader,
  CrmStatCard,
  CrmStatGrid,
  MotionReveal,
} from '@/components/crm/CrmUi';
import { subscribePropertyLeads, type PropertyLead, type LeadStatus } from '@/lib/propertyLeads';
import { supabaseDeletePropertyLead, supabaseSetPropertyLeadStatus } from '@/lib/supabaseData';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Phone,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

/* ── Booking lifecycle & presentation ───────────────────────────────────── */

type BookingStatus = 'new' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

const STATUS_META: Record<BookingStatus, { label: string; badge: string; dot: string }> = {
  new: { label: 'Requested', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  confirmed: { label: 'Confirmed', badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  completed: { label: 'Completed', badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  cancelled: { label: 'Cancelled', badge: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  no_show: { label: 'No Show', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const STATUS_FLOW: Partial<Record<BookingStatus, { to: BookingStatus; label: string; icon: typeof CheckCircle2; className: string }[]>> = {
  new: [
    { to: 'confirmed', label: 'Confirm', icon: CalendarCheck2, className: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
    { to: 'completed', label: 'Completed', icon: CheckCircle2, className: 'text-[#96782A] border-[#C9A84C]/40 hover:bg-[#C9A84C]/10' },
    { to: 'cancelled', label: 'Cancel', icon: XCircle, className: 'text-red-600 border-red-200 hover:bg-red-50' },
  ],
  confirmed: [
    { to: 'completed', label: 'Completed', icon: CheckCircle2, className: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50' },
    { to: 'no_show', label: 'No Show', icon: CalendarX2, className: 'text-gray-600 border-gray-200 hover:bg-gray-100' },
    { to: 'cancelled', label: 'Cancel', icon: XCircle, className: 'text-red-600 border-red-200 hover:bg-red-50' },
  ],
};

const TERMINAL_STATUSES: BookingStatus[] = ['completed', 'cancelled', 'no_show'];

interface Booking {
  id: string;
  name: string;
  phone: string;
  propertyTitle: string;
  propertyType: string;
  propertyArea: string;
  propertyPrice: string;
  visitDate: string;
  visitTime: string;
  source: string;
  status: BookingStatus;
  createdAt: Date | null;
  visitDateObj: Date | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function initials(name: string) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/**
 * The stored visit-date is a human label ("Sep 10th, 2026" — legacy Firestore
 * rows) or an ISO date. Normalize the ordinal suffix so both parse, and return
 * a local midnight Date for calendar math.
 */
function parseVisitDate(label?: string | null): Date | null {
  if (!label) return null;
  const text = String(label).trim();
  if (!text) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const clean = text.replace(/(\d)(st|nd|rd|th)\b/gi, '$1');
  const d = new Date(clean);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Digits ready for tel:/wa.me — 10-digit Indian numbers get the +91 prefix. */
function internationalDigits(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function isOpen(status: BookingStatus) {
  return !TERMINAL_STATUSES.includes(status);
}

function toBooking(l: PropertyLead): Booking {
  const visitDateObj = parseVisitDate(l.visitDate);
  const rawStatus = (l.status ?? 'new') as string;
  const status = (Object.keys(STATUS_META).includes(rawStatus) ? rawStatus : 'new') as BookingStatus;
  return {
    id: l.id,
    name: l.buyerName ?? '',
    phone: l.buyerPhone ?? '',
    propertyTitle: l.propertyTitle ?? '',
    propertyType: l.propertyType ?? '',
    propertyArea: l.propertyArea ?? '',
    propertyPrice: l.propertyPrice ?? '',
    visitDate: l.visitDate ?? '',
    visitTime: l.visitTime ?? '',
    source: l.source === 'detail' ? 'Property page' : 'Listing card',
    status,
    createdAt: l.createdAt,
    visitDateObj,
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function CrmBookings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'today' | 'upcoming'>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('');
  const [sortKey, setSortKey] = useState('newest');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Booking | null>(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [agentsCanSee, setAgentsCanSee] = useState<boolean | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  // Telecaller / sales agent visibility — one global switch persisted on the
  // employees table (bookings_visible). Read once; the employee portal hides
  // or shows Bookings based on this.
  useEffect(() => {
    leadSupabase.bookings.visibility()
      .then((r) => setAgentsCanSee(r.enabled))
      .catch(() => setAgentsCanSee(true));
  }, []);

  const toggleAgentAccess = async () => {
    const next = !(agentsCanSee ?? true);
    setSavingAccess(true);
    try {
      await leadSupabase.bookings.setVisibility(next);
      setAgentsCanSee(next);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to update visibility');
    } finally {
      setSavingAccess(false);
    }
  };

  useEffect(() => {
    const unsub = subscribePropertyLeads(
      (data) => {
        setLeads(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  // Only site-visit bookings on VJR Estate's own listings belong in the
  // Bookings pipeline — matches the Enquiries page filter (listedBy VJR).
  const bookings = useMemo<Booking[]>(
    () =>
      leads
        .filter((l) => l.leadType === 'book_visit')
        .filter((l) => !l.listedBy || l.listedBy === 'VJR Estate')
        .map(toBooking),
    [leads],
  );

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    let upcoming = 0;
    let todayCount = 0;
    for (const b of bookings) {
      byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
      if (b.visitDateObj) {
        if (sameLocalDay(b.visitDateObj, todayMidnight())) todayCount += 1;
        if (isOpen(b.status) && b.visitDateObj.getTime() >= todayMidnight().getTime()) upcoming += 1;
      }
    }
    return { total: bookings.length, byStatus, upcoming, today: todayCount };
  }, [bookings]);

  const filtered = useMemo(() => {
    let list = bookings.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.name, b.phone, b.propertyTitle, b.propertyArea].some((v) => String(v ?? '').toLowerCase().includes(q)),
      );
    }
    const now = todayMidnight();
    if (scope === 'today') {
      list = list.filter((b) => b.visitDateObj && sameLocalDay(b.visitDateObj, now));
    } else if (scope === 'upcoming') {
      list = list.filter((b) => b.visitDateObj && isOpen(b.status) && b.visitDateObj.getTime() >= now.getTime());
    }
    if (statusFilter) list = list.filter((b) => b.status === statusFilter);

    switch (sortKey) {
      case 'soonest':
        list.sort((a, b) => (a.visitDateObj?.getTime() ?? Infinity) - (b.visitDateObj?.getTime() ?? Infinity));
        break;
      case 'latest':
        list.sort((a, b) => (b.visitDateObj?.getTime() ?? -Infinity) - (a.visitDateObj?.getTime() ?? -Infinity));
        break;
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
    }
    return list;
  }, [bookings, search, scope, statusFilter, sortKey]);

  const requestedCount = counts.byStatus['new'] ?? 0;
  const hasFilters = Boolean(search || scope !== 'all' || statusFilter);

  const clearFilters = () => {
    setSearch('');
    setScope('all');
    setStatusFilter('');
  };

  const setStatus = useCallback(async (booking: Booking, next: BookingStatus) => {
    const prev = booking.status;
    setSavingId(booking.id);
    setLeads((ls) =>
      ls.map((l) => (l.id === booking.id ? { ...l, status: next as LeadStatus } : l)),
    );
    try {
      await supabaseSetPropertyLeadStatus(booking.id, next);
    } catch {
      setLeads((ls) =>
        ls.map((l) => (l.id === booking.id ? { ...l, status: prev as LeadStatus } : l)),
      );
    } finally {
      setSavingId(null);
    }
  }, []);

  const scopeLabel = scope === 'all' ? 'All' : scope === 'today' ? "Today's visits" : 'Upcoming visits';

  const confirmDeleteBooking = async () => {
    if (!confirmDelete || deleteWord !== 'DELETE') return;
    setDeleting(true);
    try {
      await supabaseDeletePropertyLead(confirmDelete.id);
      setLeads((ls) => ls.filter((l) => l.id !== confirmDelete.id));
      setConfirmDelete(null);
      setDeleteWord('');
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete the booking — please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] text-[#0A1628] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Pipeline"
            title="Bookings"
            description={`${bookings.length} site-visit bookings from the website · ${requestedCount} requested · updates live`}
            actions={
              <button
                type="button"
                onClick={toggleAgentAccess}
                disabled={savingAccess || agentsCanSee === null}
                title={agentsCanSee ? 'Telecaller & sales agents can open Bookings in their portal' : 'Bookings are hidden from telecaller & sales agents'}
                className={`inline-flex min-h-[40px] items-center gap-2.5 rounded-xl border px-4 py-2 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  agentsCanSee
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-black/10 bg-white text-[#6b7280] hover:bg-black/[0.03]'
                }`}
              >
                {savingAccess ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : agentsCanSee ? (
                  <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                )}
                <span className="hidden sm:inline">{agentsCanSee ? 'Telecaller access on' : 'Telecaller access off'}</span>
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${agentsCanSee ? 'bg-emerald-500' : 'bg-black/15'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${agentsCanSee ? 'left-[18px]' : 'left-0.5'}`} />
                </span>
              </button>
            }
          />

          <CrmStatGrid>
            <MotionReveal delay={0}>
              <button type="button" onClick={() => { setScope('all'); setStatusFilter(''); }} className="block w-full text-left">
                <CrmStatCard icon={<CalendarDays className="h-5 w-5" strokeWidth={1.6} />} label="Total Bookings" value={bookings.length} subtext="All site visits" tone="navy" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.05}>
              <button type="button" onClick={() => setStatusFilter(statusFilter === 'new' ? '' : 'new')} className="block w-full text-left">
                <CrmStatCard icon={<CalendarClock className="h-5 w-5" strokeWidth={1.6} />} label="Requested" value={requestedCount} subtext="Awaiting confirmation" tone="blue" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <button type="button" onClick={() => setScope(scope === 'upcoming' ? 'all' : 'upcoming')} className="block w-full text-left">
                <CrmStatCard icon={<CalendarCheck2 className="h-5 w-5" strokeWidth={1.6} />} label="Upcoming" value={counts.upcoming} subtext="Not yet visited" tone="gold" />
              </button>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <button type="button" onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')} className="block w-full text-left">
                <CrmStatCard icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.6} />} label="Completed" value={counts.byStatus['completed'] ?? 0} subtext="Visits done" tone="emerald" />
              </button>
            </MotionReveal>
          </CrmStatGrid>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, or property..."
                className={`${CRM_INPUT} pl-9`}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className={`${CRM_INPUT} lg:w-[200px]`}>
                <option value="newest">Newest bookings</option>
                <option value="soonest">Visit date: soonest</option>
                <option value="latest">Visit date: latest</option>
                <option value="name">Name: A to Z</option>
              </select>
              {hasFilters && (
                <CrmBtn variant="ghost" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5" /> Clear
                </CrmBtn>
              )}
            </div>
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            <CrmChip active={!statusFilter && scope === 'all'} onClick={() => { setScope('all'); setStatusFilter(''); }}>
              All <span className="opacity-60">{counts.total}</span>
            </CrmChip>
            <CrmChip active={scope === 'today'} onClick={() => setScope(scope === 'today' ? 'all' : 'today')}>
              Today <span className="opacity-60">{counts.today}</span>
            </CrmChip>
            <CrmChip active={scope === 'upcoming'} onClick={() => setScope(scope === 'upcoming' ? 'all' : 'upcoming')}>
              Upcoming <span className="opacity-60">{counts.upcoming}</span>
            </CrmChip>
            {(Object.keys(STATUS_META) as BookingStatus[]).map((s) => (
              <CrmChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? '' : s)}>
                {STATUS_META[s].label} <span className="opacity-60">{counts.byStatus[s] ?? 0}</span>
              </CrmChip>
            ))}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center">
              <CalendarX2 className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="text-sm font-semibold text-[#0A1628]">
                {bookings.length === 0 ? 'No site-visit bookings yet' : 'No bookings match your filters'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#9ca3af]">
                {bookings.length === 0
                  ? 'When a visitor picks a date and time on a property page (Book Now), the booking appears here with their name, mobile number and preferred visit slot.'
                  : `Showing ${scopeLabel.toLowerCase()}${statusFilter ? ` · ${STATUS_META[statusFilter as BookingStatus].label.toLowerCase()}` : ''}.`}
              </p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="mt-3 text-xs font-bold text-[#96782A] hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <MotionReveal>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                {filtered.map((booking) => {
                  const meta = STATUS_META[booking.status];
                  const visit = booking.visitDateObj;
                  const phoneDigits = internationalDigits(booking.phone);
                  const actions = STATUS_FLOW[booking.status] ?? [];
                  return (
                    <CrmCard key={booking.id} className="overflow-hidden p-0">
                      <div className="border-b border-black/[0.04] p-4">
                        <div className="flex items-start gap-3.5">
                          {/* Calendar tile */}
                          {visit ? (
                            <div className="flex h-[56px] w-[56px] shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] shadow-[0_3px_10px_rgba(10,22,40,0.2)]">
                              <span className="text-[8.5px] font-bold uppercase tracking-[0.16em] text-[#D6B85D]">{WEEKDAYS[visit.getDay()]}</span>
                              <span className="font-['Inter',sans-serif] text-[17px] font-bold leading-none text-white tabular-nums">{visit.getDate()}</span>
                              <span className="mt-0.5 text-[8.5px] font-semibold uppercase tracking-wider text-white/60">{MONTHS[visit.getMonth()]}</span>
                            </div>
                          ) : (
                            <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-xl bg-gray-50 text-[#9ca3af]">
                              <CalendarX2 className="h-5 w-5" strokeWidth={1.5} />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-[14px] font-bold text-[#111827]">{booking.name || 'Anonymous visitor'}</p>
                              <span className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.badge}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                {meta.label}
                              </span>
                            </div>

                            {phoneDigits ? (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <a
                                  href={`tel:+${phoneDigits}`}
                                  className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border border-black/5 bg-[#fafafa] px-2.5 text-[11.5px] font-semibold text-[#0A1628] tabular-nums transition-colors hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/[0.06]"
                                >
                                  <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={1.8} />
                                  {booking.phone}
                                </a>
                                <a
                                  href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(
                                    `Hi ${booking.name || 'there'}, this is VJR Estate regarding your site visit for ${booking.propertyTitle}${visit ? ` on ${WEEKDAYS[visit.getDay()]}, ${visit.getDate()} ${MONTHS[visit.getMonth()]} ${visit.getFullYear()}` : ''}${booking.visitTime ? ` at ${booking.visitTime}` : ''}. Please confirm.`,
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="WhatsApp the visitor"
                                  className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-[#25D366]/25 text-[#1DA851] transition-colors hover:bg-[#25D366]/10"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.8} />
                                </a>
                              </div>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#9ca3af]">No mobile captured</p>
                            )}
                          </div>
                        </div>

                        {booking.visitTime && (
                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#C9A84C]/[0.09] px-2.5 py-1.5 text-[11px] font-semibold text-[#8a6d1f]">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.8} />
                            {booking.visitTime}
                          </div>
                        )}
                      </div>

                      <div className="p-4 pt-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/[0.05] text-[#0A1628]">
                            <Building2 className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12.5px] font-bold leading-snug text-[#111827]">{booking.propertyTitle}</p>
                            <p className="truncate text-[10.5px] text-[#9ca3af]">
                              {[booking.propertyType, booking.propertyArea].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </div>
                          {booking.propertyPrice && (
                            <p className="ml-auto shrink-0 font-['Inter',sans-serif] text-[11px] font-bold text-emerald-600">{booking.propertyPrice}</p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center gap-2 border-t border-black/[0.04] pt-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#e8d8ae] to-[#c9a962] text-[8px] font-extrabold text-[#0a0d12]">
                            {initials(booking.name)}
                          </div>
                          <span className="text-[10.5px] text-[#9ca3af]">
                            {booking.source} · booked {booking.createdAt
                              ? booking.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                              : 'recently'}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setConfirmDelete(booking); setDeleteWord(''); }}
                            className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                            title="Delete this booking"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                        </div>

                        {actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {actions.map((a) => (
                              <button
                                key={a.to}
                                type="button"
                                disabled={savingId === booking.id}
                                onClick={() => setStatus(booking, a.to)}
                                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 text-[10.5px] font-bold transition-colors disabled:opacity-50 ${a.className}`}
                              >
                                <a.icon className="h-3 w-3" strokeWidth={2} />
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CrmCard>
                  );
                })}
              </div>

              <p className="mt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
                {filtered.length} of {bookings.length} bookings shown · VJR Estate Properties
              </p>
            </MotionReveal>
          )}

          {/* ── Delete confirmation — type DELETE to proceed ── */}
          {confirmDelete && (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-[#050b14]/80 p-3 backdrop-blur-xl sm:items-center sm:p-4"
              onClick={() => { if (!deleting) { setConfirmDelete(null); setDeleteWord(''); } }}
            >
              <div
                className="relative w-full max-w-md overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] sm:rounded-[24px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-5 py-4">
                  <p className="text-[13px] font-bold text-white">Delete this booking?</p>
                  <p className="mt-0.5 text-[11px] text-white/50">This cannot be undone.</p>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={1.8} />
                    <p className="text-[11.5px] leading-relaxed text-red-700">
                      <span className="font-bold">{confirmDelete.name || 'This visitor'}</span> · {confirmDelete.propertyTitle || 'Property visit'} on{' '}
                      {confirmDelete.visitDateObj
                        ? confirmDelete.visitDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                        : 'a scheduled date'}
                      {confirmDelete.visitTime ? ` at ${confirmDelete.visitTime}` : ''} will be permanently removed from the pipeline, including for telecaller agents.
                    </p>
                  </div>
                  <label className="mb-1 mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
                    Type <span className="font-mono text-red-600">DELETE</span> to confirm
                  </label>
                  <input
                    value={deleteWord}
                    onChange={(e) => setDeleteWord(e.target.value)}
                    placeholder="DELETE"
                    autoFocus
                    className={`${CRM_INPUT} font-mono uppercase tracking-[0.25em]`}
                  />
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => { setConfirmDelete(null); setDeleteWord(''); }}
                      disabled={deleting}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteBooking}
                      disabled={deleteWord !== 'DELETE' || deleting}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {deleting ? 'Deleting…' : 'Delete Booking'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CrmPageBody>
      </main>
    </div>
  );
}
