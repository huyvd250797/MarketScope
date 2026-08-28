-- =============================================================
-- Mẹ Yêu Bé V15.0.61 · RelationalSchemaFoundation
-- Purpose:
--   Create the normalized relational database foundation for the app.
--   The legacy public.meyeube_sync JSONB table is kept as backup/legacy.
--   The current app version does NOT write to these new tables yet.
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
comment on table public.change_logs is 'Append-only relational change feed for future realtime/queue sync. V15.0.61 creates schema only; app writes remain on legacy JSON.';
comment on table public.media_files is 'Metadata for files stored in Supabase Storage or local IndexedDB; never store base64 blobs in app data.';
comment on table public.milk_transactions is 'Milk ledger transaction table; balances are computed from transactions instead of mutating remaining by hand.';
comment on view public.milk_item_balances is 'Computed milk balance view for future relational milk ledger.';
