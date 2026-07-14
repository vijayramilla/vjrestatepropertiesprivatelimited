import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminEmptyState,
  AdminFilterRow,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
  AdminBadge,
} from '@/components/admin/AdminUi';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash, NotePencil, Plus } from 'phosphor-react';
import { useGoogleMapsLoader } from '@/context/GoogleMapsContext';

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

interface Property {
  id: string;
  title: string;
  type: string;
  commercial_subtype?: string;
  plot_subtype?: string;
  area: string;
  price: number;
  price_label: string;
  monthly_rental: number;
  monthly_rental_label: string;
  featured: boolean;
  status: string;
  uid?: string;
  userEmail?: string;
  userDisplayName?: string;
  createdAt?: { toDate?: () => Date };
}

function FeaturedToggle({
  featured,
  onToggle,
}: {
  featured: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`admin-toggle ${featured ? 'admin-toggle-on' : 'admin-toggle-off'}`}
      aria-label={featured ? 'Remove from featured' : 'Mark as featured'}
    >
      <span
        className="admin-toggle-knob"
        style={{ transform: featured ? 'translateX(22px)' : 'translateX(4px)' }}
      />
    </button>
  );
}

export default function AdminPropertiesList() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded, loadError } = useGoogleMapsLoader();

  useEffect(() => {
    if (!isLoaded || loadError || !inputRef.current) return;
    try {
      const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        setSearch(place?.formatted_address ?? '');
      });
    } catch { /* google maps unavailable */ }
  }, [isLoaded, loadError]);

  const types = [
    'All Types',
    'PG Buildings',
    'Residential Rental Income',
    'Commercial Properties',
    'Residential Plot',
    'Commercial Plot',
    'JD Land',
  ];

  useEffect(() => {
    const q = query(collection(db, 'properties'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Property[];
      setProperties(docs);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredProperties = properties
    .filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.area.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All Types' || p.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus && !p.uid;
    })
    .sort((a, b) => {
      if (sortBy === 'Newest')
        return new Date(b.createdAt?.toDate?.() ?? 0).getTime() - new Date(a.createdAt?.toDate?.() ?? 0).getTime();
      if (sortBy === 'Price ↑') return a.price - b.price;
      if (sortBy === 'Price ↓') return b.price - a.price;
      if (sortBy === 'Rental ↓') return (b.monthly_rental || 0) - (a.monthly_rental || 0);
      return 0;
    });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'properties', deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    try {
      await updateDoc(doc(db, 'properties', id), { featured: !featured });
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const adminProps = properties.filter((p) => !p.uid);
  const stats = [
    { label: 'Total Properties', value: adminProps.length },
    { label: 'PG Buildings', value: adminProps.filter((p) => p.type === 'PG Buildings').length },
    {
      label: 'Rental Income',
      value: adminProps.filter((p) => p.type === 'Residential Rental Income').length,
    },
    { label: 'Plots', value: adminProps.filter((p) => p.type.includes('Plot')).length },
  ];

  return (
    <AdminLayout title="Properties">
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Portfolio"
          title="Properties"
          description="Manage listings, featured homes, and property details across Bangalore."
        />

        <AdminStatGrid>
          {stats.map((stat) => (
            <AdminStatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </AdminStatGrid>

        <AdminToolbar>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search by title or locality..."
            className="admin-input-ghost"
          />
          <AdminFilterRow>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="admin-select sm:min-w-[140px] sm:flex-1"
            >
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-select sm:min-w-[120px] sm:flex-1"
            >
              <option value="All">All Status</option>
              <option value="Ready">Ready</option>
              <option value="New Launch">New Launch</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="admin-select sm:min-w-[120px] sm:flex-1"
            >
              <option value="Newest">Newest</option>
              <option value="Price ↑">Price ↑</option>
              <option value="Price ↓">Price ↓</option>
              <option value="Rental ↓">Rental ↓</option>
            </select>
          </AdminFilterRow>
        </AdminToolbar>

        {loading ? (
          <AdminSkeletonList count={5} />
        ) : filteredProperties.length === 0 ? (
          <AdminEmptyState
            title="No Properties Yet"
            description="Add your first property to get started. Listings appear here and on the public website."
            action={
              <button
                type="button"
                onClick={() => navigate('/admin/properties/new')}
                className="admin-btn-primary gap-2"
              >
                <Plus size={16} />
                Add Property
              </button>
            }
          />
        ) : (
          <>
            <motion.div variants={container} initial="initial" animate="animate" className="space-y-3 md:hidden">
              {filteredProperties.map((property) => (
                <motion.article key={property.id} variants={fadeUp} className="admin-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-black">
                        {property.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        {property.type} · {property.area}
                      </p>
                    </div>
                    <AdminBadge variant={property.status === 'Ready' ? 'success' : 'muted'}>
                      {property.status}
                    </AdminBadge>
                  </div>
                  {property.userDisplayName && (
                    <p className="mt-2 text-xs text-gray-500">
                      Listed by <span className="font-medium text-gray-700">{property.userDisplayName}</span>
                    </p>
                  )}

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-black">{property.price_label}</p>
                      <p className="text-xs text-gray-500">{property.monthly_rental_label || '—'}</p>
                    </div>
                    <label className="flex shrink-0 flex-col items-center gap-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                        Featured
                      </span>
                      <FeaturedToggle
                        featured={property.featured}
                        onToggle={() => handleToggleFeatured(property.id, property.featured)}
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/properties/${property.id}/edit`)}
                      className="admin-btn-secondary min-h-[44px] text-[11px]"
                    >
                      <NotePencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(property.id)}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-gray-100 text-[11px] font-semibold uppercase tracking-wide text-black transition-colors hover:bg-gray-200"
                    >
                      <Trash size={14} />
                      Delete
                    </button>
                  </div>
                </motion.article>
              ))}
            </motion.div>

              <motion.div variants={container} initial="initial" animate="animate" className="admin-card hidden overflow-hidden md:block">
              <div className="grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50/50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                <p className="col-span-2">Title</p>
                <p className="col-span-1">Type</p>
                <p className="col-span-1">Area</p>
                <p className="col-span-1">Price</p>
                <p className="col-span-1">Monthly</p>
                <p className="col-span-1">Status</p>
                <p className="col-span-1">Featured</p>
                <p className="col-span-2">Listed By</p>
                <p className="col-span-1">Actions</p>
              </div>

              {filteredProperties.map((property) => (
                <motion.div
                  key={property.id}
                  variants={fadeUp}
                  className="grid grid-cols-12 gap-4 border-b border-gray-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-gray-50/40"
                >
                  <p className="col-span-3 truncate text-sm font-medium text-black">{property.title}</p>
                  <div className="col-span-1">
                    <p className="text-xs text-gray-800">{property.type}</p>
                    {property.commercial_subtype && (
                      <p className="text-[10px] text-gray-500">{property.commercial_subtype}</p>
                    )}
                  </div>
                  <p className="col-span-1 text-xs text-gray-800">{property.area}</p>
                  <p className="col-span-1 text-sm text-black">{property.price_label}</p>
                  <p className="col-span-1 text-sm text-black">{property.monthly_rental_label}</p>
                  <div className="col-span-1">
                    <AdminBadge variant={property.status === 'Ready' ? 'success' : 'muted'}>
                      {property.status}
                    </AdminBadge>
                  </div>
                  <div className="col-span-1 flex items-center">
                    <FeaturedToggle
                      featured={property.featured}
                      onToggle={() => handleToggleFeatured(property.id, property.featured)}
                    />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="truncate text-xs font-medium text-gray-800">{property.userDisplayName || '—'}</p>
                    {property.userEmail && (
                      <p className="truncate text-[10px] text-gray-500">{property.userEmail}</p>
                    )}
                  </div>
                  <div className="col-span-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/properties/${property.id}/edit`)}
                      className="admin-btn-secondary !min-h-[36px] !px-3 !text-[10px]"
                    >
                      <NotePencil size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(property.id)}
                      className="flex items-center gap-1 rounded-xl border border-gray-300 px-3 py-1 text-[10px] font-semibold uppercase text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      <Trash size={12} />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AdminPageShell>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <h3 className="admin-heading text-xl font-medium text-black sm:text-2xl">
                Delete Property?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:mt-4">
                This action cannot be undone. The property will be permanently removed.
              </p>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="admin-btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 min-h-[44px] rounded-xl bg-black px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
