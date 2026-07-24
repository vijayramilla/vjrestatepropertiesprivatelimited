// Try to create the table using a direct database connection
// Attempt 1: use the service_role JWT as the DB password (common Supabase convention)
// Attempt 2: use pg connection pooler

const SUPABASE_REF = 'qrlkicsxnhaplwkotnyd';
const SERVICE_ROLE_JWT = process.env.VITE_SUPABASE_CLI_SERVICE_KEY || '';
const SERVICE_KEY = process.env.VITE_SUPABASE_CLI_SERVICE_KEY || '';

const SQL = `
CREATE TABLE IF NOT EXISTS public.crm_clients (
  id BIGSERIAL PRIMARY KEY,
  sno BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  budget_val DOUBLE PRECISION NOT NULL DEFAULT 0,
  location TEXT NOT NULL DEFAULT '',
  closed_price TEXT NOT NULL DEFAULT '',
  closing_timeline TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT '',
  date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  buyer_comm_pct TEXT NOT NULL DEFAULT '',
  buyer_comm_val TEXT NOT NULL DEFAULT '',
  seller_comm_pct TEXT NOT NULL DEFAULT '',
  seller_comm_val TEXT NOT NULL DEFAULT '',
  total_comm TEXT NOT NULL DEFAULT '',
  comm_status TEXT NOT NULL DEFAULT '',
  my_share TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT '',
  updated_date TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for all users" ON public.crm_clients;
CREATE POLICY "Enable all for all users" ON public.crm_clients
  FOR ALL USING (true);
`;

async function tryViaPg() {
  try {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({
      host: `aws-0-ap-south-1.pooler.supabase.com`,
      port: 6543,
      database: 'postgres',
      user: `postgres.${SUPABASE_REF}`,
      password: SERVICE_ROLE_JWT,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 10000,
    });
    const client = await pool.connect();
    console.log('Connected via pooler');
    await client.query(SQL);
    console.log('Table created successfully via pg pooler!');
    client.release();
    await pool.end();
    return true;
  } catch (e) {
    console.log('pg pooler failed:', e.message);
    return false;
  }
}

async function tryViaRestApi() {
  // Last resort: try Supabase SQL endpoint via service_role JWT
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: SQL }),
    });
    if (res.ok) {
      console.log('Table created via Management API!');
      return true;
    }
    console.log('Management API failed:', res.status, await res.text());
  } catch (e) {
    console.log('Management API error:', e.message);
  }
  return false;
}

async function main() {
  if (await tryViaPg()) return;
  if (await tryViaRestApi()) return;
  console.log('\nCould not create table automatically.');
  console.log('Please paste scripts/migrate.sql into your Supabase dashboard SQL Editor.');
}

main();
