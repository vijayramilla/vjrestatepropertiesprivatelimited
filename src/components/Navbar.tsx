import { useState, useEffect, useRef, useCallback, type ReactNode, type Ref } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkSimple,
  User,
  SignOut,
  SquaresFour,

  Buildings,
  PlusCircle,
  HandSwipeRight,
  Gauge,
  Pulse,
  CaretDown,
} from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import { useAuth } from '../context/AuthContext';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { PG_MANAGEMENT_ENABLED } from '@/lib/featureFlags';
import { usePropertyAccess } from '@/lib/propertyAccess';
import { callDataProxy, isSupabaseDataEnabled } from '@/lib/supabaseData';
import GoogleSignInButton from './GoogleSignInButton';
import { useLocationPermission } from '@/hooks/useLocationPermission';
import LazyImage from './common/LazyImage';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

/*
 * Account-menu configuration — the single source for the header dropdown.
 * Ownership rules: public pages live in the header's primary nav; personal
 * actions live here; partner operations live in the dashboard sidebar.
 * Public website links (About/Team/Careers/Contact) are intentionally NOT
 * reproduced here — they already sit in the main header.
 */
const profileLinks = [
  { label: 'Quick Pick', path: '/quick-pick', Icon: HandSwipeRight },
  { label: 'My Shortlist', path: '/shortlist', Icon: BookmarkSimple },
  ...(PG_MANAGEMENT_ENABLED
    ? [{ label: 'PG Management', path: '/pg-management', Icon: Buildings }]
    : []),
];

