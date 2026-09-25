import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Buildings,
  ShieldCheck,
  Users,
  Receipt,
  Binoculars,
  Wrench,
  Warning,
  ArrowsCounterClockwise,
} from '@phosphor-icons/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminPageShell,
  AdminPageHeader,
  AdminStatCard,
  AdminStatGrid,
  AdminBadge,
} from '@/components/admin/AdminUi';
import {
  subscribeProperties,
  subscribeTenants,
  subscribeInvoices,
  subscribeComplaints,
  subscribePayouts,
  subscribeVisitors,
  subscribeNotices,
  subscribeMenu,
  subscribeShifts,
  seedDemoDataIfEmpty,
  complianceHealthScore,
  complianceAlerts,
  occupancyPct,
  monthlyManagementFee,
  money,
  type PgProperty,
  type PgTenant,
  type PgInvoice,
  type PgComplaint,
  type PgPayout,
  type PgVisitor,
  type PgNotice,
  type PgMenuDay,
  type PgShift,
} from '@/lib/pgManagement';
import PgPropertiesTab from '@/components/pg/PgPropertiesTab';
import PgComplianceTab from '@/components/pg/PgComplianceTab';
import PgTenantsTab from '@/components/pg/PgTenantsTab';
import PgRentTab from '@/components/pg/PgRentTab';
import PgOpsTab from '@/components/pg/PgOpsTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: Binoculars },
  { key: 'properties', label: 'Properties & Beds', icon: Buildings },
  { key: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { key: 'tenants', label: 'Tenants', icon: Users },
  { key: 'rent', label: 'Rent & Payouts', icon: Receipt },
  { key: 'ops', label: 'Complaints & PG Ops', icon: Wrench },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export interface PgData {
  properties: PgProperty[];
  tenants: PgTenant[];
  invoices: PgInvoice[];
  complaints: PgComplaint[];
  payouts: PgPayout[];
  visitors: PgVisitor[];
  notices: PgNotice[];
  menu: PgMenuDay[];
  shifts: PgShift[];
  loading: boolean;
}

export default function AdminPgManagement() {
  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<PgData>({
    properties: [],
    tenants: [],
    invoices: [],
    complaints: [],
    payouts: [],
    visitors: [],
    notices: [],
    menu: [],
    shifts: [],
    loading: true,
  });
  const [seeding, setSeeding] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await seedDemoDataIfEmpty();
      } catch (e) {
        console.error('PG seed failed:', e);
      }
    })();
    const unsubs = [
      subscribeProperties(
        (properties) => alive && setData((d) => ({ ...d, properties, loading: false })),
        () => alive && setData((d) => ({ ...d, loading: false })),
      ),
      subscribeTenants((tenants) => alive && setData((d) => ({ ...d, tenants }))),
      subscribeInvoices((invoices) => alive && setData((d) => ({ ...d, invoices }))),
      subscribeComplaints((complaints) => alive && setData((d) => ({ ...d, complaints }))),
      subscribePayouts((payouts) => alive && setData((d) => ({ ...d, payouts }))),
      subscribeVisitors((visitors) => alive && setData((d) => ({ ...d, visitors }))),
      subscribeNotices((notices) => alive && setData((d) => ({ ...d, notices }))),
      subscribeMenu((menu) => alive && setData((d) => ({ ...d, menu }))),
      subscribeShifts((shifts) => alive && setData((d) => ({ ...d, shifts }))),
    ];
    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, []);

  const stats = useMemo(() => {
    const { properties, tenants, invoices } = data;
    const totalBeds = properties.reduce((s, p) => s + p.totalBeds, 0);
    const occupied = properties.reduce((s, p) => s + p.occupiedBeds, 0);
    const occupancy = totalBeds ? Math.round((occupied / totalBeds) * 100) : 0;
    const collected = properties.reduce((s, p) => s + p.monthlyCollected, 0);
    const feeIncome = properties.reduce((s, p) => s + monthlyManagementFee(p), 0);
    const activeAlerts = properties.reduce((s, p) => s + complianceAlerts(p).length, 0);
    const pendingKyC = tenants.filter((t) => t.kycStatus === 'pending' || t.policeVerification === 'pending').length;
    const overdue = invoices.filter((i) => i.status === 'overdue' || i.status === 'bounced').length;
    return { totalBeds, occupied, occupancy, collected, feeIncome, activeAlerts, pendingKyC, overdue, count: properties.length };
  }, [data]);

  const handleReseed = async () => {
    setSeeding(true);
    try {
      await seedDemoDataIfEmpty();
    } finally {
      setSeeding(false);
    }
  };

  const tabProps = { data, selectedPropertyId, onSelectProperty: setSelectedPropertyId };

  return (
    <AdminLayout title="PG Building Management">
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Bangalore Operations"
          title="PG Building Management"
          description="Portfolio of managed PGs, co-living and rental blocks — bed-level occupancy, Karnataka compliance, tenant lifecycle, rent and owner payouts."
        />

        <AdminStatGrid>
          <AdminStatCard label="Managed Properties" value={stats.count} />
          <AdminStatCard label="Occupancy" value={`${stats.occupancy}% · ${stats.occupied}/${stats.totalBeds} beds`} />
          <AdminStatCard label="Rent Collected (MTD)" value={`₹${money(stats.collected)}`} />
          <AdminStatCard label="VJR Fee Income (MTD)" value={`₹${money(stats.feeIncome)}`} />
        </AdminStatGrid>

        {(stats.activeAlerts > 0 || stats.pendingKyC > 0 || stats.overdue > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card mb-6 flex flex-wrap items-center gap-3 border-l-4 border-l-amber-500 p-4"
          >
            <Warning size={20} weight="fill" className="shrink-0 text-amber-500" />
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-[#0A1628]">{stats.activeAlerts}</span> compliance
              alert{stats.activeAlerts === 1 ? '' : 's'} ·{' '}
              <span className="font-semibold text-[#0A1628]">{stats.pendingKyC}</span> pending KYC /
              police verification · <span className="font-semibold text-[#0A1628]">{stats.overdue}</span>{' '}
              overdue / bounced invoice{stats.overdue === 1 ? '' : 's'}
            </p>
            <button
              type="button"
              onClick={() => setTab('compliance')}
              className="admin-btn-secondary ml-auto !min-h-[36px] !px-3 !text-[10px]"
            >
              Review
            </button>
          </motion.div>
        )}

        {/* Tab bar — scrollable on mobile */}
        <div className="mb-6 -mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-1.5 rounded-2xl border border-[var(--admin-border)] bg-white p-1.5 sm:min-w-0">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`relative flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4 ${
                  tab === key ? 'text-white' : 'text-gray-500 hover:bg-[#FBF7EC] hover:text-[#0A1628]'
                }`}
              >
                {tab === key && (
                  <motion.span
                    layoutId="pg-tab-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#12294a] to-[#0A1628]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={15} weight={tab === key ? 'fill' : 'regular'} className="relative z-10" />
                <span className="relative z-10">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'overview' && <PgOverview stats={stats} data={data} onSelectProperty={(id) => { setSelectedPropertyId(id); setTab('properties'); }} onReseed={handleReseed} seeding={seeding} />}
            {tab === 'properties' && <PgPropertiesTab {...tabProps} />}
            {tab === 'compliance' && <PgComplianceTab data={data} />}
            {tab === 'tenants' && <PgTenantsTab data={data} />}
            {tab === 'rent' && <PgRentTab data={data} />}
            {tab === 'ops' && <PgOpsTab data={data} />}
          </motion.div>
        </AnimatePresence>
      </AdminPageShell>
    </AdminLayout>
  );
}

