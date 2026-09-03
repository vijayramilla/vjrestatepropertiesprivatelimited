-- ─────────────────────────────────────────────────────────────────────────────
-- CRM RLS lockdown — qrlkicsxnhaplwkotnyd
--
-- Every PII table below was created with RLS disabled and full
-- anon/authenticated grants (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/...). That
-- let anyone holding the project's publishable key read AND modify all clients,
-- employees, logins, attendance, payroll, events, and face-verification photos
-- directly from the browser — no auth at all. All CRM reads/writes must flow
-- through /api/crm-proxy (and /api/data-proxy), which authenticate the
-- Firebase token server-side and write with the service role.
--
-- After this runs: anon/authenticated (the publishable key) get nothing from
-- these tables. The service role and postgres are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_clients',
    'crm_client_activity',
    'client_visits',
    'employees',
    'employee_sessions',
    'employee_logins',
    'employee_attendance',
    'employee_face_verifications',
    'employee_history',
    'employee_leaves',
    'employee_payroll',
    'employee_events'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;
