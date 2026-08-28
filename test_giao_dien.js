/* Test V13.5.0: thẻ kho sữa (phương án A), dòng nguồn sữa Bé bú, form thay tã */
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
const EXP = iso(new Date(Date.now() + 21 * 3600000)) + 'T21:37';

const C = [
  { id: 'c_timmap', name: 'Tím mập 🟣', kind: 'binh', capacity: 150, active: true },
  { id: 'c_fatz1', name: 'Fatz 1️⃣', kind: 'binh', capacity: 150, active: true },
  { id: 'c_tui', name: 'Túi trữ sữa', kind: 'tui', capacity: 0, active: true }
];
function bag(id, name, kind, rem, tot, opt) {
  return Object.assign({
    id, shortId: id, date: TODAY, startDate: TODAY, timeFrom: '21:37',
    amount: tot, remaining: rem, storage: 'Ngăn mát', status: 'Đang bảo quản',
    expireDateTime: EXP, note: '',
    containerId: kind === 'tui' ? 'c_tui' : 'c_timmap', containerKind: kind, containerName: name
  }, opt || {});
}
function baseDb(extra) {
  return Object.assign({
    settings: { mcMigratedV1: true }, careEvents: [], milkContainers: C,
    milkInventory: [bag('B1', 'Tím mập 🟣', 'binh', 120, 120), bag('T1', '260726-2306', 'tui', 150, 150)],
    milestones: [], diary: [], appointments: [], pregnancy: [], baby: [], mom: [], healthBook: []
  }, extra || {});
}

console.log('\n[1] Thẻ kho sữa — bỏ lặp ml và đảo vị trí');
{
  const w = boot(baseDb());
  const b = w.load().milkInventory[0];
  const html = w.milkBagHtml(b, 0);

  const nAmt = (html.match(/120\s*\/\s*120\s*ml/g) || []).length + (html.match(/120\/120ml/g) || []).length;
  eq('số ml chỉ xuất hiện ĐÚNG MỘT LẦN', nAmt, 1);
  ok('không còn ô "Dung tích" trùng lặp', !/Dung tích/.test(html), html.slice(0, 300));
  ok('không còn ô "Vị trí" riêng (đã gộp vào dòng meta)', !/<small>Vị trí<\/small>/.test(html));
  ok('nơi bảo quản vẫn hiện ở dòng meta', /Ngăn mát/.test(html));

  const top = html.slice(html.indexOf('mbTop'), html.indexOf('mbAmtRow'));
  ok('hàng tiêu đề chứa thời gian còn lại', /mbBadge/.test(top), top.slice(0, 200));
  ok('hàng tiêu đề KHÔNG còn số ml', !/120/.test(top), top.slice(0, 200));
  ok('số ml nằm ở dòng riêng bên dưới', /mbAmtRow[\s\S]*120 \/ 120 ml/.test(html));
  ok('dòng ml có nhãn loại Bình', /mbAmtRow[\s\S]*?mkKind b[\s\S]*?Bình/.test(html));
}
{
  const w = boot(baseDb());
  const t = w.load().milkInventory[1];
  const html = w.milkBagHtml(t, 1);
  ok('mục loại Túi hiện nhãn Túi', /mkKind t[\s\S]*?Túi/.test(html));
  ok('không gọi nhầm túi thành bình', !/mkKind b/.test(html));
}
{
  const db = baseDb();
  db.milkInventory[0].note = 'sữa hơi vàng';
  const w = boot(db);
  const html = w.milkBagHtml(w.load().milkInventory[0], 0);
  ok('có ghi chú thì vẫn hiện lưới ghi chú', /mbGrid[\s\S]*sữa hơi vàng/.test(html));
  const w2 = boot(baseDb());
  ok('không ghi chú thì bỏ hẳn lưới cho gọn', !/mbGrid/.test(w2.milkBagHtml(w2.load().milkInventory[0], 0)));
}
{
  const w = boot(baseDb());
  eq('đếm tách bình và túi', w.milkKindCountText(w.load().milkInventory), '1 bình · 1 túi');
  eq('toàn bình thì nói bình', w.milkKindCountText([bag('a', 'x', 'binh', 1, 1), bag('b', 'y', 'binh', 1, 1)]), '2 bình');
  eq('toàn túi thì nói túi', w.milkKindCountText([bag('a', 'x', 'tui', 1, 1)]), '1 túi');
}

