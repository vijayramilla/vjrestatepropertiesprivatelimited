import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCrmUserRole } from '@/lib/adminAuth';

interface CrmRouteProps {
  children: ReactNode;
}

/**
 * Admin-only route guard for every /crm/* page except the employee workspace
 * (which uses EmployeeRoute). Employees who type or land on an admin URL are
 * sent straight to their own dashboard — they must never see admin pages.
 */
export default function CrmRoute({ children }: CrmRouteProps) {
  const [authState, setAuthState] = useState<'loading' | 'admin' | 'employee' | 'unauthorized'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const role = await getCrmUserRole(user);
      setAuthState(role === 'admin' ? 'admin' : role === 'employee' ? 'employee' : 'unauthorized');
    });

    return () => unsubscribe();
  }, []);

  if (authState === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          </div>
          <p className="mt-4 font-sans text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthorized') {
    return <Navigate to="/admin/login" replace />;
  }

  if (authState === 'employee') {
    return <Navigate to="/crm/dashboard" replace />;
  }

  return <>{children}</>;
}
