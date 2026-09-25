import type { ReactNode } from 'react';
import { useJsApiLoader, type Libraries } from '@react-google-maps/api';
import { GoogleMapsContext } from './GoogleMapsContext';
import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';

const GOOGLE_MAPS_LOADER_ID = 'vjr-google-maps-loader';
// Module-level constant so the array reference is stable; recreating it
// each render makes the maps loader reload unintentionally.
const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

interface MapsLoaderProps {
  requestMaps: () => void;
  children?: ReactNode;
}

/**
 * Lives in its own module (imported dynamically by GoogleMapsContext) so the
 * @react-google-maps/api wrapper — and the vendor chunk it pulls in — stays
 * out of the initial payload entirely. This module is only fetched after
 * requestMaps() flips the provider's state.
 *
 * It renders a stateless SIBLING that re-provides GoogleMapsContext with the
 * real isLoaded state, so consumers of useGoogleMapsLoader() see the SDK
 * arrive without the app subtree being remounted (wrapping children in the
 * loader used to remount the whole app when loading finished).
 */
export default function MapsLoader({ requestMaps }: MapsLoaderProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return (
    <GoogleMapsContext.Provider
      value={{ isLoaded, loadError: loadError as Error | undefined, requestMaps }}
    >
      {null}
    </GoogleMapsContext.Provider>
  );
}
