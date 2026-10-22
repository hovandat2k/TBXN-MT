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
const QUYEN_TOAN = 'Toàn quyền', QUYEN_TH = 'Thu hồi';

const COT_TUOI = [
  ['batch', 'Mã lô'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['gio', 'Giờ cân'], ['stt', 'STT'], ['soxe', 'Số xe'],
  ['hang', 'Hàng hóa'], ['khach', 'Khách hàng'], ['tl1', 'TL Lần 1'], ['tl2', 'TL Lần 2'], ['tlh', 'TL Hàng'], ['bi', 'TL Bì'],
  ['thuc', 'TL Thực'], ['xanh', 'Xanh (%)'], ['noi', 'Nổi (%)'], ['chin', 'Chín (%)'], ['ghichu', 'Ghi chú'], ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu']
];
const COT_THUHOI = [
  ['id', 'Mã mẫu'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['khach', 'Khách hàng'], ['soxe', 'Số xe'], ['klTuoi', 'KL cà tươi (kg)'],
  ['mau', 'Loại mẫu'], ['kl', 'KL (g)'], ['klq', 'KL quả (g)'], ['am', 'Độ ẩm'], ['thuhoi', 'Thu hồi (kg)'], ['cachtinh', 'Cách tính'],
  ['savedAt', 'Lưu lúc'], ['savedBy', 'Người lưu']
];
const COT_USER = [['user', 'Tên đăng nhập'], ['pass', 'Mật khẩu'], ['role', 'Quyền'], ['name', 'Họ tên'], ['lock', 'Khoá']];
// cột luôn để dạng chữ (tránh Sheets tự đổi ngày/giờ/số xe/mật khẩu)
const CHU = ['batch', 'rid', 'date', 'gio', 'stt', 'soxe', 'hang', 'khach', 'ghichu', 'savedAt', 'savedBy', 'id', 'mau', 'cachtinh', 'user', 'pass', 'role', 'name', 'lock'];

function doGet(e) { return tra({ ok: true, app: 'Cà tươi + Thu hồi', note: 'Máy chủ đang chạy. Hãy mở trang web để dùng.' }); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return tra({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  return xuLy(p);
}

function xuLy(p) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const b = bangTinh();
      if (p.action === 'login') return tra(dangNhap(b, p));
      const u = xacThuc(b, p.token);
      if (!u) return tra({ ok: false, auth: true, error: 'Phiên đăng nhập đã hết hạn — hãy đăng nhập lại' });
      const role = u.role;
      switch (p.action) {
        case 'ping': return tra({ ok: true, user: u.user, name: u.name, role: role, folderUrl: role === QUYEN_TOAN ? thuMucGoc().getUrl() : '', sheetUrl: role === QUYEN_TOAN ? b.ss.getUrl() : '' });
        case 'list': return tra(danhSach(b, role));
        case 'saveSample': return tra(luuMau(b, p, u));
        case 'saveBatch': if (role !== QUYEN_TOAN) return tra(khongDuQuyen()); return tra(luuLo(b, p, u));
        case 'deleteSample': if (role !== QUYEN_TOAN) return tra(khongDuQuyen()); return tra(xoaMau(b, p));
        default: return tra({ ok: false, error: 'Thao tác không hợp lệ: ' + p.action });
      }
    } finally { lock.releaseLock(); }
  } catch (err) {
    return tra({ ok: false, error: String(err && err.message || err) });
  }
}
function khongDuQuyen() { return { ok: false, denied: true, error: 'Tài khoản không có quyền làm việc này' }; }
function tra(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

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
function chuanQuyen(r) { const s = String(r || '').toLowerCase(); return /thu\s*h/.test(s) ? QUYEN_TH : /to[aà]n/.test(s) ? QUYEN_TOAN : ''; }
function dangNhap(b, p) {
  const name = String(p.user || '').trim().toLowerCase(), pass = String(p.pass || '');
  const u = taiKhoan(b).find(x => x.user.toLowerCase() === name);
  if (!u || u.pass !== pass) { Utilities.sleep(800); return { ok: false, error: 'Sai tên đăng nhập hoặc mật khẩu' }; }
  if (u.lock) return { ok: false, error: 'Tài khoản đang bị khoá' };
  const role = chuanQuyen(u.role);
  if (!role) return { ok: false, error: 'Tài khoản chưa được cấp quyền (cột Quyền: "Toàn quyền" hoặc "Thu hồi")' };
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
  const it = DriveApp.getFoldersByName(THU_MUC);
  return it.hasNext() ? it.next() : DriveApp.createFolder(THU_MUC);
}
function thuMucCon(cha, ten) {
  const it = cha.getFoldersByName(ten);
  return it.hasNext() ? it.next() : cha.createFolder(ten);
}
function bangTinh() {
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
    try { u.getRange(2, 3, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([QUYEN_TOAN, QUYEN_TH], true).build()); } catch (e) {}
  }
  ss.getSheets().forEach(sh => { const n = sh.getName(); if (n !== 'Cà tươi' && n !== 'Thu hồi' && n !== 'User' && sh.getLastRow() === 0 && ss.getSheets().length > 3) ss.deleteSheet(sh); });
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

/* ---------------- Tệp phiếu ---------------- */
function luuTep(ngay, ten, b64s, mime) {
  if (!b64s) return '';
  const m = String(ngay || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
  const thu = m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const dir = thuMucCon(thuMucCon(thuMucGoc(), 'Phiếu'), thu);
  const cu = dir.getFilesByName(ten);
  while (cu.hasNext()) cu.next().setTrashed(true);          // lưu lại thì thay tệp cũ
  const blob = Utilities.newBlob(Utilities.base64Decode(b64s), mime, ten);
  return dir.createFile(blob).getUrl();
}

/* ---------------- Thao tác ---------------- */
// Lưu 1 lô cân: thay toàn bộ dòng cũ cùng mã lô
function luuLo(b, p, u) {
  const lo = p.batch || {};
  if (!lo.id || !Array.isArray(lo.rows)) return { ok: false, error: 'Thiếu dữ liệu lô cân' };
  const giu = docBang(b.tuoi, COT_TUOI).filter(r => String(r.batch) !== String(lo.id));
  const moi = lo.rows.map(r => Object.assign({}, r, { batch: lo.id, savedAt: lo.savedAt || '', savedBy: u.name }));
  ghiBang(b.tuoi, COT_TUOI, giu.concat(moi));
  let url = '';
  if (p.file && p.file.b64) url = luuTep(p.file.date || (lo.rows[0] && lo.rows[0].date), p.file.name || ('phieu-ca-tuoi_' + lo.id + '.pdf'), p.file.b64, p.file.mime || 'application/pdf');
  return { ok: true, count: moi.length, fileUrl: url };
}
// Lưu 1 mẫu thu hồi (lưu lại cùng xe thì ghi đè)
function luuMau(b, p, u) {
  const s = Object.assign({}, p.sample || {}, { savedBy: u.name });
  if (!s.id) return { ok: false, error: 'Thiếu mã mẫu' };
  const ds = docBang(b.thuhoi, COT_THUHOI);
  if (u.role !== QUYEN_TOAN && s.rid && ds.some(r => String(r.rid) === String(s.rid) && String(r.id) !== String(s.id)))
    return { ok: false, denied: true, error: 'Xe này đã có mẫu thu hồi — cần tài khoản Toàn quyền để làm lại' };
  const con = ds.filter(r => String(r.id) !== String(s.id) && (!s.rid || String(r.rid) !== String(s.rid)));
  con.push(s);
  ghiBang(b.thuhoi, COT_THUHOI, con);
  let url = '';
  if (p.file && p.file.b64) url = luuTep(s.date, p.file.name || ('thu-hoi_' + s.id + '.png'), p.file.b64, p.file.mime || 'image/png');
  return { ok: true, fileUrl: url };
}
function xoaMau(b, p) {
  const ds = docBang(b.thuhoi, COT_THUHOI);
  const con = ds.filter(r => String(r.id) !== String(p.id));
  ghiBang(b.thuhoi, COT_THUHOI, con);
  return { ok: true, removed: ds.length - con.length };
}
function danhSach(b, role) {
  const rows = docBang(b.tuoi, COT_TUOI), samples = docBang(b.thuhoi, COT_THUHOI);
  if (role === QUYEN_TOAN) return { ok: true, rows: rows, samples: samples, folderUrl: thuMucGoc().getUrl(), sheetUrl: b.ss.getUrl() };
  // tài khoản Thu hồi: chỉ cần biết các xe để chọn tên mẫu và xe nào đã làm
  return {
    ok: true,
    rows: rows.map(r => ({ batch: r.batch, rid: r.rid, date: r.date, gio: r.gio, soxe: r.soxe, khach: r.khach, thuc: r.thuc })),
    samples: samples.map(s => ({ id: s.id, rid: s.rid, date: s.date, khach: s.khach, thuhoi: s.thuhoi, savedBy: s.savedBy }))
  };
}
