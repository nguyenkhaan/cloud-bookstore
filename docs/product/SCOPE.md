# Phạm vi sản phẩm

**Trạng thái:** Accepted

## Trong phạm vi MVP

- Một web app nội bộ cho một cửa hàng vật lý.
- POS tại quầy và giao diện quản trị/kho theo quyền.
- Ba vai trò: Admin, Nhân viên và Quản lý kho.
- Tài khoản nhân viên, xác thực, phân quyền và audit log.
- Danh mục, bộ sách, đầu sách/tập, ấn bản và từng bản sách vật lý.
- Nhà cung cấp, nhập/xuất kho, cấp/in `CopyBarcode`, kiểm kê và cảnh báo tồn.
- Thu mua sách cũ từ khách hàng.
- Bán sách tại quầy.
- Cho thuê, gia hạn, nhận trả và quyết toán tiền cọc.
- Hồ sơ khách hàng và hạng Thường/Bạc/Vàng.
- Tiền mặt, VietQR, webhook, đối soát và giao dịch đảo.
- Ca thu ngân và két tiền.
- Nhân viên, chấm công theo ca và lương theo ca.
- Thông báo khách hàng qua Zalo; thông báo nội bộ/email cho nhân viên.
- Báo cáo bán, thuê, kho, tài chính, nhân sự và dữ liệu phục vụ thuế.
- Cấu hình nghiệp vụ có lịch sử và thời điểm hiệu lực.

## Ngoài phạm vi

- Bất kỳ giao diện đăng nhập hoặc tự phục vụ nào cho khách hàng.
- Web portal tra cứu, đặt giữ, đặt trước hoặc hàng chờ.
- Gia hạn do khách tự thực hiện hoặc phản hồi hai chiều qua Zalo.
- Mua/thuê trực tuyến, giao hàng hoặc nhận trả tận nơi.
- Điểm tích lũy, đổi điểm, ví điện tử nội bộ hoặc thẻ trả trước.
- Đa chi nhánh, trả khác chi nhánh hoặc điều chuyển liên chi nhánh.
- Mô hình SaaS đa cửa hàng/đa tenant.
- Văn phòng phẩm, quà tặng, F&B hoặc quản lý nguyên liệu.
- Tự động chuyển tiền ra từ ngân hàng.
- Tự động lập/nộp hồ sơ thuế.
- Đổi trả sách đã bán theo chính sách thông thường.
- Mẫu ca, lịch làm, yêu cầu nghỉ/đổi ca, bảng công và bảng lương theo kỳ.

## Giả định vận hành

- Mọi giao dịch nghiệp vụ diễn ra trực tiếp tại quầy.
- Cửa hàng có máy quét Barcode ISBN/`CopyBarcode` và máy in tem `CopyBarcode`.
- ISBN là dữ liệu tùy chọn của ấn bản và không dùng làm khóa định danh bản vật lý.
- Mỗi bản sách được dán một CopyBarcode nội bộ duy nhất.
- Khách nhận thông báo một chiều qua Zalo khi đã có số điện thoại phù hợp.
- Cửa hàng có tài khoản và thông tin tích hợp cần thiết cho VietQR, Zalo và API sách.
- Các giá trị chưa chốt phải được cấu hình hoặc giữ trạng thái `Open`, không hard-code.

## Ranh giới dữ liệu

- Dữ liệu tài chính đã hoàn tất là bất biến.
- Dữ liệu đã được giao dịch tham chiếu không được xóa vật lý theo luồng thông thường.
- Cấu hình mới chỉ áp dụng theo thời điểm hiệu lực và không viết lại lịch sử.
- Legacy docs không tạo thêm phạm vi nếu chức năng không có trong [`FEATURE.md`](../FEATURE.md).
