import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCrmUserRole } from '@/lib/adminAuth';

interface EmployeeRouteProps {
  children: ReactNode;
}

/**
 * Employee-only route guard. Covers the employee workspace (/crm/dashboard,
 * /crm/my-clients). Admins who land here (or type the URL) are sent back to
 * the CRM home; anyone else is sent to the login page. This complements
 * CrmRoute, which redirects employees away from every admin page.
 */
export default function EmployeeRoute({ children }: EmployeeRouteProps) {
  const [authState, setAuthState] = useState<'loading' | 'employee' | 'other' | 'unauthorized'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const role = await getCrmUserRole(user);
      setAuthState(role === 'employee' ? 'employee' : role ? 'other' : 'unauthorized');
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

  if (authState === 'other') {
    return <Navigate to="/crm" replace />;
  }

  return <>{children}</>;
}
