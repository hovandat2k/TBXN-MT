const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const listeners = {};
const context = {
  console, AbortController, setTimeout: () => 0, clearTimeout() {},
  $: selector => ({ addEventListener(type, fn) { listeners[selector + ':' + type] = fn; } }),
};
vm.createContext(context);
for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
function functionSource(name) {
  const start = html.indexOf('function ' + name + '(');
  assert(start >= 0, name);
  return html.slice(html.slice(start - 6, start) === 'async ' ? start - 6 : start, html.indexOf('\n}', start) + 2);
}
vm.runInContext(`
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const nameKey = s => norm(s).replace(/[^a-z0-9]+/g, ' ').trim();
  const PF = ['xanh','noi','chin'];
`, context);
vm.runInContext(html.match(/^const reDate = .*$/m)[0], context);
for (const fn of ['parseKg', 'parsePct', 'pcts', 'fixDate', 'normalizeReadNote', 'mergeSourceNotes']) vm.runInContext(functionSource(fn), context);
for (const fn of ['cleanText', 'cleanNum', 'softRow', 'median', 'softLines', 'mergeSoftDateWords', 'parseSoftNoHeader']) vm.runInContext(functionSource(fn), context);
for (const name of ['numOf', 'fmtKg', 'fmtPctIn']) vm.runInContext(html.match(new RegExp('^const ' + name + ' = .*$', 'm'))[0], context);
{
  const parsed = context.softRow(key => ({ stt: '21', soxe: '82C 05525', khach: 'A HINH KONTUM', hang: 'CÀ ARABICA QUẢ TƯƠI', tl1: '11,610', tl2: '4,110', tlh: '7,500', ngayra: '25/10/2026', giora: '00.09:08...', kieu: 'NHẬP HÀNG', ghichu: '46C-16N (1 BAO RỖ)' }[key] || ''));
  assert.equal(parsed.chin, '46'); assert.equal(parsed.noi, '16');
  assert.equal(parsed.ghichu, '1 BAO RỖ'); assert.equal(parsed.gio, '09:08');
  assert.equal(context.pcts(parsed).x, 38);
}
const merge = context.mergeSourceNotes;
if (process.env.DUAL_SOURCE_SAMPLE) {
  const base = JSON.parse(fs.readFileSync(process.env.DUAL_SOURCE_SAMPLE, 'utf8'));
  const before = base.map(r => JSON.stringify(r));
  const notes = base.filter(r => r.soxe !== '49C 15867').reverse().map(r => ({ ...r, thuc: r.tlh, bi: '', xanh: '20', noi: '18', chin: '', ghichu: '' }));
  const sample = notes.find(r => r.soxe === '82C 05525');
  Object.assign(sample, { xanh: '', noi: '16', chin: '46' });
  const result = merge(base, notes);
  assert.equal(base.length, 27); assert.equal(result.matched, 26); assert.equal(result.unresolved.length, 1);
  base.forEach((r, i) => { const original = JSON.parse(before[i]); for (const key of Object.keys(original)) assert.equal(r[key], original[key]); });
  assert.equal(context.pcts(base.find(r => r.soxe === '82C 05525')).x, 38);
  assert.equal(base.reduce((sum, r) => sum + context.parseKg(r.thuc), 0), 233150);
  console.log('PASS: PDF fixture, 27 base vehicles, 26 matches, one missing vehicle, net total 233,150 kg preserved.');
}
const row = o => ({ soxe: '82C 05525', date: '25/10/2026', gio: '09:08:43', khach: 'A HINH KONTUM', tlh: '7,500', bi: '38', thuc: '7,462', flags: {}, ...o });
const note = o => row({ soxe: '82C-055.25', gio: '09:08', thuc: '7,500', xanh: '', noi: '16', chin: '46', ghichu: '1 bao rỗ', ...o });
{
  for(const text of ['(1 BAO RỖ)','1 (BAO) RỖ','(1 BAO RỖ']){
    const r=context.normalizeReadNote({ghichu:text,flags:{}});
    assert.equal(r.ghichu,'1 BAO RỖ');assert.equal(r.flags.ghichu,undefined);
  }
  for(const text of ['(1 BAO RỖ 2 XANH N...)','1 BAO…','...']){
    const parsed=context.softRow(k=>({tlh:'2,020',khach:'Demo',ghichu:'21N 30C '+text}[k]||''));
    assert.equal(parsed.flags.ghichu,true);assert(!/[()]/.test(parsed.ghichu));
    const base=[row({})];assert.equal(merge(base,[note({ghichu:parsed.ghichu,flags:parsed.flags})]).matched,1);
    assert.equal(base[0].flags.ghichu,true);assert.equal(base[0].thuc,'7,462');
    base[0].ghichu='Đã sửa đầy đủ';context.normalizeReadNote(base[0]);assert.equal(base[0].flags.ghichu,undefined);
  }
}
{
  const words = (tokens,y) => { let x=0; return tokens.map(t=>{const w={t,x0:x,x1:x+t.length*8,y0:y,y1:y+20,h:20,cy:y+10,cx:x+t.length*4};x=w.x1+5;return w;}); };
  for(const dateTokens of [['25/','1','0/2026'],['25/1','0/2026'],['25/1 0/2026']]){
    const first=['23','49C','26220','DEMO','CÀ','ARABICA','QUẢ','TƯƠI','4,140','2/120','2,020','25/10/2026','00.18:50',...dateTokens,'00.19:00','NHẬP','HÀNG','21N','30C'];
    const second=['24','49C','12345','DEMO','CÀ','ARABICA','QUẢ','TƯƠI','7,460','5,480','1,980','25/10/2026','00.21:35','25/10/2026','00.21:58','NHẬP','HÀNG','20N','32C'];
    const parsed=context.parseSoftNoHeader([...words(first,0),...words(second,35)]);
    assert.equal(parsed.length,2);assert.equal(parsed[0].gio,'19:00');assert.equal(parsed[0].tl2,'2,120');
    const base=[row({soxe:'49C 26220',gio:'19:00:26',tlh:'2,020',bi:'11',thuc:'2,009'})];
    assert.equal(merge(base,parsed).matched,1);
    assert.equal(base[0].noi,'21');assert.equal(base[0].chin,'30');assert.equal(context.pcts(base[0]).x,49);
    assert.equal(base[0].thuc,'2,009');assert.equal(base[0].bi,'11');
  }
  const far=words(['25/','10/2026'],0);far[1].x0+=500;far[1].x1+=500;
  assert.equal(context.mergeSoftDateWords(far).length,2,'do not join unrelated columns');
}
{
  const base = [row({})], original = { ...base[0] };
  const report = merge(base, [note({})]);
  assert.equal(report.matched, 1);
  for (const key of ['khach', 'date', 'gio', 'tlh', 'bi', 'thuc']) assert.equal(base[0][key], original[key]);
  assert.equal(context.pcts(base[0]).x, 38);
  assert.equal(base[0].ghichu, '1 bao rỗ');
  assert.equal(base[0].flags.noi, undefined);
}
{
  // Dạng 2 xáo trộn thứ tự và có xe ngoài danh sách: chỉ bổ sung đúng xe.
  const base = [row({}), row({ soxe: '49C 13606', date: '24/10/2026', gio: '21:38:18' })];
  const report = merge(base, [note({ soxe: '49C13606', date: '24/10/2026', gio: '21:38', xanh: '20', noi: '18', chin: '', ghichu: '' }), note({}), note({ soxe: '99C99999' })]);
  assert.equal(report.matched, 2); assert.equal(base.length, 2); assert.equal(report.unmatchedNotes, 1);
  assert.equal(context.pcts(base[1]).c, 62);
}
{
  const base = [row({}), row({ khach: 'Xe trùng' })];
  const report = merge(base, [note({})]);
  assert.equal(report.matched, 0); assert.equal(report.unresolved.length, 2);
}
{
  const base = [row({})];
  const report = merge(base, [note({ date: '24/10/2026' }), note({ gio: '09:09' })]);
  assert.equal(report.matched, 0); assert.equal(report.unmatchedNotes, 2);
}
{
  const base = [row({})];
  assert.equal(merge(base, [note({}), note({})]).matched, 1);
  const conflict = [row({})];
  assert.equal(merge(conflict, [note({}), note({ noi: '17' })]).conflicts, 1);
  assert.equal(conflict[0].noi, undefined);
}
{
  const base = [row({}), row({ gio: '10:08', tlh: '8,000' })];
  assert.equal(merge(base, [note({ gio: '', tlh: '8,000' })]).matched, 1);
  assert.equal(base[1].noi, '16'); assert.equal(base[0].noi, undefined);
}
// Thất bại ở nguồn thứ hai không được thay bảng đang làm.
const elements = new Map();
const element = selector => {
  if (!elements.has(selector)) elements.set(selector, { files: [], checked: false, hidden: false, addEventListener(type, fn) { listeners[selector + ':' + type] = fn; }, scrollIntoView() {} });
  return elements.get(selector);
};
Object.assign(context, { $: element, window: {}, busy: false, rows: [{ id: 'existing' }], crops: {}, progress() {}, toast() {}, endJob() {}, startJob() {}, StopErr: class StopErr extends Error {} });
context.IMPORT_CONTROLS = ['#dualRead','#baseFiles','#noteFiles','#pasteBtn','#pickBtn'];
context.sourceFiles = source => [...element(source === 'base' ? '#baseFiles' : '#noteFiles').files];
const pipelineStart = html.indexOf("$('#dualRead').addEventListener('click'");
const pipelineEnd = html.indexOf('\n\nfunction handleFile', pipelineStart);
vm.runInContext(html.slice(pipelineStart, pipelineEnd), context);
element('#baseFiles').files = [{}]; element('#noteFiles').files = [{}];
context.readSourceFiles = async (_, notesOnly) => { if (notesOnly) throw new Error('unreadable'); return [row({})]; };
(async () => {
  await listeners['#dualRead:click']();
  assert.equal(context.rows[0].id, 'existing');
  assert.equal(context.busy, false);
  assert.equal(element('#dualRead').disabled, false);
  // PDF nhiều trang: trang 2 không lặp Ngày cân, bỏ qua ngày ở tiêu đề khoảng báo cáo.
  Object.assign(context, { job: {}, check() {}, isPdf: () => true,
    pdfToImages: async () => [{ printedDates: ['24/10/2026', '25/10/2026'], n: 1 }, { printedDates: [], n: 2 }],
    readSheet: async page => ({ rows: [row({ date: page.n === 1 ? '25/10/2026' : '24/10/2026' })] }) });
  vm.runInContext(functionSource('readSourceFiles'), context);
  const pages = await context.readSourceFiles([{ name: 'report.pdf' }], false);
  assert.equal(pages[1].date, '25/10/2026');
  console.log('PASS: syntax, matching, weights preserved, missing/duplicate/conflicting rows, atomic import failure.');
})().catch(error => { console.error(error); process.exitCode = 1; });
