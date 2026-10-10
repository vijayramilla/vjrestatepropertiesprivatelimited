/**
 * ── CRM Module & Permission Registry ─────────────────────────────────────
 * Single authoritative source for every CRM module: stable keys, supported
 * actions, route, navigation group, sensitivity and the backend CRM-proxy
 * actions each module/action maps to.
 *
 * CONTRACT for future modules:
 *  1. Add an entry here (never rename/remove a key — renames must keep the
 *     old key as `legacyKeys` so existing grants keep matching).
 *  2. Preserve `label` changes freely — permissions store the KEY.
 *  3. Every action you add defaults to DENIED for all employees until it is
 *     explicitly granted (default-deny).
 *  4. Gate the module's crm-proxy actions via `backendActions` below so the
 *     backend refuses calls from employees without the matching permission.
 *  5. New modules never auto-grant: employees only see what their grant
 *     contains. `enabled: false` hides a module from grants until its
 *     backend enforcement is complete.
 *
 * The Grant/Manage Access UI renders from this list — adding a module here
 * makes it appear automatically in the Super Admin permission interface.
 */

export type CrmActionKey = 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'approve' | 'export';

export interface CrmModuleDef {
  /** Stable, never-renamed identifier stored in grants and audits. */
  key: string;
  /** Previous keys folded into this module (rename safety). */
  legacyKeys?: string[];
  label: string;
  description: string;
  group: 'Overview' | 'Pipeline' | 'Operations';
  /** Primary route under /crm; additional routes listed in `routes`. */
  route: string;
  routes?: string[];
  /** Actions the module supports. View is always first (module entry). */
  actions: CrmActionKey[];
  /** Extra sensitive actions needing explicit opt-in, shown distinctly. */
  sensitive?: CrmActionKey[];
  /** false = registered but hidden from new grants until enforcement ships. */
  enabled?: boolean;
}

