-- VJR Estate CRM — site visit timings
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)

ALTER TABLE public.client_visits
  ADD COLUMN IF NOT EXISTS visit_time TIME;
