import { createContext, useContext, type ReactNode } from 'react';
import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';

const GOOGLE_MAPS_LOADER_ID = 'vjr-google-maps-loader';
// Module-level constant so the array reference is stable; recreating it
// each render makes the maps loader reload unintentionally.
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapsLoaderProps {
  requestMaps: () => void;
  children: ReactNode;
}

/**
 * Lives in its own module (imported dynamically by GoogleMapsContext) so the
 * @react-google-maps/api wrapper — and the vendor chunk it pulls in — stays
 * out of the initial payload entirely. This module is only fetched after
 * requestMaps() flips the provider's state.
 */
export default function MapsLoader({ requestMaps, children }: MapsLoaderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <MapsRuntimeContext.Provider value={{ isLoaded, loadError, requestMaps }}>
      {children}
    </MapsRuntimeContext.Provider>
  );
}

export interface MapsRuntimeValue {
  isLoaded: boolean;
  loadError: Error | undefined;
  requestMaps: () => void;
}

export const MapsRuntimeContext = createContext<MapsRuntimeValue>({
  isLoaded: false,
  loadError: undefined,
  requestMaps: () => {},
});

export function useMapsRuntime() {
  return useContext(MapsRuntimeContext);
}
