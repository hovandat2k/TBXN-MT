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
 *   Cột: Tên đăng nhập | Mật khẩu | Quyền | Họ tên | Khoá | Khu vực
 *   Quyền: admin (toàn hệ thống), ICS (toàn khu vực), ICS-thuhoi, Thu hồi, Chỉ xem.
 *   Khu vực: Lào / Lâm Đồng / Sơn La. Bắt buộc cho mọi quyền trừ admin.
 *   Dữ liệu cũ chưa có khu vực được chuyển về Lâm Đồng.
 *           "Thu hồi"     – chỉ nhập / lưu mẫu thu hồi
 *   Khoá:   ghi "x" để tạm khoá tài khoản.
 *   Lần đầu chạy sẽ tạo sẵn tài khoản:  admin / doimatkhau  (Toàn quyền) — hãy đổi mật khẩu ngay trong sheet.
 *   Đổi mật khẩu hoặc khoá tài khoản thì người đó phải đăng nhập lại.
 */

const THU_MUC = 'Cà Tươi + Thu Hồi';
const TEN_SHEET = 'Dữ liệu Cà Tươi + Thu Hồi';
const HAN_DANG_NHAP_NGAY = 30;              // số ngày giữ đăng nhập trên mỗi máy
const QUYEN_TOAN = 'admin', QUYEN_ICS = 'ICS', QUYEN_ICS_TH = 'ICS-thuhoi', QUYEN_TH = 'Thu hồi', QUYEN_XEM = 'Chỉ xem';
const KHU_VUC = ['Lào','Lâm Đồng','Sơn La'];

