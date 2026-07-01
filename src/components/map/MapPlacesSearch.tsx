import { useEffect, useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { Navigation, X } from 'lucide-react';
import { BANGALORE_BOUNDS } from '@/data/mapConfig';
import {
  GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS,
  useGooglePlacesPacSync,
} from '@/lib/googlePlacesAutocomplete';

interface MapPlacesSearchProps {
  value: string;
  onPlaceSelected: (place: google.maps.places.PlaceResult) => void;
  onLocateMe: () => void;
  onClear: () => void;
  onInputChange: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
}

export default function MapPlacesSearch({
  value,
  onPlaceSelected,
  onLocateMe,
  onClear,
  onInputChange,
  onFocusChange,
}: MapPlacesSearchProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const blurTimerRef = useRef<number | null>(null);
  const syncPacPosition = useGooglePlacesPacSync(inputRef, 'map-search');

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== value) {
      inputRef.current.value = value;
    }
  }, [value]);

  const handleFocus = () => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    onFocusChange?.(true);
    syncPacPosition();
  };

  const handleBlur = () => {
    blurTimerRef.current = window.setTimeout(() => {
      onFocusChange?.(false);
    }, 180);
  };

  const bounds =
    typeof google !== 'undefined'
      ? new google.maps.LatLngBounds(
          { lat: BANGALORE_BOUNDS.south, lng: BANGALORE_BOUNDS.west },
          { lat: BANGALORE_BOUNDS.north, lng: BANGALORE_BOUNDS.east },
        )
      : undefined;

  return (
    <div className="map-places-search relative z-[120] flex shrink-0 items-center gap-2 overflow-visible rounded-full border border-gray-100 bg-white py-2 pr-2 pl-3 shadow-lg">
      <Autocomplete
        onLoad={(ac) => {
          autocompleteRef.current = ac;
          syncPacPosition();
        }}
        onPlaceChanged={() => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.geometry?.location) {
            onPlaceSelected(place);
          }
          syncPacPosition();
        }}
        options={{
          ...GOOGLE_PLACES_AUTOCOMPLETE_OPTIONS,
          bounds,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={(e) => {
            onInputChange(e.target.value);
            syncPacPosition();
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onInput={syncPacPosition}
          placeholder="Search Location..."
          className="map-places-input w-[200px] bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400 sm:w-[240px]"
          autoComplete="off"
        />
      </Autocomplete>

      {value && (
        <button
          type="button"
          onClick={onClear}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}

      <button
        type="button"
        onClick={onLocateMe}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 transition-colors hover:bg-blue-600"
        aria-label="Locate me"
      >
        <Navigation size={14} className="text-white" />
      </button>
    </div>
  );
}
