import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminEmptyState,
  AdminFilterRow,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { MagnifyingGlass } from 'phosphor-react';
import { leadSupabase } from '@/services/leadSupabase';

const API_URL = import.meta.env.VITE_OWNER_API_URL ?? 'http://localhost:5000';

interface OwnerContact {
  _id: string;
  propertyId: string;
  contact_name: string;
  contact_phone: string;
  agent_name?: string;
  updatedAt: string;
}

export default function AdminOwnerContacts() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<OwnerContact[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [agentFilter, setAgentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    leadSupabase.employees
      .list({ status: 'Active' })
      .then((res: any) => {
        setAgents((res.data ?? []).filter((e: any) => e.designation === 'Channel Partner'));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (agentFilter) params.set('agent', agentFilter);
    if (search) params.set('q', search);
    const qs = params.toString();
    fetch(`${API_URL}/api/owner-contacts${qs ? `?${qs}` : ''}`)
      .then((r) => r.json())
      .then((data) => setContacts(data ?? []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [search, agentFilter]);

  const filtered = contacts;

  return (
    <AdminLayout>
      <AdminPageShell>
        <AdminPageHeader
          title="Owner Contacts"
          eyebrow="Admin"
          description="Owner name and phone numbers stored in MongoDB"
        />

        <AdminToolbar>
          <AdminFilterRow>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="admin-input-ghost"
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.employee_id} value={a.employee_id}>
                  {a.name} (CP ID: {a.employee_id})
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-0 max-w-xs">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input-ghost pl-9"
              />
            </div>
          </AdminFilterRow>
        </AdminToolbar>

        {loading ? (
          <AdminSkeletonList />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            title="No owner contacts found"
            description={search || agentFilter ? 'Try a different filter.' : 'No owner contacts have been saved yet.'}
          />
        ) : (
          <div className="admin-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <div className="col-span-4">Property</div>
              <div className="col-span-3">Owner Name</div>
              <div className="col-span-3">Phone Number</div>
              <div className="col-span-2">Last Updated</div>
            </div>

            {filtered.map((c) => (
              <div
                key={c._id}
                onClick={() => navigate(`/admin/properties/${c.propertyId}/edit`)}
                className="grid grid-cols-12 gap-4 px-5 py-4 items-center border-b border-gray-50 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="col-span-4">
                  <span className="text-sm font-medium text-indigo-600 truncate block">
                    {c.propertyId.slice(0, 12)}...
                  </span>
                  {agentFilter && c.agent_name && (
                    <span className="text-[11px] text-gray-400">Agent: {c.agent_name}</span>
                  )}
                  <span className="text-[11px] text-gray-400">Click to edit</span>
                </div>
                <div className="col-span-3 text-sm text-gray-700">
                  {c.contact_name || <span className="text-gray-400">—</span>}
                </div>
                <div className="col-span-3 text-sm text-gray-700 font-mono">
                  {c.contact_phone || <span className="text-gray-400">—</span>}
                </div>
                <div className="col-span-2 text-xs text-gray-500">
                  {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPageShell>
    </AdminLayout>
  );
}
