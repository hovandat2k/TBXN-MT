/**
 * Cà tươi + Thu hồi  ·  Máy chủ lưu dữ liệu vào Google Drive (có đăng nhập)
 * ------------------------------------------------------------------
 * Cách cài / cập nhật:
 *  1. Mở dự án Apps Script (https://script.google.com), xoá hết nội dung cũ, dán TOÀN BỘ tệp này, bấm 💾 Lưu.
 *  2. Lần đầu: "Triển khai" → "Tùy chọn triển khai mới" → loại "Ứng dụng web"
 *       - Thực thi dưới dạng: Tôi        - Người có quyền truy cập: Bất kỳ ai
 *     Đã triển khai rồi: "Triển khai" → "Quản lý các tùy chọn triển khai" → ✏️ → Phiên bản: "Phiên bản mới" → Triển khai
 *     (giữ nguyên URL …/exec cũ).
 *
 * Tài khoản đăng nhập: sheet "User" trong Google Sheet "Dữ liệu Cà Tươi + Thu Hồi" (thư mục "Cà Tươi + Thu Hồi").
 *   Cột: Tên đăng nhập | Mật khẩu | Quyền | Họ tên | Khoá
 *   Quyền:  "Toàn quyền"  – dùng mọi chức năng
 *           "Thu hồi"     – chỉ nhập / lưu mẫu thu hồi
 *   Khoá:   ghi "x" để tạm khoá tài khoản.
 *   Lần đầu chạy sẽ tạo sẵn tài khoản:  admin / doimatkhau  (Toàn quyền) — hãy đổi mật khẩu ngay trong sheet.
 *   Đổi mật khẩu hoặc khoá tài khoản thì người đó phải đăng nhập lại.
 */

const THU_MUC = 'Cà Tươi + Thu Hồi';
const TEN_SHEET = 'Dữ liệu Cà Tươi + Thu Hồi';
const HAN_DANG_NHAP_NGAY = 30;              // số ngày giữ đăng nhập trên mỗi máy
const QUYEN_TOAN = 'Toàn quyền', QUYEN_TH = 'Thu hồi', QUYEN_XEM = 'Chỉ xem';

