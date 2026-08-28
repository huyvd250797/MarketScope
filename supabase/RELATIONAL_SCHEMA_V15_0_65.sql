-- =============================================================
-- Mẹ Yêu Bé V15.0.65 · RelationalMigrationDoctor
-- Purpose:
--   Create the normalized relational database foundation for the app.
--   The legacy public.meyeube_sync JSONB table is kept as backup/legacy.
--   The current app version does NOT switch normal app writes to these new tables yet. V15.0.65 keeps manual migration RPCs and repairs existing legacy tables safely.
--
-- Run this file in Supabase SQL Editor after the legacy setup.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Helpers ----------
create or replace function public.myb_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------- Bootstrap dependency tables ----------
-- These two tables must exist before public.myb_can_access_family() is created,
-- because PostgreSQL validates SQL-function relation references at CREATE FUNCTION time.
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  sync_code text unique,
  name text not null default 'Mẹ Yêu Bé',
  status text not null default 'active',
  legacy_sync_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.family_users (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(family_id, user_id)
);

-- Future RLS helper. It expects Supabase Auth users to be linked through public.family_users.
-- Until Auth is introduced, service_role/RPC migration tools can populate these tables.
create or replace function public.myb_can_access_family(p_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_users fu
    where fu.family_id = p_family_id
      and fu.user_id = auth.uid()
      and fu.deleted_at is null
  );
$$;

-- ---------- Legacy table kept ----------
create table if not exists public.meyeube_sync (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists meyeube_sync_updated_at_idx on public.meyeube_sync(updated_at desc);
create index if not exists meyeube_sync_id_updated_at_idx on public.meyeube_sync(id, updated_at);
comment on table public.meyeube_sync is 'Legacy monolithic JSONB sync table. Keep as backup until relational migration is complete.';

-- ---------- Core / family / device ----------
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  sync_code text unique,
  name text not null default 'Mẹ Yêu Bé',
  status text not null default 'active',
  legacy_sync_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.family_users (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(family_id, user_id)
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  device_name text,
  device_type text,
  platform text,
  app_version text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  baby_nickname text,
  baby_official_name text,
  baby_sex text,
  birth_date date,
  birth_time text,
  birth_hospital text,
  theme_mode text,
  dashboard_config jsonb not null default '{}'::jsonb,
  cloud_config jsonb not null default '{}'::jsonb,
  smart_alert_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz,
  unique(family_id)
);

-- ---------- Health book ----------
create table if not exists public.health_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  relation text,
  display_name text,
  full_name text,
  gender text,
  dob date,
  blood_type text,
  height_text text,
  weight_text text,
  phone text,
  email text,
  bhyt text,
  bhyt_exp date,
  bhyt_place text,
  bhxh text,
  hospital text,
  doctor text,
  emergency_contact text,
  status_text text,
  status_tone text,
  notes text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.health_measurements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  measure_date date not null,
  weight_g numeric,
  height_cm numeric,
  head_cm numeric,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.health_visits (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  visit_date date,
  visit_time text,
  hospital text,
  doctor text,
  symptom text,
  diagnosis text,
  treatment text,
  medicine_note text,
  cost numeric,
  insurance_used boolean default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.health_medications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  name text not null,
  dose text,
  from_date date,
  to_date date,
  active boolean not null default true,
  remind boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  deleted_at timestamptz
);

create table if not exists public.health_allergies (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  allergy_type text,
  name text,
  reaction text,
  severity text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.health_labs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  lab_date date,
  title text,
  place text,
  result_summary text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  deleted_at timestamptz
);

-- ---------- Vaccination ----------
create table if not exists public.vaccine_catalog (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  name text not null,
  short_name text,
  disease text,
  manufacturer text,
  country text,
  description text,
  is_required boolean not null default false,
  is_service boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.vaccine_schedule_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  source text not null default 'national',
  age_month int,
  age_day int,
  vaccine_id uuid references public.vaccine_catalog(id) on delete set null,
  dose_number int,
  dose_label text,
  recommended_from_days int,
  recommended_to_days int,
  note text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.child_vaccine_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  vaccine_id uuid references public.vaccine_catalog(id) on delete set null,
  template_id uuid references public.vaccine_schedule_templates(id) on delete set null,
  dose_number int,
  due_date date,
  status text not null default 'pending',
  postponed_to date,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.vaccine_records (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  plan_id uuid references public.child_vaccine_plans(id) on delete set null,
  vaccine_id uuid references public.vaccine_catalog(id) on delete set null,
  vaccine_name text,
  dose_number int,
  injection_date date,
  injection_time text,
  place text,
  manufacturer text,
  lot_number text,
  price numeric,
  reaction text,
  reaction_level text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.vaccine_reminders (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.health_members(id) on delete cascade,
  plan_id uuid references public.child_vaccine_plans(id) on delete cascade,
  remind_at timestamptz,
  remind_before_days int,
  enabled boolean not null default true,
  last_notified_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- Daily care ----------
create table if not exists public.care_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.health_members(id) on delete set null,
  type text not null,
  event_date date,
  time_from text,
  time_to text,
  amount numeric,
  unit text,
  source text,
  status text,
  note text,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  feed_type text,
  milk_type text,
  actual_ml numeric,
  taken_ml numeric,
  wasted_ml numeric,
  formula_brand text,
  count_as_feed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.pump_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  side text,
  amount_ml numeric,
  duration_min int,
  storage text,
  container_id uuid,
  container_kind text,
  container_name text,
  expire_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.sleep_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  sleep_from timestamptz,
  sleep_to timestamptz,
  duration_min int,
  quality text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.diaper_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  wet boolean default false,
  dirty boolean default false,
  stool_color text,
  stool_amount text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.temperature_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  care_event_id uuid not null references public.care_events(id) on delete cascade,
  temperature_c numeric,
  measure_place text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- Milk inventory / ledger ----------
create table if not exists public.milk_containers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  kind text,
  color text,
  capacity_ml numeric,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.milk_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  pump_event_id uuid references public.pump_events(id) on delete set null,
  short_code text,
  container_id uuid references public.milk_containers(id) on delete set null,
  container_kind text,
  container_name text,
  storage text,
  amount_ml numeric not null default 0,
  expire_at timestamptz,
  status text not null default 'storing',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.milk_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  milk_item_id uuid not null references public.milk_items(id) on delete cascade,
  care_event_id uuid references public.care_events(id) on delete set null,
  transaction_type text not null,
  ml numeric not null default 0,
  reason text,
  created_at timestamptz not null default now(),
  created_by_device uuid references public.devices(id) on delete set null,
  deleted_at timestamptz
);

create table if not exists public.feed_milk_sources (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  feed_event_id uuid not null references public.feed_events(id) on delete cascade,
  milk_item_id uuid not null references public.milk_items(id) on delete restrict,
  used_ml numeric not null default 0,
  discard_ml numeric not null default 0,
  remainder_action text default 'keep',
  order_index int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace view public.milk_item_balances as
select
  mi.id as milk_item_id,
  mi.family_id,
  mi.amount_ml,
  coalesce(sum(case when mt.transaction_type = 'create' and mt.deleted_at is null then mt.ml else 0 end), 0) as created_ml,
  coalesce(sum(case when mt.transaction_type = 'feed_use' and mt.deleted_at is null then mt.ml else 0 end), 0) as used_ml,
  coalesce(sum(case when mt.transaction_type = 'discard' and mt.deleted_at is null then mt.ml else 0 end), 0) as discarded_ml,
  coalesce(sum(case when mt.transaction_type = 'transfer_out' and mt.deleted_at is null then mt.ml else 0 end), 0) as transferred_out_ml,
  coalesce(sum(case when mt.transaction_type = 'transfer_in' and mt.deleted_at is null then mt.ml else 0 end), 0) as transferred_in_ml,
  coalesce(sum(case when mt.transaction_type = 'adjust' and mt.deleted_at is null then mt.ml else 0 end), 0) as adjusted_ml,
  greatest(
    0,
    mi.amount_ml
      - coalesce(sum(case when mt.transaction_type = 'feed_use' and mt.deleted_at is null then mt.ml else 0 end), 0)
      - coalesce(sum(case when mt.transaction_type = 'discard' and mt.deleted_at is null then mt.ml else 0 end), 0)
      - coalesce(sum(case when mt.transaction_type = 'transfer_out' and mt.deleted_at is null then mt.ml else 0 end), 0)
      + coalesce(sum(case when mt.transaction_type = 'transfer_in' and mt.deleted_at is null then mt.ml else 0 end), 0)
      + coalesce(sum(case when mt.transaction_type = 'adjust' and mt.deleted_at is null then mt.ml else 0 end), 0)
  ) as remaining_ml,
  case
    when mi.deleted_at is not null then 'deleted'
    when mi.status = 'discarded' then 'discarded'
    when mi.expire_at is not null and mi.expire_at < now() then 'expired'
    when greatest(0, mi.amount_ml
      - coalesce(sum(case when mt.transaction_type = 'feed_use' and mt.deleted_at is null then mt.ml else 0 end), 0)
      - coalesce(sum(case when mt.transaction_type = 'discard' and mt.deleted_at is null then mt.ml else 0 end), 0)
      - coalesce(sum(case when mt.transaction_type = 'transfer_out' and mt.deleted_at is null then mt.ml else 0 end), 0)
      + coalesce(sum(case when mt.transaction_type = 'transfer_in' and mt.deleted_at is null then mt.ml else 0 end), 0)
      + coalesce(sum(case when mt.transaction_type = 'adjust' and mt.deleted_at is null then mt.ml else 0 end), 0)
    ) <= 0 then 'used_up'
    else 'storing'
  end as computed_status
from public.milk_items mi
left join public.milk_transactions mt on mt.milk_item_id = mi.id
where mi.deleted_at is null
group by mi.id, mi.family_id, mi.amount_ml, mi.status, mi.expire_at, mi.deleted_at;

-- ---------- Appointments / alerts / push ----------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.health_members(id) on delete set null,
  type_id uuid,
  title text,
  appointment_date date,
  appointment_time text,
  place text,
  doctor text,
  note text,
  status text default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  deleted_at timestamptz
);

create table if not exists public.smart_alert_rules (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  rule_type text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  endpoint text not null,
  p256dh text,
  auth text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(family_id, endpoint)
);

create table if not exists public.push_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  alert_type text,
  target_id uuid,
  device_id uuid references public.devices(id) on delete set null,
  sent_at timestamptz not null default now(),
  status text,
  error text
);

-- ---------- Media / diary / milestones / categories ----------
create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.health_members(id) on delete set null,
  module text,
  owner_table text,
  owner_id uuid,
  kind text,
  title text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  bucket text,
  storage_path text,
  thumb_path text,
  local_blob_key text,
  storage_provider text not null default 'supabase',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  created_by_device uuid references public.devices(id) on delete set null,
  updated_by_device uuid references public.devices(id) on delete set null,
  last_op_id uuid,
  deleted_at timestamptz
);

create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.health_members(id) on delete set null,
  entry_date date,
  time_from text,
  time_to text,
  category text,
  title text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  deleted_at timestamptz
);

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid references public.health_members(id) on delete set null,
  milestone_date date,
  title text,
  type text,
  note text,
  auto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version int not null default 1,
  deleted_at timestamptz
);

create table if not exists public.care_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  category_type text,
  name text,
  icon text,
  color text,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------- Change log / operation journal ----------
create table if not exists public.change_logs (
  id bigserial primary key,
  family_id uuid not null references public.families(id) on delete cascade,
  table_name text not null,
  row_id uuid not null,
  operation text not null,
  op_id uuid not null default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  server_version int not null default 1,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  source_sync_id text,
  source_app_version text,
  status text not null default 'draft',
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);