const COT_TUOI = [
  ['batch', 'Mã lô'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['gio', 'Giờ cân'], ['stt', 'STT'], ['soxe', 'Số xe'],
  ['hang', 'Hàng hóa'], ['khach', 'Khách hàng'], ['tl1', 'TL Lần 1'], ['tl2', 'TL Lần 2'], ['tlh', 'TL Hàng'], ['bi', 'TL Bì'],
  ['thuc', 'TL Thực'], ['xanh', 'Xanh (%)'], ['noi', 'Nổi (%)'], ['chin', 'Chín (%)'], ['ghichu', 'Ghi chú'], ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu'], ['khuvuc','Khu vực']
];
const COT_THUHOI = [
  ['id', 'Mã mẫu'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['khach', 'Khách hàng'], ['soxe', 'Số xe'], ['klTuoi', 'KL cà tươi (kg)'],
  ['mau', 'Loại mẫu'], ['kl', 'KL (g)'], ['klq', 'KL quả (g)'], ['am', 'Độ ẩm'], ['thuhoi', 'Thu hồi (kg)'], ['cachtinh', 'Cách tính'],
  ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu'], ['nhom', 'Mẫu chung (mã nhóm)'], ['khuvuc','Khu vực'], ['gio','Giờ cân'], ['xanh','Xanh (%)'], ['noi','Nổi (%)'], ['chin','Chín (%)']
];
const COT_USER = [['user', 'Tên đăng nhập'], ['pass', 'Mật khẩu'], ['role', 'Quyền'], ['name', 'Họ tên'], ['lock', 'Khoá'], ['khuvuc','Khu vực']];
// cột luôn để dạng chữ (tránh Sheets tự đổi ngày/giờ/số xe/mật khẩu)
const CHU = ['khuvuc', 'nhom', 'batch', 'rid', 'date', 'gio', 'stt', 'soxe', 'hang', 'khach', 'ghichu', 'savedAt', 'savedBy', 'id', 'mau', 'cachtinh', 'user', 'pass', 'role', 'name', 'lock'];

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
        case 'ping': return tra({ ok: true, user: u.user, name: u.name, role: role, khuvuc: u.khuvuc, folderUrl: role === QUYEN_TOAN ? thuMucGoc().getUrl() : '', sheetUrl: role === QUYEN_TOAN ? b.ss.getUrl() : '' });
        case 'list': return tra(danhSach(b, u, p.khuvuc));
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
function tra(o) { o.features = { fastSync: true, deferredFiles: true, regions: true, version: 3 }; return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------- Đăng nhập ---------------- */
function biMat() {
  const pr = PropertiesService.getScriptProperties();
  let s = pr.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); pr.setProperty('SECRET', s); }
  return s;
}
function b64(bytes) { return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function ky(s) { return b64(Utilities.computeHmacSha256Signature(s, biMat())); }
function dauVanTay(u) { return ky('pw|' + u.user + '|' + u.pass + '|' + u.role + '|' + (u.khuvuc || '')).slice(0, 12); }   // đổi mật khẩu / quyền → phải đăng nhập lại
function taiKhoan(b) {
  return docBang(b.user, COT_USER).map(u => ({ user: String(u.user).trim(), pass: String(u.pass), role: String(u.role).trim(), name: String(u.name || '').trim(), lock: String(u.lock || '').trim(), khuvuc: chuanKhuVuc(u.khuvuc) }))
    .filter(u => u.user);
}
function chuanKhuVuc(v){return KHU_VUC.find(k=>k===String(v||'').trim()) || '';}
function chuanQuyen(r){const v=String(r||'').trim().toLowerCase();return {'admin':QUYEN_TOAN,'ics':QUYEN_ICS,'ics-thuhoi':QUYEN_ICS_TH,'thu hồi':QUYEN_TH,'thu hoi':QUYEN_TH,'chỉ xem':QUYEN_XEM,'chi xem':QUYEN_XEM}[v] || '';}
function quanLyCan(u){return u.role===QUYEN_TOAN || u.role===QUYEN_ICS;}
function cungKhuVuc(u,r){return u.role===QUYEN_TOAN || !!u.khuvuc && r.khuvuc===u.khuvuc;}
function kiemKhuVuc(u,r){if(r && !cungKhuVuc(u,r)) throw new Error('Không được truy cập dữ liệu khu vực khác');}
function khuVucGhi(u,value,old){
  kiemKhuVuc(u,old);
  const area=u.role===QUYEN_TOAN?chuanKhuVuc(value || old && old.khuvuc):u.khuvuc;
  if(!area || value && chuanKhuVuc(value)!==area) throw new Error('Cần chọn khu vực hợp lệ');
  if(old && old.khuvuc!==area) throw new Error('Không được chuyển khu vực của phiếu đã lưu');
  return area;
}
function dangNhap(b, p) {
  const name = String(p.user || '').trim().toLowerCase(), pass = String(p.pass || '');
  const u = taiKhoan(b).find(x => x.user.toLowerCase() === name);
  if (!u || u.pass !== pass) { Utilities.sleep(800); return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }; }
  if (u.lock) return { ok: false, error: 'Tài khoản đang bị khoá' };
  const role = chuanQuyen(u.role);
  if (!role) return {ok:false,error:'Cột Quyền cần là admin, ICS, ICS-thuhoi, Thu hồi hoặc Chỉ xem'};
  if(role!==QUYEN_TOAN && !u.khuvuc) return {ok:false,error:'Tài khoản chưa được gán Khu vực (Lào, Lâm Đồng hoặc Sơn La)'};
  const body = b64(Utilities.newBlob(JSON.stringify({ u: u.user, f: dauVanTay(u), e: Date.now() + HAN_DANG_NHAP_NGAY * 864e5 })).getBytes());
  return { ok: true, token: body + '.' + ky(body), user: u.user, name: u.name || u.user, role: role, khuvuc: u.khuvuc };
}
function xacThuc(b, token) {
  const t = String(token || '').split('.');
  if (t.length !== 2 || ky(t[0]) !== t[1]) return null;
  let d; try { d = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(t[0])).getDataAsString()); } catch (e) { return null; }
  if (!d || d.e < Date.now()) return null;
  const u = taiKhoan(b).find(x => x.user === d.u);
  if (!u || u.lock || dauVanTay(u) !== d.f) return null;
  const role = chuanQuyen(u.role);
  return role && (role===QUYEN_TOAN || u.khuvuc) ? { user: u.user, name: u.name || u.user, role: role, khuvuc: u.khuvuc } : null;
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
  if (id && pr.getProperty('APP_SCHEMA') === '3'){
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
    u.getRange(2, 1, 1, COT_USER.length).setValues([['admin', 'doimatkhau', QUYEN_TOAN, 'Quản trị', '', '']]);
    try { u.getRange(2, 3, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([QUYEN_TOAN, QUYEN_TH, QUYEN_XEM], true).build()); } catch (e) {}
  }
  // Dữ liệu trước khi phân vùng thuộc Lâm Đồng, chỉ gán các ô khu vực còn trống.
  [[a,COT_TUOI],[b,COT_THUHOI]].forEach(([sh,cols])=>{
    if(sh.getLastRow()<2) return;
    const column=cols.findIndex(c=>c[0]==='khuvuc')+1, range=sh.getRange(2,column,sh.getLastRow()-1,1), values=range.getValues();
    if(values.some(r=>!String(r[0]||'').trim())) range.setValues(values.map(r=>[String(r[0]||'').trim() || 'Lâm Đồng']));
  });
  try{
    const count=Math.max(1,u.getMaxRows()-1);
    u.getRange(2,3,count,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([QUYEN_TOAN,QUYEN_ICS,QUYEN_ICS_TH,QUYEN_TH,QUYEN_XEM],true).build());
    u.getRange(2,6,count,1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(KHU_VUC,true).build());
  }catch(e){}
  ss.getSheets().forEach(sh => { const n = sh.getName(); if (n !== 'Cà tươi' && n !== 'Thu hồi' && n !== 'User' && sh.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(sh); });
  pr.setProperties({ APP_SHEET_ID: ss.getId(), APP_SCHEMA: '3' });
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
    if (u.role === QUYEN_XEM || p.action === 'saveBatch' && !quanLyCan(u) || p.action === 'deleteSample' && !quanLyCan(u) && u.role!==QUYEN_ICS_TH) throw new Error('Tài khoản không có quyền làm việc này');
    if (p.action === 'saveBatch'){
      if (!p.batch || !p.batch.id || !Array.isArray(p.batch.rows)) throw new Error('Thiếu dữ liệu lô cân');
      tepKey('batch',p.batch.id);
      const ids = new Set(); p.batch.rows.forEach(r => { if (!r.rid || ids.has(String(r.rid))) throw new Error('Mã xe bị trống hoặc trùng'); ids.add(String(r.rid)); });
    } else tepKey('sample',p.action === 'saveSample' ? p.sample && p.sample.id : p.id);
  });
  const pr = PropertiesService.getScriptProperties();
  let done; try { done = JSON.parse(pr.getProperty('DONE_REQUESTS') || '[]'); } catch(e){ done = []; }
  const beforeTuoi = docBang(b.tuoi,COT_TUOI);
  const beforeMau = input.some(p => p.action !== 'saveBatch') ? docBang(b.thuhoi,COT_THUHOI) : null;
  let tuoi = beforeTuoi, mau = beforeMau;
  const files = [], completed = [], properties = {};
  const revise = (kind,id,revision,remove,khuvuc) => {
    const key = tepKey(kind,id), state = properties[key] ? JSON.parse(properties[key]) : tepState(pr,key);
    properties[key] = JSON.stringify(Object.assign({},state,{ revision, dead: !!remove, khuvuc: khuvuc || state.khuvuc }));
    files.push({ kind,id:String(id),revision,remove:!!remove });
  };
  input.forEach(p => {
    const requestId = String(p.requestId || Utilities.getUuid()), dedup = u.user + '|' + requestId;
    const ownedState=tepState(pr,tepKey(p.action==='saveBatch'?'batch':'sample',p.action==='saveBatch'?p.batch.id:p.action==='saveSample'?p.sample.id:p.id));
    if(ownedState.khuvuc) kiemKhuVuc(u,ownedState);
    if(p.action==='saveBatch'){
      const old=tuoi.filter(r=>String(r.batch)===String(p.batch.id));old.forEach(r=>kiemKhuVuc(u,r));
      const area=khuVucGhi(u,p.batch.khuvuc,old[0]);
      p=Object.assign({},p,{batch:Object.assign({},p.batch,{khuvuc:area,rows:p.batch.rows.map(row=>{
        const existing=tuoi.find(r=>String(r.rid)===String(row.rid));kiemKhuVuc(u,existing);
        if(existing && (String(existing.batch)!==String(p.batch.id) || existing.khuvuc!==area)) throw new Error('Mã xe đã thuộc phiếu khác');
        if(row.khuvuc && row.khuvuc!==area) throw new Error('Một lô chỉ thuộc một khu vực');
        return Object.assign({},row,{khuvuc:area});
      })})});
    }else{
      const old=mau.find(r=>String(r.id)===String(p.action==='saveSample'?p.sample.id:p.id));kiemKhuVuc(u,old);
      if(p.action==='saveSample'){
        const row=p.sample.rid?tuoi.find(r=>String(r.rid)===String(p.sample.rid)):null;
        if(p.sample.rid && !row) throw new Error('Không tìm thấy xe');kiemKhuVuc(u,row);
        const area=khuVucGhi(u,p.sample.khuvuc,old || row);
        if(p.sample.nhom && mau.some(r=>String(r.nhom)===String(p.sample.nhom) && r.khuvuc!==area)) throw new Error('Nhóm mẫu khác khu vực');
        const meta=Object.assign({},old||{},p.sample,{khuvuc:area});
        if(!String(meta.khach||row && row.khach||'').trim()) throw new Error('Thiếu tên khách hàng');
        for(const f of ['xanh','noi','chin']){
          if(meta[f]==null && row) meta[f]=row[f];
          if(meta[f]!=='' && meta[f]!=null && (!Number.isFinite(Number(meta[f])) || +meta[f]<0 || +meta[f]>100)) throw new Error('Tỷ lệ không hợp lệ');
        }
        if(meta.klTuoi!=='' && meta.klTuoi!=null && (!Number.isFinite(Number(meta.klTuoi)) || +meta.klTuoi<0)) throw new Error('Khối lượng không hợp lệ');
        p=Object.assign({},p,{sample:meta});
      }
    }
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
      revise('batch',lo.id,requestId,!added.length,lo.khuvuc);
    } else if (p.action === 'saveSample'){
      const s = Object.assign({},p.sample,{savedBy:u.name});
      if (!quanLyCan(u) && u.role!==QUYEN_ICS_TH && s.rid && mau.some(r => String(r.rid) === String(s.rid) && String(r.id) !== String(s.id))) throw new Error('Xe đã có mẫu thu hồi — cần tài khoản Toàn quyền để làm lại');
      const removed = mau.filter(r => String(r.id) === String(s.id) || s.rid && String(r.rid) === String(s.rid));
      removed.forEach(r=>kiemKhuVuc(u,r));
      mau = mau.filter(r => !removed.includes(r)).concat([s]);
      removed.filter(r => String(r.id) !== String(s.id)).forEach(r => revise('sample',r.id,requestId,true,r.khuvuc));
      revise('sample',s.id,requestId,false,s.khuvuc);
    } else {
      const old=mau.find(r=>String(r.id)===String(p.id));
      mau = mau.filter(r => String(r.id) !== String(p.id)); revise('sample',p.id,requestId,true,old && old.khuvuc || u.khuvuc);
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
  if (u.role === QUYEN_XEM || p.kind === 'batch' && !quanLyCan(u)) return khongDuQuyen();
  const pr = PropertiesService.getScriptProperties(), key = tepKey(p.kind,p.id), state = tepState(pr,key);
  if(u.role!==QUYEN_TOAN){
    let area=state.khuvuc;
    if(!area){const b=bangTinh();const rows=docBang(p.kind==='batch'?b.tuoi:b.thuhoi,p.kind==='batch'?COT_TUOI:COT_THUHOI);const target=rows.find(r=>String(p.kind==='batch'?r.batch:r.id)===String(p.id));area=target && target.khuvuc;}
    if(!area || area!==u.khuvuc) return khongDuQuyen();
  }
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
function danhSach(b,u,filter){
  if(typeof u!=='object') return khongDuQuyen();
  if(filter && !chuanKhuVuc(filter)) return khongDuQuyen();
  if(u.role!==QUYEN_TOAN && filter && filter!==u.khuvuc) return khongDuQuyen();
  const inScope=r=>cungKhuVuc(u,r) && (!filter || r.khuvuc===filter);
  const rows=docBang(b.tuoi,COT_TUOI).filter(inScope), samples=docBang(b.thuhoi,COT_THUHOI).filter(inScope);
  return {ok:true,rows:quanLyCan(u) || u.role===QUYEN_XEM?rows:rows.map(r=>({batch:r.batch,rid:r.rid,date:r.date,gio:r.gio,soxe:r.soxe,khach:r.khach,thuc:r.thuc,xanh:r.xanh,noi:r.noi,chin:r.chin,khuvuc:r.khuvuc})),samples,
    folderUrl:u.role===QUYEN_TOAN?thuMucGoc().getUrl():'',sheetUrl:u.role===QUYEN_TOAN?b.ss.getUrl():''};
}
