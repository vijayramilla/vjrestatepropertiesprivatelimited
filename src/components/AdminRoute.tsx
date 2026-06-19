import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthState(isAuthorizedAdmin(user) ? 'authorized' : 'unauthorized');
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

  return <>{children}</>;
}
