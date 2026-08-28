-- =============================================================
-- Mẹ Yêu Bé V15.0.69 · RelationalWriteQueue
-- Purpose:
--   Add a guarded write queue foundation for writing app snapshots into
--   relational tables after RelationalReadMode is validated.
--
-- Safety:
--   - Default app mode remains OFF until the user enables it in the app.
--   - meyeube_sync is kept as legacy backup.
--   - Each queued snapshot is applied under a per-family advisory lock.
--   - The server soft-resets migrated relational rows for the family, then
--     rehydrates them from the submitted app payload via the migration mapper.
--     This allows deletes in the app payload to be reflected as deleted_at in
--     relational tables while preserving legacy backup JSON.
-- =============================================================

create extension if not exists pgcrypto;

-- ---------- Queue table ----------
create table if not exists public.relational_write_queue (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sync_id text not null default 'main',
  op_id uuid not null,
  device_id uuid references public.devices(id) on delete set null,
  device_key text,
  operation text not null default 'snapshot_apply',
  reason text,
  status text not null default 'queued',
  payload_hash text,
  payload_counts jsonb not null default '{}'::jsonb,
  server_result jsonb not null default '{}'::jsonb,
  error text,
  attempt_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  deleted_at timestamptz,
  unique(family_id, op_id)
);

alter table public.relational_write_queue enable row level security;

drop policy if exists relational_write_queue_family_all on public.relational_write_queue;
create policy relational_write_queue_family_all on public.relational_write_queue
for all to authenticated
using (public.myb_can_access_family(family_id))
with check (public.myb_can_access_family(family_id));

create index if not exists idx_relational_write_queue_family_status
on public.relational_write_queue(family_id, status, created_at desc)
where deleted_at is null;

create index if not exists idx_relational_write_queue_op
on public.relational_write_queue(family_id, op_id)
where deleted_at is null;

drop trigger if exists trg_relational_write_queue_updated_at on public.relational_write_queue;
create trigger trg_relational_write_queue_updated_at
before update on public.relational_write_queue
for each row execute function public.myb_set_updated_at();

-- ---------- Helpers ----------
create or replace function public.myb_payload_hash(p_payload jsonb)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_payload,'{}'::jsonb)::text, 'sha256'), 'hex');
$$;

create or replace function public.myb_relational_write_queue_counts(p_family_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'queued', (select count(*) from public.relational_write_queue where family_id = p_family_id and status = 'queued' and deleted_at is null),
    'processing', (select count(*) from public.relational_write_queue where family_id = p_family_id and status = 'processing' and deleted_at is null),
    'applied', (select count(*) from public.relational_write_queue where family_id = p_family_id and status = 'applied' and deleted_at is null),
    'failed', (select count(*) from public.relational_write_queue where family_id = p_family_id and status = 'failed' and deleted_at is null),
    'last_applied_at', (select max(applied_at) from public.relational_write_queue where family_id = p_family_id and status = 'applied' and deleted_at is null),
    'last_failed_at', (select max(updated_at) from public.relational_write_queue where family_id = p_family_id and status = 'failed' and deleted_at is null)
  );
$$;

