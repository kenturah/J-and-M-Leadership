-- RUN THIS IN SUPABASE > SQL EDITOR > paste > Run. Safe to run more than once.
-- It only ADDS columns to your existing enrollments table (nothing is deleted).

alter table public.enrollments
  add column if not exists payment_option text,
  add column if not exists amount_due numeric default 0,
  add column if not exists amount_paid numeric default 0,
  add column if not exists payment_status text default 'Pending',
  add column if not exists registration_status text default 'Pending payment',
  add column if not exists course_start_date date,
  add column if not exists facilitator text,
  add column if not exists communication_status text,
  add column if not exists certification_status text,
  add column if not exists member_type text default 'Public',
  add column if not exists promo_code text,
  add column if not exists balance_due_date date;

-- Tracking view (created AFTER all columns exist so it includes them all)
drop view if exists public.enrollments_tracker;
create view public.enrollments_tracker with (security_invoker = on) as
select *, (amount_due - amount_paid) as outstanding_balance
from public.enrollments;

-- Keep student data private: the public website key must never read this view
revoke all on public.enrollments_tracker from anon;
