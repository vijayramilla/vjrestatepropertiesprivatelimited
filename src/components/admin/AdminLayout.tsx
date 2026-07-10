import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { House, Plus, List, X, ChatCircle, SignOut, Globe, Users, ClipboardText, NotePencil, MapPin } from 'phosphor-react';
import { auth } from '@/lib/firebase';
import { useOpenRequirementsCount } from '@/hooks/useOpenRequirementsCount';
import { useSiteSettings } from '@/context/SiteSettingsContext';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

const baseNavItems = [
  { icon: House, label: 'Properties', path: '/admin/properties', short: 'List' },
  { icon: Users, label: 'Users', path: '/admin/users', short: 'Users' },
  { icon: ChatCircle, label: 'Enquiries', path: '/admin/enquiries', short: 'Leads' },
  { icon: ClipboardText, label: 'Requirements', path: '/admin/requirements', short: 'Reqs' },
  { icon: NotePencil, label: 'Post Requirement', path: '/admin/requirements/new', short: 'Post' },
  { icon: Plus, label: 'Add Property', path: '/admin/properties/new', short: 'Add' },
  { icon: MapPin, label: 'Map Mode', path: '/admin/settings', short: 'Map' },
];

export default function AdminLayout({ children, title = 'Admin' }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openRequirementsCount = useOpenRequirementsCount();
  const { mapOnly } = useSiteSettings();

  const isNavActive = (path: string) => {
    if (path === '/admin/properties') {
      return location.pathname === path;
    }
    if (path === '/admin/users') {
      return location.pathname === path;
    }
    if (path === '/admin/requirements') {
      return location.pathname === path;
    }
    if (path === '/admin/requirements/new') {
      return location.pathname === path;
    }
    if (path === '/admin/settings') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/admin/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const navButtonClass = (active: boolean) =>
    `mb-1 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all duration-200 ${
      active
        ? 'bg-white text-black shadow-sm'
        : 'text-gray-400 hover:bg-white/10 hover:text-white'
    }`;

  const sidebar = (
    <>
      <div className="border-b border-gray-800 px-5 py-6 sm:px-6 sm:py-7">
        <h1 className="admin-heading text-lg font-medium text-white sm:text-xl">VJR Estate</h1>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          Admin Portal
        </p>
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 sm:mt-5">
        {baseNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(item.path);
          const showBadge = item.path === '/admin/requirements' && openRequirementsCount > 0;
          const showMapDot = item.path === '/admin/settings' && mapOnly;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => {
                navigate(item.path);
                setMobileNavOpen(false);
              }}
              className={navButtonClass(isActive)}
            >
              <div className="relative">
                <Icon size={18} weight={isActive ? 'regular' : 'thin'} />
                {showMapDot && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-400" />
                )}
              </div>
              <span className="flex flex-1 items-center justify-between gap-2">
                {item.label}
                {showBadge && (
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
                    {openRequirementsCount > 99 ? '99+' : openRequirementsCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-gray-800 px-3 py-4">
        <Link
          to="/"
          onClick={() => setMobileNavOpen(false)}
          className="flex min-h-[44px] items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          <Globe size={18} weight="thin" />
          View Website
        </Link>
        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            handleSignOut();
          }}
          className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm text-gray-400 transition-all duration-200 hover:bg-white/10 hover:text-white"
        >
          <SignOut size={18} weight="thin" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="admin-theme flex min-h-[100dvh] bg-[var(--admin-bg)]">
      <div className="fixed left-0 top-0 z-40 hidden h-screen w-[240px] flex-col bg-black text-white shadow-xl md:flex">
        {sidebar}
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(280px,85vw)] flex-col bg-black text-white shadow-2xl transition-transform duration-200 md:hidden ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={mobileNavOpen}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-300 transition-colors hover:bg-white/10"
          onClick={() => setMobileNavOpen(false)}
        >
          <X size={22} />
        </button>
        {sidebar}
      </div>

      <div className="flex min-h-[100dvh] w-full flex-col md:ml-[240px] md:w-[calc(100%-240px)]">
        <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-gray-200 bg-white/90 px-3 shadow-sm backdrop-blur-md md:left-[240px] md:px-8 [padding-top:env(safe-area-inset-top)]">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-black transition-colors hover:border-black hover:bg-gray-50 md:hidden"
              aria-label="Open menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <List size={20} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Dashboard
              </p>
              <h2 className="admin-heading truncate text-sm font-medium text-black sm:text-base">
                {title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/properties/new')}
            className="admin-btn-primary flex h-10 min-h-[44px] shrink-0 px-3 sm:gap-2 sm:px-4"
          >
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
        </header>

        <main className="mt-14 flex-1 overflow-x-hidden overflow-y-auto bg-white pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="max-w-full">{children}</div>
        </main>

        <nav className="admin-mobile-nav" aria-label="Admin navigation">
          {baseNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isNavActive(item.path);
            const showBadge = item.path === '/admin/requirements' && openRequirementsCount > 0;
            const showMapDot = item.path === '/admin/settings' && mapOnly;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon size={22} weight={isActive ? 'fill' : 'regular'} />
                  {showMapDot && (
                    <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-400" />
                  )}
                </div>
                {showBadge && (
                  <span className="absolute right-[18%] top-1 min-w-[16px] rounded-full bg-white px-1 text-[8px] font-bold text-black">
                    {openRequirementsCount > 9 ? '9+' : openRequirementsCount}
                  </span>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-wide">{item.short}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