/* ───────────────────── Overview tab ───────────────────── */

function PgOverview({
  stats,
  data,
  onSelectProperty,
  onReseed,
  seeding,
}: {
  stats: { occupancy: number; collected: number; feeIncome: number; activeAlerts: number; count: number };
  data: PgData;
  onSelectProperty: (id: string) => void;
  onReseed: () => void;
  seeding: boolean;
}) {
  const { properties, complaints } = data;

  if (data.loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="admin-card h-28 animate-pulse bg-gray-100/70" />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="admin-card flex flex-col items-center px-6 py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#C9A84C]/10 text-[#96782A]">
          <Buildings size={26} />
        </div>
        <p className="admin-heading text-xl font-semibold text-[#0A1628]">No managed properties yet</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
          Load a realistic Bangalore demo portfolio (Indiranagar PG with 3 floors of beds) to explore the
          module, or add your first managed building.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onReseed} disabled={seeding} className="admin-btn-primary">
            <ArrowsCounterClockwise size={15} />
            {seeding ? 'Loading…' : 'Load Demo Portfolio'}
          </button>
          <button type="button" onClick={() => onSelectProperty('new')} className="admin-btn-secondary">
            Add Property
          </button>
        </div>
      </div>
    );
  }

  const openComplaints = complaints.filter((c) => c.status !== 'Resolved');
  const avgHealth = properties.length
    ? Math.round(properties.reduce((s, p) => s + complianceHealthScore(p), 0) / properties.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="admin-card p-5">
          <p className="admin-stat-label">Portfolio Compliance Health</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="admin-stat-value">{avgHealth}</p>
            <AdminBadge variant={avgHealth >= 85 ? 'success' : avgHealth >= 60 ? 'default' : 'muted'}>
              {avgHealth >= 85 ? 'Excellent' : avgHealth >= 60 ? 'Good' : 'At Risk'}
            </AdminBadge>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${avgHealth}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-[#C9A84C] to-[#96782A]"
            />
          </div>
        </div>
        <div className="admin-card p-5">
          <p className="admin-stat-label">Open Complaints</p>
          <p className="admin-stat-value mt-2">{openComplaints.length}</p>
          <p className="mt-2 text-xs text-gray-500">
            {openComplaints.filter((c) => c.ownerApprovalRequired).length} awaiting owner approval
          </p>
        </div>
        <div className="admin-card p-5">
          <p className="admin-stat-label">Portfolio Occupancy</p>
          <p className="admin-stat-value mt-2">{stats.occupancy}%</p>
          <p className="mt-2 text-xs text-gray-500">{stats.count} properties under management</p>
        </div>
      </div>

      <div>
        <h3 className="admin-section-title">Properties under management</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {properties.map((p) => {
            const health = complianceHealthScore(p);
            const alerts = complianceAlerts(p);
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onSelectProperty(p.id)}
                whileHover={{ y: -3 }}
                className="admin-card p-5 text-left transition-shadow hover:shadow-[0_16px_40px_-18px_rgba(10,22,40,0.3)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-[#0A1628]">{p.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.gender} · {p.locality}
                    </p>
                  </div>
                  <AdminBadge variant={health >= 85 ? 'success' : health >= 60 ? 'default' : 'muted'}>
                    Health {health}
                  </AdminBadge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-[#FBF9F3] p-2.5">
                    <p className="text-lg font-semibold tabular-nums text-[#0A1628]">{occupancyPct(p)}%</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Occupied</p>
                  </div>
                  <div className="rounded-xl bg-[#FBF9F3] p-2.5">
                    <p className="text-lg font-semibold tabular-nums text-[#0A1628]">₹{money(p.monthlyCollected)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">Collected</p>
                  </div>
                  <div className="rounded-xl bg-[#FBF9F3] p-2.5">
                    <p className="text-lg font-semibold tabular-nums text-[#0A1628]">₹{money(monthlyManagementFee(p))}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-500">VJR Fee</p>
                  </div>
                </div>
                {alerts.length > 0 ? (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                    <Warning size={13} weight="fill" />
                    {alerts.length} licence alert{alerts.length === 1 ? '' : 's'} — next:{' '}
                    {alerts[0].item.name} ({alerts[0].days <= 0 ? 'expired' : `${alerts[0].days}d`})
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-medium text-emerald-600">All licences valid</p>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
