import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from '@/components/ui/footer';
import { setDefaultSiteMeta } from '@/lib/siteMeta';

export default function Layout() {
  const location = useLocation();

  const isPropertyDetail = /^\/properties\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (!isPropertyDetail) setDefaultSiteMeta();
  }, [location.pathname, isPropertyDetail]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <div className={isPropertyDetail ? 'hidden lg:block' : undefined}>
        <Footer />
      </div>
    </div>
  );
}
