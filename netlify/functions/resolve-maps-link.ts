import { Handler } from '@netlify/functions';

interface ResolveResponse {
  success: boolean;
  lat?: number;
  lng?: number;
  areaName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fullAddress?: string;
  error?: string;
  errorStage?: string;
}

/**
 * Backend serverless function to resolve Google Maps links
 * Handles short URLs, coordinates, place IDs, and forward geocoding
 * Replaces failed client-side approach with server-side resolution
 */
const handler: Handler = async (event): Promise<{ statusCode: number; body: string }> => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed', errorStage: 'http' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { mapLink } = body;

    if (!mapLink || typeof mapLink !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'mapLink is required', errorStage: 'input' })
      };
    }

    console.log('🔄 [resolve-maps-link] Processing:', mapLink);

    // Step 1: Resolve short URLs
    let resolvedUrl = mapLink;
    if (isShortUrl(mapLink)) {
      console.log('📍 Detected short URL, attempting to resolve...');
      const resolved = await resolveShortUrl(mapLink);
      if (!resolved) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: 'Could not resolve this short link — it may be expired or invalid',
            errorStage: 'short-url-resolution'
          })
        };
      }
      resolvedUrl = resolved;
      console.log('✓ Resolved to:', resolvedUrl);
    }

    // Step 2: Try to extract coordinates directly from URL (highest priority)
    const directCoords = extractCoordinatesFromUrl(resolvedUrl);
    if (directCoords) {
      console.log('✓ Found coordinates in URL:', directCoords);
      const areaInfo = await getAreaFromCoordinates(directCoords.lat, directCoords.lng);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          lat: directCoords.lat,
          lng: directCoords.lng,
          ...areaInfo,
          errorStage: 'none'
        })
      };
    }

    // Step 3: Try to extract place_id and look it up via Places API
    const placeId = extractPlaceIdFromUrl(resolvedUrl);
    if (placeId) {
      console.log('🔍 Attempting Places API lookup for place_id:', placeId);
      const placeDetails = await getPlaceDetails(placeId);
      if (placeDetails) {
        const areaInfo = await getAreaFromCoordinates(placeDetails.lat, placeDetails.lng);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            lat: placeDetails.lat,
            lng: placeDetails.lng,
            ...areaInfo,
            errorStage: 'none'
          })
        };
      }
    }

    // Step 4: Try to extract place name and geocode it
    const placeName = extractPlaceNameFromUrl(resolvedUrl);
    if (placeName && placeName.length > 2) {
      console.log('🔍 Geocoding place name:', placeName);
      const coords = await geocodeAddress(placeName);
      if (coords) {
        const areaInfo = await getAreaFromCoordinates(coords.lat, coords.lng);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            lat: coords.lat,
            lng: coords.lng,
            ...areaInfo,
            errorStage: 'none'
          })
        };
      } else {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            error: `Could not find location for "${placeName}" — no results from geocoding API`,
            errorStage: 'geocoding-no-results'
          })
        };
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Could not extract location from this link — no coordinates or place name found',
        errorStage: 'url-parsing'
      })
    };
  } catch (error) {
    console.error('❌ Backend error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        errorStage: 'backend-exception'
      })
    };
  }
};

/** Check if URL is a short link */
function isShortUrl(url: string): boolean {
  const shortPatterns = [
    /maps\.app\.goo\.gl/i,
    /goo\.gl\/maps/i,
    /bit\.ly/i,
    /tinyurl\.com/i,
    /short\.link/i
  ];
  return shortPatterns.some(pattern => pattern.test(url));
}

/** Resolve short URL by following redirects (server-side, no CORS issues) */
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    console.log('🔗 Following redirects for:', shortUrl);
    
    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.url && response.url !== shortUrl) {
      console.log('✓ Redirected to:', response.url);
      return response.url;
    }

    return null;
  } catch (error) {
    console.error('Error resolving short URL:', error);
    return null;
  }
}

/** Extract coordinates from URL patterns (priority order) */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    { regex: /@(-?\d+\.?\d*),(-?\d+\.?\d*)/, name: '@lat,lng' },
    { regex: /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/, name: '!3d!4d' },
    { regex: /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, name: '?q=lat,lng' },
    { regex: /[?&]q=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/, name: '?q=lat%2Clng' },
    { regex: /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/, name: '?ll=lat,lng' },
    { regex: /[?&]ll=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/, name: '?ll=lat%2Clng' },
    { regex: /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/, name: '?center=lat,lng' },
    { regex: /[?&]center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/, name: '?center=lat%2Clng' }
  ];

  for (const { regex, name } of patterns) {
    const match = url.match(regex);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidCoordinate(lat, lng)) {
        console.log(`  ✓ Found via ${name}: ${lat}, ${lng}`);
        return { lat, lng };
      }
    }
  }

  const plainMatch = url.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1]);
    const lng = parseFloat(plainMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      console.log(`  ✓ Found as plain coordinates: ${lat}, ${lng}`);
      return { lat, lng };
    }
  }

  return null;
}

