/* Test Chuyển sữa V13.4.0 — chạy trên đúng code thật (index.html + app.js) trong jsdom */
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
const TODAY = iso(T);
function expIn(h) { const d = new Date(Date.now() + h * 3600000); return iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }

const CONTAINERS = [
  { id: 'c_binhtim', name: 'Bình tím mập', kind: 'binh', capacity: 200, active: true },
  { id: 'c_fatz', name: 'Bình Fatz', kind: 'binh', capacity: 150, active: true },
  { id: 'c_unimom', name: 'Túi Unimom', kind: 'tui', capacity: 0, active: true }
];
function bag(id, ml, opt) {
  return Object.assign({
    id, shortId: id, date: TODAY, startDate: TODAY, timeFrom: '08:00',
    amount: ml, remaining: ml, storage: 'Ngăn mát', status: 'Đang bảo quản',
    expireDateTime: expIn(96), note: '',
    containerId: 'c_binhtim', containerKind: 'binh', containerName: 'Bình tím mập'
  }, opt || {});
}
function baseDb(extra) {
  return Object.assign({
    settings: { mcMigratedV1: true }, careEvents: [], milkInventory: [], milkContainers: CONTAINERS,
    milestones: [], diary: [], appointments: [], pregnancy: [], baby: [], mom: [], healthBook: []
  }, extra || {});
}
/* mở popup và điền form giúp */
function doTransfer(w, bagIdx, kind, targetId, ml, opts) {
  const d = w.document;
  w.tfOpen(bagIdx);
  w.tfPickKind(kind);
  w.tfPickTarget(targetId);
  d.getElementById('tfAmount').value = String(ml);
  if (opts && opts.storage) d.getElementById('tfStorage').value = opts.storage;
  if (opts && opts.date) d.getElementById('tfDate').value = opts.date;
  if (opts && opts.time) d.getElementById('tfTime').value = opts.time;
  w.tfSyncPreview();
  w.tfConfirm();
}

/* ============================================================ */
console.log('\n[1] Chuyển toàn bộ — đúng ví dụ trong tài liệu');
{
  const pumpEv = {
    id: 'CE_1', type: 'pump', date: TODAY, startDate: TODAY, timeFrom: '08:00', amount: 160,
    unit: 'ml', storage: 'Ngăn mát', status: 'Đang bảo quản', linkedBagId: 'B1',
    extra: { containerId: 'c_binhtim', expireDate: expIn(96) }
  };
  const w = boot(baseDb({ careEvents: [pumpEv], milkInventory: [bag('B1', 160)] }));
  const pumpBefore = JSON.stringify(w.load().careEvents[0]);

  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });

  const db = w.load();
  const src = db.milkInventory.find(b => b.id === 'B1');
  const made = db.milkInventory.find(b => b.id !== 'B1');

  eq('nguồn còn 0ml', src.remaining, 0);
  eq('nguồn chuyển trạng thái Đã chuyển hết', src.status, 'Đã chuyển hết');
  eq('tạo đúng 1 túi mới', db.milkInventory.length, 2);
  eq('túi mới 160ml', made.amount, 160);
  eq('túi mới thuộc Túi Unimom', made.containerId, 'c_unimom');
  eq('túi mới là loại túi', made.containerKind, 'tui');

  eq('KHÔNG sửa bản ghi hút sữa gốc', JSON.stringify(db.careEvents.find(x => x.id === 'CE_1')), pumpBefore);
  const tf = db.careEvents.find(x => x.type === 'transfer');
  ok('có tạo giao dịch Chuyển sữa', !!tf);
  eq('giao dịch ghi đúng lượng', tf.amount, 160);
  eq('ghi đúng nguồn', tf.extra.fromName, 'Bình tím mập');
  eq('ghi đúng đích', tf.extra.toName, made.containerName);
  eq('giờ chuyển đúng', tf.timeFrom, '09:00');

  const line = w.careEventText(tf);
  ok('timeline mô tả đúng chiều chuyển', /Bình tím mập → /.test(line), line);
  ok('timeline có số ml', /160ml/.test(line), line);
  eq('timeline có nhãn riêng', w.careTypeMeta('transfer').label, 'Chuyển sữa');
}

