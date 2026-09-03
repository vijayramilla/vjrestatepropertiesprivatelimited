import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmStatCard, CrmStatGrid, CrmBtn, CRM_INPUT, MotionReveal } from '@/components/crm/CrmUi';
import { Plus, Users, CheckCircle, UserMinus, Sparkles, Briefcase, Search, LogIn, Link2, Check, Trash2, AlertTriangle } from 'lucide-react';
import { DEPARTMENTS, DESIGNATIONS_BY_DEPARTMENT } from '@/data/employeeHierarchy';

const ALL_DESIGNATIONS = [...new Set(Object.values(DESIGNATIONS_BY_DEPARTMENT).flat())];

const STATUSES = ['', 'Active', 'On Leave', 'Terminated', 'Inactive'];

const STATUS_PILL: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  'On Leave': 'bg-amber-50 text-amber-700',
  Terminated: 'bg-red-50 text-red-600',
  Inactive: 'bg-gray-100 text-gray-600',
};

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CrmEmployees() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0, newThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setConfirmDeleteName('');
      return;
    }
    if (confirmDeleteName.trim().toLowerCase() !== 'delete') return;
    setConfirmDeleteId(null);
    setConfirmDeleteName('');
    setDeleting(true);
    try {
      await leadSupabase.employees.delete(id);
      await fetch();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to delete employee');
    } finally {
      setDeleting(false);
    }
  };

  const copyLoginLink = async () => {
    const url = `${window.location.origin}/employee-login`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  };

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [res, verify] = await Promise.all([
        leadSupabase.employees.list({ search, department: dept, status: statusFilter, designation: designationFilter }),
        leadSupabase.admin.verify().catch(() => ({ role: undefined as string | undefined })),
      ]);
      setIsEmployee(verify.role === 'employee');
      setData(res.data ?? []);
      setStats(res.stats ?? { total: 0, active: 0, onLeave: 0, newThisMonth: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, dept, statusFilter, designationFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = data.filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.name ?? '').toLowerCase().includes(q)
      || (e.email ?? '').toLowerCase().includes(q)
      || (e.employee_id ?? '').toLowerCase().includes(q)
      || (e.phone ?? '').includes(q);
  });

  if (isEmployee) return <Navigate to="/crm/my-clients" replace />;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Team"
            title="Employees"
            description="Manage employees, attendance, leaves & payroll"
            actions={
              <>
                <CrmBtn variant="ghost" onClick={copyLoginLink} title="Employees sign in with Google using their work email">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Link2 className="h-3.5 w-3.5" />}
                  {copied ? 'Link Copied!' : 'Copy Employee Login Link'}
                </CrmBtn>
                <CrmBtn variant="gold" onClick={() => navigate('/crm/employees/new')}>
                  <Plus className="h-3.5 w-3.5" /> Add Employee
                </CrmBtn>
              </>
            }
          />

          <CrmStatGrid>
            <MotionReveal delay={0}>
              <CrmStatCard icon={<Users className="h-5 w-5" strokeWidth={1.6} />} label="Total Employees" value={stats.total} tone="navy" />
            </MotionReveal>
            <MotionReveal delay={0.05}>
              <CrmStatCard icon={<CheckCircle className="h-5 w-5" strokeWidth={1.6} />} label="Active" value={stats.active} tone="emerald" />
            </MotionReveal>
            <MotionReveal delay={0.1}>
              <CrmStatCard icon={<UserMinus className="h-5 w-5" strokeWidth={1.6} />} label="On Leave" value={stats.onLeave} tone="amber" />
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <CrmStatCard icon={<Sparkles className="h-5 w-5" strokeWidth={1.6} />} label="New This Month" value={stats.newThisMonth} tone="gold" />
            </MotionReveal>
          </CrmStatGrid>

          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:flex-row sm:items-center sm:p-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="search"
                placeholder="Search by name, email, ID or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${CRM_INPUT} border-0 pl-9 focus:ring-0`}
              />
            </div>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className={`${CRM_INPUT} sm:w-auto`}>
              <option value="">All Departments</option>
              {DEPARTMENTS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={designationFilter} onChange={(e) => setDesignationFilter(e.target.value)} className={`${CRM_INPUT} sm:w-auto`}>
              <option value="">All Designations</option>
              {ALL_DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${CRM_INPUT} sm:w-auto`}>
              <option value="">All Status</option>
              {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center">
              <Briefcase className="mx-auto mb-3 h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="text-sm text-[#6b7280]">{data.length === 0 ? 'No employees yet. Add your first employee.' : 'No matching employees found.'}</p>
            </div>
          ) : (
            <MotionReveal>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filtered.map((e: any) => (
                  <div
                    key={e.id}
                    onClick={() => navigate(`/crm/employees/${e.id}`)}
                    className="cursor-pointer rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(10,22,40,0.05)] transition-shadow active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0A1628] to-[#1E3852] text-[11px] font-extrabold text-[#D6B85D]">
                        {initials(e.name || 'U')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[14px] font-bold text-[#111827]">{e.name || 'Unnamed'}</p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${STATUS_PILL[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status || 'Active'}</span>
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                              disabled={deleting}
                              title="Delete employee"
                              className="rounded-lg p-1.5 text-[#9ca3af] transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-0.5 font-mono text-[10.5px] text-[#96782A]">{e.employee_id}</p>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-[#6b7280]">
                          <span>{e.designation || '—'}</span>
                          <span className="text-[#C9A84C]/80">·</span>
                          <span>{e.department || '—'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-sm">
                    <thead className="border-b border-black/[0.06] bg-[#fafafa]">
                      <tr>
                        {['Employee ID', 'Name', 'Designation', 'Department', 'Logins', 'Joining Date', 'Status', 'Delete'].map((h) => (
                          <th key={h} className="px-4 py-3.5 text-left text-[10.5px] font-bold uppercase tracking-[1px] text-[#6b7280] lg:px-6">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((e: any) => (
                        <tr
                          key={e.id}
                          onClick={() => navigate(`/crm/employees/${e.id}`)}
                          className="cursor-pointer border-b border-black/[0.04] transition-colors hover:bg-[#C9A84C]/[0.05]"
                        >
                          <td className="px-4 py-4 font-mono text-sm text-[#96782A] lg:px-6">{e.employee_id}</td>
                          <td className="px-4 py-4 lg:px-6">
                            <p className="text-sm font-medium text-[#0A1628]">{e.name || 'Unnamed'}</p>
                            {e.email && <p className="text-xs text-[#6b7280]">{e.email}</p>}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#6b7280] lg:px-6">{e.designation || '—'}</td>
                          <td className="px-4 py-4 text-sm text-[#6b7280] lg:px-6">{e.department || '—'}</td>
                          <td className="px-4 py-4 lg:px-6">
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0A1628]">
                              <LogIn className="h-3.5 w-3.5 text-[#96782A]" strokeWidth={1.8} />
                              {e.login_count ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#6b7280] lg:px-6">
                            {e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td className="px-4 py-4 lg:px-6">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold ${STATUS_PILL[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                              {e.status || 'Active'}
                            </span>
                          </td>
                          <td className="px-4 py-4 lg:px-6">
                            <button
                              onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                              disabled={deleting}
                              title="Delete employee"
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold text-[#9ca3af] transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </MotionReveal>
          )}
        </CrmPageBody>
      </main>

      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setConfirmDeleteId(null); setConfirmDeleteName(''); }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e2) => e2.stopPropagation()}>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <h3 className="text-center font-['Inter',sans-serif] text-[17px] font-bold text-[#0A1628]">
              Delete {data.find((d) => d.id === confirmDeleteId)?.name || 'this employee'}?
            </h3>
            <p className="mx-auto mt-1.5 max-w-xs text-center text-xs leading-relaxed text-[#6b7280]">
              This permanently removes the employee and all their history, attendance, leaves and payroll records. This cannot be undone.
            </p>
            <div className="mt-5">
              <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">Type <span className="text-red-600">delete</span> to confirm</label>
              <input
                type="text"
                placeholder='Type "delete" here'
                value={confirmDeleteName}
                onChange={(e2) => setConfirmDeleteName(e2.target.value)}
                onKeyDown={(e2) => { if (e2.key === 'Enter' && confirmDeleteName.trim().toLowerCase() === 'delete') { handleDelete(confirmDeleteId); } }}
                className={`${CRM_INPUT} border-red-200 focus:border-red-400 focus:ring-red-200`}
                autoFocus
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => { setConfirmDeleteId(null); setConfirmDeleteName(''); }} className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-[#4b5563] transition-all hover:bg-black/[0.03]">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deleting || confirmDeleteName.trim().toLowerCase() !== 'delete'}
                className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-600 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
