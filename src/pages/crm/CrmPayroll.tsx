import { useState } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import AdminPayrollPage from '@/pages/admin/AdminPayrollPage';
import { CrmPageBody, CrmPageHeader } from '@/components/crm/CrmUi';
import { Wallet } from 'lucide-react';

/** /crm/payroll — payroll inside the CRM shell (admins only).
 *  Reuses the shared payroll workspace (generation, history, summary,
 *  payslip previews & PDFs) that also powers the legacy /admin/payroll route.
 */
export default function CrmPayroll() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Finance"
            title="Payroll"
            description="Salary structures, monthly payroll runs, payslips & payment tracking"
            actions={
              <span className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] px-4 text-xs font-bold text-[#0A1628] shadow-[0_2px_8px_rgba(201,168,76,0.35)]">
                <Wallet className="h-3.5 w-3.5" /> Salary Month Run
              </span>
            }
          />
          <AdminPayrollPage embedded />
        </CrmPageBody>
      </main>
    </div>
  );
}
