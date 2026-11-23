# AUD-001 Frontend P1 Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khôi phục build frontend, chặn XSS/CSV injection ở luồng in tem và loại bỏ thành công giả trong các thao tác tài khoản chưa có API.

**Architecture:** Giữ nguyên UI và boundary hiện có. Dọn import/type ở nguồn lỗi, chuẩn hóa dữ liệu thiếu về `null` trước formatter, escape mọi dữ liệu động trước khi tạo print document/CSV, và chuyển các submit chưa có backend contract sang lỗi trung thực giữ nguyên input.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Node test runner, Bun, Oxlint.

**Spec:** [`AUD-001-frontend-p1-stabilization.md`](../specs/AUD-001-frontend-p1-stabilization.md)

## Global Constraints

- Chỉ sửa frontend, test và SSOT liên quan; không sửa backend, database, OpenAPI hoặc `src/contract/api-contract.ts`.
- Không đổi bố cục, điều hướng hoặc RBAC hiện có.
- Không mô phỏng completion cho thao tác chưa có API; không xóa input người dùng sau lỗi.
- Sale, rental, return, payment/QR và damage settlement không thuộc plan vì chưa có contract và bị chặn bởi `OQ-003`, `OQ-004`, `OQ-006`.
- Không thêm dependency.

## Review Focus

- Giá `undefined` phải trở thành trạng thái thiếu dữ liệu, không bị hiển thị như 0 hoặc gây lỗi type.
- Ký tự `<`, `>`, `&`, `'`, `"` trong barcode, tiêu đề, grade hay batch code phải chỉ xuất hiện như văn bản trong bản in.
- Giá trị CSV bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc carriage-return không được Excel diễn giải thành công thức.
- Submit đổi mật khẩu/hồ sơ/phiên thiếu API phải giữ nguyên form và không phát toast thành công, không điều hướng hoặc đổi mock state.
- Các thay đổi không được ảnh hưởng implementation RBAC chưa commit trong working tree.

---

## Artifact Map

### Files to create

- `app/frontend/tests/frontend-p1-stabilization.test.mjs`: regression tests cho build cleanup, escape print/CSV và fallback account.

### Main files to modify

- `app/frontend/src/features/audit/pages/AuditPage.tsx`
- `app/frontend/src/features/dashboard/pages/DashboardPage.tsx`
- `app/frontend/src/features/catalog/pages/CopyDetailPage.tsx`
- `app/frontend/src/features/reports/pages/TaxDeclarationReportPage.tsx`
- `app/frontend/src/features/catalog/components/BookCopyLifecycleDrawer.tsx`
- `app/frontend/src/components/common/BarcodeLabel/BarcodeLabelsPrintModal.tsx`
- `app/frontend/src/features/auth/pages/FirstChangePasswordPage.tsx`
- `app/frontend/src/features/auth/components/ChangePasswordModal.tsx`
- `app/frontend/src/features/auth/pages/ProfileSecurityPage.tsx`
- `docs/plans/todo.md`

## Ordered Task Index

| ID | Deliverable | Depends on | Size |
| --- | --- | --- | :---: |
| `AUD-001-T01` | Xóa blocker TypeScript và fallback giá thiếu | Không | S |
| `AUD-001-T02` | Escape an toàn cho print document và CSV tem | T01 | S |
| `AUD-001-T03` | Fallback trung thực cho thao tác tài khoản chưa có API | T01 | S |
| `AUD-001-T04` | Regression gates và evidence | T01–T03 | XS |

### Task 1: Xóa blocker TypeScript và fallback giá thiếu

**Files:** các page/component build lỗi và `tests/frontend-p1-stabilization.test.mjs`.

**Acceptance Criteria:** build không còn 9 lỗi TypeScript baseline; `sellingPrice`/`rentalRate` thiếu hiển thị bằng fallback formatter hiện có.

- [x] Viết test source regression xác nhận không còn import/biến audit đã nêu và drawer chuẩn hóa optional price thành `null`.
- [x] Chạy focused test, xác nhận fail trên baseline.
- [x] Bỏ import/biến không dùng; truyền `printedLabel.sellingPrice ?? null` và `printedLabel.rentalRate ?? null` vào `formatVnd`.
- [x] Chạy focused test và `bun run build`, xác nhận pass.

### Task 2: Escape an toàn cho print document và CSV tem

**Files:** `BarcodeLabelsPrintModal.tsx`, `tests/frontend-p1-stabilization.test.mjs`.

**Interfaces:** export pure `escapePrintHtml(value: string): string` và `escapeBarcodeLabelCsvCell(value: string | number): string` từ component module để regression test gọi qua Vite SSR.

**Acceptance Criteria:** mọi field dynamic của print document được HTML-escape; CSV title/barcode/grade neutralize prefix công thức và escape quote/dấu phân cách đúng CSV.

- [x] Viết test với payload HTML và formula prefix; chạy, xác nhận fail vì helper chưa export/chưa được dùng.
- [x] Cài đặt helper tối thiểu và dùng chúng tại tất cả interpolation dynamic trong print/CSV label.
- [x] Chạy focused security test, xác nhận pass.

### Task 3: Fallback trung thực cho thao tác tài khoản chưa có API

**Files:** `FirstChangePasswordPage.tsx`, `ChangePasswordModal.tsx`, `ProfileSecurityPage.tsx`, `tests/frontend-p1-stabilization.test.mjs`.

**Acceptance Criteria:** sau validation, đổi mật khẩu lần đầu/đổi mật khẩu/hồ sơ/đăng xuất thiết bị không giả lập thành công, không reset/đóng/điều hướng hay đổi device state; user nhìn thấy thông báo lỗi ngắn và dữ liệu nhập được giữ lại.

- [x] Viết regression assertions: không còn timeout fake-success và các handler không gọi success/state completion khi backend chưa có mutation.
- [x] Chạy focused test, xác nhận fail trên baseline.
- [x] Thay timeout và completion mock bằng error state/toast theo component; xóa link bypass dashboard ở first-change flow.
- [x] Chạy focused test, xác nhận pass.

### Task 4: Regression gates và evidence

**Files:** `docs/plans/todo.md`.

**Acceptance Criteria:** toàn bộ test/lint/build/diff check đạt; task evidence nêu rõ POS và backend contracts vẫn ngoài phạm vi.

- [x] Chạy `bun run test`, `bun run lint`, `bun run build` và `git diff --check`.
- [x] Kiểm tra final diff/status, cập nhật `AUD-001-T04` trong todo với số liệu thực.

## Completion Evidence

- `bun run test`: 248/248 pass.
- `bun run lint`: exit 0; 17 cảnh báo cũ ngoài phạm vi.
- `bun run build`: pass; chỉ còn cảnh báo bundle Vite >500 kB.
- `git diff --check`: pass.
