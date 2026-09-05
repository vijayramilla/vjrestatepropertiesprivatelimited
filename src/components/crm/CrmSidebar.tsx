import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { premiumDisplayName, isSuperAdminEmail } from '@/lib/crmAdminConfig';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';

type NavItem = {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  path: string;
  perm: string | null;
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

export default function CrmSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  useEmployeeSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState('');
  const [userInitial, setUserInitial] = useState('V');
  const [userRole, setUserRole] = useState('CRM Admin');
  const [perms, setPerms] = useState<string[] | null>(null);
  // Default from the URL so employees never flash the admin nav while the
  // async role check resolves (fixes the "full CRM dashboard flicker" on load).
  const [isEmployee, setIsEmployee] = useState(
    () => location.pathname === '/crm/dashboard' || location.pathname === '/crm/my-clients',
  );
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const isActive = (path: string) => (path === '/crm' ? location.pathname === '/crm' : location.pathname === path);

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
    <div className={`flex h-full flex-col bg-[#0A1628] ${collapsed ? 'w-[68px]' : 'w-[248px]'} transition-all duration-300`}>
      {/* Brand */}
      <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.07] ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
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
        <button
          onClick={onToggle}
          className="ml-auto hidden shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white max-lg:hidden"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
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
          SECTIONS.map(section => {
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
          })
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
      {/* Desktop rail */}
      <div className={`hidden h-full shrink-0 border-r border-black/[0.06] transition-all duration-300 lg:flex ${collapsed ? 'w-[68px]' : 'w-[248px]'}`}>
        {sidebar}
      </div>
    </>
  );
}
