

-- =============================================================
-- Mẹ Yêu Bé V15.0.72 · RelationalDataRescueDedupeFix
-- Purpose:
--   Emergency damage control after mixed ReadMode/WriteQueue caused duplicate
--   data across legacy JSON and relational tables.
--   - Fast duplicate doctor: no heavy backfill, no timeout-prone queries.
--   - Clean legacy JSON payload by semantic keys, not only UUID.
--   - Rebuild relational tables from the cleaned legacy JSON under family lock.
--   - Patch snapshot write RPC to de-dupe incoming payload before saving.
-- =============================================================

create extension if not exists pgcrypto;

create table if not exists public.relational_recovery_backups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  sync_id text not null default 'main',
  backup_type text not null default 'dedupe_rebuild',
  backup_data jsonb not null default '{}'::jsonb,
  before_counts jsonb not null default '{}'::jsonb,
  after_counts jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.relational_recovery_backups enable row level security;
drop policy if exists relational_recovery_backups_family_all on public.relational_recovery_backups;
create policy relational_recovery_backups_family_all on public.relational_recovery_backups
for all to authenticated
using (public.myb_can_access_family(family_id))
with check (public.myb_can_access_family(family_id));

create index if not exists idx_relational_recovery_backups_family_created
on public.relational_recovery_backups(family_id, created_at desc) where deleted_at is null;

create or replace function public.myb_is_uuid_text(p_text text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_text,'') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

create or replace function public.myb_norm_key_text(p_text text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(btrim(coalesce(p_text,'')), '\s+', ' ', 'g'));
$$;

create or replace function public.myb_dedupe_item_key(p_item jsonb, p_kind text, p_ord int default 0)
returns text
language plpgsql
immutable
as $$
declare
  v jsonb := public.myb_json_object(p_item);
  id text := nullif(v->>'id','');
  k text := lower(coalesce(p_kind,''));
  rel text;
  nm text;
