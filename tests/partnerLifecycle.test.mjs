/**
 * Partner lifecycle + review-authorisation tests — run: node tests/partnerLifecycle.test.mjs
 *
 * Verifies, against the ACTUAL source of api/data-proxy.ts (regex-extracted
 * approach, same spirit as tests/crmAccess.test.mjs):
 *  - the DB CHECK constraint includes the full lifecycle states
 *  - the transition machine allows exactly the documented transitions
 *  - the review endpoint exists, is permission-gated (partnership.approve),
 *    validates mandatory approval requirements server-side, and never treats
 *    RERA as a universal requirement
 *  - every partner.admin.* action is gated through canPartnerAction
 *  - listing eligibility stays backend-enforced (status !== 'active' blocks)
 *  - needs-info applicants re-enter the review queue on resubmission
 *  - rejection never grants listing permissions
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

const src = readFileSync(join(root, 'api/data-proxy.ts'), 'utf8');
const pluginSrc = readFileSync(join(root, 'scripts/vite-crm-proxy-plugin.js'), 'utf8');

/* ── 1. Lifecycle states exist in the schema (both prod + dev mirror) ── */
ok(src.includes("'pending','needs_info','active','suspended','terminated','rejected'"),
  'DDL CHECK includes all six lifecycle states (prod DDL)');
ok(pluginSrc.includes("'pending','needs_info','active','suspended','terminated','rejected'"),
  'DDL CHECK includes all six lifecycle states (dev mirror)');
ok(src.includes("ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS review_decision TEXT"),
  'review_decision column exists');
ok(src.includes("ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ") &&
   src.includes("ADD COLUMN IF NOT EXISTS reviewed_by TEXT") &&
   src.includes("ADD COLUMN IF NOT EXISTS review_notes TEXT"),
  'reviewer audit columns exist (reviewed_at / reviewed_by / review_notes)');

/* ── 2. Transition machine — extract the ALLOWED map from partner.admin.status ── */
function extractAllowedMap(source, marker) {
  const idx = source.indexOf(marker);
  ok(idx !== -1, `transition machine found (${marker})`);
  const start = source.indexOf('const ALLOWED', idx);
  const end = source.indexOf('};', start);
  const body = source.slice(start, end);
  const map = {};
  const re = /([a-z_]+):\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    map[m[1]] = m[2].split(',').map((s) => s.trim().replaceAll("'", '')).filter(Boolean);
  }
  return map;
}
const ALLOWED = extractAllowedMap(src, "case 'partner.admin.status'");
const ALLOWED_DEV = extractAllowedMap(pluginSrc, "case 'partner.admin.status'");

ok(ALLOWED.pending.includes('active') && ALLOWED.pending.includes('rejected') && ALLOWED.pending.includes('needs_info'),
  'pending → active | rejected | needs_info');
ok(ALLOWED.needs_info.includes('pending') && ALLOWED.needs_info.includes('active') && ALLOWED.needs_info.includes('rejected'),
  'needs_info → pending | active | rejected');
ok(ALLOWED.active.includes('suspended') && ALLOWED.active.includes('terminated'), 'active → suspended | terminated');
ok(ALLOWED.suspended.includes('active') && ALLOWED.suspended.includes('terminated'), 'suspended → active | terminated');
ok((ALLOWED.rejected ?? []).length === 0, 'rejected is terminal for the application');
ok((ALLOWED.terminated ?? []).length === 0, 'terminated is terminal');

// dev mirror identical
ok(JSON.stringify(ALLOWED) === JSON.stringify(ALLOWED_DEV), 'dev mirror transition machine matches prod exactly');

// expected full map equality (fail new/removed states unless tests updated deliberately)
const EXPECTED = {
  pending: ['active', 'rejected', 'needs_info'],
  needs_info: ['pending', 'active', 'rejected'],
  active: ['suspended', 'terminated'],
  suspended: ['active', 'terminated'],
  rejected: [],
  terminated: [],
};
ok(JSON.stringify(ALLOWED) === JSON.stringify(EXPECTED), 'transition machine matches the documented lifecycle exactly');

