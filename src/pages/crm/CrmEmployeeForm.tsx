import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CRM_INPUT } from '@/components/crm/CrmUi';
import { ArrowLeft, Save, UserRound, RefreshCw, Sparkles, UploadCloud, X, ScanFace } from 'lucide-react';
import { DEPARTMENTS, designationsFor } from '@/data/employeeHierarchy';
import { generateEmployeeId } from '@/lib/employeeIdGen';

/** Downscale an image file to a base64 data-URL (max 800px, ~70% quality) so
 *  the upload stays small enough for the proxy request body. */
function compressImage(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode the image'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas 2D context not available')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e: any) {
          reject(new Error('Image compression failed: ' + e.message));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const STATUSES = ['Active', 'On Leave', 'Terminated', 'Inactive'];

const FIELD_LABEL = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]';

// Defined at module scope (NOT inside the component) so their identity is stable.
// A component defined inside a render function is recreated on every render, which
// makes React unmount/remount the whole subtree — inputs lose focus after each
// keystroke ("typing goes back after one letter").
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_1px_2px_rgba(10,22,40,0.05)] sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-[#D6B85D] to-[#C9A84C]" />
        <h2 className="font-['Inter',sans-serif] text-[16px] font-semibold text-[#0A1628]">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={FIELD_LABEL}>{label}</label>
      {children}
    </div>
  );
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
    employeeId: '', name: '', email: '', phone: '', designation: '', department: '',
    joiningDate: '', status: 'Active', salary: 0, address: '',
    emergencyContactName: '', emergencyContactPhone: '',
    bankAccountNumber: '', bankName: '', ifscCode: '',
    panNumber: '', aadharNumber: '', uanNumber: '', esiNumber: '',
    profilePhotoUrl: '', notes: '',
    accessEnabled: false, commissionRate: '',
    workStartTime: '09:30', autoLogoutTime: '21:00',
    faceVerifyRequired: false, faceVerifyFrequency: 'daily',
    payrollVisible: true,
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoPick = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const base64 = await compressImage(file);
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
        designation: e.designation ?? '', department: e.department ?? '',
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
      });
    }).catch(() => navigate('/crm/employees'));
  }, [id, isEdit, navigate]);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Current stored designation is kept as an option so editing old records never blanks out.
  const designations = [...new Set([...(form.designation ? [form.designation] : []), ...designationsFor(form.department)])];

  const handleSubmit = async (e: any) => {
    e.preventDefault();
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
            description={isEdit ? 'Update employee information' : 'Register a new employee — the ID Card ID (Employee ID) is the user ID used across the CRM'}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <Section title="Personal Information">
              <Field label="ID Card ID / Employee ID">
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
                <p className="mt-1.5 text-[10px] text-[#9ca3af]">
                  {genIdAi ? 'Generated by Gemini AI from role' : 'Auto-generated from department & designation'}
                  {' · editable'}
                </p>
              </Field>
              <Field label="Full Name">
                <input value={form.name} onChange={set('name')} className={CRM_INPUT} required />
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
                    <p className="mt-1 text-[10px] text-[#9ca3af]">JPG / PNG / WebP — auto-resized and stored in Supabase storage</p>
                  </div>
                </div>
              </Field>
              <Field label="Email (used for login)">
                <input type="email" value={form.email} onChange={set('email')} className={CRM_INPUT} placeholder="employee@vjrestate.com" />
                <label className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 transition-colors hover:border-[#C9A84C]/60">
                  <input
                    type="checkbox"
                    checked={form.accessEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, accessEnabled: e.target.checked }))}
                    className="h-4 w-4 cursor-pointer accent-[#96782A]"
                  />
                  <span className="text-xs font-semibold text-[#0A1628]">Login access active — employee can sign in with Google</span>
                </label>
                <p className="mt-1.5 text-[10px] text-[#9ca3af]">Only ticked employees can open the portal link with this email.</p>
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
                  <p className="mt-1.5 text-[10px] text-[#9ca3af]">Off — the employee can still verify manually anytime from their dashboard.</p>
                )}
              </Field>
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
                <p className="mt-1.5 text-[10px] text-[#9ca3af]">When off, the employee's dashboard hides salary, bank details, and payslip data.</p>
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phone} onChange={set('phone')} className={CRM_INPUT} />
              </Field>
              <Field label="Address">
                <input value={form.address} onChange={set('address')} className={CRM_INPUT} />
              </Field>
            </Section>

            <Section title="Employment Details">
              <Field label="Department">
                <select value={form.department} onChange={set('department')} className={CRM_INPUT}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Designation (sub-category)">
                <select value={form.designation} onChange={set('designation')} className={CRM_INPUT}>
                  <option value="">Select</option>
                  {designations.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="mt-1.5 text-[10px] text-[#9ca3af]">Roles under {form.department || 'a department'} — e.g. Telecaller Agent</p>
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
                <p className="mt-1.5 text-[10px] text-[#9ca3af]">Dashboard auto-logs out daily at this time.</p>
              </Field>
              {form.designation === 'Channel Partner' ? (
                <Field label="Commission Rate (% of deal)">
                  <input type="number" value={form.commissionRate} onChange={set('commissionRate')} className={CRM_INPUT} min="0" step="0.1" placeholder="e.g. 1.5" />
                  <p className="mt-1.5 text-[10px] text-[#9ca3af]">Channel partners earn commission on closed deals — no monthly salary.</p>
                </Field>
              ) : (
                <Field label="Monthly Salary (₹)">
                  <input type="number" value={form.salary} onChange={set('salary')} className={CRM_INPUT} min="0" />
                </Field>
              )}
              <Field label="Notes">
                <input value={form.notes} onChange={set('notes')} className={CRM_INPUT} />
              </Field>
            </Section>

            <Section title="Emergency Contact">
              <Field label="Contact Name">
                <input value={form.emergencyContactName} onChange={set('emergencyContactName')} className={CRM_INPUT} />
              </Field>
              <Field label="Contact Phone">
                <input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} className={CRM_INPUT} />
              </Field>
            </Section>

            <Section title="Bank & Documents">
              <Field label="Bank Account Number">
                <input value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className={CRM_INPUT} />
              </Field>
              <Field label="Bank Name">
                <input value={form.bankName} onChange={set('bankName')} className={CRM_INPUT} />
              </Field>
              <Field label="IFSC Code">
                <input value={form.ifscCode} onChange={set('ifscCode')} className={CRM_INPUT} />
              </Field>
              <Field label="PAN Number">
                <input value={form.panNumber} onChange={set('panNumber')} className={CRM_INPUT} />
              </Field>
              <Field label="Aadhar Number">
                <input value={form.aadharNumber} onChange={set('aadharNumber')} className={CRM_INPUT} />
              </Field>
              <Field label="UAN (PF) Number">
                <input value={form.uanNumber} onChange={set('uanNumber')} className={CRM_INPUT} />
              </Field>
              <Field label="ESI Number">
                <input value={form.esiNumber} onChange={set('esiNumber')} className={CRM_INPUT} />
              </Field>
            </Section>

            <div className="flex flex-wrap gap-3">
              <CrmBtn variant="gold" type="submit" disabled={saving}>
                <Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
              </CrmBtn>
              <CrmBtn variant="ghost" type="button" onClick={() => navigate('/crm/employees')}>
                <UserRound className="h-3.5 w-3.5" /> Cancel
              </CrmBtn>
            </div>
          </form>
        </CrmPageBody>
      </main>
    </div>
  );
}
