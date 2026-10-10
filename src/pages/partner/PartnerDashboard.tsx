import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Gauge, Building2, Users, CalendarCheck, Handshake, Receipt, Wallet,
  FileText, Bell, History, Scale, UserRound, LifeBuoy, LogOut, Menu, X, ChevronDown,
  Loader2, AlertTriangle,
} from 'lucide-react';
import {
  fetchPartnerDashboard, fmtDateProps, fmtDateTimeProps, fmtMoney,
  partnerStageFromLead, type PDashData, type PDashView, type PartnerDashboardView,
} from '@/services/partnerDashboard';
import { useAuth } from '@/context/AuthContext';
import { callDataProxy } from '@/lib/supabaseData';
import { PartnerDashSections as Sections } from './PartnerDashSections';

/**
 * Partner-facing dashboard. One route, view-based sections; identity and all
 * authorization are enforced server-side by the `partner.dashboard` action,
 * which derives the partner record from the verified session token.
 */

const NAV: { key: PartnerDashboardView; label: string; icon: typeof Gauge }[] = [
  { key: 'overview', label: 'Overview', icon: Gauge },
  { key: 'properties', label: 'My Properties', icon: Building2 },
  { key: 'leads', label: 'Leads & Enquiries', icon: Users },
  { key: 'visits', label: 'Site Visits', icon: CalendarCheck },
  { key: 'offers', label: 'Offers & Negotiations', icon: Handshake },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'revenue', label: 'Revenue & Settlements', icon: Wallet },
  { key: 'documents', label: 'Documents & Verification', icon: FileText },
  { key: 'messages', label: 'Messages & Notifications', icon: Bell },
  { key: 'activity', label: 'Activity History', icon: History },
  { key: 'terms', label: 'Partnership Terms', icon: Scale },
  { key: 'profile', label: 'My Profile', icon: UserRound },
  { key: 'support', label: 'Help & Support', icon: LifeBuoy },
];

const BOTTOM_NAV: PartnerDashboardView[] = ['overview', 'properties', 'leads', 'activity'];
const COLLAPSE_KEY = 'vjr_partner_sidebar_collapsed';

const SECTION_TITLES: Record<PartnerDashboardView, string> = {
  overview: 'Overview',
  properties: 'My Properties',
  leads: 'Leads & Enquiries',
  visits: 'Site Visits',
  offers: 'Offers & Negotiations',
  transactions: 'Transactions',
  revenue: 'Revenue & Settlements',
  documents: 'Documents & Verification',
  messages: 'Messages & Notifications',
  activity: 'Activity History',
  terms: 'Partnership Terms',
  profile: 'My Profile',
  support: 'Help & Support',
};

