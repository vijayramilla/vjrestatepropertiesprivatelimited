-- VJR Estate CRM — employee login access + channel-partner commission model
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

-- Login access: employee can only sign in with Google when the admin ticks this
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS access_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- Channel partners are commission-only (no salary). Rate as % of deal value,
-- e.g. 1.5 means 1.5% of the closed deal.
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;
