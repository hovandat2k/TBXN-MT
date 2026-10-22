/**
 * TB Xanh – Nổi + Thu hồi  ·  Máy chủ lưu dữ liệu vào Google Drive
 * ------------------------------------------------------------------
 * Cách cài (chỉ làm 1 lần):
 *  1. Mở https://script.google.com  →  "Dự án mới".
 *  2. Xoá hết nội dung có sẵn, dán TOÀN BỘ tệp này vào, bấm 💾 Lưu.
 *  3. (Tuỳ chọn) đặt MA_BAO_VE bên dưới, ví dụ 'catuoi2026'; nhập cùng mã này trong ⚙️ của trang web.
 *  4. Bấm "Triển khai" → "Tùy chọn triển khai mới" → bánh răng ⚙ chọn "Ứng dụng web".
 *       - Thực thi dưới dạng: Tôi (tài khoản của bạn)
 *       - Người có quyền truy cập: Bất kỳ ai
 *     Bấm "Triển khai", cấp quyền cho tài khoản Google của bạn.
 *  5. Sao chép "URL ứng dụng web" (…/exec) và dán vào ⚙️ → "Lưu vào Google Drive" trên trang web.
 *
 * Dữ liệu được lưu trong thư mục "Cà Tươi + Thu Hồi" ở Drive của bạn:
 *   - Google Sheet "Dữ liệu Cà Tươi + Thu Hồi": tab "Cà tươi" (mỗi xe 1 dòng), tab "Thu hồi" (mỗi mẫu 1 dòng)
 *   - Thư mục "Phiếu/<năm-tháng-ngày>": phiếu cà tươi (PDF) và phiếu thu hồi (PNG)
 * Khi sửa tệp này sau khi đã triển khai: "Triển khai" → "Quản lý triển khai" → ✏️ → Phiên bản: "Phiên bản mới".
 */

const MA_BAO_VE = '';                       // để trống = không cần mã
const THU_MUC = 'Cà Tươi + Thu Hồi';
const TEN_SHEET = 'Dữ liệu Cà Tươi + Thu Hồi';

