import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CRM_INPUT } from '@/components/crm/CrmUi';
import { ArrowLeft, Save, UserRound, RefreshCw, Sparkles, UploadCloud, X, ScanFace, ShieldCheck, Briefcase, Wallet, CreditCard, HeartHandshake } from 'lucide-react';
import { DEPARTMENTS, designationsFor } from '@/data/employeeHierarchy';
import { generateEmployeeId } from '@/lib/employeeIdGen';
import { compressImage } from '@/lib/compressImage';
import { isEmail, isIndianMobile, isPan, isAadhaar, isIfsc, isUan } from '@/lib/validators';
import { formatINR, indianScale } from '@/lib/inr';

const STATUSES = ['Active', 'On Leave', 'Terminated', 'Inactive'];

const GENDERS = ['', 'Male', 'Female', 'Other'];

const FIELD_LABEL = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]';

// Module-scope helpers — never define a component inside a render function, or
// React remounts the subtree on every keystroke and inputs lose focus.
function Section({ step, title, icon: Icon, children }: { step?: number; title: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#D6B85D] to-[#C9A84C]" />
        {step && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0A1628] font-['Inter',sans-serif] text-[10px] font-extrabold text-[#D6B85D]">
            {step}
          </span>
        )}
        {Icon && <Icon className="h-4 w-4 text-[#96782A]" strokeWidth={1.8} />}
        <h2 className="font-['Inter',sans-serif] text-[16px] font-semibold text-[#0A1628]">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={FIELD_LABEL}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[10px] leading-relaxed text-[#9ca3af]">{children}</p>;
}

/** Format checks that catch typos before saving — mirrors the fields marked *.
 *  Required = fields the record needs to be useful: ID, name, work email (Google
 *  login), phone (Indian mobile), department & designation. Everything else is
 *  optional at add-time and can be completed later (e.g. KYC documents). */
function validateForm(form: any, isEdit: boolean): string[] {
  const errs: string[] = [];
  if (!String(form.employeeId ?? '').trim()) errs.push('Employee ID is required (auto-generated — use the Regenerate button if it is empty).');
  if (!String(form.name ?? '').trim()) errs.push('Full name is required.');
  if (!form.email || !isEmail(form.email)) errs.push('Work email is required and looks incomplete — use the format name@company.com.');
  if (!String(form.phone ?? '').trim()) errs.push('Phone is required — enter the employee\'s 10-digit mobile number.');
  else if (!isIndianMobile(form.phone)) errs.push('Phone must be a valid Indian mobile number — 10 digits starting 6–9, optionally with +91 or 0 (e.g. 9880773859).');
  if (form.alternatePhone && !isIndianMobile(form.alternatePhone)) errs.push('Alternate phone must be a valid Indian mobile number (10 digits, +91 / 0 optional).');
  if (form.emergencyContactPhone && !isIndianMobile(form.emergencyContactPhone)) errs.push('Emergency contact phone must be a valid Indian mobile number (10 digits, +91 / 0 optional).');
  if (form.panNumber && !isPan(form.panNumber)) errs.push('PAN number looks wrong — expected 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).');
  if (form.aadharNumber && !isAadhaar(form.aadharNumber)) errs.push('Aadhaar number must be exactly 12 digits.');
  if (form.ifscCode && !isIfsc(form.ifscCode)) errs.push('IFSC code looks wrong — e.g. HDFC0001234 (4 letters, then 0, then 6 characters).');
  if (form.uanNumber && !isUan(form.uanNumber)) errs.push('UAN (PF) number must be 12 digits.');
  if (form.accessEnabled && !isEmail(form.email)) errs.push('Enable login only after a valid work email is set — the employee signs in with it.');
  if (!isEdit && !String(form.department ?? '').trim()) errs.push('Department is required.');
  if (!isEdit && !String(form.designation ?? '').trim()) errs.push('Designation is required.');
  return errs;
}

export default function CrmEmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genIdLoading, setGenIdLoading] = useState(false);
  const [genIdAi, setGenIdAi] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', phone: '', alternatePhone: '', designation: '', department: '',
    dateOfBirth: '', gender: '', fatherOrSpouseName: '',
    joiningDate: '', status: 'Active', salary: 0, address: '',
    emergencyContactName: '', emergencyContactPhone: '',
    bankAccountNumber: '', bankName: '', ifscCode: '',
    panNumber: '', aadharNumber: '', uanNumber: '', esiNumber: '',
    profilePhotoUrl: '', notes: '',
    accessEnabled: false, commissionRate: '',
    workStartTime: '09:30', autoLogoutTime: '21:00',
    faceVerifyRequired: false, faceVerifyFrequency: 'daily',
    payrollVisible: true,
    bookingsVisible: true, kycRequired: true,
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoPick = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file, 800, 0.7);
      if (isEdit && id) {
        const res = await leadSupabase.employees.uploadPhoto(id, base64);
        setForm((f) => ({ ...f, profilePhotoUrl: res.data.profilePhotoUrl }));
      } else {
        // New employee: keep the preview locally; it uploads together with creation.
        setForm((f) => ({ ...f, profilePhotoUrl: base64 }));
      }
    } catch (err: any) {
      alert('Photo upload failed: ' + (err.message ?? 'Please try again'));
      console.error(err);
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const runGenerateId = async (department: string, designation: string) => {
    if (!department || !designation) return;
    setGenIdLoading(true);
    try {
      const gen = await generateEmployeeId(department, designation);
      setForm((f) => ({ ...f, employeeId: gen.employeeId }));
      setGenIdAi(gen.usedAi);
    } catch { /* keep current ID */ }
    finally { setGenIdLoading(false); }
  };

  // New employees: prefill a department/designation then generate the ID.
  useEffect(() => {
    if (!isEdit) {
      setForm((f) => ({
        ...f,
        department: f.department || 'Sales',
        designation: f.designation || 'Telecaller Agent',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isEdit && form.department && form.designation) {
      runGenerateId(form.department, form.designation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, form.department, form.designation]);

  useEffect(() => {
    if (!isEdit) return;
    leadSupabase.employees.get(id!).then((res) => {
      const e = res.data;
      setForm({
        employeeId: e.employee_id ?? '', name: e.name ?? '', email: e.email ?? '', phone: e.phone ?? '',
        alternatePhone: e.alternate_phone ?? '', designation: e.designation ?? '', department: e.department ?? '',
        dateOfBirth: e.date_of_birth ?? '', gender: e.gender ?? '', fatherOrSpouseName: e.father_or_spouse_name ?? '',
        joiningDate: e.joining_date ?? '', status: e.status ?? 'Active', salary: e.salary ?? 0,
        address: e.address ?? '',
        emergencyContactName: e.emergency_contact_name ?? '', emergencyContactPhone: e.emergency_contact_phone ?? '',
        bankAccountNumber: e.bank_account_number ?? '', bankName: e.bank_name ?? '', ifscCode: e.ifsc_code ?? '',
        panNumber: e.pan_number ?? '', aadharNumber: e.aadhar_number ?? '', uanNumber: e.uan_number ?? '',
        esiNumber: e.esi_number ?? '', profilePhotoUrl: e.profile_photo_url ?? '', notes: e.notes ?? '',
        accessEnabled: e.access_enabled ?? false,
        commissionRate: e.commission_rate != null ? String(e.commission_rate) : '',
        workStartTime: e.work_start_time ? String(e.work_start_time).slice(0, 5) : '09:30',
        autoLogoutTime: e.auto_logout_time ? String(e.auto_logout_time).slice(0, 5) : '21:00',
        faceVerifyRequired: e.face_verify_required ?? false,
        faceVerifyFrequency: e.face_verify_frequency ?? 'daily',
        payrollVisible: e.payroll_visible ?? true,
        bookingsVisible: e.bookings_visible ?? true,
        kycRequired: e.kyc_required ?? true,
      });
    }).catch(() => navigate('/crm/employees'));
  }, [id, isEdit, navigate]);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Current stored designation is kept as an option so editing old records never blanks out.
  const designations = [...new Set([...(form.designation ? [form.designation] : []), ...designationsFor(form.department)])];

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const problems = validateForm(form, isEdit);
    if (problems.length > 0) {
      alert('Please check the highlighted details:\n\n• ' + problems.join('\n• '));
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await leadSupabase.employees.update(id!, { ...form, addHistory: true, historyType: 'updated', historyTitle: 'Profile Updated', historyDesc: 'Employee profile was updated' });
      } else {
        const pendingPhoto = form.profilePhotoUrl.startsWith('data:') ? form.profilePhotoUrl : undefined;
        const res = await leadSupabase.employees.create({ ...form, profilePhotoUrl: undefined });
        // A freshly-picked photo uploads to storage right after creation.
        if (pendingPhoto && res.data?.id) {
          await leadSupabase.employees.uploadPhoto(res.data.id, pendingPhoto);
        }
      }
      navigate('/crm/employees');
    } catch (err: any) {
      const msg = err?.message ?? 'unknown error';
      alert(`Could not save employee — please check the form and try again. (${msg})`);
      console.error('Failed to save employee:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <button
            onClick={() => navigate('/crm/employees')}
            className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#96782A] transition-colors hover:text-[#0A1628]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Employees
          </button>
          <CrmPageHeader
            eyebrow={isEdit ? 'Edit' : 'New'}
            title={isEdit ? 'Edit Employee' : 'Add Employee'}
            description={isEdit
              ? 'Update employee information — all statutory details stay in one structured record'
              : 'Register a new employee step by step. The Employee ID is the user ID used across the CRM'}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2 rounded-2xl border border-[#C9A84C]/35 bg-[#C9A84C]/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:gap-3 sm:px-5">
              <p className="text-[11px] leading-relaxed text-[#0A1628]">
                <span className="font-bold text-red-500">*</span> marks fields required to save a record. Formats (phone, email, PAN, Aadhaar, IFSC, UAN) are checked before saving, and salary displays in the Indian number system — <span className="font-semibold">₹1,00,000 = 1 lakh</span>, <span className="font-semibold">₹1,00,00,000 = 1 crore</span>.
              </p>
            </div>
            {/* ─── 1 · Identity & personal details ───────────────────────── */}
            <Section step={1} title="Identity & Personal Details" icon={UserRound}>
              <Field label="Full Name" required>
                <input value={form.name} onChange={set('name')} className={CRM_INPUT} required placeholder="As printed on Aadhaar / PAN" />
              </Field>
              <Field label="ID Card ID / Employee ID" required>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={form.employeeId}
                      onChange={set('employeeId')}
                      className={`${CRM_INPUT} ${genIdAi ? 'pr-9' : ''}`}
                      required
                      placeholder="VJR-SL-TC-001"
                    />
                    {genIdAi && (
                      <Sparkles className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#96782A]" strokeWidth={1.8} />
                    )}
                  </div>
                  <CrmBtn
                    variant="ghost"
                    type="button"
                    disabled={genIdLoading || !isEdit && (!form.department || !form.designation)}
                    onClick={() => runGenerateId(form.department, form.designation)}
                    title="Regenerate ID from role (Gemini AI)"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${genIdLoading ? 'animate-spin' : ''}`} />
                    {genIdLoading ? '…' : 'Regenerate'}
                  </CrmBtn>
                </div>
                <Hint>
                  {genIdAi ? 'Generated by Gemini AI from role' : 'Auto-generated from department & designation'}
                  {' · editable'}
                </Hint>
              </Field>
              <Field label="Photo">
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-[#f4f5f7]">
                    {form.profilePhotoUrl ? (
                      <img src={form.profilePhotoUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#9ca3af]"><UserRound className="h-5 w-5" /></div>
                    )}
                    {form.profilePhotoUrl && !form.profilePhotoUrl.startsWith('data:') && (
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, profilePhotoUrl: '' }))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoPick} />
                    <CrmBtn variant="ghost" type="button" disabled={photoUploading} onClick={() => fileInputRef.current?.click()}>
                      <UploadCloud className={`h-3.5 w-3.5 ${photoUploading ? 'animate-pulse' : ''}`} />
                      {photoUploading ? 'Uploading…' : form.profilePhotoUrl ? 'Replace photo' : 'Upload photo'}
                    </CrmBtn>
                    <Hint>JPG / PNG / WebP — auto-resized and stored in Supabase storage</Hint>
                  </div>
                </div>
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={CRM_INPUT} max={new Date().toISOString().split('T')[0]} />
                <Hint>Needed for PF / ESI registration & insurance</Hint>
              </Field>
              <Field label="Gender">
                <select value={form.gender} onChange={set('gender')} className={CRM_INPUT}>
                  {GENDERS.map((g) => <option key={g || 'x'} value={g}>{g || 'Select…'}</option>)}
                </select>
              </Field>
              <Field label="Father / Husband / Spouse Name">
                <input value={form.fatherOrSpouseName} onChange={set('fatherOrSpouseName')} className={CRM_INPUT} placeholder="Guardian's full name" />
                <Hint>Used on PF nomination & government forms</Hint>
              </Field>
              <Field label="Email (used for login)" required>
                <input type="email" value={form.email} onChange={set('email')} className={CRM_INPUT} placeholder="employee@vjrestate.com" autoComplete="email" />
                <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                  <input
                    type="checkbox"
                    checked={form.accessEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, accessEnabled: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer accent-[#96782A]"
                  />
                  <span className="text-xs font-semibold text-[#0A1628]">Login access active — employee can sign in with Google</span>
                </label>
                <Hint>Only ticked employees can open the portal link with this email.</Hint>
                <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                  <input
                    type="checkbox"
                    checked={form.faceVerifyRequired}
                    onChange={(e) => setForm((f) => ({ ...f, faceVerifyRequired: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer accent-[#96782A]"
                  />
                  <span className="text-xs font-semibold text-[#0A1628]">Require face verification</span>
                </label>
                {form.faceVerifyRequired ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/[0.08] px-3 py-2.5">
                    <ScanFace className="h-3.5 w-3.5 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                    <span className="text-[10.5px] font-semibold text-[#0A1628]">Prompt the employee to verify:</span>
                    <select
                      value={form.faceVerifyFrequency}
                      onChange={(e) => setForm((f) => ({ ...f, faceVerifyFrequency: e.target.value }))}
                      className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[11px] font-bold text-[#0A1628] outline-none focus:border-[#C9A84C]/70"
                    >
                      <option value="daily">Every day at login</option>
                      <option value="weekly">Once a week</option>
                    </select>
                  </div>
                ) : (
                  <Hint>Off — the employee can still verify manually anytime from their dashboard.</Hint>
                )}
              </Field>
              <Field label="Phone" required>
                <input type="tel" value={form.phone} onChange={set('phone')} className={CRM_INPUT} placeholder="e.g. 9880773859" inputMode="tel" autoComplete="tel" />
                <Hint>10-digit Indian mobile — +91 / 0 prefixes are accepted.</Hint>
              </Field>
              <Field label="Alternate Phone">
                <input type="tel" value={form.alternatePhone} onChange={set('alternatePhone')} className={CRM_INPUT} placeholder="Optional second mobile" inputMode="tel" />
                <Hint>Same format — 10 digits, +91 / 0 optional.</Hint>
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={set('address')} className={CRM_INPUT} placeholder="Current residential address" />
              </Field>
            </Section>

            {/* ─── 2 · Employment & role ────────────────────────────────── */}
            <Section step={2} title="Employment & Role" icon={Briefcase}>
              <Field label="Department" required>
                <select value={form.department} onChange={set('department')} className={CRM_INPUT} required>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Designation (sub-category)" required>
                <select value={form.designation} onChange={set('designation')} className={CRM_INPUT} required>
                  <option value="">Select</option>
                  {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <Hint>Roles under {form.department || 'a department'} — e.g. Telecaller Agent</Hint>
              </Field>
              <Field label="Joining Date">
                <input type="date" value={form.joiningDate} onChange={set('joiningDate')} className={CRM_INPUT} />
              </Field>
              <Field label="Status">
                <select value={form.status} onChange={set('status')} className={CRM_INPUT}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Work Start Time">
                <input type="time" value={form.workStartTime} onChange={set('workStartTime')} className={CRM_INPUT} />
              </Field>
              <Field label="Auto Logout Time">
                <input type="time" value={form.autoLogoutTime} onChange={set('autoLogoutTime')} className={CRM_INPUT} />
                <Hint>Dashboard auto-logs out daily at this time.</Hint>
              </Field>
              {/* Role permissions — workspace access the CRM enforces */}
              <div className="rounded-xl border border-black/10 bg-white px-3.5 py-3 sm:col-span-2 lg:col-span-3">
                <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#96782A]">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} /> Workspace Access
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                    <input
                      type="checkbox"
                      checked={form.kycRequired}
                      onChange={(e) => setForm((f) => ({ ...f, kycRequired: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#96782A]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[#0A1628]">Require KYC before My Clients</span>
                      <span className="block text-[10px] leading-snug text-[#9ca3af]">On: the employee must complete & verify Aadhaar/PAN KYC before their client pipeline unlocks. Off: proceed without KYC.</span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                    <input
                      type="checkbox"
                      checked={form.bookingsVisible}
                      onChange={(e) => setForm((f) => ({ ...f, bookingsVisible: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-[#96782A]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[#0A1628]">Show site-visit Bookings in portal</span>
                      <span className="block text-[10px] leading-snug text-[#9ca3af]">Telecallers & sales agents can call & follow up website bookings from their portal.</span>
                    </span>
                  </label>
                </div>
              </div>
              <Field label="Notes">
                <input value={form.notes} onChange={set('notes')} className={CRM_INPUT} placeholder="Internal notes — shown on the profile" />
              </Field>
            </Section>

            {/* ─── 3 · Compensation & payroll visibility ────────────────── */}
            <Section step={3} title="Compensation & Payroll" icon={Wallet}>
              {form.designation === 'Channel Partner' ? (
                <Field label="Commission Rate (% of deal)">
                  <input type="number" value={form.commissionRate} onChange={set('commissionRate')} className={CRM_INPUT} min="0" step="0.1" placeholder="e.g. 1.5" />
                  <Hint>Channel partners earn commission on closed deals — no monthly salary.</Hint>
                </Field>
              ) : (
                <Field label="Monthly Salary (₹)">
                  <input type="number" value={form.salary} onChange={set('salary')} className={CRM_INPUT} min="0" step="500" placeholder="e.g. 25000" inputMode="numeric" />
                  {Number(form.salary) > 0 ? (
                    <Hint>≈ <span className="font-bold text-[#0A1628]">{formatINR(form.salary)}</span> per month ({indianScale(Number(form.salary) * 12)} per year) — Indian lakh/crore grouping.</Hint>
                  ) : (
                    <Hint>Monthly CTC in ₹ — Indian formatting is applied everywhere (e.g. 25000 → ₹25,000; 150000 → ₹1,50,000).</Hint>
                  )}
                </Field>
              )}
              <Field label="Payroll Visibility">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                  <input
                    type="checkbox"
                    checked={form.payrollVisible}
                    onChange={(e) => setForm((f) => ({ ...f, payrollVisible: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer accent-[#96782A]"
                  />
                  <span className="text-xs font-semibold text-[#0A1628]">Employee can see salary & payslips</span>
                </label>
                <Hint>When off, the employee's dashboard hides salary, bank details, and payslip data.</Hint>
              </Field>
            </Section>

            {/* ─── 4 · Emergency contact ────────────────────────────────── */}
            <Section step={4} title="Emergency Contact" icon={HeartHandshake}>
              <Field label="Contact Name">
                <input value={form.emergencyContactName} onChange={set('emergencyContactName')} className={CRM_INPUT} placeholder="Family member or friend" />
              </Field>
              <Field label="Contact Phone">
                <input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} className={CRM_INPUT} placeholder="10-digit mobile" inputMode="tel" />
              </Field>
              <Field label="Relationship">
                <select
                  value={''}
                  disabled
                  className={`${CRM_INPUT} opacity-60`}
                  title="Added when the employee updates their KYC from the portal"
                >
                  <option value="">Recorded at onboarding…</option>
                </select>
                <Hint>Full relationship detail is captured in the employee's KYC onboarding.</Hint>
              </Field>
            </Section>

            {/* ─── 5 · Bank, statutory & KYC numbers ────────────────────── */}
            <Section step={5} title="Bank & Statutory (KYC)" icon={CreditCard}>
              <div className="rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/[0.07] p-3.5 sm:col-span-2 lg:col-span-3">
                <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-[#0A1628]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#96782A]" strokeWidth={1.8} />
                  <span>
                    <span className="font-bold">Documents & identity verification:</span> enter the numbers below for payroll & compliance.
                    The employee then finishes KYC from their portal dashboard by uploading their Aadhaar (front & back) and PAN card photos,
                    which an admin verifies.
                  </span>
                </p>
              </div>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={set('bankName')} className={CRM_INPUT} placeholder="e.g. HDFC Bank" />
              </Field>
              <Field label="Bank Account Number">
                <input value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className={CRM_INPUT} inputMode="numeric" />
                <Hint>For monthly salary transfer</Hint>
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifscCode} onChange={set('ifscCode')} className={`${CRM_INPUT} font-mono uppercase`} placeholder="HDFC0001234" maxLength={11} />
                <Hint>11 characters — bank branch code</Hint>
              </Field>
              <Field label="PAN Number">
                <input value={form.panNumber} onChange={set('panNumber')} className={`${CRM_INPUT} font-mono uppercase tracking-[0.2em]`} placeholder="ABCDE1234F" maxLength={10} />
                <Hint>Mandatory for TDS — 5 letters, 4 digits, 1 letter</Hint>
              </Field>
              <Field label="Aadhaar Number">
                <input value={form.aadharNumber} onChange={set('aadharNumber')} className={`${CRM_INPUT} font-mono`} placeholder="12-digit number" inputMode="numeric" maxLength={14} />
                <Hint>Required for PF (UAN) & ESI enrolment</Hint>
              </Field>
              <Field label="UAN (PF) Number">
                <input value={form.uanNumber} onChange={set('uanNumber')} className={CRM_INPUT} placeholder="12-digit UAN" inputMode="numeric" maxLength={12} />
                <Hint>Universal Account Number from EPFO — leave blank if new to PF</Hint>
              </Field>
              <Field label="ESI Number">
                <input value={form.esiNumber} onChange={set('esiNumber')} className={CRM_INPUT} placeholder="e.g. 33-1234567-0" />
                <Hint>ESIC insurance number — issued once enrolled</Hint>
              </Field>
              <Field label="Passport-size Photo">
                <div className="rounded-xl border border-dashed border-black/10 bg-[#fafafa] px-3 py-2.5 text-[10.5px] leading-relaxed text-[#9ca3af]">
                  Uploaded above in Personal Details — it is reused for the ID card & payslip.
                </div>
              </Field>
            </Section>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <CrmBtn variant="gold" type="submit" disabled={saving}>
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
              </CrmBtn>
              <CrmBtn variant="ghost" type="button" onClick={() => navigate('/crm/employees')}>
                <UserRound className="h-3.5 w-3.5" /> Cancel
              </CrmBtn>
              {isEdit && (
                <p className="text-[11px] text-[#9ca3af]">
                  Saving records the change in the employee's History tab.
                </p>
              )}
            </div>
          </form>
        </CrmPageBody>
      </main>
    </div>
  );
}
