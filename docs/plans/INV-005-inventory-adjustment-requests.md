# Plan: INV-005 / P10-S03 — Quản lý và Xử lý Yêu cầu Điều chỉnh Kho (`inventory_adjustment_requests`)

## Mục tiêu
Xây dựng hoàn chỉnh luồng tạo, tra cứu, lọc/phân trang, xử lý duyệt và ghi Audit Log cho **Yêu cầu điều chỉnh kho** trên nền **100% bảng và enum đã có sẵn trong Database** (`inventory_adjustment_requests`, `inventory_checks`, `book_copies`, `audit_logs`, `BookCopyStatus`, `InventoryAdjustmentStatus`, `InventoryVarianceType`) — **tuyệt đối không sửa đổi Database**.

## Tham chiếu
- **Spec:** [`docs/specs/INV-005-inventory-adjustment-requests.md`](../specs/INV-005-inventory-adjustment-requests.md)
- **Feature:** `INV-005`, `RBAC-001`–`003`, `AUD-001`–`002`
- **Phase Plan:** [`docs/plans/phase-10-kiem-ke-va-dieu-chinh-kho.md`](./phase-10-kiem-ke-va-dieu-chinh-kho.md#step-p10-s03--duyệt-chênh-lệch)
- **Task Tracker:** [`docs/plans/todo.md`](./todo.md)

## Các bước triển khai (Vertical Slices)

### Slice 1 — Backend DTOs, Validation & State Machine Service (`app/backend`)
- **Mục tiêu:** Cài đặt toàn bộ nghiệp vụ lập, xem, xử lý trạng thái, ghi audit log và kiểm soát retention trên `InventoryAdjustmentRequestModel` & `InventoryCheckModel` mà không sửa DB.
- **Công việc:**
  1. Tạo DTOs tại `app/backend/src/Dto/InventoryAdjustmentDto/`:
     - `CreateInventoryAdjustmentRequestDto` (`CopyId` hoặc `InventoryCheckId`, `RequestedStatus`, `Reason`, `VarianceType?`, `IsFound?`, `CheckCode?`, `CheckNote?`)
     - `UpdateInventoryAdjustmentStatusDto` (`Status`, `Reason` / `RejectionReason`)
     - `InventoryAdjustmentQuery` (`Page`, `PageSize`, `Status`, `RequestedStatus`, `VarianceType`, `Search`, `From`, `To`)
     - `InventoryAdjustmentRequestResponse` & `InventoryAdjustmentRequestDetailResponse` (kèm thông tin `InventoryCheck`, `BookCopy`, `Title`, `RequestedByName`, `ApprovedByName`, và `History` từ `AuditLogs`)
  2. Tạo `InventoryAdjustmentValidator` (hoặc tái sử dụng `BookCopyValidator`):
     - Validate `Reason` / `RejectionReason` (bắt buộc, <= 500 ký tự), `CheckCode` (<= 20 ký tự), phân trang.
     - Kiểm tra `BookCopyValidator.EnsureStatusTransitionAllowed` và `EnsureNoActiveReferenceAsync` để không tạo/áp dụng yêu cầu sai luồng.
     - Kiểm tra ma trận chuyển đổi `InventoryAdjustmentStatus` (`PENDING_APPROVAL` → `APPROVED` / `APPLIED` / `REJECTED` / `CANCELLED`; `APPROVED` → `APPLIED` / `CANCELLED`; khóa trạng thái kết thúc).
  3. Tạo `InventoryAdjustmentService` (đăng ký Scoped trong `Program.cs`):
     - `CreateAsync`: kiểm tra quyền & xung đột pending duplicate, tạo `InventoryCheckModel` nền (nếu chưa có `InventoryCheckId`), tạo `InventoryAdjustmentRequestModel` (`PENDING_APPROVAL`), ghi `AuditLog` trong cùng transaction.
     - `GetPagedAsync` & `GetByIdAsync`: truy vấn JOIN với `InventoryChecks`, `BookCopies`, `Editions`, `Titles`, `Employees` (lọc và phân trang server-side trả `PagedResult<T>`), kèm lịch sử audit theo `EntityId`.
     - `UpdateStatusAsync`: thực thi phân quyền (`ADMIN` cho `APPROVED`/`REJECTED`/`APPLIED`, kiểm tra `RequestedBy != ActorId` không tự duyệt; `INVENTORY_MANAGER` chỉ được `CANCELLED` yêu cầu của chính mình khi đang `PENDING_APPROVAL`), cập nhật `BookCopy.Status` khi `APPLIED`, ghi `AuditLog` trong cùng transaction.
     - `DeleteByRetentionAsync`: chính sách retention — từ chối xóa cứng yêu cầu chưa kết thúc hoặc chưa quá thời hạn lưu trữ (mặc định 365 ngày từ `AppliedAt ?? ApprovedAt ?? RequestedAt`, hoặc đọc khóa `inventory_adjustment.retention_days` từ `SystemSettings`); nếu hợp lệ mới cho phép `ADMIN` xóa bản ghi `inventory_adjustment_requests` nhưng giữ nguyên `audit_logs`.
- **Files:** `app/backend/src/Dto/InventoryAdjustmentDto/**`, `app/backend/src/Services/InventoryAdjustmentService.cs`, `app/backend/Program.cs`.

### Slice 2 — Backend Controller & RBAC (`app/backend`)
- **Mục tiêu:** Mở REST endpoints bảo vệ chặt chẽ theo role tại controller.
- **Công việc:**
  1. Tạo `InventoryAdjustmentRequestsController` tại `/api/inventory-adjustment-requests`:
     - `GET /api/inventory-adjustment-requests` (`[Authorize(Roles = "ADMIN,INVENTORY_MANAGER")]`)
     - `GET /api/inventory-adjustment-requests/{id:guid}` (`[Authorize(Roles = "ADMIN,INVENTORY_MANAGER")]`)
     - `POST /api/inventory-adjustment-requests` (`[Authorize(Roles = "ADMIN,INVENTORY_MANAGER")]`)
     - `PATCH /api/inventory-adjustment-requests/{id:guid}/status` (`[Authorize(Roles = "ADMIN,INVENTORY_MANAGER")]` ở HTTP hoặc tách rõ: chỉ `ADMIN` cho `APPROVED`/`REJECTED`/`APPLIED`, và có endpoint riêng `PATCH .../status` với **`[Authorize(Roles = nameof(RoleName.ADMIN))]`** cho Admin xử lý + `POST .../cancel` cho người tạo hủy — tách endpoint giúp `[Authorize(Roles = nameof(RoleName.ADMIN))]` rõ ràng ngay trên OpenAPI & Controller Auth Tests!).
     - `DELETE /api/inventory-adjustment-requests/{id:guid}` (`[Authorize(Roles = nameof(RoleName.ADMIN))]`, kiểm tra retention policy).
- **Files:** `app/backend/src/Controllers/InventoryAdjustmentRequestsController.cs`.

### Slice 3 — Backend Automated Tests (`app/backend.Tests`)
- **Mục tiêu:** Đảm bảo độ phủ đầy đủ cho quyền, chuyển trạng thái, validation, audit log và retention.
- **Công việc:**
  1. `InventoryAdjustmentServiceTests.cs`:
     - Tạo yêu cầu hợp lệ (tự sinh `InventoryCheck` + `InventoryAdjustmentRequest` + `AuditLog` `INVENTORY_ADJUSTMENT_CREATE`).
     - Validation: `CopyId` không tồn tại, `RequestedStatus == copy.Status`, `RequestedStatus` cấm (`RENTED`/`SOLD`/`PENDING_RECEIPT`), bản sách đang `RENTED`/`SOLD`, thiếu `Reason`/`RejectionReason`, trùng `PENDING_APPROVAL` trên cùng bản sách, `CheckCode` > 20 ký tự.
     - State machine: tất cả các bước hợp lệ và cấm (`APPLIED` -> `APPLIED`, `REJECTED` -> `APPROVED`, `CANCELLED` -> `APPLIED`); chỉ khi `APPLIED` thì `BookCopy.Status` mới thay đổi + ghi 2 audit entries (`INVENTORY_ADJUSTMENT_APPLY` + `BOOK_COPY_STATUS_CHANGE`).
     - RBAC & separation of duties: `INVENTORY_MANAGER` không thể duyệt/từ chối/áp dụng (`ForbiddenException`), `ADMIN` không thể tự duyệt yêu cầu do chính mình tạo.
     - Retention: chặn xóa bản ghi `PENDING_APPROVAL`/`APPROVED` và bản ghi `APPLIED`/`REJECTED`/`CANCELLED` còn trong thời hạn retention (< 365 ngày); cho phép `ADMIN` xóa khi đã quá hạn retention và kiểm tra `AuditLogs` vẫn còn nguyên vẹn.
     - Lọc & phân trang: kiểm tra lọc theo `Status`, `RequestedStatus`, `Search` và `Page`/`PageSize`.
  2. `InventoryAdjustmentControllerAuthTests.cs`: kiểm tra `[Authorize]` roles trên từng endpoint.
- **Verification:** `dotnet build backend.sln` và `dotnet test backend.sln` pass 100%.

### Slice 4 — OpenAPI Contract Sync & Frontend (`/approvals`) (`app/frontend`)
- **Mục tiêu:** Nối API FE–BE và hoàn thiện giao diện `/approvals` thay thế placeholder hiện tại.
- **Công việc:**
  1. Chạy backend cổng `4000` và chạy `bun run generate:api` (hoặc `npm run generate:api`) để cập nhật `app/frontend/src/contract/api-contract.ts`.
  2. Xây dựng feature `app/frontend/src/features/approvals/`:
     - `approvals.type.ts`, `approvals.presentation.ts` (nhãn tiếng Việt & badge cho `InventoryAdjustmentStatus`, `BookCopyStatus`, `InventoryVarianceType`), `approvals.service.ts`, `approvals.hook.ts`.
     - `ApprovalsPage.tsx`:
       - Thẻ tổng hợp theo trạng thái (`Chờ duyệt`, `Đã duyệt`, `Đã áp dụng`, `Từ chối / Hủy`).
       - Form/Modal tạo yêu cầu mới (`CreateAdjustmentRequestDialog.tsx`): tìm chọn bản sách qua `SelectBox` (gọi API `/api/book-copies`), hiển thị trạng thái hiện tại, chọn `RequestedStatus` hợp lệ, `VarianceType`, `CheckCode` tùy chọn, nhập `Reason` giải trình; validation inline và giữ nguyên input khi API lỗi.
       - Bộ lọc (Trạng thái yêu cầu, Trạng thái đề xuất, Tìm kiếm từ khóa) + bảng phân trang server-side (`Page`, `PageSize`) + responsive mobile.
       - Modal/Panel chi tiết (`AdjustmentRequestDetailDialog.tsx`): hiển thị chi tiết chênh lệch, bản sách, lịch sử Audit Log; **chỉ hiển thị cụm nút xử lý (`Duyệt & Áp dụng`, `Duyệt`, `Áp dụng`, `Từ chối`) khi người dùng là `ADMIN`** (và khác `RequestedBy`); hiển thị nút **Hủy yêu cầu** cho người tạo khi còn `PENDING_APPROVAL`.
  3. Cập nhật `AppRoutes.tsx` nếu cần kiểm tra phân quyền truy cập hoặc bảo toàn route `/approvals` hiện có.
- **Files:** `app/frontend/src/contract/api-contract.ts`, `app/frontend/src/features/approvals/**`.

### Slice 5 — Frontend Tests, End-to-End Verification & SSOT Update
- **Mục tiêu:** Kiểm chứng toàn diện FE–BE, RBAC UI, responsive và cập nhật tiến độ.
- **Công việc:**
  1. Tạo `app/frontend/tests/approvals.test.mjs`:
     - Test service serialize query params lọc & phân trang, gửi CSRF header, map lỗi 400/403/404/409.
     - Test UI `ApprovalsPage`, `CreateAdjustmentRequestDialog`, `AdjustmentRequestDetailDialog`: kiểm tra form validation, hiển thị danh sách/lọc/phân trang, và ẩn/hiện thao tác xử lý theo role (`ADMIN` vs `INVENTORY_MANAGER`).
  2. Chạy đầy đủ:
     - `dotnet build backend.sln` & `dotnet test backend.sln`
     - `npm run lint`, `npm run build`, `npm test`
  3. Cập nhật trạng thái và evidence tại [`docs/plans/phase-10-kiem-ke-va-dieu-chinh-kho.md`](./phase-10-kiem-ke-va-dieu-chinh-kho.md) và [`docs/plans/todo.md`](./todo.md), chạy `git diff --check`.

## Rủi ro và cách giảm thiểu
| Rủi ro | Mức | Cách giảm thiểu |
| :--- | --- | :--- |
| Chưa có UI quét kiểm kê `P10-S02` nên bảng `inventory_checks` chưa có dữ liệu sẵn | Trung bình | Cho phép API `POST` tự tạo bản ghi `InventoryCheckModel` nền trong cùng transaction khi lập yêu cầu từ `CopyId`/`CopyBarcode`, không cần sửa DB. |
| Check trùng `(CheckCode, CopyId)` nếu 2 yêu cầu gửi cùng lúc hoặc nhập trùng mã | Trung bình | Tự sinh mã duy nhất theo timestamp/suffix nếu bỏ trống; bắt lỗi unique constraint `23505` và trả `409 Conflict` rõ ràng. |
| `BookCopy` bị bán/thuê trong lúc chờ `ADMIN` duyệt | Cao | Khi `ADMIN` bấm `APPLIED`, service đọc lại `BookCopy` mới nhất và chạy lại `BookCopyValidator.EnsureStatusTransitionAllowed` + `EnsureNoActiveReferenceAsync` trong transaction. |
| Kiểm thử local chỉ đăng nhập 1 tài khoản Admin không tự duyệt được yêu cầu của chính mình | Thấp | Ghi rõ trong Spec/Plan và UI cảnh báo khi `ADMIN` xem yêu cầu do chính mình tạo (tạo bằng `inventory@cloud.io`, xử lý bằng `admin@cloud.io`). |

## Checkpoint kết thúc (`P10-S03`)
- [ ] Không sửa Database / không tạo migration.
- [ ] `dotnet build backend.sln` và `dotnet test backend.sln` pass 100%.
- [ ] `npm run lint`, `npm run build`, `npm test` pass 100%.
- [ ] Cập nhật evidence tại [`docs/plans/todo.md`](./todo.md) và [`docs/plans/phase-10-kiem-ke-va-dieu-chinh-kho.md`](./phase-10-kiem-ke-va-dieu-chinh-kho.md).
