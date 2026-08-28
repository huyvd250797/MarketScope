/* Tái hiện bug: bấm "Chuyển" trong popup chi tiết Kho sữa nhưng không thấy giao diện chuyển sữa */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const DIR = process.argv[2] || __dirname;
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
/* đọc z-index thẳng từ CSS trong index.html cho chắc chắn, không phụ thuộc engine CSS của jsdom */
function cssZ(selector) {
  const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{[^}]*?z-index:(\\d+)');
  const m = html.match(re);
  return m ? Number(m[1]) : null;
}

const T = new Date();
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const TODAY = iso(T);
function expIn(h) { const d = new Date(Date.now() + h * 3600000); return iso(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }

const CONTAINERS = [
  { id: 'c_binhtim', name: 'Bình tím mập', kind: 'binh', capacity: 200, active: true },
  { id: 'c_unimom', name: 'Túi Unimom', kind: 'tui', capacity: 0, active: true }
];
function db1() {
  return {
    settings: { mcMigratedV1: true }, careEvents: [], milkContainers: CONTAINERS,
    milkInventory: [{
      id: 'B1', shortId: 'B1', date: TODAY, startDate: TODAY, timeFrom: '08:00',
      amount: 160, remaining: 160, storage: 'Ngăn mát', status: 'Đang bảo quản',
      expireDateTime: expIn(96), note: '',
      containerId: 'c_binhtim', containerKind: 'binh', containerName: 'Bình tím mập'
    }],
    milestones: [], diary: [], appointments: [], pregnancy: [], baby: [], mom: [], healthBook: []
  };
}

console.log('\n[A] Xếp lớp popup — nguyên nhân gốc');
{
  const zTf = cssZ('.tfOverlay');
  const zDetail = cssZ('.careDetailOverlay');
  const zForm = cssZ('.careFormOverlay');
  const zPicker = cssZ('.milkBagPickerOverlay');
  const zBk = cssZ('.bkOverlay');
  console.log('    z-index: tfOverlay=' + zTf + ' careDetailOverlay=' + zDetail + ' careFormOverlay=' + zForm + ' picker=' + zPicker + ' backup=' + zBk);
  ok('popup Chuyển sữa phải nằm TRÊN popup chi tiết Kho sữa', zTf > zDetail, 'tf=' + zTf + ' detail=' + zDetail);
  ok('popup Chuyển sữa phải nằm trên popup chọn túi sữa', zTf > zPicker, 'tf=' + zTf + ' picker=' + zPicker);
  ok('popup Chuyển sữa phải nằm trên form ghi nhận', zTf > zForm, 'tf=' + zTf + ' form=' + zForm);
}

console.log('\n[B] Bấm nút Chuyển ngay trong popup chi tiết Kho sữa');
{
  const w = boot(db1());
  const d = w.document;
  w.renderCareStatDetail('milk', TODAY);
  const overlay = d.getElementById('careDetailOverlay');
  ok('popup chi tiết Kho sữa mở được', overlay && overlay.classList.contains('show'));

  const btn = d.querySelector('#careDetailOverlay .milkSwipeTransfer');
  ok('trong popup chi tiết có nút Chuyển', !!btn);

  /* chạy đúng đoạn onclick mà trình duyệt sẽ chạy */
  const code = btn ? btn.getAttribute('onclick') : '';
  ok('nút Chuyển gọi tfOpen', /tfOpen\(/.test(code), code);
  try { w.eval('(function(event){' + code + '})({stopPropagation:function(){}})') } catch (e) { console.log('    !! ' + e.message) }

  const tf = d.getElementById('tfOverlay');
  ok('popup Chuyển sữa hiện ra', tf && tf.classList.contains('show'));
  ok('popup nạp đúng thông tin túi nguồn', /Bình tím mập/.test(d.getElementById('tfSourceBox').innerHTML));
}

console.log('\n[C] Vừa vuốt xong bấm ngay vào Chuyển');
{
  const w = boot(db1());
  const d = w.document;
  w.showPage('milkInventory');
  w.renderMilkInventory(w.load());
  w.__milkSwipeLock = true;              // khoá vừa được đặt sau cú vuốt
  w.tfOpen(0);
  ok('vẫn mở được popup dù khoá vuốt còn hiệu lực', d.getElementById('tfOverlay').classList.contains('show'));
}

console.log('\n[D] Chuyển sữa xong thì popup chi tiết phía sau phải cập nhật');
{
  const w = boot(db1());
  const d = w.document;
  w.renderCareStatDetail('milk', TODAY);
  w.tfOpen(0);
  w.tfPickKind('tui');
  w.tfPickTarget('c_unimom');
  d.getElementById('tfAmount').value = '160';
  w.tfSyncPreview();
  w.tfConfirm();

  eq('dữ liệu đã chuyển đúng', w.load().milkInventory.find(b => b.id === 'B1').remaining, 0);
  ok('popup chuyển sữa đã đóng', !d.getElementById('tfOverlay').classList.contains('show'));
  const body = d.getElementById('careDetailOverlay').innerHTML;
  ok('danh sách kho sữa phía sau đã cập nhật', /Đã chuyển hết/.test(body), 'không thấy trạng thái mới trong popup chi tiết');
}

console.log('\n[E] Đóng popup không được mở khoá cuộn nền khi popup khác còn mở');
{
  const w = boot(db1());
  const d = w.document;
  w.renderCareStatDetail('milk', TODAY);
  const lockedBefore = d.body.className;
  w.tfOpen(0);
  w.tfClose();
  ok('popup chi tiết vẫn đang mở', d.getElementById('careDetailOverlay').classList.contains('show'));
  eq('trạng thái khoá cuộn nền không bị phá', d.body.className, lockedBefore);
}

console.log('\n=========================================');
console.log('PASS: ' + pass + '   FAIL: ' + fail);
console.log('=========================================');
process.exit(fail ? 1 : 0);
