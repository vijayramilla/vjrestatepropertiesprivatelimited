import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from '@/components/ui/footer';
import { setDefaultSiteMeta } from '@/lib/siteMeta';

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    const isPropertyDetail = /^\/properties\/[^/]+$/.test(location.pathname);
    if (!isPropertyDetail) setDefaultSiteMeta();
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={false} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
