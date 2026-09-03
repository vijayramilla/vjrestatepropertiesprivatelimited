import { useState } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader } from '@/components/crm/CrmUi';
import AttendanceDashboard from '@/components/crm/AttendanceDashboard';
import WeeklyTimesheet from '@/components/crm/WeeklyTimesheet';
import { Calendar, Clock } from 'lucide-react';

type Tab = 'live' | 'timesheet';

/**
 * Admin attendance page — Jibble-style.
 * Combines the live "who's in" dashboard with weekly timesheets.
 */
export default function CrmAttendance() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('live');

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Time & Attendance"
            title="Attendance"
            description="Live attendance dashboard, timesheets, and clock-in management"
          />

          {/* Tabs */}
          <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
            {[
              { key: 'live' as const, label: 'Live Dashboard', icon: Clock },
              { key: 'timesheet' as const, label: 'Weekly Timesheet', icon: Calendar },
            ].map((t) => {
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

          {tab === 'live' && <AttendanceDashboard />}
          {tab === 'timesheet' && <WeeklyTimesheet />}
        </CrmPageBody>
      </main>
    </div>
  );
}
