import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadSupabase } from '@/services/leadSupabase';
import CrmSidebar from '@/components/crm/CrmSidebar';
import type { Lead, Agent, FollowUp, ActivityLog } from '@/types/lead';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '@/types/lead';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  Calendar,
  Clock,
  FileText,
  UserPlus,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Pencil,
  Check,
  X,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Contacted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Property Shared': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Site Visit Scheduled': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Booked: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  Lost: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_FLOW = ['New Lead', 'Contacted', 'Property Shared', 'Site Visit Scheduled', 'Negotiation', 'Booked', 'Closed'];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNote, setNewNote] = useState('');
  const [newFollowUpDate, setNewFollowUpDate] = useState('');
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [newVisitDate, setNewVisitDate] = useState('');
  const [newVisitLocation, setNewVisitLocation] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    leadSupabase.admin.verify().then(p => {
      const perms = p.permissions;
      if (!perms || perms.length === 0) setCanEdit(true);
      else setCanEdit(perms.includes('requirements.edit'));
    }).catch(() => setCanEdit(true));
  }, []);

  const fetchLead = useCallback(async () => {
    if (!id) return;
    try {
      const res = await leadSupabase.get(id);
      setLead(res.data);
      const actRes = await leadSupabase.getActivities(id);
      setActivities(actRes.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchLead(); }, [fetchLead]);
  useEffect(() => {
    leadSupabase.agents.list().then((r) => setAgents((r.data ?? []).filter(a => a.active !== false))).catch(() => {});
  }, []);

  if (loading || !lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Loading lead...
      </div>
    );
  }

  const r = lead.requirement;

  const handleStatusChange = async (status: string) => {
    await leadSupabase.updateStatus(id!, status);
    await fetchLead();
  };

  const handleAssignAgent = async (agentId: string) => {
    await leadSupabase.assignAgent(id!, agentId || null);
    await fetchLead();
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await leadSupabase.addNote(id!, newNote.trim());
    setNewNote('');
    await fetchLead();
  };

  const handleAddFollowUp = async () => {
    if (!newFollowUpDate) return;
    await leadSupabase.followUps.create(id!, new Date(newFollowUpDate).toISOString(), newFollowUpNote);
    setNewFollowUpDate('');
    setNewFollowUpNote('');
    await fetchLead();
  };

  const handleAddSiteVisit = async () => {
    if (!newVisitDate) return;
    await leadSupabase.siteVisits.create(id!, new Date(newVisitDate).toISOString(), newVisitLocation);
    setNewVisitDate('');
    setNewVisitLocation('');
    await fetchLead();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead?')) return;
    await leadSupabase.remove(id!);
    navigate('/crm/requirements');
  };

  function startEditing() {
    if (!lead) return;
    setEditForm({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      leadSource: lead.leadSource,
      priority: lead.priority,
      requirement: { ...lead.requirement },
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditForm({});
  }

  async function saveEditing() {
    if (!lead || !id) return;
    setSaving(true);
    try {
      await leadSupabase.update(id, editForm);
      setEditing(false);
      setEditForm({});
      await fetchLead();
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-['Manrope',sans-serif] antialiased flex">
      <CrmSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <main className="flex-1 min-w-0 p-8 pb-16 max-sm:p-4 overflow-y-auto">
        <button
          onClick={() => navigate('/crm/requirements')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Requirements
        </button>

        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8">
          <div className="w-full min-w-0">
            {editing ? (
              <div className="space-y-2 mb-2">
                <input value={editForm.name ?? ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="font-['Fraunces',serif] text-[26px] sm:text-[32px] font-semibold tracking-tight w-full bg-transparent border-b border-blue-400 outline-none pb-0.5" />
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  <span className="font-mono text-blue-500">{lead.leadId}</span>
                  <input value={editForm.phone ?? ''} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 w-[150px]" />
                  <input value={editForm.email ?? ''} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 w-[200px]" placeholder="Email" />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    Source:
                    <input value={editForm.leadSource ?? ''} onChange={(e) => setEditForm({...editForm, leadSource: e.target.value})} className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 w-[130px]" />
                  </span>
                  <select value={editForm.priority ?? ''} onChange={(e) => setEditForm({...editForm, priority: e.target.value})} className="h-8 px-2 rounded-lg border border-border bg-muted/30 text-sm outline-none">
                    {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="font-['Fraunces',serif] text-[26px] sm:text-[32px] font-semibold tracking-tight m-0">{lead.name}</h1>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${STATUS_COLORS[lead.status] ?? ''}`}>{lead.status}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${lead.priority === 'High' || lead.priority === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{lead.priority}</span>
                </div>
                <p className="text-muted-foreground text-[13px] flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-blue-500">{lead.leadId}</span>
                  <span>{lead.phone}</span>
                  {lead.email && <span>{lead.email}</span>}
                  <span>Source: {lead.leadSource}</span>
                </p>
              </>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {editing ? (
              <>
                <button onClick={cancelEditing} className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">
                  <X className="w-3.5 h-3.5 inline mr-1" />Cancel
                </button>
                <button onClick={saveEditing} disabled={saving} className="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 transition-all disabled:opacity-50">
                  <Check className="w-3.5 h-3.5 inline mr-1" />{saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                {canEdit && (
                  <button onClick={startEditing} className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-border text-xs font-bold text-muted-foreground bg-card hover:bg-accent transition-colors">
                    <Pencil className="w-3.5 h-3.5 inline mr-1" />Edit
                  </button>
                )}
                {canEdit && (
                  <button onClick={handleDelete} className="flex-1 sm:flex-none px-4 py-2.5 rounded-full border border-red-200 text-xs font-bold text-red-500 bg-card hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-3.5 h-3.5 inline mr-1" />Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Requirements
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {editing ? (
                  <>
                    <EditField label="Self Purchase" value={editForm.requirement?.selfPurchase ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, selfPurchase: v}})} />
                    <EditField label="Property Type" value={editForm.requirement?.propertyType ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, propertyType: v}})} />
                    <EditField label="Preferred Location" value={editForm.requirement?.preferredLocation ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, preferredLocation: v}})} />
                    <EditField label="Budget" value={editForm.requirement?.budget ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, budget: v}})} />
                    <EditField label="Payment Mode" value={editForm.requirement?.paymentMode ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, paymentMode: v}})} />
                    <EditField label="Timeline" value={editForm.requirement?.timeline ?? ''} onChange={(v) => setEditForm({...editForm, requirement: {...editForm.requirement, timeline: v}})} />
                    <div className="sm:col-span-2">
                      <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground block mb-1">Special Requirements</span>
                      <textarea value={editForm.requirement?.specialRequirements ?? ''} onChange={(e) => setEditForm({...editForm, requirement: {...editForm.requirement, specialRequirements: e.target.value}})} className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 transition-colors pt-2 resize-none" rows={2} />
                    </div>
                  </>
                ) : (
                  <>
                    <Field label="Self Purchase" value={r.selfPurchase} />
                    <Field label="Property Type" value={r.propertyType} />
                    <Field label="Preferred Location" value={<span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-400" />{r.preferredLocation}</span>} />
                    <Field label="Budget" value={<span className="flex items-center gap-1 font-semibold text-emerald-600"><IndianRupee className="w-3 h-3" />{r.budget}</span>} />
                    <Field label="Payment Mode" value={r.paymentMode} />
                    <Field label="Timeline" value={<span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-amber-400" />{r.timeline}</span>} />
                    {r.specialRequirements && (
                      <div className="sm:col-span-2">
                        <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground block mb-1">Special Requirements</span>
                        <p className="text-foreground italic">{r.specialRequirements}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-4">Lead Progress</h2>
              <div className="flex items-center gap-0 mb-2">
                {STATUS_FLOW.map((step, i) => {
                  const curIdx = STATUS_FLOW.indexOf(lead.status);
                  const active = i <= curIdx;
                  const isLost = lead.status === 'Lost';
                  return (
                    <button
                      key={step}
                      onClick={() => !isLost && handleStatusChange(step)}
                      disabled={isLost || !canEdit}
                      className="flex-1 text-center relative cursor-pointer group disabled:cursor-not-allowed"
                      title={`Change to ${step}`}
                    >
                      <div className={`h-1.5 rounded mb-1.5 transition-colors ${active ? 'bg-emerald-500' : 'bg-border group-hover:bg-emerald-300'}`} />
                      <span className={`text-[10px] font-medium block truncate ${active ? 'text-emerald-600 font-bold' : 'text-muted-foreground'}`}>{step}</span>
                    </button>
                  );
                })}
              </div>
              {isLost(lead.status) && canEdit && (
                <button onClick={() => handleStatusChange('New Lead')} className="text-xs text-red-500 hover:text-red-700 mt-2">Reactivate lead</button>
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-4">Notes</h2>
              {canEdit && (
                <div className="flex gap-2 mb-4">
                  <input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  />
                  <button onClick={handleAddNote} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors">Add</button>
                </div>
              )}
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
                {lead.notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                ) : [...lead.notes].reverse().map((n, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/40">
                    <p className="text-[13px] text-foreground">{n.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{n.addedBy} · {formatDate(n.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-500" /> Assigned Agent
              </h2>
              <select
                value={lead.assignedAgent?._id ?? ''}
                onChange={(e) => handleAssignAgent(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none"
                disabled={!canEdit}
              >
                <option value="">Unassigned</option>
                {agents.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
              {lead.assignedAgent && (
                <div className="mt-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200/40">
                  <p className="text-sm font-medium text-foreground">{lead.assignedAgent.name}</p>
                  <p className="text-[11px] text-muted-foreground">{lead.assignedAgent.email}</p>
                </div>
              )}
            </div>

            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" /> Schedule Follow-up
              </h2>
              <div className="space-y-2.5 mb-4">
                <input type="datetime-local" value={newFollowUpDate} onChange={(e) => setNewFollowUpDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                <input value={newFollowUpNote} onChange={(e) => setNewFollowUpNote(e.target.value)} placeholder="Follow-up note..." className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                {canEdit && (
                  <button onClick={handleAddFollowUp} className="w-full py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Schedule
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {lead.followUps.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">No follow-ups</p> : (
                  [...lead.followUps].reverse().slice(0, 5).map((f) => (
                    <div key={f._id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-[12px] font-medium text-foreground">{formatDate(f.scheduledAt)}</p>
                        {f.note && <p className="text-[10px] text-muted-foreground">{f.note}</p>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : f.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{f.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-card border border-border/60 rounded-xl p-6">
              <h2 className="font-['Fraunces',serif] text-base font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Site Visit
              </h2>
              <div className="space-y-2.5 mb-4">
                <input type="datetime-local" value={newVisitDate} onChange={(e) => setNewVisitDate(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                <input value={newVisitLocation} onChange={(e) => setNewVisitLocation(e.target.value)} placeholder="Location..." className="w-full h-10 px-3 rounded-xl border border-border bg-muted/30 text-sm outline-none" />
                {canEdit && (
                  <button onClick={handleAddSiteVisit} className="w-full py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Record Visit
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {lead.siteVisits.length === 0 ? <p className="text-xs text-muted-foreground text-center py-2">No site visits</p> : (
                  [...lead.siteVisits].reverse().slice(0, 5).map((v) => (
                    <div key={v._id} className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
                      <p className="text-[12px] font-medium text-foreground">{formatDate(v.visitedAt)}</p>
                      {v.location && <p className="text-[11px] text-muted-foreground">{v.location}</p>}
                      {v.outcome && <p className="text-[10px] text-emerald-600 mt-0.5">Outcome: {v.outcome}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-6 mb-8">
          <h2 className="font-['Fraunces',serif] text-base font-semibold mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" /> Activity History
          </h2>
          <div className="relative pl-6 space-y-0">
            <div className="absolute left-2.5 top-1 bottom-0 w-px bg-border" />
            {activities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No activity recorded yet</p>
            ) : activities.map((a) => (
              <div key={a._id} className="relative pb-4 pl-4">
                <div className="absolute left-[-14px] top-[5px] w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-background" />
                <p className="text-[13px] text-foreground">{a.description}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{a.createdAt ? formatDate(a.createdAt) : ''} · {a.performedBy}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground block mb-0.5">{label}</span>
      <div className="text-foreground font-medium">{value || '—'}</div>
    </div>
  );
}

function EditField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="text-[10.5px] uppercase tracking-[1px] text-muted-foreground block mb-0.5">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 px-2.5 rounded-lg border border-border bg-muted/30 text-sm outline-none focus:border-blue-400 transition-colors" />
    </div>
  );
}

function isLost(status: string) {
  return status === 'Lost';
}

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
