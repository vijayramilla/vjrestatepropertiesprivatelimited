import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { leadSupabase } from '@/services/leadSupabase';

const DEPARTMENTS = ['Sales', 'Marketing', 'Operations', 'Finance', 'HR', 'IT', 'Legal'];
const DESIGNATIONS = ['Channel Partner', 'Sales Executive', 'Senior Sales Manager', 'Team Lead', 'Branch Manager', 'Operations Head', 'Accountant', 'HR Manager', 'Admin'];
const STATUSES = ['Active', 'On Leave', 'Terminated', 'Inactive'];

export default function AdminEmployeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', phone: '', designation: '', department: '',
    joiningDate: '', status: 'Active', salary: 0, address: '',
    emergencyContactName: '', emergencyContactPhone: '',
    bankAccountNumber: '', bankName: '', ifscCode: '',
    panNumber: '', aadharNumber: '', uanNumber: '', esiNumber: '',
    profilePhotoUrl: '', notes: '',
  });

  useEffect(() => {
    if (!isEdit) {
      leadSupabase.employees.maxEmployeeId().then((res) => {
        const last = res.data ?? 'EMP-000';
        const num = parseInt(last.replace('EMP-', ''), 10) + 1;
        setForm((f) => ({ ...f, employeeId: `EMP-${String(num).padStart(3, '0')}` }));
      }).catch(() => {});
      return;
    }
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
      });
    }).catch(() => navigate('/admin/employees'));
  }, [id, isEdit, navigate]);

  const set = (k: string) => (e: any) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) {
        await leadSupabase.employees.update(id!, { ...form, addHistory: true, historyType: 'updated', historyTitle: 'Profile Updated', historyDesc: 'Employee profile was updated' });
      } else {
        await leadSupabase.employees.create(form);
      }
      navigate('/admin/employees');
    } catch (err) {
      alert('Failed to save employee. Check console for details.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 font-sans text-sm outline-none focus:border-black focus:ring-1 focus:ring-black";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <AdminLayout title={isEdit ? 'Edit Employee' : 'Add Employee'}>
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl text-black sm:text-3xl">{isEdit ? 'Edit Employee' : 'Add Employee'}</h1>
          <p className="mt-1 font-sans text-sm text-gray-600">{isEdit ? 'Update employee information' : 'Register a new employee'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Info */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-lg font-medium text-black">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Employee ID</label>
                <input value={form.employeeId} onChange={set('employeeId')} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Full Name</label>
                <input value={form.name} onChange={set('name')} className={inputClass} required />
              </div>
              <div>
                <label className={labelClass}>Photo URL</label>
                <input value={form.profilePhotoUrl} onChange={set('profilePhotoUrl')} className={inputClass} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={set('email')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" value={form.phone} onChange={set('phone')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input value={form.address} onChange={set('address')} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Employment */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-lg font-medium text-black">Employment Details</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Designation</label>
                <select value={form.designation} onChange={set('designation')} className={inputClass}>
                  <option value="">Select</option>
                  {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <select value={form.department} onChange={set('department')} className={inputClass}>
                  <option value="">Select</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Joining Date</label>
                <input type="date" value={form.joiningDate} onChange={set('joiningDate')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={set('status')} className={inputClass}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Monthly Salary (₹)</label>
                <input type="number" value={form.salary} onChange={set('salary')} className={inputClass} min="0" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <input value={form.notes} onChange={set('notes')} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Emergency Contact */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-lg font-medium text-black">Emergency Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Contact Name</label>
                <input value={form.emergencyContactName} onChange={set('emergencyContactName')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contact Phone</label>
                <input type="tel" value={form.emergencyContactPhone} onChange={set('emergencyContactPhone')} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Bank & Documents */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
            <h2 className="mb-4 font-serif text-lg font-medium text-black">Bank & Documents</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Bank Account Number</label>
                <input value={form.bankAccountNumber} onChange={set('bankAccountNumber')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Bank Name</label>
                <input value={form.bankName} onChange={set('bankName')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>IFSC Code</label>
                <input value={form.ifscCode} onChange={set('ifscCode')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>PAN Number</label>
                <input value={form.panNumber} onChange={set('panNumber')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Aadhar Number</label>
                <input value={form.aadharNumber} onChange={set('aadharNumber')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>UAN (PF) Number</label>
                <input value={form.uanNumber} onChange={set('uanNumber')} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>ESI Number</label>
                <input value={form.esiNumber} onChange={set('esiNumber')} className={inputClass} />
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex min-h-[44px] items-center gap-2 rounded-lg bg-black px-6 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Add Employee'}
            </button>
            <button type="button" onClick={() => navigate('/admin/employees')} className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}