const COT_TUOI = [
  ['batch', 'Mã lô'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['gio', 'Giờ cân'], ['stt', 'STT'], ['soxe', 'Số xe'],
  ['hang', 'Hàng hóa'], ['khach', 'Khách hàng'], ['tl1', 'TL Lần 1'], ['tl2', 'TL Lần 2'], ['tlh', 'TL Hàng'], ['bi', 'TL Bì'],
  ['thuc', 'TL Thực'], ['xanh', 'Xanh (%)'], ['noi', 'Nổi (%)'], ['chin', 'Chín (%)'], ['ghichu', 'Ghi chú'], ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu']
];
const COT_THUHOI = [
  ['id', 'Mã mẫu'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['khach', 'Khách hàng'], ['soxe', 'Số xe'], ['klTuoi', 'KL cà tươi (kg)'],
  ['mau', 'Loại mẫu'], ['kl', 'KL (g)'], ['klq', 'KL quả (g)'], ['am', 'Độ ẩm'], ['thuhoi', 'Thu hồi (kg)'], ['cachtinh', 'Cách tính'],
  ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu'], ['nhom', 'Mẫu chung (mã nhóm)']
];
const COT_USER = [['user', 'Tên đăng nhập'], ['pass', 'Mật khẩu'], ['role', 'Quyền'], ['name', 'Họ tên'], ['lock', 'Khoá']];
// cột luôn để dạng chữ (tránh Sheets tự đổi ngày/giờ/số xe/mật khẩu)
const CHU = ['nhom', 'batch', 'rid', 'date', 'gio', 'stt', 'soxe', 'hang', 'khach', 'ghichu', 'savedAt', 'savedBy', 'id', 'mau', 'cachtinh', 'user', 'pass', 'role', 'name', 'lock'];

function doGet(e) { return tra({ ok: true, app: 'Cà tươi + Thu hồi', note: 'Máy chủ đang chạy. Hãy mở trang web để dùng.' }); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return tra({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  return xuLy(p);
}

function xuLy(p) {
  try {
    const b = bangTinh();
      if (p.action === 'login') return tra(dangNhap(b, p));
      const u = xacThuc(b, p.token);
      if (!u) return tra({ ok: false, auth: true, error: 'Phiên đăng nhập đã hết hạn — hãy đăng nhập lại' });
      const role = u.role;
      switch (p.action) {
        case 'ping': return tra({ ok: true, user: u.user, name: u.name, role: role, folderUrl: role === QUYEN_TOAN ? thuMucGoc().getUrl() : '', sheetUrl: role === QUYEN_TOAN ? b.ss.getUrl() : '' });
        case 'list': return tra(danhSach(b, role));
        case 'saveFile': return tra(luuPhieu(p, u));
      }
    if (!['saveMany','saveBatch','saveSample','deleteSample'].includes(p.action)) return tra({ ok: false, error: 'Thao tác không hợp lệ: ' + p.action });
    const ops = p.action === 'saveMany' ? p.ops : [p];
    const lock = LockService.getScriptLock(); lock.waitLock(25000);
    let result;
    try { result = luuNhieu(b, ops, u); } finally { lock.releaseLock(); }
    // Tương thích trang cũ: các thao tác Drive chạy sau khi nhả khoá dữ liệu.
    if (p.action !== 'saveMany' && !p.deferFiles){
      for (const target of result.files.filter(x => x.remove)) luuPhieu(target, u);
      const target = result.files.find(x => !x.remove);
      if (p.file && target) result.fileUrl = luuPhieu(Object.assign({}, target, { file: p.file }), u).fileUrl || '';
    }
    return tra(result);
  } catch (err) {
    return tra({ ok: false, error: String(err && err.message || err) });
  }
}
function khongDuQuyen() { return { ok: false, denied: true, error: 'Tài khoản không có quyền làm việc này' }; }
function tra(o) { o.features = { fastSync: true, deferredFiles: true, version: 2 }; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- Đăng nhập ---------------- */
function biMat() {
  const pr = PropertiesService.getScriptProperties();
  let s = pr.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('SECRET', s); }
  return s;
}
function b64(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function ky(s) { return b64(Utilities.computeHmacSha256Signature(s, biMat())); }
function dauVanTay(u) { return ky('pw|' + u.user + '|' + u.pass + '|' + u.role).slice(0, 12); }   // đổi mật khẩu / quyền → phải đăng nhập lại
function taiKhoan(b) {
  return docBang(b.user, COT_USER).map(u => ({ user: String(u.user).trim(), pass: String(u.pass), role: String(u.role).trim(), name: String(u.name || '').trim(), lock: String(u.lock || '').trim() }))
    .filter(u => u.user);
}
function chuanQuyen(r) { const s = String(r || '').toLowerCase(); return /xem/.test(s) ? QUYEN_XEM : /thu\s*h/.test(s) ? QUYEN_TH : /to[aà]n/.test(s) ? QUYEN_TOAN : ''; }
function dangNhap(b, p) {
  const name = String(p.user || '').trim().toLowerCase(), pass = String(p.pass || '');
  const u = taiKhoan(b).find(x => x.user.toLowerCase() === name);
  if (!u || u.pass !== pass) { Utilities.sleep(800); return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }; }
  if (u.lock) return { ok: false, error: 'Tài khoản đang bị khoá' };
  const role = chuanQuyen(u.role);
  if (!role) return { ok: false, error: 'Tài khoản chưa được cấp quyền (cột Quyền: "Toàn quyền", "Thu hồi" hoặc "Chỉ xem")' };
  const body = b64(Utilities.newBlob(JSON.stringify({ u: u.user, f: dauVanTay(u), e: Date.now() + HAN_DANG_NHAP_NGAY * 864e5 })).getBytes());
  return { ok: true, token: body + '.' + ky(body), user: u.user, name: u.name || u.user, role: role };
}
function xacThuc(b, token) {
  const t = String(token || '').split('.');
  if (t.length !== 2 || ky(t[0]) !== t[1]) return null;
  let d; try { d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(t[0])).getDataAsString()); } catch (e) { return null; }
  if (!d || d.e < Date.now()) return null;
  const u = taiKhoan(b).find(x => x.user === d.u);
  if (!u || u.lock || dauVanTay(u) !== d.f) return null;
  const role = chuanQuyen(u.role);
  return role ? { user: u.user, name: u.name || u.user, role: role } : null;
}

/* ---------------- Thư mục, bảng tính ---------------- */
function thuMucGoc() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('APP_FOLDER_ID');
  if (id) { try { const folder = DriveApp.getFolderById(id); if (!folder.isTrashed()) return folder; } catch(e) {} }
  const it = DriveApp.getFoldersByName(THU_MUC);
  const folder = it.hasNext() ? it.next() : DriveApp.createFolder(THU_MUC);
  pr.setProperty('APP_FOLDER_ID', folder.getId()); return folder;
}
function thuMucCon(cha, ten) {
  const it = cha.getFoldersByName(ten);
  return it.hasNext() ? it.next() : cha.createFolder(ten);
}
function bangTinh() {
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('APP_SHEET_ID');
  if (id && pr.getProperty('APP_SCHEMA') === '2'){
    try {
      const ss = SpreadsheetApp.openById(id), tuoi = ss.getSheetByName('Cà tươi'), thuhoi = ss.getSheetByName('Thu hồi'), user = ss.getSheetByName('User');
      if (tuoi && thuhoi && user) return { ss, tuoi, thuhoi, user };
    } catch(e) {}
  }
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { return taoBangTinh(pr); } finally { lock.releaseLock(); }
}
function taoBangTinh(pr) {
  const goc = thuMucGoc();
  const it = goc.getFilesByName(TEN_SHEET);
  let ss;
  if (it.hasNext()) ss = SpreadsheetApp.open(it.next());
  else {
    ss = SpreadsheetApp.create(TEN_SHEET);
    DriveApp.getFileById(ss.getId()).moveTo(goc);
  }
  const a = trang(ss, 'Cà tươi', COT_TUOI), b = trang(ss, 'Thu hồi', COT_THUHOI), u = trang(ss, 'User', COT_USER);
  if (u.getLastRow() < 2) {                                   // tài khoản đầu tiên
    u.getRange(2, 1, 1, COT_USER.length).setValues([['admin', 'doimatkhau', QUYEN_TOAN, 'Quản trị', '']]);
    try { u.getRange(2, 3, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([QUYEN_TOAN, QUYEN_TH, QUYEN_XEM], true).build()); } catch (e) {}
  }
  ss.getSheets().forEach(sh => { const n = sh.getName(); if (n !== 'Cà tươi' && n !== 'Thu hồi' && n !== 'User' && sh.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(sh); });
  pr.setProperties({ APP_SHEET_ID: ss.getId(), APP_SCHEMA: '2' });
  return { ss: ss, tuoi: a, thuhoi: b, user: u };
}
function trang(ss, ten, cot) {
  let sh = ss.getSheetByName(ten);
  const moi = !sh;
  if (moi) sh = ss.insertSheet(ten);
  const hd = cot.map(c => c[1]);
  const cu = sh.getLastRow() ? sh.getRange(1, 1, 1, cot.length).getValues()[0] : [];
  if (moi || hd.some((h, i) => cu[i] !== h)) {                // tạo mới hoặc thêm cột mới vào sheet cũ
    sh.getRange(1, 1, 1, cot.length).setValues([hd]).setFontWeight('bold').setBackground('#d6f3df');
    sh.setFrozenRows(1);
    cot.forEach((c, i) => { if (CHU.indexOf(c[0]) >= 0) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
  }
  return sh;
}
function docBang(sh, cot) {
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, cot.length).getValues().map(r => {
    const o = {}; cot.forEach((c, i) => { o[c[0]] = r[i] === null ? '' : r[i]; }); return o;
  });
}
function ghiBang(sh, cot, objs) {
  const n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, cot.length).clearContent();
  if (!objs.length) return;
  cot.forEach((c, i) => { if (CHU.indexOf(c[0]) >= 0) sh.getRange(2, i + 1, objs.length, 1).setNumberFormat('@'); });
  sh.getRange(2, 1, objs.length, cot.length).setValues(objs.map(o => cot.map(c => giaTri(o[c[0]], c[0]))));
}
function giaTri(v, k) {
  if (v === undefined || v === null) return '';
  if (CHU.indexOf(k) >= 0) return String(v);
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '') return '';
  const n = Number(s.replace(/,/g, ''));
  return isNaN(n) ? s : n;
}

/* Ghi từng đoạn dòng thay đổi. Không xoá/ghi lại toàn bộ sheet. */
function ghiChenhLech(sh, cot, before, after, key){
  const rowKey = (o, i) => String(o[key] || ('__legacy_' + i));
  const old = new Map(before.map((o, i) => [rowKey(o, i), { row: i + 2, value: o }]));
  const updates = [], append = [], keep = new Set();
  const values = o => cot.map(c => giaTri(o[c[0]], c[0]));
  after.forEach((o, i) => {
    // Dòng cũ thiếu mã vẫn giữ đúng vị trí theo tham chiếu, không phát sinh mã giả trong dữ liệu.
    const legacy = !o[key] ? before.indexOf(o) : -1;
    const id = o[key] ? String(o[key]) : '__legacy_' + (legacy >= 0 ? legacy : i);
    if (keep.has(id)) throw new Error('Trùng mã dòng: ' + id);
    keep.add(id); const found = old.get(id), next = values(o);
    if (!found) append.push(next);
    else if (JSON.stringify(values(found.value)) !== JSON.stringify(next)) updates.push({ row: found.row, values: next });
  });
  updates.sort((a,b) => a.row - b.row);
  for (let i = 0; i < updates.length;){
    let end = i + 1; while (end < updates.length && updates[end].row === updates[end - 1].row + 1) end++;
    sh.getRange(updates[i].row, 1, end - i, cot.length).setValues(updates.slice(i,end).map(x => x.values)); i = end;
  }
  const remove = [...old].filter(([id]) => !keep.has(id)).map(([,x]) => x.row).sort((a,b) => b-a);
  for (let i = 0; i < remove.length;){
    let end = i + 1; while (end < remove.length && remove[end] === remove[end - 1] - 1) end++;
    sh.deleteRows(remove[end - 1], end - i); i = end;
  }
  if (append.length){
    const start = sh.getLastRow() + 1, required = start + append.length - 1;
    if (required > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), required - sh.getMaxRows());
    const range = sh.getRange(start, 1, append.length, cot.length);
    range.setNumberFormats(append.map(() => cot.map(c => CHU.includes(c[0]) ? '@' : 'General')));
    range.setValues(append);
  }
  return { updated: updates.length, added: append.length, removed: remove.length };
}
function tepKey(kind, id){
  if (!['batch','sample'].includes(kind) || !/^[\w-]+$/.test(String(id || ''))) throw new Error('Mã phiếu không hợp lệ');
  return 'FILE_' + kind + '_' + id;
}
function tepState(pr, key){ try { return JSON.parse(pr.getProperty(key) || '{}'); } catch(e){ return {}; } }
function luuNhieu(b, input, u){
  if (!Array.isArray(input) || !input.length || input.length > 30) throw new Error('Mỗi lượt gửi từ 1 đến 30 thao tác');
  // Kiểm tra toàn bộ trước khi ghi; không ghi nửa bảng vì một thao tác sai quyền.
  input.forEach(p => {
    if (!['saveBatch','saveSample','deleteSample'].includes(p.action)) throw new Error('Thao tác lưu không hợp lệ');
    if (u.role === QUYEN_XEM || p.action !== 'saveSample' && u.role !== QUYEN_TOAN) throw new Error('Tài khoản không có quyền làm việc này');
    if (p.action === 'saveBatch'){
      if (!p.batch || !p.batch.id || !Array.isArray(p.batch.rows)) throw new Error('Thiếu dữ liệu lô cân');
      tepKey('batch',p.batch.id);
      const ids = new Set(); p.batch.rows.forEach(r => { if (!r.rid || ids.has(String(r.rid))) throw new Error('Mã xe bị trống hoặc trùng'); ids.add(String(r.rid)); });
    } else tepKey('sample',p.action === 'saveSample' ? p.sample && p.sample.id : p.id);
  });
  const pr = PropertiesService.getScriptProperties();
  let done; try { done = JSON.parse(pr.getProperty('DONE_REQUESTS') || '[]'); } catch(e){ done = []; }
  const beforeTuoi = input.some(p => p.action === 'saveBatch') ? docBang(b.tuoi,COT_TUOI) : null;
  const beforeMau = input.some(p => p.action !== 'saveBatch') ? docBang(b.thuhoi,COT_THUHOI) : null;
  let tuoi = beforeTuoi, mau = beforeMau;
  const files = [], completed = [], properties = {};
  const revise = (kind,id,revision,remove) => {
    const key = tepKey(kind,id), state = properties[key] ? JSON.parse(properties[key]) : tepState(pr,key);
    properties[key] = JSON.stringify(Object.assign({},state,{ revision, dead: !!remove }));
    files.push({ kind,id:String(id),revision,remove:!!remove });
  };
  input.forEach(p => {
    const requestId = String(p.requestId || Utilities.getUuid()), dedup = u.user + '|' + requestId;
    completed.push(requestId);
    if (done.includes(dedup)){
      const kind = p.action === 'saveBatch' ? 'batch' : 'sample', id = kind === 'batch' ? p.batch.id : p.action === 'saveSample' ? p.sample.id : p.id;
      files.push({kind,id:String(id),revision:requestId,remove:p.action === 'deleteSample' || p.action === 'saveBatch' && !p.batch.rows.length}); return;
    }
    if (p.action === 'saveBatch'){
      const lo = p.batch, old = tuoi.filter(r => String(r.batch) === String(lo.id)), index = new Map(old.map(r => [String(r.rid),r]));
      const added = lo.rows.map(row => {
        const next = Object.assign({},row,{batch:String(lo.id)}), previous = index.get(String(row.rid));
        const same = previous && COT_TUOI.filter(c => !['savedAt','savedBy'].includes(c[0])).every(c => giaTri(previous[c[0]],c[0]) === giaTri(next[c[0]],c[0]));
        return same ? previous : Object.assign(next,{savedAt:lo.savedAt || '',savedBy:u.name});
      });
      tuoi = tuoi.filter(r => String(r.batch) !== String(lo.id)).concat(added);
      revise('batch',lo.id,requestId,!added.length);
    } else if (p.action === 'saveSample'){
      const s = Object.assign({},p.sample,{savedBy:u.name});
      if (u.role !== QUYEN_TOAN && s.rid && mau.some(r => String(r.rid) === String(s.rid) && String(r.id) !== String(s.id))) throw new Error('Xe đã có mẫu thu hồi — cần tài khoản Toàn quyền để làm lại');
      const removed = mau.filter(r => String(r.id) === String(s.id) || s.rid && String(r.rid) === String(s.rid));
      mau = mau.filter(r => !removed.includes(r)).concat([s]);
      removed.filter(r => String(r.id) !== String(s.id)).forEach(r => revise('sample',r.id,requestId,true));
      revise('sample',s.id,requestId,false);
    } else {
      mau = mau.filter(r => String(r.id) !== String(p.id)); revise('sample',p.id,requestId,true);
    }
    done.push(dedup);
  });
  const stats = {};
  if (beforeTuoi) stats.tuoi = ghiChenhLech(b.tuoi,COT_TUOI,beforeTuoi,tuoi,'rid');
  if (beforeMau) stats.samples = ghiChenhLech(b.thuhoi,COT_THUHOI,beforeMau,mau,'id');
  done = done.slice(-120); while (JSON.stringify(done).length > 7500) done.shift();
  properties.DONE_REQUESTS = JSON.stringify(done); pr.setProperties(properties);
  return {ok:true,completed,files,stats};
}
// Tìm tệp cũ một lần khi nâng cấp; các lần sau dùng trực tiếp ID đã lưu.
function tepCu(pr, key, kind, id){
  const state = tepState(pr,key), ids = state.fileId ? [state.fileId] : [];
  if (!state.migrated){
    const prefix = kind === 'batch' ? 'phieu-ca-tuoi_' : 'thu-hoi_';
    const it = DriveApp.searchFiles("title contains '_" + String(id) + ".' and trashed = false");
    while (it.hasNext()) { const f = it.next(); if (f.getName().startsWith(prefix) && new RegExp('_' + id + '\\.(pdf|png)$').test(f.getName())) ids.push(f.getId()); }
  }
  return [...new Set(ids)];
}
function luuPhieu(p,u){
  if (u.role === QUYEN_XEM || p.kind === 'batch' && u.role !== QUYEN_TOAN) return khongDuQuyen();
  const pr = PropertiesService.getScriptProperties(), key = tepKey(p.kind,p.id), state = tepState(pr,key);
  if (!p.revision || state.revision !== p.revision) return {ok:true,stale:true};
  if (p.remove && !state.dead || !p.remove && state.dead) return {ok:true,stale:true};
  if (state.fileRevision === p.revision && state.migrated) return {ok:true,fileUrl:state.fileId ? DriveApp.getFileById(state.fileId).getUrl() : ''};
  const previous = tepCu(pr,key,p.kind,p.id); let created = null;
  if (!p.remove){
    const file = p.file;
    if (!file || !file.b64) throw new Error('Thiếu tệp phiếu');
    const m = String(file.date || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
    const date = m ? m[3] + '-' + ('0'+m[2]).slice(-2) + '-' + ('0'+m[1]).slice(-2) : Utilities.formatDate(new Date(),'Asia/Ho_Chi_Minh','yyyy-MM-dd');
    const dir = thuMucCon(thuMucCon(thuMucGoc(),'Phiếu'),date);
    created = dir.createFile(Utilities.newBlob(Utilities.base64Decode(file.b64),file.mime || (p.kind === 'batch' ? 'application/pdf' : 'image/png'),file.name || ((p.kind === 'batch' ? 'phieu-ca-tuoi_' : 'thu-hoi_') + p.id + (p.kind === 'batch' ? '.pdf' : '.png'))));
  }
  const lock = LockService.getScriptLock(); lock.waitLock(25000); let stale = false;
  try {
    const latest = tepState(pr,key);
    stale = latest.revision !== p.revision || !!latest.dead !== !!p.remove;
    if (!stale) pr.setProperty(key,JSON.stringify(Object.assign({},latest,{fileId:created ? created.getId() : '',fileRevision:p.revision,migrated:true})));
  } finally { lock.releaseLock(); }
  if (stale){ if (created) created.setTrashed(true); return {ok:true,stale:true}; }
  previous.forEach(id => { try { const active = tepState(pr,key); if (active.fileId !== id) DriveApp.getFileById(id).setTrashed(true); } catch(e){} });
  return {ok:true,fileUrl:created ? created.getUrl() : ''};
}
function danhSach(b, role) {
  const rows = docBang(b.tuoi, COT_TUOI), samples = docBang(b.thuhoi, COT_THUHOI);
  if (role === QUYEN_TOAN) return { ok: true, rows: rows, samples: samples, folderUrl: thuMucGoc().getUrl(), sheetUrl: b.ss.getUrl() };
  if (role === QUYEN_XEM) return { ok: true, rows: rows, samples: samples };   // chỉ xem: đủ dữ liệu để xem tổng hợp, không được ghi
  // tài khoản Thu hồi: các xe để chọn tên mẫu + đầy đủ mẫu đã lưu để xem lại / sửa
  return {
    ok: true,
    rows: rows.map(r => ({ batch: r.batch, rid: r.rid, date: r.date, gio: r.gio, soxe: r.soxe, khach: r.khach, thuc: r.thuc, xanh: r.xanh, noi: r.noi, chin: r.chin })),
    samples: samples
  };
}
