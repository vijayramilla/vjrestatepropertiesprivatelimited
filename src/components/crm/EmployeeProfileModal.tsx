import { useRef, useState } from 'react';
import { Mail, Phone, Building2, CreditCard, CalendarDays, Hourglass, UserRound, Wallet, Sparkles, X, CheckCircle2, Download, Camera, Loader2, Check } from 'lucide-react';
import { buildSalaryStructure } from '@/utils/payrollCalculator';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import { formatINR } from '@/lib/inr';
import { leadSupabase } from '@/services/leadSupabase';

type Props = {
  me: any;
  stats: any;
  payroll: any[];
  onClose: () => void;
  /** Called after the profile photo changes so the parent can refresh `me`. */
  onChanged?: () => void;
};

function fmtTime12(t: string | null | undefined): string {
  if (!t) return '—';
  const raw = t.length >= 8 ? t.slice(0, 5) : t;
  const [hStr, mStr] = raw.split(':').map(Number);
  if (hStr == null || mStr == null || Number.isNaN(hStr)) return raw;
  const h = hStr % 12 === 0 ? 12 : hStr % 12;
  const suffix = hStr < 12 ? 'AM' : 'PM';
  return `${h}:${String(mStr).padStart(2, '0')} ${suffix}`;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function EmployeeProfileModal({ me, stats, payroll, onClose, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDone, setPhotoDone] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const handlePhotoFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Please choose an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Image too large — max 5 MB.'); return; }
    setPhotoError('');
    setPhotoUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read the file'));
        reader.readAsDataURL(file);
      });
      await leadSupabase.employees.uploadPhoto(me.id, base64);
      setPhotoDone(true);
      setTimeout(() => setPhotoDone(false), 2000);
      onChanged?.();
    } catch (e: any) {
      setPhotoError(e?.message ?? 'Photo upload failed');
    } finally {
      setPhotoUploading(false);
    }
  };
  const profileRows: { icon: any; label: string; value: string }[] = [
    { icon: Mail, label: 'Email', value: me.email || '—' },
    { icon: Phone, label: 'Phone', value: me.phone || '—' },
    { icon: Phone, label: 'Alternate Phone', value: me.alternate_phone || '—' },
    { icon: CalendarDays, label: 'Date of Birth', value: me.date_of_birth ? new Date(me.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
    { icon: UserRound, label: 'Gender', value: me.gender || '—' },
    { icon: Building2, label: 'Department', value: me.department || '—' },
    { icon: CreditCard, label: 'Employee ID', value: me.employee_id || '—' },
    { icon: CalendarDays, label: 'Joining Date', value: me.joining_date ? new Date(me.joining_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
    { icon: Hourglass, label: 'Work Hours', value: `${fmtTime12(stats?.work_start_time)} – ${fmtTime12(stats?.auto_logout_time)}` },
    { icon: UserRound, label: 'Status', value: me.status || 'Active' },
  ];

  const payVisible = me.payroll_visible === true || me.payroll_visible === 'true';
  const payRows: { label: string; value: string; mono?: boolean }[] = !payVisible
    ? []
    : me.designation === 'Channel Partner'
    ? [
        { label: 'Compensation', value: `Commission-based · ${me.commission_rate ?? 0}% of deal` },
        { label: 'Bank', value: me.bank_name || '—' },
        { label: 'Account', value: me.bank_account_number || '—', mono: true },
        { label: 'IFSC', value: me.ifsc_code || '—', mono: true },
        { label: 'PAN', value: me.pan_number || '—', mono: true },
        { label: 'Aadhar', value: me.aadhar_number || '—', mono: true },
        { label: 'UAN (PF)', value: me.uan_number || '—', mono: true },
        { label: 'ESI', value: me.esi_number || '—', mono: true },
        { label: 'Emergency Contact', value: [me.emergency_contact_name, me.emergency_contact_phone].filter(Boolean).join(' · ') || '—' },
      ]
    : [
        { label: 'Monthly Salary', value: formatINR(me.salary) },
        { label: 'Bank', value: me.bank_name || '—' },
        { label: 'Account', value: me.bank_account_number || '—', mono: true },
        { label: 'IFSC', value: me.ifsc_code || '—', mono: true },
        { label: 'PAN', value: me.pan_number || '—', mono: true },
        { label: 'Aadhar', value: me.aadhar_number || '—', mono: true },
        { label: 'UAN (PF)', value: me.uan_number || '—', mono: true },
        { label: 'ESI', value: me.esi_number || '—', mono: true },
        { label: 'Emergency Contact', value: [me.emergency_contact_name, me.emergency_contact_phone].filter(Boolean).join(' · ') || '—' },
      ];

  const latestPay = payroll[0];
  const downloadPayslip = async (p: any) => {
    try {
      const salary = buildSalaryStructure(Number(me.salary ?? 0) || 0);
      await generatePayslipPDF(me, { month: p.month, year: p.year, workingDays: 26, daysWorked: 26, lopDays: 0 }, salary);
    } catch (err: any) {
      console.error('[payslip PDF]', err);
      alert('Failed to generate payslip PDF: ' + (err?.message ?? err));
    }
  };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#050b14]/80 p-3 backdrop-blur-xl sm:items-center sm:p-4">
      <div className="pointer-events-none fixed left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C9A84C]/[0.1] blur-[110px]" />

      <div className="relative flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[24px] border border-white/[0.09] bg-white shadow-[0_32px_100px_rgba(0,0,0,0.5)] sm:rounded-[28px] sm:max-h-[92dvh]">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-2 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-4 sm:px-6 sm:py-5">
          <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[#C9A84C]/[0.14] blur-[70px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D6B85D]/70 to-transparent" />
          <div className="relative flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#D6B85D] to-[#96782A] opacity-80 blur-sm" />
              <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#1E3852] sm:h-16 sm:w-16">
                {me.profile_photo_url ? (
                  <img src={me.profile_photo_url} alt={me.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-extrabold text-[#D6B85D]">{initials(me.name || 'E')}</span>
                )}
              </div>
              {/* Photo upload — employees own their picture */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={photoUploading}
                title="Change profile photo"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#D6B85D] to-[#C9A84C] text-[#0A1628] shadow ring-2 ring-white transition-all hover:brightness-110 disabled:opacity-60 sm:h-7 sm:w-7"
              >
                {photoUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : photoDone ? <Check className="h-3 w-3" strokeWidth={3} /> : <Camera className="h-3 w-3" strokeWidth={2.2} />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { handlePhotoFile(e.target.files?.[0]); e.target.value = ''; }}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate font-['Inter',sans-serif] text-[17px] font-bold tracking-tight text-white sm:text-[20px]">{me.name || 'Employee'}</p>
              <p className="mt-0.5 text-[11px] font-bold text-[#D6B85D]">{me.designation || 'Employee'} · {me.department || 'Team'}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-white/60 ring-1 ring-white/10">
                ID {me.employee_id || '—'}
              </span>
              {photoError && <p className="mt-1 text-[10px] font-semibold text-red-300">{photoError}</p>}
            </div>
            <button onClick={onClose} className="ml-auto min-h-[44px] min-w-[44px] shrink-0 rounded-lg p-2.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Contact & Details */}
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                <UserRound className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} /> Contact & Details
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {profileRows.map((r) => (
                  <div key={r.label} className="flex items-start gap-2.5 rounded-xl border border-black/[0.05] bg-[#fafafa] p-3">
                    <r.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                    <div className="min-w-0">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{r.label}</p>
                      <p className="mt-0.5 break-words text-[12.5px] font-semibold text-[#0A1628]">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Salary & Bank — hidden when payroll_visible is off */}
            {payVisible && (
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                <Wallet className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} /> Salary & Bank
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {payRows.map((r) => (
                  <div key={r.label} className="rounded-xl border border-black/[0.05] bg-[#fafafa] p-3">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">{r.label}</p>
                    <p className={`mt-0.5 break-words text-[12.5px] font-semibold text-[#0A1628] ${r.mono ? 'font-mono' : ''}`}>{r.value}</p>
                  </div>
                ))}
              </div>
            </div>
            )}
            {me.notes && (
              <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/[0.08] p-3">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                <div className="min-w-0">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#96782A]">Notes</p>
                  <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-[#0A1628]">{me.notes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Payroll — hidden when payroll_visible is off */}
          {payVisible && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-black/[0.06]">
            <div className="flex items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-5 py-3.5">
              <Wallet className="h-4 w-4 text-[#D6B85D]" strokeWidth={1.8} />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">My Payroll</p>
              {latestPay && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#C9A84C]/[0.16] px-2 py-0.5 text-[9.5px] font-bold text-[#D6B85D]">
                  <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} /> {latestPay.status}
                </span>
              )}
            </div>
            <div className="bg-white p-4 sm:p-5">
              {!latestPay ? (
                <p className="py-6 text-center text-xs text-[#9ca3af]">No payslip generated yet — it appears here once your admin generates the monthly payroll.</p>
              ) : (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/[0.05] bg-[#fafafa] p-4">
                    <div>
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Period</p>
                      <p className="mt-0.5 text-[13px] font-bold text-[#0A1628]">
                        {new Date(latestPay.year, latestPay.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Net Pay</p>
                      <p className="mt-0.5 font-['Inter',sans-serif] text-[24px] font-bold tracking-tight text-emerald-600 tabular-nums">{formatINR(Number(latestPay.net_pay ?? 0))}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'Basic', value: formatINR(latestPay.basic_pay) },
                      { label: 'HRA', value: formatINR(latestPay.hra) },
                      { label: 'Allowances', value: formatINR(latestPay.allowances) },
                      { label: 'Deductions', value: `-${formatINR(latestPay.deductions)}` },
                    ].map((r) => (
                      <div key={r.label} className="rounded-xl border border-black/[0.05] bg-[#fafafa] p-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9ca3af]">{r.label}</p>
                        <p className="mt-0.5 text-[12px] font-bold tabular-nums text-[#0A1628]">{r.value}</p>
                      </div>
                    ))}
                  </div>
                  {latestPay.payment_date && (
                    <p className="mt-3 text-[10.5px] font-semibold text-[#9ca3af]">
                      Paid on {new Date(latestPay.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}

                  <button
                    onClick={() => downloadPayslip(latestPay)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-4 py-2 text-[11px] font-bold text-[#C9A84C] transition-all hover:bg-[#C9A84C]/20"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Payslip
                  </button>

                  {payroll.length > 1 && (
                    <div className="mt-4 border-t border-black/[0.05] pt-3">
                      <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">Previous payslips</p>
                      <div className="space-y-1.5">
                        {payroll.slice(1).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-black/[0.05] bg-[#fafafa] px-3 py-2">
                            <p className="text-[11.5px] font-semibold text-[#0A1628]">
                              {new Date(p.year, p.month - 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-[11.5px] font-bold tabular-nums text-[#0A1628]">{formatINR(Number(p.net_pay ?? 0))}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${p.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{p.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          <div className="mt-5 flex justify-end pb-safe" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <button
              onClick={onClose}
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-6 text-[13px] font-bold text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.35)] transition-all hover:brightness-[1.05] active:scale-[0.99] sm:w-auto sm:min-h-[42px] sm:text-[12.5px]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
