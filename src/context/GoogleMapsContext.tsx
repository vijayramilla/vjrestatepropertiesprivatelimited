import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { type MapsRuntimeValue } from './MapsLoader';

interface GoogleMapsContextValue extends MapsRuntimeValue {
  /** Ask the provider to start loading the SDK (idempotent). */
  requestMaps: () => void;
}

const IDLE_VALUE: GoogleMapsContextValue = {
  isLoaded: false,
  loadError: undefined,
  requestMaps: () => {},
};

/**
 * Surfaces that need the Maps JS SDK at startup. Only genuine map surfaces
 * belong here — surfaces that merely use Places autocomplete for locality
 * search should call requestMaps() when their search UI opens instead, so
 * the SDK never blocks first paint of the main browsing journey.
 */
const EAGER_MAPS_ROUTES = [/^\/list-property/];

/**
 * Performance: the Maps JS SDK used to load on EVERY page because the
 * provider statically imported @react-google-maps/api. The loader now lives
 * in its own module that is dynamically imported only after requestMaps() —
 * removing the wrapper library AND its script-injection side effects from
 * the initial payload entirely.
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState<boolean>(() =>
    EAGER_MAPS_ROUTES.some((re) => re.test(window.location.pathname)),
  );
  const [Loader, setLoader] = useState<
    | ((props: { requestMaps: () => void; children: ReactNode }) => JSX.Element | null)
    | null
  >(null);

  const requestMaps = useCallback(() => setRequested(true), []);

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    import('./MapsLoader').then((m) => {
      if (!cancelled) setLoader(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, [requested]);

  // gm_authFailure passthrough (same behaviour as before).
  useEffect(() => {
    const w = window as unknown as Record<string, (() => void) | undefined>;
    const key = 'gm_authFailure';
    const existing = w[key];
    w[key] = () => {
      console.error('[Maps] gm_authFailure fired — API key rejected or billing disabled');
      if (typeof existing === 'function') existing();
    };
    return () => {
      w[key] = existing;
    };
  }, []);

  const value: GoogleMapsContextValue = requested
    ? { isLoaded: false, loadError: undefined, requestMaps } // replaced by loader's context below
    : IDLE_VALUE;

  return (
    <GoogleMapsContext.Provider value={value}>
      {requested && Loader ? (
        <Loader requestMaps={requestMaps}>{children}</Loader>
      ) : (
        children
      )}
    </GoogleMapsContext.Provider>
  );
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>(IDLE_VALUE);

export function useGoogleMapsLoader() {
  return useContext(GoogleMapsContext);
}
