import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { usePropertyAccess } from '@/lib/propertyAccess';

interface AnyAdminRouteProps {
  children: ReactNode;
}

/**
 * Guard for the granted-user corner of the admin area: full admins always
 * pass, and so do normal users holding the admin-granted Add Property
 * permission. Everyone else is sent to the staff login page.
 */
export default function AnyAdminRoute({ children }: AnyAdminRouteProps) {
  const { loading, canAdd } = usePropertyAccess();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAdmin(isAuthorizedAdmin(user));
    });
    return () => unsubscribe();
  }, []);

  if (loading || isAdmin === null) {
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

  if (!isAdmin && !canAdd) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