console.log('\n[2] Chuyển một phần');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 80, { time: '09:00' });
  const db = w.load();
  const src = db.milkInventory.find(b => b.id === 'B1');
  const made = db.milkInventory.find(b => b.id !== 'B1');
  eq('nguồn còn lại 80ml', src.remaining, 80);
  eq('nguồn vẫn đang bảo quản', src.status, 'Đang bảo quản');
  eq('túi mới 80ml', made.amount, 80);
  eq('dung tích ban đầu của nguồn không đổi', src.amount, 160);
}

console.log('\n[3] Chuyển nhiều lần — đúng ví dụ trong tài liệu');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });      // bình tím → túi Unimom 160
  let db = w.load();
  const unimomIdx = db.milkInventory.findIndex(b => b.containerId === 'c_unimom');
  doTransfer(w, unimomIdx, 'binh', 'c_fatz', 60, { time: '20:00' }); // túi Unimom → bình Fatz 60

  db = w.load();
  const unimom = db.milkInventory.find(b => b.containerId === 'c_unimom');
  const fatz = db.milkInventory.find(b => b.containerId === 'c_fatz');
  const binhtim = db.milkInventory.find(b => b.id === 'B1');
  eq('Túi Unimom còn 100ml', unimom.remaining, 100);
  eq('Bình Fatz có 60ml', fatz.remaining, 60);
  eq('Bình tím vẫn 0ml', binhtim.remaining, 0);
  eq('có 2 giao dịch chuyển sữa', db.careEvents.filter(x => x.type === 'transfer').length, 2);
  eq('tổng sữa trong kho vẫn là 160ml', db.milkInventory.reduce((t, b) => t + b.remaining, 0), 160);
}

console.log('\n[4] Truy vết & đặt tên');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160, { timeFrom: '23:30', date: TODAY, startDate: TODAY })] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  const db = w.load();
  const made = db.milkInventory.find(b => b.containerId === 'c_unimom');
  eq('túi mới đặt mã theo GIỜ HÚT GỐC, không phải giờ chuyển', made.containerName, w.mcAutoBagCode(TODAY, '23:30'));
  eq('giữ mốc hút gốc để truy vết', made.originTimeFrom, '23:30');
  eq('ghi rõ chuyển từ đâu', made.transferFromName, 'Bình tím mập');
  ok('thẻ kho sữa hiện dấu vết chuyển', /Chuyển từ Bình tím mập/.test(w.tfBagTraceHtml(made)), w.tfBagTraceHtml(made));
}
{
  // chuyển 2 lần sang cùng loại túi -> mã không được trùng
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 60, { time: '09:00' });
  doTransfer(w, w.load().milkInventory.findIndex(b => b.id === 'B1'), 'tui', 'c_unimom', 60, { time: '10:00' });
  const names = w.load().milkInventory.filter(b => b.containerId === 'c_unimom').map(b => b.containerName);
  eq('hai túi cùng nguồn có mã khác nhau', new Set(names).size, 2);
}

