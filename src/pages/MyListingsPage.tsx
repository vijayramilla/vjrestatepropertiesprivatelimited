import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { where, orderBy } from 'firebase/firestore';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { subscribeProperties } from '@/lib/firestoreHelpers';
import { subscribePropertyLeads } from '@/lib/propertyLeads';
import type { PropertyLead } from '@/lib/propertyLeads';
import { formatINR } from '@/lib/formatPrice';
import { MapPin, MessageCircle, ChevronDown, ChevronRight, Plus, Building2 } from 'lucide-react';

interface UserProperty {
  id: string;
  title: string;
  type: string;
  area: string;
  location: string;
  price: number;
  price_label: string;
  status: string;
  images?: string[];
  createdAt?: { toDate?: () => Date };
}

export default function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<UserProperty[]>([]);
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const constraints = [where('uid', '==', user.uid), orderBy('createdAt', 'desc')];
    const unsub = subscribeProperties(
      (docs) => {
        const mapped = docs.map((d) => ({ id: d.id, ...d.data } as UserProperty));
        setProperties(mapped);
        setLoading(false);
      },
      () => setLoading(false),
      ...constraints,
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    const unsub = subscribePropertyLeads((allLeads) => {
      setLeads(allLeads);
    });
    return unsub;
  }, []);

  const propertyIds = useMemo(() => new Set(properties.map((p) => p.id)), [properties]);

  const leadsByProperty = useMemo(() => {
    const map = new Map<string, PropertyLead[]>();
    for (const lead of leads) {
      if (!propertyIds.has(lead.propertyId)) continue;
      const list = map.get(lead.propertyId);
      if (list) list.push(lead);
      else map.set(lead.propertyId, [lead]);
    }
    return map;
  }, [leads, propertyIds]);

  const totalEnquiries = useMemo(
    () => properties.reduce((sum, p) => sum + (leadsByProperty.get(p.id)?.length ?? 0), 0),
    [properties, leadsByProperty],
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
        <Navbar />
        <div className="pt-14 md:pt-16" />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded-lg bg-gray-200" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 rounded-2xl bg-gray-100" />
              <div className="h-24 rounded-2xl bg-gray-100" />
            </div>
            <div className="h-40 rounded-2xl bg-gray-100" />
            <div className="h-40 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
        <Navbar />
        <div className="pt-14 md:pt-16" />
        <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Building2 size={28} className="text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to view your listings</h1>
          <p className="mt-2 text-sm text-gray-500">You need to sign in to see your listed properties and enquiries.</p>
          <button
            type="button"
            onClick={() => navigate('/list-property')}
            className="mt-6 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition-all hover:bg-gray-800 active:scale-[0.97]"
          >
            Sign in & List Property
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fafafa] to-white">
      <Navbar />
      <div className="pt-14 md:pt-16">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Dashboard
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">My Listings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your listed properties and enquiries</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/list-property')}
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 active:scale-[0.97]"
            >
              <Plus size={14} />
              List New Property
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Properties</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{properties.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Enquiries</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{totalEnquiries}</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-gray-200/70 bg-white p-6 shadow-sm">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 shrink-0 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 w-3/4 rounded bg-gray-100" />
                      <div className="h-3 w-1/2 rounded bg-gray-100" />
                      <div className="h-3 w-1/3 rounded bg-gray-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="mt-12 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200">
                <Building2 size={28} className="text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">No listings yet</h2>
              <p className="mt-1 text-sm text-gray-500">You haven't listed any properties. Post your first listing to start receiving enquiries.</p>
              <button
                type="button"
                onClick={() => navigate('/list-property')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition-all hover:bg-gray-800 active:scale-[0.97]"
              >
                <Plus size={16} />
                List Your Property
              </button>
            </div>
          ) : (
            <div className="mt-8 space-y-4">
              {properties.map((p) => {
                const propertyLeads = leadsByProperty.get(p.id) ?? [];
                const isExpanded = expandedId === p.id;
                const img = p.images?.[0];
                const createdDate = p.createdAt?.toDate?.() ?? null;
                const dateStr = createdDate
                  ? createdDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : '';

                return (
                  <div key={p.id} className="rounded-2xl border border-gray-200/70 bg-white shadow-sm transition-all hover:shadow-md">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
                    >
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-24 sm:w-24">
                        {img ? (
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Building2 size={20} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{p.title || 'Untitled'}</h3>
                            <p className="mt-0.5 text-xs text-gray-500">{p.type}{p.area ? ` · ${p.area}` : ''}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-gray-900">{p.price_label || formatINR(p.price)}</p>
                            <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                              p.status === 'Ready' ? 'bg-emerald-50 text-emerald-700' :
                              p.status === 'Pending' ? 'bg-amber-50 text-amber-700' :
                              'bg-gray-50 text-gray-600'
                            }`}>
                              {p.status || 'Draft'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                          {p.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={11} />
                              {p.location}
                            </span>
                          )}
                          {dateStr && <span>Posted {dateStr}</span>}
                          <span className="inline-flex items-center gap-1 font-medium text-gray-600">
                            <MessageCircle size={11} />
                            {propertyLeads.length} {propertyLeads.length === 1 ? 'enquiry' : 'enquiries'}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 pt-1">
                        {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 px-5 pb-5 sm:px-6 sm:pb-6">
                        {propertyLeads.length === 0 ? (
                          <p className="pt-4 text-center text-xs text-gray-400">No enquiries received yet. Enquiries will appear here when buyers reach out.</p>
                        ) : (
                          <div className="pt-4 space-y-3">
                            <p className="text-xs font-semibold text-gray-900">{propertyLeads.length} {propertyLeads.length === 1 ? 'Enquiry' : 'Enquiries'}</p>
                            {propertyLeads.map((lead) => (
                              <div key={lead.id} className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{lead.buyerName || 'Anonymous'}</p>
                                    {lead.buyerPhone && (
                                      <a href={`tel:${lead.buyerPhone}`} className="mt-0.5 text-xs text-gray-500 hover:text-gray-700">
                                        {lead.buyerPhone}
                                      </a>
                                    )}
                                  </div>
                                  <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                    lead.status === 'new' ? 'bg-blue-50 text-blue-700' :
                                    lead.status === 'contacted' ? 'bg-amber-50 text-amber-700' :
                                    'bg-gray-50 text-gray-600'
                                  }`}>
                                    {lead.status}
                                  </span>
                                </div>
                                {lead.message && (
                                  <p className="mt-2 text-xs text-gray-500 leading-relaxed">{lead.message}</p>
                                )}
                                <p className="mt-2 text-[10px] text-gray-400">
                                  {lead.createdAt?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
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

          <div className="mt-6 text-center sm:hidden">
            <button
              type="button"
              onClick={() => navigate('/list-property')}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/25 transition-all hover:bg-gray-800 active:scale-[0.97]"
            >
              <Plus size={16} />
              List New Property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
