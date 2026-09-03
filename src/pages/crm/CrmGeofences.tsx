import { useState } from 'react';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader } from '@/components/crm/CrmUi';
import GeofenceManager from '@/components/crm/GeofenceManager';

/**
 * Admin geofences page.
 * Manage geofences that restrict where employees can clock in.
 */
export default function CrmGeofences() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Location"
            title="Geofences"
            description="Define approved clock-in locations for your team"
          />
          <GeofenceManager />
        </CrmPageBody>
      </main>
    </div>
  );
}
