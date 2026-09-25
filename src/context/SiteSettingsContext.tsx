import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { subscribeToSettings, updateSiteSettings, type SiteSettings } from '@/lib/siteSettings';

interface SiteSettingsContextValue {
  nexaEnabled: boolean;
  loading: boolean;
  toggling: boolean;
  error: string | null;
  toggleNexaEnabled: () => Promise<void>;
  clearError: () => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({ nexaEnabled: true });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    // Performance: start the settings subscription after the page is painted
    // (idle callback) so Firestore init never competes with route rendering
    // for the main thread during load. A cached local value is applied
    // synchronously when the subscription starts, so the flag resolves fast.
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      unsubscribe = subscribeToSettings((newSettings) => {
        setSettings(newSettings);
        setLoading(false);
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(start, { timeout: 2000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
        unsubscribe?.();
      };
    }

    const timer = window.setTimeout(start, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsubscribe?.();
    };
  }, []);

  const toggleNexaEnabled = useCallback(async () => {
    setError(null);
    setToggling(true);
    try {
      await updateSiteSettings({ nexaEnabled: !settingsRef.current.nexaEnabled });
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
        nexaEnabled: settings.nexaEnabled,
        loading,
        toggling,
        error,
        toggleNexaEnabled,
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