console.log('\n[2] Chi tiết Bé bú — đúng loại và in đậm ml');
{
  const feed = {
    id: 'CE_1', type: 'feed', date: TODAY, startDate: TODAY, timeFrom: '23:24', source: 'stored',
    amount: 60, unit: 'ml', _idx: 0,
    milkSources: [{ bagId: 'B1', usedMl: 60, remainderAction: 'keep', discardMl: 0 }],
    extra: { takenMl: 60, milkSources: [{ bagId: 'B1', usedMl: 60, remainderAction: 'keep', discardMl: 0 }] }
  };
  const db = baseDb({ careEvents: [feed] });
  db.milkInventory[0].remaining = 60;
  const w = boot(db);
  const html = w.careRecordCardHtml(w.load(), Object.assign({ _idx: 0 }, feed), 'feed', TODAY);

  ok('không còn ghi cứng chữ "Túi" trước tên', !/>Túi <b>/.test(html), html.slice(0, 400));
  ok('hiện nhãn loại Bình', /mkKind b[\s\S]*?Bình/.test(html));
  ok('vẫn hiện tên bình', /Tím mập/.test(html));
  ok('số ml của cữ bú được in đậm', /careRecStrong/.test(html), html.slice(0, 500));
  ok('ml vẫn đúng giá trị', /60 ml/.test(html));
}
{
  const feed = {
    id: 'CE_2', type: 'feed', date: TODAY, startDate: TODAY, timeFrom: '14:23', source: 'stored',
    amount: 90, unit: 'ml', _idx: 0,
    milkSources: [{ bagId: 'T1', usedMl: 90, remainderAction: 'keep', discardMl: 0 }],
    extra: { takenMl: 90, milkSources: [{ bagId: 'T1', usedMl: 90, remainderAction: 'keep', discardMl: 0 }] }
  };
  const w = boot(baseDb({ careEvents: [feed] }));
  const html = w.careRecordCardHtml(w.load(), Object.assign({ _idx: 0 }, feed), 'feed', TODAY);
  ok('nguồn là túi thì hiện nhãn Túi', /mkKind t[\s\S]*?Túi/.test(html));
}
{
  const direct = { id: 'CE_3', type: 'feed', date: TODAY, startDate: TODAY, timeFrom: '23:13', source: 'direct', amount: 0, unit: 'ml', _idx: 0, extra: {} };
  const w = boot(baseDb({ careEvents: [direct] }));
  const html = w.careRecordCardHtml(w.load(), Object.assign({ _idx: 0 }, direct), 'feed', TODAY);
  ok('bú trực tiếp không số ml thì không in đậm nhầm', !/careRecStrong/.test(html));
}

