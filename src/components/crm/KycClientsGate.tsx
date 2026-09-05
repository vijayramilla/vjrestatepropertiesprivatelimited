import { Lock, ShieldCheck, Hourglass, RefreshCw, BadgeCheck, AlertTriangle } from 'lucide-react';
import { CrmBtn } from '@/components/crm/CrmUi';

type Props = {
  /** current KYC submission status: not_started | pending | changes_requested */
  kycStatus?: string;
  onChanged?: () => void;
  /** Opens the KYC onboarding flow (popup / sheet). */
  onOpen?: () => void;
};

/** Shown in place of the client pipeline while the KYC gate is closed. */
export default function KycClientsGate({ kycStatus = 'not_started', onChanged, onOpen }: Props) {
  const status = kycStatus || 'not_started';
  const copy: Record<string, { icon: any; title: string; body: string }> = {
    not_started: {
      icon: ShieldCheck,
      title: 'Finish your KYC onboarding to unlock My Clients',
      body: 'Your manager requires identity verification (Aadhaar & PAN) before your client pipeline opens. Tap Complete KYC — it takes under two minutes, and your pipeline unlocks the moment the admin approves.',
    },
    pending: {
      icon: Hourglass,
      title: 'Your KYC is under review',
      body: 'The admin is verifying your documents right now. Your client pipeline unlocks automatically the moment it is approved — usually within a day. You can check the details anytime.',
    },
    changes_requested: {
      icon: AlertTriangle,
      title: 'KYC needs a small correction',
      body: 'Some documents were returned by the admin. Open the KYC flow, fix the highlighted documents, and resubmit — the pipeline unlocks once it is approved.',
    },
  };
  const c = copy[status] ?? copy.not_started;

  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:rounded-3xl">
      <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
          <Lock className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">My Clients · Locked</p>
          <p className="hidden text-[10px] font-semibold text-white/50 sm:block">Protected workspace — KYC verification required by your admin</p>
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${
          status === 'changes_requested' ? 'bg-red-50 text-red-500' : status === 'pending' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-600'
        }`}>
          <c.icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-[#0A1628] sm:text-[15px]">{c.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#6b7280]">{c.body}</p>
        </div>
        {onChanged && (
          <CrmBtn variant="ghost" className="min-h-[40px] shrink-0 text-[11px]" onClick={onChanged}>
            <RefreshCw className="h-3.5 w-3.5" /> Check status
          </CrmBtn>
        )}
        {onOpen && (
          <CrmBtn variant="gold" className="min-h-[40px] shrink-0 text-[11px]" onClick={onOpen}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {status === 'pending' ? 'View details' : status === 'changes_requested' ? 'Review & resubmit' : 'Complete KYC'}
          </CrmBtn>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-black/[0.04] bg-[#fafafa] px-4 py-3 sm:px-6">
        {[
          { icon: BadgeCheck, text: 'Aadhaar front & back + PAN card uploaded' },
          { icon: ShieldCheck, text: 'Declared numbers match the admin record' },
          { icon: Lock, text: 'Admin approves → pipeline unlocks automatically' },
        ].map((s) => (
          <span key={s.text} className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-[#6b7280]">
            <s.icon className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} /> {s.text}
          </span>
        ))}
      </div>
    </div>
  );
}
