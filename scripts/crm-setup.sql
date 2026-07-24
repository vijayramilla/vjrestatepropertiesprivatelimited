-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- Creates the CRM clients table and seeds the initial data

CREATE TABLE IF NOT EXISTS crm_clients (
  id BIGSERIAL PRIMARY KEY,
  sno INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'PG Building',
  budget TEXT NOT NULL,
  budget_val NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'New Lead',
  date DATE,
  notes TEXT DEFAULT '',
  source TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (for the public-facing CRM)
CREATE POLICY "Allow anonymous read" ON crm_clients
  FOR SELECT USING (true);

-- Allow anonymous insert/update/delete (for admin operations)
CREATE POLICY "Allow anonymous write" ON crm_clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update" ON crm_clients
  FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete" ON crm_clients
  FOR DELETE USING (true);

-- Seed data
INSERT INTO crm_clients (sno, name, phone, type, budget, budget_val, status, date, notes, source) VALUES
  (196, 'Nagaarjuna Reddy', '9945554009', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (198, 'Adam Oberoi', '9920339405', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (199, 'Abdul Fathah', '8951650837', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (200, 'Yeshwanth', '8904040432', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (201, 'Sri Ram', '9944268422', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (202, 'Saie Chandradekhar', '9535155166', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (206, 'Yashas Anand', '81975 68541', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (207, 'Ravi', '61 415 719 950', 'PG Building', '6.5 Cr', 6.5, 'New Lead', NULL, '', ''),
  (208, 'Karthik', '98801 15983', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-06', '', ''),
  (209, 'Sunil Reddy', '9996668033', 'PG Building', '5 to 6 Cr', 5.5, 'New Lead', '2026-05-06', 'Travel and transport business', ''),
  (210, 'Sandeep', '94800 08899', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-06', '', ''),
  (216, 'Nikhila', '88847 93711', 'PG Building', '5 to 6 Cr', 5.5, 'New Lead', '2026-05-06', '', ''),
  (217, 'Kartik Parasher', '75056 83996', 'PG Building', '6 Cr', 6, 'New Lead', '2026-05-06', '', ''),
  (219, 'Annapurna Borra', '7411 661 666', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-08', '', ''),
  (225, 'Abdul Rawoof', '94405 82959', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-08', '', ''),
  (226, 'Chunduru Harikumar', '99484 28781', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-09', '', ''),
  (228, 'Arjun', '83747 71715', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-10', '', ''),
  (229, 'Shree Prashasta N', '821 782 4483', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-11', '', ''),
  (230, 'Sharad Kiyal', '90515 33717', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-11', '', ''),
  (231, 'Sreeram Purushotham', '92991 55551', 'PG Building', '2 Cr', 2, 'New Lead', '2026-05-11', '', ''),
  (243, 'K Karthik', '8971846698', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-22', '', ''),
  (244, 'James Anthony', '9343047196', 'PG Building', '4.10 Cr', 4.1, 'New Lead', '2026-05-22', '', ''),
  (246, 'Nagendra', '94801 01386', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-22', '', ''),
  (247, 'Pavan K', '8978946984', 'PG Building', '3 Cr', 3, 'New Lead', '2026-05-22', '', ''),
  (248, 'Daivik Raju', '8880022322', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-05-22', '', ''),
  (250, 'Somya', '9536769000', 'PG Building', '13 Cr', 13, 'New Lead', '2026-06-05', '', ''),
  (251, 'Daivik Raju', '88800 22322', 'PG Building', '8 Cr', 8, 'New Lead', '2026-06-05', '', ''),
  (254, 'Sandhya', '9008810469', 'PG Building', '8 Cr', 8, 'New Lead', '2026-06-05', '', ''),
  (259, 'Shashank Reddy', '9620742028', 'PG Building', '6.5 Cr', 6.5, 'New Lead', '2026-06-07', '', 'Instagram');
