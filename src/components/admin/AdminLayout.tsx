import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  House,
  Plus,
  List,
  X,
  ChatCircle,
  SignOut,
  Globe,
  Users,
  ClipboardText,
  NotePencil,
  Scroll,
  Article,
  Phone,
  Briefcase,
  HardDrive,
  GearSix,
  UsersThree,
} from '@phosphor-icons/react';
import { auth } from '@/lib/firebase';
import { useOpenRequirementsCount } from '@/hooks/useOpenRequirementsCount';
import { useUnreviewedApplicationsCount } from '@/hooks/useUnreviewedApplicationsCount';
import VJRAIButton from '@/components/ai/VJRAIButton';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

/** Primary destinations — every admin lands here first. */
interface NavItem {
  icon: typeof House;
  label: string;
  short?: string;
  path: string;
  match: string;
  exact?: string[];
}

const primaryNavItems: NavItem[] = [
  { icon: House, label: 'Properties', short: 'Properties', path: '/admin/properties', match: '/admin/properties', exact: ['/admin/properties'] },
  { icon: ChatCircle, label: 'Enquiries', short: 'Leads', path: '/admin/enquiries', match: '/admin/enquiries' },
  { icon: ClipboardText, label: 'Requirements', short: 'Reqs', path: '/admin/requirements', match: '/admin/requirements', exact: ['/admin/requirements'] },
  { icon: Users, label: 'Users', short: 'Users', path: '/admin/users', match: '/admin/users' },
  { icon: Briefcase, label: 'Employees', short: 'Team', path: '/crm/employees', match: '/crm/employees' },
];

/** Full directory lives in the sidebar; the mobile bar keeps the top five. */
const secondaryNavItems: NavItem[] = [
  { icon: Scroll, label: 'Listings Dashboard', path: '/admin/listings', match: '/admin/listings' },
  { icon: NotePencil, label: 'Post Requirement', path: '/admin/requirements/new', match: '/admin/requirements/new' },
  { icon: Plus, label: 'Add Property', path: '/admin/properties/new', match: '/admin/properties/new' },
  { icon: Article, label: 'Blog', path: '/admin/blog', match: '/admin/blog' },
  { icon: Phone, label: 'Owner Contacts', path: '/admin/owner-contacts', match: '/admin/owner-contacts' },
  { icon: Briefcase, label: 'Careers', path: '/admin/careers', match: '/admin/careers' },
  { icon: UsersThree, label: 'Team Page', path: '/admin/team', match: '/admin/team' },
  { icon: HardDrive, label: 'Storage', path: '/admin/storage', match: '/admin/storage' },
  { icon: GearSix, label: 'Settings', path: '/admin/settings', match: '/admin/settings' },
];

