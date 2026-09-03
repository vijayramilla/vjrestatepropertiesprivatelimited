-- VJR Estate CRM — payroll visibility toggle per employee
-- Project: qrlkicsxnhaplwkotnyd (CRM/CLI project)
-- When false, the employee cannot see salary or payslip data on their dashboard.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS payroll_visible BOOLEAN NOT NULL DEFAULT TRUE;