export const CRM_MODULE_REGISTRY: CrmModuleDef[] = [
  {
    key: 'leads',
    label: 'Leads',
    description: 'Manages incoming buyer/seller enquiries and lead pipeline.',
    group: 'Pipeline',
    route: '/crm/leads',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export'],
    sensitive: ['export', 'delete'],
  },
  {
    key: 'requirements',
    label: 'Requirements',
    description: 'Buyer requirement requests and requirement board.',
    group: 'Pipeline',
    route: '/crm/requirements',
    routes: ['/crm/requirements/:id'],
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'export'],
    sensitive: ['export', 'delete'],
  },
  {
    key: 'assignedClients',
    label: 'Assigned Clients',
    description: 'Clients assigned to team members with visit tracking.',
    group: 'Pipeline',
    route: '/crm/assigned-clients',
    actions: ['view', 'create', 'edit', 'assign'],
    sensitive: ['assign'],
  },
  {
    key: 'bookings',
    label: 'Bookings',
    description: 'Site visit bookings lifecycle (requested → confirmed → completed).',
    group: 'Pipeline',
    route: '/crm/bookings',
    actions: ['view', 'edit', 'delete'],
  },
  {
    key: 'earnings',
    label: 'Earnings',
    description: 'Commission and earnings reports.',
    group: 'Overview',
    route: '/crm/earnings',
    actions: ['view'],
    sensitive: ['export'],
  },
  {
    key: 'ledgers',
    label: 'Ledgers',
    description: 'Compliance calendar, GST, legal cases and reminders.',
    group: 'Pipeline',
    route: '/crm/ledgers',
    actions: ['view', 'create', 'edit', 'delete'],
    sensitive: ['delete'],
  },
  {
    key: 'partnership',
    label: 'Partnership',
    description: 'Partner directory, KYC and partner management.',
    group: 'Operations',
    route: '/crm/partnership',
    routes: ['/crm/partnership/partners/:partnerId'],
    actions: ['view', 'edit', 'approve', 'delete'],
    sensitive: ['approve', 'delete'],
  },
  {
    key: 'agents',
    label: 'Agents',
    description: 'External agent partnerships and agent records.',
    group: 'Pipeline',
    route: '/crm/agents',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'employees',
    label: 'Employees',
    description: 'Employee directory, profiles and employment records.',
    group: 'Operations',
    route: '/crm/employees',
    routes: ['/crm/employees/new', '/crm/employees/:id'],
    actions: ['view', 'create', 'edit', 'delete'],
    sensitive: ['delete'],
  },
  {
    key: 'attendance',
    label: 'Attendance',
    description: 'Attendance, leaves and face-verification sessions.',
    group: 'Operations',
    route: '/crm/attendance',
    actions: ['view', 'edit', 'approve'],
    sensitive: ['approve'],
  },
  {
    key: 'geofences',
    label: 'Geofences',
    description: 'Location fences and check-in enforcement.',
    group: 'Operations',
    route: '/crm/geofences',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'payroll',
    label: 'Payroll',
    description: 'Salary processing, payslips and payouts.',
    group: 'Operations',
    route: '/crm/payroll',
    actions: ['view', 'create', 'edit', 'delete'],
    sensitive: ['delete'],
  },
  {
    key: 'events',
    label: 'Events',
    description: 'Company events and announcements.',
    group: 'Operations',
    route: '/crm/events',
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    key: 'storage',
    label: 'Storage',
    description: 'File storage, buckets and document access.',
    group: 'Operations',
    route: '/crm/storage',
    actions: ['view', 'edit', 'delete'],
    sensitive: ['delete'],
  },
  {
    key: 'siteVisits',
    label: 'Site Visits',
    description: 'Scheduled property site visits log.',
    group: 'Pipeline',
    route: '/crm/requirements',
    actions: ['view', 'create', 'edit'],
  },
  {
    key: 'adminUsers',
    label: 'Admin Users',
    description: 'Admin accounts management.',
    group: 'Operations',
    route: '/crm/profile',
    actions: ['view', 'edit'],
    sensitive: ['edit'],
  },
  {
    key: 'crmAccess',
    label: 'CRM Access Management',
    description: 'Grant, manage and audit employee CRM access. Super Admin only.',
    group: 'Operations',
    route: '/crm/profile',
    actions: ['view', 'edit', 'delete'],
    sensitive: ['edit', 'delete'],
  },
];

/** Convenience lookups. */
export function getCrmModule(key: string): CrmModuleDef | undefined {
  const k = key.toLowerCase();
  return CRM_MODULE_REGISTRY.find(
    (m) => m.key === k || (m.legacyKeys ?? []).includes(k),
  );
}

/** All keys a module answers to (its key + legacy aliases). */
export function crmModuleKeyAliases(key: string): string[] {
  const m = getCrmModule(key);
  return m ? [m.key, ...(m.legacyKeys ?? [])] : [key];
}

export const CRM_ACTION_LABELS: Record<CrmActionKey, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  assign: 'Assign / Reassign',
  approve: 'Approve / Reject',
  export: 'Export / Download',
};

/**
 * Presets used by the Grant Access workflow. Each preset explicitly sets
 * every action — nothing is silently inherited.
 */
export const CRM_PERMISSION_PRESETS: { label: string; actions: CrmActionKey[] }[] = [
  { label: 'Clear Permissions', actions: [] },
  { label: 'View Only', actions: ['view'] },
  { label: 'View & Edit', actions: ['view', 'edit'] },
  { label: 'Operational Access', actions: ['view', 'create', 'edit'] },
];

/** Record scopes — only ones the backend can actually enforce today. */
export const CRM_RECORD_SCOPES = ['all', 'assigned'] as const;
export type CrmRecordScope = (typeof CRM_RECORD_SCOPES)[number];

/**
 * backendRole → permission key that the backend evaluator checks for the
 * module+action pair. Returns e.g. 'leads.view' | 'leads.create'.
 */
export function crmPermissionKey(moduleKey: string, action: CrmActionKey): string {
  const m = getCrmModule(moduleKey) ?? { key: moduleKey };
  return `${m.key}.${action}`;
}