export default function AdminLayout({ children, title = 'Admin' }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openRequirementsCount = useOpenRequirementsCount();
  const unreviewedApplicationsCount = useUnreviewedApplicationsCount();

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const isNavActive = (item: { path: string; match: string; exact?: string[] }) => {
    if (item.exact?.includes(location.pathname)) return true;
    if (item.path === '/admin/properties') {
      // /admin/properties/new and /admin/properties/:id/edit are their own destinations.
      return location.pathname === '/admin/properties';
    }
    if (item.path === '/admin/users' || item.path === '/admin/requirements') {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.match);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const badgeFor = (path: string) => {
    if (path === '/admin/requirements' && openRequirementsCount > 0) {
      return openRequirementsCount > 99 ? '99+' : String(openRequirementsCount);
    }
    if (path === '/admin/careers' && unreviewedApplicationsCount > 0) {
      return unreviewedApplicationsCount > 99 ? '99+' : String(unreviewedApplicationsCount);
    }
    return null;
  };

  const navButtonClass = (active: boolean) =>
    `admin-nav-item ${active ? 'admin-nav-item-active' : ''}`;

  const renderNavItem = (item: NavItem, onGo?: () => void) => {
    const Icon = item.icon;
    const isActive = isNavActive(item);
    const badge = badgeFor(item.path);
    return (
      <button
        key={item.path}
        type="button"
        onClick={() => {
          navigate(item.path);
          onGo?.();
        }}
        className={navButtonClass(isActive)}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
        <span className="flex flex-1 items-center justify-between gap-2">
          {item.label}
          {badge && <span className="admin-nav-badge">{badge}</span>}
        </span>
      </button>
    );
  };

  const sidebar = (
    <>
      <div className="border-b border-white/[0.06] px-5 pb-5 pt-6 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#96782A] shadow-[0_4px_16px_rgba(201,168,76,0.35)]">
            <span className="text-[15px] font-bold tracking-tight text-[#0A1628]">V</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-tight text-white">VJR Estate</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
              Admin Portal
            </p>
          </div>
        </div>
      </div>

      <nav className="admin-nav-scroll mt-4 flex-1 overflow-y-auto px-3">
        {primaryNavItems.map((item) => renderNavItem(item))}
        <p className="admin-nav-group-label">Manage</p>
        {secondaryNavItems.map((item) => renderNavItem(item))}
      </nav>

      <div className="space-y-0.5 border-t border-white/[0.06] px-3 py-4">
        <a
          href="/"
          onClick={() => setMobileNavOpen(false)}
          className="admin-nav-item"
        >
          <Globe size={18} weight="regular" />
          View Website
        </a>
        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            handleSignOut();
          }}
          className="admin-nav-item"
        >
          <SignOut size={18} weight="regular" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-theme flex min-h-[100dvh] bg-[var(--admin-bg)]">
      {/* Desktop sidebar */}
      <aside className="admin-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-col md:flex">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#0A1628]/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div
        className={`admin-sidebar fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(300px,88vw)] flex-col transition-transform duration-300 md:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={mobileNavOpen}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute right-1.5 top-1.5 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => setMobileNavOpen(false)}
        >
          <X size={20} />
        </button>
        {sidebar}
      </div>

      <div className="flex min-h-[100dvh] w-full flex-col md:ml-[248px] md:w-[calc(100%-248px)]">
        <header className="admin-topbar fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-2 px-3 md:left-[248px] md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#0A1628] transition-colors hover:border-[#C9A84C] hover:bg-[#FBF7EC] md:hidden"
              aria-label="Open menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <List size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#96782A]">
                VJR Estate · Admin
              </p>
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-[#0A1628]">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/properties/new')}
            className="admin-btn-primary h-10 min-h-[40px] shrink-0 px-3 sm:gap-2 sm:px-4"
          >
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
        </header>

        <main className="mt-14 flex-1 overflow-x-hidden bg-[var(--admin-bg)] pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        {/* Mobile bottom bar — the five primary destinations only */}
        <nav className="admin-mobile-nav" aria-label="Admin navigation">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item);
            const badge = badgeFor(item.path);
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`relative flex min-w-[68px] flex-none flex-col items-center justify-center gap-1 py-2 transition-colors duration-200 ${
                  isActive ? 'text-[#C9A84C]' : 'text-white/55 hover:text-white/85'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={`absolute -top-px h-[2px] w-8 rounded-full transition-opacity duration-200 ${
                    isActive ? 'bg-[#C9A84C] opacity-100' : 'opacity-0'
                  }`}
                />
                <Icon size={21} weight={isActive ? 'fill' : 'regular'} />
                <span className="text-[9.5px] font-bold uppercase tracking-[0.08em]">{item.short}</span>
                {badge && (
                  <span className="absolute right-[16%] top-1 min-w-[16px] rounded-full bg-[#C9A84C] px-1 text-[8px] font-bold text-[#0A1628]">
                    {badge.length > 2 ? '9+' : badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <VJRAIButton userRole="admin" className="bottom-20 right-5 md:bottom-6 md:right-6" />
    </div>
  );
}
