import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck } from '@phosphor-icons/react';
import { AdminBadge } from '@/components/admin/AdminUi';
import type { PgData } from '@/pages/admin/AdminPgManagement';
import {
  complianceAlerts,
  healthGrade,
  COMPLIANCE_CATALOG,
  VJR_RERA_NUMBER,
  daysUntil,
  updateProperty,
  type PgProperty,
  type PgComplianceItem,
} from '@/lib/pgManagement';

const STATUS_STYLES: Record<PgComplianceItem['status'], { badge: 'success' | 'default' | 'muted'; dot: string; label: string }> = {
  valid: { badge: 'success', dot: 'bg-emerald-500', label: 'Valid' },
  expiring: { badge: 'default', dot: 'bg-amber-500', label: 'Expiring' },
  expired: { badge: 'muted', dot: 'bg-red-500', label: 'Expired' },
  missing: { badge: 'muted', dot: 'bg-gray-300', label: 'Missing' },
};

const NO_EXPIRY: PgComplianceItem['category'][] = ['occupancy_cert', 'rera', 'police_verification', 'utility'];

export default function PgComplianceTab({ data }: { data: PgData }) {
  const [selected, setSelected] = useState<string | null>(null);

  const property = useMemo(
    () => data.properties.find((p) => p.id === selected) ?? data.properties[0] ?? null,
    [data.properties, selected],
  );

  if (data.loading) return <div className="admin-card h-40 animate-pulse bg-gray-100/70" />;

  if (data.properties.length === 0) {
    return (
      <div className="admin-card p-8 text-center text-sm text-gray-500">
        Add a managed property first — compliance items attach to the property master record.
      </div>
    );
  }

  const portfolioAlerts = data.properties.flatMap((p) => complianceAlerts(p).map((a) => ({ property: p, ...a })));

  return (
    <div className="space-y-6">
      {/* Portfolio-wide expiring/expired red flag list */}
      <div className="admin-card p-5 sm:p-6">
        <h3 className="admin-section-title">Portfolio compliance dashboard</h3>
        {portfolioAlerts.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <CalendarCheck size={17} weight="fill" />
            Every licence across the portfolio is valid — auto-alerts fire 45 and 15 days before each expiry.
          </p>
        ) : (
          <div className="space-y-2.5">
            {portfolioAlerts.map(({ property: p, item, days, level }) => (
              <motion.div
                key={`${p.id}-${item.id}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border p-3.5 ${
                  level === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'
                }`}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${level === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <p className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold text-[#0A1628]">{item.name}</span>
                  <span className="text-gray-500"> · {p.name}</span>
                </p>
                <AdminBadge variant={level === 'critical' ? 'muted' : 'default'}>
                  {days <= 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                </AdminBadge>
              </motion.div>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
          Renewal reminders are sent at 45 and 15 days before expiry. BBMP trade licences must be renewed within
          30 days of expiry; FSSAI is required within 3 months of trade licence when the PG runs a kitchen.
        </p>
      </div>

      {/* Property switcher */}
      <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1.5">
          {data.properties.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`admin-chip ${property?.id === p.id ? 'admin-chip-active' : 'admin-chip-idle'}`}
            >
              {p.locality}
            </button>
          ))}
        </div>
      </div>

      {property && <PropertyCompliance key={property.id} property={property} />}
    </div>
  );
}

function PropertyCompliance({ property }: { property: PgProperty }) {
  const items = property.compliance ?? [];
  const [savingId, setSavingId] = useState<string | null>(null);

  const markRenewed = async (item: PgComplianceItem) => {
    setSavingId(item.id);
    try {
      const next: PgComplianceItem = {
        ...item,
        status: 'valid',
        issuedOn: new Date().toISOString().slice(0, 10),
        expiresOn: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
      };
      const compliance = items.map((c) => (c.id === item.id ? next : c));
      await updateProperty(property.id, { compliance });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
      <HealthRingCard property={property} />
      <div className="admin-card p-5 sm:p-6">
        <h3 className="admin-section-title">Licences &amp; statutory items</h3>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">
            No compliance items recorded. They are generated automatically from the Bangalore catalogue when a
            property is seeded or onboarded.
          </p>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
              const style = STATUS_STYLES[item.status];
              const days = daysUntil(item.expiresOn);
              const catalog = COMPLIANCE_CATALOG.find((c) => c.category === item.category);
              const noExpiry = NO_EXPIRY.includes(item.category);
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-[#C9A84C]/40"
                >
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#0A1628]">{item.name}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{catalog?.description ?? item.note}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium tabular-nums text-gray-700">
                      {item.issuedOn ? `Issued ${item.issuedOn}` : 'Not issued'}
                    </p>
                    <p className="text-[11px] tabular-nums text-gray-500">
                      {noExpiry ? 'Standing obligation — no expiry' : `Expires ${item.expiresOn} (${days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`})`}
                    </p>
                  </div>
                  <AdminBadge variant={style.badge}>{style.label}</AdminBadge>
                  {item.status !== 'valid' && (
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => markRenewed(item)}
                      className="admin-btn-secondary !min-h-[34px] !px-3 !text-[10px]"
                    >
                      {savingId === item.id ? '…' : 'Mark renewed'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 rounded-xl border border-[#C9A84C]/30 bg-[#FBF7EC] p-4">
          <p className="text-xs leading-relaxed text-gray-700">
            <span className="font-semibold text-[#0A1628]">VJR Estate RERA (managing agent):</span> {VJR_RERA_NUMBER} — displayed
            on every owner-facing statement and portal page, as required for agents managing rental transactions in Karnataka.
          </p>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
          Statutory helplines mirrored digitally on every PG notice board: BBMP helpline 1533 · Police 101 · Fire &amp; Emergency 108.
          Every compliance status change is written to the audit trail with actor and timestamp.
        </p>
      </div>
    </div>
  );
}

function HealthRingCard({ property }: { property: PgProperty }) {
  const score = useMemo(() => {
    const mandatory = COMPLIANCE_CATALOG.filter((c) => c.mandatory({ hasKitchen: property.hasKitchen }));
    if (mandatory.length === 0) return 0;
    const perItem = 100 / mandatory.length;
    let s = 0;
    for (const m of mandatory) {
      const item = (property.compliance ?? []).find((c) => c.category === m.category);
      if (!item) continue;
      if (item.status === 'valid') s += perItem;
      else if (item.status === 'expiring') s += perItem * 0.6;
    }
    return Math.round(s);
  }, [property]);

  const grade = healthGrade(score);
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="admin-card flex flex-col items-center p-6 text-center">
      <p className="admin-stat-label self-start">Compliance Health Score</p>
      <div className="relative mt-4">
        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={R} fill="none" stroke="#efefea" strokeWidth="12" />
          <motion.circle
            cx="70"
            cy="70"
            r={R}
            fill="none"
            stroke={score >= 85 ? '#059669' : score >= 60 ? '#C9A84C' : '#dc2626'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={{ strokeDashoffset: C }}
            animate={{ strokeDashoffset: C - (C * score) / 100 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-semibold tabular-nums text-[#0A1628]">{score}</p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-gray-400">/ 100</p>
        </div>
      </div>
      <div className="mt-3">
        <AdminBadge variant={grade.variant}>{grade.label}</AdminBadge>
      </div>
      <p className="mt-3 text-xs font-medium text-gray-600">{property.name}</p>
      <p className="mt-4 text-[11px] leading-relaxed text-gray-400">
        The sellable trust metric — owners see this score on their portal dashboard next to every licence expiry.
      </p>
    </div>
  );
}