const COT_TUOI = [
  ['batch', 'Mã lô'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['gio', 'Giờ cân'], ['stt', 'STT'], ['soxe', 'Số xe'],
  ['hang', 'Hàng hóa'], ['khach', 'Khách hàng'], ['tl1', 'TL Lần 1'], ['tl2', 'TL Lần 2'], ['tlh', 'TL Hàng'], ['bi', 'TL Bì'],
  ['thuc', 'TL Thực'], ['xanh', 'Xanh (%)'], ['noi', 'Nổi (%)'], ['chin', 'Chín (%)'], ['ghichu', 'Ghi chú'], ['savedAt', 'Lưu lúc']
];
const COT_THUHOI = [
  ['id', 'Mã mẫu'], ['rid', 'Mã xe'], ['date', 'Ngày cân'], ['khach', 'Khách hàng'], ['soxe', 'Số xe'], ['klTuoi', 'KL cà tươi (kg)'],
  ['mau', 'Loại mẫu'], ['kl', 'KL (g)'], ['klq', 'KL quả (g)'], ['am', 'Độ ẩm'], ['thuhoi', 'Thu hồi (kg)'], ['cachtinh', 'Cách tính'], ['savedAt', 'Lưu lúc']
];
// cột luôn để dạng chữ (tránh Sheets tự đổi ngày/giờ/số xe)
const CHU = ['batch', 'rid', 'date', 'gio', 'stt', 'soxe', 'hang', 'khach', 'ghichu', 'savedAt', 'id', 'mau', 'cachtinh'];

function doGet(e) { return xuLy((e && e.parameter) || {}); }
function doPost(e) {
  let p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return tra({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  return xuLy(p);
}

function xuLy(p) {
  try {
    if (MA_BAO_VE && p.key !== MA_BAO_VE) return tra({ ok: false, error: 'Sai mã bảo vệ' });
    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      switch (p.action) {
        case 'ping': return tra(ping());
        case 'saveBatch': return tra(luuLo(p));
        case 'saveSample': return tra(luuMau(p));
        case 'deleteSample': return tra(xoaMau(p));
        case 'list': return tra(danhSach());
        default: return tra({ ok: false, error: 'Thao tác không hợp lệ: ' + p.action });
      }
    } finally { lock.releaseLock(); }
  } catch (err) {
    return tra({ ok: false, error: String(err && err.message || err) });
  }
}

function tra(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

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
  const a = trang(ss, 'Cà tươi', COT_TUOI), b = trang(ss, 'Thu hồi', COT_THUHOI);
  ss.getSheets().forEach(sh => { if (sh.getName() !== 'Cà tươi' && sh.getName() !== 'Thu hồi' && sh.getLastRow() === 0 && ss.getSheets().length > 2) ss.deleteSheet(sh); });
  return { ss: ss, tuoi: a, thuhoi: b };
}
function trang(ss, ten, cot) {
  let sh = ss.getSheetByName(ten);
  if (!sh) {
    sh = ss.insertSheet(ten);
    sh.getRange(1, 1, 1, cot.length).setValues([cot.map(c => c[1])]).setFontWeight('bold').setBackground('#d7eefc');
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
function luuTep(ngay, ten, b64, mime) {
  if (!b64) return '';
  const m = String(ngay || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/);
  const thu = m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const dir = thuMucCon(thuMucCon(thuMucGoc(), 'Phiếu'), thu);
  const cu = dir.getFilesByName(ten);
  while (cu.hasNext()) cu.next().setTrashed(true);          // lưu lại thì thay tệp cũ
  const blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, ten);
  return dir.createFile(blob).getUrl();
}

/* ---------------- Thao tác ---------------- */
function ping() {
  const b = bangTinh();
  return { ok: true, folderUrl: thuMucGoc().getUrl(), sheetUrl: b.ss.getUrl() };
}
// Lưu 1 lô cân: thay toàn bộ dòng cũ cùng mã lô
function luuLo(p) {
  const lo = p.batch || {};
  if (!lo.id || !Array.isArray(lo.rows)) return { ok: false, error: 'Thiếu dữ liệu lô cân' };
  const b = bangTinh();
  const giu = docBang(b.tuoi, COT_TUOI).filter(r => String(r.batch) !== String(lo.id));
  const moi = lo.rows.map(r => Object.assign({}, r, { batch: lo.id, savedAt: lo.savedAt || '' }));
  ghiBang(b.tuoi, COT_TUOI, giu.concat(moi));
  let url = '';
  if (p.file && p.file.b64) url = luuTep(p.file.date || (lo.rows[0] && lo.rows[0].date), p.file.name || ('phieu-ca-tuoi_' + lo.id + '.pdf'), p.file.b64, p.file.mime || 'application/pdf');
  return { ok: true, count: moi.length, fileUrl: url };
}
// Lưu 1 mẫu thu hồi (lưu lại cùng mã thì ghi đè)
function luuMau(p) {
  const s = p.sample || {};
  if (!s.id) return { ok: false, error: 'Thiếu mã mẫu' };
  const b = bangTinh();
  const ds = docBang(b.thuhoi, COT_THUHOI).filter(r => String(r.id) !== String(s.id) && (!s.rid || String(r.rid) !== String(s.rid)));
  ds.push(s);
  ghiBang(b.thuhoi, COT_THUHOI, ds);
  let url = '';
  if (p.file && p.file.b64) url = luuTep(s.date, p.file.name || ('thu-hoi_' + s.id + '.png'), p.file.b64, p.file.mime || 'image/png');
  return { ok: true, fileUrl: url };
}
function xoaMau(p) {
  const b = bangTinh();
  const ds = docBang(b.thuhoi, COT_THUHOI);
  const con = ds.filter(r => String(r.id) !== String(p.id));
  ghiBang(b.thuhoi, COT_THUHOI, con);
  return { ok: true, removed: ds.length - con.length };
}
function danhSach() {
  const b = bangTinh();
  return { ok: true, rows: docBang(b.tuoi, COT_TUOI), samples: docBang(b.thuhoi, COT_THUHOI), folderUrl: thuMucGoc().getUrl(), sheetUrl: b.ss.getUrl() };
}
