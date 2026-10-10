import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { MapPin, ArrowClockwise, CheckCircle, Warning, CircleNotch, Globe, Lock } from '@phosphor-icons/react';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';
import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';

/**
 * Partner registration — automatic device geolocation capture (step 4).
 *
 * Design notes (ui-ux-pro-max: premium onboarding on a form surface):
 * - Restrained, mobile-first card: heading, one-line why, primary action.
 *   No gradients, no oversized decoration; hairline borders, soft surface.
 * - The browser permission prompt is triggered ONLY by the explicit button
 *   tap (never on mount) per Chromium/Safari permission UX norms.
 * - Capture uses navigator.geolocation.watchPosition to collect successive
 *   readings and retain the BEST valid one (target accuracy ≤ 20 m) within a
 *   bounded window. It never asks twice concurrently, and the watcher is
 *   always cleared on completion/timeout/unmount.
 * - The map pin is tied to the exact captured coordinates. Reverse geocoding
 *   supplies a readable address only — it never moves the pin and never
 *   counts as verification of the partner's residence.
 * - No manual location fields, no manual pin dragging, no IP fallback.
 */

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
  resolvedAddress: string;
  /** Resolved address could not be obtained — coordinates still valid. */
  addressFailed?: boolean;
  status: 'CAPTURED' | 'CAPTURED_LOW_ACCURACY' | 'FAILED' | 'DENIED' | 'SKIPPED';
}

interface GeolocationErrorLike {
  code?: number;
  message?: string;
}

const ACCURACY_TARGET_M = 20;
const CAPTURE_WINDOW_MS = 30_000;
/** Wider grace window for the very first fix (GPS cold starts are slow). */
const FIRST_FIX_GRACE_MS = 10_000;

const DARK_CONTAINER_STYLES = { height: '230px', width: '100%' } as const;
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  gestureHandling: 'cooperative',
  clickableIcons: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
} as google.maps.MapOptions;

type Phase =
  | 'idle'
  | 'recoverable'   // UNAWARE browser / insecure context / unsupported
  | 'capturing'
  | 'captured'
  | 'failed'
  | 'denied';

const GPS_ERROR_TEXT: Record<number, string> = {
  1: 'Location permission is off for this site. Allow location access for VJR Estate in your browser settings, then retry.',
  2: 'Your device could not determine a position right now. Check that location services are enabled for your browser, then retry.',
  3: 'The location request timed out before a usable reading arrived. Move to an open area or retry.',
};

