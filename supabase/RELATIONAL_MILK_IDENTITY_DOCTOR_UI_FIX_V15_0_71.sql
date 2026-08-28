-- =============================================================
-- Mẹ Yêu Bé V15.0.71 · MilkIdentityDoctorUIFix
-- Purpose:
--   Stabilize legacy IDs across relational read/write mode and repair milk
--   container kind mapping so legacy JSON merge cannot double records.
-- =============================================================

create extension if not exists pgcrypto;

alter table public.care_events add column if not exists legacy_id text;
alter table public.milk_items add column if not exists legacy_id text;
alter table public.milk_containers add column if not exists legacy_id text;

create index if not exists idx_care_events_family_legacy_id on public.care_events(family_id, legacy_id) where deleted_at is null and legacy_id is not null;
create index if not exists idx_milk_items_family_legacy_id on public.milk_items(family_id, legacy_id) where deleted_at is null and legacy_id is not null;
create index if not exists idx_milk_containers_family_legacy_id on public.milk_containers(family_id, legacy_id) where deleted_at is null and legacy_id is not null;

create or replace function public.myb_norm_milk_container_kind(p_kind text, p_name text default null)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(p_kind,'')) in ('tui','túi','bag','milk_bag','milkbag') then 'tui'
    when lower(coalesce(p_kind,'')) in ('binh','bình','bottle','milk_bottle','milkbottle') then 'binh'
    when lower(coalesce(p_name,'')) like '%túi%' or lower(coalesce(p_name,'')) like '%tui%' or lower(coalesce(p_name,'')) like '%bag%' then 'tui'
    else 'binh'
  end;
$$;

create or replace function public.myb_backfill_relational_legacy_ids(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_data jsonb := '{}'::jsonb;
  v_item jsonb;
  v_row record;
  v_key text;
  v_id uuid;
  v_raw_container text;
  v_container_id uuid;
  c_care int := 0;
  c_milk int := 0;
  c_container int := 0;
  v_rc int := 0;
begin
  select data into v_data from public.meyeube_sync where id = v_sync_id limit 1;
  v_data := coalesce(v_data,'{}'::jsonb);

  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'careEvents')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_key := coalesce(nullif(v_item->>'id',''), nullif(v_item->>'createdAt',''), v_row.ordinality::text);
    v_id := public.myb_stable_uuid('care_event:' || v_sync_id || ':' || v_key);
    update public.care_events
       set legacy_id = v_key,
           updated_at = greatest(coalesce(updated_at, now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), updated_at, now()))
     where family_id = v_family_id and id = v_id;
    get diagnostics v_rc = row_count; c_care := c_care + v_rc;
  end loop;

  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'milkContainers')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_key := coalesce(nullif(v_item->>'id',''), nullif(v_item->>'name',''), v_row.ordinality::text);
    v_id := public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || v_key);
    update public.milk_containers
       set legacy_id = v_key,
           kind = public.myb_norm_milk_container_kind(coalesce(nullif(v_item->>'kind',''), kind), coalesce(nullif(v_item->>'name',''), name)),
           name = coalesce(nullif(v_item->>'name',''), name),
           updated_at = greatest(coalesce(updated_at, now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), updated_at, now()))
     where family_id = v_family_id and id = v_id;
    get diagnostics v_rc = row_count; c_container := c_container + v_rc;
  end loop;

  for v_row in select value, ordinality from jsonb_array_elements(public.myb_json_array(v_data->'milkInventory')) with ordinality loop
    v_item := public.myb_json_object(v_row.value);
    v_key := coalesce(nullif(v_item->>'id',''), nullif(v_item->>'bagCode',''), nullif(v_item->>'shortCode',''), v_row.ordinality::text);
    v_id := public.myb_stable_uuid('milk_item:' || v_sync_id || ':' || v_key);
    v_raw_container := nullif(v_item->>'containerId','');
    v_container_id := null;
    if v_raw_container is not null then
      begin
        v_container_id := v_raw_container::uuid;
        if not exists(select 1 from public.milk_containers where family_id = v_family_id and id = v_container_id) then
          v_container_id := null;
        end if;
      exception when others then
        v_container_id := null;
      end;
      if v_container_id is null then
        select id into v_container_id
        from public.milk_containers
        where family_id = v_family_id and deleted_at is null and (legacy_id = v_raw_container or name = nullif(v_item->>'containerName',''))
        order by case when legacy_id = v_raw_container then 0 else 1 end, created_at
        limit 1;
      end if;
      if v_container_id is null then
        v_container_id := public.myb_stable_uuid('milk_container:' || v_sync_id || ':' || v_raw_container);
      end if;
    end if;

    update public.milk_items mi
       set legacy_id = v_key,
           short_code = coalesce(nullif(v_item->>'shortCode',''), nullif(v_item->>'bagCode',''), nullif(v_item->>'code',''), short_code),
           container_id = coalesce(v_container_id, container_id),
           container_kind = public.myb_norm_milk_container_kind(coalesce(nullif(v_item->>'containerKind',''), container_kind), coalesce(nullif(v_item->>'containerName',''), container_name)),
           container_name = coalesce(nullif(v_item->>'containerName',''), container_name),
           updated_at = greatest(coalesce(updated_at, now()), coalesce(public.myb_safe_timestamptz(v_item->>'updatedAt'), updated_at, now()))
     where mi.family_id = v_family_id and mi.id = v_id;
    get diagnostics v_rc = row_count; c_milk := c_milk + v_rc;
  end loop;

  -- Fill missing kind/name from the catalog as a final repair pass.
  update public.milk_items mi
     set container_kind = public.myb_norm_milk_container_kind(coalesce(mi.container_kind, mc.kind), coalesce(mi.container_name, mc.name)),
         container_name = coalesce(mi.container_name, mc.name)
    from public.milk_containers mc
   where mi.family_id = v_family_id and mi.container_id = mc.id and mi.deleted_at is null;

  return jsonb_build_object('ok', true, 'sync_id', v_sync_id, 'family_id', v_family_id, 'care_events_backfilled', c_care, 'milk_items_backfilled', c_milk, 'milk_containers_backfilled', c_container);
