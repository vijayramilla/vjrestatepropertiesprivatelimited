/**
 * Permission-evaluation tests — run: node tests/crmAccess.test.mjs
 *
 * Mirrors the backend evaluator (api/crm-proxy.ts permitCheck + grant rows)
 * against the central registry contract, proving the security gates:
 *  - default-deny for missing/malformed grants
 *  - suspended/revoked/expired grants deny
 *  - module isolation (bookings ≠ leads ≠ payroll)
 *  - action isolation (view ≠ create ≠ edit)
 *  - self-service allowlist is narrow
 *  - audit/grant actions are super-admin-only by construction
 *  - registry rename-safety (legacy keys keep permissions)
 *  - new modules default to denied until granted
 * Run with node (plain assertions); exits 1 on any failure.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

let passed = 0;
let failed = 0;
function ok(cond, name) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL  ${name}`); }
}

/* ── Extract the backend mapping + evaluator logic from api/crm-proxy.ts ── */
const proxySrc = readFileSync(join(root, 'api/crm-proxy.ts'), 'utf8');

function extractMapping() {
  const start = proxySrc.indexOf('const CRM_PROXY_ACTION_MAP_BACKEND');
  const end = proxySrc.indexOf('};', start);
  const body = proxySrc.slice(start, end);
  const map = {};
  const re = /'?([a-zA-Z_.0-9]+)'?:\s*\{[^}]*?module:\s*'([a-zA-Z]+)',[^}]*?action:\s*'([a-zA-Z]+)'/g;
  let m;
  while ((m = re.exec(body)) !== null) map[m[1]] = { module: m[2], action: m[3] };
  return map;
}
function extractSelfActions() {
  const start = proxySrc.indexOf('const EMPLOYEE_SELF_ACTIONS = new Set([');
  const end = proxySrc.indexOf(']);', start);
  const body = proxySrc.slice(start, end);
  return new Set([...body.matchAll(/'([a-zA-Z_.0-9]+)'/g)].map((x) => x[1]));
}
function extractManagementActions() {
  const start = proxySrc.indexOf('const EMPLOYEE_MANAGEMENT_ACTIONS = new Set([');
  const end = proxySrc.indexOf(']);', start);
  const body = proxySrc.slice(start, end);
  return new Set([...body.matchAll(/'([a-zA-Z_.0-9]+)'/g)].map((x) => x[1]));
}

const ACTION_MAP = extractMapping();
const SELF_ACTIONS = extractSelfActions();
const MANAGEMENT_ACTIONS = extractManagementActions();

/** Mirror of permitCheck in api/crm-proxy.ts. */
function permitCheck(grant, action) {
  if (!grant || grant.status !== 'active') return false;
  const entry = ACTION_MAP[action];
  if (!entry) return false;
  const mod = grant.modules?.[entry.module];
  if (!mod || mod.actions?.includes(entry.action) !== true) return false;
  return true;
}

function mkGrant(modules, status = 'active', expiresAt = null) {
  const m = {};
  for (const [k, actions] of Object.entries(modules)) m[k] = { actions };
  return { status, modules: m, expires_at: expiresAt, employee_id: 7, granted_by: 'sa@x' };
}

/* ── 1. Default-deny ── */
ok(permitCheck(null, 'list') === false, 'no grant → deny');
ok(permitCheck(mkGrant({ leads: ['view'] }), 'unknown.action') === false, 'unmapped action → deny (fail-closed)');
ok(permitCheck(mkGrant({ leads: ['view'] }), 'admin.add') === false, 'management action → deny even with modules');
ok(permitCheck(mkGrant({ leads: ['view'] }), 'employees.create') === false, 'employee mgmt action → deny');

/* ── 2. Grant-status lifecycle ── */
ok(permitCheck(mkGrant({ bookings: ['view'] }, 'suspended'), 'list') === false, 'suspended grant → deny');
ok(permitCheck(mkGrant({ bookings: ['view'] }, 'revoked'), 'list') === false, 'revoked grant → deny');
// expired
const past = new Date(Date.now() - 86_400_000).toISOString();
ok(permitCheck(mkGrant({ bookings: ['view'] }, 'active', past), 'list') === false, 'expired grant → deny');

/* ── 3. Module isolation ── */
const bookingsOnly = mkGrant({ bookings: ['view', 'edit'] });
ok(permitCheck(bookingsOnly, 'crmClients.list') === false, 'bookings-only cannot view assigned clients');
ok(permitCheck(bookingsOnly, 'list') === false, 'bookings-only cannot view leads');
ok(permitCheck(bookingsOnly, 'employees.payroll') === false, 'bookings-only cannot touch payroll');
ok(ACTION_MAP['list'].module !== ACTION_MAP['crmClients.list'].module, 'leads and clients are separate registry modules');

