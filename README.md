# Trung bình Xanh – Nổi (TBXN-MT)

Trang web tính **tổng khối lượng** và **trung bình có trọng số % xanh, % nổi** từ ảnh phiếu cân cà phê.

👉 Dùng tại: https://hovandat2k.github.io/TBXN-MT/

## Cách dùng
1. Chụp màn hình / chụp ảnh phiếu cân (đã ghi tay `17X - 20N` dưới cột *Giờ cân*).
2. Mở trang, nhấn **Ctrl + V** (hoặc nút *Dán ảnh* / *Chọn ảnh* trên điện thoại).
3. Trang tự đọc **Khách hàng**, **TL Thực**, **Xanh**, **Nổi**. Ô viền vàng = nên kiểm tra lại; bấm vào ảnh chữ viết tay để phóng to và sửa trực tiếp.
4. Kết quả (tổng KL, TB Xanh, TB Nổi) cập nhật ngay khi sửa.
5. Ảnh kết quả giống phiếu cân + 2 cột Xanh, Nổi: **Sao chép ảnh** để dán vào Zalo/Messenger, hoặc **Chia sẻ** / **Tải ảnh**.

TB có trọng số = Σ(TL thực × %) ÷ Σ TL thực.

## Đọc chữ viết tay chính xác hơn (tuỳ chọn)
Mặc định ảnh được đọc ngay trên máy bằng Tesseract.js (không gửi ảnh đi đâu). Chữ in đọc tốt, chữ viết tay có thể sai.
Vào ⚙️ và nhập khoá **Google Gemini API** miễn phí (https://aistudio.google.com/apikey) để đọc chữ viết tay tốt hơn — khoá chỉ lưu trên trình duyệt của bạn.
