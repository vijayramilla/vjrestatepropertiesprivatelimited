import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';
import { CrmBtn, CrmCard, MotionReveal } from '@/components/crm/CrmUi';
import {
  Clock, LogIn, LogOut, CheckCircle, TrendingUp, Eye,
  PartyPopper, Megaphone, BadgeCheck, Hourglass, UserRound, ShieldCheck,
  NotebookPen, Save, Check, X,
} from 'lucide-react';
import FaceVerifyModal from '@/components/crm/FaceVerifyModal';
import EmployeeProfileModal from '@/components/crm/EmployeeProfileModal';
import EmployeeClientsSection from '@/components/crm/EmployeeClientsSection';
import ClockInOut from '@/components/crm/ClockInOut';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function fmtTime(t: string | null | undefined): string {
  if (!t) return '—';
  return t.length >= 8 ? t.slice(0, 5) : t;
}

function fmtTime12(t: string | null | undefined): string {
  if (!t) return '—';
  const raw = t.length >= 8 ? t.slice(0, 5) : t;
  const [hStr, mStr] = raw.split(':').map(Number);
  if (hStr == null || mStr == null || Number.isNaN(hStr)) return raw;
  const h = hStr % 12 === 0 ? 12 : hStr % 12;
  const suffix = hStr < 12 ? 'AM' : 'PM';
  return `${h}:${String(mStr).padStart(2, '0')} ${suffix}`;
}

