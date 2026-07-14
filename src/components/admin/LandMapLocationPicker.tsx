import { useEffect, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { Link2, MapPin } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import type { LandLocationValue } from '@/lib/mapGeocoding';

interface LandMapLocationPickerProps {
  value: LandLocationValue | null;
  onChange: (value: LandLocationValue | null) => void;
  error?: string;
}

export default function LandMapLocationPicker({
  value,
  onChange,
  error,
}: LandMapLocationPickerProps) {
  const { isLoaded } = useGoogleMapsLoader();
  const [linkInput, setLinkInput] = useState(value?.maps_link ?? '');
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    if (value?.maps_link) setLinkInput(value.maps_link);
  }, [value?.maps_link]);

  const getAreaFromCoords = async (lat: number, lng: number) => {
    if (typeof google !== 'undefined' && google.maps?.Geocoder) {
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await new Promise<google.maps.GeocoderResult | null>((resolve) => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            resolve(status === 'OK' && results?.[0] ? results[0] : null);
          });
        });
        if (result) {
          const components = result.address_components ?? [];
          const find = (types: string[]) => components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';
          return {
            areaName: find(['sublocality_level_1']) || find(['sublocality']) || find(['neighborhood']) || find(['locality']) || find(['administrative_area_level_2']) || 'Unknown',
            city: find(['locality']) || find(['administrative_area_level_2']) || 'Unknown',
            state: find(['administrative_area_level_1']) || 'Unknown',
            pincode: find(['postal_code']) || '',
            fullAddress: result.formatted_address || `${lat}, ${lng}`,
          };
        }
      } catch { /* fall through to REST API */ }
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    try {
      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results.length) {
        const addr = data.results[0];
        const components = addr.address_components ?? [];
        const find = (types: string[]) => components.find((c: any) => types.some((t) => c.types.includes(t)))?.long_name;
        const areaName = find(['sublocality_level_1']) || find(['sublocality']) || find(['neighborhood']) || find(['locality']) || find(['administrative_area_level_2']) || '';
        const city = find(['locality']) || find(['administrative_area_level_2']) || '';
        const state = find(['administrative_area_level_1']) || '';
        const pincode = find(['postal_code']) || '';
        return { areaName: areaName || 'Unknown', city: city || 'Unknown', state: state || 'Unknown', fullAddress: addr.formatted_address || `${lat}, ${lng}`, pincode };
      }
    } catch { /* geocode fallback */ }
    return { areaName: 'Unknown', city: 'Unknown', state: 'Unknown', fullAddress: `${lat}, ${lng}`, pincode: '' };
  };

  const handleApplyLink = async () => {
    const input = linkInput.trim();
    if (!input) return;
    setLoading(true);
    setLinkError('');

    try {
      let coords: { lat: number; lng: number } | null = null;

      const directCoord = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (directCoord) {
        coords = { lat: parseFloat(directCoord[1]), lng: parseFloat(directCoord[2]) };
      }

      if (!coords) {
        const patterns = [
          /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
          /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
          /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
        ];
        for (const p of patterns) {
          const m = input.match(p);
          if (m) {
            coords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
            break;
          }
        }
      }

      if (!coords) {
        try {
          const resolveMapUrlFn = httpsCallable(functions, 'resolveMapUrl');
          const result = await resolveMapUrlFn({ url: input });
          const data = result.data as any;
          if (data?.coords) {
            coords = data.coords;
          } else if (data?.finalUrl) {
            const patterns = [/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, /@(-?\d+\.?\d*),(-?\d+\.?\d*)/];
            for (const p of patterns) {
              const m = data.finalUrl.match(p);
              if (m) {
                coords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
                break;
              }
            }
          }
        } catch (fnErr) {
          console.warn('Firebase function failed:', fnErr);
        }
      }

      if (!coords) {
        setLinkError('Could not extract location. Paste a Google Maps link or coordinates (e.g. 15.6171, 76.6528)');
        return;
      }

      const info = await getAreaFromCoords(coords.lat, coords.lng);
      onChange({
        area: info.areaName,
        location: info.fullAddress,
        map_lat: coords.lat,
        map_lng: coords.lng,
        maps_link: input,
        city: info.city,
        state: info.state,
        pincode: info.pincode,
      });
    } catch (err: any) {
      console.error('Location fetch failed:', err);
      setLinkError(err.message || 'Failed to fetch location');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        Loading Google Maps…
      </div>
    );
  }

  const mapCenter =
    value?.map_lat && value?.map_lng
      ? { lat: value.map_lat, lng: value.map_lng }
      : { lat: 12.9716, lng: 77.5946 };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyLink();
              }
            }}
            placeholder="Paste Google Maps link"
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-all focus:border-gray-900/40 focus:ring-2 focus:ring-gray-900/5 placeholder:text-gray-300"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleApplyLink}
            disabled={!linkInput.trim() || loading}
            className="rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Fetching pin…
              </span>
            ) : 'Fetch Pin Location'}
          </button>
          <span className="text-[11px] text-gray-400">Maps links or coordinates work</span>
        </div>
      </div>

      {(linkError || error) && (
        <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
          <p className="text-xs text-red-600">{linkError || error}</p>
        </div>
      )}

      {value && value.map_lat && value.map_lng && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: 220 }}
              center={mapCenter}
              zoom={15}
              options={{
                mapTypeId: 'hybrid',
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'cooperative',
                clickableIcons: false,
              }}
            >
              <Marker position={{ lat: value.map_lat, lng: value.map_lng }} />
            </GoogleMap>
          </div>

          <div className="rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <MapPin size={16} className="text-emerald-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900">{value.area}</p>
                <p className="mt-0.5 text-xs text-gray-500 truncate">{value.location}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-gray-500 ring-1 ring-gray-200">
                    {value.map_lat.toFixed(6)}, {value.map_lng.toFixed(6)}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium">● Pin synced</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
