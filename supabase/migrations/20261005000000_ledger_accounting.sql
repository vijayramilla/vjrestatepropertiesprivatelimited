-- LEDGERS accounting foundation: single-company double-entry books.
-- All write functions are restricted to the trusted server proxy (service_role).

CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','income','expense')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ledger_journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  memo TEXT NOT NULL,
  reference TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  reversal_of UUID UNIQUE REFERENCES public.ledger_journals(id),
  reversed_by UUID REFERENCES public.ledger_journals(id),
  posted_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((status = 'posted' AND reversed_by IS NULL) OR (status = 'reversed' AND reversed_by IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_ledger_journals_date ON public.ledger_journals (entry_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ledger_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.ledger_journals(id),
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','income','expense')),
  debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_journal ON public.ledger_journal_lines (journal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_lines_account ON public.ledger_journal_lines (account_id, journal_id);

CREATE TABLE IF NOT EXISTS public.ledger_accounting_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES public.ledger_journals(id),
  account_id UUID REFERENCES public.ledger_accounts(id),
  action TEXT NOT NULL,
  summary TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_accounting_audit_created ON public.ledger_accounting_audit (created_at DESC);

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY['ledger_accounts','ledger_journals','ledger_journal_lines','ledger_accounting_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role;', t);
  END LOOP;
END $$;

INSERT INTO public.ledger_accounts (code, name, account_type) VALUES
  ('1000','Cash','asset'),
  ('1010','Bank','asset'),
  ('1100','Accounts receivable','asset'),
  ('1200','GST input credit','asset'),
  ('1500','Property, plant and equipment','asset'),
  ('2000','Accounts payable','liability'),
  ('2100','GST payable','liability'),
  ('2110','TDS payable','liability'),
  ('3000','Share capital','equity'),
  ('3100','Retained earnings','equity'),
  ('4000','Commission and service revenue','income'),
  ('4100','Rental income','income'),
  ('5000','Operating expenses','expense'),
  ('5100','Professional fees','expense'),
  ('5200','Bank charges','expense')
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ledger_post_journal(
  p_entry_date DATE,
  p_memo TEXT,
  p_reference TEXT,
  p_lines JSONB,
  p_actor TEXT DEFAULT ''
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id UUID;
  v_line JSONB;
  v_account public.ledger_accounts%ROWTYPE;
  v_debit NUMERIC(18,2);
  v_credit NUMERIC(18,2);
  v_total_debit NUMERIC(18,2) := 0;
  v_total_credit NUMERIC(18,2) := 0;
  v_count INT := 0;
BEGIN
  IF p_entry_date IS NULL OR length(trim(coalesce(p_memo, ''))) = 0 OR length(p_memo) > 500 THEN
    RAISE EXCEPTION 'Enter a date and a memo of no more than 500 characters';
  END IF;
  IF length(coalesce(p_reference, '')) > 100 THEN RAISE EXCEPTION 'Reference must be 100 characters or fewer'; END IF;
  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 OR jsonb_array_length(p_lines) > 50 THEN
    RAISE EXCEPTION 'A journal must contain between 2 and 50 lines';
  END IF;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    v_count := v_count + 1;
    v_debit := coalesce(nullif(v_line->>'debit', '')::NUMERIC, 0);
    v_credit := coalesce(nullif(v_line->>'credit', '')::NUMERIC, 0);
    IF v_debit < 0 OR v_credit < 0 OR (v_debit > 0 AND v_credit > 0) OR (v_debit = 0 AND v_credit = 0) THEN
      RAISE EXCEPTION 'Each journal line must have exactly one positive debit or credit';
    END IF;
    IF v_debit <> round(v_debit, 2) OR v_credit <> round(v_credit, 2) THEN RAISE EXCEPTION 'Amounts may have at most two decimal places'; END IF;
    SELECT * INTO v_account FROM public.ledger_accounts WHERE id = (v_line->>'account_id')::UUID AND active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active account for every journal line'; END IF;
    v_total_debit := v_total_debit + v_debit;
    v_total_credit := v_total_credit + v_credit;
  END LOOP;
  IF v_count < 2 OR v_total_debit <= 0 OR v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Journal is not balanced: total debits must equal total credits';
  END IF;

  INSERT INTO public.ledger_journals (entry_date, memo, reference, posted_by)
  VALUES (p_entry_date, trim(p_memo), coalesce(p_reference, ''), coalesce(p_actor, ''))
  RETURNING id INTO v_id;

  FOR v_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    SELECT * INTO v_account FROM public.ledger_accounts WHERE id = (v_line->>'account_id')::UUID AND active;
    v_debit := coalesce(nullif(v_line->>'debit', '')::NUMERIC, 0);
    v_credit := coalesce(nullif(v_line->>'credit', '')::NUMERIC, 0);
    INSERT INTO public.ledger_journal_lines (journal_id, account_id, account_code, account_name, account_type, debit, credit)
    VALUES (v_id, v_account.id, v_account.code, v_account.name, v_account.account_type, v_debit, v_credit);
  END LOOP;

  INSERT INTO public.ledger_accounting_audit (journal_id, action, summary, actor)
  VALUES (v_id, 'posted', format('Posted journal %s · %s · debit %s / credit %s', v_id, trim(p_memo), v_total_debit, v_total_credit), coalesce(p_actor, ''));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ledger_reverse_journal(p_journal_id UUID, p_actor TEXT DEFAULT '') RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_original public.ledger_journals%ROWTYPE;
  v_reversal UUID;
  v_lines JSONB;
BEGIN
  SELECT * INTO v_original FROM public.ledger_journals WHERE id = p_journal_id FOR UPDATE;
  IF NOT FOUND OR v_original.status <> 'posted' THEN RAISE EXCEPTION 'Only a posted journal can be reversed'; END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'account_id', account_id,
    'debit', credit,
    'credit', debit
  ) ORDER BY id) INTO v_lines
  FROM public.ledger_journal_lines WHERE journal_id = p_journal_id;

  v_reversal := public.ledger_post_journal(
    CURRENT_DATE,
    left('Reversal: ' || v_original.memo, 500),
    v_original.reference,
    v_lines,
    p_actor
  );
  UPDATE public.ledger_journals SET status = 'reversed', reversed_by = v_reversal WHERE id = p_journal_id;
  UPDATE public.ledger_journals SET reversal_of = p_journal_id WHERE id = v_reversal;
  INSERT INTO public.ledger_accounting_audit (journal_id, action, summary, actor)
  VALUES (p_journal_id, 'reversed', format('Reversed by journal %s', v_reversal), coalesce(p_actor, ''));
  RETURN v_reversal;
END;
$$;

CREATE OR REPLACE FUNCTION public.ledger_accounting_report(p_as_of_date DATE, p_fy_start DATE) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_result JSONB;
BEGIN
  IF p_as_of_date IS NULL OR p_fy_start IS NULL OR p_fy_start > p_as_of_date THEN RAISE EXCEPTION 'Invalid reporting dates'; END IF;
  WITH balances AS (
    SELECT l.account_id, max(l.account_code) AS code, max(l.account_name) AS name,
      max(l.account_type) AS account_type,
      coalesce(sum(l.debit - l.credit) FILTER (WHERE j.entry_date <= p_as_of_date AND j.status IN ('posted','reversed')), 0)::NUMERIC(18,2) AS net,
      coalesce(sum(l.debit) FILTER (WHERE j.entry_date <= p_as_of_date AND j.status IN ('posted','reversed')), 0)::NUMERIC(18,2) AS debit_total,
      coalesce(sum(l.credit) FILTER (WHERE j.entry_date <= p_as_of_date AND j.status IN ('posted','reversed')), 0)::NUMERIC(18,2) AS credit_total,
      coalesce(sum(CASE WHEN j.entry_date >= p_fy_start AND j.entry_date <= p_as_of_date THEN l.credit - l.debit ELSE 0 END) FILTER (WHERE l.account_type = 'income'), 0)::NUMERIC(18,2) AS income_fy,
      coalesce(sum(CASE WHEN j.entry_date >= p_fy_start AND j.entry_date <= p_as_of_date THEN l.debit - l.credit ELSE 0 END) FILTER (WHERE l.account_type = 'expense'), 0)::NUMERIC(18,2) AS expense_fy,
      coalesce(sum(CASE WHEN l.account_type = 'income' THEN l.credit - l.debit WHEN l.account_type = 'expense' THEN l.debit - l.credit ELSE 0 END) FILTER (WHERE j.entry_date <= p_as_of_date), 0)::NUMERIC(18,2) AS lifetime_profit
    FROM public.ledger_accounts a
    LEFT JOIN public.ledger_journal_lines l ON l.account_id = a.id
    LEFT JOIN public.ledger_journals j ON j.id = l.journal_id
    GROUP BY l.account_id
  ), rows AS (
    SELECT b.*, CASE WHEN account_type IN ('asset','expense') THEN net ELSE -net END AS normal_balance
    FROM balances b
  ), totals AS (
    SELECT
      coalesce(sum(normal_balance) FILTER (WHERE account_type = 'asset'),0) AS assets,
      coalesce(sum(normal_balance) FILTER (WHERE account_type = 'liability'),0) AS liabilities,
      coalesce(sum(normal_balance) FILTER (WHERE account_type = 'equity'),0) AS equity_accounts,
      coalesce(sum(income_fy) FILTER (WHERE account_type = 'income'),0) AS income_fy,
      coalesce(sum(expense_fy) FILTER (WHERE account_type = 'expense'),0) AS expense_fy,
      coalesce(sum(lifetime_profit),0) AS lifetime_profit,
      coalesce(sum(debit_total),0) AS trial_debits,
      coalesce(sum(credit_total),0) AS trial_credits
    FROM rows
  ), accounts_json AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'code', a.code, 'name', a.name, 'account_type', a.account_type, 'active', a.active,
      'balance', coalesce(r.normal_balance,0), 'debits', coalesce(r.debit_total,0), 'credits', coalesce(r.credit_total,0),
      'income_fy', coalesce(r.income_fy,0), 'expense_fy', coalesce(r.expense_fy,0)
    ) ORDER BY a.code), '[]'::jsonb) AS data
    FROM public.ledger_accounts a LEFT JOIN rows r ON r.account_id = a.id
  ), journals_json AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', j.id, 'entry_date', j.entry_date, 'memo', j.memo, 'reference', j.reference,
      'status', j.status, 'reversal_of', j.reversal_of, 'reversed_by', j.reversed_by,
      'posted_by', j.posted_by, 'created_at', j.created_at,
      'lines', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'account_id', l.account_id, 'account_code', l.account_code, 'account_name', l.account_name,
        'account_type', l.account_type, 'debit', l.debit, 'credit', l.credit
      ) ORDER BY l.id) FROM public.ledger_journal_lines l WHERE l.journal_id = j.id), '[]'::jsonb)
    ) ORDER BY j.entry_date DESC, j.created_at DESC) FILTER (WHERE j.id IS NOT NULL), '[]'::jsonb) AS data
    FROM (SELECT * FROM public.ledger_journals WHERE entry_date <= p_as_of_date ORDER BY entry_date DESC, created_at DESC LIMIT 100) j
  ), audit_json AS (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id, 'journal_id', a.journal_id, 'action', a.action, 'summary', a.summary,
      'actor', a.actor, 'created_at', a.created_at
    ) ORDER BY a.created_at DESC) FILTER (WHERE a.id IS NOT NULL), '[]'::jsonb) AS data
    FROM (SELECT * FROM public.ledger_accounting_audit ORDER BY created_at DESC LIMIT 100) a
  )
  SELECT jsonb_build_object(
    'accounts', accounts_json.data,
    'journals', journals_json.data,
    'audit', audit_json.data,
    'totals', jsonb_build_object(
      'assets', totals.assets,
      'liabilities', totals.liabilities,
      'equity', totals.equity_accounts + totals.lifetime_profit,
      'net_income_fy', totals.income_fy - totals.expense_fy,
      'income_fy', totals.income_fy,
      'expense_fy', totals.expense_fy,
      'trial_debits', totals.trial_debits,
      'trial_credits', totals.trial_credits,
      'balance_check', totals.assets - totals.liabilities - totals.equity_accounts - totals.lifetime_profit
    )
  ) INTO v_result
  FROM totals CROSS JOIN accounts_json CROSS JOIN journals_json CROSS JOIN audit_json;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.ledger_post_journal(DATE, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_reverse_journal(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_accounting_report(DATE, DATE) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ledger_post_journal(DATE, TEXT, TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ledger_reverse_journal(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.ledger_accounting_report(DATE, DATE) TO service_role;

NOTIFY pgrst, 'reload schema';
