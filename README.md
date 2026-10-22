# Cà tươi + Thu hồi (TBXN-MT)

👉 Dùng tại: https://hovandat2k.github.io/TBXN-MT/

Trang gồm 3 thẻ:

- **🌱 Cà tươi** – dán ảnh / PDF phiếu cân (Ctrl+V), tự đọc khách hàng, TL thực, Xanh – Nổi – Chín, tính tổng và trung bình có trọng số, xuất phiếu kết quả (ảnh, PDF, in). Bấm **💾 Lưu** để lưu lô cân.
- **⚖️ Thu hồi** – cách tính giống trang “Tính thu hồi cà phê” cũ (mẫu riêng 2000 g / mẫu chung 10000 g, bảng trừ ẩm). **Tên mẫu** là danh sách các xe đã lưu ở phiếu cà tươi mà chưa làm thu hồi; lưu mẫu xong xe đó biến mất khỏi danh sách. Phiếu thu hồi có thêm KL cà tươi của xe.
- **📚 Tổng hợp mẫu** – xem theo **đêm** (từng lô cân, mở lại lô để sửa / in lại), theo **khách hàng** hoặc theo **mẫu**; có tổng KL, TB Xanh/Nổi/Chín, TB thu hồi (theo KL cà tươi); xoá mẫu thu hồi để làm lại.

**Đêm**: dữ liệu được tách theo ca đêm từ **15h hôm trước tới 15h hôm sau** — ví dụ *Đêm 22/10/2026* gồm các xe cân từ 15:00 ngày 22/10 tới trước 15:00 ngày 23/10. Áp dụng cho “Tách theo đêm” ở phiếu cà tươi, danh sách Tên mẫu ở Thu hồi và Tổng hợp mẫu.

## Đăng nhập & tài khoản

Mở trang sẽ hiện màn hình **đăng nhập**. Tài khoản được quản lý trong tab **User** của Google Sheet *Dữ liệu Cà Tươi + Thu Hồi* (thư mục **“Cà Tươi + Thu Hồi”** trên Drive):

| Tên đăng nhập | Mật khẩu | Quyền | Họ tên | Khoá |
|---|---|---|---|---|
| admin | doimatkhau | Toàn quyền | Quản trị | |
| lan | 123456 | Thu hồi | Chị Lan | |

- **Toàn quyền**: dùng mọi chức năng (Cà tươi, Thu hồi, Tổng hợp mẫu, xoá / làm lại mẫu).
- **Thu hồi**: chỉ thấy thẻ Thu hồi, chỉ lưu được mẫu thu hồi mới (không sửa phiếu cà tươi, không xoá mẫu).
- Ghi `x` ở cột **Khoá** để tạm khoá; đổi mật khẩu / quyền / khoá thì người đó phải đăng nhập lại.
- Lần đầu máy chủ tự tạo tài khoản **admin / doimatkhau** — hãy đổi mật khẩu ngay trong sheet.
- Mọi thao tác đều được máy chủ kiểm tra quyền; cột **Người lưu** ghi ai đã lưu từng dòng.

## Lưu vào Google Drive

Dữ liệu được lưu thẳng vào Drive (không cần nhập gì thêm):

```
Cà Tươi + Thu Hồi/
├── Dữ liệu Cà Tươi + Thu Hồi   (Google Sheet: tab "Cà tươi", "Thu hồi", "User")
└── Phiếu/<năm-tháng-ngày>/     (phiếu cà tươi PDF, phiếu thu hồi PNG)
```

Mất mạng vẫn lưu được: dữ liệu giữ trên máy và tự gửi lên Drive khi có mạng lại.

### Cài / cập nhật máy chủ (Apps Script)

1. Mở dự án trên [script.google.com](https://script.google.com/home), xoá nội dung cũ, dán toàn bộ [`apps-script/Code.gs`](apps-script/Code.gs), bấm 💾.
2. Lần đầu: **Triển khai → Tùy chọn triển khai mới → Ứng dụng web** (*Thực thi dưới dạng*: **Tôi**, *Người có quyền truy cập*: **Bất kỳ ai**).
   Đã triển khai: **Triển khai → Quản lý các tùy chọn triển khai → ✏️ → Phiên bản mới → Triển khai** (URL giữ nguyên).
3. URL `…/exec` được gắn sẵn trong trang (`GAS_URL` trong `index.html`).

## Đọc ảnh chữ viết tay chính xác hơn (tuỳ chọn)

Mặc định ảnh được đọc ngay trên máy (Tesseract.js). Nhập khoá **Google Gemini API** (miễn phí tại [aistudio.google.com](https://aistudio.google.com/apikey)) trong ⚙️ để đọc chữ viết tay tốt hơn.
