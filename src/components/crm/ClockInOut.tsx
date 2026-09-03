import { useEffect, useRef, useState, useCallback } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { GOOGLE_MAPS_API_KEY } from '@/data/mapConfig';
import {
  LogIn, LogOut, Coffee, MapPin, Camera, Clock, CheckCircle2,
  Loader2, AlertTriangle, ShieldCheck, X, Timer, Play, Square,
} from 'lucide-react';

type Props = {
  /** The attendance record for today (null if not yet clocked in) */
  today: any;
  /** Active break record (null if not on break) */
  activeBreak: any;
  /** Called after clock-in/out or break start/end to refresh parent data */
  onChanged: () => void;
};

type CameraStage = 'idle' | 'starting' | 'ready' | 'captured' | 'failed';

/**
 * Jibble-style clock in / clock out widget.
 *
 * Shows a large action button that:
 *  1. Opens the front camera for a selfie
 *  2. Captures the GPS location
 *  3. Reverse-geocodes the address
 *  4. Sends everything to the proxy
 *
 * Also handles break start / end.
 */
export default function ClockInOut({ today, activeBreak, onChanged }: Props) {
  const isClockedIn = Boolean(today?.check_in);
  const isOnBreak = Boolean(activeBreak);
  const isCheckedOut = Boolean(today?.check_out);

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStage, setCameraStage] = useState<CameraStage>('idle');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);

  // Location
  const [locationLabel, setLocationLabel] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [locating, setLocating] = useState(false);

  // Action state
  const [actionType, setActionType] = useState<'clockIn' | 'clockOut' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Break
  const [breakReason, setBreakReason] = useState('');
  const [showBreakInput, setShowBreakInput] = useState(false);

  // Geofence
  const [geofenceResult, setGeofenceResult] = useState<any>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraStage('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraStage('ready');
    } catch {
      setCameraStage('failed');
    }
  }, []);

  // Attach stream to video element after it mounts (cameraStage → 'ready')
  useEffect(() => {
    if (cameraStage === 'ready' && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraStage]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedSelfie(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera();
  };

  const resolveLocation = useCallback(async () => {
    setLocating(true);
    if (!('geolocation' in navigator)) {
      setLocating(false);
      setLocationLabel('Location unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`,
          );
          const data = await res.json();
          setLocationLabel(
            data.status === 'OK' && data.results?.[0]?.formatted_address
              ? data.results[0].formatted_address
              : `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          );
          // Check geofences
          try {
            const geoRes = await leadSupabase.geofences.check(latitude, longitude);
            const within = geoRes.data?.filter((g: any) => g.is_within) ?? [];
            setGeofenceResult(within.length > 0 ? within[0] : { outside: true });
          } catch { /* geofences not configured */ }
        } catch {
          setLocationLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocationLabel('Location unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const handleClockAction = async (type: 'clockIn' | 'clockOut') => {
    setActionType(type);
    setCapturedSelfie(null);
    setResult(null);
    setGeofenceResult(null);
    setCoords({ lat: null, lng: null });
    setLocationLabel('');
    await startCamera();
  };

  const submitAction = async () => {
    if (!actionType || processing) return;
    setProcessing(true);
    setResult(null);
    try {
      if (actionType === 'clockIn') {
        await leadSupabase.employees.clockIn(
          coords.lat, coords.lng, locationLabel, capturedSelfie ?? undefined,
          geofenceResult?.id,
        );
        setResult({ success: true, message: 'Clocked in successfully!' });
      } else {
        const res = await leadSupabase.employees.clockOut(
          coords.lat, coords.lng, locationLabel, capturedSelfie ?? undefined,
        );
        setResult({
          success: true,
          message: `Clocked out — ${Math.floor(res.workedMinutes / 60)}h ${res.workedMinutes % 60}m worked${res.overtimeMinutes > 0 ? ` (${res.overtimeMinutes}m OT)` : ''}`,
        });
      }
      onChanged();
    } catch (e: any) {
      setResult({ success: false, message: e?.message ?? 'Action failed' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartBreak = async () => {
    try {
      await leadSupabase.employees.startBreak(breakReason || undefined);
      setShowBreakInput(false);
      setBreakReason('');
      onChanged();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to start break');
    }
  };

  const handleEndBreak = async () => {
    try {
      const res = await leadSupabase.employees.endBreak();
      const mins = Math.floor(res.durationSeconds / 60);
      const msg = res.autoClockOut
        ? `Break ended (${mins}m) — you have been clocked out. Tap Clock In for your afternoon session.`
        : `Break ended — ${mins}m ${res.durationSeconds % 60}s`;
      setResult({ success: true, message: msg });
      onChanged();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to end break');
    }
  };

  // After camera starts, resolve location in parallel
  useEffect(() => {
    if (cameraStage === 'ready') resolveLocation();
  }, [cameraStage, resolveLocation]);

  const now = new Date();
  const currentTime = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Compute hours worked so far
  let hoursWorked = '0h 0m';
  if (today?.check_in) {
    const [ciH, ciM] = String(today.check_in).split(':').map(Number);
    const coH = today.check_out ? Number(String(today.check_out).split(':')[0]) : now.getHours();
    const coM = today.check_out ? Number(String(today.check_out).split(':')[1]) : now.getMinutes();
    const mins = Math.max(0, (coH * 60 + coM) - (ciH * 60 + ciM) - (today.total_break_minutes ?? 0));
    hoursWorked = `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }

  // Camera modal
  if (actionType && !result) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050b14]/85 p-4 backdrop-blur-xl">
        <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#101E30] to-[#0A1628] shadow-[0_32px_100px_rgba(0,0,0,0.65)]">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6B85D]/80 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-[#F3DFA0] ring-1 ring-[#D6B85D]/40">
                {actionType === 'clockIn' ? <LogIn className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />}
              </div>
              <div>
                <p className="text-[15px] font-bold text-white">{actionType === 'clockIn' ? 'Clock In' : 'Clock Out'}</p>
                <p className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]/90">
                  {actionType === 'clockIn' ? 'Selfie + GPS verification' : 'Selfie + GPS verification'}
                </p>
              </div>
            </div>
            <button onClick={() => { stopCamera(); setActionType(null); setCapturedSelfie(null); }} className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 pb-5 sm:px-6 sm:pb-6">
            {/* Camera / captured selfie */}
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#050b14]">
              {/* Always render video so ref is available when stream is obtained */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                disablePictureInPicture
                onLoadedMetadata={() => { videoRef.current?.play().catch(() => {}); }}
                className={`aspect-[4/3] w-full -scale-x-100 object-cover ${cameraStage !== 'ready' || capturedSelfie ? 'hidden' : ''}`}
              />
              {(cameraStage !== 'ready' && !capturedSelfie) && (
                <div className="flex aspect-[4/3] w-full items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#D6B85D]" />
                    <p className="mt-3 text-[11px] font-semibold text-white/60">
                      {cameraStage === 'starting' ? 'Starting camera…' : 'Camera unavailable — photo optional'}
                    </p>
                    {cameraStage === 'failed' && (
                      <button onClick={() => { setCapturedSelfie('_skip_'); resolveLocation(); }} className="mt-3 min-h-[36px] text-[11px] font-bold text-[#D6B85D] hover:underline">
                        Skip photo & continue
                      </button>
                    )}
                  </div>
                </div>
              )}
              {capturedSelfie && capturedSelfie !== '_skip_' && (
                <img src={capturedSelfie} alt="Selfie" className="aspect-[4/3] w-full object-cover" />
              )}
              {/* Capture button */}
              {cameraStage === 'ready' && !capturedSelfie && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button onClick={captureSelfie} className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform hover:scale-105 active:scale-95">
                    <Camera className="h-6 w-6 text-[#0A1628]" />
                  </button>
                </div>
              )}
              {capturedSelfie && capturedSelfie !== '_skip_' && (
                <button onClick={() => { setCapturedSelfie(null); startCamera(); }} className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/20 px-4 py-1.5 text-[11px] font-bold text-white backdrop-blur hover:bg-white/30">
                  Retake
                </button>
              )}
            </div>

            {/* Location info */}
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
              <div className="flex items-start gap-2 text-[11px] font-semibold text-white/70">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D6B85D]" />
                <span className="break-words">{locating ? 'Resolving location…' : locationLabel || 'Location unavailable'}</span>
              </div>
              {geofenceResult && !geofenceResult.outside && (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <ShieldCheck className="h-3 w-3" /> Within geofence: {geofenceResult.name}
                </p>
              )}
              {geofenceResult?.outside && (
                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-400">
                  <AlertTriangle className="h-3 w-3" /> Outside all geofences — clock-in will be flagged
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={submitAction}
              disabled={processing}
              className={`mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[13px] font-bold transition-all ${
                actionType === 'clockIn'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] hover:brightness-105 active:scale-[0.99]'
                  : 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-[0_8px_24px_rgba(245,158,11,0.35)] hover:brightness-105 active:scale-[0.99]'
              } disabled:opacity-40`}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (actionType === 'clockIn' ? <LogIn className="h-4 w-4" /> : <LogOut className="h-4 w-4" />)}
              {processing ? 'Processing…' : (actionType === 'clockIn' ? 'Confirm Clock In' : 'Confirm Clock Out')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result modal
  if (result) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#050b14]/85 p-4 backdrop-blur-xl" onClick={() => { setResult(null); setActionType(null); }}>
        <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/[0.09] bg-gradient-to-b from-[#101E30] to-[#0A1628] p-8 text-center shadow-[0_32px_100px_rgba(0,0,0,0.65)]" onClick={(e) => e.stopPropagation()}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${result.success ? 'bg-emerald-500/10 ring-1 ring-emerald-400/30' : 'bg-red-500/10 ring-1 ring-red-400/30'}`}>
            {result.success ? <CheckCircle2 className="h-8 w-8 text-emerald-400" /> : <AlertTriangle className="h-8 w-8 text-red-400" />}
          </div>
          <p className="mt-4 text-[17px] font-bold text-white">{result.success ? 'Done!' : 'Error'}</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/55">{result.message}</p>
          <button onClick={() => { setResult(null); setActionType(null); }} className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-5 text-[12.5px] font-bold text-[#0A1628]">
            <CheckCircle2 className="h-4 w-4" /> OK
          </button>
        </div>
      </div>
    );
  }

  // Main widget
  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] overflow-hidden">
      {/* Live clock header */}
      <div className="bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]/70">Current Time</p>
            <p className="font-mono text-[22px] font-bold tabular-nums text-white">{currentTime}</p>
            <p className="text-[11px] font-semibold text-white/40">{currentDate}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#D6B85D]/70">Today's Hours</p>
            <p className="font-mono text-[22px] font-bold tabular-nums text-white">{hoursWorked}</p>
            {today?.overtime_minutes > 0 && (
              <p className="text-[10px] font-bold text-amber-400">+{today.overtime_minutes}m overtime</p>
            )}
          </div>
        </div>
      </div>

      {/* Status strip with selfie thumbnails */}
      <div className="grid grid-cols-3 gap-px bg-black/[0.04]">
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Check-in</p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[#0A1628]">
            {today?.check_in ? String(today.check_in).slice(0, 5) : '—'}
          </p>
          {today?.check_in_selfie_url && (
            <img src={today.check_in_selfie_url} alt="Clock-in selfie" className="mx-auto mt-1.5 h-8 w-8 rounded-lg object-cover ring-1 ring-emerald-200" title="Clock-in selfie" />
          )}
        </div>
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Check-out</p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[#0A1628]">
            {today?.check_out ? String(today.check_out).slice(0, 5) : '—'}
          </p>
          {today?.check_out_selfie_url && (
            <img src={today.check_out_selfie_url} alt="Clock-out selfie" className="mx-auto mt-1.5 h-8 w-8 rounded-lg object-cover ring-1 ring-amber-200" title="Clock-out selfie" />
          )}
        </div>
        <div className="bg-white px-3 py-3 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Break</p>
          <p className="mt-0.5 text-[13px] font-bold tabular-nums text-[#0A1628]">
            {today?.total_break_minutes ?? 0}m
          </p>
        </div>
      </div>

      {/* Main action area */}
      <div className="p-5">
        {!isClockedIn ? (
          /* ── CLOCK IN button ── */
          <button
            onClick={() => handleClockAction('clockIn')}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 px-6 py-5 text-[15px] font-bold text-white shadow-[0_8px_32px_rgba(16,185,129,0.35)] transition-all hover:brightness-105 hover:shadow-[0_12px_40px_rgba(16,185,129,0.45)] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <LogIn className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="text-left">
              <p className="text-[15px] font-bold">Clock In</p>
              <p className="text-[10px] font-semibold text-white/70">Selfie + GPS verification</p>
            </div>
          </button>
        ) : isCheckedOut ? (
          /* ── Already checked out ── */
          <div className="rounded-2xl border border-black/[0.06] bg-[#fafafa] p-5 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <p className="mt-2 text-[13px] font-bold text-[#0A1628]">Shift completed</p>
            <p className="mt-0.5 text-[11px] text-[#6b7280]">
              {hoursWorked} worked · {today?.total_break_minutes ?? 0}m break
              {today?.overtime_minutes > 0 ? ` · ${today.overtime_minutes}m overtime` : ''}
            </p>
          </div>
        ) : (
          /* ── Clocked in — show CLOCK OUT + BREAK controls ── */
          <div className="space-y-3">
            {/* Break controls */}
            <div className="flex gap-2">
              {!isOnBreak ? (
                <button
                  onClick={() => setShowBreakInput(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[12px] font-bold text-amber-700 transition-all hover:bg-amber-100 active:scale-[0.98]"
                >
                  <Coffee className="h-4 w-4" /> Start Break
                </button>
              ) : (
                <button
                  onClick={handleEndBreak}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-[12px] font-bold text-emerald-700 transition-all hover:bg-emerald-100 active:scale-[0.98]"
                >
                  <Square className="h-3.5 w-3.5" /> End Break
                  {activeBreak?.break_start && (
                    <span className="ml-1 font-mono text-[10px] opacity-70">
                      since {new Date(activeBreak.break_start).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Break reason input */}
            {showBreakInput && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <input
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  placeholder="Break reason (optional)"
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleStartBreak()}
                />
                <div className="mt-2 flex gap-2">
                  <button onClick={handleStartBreak} className="flex-1 rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600">Start Break</button>
                  <button onClick={() => { setShowBreakInput(false); setBreakReason(''); }} className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Clock out button */}
            <button
              onClick={() => handleClockAction('clockOut')}
              disabled={isOnBreak}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-5 text-[15px] font-bold text-white shadow-[0_8px_32px_rgba(245,158,11,0.35)] transition-all hover:brightness-105 hover:shadow-[0_12px_40px_rgba(245,158,11,0.45)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <LogOut className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <div className="text-left">
                <p className="text-[15px] font-bold">Clock Out</p>
                <p className="text-[10px] font-semibold text-white/70">
                  {isOnBreak ? 'End your break first' : 'Selfie + GPS verification'}
                </p>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