const STATUS_BADGE: Record<string, { cls: string; label: string }> = {
  pending: { cls: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Pending review' },
  active: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Active' },
  suspended: { cls: 'bg-red-50 text-red-700 ring-red-200', label: 'Suspended' },
  terminated: { cls: 'bg-red-50 text-red-700 ring-red-200', label: 'Terminated' },
  rejected: { cls: 'bg-red-50 text-red-700 ring-red-200', label: 'Rejected' },
};

function StatusBadge({ status }: { status: string | null }) {
  const b = STATUS_BADGE[String(status ?? '').toLowerCase()] ?? STATUS_BADGE.pending;
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ring-1 ${b.cls}`}>{b.label}</span>;
}

export default function PartnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState<PDashView>(() => {
    const q = new URLSearchParams(location.search).get('view');
    return (NAV.some((n) => n.key === q) ? q : 'overview') as PDashView;
  });

  useEffect(() => {
    const q = new URLSearchParams(location.search).get('view') as PDashView | null;
    if (q && NAV.some((n) => n.key === q) && q !== view) setView(q);
  }, [location.search, view]);

  const go = (v: PDashView) => {
    setView(v);
    navigate(`/partner-dashboard?view=${v}`, { replace: view === v });
  };

  const [data, setData] = useState<PDashData | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelledRef = useRef(false);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);

  // Unread support replies drive the bell badge and the Help & Support sidebar
  // chip. Polled lightly; failures (e.g. signed in but not a partner yet) are
  // ignored and the last known count is kept.
  useEffect(() => {
    if (!user) { setSupportUnread(0); return; }
    let cancelled = false;
    const tick = () => {
      callDataProxy('partner.support.list', {})
        .then((r) => {
          if (cancelled) return;
          const total = ((r?.conversations ?? []) as { unreadCount?: number }[])
            .reduce((s, c) => s + (Number(c.unreadCount) || 0), 0);
          setSupportUnread(total);
        })
        .catch(() => { /* no partner registration yet — ignore */ });
    };
    tick();
    const iv = window.setInterval(tick, 60000);
    return () => { cancelled = true; window.clearInterval(iv); };
  }, [user]);

  const toggleCollapse = () => {
    setSidebarCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => { setDrawerOpen(false); }, [view]);

  useEffect(() => {
    cancelledRef.current = false;
    setLoading(true);
    setError('');
    fetchPartnerDashboard()
      .then((d) => { if (!cancelledRef.current) setData(d as PDashData); })
      .catch((e) => { if (!cancelledRef.current) setError(e instanceof Error ? e.message : 'Unable to load your dashboard.'); })
      .finally(() => { if (!cancelledRef.current) setLoading(false); });
    return () => { cancelledRef.current = true; };
  }, []);

  /** Refetch after profile edits so the sidebar/header identity stays in sync. */
  const reloadDashboard = useCallback(() => {
    fetchPartnerDashboard()
      .then((d) => { if (!cancelledRef.current) setData(d as PDashData); })
      .catch(() => { /* section-level errors are shown inside sections */ });
  }, []);

  const partner = data?.partner;
  const greetingName = useMemo(() => (partner?.full_name || user?.displayName || '').split(' ')[0] || 'Partner', [partner?.full_name, user?.displayName]);
  const isOwner = partner?.partner_type === 'Owner';
  const isActive = partner?.status === 'active';
  const welcomeMsg = !partner
    ? null
    : isActive
      ? null
      : partner?.status === 'pending'
        ? 'Your registration is under review — property listing unlocks once your partnership is approved.'
        : 'Your partnership is currently restricted. Contact VJR Estate for assistance.';

  const sideNav = (
    <>
      <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.07] px-4 ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3'}`}>
        <img src="/favicon.png" alt="VJR Estate" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold leading-tight text-white">VJR Estate</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#C9A84C]">Partner Portal</p>
          </div>
        )}
        <button onClick={toggleCollapse} className={`hidden shrink-0 cursor-pointer rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:block ${sidebarCollapsed ? '' : 'ml-auto max-lg:hidden'}`} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {sidebarCollapsed ? <ChevronDown className="h-4 w-4 rotate-90" /> : <X className="h-4 w-4 max-lg:hidden" />}
        </button>
        <button onClick={() => setDrawerOpen(false)} className="ml-auto rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"><X className="h-4 w-4" /></button>
      </div>
      {!sidebarCollapsed && partner && (
        <div className="border-b border-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-[12px] font-extrabold text-[#D6B85D] ring-2 ring-[#C9A84C]/50">
              {(partner.full_name?.[0] ?? 'V').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12.5px] font-semibold text-white">{partner.full_name}</p>
              <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/50">
                {partner.partner_type} Partner
              </p>
            </div>
          </div>
          <div className="mt-2"><StatusBadge status={partner.status} /></div>
        </div>
      )}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => go(key)}
            title={sidebarCollapsed ? label : undefined}
            aria-current={view === key ? 'page' : undefined}
            className={`relative flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
              sidebarCollapsed ? 'justify-center px-0' : ''
            } ${
              view === key
                ? 'bg-gradient-to-r from-[#C9A84C]/[0.18] to-[#C9A84C]/[0.04] text-white'
                : 'text-[#9fb2c6] hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <Icon className={`h-[18px] w-[18px] shrink-0 ${view === key ? 'text-[#D6B85D]' : 'text-[#6d8299]'}`} strokeWidth={1.6} aria-hidden="true" />
            <span className={`whitespace-nowrap text-[13px] font-semibold ${sidebarCollapsed ? 'hidden' : ''}`}>{label}</span>
            {key === 'support' && supportUnread > 0 && !sidebarCollapsed && (
              <span className="ml-auto rounded-full bg-[#C9A84C] px-1.5 text-[10px] font-extrabold leading-[16px] text-[#0A1628]">
                {supportUnread > 9 ? '9+' : supportUnread}
              </span>
            )}
            {key === 'support' && supportUnread > 0 && sidebarCollapsed && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#C9A84C]" />
            )}
          </button>
        ))}
      </nav>
      <div className="border-t border-white/[0.07] p-2.5">
        <button
          type="button"
          onClick={async () => { try { await signOut(); navigate('/'); } catch { /* noop */ } }}
          className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[#9fb2c6] transition-colors hover:bg-white/[0.07] hover:text-white ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
          title={sidebarCollapsed ? 'Sign out' : undefined}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0 text-[#6d8299]" strokeWidth={1.6} aria-hidden="true" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );

  const SidebarShell = ({ children }: { children: React.ReactNode }) => (
    <div className={`flex h-full flex-col bg-[#0A1628] ${sidebarCollapsed ? 'w-[72px]' : 'w-[248px]'} transition-all duration-300`}>{children}</div>
  );

  const TopBar = (
    <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[#E4E7EC] bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <button type="button" className="rounded-lg p-2 text-[#0A1628] hover:bg-black/[0.04] lg:hidden" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-[#0A1628]">{SECTION_TITLES[view]}</p>
        <p className="hidden truncate text-[10px] font-medium text-[#98A2B3] sm:block">VJR Estate Partner Portal</p>
      </div>
      {partner && (
        <span className="hidden items-center gap-1.5 rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-bold text-[#475467] md:inline-flex">
          {partner.partner_type} {partner.partner_code ? `· ${partner.partner_code}` : ''}
        </span>
      )}
      <button type="button" onClick={() => go('support')} className="relative rounded-lg p-2 text-[#475467] hover:bg-black/[0.04]" aria-label="Help and support notifications">
        <Bell className="h-5 w-5" />
        {supportUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-[16px] items-center justify-center rounded-full bg-[#C9A84C] px-1 text-[9px] font-extrabold leading-[14px] text-[#0A1628]">
            {supportUnread > 9 ? '9+' : supportUnread}
          </span>
        )}
      </button>
      <div className="relative">
        <button type="button" onClick={() => setProfileOpen((o) => !o)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A1628] text-[12px] font-extrabold text-[#D6B85D]" aria-label="Account menu" aria-expanded={profileOpen}>
          {(partner?.full_name?.[0] ?? user?.displayName?.[0] ?? 'V').toUpperCase()}
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-11 z-40 w-52 overflow-hidden rounded-xl border border-[#E4E7EC] bg-white shadow-lg">
            <Link to="/partner-dashboard?view=profile" onClick={() => { setProfileOpen(false); }} className="block px-4 py-2.5 text-[13px] text-[#101828] hover:bg-[#F8F9FB]">My Profile</Link>
            <Link to="/partner-dashboard?view=terms" onClick={() => { setProfileOpen(false); }} className="block px-4 py-2.5 text-[13px] text-[#101828] hover:bg-[#F8F9FB]">Partnership Terms</Link>
            <div className="border-t border-[#E4E7EC]" />
            <button type="button" onClick={async () => { setProfileOpen(false); try { await signOut(); navigate('/'); } catch { /* noop */ } }} className="block w-full px-4 py-2.5 text-left text-[13px] text-red-600 hover:bg-red-50">Sign out</button>
          </div>
        )}
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" />
      </div>
    );
  }

  if (!user) {
    // LOGIN-FIRST: guests are redirected to the login experience with the
    // dashboard as the preserved destination; sign-in returns them here.
    return (
      <LoginRedirect next="/partner-dashboard" />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-[#F7F8FA]">
      {/* Desktop sidebar */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 lg:block">
        <SidebarShell>{sideNav}</SidebarShell>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full"><SidebarShell>{sideNav}</SidebarShell></div>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {TopBar}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
          {loading ? (
            <div className="space-y-4">
              <div className="h-24 animate-pulse rounded-xl bg-white" />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}
              </div>
              <div className="h-64 animate-pulse rounded-xl bg-white" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
              <p className="mt-3 text-[13.5px] font-semibold text-red-700">{error}</p>
              <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                <button type="button" onClick={() => { setLoading(true); fetchPartnerDashboard().then(setData as (d: unknown) => void).finally(() => setLoading(false)); }} className="admin-btn-primary min-h-[44px] items-center justify-center">Try again</button>
                <Link to="/" className="admin-btn-secondary no-underline min-h-[44px] items-center justify-center">Back to Home</Link>
              </div>
            </div>
          ) : !data ? null : (
            <PartnerDashboardBody data={data} view={view} go={go} greetingName={greetingName} isOwner={isOwner} isActive={isActive} welcomeMsg={welcomeMsg} reloadDashboard={reloadDashboard} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-[#E4E7EC] bg-white lg:hidden" aria-label="Dashboard sections">
        {BOTTOM_NAV.map((v) => {
          const item = NAV.find((n) => n.key === v)!;
          const Icon = item.icon;
          return (
            <button
              key={v}
              type="button"
              onClick={() => go(v)}
              aria-current={view === v ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${view === v ? 'text-[#8a6d1f]' : 'text-[#98A2B3]'}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
              {item.label.split(' ')[0]}
            </button>
          );
        })}
        <button type="button" onClick={() => setDrawerOpen(true)} className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-[#98A2B3]">
          <Menu className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
          More
        </button>
      </nav>
    </div>
  );
}

/** Full-height redirect notice shown while the login page takes over. */
function LoginRedirect({ next }: { next: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
  }, [next, navigate]);
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#F7F8FA]">
      <Loader2 className="h-6 w-6 animate-spin text-[#98A2B3]" />
    </div>
  );
}

/* ── Body renderer — sections read directly from the server data ── */

function PartnerDashboardBody({
  data, view, go, greetingName, isOwner, isActive, welcomeMsg, reloadDashboard,
}: {
  data: PDashData;
  view: PDashView;
  go: (v: PDashView) => void;
  greetingName: string;
  isOwner: boolean;
  isActive: boolean;
  welcomeMsg: string | null;
  reloadDashboard: () => void;
}) {
  return (
    <Sections
      data={data}
      view={view}
      go={go}
      greetingName={greetingName}
      isOwner={isOwner}
      isActive={isActive}
      welcomeMsg={welcomeMsg}
      reloadDashboard={reloadDashboard}
      fmtDateProps={fmtDateProps}
      fmtDateTimeProps={fmtDateTimeProps}
      fmtMoney={fmtMoney}
      stageOf={partnerStageFromLead}
    />
  );
}
