# Phase 11 — Nhân sự, chấm công và lương theo ca

## Mục tiêu

Ghi nhận từng ca/lần làm, sửa có phê duyệt và trả lương gắn đúng ca; không mở rộng thành lịch làm hoặc bảng lương theo kỳ.

## Step 1 — Hồ sơ và bản ghi ca

**Feature:** `EMP-001`, `SHIFT-001`.

- [ ] BE dùng hồ sơ nhân viên Phase 02, tạo bản ghi duy nhất theo nhân viên/ngày/thứ tự ca.
- [ ] FE có danh sách ca cá nhân và màn hình Admin tra cứu.
- [ ] Test nhiều ca cùng ngày và trùng `shift_no`.

**Chấp nhận:** Không có module lịch tuần/tháng; nhân viên nghỉ việc được đổi trạng thái, không xóa.

**Kiểm chứng:** Constraint test + E2E tạo ca.

**Phạm vi:** M.

## Step 2 — Check-in, check-out và trạng thái công

**Feature:** `ATT-001`.

- [ ] BE ghi thời điểm, số phút và trạng thái có mặt/trễ/vắng/thiếu/nghỉ theo policy.
- [ ] FE cho nhân viên thao tác ca của mình và hiển thị lỗi rõ khi sai thứ tự.
- [ ] Test check-out trước check-in, thao tác lặp và ca qua ngày theo quyết định Phase 00.

**Chấp nhận:** Thiếu một đầu được đánh dấu thiếu chấm công, không tự suy đoán giờ.

**Kiểm chứng:** Unit time test + E2E WF-09.

## Step 3 — Điều chỉnh chấm công

**Feature:** `ATT-002`.

- [ ] BE tạo yêu cầu có lý do và snapshot trước/sau; Admin duyệt mới áp dụng.
- [ ] FE có luồng yêu cầu và hàng chờ duyệt.
- [ ] Test tự duyệt, sửa sau duyệt và audit.

**Chấp nhận:** Mọi sửa thủ công truy được người yêu cầu/người duyệt/lý do.

**Kiểm chứng:** RBAC + audit integration test.

## Step 4 — Lương và ghi nhận chi theo ca

**Feature:** `PAYROLL-001`–`PAYROLL-003`.

- [ ] BE lưu lương thực nhận theo ca, duyệt điều chỉnh và tạo payment chi đúng một ca.
- [ ] FE cho nhân viên xem lương bản thân; Admin ghi/duyệt/trả lương.
- [ ] Test quyền xem, trả trùng, tiền mặt không có ca két và chuyển khoản ngoài hệ thống.

**Chấp nhận:** Một khoản chi lương truy đúng WorkRecord; không có bảng lương theo kỳ.

**Kiểm chứng:** Integration + E2E WF-10.

## Checkpoint Phase 11

- [ ] WF-09 và WF-10 pass.
- [ ] Dữ liệu lương được che đúng quyền.
- [ ] Điều chỉnh công/lương đều có duyệt và audit.

