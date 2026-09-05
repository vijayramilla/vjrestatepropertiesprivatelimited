import { useEffect, useMemo, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import {
  Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coffee, Download,
  Loader2, TrendingUp, Users,
} from 'lucide-react';
import { CrmBtn, CrmCard } from '@/components/crm/CrmUi';

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const fmtLabel = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { start: fmt(monday), end: fmt(sunday), label: `${fmtLabel(monday)} – ${fmtLabel(sunday)}` };
}

function fmtDur(minutes: number): string {
  const m = Math.max(0, minutes || 0);
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h > 0) return `${h}h ${String(rem).padStart(2, '0')}m`;
  return `${rem}m`;
}

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/**
 * Weekly timesheet. Admin sees the whole team roll-up (Everyone) and can drill
 * into any employee's day-by-day grid; the same component serves a single
 * employee's own week via the employeeId prop.
 */
export default function WeeklyTimesheet({ employeeId: fixedEmployeeId }: { employeeId?: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [employeeId, setEmployeeId] = useState(fixedEmployeeId ?? '');
  const [employees, setEmployees] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [perEmployee, setPerEmployee] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [openEmp, setOpenEmp] = useState<string | null>(null);

  const { start, end, label } = getWeekRange(weekOffset);

  useEffect(() => {
    if (fixedEmployeeId) return;
    leadSupabase.employees.list({ status: 'Active' })
      .then((r) => setEmployees((r.data ?? []).filter((e: any) => e.status === 'Active')))
      .catch(() => {});
  }, [fixedEmployeeId]);

  const effectiveId = fixedEmployeeId ?? employeeId;

  useEffect(() => {
    setLoading(true);
    leadSupabase.employees.weeklyReport(start, end, effectiveId || undefined)
      .then((res) => {
        setRows(res.data ?? []);
        setSummary(res.summary ?? null);
        setPerEmployee(res.perEmployee ?? {});
      })
      .catch(() => { setRows([]); setSummary(null); setPerEmployee({}); })
      .finally(() => setLoading(false));
  }, [start, end, effectiveId]);

  const dayRowsFor = (empId: string) => rows.filter((r: any) => r.employee_id === empId);

  const grouped = useMemo(() => {
    if (effectiveId) return [];
    const empIds = Object.keys(perEmployee);
    return empIds.map((id) => {
      const meta = perEmployee[id] ?? {};
      const emp = meta.employee ?? {};
      const days = dayRowsFor(id);
      return { id, emp, meta, days };
    }).sort((a, b) => (a.emp.name ?? '').localeCompare(b.emp.name ?? ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perEmployee, rows, effectiveId]);

  const exportCSV = () => {
    const head = effectiveId
      ? { name: 'Weekly Timesheet', period: label }
      : { name: 'Team Weekly Timesheet', period: label };
    const csvRows: string[][] = [
      [head.name],
      ['Period', head.period],
      [],
    ];
    const list = effectiveId ? [{ days: rows }] : grouped.map((g) => ({ days: g.days, emp: g.emp }));
    for (const item of list) {
      if (!effectiveId) {
        const emp: any = (item as any).emp ?? {};
        csvRows.push([emp.name || 'Employee', emp.employee_id || '']);
      }
      csvRows.push(['Day', 'Date', 'Status', 'Check-in', 'Check-out', 'Break (min)', 'Worked', 'Overtime']);
      item.days.forEach((r: any) => {
        csvRows.push([
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
      csvRows.push([]);
    }
    if (summary) {
      csvRows.push(['Total Worked', fmtDur(summary.totalWorkedMinutes)]);
      csvRows.push(['Total Overtime', fmtDur(summary.totalOvertimeMinutes)]);
      csvRows.push(['Total Breaks', fmtDur(summary.totalBreakMinutes)]);
      csvRows.push(['Days Worked', String(summary.daysWorked)]);
    }
    const csv = csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timesheet-${effectiveId || 'team'}-${start}-to-${end}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const DayRow = ({ r }: { r: any }) => {
    const dayIdx = new Date(r.date + 'T00:00:00').getDay();
    const isToday = r.date === new Date().toISOString().split('T')[0];
    const isWeekend = dayIdx === 0 || dayIdx === 6;
    return (
      <div className={`grid grid-cols-[1fr_auto_auto_auto_auto_auto] items-center gap-2 px-4 py-3 sm:px-5 ${isToday ? 'bg-[#C9A84C]/[0.06]' : ''} ${!r.check_in && !isWeekend ? 'opacity-50' : ''}`}>
        <div className="min-w-0">
          <p className={`text-[12px] font-bold ${isToday ? 'text-[#96782A]' : 'text-[#0A1628]'}`}>
            {FULL_DAYS[dayIdx]}
            {isToday && <span className="ml-1.5 text-[9px] font-bold uppercase text-[#96782A]">today</span>}
          </p>
          <p className="text-[10px] text-[#9ca3af]">{r.date}</p>
        </div>
        <span className="w-14 text-center font-mono text-[12px] font-semibold text-[#0A1628] sm:w-16">{r.check_in ? String(r.check_in).slice(0, 5) : '—'}</span>
        <span className="w-14 text-center font-mono text-[12px] font-semibold text-[#0A1628] sm:w-16">{r.check_out ? String(r.check_out).slice(0, 5) : '—'}</span>
        <span className="w-12 text-center font-mono text-[11px] text-[#6b7280] sm:w-14">{r.total_break_minutes > 0 ? `${r.total_break_minutes}m` : '—'}</span>
        <span className="w-16 text-center font-mono text-[12px] font-bold text-[#0A1628] sm:w-20">{fmtDur(r.worked_minutes ?? 0)}</span>
        <span className={`w-14 text-center font-mono text-[11px] font-semibold sm:w-16 ${r.overtime_minutes > 0 ? 'text-amber-600' : 'text-[#9ca3af]'}`}>{r.overtime_minutes > 0 ? fmtDur(r.overtime_minutes) : '—'}</span>
      </div>
    );
  };

  const SummaryCards = ({ data }: { data: any }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Worked', value: fmtDur(data.totalWorkedMinutes), icon: Clock, cls: 'text-[#0A1628]' },
        { label: 'Overtime', value: fmtDur(data.totalOvertimeMinutes), icon: TrendingUp, cls: 'text-amber-600' },
        { label: 'Breaks', value: fmtDur(data.totalBreakMinutes), icon: Coffee, cls: 'text-[#0A1628]' },
        { label: 'Days present', value: `${data.daysWorked}`, icon: Calendar, cls: 'text-[#0A1628]' },
      ].map((c) => (
        <div key={c.label} className="rounded-2xl border border-black/[0.06] bg-white p-3.5">
          <p className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]`}>
            <c.icon className="h-3 w-3" /> {c.label}
          </p>
          <p className={`mt-1 text-[18px] font-bold ${c.cls}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );

  const gridHeader = (
    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2 border-b border-black/[0.06] bg-[#fafafa] px-4 py-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:px-5">
      <span>Day</span>
      <span className="w-14 text-center sm:w-16">In</span>
      <span className="w-14 text-center sm:w-16">Out</span>
      <span className="w-12 text-center sm:w-14">Break</span>
      <span className="w-16 text-center sm:w-20">Worked</span>
      <span className="w-14 text-center sm:w-16">OT</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-2">
          {!fixedEmployeeId && employees.length > 0 && (
            <select
              value={employeeId}
              onChange={(e) => { setEmployeeId(e.target.value); setOpenEmp(null); }}
              className="h-9 max-w-[220px] rounded-xl border border-black/10 bg-white px-3 text-[11.5px] font-bold text-[#0A1628] outline-none focus:border-[#C9A84C]/60"
            >
              <option value="">Everyone</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name} · {e.employee_id}</option>
              ))}
            </select>
          )}
          <CrmBtn variant="ghost" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-3.5 w-3.5" /> CSV
          </CrmBtn>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white p-10 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#C9A84C]" />
        </div>
      ) : effectiveId ? (
        <>
          {summary && <SummaryCards data={summary} />}
          <CrmCard className="overflow-hidden">
            {gridHeader}
            <div className="divide-y divide-black/[0.04]">
              {rows.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#9ca3af]">No clock-ins recorded this week.</p>
              ) : (
                rows.map((r: any) => <DayRow key={r.id || r.date} r={r} />)
              )}
            </div>
          </CrmCard>
        </>
      ) : (
        <>
          <CrmCard className="overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3">
              <Users className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Team Timesheets</p>
              <span className="rounded-full bg-[#C9A84C]/[0.16] px-2 py-0.5 text-[9.5px] font-bold text-[#D6B85D]">
                {Object.keys(perEmployee).length} on record
              </span>
            </div>
            <div className="p-3 sm:p-4">
              {Object.keys(perEmployee).length === 0 ? (
                <p className="py-8 text-center text-xs text-[#9ca3af]">No attendance records for this week yet — results appear as employees clock in.</p>
              ) : (
                <div className="space-y-2">
                  {grouped.map((g: any) => {
                    const open = openEmp === g.id;
                    return (
                      <div key={g.id} className="overflow-hidden rounded-xl border border-black/[0.05]">
                        <div className="flex flex-wrap items-center gap-3 bg-white px-3.5 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A1628] text-[10px] font-extrabold text-[#D6B85D]">
                            {initials(g.emp.name || 'E')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12.5px] font-bold text-[#0A1628]">{g.emp.name || 'Employee'}</p>
                            <p className="truncate text-[10px] text-[#6b7280]">{g.emp.employee_id} · {g.emp.designation || g.emp.department || '—'}</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-3 font-mono text-[10.5px] font-semibold text-[#0A1628]">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-[#96782A]" />{fmtDur(g.meta.totalWorkedMinutes)}</span>
                            {g.meta.totalOvertimeMinutes > 0 && <span className="text-amber-600">+{fmtDur(g.meta.totalOvertimeMinutes)}</span>}
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">{g.meta.daysWorked} days</span>
                          </div>
                          <button onClick={() => setOpenEmp(open ? null : g.id)} className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f8f9fa]">
                            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                        {open && (
                          <div className="border-t border-black/[0.04] bg-[#fafafa]">
                            {gridHeader}
                            <div className="divide-y divide-black/[0.04]">
                              {g.days.length === 0 ? (
                                <p className="py-6 text-center text-[11px] text-[#9ca3af]">No clock-ins this week.</p>
                              ) : (
                                g.days.map((r: any) => <DayRow key={r.id || r.date} r={r} />)
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CrmCard>
        </>
      )}
    </div>
  );
}