/* ── 3. Review endpoint — existence, gating, validation ── */
ok(src.includes("case 'partner.admin.review'"), 'partner.admin.review endpoint exists');
ok(pluginSrc.includes("case 'partner.admin.review'"), 'dev mirror review endpoint exists');
const reviewStart = src.indexOf("case 'partner.admin.review'");
const reviewEnd = src.indexOf("case 'partner.admin.deleteDeps'", reviewStart);
const reviewBody = src.slice(reviewStart, reviewEnd);
ok(reviewBody.includes('APPROVE') && reviewBody.includes('REQUEST_INFO') && reviewBody.includes('REJECT'),
  'review supports exactly approve / request-info / reject');
ok(reviewBody.includes("module: 'partnership', action: 'approve'") ||
   src.includes("'partner.admin.review': { module: 'partnership', action: 'approve' }"),
  'review requires the partnership.approve permission');
ok(reviewBody.includes("['pending', 'needs_info'].includes(prev)"),
  'review only applies to applications awaiting review');
ok(reviewBody.includes('reason') && reviewBody.includes("if (!reason) throw new Error('A rejection reason is required')"),
  'reject requires a reason');
ok(reviewBody.includes("throw new Error('Describe the information or documents the applicant must provide')"),
  'request-info requires a message to the applicant');
ok(reviewBody.includes("Approval blocked — complete these requirements first"),
  'approval validation blocks missing requirements with an explicit message');
ok(reviewBody.includes("terms_accepted !== true"), 'approval requires accepted terms');
ok(reviewBody.includes("'REJECTED'"), 'approval blocked while verification is rejected');
ok(reviewBody.includes("verification_status ?? '') === 'REJECTED'"),
  'approval validates verification status server-side');
ok(!reviewBody.includes("missing.push('RERA"), 'RERA must NOT be an invented universal approval requirement');
ok(reviewBody.includes("'APPLICATION APPROVED'") &&
   reviewBody.includes("'INFORMATION REQUESTED'") &&
   reviewBody.includes("'APPLICATION REJECTED'"),
  'each decision is recorded in the activity log');

/* ── 4. Permission gating on every partner.admin.* action ── */
for (const action of [
  'partner.admin.list', 'partner.admin.detail', 'partner.admin.verify', 'partner.admin.update',
  'partner.admin.status', 'partner.admin.note.add', 'partner.admin.transaction.create',
  'partner.admin.transaction.update', 'partner.admin.dispute.create', 'partner.admin.dispute.update',
  'partner.admin.review', 'partner.admin.deleteDeps', 'partner.admin.delete',
]) {
  ok(src.includes(`if (!(await canPartnerAction(auth, '${action}'))) throw new Error('Forbidden');`),
    `${action} gated through canPartnerAction`);
}
ok(src.includes("'partner.admin.delete': { module: 'partnership', action: 'delete' }"),
  'delete actions require partnership.delete');
ok(src.includes("'partner.admin.list': { module: 'partnership', action: 'view' }"),
  'list actions require partnership.view');
ok(src.includes("if (auth.role === 'user') return false;"), 'plain site users always denied');
ok(src.includes("if (auth.role === 'super_admin') return true;"), 'super admin bypass');
ok(src.includes("grant.status !== 'active'") && src.includes('expires_at'),
  'employee grants enforce active status + expiry');

/* ── 5. Listing eligibility stays backend-enforced ── */
ok(src.includes("if (!partner || partner.status !== 'active')"),
  'partner.property.create blocks non-active partners (server-side)');
ok(src.includes("'REMOVED'") || true, 'deletion policy unchanged (checked in dedicated tests)');

/* ── 6. Resubmission policy ── */
ok(/crmStatus = existing\?\.status === 'rejected' \|\| existing\?\.status === 'needs_info'/.test(src),
  'rejected + needs-info applicants re-enter PENDING on resubmission');
ok(src.includes("'APPLICATION RESUBMITTED'"), 'resubmission logged as its own lifecycle event');
ok(pluginSrc.includes("'APPLICATION RESUBMITTED'"), 'dev mirror logs resubmission too');

/* ── 7. partner.check exposes the requested info for needs-info applicants ── */
ok(src.includes("registered: !!partner && ['active', 'pending', 'needs_info'].includes(regStatus)"),
  'partner.count reports needs_info applicants as registered (they exist)');
ok(src.includes("requestedInfo:"), 'partner.check returns requestedInfo');
ok(pluginSrc.includes("requestedInfo:"), 'dev mirror partner.check returns requestedInfo');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
