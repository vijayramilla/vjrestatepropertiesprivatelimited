import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import { buildSalaryStructure } from '@/utils/payrollCalculator';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import {
  ArrowLeft, Pencil, UserRound, Users, History, CalendarCheck, CalendarDays, Wallet, LogIn,
  Phone, Mail, MapPin, Sparkles, Search, Plus, Link2, Unlink, MessageSquare, Check, LayoutDashboard,
  ScanFace, ShieldCheck, ExternalLink, Clock, BellRing, Loader2, Trash2, Download, Coffee,
} from 'lucide-react';

type Tab = 'profile' | 'clients' | 'logins' | 'faceid' | 'history' | 'attendance' | 'leaves' | 'payroll';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CLIENT_STATUSES = ['New Lead', 'Site Visit', 'Negotiation', 'Closed', 'Lost'];

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  'On Leave': 'bg-amber-50 text-amber-700',
  Terminated: 'bg-red-50 text-red-600',
  Inactive: 'bg-gray-100 text-gray-600',
  Present: 'bg-emerald-50 text-emerald-700',
  Absent: 'bg-red-50 text-red-600',
  'Half Day': 'bg-amber-50 text-amber-700',
  Leave: 'bg-blue-50 text-blue-700',
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-600',
  Paid: 'bg-emerald-50 text-emerald-700',
  'New Lead': 'bg-blue-50 text-blue-700',
  'Site Visit': 'bg-amber-50 text-amber-700',
  Negotiation: 'bg-orange-50 text-orange-700',
  Closed: 'bg-emerald-50 text-emerald-700',
  Lost: 'bg-red-50 text-red-600',
};

