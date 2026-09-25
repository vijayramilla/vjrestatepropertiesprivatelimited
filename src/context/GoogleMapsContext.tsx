import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface MapsRuntimeValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  requestMaps: () => void;
}

interface GoogleMapsContextValue extends MapsRuntimeValue {
  /** Ask the provider to start loading the SDK (idempotent). */
  requestMaps: () => void;
}

/**
 * Surfaces that need the Maps JS SDK at startup. Only genuine map surfaces
 * belong here — surfaces that merely use Places autocomplete for locality
 * search should call requestMaps() when their search UI opens instead, so
 * the SDK never blocks first paint of the main browsing journey.
 */
const EAGER_MAPS_ROUTES = [/^\/list-property/];

export const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
  // Idle value MUST carry the real requestMaps: a noop here made the first
  // deferred requestMaps() call silently do nothing, so the SDK never
  // loaded, Places suggestions never appeared, and map surfaces were stuck
  // on their loading state forever.
  requestMaps: () => {
    throw new Error('requestMaps called outside of GoogleMapsProvider');
  },
});

/**
 * Performance: the Maps JS SDK used to load on EVERY page because the
 * provider statically imported @react-google-maps/api. The loader now lives
 * in its own module that is dynamically imported only after requestMaps() —
 * removing the wrapper library AND its script-injection side effects from
 * the initial payload entirely.
 *
 * The loader chunk mounts as a SIBLING (not a wrapper) of the app subtree:
 * wrapping children in <Loader>{children}</Loader> changed the element type
 * at that position when the SDK finished loading, which remounted the whole
 * app mid-session — wiping typed search text, selected locality chips and
 * scroll position on the properties page at exactly the wrong moment.
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState<boolean>(() =>
    EAGER_MAPS_ROUTES.some((re) => re.test(window.location.pathname)),
  );
  const [loaderNode, setLoaderNode] = useState<ReactNode>(null);

  const requestMaps = useCallback(() => setRequested(true), []);

  const runtime = useMemo(
    () => ({ isLoaded: false, loadError: undefined, requestMaps }),
    [requestMaps],
  );

  useEffect(() => {
    if (!requested) return;
    let cancelled = false;
    import('./MapsLoader').then((m) => {
      // Sibling placement keeps the app subtree mounted — no remount.
      if (!cancelled) setLoaderNode(<m.default requestMaps={requestMaps} />);
    });
    return () => {
      cancelled = true;
    };
  }, [requested]);

  return (
    <GoogleMapsContext.Provider value={runtime}>
      {children}
      {loaderNode}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMapsLoader() {
  return useContext(GoogleMapsContext);
}
