# Phase 00 — Chốt yêu cầu và quyết định

## Mục tiêu

Biến bộ tài liệu hiện tại thành đầu vào đủ rõ để triển khai, không để sinh viên phải tự đoán chính sách nghiệp vụ hoặc công nghệ.

## Step P00-S01 — Chốt kiến trúc truy cập

**Mô tả ngắn:** So sánh Hono và ASP.NET Core theo năng lực nhóm, hosting, test và code hiện có; tạo ADR và chọn đúng một backend.

**Tham chiếu:** Feature/OQ `OQ-001`, `OQ-002`; Rule Các OQ/decision được nêu trong step; Workflow Không.

**Công việc:**
- [ ] So sánh Hono và ASP.NET Core theo năng lực nhóm, hosting, test và code hiện có; tạo ADR và chọn đúng một backend.
- [ ] Chọn JWT hoặc session; chốt OTP, mật khẩu, khóa tài khoản, timeout và seed Admin gốc.
- [ ] Đồng bộ `README.md`, `PROJECT_SPEC.md`, lệnh chạy và cấu trúc thư mục theo quyết định.

**Acceptance:**
- [ ] Không còn hai backend hoặc hai cơ chế auth cùng được xem là phương án triển khai.

**Verification:**
- [ ] Người phụ trách duyệt ADR; lệnh trong `PROJECT_SPEC.md` khớp repository.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** Không

**Files:** `docs/decisions/ADR-002-*.md`, `docs/decisions/ADR-003-*.md`, `README.md`, `docs/PROJECT_SPEC.md`.

**Quy mô:** M

## Step P00-S02 — Chốt chính sách tài chính thuê

**Mô tả ngắn:** Chốt đơn giá thuê, phần ngày lẻ, làm tròn và mức hư hỏng/bồi thường.

**Tham chiếu:** Feature/OQ `OQ-003` đến `OQ-006`, `OQ-008`, `OQ-009`, `OQ-011`; Rule Các OQ/decision được nêu trong step; Workflow Không.

**Công việc:**
- [ ] Chốt đơn giá thuê, phần ngày lẻ, làm tròn và mức hư hỏng/bồi thường.
- [ ] Chốt hoàn cọc, giới hạn tiền mặt, hạn mức thu mua và cách phân loại khoản phạt.
- [ ] Chọn nhà cung cấp VietQR/webhook, chữ ký, retry và quy trình đối soát.

**Acceptance:**
- [ ] Mọi công thức có ví dụ số cụ thể và kết quả mong đợi.
- [ ] mọi ngoại lệ ghi rõ người có quyền duyệt.

**Verification:**
- [ ] Review bảng ví dụ với người phụ trách sản phẩm/kế toán; cập nhật business rule tương ứng.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P00-S01`

**Files:** `docs/decisions/PDR-008-*.md`, `docs/decisions/ADR-004-*.md`, `docs/requirements/BUSINESS_RULES.md`, `docs/OPEN_QUESTIONS.md`.

**Quy mô:** M

## Checkpoint CP00-A — Sau P00-S02

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.


## Step P00-S03 — Chốt phạm vi tích hợp

**Mô tả ngắn:** Chốt nhà cung cấp Zalo, mẫu tin, lịch retry và cơ chế ca qua ngày.

**Tham chiếu:** Feature/OQ `OQ-007`, `OQ-010`, `OQ-012` đến `OQ-014`; Rule Các OQ/decision được nêu trong step; Workflow Không.

**Công việc:**
- [ ] Chốt nhà cung cấp Zalo, mẫu tin, lịch retry và cơ chế ca qua ngày.
- [ ] Chốt mẫu báo cáo, module yêu cầu khách hàng có làm trong MVP hay lùi phạm vi.
- [ ] Chốt mục tiêu hiệu năng, backup, RPO/RTO, retention và coverage; sửa thống nhất ID câu hỏi NFR.

**Acceptance:**
- [ ] Không còn P0.
- [ ] P1/P2 còn lại có owner, hạn chốt và phase bị ảnh hưởng.

**Verification:**
- [ ] Tất cả liên kết OQ hợp lệ; không còn tham chiếu tới ID OQ không tồn tại.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P00-S02`

**Files:** `docs/decisions/*.md`, `docs/OPEN_QUESTIONS.md`, `docs/PROJECT_SPEC.md`, `docs/requirements/*.md`

**Quy mô:** M

## Step P00-S04 — Duyệt đầu vào triển khai

**Mô tả ngắn:** Chuyển `PROJECT_SPEC.md`, feature/rule/workflow cần dùng đầu tiên sang `Accepted` sau review.

**Tham chiếu:** Feature/OQ Không; Rule Các OQ/decision được nêu trong step; Workflow Không.

**Công việc:**
- [ ] Chuyển `PROJECT_SPEC.md`, feature/rule/workflow cần dùng đầu tiên sang `Accepted` sau review.
- [ ] Tạo feature spec theo đúng thứ tự phase, bắt đầu từ nền tảng, auth và danh mục.
- [ ] Mỗi spec có quyền, trạng thái, nhánh lỗi, acceptance và NFR liên quan.

**Acceptance:**
- [ ] Các feature của Phase 01–03 đạt Definition of Ready trong `requirements/QUALITY.md`.

**Verification:**
- [ ] Checklist review spec không còn mục P0 hoặc acceptance không kiểm thử được.
- [ ] Các lệnh áp dụng trong bảng `Lệnh chuẩn` pass.

**Dependencies:** `P00-S03`

**Files:** `docs/decisions/*.md`, `docs/OPEN_QUESTIONS.md`, `docs/PROJECT_SPEC.md`, `docs/requirements/*.md`

**Quy mô:** M

## Checkpoint CP00-B — Hoàn tất phase

- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
