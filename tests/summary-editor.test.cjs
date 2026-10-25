const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
for (const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(m[1]);
function source(name) {
  const start = html.indexOf('function ' + name + '(');
  assert(start >= 0, name);
  return html.slice(start, html.indexOf('\n}', start) + 2);
}
const context = { console };
vm.createContext(context);
vm.runInContext("const PF=['xanh','noi','chin']; const isPF=f=>PF.includes(f); const NUMF=new Set(['tl1','tl2','tlh','bi','thuc']);", context);
for (const name of ['parseKg','parsePct','pcts','fixDate']) vm.runInContext(source(name), context);
const plannerStart = html.indexOf('const SUMMARY_FIELDS =');
const plannerEnd = html.indexOf('var APP =', plannerStart);
vm.runInContext(html.slice(plannerStart, plannerEnd), context);
const plan = (drafts, originals, db) => context.planSummaryEdits(drafts, originals, db, '25/10/2026 20:00', () => 'M-new');
const row = (id, batch = 'L1') => ({ batch, rid: id, date: '25/10/2026', gio: '19:30', soxe: '49C12345', khach: 'Demo', tl1: 11000, tl2: 3500, tlh: 7500, bi: 38, thuc: 7462, xanh: 38, noi: 16, chin: 46, ghichu: '', savedAt: 'old', savedBy: 'admin' });
const sheet = r => ({ ...r, thuhoi: '', sid: '' });
const clone = value => JSON.parse(JSON.stringify(value));
{
  const db = { rows: [row('R1'), row('R2'), row('hidden'), row('R3', 'L2')], samples: [] };
  const original = db.rows.filter(r => r.rid !== 'hidden').map(sheet), drafts = clone(original), saved = JSON.stringify(db);
  drafts[0].khach = 'Demo\nDòng thứ hai'; drafts[0].ghichu = 'Bao rỗ\nGhi chú thêm';
  drafts[1].thuc = '7,400'; drafts[2].soxe = '82C 05525';
  const p = plan(drafts, original, db);
  assert.equal(p.count, 3); assert.equal(p.batches.length, 2);
  const batch = p.batches.find(op => op.batch.id === 'L1').batch;
  assert.equal(batch.rows.length, 3); assert.equal(batch.rows[0].khach, 'Demo\nDòng thứ hai');
  assert.equal(batch.rows[0].ghichu, 'Bao rỗ\nGhi chú thêm'); assert.equal(batch.rows[1].thuc, 7400);
  assert.equal(batch.rows.find(r => r.rid === 'hidden').thuc, 7462);
  assert.equal(JSON.stringify(db), saved, 'planning must not mutate live data');
  assert.equal(p.samples.length, 0);
}
{
  const db = { rows: [row('R1')], samples: [{ id: 'M1', rid: 'R1', klTuoi: 7462, khach: 'Demo', thuhoi: 5.2, kl: 400, am: 14 }] };
  const original = [{ ...sheet(db.rows[0]), sid: 'M1', thuhoi: '5.2' }], drafts = clone(original);
  drafts[0].bi = '40'; drafts[0].thuhoi = '5,4';
  const p = plan(drafts, original, db);
  assert.equal(p.batches[0].batch.rows[0].thuc, 7460);
  assert.equal(p.samples[0].klTuoi, 7460); assert.equal(p.samples[0].thuhoi, 5.4);
  assert.equal(p.samples[0].kl, 400, 'raw sample measurements preserved');
  assert.equal(p.samples[0].id, 'M1');
}
{
  const db = { rows: [row('R1')], samples: [] }, original = db.rows.map(sheet), drafts = clone(original);
  drafts[0].thuhoi = 'x';
  const p = plan(drafts, original, db);
  assert.equal(p.batches.length, 0); assert.equal(p.samples[0].thuhoi, 'x');
  assert.equal(p.samples[0].rid, 'R1');
}
{
  const db = { rows: [row('R1')], samples: [] }, original = db.rows.map(sheet);
  for (const [key, value] of [['thuc','1\n2'], ['thuhoi','5abc'], ['date','31/02/2026'], ['gio','25:00'], ['xanh','101'], ['xanh','40']]) {
    const drafts = clone(original); drafts[0][key] = value;
    assert.throws(() => plan(drafts, original, db), undefined, `${key}: ${value}`);
  }
  assert.equal(db.rows[0].thuc, 7462);
  const drafts = clone(original); drafts[0].tl1 = '11,200'; drafts[0].thuc = '7000';
  const p = plan(drafts, original, db);
  assert.equal(p.batches[0].batch.rows[0].tlh, 7700);
  assert.equal(p.batches[0].batch.rows[0].thuc, 7000, 'explicit net-weight edit wins');
}
{
  const db = { rows: [], samples: [{ id: 'F1', khach: 'Free', klTuoi: 1000, thuhoi: 5 }] };
  const original = [{ rid: '', sid: 'F1', khach: 'Free', thuc: '1,000', thuhoi: '5' }], drafts = clone(original);
  drafts[0].khach = 'Free\nSample'; drafts[0].thuc = '1200';
  const p = plan(drafts, original, db);
  assert.equal(p.batches.length, 0); assert.equal(p.samples[0].khach, 'Free\nSample'); assert.equal(p.samples[0].klTuoi, 1200);
}
{
  const grid = context.parseSummaryPaste('"Khách\nDòng hai"\t"Ghi ""chú"""\r\nXe hai\t5000\r\n');
  assert.equal(grid.length, 2); assert.equal(grid[0][0], 'Khách\nDòng hai'); assert.equal(grid[0][1], 'Ghi "chú"'); assert.equal(grid[1][1], '5000');
}
{
  const header = { cols: ['stt','khach','gio','xanh','noi','chin'], xs: [0,40,200,300,350,400,450], multiDay: true };
  const original = [{ rid: 'R1', sid: '', khach: 'Demo' }];
  const layout = context.summaryCellLayout(header, [{ r: original[0], y0: 100, yp: 140, y1: 180 }], original);
  assert.equal(layout.length, 6); assert(!layout.some(c => c.f === 'stt' || c.f === 'date'));
  assert.equal(layout.find(c => c.f === 'gio').withDate, true);
  const note = layout.find(c => c.f === 'ghichu');
  assert.equal(note.x0, 300); assert.equal(note.x1, 450); assert.equal(note.y0, 140); assert.equal(note.y1, 180);
  assert.equal(layout.find(c => c.f === 'xanh').y1, 140);
  assert.equal(layout.find(c => c.f === 'khach').y1, 180);
}
// Keyboard event uses actual production handler; no save on input/blur.
const handlers = {}, cells = [];
context.$ = () => ({ addEventListener: (type, callback) => { handlers[type] = callback; }, querySelectorAll: () => cells });
Object.assign(context, { saveSummaryTable() { throw new Error('must not save on Enter'); }, updateSummaryDraft(el) { context.lastValue = el.value; } });
vm.runInContext('let lsEditor={}; let lsSaving=false;', context);
const keyStart = html.indexOf("  $('#lsGrid').addEventListener('keydown'");
const keyEnd = html.indexOf("  $('#lsGrid').addEventListener('paste'", keyStart);
vm.runInContext(html.slice(keyStart, keyEnd), context);
const textarea = { value: 'First', selectionStart: 5, selectionEnd: 5, dataset: { ri: '0', f: 'khach' }, matches: () => true, setRangeText(text, a, b) { this.value = this.value.slice(0,a) + text + this.value.slice(b); } };
let prevented = false;
handlers.keydown({ target: textarea, key: 'Enter', shiftKey: true, preventDefault() { prevented = true; } });
assert(prevented); assert.equal(textarea.value, 'First\n'); assert.equal(context.lastValue, 'First\n');
let focused = false;
cells.push(textarea, { dataset: { ri: '1', f: 'khach' }, focus() { focused = true; }, select() {} });
handlers.keydown({ target: textarea, key: 'Enter', shiftKey: false, preventDefault() {} }); assert(focused);
Object.assign(context, { fitSummaryCell() {}, summaryEditStatus() {} });
const draftStart = html.indexOf('  function updateSummaryDraft('), draftEnd = html.indexOf("  $('#lsEdit').addEventListener", draftStart);
vm.runInContext(html.slice(draftStart, draftEnd), context);
vm.runInContext("lsEditor={original:[{gio:'23:30',date:'24/10/2026'}],drafts:[{gio:'23:30',date:'24/10/2026'}]};", context);
context.updateSummaryDraft({ value: '23:31\n24/10/2026', matches: () => true, dataset: { ri: '0', f: 'gio', withDate: '1' }, classList: { toggle() {} } });
assert.equal(vm.runInContext('lsEditor.drafts[0].gio',context), '23:31');
assert.equal(vm.runInContext('lsEditor.drafts[0].date',context), '24/10/2026');
assert(!html.includes('Shift + Enter: xuống dòng trong ô · Enter: ô bên dưới'), 'remove muted instructions');
console.log('PASS: bulk plans, hidden rows, multiline text, validation, linked samples, Excel paste, Shift+Enter and Enter navigation.');
