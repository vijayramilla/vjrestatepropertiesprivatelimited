import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './Navbar';
import Footer from './Footer';
import CustomCursor from './CustomCursor';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <CustomCursor />
      <Navbar />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}