console.log('\n[3] Form thay tã — một ô số lượng, giới hạn 1–3');
{
  const w = boot(baseDb());
  const d = w.document;
  w.openCareFormModal('diaper');

  ok('có ô số lượng dạng stepper', !!d.querySelector('.diaperStep'));
  ok('bỏ hẳn dãy nút 1/2/3/+ cũ', !d.querySelector('.diaperQtyPreset'));
  eq('mặc định là 1', d.getElementById('diaperQtyDisplay').textContent, '1');
  eq('giá trị lưu cũng là 1', d.getElementById('cAmount').value, '1');
  ok('nút − bị khoá ở mức 1', d.getElementById('diaperMinus').disabled === true);
  ok('nút + đang mở', d.getElementById('diaperPlus').disabled === false);

  w.diaperStepAmount(1);
  eq('bấm + lên 2', d.getElementById('diaperQtyDisplay').textContent, '2');
  ok('nút − mở lại', d.getElementById('diaperMinus').disabled === false);

  w.diaperStepAmount(1);
  eq('bấm + lên 3', d.getElementById('diaperQtyDisplay').textContent, '3');
  ok('chạm trần thì khoá nút +', d.getElementById('diaperPlus').disabled === true);

  w.diaperStepAmount(1);
  eq('không vượt quá 3', d.getElementById('cAmount').value, '3');

  w.diaperStepAmount(-1); w.diaperStepAmount(-1); w.diaperStepAmount(-1);
  eq('không xuống dưới 1', d.getElementById('cAmount').value, '1');

  w.diaperSetAmount(9);
  eq('nhập thẳng số lớn cũng bị kẹp về 3', d.getElementById('cAmount').value, '3');
  ok('nhắc rõ giới hạn trên giao diện', /tối đa 3/.test(d.querySelector('.diaperStep').innerHTML));
}
{
  // lưu thật và kiểm tra dữ liệu
  const w = boot(baseDb());
  const d = w.document;
  w.openCareFormModal('diaper');
  w.selectDiaperType('dirty');
  w.diaperStepAmount(1);
  w.saveCareEvent();
  const ev = w.load().careEvents[0];
  eq('lưu đúng số lượng', ev.amount, 2);
  eq('lưu đúng loại tã', ev.extra.diaperType, 'dirty');
  eq('tã bẩn tự cộng đi tè', w.diaperPeeCount(ev), 2);
  eq('tã bẩn tự cộng đi phân', w.diaperPoopCount(ev), 2);
}
{
  // sửa bản ghi cũ có số lượng > 3 (dữ liệu cũ) thì không được vỡ
  const old = { id: 'CE_9', type: 'diaper', date: TODAY, startDate: TODAY, timeFrom: '10:00', amount: 5, unit: 'tã', extra: { diaperType: 'wet' } };
  const w = boot(baseDb({ careEvents: [old] }));
  const d = w.document;
  w.openCareFormModal('diaper', 0);
  ok('mở sửa được, không lỗi', d.getElementById('careFormOverlay').classList.contains('show'));
  ok('số lượng bị kẹp về mức tối đa mới', Number(d.getElementById('cAmount').value) <= 3);
}

console.log('\n[4] Hồi quy');
{
  const w = boot(baseDb());
  const d = w.document;
  ok('Chuyển sữa còn nguyên', typeof w.tfOpen === 'function');
  ok('Danh mục bình/túi còn nguyên', typeof w.mcSelectableList === 'function');
  ok('Tự gắn túi còn nguyên', typeof w.abCompute === 'function');
  ok('Hoàn tác còn nguyên', typeof w.udUndo === 'function');

  w.renderCareStatDetail('milk', TODAY);
  const box = d.getElementById('careDetailOverlay').innerHTML;
  ok('popup kho sữa mở và vẽ được', /Danh sách bình \/ túi/.test(box));
  ok('tiêu đề không còn gọi tất cả là túi', !/Danh sách túi sữa/.test(box));
  ok('gợi ý thao tác nhắc cả nút Chuyển', /Chuyển/.test(box));

  w.openCareFormModal('feed');
  d.getElementById('cFeedSource').value = 'stored';
  w.toggleFeedSourceFields();
  d.getElementById('cAmount').value = '60';
  w.abOnAmountInput();
  eq('tự gắn bình vẫn chạy', w.milkFeedSourcesState().length, 1);
  w.saveCareEvent();
  eq('lưu cữ bú và trừ kho đúng', w.load().milkInventory.find(b => b.id === 'B1').remaining, 60);
}

console.log('\n=========================================');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
console.log('=========================================');
process.exit(fail ? 1 : 0);
