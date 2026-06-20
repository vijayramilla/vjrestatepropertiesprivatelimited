import { useState, useEffect, useRef, useCallback, type ReactNode, type Ref } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookmarkSimple,
  User,
  Envelope,
  Phone,
  SignOut,
  SquaresFour,
} from '@phosphor-icons/react';
import { useShortlist } from '../context/ShortlistContext';
import { useAuth } from '../context/AuthContext';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import GoogleSignInButton from './GoogleSignInButton';

const DM_SANS = "'DM Sans', system-ui, sans-serif";

const profileLinks = [
  { label: 'My Shortlist', path: '/shortlist', Icon: BookmarkSimple },
  { label: 'Submit Requirement', path: '/submit-requirement', Icon: Envelope },
  { label: 'Contact Us', path: '/contact', Icon: Phone },
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
  const [onHero, setOnHero] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLButtonElement>(null);
  const [profilePos, setProfilePos] = useState({ top: 0, right: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const { shortlistedIds } = useShortlist();
  const { user, loading: authLoading, error: authError, signInWithGoogle, signOut, clearError } = useAuth();
  const showAdminDashboard = !!user && isAuthorizedAdmin(user);
  const isHome = location.pathname === '/';
  const shortlistCount = shortlistedIds.length;
  const hasShortlist = shortlistCount > 0;

  const isTransparent = isHome && onHero;
  const iconColor = isTransparent ? '#ffffff' : '#000000';
  const iconMuted = isTransparent ? 'rgba(255,255,255,0.72)' : '#888888';
  const labelColor = isTransparent ? 'rgba(255,255,255,0.55)' : '#888888';
  const logoColor = isTransparent ? '#ffffff' : '#000000';
  const dividerColor = isTransparent ? 'rgba(255,255,255,0.18)' : '#e8e8e8';
  const badgeBg = isTransparent ? '#ffffff' : '#000000';
  const badgeText = isTransparent ? '#000000' : '#ffffff';

  const updateProfilePos = useCallback(() => {
    if (!profileRef.current) return;
    const rect = profileRef.current.getBoundingClientRect();
    setProfilePos({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    const id = 'dm-sans-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setOnHero(window.scrollY <= window.innerHeight * 0.8);
      setProfileOpen(false);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    if (!isHome) setOnHero(false);
  }, [location, isHome]);

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
      if (e.key === 'Escape') setProfileOpen(false);
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
        className="fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ease-in-out h-14 md:h-16"
        style={{
          background: isTransparent ? 'transparent' : 'rgba(255,255,255,0.97)',
          borderBottom: isTransparent ? 'none' : '1px solid #e8e8e8',
          backdropFilter: isTransparent ? 'none' : 'blur(12px)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-16 h-full flex items-center justify-between">
          <Link to="/" className="flex-shrink-0 cursor-pointer">
            <span
              className="font-serif text-xl md:text-2xl font-normal tracking-[-0.01em]"
              style={{ color: logoColor }}
            >
              VJR Estate
            </span>
          </Link>

          <div className="hidden md:flex flex-1 items-center justify-center gap-8">
            {[
              { label: 'Properties', path: '/properties' },
              { label: 'About', path: '/about' },
              { label: 'Contact', path: '/contact' },
            ].map(({ label, path }) => (
              <Link
                key={path}
                to={path}
                className="text-[11px] font-medium uppercase tracking-[0.14em] transition-opacity hover:opacity-100"
                style={{
                  fontFamily: DM_SANS,
                  color: location.pathname === path || (path === '/properties' && location.pathname.startsWith('/properties'))
                    ? iconColor
                    : labelColor,
                  opacity: location.pathname === path || (path === '/properties' && location.pathname.startsWith('/properties')) ? 1 : 0.85,
                }}
              >
                {label}
              </Link>
            ))}
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

            <NavIconAction
              label="Account"
              labelColor={labelColor}
              onClick={() => {
                clearError();
                setProfileOpen((o) => !o);
              }}
              ariaLabel="Account menu"
              buttonRef={profileRef}
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-[18px] h-[18px] object-cover"
                  style={{ borderRadius: 0 }}
                />
              ) : (
                <User
                  size={18}
                  weight={profileOpen || user ? 'regular' : 'thin'}
                  color={profileOpen || user ? iconColor : iconMuted}
                />
              )}
            </NavIconAction>
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
              className="bg-white border border-[#e8e8e8] shadow-[0_16px_48px_rgba(0,0,0,0.10)] w-[260px]"
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
                      <img
                        src={user.photoURL}
                        alt=""
                        className="w-9 h-9 object-cover flex-shrink-0"
                        style={{ borderRadius: 0 }}
                      />
                    ) : (
                      <div
                        className="w-9 h-9 flex items-center justify-center bg-[#f0f0f0] flex-shrink-0"
                        style={{ borderRadius: 0 }}
                      >
                        <User size={18} weight="thin" color="#888888" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p
                        className="text-[13px] font-medium text-black truncate"
                        style={{ fontFamily: DM_SANS }}
                      >
                        {user.displayName || 'Account'}
                      </p>
                      <p
                        className="text-[11px] text-[#aaaaaa] truncate"
                        style={{ fontFamily: DM_SANS }}
                      >
                        {user.email}
                      </p>
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

              {profileLinks.map(({ label, path, Icon }) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-5 py-[11px] text-[13px] text-[#333333] hover:bg-[#f8f8f8] hover:text-black transition-colors cursor-pointer"
                  style={{ fontFamily: DM_SANS }}
                >
                  <Icon size={15} weight="thin" color="#aaaaaa" />
                  {label}
                </Link>
              ))}

              {showAdminDashboard && (
                <>
                  <div className="border-t border-[#f0f0f0] mt-1" />
                  <Link
                    to="/admin/properties"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 px-5 py-[11px] text-[13px] text-black font-medium hover:bg-[#f8f8f8] transition-colors cursor-pointer"
                    style={{ fontFamily: DM_SANS }}
                  >
                    <SquaresFour size={15} weight="thin" color="#000000" />
                    Admin Dashboard
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
