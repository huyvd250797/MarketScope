-- =============================================================
-- Mẹ Yêu Bé V15.0.69 · RelationalReadMode
-- Purpose:
--   Read-only relational payload exporter for testing relational tables before
--   switching normal writes away from legacy JSON. This does not mutate app data.
-- =============================================================

create extension if not exists pgcrypto;

create or replace function public.myb_milk_status_vi(p_status text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_status,''))
    when 'storing' then 'Đang bảo quản'
    when 'used_up' then 'Đã sử dụng hết'
    when 'discarded' then 'Đã bỏ'
    when 'expired' then 'Hết hạn'
    when 'transferred' then 'Đã chuyển hết'
    when 'deleted' then 'Đã xóa'
    else coalesce(nullif(p_status,''),'Đang bảo quản')
  end;
$$;

create or replace function public.myb_vaccine_status_vi(p_status text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_status,''))
    when 'done' then 'Đã tiêm'
    when 'upcoming' then 'Sắp tới'
    when 'overdue' then 'Quá hạn'
    when 'skipped' then 'Bỏ qua'
    when 'postponed' then 'Hoãn tiêm'
    when 'doctor' then 'Cần hỏi bác sĩ'
    else 'Chưa đến hạn'
  end;
$$;

create or replace function public.myb_relational_read_preflight(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_doctor jsonb;
  v_delta jsonb;
  v_ok boolean := false;
begin
  begin
    v_doctor := public.myb_relational_migration_doctor(v_sync_id);
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'sync_id', v_sync_id,
      'family_id', v_family_id,
      'message', 'Không gọi được Migration Doctor: ' || SQLERRM,
      'hint', 'Hãy chạy SUPABASE_SETUP.sql V15.0.69 trước.'
    );
  end;

  begin
    v_delta := public.myb_relational_delta_counts(v_sync_id);
  exception when others then
    return jsonb_build_object(
      'ok', false,
      'status', 'error',
      'sync_id', v_sync_id,
      'family_id', v_family_id,
      'doctor', v_doctor,
      'message', 'Không gọi được Delta Sync preview: ' || SQLERRM,
      'hint', 'Hãy chạy SUPABASE_SETUP.sql V15.0.69 trước.'
    );
  end;

  v_ok := coalesce(v_doctor->>'status','') = 'passed' and coalesce((v_delta->>'total_delta')::int,0) = 0;

  return jsonb_build_object(
    'ok', v_ok,
    'status', case when v_ok then 'ready' else 'blocked' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'doctor_status', v_doctor->>'status',
    'doctor_score', v_doctor#>>'{summary,score}',
    'delta_total', coalesce((v_delta->>'total_delta')::int,0),
    'doctor', v_doctor,
    'delta', v_delta,
    'recommendation', case when v_ok then 'Có thể bật RelationalReadMode.' else 'Chưa bật RelationalReadMode. Hãy chạy Delta Sync rồi Doctor lại đến khi 25/25.' end,
    'normal_app_write_mode', 'unchanged_legacy_json'
  );
end;
$$;

