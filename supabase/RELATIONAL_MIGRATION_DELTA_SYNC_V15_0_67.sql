
-- =============================================================
-- V15.0.69 · RelationalReadMode
-- Delta tool: compares current legacy JSON with relational tables after migration.
-- The run RPC is duplicate-safe: stable row IDs + ON CONFLICT upsert.
-- Normal app save/read flow is NOT switched in this version.
-- =============================================================

create or replace function public.myb_relational_delta_counts(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_data jsonb;
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  missing_care int := 0; missing_milk_items int := 0; missing_milk_containers int := 0; missing_diary int := 0; missing_milestones int := 0; missing_appointments int := 0; missing_members int := 0; missing_vaccines int := 0; missing_measurements int := 0;
  changed_care int := 0;
  source_counts jsonb;
  target_counts jsonb;
begin
  select data into v_data from public.meyeube_sync where id = v_sync_id limit 1;
  if v_data is null then
    return jsonb_build_object('ok', false, 'sync_id', v_sync_id, 'message', 'Không tìm thấy legacy JSON trong public.meyeube_sync.id = ' || v_sync_id);
  end if;

  select count(*) into missing_care
  from (
    select public.myb_stable_uuid('care_event:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'createdAt', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'careEvents')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.care_events t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into changed_care
  from jsonb_array_elements(public.myb_json_array(v_data->'careEvents')) with ordinality as e(value, ordinality)
  join public.care_events t on t.family_id = v_family_id and t.id = public.myb_stable_uuid('care_event:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'createdAt', e.ordinality::text))
  where public.myb_safe_timestamptz(e.value->>'updatedAt') is not null
    and public.myb_safe_timestamptz(e.value->>'updatedAt') > coalesce(t.updated_at, '1900-01-01'::timestamptz) + interval '1 second';

  select count(*) into missing_milk_items
  from (
    select public.myb_stable_uuid('milk_item:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'key', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'milkInventory')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.milk_items t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_milk_containers
  from (
    select public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'name', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'milkContainers')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.milk_containers t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_diary
  from (
    select public.myb_stable_uuid('diary:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'createdAt', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'diary')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.diary_entries t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_milestones
  from (
    select public.myb_stable_uuid('milestone:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'createdAt', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'milestones')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.milestones t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_appointments
  from (
    select public.myb_stable_uuid('appointment:' || v_sync_id || ':' || coalesce(e.value->>'id', e.value->>'date', e.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data->'appointments')) with ordinality as e(value, ordinality)
  ) s
  where not exists(select 1 from public.appointments t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_members
  from (
    select public.myb_stable_uuid('health_member:' || v_sync_id || ':hb:' || coalesce(nullif(m.value->>'id',''), public.myb_relation_norm(coalesce(m.value->>'rel', m.value->>'person')) || ':' || coalesce(nullif(coalesce(m.value->>'name', m.value->>'displayName', m.value->>'fullName'), ''),'') || ':' || m.ordinality::text)) id
    from jsonb_array_elements(public.myb_json_array(v_data#>'{hb,members}')) with ordinality as m(value, ordinality)
  ) s
  where not exists(select 1 from public.health_members t where t.family_id = v_family_id and t.id = s.id and t.deleted_at is null);

  select count(*) into missing_measurements
  from jsonb_array_elements(public.myb_json_array(v_data#>'{hb,members}')) with ordinality as m(value, m_ord)
  cross join lateral jsonb_array_elements(public.myb_json_array(m.value->'meas')) with ordinality as meas(value, meas_ord)
  where not exists(
    select 1 from public.health_measurements hm
    where hm.family_id = v_family_id
      and hm.id = public.myb_stable_uuid('measurement:' || public.myb_stable_uuid('health_member:' || v_sync_id || ':hb:' || coalesce(nullif(m.value->>'id',''), public.myb_relation_norm(coalesce(m.value->>'rel', m.value->>'person')) || ':' || coalesce(nullif(coalesce(m.value->>'name', m.value->>'displayName', m.value->>'fullName'), ''),'') || ':' || m.m_ord::text)) || ':' || coalesce(meas.value->>'id', meas.value->>'date', meas.meas_ord::text))
      and hm.deleted_at is null
  );

  select count(*) into missing_vaccines
  from jsonb_array_elements(public.myb_json_array(v_data#>'{hb,members}')) with ordinality as m(value, m_ord)
  cross join lateral jsonb_array_elements(public.myb_json_array(m.value->'vaccines')) with ordinality as vx(value, vx_ord)
  where coalesce(nullif(coalesce(vx.value->>'name', vx.value->>'vaccine'),''),'') <> ''
    and not exists(
      select 1 from public.vaccine_records vr
      where vr.family_id = v_family_id
        and vr.id = public.myb_stable_uuid('vaccine_record:' || public.myb_stable_uuid('health_member:' || v_sync_id || ':hb:' || coalesce(nullif(m.value->>'id',''), public.myb_relation_norm(coalesce(m.value->>'rel', m.value->>'person')) || ':' || coalesce(nullif(coalesce(m.value->>'name', m.value->>'displayName', m.value->>'fullName'), ''),'') || ':' || m.m_ord::text)) || ':' || coalesce(vx.value->>'id', coalesce(vx.value->>'name', vx.value->>'vaccine') || ':' || coalesce(vx.value->>'dose','') || ':' || vx.vx_ord::text))
        and vr.deleted_at is null
    );

  source_counts := public.myb_migration_source_counts(v_data);
  target_counts := public.myb_relational_table_counts(v_family_id);

  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'source_counts', source_counts,
    'target_counts', target_counts,
    'missing_counts', jsonb_build_object(
      'health_members', missing_members,
      'health_measurements', missing_measurements,
      'care_events', missing_care,
      'milk_items', missing_milk_items,
      'milk_containers', missing_milk_containers,
      'diary_entries', missing_diary,
      'milestones', missing_milestones,
      'appointments', missing_appointments,
      'vaccine_records', missing_vaccines
    ),
    'changed_counts', jsonb_build_object('care_events', changed_care),
    'total_delta', missing_members + missing_measurements + missing_care + missing_milk_items + missing_milk_containers + missing_diary + missing_milestones + missing_appointments + missing_vaccines + changed_care,
    'strategy', 'stable_id_delta_preview'
  );
end;
$$;

create or replace function public.myb_preview_relational_delta_sync(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res jsonb;
begin
  v_res := public.myb_relational_delta_counts(p_sync_id);
  if coalesce((v_res->>'ok')::boolean,false) is false then
    return v_res;
  end if;
  return v_res || jsonb_build_object(
    'preview_only', true,
    'should_run_delta', coalesce((v_res->>'total_delta')::int,0) > 0,
    'note', 'Preview chỉ đọc dữ liệu. Nếu total_delta > 0, bấm Delta Sync để đồng bộ phần JSON legacy phát sinh sau migration.'
  );
end;
$$;

create or replace function public.myb_sync_json_to_relational_delta(p_sync_id text default 'main', p_preview_only boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_before jsonb;
  v_after jsonb;
  v_migration jsonb;
  v_doctor jsonb;
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_op_id uuid := public.myb_stable_uuid('delta-op:v15.0.69:' || coalesce(nullif(p_sync_id,''),'main') || ':' || extract(epoch from now())::text);
  v_device_id uuid := public.myb_stable_uuid('device:migration:v15.0.69:' || coalesce(nullif(p_sync_id,''),'main'));
begin
  v_before := public.myb_relational_delta_counts(v_sync_id);
  if p_preview_only then
    return v_before || jsonb_build_object('preview_only', true, 'should_run_delta', coalesce((v_before->>'total_delta')::int,0) > 0);
  end if;

  if coalesce((v_before->>'ok')::boolean,false) is false then
    return v_before;
  end if;

  if coalesce((v_before->>'total_delta')::int,0) = 0 then
    return v_before || jsonb_build_object(
      'ok', true,
      'status', 'no_delta',
      'message', 'Không có dữ liệu legacy mới cần đồng bộ sang relational tables.',
      'target_counts_after', public.myb_relational_table_counts(v_family_id)
    );
  end if;

  -- Use the already-created idempotent migration writer. It uses stable IDs and ON CONFLICT,
  -- so old rows are not duplicated while new/changed legacy records are synchronized safely.
  v_migration := public.myb_migrate_json_to_relational(v_sync_id, false);
  v_after := public.myb_relational_delta_counts(v_sync_id);

  insert into public.change_logs(family_id, table_name, row_id, operation, op_id, device_id, payload)
  values(v_family_id, 'migration_batches', public.myb_stable_uuid('delta-sync:v15.0.69:' || v_sync_id), 'json_to_relational_delta_sync', v_op_id, v_device_id, jsonb_build_object('version','15.0.69','sync_id',v_sync_id,'before',v_before,'after',v_after))
  on conflict do nothing;

  begin
    v_doctor := public.myb_relational_migration_doctor(v_sync_id);
  exception when others then
    v_doctor := jsonb_build_object('ok', false, 'message', 'Delta đã chạy nhưng chưa gọi được Doctor: ' || SQLERRM);
  end;

  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'delta_mode', 'stable_id_idempotent_upsert_no_duplicate',
    'before_delta', v_before,
    'migration_result', v_migration,
    'after_delta', v_after,
    'doctor_after_delta', v_doctor,
    'normal_app_write_mode', 'unchanged_legacy_json',
    'legacy_backup', 'public.meyeube_sync vẫn được giữ nguyên, không xóa JSON cũ.'
  );
end;
$$;

grant execute on function public.myb_relational_delta_counts(text) to anon, authenticated;
grant execute on function public.myb_preview_relational_delta_sync(text) to anon, authenticated;
grant execute on function public.myb_sync_json_to_relational_delta(text, boolean) to anon, authenticated;

comment on function public.myb_relational_delta_counts(text) is 'V15.0.69 preview delta counts between current legacy JSON and relational tables.';
comment on function public.myb_preview_relational_delta_sync(text) is 'V15.0.69 read-only preview for JSON-to-relational delta sync.';
comment on function public.myb_sync_json_to_relational_delta(text, boolean) is 'V15.0.69 duplicate-safe delta sync from legacy JSON to relational tables. Does not switch normal app read/write mode.';
