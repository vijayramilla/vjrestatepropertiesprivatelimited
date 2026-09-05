import { useState, useEffect, useCallback } from 'react';
import { Wallet, Calendar, Download, Filter, ChevronDown, ChevronUp, Loader2, FileText, TrendingUp, Users, IndianRupee, Eye } from 'lucide-react';
import { leadSupabase } from '@/services/leadSupabase';
import { buildSalaryStructure, type SalaryStructure } from '@/utils/payrollCalculator';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import PayslipPreview from '@/components/payroll/PayslipPreview';
import { CRM_INPUT, CrmBtn } from '@/components/crm/CrmUi';
import { formatINR } from '@/lib/inr';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type Tab = 'generate' | 'history' | 'summary';

interface PayrollRow {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  basic_pay: number;
  hra: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  status: string;
  payment_date?: string;
}

interface EmployeeRow {
  id: string;
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  salary: number;
  status: string;
}

export default function AdminPayrollPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>('generate');
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [allPayroll, setAllPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [deptFilter, setDeptFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, { lopDays: number; incentive: number; bonus: number; loan: number; otherDeductions: number; otherAllowances: number }>>({});

  // Preview state
  const [previewEmployee, setPreviewEmployee] = useState<EmployeeRow | null>(null);
  const [previewSalary, setPreviewSalary] = useState<SalaryStructure | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes] = await Promise.all([
        leadSupabase.employees.list({ status: 'Active' }),
      ]);
      setEmployees((empRes.data ?? []).filter((e: EmployeeRow) => e.salary && Number(e.salary) > 0 && e.status !== 'Terminated'));
      // Fetch payroll records for all employees
      const allPay: PayrollRow[] = [];
      for (const emp of (empRes.data ?? [])) {
        try {
          const res = await leadSupabase.employees.payroll(emp.id);
          for (const p of (res.data ?? [])) {
            allPay.push({ ...p, employee_name: emp.name, employee_id: emp.employee_id, designation: emp.designation, department: emp.department } as any);
          }
        } catch { /* skip */ }
      }
      setAllPayroll(allPay);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredEmployees = employees.filter((e) => !deptFilter || e.department === deptFilter);
  const departments = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  const getPayForEmp = (empId: string) =>
    allPayroll.find((p: any) => p.employee_id === empId && p.month === selectedMonth && p.year === selectedYear);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
    }
  };

  const getInput = (empId: string) =>
    inputs[empId] ?? { lopDays: 0, incentive: 0, bonus: 0, loan: 0, otherDeductions: 0, otherAllowances: 0 };

  const updateInput = (empId: string, field: string, value: number) => {
    setInputs((prev) => ({
      ...prev,
      [empId]: { ...getInput(empId), [field]: value },
    }));
  };

  const buildSalary = (emp: EmployeeRow, empInput?: ReturnType<typeof getInput>): SalaryStructure => {
    const inp = empInput ?? getInput(emp.id);
    return buildSalaryStructure(
      Number(emp.salary) || 0,
      inp.incentive,
      inp.bonus,
      inp.lopDays,
      26,
      inp.loan,
      inp.otherDeductions,
      inp.otherAllowances,
    );
  };

  const handlePreview = (emp: EmployeeRow) => {
    const salary = buildSalary(emp);
    setPreviewEmployee(emp);
    setPreviewSalary(salary);
  };

  const handleDownloadPDF = async (emp: EmployeeRow) => {
    const salary = buildSalary(emp);
    const inp = getInput(emp.id);
    await generatePayslipPDF(
      emp as any,
      {
        month: selectedMonth,
        year: selectedYear,
        workingDays: 26,
        daysWorked: 26 - inp.lopDays,
        lopDays: inp.lopDays,
        incentive: inp.incentive,
        performanceBonus: inp.bonus,
        loanDeduction: inp.loan,
        otherDeductions: inp.otherDeductions,
        otherAllowances: inp.otherAllowances,
      },
      salary,
    );
  };

  const handleGenerateSelected = async () => {
    const toGenerate = filteredEmployees.filter((e) => selectedIds.has(e.id));
    if (toGenerate.length === 0) return alert('Select at least one employee.');
    setGenerating(true);
    let success = 0;
    for (const emp of toGenerate) {
      try {
        const existing = getPayForEmp(emp.id);
        if (existing) continue; // already generated
        const salary = buildSalary(emp);
        const inp = getInput(emp.id);
        await leadSupabase.employees.generatePayroll(emp.id, selectedMonth, selectedYear);
        await generatePayslipPDF(
          emp as any,
          { month: selectedMonth, year: selectedYear, workingDays: 26, daysWorked: 26 - inp.lopDays, lopDays: inp.lopDays, incentive: inp.incentive, performanceBonus: inp.bonus, loanDeduction: inp.loan, otherDeductions: inp.otherDeductions, otherAllowances: inp.otherAllowances },
          salary,
        );
        success++;
      } catch (e: any) {
        console.error(`Payroll failed for ${emp.name}:`, e);
      }
    }
    setGenerating(false);
    alert(`Generated payslips for ${success} employee(s).`);
    fetchData();
  };

  // Summary stats
  const currentMonthPay = allPayroll.filter((p: any) => p.month === selectedMonth && p.year === selectedYear);
  const totalGross = currentMonthPay.reduce((s: number, p: any) => s + Number(p.basic_pay ?? 0) + Number(p.hra ?? 0) + Number(p.allowances ?? 0), 0);
  const totalDeductions = currentMonthPay.reduce((s: number, p: any) => s + Number(p.deductions ?? 0), 0);
  const totalNet = currentMonthPay.reduce((s: number, p: any) => s + Number(p.net_pay ?? 0), 0);

  // ─── PREVIEW MODE ──────────────────────────────────
  if (previewEmployee && previewSalary) {
    return (
      <PayslipPreview
        employee={previewEmployee}
        salary={previewSalary}
        month={selectedMonth}
        year={selectedYear}
        workingDays={26}
        daysWorked={26 - getInput(previewEmployee.id).lopDays}
        lopDays={getInput(previewEmployee.id).lopDays}
        onBack={() => { setPreviewEmployee(null); setPreviewSalary(null); }}
        onDownload={async () => {
          await handleDownloadPDF(previewEmployee);
          setPreviewEmployee(null);
          setPreviewSalary(null);
        }}
      />
    );
  }

  return (
    <div className={embedded ? '' : "min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] antialiased"}>
      <div className={embedded ? '' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'}>
        {/* Header */}
        {!embedded && <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A1628] to-[#1E3852]">
              <Wallet className="h-5 w-5 text-[#C9A84C]" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#0A1628]">Payroll Management</h1>
              <p className="text-xs text-[#6b7280]">Generate payslips, track history, and view summaries</p>
            </div>
          </div>
        </div>}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-black/[0.06] bg-white p-1 shadow-sm">
          {([
            { key: 'generate', label: 'Generate Payslips', icon: FileText },
            { key: 'history', label: 'Payroll History', icon: Calendar },
            { key: 'summary', label: 'Summary', icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${
                tab === key ? 'bg-[#0A1628] text-white shadow-md' : 'text-[#6b7280] hover:bg-[#f8f9fa]'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {/* Month/Year + Dept Filter */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className={`${CRM_INPUT} !w-auto`}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className={`${CRM_INPUT} !w-auto`}>
            {[2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className={`${CRM_INPUT} !w-auto`}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* ─── TAB: GENERATE ──────────────────────────── */}
        {tab === 'generate' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#0A1628]">
                <input type="checkbox" checked={selectedIds.size === filteredEmployees.length && filteredEmployees.length > 0} onChange={toggleSelectAll} className="accent-[#C9A84C]" />
                Select All ({selectedIds.size}/{filteredEmployees.length})
              </label>
              <CrmBtn variant="gold" onClick={handleGenerateSelected} disabled={generating || selectedIds.size === 0}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {generating ? 'Generating...' : `Generate & Download (${selectedIds.size})`}
              </CrmBtn>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl border border-black/[0.05] bg-white" />)}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="rounded-2xl border border-black/[0.05] bg-white p-12 text-center text-sm text-[#6b7280]">
                No employees with salary set. Add salary on employee profiles first.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEmployees.map((emp) => {
                  const exists = getPayForEmp(emp.id);
                  const expanded = expandedId === emp.id;
                  const inp = getInput(emp.id);
                  const salary = buildSalary(emp);

                  return (
                    <div key={emp.id} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(emp.id)}
                          onChange={() => toggleSelect(emp.id)}
                          disabled={!!exists}
                          className="accent-[#C9A84C]"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0A1628]">{emp.name}</p>
                          <p className="text-[10px] text-[#6b7280]">{emp.employee_id} &middot; {emp.designation} &middot; {emp.department}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#0A1628]">CTC: {formatINR(Number(emp.salary) || 0)}/mo</p>
                          <p className="text-[10px] font-semibold text-emerald-600">Net: {formatINR(salary.netPay)}</p>
                        </div>
                        {exists ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">Generated</span>
                        ) : (
                          <button onClick={() => setExpandedId(expanded ? null : emp.id)} className="rounded-lg p-1.5 text-[#6b7280] hover:bg-[#f8f9fa]">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        )}
                      </div>

                      {expanded && !exists && (
                        <div className="border-t border-black/[0.04] bg-[#fafafa] px-4 py-3">
                          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
                            {[
                              { label: 'LOP Days', field: 'lopDays', max: 26 },
                              { label: 'Incentive', field: 'incentive', max: 999999 },
                              { label: 'Bonus', field: 'bonus', max: 999999 },
                              { label: 'Loan Deduction', field: 'loan', max: 999999 },
                              { label: 'Other Deductions', field: 'otherDeductions', max: 999999 },
                              { label: 'Other Allowances', field: 'otherAllowances', max: 999999 },
                            ].map(({ label, field, max }) => (
                              <div key={field}>
                                <label className="mb-1 block text-[9px] font-bold uppercase tracking-[0.1em] text-[#9ca3af]">{label}</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={max}
                                  value={(inp as any)[field] || 0}
                                  onChange={(e) => updateInput(emp.id, field, Math.min(Number(e.target.value) || 0, max))}
                                  className="w-full rounded-lg border border-black/[0.08] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A1628]"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <CrmBtn variant="ghost" onClick={() => handlePreview(emp)}>
                              <Eye className="h-3.5 w-3.5" /> Preview
                            </CrmBtn>
                            <CrmBtn variant="gold" onClick={async () => { await handleDownloadPDF(emp); setExpandedId(null); fetchData(); }}>
                              <Download className="h-3.5 w-3.5" /> Generate PDF
                            </CrmBtn>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: HISTORY ───────────────────────────── */}
        {tab === 'history' && (
          <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-black/[0.06] bg-[#fafafa]">
                  <tr>
                    {['Period', 'Employee', 'Department', 'Gross', 'Deductions', 'Net Pay', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-[1px] text-[#6b7280]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentMonthPay.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-[#6b7280]">No payroll records for {MONTHS[selectedMonth - 1]} {selectedYear}.</td></tr>
                  ) : currentMonthPay.map((p: any) => (
                    <tr key={p.id} className="border-b border-black/[0.04]">
                      <td className="px-4 py-3 text-xs text-[#6b7280]">{MONTHS[p.month - 1]} {p.year}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-[#0A1628]">{p.employee_name || p.employee_id}</td>
                      <td className="px-4 py-3 text-xs text-[#6b7280]">{p.department || '\u2014'}</td>
                      <td className="px-4 py-3 text-xs text-[#0A1628]">{formatINR(Number(p.basic_pay ?? 0) + Number(p.hra ?? 0) + Number(p.allowances ?? 0))}</td>
                      <td className="px-4 py-3 text-xs text-red-500">{formatINR(Number(p.deductions ?? 0))}</td>
                      <td className="px-4 py-3 text-xs font-bold text-[#0A1628]">{formatINR(Number(p.net_pay ?? 0))}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span>
                          {p.status === 'Pending' && (
                            <button
                              onClick={async () => {
                                if (!confirm(`Mark ${p.employee_name || 'this'} payroll as Paid?`)) return;
                                try {
                                  await leadSupabase.employees.markPaid(p.id);
                                  const today = new Date().toISOString().split('T')[0];
                                  setAllPayroll((prev) => prev.map((x) => x.id === p.id ? { ...x, status: 'Paid', payment_date: today } : x));
                                } catch (e: any) {
                                  alert(e?.message ?? 'Failed to mark as paid');
                                }
                              }}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                              Mark Paid
                            </button>
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

        {/* ─── TAB: SUMMARY ───────────────────────────── */}
        {tab === 'summary' && (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Total Employees', value: String(currentMonthPay.length), icon: Users },
                { label: 'Total Gross', value: formatINR(totalGross), icon: IndianRupee },
                { label: 'Total Deductions', value: formatINR(totalDeductions), icon: Filter },
                { label: 'Total Net Pay', value: formatINR(totalNet), icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A1628]/5">
                    <Icon className="h-4 w-4 text-[#C9A84C]" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9ca3af]">{label}</p>
                  <p className="mt-0.5 text-sm font-bold text-[#0A1628]">{value}</p>
                </div>
              ))}
            </div>

            {/* Department breakdown */}
            <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.1em] text-[#0A1628]">Department Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-black/[0.06]">
                    <tr>
                      {['Department', 'Employees', 'Gross', 'Deductions', 'Net Pay'].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[1px] text-[#6b7280]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map((dept) => {
                      const deptPay = currentMonthPay.filter((p: any) => (p.department || '\u2014') === dept);
                      if (deptPay.length === 0) return null;
                      return (
                        <tr key={dept} className="border-b border-black/[0.04]">
                          <td className="px-3 py-2 text-xs font-semibold text-[#0A1628]">{dept || '\u2014'}</td>
                          <td className="px-3 py-2 text-xs text-[#6b7280]">{deptPay.length}</td>
                          <td className="px-3 py-2 text-xs text-[#0A1628]">{formatINR(deptPay.reduce((s: number, p: any) => s + Number(p.basic_pay ?? 0) + Number(p.hra ?? 0) + Number(p.allowances ?? 0), 0))}</td>
                          <td className="px-3 py-2 text-xs text-red-500">{formatINR(deptPay.reduce((s: number, p: any) => s + Number(p.deductions ?? 0), 0))}</td>
                          <td className="px-3 py-2 text-xs font-bold text-[#0A1628]">{formatINR(deptPay.reduce((s: number, p: any) => s + Number(p.net_pay ?? 0), 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
