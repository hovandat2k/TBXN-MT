# Cà tươi + Thu hồi (TBXN-MT)

👉 Dùng tại: https://hovandat2k.github.io/TBXN-MT/

Trang gồm 3 thẻ:

- **🌱 Cà tươi** – dán ảnh / PDF phiếu cân (Ctrl+V), tự đọc khách hàng, TL thực, Xanh – Nổi – Chín, tính tổng và trung bình có trọng số, xuất phiếu kết quả (ảnh, PDF, in). Bấm **💾 Lưu** để lưu lô cân.
- **⚖️ Thu hồi** – cách tính giống trang “Tính thu hồi cà phê” cũ (mẫu riêng 2000 g / mẫu chung 10000 g, bảng trừ ẩm). **Tên mẫu** là danh sách các xe đã lưu ở phiếu cà tươi mà chưa làm thu hồi; lưu mẫu xong xe đó biến mất khỏi danh sách. Phiếu thu hồi có thêm KL cà tươi của xe.
- **📚 Lịch sử** – xem theo **ngày** (từng lô cân, mở lại lô để sửa / in lại) hoặc theo **khách hàng**; có tổng KL, TB Xanh/Nổi/Chín, TB thu hồi (theo KL cà tươi); xoá mẫu thu hồi để làm lại.

## Lưu vào Google Drive (cài 1 lần)

Dữ liệu được lưu vào thư mục **“Cà Tươi + Thu Hồi”** trên Google Drive của bạn:

```
Cà Tươi + Thu Hồi/
├── Dữ liệu Cà Tươi + Thu Hồi   (Google Sheet: tab "Cà tươi" – mỗi xe 1 dòng, tab "Thu hồi" – mỗi mẫu 1 dòng)
└── Phiếu/<năm-tháng-ngày>/     (phiếu cà tươi PDF, phiếu thu hồi PNG)
```

1. Mở trang → ⚙️ → **📋 Sao chép mã Apps Script** (hoặc mở tệp [`apps-script/Code.gs`](apps-script/Code.gs)).
2. Vào [script.google.com](https://script.google.com/home/projects/create) → dự án mới → xoá nội dung có sẵn → dán mã → 💾.
3. **Triển khai → Tùy chọn triển khai mới** → loại **Ứng dụng web** → *Thực thi dưới dạng*: **Tôi**, *Người có quyền truy cập*: **Bất kỳ ai** → Triển khai → cấp quyền.
4. Sao chép **URL ứng dụng web** (đuôi `/exec`) → dán vào ⚙️ → **Kiểm tra & lưu**.
5. Trên máy / điện thoại khác chỉ cần dán cùng URL đó để dùng chung dữ liệu.

- Có thể đặt `MA_BAO_VE` trong mã để chỉ người biết mã mới ghi được dữ liệu (nhập cùng mã trong ⚙️).
- Mất mạng vẫn lưu được: dữ liệu giữ trên máy và tự gửi lên Drive khi có mạng lại.
- Chưa cài Drive thì dữ liệu chỉ lưu trên trình duyệt của máy đang dùng.

## Đọc ảnh chữ viết tay chính xác hơn (tuỳ chọn)

Mặc định ảnh được đọc ngay trên máy (Tesseract.js). Nhập khoá **Google Gemini API** (miễn phí tại [aistudio.google.com](https://aistudio.google.com/apikey)) trong ⚙️ để đọc chữ viết tay tốt hơn.
