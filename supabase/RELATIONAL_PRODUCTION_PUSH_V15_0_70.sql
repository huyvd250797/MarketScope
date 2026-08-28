-- =============================================================
-- Mẹ Yêu Bé V15.0.71 · RelationalProductionPush
-- Purpose:
--   Mark relational tables as the official/primary data source after all
--   devices have enabled RelationalReadMode + RelationalWriteQueue.
--
-- Safety:
--   - Does not delete public.meyeube_sync.
--   - Requires Doctor passed, Delta = 0, and relational write queue clean.
--   - Stores a server-side primary state so future releases can hide migration
--     tools and eventually archive the monolithic JSON.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.relational_primary_state (
  family_id uuid primary key references public.families(id) on delete cascade,
  sync_id text not null default 'main',
  status text not null default 'preparing',
  mode_version text not null default '15.0.71',
  activated_at timestamptz,
  activated_by_device uuid references public.devices(id) on delete set null,
  last_preflight_at timestamptz,
  last_promoted_at timestamptz,
  last_verified_at timestamptz,
  legacy_updated_at timestamptz,
  read_preflight jsonb not null default '{}'::jsonb,
  write_queue jsonb not null default '{}'::jsonb,
  table_counts jsonb not null default '{}'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.relational_primary_state enable row level security;

drop policy if exists relational_primary_state_family_all on public.relational_primary_state;
create policy relational_primary_state_family_all on public.relational_primary_state
for all to authenticated
using (public.myb_can_access_family(family_id))
with check (public.myb_can_access_family(family_id));

drop trigger if exists trg_relational_primary_state_updated_at on public.relational_primary_state;
create trigger trg_relational_primary_state_updated_at
before update on public.relational_primary_state
for each row execute function public.myb_set_updated_at();

create or replace function public.myb_relational_primary_state_json(p_family_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select to_jsonb(s) from public.relational_primary_state s where s.family_id = p_family_id and s.deleted_at is null limit 1),
    jsonb_build_object('status','not_initialized','family_id',p_family_id)
  );
$$;