create or replace function public.myb_export_relational_legacy_payload(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_legacy jsonb := '{}'::jsonb;
  v_legacy_updated_at timestamptz;
  v_preflight jsonb;
  v_payload jsonb;
  v_settings jsonb;
  v_hb jsonb;
  v_members jsonb;
  v_health_book jsonb;
  v_child_member_id text;
  v_care_events jsonb;
  v_milk_items jsonb;
  v_milk_containers jsonb;
  v_appointments jsonb;
  v_diary jsonb;
  v_milestones jsonb;
  v_appt_types jsonb;
  v_diary_types jsonb;
  v_counts jsonb;
begin
  v_preflight := public.myb_relational_read_preflight(v_sync_id);
  if coalesce((v_preflight->>'ok')::boolean,false) is not true then
    return jsonb_build_object(
      'ok', false,
      'sync_id', v_sync_id,
      'family_id', v_family_id,
      'message', 'RelationalReadMode bị chặn vì Doctor/Delta chưa sạch.',
      'preflight', v_preflight,
      'normal_app_write_mode', 'unchanged_legacy_json'
    );
  end if;

  select data, updated_at into v_legacy, v_legacy_updated_at
  from public.meyeube_sync
  where id = v_sync_id
  limit 1;
  v_legacy := coalesce(v_legacy,'{}'::jsonb);

  select hm.id::text into v_child_member_id
  from public.health_members hm
  where hm.family_id = v_family_id and hm.deleted_at is null
  order by case when hm.relation = 'Con' then 0 when hm.relation = 'Mẹ' then 1 when hm.relation = 'Ba' then 2 else 9 end, hm.created_at
  limit 1;

  select coalesce(jsonb_agg(member_doc order by sort_order, created_at),'[]'::jsonb) into v_members
  from (
    select
      case when hm.relation = 'Con' then 0 when hm.relation = 'Mẹ' then 1 when hm.relation = 'Ba' then 2 else 9 end as sort_order,
      hm.created_at,
      (
        coalesce(hm.extra,'{}'::jsonb)
        || jsonb_strip_nulls(jsonb_build_object(
          'id', hm.id::text,
          'rel', hm.relation,
          'person', hm.relation,
          'name', hm.display_name,
          'displayName', hm.display_name,
          'fullName', hm.full_name,
          'gender', hm.gender,
          'dob', hm.dob::text,
          'blood', hm.blood_type,
          'height', hm.height_text,
          'weight', hm.weight_text,
          'phone', hm.phone,
          'email', hm.email,
          'medical', jsonb_strip_nulls(jsonb_build_object(
            'bhyt', hm.bhyt,
            'bhytExp', hm.bhyt_exp::text,
            'bhytPlace', hm.bhyt_place,
            'bhxh', hm.bhxh,
            'hospital', hm.hospital,
            'doctor', hm.doctor,
            'emergency', hm.emergency_contact
          )),
          'status', jsonb_strip_nulls(jsonb_build_object('txt', hm.status_text, 'tone', hm.status_tone)),
          'other', jsonb_strip_nulls(jsonb_build_object('notes', hm.notes)),
          'meas', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', m.id::text,
              'date', m.measure_date::text,
              'weight', case when m.weight_g is not null then trim(to_char(round(m.weight_g / 1000.0, 3), 'FM999999990.999')) || ' kg' else null end,
              'height', case when m.height_cm is not null then trim(to_char(m.height_cm, 'FM999999990.##')) || ' cm' else null end,
              'head', case when m.head_cm is not null then trim(to_char(m.head_cm, 'FM999999990.##')) || ' cm' else null end,
              'note', m.note,
              'createdAt', m.created_at,
              'updatedAt', m.updated_at
            )) order by m.measure_date, m.created_at)
            from public.health_measurements m
            where m.member_id = hm.id and m.family_id = v_family_id and m.deleted_at is null
          ), '[]'::jsonb),
          'visits', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', v.id::text,
              'date', v.visit_date::text,
              'time', v.visit_time,
              'hospital', v.hospital,
              'doctor', v.doctor,
              'symptom', v.symptom,
              'diagnosis', v.diagnosis,
              'treatment', v.treatment,
              'medicine', v.medicine_note,
              'cost', v.cost,
              'note', v.note,
              'createdAt', v.created_at,
              'updatedAt', v.updated_at
            )) order by v.visit_date, v.created_at)
            from public.health_visits v
            where v.member_id = hm.id and v.family_id = v_family_id and v.deleted_at is null
          ), '[]'::jsonb),
          'meds', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', md.id::text,
              'name', md.name,
              'dose', md.dose,
              'from', md.from_date::text,
              'to', md.to_date::text,
              'active', md.active,
              'remind', md.remind,
              'note', md.note,
              'createdAt', md.created_at,
              'updatedAt', md.updated_at
            )) order by md.created_at)
            from public.health_medications md
            where md.member_id = hm.id and md.family_id = v_family_id and md.deleted_at is null
          ), '[]'::jsonb),
          'labs', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', lb.id::text,
              'date', lb.lab_date::text,
              'title', lb.title,
              'place', lb.place,
              'result', lb.result_summary,
              'note', lb.note,
              'createdAt', lb.created_at,
              'updatedAt', lb.updated_at
            )) order by lb.lab_date, lb.created_at)
            from public.health_labs lb
            where lb.member_id = hm.id and lb.family_id = v_family_id and lb.deleted_at is null
          ), '[]'::jsonb),
          'allergies', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', al.id::text,
              'type', al.allergy_type,
              'name', al.name,
              'reaction', al.reaction,
              'severity', al.severity,
              'note', al.note,
              'createdAt', al.created_at,
              'updatedAt', al.updated_at
            )) order by al.created_at)
            from public.health_allergies al
            where al.member_id = hm.id and al.family_id = v_family_id and al.deleted_at is null
          ), '[]'::jsonb),
          'vaccines', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', vr.id::text,
              'planId', vr.plan_id::text,
              'vaccineId', vr.vaccine_id::text,
              'name', coalesce(vr.vaccine_name, vc.name),
              'vaccine', coalesce(vr.vaccine_name, vc.name),
              'dose', case when vr.dose_number is not null then 'Mũi ' || vr.dose_number::text else null end,
              'doseNumber', vr.dose_number,
              'date', vr.injection_date::text,
              'time', vr.injection_time,
              'place', vr.place,
              'manufacturer', coalesce(vr.manufacturer, vc.manufacturer),
              'lotNumber', vr.lot_number,
              'reaction', vr.reaction,
              'reactionLevel', vr.reaction_level,
              'status', 'Đã tiêm',
              'note', vr.note,
              'createdAt', vr.created_at,
              'updatedAt', vr.updated_at
            )) order by vr.injection_date, vr.created_at)
            from public.vaccine_records vr
            left join public.vaccine_catalog vc on vc.id = vr.vaccine_id
            where vr.member_id = hm.id and vr.family_id = v_family_id and vr.deleted_at is null
          ), '[]'::jsonb),
          'createdAt', hm.created_at,
          'updatedAt', hm.updated_at
        ))
      ) as member_doc
    from public.health_members hm
    where hm.family_id = v_family_id and hm.deleted_at is null
  ) s;

  v_hb := jsonb_build_object(
    'members', v_members,
    'activeId', coalesce(v_child_member_id, v_members#>>'{0,id}'),
    'relationalReadMode', true,
    'relationalReadAt', now()
  );
  v_health_book := v_members;

  select coalesce(jsonb_agg(care_doc order by event_date nulls last, time_from nulls last, created_at),'[]'::jsonb) into v_care_events
  from (
    select
      ce.event_date,
      ce.time_from,
      ce.created_at,
      (
        coalesce(ce.extra,'{}'::jsonb)
        || jsonb_strip_nulls(jsonb_build_object(
          'id', ce.id::text,
          'memberId', ce.member_id::text,
          'type', ce.type,
          'date', ce.event_date::text,
          'startDate', ce.event_date::text,
          'timeFrom', ce.time_from,
          'timeTo', ce.time_to,
          'amount', ce.amount,
          'unit', ce.unit,
          'source', ce.source,
          'status', ce.status,
          'note', ce.note,
          'milkSources', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'id', fms.milk_item_id::text,
              'bagId', fms.milk_item_id::text,
              'milkItemId', fms.milk_item_id::text,
              'usedMl', fms.used_ml,
              'discardMl', fms.discard_ml,
              'remainderAction', fms.remainder_action,
              'orderIndex', fms.order_index,
              'createdAt', fms.created_at,
              'updatedAt', fms.updated_at
            )) order by fms.order_index, fms.created_at)
            from public.feed_events fe
            join public.feed_milk_sources fms on fms.feed_event_id = fe.id and fms.deleted_at is null
            where fe.care_event_id = ce.id and fe.deleted_at is null
          ), ce.extra->'milkSources'),
          'createdAt', ce.created_at,
          'updatedAt', ce.updated_at
        ))
      ) as care_doc
    from public.care_events ce
    where ce.family_id = v_family_id and ce.deleted_at is null
  ) s;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', mi.id::text,
    'shortCode', mi.short_code,
    'bagCode', mi.short_code,
    'code', mi.short_code,
    'containerId', mi.container_id::text,
    'containerKind', mi.container_kind,
    'containerName', mi.container_name,
    'storage', mi.storage,
    'amount', mi.amount_ml,
    'amountMl', mi.amount_ml,
    'remaining', mb.remaining_ml,
    'remainingMl', mb.remaining_ml,
    'expireAt', mi.expire_at,
    'expireDateTime', mi.expire_at,
    'status', public.myb_milk_status_vi(mb.computed_status),
    'note', mi.note,
    'pumpEventId', mi.pump_event_id::text,
    'createdAt', mi.created_at,
    'updatedAt', mi.updated_at
  )) order by mi.created_at, mi.id),'[]'::jsonb) into v_milk_items
  from public.milk_items mi
  left join public.milk_item_balances mb on mb.milk_item_id = mi.id
  where mi.family_id = v_family_id and mi.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', mc.id::text,
    'name', mc.name,
    'kind', mc.kind,
    'color', mc.color,
    'capacityMl', mc.capacity_ml,
    'active', mc.active,
    'sortOrder', mc.sort_order,
    'createdAt', mc.created_at,
    'updatedAt', mc.updated_at
  )) order by mc.sort_order, mc.created_at),'[]'::jsonb) into v_milk_containers
  from public.milk_containers mc
  where mc.family_id = v_family_id and mc.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', ap.id::text,
    'memberId', ap.member_id::text,
    'title', ap.title,
    'type', ap.title,
    'date', ap.appointment_date::text,
    'time', ap.appointment_time,
    'timeFrom', ap.appointment_time,
    'place', ap.place,
    'doctor', ap.doctor,
    'note', ap.note,
    'status', ap.status,
    'createdAt', ap.created_at,
    'updatedAt', ap.updated_at
  )) order by ap.appointment_date, ap.appointment_time, ap.created_at),'[]'::jsonb) into v_appointments
  from public.appointments ap
  where ap.family_id = v_family_id and ap.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', de.id::text,
    'memberId', de.member_id::text,
    'date', de.entry_date::text,
    'time', concat_ws('-', nullif(de.time_from,''), nullif(de.time_to,'')),
    'category', de.category,
    'title', de.title,
    'note', de.note,
    'createdAt', de.created_at,
    'updatedAt', de.updated_at
  )) order by de.entry_date, de.time_from, de.created_at),'[]'::jsonb) into v_diary
  from public.diary_entries de
  where de.family_id = v_family_id and de.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', ms.id::text,
    'memberId', ms.member_id::text,
    'date', ms.milestone_date::text,
    'title', ms.title,
    'type', ms.type,
    'category', ms.type,
    'note', ms.note,
    'auto', ms.auto,
    'createdAt', ms.created_at,
    'updatedAt', ms.updated_at
  )) order by ms.milestone_date, ms.created_at),'[]'::jsonb) into v_milestones
  from public.milestones ms
  where ms.family_id = v_family_id and ms.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', cc.id::text,
    'name', cc.name,
    'icon', cc.icon,
    'color', cc.color,
    'active', cc.active,
    'createdAt', cc.created_at,
    'updatedAt', cc.updated_at
  )) order by cc.sort_order, cc.created_at),'[]'::jsonb) into v_appt_types
  from public.care_categories cc
  where cc.family_id = v_family_id and cc.category_type = 'appointment_type' and cc.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', cc.id::text,
    'name', cc.name,
    'icon', cc.icon,
    'color', cc.color,
    'active', cc.active,
    'createdAt', cc.created_at,
    'updatedAt', cc.updated_at
  )) order by cc.sort_order, cc.created_at),'[]'::jsonb) into v_diary_types
  from public.care_categories cc
  where cc.family_id = v_family_id and cc.category_type = 'diary_type' and cc.deleted_at is null;

  select (
    coalesce(v_legacy->'settings','{}'::jsonb)
    || jsonb_strip_nulls(jsonb_build_object(
      'babyName', aps.baby_nickname,
      'officialName', aps.baby_official_name,
      'babySex', aps.baby_sex,
      'birthDate', aps.birth_date::text,
      'birthTime', aps.birth_time,
      'birthHospital', aps.birth_hospital,
      'theme', aps.theme_mode,
      'themeMode', aps.theme_mode,
      'dashboardConfig', aps.dashboard_config,
      'relationalReadMode', true
    ))
  ) into v_settings
  from public.app_settings aps
  where aps.family_id = v_family_id and aps.deleted_at is null
  limit 1;
  v_settings := coalesce(v_settings, coalesce(v_legacy->'settings','{}'::jsonb));

  v_payload := v_legacy;
  v_payload := jsonb_set(v_payload, '{settings}', coalesce(v_settings,'{}'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{hb}', coalesce(v_hb,jsonb_build_object('members','[]'::jsonb)), true);
  v_payload := jsonb_set(v_payload, '{healthBook}', coalesce(v_health_book,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{careEvents}', coalesce(v_care_events,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{milkInventory}', coalesce(v_milk_items,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{milkContainers}', coalesce(v_milk_containers,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{appointments}', coalesce(v_appointments,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{diary}', coalesce(v_diary,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{milestones}', coalesce(v_milestones,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{appointmentTypes}', coalesce(v_appt_types,'[]'::jsonb), true);
  v_payload := jsonb_set(v_payload, '{diaryTypes}', coalesce(v_diary_types,'[]'::jsonb), true);
  v_payload := v_payload || jsonb_build_object(
    '_relationalReadMode', true,
    '_relationalReadAt', now(),
    '_relationalReadVersion', '15.0.69',
    '_relationalFamilyId', v_family_id,
    '_legacyUpdatedAtAtRead', v_legacy_updated_at
  );

  v_counts := public.myb_relational_table_counts(v_family_id);

  return jsonb_build_object(
    'ok', true,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'payload', v_payload,
    'counts', v_counts,
    'source', 'relational_tables_with_legacy_unmigrated_fallback',
    'preflight', v_preflight,
    'legacy_backup', 'public.meyeube_sync vẫn được giữ nguyên, không xóa JSON cũ.',
    'normal_app_write_mode', 'unchanged_legacy_json'
  );
end;
$$;

grant execute on function public.myb_milk_status_vi(text) to anon, authenticated;
grant execute on function public.myb_vaccine_status_vi(text) to anon, authenticated;
grant execute on function public.myb_relational_read_preflight(text) to anon, authenticated;
grant execute on function public.myb_export_relational_legacy_payload(text) to anon, authenticated;

comment on function public.myb_relational_read_preflight(text) is 'V15.0.69 checks Doctor + Delta before allowing RelationalReadMode.';
comment on function public.myb_export_relational_legacy_payload(text) is 'V15.0.69 exports an app-compatible payload from relational tables. It does not change normal write mode.';
