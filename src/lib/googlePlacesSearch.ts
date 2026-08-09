import { BANGALORE_COORDINATES } from '@/data/bangaloreCoordinates';

/** Rough center of Bangalore metro for a bounded autocomplete search. */
const BANGALORE_CENTER = { lat: 12.9716, lng: 77.5946 };
/** ~45 km radius covers the full Bangalore urban area A–Z. */
const BANGALORE_RADIUS_M = 45000;

export interface GooglePlacesSuggestion {
  placeId: string;
  /** Primary display name, e.g. "Koramangala" or "Sarjapur Road". */
  mainText: string;
  /** Secondary line, e.g. "Bangalore, Karnataka, India". */
  secondaryText: string;
  /** Canonical locality (matched against BANGALORE_COORDINATES) when possible. */
  locality: string;
}

function canonicalLocality(mainText: string): string {
  const exact = BANGALORE_COORDINATES[mainText];
  if (exact) return mainText;

  const lower = mainText.toLowerCase();
  const key = Object.keys(BANGALORE_COORDINATES).find(
    (k) => k.toLowerCase() === lower || lower.includes(k.toLowerCase()),
  );
  return key ?? mainText;
}

/**
 * Debounced wrapper for Google Places predictions restricted to Bangalore.
 * Returns suggestions whose secondary text mentions Bangalore/Bengaluru, plus
 * any result that resolves to a known canonical locality in the map dataset.
 */
export async function fetchBangalorePlacesSuggestions(
  input: string,
): Promise<GooglePlacesSuggestion[]> {
  const trimmed = input.trim();
  if (!trimmed || typeof google === 'undefined' || !google.maps?.places) {
    return [];
  }

  try {
    const service = new google.maps.places.AutocompleteService();
    const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>(
      (resolve) => {
        service.getPlacePredictions(
          {
            input: trimmed,
            location: new google.maps.LatLng(BANGALORE_CENTER.lat, BANGALORE_CENTER.lng),
            radius: BANGALORE_RADIUS_M,
            componentRestrictions: { country: 'in' },
            // (regions) is the only valid collection filter for area-level
            // predictions (localities, sublocalities, neighborhoods, etc.).
            types: ['(regions)'],
          },
          (results) => resolve(results || []),
        );
      },
    );

    const seen = new Set<string>();
    const suggestions: GooglePlacesSuggestion[] = [];

    for (const p of predictions) {
      const mainText = (p.structured_formatting?.main_text ?? p.terms?.[0]?.value ?? '').trim();
      const secondaryText = (
        p.structured_formatting?.secondary_text ?? p.terms?.map((t) => t.value).join(', ') ?? ''
      ).trim();
      if (!mainText) continue;

      // Keep results that are clearly in Bangalore/Bengaluru, or that resolve
      // to one of our canonical localities (which are all Bangalore).
      const inBangalore =
        /bangalore|bengaluru/i.test(secondaryText) ||
        Object.keys(BANGALORE_COORDINATES).some(
          (k) => mainText.toLowerCase() === k.toLowerCase() || mainText.toLowerCase().includes(k.toLowerCase()),
        );
      if (!inBangalore) continue;

      const locality = canonicalLocality(mainText);
      if (seen.has(locality.toLowerCase())) continue;
      seen.add(locality.toLowerCase());

      suggestions.push({ placeId: p.place_id, mainText, secondaryText, locality });
    }

    return suggestions.slice(0, 6);
  } catch {
    return [];
  }
}
