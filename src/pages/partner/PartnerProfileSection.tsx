import { useRef, useState } from 'react';
import {
  CheckCircle, CircleNotch, CloudArrowUp, EnvelopeSimple,
  Phone, ShieldCheck, User, X, Warning,
} from '@phosphor-icons/react';
import { callDataProxy, supabaseUploadImage } from '@/lib/supabaseData';
import type { PDashData } from '@/services/partnerDashboard';

/**
 * Partner Profile — the partner's own record, edited safely:
 * - Everything except email/mobile is editable; those two are shown as
 *   read-only contact cards with an honest "separate process" note.
 * - Photo workflow: saved photo → Google avatar → initials fallback. Uploads
 *   go through the proxy's partner-photos bucket (server-confirmed owner).
 * - Verification centre reflects the backend's verification_status with a
 *   real action where the backend supports it (CRM-driven workflow) and an
 *   honest Help & Support path where it does not yet.
 */

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // mirrors MAX_IMAGE_BYTES on the proxy

const VERIFICATION_COPY: Record<string, { title: string; body: string; cta: string | null }> = {
  UNVERIFIED: {
    title: 'Verification Required',
    body: 'VJR Estate verifies partner identity and RERA details (where applicable) through the partnership team during onboarding. Your dashboards work today; verification unlocks full trust badges on your listings.',
    cta: null,
  },
  'VERIFICATION REQUIRED': {
    title: 'Verification Required',
    body: 'VJR Estate verifies partner identity and RERA details (where applicable) through the partnership team during onboarding. Your dashboards work today; verification unlocks full trust badges on your listings.',
    cta: null,
  },
  'PARTIALLY VERIFIED': {
    title: 'Verification In Progress',
    body: 'Some of your verification items are already approved. The partnership team is reviewing the rest — you will see each item update as they complete the review.',
    cta: null,
  },
  'UNDER REVIEW': {
    title: 'Under Review',
    body: 'Your verification has been submitted and is being reviewed by the VJR Estate partnership team. No further action is needed from you right now.',
    cta: null,
  },
  VERIFIED: {
    title: 'Verified',
    body: 'Your partner profile has been verified by VJR Estate. This status was confirmed by the partnership team — it is not something that can be self-granted.',
    cta: null,
  },
  REJECTED: {
    title: 'Action Required',
    body: 'The partnership team could not complete verification with the current details. Open Help & Support and send us a message describing your circumstances — we will tell you exactly what to provide.',
    cta: 'Message Help & Support',
  },
};

const GAP = 'rounded-xl border border-[#E4E7EC] bg-white';
const tiny = 'text-[10px] font-bold uppercase tracking-[0.16em] text-[#98A2B3]';

function initialsAvatar(name: string): string {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return initials || 'P';
}

