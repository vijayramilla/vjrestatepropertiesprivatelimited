import { useEffect, useState, useCallback } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Calendar, Download, ChevronLeft, ChevronRight, Clock, Coffee,
  TrendingUp, Loader2,
} from 'lucide-react';
import { CrmBtn, CrmCard } from '@/components/crm/CrmUi';

type Props = {
  employeeId?: string;
  /** When true, the employee is viewing their own timesheet (no admin controls) */
  isEmployee?: boolean;
};

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const fmtLabel = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { start: fmt(monday), end: fmt(sunday), label: `${fmtLabel(monday)} – ${fmtLabel(sunday)}` };
}

function fmtDur(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

/**
 * Jibble-style weekly timesheet.
 * Shows a day-by-day breakdown with clock-in/out, hours worked, breaks, and overtime.
 * Includes CSV export.
 */
export default function WeeklyTimesheet({ employeeId, isEmployee: _isEmployee }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { start, end, label } = getWeekRange(weekOffset);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadSupabase.employees.weeklyReport(start, end, employeeId);
      setData(res.data ?? []);
      setSummary(res.summary ?? null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [start, end, employeeId]);

  useEffect(() => { fetch(); }, [fetch]);

  const exportCSV = () => {
    const rows: string[][] = [
      ['Weekly Timesheet'],
      ['Period', label],
      [],
      ['Day', 'Date', 'Status', 'Check-in', 'Check-out', 'Break (min)', 'Worked', 'Overtime'],
    ];
    data.forEach((r) => {
      rows.push([
        FULL_DAYS[new Date(r.date + 'T00:00:00').getDay()],
        r.date,
        r.status ?? '—',
        r.check_in ? String(r.check_in).slice(0, 5) : '—',
        r.check_out ? String(r.check_out).slice(0, 5) : '—',
        String(r.total_break_minutes ?? 0),
        fmtDur(r.worked_minutes ?? 0),
        r.overtime_minutes > 0 ? fmtDur(r.overtime_minutes) : '—',
      ]);
    });
    if (summary) {
      rows.push([]);
      rows.push(['Total Worked', fmtDur(summary.totalWorkedMinutes)]);
      rows.push(['Total Overtime', fmtDur(summary.totalOvertimeMinutes)]);
      rows.push(['Total Breaks', fmtDur(summary.totalBreakMinutes)]);
      rows.push(['Days Worked', String(summary.daysWorked)]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timesheet-${start}-to-${end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="rounded-lg p-2 text-[#6b7280] hover:bg-[#fafafa]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-[13px] font-bold text-[#0A1628]">{label}</p>
            <p className="text-[10px] text-[#9ca3af]">
              {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ${weekOffset < 0 ? 'ago' : 'ahead'}`}
            </p>
          </div>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="rounded-lg p-2 text-[#6b7280] hover:bg-[#fafafa]">
            <ChevronRight className="h-4 w-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="rounded-lg px-2.5 py-1 text-[10px] font-bold text-[#96782A] hover:bg-[#C9A84C]/10">
              Today
            </button>
          )}
        </div>
        <CrmBtn variant="ghost" onClick={exportCSV} disabled={data.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </CrmBtn>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
              <Clock className="h-3 w-3" /> Total Worked
            </p>
            <p className="mt-1 text-[18px] font-bold text-[#0A1628]">{fmtDur(summary.totalWorkedMinutes)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
              <TrendingUp className="h-3 w-3" /> Overtime
            </p>
            <p className="mt-1 text-[18px] font-bold text-amber-600">{fmtDur(summary.totalOvertimeMinutes)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
              <Coffee className="h-3 w-3" /> Breaks
            </p>
            <p className="mt-1 text-[18px] font-bold text-[#0A1628]">{fmtDur(summary.totalBreakMinutes)}</p>
          </div>
          <div className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
              <Calendar className="h-3 w-3" /> Days Worked
            </p>
            <p className="mt-1 text-[18px] font-bold text-[#0A1628]">{summary.daysWorked} / 7</p>
          </div>
        </div>
      )}

      {/* Timesheet grid */}
      {loading ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#C9A84C]" />
        </div>
      ) : (
        <CrmCard className="overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 border-b border-black/[0.06] bg-[#fafafa] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
            <span>Day</span>
            <span className="w-16 text-center">In</span>
            <span className="w-16 text-center">Out</span>
            <span className="w-14 text-center">Break</span>
            <span className="w-20 text-center">Worked</span>
            <span className="w-16 text-center">OT</span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-black/[0.04]">
            {data.map((r) => {
              const dayIdx = new Date(r.date + 'T00:00:00').getDay();
              const isWeekend = dayIdx === 0 || dayIdx === 6;
              const isToday = r.date === new Date().toISOString().split('T')[0];
              return (
                <div key={r.date} className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 px-4 py-3 ${isToday ? 'bg-[#C9A84C]/[0.06]' : ''} ${!r.check_in && !isWeekend ? 'opacity-50' : ''}`}>
                  <div className="min-w-0">
                    <p className={`text-[12px] font-bold ${isToday ? 'text-[#96782A]' : 'text-[#0A1628]'}`}>
                      {FULL_DAYS[dayIdx]}
                      {isToday && <span className="ml-1.5 text-[9px] font-bold uppercase text-[#96782A]">today</span>}
                    </p>
                    <p className="text-[10px] text-[#9ca3af]">{r.date}</p>
                  </div>
                  <span className="w-16 text-center font-mono text-[12px] font-semibold text-[#0A1628]">
                    {r.check_in ? String(r.check_in).slice(0, 5) : '—'}
                  </span>
                  <span className="w-16 text-center font-mono text-[12px] font-semibold text-[#0A1628]">
                    {r.check_out ? String(r.check_out).slice(0, 5) : '—'}
                  </span>
                  <span className="w-14 text-center font-mono text-[11px] text-[#6b7280]">
                    {r.total_break_minutes > 0 ? `${r.total_break_minutes}m` : '—'}
                  </span>
                  <span className="w-20 text-center font-mono text-[12px] font-bold text-[#0A1628]">
                    {fmtDur(r.worked_minutes ?? 0)}
                  </span>
                  <span className={`w-16 text-center font-mono text-[11px] font-semibold ${r.overtime_minutes > 0 ? 'text-amber-600' : 'text-[#9ca3af]'}`}>
                    {r.overtime_minutes > 0 ? fmtDur(r.overtime_minutes) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </CrmCard>
      )}
    </div>
  );
}
