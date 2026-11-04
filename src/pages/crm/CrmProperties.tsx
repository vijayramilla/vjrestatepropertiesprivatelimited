import AdminPropertiesList from '@/pages/admin/AdminPropertiesList';

/**
 * Properties module in the CRM — same listing-management surface the admin
 * Properties page has always used (AdminPropertiesList re-renders here).
 * The underlying component self-selects its chrome: full admins get the
 * complete admin workspace, granted users (can_add_property) keep their
 * minimal "My Listings" view, and CRM employees reach it via their grant.
 */
export default function CrmProperties() {
  return <AdminPropertiesList />;
}