function statusTone(status: string): { chip: string; label: string } {
  const s = String(status ?? 'UNVERIFIED').toUpperCase();
  if (s === 'VERIFIED') return { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Verified' };
  if (s === 'REJECTED') return { chip: 'bg-red-50 text-red-700 ring-red-200', label: 'Action required' };
  if (s === 'PARTIALLY VERIFIED' || s === 'UNDER REVIEW') return { chip: 'bg-sky-50 text-sky-700 ring-sky-200', label: s === 'PARTIALLY VERIFIED' ? 'In progress' : 'Under review' };
  if (s.includes('REQUIRED') || s === 'UNVERIFIED') return { chip: 'bg-amber-50 text-amber-700 ring-amber-200', label: 'Verification required' };
  return { chip: 'bg-sky-50 text-sky-700 ring-sky-200', label: s };
}

export default function PartnerProfileSection({
  data,
  isOwner,
  onRefresh,
}: {
  data: PDashData;
  isOwner: boolean;
  onRefresh?: () => void;
}) {
  const prm = data.partner;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedOk, setSavedOk] = useState(false);

  // Edit-mode form state (restored from the saved record on cancel).
  const [nameDraft, setNameDraft] = useState(prm.full_name ?? '');
  const [companyDraft, setCompanyDraft] = useState(prm.company_name ?? '');
  const [experienceDraft, setExperienceDraft] = useState(prm.experience_years ? String(prm.experience_years) : '');
  const [areasDraft, setAreasDraft] = useState((prm.areas ?? []).join(', '));

  // Photo states.
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const googlePhoto = prm.photo_url || null; // saved upload wins over fallback
  const avatarSrc = photoPreview ?? googlePhoto;
  const initials = initialsAvatar(prm.full_name);

  const startEdit = () => {
    setNameDraft(prm.full_name ?? '');
    setCompanyDraft(prm.company_name ?? '');
    setExperienceDraft(prm.experience_years ? String(prm.experience_years) : '');
    setAreasDraft((prm.areas ?? []).join(', '));
    setSaveError('');
    setSavedOk(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
    setPhotoPreview(null);
    setPendingPhotoFile(null);
    setPhotoError('');
  };

  const validate = (): string | null => {
    if (!nameDraft.trim()) return 'Full name is required.';
    const exp = Number(experienceDraft);
    if (experienceDraft && (!Number.isFinite(exp) || exp < 0 || exp > 60)) return 'Experience must be a number between 0 and 60.';
    return null;
  };

  const pickPhoto = (file: File | null) => {
    setPhotoError('');
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setPhotoError('Choose a JPG, PNG or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError('Image must be under 3 MB.');
      return;
    }
    setPendingPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const uploadPhotoNow = async (): Promise<string | null> => {
    if (!pendingPhotoFile) return null;
    const partnerId = prm.id;
    if (!partnerId) return null;
    setPhotoUploading(true);
    try {
      const url = await supabaseUploadImage('partner-photos', partnerId, pendingPhotoFile);
      return url;
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'Photo upload failed. Try a smaller image.');
      return null;
    } finally {
      setPhotoUploading(false);
    }
  };

  const saveAll = async () => {
    const err = validate();
    if (err) { setSaveError(err); return; }
    setSaving(true);
    setSaveError('');
    try {
      const photoUrl = await uploadPhotoNow();
      if (pendingPhotoFile && !photoUrl) {
        // Upload failed — abort so the profile isn't saved with a stale photo.
        setSaving(false);
        return;
      }
      await callDataProxy('partner.profile.update', {
        fullName: nameDraft.trim(),
        companyName: companyDraft.trim(),
        experienceYears: experienceDraft ? Number(experienceDraft) : 0,
        areas: areasDraft.split(',').map((a) => a.trim()).filter(Boolean),
        ...(photoUrl ? { photo: photoUrl } : {}),
      });
      setSavedOk(true);
      setEditing(false);
      setPhotoPreview(null);
      setPendingPhotoFile(null);
      onRefresh?.();
      window.setTimeout(() => setSavedOk(false), 4000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const v = VERIFICATION_COPY[String(prm.verification_status ?? 'UNVERIFIED').toUpperCase()] ?? VERIFICATION_COPY.UNVERIFIED;
  const tone = statusTone(String(prm.verification_status ?? 'UNVERIFIED'));

  return (
    <div className="space-y-5">
      {/* Header card — photo, name, type, ID, edit action */}
      <div className={`${GAP} p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Your profile" className="h-16 w-16 rounded-2xl object-cover ring-2 ring-[#C9A84C]/40" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0A1628] text-lg font-bold text-[#C9A84C]">
                {initials}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {!editing && <p className="truncate text-[17px] font-bold text-[#101828]">{prm.full_name}</p>}
            {editing && (
              <label htmlFor="pp-name" className="block">
                <span className={tiny}>Full name</span>
                <input
                  id="pp-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={100}
                  className="mt-1 w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-[14px] font-semibold text-[#101828] outline-none focus:border-[#C9A84C]"
                  autoComplete="name"
                />
              </label>
            )}
            <p className="mt-0.5 text-[12px] text-[#667085]">
              {prm.partner_type} partner · <span className="font-mono">{prm.partner_code ?? prm.id.slice(0, 8)}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!editing ? (
              <button type="button" onClick={startEdit} className="admin-btn-secondary min-h-[44px] !px-4 gap-2">
                <User size={14} weight="bold" aria-hidden="true" />
                Edit Profile
              </button>
            ) : (
              <>
                <button type="button" onClick={cancelEdit} disabled={saving} className="admin-btn-secondary min-h-[44px] !px-4 disabled:opacity-60">
                  Cancel
                </button>
                <button type="button" onClick={saveAll} disabled={saving || photoUploading} className="admin-btn-primary min-h-[44px] !px-4 gap-2 disabled:opacity-60">
                  {saving || photoUploading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      {photoUploading ? 'Uploading photo…' : 'Saving…'}
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {editModePhotoRow(editing, avatarSrc, initials, pickPhoto, () => { setPendingPhotoFile(null); setPhotoPreview(null); setPhotoError(''); }, photoUploading, photoError, fileInputRef)}
        {savedOk && (
          <p role="status" className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-emerald-700">
            <CheckCircle size={14} weight="fill" aria-hidden="true" />
            Profile saved.
          </p>
        )}
        {saveError && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700">{saveError}</p>
        )}
      </div>

      {/* Contact — read-only by design */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className={`${GAP} p-5`}>
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#475467]"><EnvelopeSimple size={16} aria-hidden="true" /></span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">Verified via Google</span>
          </div>
          <p className={`mt-3 ${tiny}`}>Email Address</p>
          <p className="mt-0.5 break-all text-[13.5px] font-semibold text-[#101828]">{prm.email}</p>
          <p className="mt-2 text-[11px] leading-snug text-[#98A2B3]">
            Your registered email comes from Google sign-in and is read-only here. Changing it requires registering with the other Google account — contact support to link records.
          </p>
        </div>
        <div className={`${GAP} p-5`}>
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#475467]"><Phone size={16} aria-hidden="true" /></span>
            <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#667085] ring-1 ring-[#E4E7EC]">Provided at registration</span>
          </div>
          <p className={`mt-3 ${tiny}`}>Mobile Number</p>
          <p className="mt-0.5 text-[13.5px] font-semibold text-[#101828]">{prm.mobile || '—'}</p>
          <p className="mt-2 text-[11px] leading-snug text-[#98A2B3]">
            Your registered mobile is read-only here — changes go through a separate verified process so buyers always reach a number you control.
          </p>
        </div>
      </div>

      {/* Professional details — inline grid; inputs swap in when editing */}
      <div className={`${GAP} p-5 sm:p-6`}>
        <p className={`text-[13px] font-semibold text-[#101828]`}>Professional &amp; Business Details</p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label htmlFor="pp-company" className="block">
            <span className={tiny}>Company / Firm{isOwner ? ' · optional for owners' : ''}</span>
            {editing ? (
              <input id="pp-company" value={companyDraft} onChange={(e) => setCompanyDraft(e.target.value)} maxLength={120}
                className="mt-1 w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#C9A84C]" />
            ) : (
              <p className="mt-1 text-[13px] font-semibold text-[#101828]">{prm.company_name || (isOwner ? 'Individual owner — none on file' : '—')}</p>
            )}
          </label>
          <label htmlFor="pp-exp" className="block">
            <span className={tiny}>Experience (years)</span>
            {editing ? (
              <input id="pp-exp" value={experienceDraft} onChange={(e) => setExperienceDraft(e.target.value.replace(/\D/g, ''))} inputMode="numeric" maxLength={2}
                className="mt-1 w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-[13px] tabular-nums text-[#101828] outline-none focus:border-[#C9A84C]" />
            ) : (
              <p className="mt-1 text-[13px] font-semibold text-[#101828]">{prm.experience_years ? `${prm.experience_years} years` : '—'}</p>
            )}
          </label>
          <label htmlFor="pp-areas" className="block sm:col-span-2">
            <span className={tiny}>Operating Areas<span className="normal-case font-medium"> (comma-separated)</span></span>
            {editing ? (
              <input id="pp-areas" value={areasDraft} onChange={(e) => setAreasDraft(e.target.value)} maxLength={300}
                className="mt-1 w-full rounded-lg border border-[#E4E7EC] px-3 py-2 text-[13px] text-[#101828] outline-none focus:border-[#C9A84C]" />
            ) : (
              <p className="mt-1 text-[13px] font-semibold text-[#101828]">{(prm.areas ?? []).join(', ') || '—'}</p>
            )}
          </label>
        </div>
      </div>

      {/* Verification centre */}
      <div className={`${GAP} p-5 sm:p-6`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0A1628]">
              <ShieldCheck size={16} weight="duotone" className="text-[#C9A84C]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[#101828]">Verification Centre</p>
              <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${tone.chip}`}>
                {tone.label}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-[#667085]">{v.body}</p>
        {v.cta && (
          <a
            href="/partner-dashboard?view=support"
            className="admin-btn-primary no-underline mt-3 inline-flex min-h-[44px] items-center gap-2 !px-4"
            onClick={(() => { /* navigates via the dashboard shell */ }) as unknown as React.MouseEventHandler<HTMLAnchorElement>}
          >
            <Warning size={14} weight="bold" aria-hidden="true" />
            {v.cta}
          </a>
        )}
        <p className="mt-3 text-[10.5px] text-[#98A2B3]">
          Verification is performed by the VJR Estate partnership team and recorded on your partner record — signing in or editing this profile never changes it.
        </p>
      </div>

      {/* Account info — system-controlled, view-only */}
      <div className={`${GAP} p-5 sm:p-6`}>
        <p className="text-[13px] font-semibold text-[#101828]">Account Information</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
          <div><p className={tiny}>Partner ID</p><p className="mt-0.5 font-mono font-semibold text-[#101828]">{prm.partner_code ?? '—'}</p></div>
          <div><p className={tiny}>Account status</p><p className="mt-0.5 font-semibold capitalize text-[#101828]">{prm.status}</p></div>
          <div><p className={tiny}>Partner since</p><p className="mt-0.5 font-semibold text-[#101828]">{new Date(prm.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
          <div><p className={tiny}>Last updated</p><p className="mt-0.5 font-semibold text-[#101828]">{new Date(prm.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
        </div>
      </div>
    </div>
  );
}

/* Photo row rendered only in edit mode (keeps view mode clean). */
function editModePhotoRow(
  editing: boolean,
  currentSrc: string | null,
  initials: string,
  onPick: (f: File | null) => void,
  onRemove: () => void,
  uploading: boolean,
  error: string,
  ref: React.RefObject<HTMLInputElement>,
) {
  if (!editing) return null;
  return (
    <div className="mt-4 rounded-lg border border-[#E4E7EC] bg-[#F8F9FB] p-4">
      <div className="flex items-center gap-4">
        {currentSrc ? (
          <img src={currentSrc} alt="Photo preview" className="h-12 w-12 rounded-xl object-cover" />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A1628] text-[14px] font-bold text-[#C9A84C]">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[#101828]">Profile photo</p>
          <p className="text-[10.5px] text-[#98A2B3]">JPG, PNG or WebP · up to 3 MB</p>
        </div>
        <label className="admin-btn-secondary inline-flex min-h-[40px] cursor-pointer items-center gap-2 !px-3 !text-[12px]">
          {uploading ? <CircleNotch size={14} className="animate-spin" aria-hidden="true" /> : <CloudArrowUp size={14} aria-hidden="true" />}
          Change
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
        </label>
        {currentSrc && !uploading && (
          <button type="button" onClick={onRemove} className="rounded-lg p-2 text-[#667085] hover:bg-white hover:text-red-600" aria-label="Remove selected photo">
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-[11.5px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
