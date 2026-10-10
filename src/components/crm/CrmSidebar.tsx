import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type WheelEvent } from 'react';
import { auth } from '@/lib/firebase';
import { leadSupabase } from '@/services/leadSupabase';
import {
  LayoutDashboard,
  IndianRupee,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  UserCog,
  Menu,
  X,
  Briefcase,
  HardDrive,
  ChevronRight,
  ListChecks,
  Megaphone,
  Wallet,
  Clock,
  MapPin,
  CalendarDays,
  Users,
  BookLock,
  Handshake,
  ShieldCheck,
} from 'lucide-react';
import { premiumDisplayName, isSuperAdminEmail } from '@/lib/crmAdminConfig';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';
import VJRAIButton from '@/components/ai/VJRAIButton';
import { CRM_MODULE_REGISTRY } from '@/lib/crmAccessRegistry';

/** Registry module key → lucide icon (visual only; permissions come from grants). */
const MODULE_ICONS: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  leads: ListChecks,
  requirements: ClipboardList,
  assignedClients: Users,
  bookings: CalendarDays,
  agents: UserCog,
  siteVisits: MapPin,
  ledgers: BookLock,
  partnership: Handshake,
  employees: Briefcase,
  attendance: Clock,
  geofences: MapPin,
  payroll: Wallet,
  events: Megaphone,
  storage: HardDrive,
  earnings: IndianRupee,
  adminUsers: ShieldCheck,
  crmAccess: ShieldCheck,
};

type NavItem = {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  path: string;
  perm: string | null;
};

/** Partnership — a partner is a registered Owner/Builder/Agent, fully separate
 * from normal website users. Direct nav item: all partner views live on the
 * page itself (tabs + KPI-card filters), never as a sidebar submenu. */
const PARTNERSHIP_ITEM: NavItem = {
  id: 'partnership',
  title: 'Partnership',
  icon: Handshake,
  path: '/crm/partnership?view=all',
  perm: 'partners.view',
};

const SECTIONS: { key: string; label: string; items: NavItem[] }[] = [
  {
    key: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: '/crm', perm: null },
      { id: 'earnings', title: 'Earnings', icon: IndianRupee, path: '/crm/earnings', perm: 'earnings.view' },
    ],
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    items: [
      { id: 'leads', title: 'Leads', icon: ListChecks, path: '/crm/leads', perm: 'clients.view' },
      { id: 'assigned-clients', title: 'Assigned Clients', icon: Users, path: '/crm/assigned-clients', perm: 'clients.view' },
      { id: 'bookings', title: 'Bookings', icon: CalendarDays, path: '/crm/bookings', perm: 'clients.view' },
      { id: 'requirements', title: 'Requirements', icon: ClipboardList, path: '/crm/requirements', perm: 'requirements.view' },
      { id: 'agents', title: 'Agents', icon: UserCog, path: '/crm/agents', perm: 'agents.view' },
      { id: 'ledgers', title: 'Ledgers', icon: BookLock, path: '/crm/ledgers', perm: null },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    items: [
      { id: 'employees', title: 'Employees', icon: Briefcase, path: '/crm/employees', perm: null },
      { id: 'attendance', title: 'Attendance', icon: Clock, path: '/crm/attendance', perm: null },
      { id: 'geofences', title: 'Geofences', icon: MapPin, path: '/crm/geofences', perm: null },
      { id: 'payroll', title: 'Payroll', icon: Wallet, path: '/crm/payroll', perm: null },
      { id: 'events', title: 'Events', icon: Megaphone, path: '/crm/events', perm: null },
      { id: 'storage', title: 'Storage', icon: HardDrive, path: '/crm/storage', perm: null },
    ],
  },
];

const COLLAPSED_KEY = 'vjr_crm_sidebar_collapsed';

