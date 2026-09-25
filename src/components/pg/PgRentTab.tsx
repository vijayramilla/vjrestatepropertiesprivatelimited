import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Receipt, Warning, FileText, Lock } from '@phosphor-icons/react';
import { AdminBadge, AdminStatCard, AdminStatGrid } from '@/components/admin/AdminUi';
import type { PgData } from '@/pages/admin/AdminPgManagement';
import {
  monthlyManagementFee,
  platformFee,
  feeGst,
  money,
  THIS_MONTH,
  buildDemoPayout,
  addPayout,
  updateInvoice,
  updatePayout,
  type PgInvoice,
  type PgProperty,
} from '@/lib/pgManagement';

const METHOD_LABEL: Record<string, string> = {
  UPI: 'UPI',
  Card: 'Card',
  NetBanking: 'Net banking',
  Cheque: 'PDC / Cheque',
  NACH: 'NACH mandate',
  Cash: 'Cash',
};

export default function PgRentTab({ data }: { data: PgData }) {
  const [tab, setTab] = useState<'invoices' | 'payouts'>('invoices');

  const invoiceStats = useMemo(() => {
    const monthInvoices = data.invoices.filter((i) => i.month === THIS_MONTH);
    const billed = monthInvoices.reduce((s, i) => s + i.total, 0);
    const collected = monthInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const overdue = monthInvoices.filter((i) => i.status === 'overdue' || i.status === 'bounced');
    return { billed, collected, overdue: overdue.length, count: monthInvoices.length };
  }, [data.invoices]);

  return (
    <div className="space-y-5">
      <AdminStatGrid>
        <AdminStatCard label="Billed (this month)" value={`₹${money(invoiceStats.billed)}`} />
        <AdminStatCard label="Collected" value={`₹${money(invoiceStats.collected)}`} />
        <AdminStatCard label="Overdue / bounced" value={invoiceStats.overdue} />
        <AdminStatCard label="Invoices issued" value={invoiceStats.count} />
      </AdminStatGrid>

      <div className="flex gap-1.5">
        {(['invoices', 'payouts'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`admin-chip ${tab === t ? 'admin-chip-active' : 'admin-chip-idle'}`}
          >
            {t === 'invoices' ? 'Tenant invoices' : 'Owner payout statements'}
          </button>
        ))}
      </div>

      {tab === 'invoices' ? <InvoiceTable invoices={data.invoices} /> : <PayoutBuilder data={data} />}
    </div>
  );
}

/* ───────────────── Tenant invoices ───────────────── */

