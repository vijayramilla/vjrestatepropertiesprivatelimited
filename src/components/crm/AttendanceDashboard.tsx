import { useEffect, useState, useCallback } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Users, MapPin, Clock, LogIn, LogOut, Coffee, Loader2, RefreshCw,
  Search, ChevronDown, ChevronUp, ExternalLink, Shield, Wifi,
} from 'lucide-react';
import { CrmCard } from '@/components/crm/CrmUi';

type Props = {
  /** Set to true to show in a compact sidebar widget instead of full page */
  compact?: boolean;
};

/**
 * Jibble-style live attendance dashboard.
 * Shows who is currently clocked in across the organisation, with GPS locations,
 * break status, and hours worked today.
 */
export default function AttendanceDashboard({ compact }: Props) {
  const [onShift, setOnShift] = useState<any[]>([]);
  const [done, setDone] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      const res = await leadSupabase.employees.liveStatus();
      setOnShift(res.onShift ?? []);
      setDone(res.done ?? []);
      setTotal(res.total ?? 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => {
    const t = setInterval(fetch, 30000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, [fetch]);

  const handleRefresh = () => { setRefreshing(true); fetch(); };

  const filter = (list: any[]) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((r) => {
      const emp = r.employee ?? {};
      return (emp.name ?? '').toLowerCase().includes(q) ||
        (emp.employee_id ?? '').toLowerCase().includes(q) ||
        (emp.department ?? '').toLowerCase().includes(q) ||
        (r.check_in_location ?? '').toLowerCase().includes(q);
    });
  };

  const filteredOnShift = filter(onShift);
  const filteredDone = filter(done);

  // Compute hours worked
  const hoursWorked = (r: any) => {
    if (!r.check_in) return '—';
    const [ciH, ciM] = String(r.check_in).split(':').map(Number);
    const now = new Date();
    const coH = r.check_out ? Number(String(r.check_out).split(':')[0]) : now.getHours();
    const coM = r.check_out ? Number(String(r.check_out).split(':')[1]) : now.getMinutes();
    const mins = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - (r.total_break_minutes ?? 0));
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  if (loading) {
    return (
      <div className={`rounded-2xl border border-black/[0.05] bg-white ${compact ? 'p-4' : 'p-8'}`}>
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#0A1628]">Live Attendance</h3>
          <p className="text-[11px] text-[#6b7280]">{onShift.length} on shift · {done.length} completed · {total} total today</p>
        </div>
        <button onClick={handleRefresh} className="rounded-lg p-2 text-[#6b7280] hover:bg-[#fafafa] hover:text-[#0A1628]" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">On Shift</span>
          </div>
          <p className="mt-1 text-[22px] font-bold text-emerald-700">{onShift.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600">Done</span>
          </div>
          <p className="mt-1 text-[22px] font-bold text-gray-600">{done.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">Total</span>
          </div>
          <p className="mt-1 text-[22px] font-bold text-blue-700">{total}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, ID, department…"
          className="w-full rounded-xl border border-black/[0.08] bg-white py-2.5 pl-9 pr-4 text-[12px] font-medium text-[#0A1628] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#C9A84C]/50 focus:ring-2 focus:ring-[#C9A84C]/10"
        />
      </div>

      {/* Currently on shift */}
      {filteredOnShift.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">On Shift Now</p>
          <div className="space-y-2">
            {filteredOnShift.map((r: any) => {
              const emp = r.employee ?? {};
              const id = r.id;
              const expanded = expandedId === id;
              return (
                <div key={id} className="overflow-hidden rounded-2xl border border-emerald-200/60 bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                  <button onClick={() => setExpandedId(expanded ? null : id)} className="flex w-full items-center gap-3 p-3.5 text-left">
                    {/* Avatar */}
                    <div className="relative h-10 w-10 shrink-0">
                      {emp.profile_photo_url ? (
                        <img src={emp.profile_photo_url} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#0A1628] text-[11px] font-bold text-[#D6B85D]">
                          {(emp.name ?? 'E').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#0A1628] truncate">{emp.name || 'Unknown'}</p>
                      <p className="text-[10px] text-[#6b7280]">{emp.employee_id} · {emp.department || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[12px] font-bold text-emerald-700">{hoursWorked(r)}</p>
                      <p className="text-[9px] text-[#9ca3af]">since {String(r.check_in).slice(0, 5)}</p>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-[#9ca3af]" /> : <ChevronDown className="h-4 w-4 text-[#9ca3af]" />}
                  </button>
                  {expanded && (
                    <div className="border-t border-black/[0.04] bg-[#fafafa] px-4 py-3">
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-bold text-[#9ca3af]">Check-in: </span>
                          <span className="font-semibold text-[#0A1628]">{String(r.check_in).slice(0, 5)}</span>
                        </div>
                        <div>
                          <span className="font-bold text-[#9ca3af]">Location: </span>
                          <span className="font-semibold text-[#0A1628] truncate inline-block max-w-[180px]">{r.check_in_location || '—'}</span>
                        </div>
                        {r.check_in_lat != null && r.check_in_lng != null && (
                          <div className="col-span-2">
                            <a
                              href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#96782A] hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> View on map
                            </a>
                          </div>
                        )}
                        {r.check_in_selfie_url && (
                          <div className="col-span-2">
                            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Clock-in selfie</p>
                            <img src={r.check_in_selfie_url} alt="Clock-in selfie" className="h-16 w-16 rounded-lg object-cover ring-1 ring-emerald-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed shifts */}
      {filteredDone.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Completed Today</p>
          <div className="space-y-1.5">
            {filteredDone.map((r: any) => {
              const emp = r.employee ?? {};
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-black/[0.04] bg-white px-3.5 py-2.5">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-gray-100">
                    {emp.profile_photo_url ? (
                      <img src={emp.profile_photo_url} alt="" className="h-full w-full rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-lg bg-[#0A1628] text-[9px] font-bold text-[#D6B85D]">
                        {(emp.name ?? 'E').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold text-[#0A1628] truncate">{emp.name}</p>
                    <p className="text-[9.5px] text-[#9ca3af]">{String(r.check_in).slice(0, 5)} → {r.check_out ? String(r.check_out).slice(0, 5) : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[11px] font-semibold text-[#0A1628]">{hoursWorked(r)}</p>
                    {r.overtime_minutes > 0 && <p className="text-[9px] font-bold text-amber-600">+{r.overtime_minutes}m OT</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filteredOnShift.length === 0 && filteredDone.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-[#9ca3af]" />
          <p className="mt-2 text-[13px] font-semibold text-[#6b7280]">
            {search ? 'No employees match your search' : 'No attendance records today'}
          </p>
        </div>
      )}
    </div>
  );
}

function CheckCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
