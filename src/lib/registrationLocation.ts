/**
 * Partner registration — automatic device location capture.
 *
 * Called from the registration SUBMIT interaction only (never on page load,
 * per Chromium/Safari permission UX norms). Single fresh reading with high
 * accuracy; a readable address is resolved but never substitutes for the
 * exact coordinates. Failure is reported honestly — no fabricated values —
 * and registration continues when the device/permission does not cooperate.
 */

import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';

export interface RegistrationLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  /** Resolved readable address — NOT proof of the partner's address. */
  resolvedAddress: string;
  status: 'CAPTURED' | 'CAPTURED_LOW_ACCURACY';
}

export type LocationFailure =
  | 'DENIED'
  | 'UNSUPPORTED'
  | 'INSECURE'
  | 'TIMEOUT'
  | 'UNAVAILABLE';

export interface LocationCaptureResult {
  location: RegistrationLocation | null;
  failure?: LocationFailure;
}

/** Target ±20 m like the previous capture card; reads worse than this are
 * still stored, flagged CAPTURED_LOW_ACCURACY with the reported accuracy. */
const ACCURACY_TARGET_M = 20;
/** Reasonable ask for a user-initiated, user-waiting submit. */
const POSITION_TIMEOUT_MS = 15_000;

const FAILURE_MESSAGE: Record<LocationFailure, string> = {
  DENIED: 'Location was not captured — permission was denied. Registration can continue; a VJR Estate associate will verify your location during onboarding.',
  UNSUPPORTED: 'Your browser does not support location capture. Registration can continue; location can be verified during onboarding.',
  INSECURE: 'Location needs a secure (HTTPS) connection. Registration can continue; location can be verified during onboarding.',
  TIMEOUT: 'The location request timed out before a usable reading arrived. Registration can continue.',
  UNAVAILABLE: 'Your device could not determine a position right now. Registration can continue.',
};

export function locationFailureMessage(failure: LocationFailure): string {
  return FAILURE_MESSAGE[failure];
}

/** Reverse-geocode readable address — best-effort, coordinates remain valid without it. */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.length) {
      return String(data.results[0].formatted_address ?? '');
    }
  } catch {
    /* address is optional */
  }
  return '';
}

/**
 * Capture the device's current position. RESOLVES with { location: null } on
 * any failure (permission denied, unsupported, timeout, unavailable) — it
 * never throws and never fabricates coordinates.
 */
export function captureRegistrationLocation(): Promise<LocationCaptureResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve({ location: null, failure: 'UNSUPPORTED' });
      return;
    }
    if (!window.isSecureContext) {
      resolve({ location: null, failure: 'INSECURE' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location: RegistrationLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy ?? null,
          capturedAt: new Date().toISOString(),
          resolvedAddress: '',
          status: 'CAPTURED',
        };
        if (location.accuracyMeters != null && location.accuracyMeters > ACCURACY_TARGET_M) {
          location.status = 'CAPTURED_LOW_ACCURACY';
        }
        // Address resolution must not delay registration completion; resolve
        // immediately and attach the address when it arrives.
        reverseGeocode(location.latitude, location.longitude).then((addr) => {
          location.resolvedAddress = addr;
        });
        resolve({ location });
      },
      (err) => {
        if (err.code === 1) resolve({ location: null, failure: 'DENIED' });
        else if (err.code === 3) resolve({ location: null, failure: 'TIMEOUT' });
        else resolve({ location: null, failure: 'UNAVAILABLE' });
      },
      { enableHighAccuracy: true, timeout: POSITION_TIMEOUT_MS, maximumAge: 0 },
    );
  });
}