export default function CrmSidebar({ collapsed: collapsedProp, onToggle }: { collapsed?: boolean; onToggle?: () => void } = {}) {
  useEmployeeSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('V');
  const [userRole, setUserRole] = useState('CRM Admin');
  const [perms, setPerms] = useState<string[] | null>(null);
  // Trusted CRM grant modules (from admin.verify → server evaluator). null
  // = super admin/full; {} = no grant (empty custom nav for grantees).
  const [crmModules, setCrmModules] = useState<Record<string, { actions?: string[] }> | null | undefined>(undefined);
  // Default from the URL so employees never flash the admin nav while the
  // async role check resolves (fixes the "full CRM dashboard flicker" on load).
  const [isEmployee, setIsEmployee] = useState(
    () => location.pathname === '/crm/dashboard' || location.pathname === '/crm/my-clients',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  // Collapsed preference lives here, not on each page, so it survives
  // navigation between CRM modules and full page refreshes.
  const [internalCollapsed, setInternalCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === '1',
  );
  // Pages may still pass controlled props; otherwise state is internal+persisted.
  const collapsed = collapsedProp ?? internalCollapsed;
  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    const next = !collapsed;
    setInternalCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* storage full/blocked */ }
  };

  useEffect(() => {
    const apply = (name: string, initial: string) => {
      const display = premiumDisplayName(name);
      setUserName(display);
      setUserInitial((display[0] ?? initial).toUpperCase());
    };
    const applyRole = (user: { email?: string | null; role?: string; data?: any } | null) => {
      if (user?.role === 'employee') {
        setIsEmployee(true);
        setUserRole(user.data?.designation || 'Employee');
      } else if (user?.role === 'super_admin' || isSuperAdminEmail(user?.email ?? '')) {
        setIsEmployee(false);
        setUserRole('Super Admin');
      } else if (user?.role) {
        setIsEmployee(false);
        setUserRole(user.role === 'admin' ? 'CRM Admin' : user.role);
      } else {
        setUserRole('CRM Admin');
      }
    };
    const u = auth.currentUser;
    if (u) {
      apply(u.displayName ?? u.email ?? 'Admin', (u.displayName?.[0] ?? u.email?.[0] ?? 'V').toUpperCase());
      applyRole({ email: u.email, role: undefined });
      leadSupabase.admin.verify().then(p => {
        setPerms(p.permissions ?? null);
        setCrmModules((p as { crmModules?: Record<string, { actions?: string[] }> | null }).crmModules ?? null);
        applyRole({ email: u.email, role: p.role, data: p.data });
        if (p.data?.display_name) apply(p.data.display_name, p.data.display_name[0].toUpperCase());
      }).catch(() => {});
    }
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        apply(user.displayName ?? user.email ?? 'Admin', (user.displayName?.[0] ?? user.email?.[0] ?? 'V').toUpperCase());
        applyRole({ email: user.email, role: undefined });
        leadSupabase.admin.verify().then(p => {
          setPerms(p.permissions ?? null);
          setCrmModules((p as { crmModules?: Record<string, { actions?: string[] }> | null }).crmModules ?? null);
          applyRole({ email: user.email, role: p.role, data: p.data });
          if (p.data?.display_name) apply(p.data.display_name, p.data.display_name[0].toUpperCase());
        }).catch(() => {});
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function canSee(perm: string | null) {
    if (!perm) return true;
    if (!perms || perms.length === 0) return true;
    if (perms.includes(perm)) return true;
    const editPerm = perm.replace('.view', '.edit');
    if (perm.endsWith('.view') && perms.includes(editPerm)) return true;
    return false;
  }

  // ── Registry-driven, grant-aware nav (employees with CRM grants) ──
  // The Super Admin sees the full classic sidebar; a granted employee sees
  // only the modules their server-verified grant contains (default-deny).
  const grantModules = useMemo(() => crmModules ?? null, [crmModules]);

  /** Registry-filtered sections for a granted employee (default-deny). */
  const registrySections = useMemo(() => {
    if (!grantModules) return null; // super admin / legacy admins
    const groups: { key: string; label: string; items: NavItem[] }[] = [];
    const byGroup: Record<string, NavItem[]> = {};
    for (const m of CRM_MODULE_REGISTRY) {
      const acts = grantModules[m.key]?.actions ?? [];
      if (!acts.includes('view')) continue; // default-deny: no view = hidden
      const item: NavItem = { id: m.key, title: m.label, icon: MODULE_ICONS[m.key] ?? LayoutDashboard, path: m.route, perm: null };
      (byGroup[m.group] ??= []).push(item);
    }
    for (const [label, items] of Object.entries(byGroup)) {
      groups.push({ key: label.toLowerCase(), label, items });
    }
    return groups.length > 0 ? groups : null;
  }, [grantModules]);

  const isActive = (path: string) => {
    if (path === '/crm') return location.pathname === '/crm';
    if (path === PARTNERSHIP_ITEM.path) {
      // Active on the dashboard AND the Partner 360° detail page.
      return location.pathname.startsWith('/crm/partnership');
    }
    const [p, q] = path.split('?');
    if (q) return location.pathname === p && location.search === `?${q}`;
    return location.pathname === p;
  };

  // The desktop rail sits outside the page's scrollable column (root is
  // overflow-hidden), so the wheel is dead with the cursor over the sidebar.
  // Forward deltas to the adjacent scroll column — unless the sidebar's own
  // nav is still consuming them — so scrolling over the sidebar moves the
  // page content, like the old whole-page scroll did.
  const railRef = useRef<HTMLDivElement>(null);
  const forwardWheelToContent = (e: WheelEvent) => {
    if (e.deltaY === 0) return;
    const scroller = railRef.current?.nextElementSibling as HTMLElement | null;
    if (!scroller) return;
    const nav = (e.target as HTMLElement).closest?.('nav');
    if (nav && nav.scrollHeight > nav.clientHeight) {
      const canUp = nav.scrollTop > 0;
      const canDown = nav.scrollTop + nav.clientHeight < nav.scrollHeight - 1;
      if ((e.deltaY < 0 && canUp) || (e.deltaY > 0 && canDown)) return;
    }
    const dy = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY; // line-mode wheels (Firefox)
    scroller.scrollBy({ top: dy });
  };

  const NavRow = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.path)}
        title={collapsed ? item.title : undefined}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
          collapsed ? 'justify-center px-0' : ''
        } ${
          active
            ? 'bg-gradient-to-r from-[#C9A84C]/[0.18] to-[#C9A84C]/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
            : 'text-[#9fb2c6] hover:bg-white/[0.07] hover:text-white'
        }`}
      >
        {active && !collapsed && (
          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#D6B85D] to-[#C9A84C] shadow-[0_0_8px_rgba(214,184,93,0.6)]" />
        )}
        <span className="relative inline-flex shrink-0">
          <Icon className={`h-[18px] w-[18px] ${active ? 'text-[#D6B85D]' : 'text-[#6d8299] group-hover:text-[#D6B85D]'}`} strokeWidth={1.6} />
        </span>
        <span className={`whitespace-nowrap text-[13px] font-semibold tracking-wide transition-opacity duration-200 ${collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'}`}>
          {item.title}
        </span>
        {!collapsed && active && <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#C9A84C]" strokeWidth={2.5} />}
      </button>
    );
  };

  const sidebar = (
    <div className={`flex h-full flex-col bg-[#0A1628] ${collapsed ? 'w-[72px]' : 'w-[248px]'} transition-all duration-300`}>
      {/* Brand + collapse control — the toggle is always visible in the header
          strip, and in the collapsed rail it flips to an "expand" affordance. */}
      <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.07] ${collapsed ? 'justify-center gap-2 px-2' : 'gap-3 px-4'}`}>
        <img
          src="/favicon.png"
          alt="VJR Estate"
          className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-[0_2px_10px_rgba(201,168,76,0.3)]"
        />
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate font-['Inter',sans-serif] text-[14px] font-semibold leading-tight text-white">VJR Estate</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#C9A84C]">CRM Portal</p>
          </div>
        )}
        {/* One control, both states: collapse chevron when expanded (right
            side), visible expand button when collapsed (static header, unlike
            the old always-visible variant which collided in the rail). */}
        {!collapsed && (
          <button
            onClick={toggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto hidden shrink-0 cursor-pointer rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white lg:block max-lg:!hidden"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
        {collapsed && (
          <button
            onClick={toggle}
            aria-label="Expand sidebar"
            title="Expand sidebar"
            className="shrink-0 cursor-pointer rounded-lg p-1.5 text-[#C9A84C]/80 transition-colors hover:bg-white/10 hover:text-[#D6B85D] max-lg:!hidden"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {isEmployee ? (
          <div>
            {!collapsed && <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/45">My Workspace</p>}
            <div className="space-y-0.5">
              <NavRow item={{ id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, path: '/crm/dashboard', perm: null }} />
              <NavRow item={{ id: 'my-clients', title: 'My Clients', icon: ListChecks, path: '/crm/my-clients', perm: null }} />
            </div>
          </div>
        ) : (
          <>
            {((registrySections ?? SECTIONS) as { key: string; label: string; items: NavItem[] }[]).map((section: { key: string; label: string; items: NavItem[] }) => {
              const visible = section.items.filter(i => canSee(i.perm));
              if (visible.length === 0) return null;
              return (
                <div key={section.key}>
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/45">{section.label}</p>
                )}
                  <div className="space-y-0.5">
                    {visible.map(item => <NavRow key={item.id} item={item} />)}
                  </div>
                </div>
              );
            })}
            {canSee(PARTNERSHIP_ITEM.perm) && (
              <div>
                {!collapsed && (
                  <p className="mb-1.5 px-3 text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/45">Partnership</p>
                )}
                <NavRow item={PARTNERSHIP_ITEM} />
              </div>
            )}
          </>
        )}
      </nav>

      {/* Profile — admins only. Employees have their workspace in the nav and
          must never reach the admin profile/management page. */}
      <div className="border-t border-white/[0.07] p-2.5">
        {!isEmployee && <button
          onClick={() => navigate('/crm/profile')}
          title={collapsed ? 'Profile' : undefined}
          className={`group/profile relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-white/[0.06] px-2.5 py-2.5 transition-all duration-200 ${
            location.pathname === '/crm/profile' ? 'bg-white/[0.1]' : 'bg-white/[0.04] hover:bg-white/[0.08]'
          } ${collapsed ? 'justify-center px-0' : ''}`}
        >
          {location.pathname === '/crm/profile' && !collapsed && (
            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#D6B85D] to-[#C9A84C]" />
          )}
          <div className="relative shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#1E3852] to-[#0A1628] text-[12px] font-extrabold text-[#D6B85D] ring-2 ring-[#C9A84C]/50 transition-all duration-200 group-hover/profile:ring-[#C9A84C]">
              {userInitial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0A1628] bg-emerald-400" />
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <p className="truncate text-[12.5px] font-semibold text-white">{userName}</p>
              <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#C9A84C]/90">
                {userRole}
                <ChevronRight className="h-2.5 w-2.5 opacity-0 transition-all duration-200 group-hover/profile:translate-x-0.5 group-hover/profile:opacity-100" strokeWidth={3} />
              </p>
            </div>
          )}
        </button>}
      </div>
    </div>
  );

  return (
    <>
      {/* Nexa AI assistant — available to the whole CRM team */}
      <VJRAIButton userRole="admin" />
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0A1628] text-[#D6B85D] shadow-lg transition-colors hover:bg-[#1E3852] lg:hidden"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${mobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setMobileOpen(false)}
      />
      {/* Mobile drawer */}
      <div className={`fixed left-0 top-0 z-50 h-full transition-transform duration-300 ease-out lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </div>
      {/* Desktop rail — sits inside the page's h-screen overflow-hidden shell,
          so it always fills the viewport height and never scrolls with the
          page; only the <main> beside it scrolls. Content beside it reflows
          automatically because pages lay out with flex. */}
      <div
        ref={railRef}
        onWheel={forwardWheelToContent}
        className={`hidden h-full shrink-0 border-r border-black/[0.06] transition-all duration-300 lg:flex ${collapsed ? 'w-[72px]' : 'w-[248px]'}`}
      >
        {sidebar}
      </div>
    </>
  );
}