function Pill({ value }: { value: string }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${STATUS_PILL[value] ?? 'bg-gray-100 text-gray-600'}`}>{value || '—'}</span>;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function fmtDur(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function fmtTime12(t: string | null | undefined): string {
  if (!t) return '—';
  const raw = t.length >= 8 ? t.slice(0, 5) : t;
  const [hStr, mStr] = raw.split(':').map(Number);
  if (hStr == null || mStr == null || Number.isNaN(hStr)) return raw;
  const h = hStr % 12 === 0 ? 12 : hStr % 12;
  const suffix = hStr < 12 ? 'AM' : 'PM';
  return `${h}:${String(mStr).padStart(2, '0')} ${suffix}`;
}

export default function CrmEmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('profile');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // clients tab
  const [clients, setClients] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [assignSno, setAssignSno] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [activityByClient, setActivityByClient] = useState<Record<number, any[]>>({});
  const [openActivity, setOpenActivity] = useState<number | null>(null);
  const [statusDraft, setStatusDraft] = useState<Record<number, { status: string; note: string }>>({});
  const [savingStatus, setSavingStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // logins tab
  const [logins, setLogins] = useState<any[]>([]);
  const [sessStats, setSessStats] = useState<any>(null);
  const [faceVerifications, setFaceVerifications] = useState<any[]>([]);
  const [lastFaceVerifiedAt, setLastFaceVerifiedAt] = useState<string | null>(null);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSentAt, setRequestSentAt] = useState<number | null>(null);
  const [payrollGenerating, setPayrollGenerating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');



  // HR tabs
  const [history, setHistory] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [attMonth, setAttMonth] = useState(new Date().getMonth() + 1);
  const [attYear] = useState(new Date().getFullYear());
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [histForm, setHistForm] = useState({ eventType: 'note', title: '', description: '', eventDate: new Date().toISOString().split('T')[0] });

  const isEmployee = role === 'employee';

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [empRes, verify] = await Promise.all([
        leadSupabase.employees.get(id),
        leadSupabase.admin.verify().catch(() => ({ role: undefined as string | undefined })),
      ]);
      setData(empRes.data);
      setRole(verify.role ?? null);
      // Face-ID request rows are internal plumbing — never show them as history events.
      setHistory((empRes.history ?? []).filter((h: any) => h.event_type !== 'face_verify_request'));
      setLeaves(empRes.leaves ?? []);
      setPayroll(empRes.payroll ?? []);
    } catch (e) {
      console.error(e);
      navigate('/crm/employees');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetch(); }, [fetch]);

  const fetchClients = useCallback(async () => {
    if (!id) return;
    try {
      const res = await leadSupabase.employees.clients(id);
      setClients(res.data.clients ?? []);
    } catch (e) { console.error(e); }
  }, [id]);

  const fetchAllClients = useCallback(async () => {
    try {
      const res = await leadSupabase.crmClients.list();
      setAllClients(res.data ?? []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { if (tab === 'clients') { fetchClients(); if (!isEmployee) fetchAllClients(); } }, [tab, fetchClients, fetchAllClients, isEmployee]);

  const fetchLogins = useCallback(async () => {
    if (!id) return;
    try {
      const [loginRes, statsRes, faceRes] = await Promise.all([
        leadSupabase.employees.logins(id, 100),
        leadSupabase.employees.sessionStats(id).catch(() => ({ data: null })),
        leadSupabase.employees.faceVerifications(id).catch(() => ({ data: [], lastFaceVerifiedAt: null })),
      ]);
      setLogins(loginRes.data ?? []);
      setSessStats(statsRes.data);
      setFaceVerifications(faceRes.data ?? []);
      setLastFaceVerifiedAt(faceRes.lastFaceVerifiedAt ?? null);
    } catch (e) { console.error(e); }
  }, [id]);

  useEffect(() => { if (tab === 'logins' || tab === 'faceid') fetchLogins(); }, [tab, fetchLogins]);

  const fetchAttendance = useCallback(async () => {
    if (!id) return;
    try {
      const res = await leadSupabase.employees.attendance(id, attMonth, attYear);
      setAttendance(res.data ?? []);
    } catch { /* attendance may be unavailable */ }
  }, [id, attMonth, attYear]);

  useEffect(() => { if (tab === 'attendance') fetchAttendance(); }, [tab, fetchAttendance]);

  const copyLoginLink = async () => {
    const url = `${window.location.origin}/employee-login`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const toggleActivity = async (sno: number) => {
    if (openActivity === sno) { setOpenActivity(null); return; }
    setOpenActivity(sno);
    if (!activityByClient[sno]) {
      try {
        const res = await leadSupabase.crmClients.activity(sno);
        setActivityByClient((m) => ({ ...m, [sno]: res.data ?? [] }));
      } catch (e) { console.error(e); }
    }
  };

  const handleAssign = async () => {
    if (!assignSno || !id) return;
    try {
      await leadSupabase.employees.assignClient(id, Number(assignSno));
      setAssignSno('');
      setAssignSearch('');
      await Promise.all([fetchClients(), fetchAllClients()]);
    } catch (e: any) { alert(e?.message ?? 'Failed to assign'); }
  };

  const handleUnassign = async (sno: number) => {
    try {
      await leadSupabase.employees.unassignClient(sno);
      await Promise.all([fetchClients(), fetchAllClients()]);
    } catch (e: any) { alert(e?.message ?? 'Failed to unassign'); }
  };

  const handleUpdateStatus = async (client: any) => {
    const draft = statusDraft[client.sno];
    if (!draft?.status) return;
    setSavingStatus(client.sno);
    try {
      await leadSupabase.crmClients.updateStatus(client.sno, draft.status, draft.note);
      setStatusDraft((m) => ({ ...m, [client.sno]: { status: draft.status, note: '' } }));
      await fetchClients();
      if (activityByClient[client.sno]) {
        const res = await leadSupabase.crmClients.activity(client.sno);
        setActivityByClient((m) => ({ ...m, [client.sno]: res.data ?? [] }));
      }
    } catch (e: any) { alert(e?.message ?? 'Failed to update status'); }
    finally { setSavingStatus(null); }
  };

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
    if (!leaveForm.startDate || !leaveForm.endDate || !id) return;
    try {
      await leadSupabase.employees.applyLeave(id, leaveForm.leaveType, leaveForm.startDate, leaveForm.endDate, leaveForm.reason);
      setShowLeaveForm(false);
      setLeaveForm({ leaveType: 'Casual', startDate: '', endDate: '', reason: '' });
      fetch();
    } catch (e) { console.error(e); }
  };

  const handleAddHistory = async () => {
    if (!id) return;
    try {
      await leadSupabase.employees.addHistory(id, histForm.eventType, histForm.title, histForm.description, histForm.eventDate);
      setShowHistoryForm(false);
      setHistForm({ eventType: 'note', title: '', description: '', eventDate: new Date().toISOString().split('T')[0] });
      fetch();
    } catch (e) { console.error(e); }
  };

  const handleGenPayroll = async (month: number, year: number) => {
    if (!id) return;
    setPayrollGenerating(true);
    try {
      await leadSupabase.employees.generatePayroll(id, month, year);
      await fetch();
      const salary = buildSalaryStructure(Number(e?.salary ?? 0) || 0);
      await generatePayslipPDF(e as any, { month, year, workingDays: 26, daysWorked: 26, lopDays: 0 }, salary);
    } catch (err: any) {
      console.error(err);
      alert(err?.message ?? 'Payroll generation failed.');
    } finally {
      setPayrollGenerating(false);
    }
  };

  const downloadPayslip = async (p: any) => {
    try {
      const salary = buildSalaryStructure(Number(e?.salary ?? 0) || 0);
      await generatePayslipPDF(e as any, { month: p.month, year: p.year, workingDays: 26, daysWorked: 26, lopDays: 0 }, salary);
    } catch (err: any) {
      console.error('[payslip PDF]', err);
      alert('Failed to generate payslip PDF: ' + (err?.message ?? err));
    }
  };

  const handleRequestFaceVerify = async () => {
    if (!id) return;
    setRequestSending(true);
    try {
      const res = await leadSupabase.employees.requestFaceVerify(id);
      setRequestSentAt(Date.now());
      alert(`Face verification request sent — it will pop up on ${res.data?.employee ?? 'the employee'}'s dashboard.`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'Failed to send the face verification request.');
    } finally {
      setRequestSending(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!id) return;
    setDeletingEmployee(true);
    try {
      await leadSupabase.employees.delete(id);
      navigate('/crm/employees');
    } catch (e: any) {
      console.error(e);
      alert(e?.message ?? 'Failed to delete employee');
      setShowDeleteConfirm(false);
    } finally {
      setDeletingEmployee(false);
    }
  };

  const togglePayrollVisible = async () => {
    if (!id) return;
    const newVal = !(e?.payroll_visible === true || e?.payroll_visible === 'true');
    try {
      await leadSupabase.employees.update(id, { payrollVisible: newVal });
      // Re-fetch to confirm the server accepted the change
      await fetch();
    } catch (err: any) {
      console.error(err);
      alert('Failed to update payroll visibility: ' + (err?.message ?? err));
    }
  };

  const downloadAttendance = () => {
    const rows: string[][] = [
      ['Employee Attendance Report'],
      ['Name', e?.name ?? '', 'Employee ID', e?.employee_id ?? '', 'Period', `${MONTHS[attMonth - 1]} ${attYear}`],
      [],
      ['Date', 'Day', 'Status', 'Check-in', 'Check-out', 'Hours'],
    ];
    const days = new Date(attYear, attMonth, 0).getDate();
    let present = 0;
    let absent = 0;
    let leave = 0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${attYear}-${String(attMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const a = attMap[dateStr];
      const status = a?.status || '—';
      const checkIn = a?.check_in ? String(a.check_in).slice(0, 5) : '—';
      const checkOut = a?.check_out ? String(a.check_out).slice(0, 5) : '—';
      let hours = '—';
      if (a?.check_in && a?.check_out) {
        const [hi, mi] = String(a.check_in).split(':').map(Number);
        const [ho, mo] = String(a.check_out).split(':').map(Number);
        const mins = Math.max(0, (ho * 60 + mo) - (hi * 60 + mi));
        hours = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
      }
      if (/^present$/i.test(status)) present++;
      if (/^absent$/i.test(status)) absent++;
      if (/^leave/i.test(status)) leave++;
      rows.push([
        dateStr,
        new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
        status,
        checkIn,
        checkOut,
        hours,
      ]);
    }
    rows.push([]);
    rows.push(['Summary', '', '', '', '', '']);
    rows.push(['Present days', String(present)]);
    rows.push(['Absent days', String(absent)]);
    rows.push(['Leave days', String(leave)]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(e?.name ?? 'employee').replace(/\s+/g, '_')}-attendance-${MONTHS[attMonth - 1]}-${attYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] antialiased flex">
        <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 min-w-0 overflow-y-auto p-8"><div className="h-56 animate-pulse rounded-2xl border border-black/[0.05] bg-white" /></main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] antialiased flex">
        <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <main className="flex-1 min-w-0 overflow-y-auto p-8 text-center text-sm text-[#6b7280]">Employee not found.</main>
      </div>
    );
  }

  const e = data;
  const assignedIds = new Set(clients.map((c: any) => c.sno));
  const assignable = allClients.filter((c: any) => !assignedIds.has(c.sno) && (c.name ?? '').toLowerCase().includes(assignSearch.toLowerCase()));

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile', icon: UserRound },
    { key: 'clients', label: isEmployee ? 'My Clients' : 'Clients', icon: Users },
    ...(isEmployee ? [] : [
      { key: 'logins', label: 'Logins', icon: LogIn },
      { key: 'faceid', label: 'Face ID', icon: ScanFace },
      { key: 'history', label: 'History', icon: History },
      { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
      { key: 'leaves', label: 'Leaves', icon: CalendarDays },
      { key: 'payroll', label: 'Payroll', icon: Wallet },
    ] as { key: Tab; label: string; icon: any }[]),
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <button
            onClick={() => navigate(isEmployee ? '/crm/my-clients' : '/crm/employees')}
            className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#96782A] transition-colors hover:text-[#0A1628]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {isEmployee ? 'Back to My Clients' : 'Back to Employees'}
          </button>
          <CrmPageHeader
            eyebrow={isEmployee ? 'My Profile' : `Team · ${e.department || 'Employee'}`}
            title={e.name || 'Unnamed'}
            description={`ID Card ID ${e.employee_id} · ${e.designation || '—'} · ${e.department || '—'}`}
            actions=              {!isEmployee && (
                <>
                  <CrmBtn variant="primary" onClick={() => navigate(`/crm/employees/${id}/dashboard`)}>
                    <LayoutDashboard className="h-3.5 w-3.5" /> Employee Dashboard
                  </CrmBtn>
                  <CrmBtn variant="ghost" onClick={copyLoginLink} title="Share this link so the employee can sign in with Google">
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
                    {copied ? 'Link Copied!' : 'Copy Login Link'}
                  </CrmBtn>
                  <CrmBtn variant="ghost" onClick={() => navigate(`/crm/employees/${id}/edit`)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </CrmBtn>
                  <CrmBtn variant="danger" onClick={() => setShowDeleteConfirm(true)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </CrmBtn>
                </>
              )}
          />

          {/* Tabs */}
          <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex min-h-[38px] shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition-all duration-200 ${
                    active ? 'bg-[#0A1628] text-[#D6B85D] shadow-sm' : 'text-[#6b7280] hover:bg-black/[0.03] hover:text-[#0A1628]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* ═════════ PROFILE ═════════ */}
          {tab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                {[
                  { label: 'Status', value: e.status || 'Active', pill: true },
                  { label: 'Login Access', value: e.access_enabled ? 'Enabled' : 'Disabled', pill: true },
                  { label: 'Payroll', value: (e.payroll_visible === true || e.payroll_visible === 'true') ? 'Visible' : 'Hidden', pill: true },
                  { label: 'Logins (total)', value: String(e.login_count ?? 0) },
                  { label: 'Last Login', value: e.last_login ? new Date(e.last_login).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never' },
                  { label: 'Joining Date', value: e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                  ...(e.designation === 'Channel Partner' ? [{ label: 'Commission Rate', value: `${e.commission_rate ?? 0}% of deal` }] : []),
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{s.label}</p>
                    {s.pill ? <div className="mt-2"><Pill value={s.value} /></div> : <p className="mt-2 text-[13.5px] font-semibold text-[#0A1628]">{s.value}</p>}
                  </div>
                ))}
              </div>

              {/* Payroll visibility toggle */}
              <button
                onClick={togglePayrollVisible}
                className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-all hover:border-[#C9A84C]/40"
              >
                <div className={`relative h-6 w-11 rounded-full transition-colors ${(e?.payroll_visible === true || e?.payroll_visible === 'true') ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${(e?.payroll_visible === true || e?.payroll_visible === 'true') ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-[#0A1628]">Employee Payslip Access</p>
                  <p className="text-[10px] text-[#6b7280]">
                    {(e?.payroll_visible === true || e?.payroll_visible === 'true')
                      ? 'Employee can see salary, bank details, and download payslips on their dashboard'
                      : 'Employee dashboard hides salary, bank details, and payslip data'}
                  </p>
                </div>
              </button>

              <CrmCard className="p-5 sm:p-6">
                <h3 className="mb-4 font-['Inter',sans-serif] text-[16px] font-semibold">Contact</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { icon: Mail, label: 'Email', value: e.email || '—' },
                    { icon: Phone, label: 'Phone', value: e.phone || '—' },
                    { icon: MapPin, label: 'Address', value: e.address || '—' },
                    { icon: Sparkles, label: 'Notes', value: e.notes || '—' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-start gap-3 rounded-xl border border-black/[0.05] bg-[#fafafa] p-3.5">
                      <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#96782A]" strokeWidth={1.6} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{r.label}</p>
                        <p className="mt-0.5 break-words text-[13px] font-medium text-[#0A1628]">{r.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CrmCard>

              <CrmCard className="p-5 sm:p-6">
                <h3 className="mb-4 font-['Inter',sans-serif] text-[16px] font-semibold">Salary & Bank</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: e.designation === 'Channel Partner' ? 'Compensation' : 'Monthly Salary', value: e.designation === 'Channel Partner' ? 'Commission-based — no fixed salary' : `₹${(e.salary ?? 0).toLocaleString()}` },
                    { label: 'Bank', value: e.bank_name || '—' },
                    { label: 'Account', value: e.bank_account_number || '—' },
                    { label: 'IFSC', value: e.ifsc_code || '—' },
                    { label: 'PAN', value: e.pan_number || '—' },
                    { label: 'Aadhar', value: e.aadhar_number || '—' },
                    { label: 'UAN (PF)', value: e.uan_number || '—' },
                    { label: 'ESI', value: e.esi_number || '—' },
                    { label: 'Emergency Contact', value: [e.emergency_contact_name, e.emergency_contact_phone].filter(Boolean).join(' · ') || '—' },
                  ].map((r) => (
                    <div key={r.label} className="rounded-xl border border-black/[0.05] bg-[#fafafa] p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{r.label}</p>
                      <p className="mt-1 font-mono text-[12.5px] font-semibold text-[#0A1628]">{r.value}</p>
                    </div>
                  ))}
                </div>
              </CrmCard>
            </div>
          )}

          {/* ═════════ CLIENTS ═════════ */}
          {tab === 'clients' && (
            <div className="space-y-6">
              {!isEmployee && (
                <CrmCard className="p-5">
                  <h3 className="mb-4 font-['Inter',sans-serif] text-[16px] font-semibold">Assign Client to {e.name}</h3>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
                      <input
                        value={assignSearch}
                        onChange={(e2) => setAssignSearch(e2.target.value)}
                        placeholder="Search clients to assign..."
                        className={`${CRM_INPUT} pl-9`}
                      />
                    </div>
                    <select value={assignSno} onChange={(e2) => setAssignSno(e2.target.value)} className={`${CRM_INPUT} sm:w-[240px]`}>
                      <option value="">Select client…</option>
                      {assignable.slice(0, 200).map((c: any) => <option key={c.sno} value={c.sno}>{c.sno} · {c.name}</option>)}
                    </select>
                    <CrmBtn variant="gold" onClick={handleAssign} disabled={!assignSno}>
                      <Link2 className="h-3.5 w-3.5" /> Assign
                    </CrmBtn>
                  </div>
                  {assignable.length === 0 && <p className="mt-3 text-xs text-[#9ca3af]">No unassigned clients match — all clients are assigned or don't match the search.</p>}
                </CrmCard>
              )}

              {clients.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
                  <p className="text-sm text-[#6b7280]">
                    {isEmployee ? 'No clients assigned to you yet.' : `No clients assigned to ${e.name || 'this employee'} yet.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">Assigned ({clients.length})</p>
                  {clients.map((c: any) => {
                    const draft = statusDraft[c.sno];
                    const isOpen = openActivity === c.sno;
                    const activity = activityByClient[c.sno];
                    return (
                      <CrmCard key={c.sno} className="p-4 sm:p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[11px] font-extrabold text-[#D6B85D]">
                              {initials(c.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[14px] font-bold text-[#111827]">{c.name}</p>
                                <span className="font-mono text-[10px] text-[#96782A]">#{c.sno}</span>
                              </div>
                              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#6b7280]">
                                <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" strokeWidth={1.6} />{c.phone || '—'}</span>
                                {c.location && <span>{c.location}</span>}
                                <span className="text-[#C9A84C]/80">·</span>
                                <span className="font-semibold text-emerald-600">₹{c.budget || '—'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Pill value={draft?.status || c.status} />
                            {!isEmployee && (
                              <CrmBtn variant="danger" className="min-h-[36px] px-3 text-[11px]" onClick={() => handleUnassign(c.sno)}>
                                <Unlink className="h-3.5 w-3.5" /> Unassign
                              </CrmBtn>
                            )}
                            <CrmBtn variant="ghost" className="min-h-[36px] px-3 text-[11px]" onClick={() => toggleActivity(c.sno)}>
                              <MessageSquare className="h-3.5 w-3.5" /> {isOpen ? 'Hide Activity' : 'Activity'}
                            </CrmBtn>
                          </div>
                        </div>

                        {/* status update (employees + admins) */}
                        <div className="mt-4 flex flex-col gap-2 border-t border-black/[0.05] pt-4 sm:flex-row sm:items-center">
                          <select
                            value={draft?.status ?? c.status}
                            onChange={(e2) => setStatusDraft((m) => ({ ...m, [c.sno]: { status: e2.target.value, note: m[c.sno]?.note ?? '' } }))}
                            className={`${CRM_INPUT} sm:w-[180px]`}
                          >
                            {CLIENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <input
                            value={draft?.note ?? ''}
                            onChange={(e2) => setStatusDraft((m) => ({ ...m, [c.sno]: { status: m[c.sno]?.status ?? c.status, note: e2.target.value } }))}
                            placeholder="Note (optional) — shown in activity feed"
                            className={`${CRM_INPUT} flex-1`}
                          />
                          <CrmBtn
                            variant="primary"
                            onClick={() => handleUpdateStatus(c)}
                            disabled={!draft?.status || savingStatus === c.sno}
                          >
                            {savingStatus === c.sno ? 'Saving…' : 'Update Status'}
                          </CrmBtn>
                        </div>

                        {isOpen && (
                          <div className="mt-4 rounded-xl border border-black/[0.05] bg-[#fafafa] p-4">
                            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">Activity</p>
                            {!activity ? (
                              <div className="h-12 animate-pulse rounded-lg bg-black/[0.03]" />
                            ) : activity.length === 0 ? (
                              <p className="text-xs text-[#9ca3af]">No activity yet.</p>
                            ) : (
                              <div className="space-y-2.5">
                                {activity.map((a: any) => (
                                  <div key={a.id} className="flex items-start gap-2.5 text-[12px]">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                                    <div className="min-w-0">
                                      <p className="text-[#0A1628]">
                                        <span className="font-bold capitalize">{a.action?.replace('_', ' ')}</span>
                                        {a.status && <> → <span className="font-semibold text-[#96782A]">{a.status}</span></>}
                                        {a.note && <span className="text-[#6b7280]"> · {a.note}</span>}
                                      </p>
                                      <p className="mt-0.5 text-[10.5px] text-[#9ca3af]">
                                        {a.performed_by || 'System'} · {new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CrmCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════ LOGINS ═════════ */}
          {tab === 'logins' && (
            <div>
              {/* Row 1 — Activity summary */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { icon: LogIn, label: 'Total Logins', value: String(e.login_count ?? 0), accent: 'bg-[#C9A84C]/[0.12] text-[#96782A]' },
                  { icon: Clock, label: 'Sessions', value: String(sessStats?.total_sessions ?? 0), accent: 'bg-blue-50 text-blue-600' },
                  { icon: Clock, label: 'Time Online', value: fmtDur(sessStats?.total_seconds_online ?? 0), accent: 'bg-emerald-50 text-emerald-600' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
                      <s.icon className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{s.label}</p>
                    <p className="mt-1 font-['Inter',sans-serif] text-[22px] font-bold leading-tight text-[#0A1628]">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Row 2 — Login details */}
              <div className="mb-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Last Login', value: e.last_login ? new Date(e.last_login).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never', sub: e.last_login ? 'at ' + new Date(e.last_login).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '' },
                  { label: 'Days Logged In', value: String(logins.length), sub: 'unique days' },
                  { label: 'Auto-logout', value: sessStats?.auto_logout_time ? fmtTime12(sessStats.auto_logout_time) : '—', sub: 'daily at' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{s.label}</p>
                    <p className="mt-1.5 font-['Inter',sans-serif] text-[17px] font-bold text-[#0A1628]">{s.value}</p>
                    {s.sub && <p className="mt-0.5 text-[10px] text-[#9ca3af]">{s.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Row 3 — Face verification summary */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
                    <ScanFace className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Face Verifications</p>
                  <p className="mt-1.5 font-['Inter',sans-serif] text-[22px] font-bold leading-tight text-[#0A1628]">{faceVerifications.length}</p>
                  <p className="mt-0.5 text-[10px] text-[#9ca3af]">total captures</p>
                </div>
                <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
                    <ShieldCheck className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Last Face Verified</p>
                  <p className="mt-1.5 font-['Inter',sans-serif] text-[17px] font-bold text-[#0A1628]">
                    {lastFaceVerifiedAt ? new Date(lastFaceVerifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[#9ca3af]">
                    {lastFaceVerifiedAt ? new Date(lastFaceVerifiedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                  </p>
                </div>
              </div>

              {faceVerifications.length > 0 && (
                <div className="mb-6">
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                    <ScanFace className="h-3.5 w-3.5 text-[#96782A]" strokeWidth={1.8} /> Face ID History
                  </p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    {faceVerifications.map((f: any) => (
                      <div key={f.id} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                        {f.image_url && <img src={f.image_url} alt="Face verification" className="aspect-[4/3] w-full object-cover" />}
                        <div className="p-3">
                          <p className="text-[11px] font-bold text-[#0A1628]">
                            {new Date(f.verified_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })}
                          </p>
                          {f.location_label && (
                            <p className="mt-1 flex items-start gap-1 text-[10px] leading-snug text-[#6b7280]">
                              <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                              <span className="line-clamp-2">{f.location_label}</span>
                            </p>
                          )}
                          {f.latitude != null && (
                            <p className="mt-1 font-mono text-[9.5px] text-[#9ca3af]">
                              {Number(f.latitude).toFixed(5)}, {Number(f.longitude).toFixed(5)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {logins.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center text-sm text-[#6b7280]">
                  No logins recorded yet — appears once the employee signs in with their work email.
                </div>
              ) : (
                <div className="space-y-2">
                  {logins.map((l: any) => (
                    <div key={l.id} className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#C9A84C]/[0.14] text-[#96782A]">
                          <LogIn className="h-4 w-4" strokeWidth={1.8} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-[#0A1628]">
                            {new Date(l.login_at).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <p className="text-[11px] text-[#6b7280]">Signed in at {new Date(l.login_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      {l.user_agent && <span className="hidden max-w-[300px] truncate text-[10px] text-[#9ca3af] sm:block">{l.user_agent}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═════════ FACE ID ═════════ */}
          {tab === 'faceid' && (
            <div className="space-y-6">
              {/* Control bar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
                    <ScanFace className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-white">Face Verification</p>
                    <p className="text-[11px] text-white/60">Captured photos, timestamps and exact PIN locations for {e.name}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <CrmBtn variant="gold" onClick={handleRequestFaceVerify} disabled={requestSending}>
                    {requestSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
                    {requestSending ? 'Sending…' : 'Request on Employee Device'}
                  </CrmBtn>
                  {requestSentAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Request sent
                    </span>
                  )}
                </div>
              </div>

              {/* Stats + policy */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { label: 'Total Captures', value: String(faceVerifications.length), sub: 'recorded' },
                  { label: 'Last Verified', value: lastFaceVerifiedAt ? new Date(lastFaceVerifiedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never', sub: lastFaceVerifiedAt ? new Date(lastFaceVerifiedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—' },
                  { label: 'Policy', value: e.face_verify_required === false ? 'Off' : e.face_verify_frequency === 'weekly' ? 'Weekly' : 'Daily', sub: 'auto-prompt' },
                  { label: 'Login Access', value: e.access_enabled ? 'Enabled' : 'Disabled', sub: 'Google sign-in' },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{s.label}</p>
                    <p className="mt-2 font-['Inter',sans-serif] text-[16px] font-bold leading-tight text-[#0A1628]">{s.value}</p>
                    <p className="mt-0.5 text-[10px] text-[#9ca3af]">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Captured faces grid */}
              {faceVerifications.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center">
                  <ScanFace className="mx-auto mb-3 h-9 w-9 text-[#C9A84C]" strokeWidth={1.3} />
                  <p className="text-sm font-semibold text-[#0A1628]">No face captures yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-[#6b7280]">
                    Captures appear here with the photo, date & time, and the exact PIN location once the employee verifies
                    their identity — either from their dashboard or when you request it here.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#96782A]" strokeWidth={1.8} />
                    Identity History ({faceVerifications.length})
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {faceVerifications.map((f: any) => {
                      const hasPin = f.latitude != null && f.longitude != null;
                      const mapsUrl = hasPin ? `https://www.google.com/maps?q=${f.latitude},${f.longitude}` : null;
                      return (
                        <div key={f.id} className="group overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(10,22,40,0.1)]">
                          <div className="relative">
                            {f.image_url ? (
                              <img src={f.image_url} alt="Face verification" className="aspect-[4/3] w-full object-cover" />
                            ) : (
                              <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#0A1628]">
                                <UserRound className="h-10 w-10 text-[#D6B85D]/60" strokeWidth={1.3} />
                              </div>
                            )}
                            <div className="absolute left-2.5 top-2.5">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">
                                <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2} /> Verified
                              </span>
                            </div>
                          </div>
                          <div className="p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#0A1628]">
                                  <Clock className="h-3 w-3 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                                  {f.verified_at ? new Date(f.verified_at).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </p>
                                <p className="mt-0.5 text-[11px] font-semibold text-[#6b7280]">
                                  {f.verified_at ? new Date(f.verified_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '—'}
                                </p>
                              </div>
                              {mapsUrl && (
                                <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-black/10 bg-white px-2 py-1 text-[9.5px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1]">
                                  <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} /> Maps
                                </a>
                              )}
                            </div>
                            <div className="mt-2.5 rounded-xl border border-black/[0.05] bg-[#fafafa] p-2.5">
                              <p className="flex items-start gap-1.5 text-[10.5px] leading-snug text-[#0A1628]">
                                <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                                <span className="line-clamp-2">{f.location_label || 'Location unavailable'}</span>
                              </p>
                              {hasPin && (
                                <p className="mt-1 font-mono text-[9.5px] text-[#9ca3af]">
                                  {Number(f.latitude).toFixed(6)}, {Number(f.longitude).toFixed(6)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ═════════ HISTORY ═════════ */}
          {tab === 'history' && (
            <div>
              <div className="mb-4 flex justify-end">
                <CrmBtn variant="gold" onClick={() => setShowHistoryForm(true)}><Plus className="h-3.5 w-3.5" /> Add Event</CrmBtn>
              </div>
              {history.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center text-sm text-[#6b7280]">No history recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any) => (
                    <div key={h.id} className="flex items-start gap-4 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-xs font-extrabold text-[#D6B85D]">
                        {h.event_type === 'joined' ? 'J' : h.event_type === 'promotion' ? 'P' : h.event_type === 'salary_change' ? '₹' : h.event_type === 'leave' ? 'L' : h.event_type === 'payroll' ? '₹' : h.event_type === 'termination' ? 'T' : '•'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13.5px] font-bold text-[#0A1628]">{h.title}</p>
                          <span className="shrink-0 text-[10px] text-[#9ca3af]">{h.event_date ? new Date(h.event_date).toLocaleDateString('en-IN') : ''}</span>
                        </div>
                        {h.description && <p className="mt-1 text-xs text-[#6b7280]">{h.description}</p>}
                        {h.created_by && <p className="mt-1 text-[10px] text-[#9ca3af]">by {h.created_by}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showHistoryForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowHistoryForm(false)}>
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e2) => e2.stopPropagation()}>
                    <h3 className="mb-4 font-['Inter',sans-serif] text-lg font-semibold text-[#0A1628]">Add History Event</h3>
                    <div className="space-y-3">
                      <select value={histForm.eventType} onChange={(e2) => setHistForm((f) => ({ ...f, eventType: e2.target.value }))} className={CRM_INPUT}>
                        <option value="note">Note</option>
                        <option value="promotion">Promotion</option>
                        <option value="salary_change">Salary Change</option>
                        <option value="warning">Warning</option>
                        <option value="achievement">Achievement</option>
                      </select>
                      <input placeholder="Title" value={histForm.title} onChange={(e2) => setHistForm((f) => ({ ...f, title: e2.target.value }))} className={CRM_INPUT} />
                      <input placeholder="Description" value={histForm.description} onChange={(e2) => setHistForm((f) => ({ ...f, description: e2.target.value }))} className={CRM_INPUT} />
                      <input type="date" value={histForm.eventDate} onChange={(e2) => setHistForm((f) => ({ ...f, eventDate: e2.target.value }))} className={CRM_INPUT} />
                    </div>
                    <div className="mt-4 flex gap-3">
                      <CrmBtn variant="gold" onClick={handleAddHistory}>Save</CrmBtn>
                      <CrmBtn variant="ghost" onClick={() => setShowHistoryForm(false)}>Cancel</CrmBtn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════ ATTENDANCE ═════════ */}
          {tab === 'attendance' && (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <select value={attMonth} onChange={(e2) => setAttMonth(Number(e2.target.value))} className={`${CRM_INPUT} w-auto`}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                  <span className="text-sm text-[#6b7280]">{attYear}</span>
                </div>
                <CrmBtn variant="gold" onClick={downloadAttendance} disabled={attendance.length === 0}>
                  <Download className="h-3.5 w-3.5" /> Download Attendance
                </CrmBtn>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Present', value: attendance.filter((a) => /^present$/i.test(a.status ?? '')).length, cls: 'text-emerald-600', dot: 'bg-emerald-500' },
                  { label: 'Absent', value: attendance.filter((a) => /^absent$/i.test(a.status ?? '')).length, cls: 'text-red-600', dot: 'bg-red-500' },
                  { label: 'Half Day', value: attendance.filter((a) => /^half day$/i.test(a.status ?? '')).length, cls: 'text-amber-600', dot: 'bg-amber-500' },
                  { label: 'Leave', value: attendance.filter((a) => /^leave$/i.test(a.status ?? '')).length, cls: 'text-blue-600', dot: 'bg-blue-500' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2.5 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <div>
                      <p className={`font-['Inter',sans-serif] text-lg font-bold leading-none ${s.cls}`}>{s.value}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">{s.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <CrmCard className="p-4">
                <div className="grid grid-cols-7 gap-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="p-2 text-center text-[10px] font-semibold uppercase text-[#9ca3af]">{d}</div>
                  ))}
                  {Array.from({ length: new Date(attYear, attMonth - 1, 1).getDay() }).map((_, i) => <div key={`empty-${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${attYear}-${String(attMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const att = attMap[dateStr];
                    const status = (att?.status ?? '').toLowerCase();
                    const color = !att ? 'bg-gray-50 text-gray-400' : status === 'present' ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300/60' : status === 'absent' ? 'bg-red-50 text-red-600' : status === 'half day' ? 'bg-amber-50 text-amber-700' : status === 'leave' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50';
                    return (
                      <div key={day} className={`relative rounded-lg p-2 text-center text-xs font-semibold ${color}`}>
                        {status === 'present' && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {day}
                        {att?.check_in && <div className="text-[8px] opacity-70">{String(att.check_in).slice(0, 5)}</div>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-black/[0.05] pt-3 text-[10.5px] font-semibold text-[#6b7280]">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Present</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Absent</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Half Day</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500" /> Leave</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-300" /> No record</span>
                </div>
              </CrmCard>
              {attendance.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 font-['Inter',sans-serif] text-[16px] font-semibold">Daily Log</h3>
                  <div className="space-y-2">
                    {attendance.map((a: any) => {
                      // Compute worked minutes
                      let workedMin = 0;
                      if (a.check_in && a.check_out) {
                        const [ciH, ciM] = String(a.check_in).split(':').map(Number);
                        const [coH, coM] = String(a.check_out).split(':').map(Number);
                        workedMin = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - (a.total_break_minutes ?? 0));
                      }
                      return (
                        <div key={a.id} className="rounded-2xl border border-black/[0.06] bg-white p-3.5 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[#0A1628]">{new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-semibold text-[#0A1628]">{a.check_in?.slice(0, 5) || '—'} → {a.check_out?.slice(0, 5) || '—'}</span>
                              <span className="font-mono text-[10.5px] font-bold text-[#6b7280]">{Math.floor(workedMin / 60)}h {workedMin % 60}m</span>
                              {a.overtime_minutes > 0 && <span className="text-[10px] font-bold text-amber-600">+{a.overtime_minutes}m OT</span>}
                              <Pill value={a.status} />
                            </div>
                          </div>
                          {/* Clock-in & clock-out details — shown separately */}
                          {(a.check_in_selfie_url || a.check_in_location || a.check_out_selfie_url || a.check_out_location) && (
                            <div className="mt-2 space-y-2 border-t border-black/[0.04] pt-2">
                              {/* Clock-in row */}
                              {(a.check_in_selfie_url || a.check_in_location) && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-emerald-700">In</span>
                                  {a.check_in_selfie_url && <img src={a.check_in_selfie_url} alt="Clock-in selfie" className="h-8 w-8 rounded-lg object-cover ring-1 ring-emerald-200" />}
                                  {a.check_in_location && <span className="inline-flex items-center gap-1 text-[9.5px] text-[#6b7280]"><MapPin className="h-3 w-3" /> {a.check_in_location.length > 40 ? a.check_in_location.slice(0, 40) + '…' : a.check_in_location}</span>}
                                </div>
                              )}
                              {/* Clock-out row */}
                              {(a.check_out_selfie_url || a.check_out_location) && (
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-700">Out</span>
                                  {a.check_out_selfie_url && <img src={a.check_out_selfie_url} alt="Clock-out selfie" className="h-8 w-8 rounded-lg object-cover ring-1 ring-amber-200" />}
                                  {a.check_out_location && <span className="inline-flex items-center gap-1 text-[9.5px] text-[#6b7280]"><MapPin className="h-3 w-3" /> {a.check_out_location.length > 40 ? a.check_out_location.slice(0, 40) + '…' : a.check_out_location}</span>}
                                </div>
                              )}
                              {/* Break + source */}
                              <div className="flex flex-wrap items-center gap-2">
                                {a.total_break_minutes > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[9.5px] text-[#6b7280]">
                                    <Coffee className="h-3 w-3" /> {a.total_break_minutes}m break
                                  </span>
                                )}
                                {a.source && a.source !== 'auto' && (
                                  <span className="rounded-md bg-[#C9A84C]/[0.12] px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-[#96782A]">{a.source}</span>
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
            </div>
          )}

          {/* ═════════ LEAVES ═════════ */}
          {tab === 'leaves' && (
            <div>
              <div className="mb-4 flex justify-end">
                <CrmBtn variant="gold" onClick={() => setShowLeaveForm(true)}><Plus className="h-3.5 w-3.5" /> Apply Leave</CrmBtn>
              </div>
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {['Sick', 'Casual', 'Annual', 'Personal'].map((type) => {
                  const bal = leaveBalance(type);
                  return (
                    <div key={type} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{type}</p>
                      <p className="mt-1 font-['Inter',sans-serif] text-xl font-bold text-[#0A1628]">{bal.limit - bal.taken} <span className="text-sm font-normal text-[#9ca3af]">/ {bal.limit}</span></p>
                      <p className="text-[10px] text-[#9ca3af]">{bal.taken} used</p>
                    </div>
                  );
                })}
              </div>
              {leaves.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center text-sm text-[#6b7280]">No leave requests.</div>
              ) : (
                <div className="space-y-2">
                  {leaves.map((l: any) => (
                    <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                      <div>
                        <p className="text-[13.5px] font-bold text-[#0A1628]">{l.leave_type} Leave</p>
                        <p className="text-xs text-[#6b7280]">{new Date(l.start_date).toLocaleDateString('en-IN')} → {new Date(l.end_date).toLocaleDateString('en-IN')}</p>
                        {l.reason && <p className="mt-1 text-xs text-[#6b7280]">{l.reason}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Pill value={l.status} />
                        {l.status === 'Pending' && (
                          <>
                            <CrmBtn variant="ghost" className="min-h-[34px] px-3 text-[11px] text-emerald-600" onClick={() => leadSupabase.employees.approveLeave(l.id).then(fetch)}>Approve</CrmBtn>
                            <CrmBtn variant="danger" className="min-h-[34px] px-3 text-[11px]" onClick={() => leadSupabase.employees.rejectLeave(l.id).then(fetch)}>Reject</CrmBtn>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showLeaveForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowLeaveForm(false)}>
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e2) => e2.stopPropagation()}>
                    <h3 className="mb-4 font-['Inter',sans-serif] text-lg font-semibold text-[#0A1628]">Apply Leave</h3>
                    <div className="space-y-3">
                      <select value={leaveForm.leaveType} onChange={(e2) => setLeaveForm((f) => ({ ...f, leaveType: e2.target.value }))} className={CRM_INPUT}>
                        <option value="Sick">Sick Leave</option>
                        <option value="Casual">Casual Leave</option>
                        <option value="Annual">Annual Leave</option>
                        <option value="Personal">Personal Leave</option>
                      </select>
                      <input type="date" value={leaveForm.startDate} onChange={(e2) => setLeaveForm((f) => ({ ...f, startDate: e2.target.value }))} className={CRM_INPUT} />
                      <input type="date" value={leaveForm.endDate} onChange={(e2) => setLeaveForm((f) => ({ ...f, endDate: e2.target.value }))} className={CRM_INPUT} />
                      <input placeholder="Reason" value={leaveForm.reason} onChange={(e2) => setLeaveForm((f) => ({ ...f, reason: e2.target.value }))} className={CRM_INPUT} />
                    </div>
                    <div className="mt-4 flex gap-3">
                      <CrmBtn variant="gold" onClick={handleApplyLeave}>Apply</CrmBtn>
                      <CrmBtn variant="ghost" onClick={() => setShowLeaveForm(false)}>Cancel</CrmBtn>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═════════ PAYROLL ═════════ */}
          {tab === 'payroll' && e.designation === 'Channel Partner' && (
            <div className="rounded-2xl border border-black/[0.06] bg-white p-12 text-center shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
              <Wallet className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="text-sm font-semibold text-[#0A1628]">Channel partners are commission-only</p>
              <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[#6b7280]">
                No monthly payroll applies. Earnings are tracked as commission on closed client deals
                ({e.commission_rate ?? 0}% of the deal value). See the Clients tab for assigned deals.
              </p>
            </div>
          )}
          {tab === 'payroll' && e.designation !== 'Channel Partner' && (
            <div>
              <div className="mb-4 flex justify-end gap-2">
                {(() => {
                  const now = new Date();
                  const m = now.getMonth() + 1;
                  const y = now.getFullYear();
                  const exists = payroll.some((p: any) => p.month === m && p.year === y);
                  return !exists ? (
                    <CrmBtn variant="gold" onClick={() => handleGenPayroll(m, y)} disabled={payrollGenerating}>
                      {payrollGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {payrollGenerating ? 'Generating…' : 'Generate This Month'}
                    </CrmBtn>
                  ) : null;
                })()}
              </div>
              {payroll.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center text-sm text-[#6b7280]">No payroll records yet.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="border-b border-black/[0.06] bg-[#fafafa]">
                        <tr>
                          {['Period', 'Basic', 'HRA', 'Allowances', 'Deductions', 'Net Pay', 'Status', 'Payment Date', ''].map((h) => (
                            <th key={h} className="px-4 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[1px] text-[#6b7280]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {payroll.map((p: any) => (
                          <tr key={p.id} className="border-b border-black/[0.04]">
                            <td className="px-4 py-4 text-sm text-[#6b7280]">{MONTHS[p.month - 1]} {p.year}</td>
                            <td className="px-4 py-4 text-sm text-[#0A1628]">₹{(p.basic_pay ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-sm text-[#0A1628]">₹{(p.hra ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-sm text-[#0A1628]">₹{(p.allowances ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-sm text-red-600">₹{(p.deductions ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-sm font-bold text-[#0A1628]">₹{(p.net_pay ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-4"><Pill value={p.status} /></td>
                            <td className="px-4 py-4 text-sm text-[#6b7280]">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <CrmBtn variant="ghost" className="min-h-[34px] px-3 text-[11px] text-[#0A1628]" onClick={() => downloadPayslip(p)}>
                                  <Download className="h-3.5 w-3.5" /> PDF
                                </CrmBtn>
                                {p.status === 'Pending' && (
                                  <CrmBtn variant="ghost" className="min-h-[34px] px-3 text-[11px] text-emerald-600" onClick={() => leadSupabase.employees.markPaid(p.id).then(fetch)}>Mark Paid</CrmBtn>
                                )}
                              </div>
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
        </CrmPageBody>
      </main>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { if (!deletingEmployee) { setShowDeleteConfirm(false); setDeleteConfirmText(''); } }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e2) => e2.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-center font-['Inter',sans-serif] text-[17px] font-bold text-[#0A1628]">Delete {e.name || 'this employee'}?</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-center text-xs leading-relaxed text-[#6b7280]">
              This permanently removes the employee and all their history, attendance, leaves and payroll records. This cannot be undone.
            </p>
            <div className="mt-5">
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Type <span className="text-red-600">delete</span> to confirm</label>
              <input
                type="text"
                placeholder='Type "delete" here'
                value={deleteConfirmText}
                onChange={(e2) => setDeleteConfirmText(e2.target.value)}
                onKeyDown={(e2) => { if (e2.key === 'Enter' && deleteConfirmText.trim().toLowerCase() === 'delete') { handleDeleteEmployee(); } }}
                className={`${CRM_INPUT} border-red-200 focus:border-red-400 focus:ring-red-200`}
                autoFocus
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <CrmBtn variant="ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} disabled={deletingEmployee}>Cancel</CrmBtn>
              <CrmBtn
                variant="danger"
                className="border-red-600 bg-red-600 text-white hover:bg-red-700"
                onClick={handleDeleteEmployee}
                disabled={deletingEmployee || deleteConfirmText.trim().toLowerCase() !== 'delete'}
              >
                {deletingEmployee ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deletingEmployee ? 'Deleting…' : 'Delete'}
              </CrmBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