end;
$$;

grant execute on function public.myb_norm_milk_container_kind(text, text) to anon, authenticated;
grant execute on function public.myb_backfill_relational_legacy_ids(text) to anon, authenticated;

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

  -- V15.0.71: backfill legacy IDs before exporting so app sees stable IDs, not relational UUIDs.
  perform public.myb_backfill_relational_legacy_ids(v_sync_id);

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
          'id', coalesce(nullif(ce.legacy_id,''), ce.extra->>'id', ce.id::text),
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
              'id', coalesce(nullif(mi_src.legacy_id,''), mi_src.short_code, fms.milk_item_id::text),
              'bagId', coalesce(nullif(mi_src.legacy_id,''), mi_src.short_code, fms.milk_item_id::text),
              'milkItemId', coalesce(nullif(mi_src.legacy_id,''), mi_src.short_code, fms.milk_item_id::text),
              'usedMl', fms.used_ml,
              'discardMl', fms.discard_ml,
              'remainderAction', fms.remainder_action,
              'orderIndex', fms.order_index,
              'createdAt', fms.created_at,
              'updatedAt', fms.updated_at
            )) order by fms.order_index, fms.created_at)
            from public.feed_events fe
            join public.feed_milk_sources fms on fms.feed_event_id = fe.id and fms.deleted_at is null
            left join public.milk_items mi_src on mi_src.id = fms.milk_item_id
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
    'id', coalesce(nullif(mi.legacy_id,''), mi.short_code, mi.id::text),
    'shortId', coalesce(nullif(mi.legacy_id,''), mi.short_code, mi.id::text),
    'shortCode', coalesce(mi.short_code, nullif(mi.legacy_id,''), mi.id::text),
    'bagCode', coalesce(mi.short_code, nullif(mi.legacy_id,''), mi.id::text),
    'code', coalesce(mi.short_code, nullif(mi.legacy_id,''), mi.id::text),
    'containerId', coalesce(nullif(mc_item.legacy_id,''), mi.container_id::text),
    'containerKind', public.myb_norm_milk_container_kind(coalesce(mi.container_kind, mc_item.kind), coalesce(mi.container_name, mc_item.name)),
    'containerName', coalesce(mi.container_name, mc_item.name),
    'storage', mi.storage,
    'amount', mi.amount_ml,
    'amountMl', mi.amount_ml,
    'remaining', mb.remaining_ml,
    'remainingMl', mb.remaining_ml,
    'expireAt', mi.expire_at,
    'expireDateTime', mi.expire_at,
    'status', public.myb_milk_status_vi(mb.computed_status),
    'note', mi.note,
    'pumpEventId', coalesce(nullif(ce_pump.legacy_id,''), ce_pump.extra->>'id', mi.pump_event_id::text),
    'createdAt', mi.created_at,
    'updatedAt', mi.updated_at
  )) order by mi.created_at, mi.id),'[]'::jsonb) into v_milk_items
  from public.milk_items mi
  left join public.milk_item_balances mb on mb.milk_item_id = mi.id
  left join public.milk_containers mc_item on mc_item.id = mi.container_id
  left join public.care_events ce_pump on ce_pump.id = mi.pump_event_id
  where mi.family_id = v_family_id and mi.deleted_at is null;

  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', coalesce(nullif(mc.legacy_id,''), mc.id::text),
    'name', mc.name,
    'kind', public.myb_norm_milk_container_kind(mc.kind, mc.name),
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
    '_relationalReadVersion', '15.0.71',
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



