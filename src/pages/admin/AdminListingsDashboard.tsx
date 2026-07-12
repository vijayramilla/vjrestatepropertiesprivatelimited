import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminBadge, AdminEmptyState, AdminSkeletonList } from '@/components/admin/AdminUi';
import { formatINR } from '@/lib/formatPrice';
import { subscribePropertyLeads } from '@/lib/propertyLeads';
import type { PropertyLead } from '@/lib/propertyLeads';

interface ListingProperty {
  id: string;
  title: string;
  type: string;
  area: string;
  price: number;
  price_label: string;
  status: string;
  listed_by?: string;
  uid?: string;
  userEmail?: string;
  userDisplayName?: string;
  userPhotoURL?: string;
  maps_link?: string;
  createdAt?: { toDate?: () => Date };
}

interface ListingUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  suspended?: boolean;
  lastSeen?: { toDate?: () => Date };
  lastLogin?: { toDate?: () => Date };
  loginCount?: number;
}

export default function AdminListingsDashboard() {
  const [properties, setProperties] = useState<ListingProperty[]>([]);
  const [users, setUsers] = useState<Map<string, ListingUser>>(new Map());
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as ListingProperty)
        .filter((p) => p.uid);
      setProperties(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const map = new Map<string, ListingUser>();
      snap.docs.forEach((d) => {
        map.set(d.id, { uid: d.id, ...d.data() } as ListingUser);
      });
      setUsers(map);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribePropertyLeads((allLeads) => {
      setLeads(allLeads);
    });
    return unsub;
  }, []);

  const handleSuspend = async (userId: string, suspended: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), { suspended });
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleDelete = async (propertyId: string, title: string) => {
    if (!window.confirm(`Delete "${title}" permanently? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'properties', propertyId));
    } catch (err) {
      console.error('Error deleting property:', err);
    }
  };

  const leadsByProperty = useMemo(() => {
    const map = new Map<string, PropertyLead[]>();
    for (const lead of leads) {
      const list = map.get(lead.propertyId);
      if (list) list.push(lead);
      else map.set(lead.propertyId, [lead]);
    }
    return map;
  }, [leads]);

  const enriched = properties
    .map((p) => ({ ...p, user: users.get(p.uid ?? '') }))
    .filter((p) => {
      if (roleFilter !== 'All' && p.listed_by !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.user?.displayName?.toLowerCase().includes(q) ?? false) ||
        (p.user?.email?.toLowerCase().includes(q) ?? false) ||
        p.area.toLowerCase().includes(q)
      );
    });

  const agentListings = properties.filter((p) => p.listed_by === 'Agent').length;
  const ownerListings = properties.filter((p) => p.listed_by === 'Owner' || !p.listed_by).length;
  const uniqueUsers = new Set(properties.map((p) => p.uid)).size;
  const suspendedUsers = new Set(
    properties.filter((p) => users.get(p.uid ?? '')?.suspended).map((p) => p.uid)
  ).size;

  function Avatar({ user, size = 'md' }: { user: ListingUser | undefined; size?: 'sm' | 'md' }) {
    const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
    const txt = size === 'sm' ? 'text-[10px]' : 'text-xs';
    if (user?.photoURL) {
      return <img src={user.photoURL} alt="" className={`${dim} rounded-full object-cover ring-2 ring-gray-100`} />;
    }
    const initial = (user?.displayName || user?.email || '?')[0].toUpperCase();
    return (
      <div className={`${dim} flex items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-50 ${txt} font-bold text-gray-500`}>
        {initial}
      </div>
    );
  }

  return (
    <AdminLayout title="Listings">
      <div className="px-3 py-5 sm:px-8 sm:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Listings Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Agents &amp; Owners — user-submitted property listings
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-6 sm:gap-4">
          {[
            { label: 'Total Listings', value: properties.length, color: 'text-gray-900', sub: `${agentListings} agent · ${ownerListings} owner` },
            { label: 'Agents', value: agentListings, color: 'text-blue-600', sub: `${new Set(properties.filter(p => p.listed_by === 'Agent').map(p => p.uid)).size} unique` },
            { label: 'Owners', value: ownerListings, color: 'text-violet-600', sub: `${new Set(properties.filter(p => p.listed_by !== 'Agent').map(p => p.uid)).size} unique` },
            { label: 'Active Users', value: uniqueUsers - suspendedUsers, color: 'text-emerald-600', sub: `${uniqueUsers} total registered` },
            { label: 'Suspended', value: suspendedUsers, color: 'text-red-600', sub: `${((suspendedUsers / (uniqueUsers || 1)) * 100).toFixed(0)}% of users` },
            { label: 'Total Enquiries', value: leads.length, color: 'text-orange-600', sub: `${leadsByProperty.size} properties contacted` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">{stat.label}</p>
              <p className={`mt-1.5 text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {['All', 'Agent', 'Owner'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
                  roleFilter === role
                    ? 'bg-gray-900 text-white shadow-md shadow-gray-900/20'
                    : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/80'
                }`}
              >
                {role === 'All' ? `All (${properties.length})` : role}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search by title, user, or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10 sm:w-72"
          />
        </div>

        {loading ? (
          <AdminSkeletonList count={5} />
        ) : enriched.length === 0 ? (
          <AdminEmptyState
            title="No User Listings Yet"
            description="Properties listed by agents and owners via the public form will appear here."
          />
        ) : (
          <div className="space-y-3">
            {enriched.map((p) => {
              const role = p.listed_by === 'Agent' ? 'Agent' : 'Owner';
              return (
                <div key={p.id} className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Avatar user={p.user} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{p.title}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{p.type} · {p.area}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                        role === 'Agent' ? 'bg-blue-50 text-blue-700' : 'bg-violet-50 text-violet-700'
                      }`}>
                        {role}
                      </span>
                      <AdminBadge variant={p.status === 'Ready' ? 'success' : 'muted'}>
                        {p.status}
                      </AdminBadge>
                    </div>
                  </div>

                  <div className="mt-3 ml-12 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    <p className="text-base font-bold text-gray-900">{p.price_label || formatINR(p.price)}</p>
                    <div className="h-3 w-px bg-gray-200" />
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${p.user?.suspended ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className="text-xs font-medium text-gray-700">
                        {p.user?.displayName || p.userDisplayName || 'Unknown'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">{p.user?.email || p.userEmail}</span>
                    {p.user?.loginCount !== undefined && (
                      <>
                        <div className="h-3 w-px bg-gray-200" />
                        <span className="text-[10px] text-gray-400">{p.user.loginCount} logins</span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 ml-12 flex items-center gap-3 border-t border-gray-100 pt-3">
                    {p.user ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSuspend(p.user!.uid, !p.user!.suspended)}
                          className={`rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            p.user?.suspended
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:shadow-sm'
                              : 'bg-red-50 text-red-700 hover:bg-red-100 hover:shadow-sm'
                          }`}
                        >
                          {p.user?.suspended ? '← Unsuspend' : 'Suspend →'}
                        </button>
                        <span className={`text-[10px] font-medium ${p.user?.suspended ? 'text-red-500' : 'text-emerald-600'}`}>
                          {p.user?.suspended ? 'Account suspended' : 'Account active'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-400">No linked user account</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.title)}
                      className="ml-auto rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600 transition-all hover:bg-red-50 hover:shadow-sm"
                    >
                      Delete
                    </button>
                    {p.maps_link && (
                      <a
                        href={p.maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-medium text-gray-500 underline-offset-2 transition-colors hover:text-blue-600 hover:underline"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        View Location
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      className={`ml-3 rounded-lg px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                        (leadsByProperty.get(p.id)?.length ?? 0) > 0
                          ? 'text-orange-600 hover:bg-orange-50'
                          : 'text-gray-400 cursor-default'
                      }`}
                    >
                      Enquiries ({(leadsByProperty.get(p.id)?.length ?? 0)})
                    </button>
                  </div>

                  {expandedId === p.id && (
                    <div className="mt-3 ml-12 border-t border-gray-100 pt-3">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Enquiry History</p>
                      {(leadsByProperty.get(p.id)?.length ?? 0) === 0 ? (
                        <p className="text-[10px] text-gray-400">No enquiries yet.</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {leadsByProperty.get(p.id)?.map((lead) => (
                            <div key={lead.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3 text-[11px]">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-semibold text-gray-700">{lead.buyerName || 'Anonymous'}</span>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  lead.leadType === 'book_visit' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                }`}>
                                  {lead.leadType === 'book_visit' ? 'Visit' : 'WhatsApp'}
                                </span>
                              </div>
                              {lead.buyerPhone && <p className="text-gray-500">📞 {lead.buyerPhone}</p>}
                              {lead.buyerLat && lead.buyerLng && <p className="text-gray-500">📍 {lead.buyerLat.toFixed(4)}, {lead.buyerLng.toFixed(4)}</p>}
                              {lead.visitDate && <p className="text-gray-500">📅 {lead.visitDate}{lead.visitTime ? ` · ${lead.visitTime}` : ''}</p>}
                              {lead.createdAt && (
                                <p className="text-gray-400">
                                  🕐 {lead.createdAt instanceof Date
                                    ? lead.createdAt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : '—'}
                                </p>
                              )}
                              <p className="mt-1 truncate text-gray-400 border-t border-gray-100 pt-1">{lead.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
