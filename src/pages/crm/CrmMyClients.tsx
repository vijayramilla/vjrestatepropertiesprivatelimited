import { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';
import { CrmBtn } from '@/components/crm/CrmUi';
import { UserRound, LayoutDashboard, MessageSquare, ChevronRight } from 'lucide-react';
import EmployeeClientsSection from '@/components/crm/EmployeeClientsSection';

export default function CrmMyClients() {
  useEmployeeSession();
  const navigate = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [activityByClient, setActivityByClient] = useState<Record<number, any[]>>({});
  const [openActivity, setOpenActivity] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [verify, meRes, clientsRes, visitsRes] = await Promise.all([
        leadSupabase.admin.verify().catch(() => ({ role: undefined as string | undefined })),
        leadSupabase.employees.me().catch(() => ({ data: null })),
        leadSupabase.employees.clients().catch(() => ({ data: { employee: null, clients: [] as any[] } })),
        leadSupabase.visits.list().catch(() => ({ data: [] as any[] })),
      ]);
      setIsEmployee(verify.role === 'employee');
      setMe(meRes.data);
      setClients(clientsRes.data?.clients ?? []);
      setVisits(visitsRes.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleActivity = async (sno: number) => {
    if (openActivity === sno) { setOpenActivity(null); return; }
    setOpenActivity(sno);
    if (!activityByClient[sno]) {
      try {
        const res = await leadSupabase.crmClients.activity(sno);
        setActivityByClient((m) => ({ ...m, [sno]: res.data ?? [] }));
      } catch (e) { console.error(e); }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] font-['Inter',sans-serif] antialiased">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="relative mx-auto h-12 w-12">
              <div className="absolute inset-0 animate-ping rounded-full bg-[#C9A84C]/20" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#C9A84C]/40 bg-white">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
              </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-[#9ca3af]">Loading your clients…</p>
          </div>
        </div>
      </div>
    );
  }

  if (isEmployee === false) return <Navigate to="/crm" replace />;
  if (!me) return <Navigate to="/employee-login" replace />;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased">
      {/* Slim top bar — same as the employee dashboard */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <img src="/favicon.png" alt="VJR Estate" className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-[0_2px_10px_rgba(201,168,76,0.3)]" />
          <div className="min-w-0">
            <p className="truncate font-['Inter',sans-serif] text-[13.5px] font-bold leading-tight text-[#0A1628]">VJR Estate</p>
            <p className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-[#96782A]">Employee Portal</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <CrmBtn variant="ghost" className="min-h-[36px] px-3 text-[11px]" onClick={() => navigate('/crm/dashboard')}>
              <LayoutDashboard className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Dashboard</span>
            </CrmBtn>
            <CrmBtn variant="primary" className="min-h-[36px] px-3 text-[11px]" onClick={() => navigate('/crm/dashboard')}>
              <UserRound className="h-3.5 w-3.5" /> <span className="hidden sm:inline">My Profile</span>
            </CrmBtn>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <EmployeeClientsSection
          clients={clients}
          visits={visits}
          me={me}
          onChanged={fetchAll}
          extra={(c: any) => {
            const isOpen = openActivity === c.sno;
            const activity = activityByClient[c.sno];
            return (
              <div className="border-t border-black/[0.04] pt-2.5">
                <button
                  onClick={() => toggleActivity(c.sno)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] font-bold text-[#96782A] transition-colors hover:bg-[#C9A84C]/[0.1]"
                >
                  <MessageSquare className="h-3 w-3" strokeWidth={1.8} />
                  {isOpen ? 'Hide Activity' : 'Activity'}
                  <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} strokeWidth={2} />
                </button>
                {isOpen && (
                  <div className="mt-2 space-y-2.5 rounded-xl border border-black/[0.05] bg-white p-3">
                    {!activity ? (
                      <div className="h-10 animate-pulse rounded-lg bg-black/[0.03]" />
                    ) : activity.length === 0 ? (
                      <p className="text-[11px] text-[#9ca3af]">No activity yet.</p>
                    ) : (
                      activity.map((a: any) => (
                        <div key={a.id} className="flex items-start gap-2 text-[11.5px]">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A84C]" />
                          <div className="min-w-0">
                            <p className="text-[#0A1628]">
                              <span className="font-bold capitalize">{a.action?.replace('_', ' ')}</span>
                              {a.status && <> → <span className="font-semibold text-[#96782A]">{a.status}</span></>}
                              {a.note && <span className="text-[#6b7280]"> · {a.note}</span>}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#9ca3af]">
                              {a.performed_by || 'System'} · {new Date(a.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
