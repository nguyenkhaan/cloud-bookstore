# Phase 13 — Cấu hình, báo cáo và vận hành

## Mục tiêu

Cho Admin thay đổi policy có hiệu lực theo thời gian, xem báo cáo truy về chứng từ và vận hành hệ thống an toàn.

## Step 1 — Cấu hình có phiên bản

**Feature:** `CONFIG-001`–`CONFIG-003`.

- [ ] BE lưu giá trị cũ/mới, người đổi, thời điểm hiệu lực và validation theo loại cấu hình.
- [ ] FE có danh sách lịch sử, form thay đổi và cảnh báo phạm vi tác động.
- [ ] Test hiệu lực quá khứ/tương lai, quyền và snapshot giao dịch cũ.

**Chấp nhận:** Cấu hình mới không viết lại giao dịch đã hoàn tất.

**Kiểm chứng:** Time-based integration test + E2E thay đổi policy.

**Phạm vi:** M.

## Step 2 — Báo cáo bán, thuê và kho

**Feature:** `REPORT-001`–`REPORT-003`.

- [ ] BE query theo thời gian, đầu sách, thể loại, nhân viên, trạng thái; phân trang và timezone chuẩn.
- [ ] FE có bộ lọc, tổng hợp và drill-down về chứng từ/bản sách.
- [ ] Test giao dịch đảo, phiếu chưa hoàn tất và biên ngày `Asia/Ho_Chi_Minh`.

**Chấp nhận:** Tổng báo cáo khớp dữ liệu nguồn; không đếm nháp/cancelled như giao dịch hoàn tất.

**Kiểm chứng:** Dataset cố định + snapshot kết quả.

## Step 3 — Báo cáo tài chính, nhân sự và két

**Feature:** `REPORT-004`.

- [ ] BE tổng hợp từ payment ledger, ca két và work record; tách cọc khỏi doanh thu.
- [ ] FE giới hạn báo cáo theo vai trò và che dữ liệu lương/tài chính.
- [ ] Test hoàn cọc, đảo giao dịch, chênh lệch két và chi lương.

**Chấp nhận:** Mỗi tổng số drill-down được tới các chứng từ tạo thành nó.

**Kiểm chứng:** Reconciliation integration test + E2E theo quyền.

## Step 4 — Xuất file và dữ liệu thuế

**Feature:** `REPORT-005`.

- [ ] Chốt spec mẫu trước khi code; BE tạo job xuất file không khóa POS.
- [ ] FE tạo yêu cầu, theo dõi tiến độ và tải file theo quyền/thời hạn.
- [ ] Test file lớn, lỗi job, công thức và encoding tiếng Việt.

**Chấp nhận:** File đúng mẫu đã duyệt; hệ thống không tự nộp thuế.

**Kiểm chứng:** Contract/snapshot file + kiểm tra thủ công với kế toán.

## Step 5 — Health, backup và runbook

**Feature:** `OPS-001`, `OPS-002`.

- [ ] Health check app/DB/tích hợp ở mức không lộ secret.
- [ ] Thiết lập backup, restore drill, retention và cảnh báo theo NFR đã chốt.
- [ ] Viết runbook cho DB, webhook, đối soát, outbox và xuất file.

**Chấp nhận:** Khôi phục thành công trong mục tiêu RPO/RTO; health không gây gọi provider quá mức.

**Kiểm chứng:** Restore drill và fault-injection có biên bản.

## Checkpoint Phase 13

- [ ] Báo cáo đối soát được tới chứng từ.
- [ ] Cấu hình có version và không đổi lịch sử.
- [ ] Backup/restore và runbook đã được diễn tập.

