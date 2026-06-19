import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarBlank, ChatCircle, WhatsappLogo } from '@phosphor-icons/react';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  AdminBadge,
  AdminEmptyState,
  AdminFilterChip,
  AdminPageHeader,
  AdminPageShell,
  AdminSkeletonList,
  AdminStatCard,
  AdminStatGrid,
} from '@/components/admin/AdminUi';
import { subscribePropertyLeads, type PropertyLead, type LeadType } from '@/lib/propertyLeads';

function LeadTypeBadge({ type }: { type: LeadType }) {
  if (type === 'book_visit') {
    return (
      <AdminBadge variant="success">
        <CalendarBlank size={10} className="mr-0.5" />
        Site Visit
      </AdminBadge>
    );
  }
  return (
    <AdminBadge variant="whatsapp">
      <WhatsappLogo size={10} weight="fill" className="mr-0.5" />
      WhatsApp
    </AdminBadge>
  );
}

export default function AdminLeadsList() {
  const [leads, setLeads] = useState<PropertyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | LeadType>('all');

  useEffect(() => {
    const unsub = subscribePropertyLeads(
      (data) => {
        setLeads(data);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? leads : leads.filter((l) => l.leadType === filter)),
    [leads, filter],
  );

  const stats = useMemo(
    () => ({
      total: leads.length,
      whatsapp: leads.filter((l) => l.leadType === 'whatsapp').length,
      visits: leads.filter((l) => l.leadType === 'book_visit').length,
      today: leads.filter((l) => {
        if (!l.createdAt) return false;
        const today = new Date();
        return (
          l.createdAt.getDate() === today.getDate() &&
          l.createdAt.getMonth() === today.getMonth() &&
          l.createdAt.getFullYear() === today.getFullYear()
        );
      }).length,
    }),
    [leads],
  );

  return (
    <AdminLayout title="Enquiries">
      <AdminPageShell>
        <AdminPageHeader
          eyebrow="Leads"
          title="Enquiries"
          description="WhatsApp and site visit requests from property pages — with date, time, and property details."
        />

        <AdminStatGrid>
          <AdminStatCard label="Total Enquiries" value={stats.total} />
          <AdminStatCard label="WhatsApp" value={stats.whatsapp} />
          <AdminStatCard label="Site Visits" value={stats.visits} />
          <AdminStatCard label="Today" value={stats.today} />
        </AdminStatGrid>

        <div className="-mx-1 mb-4 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
          {(['all', 'whatsapp', 'book_visit'] as const).map((key) => (
            <AdminFilterChip key={key} active={filter === key} onClick={() => setFilter(key)}>
              {key === 'all' ? 'All' : key === 'whatsapp' ? 'WhatsApp' : 'Site Visits'}
            </AdminFilterChip>
          ))}
        </div>

        {loading ? (
          <AdminSkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <AdminEmptyState
            icon={<ChatCircle size={40} weight="thin" />}
            title="No enquiries yet"
            description="WhatsApp and Book Now actions from property pages will appear here with full details."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((lead) => (
              <article key={lead.id} className="admin-card p-4 sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <LeadTypeBadge type={lead.leadType} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      {lead.source === 'detail' ? 'Property page' : 'Listing card'}
                    </span>
                    <span className="text-[10px] text-gray-400 sm:ml-auto">
                      {lead.createdAt ? format(lead.createdAt, 'dd MMM · hh:mm a') : '—'}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold leading-snug text-black">
                      {lead.propertyTitle}
                    </h3>
                    <p className="mt-1 text-xs text-gray-600">
                      {lead.propertyType} · {lead.propertyArea}
                    </p>
                    <p className="mt-1 text-sm font-medium text-black">
                      {lead.propertyPrice}
                      {lead.propertyMonthlyRental && lead.propertyMonthlyRental !== '—' && (
                        <span className="ml-2 font-normal text-gray-500">
                          · {lead.propertyMonthlyRental}/mo
                        </span>
                      )}
                    </p>
                    {lead.leadType === 'book_visit' && lead.visitDate && (
                      <p className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-1.5 text-xs font-medium text-black">
                        <CalendarBlank size={12} />
                        {lead.visitDate}
                        {lead.visitTime ? ` · ${lead.visitTime}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 border-t border-gray-50 pt-3">
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-700">
                    {lead.message}
                  </p>
                  {lead.propertyUrl && (
                    <a
                      href={lead.propertyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-[44px] items-center text-xs font-medium text-gray-700 underline decoration-gray-400 underline-offset-2 hover:text-black"
                    >
                      View property →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPageShell>
    </AdminLayout>
  );
}