-- ---------- Existing-project compatibility repairs ----------
-- Older Mẹ Yêu Bé projects may already contain legacy tables with the same
-- names but without the new relational columns. `CREATE TABLE IF NOT EXISTS`
-- does not add missing columns, so repair columns before indexes, triggers,
-- and RLS policies are created. This keeps legacy rows untouched.
do $$
declare
  t text;
  required_family_tables text[] := array[
    'devices','app_settings','health_members','health_measurements','health_visits','health_medications','health_allergies','health_labs',
    'child_vaccine_plans','vaccine_records','vaccine_reminders','care_events','feed_events','pump_events','sleep_events','diaper_events','temperature_events',
    'milk_containers','milk_items','milk_transactions','feed_milk_sources','appointments','smart_alert_rules','push_subscriptions','push_delivery_logs',
    'media_files','diary_entries','milestones','care_categories','change_logs','migration_batches'
  ];
begin
  foreach t in array required_family_tables loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'family_id'
      ) then
        execute format('alter table public.%I add column family_id uuid references public.families(id) on delete cascade', t);
      end if;

      if t <> 'change_logs' and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'created_at'
      ) then
        execute format('alter table public.%I add column created_at timestamptz not null default now()', t);
      end if;

      if t <> 'change_logs' and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'updated_at'
      ) then
        execute format('alter table public.%I add column updated_at timestamptz not null default now()', t);
      end if;

      if t <> 'change_logs' and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = t and column_name = 'deleted_at'
      ) then
        execute format('alter table public.%I add column deleted_at timestamptz', t);
      end if;
    end if;
  end loop;

  -- Legacy push_subscriptions from older push notification setup usually has
  -- sync_id/endpoint/p256dh/auth/enabled but no family_id/device_id/id. Add the
  -- missing relational columns without removing any legacy columns.
  if to_regclass('public.push_subscriptions') is not null then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='id') then
      alter table public.push_subscriptions add column id uuid default gen_random_uuid();
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='device_id') then
      alter table public.push_subscriptions add column device_id uuid references public.devices(id) on delete set null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='endpoint') then
      alter table public.push_subscriptions add column endpoint text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='p256dh') then
      alter table public.push_subscriptions add column p256dh text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='auth') then
      alter table public.push_subscriptions add column auth text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='push_subscriptions' and column_name='enabled') then
      alter table public.push_subscriptions add column enabled boolean not null default true;
    end if;
  end if;
end $$;

create unique index if not exists idx_push_subscriptions_family_endpoint
on public.push_subscriptions(family_id, endpoint)
where family_id is not null and endpoint is not null and deleted_at is null;

-- ---------- Indexes ----------
create index if not exists idx_family_users_family on public.family_users(family_id) where deleted_at is null;
create index if not exists idx_devices_family on public.devices(family_id) where deleted_at is null;
create index if not exists idx_health_members_family on public.health_members(family_id, relation) where deleted_at is null;
create index if not exists idx_health_measurements_member_date on public.health_measurements(member_id, measure_date desc) where deleted_at is null;
create index if not exists idx_health_visits_member_date on public.health_visits(member_id, visit_date desc) where deleted_at is null;
create index if not exists idx_care_events_family_date_type on public.care_events(family_id, event_date desc, type) where deleted_at is null;
create index if not exists idx_feed_events_care on public.feed_events(care_event_id) where deleted_at is null;
create index if not exists idx_pump_events_care on public.pump_events(care_event_id) where deleted_at is null;
create index if not exists idx_milk_items_family_status_expire on public.milk_items(family_id, status, expire_at) where deleted_at is null;
create index if not exists idx_milk_tx_item_type on public.milk_transactions(milk_item_id, transaction_type) where deleted_at is null;
create index if not exists idx_feed_milk_sources_feed on public.feed_milk_sources(feed_event_id) where deleted_at is null;
create index if not exists idx_vaccine_plans_member_due on public.child_vaccine_plans(member_id, due_date) where deleted_at is null;
create index if not exists idx_vaccine_records_member_date on public.vaccine_records(member_id, injection_date desc) where deleted_at is null;
create index if not exists idx_media_owner on public.media_files(owner_table, owner_id) where deleted_at is null;
create index if not exists idx_change_logs_family_id on public.change_logs(family_id, id desc);
create index if not exists idx_change_logs_family_table_row on public.change_logs(family_id, table_name, row_id, id desc);

-- ---------- updated_at triggers ----------
do $$
declare
  t text;
begin
  foreach t in array array[
    'families','family_users','devices','app_settings','health_members','health_measurements','health_visits','health_medications','health_allergies','health_labs',
    'vaccine_catalog','vaccine_schedule_templates','child_vaccine_plans','vaccine_records','vaccine_reminders',
    'care_events','feed_events','pump_events','sleep_events','diaper_events','temperature_events',
    'milk_containers','milk_items','feed_milk_sources','appointments','smart_alert_rules','push_subscriptions','media_files','diary_entries','milestones','care_categories','migration_batches'
  ] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.myb_set_updated_at()', 'trg_' || t || '_updated_at', t);
  end loop;
end $$;

-- ---------- RLS ----------
alter table public.families enable row level security;
alter table public.family_users enable row level security;
alter table public.devices enable row level security;
alter table public.app_settings enable row level security;
alter table public.health_members enable row level security;
alter table public.health_measurements enable row level security;
alter table public.health_visits enable row level security;
alter table public.health_medications enable row level security;
alter table public.health_allergies enable row level security;
alter table public.health_labs enable row level security;
alter table public.vaccine_catalog enable row level security;
alter table public.vaccine_schedule_templates enable row level security;
alter table public.child_vaccine_plans enable row level security;
alter table public.vaccine_records enable row level security;
alter table public.vaccine_reminders enable row level security;
alter table public.care_events enable row level security;
alter table public.feed_events enable row level security;
alter table public.pump_events enable row level security;
alter table public.sleep_events enable row level security;
alter table public.diaper_events enable row level security;
alter table public.temperature_events enable row level security;
alter table public.milk_containers enable row level security;
alter table public.milk_items enable row level security;
alter table public.milk_transactions enable row level security;
alter table public.feed_milk_sources enable row level security;
alter table public.appointments enable row level security;
alter table public.smart_alert_rules enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_delivery_logs enable row level security;
alter table public.media_files enable row level security;
alter table public.diary_entries enable row level security;
alter table public.milestones enable row level security;
alter table public.care_categories enable row level security;
alter table public.change_logs enable row level security;
alter table public.migration_batches enable row level security;

-- Family membership policy tables
drop policy if exists families_member_all on public.families;
create policy families_member_all on public.families
for all to authenticated
using (public.myb_can_access_family(id))
with check (public.myb_can_access_family(id));

drop policy if exists family_users_member_all on public.family_users;
create policy family_users_member_all on public.family_users
for all to authenticated
using (public.myb_can_access_family(family_id))
with check (public.myb_can_access_family(family_id));

-- Tables with a required family_id.
do $$
declare
  t text;
begin
  foreach t in array array[
    'devices','app_settings','health_members','health_measurements','health_visits','health_medications','health_allergies','health_labs',
    'child_vaccine_plans','vaccine_records','vaccine_reminders','care_events','feed_events','pump_events','sleep_events','diaper_events','temperature_events',
    'milk_containers','milk_items','milk_transactions','feed_milk_sources','appointments','smart_alert_rules','push_subscriptions','push_delivery_logs',
    'media_files','diary_entries','milestones','care_categories','change_logs','migration_batches'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_family_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.myb_can_access_family(family_id)) with check (public.myb_can_access_family(family_id))', t || '_family_all', t);
  end loop;
end $$;

-- Catalog/template: public rows are readable; custom family rows require membership.
drop policy if exists vaccine_catalog_select on public.vaccine_catalog;
create policy vaccine_catalog_select on public.vaccine_catalog
for select to anon, authenticated
using (family_id is null or public.myb_can_access_family(family_id));

drop policy if exists vaccine_catalog_family_write on public.vaccine_catalog;
create policy vaccine_catalog_family_write on public.vaccine_catalog
for all to authenticated
using (family_id is not null and public.myb_can_access_family(family_id))
with check (family_id is not null and public.myb_can_access_family(family_id));

drop policy if exists vaccine_schedule_templates_select on public.vaccine_schedule_templates;
create policy vaccine_schedule_templates_select on public.vaccine_schedule_templates
for select to anon, authenticated
using (family_id is null or public.myb_can_access_family(family_id));

drop policy if exists vaccine_schedule_templates_family_write on public.vaccine_schedule_templates;
create policy vaccine_schedule_templates_family_write on public.vaccine_schedule_templates
for all to authenticated
using (family_id is not null and public.myb_can_access_family(family_id))
with check (family_id is not null and public.myb_can_access_family(family_id));

-- Keep legacy meyeube_sync RLS as-is for current app until relational write mode is enabled.
alter table public.meyeube_sync enable row level security;
drop policy if exists meyeube_sync_select_all on public.meyeube_sync;
create policy meyeube_sync_select_all on public.meyeube_sync for select to anon using (true);
drop policy if exists meyeube_sync_insert_all on public.meyeube_sync;
create policy meyeube_sync_insert_all on public.meyeube_sync for insert to anon with check (true);
drop policy if exists meyeube_sync_update_all on public.meyeube_sync;
create policy meyeube_sync_update_all on public.meyeube_sync for update to anon using (true) with check (true);

insert into public.meyeube_sync (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

-- ---------- Comments ----------
comment on table public.change_logs is 'Append-only relational change feed for future realtime/queue sync. V15.0.65 keeps legacy JSON as backup and adds manual JSON-to-relational migration RPCs; normal app writes remain on legacy JSON until RelationalWriteQueue.';
comment on table public.media_files is 'Metadata for files stored in Supabase Storage or local IndexedDB; never store base64 blobs in app data.';
comment on table public.milk_transactions is 'Milk ledger transaction table; balances are computed from transactions instead of mutating remaining by hand.';
comment on view public.milk_item_balances is 'Computed milk balance view for future relational milk ledger.';
-- =============================================================
-- V15.0.65 · RelationalMigrationDoctor
-- Manual migration RPCs: legacy public.meyeube_sync.data JSONB -> relational tables.
-- Normal app save/read flow is NOT switched in this version.
-- =============================================================

-- ---------- Migration helper functions ----------
create or replace function public.myb_json_array(p_value jsonb)
returns jsonb
language sql
immutable
as $$
  select case when jsonb_typeof(p_value) = 'array' then p_value else '[]'::jsonb end;
$$;

create or replace function public.myb_json_object(p_value jsonb)
returns jsonb
language sql
immutable
as $$
  select case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end;
$$;

create or replace function public.myb_stable_uuid(p_text text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(coalesce(p_text,'')),1,8) || '-' ||
    substr(md5(coalesce(p_text,'')),9,4) || '-' ||
    substr(md5(coalesce(p_text,'')),13,4) || '-' ||
    substr(md5(coalesce(p_text,'')),17,4) || '-' ||
    substr(md5(coalesce(p_text,'')),21,12)
  )::uuid;
$$;

create or replace function public.myb_safe_date(p_text text)
returns date
language plpgsql
immutable
as $$
begin
  if p_text is null or btrim(p_text) = '' then return null; end if;
  return left(btrim(p_text),10)::date;
exception when others then
  return null;
end;
$$;

create or replace function public.myb_safe_timestamptz(p_text text)
returns timestamptz
language plpgsql
immutable
as $$
begin
  if p_text is null or btrim(p_text) = '' then return null; end if;
  return p_text::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.myb_num(p_text text)
returns numeric
language plpgsql
immutable
as $$
declare
  v text;
begin
  if p_text is null or btrim(p_text) = '' then return null; end if;
  v := replace(p_text, ',', '.');
  v := regexp_replace(v, '[^0-9\.\-]+', '', 'g');
  if v is null or v = '' or v = '-' or v = '.' then return null; end if;
  return v::numeric;
exception when others then
  return null;
end;
$$;

create or replace function public.myb_weight_g(p_text text)
returns numeric
language plpgsql
immutable
as $$
declare
  n numeric;
  s text := lower(coalesce(p_text,''));
begin
  n := public.myb_num(p_text);
  if n is null then return null; end if;
  if position('kg' in s) > 0 then return round(n * 1000, 2); end if;
  return n;
end;
$$;


