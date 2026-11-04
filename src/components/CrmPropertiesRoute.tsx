import { ReactNode, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { isAuthorizedAdmin } from '@/lib/adminAuth';
import { usePropertyAccess } from '@/lib/propertyAccess';
import CrmModuleRoute from '@/components/CrmModuleRoute';

interface CrmPropertiesRouteProps {
  children: ReactNode;
}

/**
 * Guard for the CRM Properties module. Access tiers, in order:
 * 1. Full admins (isAuthorizedAdmin) pass directly.
 * 2. Legacy granted users (can_add_property, previously serving their
 *    "My Listings" view at /admin/properties) also pass — they carry no CRM
 *    grant, so the module-registry deny would otherwise lock them out.
 * 3. Everyone else falls through to the standard CrmModuleRoute grant check
 *    for the 'properties' module (default-deny).
 */
export default function CrmPropertiesRoute({ children }: CrmPropertiesRouteProps) {
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
          <p className="mt-4 text-sm text-gray-600">Checking access…</p>
        </div>
      </div>
    );
  }

  if (isAdmin || canAdd) return <>{children}</>;

  return <CrmModuleRoute moduleKey="properties">{children}</CrmModuleRoute>;
}