/** Validate coordinate ranges */
function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/** Extract place_id from URL */
function extractPlaceIdFromUrl(url: string): string | null {
  let match = url.match(/\/place\/([Cc]h[Ii][Jj][A-Za-z0-9_-]+)/);
  if (match) {
    console.log(`  ✓ Found place_id in path: ${match[1]}`);
    return match[1];
  }

  match = url.match(/[?&]q=place_id:([Cc]h[Ii][Jj][A-Za-z0-9_-]+)/i);
  if (match) {
    console.log(`  ✓ Found place_id in query: ${match[1]}`);
    return match[1];
  }

  return null;
}

/** Get place details from Places API */
async function getPlaceDetails(placeId: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_SERVER_KEY not configured');
      return null;
    }

    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=location&key=${apiKey}`;
    console.log('  📡 Calling Places API...');

    const response = await fetch(url);
    const data = await response.json();

    if (data.location) {
      return { lat: data.location.latitude, lng: data.location.longitude };
    }

    console.warn('  ⚠️ Places API returned no location');
    return null;
  } catch (error) {
    console.error('Places API error:', error);
    return null;
  }
}

/** Extract place name from URL */
function extractPlaceNameFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);

    let match = decoded.match(/\/maps\/place\/([^/@?&]+)/i);
    if (match) {
      const name = match[1].replace(/\+/g, ' ').trim();
      if (name && !/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(name)) {
        console.log(`  ✓ Found place name in path: ${name}`);
        return name;
      }
    }

    match = decoded.match(/[?&]query=([^&]+)/i);
    if (match) {
      const name = decodeURIComponent(match[1]).replace(/\+/g, ' ').trim();
      if (name && name.length > 1) {
        console.log(`  ✓ Found query parameter: ${name}`);
        return name;
      }
    }

    match = decoded.match(/[?&]q=([^&]+)/i);
    if (match) {
      const value = decodeURIComponent(match[1]).replace(/\+/g, ' ').trim();
      if (value && !/^-?\d+\.?\d*/.test(value) && value.length > 1) {
        console.log(`  ✓ Found search query: ${value}`);
        return value;
      }
    }

    return null;
  } catch (e) {
    console.error('Error extracting place name:', e);
    return null;
  }
}

/** Forward geocode an address */
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_SERVER_KEY not configured');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    console.log('  📡 Calling Geocoding API...');

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const location = data.results[0].geometry.location;
      console.log(`  ✓ Geocoding found: ${location.lat}, ${location.lng}`);
      return { lat: location.lat, lng: location.lng };
    }

    if (data.status === 'ZERO_RESULTS') {
      console.warn(`  ⚠️ Geocoding found no results for: ${address}`);
      return null;
    }

    console.error(`  ❌ Geocoding error: ${data.status}`);
    return null;
  } catch (error) {
    console.error('Geocoding API error:', error);
    return null;
  }
}

/** Reverse geocode coordinates to get area, city, state, pincode */
async function getAreaFromCoordinates(lat: number, lng: number): Promise<{
  areaName: string;
  city: string;
  state: string;
  pincode: string;
  fullAddress: string;
}> {
  try {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_SERVER_KEY not configured');
      return {
        areaName: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        pincode: '',
        fullAddress: `${lat}, ${lng}`
      };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    console.log('  📡 Calling Reverse Geocoding API...');

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0];
      const components = result.address_components || [];

      const find = (types: string[]): string => {
        const comp = components.find((c: any) => types.some((t) => c.types.includes(t)));
        return comp?.long_name || '';
      };

      return {
        areaName: find(['sublocality_level_1']) || find(['sublocality']) || find(['neighborhood']) || find(['locality']) || 'Unknown',
        city: find(['administrative_area_level_2']) || find(['locality']) || 'Unknown',
        state: find(['administrative_area_level_1']) || 'Unknown',
        pincode: find(['postal_code']) || '',
        fullAddress: result.formatted_address
      };
    }

    return {
      areaName: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      pincode: '',
      fullAddress: `${lat}, ${lng}`
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      areaName: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      pincode: '',
      fullAddress: `${lat}, ${lng}`
    };
  }
}

export { handler };