create or replace function public.myb_relational_primary_preflight(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_read jsonb;
  v_doctor jsonb;
  v_delta jsonb;
  v_queue jsonb;
  v_counts jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_legacy_updated_at timestamptz;
  v_queue_bad int := 0;
begin
  v_read := public.myb_relational_read_preflight(v_sync_id);
  v_doctor := public.myb_relational_migration_doctor(v_sync_id);
  v_delta := public.myb_relational_delta_counts(v_sync_id);
  v_queue := public.myb_relational_write_queue_counts(v_family_id);
  v_counts := public.myb_relational_table_counts(v_family_id);
  select updated_at into v_legacy_updated_at from public.meyeube_sync where id = v_sync_id limit 1;

  if not coalesce((v_read->>'ok')::boolean, false) then
    v_blockers := v_blockers || jsonb_build_array('read_preflight_not_ok');
  end if;
  if coalesce((v_doctor->>'ok')::boolean, false) is false then
    v_blockers := v_blockers || jsonb_build_array('doctor_not_passed');
  end if;
  if coalesce((v_delta->>'total_delta')::int, 0) <> 0 then
    v_blockers := v_blockers || jsonb_build_array('delta_not_zero');
  end if;

  v_queue_bad := coalesce((v_queue->>'queued')::int,0) + coalesce((v_queue->>'processing')::int,0) + coalesce((v_queue->>'failed')::int,0);
  if v_queue_bad <> 0 then
    v_blockers := v_blockers || jsonb_build_array('write_queue_not_clean');
  end if;

  insert into public.relational_primary_state(family_id, sync_id, status, mode_version, last_preflight_at, legacy_updated_at, read_preflight, write_queue, table_counts, blockers, last_verified_at, created_at, updated_at, deleted_at)
  values(v_family_id, v_sync_id, case when jsonb_array_length(v_blockers)=0 then 'primary_ready' else 'preflight_blocked' end, '15.0.71', now(), v_legacy_updated_at, v_read, v_queue, v_counts, v_blockers, case when jsonb_array_length(v_blockers)=0 then now() else null end, now(), now(), null)
  on conflict (family_id) do update set
    sync_id = excluded.sync_id,
    status = case when public.relational_primary_state.status = 'primary_active' and jsonb_array_length(excluded.blockers)=0 then 'primary_active' else excluded.status end,
    mode_version = '15.0.71',
    last_preflight_at = now(),
    legacy_updated_at = excluded.legacy_updated_at,
    read_preflight = excluded.read_preflight,
    write_queue = excluded.write_queue,
    table_counts = excluded.table_counts,
    blockers = excluded.blockers,
    last_verified_at = excluded.last_verified_at,
    updated_at = now(),
    deleted_at = null;

  return jsonb_build_object(
    'ok', jsonb_array_length(v_blockers)=0,
    'status', case when jsonb_array_length(v_blockers)=0 then 'ready_for_primary' else 'blocked' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'blockers', v_blockers,
    'doctor_status', v_doctor->>'status',
    'doctor_score', v_doctor#>>'{summary,score}',
    'delta_total', coalesce((v_delta->>'total_delta')::int,0),
    'write_queue', v_queue,
    'table_counts', v_counts,
    'legacy_updated_at', v_legacy_updated_at,
    'recommendation', case when jsonb_array_length(v_blockers)=0 then 'Sẵn sàng chốt Relational DB làm nguồn dữ liệu chính thức. JSON legacy vẫn giữ làm backup.' else 'Chưa nên chốt dữ liệu chính thức. Cần xử lý blockers trước.' end,
    'primary_state', public.myb_relational_primary_state_json(v_family_id)
  );
end;
$$;

create or replace function public.myb_relational_promote_primary(
  p_sync_id text default 'main',
  p_device_key text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_device_id uuid := public.myb_stable_uuid('device:relational-primary:' || coalesce(nullif(p_device_key,''),'unknown') || ':' || v_sync_id);
  v_preflight jsonb;
  v_state jsonb;
  v_op_id uuid := gen_random_uuid();
begin
  perform pg_advisory_xact_lock(hashtext(v_family_id::text));

  v_preflight := public.myb_relational_primary_preflight(v_sync_id);
  if not coalesce((v_preflight->>'ok')::boolean, false) then
    return jsonb_build_object('ok', false, 'status', 'blocked', 'sync_id', v_sync_id, 'family_id', v_family_id, 'preflight', v_preflight, 'message', 'Không thể chốt Relational DB vì preflight chưa sạch.');
  end if;

  insert into public.devices(id, family_id, device_name, device_type, platform, app_version, last_seen_at, created_at, updated_at, deleted_at)
  values(v_device_id, v_family_id, coalesce(nullif(p_device_key,''),'Thiết bị chốt relational'), 'pwa', 'web', '15.0.71', now(), now(), now(), null)
  on conflict (id) do update set last_seen_at = now(), app_version = '15.0.71', updated_at = now(), deleted_at = null;

  update public.relational_primary_state
  set status = 'primary_active',
      mode_version = '15.0.71',
      activated_at = coalesce(activated_at, now()),
      activated_by_device = v_device_id,
      last_promoted_at = now(),
      last_verified_at = now(),
      note = coalesce(p_note, note, 'Relational DB promoted as primary. Legacy JSON kept as backup.'),
      updated_at = now(),
      deleted_at = null
  where family_id = v_family_id;

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'relational_primary_state', v_family_id, 'promote_primary', v_op_id, v_device_id, jsonb_build_object('version','15.0.71','sync_id',v_sync_id,'note',p_note,'preflight',v_preflight));

  v_state := public.myb_relational_primary_state_json(v_family_id);
  return jsonb_build_object(
    'ok', true,
    'status', 'primary_active',
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'device_id', v_device_id,
    'primary_state', v_state,
    'preflight', v_preflight,
    'message', 'Đã chốt Relational DB làm nguồn dữ liệu chính thức. meyeube_sync vẫn được giữ làm backup legacy.',
    'normal_app_write_mode', 'relational_primary_with_legacy_backup'
  );
end;
$$;

create or replace function public.myb_relational_primary_status(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_legacy_updated_at timestamptz;
begin
  select updated_at into v_legacy_updated_at from public.meyeube_sync where id = v_sync_id limit 1;
  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'primary_state', public.myb_relational_primary_state_json(v_family_id),
    'write_queue', public.myb_relational_write_queue_counts(v_family_id),
    'table_counts', public.myb_relational_table_counts(v_family_id),
    'legacy_updated_at', v_legacy_updated_at,
    'device_count', (select count(*) from public.devices where family_id = v_family_id and deleted_at is null),
    'recent_devices', coalesce((select jsonb_agg(jsonb_build_object('device_name',device_name,'app_version',app_version,'last_seen_at',last_seen_at) order by last_seen_at desc) from (select device_name, app_version, last_seen_at from public.devices where family_id = v_family_id and deleted_at is null order by last_seen_at desc limit 8) d), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.myb_relational_primary_state_json(uuid) to anon, authenticated;
grant execute on function public.myb_relational_primary_preflight(text) to anon, authenticated;
grant execute on function public.myb_relational_promote_primary(text, text, text) to anon, authenticated;
grant execute on function public.myb_relational_primary_status(text) to anon, authenticated;

comment on table public.relational_primary_state is 'V15.0.71 server-side marker for promoting relational tables as official primary data source while keeping legacy JSON backup.';
comment on function public.myb_relational_primary_preflight(text) is 'V15.0.71 final gate before official relational production push: Doctor passed, Delta=0, WriteQueue clean.';
comment on function public.myb_relational_promote_primary(text, text, text) is 'V15.0.71 promotes relational DB as primary/official source. Does not delete meyeube_sync legacy backup.';