function NavIconAction({
  label,
  labelColor,
  onClick,
  ariaLabel,
  buttonRef,
  children,
}: {
  label: string;
  labelColor: string;
  onClick: () => void;
  ariaLabel: string;
  buttonRef?: Ref<HTMLButtonElement>;
  children: ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative flex flex-col items-center justify-center gap-[5px] min-w-[52px] min-h-[44px] px-2 cursor-pointer transition-colors duration-200"
    >
      <span className="relative flex items-center justify-center w-5 h-5 transition-transform duration-200 group-hover:scale-105">
        {children}
      </span>
      <span
        className="hidden md:block text-[9px] font-medium uppercase tracking-[0.14em] leading-none transition-colors duration-200 group-hover:opacity-100"
        style={{ fontFamily: DM_SANS, color: labelColor }}
      >
        {label}
      </span>
    </button>
  );
}

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const profileRef = useRef<HTMLButtonElement>(null);
  const [profilePos, setProfilePos] = useState({ top: 0, right: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const { shortlistedIds } = useShortlist();
  const { user, loading: authLoading, error: authError, signInWithGoogle, signOut, clearError } = useAuth();
  const { showLocationModal } = useLocationPermission();
  const { canAdd: canAddProperty } = usePropertyAccess();
  const [isPartner, setIsPartner] = useState(false);
  const showAdminDashboard = !!user && isAuthorizedAdmin(user);
  const isProperties = location.pathname === '/properties';
  const shortlistCount = shortlistedIds.length;
  const hasShortlist = shortlistCount > 0;

  // The header always sits on a solid, blurred surface — never transparent
  // over the hero image.
  const isTransparent = false;
  const iconColor = isTransparent ? '#ffffff' : '#0A1628';
  const iconMuted = isTransparent ? 'rgba(255,255,255,0.72)' : '#888888';
  const labelColor = isTransparent ? 'rgba(255,255,255,0.55)' : '#888888';
  const logoColor = isTransparent ? '#ffffff' : '#0A1628';
  const dividerColor = isTransparent ? 'rgba(255,255,255,0.18)' : '#e8e8e8';
  const badgeBg = isTransparent ? '#ffffff' : '#0A1628';
  const badgeText = isTransparent ? '#0A1628' : '#ffffff';

  const updateProfilePos = useCallback(() => {
    if (!profileRef.current) return;
    const rect = profileRef.current.getBoundingClientRect();
    setProfilePos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  }, []);

  // DM Sans is now self-hosted via @fontsource (bundled in the CSS) —
  // no Google Fonts runtime injection, no render-blocking fetch.

  // Registered-partner check for the account menu's "Partner Dashboard"
  // entry. The backend decides from the verified session — the menu item
  // merely reflects its answer, so unregistered accounts see nothing extra.
  useEffect(() => {
    if (!user || !isSupabaseDataEnabled()) {
      setIsPartner(false);
      return;
    }
    let cancelled = false;
    void callDataProxy('partner.check', {}, {})
      .then((res) => {
        if (!cancelled) setIsPartner(Boolean(res?.registered));
      })
      .catch(() => {
        if (!cancelled) setIsPartner(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setProfileOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setHidden(false);
  }, [location]);

  useEffect(() => {
    if (!isProperties) return;
    // Hide-on-scroll only on mobile; the header stays pinned on desktop.
    const mq = window.matchMedia('(max-width: 767px)');
    const isMobileView = () => mq.matches;
    let prev = window.scrollY;
    const handleScroll = () => {
      const y = window.scrollY;
      setHidden(isMobileView() && y > 120 && y > prev);
      prev = y;
    };
    const handleResize = () => {
      if (!isMobileView()) setHidden(false);
    };
    setHidden(false);
    prev = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isProperties]);

  useEffect(() => {
    if (!profileOpen) return;
    updateProfilePos();
    window.addEventListener('resize', updateProfilePos);
    return () => window.removeEventListener('resize', updateProfilePos);
  }, [profileOpen, updateProfilePos]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (profileRef.current?.contains(t)) return;
      if ((e.target as Element).closest?.('[data-profile-menu]')) return;
      setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setProfileOpen(false); }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ease-in-out h-12 md:h-14"
        style={{
          background: isTransparent ? 'transparent' : 'rgba(255,255,255,0.97)',
          borderBottom: isTransparent ? 'none' : '1px solid #e8e8e8',
          backdropFilter: isTransparent ? 'none' : 'blur(12px)',
          transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        <div className="w-full h-full flex items-center justify-between px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16">
          <Link to="/" className="flex shrink-0 cursor-pointer items-center gap-2 sm:gap-2.5">
            <LazyImage
              src="/favicon.png"
              alt=""
              width={32}
              height={32}
              priority={true}
              className="h-7 w-7 shrink-0 object-contain sm:h-8 sm:w-8"
            />
            <span
              className="font-serif text-lg font-bold leading-none tracking-tight md:text-xl"
              style={{ color: logoColor }}
            >
              VJR Estate
            </span>
          </Link>

          <div className="hidden md:flex flex-1 items-center justify-center gap-7 lg:gap-9">
            {[
              { label: 'Properties', path: '/properties' },
              { label: 'Blog', path: '/blog' },
              { label: 'About', path: '/about' },
              { label: 'Team', path: '/team' },
              { label: 'Careers', path: '/careers' },
              { label: 'Contact', path: '/contact' },
            ].map(({ label, path }) => {
              const active =
                location.pathname === path ||
                (path === '/properties' && location.pathname.startsWith('/properties'));
              return (
                <Link
                  key={path}
                  to={path}
                  className="group relative inline-flex flex-col items-center py-1"
                >
                  <span
                    className="text-[11px] font-semibold uppercase tracking-[0.13em] transition-colors duration-200 group-hover:text-[#0A1628]"
                    style={{
                      fontFamily: DM_SANS,
                      color: active ? '#0A1628' : '#5A6472',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    className={`mt-0.5 h-[2px] rounded-full transition-all duration-200 ${
                      active ? 'w-5 bg-[#C9A646]' : 'w-0 bg-[#C9A646]/70 group-hover:w-5'
                    }`}
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>

          <div
            className="flex items-center pl-4 md:pl-5"
            style={{ borderLeft: `1px solid ${dividerColor}` }}
          >
            <NavIconAction
              label="Saved"
              labelColor={labelColor}
              onClick={() => navigate('/shortlist')}
              ariaLabel="Saved properties"
            >
              <BookmarkSimple
                size={18}
                weight={hasShortlist ? 'fill' : 'thin'}
                color={hasShortlist ? iconColor : iconMuted}
              />
              {hasShortlist && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center text-[9px] font-semibold leading-none"
                  style={{
                    fontFamily: DM_SANS,
                    background: badgeBg,
                    color: badgeText,
                    borderRadius: 0,
                  }}
                >
                  {shortlistCount > 9 ? '9+' : shortlistCount}
                </span>
              )}
            </NavIconAction>

            <div className="w-px h-6 mx-1" style={{ background: dividerColor }} />

            {/* Partner Activity — genuine entry to the dashboard Activity tab;
                only rendered for accounts the backend confirms as partners. */}
            {isPartner && (
              <NavIconAction
                label="Activity"
                labelColor={labelColor}
                onClick={() => navigate('/partner-dashboard?view=activity')}
                ariaLabel="Partner activity"
              >
                <Pulse size={18} weight={profileOpen ? 'fill' : 'regular'} color={profileOpen ? iconColor : iconMuted} />
              </NavIconAction>
            )}

            {!user && !authLoading && (
              <>
                {/* Guest state: honest Login / Register entry — no fake avatar,
                    no placeholder name, no dashboard shortcut. */}
                <Link
                  to={`/login${location.pathname !== '/login' ? `?next=${encodeURIComponent(location.pathname + location.search)}` : ''}`}
                  onClick={() => setProfileOpen(false)}
                  className="hidden lg:inline-flex min-h-[36px] cursor-pointer items-center rounded-full bg-[#0A1628] px-4 no-underline transition-colors hover:bg-[#14263A]"
                  style={{ fontFamily: DM_SANS }}
                >
                  <span className="text-[12px] font-semibold text-white">Login / Register</span>
                </Link>
              </>
            )}

            <div className="w-px h-6 mx-1" style={{ background: dividerColor }} />

            <button
              ref={profileRef}
              type="button"
              onClick={() => {
                clearError();
                // Guests go straight to login; signed-in users get the menu.
                if (!user && !authLoading) {
                  navigate(`/login${location.pathname !== '/login' ? `?next=${encodeURIComponent(location.pathname + location.search)}` : ''}`);
                  return;
                }
                setProfileOpen((o) => !o);
              }}
              aria-label="Account menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className={`group flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 transition-all duration-200 min-h-[36px] ${
                profileOpen
                  ? 'border-[#C9A646]/60 bg-[#FBF7EC]/70 shadow-sm'
                  : 'border-transparent hover:border-[#e8e8e8] hover:bg-[#f8f8f8]'
              }`}
            >
              {user?.photoURL ? (
                <LazyImage
                  src={user.photoURL}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A1628] text-white">
                  <User size={13} weight="fill" />
                </span>
              )}
              <span className="hidden lg:block max-w-[96px] truncate text-[12px] font-semibold text-[#0A1628]" style={{ fontFamily: DM_SANS }}>
                {user ? (user.displayName || user.email?.split('@')[0] || 'Account') : 'Account'}
              </span>
              <CaretDown
                size={10}
                weight="bold"
                className={`text-[#8a8778] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>
        </div>
      </nav>

      {createPortal(
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              data-profile-menu
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="max-h-[calc(100vh-96px)] overflow-y-auto bg-white border border-[#e8e8e8] shadow-[0_16px_48px_rgba(10,22,40,0.12)] w-[280px] max-w-[calc(100vw-32px)]"
              style={{
                position: 'fixed',
                top: profilePos.top,
                right: profilePos.right,
                zIndex: 9999,
                borderRadius: 0,
              }}
            >
              {user ? (
                <div className="px-5 pt-4 pb-3 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <LazyImage
                        src={user.photoURL}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#0A1628] text-white flex-shrink-0">
                        <User size={17} weight="fill" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-semibold text-[#0A1628] truncate"
                        style={{ fontFamily: DM_SANS }}
                      >
                        {user.displayName || 'Account'}
                      </p>
                      <p
                        className="text-[11px] text-[#8a8778] truncate"
                        style={{ fontFamily: DM_SANS }}
                      >
                        {user.email}
                      </p>
                      {isPartner && (
                        <span
                          className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FBF7EC] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#8a6d1f] ring-1 ring-[#C9A646]/40"
                          style={{ fontFamily: DM_SANS }}
                        >
                          <span className="h-1 w-1 rounded-full bg-[#C9A646]" aria-hidden="true" />
                          VJR Estate Partner
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p
                  className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-[0.14em] text-[#aaa]"
                  style={{ fontFamily: DM_SANS }}
                >
                  Account
                </p>
              )}

              {/* Personal shortcuts — never repeated website navigation. */}
              {profileLinks.map(({ label, path, Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <Icon size={15} weight="regular" color="#8a8778" />
                  {label}
                </Link>
              ))}

              {/* Guest state: a clearly separated authentication action. The
                  Google button stays in the footer block below — this is the
                  visible, primary path into /login. */}
              {!user && !authLoading && (
                <Link
                  to={`/login${location.pathname !== '/login' ? `?next=${encodeURIComponent(location.pathname + location.search)}` : ''}`}
                  onClick={() => setProfileOpen(false)}
                  className="mx-3 my-2 flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0A1628] px-3.5 no-underline transition-colors hover:bg-[#14263A]"
                  style={{ fontFamily: DM_SANS }}
                >
                  <User size={15} weight="fill" className="text-[#C9A646]" aria-hidden="true" />
                  <span className="text-[13px] font-semibold text-white">Login / Register</span>
                </Link>
              )}

              {/* Account actions — signed-in customers. Partner accounts get
                  one dashboard entry instead: the workspace sidebar owns
                  section-level navigation, so it is not duplicated here. */}
              {user && !isPartner && (
                <div className="px-5 pb-1 pt-3">
                  <p
                    className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b0aca0]"
                    style={{ fontFamily: DM_SANS }}
                  >
                    My Account
                  </p>
                </div>
              )}
              {/* My Profile / My Activity — functional account pages,
                  distinct from the public header navigation. */}
              {user && (
                <Link
                  to="/my-listings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <User size={15} weight="regular" color="#8a8778" />
                  My Profile &amp; Listings
                </Link>
              )}
              {user && (
                <Link
                  to="/partner-dashboard?view=activity"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <Pulse size={15} weight="regular" color="#8a8778" />
                  My Activity
                </Link>
              )}
              {user && !isPartner && !canAddProperty && (
                <Link
                  to="/partner"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <PlusCircle size={15} weight="regular" color="#8a8778" />
                  Become a Partner
                </Link>
              )}

              {/* Partner workspace entry — backend-confirmed partners only. */}
              {isPartner && (
                <Link
                  to="/partner-dashboard"
                  onClick={() => setProfileOpen(false)}
                  className="mx-3 mb-1 mt-2 flex items-center gap-2.5 rounded-lg bg-[#0A1628] px-3.5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#14263A] cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <Gauge size={15} weight="fill" className="text-[#C9A646]" />
                  Partner Dashboard
                </Link>
              )}

              {/* Invite-only entry point: visible only to accounts the admin
                  has granted Add Property access. */}
              {canAddProperty && (
                <Link
                  to="/list-property"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <PlusCircle size={15} weight="regular" color="#8a8778" />
                  List Property
                </Link>
              )}

              {/* Group 4 — administrative access (role-checked, server-enforced) */}
              {showAdminDashboard && (
                <>
                  <div className="px-5 pb-1 pt-3">
                    <p
                      className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#b0aca0]"
                      style={{ fontFamily: DM_SANS }}
                    >
                      Administration
                    </p>
                  </div>
                  <Link
                    to="/admin/properties"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-black font-medium hover:bg-[#f8f8f8] transition-colors cursor-pointer"
                    style={{ fontFamily: DM_SANS }}
                  >
                    <SquaresFour size={15} weight="regular" color="#5A6472" />
                    Admin Dashboard
                  </Link>
                  <Link
                    to="/crm"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-5 py-[10px] text-[13px] text-black font-medium hover:bg-[#f8f8f8] transition-colors cursor-pointer"
                    style={{ fontFamily: DM_SANS }}
                  >
                    <Buildings size={15} weight="regular" color="#5A6472" />
                    CRM
                  </Link>
                </>
              )}

              <div className="border-t border-[#f0f0f0] mt-1 px-5 py-4">
                {authLoading ? (
                  <p
                    className="text-[11px] text-[#aaaaaa]"
                    style={{ fontFamily: DM_SANS }}
                  >
                    Loading…
                  </p>
                ) : user ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await signOut();
                      setProfileOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full text-left text-[13px] text-[#333333] hover:text-black transition-colors cursor-pointer"
                    style={{ fontFamily: DM_SANS }}
                  >
                    <SignOut size={15} weight="thin" color="#aaaaaa" />
                    Sign out
                  </button>
                ) : (
                  <div className="space-y-2">
                    <GoogleSignInButton
                      onClick={async () => {
                        await signInWithGoogle();
                        setProfileOpen(false);
                        showLocationModal();
                      }}
                    />
                    {authError && (
                      <p
                        className="text-[11px] text-[#666666] leading-snug"
                        style={{ fontFamily: DM_SANS }}
                      >
                        {authError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
