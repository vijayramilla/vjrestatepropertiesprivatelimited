import { useEffect, useRef, useState } from 'react';
import { Autocomplete, GoogleMap, Marker } from '@react-google-maps/api';
import { Link2, MapPin, Search } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS,
  useGooglePlacesPacSync,
} from '@/lib/googlePlacesAutocomplete';
import {
  landLocationFromPlace,
  type LandLocationValue,
} from '@/lib/mapGeocoding';

type LocationMode = 'search' | 'link';

interface LandMapLocationPickerProps {
  value: LandLocationValue | null;
  onChange: (value: LandLocationValue | null) => void;
  error?: string;
}

const PAC_OWNER_ID = 'admin-location-picker';

export default function LandMapLocationPicker({
  value,
  onChange,
  error,
}: LandMapLocationPickerProps) {
  const { isLoaded } = useGoogleMapsLoader();
  const [mode, setMode] = useState<LocationMode>('search');
  const [linkInput, setLinkInput] = useState(value?.maps_link ?? '');
  const [searchLoading, setSearchLoading] = useState(false);
  const [linkError, setLinkError] = useState('');

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const syncPacPosition = useGooglePlacesPacSync(inputRef, PAC_OWNER_ID);

  useEffect(() => {
    if (value?.maps_link) setLinkInput(value.maps_link);
    if (value?.area && inputRef.current && mode === 'search') {
      inputRef.current.value = value.area;
    }
  }, [value?.area, value?.maps_link, mode]);

  const extractCoordinates = (text: string): { lat: number; lng: number } | null => {
    const t = text.trim();
    const d3d4d = t.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (d3d4d) return { lat: parseFloat(d3d4d[1]), lng: parseFloat(d3d4d[2]) };
    const at = t.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
    const q = t.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
    const plain = t.match(/^(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)$/);
    if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };
    return null;
  };

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

    // Fallback: REST API with API key
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
    } catch {}
    return { areaName: 'Unknown', city: 'Unknown', state: 'Unknown', fullAddress: `${lat}, ${lng}`, pincode: '' };
  };

  const applyResolvedLocation = async (text: string) => {
    const fromCoords = extractCoordinates(text);
    if (fromCoords) {
      const info = await getAreaFromCoords(fromCoords.lat, fromCoords.lng);
      if (inputRef.current) inputRef.current.value = info.areaName;
      setLinkError('');
      onChange({ area: info.areaName, location: info.fullAddress, map_lat: fromCoords.lat, map_lng: fromCoords.lng, maps_link: text, city: info.city, state: info.state, pincode: info.pincode });
      return true;
    }

    // Resolve short URLs via Firebase Function
    if (/goo\.gl|maps\.app\.goo/i.test(text)) {
      try {
        const resolveMapUrlFn = httpsCallable(functions, 'resolveMapUrl');
        const result = await resolveMapUrlFn({ url: text });
        const data = result.data as any;
        if (data?.coords) {
          const info = await getAreaFromCoords(data.coords.lat, data.coords.lng);
          if (inputRef.current) inputRef.current.value = info.areaName;
          setLinkError('');
          onChange({ area: info.areaName, location: info.fullAddress, map_lat: data.coords.lat, map_lng: data.coords.lng, maps_link: text, city: info.city, state: info.state, pincode: info.pincode });
          return true;
        }
      } catch { /* fall through to geocoding */ }
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(text)}&key=${key}`);
    const geoData = await geoRes.json();
    if (geoData.status === 'OK' && geoData.results.length) {
      const loc = geoData.results[0].geometry.location;
      const info = await getAreaFromCoords(loc.lat, loc.lng);
      if (inputRef.current) inputRef.current.value = info.areaName;
      setLinkError('');
      onChange({ area: info.areaName, location: info.fullAddress, map_lat: loc.lat, map_lng: loc.lng, maps_link: text, city: info.city, state: info.state, pincode: info.pincode });
      return true;
    }

    setLinkError('Could not find this location. Paste a Google Maps link, full address, or coordinates like 12.9716, 77.5946.');
    return false;
  };

  const handlePlaceChanged = async () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const next = landLocationFromPlace(place);
      if (!next) {
        setLinkError('Could not read this place. Try again or click Find Location.');
        return;
      }
      setLinkError('');
      if (inputRef.current) inputRef.current.value = next.area;
      onChange(next);
      return;
    }

    const typed = inputRef.current?.value?.trim() ?? '';
    if (typed) {
      setSearchLoading(true);
      try {
        await applyResolvedLocation(typed);
      } finally {
        setSearchLoading(false);
      }
    }
  };

  const handleFindSearch = async () => {
    const text = inputRef.current?.value?.trim() ?? '';
    if (!text) {
      setLinkError('Type or paste an address, area name, or Google Maps link.');
      return;
    }

    setSearchLoading(true);
    setLinkError('');
    try {
      if (!isLoaded || typeof google === 'undefined') {
        setLinkError('Google Maps is still loading. Try again in a moment.');
        return;
      }
      await applyResolvedLocation(text);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to find location');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleApplyLink = async () => {
    const input = linkInput.trim();
    if (!input) return;
    setSearchLoading(true);
    setLinkError('');

    try {
      let coords: { lat: number; lng: number } | null = null;

      // Case 1: Plain coordinates e.g. "15.617, 76.652"
      const directCoord = input.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (directCoord) {
        coords = { lat: parseFloat(directCoord[1]), lng: parseFloat(directCoord[2]) };
      }

      // Case 2: Full URL — try direct extraction
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

      // Case 3: Short URL — use Firebase Function
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
        setLinkError('Could not extract location. Please paste coordinates directly (e.g. 15.6171, 76.6528)');
        return;
      }

      const info = await getAreaFromCoords(coords.lat, coords.lng);
      if (inputRef.current) inputRef.current.value = info.areaName;
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
      setSearchLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
        Loading Google Maps search…
      </div>
    );
  }

  const mapCenter =
    value?.map_lat && value?.map_lng
      ? { lat: value.map_lat, lng: value.map_lng }
      : { lat: 12.9716, lng: 77.5946 };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
            mode === 'search' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Search size={14} />
          Google Search
        </button>
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
            mode === 'link' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Link2 size={14} />
          Paste Map Link
        </button>
      </div>

      {mode === 'search' ? (
        <div className="admin-places-search relative overflow-visible">
          <Autocomplete
            onLoad={(ac) => {
              autocompleteRef.current = ac;
              syncPacPosition();
            }}
            onPlaceChanged={handlePlaceChanged}
            options={GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS}
          >
            <input
              ref={inputRef}
              type="text"
              defaultValue={value?.area ?? ''}
              onFocus={syncPacPosition}
              onInput={syncPacPosition}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleFindSearch();
                }
              }}
              placeholder="Search or paste address / area / Maps link…"
              className="admin-input-ghost w-full"
              autoComplete="off"
            />
          </Autocomplete>
          <button
            type="button"
            onClick={handleFindSearch}
            disabled={searchLoading}
            className="mt-2 rounded-lg bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {searchLoading ? 'Finding…' : 'Find Location'}
          </button>
          <p className="mt-2 text-[11px] text-gray-500">
            Pick a suggestion, paste an address, or paste a Maps link — then click Find Location.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
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
            placeholder="Paste Google Maps link, address, or 12.9716, 77.5946"
            className="admin-input-ghost w-full"
          />
          <button
            type="button"
            onClick={handleApplyLink}
            disabled={!linkInput.trim() || searchLoading}
            className="rounded-lg bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            {searchLoading ? 'Fetching pin…' : 'Fetch pin location'}
          </button>
          <p className="text-[11px] text-gray-500">
            Supports maps.app.goo.gl, full Google Maps URLs, addresses, and coordinates.
          </p>
        </div>
      )}

      {(linkError || error) && (
        <p className="text-xs text-red-600">{linkError || error}</p>
      )}

      {value && value.map_lat && value.map_lng && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: 200 }}
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

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-emerald-900">
              <MapPin size={14} />
              {value.area}
            </p>
            <p className="mt-1 text-xs text-emerald-800">{value.location}</p>
            <p className="mt-1 font-mono text-[11px] text-emerald-700">
              {value.map_lat.toFixed(6)}, {value.map_lng.toFixed(6)}
            </p>
            <p className="mt-2 text-[11px] text-emerald-800">
              This pin syncs to the Land Map when you save the property.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
