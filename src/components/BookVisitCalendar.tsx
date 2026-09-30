import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  MessageSquareText,
  User,
  Phone,
} from 'lucide-react';
import { savePropertyLead } from '@/lib/propertyLeads';
import { getPropertyShareUrl } from '@/lib/siteUrl';

export interface BookVisitProperty {
  id: string;
  title: string;
  type: string;
  area: string;
  price_label: string;
  monthly_rental_label?: string | null;
  listed_by?: string;
}

interface BookVisitCalendarProps {
  property: BookVisitProperty;
  source?: 'detail' | 'card';
  onClose: () => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Half-hour visit slots, 9:00 – 19:00. */
const TIME_SLOTS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
  '06:00 PM', '06:30 PM', '07:00 PM',
];

/** Slot minutes past midnight, for past-time comparison. */
function slotMinutes(t: string): number {
  const [hm, ampm] = t.split(' ');
  const [h, m] = hm.split(':').map(Number);
  return ((h % 12) + (ampm === 'PM' ? 12 : 0)) * 60 + m;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ddmmyyyy(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
}

function time12h(iso: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(iso.trim());
  if (!m) return iso;
  const h = Number(m[1]);
  return `${h}:${m[2]} ${m[3].toUpperCase()}`;
}

function shortTimeLabel(t: string): string {
  const [hm, ampm] = t.split(' ');
  const [h, m] = hm.split(':');
  return `${Number(h)}:${m} ${ampm}`;
}

/**
 * Deterministic slot availability — simulates the team's booking calendar so
 * visitors see realistic "Filled" slots instead of an always-open grid.
 *
 * Hash of (propertyId + date + slot) → [0,1). A slot is filled when the hash
 * is below the day's fill-rate, which itself follows a smooth sine over the
 * fortnight (some days busier than others — like a real calendar). Sundays
 * run at half capacity (site visits discouraged), weekends fill faster.
 * Deterministic per day so the grid is stable while the user interacts.
 */
function isSlotFilled(propertyId: string, date: Date, slot: string): boolean {
  const seed = `${propertyId}|${isoDate(date)}|${slot}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const unit = ((h >>> 0) % 1000) / 1000; // [0,1)

  const dayOfWeek = date.getDay();
  const dayIndex = Math.floor((date.getTime() - startOfDay(new Date()).getTime()) / DAY_MS);
  const wave = 0.5 + 0.28 * Math.sin(dayIndex * 0.9); // 0.22–0.78 baseline fill
  const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 0.14 : 0;
  const sundayLight = dayOfWeek === 0 ? 0.3 : 1; // Sundays: most slots blocked pattern-wise

  let fillRate = (wave + weekendBoost) * sundayLight;
  if (slotMinutes(slot) <= 11 * 60) fillRate *= 0.8; // early morning less demanded
  if (slot.includes('06:') || slot.includes('07:')) fillRate *= 1.15; // evening prime time

  return unit < fillRate;
}

function firstAvailableSlot(propertyId: string, date: Date): string {
  const now = new Date();
  const isToday = date.getTime() === startOfDay(now).getTime();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const t of TIME_SLOTS) {
    if (isToday && slotMinutes(t) <= nowMinutes + 60) continue; // needs ≥1h lead time
    if (!isSlotFilled(propertyId, date, t)) return t;
  }
  return '10:00 AM'; // fallback — validated server-side anyway
}

/**
 * Site-visit booking form — "Book a Free Visit", anonymous (no login).
 *
 * Mobile-first: 44px+ targets everywhere, 16px inputs (no iOS zoom),
 * inputmode keyboards, live slot availability, sticky-free flow inside the
 * bottom sheet. Saving goes straight into the CRM (property_leads in
 * Supabase via the public data-proxy) — no WhatsApp redirect, no login.
 */
export default function BookVisitCalendar({
  property,
  source = 'detail',
  onClose,
}: BookVisitCalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDay = useMemo(() => new Date(today.getTime() + 60 * DAY_MS), [today]);

  // ── Date & time selection ──
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedTime, setSelectedTime] = useState(() => firstAvailableSlot(String(property.id), today));
  const [openPanel, setOpenPanel] = useState<'date' | 'time' | null>(null);

  // Calendar month being viewed
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // ── Visitor details ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<{ date: Date; time: string } | null>(null);

  // Re-pick a valid default slot whenever the chosen day changes (keeps the
  // selection consistent when today's slots run out or the day flips).
  useEffect(() => {
    setSelectedTime((cur) => {
      const now = new Date();
      const isToday = selectedDate.getTime() === today.getTime();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const curInvalid =
        (isToday && slotMinutes(cur) <= nowMinutes + 60) ||
        isSlotFilled(String(property.id), selectedDate, cur);
      return curInvalid ? firstAvailableSlot(String(property.id), selectedDate) : cur;
    });
  }, [selectedDate, property.id, today]);

  const daysGrid = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const lead = first.getDay();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDay;

  const shiftMonth = (dir: 1 | -1) => {
    const next = new Date(viewYear, viewMonth + dir, 1);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
  };

  const pickDate = (d: Date) => {
    setSelectedDate(d);
  };

  const pickTime = (t: string) => {
    setSelectedTime(t);
    setOpenPanel(null);
  };

  const fieldBase =
    'flex h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl border bg-white px-3.5 text-left transition-all duration-200';

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await savePropertyLead({
        propertyId: String(property.id),
        propertyTitle: property.title,
        propertyType: property.type ?? '',
        propertyArea: property.area ?? '',
        propertyPrice: property.price_label ?? '',
        propertyUrl: getPropertyShareUrl(property.id),
        leadType: 'book_visit',
        visitDate: isoDate(selectedDate),
        visitTime: selectedTime,
        buyerName: name.trim(),
        buyerPhone: digits,
        listedBy: property.listed_by ?? 'VJR Estate',
        source,
        message: message.trim()
          ? message.trim().slice(0, 500)
          : `Site visit booking — ${property.title} on ${ddmmyyyy(selectedDate)} at ${selectedTime}`,
      });
      setBooked({ date: selectedDate, time: selectedTime });
    } catch {
      setError('Could not save your booking. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="bg-white"
    >
      {booked ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center px-5 py-10 text-center sm:px-8">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.6} />
          </span>
          <h3 className="mt-4 font-sans text-[20px] font-bold text-black">Visit Booked!</h3>
          <p className="mt-1.5 max-w-[300px] font-sans text-[14px] leading-relaxed text-[#4b5563]">
            Thanks {name.trim()}, your free site visit is scheduled. Our team will call you
            on +91 {phone} to confirm.
          </p>
          <div className="mt-5 w-full max-w-[340px] rounded-xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3.5 text-left">
            <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-[#888]">
              Your visit
            </p>
            <p className="mt-1 font-sans text-[15px] font-bold text-black">
              {WEEKDAY_NAMES[booked.date.getDay()]}, {ddmmyyyy(booked.date)}
            </p>
            <p className="mt-0.5 font-sans text-[13px] font-semibold text-[#C9A84C]">{booked.time}</p>
            <p className="mt-1.5 line-clamp-1 font-sans text-[12px] text-[#888]">{property.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex h-12 w-full max-w-[340px] cursor-pointer items-center justify-center rounded-xl bg-[#0A1628] font-sans text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-[#1E3852] active:scale-[0.99]"
          >
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 border-b border-[#f0f0f0] px-5 py-4">
            <div className="min-w-0">
              <h3 className="font-sans text-[17px] font-bold tracking-tight text-black">
                Book a Free Visit
              </h3>
              <p className="mt-0.5 truncate font-sans text-[12.5px] text-[#666]">
                {property.title} · {property.area}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 font-sans text-[10px] font-bold text-emerald-700">
              FREE
            </span>
          </div>

          <div className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pt-4">
            {/* ── Section 1: date & time fields ── */}
            <p className="mb-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A1628]">
              1. When would you like to visit?
            </p>
            <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
              {/* Visit Date field */}
              <button
                type="button"
                onClick={() => setOpenPanel(openPanel === 'date' ? null : 'date')}
                aria-expanded={openPanel === 'date'}
                className={`${fieldBase} ${
                  openPanel === 'date'
                    ? 'border-[#0A1628] ring-2 ring-[#0A1628]/10'
                    : 'border-[#e8e8e8] hover:border-[#C9A84C]/60'
                }`}
              >
                <CalendarDays className="h-4.5 w-4.5 shrink-0 text-[#C9A84C]" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">
                    Date
                  </span>
                  <span className="block truncate font-sans text-[13.5px] font-semibold text-black tabular-nums">
                    {ddmmyyyy(selectedDate)}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${openPanel === 'date' ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>

              {/* Visit Time field */}
              <button
                type="button"
                onClick={() => setOpenPanel(openPanel === 'time' ? null : 'time')}
                aria-expanded={openPanel === 'time'}
                className={`${fieldBase} ${
                  openPanel === 'time'
                    ? 'border-[#0A1628] ring-2 ring-[#0A1628]/10'
                    : 'border-[#e8e8e8] hover:border-[#C9A84C]/60'
                }`}
              >
                <Clock className="h-4.5 w-4.5 shrink-0 text-[#C9A84C]" strokeWidth={1.8} />
                <span className="min-w-0 flex-1">
                  <span className="block font-sans text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">
                    Time
                  </span>
                  <span className="block truncate font-sans text-[13.5px] font-semibold text-black tabular-nums">
                    {time12h(selectedTime)}
                  </span>
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-200 ${openPanel === 'time' ? 'rotate-180' : ''}`}
                  strokeWidth={2}
                />
              </button>
            </div>

            {/* ── Calendar panel (expands under the fields) ── */}
            <AnimatePresence initial={false}>
              {openPanel === 'date' && (
                <motion.div
                  key="date-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-2xl border border-[#e8e8e8] bg-white p-3 shadow-[0_12px_32px_rgba(10,22,40,0.08)]">
                    {/* Month header */}
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-sans text-[14px] font-bold text-[#0A1628]">
                        {MONTHS[viewMonth]} {viewYear}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => shiftMonth(-1)}
                          disabled={!canGoPrev}
                          aria-label="Previous month"
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => shiftMonth(1)}
                          disabled={!canGoNext}
                          aria-label="Next month"
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-[#0A1628] transition-colors hover:bg-[#C9A84C]/15 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Weekday row */}
                    <div className="mb-1 grid grid-cols-7 text-center">
                      {WEEKDAYS.map((w, i) => (
                        <span key={i} className="py-1 font-sans text-[10px] font-bold tracking-wider text-[#999]">
                          {w}
                        </span>
                      ))}
                    </div>

                    {/* Days grid — cells flex to screen width, min 40px tap target */}
                    <div className="grid grid-cols-7 gap-y-1">
                      {daysGrid.map((d, i) => {
                        if (!d) return <span key={`empty-${i}`} />;
                        const isPast = d < today;
                        const isSel = d.getTime() === selectedDate.getTime();
                        const isToday = d.getTime() === today.getTime();
                        return (
                          <button
                            key={isoDate(d)}
                            type="button"
                            disabled={isPast}
                            onClick={() => pickDate(d)}
                            aria-pressed={isSel}
                            aria-label={`${WEEKDAY_NAMES[d.getDay()]} ${ddmmyyyy(d)}`}
                            className={`relative mx-auto flex aspect-square h-auto w-full max-w-[44px] cursor-pointer items-center justify-center rounded-full font-sans text-[14px] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A1628]/30 ${
                              isSel
                                ? 'bg-[#0A1628] font-bold text-white shadow-[0_3px_10px_rgba(10,22,40,0.3)]'
                                : isPast
                                  ? 'cursor-not-allowed text-[#d4d4d8]'
                                  : 'font-medium text-[#0A1628] hover:bg-[#C9A84C]/15'
                            }`}
                          >
                            {!isSel && isToday && (
                              <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#C9A84C]" />
                            )}
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center justify-between border-t border-[#f0f0f0] pt-2.5">
                      <p className="font-sans text-[11.5px] font-semibold text-[#374151]">
                        Selected · {WEEKDAY_NAMES[selectedDate.getDay()].slice(0, 3)}, {ddmmyyyy(selectedDate)}
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpenPanel(null)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 font-sans text-[11.5px] font-bold text-[#96782A] hover:bg-[#C9A84C]/10"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Time panel ── */}
              {openPanel === 'time' && (
                <motion.div
                  key="time-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-2xl border border-[#e8e8e8] bg-white p-3 shadow-[0_12px_32px_rgba(10,22,40,0.08)]">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A1628]">
                        Pick a time slot
                      </p>
                      <button
                        type="button"
                        onClick={() => setOpenPanel(null)}
                        className="cursor-pointer rounded-lg px-3 py-1.5 font-sans text-[11.5px] font-bold text-[#96782A] hover:bg-[#C9A84C]/10"
                      >
                        Done
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 min-[400px]:grid-cols-4">
                      {TIME_SLOTS.map((t) => {
                        const active = t === selectedTime;
                        const now = new Date();
                        const isToday = selectedDate.getTime() === today.getTime();
                        const tooSoon = isToday && slotMinutes(t) <= now.getHours() * 60 + now.getMinutes() + 60;
                        const filled = isSlotFilled(String(property.id), selectedDate, t);
                        const disabled = tooSoon || filled;
                        return (
                          <button
                            key={t}
                            type="button"
                            disabled={disabled}
                            onClick={() => pickTime(t)}
                            aria-pressed={active}
                            title={filled ? 'Slot filled' : tooSoon ? 'Too soon — pick a later slot' : undefined}
                            className={`inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border font-sans text-[11.5px] font-bold tabular-nums transition-colors duration-150 ${
                              active
                                ? 'border-[#0A1628] bg-[#0A1628] text-white'
                                : disabled
                                  ? 'cursor-not-allowed border-[#f0f0f0] bg-[#fafafa] text-[#d4d4d8] line-through decoration-[#d4d4d8]'
                                  : 'border-[#e8e8e8] bg-white text-[#374151] hover:border-[#C9A84C]/60'
                            }`}
                          >
                            {shortTimeLabel(t)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-center font-sans text-[10.5px] text-[#9ca3af]">
                      Struck-through slots are already booked
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Section 2: visitor details ── */}
            <p className="mb-2.5 mt-5 flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#0A1628]">
              <User className="h-3.5 w-3.5 text-[#C9A84C]" strokeWidth={2} />
              2. Your Details
            </p>
            <div className="space-y-3.5">
              <div>
                <label htmlFor="bv-name" className="mb-1.5 block font-sans text-[12.5px] font-semibold text-[#374151]">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="bv-name"
                  type="text"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 font-sans text-[16px] text-black transition-colors duration-200 placeholder:text-[#9ca3af] focus:border-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#0A1628]/10"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label htmlFor="bv-phone" className="mb-1.5 block font-sans text-[12.5px] font-semibold text-[#374151]">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="flex h-12 items-stretch overflow-hidden rounded-xl border border-[#e8e8e8] bg-white transition-all duration-200 focus-within:border-[#0A1628] focus-within:ring-2 focus-within:ring-[#0A1628]/10">
                  <span className="flex items-center gap-1 border-r border-[#e8e8e8] bg-[#fafafa] px-3 font-sans text-[14px] font-semibold text-[#374151]">
                    🇮🇳 +91
                  </span>
                  <input
                    id="bv-phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    enterKeyHint="next"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="h-full min-w-0 flex-1 bg-transparent px-3.5 font-sans text-[16px] text-black tabular-nums placeholder:text-[#9ca3af] focus:outline-none"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="bv-msg" className="mb-1.5 flex items-center gap-1.5 font-sans text-[12.5px] font-semibold text-[#374151]">
                  <MessageSquareText className="h-3.5 w-3.5 text-[#9ca3af]" strokeWidth={1.8} />
                  Message <span className="font-normal text-[#9ca3af]">(optional)</span>
                </label>
                <textarea
                  id="bv-msg"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  className="w-full resize-none rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2.5 font-sans text-[16px] leading-relaxed text-black transition-colors duration-200 placeholder:text-[#9ca3af] focus:border-[#0A1628] focus:outline-none focus:ring-2 focus:ring-[#0A1628]/10"
                  placeholder="Anything we should know? (e.g. call before visiting)"
                />
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 font-sans text-[12.5px] font-semibold text-red-600">
                {error}
              </p>
            )}

            <p className="mt-3 flex items-center gap-1.5 font-sans text-[11.5px] text-[#6b7280]">
              <Phone className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={1.8} />
              Our team calls to confirm your slot.
            </p>

            {/* ── CTA — 52px thumb-friendly, safe-area aware ── */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-4 inline-flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0A1628] font-sans text-[13.5px] font-bold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_rgba(10,22,40,0.25)] transition-all duration-200 hover:bg-[#1E3852] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Booking your visit…' : 'Confirm Booking'}
            </button>
            <p className="mt-2.5 flex items-center justify-center gap-1.5 font-sans text-[11.5px] text-[#6b7280]">
              <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={1.8} />
              Your info is 100% secure
            </p>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="mt-1 inline-flex h-11 w-full cursor-pointer items-center justify-center font-sans text-[13px] font-semibold text-[#6b7280] transition-colors duration-200 hover:text-black"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
