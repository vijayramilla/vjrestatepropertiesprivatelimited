import { ArrowLeft, Download, MessageCircle } from 'lucide-react';
import type { SalaryStructure } from '@/utils/payrollCalculator';
import { numberToWords, getMonthName } from '@/utils/payrollCalculator';
import { formatINR } from '@/lib/inr';

interface Props {
  employee: any;
  salary: SalaryStructure;
  month: number;
  year: number;
  workingDays: number;
  daysWorked: number;
  lopDays: number;
  onBack: () => void;
  onDownload: () => void;
}

export default function PayslipPreview({ employee, salary, month, year, workingDays, daysWorked, lopDays, onBack, onDownload }: Props) {
  const monthName = getMonthName(month);

  const handleWhatsApp = () => {
    const msg = `Dear ${employee?.name || 'Employee'},\n\nYour payslip for ${monthName} ${year} has been generated.\n\nNet Pay: ${formatINR(salary.netPay)}\n\nPlease contact HR for queries.\n\n\u2014 VJR Estate`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] antialiased">
      {/* Action bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/[0.06] bg-white/90 px-6 py-3 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-[#6b7280] hover:text-[#0A1628] transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleWhatsApp} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </button>
          <button onClick={onDownload} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#b8943f] px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110">
            <Download className="h-3.5 w-3.5" /> Download PDF
          </button>
        </div>
      </div>

      {/* Payslip card */}
      <div className="mx-auto max-w-2xl py-8">
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)]">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white">VJR ESTATE</h1>
                <p className="text-[10px] text-[#C9A84C]">Properties Pvt. Ltd.</p>
                <p className="text-[10px] text-gray-400">Bangalore, Karnataka, India</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">PAYSLIP</p>
                <p className="text-[11px] text-[#C9A84C]">{monthName} {year}</p>
                <p className="text-[10px] text-gray-400">Generated: {new Date().toLocaleDateString('en-IN')}</p>
              </div>
            </div>
          </div>
          <div className="h-1 bg-[#C9A84C]" />

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-3 p-5">
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">Employee Details</p>
              {[
                ['ID', employee?.employee_id || employee?.id || '\u2014'],
                ['Name', employee?.name || '\u2014'],
                ['Designation', employee?.designation || '\u2014'],
                ['Department', employee?.department || '\u2014'],
                ['Joining', employee?.joining_date ? new Date(employee.joining_date).toLocaleDateString('en-IN') : '\u2014'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-0.5">
                  <span className="text-[10px] text-[#6b7280]">{l}</span>
                  <span className="text-[10px] font-semibold text-[#0A1628]">{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-[#f8f9fa] p-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#C9A84C]">Bank & Compliance</p>
              {[
                ['Account', employee?.bank_account_number || 'XXXXXX1234'],
                ['Bank', employee?.bank_name || '\u2014'],
                ['IFSC', employee?.ifsc_code || '\u2014'],
                ['PAN', employee?.pan_number || '\u2014'],
                ['UAN', employee?.uan_number || '\u2014'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between py-0.5">
                  <span className="text-[10px] text-[#6b7280]">{l}</span>
                  <span className="text-[10px] font-semibold text-[#0A1628]">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance bar */}
          <div className="mx-5 flex items-center justify-between rounded-xl bg-[#0A1628] px-4 py-3">
            {[
              { label: 'Working Days', val: workingDays },
              { label: 'Days Worked', val: daysWorked },
              { label: 'LOP Days', val: lopDays },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="text-sm font-bold text-[#C9A84C]">{val}</p>
                <p className="text-[9px] text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* Earnings & Deductions */}
          <div className="grid grid-cols-2 gap-0 p-5">
            {/* Earnings */}
            <div>
              <div className="rounded-t-lg bg-[#0A1628] px-3 py-1.5">
                <p className="text-[10px] font-bold text-[#C9A84C]">EARNINGS</p>
              </div>
              {[
                ['Basic Pay', salary.basicPay],
                ['HRA', salary.hra],
                ['Conveyance', salary.conveyanceAllowance],
                ['Medical', salary.medicalAllowance],
                ...(salary.specialAllowance > 0 ? [['Special Allowance', salary.specialAllowance] as [string, number]] : []),
                ...(salary.incentive > 0 ? [['Incentive', salary.incentive] as [string, number]] : []),
                ...(salary.performanceBonus > 0 ? [['Performance Bonus', salary.performanceBonus] as [string, number]] : []),
              ].map(([label, val], i) => (
                <div key={String(label)} className={`flex justify-between px-3 py-1.5 text-[11px] ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                  <span className="text-[#6b7280]">{label}</span>
                  <span className="font-semibold text-[#0A1628]">{formatINR(val as number)}</span>
                </div>
              ))}
              <div className="flex justify-between bg-[#0A1628] px-3 py-1.5 text-[11px]">
                <span className="font-bold text-white">GROSS</span>
                <span className="font-bold text-[#C9A84C]">{formatINR(salary.grossEarnings)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div className="rounded-t-lg bg-[#0A1628] px-3 py-1.5">
                <p className="text-[10px] font-bold text-[#C9A84C]">DEDUCTIONS</p>
              </div>
              {[
                ['PF (Employee 12%)', salary.employeePF],
                ...(salary.employeeESI > 0 ? [['ESI (0.75%)', salary.employeeESI] as [string, number]] : []),
                ...(salary.professionalTax > 0 ? [['Prof. Tax', salary.professionalTax] as [string, number]] : []),
                ...(salary.tds > 0 ? [['TDS', salary.tds] as [string, number]] : []),
                ...(salary.lopDeduction > 0 ? [['LOP', salary.lopDeduction] as [string, number]] : []),
                ...(salary.loanDeduction > 0 ? [['Loan', salary.loanDeduction] as [string, number]] : []),
                ...(salary.otherDeductions > 0 ? [['Other', salary.otherDeductions] as [string, number]] : []),
              ].map(([label, val], i) => (
                <div key={String(label)} className={`flex justify-between px-3 py-1.5 text-[11px] ${i % 2 === 0 ? 'bg-white' : 'bg-[#f8f9fa]'}`}>
                  <span className="text-[#6b7280]">{label}</span>
                  <span className="font-semibold text-red-500">-{formatINR(val as number)}</span>
                </div>
              ))}
              <div className="flex justify-between bg-[#0A1628] px-3 py-1.5 text-[11px]">
                <span className="font-bold text-white">TOTAL</span>
                <span className="font-bold text-red-400">-{formatINR(salary.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Employer contributions */}
          <div className="mx-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-700">Employer Contributions (paid by VJR Estate, not deducted)</p>
            <p className="text-[10px] text-emerald-600">
              PF: {formatINR(salary.employerPF)} &nbsp;|&nbsp; ESI: {formatINR(salary.employerESI)} &nbsp;|&nbsp; Gratuity: {formatINR(Math.round(salary.basicPay * 0.0481))}
            </p>
          </div>

          {/* Net Pay */}
          <div className="mx-5 my-4 rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#b8943f] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#0A1628]">Net Pay (Take Home)</p>
                <p className="mt-1 text-[11px] text-[#0A1628]/70">{numberToWords(salary.netPay)}</p>
              </div>
              <p className="text-2xl font-bold text-[#0A1628]">{formatINR(salary.netPay)}</p>
            </div>
          </div>

          {/* YTD */}
          <div className="mx-5 mb-5 rounded-xl bg-[#f8f9fa] p-3">
            <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0A1628]">Year to Date (YTD)</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'YTD Gross', value: salary.grossEarnings * month },
                { label: 'YTD PF', value: salary.employeePF * month },
                { label: 'YTD Net Pay', value: salary.netPay * month },
              ].map((r) => (
                <div key={r.label} className="text-center">
                  <p className="text-[11px] font-bold text-[#0A1628]">{formatINR(r.value)}</p>
                  <p className="text-[9px] text-[#6b7280]">{r.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-[#0A1628] px-6 py-3 text-center">
            <p className="text-[9px] font-bold text-[#C9A84C]">VJR Estate Properties Pvt. Ltd.</p>
            <p className="text-[8px] text-gray-500">This is a computer-generated payslip. CONFIDENTIAL.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
