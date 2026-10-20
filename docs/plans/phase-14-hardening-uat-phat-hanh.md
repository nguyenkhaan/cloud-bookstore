# Phase 14 — Hardening, UAT và phát hành

## Mục tiêu

Chứng minh hệ thống an toàn, ổn định và dùng được tại quầy trước production.

## Step 1 — Rà soát bảo mật và quyền riêng tư

- [ ] Kiểm tra auth, RBAC, input validation, rate limit, CORS/CSRF theo cơ chế auth và dependency vulnerabilities.
- [ ] Kiểm tra secret, log, CCCD, lương, dữ liệu tài chính và retention.
- [ ] Chạy lại toàn bộ test gọi API ngoài quyền và webhook giả mạo.

**Chấp nhận:** Không còn lỗi mức nghiêm trọng/cao; lỗi còn lại có owner và phương án được duyệt.

**Kiểm chứng:** Báo cáo security review và test evidence.

**Phạm vi:** M.

## Step 2 — Hiệu năng và độ bền

- [ ] Đo p95 cho quét CopyBarcode, tìm khách, thêm dòng và hoàn tất giao dịch theo NFR.
- [ ] Test tải webhook, worker outbox, báo cáo lớn và truy vấn phân trang.
- [ ] Test mất kết nối, retry, restart worker và DB contention.

**Chấp nhận:** Đạt mục tiêu đã chốt; POS không bị báo cáo/job nền làm nghẽn.

**Kiểm chứng:** Báo cáo load test và so sánh với ngưỡng.

## Step 3 — Regression và dữ liệu mẫu

- [ ] Chạy toàn bộ unit/integration/contract/E2E cho WF-01 đến WF-11.
- [ ] Chuẩn bị seed UAT gồm nhiều ấn bản cùng ISBN, sách không ISBN, đủ ba hạng và các trạng thái lỗi.
- [ ] Kiểm tra migration từ DB trống và từ bản gần production.

**Chấp nhận:** Build/lint/test pass; không có test flaky đã biết.

**Kiểm chứng:** CI release pipeline xanh và migration rehearsal thành công.

## Step 4 — UAT tại quầy

- [ ] Admin, Nhân viên và Quản lý kho chạy kịch bản đúng vai trò với máy quét và máy in tem.
- [ ] Chạy bán, thuê–trả, thu mua, kiểm kê, đóng két, công/lương và fallback tích hợp.
- [ ] Ghi lỗi theo feature ID; sửa yêu cầu bằng spec/decision trước khi sửa code nếu hành vi mong đợi thay đổi.

**Chấp nhận:** Người phụ trách sản phẩm ký duyệt UAT; không còn lỗi chặn vận hành.

**Kiểm chứng:** Biên bản UAT và evidence từng workflow.

## Step 5 — Phát hành và theo dõi sau phát hành

- [ ] Chốt migration/backup/rollback plan, secret production và quyền tối thiểu.
- [ ] Deploy theo checklist, smoke test, theo dõi lỗi/thanh toán/outbox/DB.
- [ ] Xác định người trực và tiêu chí rollback; review sau phát hành.

**Chấp nhận:** Production health tốt, một giao dịch mẫu được truy vết đầu-cuối và rollback đã sẵn sàng.

**Kiểm chứng:** Smoke test production không dùng dữ liệu nhạy cảm thật ngoài phạm vi được phép.

## Checkpoint hoàn thành dự án

- [ ] Tất cả success criteria trong `PROJECT_SPEC.md` đạt.
- [ ] Mọi feature MVP có spec, test và evidence nghiệm thu.
- [ ] Không còn câu hỏi P0/P1 ảnh hưởng production.
- [ ] Tài liệu, decision, API và runbook khớp hệ thống đã phát hành.

