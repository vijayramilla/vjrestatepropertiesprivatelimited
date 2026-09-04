import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSupabaseData, subscribeSupabaseProperties, callDataProxy, deletePropertyAcrossStores } from '@/lib/supabaseData';
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

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const } },
};

interface Property {
  id: string;
  propertyCode?: string;
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
  const [idSearch, setIdSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const types = [
    'All Types',
    'PG Buildings',
    'Residential Rental Income',
    'Commercial Properties',
  ];

  const supabaseMode = useSupabaseData();

  useEffect(() => {
    if (supabaseMode) {
      const unsub = subscribeSupabaseProperties((docs) => {
        setProperties(docs.map(({ id, data }) => ({ id, ...data })) as Property[]);
        setLoading(false);
      });
      return () => unsub();
    }
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
      const matchesId =
        !idSearch || (p.propertyCode?.toLowerCase() ?? '').includes(idSearch.toLowerCase());
      const matchesType = typeFilter === 'All Types' || p.type === typeFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesId && matchesType && matchesStatus && !p.uid;
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
    setDeleteError('');
    try {
      await deletePropertyAcrossStores(deleteId);
      setDeleteId(null);
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError(error instanceof Error ? error.message : 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const openDelete = (id: string) => {
    setDeleteError('');
    setDeleteId(id);
  };

  const openBulkDelete = () => {
    setBulkDeleteError('');
    setBulkDeleteOpen(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (prev.size === filteredProperties.length) return new Set();
      return new Set(filteredProperties.map((p) => p.id));
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    setBulkDeleteError('');
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deletePropertyAcrossStores(id)),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        setBulkDeleteError(`${failed} of ${results.length} could not be deleted.`);
      } else {
        setSelectedIds(new Set());
        setBulkDeleteOpen(false);
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      setBulkDeleteError(error instanceof Error ? error.message : 'Bulk delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (id: string, featured: boolean) => {
    try {
      if (supabaseMode) {
        await callDataProxy('property.toggleFeatured', { id, featured });
      } else {
        await updateDoc(doc(db, 'properties', id), { featured: !featured });
      }
    } catch (error) {
      console.error('Update error:', error);
    }
  };

  const handleBackfillIds = async () => {
    setBackfilling(true);
    try {
      if (supabaseMode) {
        await callDataProxy('property.backfillCodes', {});
        return;
      }
      const allDocs = await getDocs(query(collection(db, 'properties')));
      let maxNum = 0;
      allDocs.forEach(d => {
        const code = d.data().propertyCode as string | undefined;
        if (code) {
          const m = code.match(/^VJR-(\d+)$/);
          if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
        }
      });
      const toUpdate = allDocs.docs.filter(d => !d.data().propertyCode && !d.data().uid);
      for (const d of toUpdate) {
        maxNum++;
        await updateDoc(doc(db, 'properties', d.id), {
          propertyCode: `VJR-${String(maxNum).padStart(4, '0')}`,
        });
      }
    } finally {
      setBackfilling(false);
    }
  };

  const adminProps = properties.filter((p) => !p.uid);
  const missingCodeCount = adminProps.filter((p) => !p.propertyCode).length;
  const stats = [
    { label: 'Total Properties', value: adminProps.length },
    { label: 'PG Buildings', value: adminProps.filter((p) => p.type === 'PG Buildings').length },
    {
      label: 'Rental Income',
      value: adminProps.filter((p) => p.type === 'Residential Rental Income').length,
    },
    { label: 'Commercial', value: adminProps.filter((p) => p.type === 'Commercial Properties').length },
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input-ghost"
          />
          <input
            type="search"
            placeholder="Search by ID..."
            value={idSearch}
            onChange={(e) => setIdSearch(e.target.value)}
            className="admin-input-ghost"
          />
          {missingCodeCount > 0 && (
            <button
              type="button"
              onClick={handleBackfillIds}
              disabled={backfilling}
              className="admin-btn-primary text-[11px] whitespace-nowrap"
            >
              {backfilling ? 'Assigning...' : `Assign IDs (${missingCodeCount})`}
            </button>
          )}
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
                <motion.article key={property.id} variants={fadeUp} className={`admin-card p-4 ${selectedIds.has(property.id) ? 'ring-2 ring-blue-400' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(property.id)}
                        onChange={() => toggleSelect(property.id)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-black"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-mono text-gray-400">
                          {property.propertyCode}
                        </p>
                        <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-black">
                          {property.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {property.type} · {property.area}
                        </p>
                      </div>
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
                      onClick={() => openDelete(property.id)}
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
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={filteredProperties.length > 0 && selectedIds.size === filteredProperties.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                  />
                </div>
                <p className="col-span-1">ID</p>
                <p className="col-span-1">Title</p>
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
                  className={`grid grid-cols-12 gap-4 border-b border-gray-50 px-5 py-3.5 transition-colors last:border-0 hover:bg-gray-50/40 ${selectedIds.has(property.id) ? 'bg-blue-50/60' : ''}`}
                >
                  <div className="col-span-1 flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(property.id)}
                      onChange={() => toggleSelect(property.id)}
                      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-black"
                    />
                  </div>
                  <p className="col-span-1 truncate text-[11px] font-mono text-gray-500">{property.propertyCode}</p>
                  <p className="col-span-1 truncate text-sm font-medium text-black">{property.title}</p>
                  <div className="col-span-1">
                    <p className="text-xs text-gray-800">{property.type}</p>
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
                  <div className="col-span-1 min-w-0">
                    <p className="truncate text-xs font-medium text-gray-800">{property.userDisplayName || '—'}</p>
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
                      onClick={() => openDelete(property.id)}
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
              {deleteError && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                  {deleteError}
                </p>
              )}
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

      {/* Bulk delete floating bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
              <span className="text-sm font-medium text-gray-700">
                <span className="font-bold text-black">{selectedIds.size}</span>{' '}
                {selectedIds.size === 1 ? 'property' : 'properties'} selected
              </span>
              <div className="h-5 w-px bg-gray-200" />
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-gray-500 hover:text-black transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={openBulkDelete}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700"
              >
                <Trash size={15} />
                Delete {selectedIds.size === 1 ? 'Property' : 'Properties'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk delete confirmation modal */}
      <AnimatePresence>
        {bulkDeleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !deleting && setBulkDeleteOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
            >
              <h3 className="admin-heading text-xl font-medium text-black sm:text-2xl">
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'Property' : 'Properties'}?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:mt-4">
                This action cannot be undone. All selected properties will be permanently removed.
              </p>
              {bulkDeleteError && (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200">
                  {bulkDeleteError}
                </p>
              )}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:mt-8 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={() => setBulkDeleteOpen(false)}
                  disabled={deleting}
                  className="admin-btn-secondary flex-1 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={deleting}
                  className="flex-1 min-h-[44px] rounded-xl bg-red-600 px-5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : `Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'Property' : 'Properties'}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
