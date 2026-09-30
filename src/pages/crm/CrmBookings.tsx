import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CrmSidebar from '@/components/crm/CrmSidebar';
import {
  CrmBtn,
  CrmCard,
  CRM_INPUT,
  CrmPageBody,
  MotionReveal,
} from '@/components/crm/CrmUi';
import { subscribePropertyLeads, type PropertyLead } from '@/lib/propertyLeads';
import {
  callDataProxy,
  isSupabaseDataEnabled,
  supabaseDeletePropertyLead,
  supabaseGetProperty,
} from '@/lib/supabaseData';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { mapFirestoreToProperty } from '@/lib/firestoreProperties';
import type { Property } from '@/data/properties';
import SupabaseImage from '@/components/common/SupabaseImage';
import { formatINRCompact } from '@/lib/formatPrice';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Building2,
  CalendarDays,
  CalendarX2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  History,
  Loader2,
  Phone,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

/* ── Booking presentation ────────────────────────────────────────────────── */
// A booking is final the moment the visitor submits the form — there is no
// request→confirm pipeline. Every row on this page is simply "Booked"; the
// only lifecycle action is Delete (which archives to History).

interface Booking {
  id: string;
  propertyId: string;
  name: string;
  phone: string;
  propertyTitle: string;
  propertyType: string;
  propertyArea: string;
  propertyPrice: string;
  visitDate: string;
  visitTime: string;
  source: string;
  createdAt: Date | null;
  visitDateObj: Date | null;
}

