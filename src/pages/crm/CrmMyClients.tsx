import { useEffect, useState, useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import { useEmployeeSession } from '@/hooks/useEmployeeSession';
import { MessageSquare, ChevronRight } from 'lucide-react';
import EmployeeClientsSection from '@/components/crm/EmployeeClientsSection';
import EmployeePortalLayout from '@/components/crm/EmployeePortalLayout';
import KycClientsGate from '@/components/crm/KycClientsGate';

export default function CrmMyClients() {
  useEmployeeSession();
  const navigate = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLocked, setClientsLocked] = useState(false);
  const [kycStatus, setKycStatus] = useState('not_started');
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [activityByClient, setActivityByClient] = useState<Record<number, any[]>>({});
  const [openActivity, setOpenActivity] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [verify, meRes, clientsRes, visitsRes, kycRes] = await Promise.all([
        leadSupabase.admin.verify().catch(() => ({ role: undefined as string | undefined })),
        leadSupabase.employees.me().catch(() => ({ data: null })),
        leadSupabase.employees.clients().catch(() => ({ data: { employee: null, clients: [] as any[], locked: false } })),
        leadSupabase.visits.list().catch(() => ({ data: [] as any[] })),
        leadSupabase.employees.kycGet().catch(() => ({ data: null })),
      ]);
      setIsEmployee(verify?.role === 'employee');
      setMe(meRes.data);
      setClientsLocked((clientsRes.data as any)?.locked === true);
      setKycStatus((kycRes.data as any)?.kyc?.status ?? 'not_started');
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
    <EmployeePortalLayout tab="clients" me={me}>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#A3842E]">
            <span className="h-px w-6 bg-gradient-to-r from-[#C9A84C] to-transparent" /> My Pipeline
          </p>
          <h1 className="font-['Inter',sans-serif] text-[22px] font-semibold tracking-tight text-[#0A1628] sm:text-[26px]">My Clients</h1>
          <p className="mt-1 text-[12px] text-[#6b7280]">Your assigned leads — update status, schedule site visits, and log follow-ups.</p>
        </div>
      </div>

      {clientsLocked ? (
        <KycClientsGate kycStatus={kycStatus} onChanged={fetchAll} onOpen={() => navigate('/crm/dashboard?kyc=1')} />
      ) : (
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
      )}
    </EmployeePortalLayout>
  );
}
