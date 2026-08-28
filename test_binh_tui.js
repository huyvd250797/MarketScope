/* Test trên đúng code thật (index.html + app.js nạp trong jsdom), không gõ lại logic */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = __dirname;
const KEY = 'meYeuBePWA_v4';

let pass = 0, fail = 0;
function ok(n, c, x) { if (c) { pass++; console.log('  ✓ ' + n) } else { fail++; console.log('  ✗ ' + n + (x ? '  →  ' + x : '')) } }
function eq(n, g, w) { ok(n, JSON.stringify(g) === JSON.stringify(w), 'got=' + JSON.stringify(g) + ' want=' + JSON.stringify(w)) }

function boot(db) {
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, addListener() {} }));
  w.scrollTo = () => {};
  w.navigator.serviceWorker = { register: () => Promise.reject(new Error('x')), ready: Promise.reject(new Error('x')), addEventListener() {} };
  w.fetch = () => Promise.reject(new Error('x'));
  w.alert = () => {}; w.confirm = () => true; w.prompt = () => null;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  w.localStorage.setItem(KEY, JSON.stringify(db));
  try { w.eval(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8')) } catch (e) { console.log('  !! app.js: ' + e.message) }
  return w;
}

const T = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function expIn(h) { const d = new Date(Date.now() + h * 3600000); return iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }

function bag(id, ml, hoursLeft, opt) {
  return Object.assign({
    id, shortId: id, date: iso(T), timeFrom: '08:00', amount: ml, remaining: ml,
    storage: 'Ngăn mát', status: 'Đang bảo quản', expireDateTime: expIn(hoursLeft), note: ''
  }, opt || {});
}
function baseDb(extra) {
  return Object.assign({
    settings: {}, careEvents: [], milkInventory: [], milkContainers: [],
    milestones: [], diary: [], appointments: [], pregnancy: [], baby: [], mom: [], healthBook: []
  }, extra || {});
}
/* Đúng kho ví dụ Boss đưa */
function khoBoss() {
  return [
    bag('b1', 30, 24, { containerId: 'c_b1', containerKind: 'binh', containerName: 'Fatz 1️⃣' }),
    bag('b2', 50, 48, { containerId: 'c_b2', containerKind: 'binh', containerName: 'Fatz 2️⃣' }),
    bag('t1', 80, 72, { containerId: 'c_tui', containerKind: 'tui', containerName: '260726-2330' })
  ];
}
const CONTAINERS = [
  { id: 'c_b1', name: 'Fatz 1️⃣', kind: 'binh', capacity: 150, active: true },
  { id: 'c_b2', name: 'Fatz 2️⃣', kind: 'binh', capacity: 150, active: true },
  { id: 'c_tui', name: 'Túi trữ sữa', kind: 'tui', capacity: 0, active: true }
];

/* ============================================================ */
console.log('\n[1] Thuật toán gắn túi — đúng ví dụ Boss đưa');
{
  const db = baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS });
  const w = boot(db);
  const pick = n => w.abCompute(w.load(), n, {});

  let r = pick(80);
  eq('bú 80ml → bình 1 + bình 2', r.picked.map(p => p.bagId), ['b1', 'b2']);
  eq('bình 1 dùng hết 30ml', r.picked[0].usedMl, 30);
  eq('bình 2 dùng hết 50ml', r.picked[1].usedMl, 50);
  ok('không đụng tới túi 1', r.picked.length === 2);

  r = pick(30);
  eq('sửa còn 30ml → chỉ bình 1', r.picked.map(p => p.bagId), ['b1']);
  eq('lấy đúng 30ml', r.picked[0].usedMl, 30);

  r = pick(90);
  eq('sửa thành 90ml → bình 1 + bình 2 + túi 1', r.picked.map(p => p.bagId), ['b1', 'b2', 't1']);
  eq('túi 1 chỉ lấy 10ml', r.picked[2].usedMl, 10);
  eq('tổng đúng 90ml', r.total, 90);
  ok('túi 1 còn lại 70ml', 80 - r.picked[2].usedMl === 70);

  r = pick(200);
  eq('kho không đủ → vẫn lấy hết mức có thể', r.total, 160);
  eq('báo thiếu 40ml', r.short, 40);
  ok('không tự nhận là đủ', r.enough === false);

  r = pick(0);
  eq('chưa nhập ml → không gắn gì', r.picked.length, 0);
}
{
  const w = boot(baseDb({ milkInventory: [bag('big', 90, 48), bag('small', 20, 48), bag('mid', 50, 48)] }));
  const r = w.abCompute(w.load(), 60, {});
  eq('cùng hạn dùng → ưu tiên túi ÍT ml trước', r.picked.map(p => p.bagId), ['small', 'mid']);
  eq('túi nhỏ dùng hết', r.picked[0].usedMl, 20);
  eq('túi kế chỉ lấy phần còn thiếu', r.picked[1].usedMl, 40);
}
{
  const w = boot(baseDb({
    milkInventory: [
      Object.assign(bag('used', 80, 5), { status: 'Đã sử dụng hết' }),
      Object.assign(bag('drop', 80, 6), { status: 'Đã bỏ' }),
      bag('zero', 0, 7), bag('good', 80, 100)
    ]
  }));
  const r = w.abCompute(w.load(), 50, {});
  eq('bỏ qua túi đã dùng hết / đã bỏ / còn 0ml', r.picked.map(p => p.bagId), ['good']);
}
{
  const w = boot(baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS }));
  const r = w.abCompute(w.load(), 80, { b1: true });
  eq('túi bị loại trừ thì không được gắn lại', r.picked.map(p => p.bagId), ['b2', 't1']);
  eq('lấy 50 + 30', r.picked.map(p => p.usedMl), [50, 30]);
}