/* ── Backend action → (module, action) mapping ──────────────────────────
 * crm-proxy case name → permission requirement. Anything not listed is
 * Super-Admin-only (management actions like admin.add, employees.create).
 * Keys use crm-proxy's exact case names — including the legacy bare ones
 * ('list','update','remove',…) which are the Leads module's actions.
 */
export const CRM_PROXY_ACTION_MAP: Record<string, { module: string; action: CrmActionKey; publicRead?: boolean }> = {
  // Leads (note: bare legacy case names in crm-proxy)
  list: { module: 'leads', action: 'view' },
  get: { module: 'leads', action: 'view' },
  getActivities: { module: 'leads', action: 'view' },
  getSources: { module: 'leads', action: 'view', publicRead: true },
  addNote: { module: 'leads', action: 'edit' },
  update: { module: 'leads', action: 'edit' },
  updateStatus: { module: 'leads', action: 'edit' },
  assignAgent: { module: 'leads', action: 'assign' },
  remove: { module: 'leads', action: 'delete' },

  // Site visits
  'siteVisits.list': { module: 'siteVisits', action: 'view' },
  'siteVisits.create': { module: 'siteVisits', action: 'create' },

  // Clients / assigned clients
  'clients.activity': { module: 'assignedClients', action: 'view' },
  'crmClients.list': { module: 'assignedClients', action: 'view' },
  'crmClients.assignedView': { module: 'assignedClients', action: 'view' },
  'crmClients.maxSno': { module: 'assignedClients', action: 'view', publicRead: true },
  'crmClients.create': { module: 'assignedClients', action: 'create' },
  'crmClients.upsert': { module: 'assignedClients', action: 'create' },
  'crmClients.updateStatus': { module: 'assignedClients', action: 'edit' },
  'crmClients.delete': { module: 'assignedClients', action: 'edit' },

  // Client visits + follow-ups (assignedClients domain)
  'visits.list': { module: 'assignedClients', action: 'view' },
  'visits.add': { module: 'assignedClients', action: 'create' },
  'visits.updateStatus': { module: 'assignedClients', action: 'edit' },
  'followUps.list': { module: 'assignedClients', action: 'view' },
  'followUps.create': { module: 'assignedClients', action: 'create' },
  'followUps.update': { module: 'assignedClients', action: 'edit' },

  // Agents
  'agents.list': { module: 'agents', action: 'view' },
  'agents.create': { module: 'agents', action: 'create' },
  'agents.update': { module: 'agents', action: 'edit' },
  'agents.delete': { module: 'agents', action: 'delete' },

  // Attendance
  'attendance.liveStatus': { module: 'attendance', action: 'view' },
  'attendance.today': { module: 'attendance', action: 'view' },
  'attendance.weeklyReport': { module: 'attendance', action: 'view' },

  // Events
  'events.list': { module: 'events', action: 'view' },
  'events.create': { module: 'events', action: 'create' },
  'events.update': { module: 'events', action: 'edit' },
  'events.delete': { module: 'events', action: 'delete' },

  // Geofences
  'geofences.list': { module: 'geofences', action: 'view' },
  'geofences.create': { module: 'geofences', action: 'create' },
  'geofences.update': { module: 'geofences', action: 'edit' },
  'geofences.delete': { module: 'geofences', action: 'delete' },

  // Partnership (partners)
  'partners.list': { module: 'partnership', action: 'view' },
  'partners.get': { module: 'partnership', action: 'view' },
  'partners.update': { module: 'partnership', action: 'edit' },
  'partners.approve': { module: 'partnership', action: 'approve' },
  'partners.delete': { module: 'partnership', action: 'delete' },

  // Storage
  'storage.list': { module: 'storage', action: 'view' },
  'storage.delete': { module: 'storage', action: 'delete' },

  // Admin users list/read
  'admin.list': { module: 'adminUsers', action: 'view' },
  'admin.verify': { module: 'adminUsers', action: 'view', publicRead: true },
};

export default CRM_MODULE_REGISTRY;
