import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Properties', path: '/properties' },
  { name: 'About', path: '/about' },
  { name: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black backdrop-blur-sm' : 'bg-transparent'}`}
        style={{ height: '72px' }}
      >
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <Link to="/" className="hoverable">
            <span className="font-display text-white" style={{ fontSize: '22px', letterSpacing: '-0.02em' }}>VJR Estate</span>
          </Link>
          <div className="hidden lg:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className={`nav-link text-white text-[13px] uppercase tracking-[0.12em] transition-colors duration-300 hoverable ${location.pathname === link.path ? 'font-medium' : ''}`}>
                {link.name}
              </Link>
            ))}
          </div>
          <div className="hidden lg:block">
            <Link to="/submit-requirement" className="hoverable inline-flex items-center justify-center px-6 py-3 border border-white text-white text-[13px] uppercase tracking-[0.1em] transition-all duration-300 hover:bg-white hover:text-black">
              Submit Requirement
            </Link>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-white hoverable p-2" aria-label="Toggle menu">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 z-40 bg-black mobile-menu-overlay lg:hidden flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-8">
              {navLinks.map((link, index) => (
                <motion.div key={link.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: index * 0.1, duration: 0.3 }}>
                  <Link to={link.path} className="hoverable font-display text-white text-[42px] leading-none" style={{ letterSpacing: '-0.02em' }}>{link.name}</Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: navLinks.length * 0.1, duration: 0.3 }}>
                <Link to="/submit-requirement" className="hoverable font-display text-white text-[42px] leading-none" style={{ letterSpacing: '-0.02em' }}>Submit Requirement</Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
