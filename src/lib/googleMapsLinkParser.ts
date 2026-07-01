import { BANGALORE_BOUNDS } from '@/data/mapConfig';

export interface ParsedMapCoordinates {
  lat: number;
  lng: number;
  source?: string;
}

export interface ResolvedMapsLink {
  lat: number;
  lng: number;
  expandedUrl: string;
  source: string;
}

const NUM = String.raw`-?\d+(?:\.\d+)?`;

const GOOGLE_MAPS_HOST =
  /^(?:https?:\/\/)?(?:[\w-]+\.)?google\.(?:com|[a-z]{2,3}(?:\.[a-z]{2})?)\/maps/i;

export function isGoogleMapsUrl(input: string): boolean {
  const normalized = normalizeGoogleMapsInput(input);
  return GOOGLE_MAPS_HOST.test(normalized) || isShortGoogleMapsUrl(normalized);
}

export function isShortGoogleMapsUrl(input: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps|share\.google)/i.test(input.trim());
}

export function normalizeGoogleMapsInput(input: string): string {
  let trimmed = input.trim();
  if (!trimmed) return trimmed;

  if (/^[\d\s.,+-]+$/.test(trimmed) && trimmed.includes(',')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^(?:maps\.app\.goo\.gl|goo\.gl|google\.|www\.google|maps\.google)/i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    } else if (trimmed.includes('google') && trimmed.includes('maps')) {
      trimmed = `https://${trimmed}`;
    }
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

function parseCoordinatePair(a: string, b: string): ParsedMapCoordinates | null {
  const lat = parseFloat(a);
  const lng = parseFloat(b);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Plain "12.9716, 77.5946" paste */
export function parseRawCoordinates(input: string): ParsedMapCoordinates | null {
  const trimmed = input.trim();
  const match = trimmed.match(new RegExp(`^(${NUM})\\s*,\\s*(${NUM})$`));
  if (!match) return null;
  const coords = parseCoordinatePair(match[1], match[2]);
  return coords ? { ...coords, source: 'raw' } : null;
}

/** Exact pin from data=!...!3dLAT!4dLNG (preferred over viewport @) */
function extractPinCoordinates(url: string): ParsedMapCoordinates | null {
  const pattern = new RegExp(`!3d(${NUM})!4d(${NUM})`, 'g');
  let last: ParsedMapCoordinates | null = null;
  let match: RegExpExecArray | null = pattern.exec(url);
  while (match) {
    const coords = parseCoordinatePair(match[1], match[2]);
    if (coords) last = { ...coords, source: 'pin' };
    match = pattern.exec(url);
  }
  return last;
}

function extractAtCoordinates(url: string): ParsedMapCoordinates | null {
  const pattern = new RegExp(`@(${NUM}),(${NUM})`, 'g');
  const matches = [...url.matchAll(pattern)];
  if (!matches.length) return null;
  const last = matches[matches.length - 1];
  const coords = parseCoordinatePair(last[1], last[2]);
  return coords ? { ...coords, source: 'at' } : null;
}

function extractParamCoordinates(url: string, param: string): ParsedMapCoordinates | null {
  const pattern = new RegExp(
    `[?&]${param}=(${NUM})%2C(${NUM})|[?&]${param}=(${NUM}),(${NUM})`,
    'i',
  );
  const match = url.match(pattern);
  if (!match) return null;
  const lat = match[1] ?? match[3];
  const lng = match[2] ?? match[4];
  const coords = parseCoordinatePair(lat, lng);
  return coords ? { ...coords, source: param } : null;
}

function extractPlacePathCoordinates(url: string): ParsedMapCoordinates | null {
  const match = url.match(new RegExp(`/place/(${NUM}),(${NUM})`, 'i'));
  if (!match) return null;
  const coords = parseCoordinatePair(match[1], match[2]);
  return coords ? { ...coords, source: 'place-path' } : null;
}

function extractDataOnlyCoordinates(url: string): ParsedMapCoordinates | null {
  const match = url.match(new RegExp(`/maps/data=.*!3d(${NUM})!4d(${NUM})`, 'i'));
  if (!match) return null;
  const coords = parseCoordinatePair(match[1], match[2]);
  return coords ? { ...coords, source: 'data' } : null;
}

/** Parse lat/lng from a full Google Maps URL (no network) */
export function parseGoogleMapsUrl(url: string): ParsedMapCoordinates | null {
  const trimmed = normalizeGoogleMapsInput(url);
  if (!trimmed) return null;

  const raw = parseRawCoordinates(trimmed);
  if (raw) return raw;

  const decoded = trimmed.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');

  const extractors = [
    extractPinCoordinates,
    extractDataOnlyCoordinates,
    () => extractParamCoordinates(decoded, 'query'),
    () => extractParamCoordinates(decoded, 'q'),
    () => extractParamCoordinates(decoded, 'll'),
    () => extractParamCoordinates(decoded, 'center'),
    () => extractParamCoordinates(decoded, 'viewpoint'),
    () => extractParamCoordinates(decoded, 'sll'),
    extractPlacePathCoordinates,
    extractAtCoordinates,
  ];

  for (const extract of extractors) {
    const coords = extract(decoded);
    if (coords) return coords;
  }

  return null;
}

export function extractPlaceNameFromMapsUrl(url: string): string | null {
  const decoded = normalizeGoogleMapsInput(url);

  const placeMatch = decoded.match(/\/maps\/place\/([^/@?&]+)/i);
  if (placeMatch) {
    const name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
    if (name && !new RegExp(`^${NUM},${NUM}$`).test(name)) {
      return name;
    }
  }

  for (const param of ['query', 'q']) {
    const qMatch = decoded.match(new RegExp(`[?&]${param}=([^&]+)`, 'i'));
    if (qMatch) {
      const value = decodeURIComponent(qMatch[1].replace(/\+/g, ' ')).trim();
      if (value && !new RegExp(`^${NUM}\\s*,\\s*${NUM}$`).test(value)) {
        return value;
      }
    }
  }

  return null;
}

export function extractPlaceIdFromMapsUrl(url: string): string | null {
  const decoded = normalizeGoogleMapsInput(url);

  const paramMatch = decoded.match(/[?&]place_id=([^&]+)/i);
  if (paramMatch) return decodeURIComponent(paramMatch[1]);

  const chijMatch = decoded.match(/!1s(ChIJ[\w-]+)/i);
  if (chijMatch) return chijMatch[1];

  return null;
}

function extractUrlFromHtml(html: string): string | null {
  const patterns = [
    /property="og:url"\s+content="([^"]+)"/i,
    /rel="canonical"\s+href="([^"]+)"/i,
    /"url"\s*:\s*"(https:\/\/(?:www\.)?google\.[^"]+\/maps[^"]*)"/i,
    /https:\/\/(?:www\.)?google\.[^"'\\]+?\/maps[^"'\\]+/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]?.includes('/maps') || match?.[0]?.includes('/maps')) {
      return (match[1] ?? match[0]).replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
    }
  }

  return null;
}