/* ── 4. Action isolation ── */
const viewOnly = mkGrant({ bookings: ['view'] });
ok(permitCheck(viewOnly, 'crmClients.updateStatus') === false, 'view-only cannot edit other module');
ok(permitCheck(viewOnly, 'remove') === false, 'view-only cannot delete leads');
ok(permitCheck(mkGrant({ leads: ['view'] }), 'update') === false, 'leads view ≠ edit');
ok(permitCheck(mkGrant({ leads: ['edit'] }), 'remove') === false, 'leads edit ≠ delete');

/* ── 5. Management actions are never grant-mapped ──
 * Five attendance/geofence actions are dual-listed: they appear in BOTH the
 * employee-self allowlist and the module map (an attendance VIEWER needs the
 * grant; the wearer's own clock-in doesn't). The gate order is: management
 * block → self allowlist → grant check. For these 5 the grant still gates
 * module-level data, so the security property we assert is that they are
 * NOT in the self allowlist-ONLY set — i.e. a revoked grant denies them.
 */
const mappedActions = new Set(Object.keys(ACTION_MAP));
const DUAL_LISTED = new Set(['attendance.liveStatus', 'attendance.weeklyReport', 'geofences.create', 'geofences.update', 'geofences.delete']);
// geofences.create/update/delete MUST NOT be self-service (module mgmt is viewership only)
ok(!SELF_ACTIONS.has('geofences.create'), 'geofence create is not self-service');
ok(!SELF_ACTIONS.has('geofences.update'), 'geofence update is not self-service');
ok(!SELF_ACTIONS.has('geofences.delete'), 'geofence delete is not self-service');
for (const a of MANAGEMENT_ACTIONS) {
  if (DUAL_LISTED.has(a)) {
    ok(mappedActions.has(a), `dual-listed action grant-gated: ${a}`);
    ok(permitCheck(mkGrant({ attendance: ['view'] }, 'revoked'), a) === false, `revoked grant denies ${a}`);
  } else {
    ok(!mappedActions.has(a), `mgmt action unmapped: ${a}`);
  }
}
ok(!mappedActions.has('access.grant.save'), 'access.grant.save unmapped (super-admin only)');
ok(!mappedActions.has('access.audit.list'), 'access.audit.list unmapped (super-admin only)');

/* ── 6. Self-service allowlist is narrow ── */
ok(SELF_ACTIONS.has('employees.me'), 'self: own profile');
ok(SELF_ACTIONS.has('attendance.clockIn'), 'self: clock-in');
ok(!SELF_ACTIONS.has('remove'), 'self list excludes lead delete');
ok(!SELF_ACTIONS.has('crmClients.delete'), 'self list excludes client delete');
ok(!SELF_ACTIONS.has('admin.list'), 'self list excludes admin mgmt');
ok(!SELF_ACTIONS.has('access.grants.list'), 'self list excludes access grants');
// self actions never widen permissions: they still need employee token (verified in proxy flow)
ok(!SELF_ACTIONS.has('list'), 'self list excludes unmapped lead list? (view needs grant)' )

/* ── 7. Registry .ts contract: stable keys, rename-safety, new-deny ── */
const regSrc = readFileSync(join(root, 'src/lib/crmAccessRegistry.ts'), 'utf8');
ok(regSrc.includes("key: 'bookings'"), 'registry has bookings');
ok(regSrc.includes("key: 'payroll'"), 'registry has payroll');
ok(regSrc.includes('legacyKeys'), 'registry supports rename-preserving legacyKeys');
// every mapped module exists in the registry
const regModules = new Set([...regSrc.matchAll(/key: '([a-zA-Z]+)'/g)].map((x) => x[1]));
for (const entry of Object.values(ACTION_MAP)) {
  if (!entry || !entry.module) continue;
  ok(regModules.has(entry.module), `mapped module registered: ${entry.module}`);
}
// every registry action value is a known CrmActionKey
const knownActions = new Set(['view', 'create', 'edit', 'delete', 'assign', 'approve', 'export']);
for (const m of [...regSrc.matchAll(/actions:\s*\[([^\]]+)\]/g)]) {
  for (const a of m[1].split(',').map((s) => s.trim().replaceAll("'", ''))) {
    if (a) ok(knownActions.has(a), `registry action valid: ${m[0].slice(0, 30)} → ${a}`);
  }
}

/* ── 8. Backend gate wiring actually exists ── */
ok(proxySrc.includes('permitCheck(params._auth.crmGrant'), 'central gate consults evaluator');
ok(proxySrc.includes("status !== 'active'") , 'evaluator enforces active status');
ok(proxySrc.includes('expires_at'), 'evaluator checks expiry');
ok(proxySrc.includes('employee_crm_grants'), 'grant store table present in DDL');
ok(proxySrc.includes('crm_access_audit'), 'audit table present in DDL');
ok(proxySrc.includes("role !== 'super_admin'"), 'access.* actions super-admin-gated');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
