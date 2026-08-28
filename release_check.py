#!/usr/bin/env python3
"""Release smoke check for Mẹ Yêu Bé V15.0.72."""
from pathlib import Path
import subprocess, sys

root = Path(__file__).resolve().parent
errors = []

def read(name):
    p = root / name
    if not p.exists():
        errors.append(f"Thiếu file: {name}")
        return ""
    return p.read_text(encoding="utf-8", errors="ignore")

idx = read("index.html")
app = read("app.js")
boot = read("boot.js")
sw = read("sw.js")
manifest = read("manifest.webmanifest")
build = read("build.json")
version = read("version.md")
changelog = read("changelog.md")

# Version sync
for name, txt in {
    "index.html": idx,
    "app.js": app,
    "boot.js": boot,
    "sw.js": sw,
    "manifest.webmanifest": manifest,
    "build.json": build,
    "version.md": version,
    "changelog.md": changelog,
}.items():
    if "15.0.72" not in txt and "V15.0.72" not in txt:
        errors.append(f"{name} chưa đồng bộ V15.0.72")

# Cache busting / boot guard
for token in ['src="./boot.js?v=15.0.72"', 'src="./app.js?v=15.0.72"', 'ME YEU BE · V15.0.72', '<b>V15.0.72</b>']:
    if token not in idx:
        errors.append("index.html thiếu token version/cache: " + token)
for token in ["var APP_VERSION=\"15.0.72\"", "V15.0.72 · PumpMilk24UI"]:
    if token not in app:
        errors.append("app.js thiếu token V15.0.72: " + token)
for token in ["var BUILD='15.0.72'", "build.json", "MEYEUBE_BUILD_ACK"]:
    if token not in boot:
        errors.append("boot.js thiếu boot guard/version: " + token)
for token in ["const BUILD='15.0.72'", "cache:'no-store'", "caches.delete(k)"]:
    if token not in sw:
        errors.append("sw.js thiếu SW guard/version: " + token)


# V15.0.72 QuietCloudToastFix acceptance
for token in [
    "mybPreloadCloudBeforeFirstRender",
    "mybStartupSplashStatus",
    "không render DB rỗng trước khi Cloud DB kéo xong",
    "Đang tải dữ liệu mới nhất từ Supabase",
    "startup_cache_after_cloud_fail",
    "cloudRealtimeStart()",
]:
    if token not in (idx + app):
        errors.append("Thiếu QuietCloudToastFix V15.0.72: " + token)

# V15.0.72 scroll-lock acceptance checks
for token in [
    "body.mybBottomSheetLock,body.mybScrollLock{position:fixed!important",
    "html.mybBottomSheetLock{overflow:hidden!important",
    "mybBottomSheetLock",
    "touchmove",
    "passive:false",
    "tl8Sheet.show",
    "moreSheet.show",
    "streakOverlay.show",
    "milkBagPickerOverlay.show",
    "nmSheet.open",
]:
    if token not in (idx + app):
        errors.append("Thiếu cơ chế khóa scroll V15.0.72: " + token)


# V15.0.72 hotfix: Pull-to-refresh không được hoạt động khi sheet đang mở
for token in [
    "mybAnyBottomSheetOpen",
    "lockedByUi()",
    "body.mybBottomSheetLock #pullToRefreshIndicator",
    "window.__tl8ShowV1505",
]:
    if token not in (idx + app):
        errors.append("Thiếu hotfix V15.0.72: " + token)


# V15.0.72 UXFix acceptance checks
for token in [
    "mybOverlayCore",
    "feedTimerStart",
    "bcStatusFeeding",
    "ringFeed",
    "tl8OnlyAction",
    "tl8ActionOnlyBtn",
    "tl8ActDanger",
    "tl8RecordChipBar",
    "tl8ResetView",
    "AX_PRESS_SEL='.tl8Chip",
]:
    if token not in (idx + app):
        errors.append("Thiếu UXFix V15.0.72: " + token)


# V15.0.72 MilkFeedFix acceptance checks
for token in ["v1511-milk-feed-fix", "v1512-milk-scroll-swipe-fix", "milkChosenExpire", "window.abOnAmountInput=function", ".milkSwipeShell,.milkSwipeActions", "PumpMilk24UI"]:
    if token not in (idx + app):
        errors.append("Thiếu MilkFeedFix V15.0.72: " + token)


