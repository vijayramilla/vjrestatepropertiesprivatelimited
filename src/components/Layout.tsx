import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from '@/components/ui/footer';
import { setDefaultSiteMeta } from '@/lib/siteMeta';

export default function Layout() {
  const location = useLocation();

  const isPropertyDetail = /^\/properties\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (!isPropertyDetail) setDefaultSiteMeta();
  }, [location.pathname, isPropertyDetail]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <div className={isPropertyDetail ? 'hidden lg:block' : undefined}>
        <Footer />
      </div>
    </div>
  );
}