interface DeletedBooking {
  id: string;
  propertyId: string;
  buyerName: string;
  buyerPhone: string;
  propertyTitle: string;
  propertyType: string;
  propertyArea: string;
  visitDate: string;
  visitTime: string;
  status: string;
  deletedAt: Date | null;
  createdAt: Date | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function initials(name: string) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* ── Property mini-preview (inline grid inside the booking card) ────────── */

interface PropertyPreview {
  title: string;
  type: string;
  area: string;
  location: string;
  priceLabel: string;
  monthlyRental: string | null;
  areaSqft: number;
  floorCount: number;
  totalUnits: number;
  facing: string;
  age: string;
  status: string;
  images: string[];
}

/** Read the property from Supabase (live catalog) or Firestore (fallback). */
async function fetchPropertyPreview(propertyId: string): Promise<PropertyPreview | null> {
  try {
    if (isSupabaseDataEnabled()) {
      const doc_ = await supabaseGetProperty(propertyId);
      if (!doc_) return null;
      const p = mapFirestoreToProperty(propertyId, doc_ as any);
      return toPreview(p);
    }
    const snap = await getDoc(doc(db, 'properties', propertyId));
    if (!snap.exists()) return null;
    return toPreview(mapFirestoreToProperty(snap.id, snap.data() as any));
  } catch {
    return null;
  }
}

function toPreview(p: Property): PropertyPreview {
  const isPlot = isPlotLikeProperty(p.type);
  return {
    title: p.title || p.name,
    type: p.type,
    area: p.area,
    location: p.location ?? '',
    priceLabel: p.monthly_rental && !isPlot ? `${p.monthly_rental} / mo income` : formatINRCompact(p.price),
    monthlyRental: p.monthly_rental ?? null,
    areaSqft: p.area_sqft ?? 0,
    floorCount: p.floor_count ?? 0,
    totalUnits: p.total_units ?? 0,
    facing: p.facing ?? '—',
    age: p.age ?? '—',
    status: (p as { status?: string }).status ?? 'Ready',
    images: p.images ?? [],
  };
}

function isPlotLikeProperty(type: string): boolean {
  const t = String(type ?? '').toLowerCase();
  return t.includes('plot') || t.includes('land');
}

function BookingPropertyPreview({ propertyId, title }: { propertyId: string; title: string }) {
  const [preview, setPreview] = useState<PropertyPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPropertyPreview(propertyId).then((p) => {
      if (alive) {
        setPreview(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [propertyId]);

  if (loading) {
    return (
      <div className="mt-3 animate-pulse rounded-2xl border border-black/[0.05] bg-[#fafafa] p-3">
        <div className="flex gap-3">
          <div className="h-20 w-20 shrink-0 rounded-xl bg-black/[0.06]" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 rounded bg-black/[0.06]" />
            <div className="h-3 w-1/2 rounded bg-black/[0.06]" />
            <div className="h-3 w-2/3 rounded bg-black/[0.06]" />
          </div>
        </div>
      </div>
    );
  }

  const img = preview?.images?.[0];
  const stats: { label: string; value: string }[] = preview
    ? [
        { label: 'Area', value: preview.areaSqft > 0 ? `${preview.areaSqft.toLocaleString('en-IN')} sq.ft` : preview.area || '—' },
        ...(preview.monthlyRental && !isPlotLikeProperty(preview.type) ? [{ label: 'Monthly', value: preview.monthlyRental }] : []),
        ...(preview.totalUnits > 0 ? [{ label: preview.type === 'PG Building' ? 'Rooms' : 'Units', value: String(preview.totalUnits) }] : []),
        { label: 'Facing', value: preview.facing || '—' },
      ]
    : [];

  return (          <div className="mt-3 overflow-hidden rounded-2xl border border-[#C9A84C]/25 bg-gradient-to-br from-[#faf8f2] to-white shadow-[0_4px_16px_rgba(10,22,40,0.06)]">
      {preview ? (
        <>
          {/* Preview grid: column on narrow cards, row once there's room */}
          <div className="flex flex-col gap-3 p-3 min-[420px]:flex-row">
            {/* Thumbnail */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f2f2f2]">
              {img ? (
                <SupabaseImage
                  src={img}
                  alt={preview.title}
                  preset="thumb"
                  objectFit="cover"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
                  <Building2 className="h-6 w-6 text-white/40" strokeWidth={1.4} />
                </div>
              )}
            </div>

            {/* Key facts */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold leading-snug text-[#111827]">{preview.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-[#6b7280]">
                {[preview.type, preview.area].filter(Boolean).join(' · ') || '—'}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {stats.map((s) => (
                  <span key={s.label} className="text-[10.5px] text-[#6b7280]">
                    <span className="font-semibold text-[#0A1628]">{s.value}</span>{' '}
                    <span className="text-[#9ca3af]">{s.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {preview.priceLabel && (
              <div className="flex shrink-0 items-baseline justify-between gap-2 min-[420px]:ml-auto min-[420px]:block min-[420px]:text-right">
                <p className="font-['Inter',sans-serif] text-[14px] font-extrabold text-[#0A1628]">{preview.priceLabel}</p>
                {preview.status && <p className="text-[9.5px] font-bold uppercase tracking-wider text-[#96782A] min-[420px]:mt-0.5">{preview.status}</p>}
              </div>
            )}
          </div>

          <a
            href={`/properties/${propertyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[40px] items-center justify-center gap-1.5 border-t border-[#C9A84C]/20 bg-[#0A1628] text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#1E3852]"
          >
            View Full Property
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        </>
      ) : (
        <div className="p-3.5 text-center">
          <p className="text-[12px] font-semibold text-[#374151]">{title}</p>
          <p className="mt-0.5 text-[11px] text-[#9ca3af]">Property details unavailable</p>
          <a
            href={`/properties/${propertyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 text-[11px] font-bold text-[#96782A] hover:underline"
          >
            Try opening the full page
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * The stored visit-date is an ISO date ("2026-09-30", written by the booking
 * form) or a legacy human label ("Sep 30th, 2026"). Normalize the ordinal
 * suffix so both parse, and return a local midnight Date for calendar math.
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

/** Digits ready for tel: — 10-digit Indian numbers get the +91 prefix. */
function internationalDigits(phone: string): string {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function toBooking(l: PropertyLead): Booking {
  const visitDateObj = parseVisitDate(l.visitDate);
  return {
    id: l.id,
    propertyId: l.propertyId ?? '',
    name: l.buyerName ?? '',
    phone: l.buyerPhone ?? '',
    propertyTitle: l.propertyTitle ?? '',
    propertyType: l.propertyType ?? '',
    propertyArea: l.propertyArea ?? '',
    propertyPrice: l.propertyPrice ?? '',
    visitDate: l.visitDate ?? '',
    visitTime: l.visitTime ?? '',
    source: l.source === 'detail' ? 'Property page' : 'Listing card',
    createdAt: l.createdAt,
    visitDateObj,
  };
}

function mapDeletedRow(r: any): DeletedBooking {
  return {
    id: r.id,
    propertyId: r.property_id ?? '',
    buyerName: r.buyer_name ?? '',
    buyerPhone: r.buyer_phone ?? '',
    propertyTitle: r.property_title ?? '',
    propertyType: r.property_type ?? '',
    propertyArea: r.property_area ?? '',
    visitDate: r.visit_date ?? '',
    visitTime: r.visit_time ?? '',
    status: r.status ?? 'new',
    deletedAt: r.deleted_at ? new Date(r.deleted_at) : null,
    createdAt: r.original_created_at ? new Date(r.original_created_at) : null,
  };
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function CrmBookings() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'today' | 'upcoming'>('all');
  const [sortKey, setSortKey] = useState('newest');
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Booking | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [agentsCanSee, setAgentsCanSee] = useState<boolean | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  // Telecaller / sales agent visibility — one global switch persisted on the
  // employees table (bookings_visible). The employee portal hides or shows
  // Bookings based on this.
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

  // ── History (deleted bookings) ──
  const [history, setHistory] = useState<DeletedBooking[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState<DeletedBooking | null>(null);
  const [purging, setPurging] = useState(false);

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

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await callDataProxy('lead.history');
      setHistory((res.data ?? []).map(mapDeletedRow));
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  // Every site-visit booking made on the website belongs here — including
  // visits booked on agent/owner-listed properties (listedBy is no longer a
  // filter: it silently hid real bookings from the admin). Access is already
  // scoped server-side: lead.list serves all rows to admins, own rows to users.
  const bookings = useMemo<Booking[]>(
    () =>
      leads
        .filter((l) => l.leadType === 'book_visit')
        .map(toBooking),
    [leads],
  );

  const counts = useMemo(() => {
    let upcoming = 0;
    let todayCount = 0;
    const now = todayMidnight();
    for (const b of bookings) {
      if (b.visitDateObj) {
        if (sameLocalDay(b.visitDateObj, now)) todayCount += 1;
        if (b.visitDateObj.getTime() >= now.getTime()) upcoming += 1;
      }
    }
    return { total: bookings.length, upcoming, today: todayCount };
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
      list = list.filter((b) => b.visitDateObj && b.visitDateObj.getTime() >= now.getTime());
    }

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
  }, [bookings, search, scope, sortKey]);

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((b) =>
      [b.buyerName, b.buyerPhone, b.propertyTitle, b.propertyArea].some((v) =>
        String(v ?? '').toLowerCase().includes(q),
      ),
    );
  }, [history, search]);

  const hasFilters = Boolean(search || scope !== 'all');

  const clearFilters = () => {
    setSearch('');
    setScope('all');
  };

  // Delete = move to History (deleted_bookings) so it stays visible there.
  const confirmDeleteBooking = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await supabaseDeletePropertyLead(confirmDelete.id);
      setLeads((ls) => ls.filter((l) => l.id !== confirmDelete.id));
      setConfirmDelete(null);
      if (tab === 'history') void loadHistory();
    } catch (e: any) {
      setDeleteError(e?.message ?? 'Failed to delete the booking — please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Permanent delete from History — gone for good.
  const confirmPurgeBooking = async () => {
    if (!confirmPurge) return;
    setPurging(true);
    try {
      await callDataProxy('lead.purge', { id: confirmPurge.id });
      setHistory((h) => h.filter((b) => b.id !== confirmPurge.id));
      setConfirmPurge(null);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to permanently delete — please try again.');
    } finally {
      setPurging(false);
    }
  };

  const scopeLabel = scope === 'all' ? 'All' : scope === 'today' ? "Today's visits" : 'Upcoming visits';

  return (
    <div className="h-screen overflow-hidden bg-[#f4f5f7] font-['Inter',sans-serif] text-[#0A1628] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <CrmPageBody>
          {/* Header — mirrors My Bookings: title + description left, pills right */}
          <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A3842E]">
                <span className="h-px w-6 bg-gradient-to-r from-[#C9A84C] to-transparent" />
                Site Visits
              </p>
              <h1 className="m-0 font-['Inter',sans-serif] text-[24px] font-semibold tracking-tight text-[#0A1628] sm:text-[30px]">
                Bookings
              </h1>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b7280]">
                {tab === 'active'
                  ? `Visitors who booked a property visit on the website — ${bookings.length} confirmed · updates live`
                  : `${history.length} deleted ${history.length === 1 ? 'booking' : 'bookings'} — permanently remove them from here`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Scope pills — same style as My Bookings */}
              {tab === 'active' && (
                <>
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                      scope === 'all' ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'
                    }`}
                  >
                    All <span className="opacity-60">{counts.total}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope(scope === 'today' ? 'all' : 'today')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                      scope === 'today' ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'
                    }`}
                  >
                    Today <span className="opacity-60">{counts.today}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope(scope === 'upcoming' ? 'all' : 'upcoming')}
                    className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                      scope === 'upcoming' ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'
                    }`}
                  >
                    Upcoming <span className="opacity-60">{counts.upcoming}</span>
                  </button>
                </>
              )}
              {/* Tab toggle */}
              <div className="inline-flex rounded-xl border border-black/10 bg-white p-1">
                <button
                  type="button"
                  onClick={() => { setTab('active'); clearFilters(); }}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                    tab === 'active' ? 'bg-[#0A1628] text-white' : 'text-[#6b7280] hover:bg-black/[0.04]'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('history'); setScope('all'); }}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors ${
                    tab === 'history' ? 'bg-[#0A1628] text-white' : 'text-[#6b7280] hover:bg-black/[0.04]'
                  }`}
                >
                  <History className="h-3.5 w-3.5" strokeWidth={1.8} />
                  History
                </button>
              </div>
            </div>
          </div>

          {tab === 'active' ? (
            <>

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
                  <button
                    type="button"
                    onClick={toggleAgentAccess}
                    disabled={savingAccess || agentsCanSee === null}
                    title={agentsCanSee ? 'Telecaller & sales agents can open Bookings in their portal' : 'Bookings are hidden from telecaller & sales agents'}
                    className={`inline-flex min-h-[40px] items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-colors disabled:opacity-50 ${
                      agentsCanSee
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-black/10 bg-white text-[#6b7280]'
                    }`}
                  >
                    {savingAccess ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : agentsCanSee ? (
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} />
                    )}
                    <span className="hidden sm:inline">Agent access {agentsCanSee ? 'on' : 'off'}</span>
                  </button>
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
                      ? 'When a visitor books a visit on a property page, it appears here with their name, mobile number and preferred visit slot.'
                      : `Showing ${scopeLabel.toLowerCase()}.`}
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
                      const visit = booking.visitDateObj;
                      const phoneDigits = internationalDigits(booking.phone);
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
                                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    Booked
                                  </span>
                                </div>

                                {phoneDigits ? (
                                  <div className="mt-1.5">
                                    <a
                                      href={`tel:+${phoneDigits}`}
                                      className="inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border border-black/5 bg-[#fafafa] px-2.5 text-[11.5px] font-semibold text-[#0A1628] tabular-nums transition-colors hover:border-[#C9A84C]/50 hover:bg-[#C9A84C]/[0.06]"
                                    >
                                      <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={1.8} />
                                      {booking.phone}
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
                            {/* Property block — tap to expand an inline preview grid */}
                            <button
                              type="button"
                              onClick={() => setExpandedProperty(expandedProperty === booking.id ? null : booking.id)}
                              aria-expanded={expandedProperty === booking.id}
                              title="Show property preview"
                              className="group/prop flex w-full cursor-pointer items-center gap-2.5 rounded-xl p-1.5 -m-1.5 text-left transition-colors hover:bg-[#0A1628]/[0.04]"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/[0.05] text-[#0A1628] transition-colors group-hover/prop:bg-[#0A1628] group-hover/prop:text-white">
                                <Building2 className="h-4 w-4" strokeWidth={1.5} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12.5px] font-bold leading-snug text-[#111827] group-hover/prop:text-[#96782A]">{booking.propertyTitle}</p>
                                <p className="truncate text-[10.5px] text-[#9ca3af]">
                                  {[booking.propertyType, booking.propertyArea].filter(Boolean).join(' · ') || '—'}
                                </p>
                              </div>
                              {booking.propertyPrice && (
                                <p className="ml-auto shrink-0 font-['Inter',sans-serif] text-[11px] font-bold text-emerald-600">{booking.propertyPrice}</p>
                              )}
                              {booking.propertyId && (
                                <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-[#9ca3af] transition-transform duration-200 ${expandedProperty === booking.id ? 'rotate-180 text-[#96782A]' : ''}`} strokeWidth={2} />
                              )}
                            </button>

                            <AnimatePresence initial={false}>
                              {expandedProperty === booking.id && booking.propertyId && (
                                <motion.div
                                  key="preview"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.22, ease: 'easeOut' }}
                                  className="overflow-hidden"
                                >
                                  <BookingPropertyPreview propertyId={booking.propertyId} title={booking.propertyTitle} />
                                </motion.div>
                              )}
                            </AnimatePresence>

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
                                onClick={() => { setConfirmDelete(booking); setDeleteError(''); }}
                                className="ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-white text-red-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                title="Move this booking to History"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </button>
                            </div>
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
            </>
          ) : (
            /* ── History — deleted bookings, can be permanently removed ── */
            <>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search deleted bookings..."
                    className={`${CRM_INPUT} pl-9`}
                  />
                </div>
                {search && (
                  <CrmBtn variant="ghost" onClick={() => setSearch('')}>
                    <X className="h-3.5 w-3.5" /> Clear
                  </CrmBtn>
                )}
              </div>

              {historyLoading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-44 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
                  ))}
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white py-16 text-center">
                  <History className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
                  <p className="text-sm font-semibold text-[#0A1628]">
                    {history.length === 0 ? 'No deleted bookings' : 'No deleted bookings match your search'}
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-[#9ca3af]">
                    {history.length === 0
                      ? 'Bookings you delete from the Active tab appear here, so nothing disappears without a trace.'
                      : 'Try a different name, mobile or property.'}
                  </p>
                </div>
              ) : (
                <MotionReveal>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                    {filteredHistory.map((b) => {
                      const visit = parseVisitDate(b.visitDate);
                      const phoneDigits = internationalDigits(b.buyerPhone);
                      return (
                        <CrmCard key={b.id} className="overflow-hidden p-0 opacity-90">
                          <div className="border-b border-black/[0.04] p-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-[14px] font-bold text-[#374151]">{b.buyerName || 'Anonymous visitor'}</p>
                              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                                <History className="h-3 w-3" strokeWidth={2} />
                                Deleted
                              </span>
                            </div>
                            {phoneDigits ? (
                              <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6b7280] tabular-nums">
                                <Phone className="h-3 w-3 text-[#9ca3af]" strokeWidth={1.8} />
                                {b.buyerPhone}
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-[#9ca3af]">No mobile captured</p>
                            )}
                            {visit && (
                              <p className="mt-2 text-[11px] text-[#6b7280]">
                                Visit: {WEEKDAYS[visit.getDay()]}, {visit.getDate()} {MONTHS[visit.getMonth()]} {visit.getFullYear()}
                                {b.visitTime ? ` · ${b.visitTime}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="p-4 pt-3">
                            {/* History: same expandable preview pattern (read-only) */}
                            {b.propertyId ? (
                              <a
                                href={`/properties/${b.propertyId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Open this property in a new tab"
                                className="group/prop flex items-center gap-2.5 rounded-xl p-1.5 -m-1.5 transition-colors hover:bg-[#0A1628]/[0.04]"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/[0.05] text-[#0A1628] transition-colors group-hover/prop:bg-[#0A1628] group-hover/prop:text-white">
                                  <Building2 className="h-4 w-4" strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12.5px] font-bold leading-snug text-[#374151] group-hover/prop:text-[#96782A]">{b.propertyTitle}</p>
                                  <p className="truncate text-[10.5px] text-[#9ca3af]">
                                    {[b.propertyType, b.propertyArea].filter(Boolean).join(' · ') || '—'}
                                  </p>
                                </div>
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#9ca3af] transition-colors group-hover/prop:text-[#96782A]" strokeWidth={2} />
                              </a>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0A1628]/[0.05] text-[#0A1628]">
                                  <Building2 className="h-4 w-4" strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[12.5px] font-bold leading-snug text-[#374151]">{b.propertyTitle}</p>
                                  <p className="truncate text-[10.5px] text-[#9ca3af]">
                                    {[b.propertyType, b.propertyArea].filter(Boolean).join(' · ') || '—'}
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="mt-3 flex items-center gap-2 border-t border-black/[0.04] pt-3">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[8px] font-extrabold text-[#4b5563]">
                                {initials(b.buyerName)}
                              </div>
                              <span className="text-[10.5px] text-[#9ca3af]">
                                deleted {b.deletedAt
                                  ? b.deletedAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                  : 'recently'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmPurge(b)}
                                className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-red-100 bg-white px-2.5 text-[10.5px] font-bold text-red-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                title="Permanently delete this record"
                              >
                                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                                Delete forever
                              </button>
                            </div>
                          </div>
                        </CrmCard>
                      );
                    })}
                  </div>

                  <p className="mt-6 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]">
                    {filteredHistory.length} of {history.length} deleted bookings shown
                  </p>
                </MotionReveal>
              )}
            </>
          )}

          {/* ── Delete confirmation (Active tab) — moves to History ── */}
          {confirmDelete && (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-[#050b14]/80 p-3 backdrop-blur-xl sm:items-center sm:p-4"
              onClick={() => { if (!deleting) { setConfirmDelete(null); setDeleteError(''); } }}
            >
              <div
                className="relative w-full max-w-md overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] sm:rounded-[24px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-5 py-4">
                  <p className="text-[13px] font-bold text-white">Move this booking to History?</p>
                  <p className="mt-0.5 text-[11px] text-white/50">You can permanently delete it from History later.</p>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3">
                    <History className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" strokeWidth={1.8} />
                    <p className="text-[11.5px] leading-relaxed text-blue-700">
                      <span className="font-bold">{confirmDelete.name || 'This visitor'}</span> · {confirmDelete.propertyTitle || 'Property visit'} on{' '}
                      {confirmDelete.visitDateObj
                        ? confirmDelete.visitDateObj.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
                        : 'a scheduled date'}
                      {confirmDelete.visitTime ? ` at ${confirmDelete.visitTime}` : ''} will be moved to the History tab and removed from the active pipeline.
                    </p>
                  </div>
                  {deleteError && (
                    <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-600">
                      {deleteError}
                    </p>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => { setConfirmDelete(null); setDeleteError(''); }}
                      disabled={deleting}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteBooking}
                      disabled={deleting}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(10,22,40,0.3)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {deleting ? 'Deleting…' : 'Delete Booking'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Permanent delete confirmation (History tab) ── */}
          {confirmPurge && (
            <div
              className="fixed inset-0 z-[90] flex items-end justify-center bg-[#050b14]/80 p-3 backdrop-blur-xl sm:items-center sm:p-4"
              onClick={() => { if (!purging) setConfirmPurge(null); }}
            >
              <div
                className="relative w-full max-w-md overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] sm:rounded-[24px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-black/[0.06] bg-gradient-to-r from-red-500 to-red-600 px-5 py-4">
                  <p className="text-[13px] font-bold text-white">Permanently delete?</p>
                  <p className="mt-0.5 text-[11px] text-white/50">This record will be gone forever.</p>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50/70 px-3.5 py-3">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" strokeWidth={1.8} />
                    <p className="text-[11.5px] leading-relaxed text-red-700">
                      <span className="font-bold">{confirmPurge.buyerName || 'This visitor'}</span> · {confirmPurge.propertyTitle || 'Property visit'} will be
                      permanently erased from History. This cannot be undone.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setConfirmPurge(null)}
                      disabled={purging}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-bold text-[#4b5563] transition-colors hover:bg-black/[0.03] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmPurgeBooking}
                      disabled={purging}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 px-4 text-xs font-bold text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {purging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {purging ? 'Deleting…' : 'Delete Forever'}
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
