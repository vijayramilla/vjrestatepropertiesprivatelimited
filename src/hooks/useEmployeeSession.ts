import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { leadSupabase } from '@/services/leadSupabase';

/* ─────────────────────────────────────────────────────────────────────────────
   Employee session tracking (module singleton).

   One session per browser login — it survives page navigation because the state
   lives at module scope, not in component state. The session starts when an
   employee opens the CRM, pings a heartbeat every 60s so "last active" stays
   fresh, and closes on tab close / sign-out / daily auto-logout. Duration is
   reported to the server so admins see exactly how long the employee was online,
   and the daily attendance record is derived from first login → last logout.
   ──────────────────────────────────────────────────────────────────────────── */

let activeSessionId: string | null = null;
let sessionForUid: string | null = null;
let sessionStartedAt = 0;
let autoLogoutTime: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let logoutTimer: ReturnType<typeof setInterval> | null = null;
let handlersWired = false;

function fmtTime(t: string): string {
  return t.length === 8 ? t.slice(0, 5) : t; // '21:00:00' → '21:00'
}

async function endCurrentSession() {
  const id = activeSessionId;
  if (!id) return;
  activeSessionId = null;
  sessionForUid = null;
  const dur = Math.max(0, Math.round((Date.now() - sessionStartedAt) / 1000));
  try {
    await leadSupabase.employees.endSession(id, dur);
  } catch { /* already ended */ }
}

function wireGlobalHandlers() {
  if (handlersWired) return;
  handlersWired = true;
  window.addEventListener('beforeunload', () => { endCurrentSession(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') endCurrentSession();
  });
}

async function checkAutoLogout() {
  if (!autoLogoutTime || !sessionForUid) return;
  const now = new Date();
  const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  if (cur >= fmtTime(autoLogoutTime)) {
    await endCurrentSession();
    try { await signOut(auth); } catch { /* ignore */ }
    window.location.href = '/employee-login';
  }
}

async function startSessionFor(uid: string) {
  if (sessionForUid === uid && activeSessionId) return;
  try {
    const res = await leadSupabase.employees.startSession(navigator.userAgent);
    activeSessionId = res.data?.id ?? null;
    sessionForUid = uid;
    sessionStartedAt = Date.now();
    const me = await leadSupabase.employees.me().catch(() => ({ data: null }));
    autoLogoutTime = me.data?.auto_logout_time ?? null;
    wireGlobalHandlers();
    if (!heartbeatTimer) {
      heartbeatTimer = setInterval(() => {
        if (activeSessionId) leadSupabase.employees.heartbeat(activeSessionId).catch(() => {});
      }, 60000);
    }
    if (!logoutTimer) {
      logoutTimer = setInterval(checkAutoLogout, 30000);
    }
  } catch { /* session start failed — non-blocking */ }
}

/**
 * Mount once per CRM page (e.g. inside CrmSidebar). Only acts for the signed-in
 * employee; admins are untouched. The singleton makes extra mounts harmless.
 */
export function useEmployeeSession() {
  useEffect(() => {
    const initial = auth.currentUser;
    if (initial) handleUser(initial);
    const unsub = auth.onAuthStateChanged((user) => handleUser(user));
    return () => unsub();
  }, []);
}

async function handleUser(user: { uid: string } | null) {
  if (!user) {
    endCurrentSession();
    return;
  }
  try {
    const p = await leadSupabase.admin.verify();
    if (p.role === 'employee') startSessionFor(user.uid);
  } catch { /* verify failed */ }
}
