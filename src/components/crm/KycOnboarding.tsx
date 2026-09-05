import { useEffect, useRef, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import { compressImage } from '@/lib/compressImage';
import { isPan, isAadhaar } from '@/lib/validators';
import { CrmBtn, CRM_INPUT } from '@/components/crm/CrmUi';
import {
  ShieldCheck, UploadCloud, Check, CheckCircle2, Clock, AlertTriangle,
  ExternalLink, Loader2, Image as ImageIcon, Fingerprint, CreditCard, BadgeCheck, X,
} from 'lucide-react';

type KYC_STATE = { employee: any; kyc: any; documents: any[] } | null;

type Props = {
  kyc: KYC_STATE;
  onChanged: () => void;
  /** When provided the card renders as a full-bleed sheet body (no outer card chrome) with a close button in the header. */
  onClose?: () => void;
};

const DOC_DEFS = [
  { key: 'aadhaar_front', label: 'Aadhaar — Front', hint: 'Side with your photo & 12-digit Aadhaar number' },
  { key: 'aadhaar_back', label: 'Aadhaar — Back', hint: 'Side with your address & QR code' },
  { key: 'pan', label: 'PAN Card', hint: 'Clear photo of your PAN card' },
];

const STATUS_META: Record<string, { label: string; cls: string; dot: string }> = {
  not_started: { label: 'Not started', cls: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  pending: { label: 'Under review', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  changes_requested: { label: 'Action needed', cls: 'bg-red-50 text-red-600', dot: 'bg-red-500' },
  verified: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAadhaar(v: string): string {
  return String(v ?? '').replace(/[^\d]/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export default function KycOnboarding({ kyc, onChanged, onClose }: Props) {
  const modal = Boolean(onClose);
  const employee = kyc?.employee ?? null;
  const kycRow = kyc?.kyc ?? null;
  const status = kycRow?.status ?? 'not_started';
  const docs = kyc?.documents ?? [];
  const docsByType: Record<string, any> = {};
  for (const d of docs) docsByType[d.doc_type] = d;

  const [panNo, setPanNo] = useState('');
  const [aadharNo, setAadharNo] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (employee) {
      setPanNo((prev) => (prev === '' ? (employee.pan_number ?? '') : prev));
      setAadharNo((prev) => (prev === '' ? (employee.aadhar_number ?? '') : prev));
    }
  }, [employee]);

  const editable = status === 'not_started' || status === 'changes_requested';
  const uploadedCount = DOC_DEFS.filter((d) => docsByType[d.key]).length;
  const progress = Math.round((uploadedCount / DOC_DEFS.length) * 100);

  const handlePick = async (key: string, file: File | undefined) => {
    if (!file || !employee) return;
    setUploading(key);
    setNotice(null);
    try {
      const base64 = await compressImage(file, 1400, 0.82);
      await leadSupabase.employees.kycUploadDoc(key as any, base64);
      await onChanged();
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message ?? 'Upload failed — please try again.' });
    } finally {
      setUploading(null);
      if (fileRefs.current[key]) fileRefs.current[key]!.value = '';
    }
  };

  const handleSubmit = async () => {
    const pan = String(panNo ?? '').trim().toUpperCase();
    const aadhar = String(aadharNo ?? '').replace(/[\s-]/g, '');
    if (!pan || !aadhar) {
      setNotice({ kind: 'err', text: 'Enter your PAN and Aadhaar numbers first.' });
      return;
    }
    if (!isPan(pan)) {
      setNotice({ kind: 'err', text: 'PAN format looks wrong — expected 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).' });
      return;
    }
    if (!isAadhaar(aadhar)) {
      setNotice({ kind: 'err', text: 'Aadhaar must be exactly 12 digits.' });
      return;
    }
    if (uploadedCount < DOC_DEFS.length) {
      setNotice({ kind: 'err', text: 'Upload every required document (Aadhaar front, Aadhaar back and PAN) before submitting.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await leadSupabase.employees.kycSubmit(pan, aadhar);
      await onChanged();
      setNotice({ kind: 'ok', text: 'KYC submitted — your admin will review it shortly.' });
    } catch (e: any) {
      setNotice({ kind: 'err', text: e?.message ?? 'Could not submit KYC. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const meta = STATUS_META[status] ?? STATUS_META.not_started;

  // Verified → a slim confirmation strip (the heavy card disappears).
  if (status === 'verified') {
    if (modal) {
      return (
        <div className="px-6 py-10 text-center sm:px-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30">
            <BadgeCheck className="h-8 w-8 text-emerald-500" strokeWidth={1.8} />
          </div>
          <p className="mt-4 text-[17px] font-bold text-[#0A1628]">KYC verified — onboarding complete</p>
          <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-[#6b7280]">
            {kycRow?.reviewed_by ? `Reviewed by ${kycRow.reviewed_by}` : 'Your documents were approved'}
            {kycRow?.reviewed_at ? ` on ${fmtDate(kycRow.reviewed_at)}` : ''}. Your client workspace is fully unlocked.
          </p>
          <button onClick={onClose} className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#F3DFA0] to-[#C9A84C] px-6 text-[12.5px] font-bold text-[#0A1628] shadow-[0_8px_24px_rgba(201,168,76,0.3)]">
            Done
          </button>
        </div>
      );
    }
    return (
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5 sm:px-4 sm:py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <BadgeCheck className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-emerald-800">KYC verified — onboarding complete</p>
            <p className="text-[10.5px] font-medium text-emerald-700/80">
              {kycRow?.reviewed_by ? `Reviewed by ${kycRow.reviewed_by}` : 'Documents approved'}
              {kycRow?.reviewed_at ? ` on ${fmtDate(kycRow.reviewed_at)}` : ''}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${meta.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={modal ? '' : 'mb-4 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:mb-6 sm:rounded-3xl'}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-black/[0.06] bg-gradient-to-r from-[#0A1628] to-[#1E3852] px-4 py-3.5 sm:gap-3 sm:px-5 sm:py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#C9A84C]/[0.18] text-[#D6B85D] ring-1 ring-[#C9A84C]/40">
          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white">KYC Onboarding</p>
          <p className={`text-[10px] font-semibold text-white/50 ${modal ? '' : 'hidden sm:block'}`}>
            {status === 'changes_requested'
              ? 'Some documents need correction — please fix and resubmit.'
              : status === 'pending'
              ? 'Your documents are with the admin for verification.'
              : 'Complete your identity verification — Aadhaar & PAN card'}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide ${meta.cls}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close KYC onboarding"
            className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {status === 'changes_requested' && (
        <div className="flex items-start gap-2 border-b border-red-100 bg-red-50/80 px-4 py-2.5 sm:px-5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={1.8} />
          <p className="text-[11.5px] font-medium leading-relaxed text-red-700">
            <span className="font-bold">Admin feedback: </span>
            {kycRow?.admin_note || 'Please review your documents and upload clear, legible copies.'}
          </p>
        </div>
      )}
      {status === 'pending' && (
        <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50/70 px-4 py-2.5 sm:px-5">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" strokeWidth={1.8} />
          <p className="text-[11.5px] font-medium leading-relaxed text-amber-700">
            Submitted on {fmtDate(kycRow?.submitted_at)}. You will see the admin's decision here — no further action needed right now.
          </p>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {editable && (
          <>
            {/* Identity numbers */}
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
                  <CreditCard className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} /> PAN Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={panNo}
                  onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className={`${CRM_INPUT} font-mono uppercase tracking-[0.2em]`}
                />
                <p className="mt-1 text-[10px] text-[#9ca3af]">10-character PAN — used for TDS compliance.</p>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
                  <Fingerprint className="h-3 w-3 text-[#96782A]" strokeWidth={1.8} /> Aadhaar Number <span className="text-red-500">*</span>
                </label>
                <input
                  value={formatAadhaar(aadharNo)}
                  onChange={(e) => setAadharNo(e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                  inputMode="numeric"
                  maxLength={14}
                  className={`${CRM_INPUT} font-mono tracking-[0.14em]`}
                />
                <p className="mt-1 text-[10px] text-[#9ca3af]">12-digit Aadhaar — needed for PF / ESI enrolment.</p>
              </div>
            </div>

            {/* Document uploads */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9ca3af]">
              Upload documents ({uploadedCount}/{DOC_DEFS.length})
            </p>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {DOC_DEFS.map((d) => {
                const doc = docsByType[d.key];
                const busy = uploading === d.key;
                return (
                  <div key={d.key} className="overflow-hidden rounded-2xl border border-black/[0.08] bg-[#fafafa]">
                    <input
                      ref={(el) => { fileRefs.current[d.key] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handlePick(d.key, e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => fileRefs.current[d.key]?.click()}
                      disabled={busy}
                      className="group flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 bg-[#f4f5f7] text-center transition-colors hover:bg-[#C9A84C]/[0.08] disabled:cursor-not-allowed"
                    >
                      {busy ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[#96782A]" strokeWidth={1.6} />
                      ) : doc ? (
                        <img src={doc.file_url} alt={d.label} className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#9ca3af] shadow-sm ring-1 ring-black/[0.06] transition-colors group-hover:text-[#96782A]">
                            <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
                          </div>
                          <span className="flex items-center gap-1 text-[10.5px] font-bold text-[#6b7280] group-hover:text-[#0A1628]">
                            <UploadCloud className="h-3 w-3" strokeWidth={1.8} /> Upload
                          </span>
                        </>
                      )}
                    </button>
                    <div className="border-t border-black/[0.05] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 text-[11.5px] font-bold text-[#0A1628]">{d.label}</p>
                        {doc ? (
                          <span className="shrink-0 text-emerald-600"><CheckCircle2 className="h-4 w-4" strokeWidth={2} /></span>
                        ) : (
                          <span className="shrink-0 text-[#C9A84C]/60">•</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[9.5px] leading-snug text-[#9ca3af]">{d.hint}</p>
                      {doc && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#96782A] hover:underline"
                        >
                          View upload <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!editable && (
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {DOC_DEFS.map((d) => {
              const doc = docsByType[d.key];
              return (
                <div key={d.key} className="overflow-hidden rounded-2xl border border-black/[0.08] bg-[#fafafa]">
                  <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#f4f5f7]">
                    {doc ? (
                      <img src={doc.file_url} alt={d.label} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-[#cbd5e1]" strokeWidth={1.4} />
                    )}
                  </div>
                  <div className="border-t border-black/[0.05] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 text-[11.5px] font-bold text-[#0A1628]">{d.label}</p>
                      {doc ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" strokeWidth={2.5} />
                      ) : (
                        <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase text-red-500">Missing</span>
                      )}
                    </div>
                    {doc && (
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#96782A] hover:underline">
                        View upload <ExternalLink className="h-2.5 w-2.5" strokeWidth={2} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Progress */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#9ca3af]">
            <span>Documents uploaded</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D6B85D] to-[#C9A84C] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {notice && (
          <div className={`mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11.5px] font-medium leading-relaxed ${notice.kind === 'ok' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-600'}`}>
            {notice.kind === 'ok' ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />}
            <span>{notice.text}</span>
          </div>
        )}

        {editable && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CrmBtn variant="gold" onClick={handleSubmit} disabled={saving || uploading !== null} className="min-h-[44px] w-full sm:w-auto sm:min-h-[40px]">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              {saving ? 'Submitting…' : status === 'changes_requested' ? 'Resubmit for Review' : 'Submit KYC for Review'}
            </CrmBtn>
            <p className="text-[10.5px] text-[#9ca3af]">
              Your admin verifies the documents — usually within a day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
