import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { subscribeToSettings, updateSiteSettings, type SiteSettings } from '@/lib/siteSettings';

interface SiteSettingsContextValue {
  mapOnly: boolean;
  loading: boolean;
  toggling: boolean;
  error: string | null;
  toggleMapOnly: () => Promise<void>;
  clearError: () => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({ mapOnly: false });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const unsubscribe = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const toggleMapOnly = useCallback(async () => {
    setError(null);
    setToggling(true);
    try {
      await updateSiteSettings({ mapOnly: !settingsRef.current.mapOnly });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update setting';
      setError(msg);
    } finally {
      setToggling(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SiteSettingsContext.Provider
      value={{
        mapOnly: settings.mapOnly,
        loading,
        toggling,
        error,
        toggleMapOnly,
        clearError,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx) throw new Error('useSiteSettings must be used within SiteSettingsProvider');
  return ctx;
}
