import { localityFromGooglePlace, resolveMapLocalityName } from '@/data/bangaloreCoordinates';
import {
  expandGoogleMapsUrl,
  extractPlaceIdFromMapsUrl,
  extractPlaceNameFromMapsUrl,
  normalizeGoogleMapsInput,
  parseGoogleMapsUrl,
  type ResolvedMapsLink,
} from '@/lib/googleMapsLinkParser';

export interface LandLocationValue {
  area: string;
  location: string;
  map_lat: number;
  map_lng: number;
  maps_link?: string;
}

export type { ResolvedMapsLink };

export function localityFromGeocoderResult(result: google.maps.GeocoderResult): string {
  const fakePlace = {
    name: result.formatted_address,
    formatted_address: result.formatted_address,
    address_components: result.address_components,
  } as google.maps.places.PlaceResult;

  const matched = localityFromGooglePlace(fakePlace);
  if (matched) return matched;

  const sublocality = result.address_components?.find(
    (c) =>
      c.types.includes('sublocality') ||
      c.types.includes('sublocality_level_1') ||
      c.types.includes('neighborhood'),
  );
  if (sublocality) return sublocality.long_name;

  const locality = result.address_components?.find((c) => c.types.includes('locality'));
  if (locality) return locality.long_name;

  return result.formatted_address.split(',')[0]?.trim() || result.formatted_address;
}

export function landLocationFromPlace(place: google.maps.places.PlaceResult): LandLocationValue | null {
  const loc = place.geometry?.location;
  if (!loc) return null;

  const lat = loc.lat();
  const lng = loc.lng();
  const area =
    localityFromGooglePlace(place) ||
    place.name ||
    place.formatted_address?.split(',')[0]?.trim() ||
    '';

  if (!area) return null;

  return {
    area,
    location: place.formatted_address || area,
    map_lat: lat,
    map_lng: lng,
  };
}

export function reverseGeocodeLandLocation(
  lat: number,
  lng: number,
  mapsLink?: string,
): Promise<LandLocationValue> {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== 'OK' || !results?.[0]) {
        reject(new Error('Could not resolve address for this pin'));
        return;
      }

      const result = results[0];
      const area = localityFromGeocoderResult(result);
      resolve({
        area: resolveMapLocalityName(area) ?? area,
        location: result.formatted_address,
        map_lat: lat,
        map_lng: lng,
        maps_link: mapsLink,
      });
    });
  });
}

function geocodePromise(
  request: google.maps.GeocoderRequest,
): Promise<google.maps.GeocoderResult | null> {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode(request, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        resolve(results[0]);
        return;
      }
      resolve(null);
    });
  });
}

/** Resolve coordinates from place name or place_id in the URL via Geocoder */
export async function geocodeGoogleMapsUrlFallback(
  url: string,
): Promise<{ lat: number; lng: number; source: string } | null> {
  const normalized = normalizeGoogleMapsInput(url);
  const placeId = extractPlaceIdFromMapsUrl(normalized);
  if (placeId) {
    const byId = await geocodePromise({ placeId });
    if (byId?.geometry?.location) {
      return {
        lat: byId.geometry.location.lat(),
        lng: byId.geometry.location.lng(),
        source: 'place_id',
      };
    }
  }

  const placeName = extractPlaceNameFromMapsUrl(normalized);
  if (placeName) {
    const withRegion = /bangalore|bengaluru/i.test(placeName)
      ? placeName
      : `${placeName}, Bangalore, Karnataka, India`;

    const byName = await geocodePromise({ address: withRegion });
    if (byName?.geometry?.location) {
      return {
        lat: byName.geometry.location.lat(),
        lng: byName.geometry.location.lng(),
        source: 'place_name',
      };
    }
  }

  return null;
}

/** Full link resolution: parse URL → expand short links → geocode place name/id if needed */
export async function resolveGoogleMapsLink(
  input: string,
): Promise<ResolvedMapsLink | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = normalizeGoogleMapsInput(trimmed);
  const expanded = await expandGoogleMapsUrl(normalized);

  const parsed =
    parseGoogleMapsUrl(trimmed) ??
    parseGoogleMapsUrl(normalized) ??
    parseGoogleMapsUrl(expanded);
  if (parsed) {
    return {
      lat: parsed.lat,
      lng: parsed.lng,
      expandedUrl: expanded,
      source: parsed.source ?? 'url',
    };
  }

  if (typeof google === 'undefined') return null;

  const geocoded = await geocodeGoogleMapsUrlFallback(expanded || normalized);
  if (!geocoded) return null;

  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    expandedUrl: expanded,
    source: geocoded.source,
  };
}

function findPlaceFromQuery(query: string): Promise<google.maps.places.PlaceResult | null> {
  return new Promise((resolve) => {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const searchQuery = /bangalore|bengaluru|karnataka/i.test(query)
      ? query
      : `${query}, Bangalore, Karnataka, India`;

    service.findPlaceFromQuery(
      {
        query: searchQuery,
        fields: ['geometry', 'name', 'formatted_address', 'address_components', 'place_id'],
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
          resolve(results[0]);
          return;
        }
        resolve(null);
      },
    );
  });
}

export async function geocodeAddressText(
  text: string,
): Promise<{ lat: number; lng: number } | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const withRegion = /bangalore|bengaluru|karnataka/i.test(trimmed)
    ? trimmed
    : `${trimmed}, Bangalore, Karnataka, India`;

  const byAddress = await geocodePromise({ address: withRegion, region: 'in' });
  if (byAddress?.geometry?.location) {
    return {
      lat: byAddress.geometry.location.lat(),
      lng: byAddress.geometry.location.lng(),
    };
  }

  return null;
}

/**
 * Universal resolver: Google Maps URLs, coordinates, pasted addresses, or place names.
 */
export async function resolveLocationTextInput(
  input: string,
): Promise<ResolvedMapsLink | null> {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const fromLink = await resolveGoogleMapsLink(trimmed);
  if (fromLink) return fromLink;

  if (typeof google === 'undefined') return null;

  const place = await findPlaceFromQuery(trimmed);
  if (place?.geometry?.location) {
    return {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      expandedUrl: trimmed,
      source: 'places_search',
    };
  }

  const geocoded = await geocodeAddressText(trimmed);
  if (geocoded) {
    return {
      lat: geocoded.lat,
      lng: geocoded.lng,
      expandedUrl: trimmed,
      source: 'geocode_address',
    };
  }

  return null;
}
