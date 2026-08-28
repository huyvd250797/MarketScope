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
