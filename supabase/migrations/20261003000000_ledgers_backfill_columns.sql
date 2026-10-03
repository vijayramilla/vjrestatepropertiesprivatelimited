-- LEDGERS: backfill columns that older live tables are missing.
--
-- The rule engine inserts rule_version, but tables created by an earlier
-- migration never gained columns added to the DDL afterwards — CREATE TABLE
-- IF NOT EXISTS does nothing when the table exists. Inserts then fail with
-- "Could not find the 'rule_version' column ... in the schema cache".
--
-- Idempotent: safe to run multiple times.

ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS rule_version TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS reminders_sent JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS authority TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'monthly';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS challan_url TEXT DEFAULT '';
ALTER TABLE public.ledger_compliance_items ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS turnover_band TEXT DEFAULT '';
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS employee_count INT DEFAULT 0;
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS ca_name TEXT DEFAULT '';
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS cs_name TEXT DEFAULT '';
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.ledger_company_profile ADD COLUMN IF NOT EXISTS gst_scheme TEXT NOT NULL DEFAULT 'monthly';