export default function PartnerLocationCapture({
  onChange,
  disabled = false,
}: {
  onChange: (value: CapturedLocation | null) => void;
  /** True while the wizard is submitting — blocks re-capture. */
  disabled?: boolean;
}) {
  const { isLoaded, loadError, requestMaps } = useGoogleMapsLoader();
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorText, setErrorText] = useState('');
  const [best, setBest] = useState<{ lat: number; lng: number; acc: number | null; at: string } | null>(null);
  const [address, setAddress] = useState('');
  const [addressFailed, setAddressFailed] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestRef = useRef<{ lat: number; lng: number; acc: number | null; at: string } | null>(null);
  const mountedRef = useRef(true);
  const isFirstFixRef = useRef(true);

  const cleanupWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Cancel any active watcher when the wizard unmounts or navigates steps.
      cleanupWatch();
    };
  }, [cleanupWatch]);

  // Reverse geocode the coordinates (readable address only — never moves the pin).
  const geocodeAddress = useCallback(async (lat: number, lng: number) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
      );
      const data = await res.json();
      if (!mountedRef.current) return;
      if (data.status === 'OK' && data.results?.length) {
        setAddress(String(data.results[0].formatted_address ?? ''));
        setAddressFailed(false);
      } else {
        setAddressFailed(true);
      }
    } catch {
      if (mountedRef.current) setAddressFailed(true);
    } finally {
      if (mountedRef.current) setGeocoding(false);
    }
  }, []);

  const finish = useCallback(
    (reading: { lat: number; lng: number; acc: number | null; at: string }, timedOut: boolean) => {
      cleanupWatch();
      const okTarget = reading.acc != null && reading.acc <= ACCURACY_TARGET_M;
      setBest(reading);
      bestRef.current = reading;
      onChange({
        latitude: reading.lat,
        longitude: reading.lng,
        accuracyMeters: reading.acc,
        capturedAt: reading.at,
        resolvedAddress: '',
        status: okTarget ? 'CAPTURED' : 'CAPTURED_LOW_ACCURACY',
      });
      setPhase('captured');
      if (timedOut) {
        setErrorText(
          reading.acc != null
            ? `Stopped improving at ±${Math.round(reading.acc)} m accuracy (target ±${ACCURACY_TARGET_M} m).`
            : 'No accuracy estimate was reported by the device.',
        );
      }
      void geocodeAddress(reading.lat, reading.lng);
    },
    [cleanupWatch, onChange, geocodeAddress],
  );

  const startCapture = useCallback(() => {
    if (disabled || phase === 'capturing') return;
    // One honest gate BEFORE the browser prompt fires: the section explains
    // why, the button is the consent action. Insecure-context browsers
    // either block geolocation or degrade it to IP-derived values, so we
    // refuse rather than show a wrong "GPS verified" state.
    if (!('geolocation' in navigator)) {
      setPhase('recoverable');
      setErrorText('Your browser does not support location capture. You can continue — a VJR Estate associate will verify your location during onboarding.');
      return;
    }
    if (!window.isSecureContext) {
      setPhase('recoverable');
      setErrorText('Location capture needs a secure connection (HTTPS). Open this page over HTTPS, or continue — location can be verified later during onboarding.');
      return;
    }
    setPhase('capturing');
    setErrorText('');
    setBest(null);
    bestRef.current = null;
    setAddress('');
    setAddressFailed(false);
    onChange(null);
    isFirstFixRef.current = true;
    requestMaps();
    const startedAt = Date.now();
    const deadline = startedAt + CAPTURE_WINDOW_MS;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mountedRef.current) return;
        const at = new Date().toISOString();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy ?? null;
        const prev = bestRef.current;
        // Retain the best (smallest reported accuracy) valid reading.
        if (!prev || (acc != null && (prev.acc == null || acc < prev.acc))) {
          const reading = { lat, lng, acc, at };
          bestRef.current = reading;
          setBest(reading);
        }
        const current = bestRef.current!;
        const goodEnough = current.acc != null && current.acc <= ACCURACY_TARGET_M;
        if (goodEnough) {
          // Target met — finish immediately with the best reading.
          finish(current, false);
        } else if (Date.now() >= deadline - (isFirstFixRef.current ? 0 : FIRST_FIX_GRACE_MS)) {
          isFirstFixRef.current = false;
          finish(current, true);
        }
      },
      (err: GeolocationErrorLike) => {
        if (!mountedRef.current) return;
        cleanupWatch();
        const code = err.code ?? 0;
        if (code === 1) {
          setPhase('denied');
          onChange(null);
        } else {
          setPhase('failed');
          onChange(null);
        }
        setErrorText(GPS_ERROR_TEXT[code] ?? 'Location could not be captured. Please retry.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 60_000 },
    );

    // Hard window: if no reading at all arrived in CAPTURE_WINDOW_MS, stop.
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const current = bestRef.current;
      if (current) {
        finish(current, true);
      } else {
        cleanupWatch();
        setPhase('failed');
        onChange(null);
        setErrorText('No location reading arrived in time. Make sure location services are on for your browser, then retry.');
      }
    }, CAPTURE_WINDOW_MS);
  }, [disabled, phase, requestMaps, finish, cleanupWatch, onChange]);

  const retry = useCallback(() => {
    onChange(null);
    setBest(null);
    bestRef.current = null;
    setAddress('');
    setAddressFailed(false);
    setErrorText('');
    setPhase('idle');
  }, [onChange]);

  const reading = best;
  const lowAccuracy = reading?.acc != null && reading.acc > ACCURACY_TARGET_M;

  return (
    <section aria-labelledby="plc-heading" className="rounded-xl border border-[#E4E7EC] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A1628]">
          <Globe size={18} weight="duotone" className="text-[#C9A84C]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="plc-heading" className="text-[15px] font-semibold text-[#101828]">Verify Your Current Location</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#667085]">
            Allow VJR Estate to capture your device's current location to help verify your partner registration.
            Your coordinates are shared only with VJR Estate administrators and are never shown publicly.
          </p>
        </div>
      </div>

      <div className="mt-4">
        {/* ── IDLE / PERMISSION REQUESTED ── */}
        {(phase === 'idle' || phase === 'capturing') && (
          <div>
            {phase === 'idle' && (
              <>
                <button
                  type="button"
                  onClick={startCapture}
                  disabled={disabled}
                  className="admin-btn-primary min-h-[48px] w-full gap-2 disabled:opacity-60"
                >
                  <MapPin size={16} weight="bold" aria-hidden="true" />
                  Capture My Current Location
                </button>
                <p className="mt-2 text-[11.5px] text-[#667085]">
                  On tapping this your browser will ask for permission — choose <span className="font-semibold text-[#475467]">Allow</span>.
                </p>
              </>
            )}
            {phase === 'capturing' && (
              <div className="rounded-lg border border-[#E4E7EC] bg-[#F8F9FB] px-4 py-4" role="status" aria-live="polite">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]">
                  <CircleNotch size={16} className="animate-spin text-[#C9A84C]" aria-hidden="true" />
                  Finding your current location…
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#667085]">
                  If your browser shows a permission prompt, choose <span className="font-semibold text-[#475467]">Allow</span>.
                  This usually completes within a few seconds.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── RECOVERABLE: unsupported / insecure context ── */}
        {phase === 'recoverable' && (
          <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="flex items-start gap-2 text-[12.5px] font-medium text-amber-800">
              <Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {errorText}
            </p>
          </div>
        )}

        {/* ── CAPTURED ── */}
        {phase === 'captured' && reading && (
          <div>
            {!isLoaded && !loadError && (
              <div className="flex h-[230px] w-full items-center justify-center rounded-lg border border-[#E4E7EC] bg-[#F8F9FB]" role="status">
                <p className="flex items-center gap-2 text-[12.5px] text-[#667085]">
                  <CircleNotch size={15} className="animate-spin text-[#C9A84C]" aria-hidden="true" />
                  Loading map…
                </p>
              </div>
            )}
            {loadError && (
              <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] font-medium text-amber-800">
                The map could not load (Google Maps configuration issue). Your coordinates were still captured — see the details below.
              </div>
            )}
            {isLoaded && reading && (
              <GoogleMap
                mapContainerStyle={DARK_CONTAINER_STYLES}
                center={{ lat: reading.lat, lng: reading.lng }}
                zoom={17}
                options={MAP_OPTIONS}
              >
                <Marker position={{ lat: reading.lat, lng: reading.lng }} title="Captured location" />
              </GoogleMap>
            )}

            <div className="mt-3 rounded-lg bg-emerald-50 px-4 py-3" role="status" aria-live="polite">
              <p className="flex items-start gap-2 text-[12.5px] font-semibold text-emerald-800">
                <CheckCircle size={15} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                {lowAccuracy
                  ? 'Location captured — less accurate than target'
                  : 'Location captured'}
              </p>
              {geocoding ? (
                <p className="mt-1 ml-6 flex items-center gap-1.5 text-[12px] text-emerald-700">
                  <CircleNotch size={12} className="animate-spin" aria-hidden="true" />
                  Resolving address…
                </p>
              ) : addressFailed ? (
                <p className="mt-1 ml-6 text-[12px] text-emerald-700">
                  The address could not be resolved — your exact coordinates were saved.
                </p>
              ) : address ? (
                <p className="mt-1 ml-6 text-[12px] text-emerald-700">{address}</p>
              ) : null}
              {lowAccuracy && (
                <p className="mt-1.5 ml-6 text-[11.5px] leading-relaxed text-emerald-700">
                  Your device reported a wider accuracy than our ±20 m target. You can retry for a sharper
                  reading, or continue — the reported accuracy is saved honestly.
                </p>
              )}
              <p className="mt-1.5 ml-6 text-[11px] text-emerald-700/80">
                Device-reported location — not independently verified proof of your address.
              </p>
            </div>

            {/* Secondary details — exact values, nothing hidden. */}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg border border-[#E4E7EC] bg-[#F8F9FB] px-4 py-3 text-[11.5px] sm:grid-cols-4">
              <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Latitude</dt><dd className="mt-0.5 font-semibold text-[#101828]">{reading.lat.toFixed(7)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Longitude</dt><dd className="mt-0.5 font-semibold text-[#101828]">{reading.lng.toFixed(7)}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Accuracy</dt><dd className="mt-0.5 font-semibold text-[#101828]">{reading.acc != null ? `± ${Math.round(reading.acc)} m` : 'Not reported'}</dd></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#98A2B3]">Captured</dt><dd className="mt-0.5 font-semibold text-[#101828]">{new Date(reading.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</dd></div>
            </dl>

            <button
              type="button"
              onClick={retry}
              disabled={disabled}
              className="admin-btn-secondary mt-3 min-h-[44px] !px-4 gap-2 disabled:opacity-60"
            >
              <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
              Retry Location Capture
            </button>
          </div>
        )}

        {/* ── FAILED / DENIED ── */}
        {(phase === 'failed' || phase === 'denied') && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="flex items-start gap-2 text-[12.5px] font-medium text-red-700">
              <Warning size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              {errorText || 'Location could not be captured.'}
            </p>
            <button
              type="button"
              onClick={startCapture}
              disabled={disabled}
              className="admin-btn-secondary mt-3 min-h-[44px] !px-4 gap-2 disabled:opacity-60"
            >
              <ArrowClockwise size={14} weight="bold" aria-hidden="true" />
              Retry Location Capture
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