console.log('\n[5] Hạn dùng');
{
  // giữ nguyên nơi bảo quản -> giữ nguyên hạn, không reset đồng hồ
  const src = bag('B1', 160, { expireDateTime: expIn(20) });
  const w = boot(baseDb({ milkInventory: [src] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  const made = w.load().milkInventory.find(b => b.containerId === 'c_unimom');
  eq('cùng nơi bảo quản → hạn dùng giữ nguyên như túi gốc', made.expireDateTime, src.expireDateTime);
}
{
  // đổi sang ngăn đông -> tính lại, và phải cảnh báo hạn dài hơn
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  const d = w.document;
  w.tfOpen(0); w.tfPickKind('tui'); w.tfPickTarget('c_unimom');
  d.getElementById('tfAmount').value = '160';
  d.getElementById('tfStorage').value = 'Ngăn đông';
  w.tfSyncPreview();
  const prev = d.getElementById('tfPreview').innerHTML;
  ok('cảnh báo khi nơi bảo quản mới kéo dài hạn dùng', /hạn dùng dài hơn/.test(prev), prev.slice(0, 200));
  ok('cảnh báo nhắc chuyện rã đông', /rã đông/.test(prev));
  w.tfConfirm();
  const made = w.load().milkInventory.find(b => b.containerId === 'c_unimom');
  eq('lưu đúng nơi bảo quản mới', made.storage, 'Ngăn đông');
  ok('hạn dùng được tính lại dài hơn', w.milkExpireAt(made) > Date.now() + 100 * 24 * 3600000);
}
{
  // đông -> mát (rã đông) thì hạn phải NGẮN lại
  const w = boot(baseDb({ milkInventory: [bag('B1', 160, { storage: 'Ngăn đông', expireDateTime: expIn(24 * 150) })] }));
  const d = w.document;
  w.tfOpen(0); w.tfPickKind('binh'); w.tfPickTarget('c_fatz');
  d.getElementById('tfAmount').value = '160';
  d.getElementById('tfStorage').value = 'Ngăn mát';
  w.tfSyncPreview();
  w.tfConfirm();
  const made = w.load().milkInventory.find(b => b.containerId === 'c_fatz');
  ok('rã đông ra ngăn mát → hạn dùng ngắn lại', w.milkExpireAt(made) < Date.now() + 5 * 24 * 3600000);
  ok('không cảnh báo vì hạn không dài thêm', true);
}

console.log('\n[6] Ràng buộc & lỗi');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 100)] }));
  const d = w.document;
  w.tfOpen(0); w.tfPickKind('tui'); w.tfPickTarget('c_unimom');
  d.getElementById('tfAmount').value = '150';
  w.tfSyncPreview();
  ok('nhập quá lượng còn lại → báo ngay trên popup', /không chuyển được 150ml/.test(d.getElementById('tfPreview').innerHTML));
  w.tfConfirm();
  eq('không cho lưu khi vượt lượng còn lại', w.load().milkInventory.length, 1);
}
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 100)] }));
  w.tfOpen(0); w.tfPickKind('tui');
  w.document.getElementById('tfAmount').value = '50';
  w.tfConfirm();
  eq('chưa chọn nơi nhận → không cho lưu', w.load().milkInventory.length, 1);
}
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 0, { remaining: 0, status: 'Đã sử dụng hết' })] }));
  w.tfOpen(0);
  ok('túi đã hết sữa thì không mở được popup chuyển', !w.document.getElementById('tfOverlay').classList.contains('show'));
}
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 100)] }));
  const html = w.milkBagHtml(w.load().milkInventory[0], 0);
  ok('túi còn sữa có nút Chuyển khi vuốt', /milkSwipeTransfer/.test(html));
  ok('dùng bố cục 3 nút', /milkSwipeShell trio/.test(html));
  const html2 = w.milkBagHtml(Object.assign({}, w.load().milkInventory[0], { remaining: 0, status: 'Đã sử dụng hết' }), 0);
  ok('túi đã hết thì không có nút Chuyển', !/milkSwipeTransfer/.test(html2));
}

console.log('\n[7] Bé bú sau khi chuyển — chỉ dùng nơi đang chứa sữa');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  const d = w.document;
  const active = w.activeMilkBags(w.load()).map(b => b.containerName);
  eq('bình tím đã hết không còn trong danh sách khả dụng', active, [w.load().milkInventory.find(b => b.containerId === 'c_unimom').containerName]);

  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '80';
  w.abOnAmountInput();
  const picked = w.milkFeedSourcesState().map(s => s.bagId);
  const unimomId = w.load().milkInventory.find(b => b.containerId === 'c_unimom').id;
  eq('bé bú 80ml → tự chọn đúng túi Unimom', picked, [unimomId]);
  ok('không chọn bình tím vì đã hết sữa', picked.indexOf('B1') < 0);
}

