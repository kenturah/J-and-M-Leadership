-- RUN THIS IN SUPABASE SQL EDITOR *BEFORE* GOING LIVE (the new form sends these columns)
alter table public.enrollments
  add column if not exists payment_option text,
  add column if not exists amount_due numeric default 0,
  add column if not exists amount_paid numeric default 0,
  add column if not exists payment_status text default 'Pending',
  add column if not exists registration_status text default 'Pending payment',
  add column if not exists course_start_date date,
  add column if not exists facilitator text,
  add column if not exists communication_status text,
  add column if not exists certification_status text;
-- Outstanding balance, for your tracking view
create or replace view public.enrollments_tracker as
select *, (amount_due - amount_paid) as outstanding_balance from public.enrollments;
