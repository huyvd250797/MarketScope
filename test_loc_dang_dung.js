/* Test: bình/túi khác trạng thái "Đang dùng" KHÔNG được hiện ở bất cứ chỗ chọn dữ liệu nào */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = process.argv[2] || __dirname;
let pass = 0, fail = 0;
function ok(n, c, x) { if (c) { pass++; console.log('  ✓ ' + n) } else { fail++; console.log('  ✗ ' + n + (x ? '  →  ' + x : '')) } }
function eq(n, g, w) { ok(n, JSON.stringify(g) === JSON.stringify(w), 'got=' + JSON.stringify(g) + ' want=' + JSON.stringify(w)) }

function boot(db) {
  const dom = new JSDOM(fs.readFileSync(path.join(DIR, 'index.html'), 'utf8'), { url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, addListener() {} }));
  w.scrollTo = () => {};
  w.navigator.serviceWorker = { register: () => new Promise(() => {}), ready: new Promise(() => {}), addEventListener() {} };
  w.fetch = () => new Promise(() => {});
  w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.localStorage.setItem('meYeuBePWA_v4', JSON.stringify(db));
  try { w.eval(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8')) } catch (e) { console.log('  !! app.js: ' + e.message) }
  return w;
}
const T = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY = iso(T);
const EXP = iso(new Date(Date.now() + 96 * 3600000)) + 'T08:00';

/* mô phỏng đúng tình trạng thật của Boss: danh mục bị migration đẻ ra nhiều mục rác */
const C = [
  { id: 'tui_chung', name: 'Túi trữ sữa', kind: 'tui', capacity: 0, active: true },
  { id: 'binh_timcao', name: 'Tím cao', kind: 'binh', capacity: 150, active: true },
  { id: 'binh_fatz1', name: 'Fatz 1', kind: 'binh', capacity: 150, active: true },
  { id: 'rac1', name: 'Fatz 2 —> túi X 250726-0300', kind: 'binh', capacity: 0, active: false },
  { id: 'rac2', name: 'Fatz 1 —> Túi 1 250726-2306', kind: 'binh', capacity: 0, active: false },
  { id: 'rac3', name: 'Bình tím cao —> Túi 1 170726', kind: 'binh', capacity: 0, active: false },
  { id: 'rac4', name: 'Túi 2', kind: 'tui', capacity: 0, active: false }
];
function mkdb(containers, bagContainerId) {
  return {
    settings: { mcMigratedV1: true }, careEvents: [], milkContainers: containers,
    milkInventory: [{
      id: 'B1', shortId: 'B1', date: TODAY, startDate: TODAY, timeFrom: '08:00',
      amount: 80, remaining: 80, storage: 'Ngăn mát', status: 'Đang bảo quản', expireDateTime: EXP,
      containerId: bagContainerId || 'binh_timcao', containerKind: 'binh', containerName: 'Tím cao', note: ''
    }],
    milestones: [], diary: [], appointments: [], pregnancy: [], baby: [], mom: [], healthBook: []
  };
}
const ids = (d, sel) => [...d.querySelectorAll(sel)].map(x => x.getAttribute('data-mc') || x.getAttribute('data-tf'));

console.log('\n[1] Màn hình Ghi nhận Hút sữa');
{
  const w = boot(mkdb(C)); const d = w.document;
  w.openCareFormModal('pump');
  eq('chỉ còn các mục Đang dùng', ids(d, '#cContainerChips .mcChip'), ['tui_chung', 'binh_timcao', 'binh_fatz1']);
  const html = d.getElementById('cContainerChips').innerHTML;
  ok('không còn mục rác nào', !/250726|170726|Túi 2/.test(html));
  eq('đúng 4 mục Tạm ẩn bị loại', w.mcHiddenCount(w.load(), ''), 4);
}
{
  const allOff = C.map(c => Object.assign({}, c, { active: false }));
  const w = boot(mkdb(allOff)); const d = w.document;
  w.openCareFormModal('pump');
  eq('ẩn hết thì không còn chip nào', ids(d, '#cContainerChips .mcChip'), []);
  ok('báo đúng lý do là Tạm ẩn', /Tạm ẩn/.test(d.getElementById('cContainerChips').innerHTML));
  ok('không báo nhầm "chưa có"', !/Chưa có/.test(d.getElementById('cContainerChips').innerHTML));
}
{
  const w = boot(mkdb([])); const d = w.document;
  w.openCareFormModal('pump');
  ok('chưa khai báo gì thì vẫn báo "chưa có"', /Chưa có|Túi trữ sữa/.test(d.getElementById('cContainerChips').innerHTML));
}

console.log('\n[2] Popup Chuyển sữa');
{
  const w = boot(mkdb(C)); const d = w.document;
  w.tfOpen(0);
  w.tfPickKind('binh');
  eq('đích loại Bình chỉ còn mục Đang dùng', ids(d, '#tfTargetChips .mcChip'), ['binh_timcao', 'binh_fatz1']);
  ok('không còn mục rác', !/250726|170726/.test(d.getElementById('tfTargetChips').innerHTML));
  w.tfPickKind('tui');
  eq('đích loại Túi chỉ còn mục Đang dùng', ids(d, '#tfTargetChips .mcChip'), ['tui_chung']);
  ok('túi đã ẩn không xuất hiện', !/Túi 2/.test(d.getElementById('tfTargetChips').innerHTML));
}
{
  const w = boot(mkdb(C));
  w.tfOpen(0); w.tfPickKind('binh');
  w.tfPickTarget('rac1');
  eq('gọi thẳng vào mục đã ẩn cũng bị chặn', w.tfState().targetId, '');
  w.tfPickTarget('binh_fatz1');
  eq('mục Đang dùng thì chọn được', w.tfState().targetId, 'binh_fatz1');
}

console.log('\n[3] Không có ngoại lệ — kể cả khi đang Sửa bản ghi cũ');
{
  const pumpEv = {
    id: 'CE_1', type: 'pump', date: TODAY, startDate: TODAY, timeFrom: '08:00', amount: 80,
    unit: 'ml', source: 'pump', storage: 'Ngăn mát', status: 'Đang bảo quản', linkedBagId: 'B1',
    extra: { containerId: 'rac1', expireDate: EXP }
  };
  const db = mkdb(C, 'rac1'); db.careEvents = [pumpEv];
  const w = boot(db); const d = w.document;
  w.openCareFormModal('pump', 0);
  ok('mục đã ẩn KHÔNG hiện trong danh sách dù bản ghi đang dùng nó', ids(d, '#cContainerChips .mcChip').indexOf('rac1') < 0);
  eq('nhưng dữ liệu đã lưu vẫn giữ nguyên', d.getElementById('cContainerId').value, 'rac1');
  ok('có báo rõ để Boss biết mà chọn lại', /Tạm ẩn/.test(d.getElementById('cContainerHint').innerHTML),
     d.getElementById('cContainerHint').innerHTML);
  w.mcPickPumpContainer('binh_fatz1');
  eq('chọn lại mục đang dùng được bình thường', d.getElementById('cContainerId').value, 'binh_fatz1');
  w.mcPickPumpContainer('rac1');
  eq('không cho quay lại mục đã ẩn', d.getElementById('cContainerId').value, 'binh_fatz1');
}

console.log('\n[4] Bật/tắt nhanh trong Danh mục');
{
  const w = boot(mkdb(C)); const d = w.document;
  w.showPage('milkContainer');
  const html = d.getElementById('mcList').innerHTML;
  ok('trang Danh mục vẫn hiện ĐỦ cả mục Tạm ẩn', /250726/.test(html) && /Túi 2/.test(html));
  ok('mỗi dòng có nút bật/tắt nhanh', /mcToggleActive\(/.test(html));
  ok('thanh tóm tắt đếm đúng', /3 đang dùng · 4 tạm ẩn/.test(d.getElementById('mcFilterBar').innerHTML),
     d.getElementById('mcFilterBar').innerHTML);

  const i = w.mcVisibleContainers(w.load()).findIndex(c => c.id === 'binh_fatz1');
  w.mcToggleActive(i);
  eq('một chạm là tạm ẩn được', w.load().milkContainers.find(c => c.id === 'binh_fatz1').active, false);
  w.openCareFormModal('pump');
  ok('ẩn xong biến mất khỏi form Hút sữa ngay', ids(d, '#cContainerChips .mcChip').indexOf('binh_fatz1') < 0);

  w.closeCareFormModal(false);
  w.showPage('milkContainer');
  const j = w.mcVisibleContainers(w.load()).findIndex(c => c.id === 'binh_fatz1');
  w.mcToggleActive(j);
  eq('bật lại cũng một chạm', w.load().milkContainers.find(c => c.id === 'binh_fatz1').active, true);
}
{
  const w = boot(mkdb(C)); const d = w.document;
  w.showPage('milkContainer');
  w.mcToggleOnlyActiveFilter();
  ok('bật lọc thì chỉ còn mục đang dùng', !/250726/.test(d.getElementById('mcList').innerHTML));
  eq('đúng 3 dòng', d.querySelectorAll('#mcList .mcRow').length, 3);

  const i = w.mcVisibleContainers(w.load()).findIndex(c => c.id === 'binh_timcao');
  w.mcToggleActive(i);
  eq('đang lọc mà bấm Tạm ẩn vẫn đúng mục', w.load().milkContainers.find(c => c.id === 'binh_timcao').active, false);
  ok('không ẩn nhầm mục khác', w.load().milkContainers.filter(c => c.active === false).length === 5);

  w.mcToggleOnlyActiveFilter();
  ok('bỏ lọc thì hiện lại đầy đủ', /250726/.test(d.getElementById('mcList').innerHTML));
}
{
  // Sửa/Xoá phải đúng mục khi đang bật bộ lọc
  const w = boot(mkdb(C)); const d = w.document;
  w.showPage('milkContainer');
  w.mcToggleOnlyActiveFilter();
  const i = w.mcVisibleContainers(w.load()).findIndex(c => c.id === 'binh_fatz1');
  w.editMilkContainer(i);
  eq('bấm Sửa khi đang lọc mở đúng mục', d.getElementById('mcName').value, 'Fatz 1');
}
{
  const w = boot(mkdb(C));
  w.showPage('milkContainer');
  w.mcToggleOnlyActiveFilter();
  const before = w.mcAll(w.load()).length;
  const i = w.mcVisibleContainers(w.load()).findIndex(c => c.id === 'binh_fatz1');
  w.delMilkContainer(i);      // Fatz 1 chưa có túi sữa nào dùng -> xoá được
  const names = w.mcAll(w.load()).map(c => c.name);
  eq('xoá đúng mục khi đang lọc', names.indexOf('Fatz 1'), -1);
  eq('không xoá nhầm mục khác', w.mcAll(w.load()).length, before - 1);
  ok('các mục rác vẫn còn nguyên', names.filter(n => /250726|170726/.test(n)).length === 3);
}

console.log('\n[5] Hồi quy');
{
  const w = boot(mkdb(C)); const d = w.document;
  ok('Chuyển sữa còn nguyên', typeof w.tfOpen === 'function' && typeof w.tfConfirm === 'function');
  ok('Tự gắn túi còn nguyên', typeof w.abCompute === 'function');
  ok('Hoàn tác còn nguyên', typeof w.udUndo === 'function');

  w.openCareFormModal('pump');
  w.mcPickPumpContainer('tui_chung');
  d.getElementById('cAmount').value = '150';
  d.getElementById('cStorage').value = 'Ngăn mát';
  w.fillMilkExpiryFromStorage(true);
  w.saveCareEvent();
  eq('vẫn hút sữa và tạo túi bình thường', w.load().milkInventory.length, 2);

  const idx = w.load().milkInventory.findIndex(b => b.id === 'B1');
  w.tfOpen(idx);
  w.tfPickKind('tui'); w.tfPickTarget('tui_chung');
  d.getElementById('tfAmount').value = '80';
  w.tfSyncPreview(); w.tfConfirm();
  eq('vẫn chuyển sữa bình thường', w.load().milkInventory.find(b => b.id === 'B1').remaining, 0);
}

console.log('\n=========================================');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
console.log('=========================================');
process.exit(fail ? 1 : 0);