# V15.0.72 PumpMilk24UI acceptance checks
for token in ["careRecordSwipeStart=function", "mcIsBusyForPump", "v1514-pump-swipe-fix", "Bình/túi này đang Tạm ẩn"]:
    if token not in (idx + app):
        errors.append("Thiếu PumpMilk24UI V15.0.72: " + token)


# V15.0.72 PumpMilk24UI acceptance checks
for token in ["repairPumpContainerLinks", "findPumpBagForEvent", "syncPumpEventFromBag", "Kho sữa là nguồn đúng", "pumpContainerInfo(db,x)", "pumpFridgeExpire24hFrom", "v1518-milk-typography"]:
    if token not in (idx + app):
        errors.append("Thiếu PumpMilk24UI V15.0.72: " + token)

# Keep V15.0.2 requested features present
for token in ["hb2Swipe", "tl9Swipe", "hbxEdit", "hbxDelete", "tl9PatchCareTimeline"]:
    if token not in app + idx:
        errors.append("Thiếu feature V15.0.2 còn phải giữ: " + token)

for required in ["AC_V15.0.72.md", "PUSH_NOTIFICATION_SETUP.md", "supabase/functions/send-push/index.ts", "supabase/functions/smart-alert-cron/index.ts", "docs/SMART_ALERT_CRON_SETUP.md"]:
    if not (root / required).exists():
        errors.append("Thiếu file: " + required)

for js in ["app.js", "boot.js", "sw.js"]:
    result = subprocess.run(["node", "--check", str(root / js)], capture_output=True, text=True)
    if result.returncode != 0:
        errors.append(f"{js} lỗi cú pháp: {result.stderr.strip()}")


# V15.0.72 SmartAlertCronPush acceptance
for token in ["SmartAlertCronPush", "normalizePumpExclusiveLinks", "duplicate_pump_link", "linked_to_foreign_pump_bag", "Bình \"" ]:
    if token not in (idx + app):
        errors.append("Thiếu SmartAlertCronPush V15.0.72: " + token)
if not (root / "AC_V15.0.72.md").exists():
    errors.append("Thiếu file: AC_V15.0.72.md")


# V15.0.72 Smart Alert Cron Push acceptance
for token in ["smart-alert-cron", "VAPID_PRIVATE_KEY", "push_delivery_log", "Nhắc sau 15 phút", "không thiết bị nào đang mở app"]:
    if token not in (idx + app + read("PUSH_NOTIFICATION_SETUP.md") + read("docs/SMART_ALERT_CRON_SETUP.md") + read("supabase/functions/smart-alert-cron/index.ts")):
        errors.append("Thiếu Smart Alert Cron Push V15.0.72: " + token)


# V15.0.72 StoredFeedFastAutoFix acceptance
for token in ["StoredFeedFastAutoFix", "adjustedSourcesForNeed", "Chỉ bấm ✕ mới chuyển sang thủ công", "lượng sữa của túi sẽ được trả lại kho"]:
    if token not in (idx + app + changelog + version):
        errors.append("Thiếu StoredFeedFastAutoFix V15.0.72: " + token)
if not (root / "AC_V15.0.72.md").exists():
    errors.append("Thiếu file: AC_V15.0.72.md")