console.log('\n[8] Xoá & Hoàn tác giao dịch chuyển sữa');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  w.udUndo();
  const db = w.load();
  eq('Hoàn tác: trả lại đủ 160ml cho bình tím', db.milkInventory.find(b => b.id === 'B1').remaining, 160);
  eq('Hoàn tác: nguồn về lại Đang bảo quản', db.milkInventory.find(b => b.id === 'B1').status, 'Đang bảo quản');
  eq('Hoàn tác: xoá túi vừa tạo', db.milkInventory.length, 1);
  eq('Hoàn tác: xoá giao dịch chuyển sữa', db.careEvents.filter(x => x.type === 'transfer').length, 0);
}
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 100, { time: '09:00' });
  const idx = w.load().careEvents.findIndex(x => x.type === 'transfer');
  w.deleteCareEvent(idx);
  const db = w.load();
  eq('Xoá giao dịch: trả lại 100ml', db.milkInventory.find(b => b.id === 'B1').remaining, 160);
  eq('Xoá giao dịch: bỏ túi đã tạo', db.milkInventory.length, 1);
  eq('Xoá giao dịch: timeline sạch', db.careEvents.filter(x => x.type === 'transfer').length, 0);
}
{
  // đã cho bé bú từ túi mới rồi thì không được xoá giao dịch chuyển
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  const d = w.document;
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '50';
  w.abOnAmountInput();
  w.saveCareEvent();
  const idx = w.load().careEvents.findIndex(x => x.type === 'transfer');
  w.deleteCareEvent(idx);
  eq('chặn xoá khi sữa đã được dùng một phần', w.load().careEvents.filter(x => x.type === 'transfer').length, 1);
}
{
  // đã chuyển tiếp sang nơi khác thì không được xoá giao dịch trước đó
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  const uIdx = w.load().milkInventory.findIndex(b => b.containerId === 'c_unimom');
  doTransfer(w, uIdx, 'binh', 'c_fatz', 60, { time: '20:00' });
  const evs = w.load().careEvents;
  const firstIdx = evs.map((x, i) => ({ x, i })).filter(o => o.x.type === 'transfer').sort((a, b) => a.x.timeFrom.localeCompare(b.x.timeFrom))[0].i;
  w.deleteCareEvent(firstIdx);
  eq('chặn xoá giao dịch đã bị chuyển tiếp', w.load().careEvents.filter(x => x.type === 'transfer').length, 2);
}

console.log('\n[9] Thống kê & hồi quy');
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  doTransfer(w, 0, 'tui', 'c_unimom', 160, { time: '09:00' });
  const s = w.careSummaryForDate(w.load(), TODAY);
  eq('chuyển sữa KHÔNG bị tính là bé bú', s.feedMl, 0);
  eq('chuyển sữa KHÔNG bị tính là hút sữa', s.pumpMl, 0);
  eq('tổng sữa đang bảo quản vẫn đúng 160ml', s.storedMl, 160);
}
{
  const w = boot(baseDb({ milkInventory: [bag('B1', 160)] }));
  ok('V13.3.0 danh mục bình/túi còn nguyên', typeof w.mcAll === 'function' && typeof w.mcIsBusy === 'function');
  ok('V13.3.0 engine tự gắn túi còn nguyên', typeof w.abCompute === 'function' && typeof w.abApply === 'function');
  ok('V13.2.x Hoàn tác còn nguyên', typeof w.udShow === 'function' && typeof w.udUndo === 'function');
  ok('V12.2.x Tìm kiếm còn nguyên', typeof w.gsBuildIndex === 'function');
  ok('V13.0.0 Backup còn nguyên', typeof w.bkCreateVersion === 'function');

  const d = w.document;
  w.openCareFormModal('feed');
  ok('form ghi nhận vẫn mở bình thường', d.getElementById('careFormOverlay').classList.contains('show'));
  w.closeCareFormModal(false);

  w.tfOpen(0);
  ok('popup chuyển sữa mở được', d.getElementById('tfOverlay').classList.contains('show'));
  ok('popup khoá cuộn nền', d.body.classList.contains('careModalOpen'));
  w.tfClose();
  ok('đóng popup thì mở khoá cuộn nền', !d.body.classList.contains('careModalOpen'));
}

console.log('\n=========================================');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
console.log('=========================================');
process.exit(fail ? 1 : 0);