begin
  if k in ('hb_members','health_members') then
    rel := public.myb_relation_norm(coalesce(v->>'rel', v->>'person', v->>'relation'));
    nm := public.myb_norm_key_text(coalesce(v->>'name', v->>'displayName', v->>'fullName'));
    return 'member:' || rel || '|' || nm || '|' || coalesce(left(v->>'dob',10),'');
  end if;

  if k in ('milkcontainers','milk_containers') then
    return 'container:' || public.myb_norm_milk_container_kind(coalesce(v->>'kind', v->>'containerKind'), coalesce(v->>'name', v->>'containerName')) || '|' || public.myb_norm_key_text(coalesce(v->>'name', v->>'containerName')) || '|' || coalesce(v->>'capacity', v->>'capacityMl', '');
  end if;

  if k in ('milkinventory','milk_items') then
    if nullif(coalesce(v->>'shortCode', v->>'bagCode', v->>'shortId', v->>'code'), '') is not null then
      return 'milk-code:' || public.myb_norm_key_text(coalesce(v->>'shortCode', v->>'bagCode', v->>'shortId', v->>'code'));
    end if;
    if nullif(v->>'pumpEventId','') is not null and not public.myb_is_uuid_text(v->>'pumpEventId') then
      return 'milk-pump:' || (v->>'pumpEventId');
    end if;
    if id is not null and not public.myb_is_uuid_text(id) then
      return 'milk-id:' || id;
    end if;
    return 'milk-sig:' || concat_ws('|', coalesce(v->>'date', v->>'startDate', left(v->>'createdAt',10), ''), coalesce(v->>'timeFrom', v->>'time', ''), coalesce(v->>'amount', v->>'amountMl', ''), public.myb_norm_key_text(coalesce(v->>'containerName','')), coalesce(v->>'expireDateTime', v->>'expireDate', v->>'expireAt',''));
  end if;

  if k in ('careevents','care_events') then
    if id is not null and not public.myb_is_uuid_text(id) then
      return 'care-id:' || id;
    end if;
    return 'care-sig:' || concat_ws('|', public.myb_norm_key_text(v->>'type'), coalesce(v->>'date', v->>'startDate', left(v->>'createdAt',10), ''), coalesce(v->>'timeFrom', v->>'time', ''), coalesce(v->>'timeTo',''), coalesce(v->>'amount', v->>'amountMl', v->>'ml',''), public.myb_norm_key_text(coalesce(v->>'source','')), coalesce(v->>'createdAt',''), left(md5(coalesce(v->>'note','')),10));
  end if;

  if k in ('measurements','meas','baby','mom') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'meas-id:' || id; end if;
    return 'meas-sig:' || concat_ws('|', coalesce(v->>'date', left(v->>'createdAt',10), ''), coalesce(v->>'weight',''), coalesce(v->>'height',''), coalesce(v->>'head',''));
  end if;

  if k in ('vaccines','vaccine_records') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'vax-id:' || id; end if;
    return 'vax-sig:' || concat_ws('|', public.myb_norm_key_text(coalesce(v->>'name', v->>'vaccine')), coalesce(v->>'dose',''), coalesce(v->>'date', v->>'injectionDate', v->>'dueDate',''));
  end if;

  if k in ('visits','health_visits') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'visit-id:' || id; end if;
    return 'visit-sig:' || concat_ws('|', coalesce(v->>'date',''), coalesce(v->>'time',''), public.myb_norm_key_text(coalesce(v->>'hospital','')), left(md5(coalesce(v->>'diagnosis','') || coalesce(v->>'symptom','')),10));
  end if;

  if k in ('diary','diary_entries') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'diary-id:' || id; end if;
    return 'diary-sig:' || concat_ws('|', coalesce(v->>'date', left(v->>'createdAt',10), ''), coalesce(v->>'time',''), public.myb_norm_key_text(coalesce(v->>'category','')), public.myb_norm_key_text(coalesce(v->>'title','')), left(md5(coalesce(v->>'note','')),10));
  end if;

  if k in ('appointments') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'appt-id:' || id; end if;
    return 'appt-sig:' || concat_ws('|', coalesce(v->>'date',''), coalesce(v->>'time', v->>'timeFrom',''), public.myb_norm_key_text(coalesce(v->>'title', v->>'type')), public.myb_norm_key_text(coalesce(v->>'place','')));
  end if;

  if k in ('milestones') then
    if id is not null and not public.myb_is_uuid_text(id) then return 'mile-id:' || id; end if;
    return 'mile-sig:' || concat_ws('|', coalesce(v->>'date',''), public.myb_norm_key_text(coalesce(v->>'title','')), public.myb_norm_key_text(coalesce(v->>'type', v->>'category')), coalesce(v->>'createdAt',''));
  end if;

  if k in ('milk_sources','milksources','feed_milk_sources') then
    return 'source-sig:' || concat_ws('|', coalesce(v->>'bagId', v->>'milkItemId', v->>'id',''), coalesce(v->>'usedMl', v->>'amountMl', v->>'ml',''), coalesce(v->>'discardMl', v->>'discardedMl',''));
  end if;

  if id is not null and not public.myb_is_uuid_text(id) then
    return k || '-id:' || id;
  end if;
  return k || '-sig:' || concat_ws('|', coalesce(v->>'date', left(v->>'createdAt',10), ''), coalesce(v->>'time',''), public.myb_norm_key_text(coalesce(v->>'name', v->>'title', v->>'type','')), coalesce(v->>'createdAt',''), p_ord::text);
end;
$$;

create or replace function public.myb_json_item_score(p_item jsonb)
returns numeric
language plpgsql
immutable
as $$
declare
  v jsonb := public.myb_json_object(p_item);
  id text := nullif(v->>'id','');
  s numeric := 0;
