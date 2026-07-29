import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminBadge } from '@/components/admin/AdminUi';
import { leadSupabase } from '@/services/leadSupabase';
import { PencilSimple, User, Clock, CalendarCheck, CalendarBlank, CurrencyInr } from 'phosphor-react';

type Tab = 'profile' | 'history' | 'attendance' | 'leaves' | 'payroll';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const statusBadge = (s: string) => {
  if (s === 'Active' || s === 'Present' || s === 'Approved' || s === 'Paid') return 'success' as const;
  if (s === 'On Leave' || s === 'Pending' || s === 'Half Day') return 'default' as const;
  if (s === 'Terminated' || s === 'Absent' || s === 'Rejected') return 'muted' as const;
  return 'default' as const;
};

export default function AdminEmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('profile');
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear] = useState(new Date().getFullYear());
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [histForm, setHistForm] = useState({ eventType: 'note', title: '', description: '', eventDate: new Date().toISOString().split('T')[0] });

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await leadSupabase.employees.get(id);
      setData(res.data);
      setHistory(res.history ?? []);
      setLeaves(res.leaves ?? []);
      setPayroll(res.payroll ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  const fetchAttendance = useCallback(async () => {
    if (!id) return;
    try {
      const res = await leadSupabase.employees.attendance(id, attMonth, attYear);
      setAttendance(res.data ?? []);
    } catch {}
  }, [id, attMonth, attYear]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => { if (tab === 'attendance') fetchAttendance(); }, [tab, fetchAttendance]);

  const daysInMonth = new Date(attYear, attMonth, 0).getDate();
  const attMap: Record<string, any> = {};
  attendance.forEach((a: any) => { attMap[a.date] = a; });

  const leaveBalance = (type: string) => {
    const year = new Date().getFullYear();
    const taken = leaves.filter((l: any) => l.leave_type === type && new Date(l.created_at).getFullYear() === year && l.status === 'Approved');
    const days = taken.reduce((sum: number, l: any) => sum + (new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / 86400000 + 1, 0);
    const limits: Record<string, number> = { Sick: 12, Casual: 12, Annual: 18, Personal: 5 };
    return { taken: Math.round(days), limit: limits[type] ?? 12 };
  };

  const handleApplyLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    try {
      await leadSupabase.employees.applyLeave(id!, leaveForm.leaveType, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setShowLeaveForm(false);
      setLeaveForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      fetch();
    } catch (e) { console.error(e); }
  };

  const handleAddHistory = async () => {
    try {
      await leadSupabase.employees.addHistory(id!, histForm.eventType, histForm.title, histForm.description, histForm.eventDate);
      setShowHistoryForm(false);
      setHistForm({ eventType: 'note', title: '', description: '', eventDate: new Date().toISOString().split('T')[0] });
      fetch();
    } catch (e) { console.error(e); }
  };

  const handleGenPayroll = async (month: number, year: number) => {
    try {
      await leadSupabase.employees.generatePayroll(id!, month, year);
      fetch();
    } catch (e) { console.error(e); }
  };

  const handleMarkPaid = async (payId: string) => {
    try {
      await leadSupabase.employees.markPaid(payId);
      fetch();
    } catch (e) { console.error(e); }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'history', label: 'History', icon: Clock },
    { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { key: 'leaves', label: 'Leaves', icon: CalendarBlank },
    { key: 'payroll', label: 'Payroll', icon: CurrencyInr },
  ];

  if (loading) {
    return (
      <AdminLayout title="Employee">
        <div className="p-8"><div className="h-48 animate-pulse rounded-lg border border-gray-200 bg-white" /></div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout title="Employee">
        <div className="p-8 text-center text-gray-500">Employee not found.</div>
      </AdminLayout>
    );
  }

  const e = data;
  const inputClass = "min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black";

  return (
    <AdminLayout title={e.name || 'Employee'}>
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-xl font-bold text-white">
              {(e.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-serif text-2xl text-black sm:text-3xl">{e.name || 'Unnamed'}</h1>
              <p className="font-mono text-sm text-gray-500">{e.employee_id} · {e.designation || '-'} · {e.department || '-'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/admin/employees/${id}/edit`)}
            className="flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <PencilSimple size={16} />
            Edit
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-gray-200">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex min-h-[44px] items-center gap-2 px-4 text-sm font-medium transition-colors ${
                  tab === t.key ? 'border-b-2 border-black text-black' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ===== PROFILE TAB ===== */}
        {tab === 'profile' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:gap-4">
              {[
                { label: 'Email', value: e.email || '-' },
                { label: 'Phone', value: e.phone || '-' },
                { label: 'Joining Date', value: e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN') : '-' },
                { label: 'Status', value: e.status || 'Active', badge: true },
              ].map((s) => (
                <div key={s.label} className="border border-gray-200 bg-white p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{s.label}</p>
                  {s.badge ? (
                    <div className="mt-2"><AdminBadge variant={statusBadge(e.status)}>{e.status}</AdminBadge></div>
                  ) : (
                    <p className="mt-2 font-sans text-sm text-black">{s.value}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
              <h3 className="mb-3 font-serif text-lg font-medium text-black">Salary & Bank Details</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Monthly Salary</p><p className="mt-1 font-sans text-sm text-black">₹{(e.salary ?? 0).toLocaleString()}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Bank</p><p className="mt-1 font-sans text-sm text-black">{e.bank_name || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Account</p><p className="mt-1 font-mono text-sm text-black">{e.bank_account_number || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">IFSC</p><p className="mt-1 font-mono text-sm text-black">{e.ifsc_code || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">PAN</p><p className="mt-1 font-mono text-sm text-black">{e.pan_number || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">Aadhar</p><p className="mt-1 font-mono text-sm text-black">{e.aadhar_number || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">UAN (PF)</p><p className="mt-1 font-mono text-sm text-black">{e.uan_number || '-'}</p></div>
                <div><p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">ESI</p><p className="mt-1 font-mono text-sm text-black">{e.esi_number || '-'}</p></div>
              </div>
            </div>

            {e.address && (
              <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="mb-2 font-serif text-lg font-medium text-black">Address</h3>
                <p className="font-sans text-sm text-gray-700">{e.address}</p>
              </div>
            )}

            {(e.emergency_contact_name || e.emergency_contact_phone) && (
              <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="mb-2 font-serif text-lg font-medium text-black">Emergency Contact</h3>
                <p className="font-sans text-sm text-black">{e.emergency_contact_name || '-'} · {e.emergency_contact_phone || '-'}</p>
              </div>
            )}

            {e.notes && (
              <div className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
                <h3 className="mb-2 font-serif text-lg font-medium text-black">Notes</h3>
                <p className="font-sans text-sm text-gray-700">{e.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORY TAB ===== */}
        {tab === 'history' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => setShowHistoryForm(true)} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-gray-800">
                + Add Event
              </button>
            </div>
            {history.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No history recorded yet.</div>
            ) : (
              <div className="space-y-3">
                {history.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                      {h.event_type === 'joined' ? 'J' : h.event_type === 'promotion' ? 'P' : h.event_type === 'salary_change' ? '₹' : h.event_type === 'leave' ? 'L' : h.event_type === 'payroll' ? 'P' : h.event_type === 'termination' ? 'T' : '•'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-sans text-sm font-medium text-black">{h.title}</p>
                        <span className="shrink-0 text-[10px] text-gray-400">{h.event_date ? new Date(h.event_date).toLocaleDateString('en-IN') : ''}</span>
                      </div>
                      {h.description && <p className="mt-1 text-xs text-gray-600">{h.description}</p>}
                      {h.created_by && <p className="mt-1 text-[10px] text-gray-400">by {h.created_by}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showHistoryForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHistoryForm(false)}>
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="mb-4 font-serif text-lg font-medium text-black">Add History Event</h3>
                  <div className="space-y-3">
                    <select value={histForm.eventType} onChange={(e) => setHistForm((f) => ({ ...f, eventType: e.target.value }))} className={inputClass}>
                      <option value="note">Note</option>
                      <option value="promotion">Promotion</option>
                      <option value="salary_change">Salary Change</option>
                      <option value="warning">Warning</option>
                      <option value="achievement">Achievement</option>
                    </select>
                    <input placeholder="Title" value={histForm.title} onChange={(e) => setHistForm((f) => ({ ...f, title: e.target.value }))} className={inputClass} />
                    <input placeholder="Description" value={histForm.description} onChange={(e) => setHistForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
                    <input type="date" value={histForm.eventDate} onChange={(e) => setHistForm((f) => ({ ...f, eventDate: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={handleAddHistory} className="min-h-[44px] rounded-lg bg-black px-6 text-sm font-medium text-white hover:bg-gray-800">Save</button>
                    <button type="button" onClick={() => setShowHistoryForm(false)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ATTENDANCE TAB ===== */}
        {tab === 'attendance' && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <select value={attMonth} onChange={(e) => setAttMonth(Number(e.target.value))} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <span className="text-sm text-gray-500">{attYear}</span>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="grid grid-cols-7 gap-1">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                  <div key={d} className="p-2 text-center text-[10px] font-semibold uppercase text-gray-500">{d}</div>
                ))}
                {Array.from({ length: new Date(attYear, attMonth - 1, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${attYear}-${String(attMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const att = attMap[dateStr];
                  const color = !att ? 'bg-gray-50 text-gray-400' : att.status === 'Present' ? 'bg-green-50 text-green-800' : att.status === 'Absent' ? 'bg-red-50 text-red-800' : att.status === 'Half Day' ? 'bg-amber-50 text-amber-800' : att.status === 'Leave' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50';
                  return (
                    <div key={day} className={`rounded p-2 text-center text-xs ${color}`}>
                      {day}
                      {att?.check_in && <div className="text-[8px] opacity-70">{att.check_in.slice(0, 5)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {attendance.length > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 font-serif text-base font-medium text-black">Daily Log</h3>
                <div className="space-y-2">
                  {attendance.slice(0, 10).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                      <span className="text-sm text-gray-700">{new Date(a.date).toLocaleDateString('en-IN')}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">{a.check_in?.slice(0, 5) || '-'} → {a.check_out?.slice(0, 5) || '-'}</span>
                        <AdminBadge variant={statusBadge(a.status)}>{a.status}</AdminBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== LEAVES TAB ===== */}
        {tab === 'leaves' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => setShowLeaveForm(true)} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-gray-800">
                + Apply Leave
              </button>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:gap-4">
              {['Sick', 'Casual', 'Annual', 'Personal'].map((type) => {
                const bal = leaveBalance(type);
                return (
                  <div key={type} className="border border-gray-200 bg-white p-4">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{type}</p>
                    <p className="mt-1 font-serif text-xl font-bold text-black">{bal.limit - bal.taken} <span className="text-sm font-normal text-gray-500">/ {bal.limit}</span></p>
                    <p className="text-[10px] text-gray-400">{bal.taken} used</p>
                  </div>
                );
              })}
            </div>
            {leaves.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No leave requests.</div>
            ) : (
              <div className="space-y-2">
                {leaves.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                    <div>
                      <p className="font-sans text-sm font-medium text-black">{l.leave_type} Leave</p>
                      <p className="text-xs text-gray-500">{new Date(l.start_date).toLocaleDateString('en-IN')} → {new Date(l.end_date).toLocaleDateString('en-IN')}</p>
                      {l.reason && <p className="mt-1 text-xs text-gray-600">{l.reason}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminBadge variant={statusBadge(l.status)}>{l.status}</AdminBadge>
                      {l.status === 'Pending' && (
                        <>
                          <button type="button" onClick={() => leadSupabase.employees.approveLeave(l.id).then(fetch)} className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200">
                            Approve
                          </button>
                          <button type="button" onClick={() => leadSupabase.employees.rejectLeave(l.id).then(fetch)} className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200">
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showLeaveForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLeaveForm(false)}>
                <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                  <h3 className="mb-4 font-serif text-lg font-medium text-black">Apply Leave</h3>
                  <div className="space-y-3">
                    <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm((f) => ({ ...f, leaveType: e.target.value }))} className={inputClass}>
                      <option value="Sick">Sick Leave</option>
                      <option value="Casual">Casual Leave</option>
                      <option value="Annual">Annual Leave</option>
                      <option value="Personal">Personal Leave</option>
                    </select>
                    <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm((f) => ({ ...f, startDate: e.target.value }))} className={inputClass} />
                    <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm((f) => ({ ...f, endDate: e.target.value }))} className={inputClass} />
                    <input placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm((f) => ({ ...f, reason: e.target.value }))} className={inputClass} />
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button type="button" onClick={handleApplyLeave} className="min-h-[44px] rounded-lg bg-black px-6 text-sm font-medium text-white hover:bg-gray-800">Apply</button>
                    <button type="button" onClick={() => setShowLeaveForm(false)} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700">Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== PAYROLL TAB ===== */}
        {tab === 'payroll' && (
          <div>
            <div className="mb-4 flex justify-end gap-2">
              {(() => {
                const now = new Date();
                const m = now.getMonth() + 1;
                const y = now.getFullYear();
                const exists = payroll.some((p: any) => p.month === m && p.year === y);
                return !exists ? (
                  <button type="button" onClick={() => handleGenPayroll(m, y)} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-gray-800">
                    Generate This Month
                  </button>
                ) : null;
              })()}
            </div>
            {payroll.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">No payroll records yet.</div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        {['Period', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Payment Date', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {payroll.map((p: any) => (
                        <tr key={p.id} className="border-b border-gray-100">
                          <td className="px-4 py-4 text-sm text-gray-700">{MONTHS[p.month - 1]} {p.year}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">₹{(p.basic_pay ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">₹{(p.hra ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">₹{(p.allowances ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm text-red-600">₹{(p.deductions ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-4 text-sm font-semibold text-black">₹{(p.net_pay ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-4"><AdminBadge variant={statusBadge(p.status)}>{p.status}</AdminBadge></td>
                          <td className="px-4 py-4 text-sm text-gray-600">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="px-4 py-4">
                            {p.status === 'Pending' && (
                              <button type="button" onClick={() => handleMarkPaid(p.id)} className="rounded bg-green-100 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-200">
                                Mark Paid
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}