function InvoiceTable({ invoices }: { invoices: PgInvoice[] }) {
  const sorted = useMemo(
    () =>
      [...invoices].sort((a, b) => {
        const rank = { bounced: 0, overdue: 1, pending: 2, partial: 3, paid: 4 } as Record<string, number>;
        return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      }),
    [invoices],
  );

  const setInvoice = async (inv: PgInvoice, patch: Partial<PgInvoice>) => {
    await updateInvoice(inv.id, patch);
  };

  if (sorted.length === 0) {
    return (
      <div className="admin-card p-8 text-center text-sm text-gray-500">
        No invoices yet. Invoices generate automatically each cycle per tenant/bed with due dates and
        utility apportionment.
      </div>
    );
  }

  return (
    <div className="admin-card overflow-hidden">
      <div className="hidden grid-cols-[1.4fr_1fr_repeat(3,minmax(90px,0.8fr))_1fr_150px] gap-4 border-b border-gray-100 bg-[#FBF9F3] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500 md:grid">
        <p>Tenant</p>
        <p>Period</p>
        <p className="text-right">Rent</p>
        <p className="text-right">Utilities</p>
        <p className="text-right">Total</p>
        <p>Method</p>
        <p className="text-right">Action</p>
      </div>
      {sorted.map((inv) => (
        <motion.div
          key={inv.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-3 border-b border-gray-50 px-5 py-4 last:border-0 md:grid-cols-[1.4fr_1fr_repeat(3,minmax(90px,0.8fr))_1fr_150px] md:items-center md:gap-4"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#0A1628]">{inv.tenantName}</p>
            <p className="text-[11px] text-gray-500">
              Due {inv.dueDate}
              {inv.method && ` · ${METHOD_LABEL[inv.method] ?? inv.method}`}
            </p>
            {/* Mobile detail row */}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600 md:hidden">
              <span>Rent ₹{money(inv.rent)}</span>
              <span>Util ₹{money(inv.utilities)}</span>
              <span className="font-semibold text-[#0A1628]">Total ₹{money(inv.total)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">{inv.month}</p>
          <p className="hidden text-right text-sm tabular-nums text-gray-700 md:block">₹{money(inv.rent)}</p>
          <p className="hidden text-right text-sm tabular-nums text-gray-700 md:block">₹{money(inv.utilities)}</p>
          <p className="hidden text-right text-sm font-semibold tabular-nums text-[#0A1628] md:block">₹{money(inv.total)}</p>
          <p className="hidden text-xs text-gray-600 md:block">{METHOD_LABEL[inv.method ?? ''] ?? '—'}</p>
          <div className="flex items-center justify-between gap-2 md:justify-end">
            {inv.status === 'bounced' && (
              <AdminBadge variant="muted">
                <Warning size={11} weight="fill" /> Cheque bounced
              </AdminBadge>
            )}
            {inv.status !== 'paid' ? (
              <button
                type="button"
                onClick={() =>
                  setInvoice(inv, {
                    status: 'paid',
                    paidOn: new Date().toISOString().slice(0, 10),
                  })
                }
                className="admin-btn-primary !min-h-[34px] !px-3 !text-[10px]"
              >
                Mark paid
              </button>
            ) : (
              <AdminBadge variant="success">Paid {inv.paidOn}</AdminBadge>
            )}
          </div>
        </motion.div>
      ))}
      <p className="px-5 py-3.5 text-[11px] leading-relaxed text-gray-400">
        Late fee applies per property rule after due date. Bounced cheques/NACH create an automatic follow-up
        task for the warden. Utilities (electricity, water, maintenance) are apportioned per bed on shared rooms.
        Security deposits are tracked in a separate ledger from rent.
      </p>
    </div>
  );
}

/* ───────────────── Owner payout statements ───────────────── */

function PayoutBuilder({ data }: { data: PgData }) {
  const [month, setMonth] = useState(THIS_MONTH);
  const [creating, setCreating] = useState<string | null>(null);
  const payouts = data.payouts ?? [];

  const marginFor = (p: PgProperty) => Math.round((6400 * p.feeConfig.maintenanceMarginPct) / 100);

  const generate = async (propertyId: string) => {
    const property = data.properties.find((p) => p.id === propertyId);
    if (!property) return;
    setCreating(propertyId);
    try {
      await addPayout({ ...buildDemoPayout(property, month), month });
    } finally {
      setCreating(null);
    }
  };

  const markPaid = async (id: string) => {
    await updatePayout(id, { status: 'paid', paidOn: new Date().toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-5">
      <div className="admin-card flex flex-wrap items-center gap-3 p-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <Lock size={14} className="text-[#96782A]" /> Statement month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="admin-input !w-auto" />
        </label>
        <p className="ml-auto text-[11px] leading-relaxed text-gray-400">
          Format mirrors what owners expect: rent collected − operator fee − VJR Estate coordination fee
          (with 18% GST invoices) − maintenance cost − disclosed margin = net payout.
        </p>
      </div>

      {/* Per-property generate */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.properties.map((p) => {
          const fee = monthlyManagementFee(p);
          const platform = platformFee(p);
          const margin = marginFor(p);
          const gst = feeGst(fee + platform);
          const existing = payouts.find((x) => x.propertyId === p.id && x.month === month);
          return (
            <div key={p.id} className="admin-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#0A1628]">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Operator: {p.operatorName} · {p.feeConfig.model === 'flat' ? 'flat fee' : `${p.feeConfig.percentOfRent}% of rent${p.feeConfig.skipFeeOnVacancy ? ' · vacancy protected' : ''}`} · VJR Estate {p.feeConfig.platformFeePct}%
                  </p>
                </div>
                {existing ? (
                  <AdminBadge variant={existing.status === 'paid' ? 'success' : 'default'}>
                    {existing.status === 'paid' ? `Paid ${existing.paidOn}` : 'Draft'}
                  </AdminBadge>
                ) : (
                  <button
                    type="button"
                    onClick={() => generate(p.id)}
                    disabled={creating === p.id}
                    className="admin-btn-primary !min-h-[34px] !px-3 !text-[10px]"
                  >
                    <Receipt size={13} /> {creating === p.id ? '…' : 'Generate'}
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-1.5 text-xs">
                <PayoutRow label="Rent collected" value={`₹${money(p.monthlyCollected)}`} />
                <PayoutRow label={`Operator management fee — ${p.operatorName} (${p.feeConfig.percentOfRent}% or flat)`} value={`− ₹${money(fee)}`} />
                <PayoutRow label={`VJR Estate coordination fee (${p.feeConfig.platformFeePct}%)`} value={`− ₹${money(platform)}`} />
                <PayoutRow label="GST @ 18% on fees (operator + VJR Estate invoices)" value={`− ₹${money(gst)}`} />
                <PayoutRow label="Maintenance cost" value="− ₹6,400 (approved log)" />
                <PayoutRow label={`Maintenance margin (${p.feeConfig.maintenanceMarginPct}%, disclosed)`} value={`− ₹${money(margin)}`} />
                <div className="border-t border-gray-100 pt-1.5">
                  <PayoutRow
                    label="Net owner payout"
                    value={`₹${money(Math.max(0, p.monthlyCollected - fee - platform - gst - 6400 - margin))}`}
                    bold
                  />
                </div>
              </div>
              {existing && (
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => downloadStatement(existing)} className="admin-btn-secondary flex-1 !min-h-[36px] !text-[10px]">
                    <FileText size={13} /> Download statement PDF
                  </button>
                  {existing.status === 'draft' && (
                    <button type="button" onClick={() => markPaid(existing.id)} className="admin-btn-primary !min-h-[36px] !px-3 !text-[10px]">
                      Mark disbursed
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Issued payouts list */}
      {payouts.length > 0 && (
        <div className="admin-card overflow-hidden">
          <div className="border-b border-gray-100 bg-[#FBF9F3] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            Issued statements
          </div>
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-50 px-5 py-3.5 last:border-0">
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-[#0A1628]">{p.propertyName}</p>
              <p className="text-xs text-gray-500">{p.month}</p>
              <p className="text-sm font-semibold tabular-nums text-[#0A1628]">₹{money(p.netPayout)}</p>
              <AdminBadge variant={p.status === 'paid' ? 'success' : 'default'}>{p.status}</AdminBadge>
              <button type="button" onClick={() => downloadStatement(p)} className="admin-btn-secondary !min-h-[32px] !px-3 !text-[10px]">
                PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PayoutRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={`text-gray-500 ${bold ? 'font-semibold text-[#0A1628]' : ''}`}>{label}</span>
      <span className={`tabular-nums ${bold ? 'text-base font-semibold text-[#0A1628]' : 'text-gray-700'}`}>{value}</span>
    </div>
  );
}

/** Client-side statement download — a printable HTML doc (print → PDF). */
function downloadStatement(p: { propertyName: string; month: string; rentCollected: number; managementFee: number; maintenanceCost: number; maintenanceMargin: number; gstOnFee: number; netPayout: number; status: string }) {
  const html = `<!doctype html><html><head><title>VJR Estate — Owner Statement ${p.month}</title>
  <style>
    body{font-family:Georgia,serif;margin:48px;color:#0A1628}
    .brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #C9A84C;padding-bottom:12px}
    h1{font-size:20px;margin:0}
    .muted{color:#8a8778;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
    table{width:100%;border-collapse:collapse;margin-top:28px;font-family:Arial,sans-serif;font-size:13px}
    td{padding:9px 4px;border-bottom:1px solid #eee}
    td:last-child{text-align:right;font-variant-numeric:tabular-nums}
    .total td{border-top:2px solid #0A1628;font-weight:bold;font-size:15px}
    .foot{margin-top:32px;font-size:10.5px;color:#8a8778;font-family:Arial,sans-serif;line-height:1.6}
  </style></head><body>
  <div class="brand"><h1>VJR Estate Properties Pvt. Ltd.</h1><span class="muted">Owner Statement · ${p.month}</span></div>
  <p class="muted" style="margin-top:10px">Property: ${p.propertyName}</p>
  <table>
    <tr><td>Gross rent collected</td><td>Rs. ${money(p.rentCollected)}</td></tr>
    <tr><td>VJR property management fee</td><td>− Rs. ${money(p.managementFee)}</td></tr>
    <tr><td>GST @ 18% on management fee (tax invoice VJR/${p.month.replace('-', '')}/01)</td><td>− Rs. ${money(p.gstOnFee)}</td></tr>
    <tr><td>Maintenance cost (vendor invoices attached)</td><td>− Rs. ${money(p.maintenanceCost)}</td></tr>
    <tr><td>Maintenance coordination margin (disclosed line item)</td><td>− Rs. ${money(p.maintenanceMargin)}</td></tr>
    <tr class="total"><td>Net payout to owner account</td><td>Rs. ${money(p.netPayout)}</td></tr>
  </table>
  <p class="foot">Security deposit ledger maintained separately from rent. NRI owners: payout routed via NRO account per FEMA;
  30% TDS certificate (Form 16A) issued quarterly. VJR Estate RERA: PRM/KA/RERA/1251/446/AG/xxxxx.<br>
  This is a system-generated statement from the VJR Estate PG &amp; Building Management module.</p>
  <script>window.onload = () => window.print()</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
