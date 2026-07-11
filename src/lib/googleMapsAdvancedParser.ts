/**
 * Advanced Google Maps Link Parser
 * Extracts coordinates from ANY Google Maps format
 * Based on comprehensive research of Google Maps URL structures
 */

export interface ParsedMapCoordinates {
  lat: number;
  lng: number;
  source?: string;
  precision?: number;
}

const NUM_PATTERN = String.raw`-?\d+(?:\.\d+)?`;

export class GoogleMapsAdvancedParser {
  /**
   * Extract coordinates from ANY Google Maps format
   * Priority: Pin > Data > Query params > Place path > @ > Plain coords
   */
  static parseGoogleMapsUrl(url: string): ParsedMapCoordinates | null {
    const normalized = this.normalize(url);
    if (!normalized) return null;

    // Try raw coordinates first ("12.9716, 77.5946")
    const raw = this.parseRawCoordinates(normalized);
    if (raw) return raw;

    // Decode common escaped patterns
    const decoded = normalized
      .replace(/\\u003d/g, '=')
      .replace(/\\u0026/g, '&');

    // Extraction functions in priority order
    const extractors = [
      () => this.extractPinCoordinates(decoded),        // !3d!4d (HIGHEST)
      () => this.extractDataCoordinates(decoded),       // /maps/data=
      () => this.extractQueryParam(decoded, 'q'),       // ?q=
      () => this.extractQueryParam(decoded, 'll'),      // ?ll=
      () => this.extractQueryParam(decoded, 'center'),  // ?center=
      () => this.extractQueryParam(decoded, 'sll'),     // ?sll=
      () => this.extractQueryParam(decoded, 'viewpoint'),
      () => this.extractPlacePath(decoded),             // /place/@
      () => this.extractAtCoordinates(decoded),         // @lat,lng
    ];

    for (const extract of extractors) {
      const coords = extract();
      if (coords) {
        console.log(`✓ Successfully parsed using: ${coords.source}`);
        return coords;
      }
    }

    return null;
  }

  /**
   * Normalize input - add https:// if needed, handle special cases
   */
  static normalize(input: string): string {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // Already has protocol
    if (/^https?:\/\//i.test(trimmed)) {
      return this.safeDecodeURI(trimmed);
    }

    // Add https:// for known domains
    if (/^(?:maps\.app\.goo\.gl|goo\.gl|google\.|www\.google|maps\.google)/i.test(trimmed)) {
      return this.safeDecodeURI(`https://${trimmed}`);
    }

    // Check for coordinates pattern first
    if (/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(trimmed)) {
      return trimmed;
    }

    return this.safeDecodeURI(trimmed);
  }