create or replace function public.myb_bool(p_text text, p_default boolean default false)
returns boolean
language plpgsql
immutable
as $$
declare
  v text := lower(btrim(coalesce(p_text,'')));
begin
  if v = '' then return p_default; end if;
  if v in ('true','t','1','yes','y','on','bật','bat','co','có') then return true; end if;
  if v in ('false','f','0','no','n','off','tắt','tat','khong','không') then return false; end if;
  return p_default;
end;
$$;

create or replace function public.myb_status_en(p_text text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_text,''))
    when 'đang bảo quản' then 'storing'
    when 'đã sử dụng hết' then 'used_up'
    when 'đã sử dụng' then 'used_up'
    when 'đã bỏ' then 'discarded'
    when 'hết hạn' then 'expired'
    when 'đã chuyển hết' then 'transferred'
    else nullif(coalesce(p_text,''),'')
  end;
$$;

create or replace function public.myb_relation_norm(p_text text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_text,'')) in ('con','bé','baby','child') then 'Con'
    when lower(coalesce(p_text,'')) in ('mẹ','me','mom','mother') then 'Mẹ'
    when lower(coalesce(p_text,'')) in ('ba','bố','bo','dad','father') then 'Ba'
    when lower(coalesce(p_text,'')) in ('ông','ong') then 'Ông'
    when lower(coalesce(p_text,'')) in ('bà','bà') then 'Bà'
    else coalesce(nullif(p_text,''),'Khác')
  end;
$$;

create or replace function public.myb_migration_source_counts(p_data jsonb)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'settings', case when public.myb_json_object(p_data->'settings') <> '{}'::jsonb then 1 else 0 end,
    'hb_members', jsonb_array_length(public.myb_json_array(p_data#>'{hb,members}')),
    'healthBook_legacy', jsonb_array_length(public.myb_json_array(p_data->'healthBook')),
    'health_measurements_baby', jsonb_array_length(public.myb_json_array(p_data->'baby')),
    'health_measurements_mom', jsonb_array_length(public.myb_json_array(p_data->'mom')),
    'careEvents', jsonb_array_length(public.myb_json_array(p_data->'careEvents')),
    'milkInventory', jsonb_array_length(public.myb_json_array(p_data->'milkInventory')),
    'milkContainers', jsonb_array_length(public.myb_json_array(p_data->'milkContainers')),
    'appointments', jsonb_array_length(public.myb_json_array(p_data->'appointments')),
    'appointmentTypes', jsonb_array_length(public.myb_json_array(p_data->'appointmentTypes')),
    'diary', jsonb_array_length(public.myb_json_array(p_data->'diary')),
    'diaryTypes', jsonb_array_length(public.myb_json_array(p_data->'diaryTypes')),
    'milestones', jsonb_array_length(public.myb_json_array(p_data->'milestones')),
    'pregnancy', jsonb_array_length(public.myb_json_array(p_data->'pregnancy')),
    'monthlyNotes_keys', coalesce((select count(*) from jsonb_object_keys(public.myb_json_object(p_data->'monthlyNotes'))),0)
  );
$$;

create or replace function public.myb_relational_table_counts(p_family_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'families', (select count(*) from public.families where id = p_family_id and deleted_at is null),
    'app_settings', (select count(*) from public.app_settings where family_id = p_family_id and deleted_at is null),
    'devices', (select count(*) from public.devices where family_id = p_family_id and deleted_at is null),
    'health_members', (select count(*) from public.health_members where family_id = p_family_id and deleted_at is null),
    'health_measurements', (select count(*) from public.health_measurements where family_id = p_family_id and deleted_at is null),
    'health_visits', (select count(*) from public.health_visits where family_id = p_family_id and deleted_at is null),
    'health_medications', (select count(*) from public.health_medications where family_id = p_family_id and deleted_at is null),
    'health_allergies', (select count(*) from public.health_allergies where family_id = p_family_id and deleted_at is null),
    'health_labs', (select count(*) from public.health_labs where family_id = p_family_id and deleted_at is null),
    'vaccine_catalog', (select count(*) from public.vaccine_catalog where family_id = p_family_id and deleted_at is null),
    'child_vaccine_plans', (select count(*) from public.child_vaccine_plans where family_id = p_family_id and deleted_at is null),
    'vaccine_records', (select count(*) from public.vaccine_records where family_id = p_family_id and deleted_at is null),
    'care_events', (select count(*) from public.care_events where family_id = p_family_id and deleted_at is null),
    'feed_events', (select count(*) from public.feed_events where family_id = p_family_id and deleted_at is null),
    'pump_events', (select count(*) from public.pump_events where family_id = p_family_id and deleted_at is null),
    'milk_containers', (select count(*) from public.milk_containers where family_id = p_family_id and deleted_at is null),
    'milk_items', (select count(*) from public.milk_items where family_id = p_family_id and deleted_at is null),
    'milk_transactions', (select count(*) from public.milk_transactions where family_id = p_family_id and deleted_at is null),
    'feed_milk_sources', (select count(*) from public.feed_milk_sources where family_id = p_family_id and deleted_at is null),
    'appointments', (select count(*) from public.appointments where family_id = p_family_id and deleted_at is null),
    'media_files', (select count(*) from public.media_files where family_id = p_family_id and deleted_at is null),
    'diary_entries', (select count(*) from public.diary_entries where family_id = p_family_id and deleted_at is null),
    'milestones', (select count(*) from public.milestones where family_id = p_family_id and deleted_at is null),
    'care_categories', (select count(*) from public.care_categories where family_id = p_family_id and deleted_at is null),
    'change_logs', (select count(*) from public.change_logs where family_id = p_family_id),
    'migration_batches', (select count(*) from public.migration_batches where family_id = p_family_id and deleted_at is null)
  );
$$;

create or replace function public.myb_preview_json_migration(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data jsonb;
  v_updated_at timestamptz;
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(p_sync_id,'main'));
begin
  select data, updated_at into v_data, v_updated_at
  from public.meyeube_sync
  where id = coalesce(nullif(p_sync_id,''),'main')
  limit 1;

  if v_data is null then
    return jsonb_build_object(
      'ok', false,
      'message', 'Không tìm thấy legacy JSON trong public.meyeube_sync.id = ' || coalesce(p_sync_id,'main'),
      'sync_id', coalesce(p_sync_id,'main')
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'preview_only', true,
    'sync_id', coalesce(p_sync_id,'main'),
    'family_id', v_family_id,
    'legacy_updated_at', v_updated_at,
    'source_counts', public.myb_migration_source_counts(v_data),
    'target_counts_before', public.myb_relational_table_counts(v_family_id),
    'note', 'Preview không ghi dữ liệu. Bấm chạy migration để import sang các table relational; legacy meyeube_sync vẫn được giữ.'
  );
end;
$$;

create or replace function public.myb_relational_migration_status(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(p_sync_id,'main'));
  v_batch jsonb;
begin
  select to_jsonb(mb) into v_batch
  from public.migration_batches mb
  where mb.family_id = v_family_id and mb.source_sync_id = coalesce(nullif(p_sync_id,''),'main') and mb.deleted_at is null
  order by mb.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'sync_id', coalesce(p_sync_id,'main'),
    'family_id', v_family_id,
    'last_batch', coalesce(v_batch,'null'::jsonb),
    'target_counts', public.myb_relational_table_counts(v_family_id)
  );
end;
$$;

