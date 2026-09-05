-- 20260905150000_lead_type_and_new_pipeline.sql
-- CRM client pipeline rework:
--   * status now holds only the working pipeline: Site Visit, Token Done,
--     Visit Done, Closed.
--   * lead_type (new lead / old lead) becomes a separate dimension.
-- Fresh leads start with an empty status until a telecaller moves them.

ALTER TABLE public.crm_clients
  ADD COLUMN IF NOT EXISTS lead_type TEXT NOT NULL DEFAULT 'new lead';

-- Old 'New Lead' rows become lead_type = 'new lead' with an empty pipeline
-- status (still fresh, nothing scheduled yet).
UPDATE public.crm_clients
   SET lead_type = 'new lead', status = ''
 WHERE status = 'New Lead';

-- Any leftover legacy pipeline statuses fold into 'old lead' so the new
-- pipeline chips never see unknown values.
UPDATE public.crm_clients
   SET lead_type = 'old lead', status = ''
 WHERE status IN ('Negotiation', 'Lost');