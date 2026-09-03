import { useEffect, useRef, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { X, ScanFace, Camera, MapPin, Clock, CheckCircle2, ShieldCheck, RefreshCw, Loader2, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';

type Props = {
  onClose: () => void;
  onVerified: () => void;
  /** When set, the captured verification is stored against this employee (admin-triggered). */
  employeeId?: string;
  title?: string;
  subtitle?: string;
};

/**
 * Face verification modal. Opens the front camera with a premium scanning
 * overlay, captures a photo, then records the exact location (reverse-geocoded)
 * and timestamp — all stored on the employee's record via the proxy.
 *
 * Camera robustness: the preview is mirrored (selfie-style), autoplays muted,
 * and falls back through camera modes if the first attempt fails — so the
 * employee's face actually shows instead of a black frame.
 */
export default function FaceVerifyModal({ onClose, onVerified, employeeId, title = 'Face ID Verification', subtitle = 'Biometric identity check' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'starting' | 'ready' | 'failed'>('starting');
  const [captured, setCaptured] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [cameraAttempt, setCameraAttempt] = useState(0);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setCameraState('starting');
    setError('');
    const modes: MediaTrackConstraints[] = [
      { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
      { facingMode: { ideal: 'user' }, width: { ideal: 720 }, height: { ideal: 960 } },
      { width: { ideal: 720 }, height: { ideal: 960 } },
    ];
    const mode = modes[Math.min(cameraAttempt, modes.length - 1)];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: mode, audio: false });
      streamRef.current = stream;
      setCameraState('ready');
    } catch (e: any) {
      setCameraState('failed');
      setError(
        e?.name === 'NotAllowedError'
          ? 'Camera permission is blocked. Allow camera access in your browser, then try again.'
          : e?.name === 'NotFoundError'
            ? 'No camera was found on this device.'
            : 'The camera could not be started. Check that no other app is using it, then try again.',
      );
    }
  };

  // Attach stream to video element after it mounts (cameraState → 'ready')
  useEffect(() => {
    if (cameraState === 'ready' && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraState]);

  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryCamera = () => {
    stopCamera();
    setCameraAttempt((n) => n + 1);
    startCamera();
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // The preview is CSS-mirrored, so draw as-is — the saved photo matches the selfie viewfinder.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setCaptured(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
    resolveLocation();
  };

  const retake = () => {
    setCaptured(null);
    setError('');
    setDone(false);
    startCamera();
  };

  const resolveLocation = async () => {
    setLocating(true);
    if (!('geolocation' in navigator)) { setLocating(false); setLocationLabel('Location unavailable'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results?.[0]?.formatted_address) {
            setLocationLabel(data.results[0].formatted_address);
          } else {
            setLocationLabel(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch {
          setLocationLabel(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        setLocating(false);
      },
      () => { setLocating(false); setLocationLabel('Location unavailable'); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async () => {
    if (!captured) return;
    setSubmitting(true);
    setError('');
    try {
      await leadSupabase.employees.faceVerify(captured, coords.lat, coords.lng, locationLabel, employeeId);
      setDone(true);
      onVerified();
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const mapsUrl = coords.lat != null && coords.lng != null ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : null;
  const capturedAt = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050b14]/85 p-4 backdrop-blur-xl">
      {/* ambient gold glow behind the card */}
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A84C]/[0.12] blur-[110px]" />

      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#101E30] to-[#0A1628] shadow-[0_32px_100px_rgba(0,0,0,0.65)]">
        {/* gold hairline */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6B85D]/80 to-transparent" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-[#D6B85D]/40 blur-md" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6B85D]/40 bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-[#F3DFA0]">
                <ScanFace className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>
            </div>
            <div>
              <p className="font-['Inter',sans-serif] text-[15px] font-bold tracking-tight text-white">{title}</p>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]/90">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {done ? (
            /* ── Success ─────────────────────────────────────────── */
            <div className="relative py-8 text-center">
              <div className="pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" strokeWidth={1.6} />
                <span className="absolute -right-1 -top-1 text-[#D6B85D]"><Sparkles className="h-3.5 w-3.5 animate-pulse" strokeWidth={1.8} /></span>
              </div>
              <p className="mt-5 font-['Inter',sans-serif] text-[17px] font-bold tracking-tight text-white">Identity Verified</p>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[12px] leading-relaxed text-white/55">
                Your face, exact location and timestamp have been securely recorded.
              </p>
              <div className="mx-auto mt-5 flex max-w-[310px] flex-col gap-1.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3.5 text-left backdrop-blur">
                <p className="flex items-center gap-2 text-[11px] font-semibold text-white/85">
                  <Clock className="h-3 w-3 text-[#D6B85D]" strokeWidth={1.8} /> {capturedAt}
                </p>
                {locationLabel && (
                  <p className="flex items-start gap-2 text-[11px] leading-snug text-white/50">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[#D6B85D]" strokeWidth={1.8} /> {locationLabel}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-5 text-[12.5px] font-bold text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05] active:scale-[0.99]"
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={2} /> Done
              </button>
            </div>
          ) : (
            <>
              {/* ── Scanner stage ──────────────────────────────────── */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050b14] shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
                {/* Always render video so ref is available when stream is obtained */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  disablePictureInPicture
                  onLoadedMetadata={() => { videoRef.current?.play().catch(() => {}); }}
                  className={`aspect-[4/3] w-full -scale-x-100 object-cover ${cameraState !== 'ready' || captured ? 'hidden' : ''}`}
                />
                {cameraState !== 'ready' && !captured && (
                  <div className="flex aspect-[4/3] w-full items-center justify-center text-white/60">
                    {cameraState === 'starting' ? (
                      <div className="text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6B85D]/20 bg-[#0A1628]/80">
                            <Loader2 className="h-6 w-6 animate-spin text-[#D6B85D]" strokeWidth={1.6} />
                          </div>
                        <p className="mt-4 text-[11.5px] font-semibold tracking-wide text-white/70">Initializing secure camera…</p>
                      </div>
                    ) : (
                      <div className="px-6 text-center">
                        <AlertTriangle className="mx-auto h-7 w-7 text-[#D6B85D]" strokeWidth={1.4} />
                        <p className="mt-2 text-[11.5px] font-semibold leading-relaxed text-white/70">Camera unavailable</p>
                        {error && <p className="mt-1 text-[10.5px] leading-relaxed text-white/50">{error}</p>}
                      </div>
                    )}
                  </div>
                )}
                {captured && (
                  <div className="relative aspect-[4/3] w-full">
                    <img src={captured} alt="Captured face" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-[#D6B85D]/70 shadow-[inset_0_0_50px_rgba(214,184,93,0.25)]" />
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-white shadow-lg">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2} /> Captured
                    </span>
                  </div>
                )}

                {/* Live scan overlay */}
                {(cameraState === 'ready' && !captured) && (
                  <div className="pointer-events-none absolute inset-0">
                    {/* subtle grid */}
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                    {/* instruction pill */}
                    <div className="absolute left-1/2 top-4 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3.5 py-1.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                        <ScanFace className="h-3 w-3 text-[#D6B85D]" strokeWidth={2} /> Align your face
                      </span>
                    </div>
                    {/* face frame — rounded rectangle with a rotating gold sweep */}
                    <div className="absolute left-1/2 top-[12%] h-[72%] w-[68%] -translate-x-1/2">
                      {/* Static border */}
                      <div className="absolute inset-0 rounded-2xl border border-white/20" />
                      {/* Corner accents — each is a separate L-shaped bracket */}
                      <span className="absolute -left-[2px] -top-[2px] h-10 w-10 rounded-tl-2xl border-l-[3px] border-t-[3px] border-[#F3DFA0] shadow-[0_0_12px_rgba(243,223,160,0.5)]" />
                      <span className="absolute -right-[2px] -top-[2px] h-10 w-10 rounded-tr-2xl border-r-[3px] border-t-[3px] border-[#F3DFA0] shadow-[0_0_12px_rgba(243,223,160,0.5)]" />
                      <span className="absolute -bottom-[2px] -left-[2px] h-10 w-10 rounded-bl-2xl border-b-[3px] border-l-[3px] border-[#F3DFA0] shadow-[0_0_12px_rgba(243,223,160,0.5)]" />
                      <span className="absolute -bottom-[2px] -right-[2px] h-10 w-10 rounded-br-2xl border-b-[3px] border-r-[3px] border-[#F3DFA0] shadow-[0_0_12px_rgba(243,223,160,0.5)]" />
                    </div>
                    {/* scan line — sweeps inside the face frame only */}
                    <div className="absolute left-[16%] top-[14%] right-[16%] h-[2px] animate-[fv-scan_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#F3DFA0] to-transparent shadow-[0_0_18px_rgba(243,223,160,0.95)]" />
                  </div>
                )}

                {/* Bottom status bar */}
                {(cameraState === 'ready' && !captured) && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent px-5 pb-3.5 pt-12">
                    <p className="text-[11px] font-semibold text-white/80">Position your face inside the frame</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-300 backdrop-blur">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Live
                    </span>
                  </div>
                )}
                <style>{`
                  @keyframes fv-scan { 0%,100% { top: 14%; opacity: 0.5; } 50% { top: 84%; opacity: 1; } }
                `}</style>
              </div>

              {/* Capture button */}
              {cameraState === 'ready' && !captured && (
                <div className="mx-auto mt-6 flex items-center justify-center">
                  <button
                    onClick={capture}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-8 py-3.5 text-[12.5px] font-bold text-[#0A1628] shadow-[0_8px_30px_rgba(201,168,76,0.45)] transition-all hover:brightness-[1.05] hover:shadow-[0_10px_40px_rgba(201,168,76,0.55)] active:scale-[0.98]"
                    title="Capture face"
                  >
                    <Camera className="h-4 w-4" strokeWidth={1.8} /> Capture
                  </button>
                </div>
              )}
              {cameraState === 'failed' && !captured && (
                <button
                  onClick={retryCamera}
                  className="mx-auto mt-6 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-5 text-[12px] font-bold text-[#0A1628] shadow-[0_6px_20px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05]"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Try Camera Again
                </button>
              )}

              {/* Captured — location + timestamp */}
              {captured && !done && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D6B85D]" strokeWidth={1.8} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/40">Exact PIN location</p>
                        {mapsUrl && (
                          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D6B85D] hover:underline">
                            View on Maps <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
                          </a>
                        )}
                      </div>
                      <p className="mt-1 break-words text-[11.5px] font-semibold leading-snug text-white/85">
                        {locating ? 'Detecting location…' : locationLabel || 'Location unavailable'}
                      </p>
                      {coords.lat != null && (
                        <p className="mt-1 font-mono text-[9px] text-white/35">{coords.lat.toFixed(6)}, {coords.lng?.toFixed(6)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#D6B85D]" strokeWidth={1.8} />
                    <div>
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-white/40">Timestamp</p>
                      <p className="mt-1 text-[11.5px] font-semibold text-white/85">{capturedAt}</p>
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-red-300">{error}</p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      onClick={retake}
                      disabled={submitting}
                      className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/15 px-4 text-[12px] font-bold text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Retake
                    </button>
                    <button
                      onClick={submit}
                      disabled={submitting || locating}
                      className="inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-4 text-[12.5px] font-bold text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" strokeWidth={2} />}
                      {submitting ? 'Verifying…' : 'Verify & Submit'}
                    </button>
                  </div>
                </div>
              )}

              {!captured && cameraState === 'failed' && error && (
                <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-red-300">{error}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
