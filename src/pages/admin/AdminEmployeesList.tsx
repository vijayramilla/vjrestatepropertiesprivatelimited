import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminBadge } from '@/components/admin/AdminUi';
import { leadSupabase } from '@/services/leadSupabase';
import { motion } from 'framer-motion';
import { Plus, MagnifyingGlass, Users, CheckCircle } from 'phosphor-react';

const DEPARTMENTS = ['', 'Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'IT', 'Legal'];
const STATUSES = ['', 'Active', 'On Leave', 'Terminated', 'Inactive'];

const statusBadge = (s: string) => {
  if (s === 'Active') return 'success' as const;
  if (s === 'On Leave') return 'default' as const;
  if (s === 'Terminated') return 'muted' as const;
  return 'default' as const;
};

export default function AdminEmployeesList() {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, onLeave: 0, newThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadSupabase.employees.list({ search, department: dept, status: statusFilter });
      setData(res.data ?? []);
      setStats(res.stats ?? { total: 0, active: 0, onLeave: 0, newThisMonth: 0 });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, dept, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = data.filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (e.name ?? '').toLowerCase().includes(q)
      || (e.email ?? '').toLowerCase().includes(q)
      || (e.employee_id ?? '').toLowerCase().includes(q)
      || (e.phone ?? '').includes(q);
  });

  const statCards = [
    { label: 'Total Employees', value: stats.total, icon: Users, color: 'text-black' },
    { label: 'Active', value: stats.active, icon: CheckCircle, color: 'text-green-600' },
    { label: 'On Leave', value: stats.onLeave, icon: Users, color: 'text-amber-600' },
    { label: 'New This Month', value: stats.newThisMonth, icon: Users, color: 'text-blue-600' },
  ];

  return (
    <AdminLayout title="Employees">
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-black sm:text-3xl">Employees</h1>
            <p className="mt-1 font-sans text-sm text-gray-600">Manage employees, attendance, leaves & payroll</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/employees/new')}
            className="flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-4 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus size={18} />
            Add Employee
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <s.icon size={18} className="text-gray-400" />
                <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">{s.label}</p>
              </div>
              <p className={`mt-2 font-serif text-2xl font-bold sm:text-3xl ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search by name, email, ID or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] w-full border-0 border-b border-gray-300 bg-transparent pl-8 pb-2 font-sans text-base outline-none focus:border-black sm:text-sm"
            />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="min-h-[44px] w-full border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black sm:w-auto">
            <option value="">All Departments</option>
            {DEPARTMENTS.filter(Boolean).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="min-h-[44px] w-full border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black sm:w-auto">
            <option value="">All Status</option>
            {STATUSES.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse border border-gray-200 bg-white" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-gray-200 bg-white p-8 text-center text-gray-500 sm:p-12">
            {data.length === 0 ? 'No employees yet. Add your first employee.' : 'No matching employees found.'}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {filtered.map((e: any) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate(`/admin/employees/${e.id}`)}
                  className="w-full border border-gray-200 bg-white p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-sans text-sm font-medium text-black">{e.name || 'Unnamed'}</p>
                    <AdminBadge variant={statusBadge(e.status)}>{e.status || 'Active'}</AdminBadge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-xs text-gray-600">
                    <span>{e.employee_id}</span>
                    <span>{e.designation || '-'}</span>
                    <span>{e.department || '-'}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      {['Employee ID', 'Name', 'Designation', 'Department', 'Joining Date', 'Status'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700 lg:px-6">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e: any, i: number) => (
                      <motion.tr
                        key={e.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                        onClick={() => navigate(`/admin/employees/${e.id}`)}
                      >
                        <td className="px-4 py-4 font-mono text-sm text-gray-700 lg:px-6">{e.employee_id}</td>
                        <td className="px-4 py-4 lg:px-6">
                          <p className="text-sm font-medium text-black">{e.name || 'Unnamed'}</p>
                          {e.email && <p className="text-xs text-gray-500">{e.email}</p>}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">{e.designation || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">{e.department || '-'}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 lg:px-6">
                          {e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-4 lg:px-6">
                          <AdminBadge variant={statusBadge(e.status)}>{e.status || 'Active'}</AdminBadge>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}