function extractCoordsFromHtml(html: string): ParsedMapCoordinates | null {
  const decoded = html.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
  return parseGoogleMapsUrl(decoded) ?? extractPinCoordinates(decoded) ?? extractAtCoordinates(decoded);
}

async function fetchViaProxy(url: string): Promise<{ finalUrl?: string; html?: string } | null> {
  const proxies = [
    async () => {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      const payload = (await response.json()) as { status?: { url?: string }; contents?: string };
      return { finalUrl: payload.status?.url, html: payload.contents };
    },
    async () => {
      const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
        redirect: 'follow',
      });
      if (!response.ok) return null;
      const text = await response.text();
      return { finalUrl: response.url, html: text };
    },
  ];

  for (const attempt of proxies) {
    try {
      const result = await attempt();
      if (result) return result;
    } catch {
      // try next proxy
    }
  }
  return null;
}

/** Follow redirects for goo.gl / maps.app.goo.gl links */
export async function expandGoogleMapsUrl(url: string): Promise<string> {
  const normalized = normalizeGoogleMapsInput(url);
  if (!normalized) return normalized;

  const directParsed = parseGoogleMapsUrl(normalized);
  if (directParsed) return normalized;

  const candidates: string[] = [normalized];

  try {
    const response = await fetch(normalized, { method: 'GET', redirect: 'follow', mode: 'cors' });
    if (response.url) candidates.push(response.url);
    if (response.ok) {
      const text = await response.text();
      const fromHtml = extractUrlFromHtml(text);
      if (fromHtml) candidates.push(fromHtml);
      const fromCoords = extractCoordsFromHtml(text);
      if (fromCoords) candidates.push(`${normalized} !3d${fromCoords.lat}!4d${fromCoords.lng}`);
    }
  } catch {
    // CORS — use proxy
  }

  const proxied = await fetchViaProxy(normalized);
  if (proxied?.finalUrl) candidates.push(proxied.finalUrl);
  if (proxied?.html) {
    const fromHtml = extractUrlFromHtml(proxied.html);
    if (fromHtml) candidates.push(fromHtml);
    const fromCoords = extractCoordsFromHtml(proxied.html);
    if (fromCoords) {
      return `${proxied.finalUrl ?? normalized} !3d${fromCoords.lat}!4d${fromCoords.lng}`;
    }
  }

  for (const candidate of candidates) {
    if (parseGoogleMapsUrl(candidate)) return candidate;
  }

  for (const candidate of candidates) {
    if (candidate.includes('/maps') || candidate.includes('google')) return candidate;
  }

  return normalized;
}

export async function parseGoogleMapsLinkInput(
  input: string,
): Promise<ParsedMapCoordinates | null> {
  const normalized = normalizeGoogleMapsInput(input);

  const direct = parseGoogleMapsUrl(normalized);
  if (direct) return direct;

  const expanded = await expandGoogleMapsUrl(normalized);
  return parseGoogleMapsUrl(expanded);
}

export function isWithinBangalore(lat: number, lng: number): boolean {
  return (
    lat >= BANGALORE_BOUNDS.south &&
    lat <= BANGALORE_BOUNDS.north &&
    lng >= BANGALORE_BOUNDS.west &&
    lng <= BANGALORE_BOUNDS.east
  );
}
