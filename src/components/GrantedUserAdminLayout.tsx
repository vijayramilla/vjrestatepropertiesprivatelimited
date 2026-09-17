import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { List, Plus, X, SignOut, Globe } from '@phosphor-icons/react';
import { auth } from '@/lib/firebase';
import { usePropertyAccess } from '@/lib/propertyAccess';

interface GrantedUserAdminLayoutProps {
  children: ReactNode;
  title?: string;
}

/**
 * Deliberately minimal chrome for users who hold only the Add Property
 * permission: a header with the page title, a View Website link, and sign
 * out. No CRM/admin navigation is rendered — those pages stay behind the
 * full AdminRoute guard.
 */
export default function GrantedUserAdminLayout({ children, title = 'Add Property' }: GrantedUserAdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { canAdd } = usePropertyAccess();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const onAddProperty = canAdd;

  return (
    <div className="admin-theme flex min-h-[100dvh] flex-col bg-[var(--admin-bg)]">
      <header className="admin-topbar fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-2 px-3 md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-gray-200 text-[#0A1628] transition-colors hover:border-[#C9A84C] hover:bg-[#FBF7EC] md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <List size={20} />
          </button>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#96782A] shadow-[0_4px_16px_rgba(201,168,76,0.35)]">
            <span className="text-[14px] font-bold tracking-tight text-[#0A1628]">V</span>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.2em] text-[#96782A]">
              VJR Estate · Portal
            </p>
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-[#0A1628]">
              {title}
            </h2>
          </div>
        </div>
        {onAddProperty && (
          <button
            type="button"
            onClick={() => navigate('/admin/properties/new')}
            className="admin-btn-primary h-10 min-h-[40px] shrink-0 px-3 sm:gap-2 sm:px-4"
          >
            <Plus size={16} weight="bold" />
            <span className="hidden sm:inline">Add Property</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </header>

      {/* Mobile drawer — the only nav granted users get */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[#0A1628]/60 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={`admin-sidebar fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(300px,88vw)] flex-col transition-transform duration-300 md:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={menuOpen}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          aria-label="Close navigation"
          className="absolute right-1.5 top-1.5 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          onClick={() => setMenuOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="border-b border-white/[0.06] px-5 pb-5 pt-6">
          <p className="text-[15px] font-semibold tracking-tight text-white">VJR Estate</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#C9A84C]">
            Property Portal
          </p>
        </div>
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3">
          <button
            type="button"
            onClick={() => navigate('/admin/properties/new')}
            className="admin-nav-item"
          >
            <Plus size={18} weight="regular" />
            Add Property
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/properties')}
            className="admin-nav-item"
          >
            <List size={18} weight="regular" />
            My Listings
          </button>
          <a href="/" className="admin-nav-item">
            <Globe size={18} weight="regular" />
            View Website
          </a>
        </nav>
        <div className="space-y-0.5 border-t border-white/[0.06] px-3 py-4">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              handleSignOut();
            }}
            className="admin-nav-item"
          >
            <SignOut size={18} weight="regular" />
            Sign Out
          </button>
        </div>
      </div>

      <main className="mt-14 flex-1 overflow-x-hidden bg-[var(--admin-bg)] pb-[calc(4.25rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