  static safeDecodeURI(url: string): string {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      console.log('Could not decode URI, using as-is');
      return url;
    }
  }

  /**
   * Extract coordinates from "12.9716, 77.5946" format
   */
  static parseRawCoordinates(input: string): ParsedMapCoordinates | null {
    const trimmed = input.trim();
    const match = trimmed.match(
      new RegExp(`^(${NUM_PATTERN})\\s*,\\s*(${NUM_PATTERN})$`)
    );
    if (!match) return null;

    const coords = this.validateCoords(match[1], match[2]);
    if (coords) {
      return { ...coords, source: 'raw_coords', precision: this.getPrecision(match[1], match[2]) };
    }
    return null;
  }

  /**
   * HIGHEST PRIORITY: !3d{lat}!4d{lng} format
   */
  static extractPinCoordinates(url: string): ParsedMapCoordinates | null {
    const pattern = new RegExp(`!3d(${NUM_PATTERN})!4d(${NUM_PATTERN})`, 'g');
    let last: ParsedMapCoordinates | null = null;

    let match;
    while ((match = pattern.exec(url))) {
      const coords = this.validateCoords(match[1], match[2]);
      if (coords) {
        last = {
          ...coords,
          source: 'pin_encoded',
          precision: this.getPrecision(match[1], match[2])
        };
      }
    }
    return last;
  }

  /**
   * Extract from /maps/data= format
   */
  static extractDataCoordinates(url: string): ParsedMapCoordinates | null {
    const match = url.match(
      new RegExp(`/maps/data=.*?!3d(${NUM_PATTERN})!4d(${NUM_PATTERN})`, 'i')
    );
    if (!match) return null;

    const coords = this.validateCoords(match[1], match[2]);
    if (coords) {
      return {
        ...coords,
        source: 'data_encoded',
        precision: this.getPrecision(match[1], match[2])
      };
    }
    return null;
  }

  /**
   * Extract from query parameters (?q=, ?ll=, ?center=, etc)
   */
  static extractQueryParam(url: string, param: string): ParsedMapCoordinates | null {
    // Try URL-encoded format: ?q=12.9%2C77.5
    let pattern = new RegExp(
      `[?&]${param}=(${NUM_PATTERN})%2C(${NUM_PATTERN})`,
      'i'
    );
    let match = url.match(pattern);

    // Try plain format: ?q=12.9,77.5
    if (!match) {
      pattern = new RegExp(`[?&]${param}=(${NUM_PATTERN}),(${NUM_PATTERN})`, 'i');
      match = url.match(pattern);
    }

    if (!match) return null;

    const coords = this.validateCoords(match[1], match[2]);
    if (coords) {
      return {
        ...coords,
        source: `param_${param}`,
        precision: this.getPrecision(match[1], match[2])
      };
    }
    return null;
  }

  /**
   * Extract from /place/{name}/@{lat},{lng} format
   */
  static extractPlacePath(url: string): ParsedMapCoordinates | null {
    const match = url.match(
      new RegExp(`/place/[^/@]*@(${NUM_PATTERN}),(${NUM_PATTERN})`, 'i')
    );
    if (!match) return null;

    const coords = this.validateCoords(match[1], match[2]);
    if (coords) {
      return {
        ...coords,
        source: 'place_path',
        precision: this.getPrecision(match[1], match[2])
      };
    }
    return null;
  }

  /**
   * Extract from @{lat},{lng} notation
   */
  static extractAtCoordinates(url: string): ParsedMapCoordinates | null {
    const pattern = new RegExp(`@(${NUM_PATTERN}),(${NUM_PATTERN})`, 'g');
    const matches = [...url.matchAll(pattern)];
    if (!matches.length) return null;

    // Use last match (most specific)
    const last = matches[matches.length - 1];
    const coords = this.validateCoords(last[1], last[2]);
    if (coords) {
      return {
        ...coords,
        source: 'at_notation',
        precision: this.getPrecision(last[1], last[2])
      };
    }
    return null;
  }

  /**
   * Validate coordinates are within valid ranges
   */
  static validateCoords(lat: string, lng: string): ParsedMapCoordinates | null {
    try {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return null;
      }

      // Latitude: -90 to 90
      if (latNum < -90 || latNum > 90) {
        console.log(`Invalid latitude: ${latNum}`);
        return null;
      }

      // Longitude: -180 to 180
      if (lngNum < -180 || lngNum > 180) {
        console.log(`Invalid longitude: ${lngNum}`);
        return null;
      }

      return { lat: latNum, lng: lngNum };
    } catch (e) {
      return null;
    }
  }

  /**
   * Get decimal precision of coordinates
   */
  static getPrecision(lat: string, lng: string): number {
    return Math.max(
      (lat.split('.')[1] || '').length,
      (lng.split('.')[1] || '').length
    );
  }

  /**
   * Detect short URLs that need manual expansion
   */
  static isShortUrl(url: string): boolean {
    return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i.test(url.trim());
  }

  /**
   * Try to resolve short URL by following redirects
   * Returns the final URL if successful, or null if unable to resolve
   */
  static async resolveShortUrl(shortUrl: string): Promise<string | null> {
    try {
      console.log('🔄 Attempting to resolve short URL...');
      
      // Attempt 1: Try fetch with default redirect following
      const response = await fetch(shortUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      // The response.url property contains the final URL after redirects
      if (response.url && response.url !== shortUrl) {
        console.log('✓ Short URL resolved to:', response.url);
        return response.url;
      }

      console.log('Could not resolve - response URL is same as input');
      return null;
    } catch (err) {
      console.log('Fetch redirect resolution failed:', err);
      
      // Attempt 2: Try with no-cors mode to bypass some CORS restrictions
      try {
        console.log('🔄 Trying no-cors mode...');
        const response = await fetch(shortUrl, {
          method: 'HEAD',
          mode: 'no-cors',
          redirect: 'follow'
        });

        if (response.url && response.url !== shortUrl) {
          console.log('✓ Resolved via no-cors:', response.url);
          return response.url;
        }
      } catch (e) {
        console.log('no-cors attempt also failed:', e);
      }

      return null;
    }
  }

  /**
   * Extract place name from Google Maps URL
   */
  static extractPlaceName(url: string): string | null {
    const decoded = this.normalize(url);

    // Try /place/{name}
    let match = decoded.match(/\/maps\/place\/([^/@?&]+)/i);
    if (match) {
      const name = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
      if (name && !/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(name)) {
        return name;
      }
    }

    // Try query parameters
    for (const param of ['query', 'q']) {
      match = decoded.match(new RegExp(`[?&]${param}=([^&]+)`, 'i'));
      if (match) {
        const value = decodeURIComponent(match[1].replace(/\+/g, ' ')).trim();
        if (value && !/^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(value)) {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Extract Place ID from Google Maps URL
   */
  static extractPlaceId(url: string): string | null {
    const decoded = this.normalize(url);

    // Try !1s{placeId} format
    let match = decoded.match(/!1s(ChIJ[\w-]+)/i);
    if (match) return match[1];

    // Try ?place_id= parameter
    match = decoded.match(/[?&]place_id=([^&]+)/i);
    if (match) return decodeURIComponent(match[1]);

    return null;
  }
}
