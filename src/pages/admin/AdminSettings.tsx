import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { AdminPageShell, AdminPageHeader } from '@/components/admin/AdminUi';

export default function AdminSettings() {
  const { mapOnly, toggling, error, toggleMapOnly } = useSiteSettings();

  return (
    <AdminPageShell>
      <AdminPageHeader title="Site Settings" eyebrow="Admin" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="admin-section max-w-3xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-black">Map Only Mode</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  mapOnly
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {mapOnly ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, only the Land Map page will be visible to users.
              All other pages, header, and footer will be hidden.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleMapOnly}
            disabled={toggling}
            className={`admin-toggle ${mapOnly ? 'admin-toggle-on' : 'admin-toggle-off'} ${
              toggling ? 'animate-pulse cursor-wait opacity-60' : 'cursor-pointer'
            }`}
            role="switch"
            aria-checked={mapOnly}
          >
            <span
              className={`admin-toggle-knob ${mapOnly ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {mapOnly && !error && (
          <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-yellow-600" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Map Only Mode is active</p>
                <p className="mt-1">
                  Users will only see the Land Map page without header, footer, or navigation.
                  They will be redirected to the map regardless of which URL they visit.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AdminPageShell>
  );
}
