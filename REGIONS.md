# Tài khoản và khu vực

Sheet **User** có các cột: Tên đăng nhập, Mật khẩu, Quyền, Họ tên, Khoá, **Khu vực** (cột F).

| Quyền | Chức năng | Phạm vi |
|---|---|---|
| admin | Toàn bộ chức năng; chọn từng khu vực hoặc tất cả | Tất cả khu vực |
| ICS | Cà tươi, Thu hồi, Tổng hợp mẫu; thêm/sửa dữ liệu | Khu vực được gán |
| ICS-thuhoi | Thu hồi nhập đầy đủ thông tin; Tổng hợp mẫu rút gọn có thể sửa | Khu vực được gán |
| Thu hồi | Giữ luồng nhập/sửa mẫu thu hồi trước đây | Khu vực được gán |
| Chỉ xem | Xem Tổng hợp mẫu | Khu vực được gán |

Khu vực nhập đúng một trong: **Lào**, **Lâm Đồng**, **Sơn La**. Bắt buộc cho mọi quyền trừ admin. Admin có thể để trống cột Khu vực. Người quản lý tự điền quyền và khu vực của từng tài khoản trong sheet User. Giá trị “Toàn quyền” cũ cần đổi thành `admin` hoặc `ICS` phù hợp. Không tự động nâng tài khoản cũ thành admin.

Đổi quyền, khu vực, mật khẩu hoặc khoá tài khoản sẽ vô hiệu phiên đăng nhập cũ; người dùng cần đăng nhập lại. Cache, bản nháp và hàng đợi mới được tách theo tài khoản, quyền và khu vực; các hàng đợi cũ chưa đồng bộ không tự động nhập vào khu vực mới.

## Nâng cấp dữ liệu

Cập nhật toàn bộ `apps-script/Code.gs`, lưu và triển khai **phiên bản mới trên URL /exec hiện có** trước khi cập nhật giao diện. Chạy hàm `bangTinh` một lần (hoặc đăng nhập lần đầu sau nâng cấp) để thêm cột mới và nâng schema lên 3.

Các dòng Cà tươi/Thu hồi chưa có khu vực được gán **Lâm Đồng**. Dòng đã có khu vực giữ nguyên. Không tự gán khu vực hay đổi quyền/mật khẩu tài khoản trong User. Máy chủ kiểm tra khu vực khi đọc, thêm, sửa, xoá và cập nhật tệp phiếu; không chỉ lọc giao diện.

## ICS-thuhoi

Không có tab Cà tươi. Form Thu hồi yêu cầu tên khách hàng; số xe, khối lượng cà tươi, Xanh/Nổi/Chín có thể để trống. KL mẫu và độ ẩm vẫn dùng để tính thu hồi. Bảng Tổng hợp mẫu có bảy cột: Khách hàng, Số xe, Khối lượng, Xanh, Nổi, Chín, Thu hồi. Thông tin sửa từ bảng này được lưu vào phiếu thu hồi.

Admin chọn khu vực cụ thể để thêm phiếu mới; khi xem tất cả, phiếu đã có vẫn giữ khu vực ban đầu. Hoàn tất đồng bộ/chỉnh sửa trước khi chuyển khu vực.
