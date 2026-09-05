import { useEffect, useMemo, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Activity, Briefcase, CalendarX2, Clock, ExternalLink, Loader2, MapPin, Search, Users,
} from 'lucide-react';

const DEPARTMENTS = ['Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'IT', 'Legal'];

/**
 * Today's Roster — the manager's \"pin to pin\" view of the day.
 * One row per active employee: On shift (live, with late arrival & location),
 * Completed, On leave (approved leave / employee status), or Not started.
 * Polls the live attendance feed every 30s.
 */
export default function TodayRoster() {
  const [emps, setEmps] = useState<any[]>([]);
  const [live, setLive] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAll = async () => {
    try {
      const [empRes, liveRes] = await Promise.all([
        leadSupabase.employees.list({ status: 'Active' }).catch(() => ({ data: [] as any[] })),
        leadSupabase.employees.liveStatus().catch(() => ({ onShift: [] as any[], done: [] as any[] })),
      ]);
      const all = (empRes.data ?? []).filter((e: any) => e.status === 'Active' && !String(e.employee_id).startsWith('VJR-CP-'));
      setEmps(all);
      const onLeave = new Set<string>();
      (empRes.data ?? []).forEach((e: any) => {
        if (e.status === 'On Leave') onLeave.add(e.id);
      });
      setLeaves(onLeave);
      setLive([...(liveRes.onShift ?? []), ...(liveRes.done ?? [])]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
  }, []);

  const rows = useMemo(() => {
    const liveByEmp = new Map(live.map((r: any) => [r.employee_id, r]));
    const q = search.trim().toLowerCase();
    return emps
      .filter((e: any) => {
        if (dept && e.department !== dept) return false;
        if (q && !((e.name ?? '').toLowerCase().includes(q) || (e.employee_id ?? '').toLowerCase().includes(q))) return false;
        return true;
      })
      .map((e: any) => {
        const r = liveByEmp.get(e.id);
        const onLeave = leaves.has(e.id) || e.status === 'On Leave';
        return {
          emp: e,
          row: r ?? null,
          state: !r ? (onLeave ? 'leave' : 'not_started') : r.is_on_shift ? 'shift' : 'done',
          lateMinutes: r?.late_minutes ?? 0,
          onLeave,
        };
      })
      .sort((a: any, b: any) => (a.state === 'shift' ? -1 : 1) - (b.state === 'shift' ? -1 : 1) || (a.emp.name ?? '').localeCompare(b.emp.name ?? ''));
  }, [emps, live, leaves, dept, search]);

  const stats = useMemo(() => {
    const out = { shift: 0, done: 0, leave: 0, not_started: 0, late: 0, total: rows.length };
    rows.forEach((r: any) => {
      (out as any)[r.state] += 1;
      if (r.state !== 'not_started' && r.lateMinutes > 0) out.late += 1;
    });
    return out;
  }, [rows]);

  const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const workedSoFar = (r: any) => {
    if (!r?.check_in) return '—';
    const [ciH, ciM] = String(r.check_in).split(':').map(Number);
    const now = new Date();
    const coH = r.check_out ? Number(String(r.check_out).split(':')[0]) : now.getHours();
    const coM = r.check_out ? Number(String(r.check_out).split(':')[1]) : now.getMinutes();
    const mins = Math.max(0, coH * 60 + coM - (ciH * 60 + ciM) - (r.total_break_minutes ?? 0));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const stateMeta: Record<string, { label: string; pill: string; dot: string }> = {
    shift: { label: 'On shift', pill: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    done: { label: 'Completed', pill: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
    leave: { label: 'On leave', pill: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    not_started: { label: 'Not started', pill: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-black/[0.05] bg-white p-10 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'On shift now', value: stats.shift, icon: Activity, cls: 'text-emerald-600 bg-emerald-50' },
          { label: 'Completed today', value: stats.done, icon: Clock, cls: 'text-gray-600 bg-gray-100' },
          { label: 'Late arrivals', value: stats.late, icon: MapPin, cls: 'text-red-500 bg-red-50' },
          { label: 'On leave', value: stats.leave, icon: CalendarX2, cls: 'text-amber-600 bg-amber-50' },
          { label: 'Not started', value: stats.not_started, icon: Users, cls: 'text-blue-600 bg-blue-50' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${s.cls}`}>
              <s.icon className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <p className="font-['Inter',sans-serif] text-[20px] font-bold leading-none text-[#0A1628]">{s.value}</p>
            <p className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or employee ID…"
            className="h-10 w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 text-[12.5px] text-[#0A1628] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => setDept('')}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${dept === '' ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'}`}
          >
            All teams
          </button>
          {DEPARTMENTS.map((d) => (
            <button
              key={d}
              onClick={() => setDept(dept === d ? '' : d)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] font-bold transition-all ${dept === d ? 'border-[#C9A84C]/50 bg-[#C9A84C]/[0.12] text-[#8a6d1f]' : 'border-black/10 bg-white text-[#6b7280]'}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Roster rows */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white p-10 text-center">
          <Briefcase className="mx-auto mb-2 h-6 w-6 text-[#9ca3af]" strokeWidth={1.4} />
          <p className="text-[13px] font-semibold text-[#6b7280]">No team members match — add employees or clear the filters.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ emp, row, state, lateMinutes }: any) => {
            const meta = stateMeta[state];
            const open = expandedId === emp.id;
            return (
              <div key={emp.id} className={`overflow-hidden rounded-2xl border bg-white transition-all duration-200 ${state === 'shift' ? 'border-emerald-200/70' : 'border-black/[0.06]'} ${open ? 'shadow-[0_4px_16px_rgba(201,168,76,0.12)]' : 'shadow-[0_1px_2px_rgba(10,22,40,0.04)]'}`}>
                <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
                  <div className="relative shrink-0">
                    {emp.profile_photo_url ? (
                      <img src={emp.profile_photo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1628] text-[11px] font-extrabold text-[#D6B85D]">{initials(emp.name || 'E')}</div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${state === 'shift' ? 'bg-emerald-500' : state === 'done' ? 'bg-gray-300' : state === 'leave' ? 'bg-amber-400' : 'bg-blue-300'}`} />
                  </div>
                  <button onClick={() => setExpandedId(open ? null : emp.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-[#0A1628]">{emp.name || 'Unnamed'}</p>
                      <p className="truncate text-[10.5px] text-[#6b7280]">
                        {emp.employee_id} · {emp.designation || '—'} · {emp.department || '—'}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.pill}`}>
                      <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </button>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-[12.5px] font-bold text-[#0A1628]">{row ? workedSoFar(row) : '—'}</p>
                    <p className="text-[9px] text-[#9ca3af]">
                      {row ? (row.is_on_shift ? `since ${String(row.check_in).slice(0, 5)}` : 'done') : '—'}
                    </p>
                  </div>
                  {lateMinutes > 0 && (
                    <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9.5px] font-bold text-red-600" title="Arrived after shift start">
                      {lateMinutes}m late
                    </span>
                  )}
                </div>
                {open && row && (
                  <div className="border-t border-black/[0.04] bg-[#fafafa] px-4 py-3">
                    <div className="grid grid-cols-1 gap-2 text-[11.5px] sm:grid-cols-2">
                      <p className="flex items-center gap-1.5 text-[#0A1628]">
                        <Clock className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} />
                        {String(row.check_in).slice(0, 5)}{row.check_out ? ` → ${String(row.check_out).slice(0, 5)}` : ' — still on shift'}
                      </p>
                      <p className="flex items-center gap-1.5 text-[#0A1628]">
                        <MapPin className="h-3 w-3 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                        <span className="truncate">{row.check_in_location || 'No location'}</span>
                        {row.check_in_lat != null && row.check_in_lng != null && (
                          <a href={`https://www.google.com/maps?q=${row.check_in_lat},${row.check_in_lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#96782A] hover:underline">
                            map <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
