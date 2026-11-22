# Tách màn hình điểm danh và nhân sự Admin

## Ý định

Tách rõ hai nhu cầu đang bị trộn trong `AttendancePage`: nhân viên cần điểm danh theo các ca của chính mình, còn Admin cần xem và điều chỉnh bảng chấm công, lương ca và phân công ca của toàn bộ nhân viên.

## Mục tiêu

- `/hr/attendance` chỉ hiển thị các card điểm danh của nhân viên hiện tại.
- Mặc định chọn ngày hiện tại của bộ dữ liệu demo và hiển thị các ca cần điểm danh trong ngày; một nhân viên có thể có nhiều card theo các ca khác nhau.
- Bộ lọc ngày dùng control calendar để xem lại card của các ngày trước; dữ liệu ngày cũ chỉ để xem và không cho thao tác điểm danh mới.
- Tạo khu vực Admin `/admin/hr` với hai tab:
  - `Chấm công & lương ca`: bảng toàn bộ nhân viên, trạng thái chấm công, giờ công, lương ca và điều chỉnh.
  - `Phân công ca`: nội dung quản trị từ màn hình phân công ca hiện tại.
- Thêm mục Sidebar `Nhân sự` trỏ vào `/admin/hr`; giữ mục nhân viên riêng là `Điểm danh`.
- Tạm thời chỉ dùng dữ liệu UI demo, không thêm service, hook hoặc API; Admin guard sẽ bổ sung sau.

## Ngoài phạm vi

- Không triển khai phân quyền Admin ở route hoặc backend.
- Không nối dữ liệu thật, không thay đổi API contract hoặc schema.
- Không xây dựng lịch tuần/tháng, kỳ lương hoặc workflow phê duyệt thật.

## Quyết định giao diện và hành vi

- Giữ `MainLayout`, Sidebar, Breadcrumb và các primitive Tailwind hiện tại.
- Card điểm danh là block chính của màn hình nhân viên: tên nhân viên, ngày, ca, khung giờ, quầy, trạng thái, check-in/check-out và các nút thao tác.
- Ngày được chọn hiển thị bằng `input[type="date"]` có label rõ ràng; khi mở control, trình duyệt cung cấp calendar native.
- Với ngày đã chọn khác ngày demo hiện tại, card được hiển thị ở chế độ xem lại; thao tác check-in/check-out bị vô hiệu hóa.
- Dữ liệu demo dùng ngày `18/10/2026` làm “hôm nay” để màn hình không rỗng trong môi trường chưa có API. Khi nối API, ngày hiện tại và nhân viên hiện tại sẽ lấy từ server/session.
- Tab Admin dùng route riêng:
  - `/admin/hr` redirect tới `/admin/hr/attendance`.
  - `/admin/hr/attendance` hiển thị bảng chấm công và lương ca.
  - `/admin/hr/shifts` hiển thị phân công ca.
- Các route cũ `/hr/attendance` vẫn là trang nhân viên; `/hr/shifts` redirect sang `/admin/hr/shifts` để giữ liên kết cũ nhưng không tiếp tục đặt màn hình quản trị trong workspace nhân viên.

## Các cách đã cân nhắc

1. Giữ khu vực `/hr` và thêm `/admin/attendance` riêng. Ít thay đổi nhất nhưng vẫn để màn hình phân công ca quản trị ở `/hr/shifts`, không tách trọn phạm vi Admin.
2. Tạo khu vực `/admin/hr` có hai tab, đồng thời biến `/hr/attendance` thành màn hình điểm danh cá nhân. Đây là phương án được chọn vì ranh giới quyền và mục đích màn hình rõ ràng, đồng thời giữ được các route cũ bằng redirect.
3. Chỉ tạo một trang Admin duy nhất, bỏ route riêng cho phân công ca. Cách này làm tab khó deep-link và không thuận tiện mở trực tiếp từng màn hình quản trị.

## Kiểm thử và bàn giao

- Bổ sung source-contract tests cho card nhiều ca, bộ lọc ngày/calendar, route Admin và Sidebar.
- Chạy focused tests, sau đó `bun run test`, `bun run lint`, `bun run build` và `git diff --check`.
- Ghi nhận riêng các lỗi baseline đã có trong worktree, không quy chúng cho thay đổi này.