export default function CrmEmployeeDashboard() {
  useEmployeeSession(); // session tracking lives here (no sidebar in the employee workspace)
  const { id } = useParams(); // present = admin preview of that employee
  const preview = Boolean(id);
  const navigate = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [profileOpen, setProfileOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [faceVerifiedAt, setFaceVerifiedAt] = useState<string | null>(null);
  const [faceCheckDone, setFaceCheckDone] = useState(false);

  // My Notes — kept in the corner popup (top-bar Notes button).
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSavedAt, setNotesSavedAt] = useState<number | null>(null);

  // Jibble-style attendance
  const [todayAtt, setTodayAtt] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);

  const fetchAll = useCallback(async () => {
    try {
      const verifyP = leadSupabase.admin.verify().catch(() => ({ role: undefined as string | undefined }));
      const meP = preview
        ? leadSupabase.employees.get(id!)
        : leadSupabase.employees.me().catch(() => ({ data: null }));
      const statsP = leadSupabase.employees.sessionStats(preview ? id : undefined).catch(() => ({ data: null }));
      const clientsP = leadSupabase.employees.clients(preview ? id : undefined).catch(() => ({ data: { clients: [] as any[] } }));
      const eventsP = leadSupabase.events.list().catch(() => ({ data: [] as any[] }));
      const visitsP = leadSupabase.visits.list(preview ? id : undefined).catch(() => ({ data: [] as any[] }));
      const payrollP = leadSupabase.employees.payroll(preview ? id! : undefined).catch(() => ({ data: [] as any[] }));
      const [verify, meRes, statsRes, clientsRes, eventsRes, visitsRes, payrollRes] = await Promise.all([verifyP, meP, statsP, clientsP, eventsP, visitsP, payrollP]);
      setIsEmployee(verify.role === 'employee');
      setMe(meRes.data);
      setStats(statsRes.data);
      setClients(clientsRes.data?.clients ?? []);
      setEvents(eventsRes.data ?? []);
      setVisits(visitsRes.data ?? []);
      setPayroll(payrollRes.data ?? []);
      if (meRes.data) setNotesDraft((prev) => (prev === '' ? (meRes.data.notes ?? '') : prev));

      // Fetch today's Jibble-style attendance
      try {
        const attRes = await leadSupabase.employees.today();
        setTodayAtt(attRes.data);
        const brk = attRes.breaks?.find((b: any) => !b.break_end) ?? null;
        setActiveBreak(brk);
      } catch { /* attendance may not exist yet */ }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [preview, id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const t = setInterval(fetchAll, 30000); // realtime refresh
    return () => clearInterval(t);
  }, [fetchAll]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000); // live clock
    return () => clearInterval(t);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  // After login, ask for face verification only when the admin enabled the
  // policy (face_verify_required). No default prompt for everyone else.
  useEffect(() => {
    if (preview) return;
    if (!me) return;
    if (faceCheckDone) return;
    leadSupabase.employees.faceVerifications().then((res) => {
      const last = res.lastFaceVerifiedAt ?? res.data?.[0]?.verified_at ?? null;
      setFaceVerifiedAt(last);
      const required = me?.face_verify_required === true;
      const freq = me?.face_verify_frequency ?? 'daily';
      let needsVerify = false;
      if (required && freq === 'weekly') needsVerify = !last || (Date.now() - new Date(last).getTime()) > 7 * 86400000;
      else if (required) needsVerify = !last || !last.startsWith(today);
      if (needsVerify) setFaceModalOpen(true);
    }).catch(() => {}).finally(() => setFaceCheckDone(true));
  }, [preview, me, faceCheckDone, today]);

  // Admin-requested face verification → pop up automatically on the dashboard.
  useEffect(() => {
    if (preview) return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await leadSupabase.employees.pendingFaceVerify();
        if (res.data && !stopped) setFaceModalOpen(true);
      } catch { /* not configured yet — ignore */ }
    };
    check();
    const t = setInterval(check, 10000);
    return () => { stopped = true; clearInterval(t); };
  }, [preview]);

  const autoLogoutCountdown = useMemo(() => {
    const t = stats?.auto_logout_time;
    if (!t) return null;
    const [h, m] = fmtTime(t).split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now) return 0;
    return (target.getTime() - now) / 1000;
  }, [stats, now]);

  const checkIn = useMemo(() => {
    if (!stats?.history) return null;
    const todaySessions = stats.history.filter((x: any) => (x.login_at ?? '').startsWith(today));
    if (todaySessions.length === 0) return null;
    const first = [...todaySessions].sort((a, b) => new Date(a.login_at).getTime() - new Date(b.login_at).getTime())[0];
    return first.login_at;
  }, [stats, today]);

  const checkOut = useMemo(() => {
    if (!stats?.history) return null;
    const todaySessions = stats.history.filter((x: any) => (x.login_at ?? '').startsWith(today) && x.logout_at);
    if (todaySessions.length === 0) return null;
    const last = [...todaySessions].sort((a, b) => new Date(b.logout_at).getTime() - new Date(a.logout_at).getTime())[0];
    return last.logout_at;
  }, [stats, today]);

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await leadSupabase.employees.saveNotes(notesDraft);
      setNotesSavedAt(Date.now());
    } catch (e: any) { alert(e?.message ?? 'Failed to save notes'); }
    finally { setNotesSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-[#f4f5f7] font-['Inter',sans-serif] antialiased">
        <div className="flex min-h-[100dvh] items-center justify-center px-4">
          <div className="text-center">
            <div className="relative mx-auto h-12 w-12">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#C9A84C]/20" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#C9A84C]/40 bg-white">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-[#9ca3af]">Loading your workspace…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!preview && isEmployee === false) return <Navigate to="/crm" replace />;
  if (!me) return <Navigate to="/employee-login" replace />;

  const faceToday = faceVerifiedAt && faceVerifiedAt.startsWith(today);

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased">
      {/* ═══════ SLIM TOP BAR (no admin sidebar for employees) ═══════ */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
          <img src="/favicon.png" alt="VJR Estate" className="h-8 w-8 shrink-0 rounded-xl object-contain shadow-[0_2px_10px_rgba(201,168,76,0.3)] sm:h-9 sm:w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-['Inter',sans-serif] text-[12px] font-bold leading-tight text-[#0A1628] sm:text-[13.5px]">VJR Estate</p>
            <p className="text-[7.5px] font-bold uppercase tracking-[0.22em] text-[#96782A] sm:text-[8.5px]">Employee Portal</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {!preview && (
              <CrmBtn variant="ghost" className="min-h-[40px] min-w-[40px] px-2.5 text-[11px] sm:min-h-[36px] sm:px-3" onClick={() => setNotesOpen(true)} title="My Notes">
                <NotebookPen className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Notes</span>
              </CrmBtn>
            )}
            <CrmBtn variant="primary" className="min-h-[40px] min-w-[40px] px-2.5 text-[11px] sm:min-h-[36px] sm:px-3" onClick={() => setProfileOpen(true)}>
              <UserRound className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">My Profile</span>
            </CrmBtn>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
        {preview && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-[#C9A84C]/40 bg-[#C9A84C]/[0.08] px-3 py-2.5 sm:px-4 sm:py-3">
            <Eye className="h-4 w-4 shrink-0 text-[#96782A]" strokeWidth={1.8} />
            <p className="flex-1 text-[11px] font-semibold text-[#0A1628] sm:text-[12px]">
              Admin preview — viewing <span className="text-[#96782A]">{me.name}</span>'s live dashboard
            </p>
            <button onClick={() => navigate(`/crm/employees/${me.id}`)} className="min-h-[32px] text-[11px] font-bold text-[#96782A] hover:underline">
              Back to profile
            </button>
          </div>
        )}

        {/* ═══════ HERO BANNER ═══════ */}
        <div className="relative mb-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-[#0A1628] shadow-[0_12px_40px_rgba(10,22,40,0.25)] sm:mb-6 sm:rounded-3xl">
          <div className="pointer-events-none absolute -top-32 right-0 h-[360px] w-[520px] rounded-full bg-[#C9A84C]/[0.12] blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-[320px] w-[420px] rounded-full bg-[#1E3852]/70 blur-[100px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C9A84C]/70 to-transparent" />

          <div className="relative flex flex-col gap-4 p-4 sm:gap-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-7">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              {/* Avatar → opens profile */}
              <button onClick={() => setProfileOpen(true)} className="group relative h-14 w-14 shrink-0 sm:h-20 sm:w-20" title="View my profile">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D6B85D] to-[#96782A] opacity-80 blur-sm transition-opacity group-hover:opacity-100" />
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-[#1E3852]">
                  {me.profile_photo_url ? (
                    <img src={me.profile_photo_url} alt={me.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-base font-extrabold text-[#D6B85D] sm:text-lg">{initials(me.name || 'E')}</span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-[#0A1628]">
                  <CheckCircle className="h-3 w-3 text-white" strokeWidth={2.5} />
                </span>
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h1 className="m-0 min-w-0 truncate font-['Inter',sans-serif] text-[20px] font-bold tracking-tight text-white sm:text-[28px]">
                    {me.name || 'Employee'}
                  </h1>
                  {faceToday && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-400/40 sm:text-[9.5px]">
                      <ShieldCheck className="h-3 w-3" strokeWidth={2} /> <span className="hidden xs:inline">Face verified</span> ✓
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] font-semibold text-[#D6B85D] sm:mt-1 sm:text-[12px]">
                  {me.designation || 'Employee'} · {me.department || 'Team'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 sm:mt-2 sm:gap-1.5">
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-white/80 ring-1 ring-white/10 sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10.5px]">
                    ID {me.employee_id || '—'}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-white/80 ring-1 ring-white/10 sm:rounded-lg sm:gap-1 sm:px-2 sm:py-1 sm:text-[10.5px]">
                    <Clock className="h-2.5 w-2.5 text-[#D6B85D] sm:h-3 sm:w-3" strokeWidth={1.8} />
                    {new Date(now).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[9.5px] font-semibold text-white/80 ring-1 ring-white/10 sm:rounded-lg sm:gap-1 sm:px-2 sm:py-1 sm:text-[10.5px]">
                    <BadgeCheck className="h-2.5 w-2.5 text-[#D6B85D] sm:h-3 sm:w-3" strokeWidth={1.8} />
                    {me.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions — My Profile only */}
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap lg:justify-end">
              <CrmBtn variant="ghost" className="min-h-[44px] text-[12px] sm:min-h-[38px]" onClick={() => setProfileOpen(true)}>
                <UserRound className="h-4 w-4" /> My Profile
              </CrmBtn>
            </div>
          </div>

          {/* Session strip inside hero */}
          <div className="relative grid grid-cols-3 gap-px border-t border-white/[0.08] bg-white/[0.06]">
            {[
              { icon: LogIn, label: 'Check-in', value: checkIn ? new Date(checkIn).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—' },
              { icon: LogOut, label: 'Check-out', value: checkOut ? new Date(checkOut).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—' },
              { icon: Clock, label: 'Auto-logout', value: fmtTime12(stats?.auto_logout_time) },
            ].map((s) => (
              <div key={s.label} className="bg-[#0A1628]/40 px-2 py-3 sm:px-5 sm:py-3.5">
                <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/45 sm:gap-1.5 sm:text-[9.5px] sm:tracking-[0.16em]">
                  <s.icon className="h-2.5 w-2.5 text-[#D6B85D] sm:h-3 sm:w-3" strokeWidth={2} /> {s.label}
                </p>
                <p className="mt-0.5 font-['Inter',sans-serif] text-[13px] font-bold tabular-nums text-white sm:mt-1 sm:text-[15px] lg:text-[17px]">
                  {s.value}
                  {s.label === 'Auto-logout' && autoLogoutCountdown !== null && autoLogoutCountdown > 0 && (
                    <span className="ml-1 text-[9px] font-semibold text-[#D6B85D] sm:ml-1.5 sm:text-[10px]">in {Math.ceil(autoLogoutCountdown / 60)}m</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        {faceModalOpen && !preview && (
          <FaceVerifyModal
            onClose={() => setFaceModalOpen(false)}
            onVerified={() => setFaceVerifiedAt(new Date().toISOString())}
          />
        )}

        {profileOpen && (
          <EmployeeProfileModal me={me} stats={stats} payroll={payroll} onClose={() => setProfileOpen(false)} />
        )}

        {/* My Notes — tucked away in a corner popup, not on the page */}
        {notesOpen && !preview && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#050b14]/80 p-3 backdrop-blur-xl sm:items-center sm:p-4" onClick={() => setNotesOpen(false)}>
            <div className="relative w-full max-w-md overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
              {/* Mobile drag handle */}
              <div className="flex justify-center pt-2 sm:hidden">
                <div className="h-1 w-8 rounded-full bg-gray-300" />
              </div>
              <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
                  <NotebookPen className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">My Notes</p>
                  <p className="text-[10px] font-semibold text-white/45">Your updates & call notes</p>
                </div>
                <button onClick={() => setNotesOpen(false)} className="min-h-[40px] min-w-[40px] shrink-0 rounded-lg p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 sm:p-5">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Write today's updates, follow-ups, call notes…"
                  rows={5}
                  className="w-full resize-none rounded-xl border border-black/10 bg-[#fafafa] p-3 text-[12.5px] leading-relaxed text-[#0A1628] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#C9A84C]/70 focus:ring-2 focus:ring-[#C9A84C]/20"
                />
                <div className="mt-3 flex items-center gap-3">
                  <CrmBtn variant="gold" onClick={handleSaveNotes} disabled={notesSaving} className="min-h-[44px] flex-1 sm:flex-none sm:min-h-[38px]">
                    {notesSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#0A1628] border-t-transparent" /> : <Save className="h-3.5 w-3.5" />}
                    {notesSaving ? 'Saving…' : 'Save Notes'}
                  </CrmBtn>
                  {notesSavedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Saved {new Date(notesSavedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ CLOCK IN/OUT WIDGET (Jibble-style) ═══════ */}
        {!preview && (
          <div className="mb-4 sm:mb-6">
            <ClockInOut today={todayAtt} activeBreak={activeBreak} onChanged={fetchAll} />
          </div>
        )}

        {/* ═══════ WORK HOURS & ATTENDANCE — top of the page ═══════ */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:rounded-2xl sm:p-3.5">
            <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:text-[9.5px] sm:tracking-[0.16em]">
              <Hourglass className="h-3 w-3" strokeWidth={1.8} /> Work start
            </p>
            <p className="mt-1 text-[12px] font-extrabold text-[#0A1628] tabular-nums sm:text-[13.5px]">{fmtTime12(stats?.work_start_time)}</p>
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:rounded-2xl sm:p-3.5">
            <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:text-[9.5px] sm:tracking-[0.16em]">
              <Clock className="h-3 w-3" strokeWidth={1.8} /> Shift ends
            </p>
            <p className="mt-1 text-[12px] font-extrabold text-[#0A1628] tabular-nums sm:text-[13.5px]">
              {fmtTime12(stats?.auto_logout_time)}
              <span className="ml-1 inline-block rounded bg-[#C9A84C]/[0.14] px-1 py-0.5 text-[8px] font-bold text-[#96782A] sm:ml-1.5 sm:rounded-md sm:px-1.5 sm:text-[9.5px]">
                {checkIn ? (checkOut ? 'Done' : 'On shift') : autoLogoutCountdown !== null && autoLogoutCountdown === 0 ? 'Over' : 'Pending'}
              </span>
            </p>
          </div>
          <div className={`rounded-xl border p-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:rounded-2xl sm:p-3.5 ${todayAtt?.check_in && !todayAtt?.check_out ? 'border-emerald-200 bg-emerald-50/80' : 'border-black/[0.06] bg-white'}`}>
            <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:text-[9.5px] sm:tracking-[0.16em]">
              <BadgeCheck className={`h-3 w-3 ${todayAtt?.check_in ? 'text-emerald-500' : ''}`} strokeWidth={1.8} /> Attendance
            </p>
            <p className="mt-1 text-[12px] font-extrabold sm:text-[13.5px] ${todayAtt?.check_in && !todayAtt?.check_out ? 'text-emerald-700' : 'text-[#0A1628]'}">
              {todayAtt?.check_in && !todayAtt?.check_out ? '✓ Present' : todayAtt?.check_out ? 'Done' : 'Not marked'}
            </p>
          </div>
          <div className="rounded-xl border border-black/[0.06] bg-white p-3 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:rounded-2xl sm:p-3.5">
            <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af] sm:text-[9.5px] sm:tracking-[0.16em]">
              <TrendingUp className="h-3 w-3" strokeWidth={1.8} /> This month
            </p>
            <p className="mt-1 text-[12px] font-extrabold text-[#0A1628] sm:text-[13.5px]">{stats?.login_count ?? 0} logins</p>
          </div>
        </div>

        {/* ═══════ OFFICE UPDATES & EVENTS — only shown when the admin has posted ═══════ */}
        {events.length > 0 && (
          <MotionReveal delay={0}>
            <CrmCard className="mb-4 overflow-hidden sm:mb-6">
              <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:gap-2.5 sm:px-5 sm:py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
                  <Megaphone className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">Updates & Events</p>
                  <p className="hidden text-[10px] font-semibold text-white/45 sm:block">Latest office announcements from the team</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#C9A84C]/[0.16] px-2 py-1 text-[9px] font-bold text-[#D6B85D] sm:px-2.5 sm:py-1 sm:text-[10px]">{events.length} new</span>
              </div>
              <div className="p-3 sm:p-4 lg:p-5">
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                  {events.slice(0, 6).map((ev: any) => (
                    <div key={ev.id} className="group overflow-hidden rounded-xl border border-black/[0.05] bg-[#fafafa] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(10,22,40,0.08)] sm:rounded-2xl">
                      {ev.image_url && <img src={ev.image_url} alt={ev.title} className="h-24 w-full object-cover sm:h-28" loading="lazy" />}
                      <div className="p-3 sm:p-3.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#C9A84C]/[0.12] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#96782A]">
                            <PartyPopper className="h-2.5 w-2.5" strokeWidth={2} /> {ev.event_type || 'Update'}
                          </span>
                          {ev.event_date && (
                            <span className="text-[9.5px] font-semibold text-[#9ca3af]">
                              {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 text-[12px] font-bold text-[#0A1628] sm:text-[13px]">{ev.title}</p>
                        {ev.description && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[#6b7280]">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CrmCard>
          </MotionReveal>
        )}

        {/* ═══════ MY CLIENTS — the main working grid ═══════ */}
        <MotionReveal delay={0.1}>
          <EmployeeClientsSection clients={clients} visits={visits} me={me} preview={preview} onChanged={fetchAll} />
        </MotionReveal>

        <p className="mt-6 pb-4 text-center text-[11px] tracking-[0.3px] text-[#9ca3af]" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          Real-time dashboard · auto-refreshes every 30s
        </p>
      </div>
    </div>
  );
}
