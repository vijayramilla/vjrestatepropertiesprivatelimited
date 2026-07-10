import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from '@/components/ui/footer';
import { setDefaultSiteMeta } from '@/lib/siteMeta';

export default function Layout() {
  const location = useLocation();

  const isPropertyDetail = /^\/properties\/[^/]+$/.test(location.pathname);
  const isMapPage = location.pathname === '/map';

  useEffect(() => {
    if (!isPropertyDetail) setDefaultSiteMeta();
  }, [location.pathname, isPropertyDetail]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {!isMapPage && <Navbar />}
      <main className={`flex-1 w-full ${isMapPage ? 'overflow-hidden' : ''}`}>
        <Outlet />
      </main>
      <div className={isMapPage ? 'hidden' : isPropertyDetail ? 'hidden lg:block' : undefined}>
        <Footer />
      </div>
    </div>
  );
}