create or replace function public.myb_migrate_json_to_relational(p_sync_id text default 'main', p_preview_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_data jsonb;
  v_settings jsonb;
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_device_id uuid := public.myb_stable_uuid('device:migration:v15.0.65:' || coalesce(nullif(p_sync_id,''),'main'));
  v_batch_id uuid := public.myb_stable_uuid('migration:v15.0.65:' || coalesce(nullif(p_sync_id,''),'main'));
  v_op_id uuid := public.myb_stable_uuid('migration-op:v15.0.65:' || coalesce(nullif(p_sync_id,''),'main'));
  v_row record;
  v_sub record;
  v_item jsonb;
  v_member_id uuid;
  v_child_id uuid;
  v_mom_id uuid;
  v_rel text;
  v_name text;
  v_care_id uuid;
  v_feed_event_id uuid;
  v_milk_item_id uuid;
  v_vaccine_name text;
  v_vaccine_id uuid;
  v_plan_id uuid;
  v_counts jsonb := '{}'::jsonb;
  c_families int := 0; c_settings int := 0; c_devices int := 0;
  c_members int := 0; c_meas int := 0; c_visits int := 0; c_meds int := 0; c_allergies int := 0; c_labs int := 0;
  c_vax_catalog int := 0; c_vax_plans int := 0; c_vax_records int := 0;
  c_care int := 0; c_feed int := 0; c_pump int := 0; c_sleep int := 0; c_diaper int := 0; c_temp int := 0;
  c_milk_containers int := 0; c_milk_items int := 0; c_milk_tx int := 0; c_feed_sources int := 0;
  c_appt int := 0; c_media int := 0; c_diary int := 0; c_milestone int := 0; c_categories int := 0; c_logs int := 0;
begin
  if p_preview_only then
    return public.myb_preview_json_migration(v_sync_id);
  end if;

  select data into v_data
  from public.meyeube_sync
  where id = v_sync_id
  limit 1;

  if v_data is null then
    return jsonb_build_object('ok', false, 'message', 'Không tìm thấy legacy JSON trong public.meyeube_sync.id = ' || v_sync_id, 'sync_id', v_sync_id);
  end if;

  v_settings := public.myb_json_object(v_data->'settings');

  insert into public.families(id, sync_code, name, legacy_sync_id, created_at, updated_at)
  values(v_family_id, v_sync_id, coalesce(nullif(v_settings->>'familyName',''), 'Mẹ Yêu Bé'), v_sync_id, now(), now())
  on conflict (id) do update set
    sync_code = excluded.sync_code,
    legacy_sync_id = excluded.legacy_sync_id,
    updated_at = now(),
    deleted_at = null;
  c_families := 1;

  insert into public.devices(id, family_id, device_name, device_type, platform, app_version, last_seen_at, created_at, updated_at)
  values(v_device_id, v_family_id, 'RelationalMigrationDoctor', 'migration', 'supabase-sql', coalesce(v_data->>'_appVersion', v_data->>'appVersion', '15.0.65'), now(), now(), now())
  on conflict (id) do update set last_seen_at = now(), updated_at = now(), deleted_at = null;
  c_devices := 1;

  insert into public.app_settings(
    id, family_id, baby_nickname, baby_official_name, baby_sex, birth_date, birth_time, birth_hospital,
    theme_mode, dashboard_config, cloud_config, smart_alert_config, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at
  ) values(
    public.myb_stable_uuid('app_settings:' || v_sync_id), v_family_id,
    nullif(v_settings->>'babyName',''), nullif(v_settings->>'officialName',''), nullif(v_settings->>'babySex',''),
    public.myb_safe_date(v_settings->>'birthDate'), nullif(coalesce(v_settings->>'birthTime', v_settings->>'birthTimeFrom'),''), nullif(v_settings->>'birthHospital',''),
    nullif(coalesce(v_settings->>'themeMode', v_settings->>'theme'),''),
    public.myb_json_object(v_settings->'dashboardConfig'),
    jsonb_build_object('legacy_sync_id', v_sync_id, 'legacy_cloud_revision', v_data->'_cloudRevision'),
    public.myb_json_object(v_data->'smartAlertConfig'),
    coalesce(public.myb_safe_timestamptz(v_data->>'createdAt'), now()), now(), v_device_id, v_device_id, v_op_id, null
  )
  on conflict (family_id) do update set
    baby_nickname = excluded.baby_nickname,
    baby_official_name = excluded.baby_official_name,
    baby_sex = excluded.baby_sex,
    birth_date = excluded.birth_date,
    birth_time = excluded.birth_time,
    birth_hospital = excluded.birth_hospital,
    theme_mode = excluded.theme_mode,
    dashboard_config = excluded.dashboard_config,
    cloud_config = excluded.cloud_config,
    smart_alert_config = excluded.smart_alert_config,
    updated_at = now(),
    updated_by_device = v_device_id,
    last_op_id = v_op_id,
    deleted_at = null;
  c_settings := 1;

  -- Health members from hb.members
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data#>'{hb,members}')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_rel := public.myb_relation_norm(coalesce(v_item->>'rel', v_item->>'person'));
    v_name := nullif(coalesce(v_item->>'name', v_item->>'displayName', v_item->>'fullName'), '');
    v_member_id := public.myb_stable_uuid('health_member:' || v_sync_id || ':hb:' || coalesce(nullif(v_item->>'id',''), v_rel || ':' || coalesce(v_name,'') || ':' || v_row.ordinality::text));

    insert into public.health_members(
      id, family_id, relation, display_name, full_name, gender, dob, blood_type, height_text, weight_text, phone, email,
      bhyt, bhyt_exp, bhyt_place, bhxh, hospital, doctor, emergency_contact, status_text, status_tone, notes, extra,
      created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at
    ) values(
      v_member_id, v_family_id, v_rel, v_name, v_name, nullif(v_item->>'gender',''), public.myb_safe_date(v_item->>'dob'),
      nullif(v_item->>'blood',''), nullif(v_item->>'height',''), nullif(v_item->>'weight',''), nullif(v_item->>'phone',''), nullif(v_item->>'email',''),
      nullif(v_item#>>'{medical,bhyt}',''), public.myb_safe_date(v_item#>>'{medical,bhytExp}'), nullif(v_item#>>'{medical,bhytPlace}',''), nullif(v_item#>>'{medical,bhxh}',''),
      nullif(v_item#>>'{medical,hospital}',''), nullif(v_item#>>'{medical,doctor}',''), nullif(v_item#>>'{medical,emergency}',''),
      nullif(v_item#>>'{status,txt}',''), nullif(v_item#>>'{status,tone}',''), nullif(v_item#>>'{other,notes}',''),
      v_item - 'meas' - 'vaccines' - 'visits' - 'meds' - 'labs',
      coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()),
      v_device_id, v_device_id, v_op_id, null
    )
    on conflict (id) do update set
      relation = excluded.relation, display_name = excluded.display_name, full_name = excluded.full_name, gender = excluded.gender, dob = excluded.dob,
      blood_type = excluded.blood_type, height_text = excluded.height_text, weight_text = excluded.weight_text, phone = excluded.phone, email = excluded.email,
      bhyt = excluded.bhyt, bhyt_exp = excluded.bhyt_exp, bhyt_place = excluded.bhyt_place, bhxh = excluded.bhxh,
      hospital = excluded.hospital, doctor = excluded.doctor, emergency_contact = excluded.emergency_contact,
      status_text = excluded.status_text, status_tone = excluded.status_tone, notes = excluded.notes, extra = excluded.extra,
      updated_at = now(), updated_by_device = v_device_id, last_op_id = v_op_id, deleted_at = null;
    c_members := c_members + 1;
    if v_rel = 'Con' and v_child_id is null then v_child_id := v_member_id; end if;
    if v_rel = 'Mẹ' and v_mom_id is null then v_mom_id := v_member_id; end if;

    -- embedded measurements
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item->'meas')) with ordinality loop
      insert into public.health_measurements(id, family_id, member_id, measure_date, weight_g, height_cm, head_cm, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
      values(public.myb_stable_uuid('measurement:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_sub.value->>'date', v_sub.ordinality::text)), v_family_id, v_member_id,
        coalesce(public.myb_safe_date(v_sub.value->>'date'), current_date), public.myb_weight_g(v_sub.value->>'weight'), public.myb_num(v_sub.value->>'height'), public.myb_num(v_sub.value->>'head'), nullif(v_sub.value->>'note',''),
        coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
      on conflict (id) do update set weight_g=excluded.weight_g,height_cm=excluded.height_cm,head_cm=excluded.head_cm,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
      c_meas := c_meas + 1;
    end loop;

    -- embedded visits
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item->'visits')) with ordinality loop
      insert into public.health_visits(id, family_id, member_id, visit_date, visit_time, hospital, doctor, symptom, diagnosis, treatment, medicine_note, cost, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
      values(public.myb_stable_uuid('visit:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_sub.value->>'date', v_sub.ordinality::text)), v_family_id, v_member_id,
        public.myb_safe_date(v_sub.value->>'date'), nullif(v_sub.value->>'time',''), nullif(v_sub.value->>'hospital',''), nullif(v_sub.value->>'doctor',''), nullif(v_sub.value->>'symptom',''), nullif(v_sub.value->>'diagnosis',''), nullif(v_sub.value->>'treatment',''), nullif(v_sub.value->>'medicine',''), public.myb_num(v_sub.value->>'cost'), nullif(v_sub.value->>'note',''),
        coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
      on conflict (id) do update set visit_date=excluded.visit_date,visit_time=excluded.visit_time,hospital=excluded.hospital,doctor=excluded.doctor,symptom=excluded.symptom,diagnosis=excluded.diagnosis,treatment=excluded.treatment,medicine_note=excluded.medicine_note,cost=excluded.cost,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
      c_visits := c_visits + 1;
    end loop;

    -- embedded medications
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item->'meds')) with ordinality loop
      if nullif(coalesce(v_sub.value->>'name', v_sub.value->>'medicine'),'') is not null then
        insert into public.health_medications(id, family_id, member_id, name, dose, from_date, to_date, active, remind, note, created_at, updated_at, deleted_at)
        values(public.myb_stable_uuid('med:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_sub.value->>'name', v_sub.ordinality::text)), v_family_id, v_member_id,
          coalesce(nullif(v_sub.value->>'name',''), nullif(v_sub.value->>'medicine','')), nullif(v_sub.value->>'dose',''), public.myb_safe_date(v_sub.value->>'from'), public.myb_safe_date(v_sub.value->>'to'), public.myb_bool(v_sub.value->>'active', true), public.myb_bool(v_sub.value->>'remind', false), nullif(v_sub.value->>'note',''),
          coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), null)
        on conflict (id) do update set name=excluded.name,dose=excluded.dose,from_date=excluded.from_date,to_date=excluded.to_date,active=excluded.active,remind=excluded.remind,note=excluded.note,updated_at=now(),deleted_at=null;
        c_meds := c_meds + 1;
      end if;
    end loop;

    -- embedded labs
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item->'labs')) with ordinality loop
      insert into public.health_labs(id, family_id, member_id, lab_date, title, place, result_summary, note, created_at, updated_at, deleted_at)
      values(public.myb_stable_uuid('lab:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_sub.value->>'date', v_sub.ordinality::text)), v_family_id, v_member_id,
        public.myb_safe_date(v_sub.value->>'date'), nullif(coalesce(v_sub.value->>'title', v_sub.value->>'name'),''), nullif(v_sub.value->>'place',''), nullif(coalesce(v_sub.value->>'result', v_sub.value->>'result_summary'),''), nullif(v_sub.value->>'note',''),
        coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), null)
      on conflict (id) do update set lab_date=excluded.lab_date,title=excluded.title,place=excluded.place,result_summary=excluded.result_summary,note=excluded.note,updated_at=now(),deleted_at=null;
      c_labs := c_labs + 1;
    end loop;

    -- allergy arrays: one row per allergy item
    for v_sub in select key as allergy_type, value as arr from jsonb_each(public.myb_json_object(v_item#>'{history,allergy}')) loop
      for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_sub.arr)) with ordinality loop
        if nullif(v_row.value #>> '{}','') is not null then
          insert into public.health_allergies(id, family_id, member_id, allergy_type, name, note, created_at, updated_at, deleted_at)
          values(public.myb_stable_uuid('allergy:' || v_member_id || ':' || v_sub.allergy_type || ':' || v_row.ordinality::text || ':' || (v_row.value #>> '{}')), v_family_id, v_member_id, v_sub.allergy_type, v_row.value #>> '{}', '', now(), now(), null)
          on conflict (id) do update set name=excluded.name, updated_at=now(), deleted_at=null;
          c_allergies := c_allergies + 1;
        end if;
      end loop;
    end loop;

    -- member files -> media_files metadata
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item#>'{other,files}')) with ordinality loop
      insert into public.media_files(id, family_id, member_id, module, owner_table, owner_id, kind, title, file_name, mime_type, size_bytes, bucket, storage_path, thumb_path, local_blob_key, storage_provider, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
      values(public.myb_stable_uuid('media:health_member:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_sub.value->>'blobKey', v_sub.ordinality::text)), v_family_id, v_member_id, 'health', 'health_members', v_member_id,
        nullif(v_sub.value->>'kind',''), nullif(coalesce(v_sub.value->>'name', v_sub.value->>'title'),''), nullif(coalesce(v_sub.value->>'fileName', v_sub.value->>'name'),''), nullif(coalesce(v_sub.value->>'type', v_sub.value->>'mime'),''), public.myb_num(v_sub.value->>'size')::bigint,
        nullif(v_sub.value->>'bucket',''), nullif(coalesce(v_sub.value->>'path', v_sub.value->>'storagePath'),''), nullif(v_sub.value->>'thumbPath',''), nullif(v_sub.value->>'blobKey',''), case when nullif(v_sub.value->>'blobKey','') is not null then 'indexeddb' else 'supabase' end,
        coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
      on conflict (id) do update set kind=excluded.kind,title=excluded.title,file_name=excluded.file_name,mime_type=excluded.mime_type,size_bytes=excluded.size_bytes,bucket=excluded.bucket,storage_path=excluded.storage_path,thumb_path=excluded.thumb_path,local_blob_key=excluded.local_blob_key,storage_provider=excluded.storage_provider,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
      c_media := c_media + 1;
    end loop;
  end loop;

  -- Legacy healthBook rows -> health_members if hb.members was absent/older data exists.
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'healthBook')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_rel := public.myb_relation_norm(v_item->>'person');
    v_name := nullif(coalesce(v_item->>'fullName', v_item->>'person'), '');
    v_member_id := public.myb_stable_uuid('health_member:' || v_sync_id || ':legacy:' || coalesce(v_rel,'') || ':' || coalesce(v_name,'') || ':' || v_row.ordinality::text);
    insert into public.health_members(id, family_id, relation, display_name, full_name, dob, blood_type, height_text, weight_text, doctor, bhyt, notes, extra, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(v_member_id, v_family_id, v_rel, v_name, v_name, public.myb_safe_date(v_item->>'dob'), nullif(v_item->>'blood',''), nullif(v_item->>'height',''), nullif(v_item->>'weight',''), nullif(v_item->>'doctor',''), nullif(v_item->>'insurance',''), nullif(v_item->>'note',''), v_item, coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
    on conflict (id) do update set display_name=excluded.display_name, full_name=excluded.full_name, dob=excluded.dob, blood_type=excluded.blood_type, height_text=excluded.height_text, weight_text=excluded.weight_text, doctor=excluded.doctor, bhyt=excluded.bhyt, notes=excluded.notes, extra=excluded.extra, updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
    c_members := c_members + 1;
    if v_rel = 'Con' and v_child_id is null then v_child_id := v_member_id; end if;
    if v_rel = 'Mẹ' and v_mom_id is null then v_mom_id := v_member_id; end if;
    if public.myb_safe_date(v_item->>'date') is not null or nullif(v_item->>'weight','') is not null or nullif(v_item->>'height','') is not null then
      insert into public.health_measurements(id, family_id, member_id, measure_date, weight_g, height_cm, head_cm, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
      values(public.myb_stable_uuid('measurement:legacy:' || v_member_id || ':' || coalesce(v_item->>'date', v_row.ordinality::text)), v_family_id, v_member_id, coalesce(public.myb_safe_date(v_item->>'date'), public.myb_safe_date(v_item->>'dob'), current_date), public.myb_weight_g(v_item->>'weight'), public.myb_num(v_item->>'height'), public.myb_num(v_item->>'bodyMeasure'), nullif(v_item->>'note',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
      on conflict (id) do update set weight_g=excluded.weight_g,height_cm=excluded.height_cm,head_cm=excluded.head_cm,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
      c_meas := c_meas + 1;
    end if;
  end loop;

  -- Ensure at least one child member exists.
  if v_child_id is null then
    v_child_id := public.myb_stable_uuid('health_member:' || v_sync_id || ':default-child');
    insert into public.health_members(id, family_id, relation, display_name, full_name, gender, dob, height_text, weight_text, status_text, status_tone, notes, extra, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(v_child_id, v_family_id, 'Con', coalesce(nullif(v_settings->>'babyName',''),'Bé'), nullif(v_settings->>'officialName',''), case when v_settings->>'babySex' = 'b' then 'Nam' when v_settings->>'babySex' = 'g' then 'Nữ' else null end, public.myb_safe_date(v_settings->>'birthDate'), null, null, 'Khỏe mạnh', 'ok', '', jsonb_build_object('createdByMigration','default_child'), now(), now(), v_device_id, v_device_id, v_op_id, null)
    on conflict (id) do update set display_name=excluded.display_name, full_name=excluded.full_name, gender=excluded.gender, dob=excluded.dob, updated_at=now(), deleted_at=null;
    c_members := c_members + 1;
  end if;

  -- baby measurements array -> child health_measurements
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'baby')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.health_measurements(id, family_id, member_id, measure_date, weight_g, height_cm, head_cm, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(public.myb_stable_uuid('measurement:baby:' || v_child_id || ':' || coalesce(v_item->>'id', v_item->>'date', v_row.ordinality::text)), v_family_id, v_child_id, coalesce(public.myb_safe_date(v_item->>'date'), current_date), public.myb_weight_g(v_item->>'weight'), public.myb_num(coalesce(v_item->>'length', v_item->>'height')), public.myb_num(coalesce(v_item->>'head', v_item->>'bodyMeasure')), nullif(v_item->>'note',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
    on conflict (id) do update set weight_g=excluded.weight_g,height_cm=excluded.height_cm,head_cm=excluded.head_cm,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
    c_meas := c_meas + 1;
  end loop;

  -- mom array: create mom member if needed, then measurements/visits style rows.
  if jsonb_array_length(public.myb_json_array(v_data->'mom')) > 0 and v_mom_id is null then
    v_mom_id := public.myb_stable_uuid('health_member:' || v_sync_id || ':default-mom');
    insert into public.health_members(id, family_id, relation, display_name, gender, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(v_mom_id, v_family_id, 'Mẹ', 'Mẹ', 'Nữ', now(), now(), v_device_id, v_device_id, v_op_id, null)
    on conflict (id) do update set updated_at=now(), deleted_at=null;
    c_members := c_members + 1;
  end if;
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'mom')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.health_measurements(id, family_id, member_id, measure_date, weight_g, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(public.myb_stable_uuid('measurement:mom:' || v_mom_id || ':' || coalesce(v_item->>'id', v_item->>'date', v_row.ordinality::text)), v_family_id, v_mom_id, coalesce(public.myb_safe_date(v_item->>'date'), current_date), public.myb_weight_g(v_item->>'weight'), nullif(coalesce(v_item->>'note', v_item->>'bp'),''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
    on conflict (id) do update set weight_g=excluded.weight_g,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
    c_meas := c_meas + 1;
  end loop;

  -- Categories: appointmentTypes, diaryTypes
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'appointmentTypes')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.care_categories(id, family_id, category_type, name, icon, color, active, sort_order, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('category:appointment_type:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'name', v_row.ordinality::text)), v_family_id, 'appointment_type', coalesce(nullif(v_item->>'name',''),'Loại lịch'), nullif(v_item->>'icon',''), nullif(v_item->>'color',''), public.myb_bool(v_item->>'active', true), v_row.ordinality::int, coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set name=excluded.name,icon=excluded.icon,color=excluded.color,active=excluded.active,sort_order=excluded.sort_order,updated_at=now(),deleted_at=null;
    c_categories := c_categories + 1;
  end loop;
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'diaryTypes')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.care_categories(id, family_id, category_type, name, icon, color, active, sort_order, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('category:diary_type:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'name', v_row.ordinality::text)), v_family_id, 'diary_type', coalesce(nullif(v_item->>'name',''),'Loại nhật ký'), nullif(v_item->>'icon',''), nullif(v_item->>'color',''), public.myb_bool(v_item->>'active', true), v_row.ordinality::int, coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set name=excluded.name,icon=excluded.icon,color=excluded.color,active=excluded.active,sort_order=excluded.sort_order,updated_at=now(),deleted_at=null;
    c_categories := c_categories + 1;
  end loop;

  -- Milk containers
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'milkContainers')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.milk_containers(id, family_id, name, kind, color, capacity_ml, active, sort_order, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'name', v_row.ordinality::text)), v_family_id, coalesce(nullif(v_item->>'name',''),'Bình/Túi'), nullif(v_item->>'kind',''), nullif(v_item->>'color',''), public.myb_num(coalesce(v_item->>'capacityMl', v_item->>'capacity')), public.myb_bool(v_item->>'active', true), v_row.ordinality::int, coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set name=excluded.name,kind=excluded.kind,color=excluded.color,capacity_ml=excluded.capacity_ml,active=excluded.active,sort_order=excluded.sort_order,updated_at=now(),deleted_at=null;
    c_milk_containers := c_milk_containers + 1;
  end loop;

  -- Milk inventory items + create transactions
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'milkInventory')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_milk_item_id := public.myb_stable_uuid('milk_item:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'bagCode', v_item->>'shortCode', v_row.ordinality::text));
    insert into public.milk_items(id, family_id, short_code, container_id, container_kind, container_name, storage, amount_ml, expire_at, status, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(v_milk_item_id, v_family_id, nullif(coalesce(v_item->>'shortCode', v_item->>'bagCode', v_item->>'code'),''),
      case when nullif(v_item->>'containerId','') is not null then public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || (v_item->>'containerId')) else null end,
      nullif(v_item->>'containerKind',''), nullif(v_item->>'containerName',''), nullif(v_item->>'storage',''), coalesce(public.myb_num(coalesce(v_item->>'amount', v_item->>'amountMl')), public.myb_num(v_item->>'remaining'), 0), public.myb_safe_timestamptz(coalesce(v_item->>'expireAt', v_item->>'expireDate')), coalesce(public.myb_status_en(v_item->>'status'), 'storing'), nullif(v_item->>'note',''),
      coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, case when nullif(v_item->>'deletedAt','') is not null then public.myb_safe_timestamptz(v_item->>'deletedAt') else null end)
    on conflict (id) do update set short_code=excluded.short_code,container_id=excluded.container_id,container_kind=excluded.container_kind,container_name=excluded.container_name,storage=excluded.storage,amount_ml=excluded.amount_ml,expire_at=excluded.expire_at,status=excluded.status,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=excluded.deleted_at;
    c_milk_items := c_milk_items + 1;

    insert into public.milk_transactions(id, family_id, milk_item_id, transaction_type, ml, reason, created_at, created_by_device, deleted_at)
    values(public.myb_stable_uuid('milk_tx:create:' || v_milk_item_id), v_family_id, v_milk_item_id, 'create', coalesce(public.myb_num(coalesce(v_item->>'amount', v_item->>'amountMl')), public.myb_num(v_item->>'remaining'), 0), 'Imported from legacy milkInventory', coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), v_device_id, null)
    on conflict (id) do update set ml=excluded.ml, reason=excluded.reason, deleted_at=null;
    c_milk_tx := c_milk_tx + 1;
  end loop;

  -- Care events and type detail tables
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'careEvents')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_care_id := public.myb_stable_uuid('care_event:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'createdAt', v_row.ordinality::text));
    insert into public.care_events(id, family_id, member_id, type, event_date, time_from, time_to, amount, unit, source, status, note, extra, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
    values(v_care_id, v_family_id, v_child_id, coalesce(nullif(v_item->>'type',''),'other'), coalesce(public.myb_safe_date(v_item->>'date'), public.myb_safe_date(v_item->>'startDate')), nullif(coalesce(v_item->>'timeFrom', v_item->>'startTime', v_item->>'time'),''), nullif(coalesce(v_item->>'timeTo', v_item->>'endTime'),''), public.myb_num(coalesce(v_item->>'amount', v_item->>'ml', v_item->>'actualMl')), case when public.myb_num(coalesce(v_item->>'amount', v_item->>'ml', v_item->>'actualMl')) is not null then 'ml' else null end, nullif(v_item->>'source',''), coalesce(nullif(v_item->>'status',''),'active'), nullif(v_item->>'note',''), v_item, coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, case when nullif(v_item->>'deletedAt','') is not null then public.myb_safe_timestamptz(v_item->>'deletedAt') else null end)
    on conflict (id) do update set type=excluded.type,event_date=excluded.event_date,time_from=excluded.time_from,time_to=excluded.time_to,amount=excluded.amount,unit=excluded.unit,source=excluded.source,status=excluded.status,note=excluded.note,extra=excluded.extra,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=excluded.deleted_at;
    c_care := c_care + 1;

    if lower(coalesce(v_item->>'type','')) = 'feed' then
      v_feed_event_id := public.myb_stable_uuid('feed_event:' || v_care_id);
      insert into public.feed_events(id, family_id, care_event_id, feed_type, milk_type, actual_ml, taken_ml, wasted_ml, formula_brand, count_as_feed, created_at, updated_at, deleted_at)
      values(v_feed_event_id, v_family_id, v_care_id, nullif(coalesce(v_item->>'feedType', v_item->>'source'),''), nullif(v_item->>'milkType',''), public.myb_num(coalesce(v_item->>'actualMl', v_item->>'amount')), public.myb_num(v_item->>'takenMl'), public.myb_num(coalesce(v_item->>'wastedMl', v_item->>'discardMl')), nullif(v_item->>'formulaBrand',''), public.myb_bool(v_item->>'countAsFeed', true), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
      on conflict (id) do update set feed_type=excluded.feed_type,milk_type=excluded.milk_type,actual_ml=excluded.actual_ml,taken_ml=excluded.taken_ml,wasted_ml=excluded.wasted_ml,formula_brand=excluded.formula_brand,count_as_feed=excluded.count_as_feed,updated_at=now(),deleted_at=null;
      c_feed := c_feed + 1;
    elsif lower(coalesce(v_item->>'type','')) = 'pump' then
      insert into public.pump_events(id, family_id, care_event_id, side, amount_ml, duration_min, storage, container_id, container_kind, container_name, expire_at, created_at, updated_at, deleted_at)
      values(public.myb_stable_uuid('pump_event:' || v_care_id), v_family_id, v_care_id, nullif(v_item->>'side',''), public.myb_num(coalesce(v_item->>'amountMl', v_item->>'amount')), public.myb_num(v_item->>'durationMin')::int, nullif(v_item->>'storage',''), case when nullif(v_item->>'containerId','') is not null then public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || (v_item->>'containerId')) else null end, nullif(v_item->>'containerKind',''), nullif(v_item->>'containerName',''), public.myb_safe_timestamptz(coalesce(v_item->>'expireAt', v_item->>'expireDate')), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
      on conflict (id) do update set side=excluded.side,amount_ml=excluded.amount_ml,duration_min=excluded.duration_min,storage=excluded.storage,container_id=excluded.container_id,container_kind=excluded.container_kind,container_name=excluded.container_name,expire_at=excluded.expire_at,updated_at=now(),deleted_at=null;
      c_pump := c_pump + 1;
    elsif lower(coalesce(v_item->>'type','')) = 'sleep' then
      insert into public.sleep_events(id, family_id, care_event_id, duration_min, quality, created_at, updated_at, deleted_at)
      values(public.myb_stable_uuid('sleep_event:' || v_care_id), v_family_id, v_care_id, public.myb_num(v_item->>'durationMin')::int, nullif(v_item->>'quality',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
      on conflict (id) do update set duration_min=excluded.duration_min,quality=excluded.quality,updated_at=now(),deleted_at=null;
      c_sleep := c_sleep + 1;
    elsif lower(coalesce(v_item->>'type','')) = 'diaper' then
      insert into public.diaper_events(id, family_id, care_event_id, wet, dirty, stool_color, stool_amount, note, created_at, updated_at, deleted_at)
      values(public.myb_stable_uuid('diaper_event:' || v_care_id), v_family_id, v_care_id, public.myb_bool(v_item->>'wet', false), public.myb_bool(v_item->>'dirty', false), nullif(v_item->>'stoolColor',''), nullif(v_item->>'stoolAmount',''), nullif(v_item->>'note',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
      on conflict (id) do update set wet=excluded.wet,dirty=excluded.dirty,stool_color=excluded.stool_color,stool_amount=excluded.stool_amount,note=excluded.note,updated_at=now(),deleted_at=null;
      c_diaper := c_diaper + 1;
    elsif lower(coalesce(v_item->>'type','')) in ('temperature','temp','fever') then
      insert into public.temperature_events(id, family_id, care_event_id, temperature_c, measure_place, note, created_at, updated_at, deleted_at)
      values(public.myb_stable_uuid('temperature_event:' || v_care_id), v_family_id, v_care_id, public.myb_num(coalesce(v_item->>'temperature', v_item->>'temperatureC')), nullif(v_item->>'measurePlace',''), nullif(v_item->>'note',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
      on conflict (id) do update set temperature_c=excluded.temperature_c,measure_place=excluded.measure_place,note=excluded.note,updated_at=now(),deleted_at=null;
      c_temp := c_temp + 1;
    end if;
  end loop;

  -- Feed milk source links and feed_use/discard transactions after care and milk items exist.
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'careEvents')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    if lower(coalesce(v_item->>'type','')) = 'feed' then
      v_care_id := public.myb_stable_uuid('care_event:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'createdAt', v_row.ordinality::text));
      v_feed_event_id := public.myb_stable_uuid('feed_event:' || v_care_id);
      for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(coalesce(v_item->'milkSources', v_item->'sources', v_item->'bags'))) with ordinality loop
        if nullif(coalesce(v_sub.value->>'bagId', v_sub.value->>'id', v_sub.value->>'milkItemId'),'') is not null then
          v_milk_item_id := public.myb_stable_uuid('milk_item:' || v_sync_id || ':' || coalesce(v_sub.value->>'bagId', v_sub.value->>'id', v_sub.value->>'milkItemId'));
          if exists(select 1 from public.milk_items where id = v_milk_item_id) then
            insert into public.feed_milk_sources(id, family_id, feed_event_id, milk_item_id, used_ml, discard_ml, remainder_action, order_index, created_at, updated_at, deleted_at)
            values(public.myb_stable_uuid('feed_source:' || v_feed_event_id || ':' || v_milk_item_id || ':' || v_sub.ordinality::text), v_family_id, v_feed_event_id, v_milk_item_id, coalesce(public.myb_num(coalesce(v_sub.value->>'usedMl', v_sub.value->>'used')),0), coalesce(public.myb_num(coalesce(v_sub.value->>'discardMl', v_sub.value->>'discardedMl')),0), coalesce(nullif(v_sub.value->>'remainderAction',''),'keep'), v_sub.ordinality::int, now(), now(), null)
            on conflict (id) do update set used_ml=excluded.used_ml,discard_ml=excluded.discard_ml,remainder_action=excluded.remainder_action,order_index=excluded.order_index,updated_at=now(),deleted_at=null;
            c_feed_sources := c_feed_sources + 1;
            if coalesce(public.myb_num(coalesce(v_sub.value->>'usedMl', v_sub.value->>'used')),0) > 0 then
              insert into public.milk_transactions(id, family_id, milk_item_id, care_event_id, transaction_type, ml, reason, created_at, created_by_device, deleted_at)
              values(public.myb_stable_uuid('milk_tx:feed_use:' || v_feed_event_id || ':' || v_milk_item_id || ':' || v_sub.ordinality::text), v_family_id, v_milk_item_id, v_care_id, 'feed_use', coalesce(public.myb_num(coalesce(v_sub.value->>'usedMl', v_sub.value->>'used')),0), 'Imported from legacy stored feed source', now(), v_device_id, null)
              on conflict (id) do update set ml=excluded.ml,deleted_at=null;
              c_milk_tx := c_milk_tx + 1;
            end if;
            if coalesce(public.myb_num(coalesce(v_sub.value->>'discardMl', v_sub.value->>'discardedMl')),0) > 0 then
              insert into public.milk_transactions(id, family_id, milk_item_id, care_event_id, transaction_type, ml, reason, created_at, created_by_device, deleted_at)
              values(public.myb_stable_uuid('milk_tx:discard:' || v_feed_event_id || ':' || v_milk_item_id || ':' || v_sub.ordinality::text), v_family_id, v_milk_item_id, v_care_id, 'discard', coalesce(public.myb_num(coalesce(v_sub.value->>'discardMl', v_sub.value->>'discardedMl')),0), 'Imported discard after stored feed', now(), v_device_id, null)
              on conflict (id) do update set ml=excluded.ml,deleted_at=null;
              c_milk_tx := c_milk_tx + 1;
            end if;
          end if;
        end if;
      end loop;
    end if;
  end loop;

  -- Vaccine records from hb.members vaccines
  for v_row in select hm.id as member_id, hm.extra as extra, hm.relation from public.health_members hm where hm.family_id = v_family_id and hm.deleted_at is null loop
    -- rows are imported from original JSON separately below; no extra extraction here because extra may not contain arrays after hb insert.
    null;
  end loop;
  for v_row in select value as member_json, ordinality as member_ord from jsonb_array_elements(public.myb_json_array(v_data#>'{hb,members}')) with ordinality loop
    v_item := public.myb_json_object(v_row.member_json);
    v_member_id := public.myb_stable_uuid('health_member:' || v_sync_id || ':hb:' || coalesce(nullif(v_item->>'id',''), public.myb_relation_norm(coalesce(v_item->>'rel', v_item->>'person')) || ':' || coalesce(nullif(coalesce(v_item->>'name', v_item->>'fullName'),''),'') || ':' || v_row.member_ord::text));
    for v_sub in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_item->'vaccines')) with ordinality loop
      v_vaccine_name := nullif(coalesce(v_sub.value->>'name', v_sub.value->>'vaccine'), '');
      if v_vaccine_name is not null then
        v_vaccine_id := public.myb_stable_uuid('vaccine_catalog:' || v_family_id || ':' || lower(v_vaccine_name));
        insert into public.vaccine_catalog(id, family_id, name, short_name, disease, manufacturer, active, created_at, updated_at, deleted_at)
        values(v_vaccine_id, v_family_id, v_vaccine_name, v_vaccine_name, nullif(coalesce(v_sub.value->>'purpose', v_sub.value->>'disease'),''), nullif(v_sub.value->>'manufacturer',''), true, now(), now(), null)
        on conflict (id) do update set name=excluded.name,disease=excluded.disease,manufacturer=excluded.manufacturer,updated_at=now(),deleted_at=null;
        c_vax_catalog := c_vax_catalog + 1;

        v_plan_id := public.myb_stable_uuid('vaccine_plan:' || v_member_id || ':' || coalesce(v_sub.value->>'planId', v_sub.value->>'scheduleKey', v_sub.value->>'templateId', v_vaccine_name || ':' || coalesce(v_sub.value->>'dose','') || ':' || v_sub.ordinality::text));
        insert into public.child_vaccine_plans(id, family_id, member_id, vaccine_id, dose_number, due_date, status, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
        values(v_plan_id, v_family_id, v_member_id, v_vaccine_id, public.myb_num(regexp_replace(coalesce(v_sub.value->>'dose',''), '[^0-9]+', '', 'g'))::int,
          public.myb_safe_date(coalesce(v_sub.value->>'dueDate', v_sub.value->>'date', v_sub.value->>'injectionDate')),
          case coalesce(v_sub.value->>'status','')
            when 'Đã tiêm' then 'done'
            when 'Sắp tới' then 'upcoming'
            when 'Quá hạn' then 'overdue'
            when 'Bỏ qua' then 'skipped'
            when 'Hoãn tiêm' then 'postponed'
            else 'pending'
          end,
          nullif(coalesce(v_sub.value->>'note', v_sub.value->>'disease', v_sub.value->>'purpose'),''),
          coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
        on conflict (id) do update set vaccine_id=excluded.vaccine_id,dose_number=excluded.dose_number,due_date=excluded.due_date,status=excluded.status,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
        c_vax_plans := c_vax_plans + 1;

        insert into public.vaccine_records(id, family_id, member_id, plan_id, vaccine_id, vaccine_name, dose_number, injection_date, injection_time, place, manufacturer, lot_number, reaction, reaction_level, note, created_at, updated_at, created_by_device, updated_by_device, last_op_id, deleted_at)
        values(public.myb_stable_uuid('vaccine_record:' || v_member_id || ':' || coalesce(v_sub.value->>'id', v_vaccine_name || ':' || coalesce(v_sub.value->>'dose','') || ':' || v_sub.ordinality::text)), v_family_id, v_member_id, v_plan_id, v_vaccine_id, v_vaccine_name, public.myb_num(regexp_replace(coalesce(v_sub.value->>'dose',''), '[^0-9]+', '', 'g'))::int, public.myb_safe_date(coalesce(v_sub.value->>'date', v_sub.value->>'injectionDate')), nullif(v_sub.value->>'time',''), nullif(v_sub.value->>'place',''), nullif(v_sub.value->>'manufacturer',''), nullif(v_sub.value->>'lotNumber',''), nullif(v_sub.value->>'reaction',''), nullif(v_sub.value->>'reactionLevel',''), nullif(coalesce(v_sub.value->>'note', v_sub.value->>'photo'),''), coalesce(public.myb_safe_timestamptz(v_sub.value->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_sub.value->>'updatedAt'), now()), v_device_id, v_device_id, v_op_id, null)
        on conflict (id) do update set plan_id=excluded.plan_id,vaccine_name=excluded.vaccine_name,dose_number=excluded.dose_number,injection_date=excluded.injection_date,injection_time=excluded.injection_time,place=excluded.place,manufacturer=excluded.manufacturer,lot_number=excluded.lot_number,reaction=excluded.reaction,reaction_level=excluded.reaction_level,note=excluded.note,updated_at=now(),updated_by_device=v_device_id,last_op_id=v_op_id,deleted_at=null;
        c_vax_records := c_vax_records + 1;
      end if;
    end loop;
  end loop;

  -- Appointments
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'appointments')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.appointments(id, family_id, member_id, title, appointment_date, appointment_time, place, doctor, note, status, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('appointment:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'date', v_row.ordinality::text)), v_family_id, v_child_id, nullif(coalesce(v_item->>'title', v_item->>'type'),''), public.myb_safe_date(v_item->>'date'), nullif(coalesce(v_item->>'time', v_item->>'timeFrom'),''), nullif(v_item->>'place',''), nullif(v_item->>'doctor',''), nullif(v_item->>'note',''), coalesce(nullif(v_item->>'status',''),'scheduled'), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set title=excluded.title,appointment_date=excluded.appointment_date,appointment_time=excluded.appointment_time,place=excluded.place,doctor=excluded.doctor,note=excluded.note,status=excluded.status,updated_at=now(),deleted_at=null;
    c_appt := c_appt + 1;
  end loop;

  -- Diary
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'diary')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.diary_entries(id, family_id, member_id, entry_date, time_from, time_to, category, title, note, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('diary:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'createdAt', v_row.ordinality::text)), v_family_id, v_child_id, public.myb_safe_date(v_item->>'date'), split_part(coalesce(v_item->>'time',''), '-', 1), nullif(split_part(coalesce(v_item->>'time',''), '-', 2),''), nullif(v_item->>'category',''), nullif(v_item->>'title',''), nullif(v_item->>'note',''), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set entry_date=excluded.entry_date,time_from=excluded.time_from,time_to=excluded.time_to,category=excluded.category,title=excluded.title,note=excluded.note,updated_at=now(),deleted_at=null;
    c_diary := c_diary + 1;
  end loop;

  -- Milestones
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'milestones')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    insert into public.milestones(id, family_id, member_id, milestone_date, title, type, note, auto, created_at, updated_at, deleted_at)
    values(public.myb_stable_uuid('milestone:' || v_sync_id || ':' || coalesce(v_item->>'id', v_item->>'createdAt', v_row.ordinality::text)), v_family_id, v_child_id, public.myb_safe_date(v_item->>'date'), nullif(v_item->>'title',''), nullif(coalesce(v_item->>'type', v_item->>'category'),''), nullif(v_item->>'note',''), public.myb_bool(v_item->>'auto', false), coalesce(public.myb_safe_timestamptz(v_item->>'createdAt'), now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), now()), null)
    on conflict (id) do update set milestone_date=excluded.milestone_date,title=excluded.title,type=excluded.type,note=excluded.note,auto=excluded.auto,updated_at=now(),deleted_at=null;
    c_milestone := c_milestone + 1;
  end loop;

  v_counts := jsonb_build_object(
    'families', c_families, 'devices', c_devices, 'app_settings', c_settings,
    'health_members', c_members, 'health_measurements', c_meas, 'health_visits', c_visits, 'health_medications', c_meds, 'health_allergies', c_allergies, 'health_labs', c_labs,
    'vaccine_catalog', c_vax_catalog, 'child_vaccine_plans', c_vax_plans, 'vaccine_records', c_vax_records,
    'care_events', c_care, 'feed_events', c_feed, 'pump_events', c_pump, 'sleep_events', c_sleep, 'diaper_events', c_diaper, 'temperature_events', c_temp,
    'milk_containers', c_milk_containers, 'milk_items', c_milk_items, 'milk_transactions', c_milk_tx, 'feed_milk_sources', c_feed_sources,
    'appointments', c_appt, 'media_files', c_media, 'diary_entries', c_diary, 'milestones', c_milestone, 'care_categories', c_categories
  );

  insert into public.migration_batches(id, family_id, source_sync_id, source_app_version, status, summary, started_at, finished_at, created_at, updated_at, deleted_at)
  values(v_batch_id, v_family_id, v_sync_id, coalesce(v_data->>'_appVersion', v_data->>'appVersion', 'legacy-json'), 'completed', jsonb_build_object('version','15.0.65','imported',v_counts,'source_counts',public.myb_migration_source_counts(v_data)), now(), now(), now(), now(), null)
  on conflict (id) do update set status='completed', summary=excluded.summary, finished_at=now(), updated_at=now(), deleted_at=null;

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'migration_batches', v_batch_id, 'json_to_relational_migration', v_op_id, v_device_id, jsonb_build_object('version','15.0.65','sync_id',v_sync_id,'imported',v_counts));
  c_logs := c_logs + 1;

  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'batch_id', v_batch_id,
    'imported', v_counts,
    'target_counts_after', public.myb_relational_table_counts(v_family_id),
    'legacy_backup', 'public.meyeube_sync vẫn được giữ nguyên, không xóa JSON cũ.',
    'normal_app_write_mode', 'unchanged_legacy_json'
  );
end;
$$;

grant execute on function public.myb_preview_json_migration(text) to anon, authenticated;
grant execute on function public.myb_relational_migration_status(text) to anon, authenticated;
grant execute on function public.myb_migrate_json_to_relational(text, boolean) to anon, authenticated;

comment on function public.myb_preview_json_migration(text) is 'V15.0.65 preview legacy JSON counts before importing to relational tables.';
comment on function public.myb_migrate_json_to_relational(text, boolean) is 'V15.0.65 manual, idempotent migration from meyeube_sync.data JSONB to relational tables. Does not switch app read/write mode.';
comment on function public.myb_relational_migration_status(text) is 'V15.0.65 relational migration status and target table counts.';


-- =============================================================
-- V15.0.65 · RelationalMigrationDoctor
-- Read-only doctor: validates JSON -> relational migration quality.
-- This does NOT switch normal app reads/writes and does NOT mutate data.
-- =============================================================

create or replace function public.myb_doctor_check(
  p_id text,
  p_title text,
  p_status text,
  p_expected text,
  p_actual text,
  p_message text,
  p_hint text default null,
  p_group text default 'general'
)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p_id,
    'group', p_group,
    'title', p_title,
    'status', p_status,
    'expected', p_expected,
    'actual', p_actual,
    'message', p_message,
    'hint', p_hint
  );
$$;

create or replace function public.myb_relational_migration_doctor(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_data jsonb;
  v_legacy_updated_at timestamptz;
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_source jsonb := '{}'::jsonb;
  v_target jsonb := '{}'::jsonb;
  v_checks jsonb := '[]'::jsonb;
  v_detail_counts jsonb := '{}'::jsonb;
  v_errors int := 0;
  v_warnings int := 0;
  v_passed int := 0;
  v_total int := 0;
  v_status text := 'passed';
  v_batch_count int := 0;
  v_family_count int := 0;
  v_expected int := 0;
  v_actual int := 0;
  v_tmp int := 0;
  v_orphan_feed int := 0;
  v_orphan_pump int := 0;
  v_orphan_sleep int := 0;
  v_orphan_diaper int := 0;
  v_orphan_temp int := 0;
  v_orphan_milk_tx int := 0;
  v_orphan_feed_sources int := 0;
  v_orphan_vaccine int := 0;
  v_orphan_measurement int := 0;
  v_orphan_media int := 0;
  v_duplicate_measurement int := 0;
  v_duplicate_vaccine int := 0;
  v_milk_overdraw int := 0;
  v_care_without_member int := 0;
  v_change_logs int := 0;
  v_detail_events int := 0;
  v_care_events int := 0;
begin
  select data, updated_at into v_data, v_legacy_updated_at
  from public.meyeube_sync
  where id = v_sync_id
  limit 1;

  if v_data is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'sync_id', v_sync_id,
      'family_id', v_family_id,
      'message', 'Không tìm thấy legacy JSON trong public.meyeube_sync.id = ' || v_sync_id,
      'checks', jsonb_build_array(public.myb_doctor_check('legacy_json', 'Legacy JSON tồn tại', 'error', '1', '0', 'Không tìm thấy dữ liệu JSON nguồn.', 'Kiểm tra Sync ID hoặc cấu hình Cloud Sync.', 'source'))
    );
  end if;

  v_source := public.myb_migration_source_counts(v_data);
  v_target := public.myb_relational_table_counts(v_family_id);

  select count(*) into v_batch_count from public.migration_batches where family_id = v_family_id and deleted_at is null;
  select count(*) into v_family_count from public.families where id = v_family_id and deleted_at is null;
  select count(*) into v_change_logs from public.change_logs where family_id = v_family_id;
  select count(*) into v_care_events from public.care_events where family_id = v_family_id and deleted_at is null;

  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('legacy_json', 'Legacy JSON nguồn', 'ok', '1', '1', 'Đọc được public.meyeube_sync.data.', null, 'source'));
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('migration_batch', 'Batch migration', case when v_batch_count > 0 then 'ok' else 'error' end, '>=1', v_batch_count::text, case when v_batch_count > 0 then 'Đã có lịch sử migration.' else 'Chưa có batch migration.' end, case when v_batch_count > 0 then null else 'Chạy JSON → Relational migration trước khi kiểm tra.' end, 'source'));
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('family_row', 'Family row', case when v_family_count = 1 then 'ok' else 'error' end, '1', v_family_count::text, case when v_family_count = 1 then 'Family đã được tạo đúng.' else 'Thiếu hoặc dư family row.' end, 'Không chuyển sang relational read/write nếu family row chưa chuẩn.', 'core'));

  -- Source -> target count checks. These are strict because migration uses stable ids and should be idempotent.
  v_expected := coalesce((v_source->>'settings')::int,0); v_actual := coalesce((v_target->>'app_settings')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('settings_count', 'Settings', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Settings khớp.' else 'Settings không khớp giữa JSON và relational.' end, 'Kiểm tra app_settings trước khi bật relational read.', 'core'));

  v_expected := coalesce((v_source->>'hb_members')::int,0); v_actual := coalesce((v_target->>'health_members')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('health_members_count', 'Health members Bé/Mẹ/Ba', case when v_expected = v_actual and v_actual > 0 then 'ok' when v_actual >= v_expected and v_actual > 0 then 'warning' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual and v_actual > 0 then 'Số hồ sơ sức khỏe khớp.' else 'Số hồ sơ sức khỏe cần kiểm tra.' end, 'Cần đủ Bé/Mẹ/Ba trước khi chuyển Sổ sức khỏe sang relational.', 'health'));

  v_expected := coalesce((v_source->>'careEvents')::int,0); v_actual := coalesce((v_target->>'care_events')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('care_events_count', 'Care events', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Care events khớp.' else 'Care events bị thiếu/dư sau migration.' end, 'Không bật relational read cho Timeline nếu care_events chưa khớp.', 'care'));

  v_expected := coalesce((v_source->>'milkInventory')::int,0); v_actual := coalesce((v_target->>'milk_items')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('milk_items_count', 'Milk items / Kho sữa', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Kho sữa khớp số lượng.' else 'Kho sữa bị thiếu/dư sau migration.' end, 'Kho sữa phải khớp trước khi bật relational milk ledger.', 'milk'));

  v_expected := coalesce((v_source->>'milkContainers')::int,0); v_actual := coalesce((v_target->>'milk_containers')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('milk_containers_count', 'Milk containers', case when v_expected = v_actual then 'ok' else 'warning' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Danh mục bình/túi khớp.' else 'Danh mục bình/túi cần kiểm tra.' end, 'Có thể có container cũ/tạm, cần review trước relational write.', 'milk'));

  v_expected := coalesce((v_source->>'diary')::int,0); v_actual := coalesce((v_target->>'diary_entries')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('diary_count', 'Nhật ký', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Nhật ký khớp.' else 'Nhật ký thiếu/dư sau migration.' end, 'Kiểm tra diary_entries.', 'diary'));

  v_expected := coalesce((v_source->>'milestones')::int,0); v_actual := coalesce((v_target->>'milestones')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('milestones_count', 'Cột mốc', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Cột mốc khớp.' else 'Cột mốc thiếu/dư sau migration.' end, 'Kiểm tra milestones.', 'milestone'));

  v_expected := coalesce((v_source->>'appointments')::int,0); v_actual := coalesce((v_target->>'appointments')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('appointments_count', 'Lịch hẹn', case when v_expected = v_actual then 'ok' else 'error' end, v_expected::text, v_actual::text, case when v_expected = v_actual then 'Lịch hẹn khớp.' else 'Lịch hẹn thiếu/dư sau migration.' end, 'Kiểm tra appointments.', 'appointment'));

  v_actual := coalesce((v_target->>'health_measurements')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('measurements_count', 'Chỉ số sức khỏe', case when v_actual > 0 then 'ok' else 'warning' end, '>=1 nếu app có chỉ số', v_actual::text, case when v_actual > 0 then 'Có dữ liệu chỉ số sức khỏe.' else 'Không thấy chỉ số sức khỏe trong table mới.' end, 'Nếu app có cân nặng/chiều cao/vòng đầu, cần kiểm tra mapping trước khi bật relational read.', 'health'));

  v_expected := coalesce((v_target->>'vaccine_records')::int,0);
  v_tmp := coalesce((v_target->>'child_vaccine_plans')::int,0);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('vaccination_count', 'Tiêm chủng records/plans', case when v_expected = v_tmp then 'ok' else 'warning' end, v_expected::text || ' records ≈ plans', v_tmp::text || ' plans', case when v_expected = v_tmp then 'Sổ tiêm và plan đang khớp số lượng.' else 'Số vaccine_records và child_vaccine_plans khác nhau.' end, 'Nếu có mũi tiêm tùy chỉnh không có plan thì có thể chấp nhận, nhưng cần review.', 'vaccination'));

  -- Orphan checks
  select count(*) into v_orphan_feed from public.feed_events fe left join public.care_events ce on ce.id = fe.care_event_id and ce.deleted_at is null where fe.family_id = v_family_id and fe.deleted_at is null and ce.id is null;
  select count(*) into v_orphan_pump from public.pump_events pe left join public.care_events ce on ce.id = pe.care_event_id and ce.deleted_at is null where pe.family_id = v_family_id and pe.deleted_at is null and ce.id is null;
  select count(*) into v_orphan_sleep from public.sleep_events se left join public.care_events ce on ce.id = se.care_event_id and ce.deleted_at is null where se.family_id = v_family_id and se.deleted_at is null and ce.id is null;
  select count(*) into v_orphan_diaper from public.diaper_events de left join public.care_events ce on ce.id = de.care_event_id and ce.deleted_at is null where de.family_id = v_family_id and de.deleted_at is null and ce.id is null;
  select count(*) into v_orphan_temp from public.temperature_events te left join public.care_events ce on ce.id = te.care_event_id and ce.deleted_at is null where te.family_id = v_family_id and te.deleted_at is null and ce.id is null;
  v_tmp := v_orphan_feed + v_orphan_pump + v_orphan_sleep + v_orphan_diaper + v_orphan_temp;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('care_detail_orphans', 'Chi tiết care bị mồ côi', case when v_tmp = 0 then 'ok' else 'error' end, '0', v_tmp::text, case when v_tmp = 0 then 'Feed/Pump/Sleep/Diaper/Temperature đều có care_event gốc.' else 'Có detail event không trỏ được care_event gốc.' end, 'Cần sửa trước khi bật Timeline relational.', 'care'));

  select count(*) into v_orphan_milk_tx from public.milk_transactions mt left join public.milk_items mi on mi.id = mt.milk_item_id and mi.deleted_at is null where mt.family_id = v_family_id and mt.deleted_at is null and mi.id is null;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('milk_transaction_orphans', 'Milk transactions mồ côi', case when v_orphan_milk_tx = 0 then 'ok' else 'error' end, '0', v_orphan_milk_tx::text, case when v_orphan_milk_tx = 0 then 'Milk ledger đều trỏ đúng milk_item.' else 'Có milk_transactions không trỏ được milk_item.' end, 'Cần sửa trước khi bật Kho sữa relational.', 'milk'));

  select count(*) into v_orphan_feed_sources from public.feed_milk_sources fms left join public.feed_events fe on fe.id = fms.feed_event_id and fe.deleted_at is null left join public.milk_items mi on mi.id = fms.milk_item_id and mi.deleted_at is null where fms.family_id = v_family_id and fms.deleted_at is null and (fe.id is null or mi.id is null);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('feed_milk_source_orphans', 'Nguồn sữa của cữ bú mồ côi', case when v_orphan_feed_sources = 0 then 'ok' else 'error' end, '0', v_orphan_feed_sources::text, case when v_orphan_feed_sources = 0 then 'Feed milk sources trỏ đúng cữ bú và túi/bình.' else 'Có nguồn sữa không trỏ được cữ bú hoặc túi/bình.' end, 'Cần sửa trước khi bật Bé bú từ kho relational.', 'milk'));

  select count(*) into v_orphan_vaccine from public.vaccine_records vr left join public.health_members hm on hm.id = vr.member_id and hm.deleted_at is null left join public.vaccine_catalog vc on vc.id = vr.vaccine_id and vc.deleted_at is null left join public.child_vaccine_plans cvp on cvp.id = vr.plan_id and cvp.deleted_at is null where vr.family_id = v_family_id and vr.deleted_at is null and (hm.id is null or (vr.vaccine_id is not null and vc.id is null) or (vr.plan_id is not null and cvp.id is null));
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('vaccine_orphans', 'Tiêm chủng mồ côi', case when v_orphan_vaccine = 0 then 'ok' else 'error' end, '0', v_orphan_vaccine::text, case when v_orphan_vaccine = 0 then 'Vaccine records trỏ đúng member/catalog/plan.' else 'Có vaccine_records bị thiếu member/catalog/plan.' end, 'Cần sửa trước khi bật module Tiêm chủng relational.', 'vaccination'));

  select count(*) into v_orphan_measurement from public.health_measurements hm left join public.health_members m on m.id = hm.member_id and m.deleted_at is null where hm.family_id = v_family_id and hm.deleted_at is null and m.id is null;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('measurement_orphans', 'Chỉ số sức khỏe mồ côi', case when v_orphan_measurement = 0 then 'ok' else 'error' end, '0', v_orphan_measurement::text, case when v_orphan_measurement = 0 then 'Chỉ số sức khỏe trỏ đúng hồ sơ.' else 'Có chỉ số sức khỏe không trỏ được hồ sơ.' end, 'Cần sửa trước khi bật Sổ sức khỏe relational.', 'health'));

  select count(*) into v_orphan_media from public.media_files mf left join public.health_members hm on hm.id = mf.member_id and hm.deleted_at is null where mf.family_id = v_family_id and mf.deleted_at is null and mf.member_id is not null and hm.id is null;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('media_member_orphans', 'Media member mồ côi', case when v_orphan_media = 0 then 'ok' else 'warning' end, '0', v_orphan_media::text, case when v_orphan_media = 0 then 'Media có member_id hợp lệ.' else 'Có media_file trỏ member không tồn tại.' end, 'Kiểm tra ảnh giấy tờ/phiếu tiêm trước khi chuyển media relational.', 'media'));

  -- Duplicate and ledger checks
  select count(*) into v_duplicate_measurement from (
    select member_id, measure_date, count(*)
    from public.health_measurements
    where family_id = v_family_id and deleted_at is null
    group by member_id, measure_date
    having count(*) > 1
  ) d;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('duplicate_measurements', 'Trùng chỉ số cùng ngày', case when v_duplicate_measurement = 0 then 'ok' else 'warning' end, '0', v_duplicate_measurement::text, case when v_duplicate_measurement = 0 then 'Không có nhóm chỉ số bị trùng cùng ngày.' else 'Có chỉ số sức khỏe trùng member/ngày.' end, 'Review để tránh biểu đồ tăng trưởng bị nhảy sai.', 'health'));

  select count(*) into v_duplicate_vaccine from (
    select member_id, lower(coalesce(vaccine_name,'')) as vaccine_name, coalesce(dose_number,-1) as dose_number, injection_date, count(*)
    from public.vaccine_records
    where family_id = v_family_id and deleted_at is null and coalesce(vaccine_name,'') <> ''
    group by member_id, lower(coalesce(vaccine_name,'')), coalesce(dose_number,-1), injection_date
    having count(*) > 1
  ) d;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('duplicate_vaccines', 'Trùng mũi tiêm', case when v_duplicate_vaccine = 0 then 'ok' else 'warning' end, '0', v_duplicate_vaccine::text, case when v_duplicate_vaccine = 0 then 'Không có mũi tiêm trùng rõ ràng.' else 'Có nhóm mũi tiêm trùng theo member/vaccine/mũi/ngày.' end, 'Review trước khi bật Tiêm chủng relational.', 'vaccination'));

  select count(*) into v_milk_overdraw
  from public.milk_item_balances mb
  where mb.family_id = v_family_id
    and (coalesce(mb.used_ml,0) + coalesce(mb.discarded_ml,0) + coalesce(mb.transferred_out_ml,0)) > (coalesce(mb.amount_ml,0) + coalesce(mb.transferred_in_ml,0) + coalesce(mb.adjusted_ml,0) + 0.001);
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('milk_overdraw', 'Kho sữa bị trừ quá lượng', case when v_milk_overdraw = 0 then 'ok' else 'error' end, '0', v_milk_overdraw::text, case when v_milk_overdraw = 0 then 'Không có túi/bình bị ledger trừ âm.' else 'Có túi/bình bị transaction trừ quá lượng ban đầu.' end, 'Cần sửa ledger trước khi bật Kho sữa relational.', 'milk'));

  select count(*) into v_care_without_member from public.care_events ce left join public.health_members hm on hm.id = ce.member_id and hm.deleted_at is null where ce.family_id = v_family_id and ce.deleted_at is null and ce.member_id is not null and hm.id is null;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('care_member_orphans', 'Care events thiếu hồ sơ', case when v_care_without_member = 0 then 'ok' else 'error' end, '0', v_care_without_member::text, case when v_care_without_member = 0 then 'Care events trỏ đúng health_members.' else 'Có care_events trỏ member không tồn tại.' end, 'Cần sửa trước khi bật Dashboard/Timeline relational.', 'care'));

  select
    (select count(*) from public.feed_events where family_id = v_family_id and deleted_at is null) +
    (select count(*) from public.pump_events where family_id = v_family_id and deleted_at is null) +
    (select count(*) from public.sleep_events where family_id = v_family_id and deleted_at is null) +
    (select count(*) from public.diaper_events where family_id = v_family_id and deleted_at is null) +
    (select count(*) from public.temperature_events where family_id = v_family_id and deleted_at is null)
  into v_detail_events;
  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('detail_event_volume', 'Tổng detail events', case when v_detail_events <= v_care_events then 'ok' else 'warning' end, '<= care_events', v_detail_events::text || ' / ' || v_care_events::text, case when v_detail_events <= v_care_events then 'Tổng detail event không vượt care_events.' else 'Detail events nhiều hơn care_events, cần review mapping.' end, 'Kiểm tra nếu có một care_event phát sinh nhiều detail.', 'care'));

  v_checks := v_checks || jsonb_build_array(public.myb_doctor_check('change_logs', 'Change logs', case when v_change_logs > 0 then 'ok' else 'warning' end, '>=1', v_change_logs::text, case when v_change_logs > 0 then 'Đã có change_logs cho migration.' else 'Chưa thấy change_logs.' end, 'Change logs cần cho realtime/queue ở các bản sau.', 'core'));

  v_detail_counts := jsonb_build_object(
    'orphan_feed_events', v_orphan_feed,
    'orphan_pump_events', v_orphan_pump,
    'orphan_sleep_events', v_orphan_sleep,
    'orphan_diaper_events', v_orphan_diaper,
    'orphan_temperature_events', v_orphan_temp,
    'orphan_milk_transactions', v_orphan_milk_tx,
    'orphan_feed_milk_sources', v_orphan_feed_sources,
    'orphan_vaccine_records', v_orphan_vaccine,
    'orphan_measurements', v_orphan_measurement,
    'orphan_media_members', v_orphan_media,
    'duplicate_measurement_groups', v_duplicate_measurement,
    'duplicate_vaccine_groups', v_duplicate_vaccine,
    'milk_overdraw_items', v_milk_overdraw,
    'care_events_with_missing_member', v_care_without_member,
    'detail_events_total', v_detail_events,
    'care_events_total', v_care_events
  );

  select
    count(*) filter (where c.value->>'status' = 'error'),
    count(*) filter (where c.value->>'status' = 'warning'),
    count(*) filter (where c.value->>'status' = 'ok'),
    count(*)
  into v_errors, v_warnings, v_passed, v_total
  from jsonb_array_elements(v_checks) as c(value);

  v_status := case when v_errors > 0 then 'error' when v_warnings > 0 then 'warning' else 'passed' end;

  return jsonb_build_object(
    'ok', v_errors = 0,
    'status', v_status,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'legacy_updated_at', v_legacy_updated_at,
    'normal_app_write_mode', 'unchanged_legacy_json',
    'doctor_mode', 'read_only_no_data_mutation',
    'summary', jsonb_build_object(
      'total_checks', v_total,
      'passed', v_passed,
      'warnings', v_warnings,
      'errors', v_errors,
      'score', case when v_total = 0 then 0 else round((v_passed::numeric / v_total::numeric) * 100, 1) end,
      'recommendation', case
        when v_errors > 0 then 'Chưa nên bật RelationalReadMode. Cần xử lý lỗi đỏ trước.'
        when v_warnings > 0 then 'Có thể review cảnh báo vàng trước khi bật RelationalReadMode.'
        else 'Migration sạch. Có thể chuẩn bị bản RelationalReadMode.'
      end
    ),
    'source_counts', v_source,
    'target_counts', v_target,
    'detail_counts', v_detail_counts,
    'checks', v_checks
  );
end;
$$;

grant execute on function public.myb_doctor_check(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.myb_relational_migration_doctor(text) to anon, authenticated;

comment on function public.myb_relational_migration_doctor(text) is 'V15.0.65 read-only doctor to validate JSON-to-relational migration quality before RelationalReadMode.';
