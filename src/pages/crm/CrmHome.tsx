import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import AdminCrm from '@/pages/admin/AdminCrm';

/** /crm — admins see the full dashboard; employees are routed to their own workspace. */
export default function CrmHome() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadSupabase.admin.verify()
      .then((p) => setRole(p.role ?? null))
      .catch(() => setRole('admin'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
      </div>
    );
  }

  if (role === 'employee') return <Navigate to="/crm/dashboard" replace />;
  return <AdminCrm />;
}
