import { Handler } from '@netlify/functions';

interface MapLinkResponse {
  success: boolean;
  lat?: number;
  lng?: number;
  placeName?: string;
  areaName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fullAddress?: string;
  error?: string;
}

/**
 * Backend function to resolve Google Maps links and extract coordinates
 * Handles CORS restrictions and short URL redirects
 */
const handler: Handler = async (event): Promise<{ statusCode: number; body: string }> => {
  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, error: 'Method not allowed' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { mapLink } = body;

    if (!mapLink) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'mapLink is required' })
      };
    }

    console.log('🔄 Backend: Processing map link:', mapLink);

    // Try to extract coordinates directly first
    const directCoords = extractCoordinatesFromUrl(mapLink);
    if (directCoords) {
      console.log('✓ Found coordinates directly:', directCoords);
      const areaInfo = await getAreaFromCoordinates(directCoords.lat, directCoords.lng);
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          lat: directCoords.lat,
          lng: directCoords.lng,
          ...areaInfo
        })
      };
    }

    // Try to resolve short URL if it's a short link
    if (isShortUrl(mapLink)) {
      console.log('📍 Detected short URL - attempting to resolve server-side');
      const resolvedUrl = await resolveShortUrl(mapLink);

      if (resolvedUrl) {
        console.log('✓ Resolved short URL to:', resolvedUrl);

        // Try to extract coordinates from resolved URL
        const resolvedCoords = extractCoordinatesFromUrl(resolvedUrl);
        if (resolvedCoords) {
          console.log('✓ Found coordinates in resolved URL:', resolvedCoords);
          const areaInfo = await getAreaFromCoordinates(resolvedCoords.lat, resolvedCoords.lng);
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              lat: resolvedCoords.lat,
              lng: resolvedCoords.lng,
              ...areaInfo
            })
          };
        }

        // Try to extract place name from resolved URL
        const placeName = extractPlaceNameFromUrl(resolvedUrl);
        if (placeName) {
          console.log('🔍 Found place name:', placeName);
          const coords = await searchPlaceByName(placeName);
          if (coords) {
            const areaInfo = await getAreaFromCoordinates(coords.lat, coords.lng);
            return {
              statusCode: 200,
              body: JSON.stringify({
                success: true,
                lat: coords.lat,
                lng: coords.lng,
                ...areaInfo
              })
            };
          }
        }
      }
    }

    // Try to extract place name and search for it
    const placeName = extractPlaceNameFromUrl(mapLink);
    if (placeName && placeName.length > 2) {
      console.log('🔍 Searching for place:', placeName);
      const coords = await searchPlaceByName(placeName);
      if (coords) {
        const areaInfo = await getAreaFromCoordinates(coords.lat, coords.lng);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            lat: coords.lat,
            lng: coords.lng,
            ...areaInfo
          })
        };
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: 'Could not extract location from the provided link'
      })
    };
  } catch (error) {
    console.error('Backend error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      })
    };
  }
};

/**
 * Extract coordinates directly from URL patterns
 */
function extractCoordinatesFromUrl(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,  // !3d!4d format
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,      // @lat,lng format
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?q=lat,lng
    /[?&]q=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/, // ?q=lat%2Clng
    /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?ll=lat,lng
    /[?&]ll=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/, // ?ll=lat%2Clng
    /[?&]center=(-?\d+\.?\d*),(-?\d+\.?\d*)/, // ?center=lat,lng
    /[?&]center=(-?\d+\.?\d*)%2C(-?\d+\.?\d*)/  // ?center=lat%2Clng
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);

      if (isValidCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }
  }

  // Check for raw coordinates in input
  const rawMatch = url.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}

/**
 * Validate if coordinates are in valid range
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Check if URL is a short Google Maps link
 */
function isShortUrl(url: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i.test(url.trim());
}

/**
 * Resolve short URL by following redirects (server-side - no CORS issues)
 */
async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    console.log('🔄 Following redirects for short URL...');

    const response = await fetch(shortUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response URL:', response.url);

    // response.url contains the final URL after redirects
    if (response.url && response.url !== shortUrl) {
      return response.url;
    }

    // If redirect property works, try another approach
    return null;
  } catch (error) {
    console.error('Error resolving short URL:', error);
    return null;
  }
}

/**
 * Extract place name from URL
 */
function extractPlaceNameFromUrl(url: string): string | null {
  try {
    const decoded = decodeURIComponent(url);

    // Try /maps/place/NAME pattern
    let match = decoded.match(/\/maps\/place\/([^/@?&]+)/i);
    if (match) {
      const name = match[1].replace(/\+/g, ' ').trim();
      if (name && !/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(name)) {
        return name;
      }
    }

    // Try ?query= or &query= pattern
    match = decoded.match(/[?&]query=([^&]+)/i);
    if (match) {
      const name = decodeURIComponent(match[1]).replace(/\+/g, ' ').trim();
      if (name && name.length > 1) {
        return name;
      }
    }

    // Try ?q= pattern (if not coordinates)
    match = decoded.match(/[?&]q=([^&]+)/i);
    if (match) {
      const value = decodeURIComponent(match[1]).replace(/\+/g, ' ').trim();
      if (value && !/^-?\d+\.?\d*/.test(value) && value.length > 1) {
        return value;
      }
    }

    return null;
  } catch (e) {
    console.error('Error extracting place name:', e);
    return null;
  }
}

/**
 * Search for place by name using Google Geocoding API
 */
async function searchPlaceByName(
  placeName: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return null;
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      placeName
    )}&key=${apiKey}`;

    console.log('🌐 Calling Geocoding API for:', placeName);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✓ Geocoding found:', location);
      return { lat: location.lat, lng: location.lng };
    }

    console.log('✗ Geocoding returned:', data.status);
    return null;
  } catch (error) {
    console.error('Error searching place:', error);
    return null;
  }
}

/**
 * Get area information from coordinates using Google Geocoding API (reverse geocoding)
 */
async function getAreaFromCoordinates(
  lat: number,
  lng: number
): Promise<{
  areaName?: string;
  city?: string;
  state?: string;
  pincode?: string;
  fullAddress?: string;
}> {
  try {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return {};
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

    console.log('🔄 Reverse geocoding:', lat, lng);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return {
        areaName: 'Unknown',
        city: 'Unknown',
        state: 'Unknown',
        fullAddress: `${lat}, ${lng}`
      };
    }

    const components = data.results[0].address_components;
    const get = (type: string) => {
      const component = components.find((c: any) => c.types.includes(type));
      return component ? component.long_name : '';
    };

    return {
      areaName:
        get('sublocality_level_1') ||
        get('sublocality') ||
        get('neighborhood') ||
        get('locality') ||
        get('administrative_area_level_2') ||
        'Unknown',
      city: get('locality') || get('administrative_area_level_2') || get('administrative_area_level_1') || 'Unknown',
      state: get('administrative_area_level_1') || 'Unknown',
      pincode: get('postal_code') || '',
      fullAddress: data.results[0].formatted_address
    };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    return {};
  }
}

export { handler };
