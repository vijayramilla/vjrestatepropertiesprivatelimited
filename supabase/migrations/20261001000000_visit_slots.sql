-- Daily site-visit slot capacity per property.
-- NULL = no cap (form behaves exactly as before). Availability shown to
-- visitors is always derived from live property_leads rows for today, so
-- deleting a booking in the CRM automatically frees a slot.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS visit_slots INT NULL;