begin
  s := s + length(v::text);
  if id is not null and not public.myb_is_uuid_text(id) then s := s + 1000000; end if;
  if nullif(v->>'shortCode','') is not null then s := s + 50000; end if;
  if nullif(v->>'bagCode','') is not null then s := s + 50000; end if;
  if nullif(v->>'containerKind','') is not null then s := s + 5000; end if;
  if nullif(v->>'containerName','') is not null then s := s + 5000; end if;
  if nullif(v->>'updatedAt','') is not null then s := s + 100; end if;
  return s;
end;
$$;

create or replace function public.myb_dedupe_json_array(p_arr jsonb, p_kind text)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_arr jsonb := public.myb_json_array(p_arr);
  v_seen jsonb := '{}'::jsonb;
  v_best jsonb := '{}'::jsonb;
  v_order text[] := array[]::text[];
  v_row record;
  v_item jsonb;
  v_key text;
  v_current jsonb;
  v_out jsonb := '[]'::jsonb;
  v_path text[];
  v_k text;
begin
  for v_row in select value, ordinality from jsonb_array_elements(v_arr) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_key := public.myb_dedupe_item_key(v_item, p_kind, v_row.ordinality::int);
    if v_key is null or v_key = '' then
      v_key := coalesce(p_kind,'item') || ':ord:' || v_row.ordinality::text;
    end if;
    v_path := array[v_key];
    if not (v_seen ? v_key) then
      v_seen := jsonb_set(v_seen, v_path, 'true'::jsonb, true);
      v_best := jsonb_set(v_best, v_path, v_item, true);
      v_order := array_append(v_order, v_key);
    else
      v_current := public.myb_json_object(v_best -> v_key);
      if public.myb_json_item_score(v_item) > public.myb_json_item_score(v_current) then
        v_best := jsonb_set(v_best, v_path, v_item, true);
      end if;
    end if;
  end loop;

  foreach v_k in array v_order loop
    v_out := v_out || jsonb_build_array(v_best -> v_k);
  end loop;
  return coalesce(v_out, '[]'::jsonb);
end;
$$;