/* ============================================================ */
console.log('\n[2] Tính lại LIVE khi đổi số ml (lỗi chính của bản trước)');
{
  const db = baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS });
  const w = boot(db);
  const d = w.document;
  w.openCareFormModal('feed');

  const amt = d.getElementById('cAmount');
  ok('ô số ml gọi đúng engine khi gõ', /abOnAmountInput/.test(amt.getAttribute('oninput') || ''),
     'oninput=' + amt.getAttribute('oninput'));

  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();

  const setMl = v => { amt.value = String(v); w.abOnAmountInput() };
  const now = () => w.milkFeedSourcesState().map(s => s.bagId + ':' + s.usedMl);

  setMl(80);
  eq('nhập 80ml', now(), ['b1:30', 'b2:50']);
  setMl(30);
  eq('SỬA thành 30ml → danh sách tự co lại còn 1 bình', now(), ['b1:30']);
  setMl(90);
  eq('SỬA thành 90ml → tự nới ra 3 túi', now(), ['b1:30', 'b2:50', 't1:10']);
  setMl(70);
  eq('SỬA thành 70ml → tự tính lại, không để sót túi thừa', now(), ['b1:30', 'b2:40']);
  setMl(0);
  eq('xoá trắng ô ml → bỏ hết túi đã gắn', now(), []);

  setMl(200);
  eq('vượt kho → vẫn gắn hết mức có thể', now(), ['b1:30', 'b2:50', 't1:80']);
  const warn = d.getElementById('abWarnBox');
  ok('hiện cảnh báo đã dùng hết sữa trong kho', !warn.classList.contains('hidden'));
  ok('cảnh báo nêu đúng số ml còn thiếu', /40/.test(warn.textContent), warn.textContent);

  setMl(80);
  ok('sửa lại cho vừa kho → cảnh báo tự tắt', d.getElementById('abWarnBox').classList.contains('hidden'));
}
{
  const db = baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS });
  const w = boot(db);
  const d = w.document;
  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '80';
  w.abOnAmountInput();

  eq('trước khi sửa tay', w.milkFeedSourcesState().map(s => s.bagId), ['b1', 'b2']);
  eq('đang ở chế độ tự động', d.getElementById('abModeBadge').textContent, 'TỰ ĐỘNG');

  w.removeMilkFeedSource(0);                       // bấm ✕ trên bình 1
  eq('bỏ tay bình 1 → chuyển sang thủ công', d.getElementById('abModeBadge').textContent, 'THỦ CÔNG');
  ok('hiện nút cho app tự chọn lại', !d.getElementById('abReAutoBtn').classList.contains('hidden'));
  eq('bình 1 bị gỡ khỏi danh sách', w.milkFeedSourcesState().map(s => s.bagId), ['b2']);

  d.getElementById('cAmount').value = '90';
  w.abOnAmountInput();
  eq('chế độ thủ công: đổi ml KHÔNG bị app chọn lại', w.milkFeedSourcesState().map(s => s.bagId), ['b2']);

  w.abReAuto();
  eq('bấm tự chọn lại → app gắn lại từ đầu cho 90ml', w.milkFeedSourcesState().map(s => s.bagId + ':' + s.usedMl), ['b1:30', 'b2:50', 't1:10']);
  eq('về lại chế độ tự động', d.getElementById('abModeBadge').textContent, 'TỰ ĐỘNG');
}
{
  const w = boot(baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '80';
  w.abOnAmountInput();
  ok('đang có túi được gắn', w.milkFeedSourcesState().length === 2);
  d.getElementById('cFeedSource').value = 'direct';
  w.toggleFeedSourceFields();
  ok('chuyển sang bú mẹ trực tiếp → panel kho sữa ẩn đi', d.getElementById('milkSourcePanel').classList.contains('hidden'));
}
{
  // Nhắc hủy phần còn lại khi mở dở một TÚI
  const w = boot(baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '90';
  w.abOnAmountInput();
  const hint = d.getElementById('abPartialHint');
  ok('mở dở túi 70ml → nhắc cân nhắc hủy phần còn lại', !hint.classList.contains('hidden'), 'text=' + hint.textContent);
  ok('nhắc đúng số ml còn lại', /70ml/.test(hint.textContent), hint.textContent);

  d.getElementById('cAmount').value = '80';
  w.abOnAmountInput();
  ok('không mở dở túi nào → không nhắc', d.getElementById('abPartialHint').classList.contains('hidden'));
}

/* ============================================================ */
console.log('\n[3] Sửa ghi nhận cũ — không được tự đổi túi đã lưu');
{
  const old = {
    type: 'feed', startDate: iso(T), date: iso(T), timeFrom: '07:00', source: 'stored',
    amount: 45, unit: 'ml', extra: { takenMl: 45, milkSources: [{ bagId: 't1', usedMl: 45, remainderAction: 'keep', discardMl: 0 }] },
    milkSources: [{ bagId: 't1', usedMl: 45, remainderAction: 'keep', discardMl: 0 }], milkBagId: 't1'
  };
  const w = boot(baseDb({ careEvents: [old], milkInventory: khoBoss(), milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('feed', 0);
  eq('giữ nguyên túi đã lưu, không tự gắn lại theo hạn dùng', w.milkFeedSourcesState().map(s => s.bagId + ':' + s.usedMl), ['t1:45']);
  eq('khoá ở chế độ thủ công khi đang sửa', d.getElementById('abModeBadge').textContent, 'THỦ CÔNG');
  d.getElementById('cAmount').value = '60';
  w.abOnAmountInput();
  eq('đổi ml khi đang sửa cũng không bị app đổi túi', w.milkFeedSourcesState().map(s => s.bagId), ['t1']);
}

/* ============================================================ */
console.log('\n[4] Danh mục Bình / Túi');
{
  const w = boot(baseDb());
  const d = w.document;
  ok('app tự có sẵn một dòng "Túi trữ sữa" dùng chung', w.mcAll(w.load()).some(c => c.kind === 'tui'));

  w.showPage('milkContainer');
  d.getElementById('mcName').value = 'Fatz 1️⃣';
  w.mcPickKind('binh');
  d.getElementById('mcCapacity').value = '150';
  w.saveMilkContainer();
  const list = w.mcAll(w.load());
  ok('thêm được bình mới', list.some(c => c.name === 'Fatz 1️⃣' && c.kind === 'binh'));
  eq('ô nhập được làm trống sau khi lưu', d.getElementById('mcName').value, '');

  d.getElementById('mcName').value = 'Fatz 1️⃣';
  w.saveMilkContainer();
  eq('không cho trùng tên', w.mcAll(w.load()).filter(c => c.name === 'Fatz 1️⃣').length, 1);

  ok('chọn loại Túi thì ẩn ô dung tích', (w.mcPickKind('tui'), d.getElementById('mcCapacityWrap').classList.contains('hidden')));
  ok('chọn loại Bình thì hiện lại', (w.mcPickKind('binh'), !d.getElementById('mcCapacityWrap').classList.contains('hidden')));

  w.renderMilkContainers(w.load());
  ok('danh sách vẽ ra được', /Fatz/.test(d.getElementById('mcList').innerHTML));
}
{
  const w = boot(baseDb({
    milkContainers: CONTAINERS,
    milkInventory: [bag('b1', 30, 24, { containerId: 'c_b1', containerKind: 'binh', containerName: 'Fatz 1️⃣' })]
  }));
  ok('bình đang còn sữa → báo Đang chứa sữa', w.mcIsBusy(w.load(), 'c_b1') === true);
  ok('bình chưa dùng → Trống', w.mcIsBusy(w.load(), 'c_b2') === false);
  ok('túi dùng một lần không tính trạng thái bận', w.mcIsBusy(w.load(), 'c_tui') === false);

  const before = w.mcAll(w.load()).length;
  w.delMilkContainer(w.mcAll(w.load()).findIndex(c => c.id === 'c_b1'));
  eq('không cho xoá bình đang có túi sữa trong kho', w.mcAll(w.load()).length, before);
}
{
  const w = boot(baseDb({ milkContainers: CONTAINERS }));
  eq('mã túi tự sinh theo ngày giờ hút', w.mcAutoBagCode('2026-07-25', '23:30'), '260725-2330');
  eq('túi dùng một lần → tên là mã ngày giờ', w.mcBagLabel(w.load(), 'c_tui', '2026-07-25', '23:30'), '260725-2330');
  eq('bình → tên là tên bình', w.mcBagLabel(w.load(), 'c_b1', '2026-07-25', '23:30'), 'Fatz 1️⃣');
}

/* ============================================================ */
console.log('\n[5] Hút sữa gắn bình/túi');
{
  const w = boot(baseDb({ milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('pump');
  ok('form hút sữa có hàng chip chọn bình/túi', d.getElementById('cContainerChips').children.length >= 3);
  ok('không còn bắt gõ tên bình vào ô ghi chú', !!d.getElementById('cContainerId'));

  d.getElementById('cDate').value = '2026-07-25';
  d.getElementById('cTimeFrom').value = '23:30';
  w.mcPickPumpContainer('c_tui');
  eq('chọn được túi', d.getElementById('cContainerId').value, 'c_tui');
  ok('báo trước mã túi sẽ đặt', /260725-2330/.test(d.getElementById('cContainerHint').innerHTML),
     d.getElementById('cContainerHint').innerHTML);

  d.getElementById('cAmount').value = '150';
  d.getElementById('cStorage').value = 'Ngăn mát';
  w.fillMilkExpiryFromStorage(true);
  w.saveCareEvent();

  const db2 = w.load();
  eq('tạo được túi trong kho', db2.milkInventory.length, 1);
  eq('túi mang đúng mã ngày giờ', db2.milkInventory[0].containerName, '260725-2330');
  eq('lưu đúng loại', db2.milkInventory[0].containerKind, 'tui');
  eq('kho hiển thị theo tên container', w.milkBagDisplayId(db2.milkInventory[0]), '260725-2330');
}
{
  const w = boot(baseDb({ milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('pump');
  w.mcPickPumpContainer('c_b1');
  d.getElementById('cAmount').value = '120';
  d.getElementById('cStorage').value = 'Ngăn mát';
  w.fillMilkExpiryFromStorage(true);
  w.saveCareEvent();
  const b = w.load().milkInventory[0];
  eq('hút vào bình → kho hiện tên bình', w.milkBagDisplayId(b), 'Fatz 1️⃣');
  eq('gắn đúng id bình', b.containerId, 'c_b1');
}
{
  const w = boot(baseDb({ milkContainers: CONTAINERS }));
  const d = w.document;
  w.openCareFormModal('pump');
  d.getElementById('cAmount').value = '120';
  d.getElementById('cStorage').value = 'Ngăn mát';
  w.fillMilkExpiryFromStorage(true);
  w.saveCareEvent();
  eq('chưa chọn bình/túi thì không cho lưu', w.load().milkInventory.length, 0);
}

/* ============================================================ */
console.log('\n[6] Chuyển đổi dữ liệu cũ');
{
  const w = boot(baseDb({
    milkContainers: [],
    milkInventory: [
      bag('o1', 100, 50, { note: 'Fatz 1️⃣' }),
      bag('o2', 100, 60, { note: 'Fatz 1️⃣' }),
      bag('o3', 100, 70, { note: 'Pigeon' }),
      bag('o4', 100, 80, { note: '' }),
      bag('o5', 100, 90, { note: 'sữa hơi vàng, bé bú thấy hơi ọc nên ghi chú lại cho nhớ lần sau' })
    ]
  }));
  const db = w.load();
  const names = w.mcAll(db).map(c => c.name);
  ok('tạo bình từ ghi chú cũ', names.indexOf('Fatz 1️⃣') > -1 && names.indexOf('Pigeon') > -1);
  eq('ghi chú trùng nhau chỉ tạo 1 bình', w.mcAll(db).filter(c => c.name === 'Fatz 1️⃣').length, 1);
  const byId = id => db.milkInventory.find(b => b.id === id);
  eq('túi cũ được gắn vào bình tương ứng', byId('o1').containerName, 'Fatz 1️⃣');
  eq('hai túi cùng ghi chú gắn cùng một bình', byId('o2').containerId, byId('o1').containerId);
  ok('túi không có ghi chú thì bỏ qua', !byId('o4').containerId);
  ok('ghi chú dài là mô tả thật, không biến thành tên bình', !byId('o5').containerId);
  ok('ghi chú dài không lọt vào danh mục', names.every(n => n.length <= 30));
  ok('đánh dấu đã chuyển đổi để không chạy lại', db.settings.mcMigratedV1 === true);
  eq('thống kê chuyển đổi', db.settings.mcMigratedStat, { created: 2, linked: 3 });
}

/* ============================================================ */
console.log('\n[7] Hồi quy');
{
  const w = boot(baseDb({ milkInventory: khoBoss(), milkContainers: CONTAINERS }));
  const d = w.document;
  ok('V13.2.x Hoàn tác còn nguyên', typeof w.udShow === 'function' && typeof w.udUndo === 'function');
  ok('V12.2.x Tìm kiếm còn nguyên', typeof w.gsBuildIndex === 'function');
  ok('V13.0.0 Backup còn nguyên', typeof w.bkCreateVersion === 'function');
  ok('không còn vết tính năng Smart Suggest cũ', typeof w.ssApplyForType === 'undefined' && typeof w.ssSuggestBags === 'undefined');

  w.openCareFormModal('feed');
  ok('form mở bình thường', d.getElementById('careFormOverlay').classList.contains('show'));
  ok('vẫn khoá cuộn nền', d.body.classList.contains('careModalOpen'));

  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '80';
  w.abOnAmountInput();
  const txt = d.getElementById('milkProgressText');
  eq('thanh tiến độ kho sữa đúng', txt.textContent, '80 / 80 ml');

  w.saveCareEvent();
  const after = w.load();
  eq('lưu được ghi nhận', after.careEvents.length, 1);
  eq('bình 1 bị trừ hết', after.milkInventory.find(b => b.id === 'b1').remaining, 0);
  eq('bình 2 bị trừ hết', after.milkInventory.find(b => b.id === 'b2').remaining, 0);
  eq('túi 1 không bị đụng tới', after.milkInventory.find(b => b.id === 't1').remaining, 80);

  w.udUndo();
  const back = w.load();
  eq('Hoàn tác: trả lại sữa cho bình 1', back.milkInventory.find(b => b.id === 'b1').remaining, 30);
  eq('Hoàn tác: trả lại sữa cho bình 2', back.milkInventory.find(b => b.id === 'b2').remaining, 50);
  eq('Hoàn tác: xoá bản ghi', back.careEvents.length, 0);
}

console.log('\n=========================================');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
console.log('=========================================');
process.exit(fail ? 1 : 0);
