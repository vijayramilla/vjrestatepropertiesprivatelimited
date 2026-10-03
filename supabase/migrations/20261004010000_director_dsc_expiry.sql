-- Directors: DSC expiry tracking + verification for the seeded DSC-expiry dates.
-- The 15 Oct 2027 dates (2-year Class-3 DSC issued at incorporation) are an
-- ASSUMPTION pending the DSC serial numbers on the certificates — flip to
-- 'confirmed' once verified. Same verification vocabulary as company master.
ALTER TABLE public.ledger_directors ADD COLUMN IF NOT EXISTS dsc_expiry_date DATE;

UPDATE public.ledger_directors
SET dsc_expiry_date = DATE '2027-10-15',
    notes = COALESCE(NULLIF(notes, ''), 'DSC expiry assumed: 2-year Class-3 issued at incorporation — verify against certificate serial.')
WHERE lower(name) = 'vijay ram'
  AND dsc_expiry_date IS NULL;

UPDATE public.ledger_directors
SET dsc_expiry_date = DATE '2027-10-15',
    notes = COALESCE(NULLIF(notes, ''), 'DSC expiry assumed: 2-year Class-3 issued at incorporation — verify against certificate serial.')
WHERE lower(name) = 'chinnigari devendra reddy'
  AND dsc_expiry_date IS NULL;