create or replace function public.myb_dedupe_hb_members_v1572(p_members jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_arr jsonb := public.myb_json_array(p_members);
  v_out jsonb := '[]'::jsonb;
  v_row record;
  v_item jsonb;
begin
  for v_row in select value, ordinality from jsonb_array_elements(public.myb_dedupe_json_array(v_arr, 'hb_members')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_item := jsonb_set(v_item, '{meas}', public.myb_dedupe_json_array(v_item->'meas', 'measurements'), true);
    v_item := jsonb_set(v_item, '{vaccines}', public.myb_dedupe_json_array(v_item->'vaccines', 'vaccines'), true);
    v_item := jsonb_set(v_item, '{visits}', public.myb_dedupe_json_array(v_item->'visits', 'visits'), true);
    v_item := jsonb_set(v_item, '{meds}', public.myb_dedupe_json_array(v_item->'meds', 'meds'), true);
    v_item := jsonb_set(v_item, '{labs}', public.myb_dedupe_json_array(v_item->'labs', 'labs'), true);
    v_out := v_out || jsonb_build_array(v_item);
  end loop;
  return v_out;
end;
$$;

create or replace function public.myb_dedupe_legacy_payload_v1572(p_payload jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v jsonb := public.myb_json_object(p_payload);
  hb jsonb := public.myb_json_object(v->'hb');
begin
  hb := jsonb_set(hb, '{members}', public.myb_dedupe_hb_members_v1572(hb->'members'), true);
  v := jsonb_set(v, '{hb}', hb, true);
  v := jsonb_set(v, '{careEvents}', public.myb_dedupe_json_array(v->'careEvents', 'careEvents'), true);
  v := jsonb_set(v, '{milkInventory}', public.myb_dedupe_json_array(v->'milkInventory', 'milkInventory'), true);
  v := jsonb_set(v, '{milkContainers}', public.myb_dedupe_json_array(v->'milkContainers', 'milkContainers'), true);
  v := jsonb_set(v, '{appointments}', public.myb_dedupe_json_array(v->'appointments', 'appointments'), true);
  v := jsonb_set(v, '{diary}', public.myb_dedupe_json_array(v->'diary', 'diary'), true);
  v := jsonb_set(v, '{milestones}', public.myb_dedupe_json_array(v->'milestones', 'milestones'), true);
  v := jsonb_set(v, '{baby}', public.myb_dedupe_json_array(v->'baby', 'measurements'), true);
  v := jsonb_set(v, '{mom}', public.myb_dedupe_json_array(v->'mom', 'measurements'), true);
  v := jsonb_set(v, '{diaryTypes}', public.myb_dedupe_json_array(v->'diaryTypes', 'diaryTypes'), true);
  v := jsonb_set(v, '{appointmentTypes}', public.myb_dedupe_json_array(v->'appointmentTypes', 'appointmentTypes'), true);
  v := jsonb_set(v, '{milkContainers}', (
    select coalesce(jsonb_agg(
      jsonb_set(
        public.myb_json_object(x.value),
        '{kind}',
        to_jsonb(public.myb_norm_milk_container_kind(x.value->>'kind', x.value->>'name')),
        true
      ) order by x.ordinality
    ), '[]'::jsonb)
    from jsonb_array_elements(public.myb_json_array(v->'milkContainers')) with ordinality x(value, ordinality)
  ), true);
  return v || jsonb_build_object('_relationalDataRescueVersion','15.0.72','_relationalDataRescueAt', now());
end;
$$;

create or replace function public.myb_dedupe_source_counts_v1572(p_payload jsonb)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'careEvents', jsonb_array_length(public.myb_json_array(p_payload->'careEvents')),
    'milkInventory', jsonb_array_length(public.myb_json_array(p_payload->'milkInventory')),
    'milkContainers', jsonb_array_length(public.myb_json_array(p_payload->'milkContainers')),
    'hb_members', jsonb_array_length(public.myb_json_array(p_payload#>'{hb,members}')),
    'diary', jsonb_array_length(public.myb_json_array(p_payload->'diary')),
    'milestones', jsonb_array_length(public.myb_json_array(p_payload->'milestones')),
    'appointments', jsonb_array_length(public.myb_json_array(p_payload->'appointments')),
    'health_measurements_nested', coalesce((select sum(jsonb_array_length(public.myb_json_array(m.value->'meas'))) from jsonb_array_elements(public.myb_json_array(p_payload#>'{hb,members}')) m),0),
    'vaccines_nested', coalesce((select sum(jsonb_array_length(public.myb_json_array(m.value->'vaccines'))) from jsonb_array_elements(public.myb_json_array(p_payload#>'{hb,members}')) m),0)
  );
$$;

create or replace function public.myb_relational_fast_duplicate_doctor(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_data jsonb := '{}'::jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_before jsonb;
  v_after jsonb;
  d_legacy int := 0;
  d_health int := 0;
  d_care int := 0;
  d_milk int := 0;
  d_containers int := 0;
  d_meas int := 0;
  d_vax int := 0;
  d_diary int := 0;
  d_appt int := 0;
  v_ok boolean;
begin
  select data into v_data from public.meyeube_sync where id = v_sync_id limit 1;
  v_data := coalesce(v_data, '{}'::jsonb);
  v_clean := public.myb_dedupe_legacy_payload_v1572(v_data);
  v_before := public.myb_dedupe_source_counts_v1572(v_data);
  v_after := public.myb_dedupe_source_counts_v1572(v_clean);

  select coalesce(sum((v_before->>k)::int - (v_after->>k)::int),0)::int into d_legacy
  from jsonb_object_keys(v_before) k
  where (v_before->>k) ~ '^\d+$' and (v_after->>k) ~ '^\d+$' and (v_before->>k)::int > (v_after->>k)::int;

  select coalesce(sum(cnt-1),0)::int into d_health from (
    select public.myb_norm_key_text(coalesce(relation,'') || '|' || coalesce(display_name, full_name, '') || '|' || coalesce(dob::text,'')) k, count(*) cnt
    from public.health_members where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_care from (
    select coalesce(nullif(legacy_id,''), extra->>'id', type || '|' || coalesce(event_date::text,'') || '|' || coalesce(time_from,'') || '|' || coalesce(time_to,'') || '|' || coalesce(amount::text,'') || '|' || coalesce(created_at::text,'')) k, count(*) cnt
    from public.care_events where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_milk from (
    select coalesce(nullif(legacy_id,''), nullif(short_code,''), coalesce(container_name,'') || '|' || coalesce(amount_ml::text,'') || '|' || coalesce(expire_at::text,'') || '|' || coalesce(created_at::text,'')) k, count(*) cnt
    from public.milk_items where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_containers from (
    select public.myb_norm_milk_container_kind(kind,name) || '|' || public.myb_norm_key_text(name) || '|' || coalesce(capacity_ml::text,'') k, count(*) cnt
    from public.milk_containers where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_meas from (
    select member_id::text || '|' || measure_date::text || '|' || coalesce(weight_g::text,'') || '|' || coalesce(height_cm::text,'') || '|' || coalesce(head_cm::text,'') k, count(*) cnt
    from public.health_measurements where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_vax from (
    select member_id::text || '|' || public.myb_norm_key_text(vaccine_name) || '|' || coalesce(dose_number::text,'') || '|' || coalesce(injection_date::text,'') k, count(*) cnt
    from public.vaccine_records where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_diary from (
    select coalesce(entry_date::text,'') || '|' || coalesce(time_from,'') || '|' || public.myb_norm_key_text(title) || '|' || left(md5(coalesce(note,'')),10) k, count(*) cnt
    from public.diary_entries where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;
  select coalesce(sum(cnt-1),0)::int into d_appt from (
    select coalesce(appointment_date::text,'') || '|' || coalesce(appointment_time,'') || '|' || public.myb_norm_key_text(title) || '|' || public.myb_norm_key_text(place) k, count(*) cnt
    from public.appointments where family_id = v_family_id and deleted_at is null group by 1 having count(*)>1
  ) s;

  v_ok := (d_legacy + d_health + d_care + d_milk + d_containers + d_meas + d_vax + d_diary + d_appt) = 0;
  return jsonb_build_object(
    'ok', v_ok,
    'status', case when v_ok then 'passed' else 'needs_recovery' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'legacy_counts_before', v_before,
    'legacy_counts_after_dedupe', v_after,
    'duplicate_summary', jsonb_build_object(
      'legacy_rows_can_remove', d_legacy,
      'health_members', d_health,
      'care_events', d_care,
      'milk_items', d_milk,
      'milk_containers', d_containers,
      'health_measurements', d_meas,
      'vaccine_records', d_vax,
      'diary_entries', d_diary,
      'appointments', d_appt
    ),
    'table_counts', public.myb_relational_table_counts(v_family_id),
    'recommendation', case when v_ok then 'Dữ liệu không còn double rõ ràng.' else 'Cần chạy Cứu dữ liệu V15.0.72: backup JSON hiện tại, dedupe JSON, reset relational và migrate lại từ JSON sạch.' end,
    'doctor_mode', 'fast_read_only_no_backfill_no_heavy_join'
  );
end;
$$;

grant execute on function public.myb_relational_fast_duplicate_doctor(text) to anon, authenticated;

create or replace function public.myb_rebuild_relational_from_deduped_legacy(p_sync_id text default 'main', p_write_clean_legacy boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_device_id uuid := public.myb_stable_uuid('device:data-rescue:v15.0.72:' || v_sync_id);
  v_op_id uuid := gen_random_uuid();
  v_original jsonb;
  v_clean jsonb;
  v_before jsonb;
  v_after jsonb;
  v_backup_id uuid;
  v_reset jsonb;
  v_migration jsonb;
  v_doctor jsonb;
begin
  perform pg_advisory_xact_lock(hashtext(v_family_id::text));

  select data into v_original from public.meyeube_sync where id = v_sync_id limit 1;
  if v_original is null then
    return jsonb_build_object('ok', false, 'status', 'missing_legacy_json', 'message', 'Không tìm thấy public.meyeube_sync.data để cứu dữ liệu.', 'sync_id', v_sync_id);
  end if;

  v_before := public.myb_dedupe_source_counts_v1572(v_original);
  v_clean := public.myb_dedupe_legacy_payload_v1572(v_original);
  v_after := public.myb_dedupe_source_counts_v1572(v_clean);

  insert into public.relational_recovery_backups(family_id, sync_id, backup_type, backup_data, before_counts, after_counts, result, created_at)
  values(v_family_id, v_sync_id, 'before_dedupe_rebuild_v15_0_72', v_original, v_before, v_after, jsonb_build_object('op_id', v_op_id), now())
  returning id into v_backup_id;

  if p_write_clean_legacy then
    update public.meyeube_sync
       set data = v_clean,
           updated_at = now()
     where id = v_sync_id;
  end if;

  v_reset := public.myb_soft_reset_relational_family_for_snapshot(v_family_id);
  v_migration := public.myb_migrate_json_to_relational(v_sync_id, false);
  begin
    perform public.myb_backfill_relational_legacy_ids(v_sync_id);
  exception when others then
    null;
  end;

  v_doctor := public.myb_relational_fast_duplicate_doctor(v_sync_id);

  update public.relational_recovery_backups
     set result = jsonb_build_object('reset', v_reset, 'migration', v_migration, 'doctor', v_doctor, 'write_clean_legacy', p_write_clean_legacy),
         after_counts = public.myb_dedupe_source_counts_v1572(coalesce((select data from public.meyeube_sync where id = v_sync_id),'{}'::jsonb))
   where id = v_backup_id;

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'relational_recovery_backups', v_backup_id, 'dedupe_rebuild', v_op_id, v_device_id, jsonb_build_object('before', v_before, 'after', v_after, 'doctor', v_doctor));

  return jsonb_build_object(
    'ok', coalesce((v_doctor->>'ok')::boolean,false),
    'status', case when coalesce((v_doctor->>'ok')::boolean,false) then 'recovered' else 'recovered_with_warnings' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'backup_id', v_backup_id,
    'before_counts', v_before,
    'after_counts', v_after,
    'reset_result', v_reset,
    'migration_result', v_migration,
    'doctor_after', v_doctor,
    'legacy_backup', 'Bản JSON trước khi sửa đã lưu trong relational_recovery_backups.backup_data.',
    'normal_app_write_mode', 'relational_rescue_dedupe_rebuild_v15_0_72'
  );
end;
$$;

grant execute on function public.myb_rebuild_relational_from_deduped_legacy(text, boolean) to anon, authenticated;

-- Replace the timeout-prone Milk Identity Doctor with the fast read-only doctor.
create or replace function public.myb_relational_milk_identity_doctor(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.myb_relational_fast_duplicate_doctor(p_sync_id) || jsonb_build_object('compat_name','myb_relational_milk_identity_doctor','version','15.0.72','note','V15.0.72 dùng fast doctor, không chạy backfill nặng để tránh statement timeout.');
end;
$$;

grant execute on function public.myb_relational_milk_identity_doctor(text) to anon, authenticated;

-- Patch snapshot write: always clean the app payload before it is copied to legacy JSON and relational tables.
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
  v_payload jsonb := public.myb_dedupe_legacy_payload_v1572(public.myb_json_object(p_payload));
  v_hash text := public.myb_payload_hash(public.myb_json_object(v_payload));
  v_counts jsonb := public.myb_migration_source_counts(public.myb_json_object(v_payload));
  v_original jsonb;
  v_backup_id uuid;
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
  values(v_device_id, v_family_id, coalesce(nullif(p_device_key,''),'Thiết bị'), 'pwa', 'web', '15.0.72', now(), now(), now(), null)
  on conflict (id) do update set last_seen_at = now(), app_version = '15.0.72', updated_at = now(), deleted_at = null;

  insert into public.relational_write_queue(family_id, sync_id, op_id, device_id, device_key, operation, reason, status, payload_hash, payload_counts, attempt_count, created_at, updated_at, deleted_at)
  values(v_family_id, v_sync_id, p_op_id, v_device_id, p_device_key, 'snapshot_apply_deduped', p_reason, 'processing', v_hash, v_counts, 1, now(), now(), null)
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

  select data into v_original from public.meyeube_sync where id = v_sync_id limit 1;
  if v_original is not null then
    insert into public.relational_recovery_backups(family_id, sync_id, backup_type, backup_data, before_counts, after_counts, result, created_at)
    values(v_family_id, v_sync_id, 'before_snapshot_write_v15_0_72', v_original, public.myb_dedupe_source_counts_v1572(v_original), public.myb_dedupe_source_counts_v1572(v_payload), jsonb_build_object('op_id', p_op_id, 'reason', p_reason), now())
    returning id into v_backup_id;
  end if;

  insert into public.meyeube_sync(id, data, updated_at)
  values(v_sync_id, v_payload, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();

  v_reset := public.myb_soft_reset_relational_family_for_snapshot(v_family_id);
  v_migration := public.myb_migrate_json_to_relational(v_sync_id, false);
  begin
    perform public.myb_backfill_relational_legacy_ids(v_sync_id);
  exception when others then
    null;
  end;

  update public.relational_write_queue
  set status = 'applied', applied_at = now(), server_result = jsonb_build_object('reset', v_reset, 'migration', v_migration, 'backup_id', v_backup_id, 'deduped', true), error = null, updated_at = now()
  where family_id = v_family_id and op_id = p_op_id;

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'relational_write_queue', coalesce(v_row_id, p_op_id), 'snapshot_apply_deduped', p_op_id, v_device_id, jsonb_build_object('reason', p_reason, 'payload_counts', v_counts, 'payload_hash', v_hash, 'backup_id', v_backup_id));

  return jsonb_build_object(
    'ok', true,
    'status', 'applied_deduped',
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'op_id', p_op_id,
    'device_id', v_device_id,
    'backup_id', v_backup_id,
    'payload_hash', v_hash,
    'payload_counts', v_counts,
    'reset_counts', v_reset,
    'migration_result', v_migration,
    'write_queue', public.myb_relational_write_queue_counts(v_family_id),
    'table_counts', public.myb_relational_table_counts(v_family_id),
    'legacy_backup', 'public.meyeube_sync đã được cập nhật bằng payload đã dedupe; bản trước đó nằm trong relational_recovery_backups.',
    'normal_app_write_mode', 'relational_write_queue_snapshot_apply_deduped_v15_0_72'
  );
exception when others then
  update public.relational_write_queue
  set status = 'failed', error = sqlerrm, updated_at = now()
  where family_id = v_family_id and op_id = p_op_id;
  return jsonb_build_object('ok', false, 'status', 'failed', 'sync_id', v_sync_id, 'family_id', v_family_id, 'op_id', p_op_id, 'message', sqlerrm);
end;
$$;

grant execute on function public.myb_apply_relational_payload_snapshot(text, uuid, text, jsonb, text) to anon, authenticated;

comment on function public.myb_rebuild_relational_from_deduped_legacy(text, boolean) is 'V15.0.72 emergency recovery: backup current legacy JSON, dedupe semantic duplicate arrays, reset relational rows, and migrate clean payload back into relational tables.';
comment on function public.myb_relational_fast_duplicate_doctor(text) is 'V15.0.72 fast read-only duplicate doctor that avoids timeout-prone backfill/heavy joins.';
