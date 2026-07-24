CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  db_size bigint;
  result json;
BEGIN
  db_size := pg_database_size(current_database());

  SELECT json_build_object(
    'database_size', db_size,
    'tables', COALESCE(
      (SELECT json_agg(json_build_object(
        'name', t.relname,
        'row_count', COALESCE(t.n_live_tup, 0),
        'size', pg_total_relation_size(t.relid)
      ) ORDER BY pg_total_relation_size(t.relid) DESC)
      FROM pg_stat_user_tables t
      WHERE t.schemaname = 'public'
    ), '[]'::json),
    'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'total_tables', (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE')
  ) INTO result;

  RETURN result;
END;
$$;