create or replace function public.myb_relational_milk_identity_doctor(p_sync_id text default 'main')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id text := coalesce(nullif(p_sync_id,''),'main');
  v_family_id uuid := public.myb_stable_uuid('family:' || coalesce(nullif(p_sync_id,''),'main'));
  v_backfill jsonb;
  v_duplicate_milk int := 0;
  v_duplicate_care int := 0;
  v_bad_kind int := 0;
  v_missing_container int := 0;
  v_uuid_like_export_risk int := 0;
  v_ok boolean;
begin
  v_backfill := public.myb_backfill_relational_legacy_ids(v_sync_id);

  select coalesce(sum(cnt - 1),0)::int into v_duplicate_milk
  from (
    select coalesce(nullif(legacy_id,''), short_code, pump_event_id::text, id::text) as k, count(*) cnt
    from public.milk_items
    where family_id = v_family_id and deleted_at is null
    group by 1
    having count(*) > 1
  ) s;

  select coalesce(sum(cnt - 1),0)::int into v_duplicate_care
  from (
    select coalesce(nullif(legacy_id,''), extra->>'id', id::text) as k, count(*) cnt
    from public.care_events
    where family_id = v_family_id and deleted_at is null
    group by 1
    having count(*) > 1
  ) s;

  select count(*)::int into v_bad_kind
  from public.milk_containers
  where family_id = v_family_id and deleted_at is null and public.myb_norm_milk_container_kind(kind, name) not in ('binh','tui');

  select count(*)::int into v_missing_container
  from public.milk_items mi
  where mi.family_id = v_family_id and mi.deleted_at is null and mi.container_id is not null
    and not exists(select 1 from public.milk_containers mc where mc.id = mi.container_id and mc.family_id = v_family_id and mc.deleted_at is null);

  select count(*)::int into v_uuid_like_export_risk
  from public.milk_items
  where family_id = v_family_id and deleted_at is null and nullif(legacy_id,'') is null and nullif(short_code,'') is null;

  v_ok := v_duplicate_milk = 0 and v_duplicate_care = 0 and v_bad_kind = 0 and v_missing_container = 0 and v_uuid_like_export_risk = 0;

  return jsonb_build_object(
    'ok', v_ok,
    'status', case when v_ok then 'passed' else 'warning' end,
    'sync_id', v_sync_id,
    'family_id', v_family_id,
    'backfill', v_backfill,
    'checks', jsonb_build_array(
      jsonb_build_object('id','duplicate_milk_items','status',case when v_duplicate_milk=0 then 'ok' else 'error' end,'actual',v_duplicate_milk,'expected',0,'message',case when v_duplicate_milk=0 then 'Không có milk_items trùng theo legacy id/short code.' else 'Có milk_items trùng, cần gộp trước khi chốt production.' end),
      jsonb_build_object('id','duplicate_care_events','status',case when v_duplicate_care=0 then 'ok' else 'error' end,'actual',v_duplicate_care,'expected',0,'message',case when v_duplicate_care=0 then 'Không có care_events trùng theo legacy id.' else 'Có care_events trùng, cần gộp trước khi chốt production.' end),
      jsonb_build_object('id','bad_container_kind','status',case when v_bad_kind=0 then 'ok' else 'error' end,'actual',v_bad_kind,'expected',0,'message','Kind bình/túi phải chuẩn hóa về binh/tui.'),
      jsonb_build_object('id','missing_container_link','status',case when v_missing_container=0 then 'ok' else 'error' end,'actual',v_missing_container,'expected',0,'message','Milk item phải trỏ đúng container catalog.'),
      jsonb_build_object('id','uuid_like_export_risk','status',case when v_uuid_like_export_risk=0 then 'ok' else 'warning' end,'actual',v_uuid_like_export_risk,'expected',0,'message','Milk item thiếu legacy_id/short_code có nguy cơ export bằng UUID nội bộ.')
    ),
    'recommendation', case when v_ok then 'Milk relational identity sạch. Có thể tiếp tục test ReadMode/WriteQueue.' else 'Chưa nên chốt production. Cần xử lý các check warning/error.' end
  );
end;
$$;

grant execute on function public.myb_relational_milk_identity_doctor(text) to anon, authenticated;
comment on function public.myb_relational_milk_identity_doctor(text) is 'V15.0.71 checks duplicate milk/care identity and bottle/bag mapping after relational write/read.';
