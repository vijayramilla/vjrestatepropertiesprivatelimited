import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CrmBtn } from '@/components/crm/CrmUi';
import { CalendarDays, LayoutDashboard, NotebookPen, UserRound, Users } from 'lucide-react';

export type EmployeeTab = 'dashboard' | 'clients' | 'bookings';

type Props = {
  /** Which portal section is currently open — drives the active tab. */
  tab: EmployeeTab;
  /** Employee record — used to respect bookings visibility. */
  me?: any | null;
  /** Extra top-bar / nav affordances (dashboard only). */
  notesAction?: () => void;
  /** When provided the Profile action opens a modal instead of navigating. */
  onProfile?: () => void;
  children: ReactNode;
};

const TAB_META: Record<EmployeeTab, { brand: string }> = {
  dashboard: { brand: 'Employee Portal' },
  clients: { brand: 'Employee Portal · My Clients' },
  bookings: { brand: 'Employee Portal · Bookings' },
};

/**
 * Employee workspace chrome — consistent across /crm/dashboard, /crm/my-clients
 * and /crm/my-bookings:
 *
 *  - Slim sticky top bar (brand + page actions), hidden labels below sm so it
 *    stays compact on phones.
 *  - Fluid content container capped at the site max width.
 *  - Mobile bottom navigation (thumb-reachable, 4 destinations, safe-area
 *    aware) that appears only below the lg breakpoint; on desktop the same
 *    destinations live in the top bar.
 */
export default function EmployeePortalLayout({ tab, me, notesAction, onProfile, children }: Props) {
  const navigate = useNavigate();

  const bookingsVisible = tab === 'bookings' || me?.bookings_visible !== false;

  const goProfile = () => {
    if (onProfile) onProfile();
    else navigate('/crm/dashboard?profile=1');
  };

  const topActions: { key: string; label: string; icon: ReactNode; onClick: () => void; primary?: boolean; hideOnMobile?: boolean }[] = [
    ...(tab !== 'dashboard' ? [{ key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4 sm:h-3.5 sm:w-3.5" />, onClick: () => navigate('/crm/dashboard') }] : []),
    ...(tab !== 'clients' ? [{ key: 'clients', label: 'My Clients', icon: <Users className="h-4 w-4 sm:h-3.5 sm:w-3.5" />, onClick: () => navigate('/crm/my-clients') }] : []),
    ...(bookingsVisible && tab !== 'bookings' ? [{ key: 'bookings', label: 'Bookings', icon: <CalendarDays className="h-4 w-4 text-[#96782A] sm:h-3.5 sm:w-3.5" />, onClick: () => navigate('/crm/my-bookings') }] : []),
  ];

  const navItems: { key: EmployeeTab | 'profile'; label: string; icon: ReactNode; onClick: () => void; show: boolean; active: boolean }[] = [
    { key: 'dashboard', label: 'Home', icon: <LayoutDashboard className="h-5 w-5" strokeWidth={1.9} />, onClick: () => navigate('/crm/dashboard'), show: true, active: tab === 'dashboard' },
    { key: 'clients', label: 'My Clients', icon: <Users className="h-5 w-5" strokeWidth={1.9} />, onClick: () => navigate('/crm/my-clients'), show: true, active: tab === 'clients' },
    { key: 'bookings', label: 'Bookings', icon: <CalendarDays className="h-5 w-5" strokeWidth={1.9} />, onClick: () => navigate('/crm/my-bookings'), show: bookingsVisible, active: tab === 'bookings' },
    { key: 'profile', label: 'My Profile', icon: <UserRound className="h-5 w-5" strokeWidth={1.9} />, onClick: goProfile, show: true, active: false },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased">
      {/* ─── Slim top bar ─────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-md"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
          <button
            onClick={() => navigate('/crm/dashboard')}
            className="flex min-w-0 items-center gap-2.5 text-left sm:gap-3"
            title="VJR Estate portal"
          >
            <img src="/favicon.png" alt="VJR Estate" className="h-8 w-8 shrink-0 rounded-xl object-contain shadow-[0_2px_10px_rgba(201,168,76,0.3)] sm:h-9 sm:w-9" />
            <span className="min-w-0">
              <span className="block truncate font-['Inter',sans-serif] text-[12px] font-bold leading-tight text-[#0A1628] sm:text-[13.5px]">VJR Estate</span>
              <span className="block text-[7.5px] font-bold uppercase tracking-[0.22em] text-[#96782A] sm:text-[8.5px]">
                {TAB_META[tab].brand}
              </span>
            </span>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            {notesAction && (
              <CrmBtn variant="ghost" className="min-h-[40px] min-w-[40px] px-2.5 text-[11px] sm:min-h-[36px] sm:px-3" onClick={notesAction} title="My Notes">
                <NotebookPen className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Notes</span>
              </CrmBtn>
            )}
            {topActions.map((a) => (
              <CrmBtn key={a.key} variant="ghost" className="min-h-[40px] min-w-[40px] px-2.5 text-[11px] sm:min-h-[36px] sm:px-3" onClick={a.onClick} title={a.label}>
                {a.icon} <span className="hidden sm:inline">{a.label}</span>
              </CrmBtn>
            ))}
            <CrmBtn variant="primary" className="min-h-[40px] min-w-[40px] px-2.5 text-[11px] sm:min-h-[36px] sm:px-3" onClick={goProfile} title="My Profile">
              <UserRound className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">My Profile</span>
            </CrmBtn>
          </div>
        </div>
      </header>

      {/* ─── Fluid content ────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 pb-24 pt-4 sm:px-4 sm:pt-5 lg:px-8 lg:pb-10" style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}>
        {children}
      </main>

      {/* ─── Mobile bottom navigation (lg and up uses the top bar) ── */}
      <nav
        aria-label="Portal"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-black/[0.07] bg-white/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid w-full max-w-[1600px]" style={{ gridTemplateColumns: `repeat(${navItems.filter((n) => n.show).length}, minmax(0, 1fr))` }}>
          {navItems.filter((n) => n.show).map((n) => (
            <button
              key={n.key}
              type="button"
              onClick={n.onClick}
              aria-current={n.active ? 'page' : undefined}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-1 py-1.5 transition-colors ${
                n.active ? 'text-[#96782A]' : 'text-[#9ca3af] hover:text-[#0A1628]'
              }`}
            >
              {n.active && <span className="absolute top-0 h-0.5 w-10 rounded-full bg-gradient-to-r from-[#D6B85D] to-[#C9A84C]" />}
              {n.icon}
              <span className="max-w-full truncate px-1 text-[9px] font-bold leading-none tracking-[0.02em]">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
