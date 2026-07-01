import { useEffect, useRef, useState } from 'react';
import { Autocomplete, GoogleMap, Marker } from '@react-google-maps/api';
import { Link2, MapPin, Search } from 'lucide-react';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import { BANGALORE_BOUNDS } from '@/data/mapConfig';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS,
  useGooglePlacesPacSync,
} from '@/lib/googlePlacesAutocomplete';
import { isGoogleMapsUrl, isWithinBangalore } from '@/lib/googleMapsLinkParser';
import {
  landLocationFromPlace,
  reverseGeocodeLandLocation,
  resolveLocationTextInput,
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

  const bounds =
    typeof google !== 'undefined'
      ? new google.maps.LatLngBounds(
          { lat: BANGALORE_BOUNDS.south, lng: BANGALORE_BOUNDS.west },
          { lat: BANGALORE_BOUNDS.north, lng: BANGALORE_BOUNDS.east },
        )
      : undefined;

  const applyResolvedLocation = async (text: string, mapsLink?: string) => {
    const resolved = await resolveLocationTextInput(text);
    if (!resolved) {
      setLinkError(
        'Could not find this location. Paste a Google Maps link, full address, or coordinates like 12.9716, 77.5946.',
      );
      return false;
    }

    if (!isWithinBangalore(resolved.lat, resolved.lng)) {
      setLinkError('Location must be within Bangalore.');
      return false;
    }

    const next = await reverseGeocodeLandLocation(
      resolved.lat,
      resolved.lng,
      mapsLink ?? (isGoogleMapsUrl(text) ? text.trim() : undefined),
    );
    if (inputRef.current) inputRef.current.value = next.area;
    setLinkError('');
    onChange(next);
    return true;
  };

  const handlePlaceChanged = async () => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location) {
      const next = landLocationFromPlace(place);
      if (!next) {
        setLinkError('Could not read this place. Try again or click Find Location.');
        return;
      }
      if (!isWithinBangalore(next.map_lat, next.map_lng)) {
        setLinkError('Location must be within Bangalore.');
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
    const text = linkInput.trim();
    if (!text) {
      setLinkError('Paste a Google Maps link or full address.');
      return;
    }

    setSearchLoading(true);
    setLinkError('');

    try {
      if (!isLoaded || typeof google === 'undefined') {
        setLinkError('Google Maps is still loading. Try again in a moment.');
        return;
      }
      await applyResolvedLocation(text, isGoogleMapsUrl(text) ? text : undefined);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : 'Failed to parse link');
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
            options={{
              ...GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS,
              bounds,
            }}
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