create or replace function public.myb_soft_reset_relational_family_for_snapshot(p_family_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_counts jsonb := '{}'::jsonb;
  v_count int;
begin
  -- Soft-reset only data hydrated from legacy/app payload. Do not touch family,
  -- family_users, devices, push subscriptions, migration logs, change logs,
  -- or global/custom schedule templates.
  update public.app_settings set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('app_settings', v_count);
  update public.media_files set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('media_files', v_count);
  update public.health_labs set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_labs', v_count);
  update public.health_medications set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_medications', v_count);
  update public.health_allergies set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_allergies', v_count);
  update public.health_visits set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_visits', v_count);
  update public.health_measurements set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_measurements', v_count);
  update public.vaccine_records set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('vaccine_records', v_count);
  update public.child_vaccine_plans set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('child_vaccine_plans', v_count);
  update public.vaccine_catalog set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('vaccine_catalog', v_count);
  update public.feed_milk_sources set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('feed_milk_sources', v_count);
  update public.milk_transactions set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('milk_transactions', v_count);
  update public.feed_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('feed_events', v_count);
  update public.pump_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('pump_events', v_count);
  update public.sleep_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('sleep_events', v_count);
  update public.diaper_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('diaper_events', v_count);
  update public.temperature_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('temperature_events', v_count);
  update public.care_events set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('care_events', v_count);
  update public.milk_items set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('milk_items', v_count);
  update public.milk_containers set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('milk_containers', v_count);
  update public.appointments set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('appointments', v_count);
  update public.diary_entries set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('diary_entries', v_count);
  update public.milestones set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('milestones', v_count);
  update public.care_categories set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('care_categories', v_count);
  update public.health_members set deleted_at = v_now where family_id = p_family_id and deleted_at is null; get diagnostics v_count = row_count; v_counts := v_counts || jsonb_build_object('health_members', v_count);

  return v_counts;
end;
$$;

-- ---------- Preflight / status ----------
create or replace function public.myb_relational_write_preflight(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_read jsonb;
  v_queue jsonb;
begin
  v_read := public.myb_relational_read_preflight(v_sync_id);
  v_queue := public.myb_relational_write_queue_counts(v_family_id);
  return jsonb_build_object(
    'ok', coalesce((v_read->>'ok')::boolean, false),
    'status', case when coalesce((v_read->>'ok')::boolean, false) then 'ready' else 'blocked' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'read_preflight', v_read,
    'write_queue', v_queue,
    'message', case when coalesce((v_read->>'ok')::boolean, false) then 'RelationalWriteQueue sẵn sàng bật. Nên bật trên tất cả thiết bị cùng phiên bản.' else 'Chưa bật được RelationalWriteQueue. Cần Doctor passed và Delta = 0 trước.' end,
    'normal_app_write_mode', 'relational_write_queue_optional_default_off'
  );
end;
$$;

create or replace function public.myb_relational_write_queue_status(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_last jsonb;
begin
  select to_jsonb(q) into v_last
  from public.relational_write_queue q
  where q.family_id = v_family_id and q.deleted_at is null
  order by q.created_at desc
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'write_queue', public.myb_relational_write_queue_counts(v_family_id),
    'table_counts', public.myb_relational_table_counts(v_family_id),
    'last_operation', coalesce(v_last, 'null'::jsonb)
  );
end;
$$;

-- ---------- Apply full app payload snapshot ----------
create or replace function public.myb_apply_relational_payload_snapshot(
  p_sync_id text default 'main',
  p_op_id uuid default gen_random_uuid(),
  p_device_key text default null,
  p_payload jsonb default '{}'::jsonb,
  p_reason text default 'save'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_device_id uuid := public.myb_stable_uuid('device:relational-write:' || coalesce(nullif(p_device_key,''),'unknown') || ':' || v_sync_id);
  v_payload jsonb := public.myb_json_object(p_payload);
  v_hash text := public.myb_payload_hash(public.myb_json_object(p_payload));
  v_counts jsonb := public.myb_migration_source_counts(public.myb_json_object(p_payload));
  v_reset jsonb;
  v_migration jsonb;
  v_row_id uuid;
begin
  if jsonb_typeof(p_payload) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'status', 'invalid_payload', 'message', 'Payload phải là JSON object.');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_family_id::text));

  insert into public.families(id, sync_code, name, legacy_sync_id, created_at, updated_at, deleted_at)
  values(v_family_id, v_sync_id, 'Mẹ Yêu Bé', v_sync_id, now(), now(), null)
  on conflict (id) do update set legacy_sync_id = excluded.legacy_sync_id, updated_at = now(), deleted_at = null;

  insert into public.devices(id, family_id, device_name, device_type, platform, app_version, last_seen_at, created_at, updated_at, deleted_at)
  values(v_device_id, v_family_id, coalesce(nullif(p_device_key,''),'Thiết bị'), 'pwa', 'web', '15.0.69', now(), now(), now(), null)
  on conflict (id) do update set last_seen_at = now(), app_version = '15.0.69', updated_at = now(), deleted_at = null;

  insert into public.relational_write_queue(family_id, sync_id, op_id, device_id, device_key, operation, reason, status, payload_hash, payload_counts, attempt_count, created_at, updated_at, deleted_at)
  values(v_family_id, v_sync_id, p_op_id, v_device_id, p_device_key, 'snapshot_apply', p_reason, 'processing', v_hash, v_counts, 1, now(), now(), null)
  on conflict (family_id, op_id) do update set
    status = case when public.relational_write_queue.status = 'applied' then 'applied' else 'processing' end,
    attempt_count = public.relational_write_queue.attempt_count + 1,
    payload_hash = excluded.payload_hash,
    payload_counts = excluded.payload_counts,
    updated_at = now(),
    error = null,
    deleted_at = null
  returning id into v_row_id;

  if exists(select 1 from public.relational_write_queue where family_id = v_family_id and op_id = p_op_id and status = 'applied' and deleted_at is null) then
    return jsonb_build_object('ok', true, 'status', 'already_applied', 'sync_id', v_sync_id, 'family_id', v_family_id, 'op_id', p_op_id, 'payload_hash', v_hash);
  end if;

  -- Legacy backup is still kept. This makes rollback/export possible during the transition.
  insert into public.meyeube_sync(id, data, updated_at)
  values(v_sync_id, v_payload, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();

  -- Make the relational side match this complete app snapshot. Missing rows become deleted_at.
  v_reset := public.myb_soft_reset_relational_family_for_snapshot(v_family_id);
  v_migration := public.myb_migrate_json_to_relational(v_sync_id, false);

  update public.relational_write_queue
  set status = 'applied', applied_at = now(), server_result = jsonb_build_object('reset', v_reset, 'migration', v_migration), error = null, updated_at = now()
  where family_id = v_family_id and op_id = p_op_id;

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'relational_write_queue', coalesce(v_row_id, p_op_id), 'snapshot_apply', p_op_id, v_device_id, jsonb_build_object('reason', p_reason, 'payload_counts', v_counts, 'payload_hash', v_hash));

  return jsonb_build_object(
    'ok', true,
    'status', 'applied',
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'op_id', p_op_id,
    'device_id', v_device_id,
    'payload_hash', v_hash,
    'payload_counts', v_counts,
    'reset_counts', v_reset,
    'migration_result', v_migration,
    'write_queue', public.myb_relational_write_queue_counts(v_family_id),
    'table_counts', public.myb_relational_table_counts(v_family_id),
    'legacy_backup', 'public.meyeube_sync đã được cập nhật làm backup legacy trong giai đoạn chuyển đổi.',
    'normal_app_write_mode', 'relational_write_queue_snapshot_apply'
  );
exception when others then
  update public.relational_write_queue
  set status = 'failed', error = sqlerrm, updated_at = now()
  where family_id = v_family_id and op_id = p_op_id;
  return jsonb_build_object('ok', false, 'status', 'failed', 'sync_id', v_sync_id, 'family_id', v_family_id, 'op_id', p_op_id, 'message', sqlerrm);
end;
$$;

grant execute on function public.myb_payload_hash(jsonb) to anon, authenticated;
grant execute on function public.myb_relational_write_queue_counts(uuid) to anon, authenticated;
grant execute on function public.myb_relational_write_preflight(text) to anon, authenticated;
grant execute on function public.myb_relational_write_queue_status(text) to anon, authenticated;
grant execute on function public.myb_apply_relational_payload_snapshot(text, uuid, text, jsonb, text) to anon, authenticated;

comment on table public.relational_write_queue is 'V15.0.69 optional guarded write queue. Default off in app. Stores metadata/results for relational snapshot writes.';
comment on function public.myb_apply_relational_payload_snapshot(text, uuid, text, jsonb, text) is 'V15.0.69 applies a complete app payload snapshot into relational tables under advisory lock, while keeping meyeube_sync as legacy backup.';