# V15.0.72 RelationalReadMode acceptance
supabase_setup = read("SUPABASE_SETUP.sql")
rel_sql = read("supabase/RELATIONAL_SCHEMA_V15_0_69.sql")
mig_sql = read("supabase/JSON_TO_RELATIONAL_MIGRATION_V15_0_69.sql")
doctor_sql = read("supabase/RELATIONAL_MIGRATION_DOCTOR_V15_0_69.sql")
doc_mig = read("docs/JSON_TO_RELATIONAL_MIGRATION.md")
doc_doctor = read("docs/RELATIONAL_MIGRATION_DOCTOR.md")
delta_sql = read("supabase/RELATIONAL_MIGRATION_DELTA_SYNC_V15_0_69.sql")
read_sql = read("supabase/RELATIONAL_READ_MODE_V15_0_69.sql")
doc_read = read("docs/RELATIONAL_READ_MODE.md")
doc_delta = read("docs/RELATIONAL_MIGRATION_DELTA_SYNC.md")
write_sql = read("supabase/RELATIONAL_WRITE_QUEUE_V15_0_69.sql")
doc_write = read("docs/RELATIONAL_WRITE_QUEUE.md")
for token in [
    "myb_preview_json_migration",
    "myb_migrate_json_to_relational",
    "myb_relational_migration_status",
    "myb_migration_source_counts",
    "myb_relational_table_counts",
    "migration_batches",
    "media_files",
    "normal_app_write_mode",
    "myb_relational_migration_doctor",
    "myb_doctor_check",
    "Relational Migration Doctor",
    "doctor_mode",
    "read_only_no_data_mutation",
    "milk_overdraw",
    "myb_relational_delta_counts",
    "myb_preview_relational_delta_sync",
    "myb_sync_json_to_relational_delta",
    "Relational Delta Sync",
    "missing_counts",
    "changed_counts",
    "total_delta",
    "stable_id_idempotent_upsert_no_duplicate",
    "myb_relational_read_preflight",
    "myb_export_relational_legacy_payload",
    "Relational Read Mode",
    "rel67PreflightReadMode",
    "rel67ToggleReadMode",
    "relational_tables_with_legacy_unmigrated_fallback",
    "relational_write_queue",
    "myb_relational_write_preflight",
    "myb_apply_relational_payload_snapshot",
    "myb_soft_reset_relational_family_for_snapshot",
    "Relational Write Queue",
    "rel68ToggleWriteMode",
    "relational_write_queue_snapshot_apply",
]:
    if token not in (supabase_setup + rel_sql + mig_sql + doctor_sql + delta_sql + read_sql + doc_mig + doc_doctor + doc_delta + doc_read + write_sql + doc_write + app + idx):
        errors.append("Thiếu RelationalReadMode V15.0.72: " + token)
for forbidden in ["supabase_setup.sql"]:
    if (root / forbidden).exists():
        errors.append("Không được giữ file setup trùng tên: " + forbidden)

# V15.0.72 RelationalDataRescueDedupeFix acceptance
prod_sql = read("supabase/RELATIONAL_PRODUCTION_PUSH_V15_0_69.sql")
prod_doc = read("docs/RELATIONAL_PRODUCTION_PUSH.md")
for token in [
    "relational_primary_state",
    "myb_relational_primary_preflight",
    "myb_relational_promote_primary",
    "myb_relational_primary_status",
    "RelationalDataRescueDedupeFix",
    "Đẩy dữ liệu chính thức",
    "rel69ProductionPreflight",
    "rel69PromotePrimary",
    "relational_primary_with_legacy_backup",
]:
    if token not in (supabase_setup + rel_sql + prod_sql + prod_doc + app + idx):
        errors.append("Thiếu RelationalDataRescueDedupeFix V15.0.72: " + token)
if not (root / "AC_V15.0.72.md").exists():
    errors.append("Thiếu file: AC_V15.0.72.md")



# V15.0.72 RelationalDataRescueDedupeFix acceptance
rescue_sql = read("supabase/RELATIONAL_DATA_RESCUE_DEDUPE_FIX_V15_0_72.sql")
rescue_doc = read("docs/RELATIONAL_DATA_RESCUE_DEDUPE_FIX.md")
for token in [
    "RelationalDataRescueDedupeFix",
    "relational_recovery_backups",
    "myb_relational_fast_duplicate_doctor",
    "myb_rebuild_relational_from_deduped_legacy",
    "myb_dedupe_legacy_payload_v1572",
    "Data Rescue & Dedupe",
    "rel72ServerRescue",
    "snapshot_apply_deduped",
]:
    if token not in (supabase_setup + rescue_sql + rescue_doc + app + idx):
        errors.append("Thiếu RelationalDataRescueDedupeFix V15.0.72: " + token)
if not (root / "AC_V15.0.72.md").exists():
    errors.append("Thiếu file: AC_V15.0.72.md")

if errors:
    print("RELEASE CHECK FAILED")
    for e in errors:
        print("- " + e)
    sys.exit(1)
print("RELEASE CHECK PASSED: V15.0.72")


# V15.0.72 InventorySafeFix acceptance
for token in ["v1521-search-nav-loading-fix", "gsStrictTokenHitV1521", "body.menuOpen .bottomNav", "loadingLogo img", "rawType==='feed'||rawType==='pump'||rawType==='spitup'"]:
    if token not in (idx + app):
        errors.append("Thiếu InventorySafeFix V15.0.72: " + token)
