# Phase 00 — Chốt yêu cầu và quyết định

## Mục tiêu

Biến bộ tài liệu hiện tại thành đầu vào đủ rõ để triển khai, không để sinh viên phải tự đoán chính sách nghiệp vụ hoặc công nghệ.

## Step 1 — Chốt nền tảng backend và xác thực

**Phạm vi:** `OQ-001`, `OQ-002`.

- [ ] So sánh Hono và ASP.NET Core theo năng lực nhóm, hosting, test và code hiện có; tạo ADR và chọn đúng một backend.
- [ ] Chọn JWT hoặc session; chốt OTP, mật khẩu, khóa tài khoản, timeout và seed Admin gốc.
- [ ] Đồng bộ `README.md`, `PROJECT_SPEC.md`, lệnh chạy và cấu trúc thư mục theo quyết định.

**Chấp nhận:** Không còn hai backend hoặc hai cơ chế auth cùng được xem là phương án triển khai.

**Kiểm chứng:** Người phụ trách duyệt ADR; lệnh trong `PROJECT_SPEC.md` khớp repository.

**File dự kiến:** `docs/decisions/ADR-002-*.md`, `docs/decisions/ADR-003-*.md`, `README.md`, `docs/PROJECT_SPEC.md`.

## Step 2 — Chốt chính sách tiền và thuê

**Phạm vi:** `OQ-003` đến `OQ-006`, `OQ-008`, `OQ-009`, `OQ-011`.

- [ ] Chốt đơn giá thuê, phần ngày lẻ, làm tròn và mức hư hỏng/bồi thường.
- [ ] Chốt hoàn cọc, giới hạn tiền mặt, hạn mức thu mua và cách phân loại khoản phạt.
- [ ] Chọn nhà cung cấp VietQR/webhook, chữ ký, retry và quy trình đối soát.

**Chấp nhận:** Mọi công thức có ví dụ số cụ thể và kết quả mong đợi; mọi ngoại lệ ghi rõ người có quyền duyệt.

**Kiểm chứng:** Review bảng ví dụ với người phụ trách sản phẩm/kế toán; cập nhật business rule tương ứng.

**File dự kiến:** `docs/decisions/PDR-008-*.md`, `docs/decisions/ADR-004-*.md`, `docs/requirements/BUSINESS_RULES.md`, `docs/OPEN_QUESTIONS.md`.

## Step 3 — Chốt tích hợp, NFR và phạm vi phụ

**Phạm vi:** `OQ-007`, `OQ-010`, `OQ-012` đến `OQ-014` và tham chiếu sai `OQ-015`.

- [ ] Chốt nhà cung cấp Zalo, mẫu tin, lịch retry và cơ chế ca qua ngày.
- [ ] Chốt mẫu báo cáo, module yêu cầu khách hàng có làm trong MVP hay lùi phạm vi.
- [ ] Chốt mục tiêu hiệu năng, backup, RPO/RTO, retention và coverage; sửa thống nhất ID câu hỏi NFR.

**Chấp nhận:** Không còn P0; P1/P2 còn lại có owner, hạn chốt và phase bị ảnh hưởng.

**Kiểm chứng:** Tất cả liên kết OQ hợp lệ; không còn tham chiếu `OQ-015` nếu mục đó không tồn tại.

## Step 4 — Duyệt spec cấp dự án và lập feature spec

- [ ] Chuyển `PROJECT_SPEC.md`, feature/rule/workflow cần dùng đầu tiên sang `Accepted` sau review.
- [ ] Tạo feature spec theo đúng thứ tự phase, bắt đầu từ nền tảng, auth và danh mục.
- [ ] Mỗi spec có quyền, trạng thái, nhánh lỗi, acceptance và NFR liên quan.

**Chấp nhận:** Các feature của Phase 01–03 đạt Definition of Ready trong `requirements/QUALITY.md`.

**Kiểm chứng:** Checklist review spec không còn mục P0 hoặc acceptance không kiểm thử được.

## Checkpoint Phase 00

- [ ] Backend, auth và nhà cung cấp tích hợp đã có quyết định rõ.
- [ ] Tài liệu không còn mâu thuẫn chưa đánh dấu.
- [ ] Người phụ trách xác nhận cho phép bắt đầu setup.

