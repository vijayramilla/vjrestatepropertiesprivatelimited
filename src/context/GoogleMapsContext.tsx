import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LOADER_ID = 'vjr-google-maps-loader';
const GOOGLE_MAPS_LIBRARIES = ['places'] as const;

interface GoogleMapsContextValue {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextValue>({
  isLoaded: false,
  loadError: undefined,
});

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  const configError =
    !googleMapsApiKey
      ? new Error('Missing VITE_GOOGLE_MAPS_API_KEY. Add it in Netlify environment variables.')
      : undefined;

  const authFailedRef = useRef(false);
  const [authFailure, setAuthFailure] = useState(false);
  const loggedKeyRef = useRef(false);

  useEffect(() => {
    if (!loggedKeyRef.current) {
      const hasKey = !!googleMapsApiKey;
      console.log('[Maps] API key present:', hasKey, hasKey ? `key=${googleMapsApiKey.slice(0, 10)}...` : '');
      loggedKeyRef.current = true;
    }
  }, [googleMapsApiKey]);

  useEffect(() => {
    const w = window as unknown as Record<string, (() => void) | undefined>;
    const key = 'gm_authFailure';
    const existing = w[key];
    w[key] = () => {
      console.error('[Maps] gm_authFailure fired — API key rejected or billing disabled');
      authFailedRef.current = true;
      setAuthFailure(true);
      if (typeof existing === 'function') existing();
    };
    return () => {
      w[key] = existing;
    };
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey,
    libraries: [...GOOGLE_MAPS_LIBRARIES] as const,
  });

  useEffect(() => {
    if (isLoaded) console.log('[Maps] isLoaded = true');
    if (loadError) console.error('[Maps] loadError:', loadError.message);
  }, [isLoaded, loadError]);

  const resolvedError = configError ?? loadError ?? (authFailure ? new Error('Google Maps API authentication failed') : undefined);

  return (
    <GoogleMapsContext.Provider
      value={{
        isLoaded: configError ? false : isLoaded,
        loadError: resolvedError,
      }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMapsLoader() {
  return useContext(GoogleMapsContext);
}
