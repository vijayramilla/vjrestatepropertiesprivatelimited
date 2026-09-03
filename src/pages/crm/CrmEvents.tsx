import { useEffect, useMemo, useState } from 'react';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import { CrmPageBody, CrmPageHeader, CrmBtn, CrmCard, CRM_INPUT } from '@/components/crm/CrmUi';
import { Megaphone, PartyPopper, Gift, Info, Plus, Pencil, Trash2, X, Check, UsersRound, Search } from 'lucide-react';
import { DEPARTMENTS, designationsFor } from '@/data/employeeHierarchy';

const EVENT_TYPES = ['Event', 'Wishing', 'Update', 'Announcement'];
const TYPE_STYLE: Record<string, string> = {
  Event: 'bg-blue-50 text-blue-700',
  Wishing: 'bg-pink-50 text-pink-600',
  Update: 'bg-amber-50 text-amber-700',
  Announcement: 'bg-emerald-50 text-emerald-700',
};
const TYPE_ICON: Record<string, any> = { Event: PartyPopper, Wishing: Gift, Update: Info, Announcement: Megaphone };

export default function CrmEvents() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', eventType: 'Update', eventDate: '', imageUrl: '',
    targetDepartments: [] as string[], targetDesignations: [] as string[], targetEmployeeIds: [] as string[],
  });

  const allDesignations = useMemo(() => DEPARTMENTS.flatMap((d) => designationsFor(d)), []);

  const fetchEvents = async () => {
    try {
      const res = await leadSupabase.events.list();
      setEvents(res.data ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchEmployees = async () => {
    try {
      const res = await leadSupabase.employees.list();
      setEmployees(res.data ?? []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchEvents(); fetchEmployees(); }, []);

  const toggle = (key: 'targetDepartments' | 'targetDesignations' | 'targetEmployeeIds', value: string) => {
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }));
  };

  const filteredEmployees = employees.filter((emp: any) =>
    (emp.name ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
    (emp.employee_id ?? '').toLowerCase().includes(empSearch.toLowerCase()) ||
    (emp.designation ?? '').toLowerCase().includes(empSearch.toLowerCase())
  );

  const openNew = () => {
    setEditingId(null);
    setForm({ title: '', description: '', eventType: 'Update', eventDate: new Date().toISOString().split('T')[0], imageUrl: '', targetDepartments: [], targetDesignations: [], targetEmployeeIds: [] });
    setShowForm(true);
  };

  const openEdit = (ev: any) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title ?? '', description: ev.description ?? '', eventType: ev.event_type ?? 'Update',
      eventDate: ev.event_date ?? '', imageUrl: ev.image_url ?? '',
      targetDepartments: ev.target_departments ?? [], targetDesignations: ev.target_designations ?? [],
      targetEmployeeIds: ev.target_employee_ids ?? [],
    });
    setShowForm(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await leadSupabase.events.update(editingId, { ...form, eventDate: form.eventDate || null });
      } else {
        await leadSupabase.events.create(form.title, form.description, form.eventType, form.eventDate || null, form.imageUrl, {
          targetDepartments: form.targetDepartments, targetDesignations: form.targetDesignations, targetEmployeeIds: form.targetEmployeeIds,
        });
      }
      setShowForm(false);
      fetchEvents();
    } catch (err: any) { alert(err?.message ?? 'Failed to save event'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event? Employees will no longer see it.')) return;
    try { await leadSupabase.events.delete(id); fetchEvents(); }
    catch (err: any) { alert(err?.message ?? 'Failed to delete'); }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-[#0A1628] font-['Inter',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <CrmPageBody>
          <CrmPageHeader
            eyebrow="Operations"
            title="Events & Announcements"
            description="Publish events, wishings and updates — they appear instantly on every employee's dashboard"
            actions={
              <CrmBtn variant="gold" onClick={openNew}>
                <Plus className="h-3.5 w-3.5" /> New Event
              </CrmBtn>
            }
          />

          {showForm && (
            <CrmCard className="mb-6 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9ca3af]">
                  {editingId ? 'Edit Event' : 'New Event'}
                </p>
                <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-[#9ca3af] hover:bg-black/[0.04]">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSave} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Title</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className={CRM_INPUT}
                    placeholder="e.g. Happy Birthday, Ravi! 🎉"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Type</label>
                  <select value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} className={CRM_INPUT}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Date</label>
                  <input type="date" value={form.eventDate} onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))} className={CRM_INPUT} />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Poster / Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                    className={CRM_INPUT}
                    placeholder="https://… (optional poster image)"
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={`${CRM_INPUT} min-h-[80px]`}
                    placeholder="What should employees know?"
                  />
                </div>

                {/* Targeting — who sees this event */}
                <div className="sm:col-span-2 lg:col-span-4">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">
                    Who should see this? {form.targetDepartments.length + form.targetDesignations.length + form.targetEmployeeIds.length === 0 && <span className="ml-1 normal-case text-[#96782A]">(Everyone)</span>}
                  </label>
                  <div className="space-y-3 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3.5">
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold text-[#9ca3af]">Departments</p>
                      <div className="flex flex-wrap gap-1.5">
                        {DEPARTMENTS.map((d) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => toggle('targetDepartments', d)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${form.targetDepartments.includes(d) ? 'bg-[#0A1628] text-[#D6B85D]' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold text-[#9ca3af]">Designations</p>
                      <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto pr-1">
                        {allDesignations.map((d) => (
                          <button
                            type="button"
                            key={d}
                            onClick={() => toggle('targetDesignations', d)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${form.targetDesignations.includes(d) ? 'bg-[#96782A] text-white' : 'bg-white text-[#6b7280] hover:bg-black/[0.04]'}`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-bold text-[#9ca3af]">Specific employees</p>
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9ca3af]" strokeWidth={1.8} />
                        <input
                          value={empSearch}
                          onChange={(e) => setEmpSearch(e.target.value)}
                          className={`${CRM_INPUT} h-9 pl-8 text-xs`}
                          placeholder="Search name, ID Card ID or designation…"
                        />
                      </div>
                      <div className="mt-2 grid max-h-36 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">
                        {filteredEmployees.map((emp: any) => (
                          <label key={emp.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] transition-colors hover:bg-white">
                            <input
                              type="checkbox"
                              checked={form.targetEmployeeIds.includes(emp.id)}
                              onChange={() => toggle('targetEmployeeIds', emp.id)}
                              className="h-3.5 w-3.5 cursor-pointer accent-[#96782A]"
                            />
                            <span className="min-w-0 truncate font-semibold text-[#0A1628]">{emp.name}</span>
                            <span className="ml-auto shrink-0 font-mono text-[9.5px] text-[#96782A]">{emp.employee_id}</span>
                          </label>
                        ))}
                        {filteredEmployees.length === 0 && <p className="col-span-full px-2 py-1 text-[11px] text-[#9ca3af]">No employees match.</p>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                  <CrmBtn type="submit" disabled={saving}>{saving ? 'Saving…' : 'Publish'}</CrmBtn>
                  <CrmBtn variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</CrmBtn>
                </div>
              </form>
            </CrmCard>
          )}

          {loading ? (
            <div className="h-48 animate-pulse rounded-2xl border border-black/[0.05] bg-white" />
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-white p-14 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-[#C9A84C]" strokeWidth={1.4} />
              <p className="mt-3 text-sm font-semibold text-[#0A1628]">No events yet</p>
              <p className="mt-1 text-xs text-[#9ca3af]">Publish your first event, wishing or update — employees see it on their dashboard instantly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((ev: any) => {
                const Icon = TYPE_ICON[ev.event_type] ?? Megaphone;
                return (
                  <div key={ev.id} className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(10,22,40,0.05)]">
                    {ev.image_url && <img src={ev.image_url} alt={ev.title} className="h-36 w-full object-cover" />}
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${TYPE_STYLE[ev.event_type] ?? 'bg-gray-100 text-gray-600'}`}>
                          <Icon className="h-3 w-3" strokeWidth={1.8} /> {ev.event_type || 'Update'}
                        </span>
                        {ev.event_date && (
                          <span className="text-[10px] font-semibold text-[#9ca3af]">
                            {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[14px] font-bold leading-snug text-[#0A1628]">{ev.title}</p>
                      {ev.description && <p className="mt-1 text-[11.5px] leading-relaxed text-[#6b7280]">{ev.description}</p>}
                      {(ev.target_departments?.length > 0 || ev.target_designations?.length > 0 || ev.target_employee_ids?.length > 0) ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ev.target_departments?.map((d: string) => (
                            <span key={'d' + d} className="rounded-md bg-[#0A1628]/[0.06] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0A1628]">{d}</span>
                          ))}
                          {ev.target_designations?.map((d: string) => (
                            <span key={'g' + d} className="rounded-md bg-[#C9A84C]/[0.14] px-1.5 py-0.5 text-[9.5px] font-bold text-[#96782A]">{d}</span>
                          ))}
                          {ev.target_employee_ids?.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[9.5px] font-bold text-blue-700">
                              <UsersRound className="h-2.5 w-2.5" strokeWidth={1.8} /> {ev.target_employee_ids.length} employee{ev.target_employee_ids.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="mt-2 inline-block rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700">Everyone</span>
                      )}
                      <div className="mt-3 flex items-center gap-2 border-t border-black/[0.05] pt-3">
                        <button onClick={() => openEdit(ev)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-[#96782A] hover:bg-[#C9A84C]/[0.1]">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => handleDelete(ev.id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-red-500 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-[#9ca3af]">
                          <Check className="h-3 w-3 text-emerald-500" /> Shown on dashboards
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CrmPageBody>
      </main>
    </div>
  );
}
