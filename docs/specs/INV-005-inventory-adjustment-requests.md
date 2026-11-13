# Spec: INV-005 — Lập và Xử lý Yêu cầu Điều chỉnh Kho (`inventory_adjustment_requests`)

## Status
Accepted — xác nhận phạm vi tái sử dụng nguyên vẹn schema hiện có (`inventory_adjustment_requests`, `inventory_checks`, `book_copies`, `audit_logs`, `BookCopyStatus`, `InventoryAdjustmentStatus`), không chỉnh sửa Database, ngày 2026-11-12.

## Objective
Cho phép nhân sự kho (`INVENTORY_MANAGER`, `ADMIN`) lập yêu cầu điều chỉnh trạng thái bản sách vật lý khi phát hiện chênh lệch kiểm kê hoặc sai lệch hiện trạng; cung cấp danh sách yêu cầu có lọc và phân trang để theo dõi; chỉ cho phép `ADMIN` xử lý duyệt/áp dụng/từ chối nhằm kiểm soát chặt chẽ biến động tồn kho, ghi nhận đầy đủ Audit Log và tuân thủ chính sách lưu trữ (retention).

## References
- Feature IDs: `INV-005`, `RBAC-001`, `RBAC-002`, `RBAC-003`, `AUD-001`, `AUD-002`
- Business Rules: `BR-GEN-001`, `BR-GEN-003`, `BR-GEN-007`, `BR-INV-002`–`BR-INV-007`
- Decision Records: `PDR-001`, `PDR-002`, `PDR-005`, `ADR-001`, `ADR-002`, `ADR-003`, `ADR-005`
- Workflow: `WF-06`
- Database Schema (không sửa đổi): [`docs/DATABASE.txt`](../DATABASE.txt) (`inventory_adjustment_requests`, `inventory_checks`, `book_copies`, `audit_logs`, `employee`)
- Plan Step: [`P10-S03`](../plans/phase-10-kiem-ke-va-dieu-chinh-kho.md#step-p10-s03--duyệt-chênh-lệch)

## Actors and Permissions
- **`INVENTORY_MANAGER` (Quản lý kho)**:
  - Được lập yêu cầu điều chỉnh trạng thái bản sách (`POST /api/inventory-adjustment-requests`).
  - Được xem danh sách (lọc, phân trang) và chi tiết yêu cầu kèm lịch sử audit của yêu cầu (`GET`).
  - Được hủy (`CANCELLED`) yêu cầu ở trạng thái `PENDING_APPROVAL` do chính mình tạo.
  - **Không** được phê duyệt (`APPROVED`), từ chối (`REJECTED`) hoặc áp dụng (`APPLIED`) bất kỳ yêu cầu nào (`403 Forbidden`).
- **`CASHIER` (Nhân viên quầy)**:
  - Theo ma trận quyền [`ROLES.md`](../product/ROLES.md#L20), không có quyền tạo, xem hoặc xử lý điều chỉnh chênh lệch kho (`403 Forbidden`).
- **`ADMIN` (Quản trị viên)**:
  - Có quyền xem danh sách, xem chi tiết, lập yêu cầu điều chỉnh.
  - Là **vai trò duy nhất** có quyền xử lý cập nhật trạng thái (`APPROVED`, `REJECTED`, `APPLIED`) và áp dụng thay đổi trạng thái lên `BookCopy`.
  - Theo nguyên tắc tách biệt người đề nghị và người duyệt (`PDR-002`, `P10-S03`), `ADMIN` **không được tự duyệt/áp dụng** yêu cầu do chính mình tạo (`RequestedBy == CurrentActorId` bị từ chối `403 Forbidden` hoặc `409 Conflict`).

## Preconditions
1. Người dùng đã đăng nhập với session hợp lệ.
2. Schema Database hiện có giữ nguyên (`inventory_checks`, `inventory_adjustment_requests`, `book_copies`, `audit_logs`), không chạy migration thêm/sửa bảng hay enum.
3. Bản sách vật lý mục tiêu (`BookCopy`) đã tồn tại trong `book_copies`.

## Main Flow

### Luồng 1: Lập yêu cầu điều chỉnh kho (`POST /api/inventory-adjustment-requests`)
1. Người dùng (`INVENTORY_MANAGER` hoặc `ADMIN`) mở màn hình **Phê duyệt / Yêu cầu điều chỉnh kho** (`/approvals`) và bấm **"+ Tạo yêu cầu điều chỉnh"**.
2. Người dùng tìm chọn bản sách vật lý theo `CopyBarcode` (hiển thị thông tin đầu sách, ấn bản, trạng thái hiện tại), chọn **Trạng thái đề xuất** (`RequestedStatus` thuộc `BookCopyStatus`), **Loại chênh lệch** (`VarianceType`: `MISSING`, `UNEXPECTED_STATUS`, `DAMAGED`, `NONE`), tùy chọn **Mã kiểm kê** (`CheckCode`, tối đa 20 ký tự — tự sinh `ADJ-yyyyMMdd-xxxx` nếu bỏ trống) hoặc chọn `InventoryCheckId` có sẵn, và nhập **Lý do giải trình** (`Reason`).
3. Frontend gửi `POST /api/inventory-adjustment-requests` kèm CSRF token.
4. Backend kiểm tra quyền (`INVENTORY_MANAGER`, `ADMIN`), validate đầu vào, kiểm tra quy tắc chuyển trạng thái hợp lệ cho `BookCopy` và chắc chắn chưa có yêu cầu `PENDING_APPROVAL` nào khác đang mở cho cùng bản sách.
5. Trong một database transaction:
   - Nếu chưa truyền `InventoryCheckId`: tự động tạo bản ghi nền trong `inventory_checks` (`CheckCode`, `CopyId`, `ExpectedStatus = copy.Status`, `ObservedStatus = RequestedStatus`, `IsFound`, `VarianceType`, `Note`, `CheckedBy = ActorId`, `CheckedAt = UtcNow`).
   - Tạo bản ghi `inventory_adjustment_requests` với `Status = InventoryAdjustmentStatus.PENDING_APPROVAL`, `RequestedBy = ActorId`, `RequestedAt = UtcNow`.
   - Ghi nhận Audit Log qua `AuditLogService` (`EntityType = "INVENTORY_ADJUSTMENT_REQUEST"`, `Action = "INVENTORY_ADJUSTMENT_CREATE"`, `AfterData = snapshot`, `Reason`).
6. Trạng thái của `BookCopy` **không thay đổi** ở bước này (`BR-INV-003`). Backend trả HTTP `201 Created`.

### Luồng 2: Xem danh sách yêu cầu có lọc và phân trang (`GET /api/inventory-adjustment-requests`)
1. Người dùng (`INVENTORY_MANAGER`, `ADMIN`) truy cập `/approvals`.
2. Hệ thống hỗ trợ lọc trên server theo:
   - `Status` (`InventoryAdjustmentStatus`: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `APPLIED`, `CANCELLED`)
   - `RequestedStatus` (`BookCopyStatus`)
   - `VarianceType` (`InventoryVarianceType`)
   - `Search` (tìm theo `CheckCode`, `CopyBarcode`, tên đầu sách hoặc `Reason`)
   - `From` / `To` (khoảng ngày `RequestedAt`)
   - Phân trang `Page`, `PageSize` qua `PagedResult<InventoryAdjustmentRequestResponse>`.
3. Giao diện hiển thị các thẻ thống kê nhanh theo trạng thái, bộ lọc, bảng dữ liệu phân trang và badge phân biệt rõ ràng từng trạng thái.

### Luồng 3: Xem chi tiết & lịch sử thay đổi (`GET /api/inventory-adjustment-requests/{id}`)
1. Người dùng bấm xem chi tiết một yêu cầu từ danh sách.
2. Backend trả về thông tin chi tiết yêu cầu, thông tin kiểm kê (`InventoryCheck`), thông tin bản sách (`CopyBarcode`, đầu sách, trạng thái hiện tại), người đề nghị, người duyệt, lý do từ chối và lịch sử Audit Log của yêu cầu (`EntityType = "INVENTORY_ADJUSTMENT_REQUEST"`, `EntityId = id`).
3. Giao diện chỉ hiển thị nhóm nút xử lý duyệt/từ chối/áp dụng cho vai trò `ADMIN` (và không phải người tự đề nghị).

### Luồng 4: Admin xử lý cập nhật trạng thái (`PATCH /api/inventory-adjustment-requests/{id}/status`)
1. `ADMIN` (khác `RequestedBy`) chọn hành động xử lý trên yêu cầu đang ở `PENDING_APPROVAL` hoặc `APPROVED`:
   - **`APPROVED`**: Duyệt đề nghị (ghi nhận `ApprovedBy`, `ApprovedAt`), chưa thay đổi `BookCopy` cho tới bước `APPLIED`.
   - **`APPLIED`**: Duyệt (nếu đang `PENDING_APPROVAL`) và **áp dụng thay đổi trạng thái** lên `BookCopy` (`copy.Status = request.RequestedStatus`, ghi `ApprovedBy`/`ApprovedAt` nếu chưa có và `AppliedAt = UtcNow`).
   - **`REJECTED`**: Từ chối đề nghị, bắt buộc nhập `RejectionReason` (ghi `ApprovedBy`, `ApprovedAt`, `RejectionReason`).
   - **`CANCELLED`**: Hủy đề nghị khi còn `PENDING_APPROVAL`, bắt buộc nhập lý do.
2. Trong cùng transaction:
   - Kiểm tra ma trận chuyển trạng thái của `InventoryAdjustmentStatus`.
   - Nếu là `APPLIED`: kiểm tra lại điều kiện của `BookCopy` (`BookCopyValidator.EnsureStatusTransitionAllowed`, `EnsureNoActiveReferenceAsync`, và `EnsureAvailableRequirements` nếu đích là `AVAILABLE`). Cập nhật `BookCopy.Status` và ghi thêm Audit Log cho `BOOK_COPY` (`BOOK_COPY_STATUS_CHANGE`).
   - Ghi Audit Log cho `INVENTORY_ADJUSTMENT_REQUEST` với đầy đủ `BeforeData`, `AfterData`, `ActorId`, `Reason`.
3. Backend trả HTTP `200 OK`; Frontend làm mới danh sách, chi tiết và timeline Audit Log.

## Alternate and Error Flows
- **Sai vai trò (`403 Forbidden`)**:
  - `CASHIER` gọi bất kỳ API nào của `/api/inventory-adjustment-requests` bị trả `403`.
  - `INVENTORY_MANAGER` gọi `PATCH .../status` với trạng thái `APPROVED`, `REJECTED` hoặc `APPLIED` bị trả `403`.
  - `ADMIN` tự duyệt/từ chối/áp dụng yêu cầu do chính mình tạo (`RequestedBy == ActorId`) bị từ chối `403 Forbidden` (hoặc `409 Conflict`).
- **Chuyển trạng thái sai luồng (`400 Bad Request` / `409 Conflict`)**:
  - Không cho chuyển tới chính trạng thái hiện tại.
  - Ma trận hợp lệ:
    - `PENDING_APPROVAL` → `APPROVED`, `APPLIED`, `REJECTED`, `CANCELLED`
    - `APPROVED` → `APPLIED`, `CANCELLED`
    - `REJECTED`, `APPLIED`, `CANCELLED` → trạng thái kết thúc (terminal), từ chối mọi cập nhật tiếp theo hoặc áp dụng lặp (`409 Conflict`).
- **Validation đầu vào (`400 Bad Request`)**:
  - `CopyId` rỗng hoặc bản sách không tồn tại (`404 Not Found`).
  - `RequestedStatus == copy.Status` (không có chênh lệch).
  - `RequestedStatus` thuộc nhóm trạng thái hệ thống không cho phép điều chỉnh thủ công (`PENDING_RECEIPT`, `RENTED`, `SOLD`) hoặc bản sách nguồn đang bị khóa giao dịch (`RENTED`, `SOLD`, `DISPOSED` hoặc đang gắn dòng bán/thuê hiệu lực).
  - Nếu `RequestedStatus == AVAILABLE` nhưng bản sách thiếu giá bán/giá thuê bắt buộc (`BookCopyValidator.EnsureAvailableRequirements`).
  - `Reason` rỗng hoặc vượt quá `500` ký tự; `RejectionReason` rỗng hoặc vượt `500` ký tự khi chuyển `REJECTED`.
  - `CheckCode` vượt `20` ký tự hoặc trùng cặp `(CheckCode, CopyId)`.
  - `Page < 1` hoặc `PageSize` ngoài `[1, 100]`.
- **Chính sách Retention & Bảo toàn dữ liệu (`400 Bad Request` / `409 Conflict`)**:
  - **Không sửa Database** nên không xóa cứng bảng hay thêm cột archive riêng; cơ chế retention được thực thi bằng quy tắc nghiệp vụ:
    - Không cung cấp hoặc từ chối thao tác xóa cứng (`DELETE`) bất kỳ bản ghi `inventory_adjustment_requests` nào đang ở trạng thái xử lý (`PENDING_APPROVAL`, `APPROVED`) hoặc chưa hết thời hạn lưu trữ tối thiểu (mặc định **365 ngày** kể từ `AppliedAt ?? ApprovedAt ?? RequestedAt`, có thể cấu hình qua `SystemSetting` khóa `inventory_adjustment.retention_days`).
    - Sau khi hủy (`CANCELLED`), từ chối (`REJECTED`) hoặc áp dụng (`APPLIED`), bản ghi vẫn được giữ lại để đối soát kiểm toán; nếu có endpoint kiểm tra/dọn retention (`DELETE /api/inventory-adjustment-requests/{id}` chỉ dành cho `ADMIN`), chỉ được phép khi đã ở trạng thái kết thúc **và** quá thời hạn retention (`UtcNow >= anchorDate + retentionDays`), đồng thời mọi bản ghi trong `audit_logs` vẫn được giữ vĩnh viễn (`append-only`).
    - Bản sách đã có `InventoryCheck` bị chặn xóa vật lý bởi `BookCopyService.DeleteBookCopyAsync`.

## Data and State Changes
- **Không thay đổi schema DB**: Dùng trực tiếp `InventoryCheckModel` (`inventory_checks`), `InventoryAdjustmentRequestModel` (`inventory_adjustment_requests`), `BookCopyModel` (`book_copies`), `AuditLogModel` (`audit_logs`) và enum `BookCopyStatus`, `InventoryAdjustmentStatus`, `InventoryVarianceType`.
- **Audit Log**:
  - `EntityType`: `"INVENTORY_ADJUSTMENT_REQUEST"` (và `"BOOK_COPY"` khi áp dụng trạng thái mới lên bản sách).
  - `Action`: `"INVENTORY_ADJUSTMENT_CREATE"`, `"INVENTORY_ADJUSTMENT_APPROVE"`, `"INVENTORY_ADJUSTMENT_REJECT"`, `"INVENTORY_ADJUSTMENT_APPLY"`, `"INVENTORY_ADJUSTMENT_CANCEL"`.
  - Lưu đầy đủ `BeforeData`, `AfterData`, `ActorId`, `IpAddress`, `Reason`.

## Acceptance Criteria
1. **Không sửa Database**: Không tạo bảng mới, không sửa bảng/cột hiện có, không sinh EF migration.
2. **Phân quyền (RBAC)**:
   - `INVENTORY_MANAGER` tạo, hủy yêu cầu của mình và xem danh sách/chi tiết.
   - `INVENTORY_MANAGER` và `CASHIER` bị chặn `403` khi xử lý duyệt/từ chối/áp dụng; `CASHIER` không truy cập được module này.
   - Chỉ `ADMIN` (khác `RequestedBy`) duyệt/từ chối/áp dụng thành công.
3. **State Machine & Validation**:
   - Tạo yêu cầu kiểm tra đúng `BookCopy`, từ chối trùng trạng thái, trạng thái cấm (`RENTED`, `SOLD`, `PENDING_RECEIPT`), bản sách đang giao dịch, thiếu lý do, sai độ dài.
   - Chuyển trạng thái tuân thủ đúng ma trận; không cho áp dụng lặp `APPLIED` -> `APPLIED` hay đổi trạng thái từ `REJECTED`/`CANCELLED`.
4. **Audit Log & BookCopy Sync**:
   - Tạo và chuyển trạng thái đều ghi `AuditLog` trong cùng transaction; chỉ khi chuyển sang `APPLIED` thì `BookCopy.Status` mới cập nhật theo `RequestedStatus` kèm audit log tương ứng cho `BookCopy`.
5. **Retention**:
   - Chặn xóa bản ghi còn hiệu lực hoặc chưa quá thời hạn retention (mặc định 365 ngày); chỉ cho phép xóa/dọn bởi `ADMIN` khi ở trạng thái kết thúc và đã quá hạn retention, vẫn bảo toàn `audit_logs`.
6. **Frontend & Contract**:
   - OpenAPI `api-contract.ts` được đồng bộ từ Backend.
   - Trang `/approvals` cung cấp đầy đủ: form tạo yêu cầu (tìm chọn theo `CopyBarcode`), danh sách yêu cầu với lọc theo trạng thái/tìm kiếm/phân trang, modal/panel chi tiết kèm lịch sử audit và nút xử lý hiển thị đúng theo quyền `ADMIN`.

## Non-functional Requirements
- Mọi thao tác ghi sử dụng transaction để đồng bộ `inventory_checks`, `inventory_adjustment_requests`, `book_copies` và `audit_logs`.
- Danh sách lọc và phân trang xử lý trên server (`PagedResult<T>`).
- Giao diện tuân thủ `app/frontend/AGENTS.md` (responsive 390px/768px/1440px, bàn phím, contrast >= 4.5:1, không mất dữ liệu form khi lỗi API).

## Open Questions
- Không có câu hỏi mở nào chặn triển khai.
