import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { AdminPageShell, AdminPageHeader } from '@/components/admin/AdminUi';

export default function AdminSettings() {
  const { nexaEnabled, toggling, error, toggleNexaEnabled } = useSiteSettings();

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
              <h2 className="text-lg font-medium text-black">Nexa AI Assistant</h2>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  nexaEnabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {nexaEnabled ? 'Visible' : 'Hidden'}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              When enabled, the Nexa chatbot button is visible to users across the
              website. Turn it off to hide the bot completely.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleNexaEnabled}
            disabled={toggling}
            className={`admin-toggle ${nexaEnabled ? 'admin-toggle-on' : 'admin-toggle-off'} ${
              toggling ? 'animate-pulse cursor-wait opacity-60' : 'cursor-pointer'
            }`}
            role="switch"
            aria-checked={nexaEnabled}
            aria-label="Toggle Nexa AI Assistant visibility"
          >
            <span
              className={`admin-toggle-knob ${nexaEnabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!nexaEnabled && !error && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-start gap-3">
              <Bot size={20} className="mt-0.5 shrink-0 text-gray-500" />
              <div className="text-sm text-gray-600">
                <p className="font-medium">Nexa is hidden</p>
                <p className="mt-1">
                  The chatbot button will not appear anywhere on the website until
                  this setting is turned back on.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AdminPageShell>
  );
}
