import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const GOOGLE_MAPS_LOADER_ID = 'vjr-google-maps-loader';
const GOOGLE_MAPS_LIBRARIES = ['marker', 'places'] as const;

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

  const configError = useMemo(() => {
    if (!googleMapsApiKey) {
      return new Error(
        'Missing VITE_GOOGLE_MAPS_API_KEY. Add it in Netlify environment variables.',
      );
    }
    return undefined;
  }, [googleMapsApiKey]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const resolvedError = configError ?? loadError;

  return (
    <GoogleMapsContext.Provider
      value={{ isLoaded: configError ? false : isLoaded, loadError: resolvedError }}
    >
      {children}
    </GoogleMapsContext.Provider>
  );
}

export function useGoogleMapsLoader() {
  return useContext(GoogleMapsContext);
}
