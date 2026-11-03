# Audit backend: Cloudinary direct upload

**Ngày:** 2026-11-03
**Phạm vi:** Task 1–6 của `docs/superpowers/plans/2026-11-03-cloudinary-direct-upload.md`, các commit `a1ec003` → `f60961a` trên nhánh `feat/cloudianry-storage`
**Spec:** `docs/superpowers/specs/2026-11-03-cloudinary-direct-upload-design.md`
**Kết luận:** Không có lỗi mức **blocker** hoặc **high** ở thời điểm audit. Có 3 vấn đề mức **medium** và 4 vấn đề mức **low**. Báo cáo này chỉ ghi nhận, không sửa code production. Việc khắc phục là các task follow-up cần được duyệt riêng.

> Lỗi high duy nhất phát hiện trong quá trình làm (một intent bị hai request dùng đồng thời) đã được sửa trước khi audit ở commit `b979f33`. Mục này được ghi lại ở cuối báo cáo.

---

## 1. Bằng chứng

### 1.1 Lệnh đã chạy

| Lệnh | Kết quả |
|---|---|
| `dotnet test backend.sln` | `Passed: 33, Failed: 0` |
| `dotnet build backend.sln` | `Build succeeded`, 0 warning |
| `rg -n --glob '!**/Migrations/**' --glob '!**/bin/**' --glob '!**/obj/**' '(AttachmentModel\|AttachmentOwnerType\|AttachmentService\|Minio\|IMinioService\|FileSignatureValidator\|CoverImageUrl)' app/backend` | Không có kết quả |
| `rg -c 'UploadIntent\|UploadOwnerType\|DestroyAsync\|BuildImageUrl\|CREATE_UPLOAD_INTENT' app/backend/src` | Chỉ xuất hiện trong UploadIntent, Cloudinary, 4 service sách, `AppDbContext`, `ApiHandlerException` và DTO/enum |
| `dotnet ef migrations has-pending-model-changes` | `No changes have been made to the model since the last migration.` |
| `dotnet ef migrations script --idempotent` | Xem mục 1.2 |
| `git log --all -- app/backend/appsettings.json` | 0 commit. File chứa secret thật và nằm trong `.gitignore` |

> Ghi chú: glob `!src/Data/Migrations/**` trong plan không khớp khi chạy từ thư mục gốc repo. Audit dùng `!**/Migrations/**`.

### 1.2 Migration

`20261103094317_ReplaceAttachmentsWithCloudinaryImages`

- `Up`: 4 lệnh `AddColumn` (`PublicImageId` trên `book_series`, `titles`, `edition`, `book_copies`), 1 `DropColumn` (`edition.CoverImageUrl`), 1 `DropTable` (`attachments`), 3 `CreateTable` (`upload_intents`, `rental_line_images`, `stock_receipt_images`), 6 `CreateIndex` (3 index unique cho `PublicImageId`, 3 index cho FK).
- FK sinh ra không có mệnh đề `ON DELETE`, tức PostgreSQL dùng mặc định `NO ACTION`:
  - `FK_rental_line_images_rental_lines_RentalLineId`
  - `FK_stock_receipt_images_stock_receipts_StockReceiptId`
  - `FK_upload_intents_employee_CreatedBy`
- `Down`: tạo lại `attachments` (rỗng) và `CoverImageUrl`, xóa 3 bảng mới và 4 cột `PublicImageId`.
- `20261103104137_MakeUploadIntentStatusConcurrencyToken`: không có lệnh DDL nào, chỉ cập nhật snapshot.
- Các migration lịch sử (`AddAttachments`, …) không bị sửa.

### 1.3 Phân quyền các route liên quan

| Route | Roles |
|---|---|
| `POST /api/uploads/signature` | ADMIN, INVENTORY_MANAGER, CASHIER (`UploadsController.cs:14`) |
| `POST/PUT/PATCH/DELETE` thông thường của book-series, book-titles, editions | ADMIN, INVENTORY_MANAGER (giữ nguyên) |
| `POST/PUT/PATCH` của book-copies, `POST .../label` | ADMIN, INVENTORY_MANAGER (giữ nguyên) |
| `PUT/DELETE /api/{book-series,book-titles,editions,book-copies}/{id}/image` | ADMIN, INVENTORY_MANAGER, CASHIER |

- `CsrfProtectionMiddleware` chặn mọi method không an toàn, gồm POST/PUT/DELETE (`CsrfProtectionMiddleware.cs:51-55`, đăng ký ở `Program.cs:313`).
- JWT dùng `MapInboundClaims = false` (`Program.cs:111`), nên `sub` được đọc đúng ở cả `UploadsController` và các domain controller.

---

## 2. Trace các đường dữ liệu quan trọng

### 2.1 Luồng frontend end-to-end

1. **Xin signature:** `POST /api/uploads/signature { ownerType }`.
   - `UploadsController` lấy `sub` → `actorId`, trả 401 nếu không hợp lệ.
   - `UploadIntentService.CreateSignatureAsync` kiểm tra enum, rồi chặn `RENTAL_LINE_IMAGE`/`STOCK_RECEIPT_IMAGE` (`UploadIntentService.cs:37`).
   - `CloudinaryService.CreateUploadSignature` sinh `public_id = <RootFolder>/<visibility>/<segment>/<intentId:N>`.
   - Tham số được ký bằng `SortedDictionary` gồm `public_id`, `timestamp`, `type`, `upload_preset`, `overwrite=false` và `asset_folder` (chỉ khi `DYNAMIC`) (`CloudinaryService.cs:47-58`).
   - Intent `PENDING` và audit `CREATE_UPLOAD_INTENT` được lưu trong cùng một `SaveChanges`. Response không chứa `ApiSecret`.
2. **Upload:** frontend gửi file thẳng lên `UploadUrl`. Backend không nhận bytes.
3. **Gắn ảnh:** kết quả Cloudinary được gửi qua `imageUpload` trong Create/Update, hoặc qua `PUT .../{id}/image`. Không có endpoint `/complete`.
4. **Consume** (`UploadIntentService.cs:79`):
   - Intent phải thuộc cùng actor (`:114`).
   - Trạng thái phải là `PENDING` (`:118`).
   - `OwnerType` và `PublicImageId` phải khớp chính xác.
   - Chữ ký `public_id + version` được so bằng `FixedTimeEquals` (`CloudinaryService.cs:72-90`).
   - Metadata (`AssetId`, `Format`, `Bytes`) chỉ được lưu để tham khảo, không dùng để quyết định quyền. Không lưu `Version`.
5. **Commit:** domain service gán `PublicImageId`. Entity, intent `COMPLETED` và audit `ATTACH_IMAGE`/`REPLACE_IMAGE` được ghi trong một `SaveChanges` (BookSeries/Title/Edition), hoặc trong transaction có sẵn (BookCopy).
   - Concurrency token trên `Status` (`AppDbContext.cs:240`) đảm bảo chỉ một request chuyển được intent `PENDING` → `COMPLETED`. Request còn lại nhận `DbUpdateConcurrencyException` → 409 (`ApiHandlerException.cs:36`).
6. **Sau commit:** gọi `TryDestroyAfterCommitAsync` để xóa asset cũ (16 call site). Lỗi chỉ được log `LogWarning` với `{PublicImageId}` và `{OwnerType}`, không rollback DB.

**Kết luận:** mọi trường liên quan đến bảo mật (`public_id`, folder, delivery type, preset, actor) đều do server quyết định. Không tìm thấy trường nào client điều khiển được mà ảnh hưởng đến quyền. Không có thay đổi intent nào được commit ngoài transaction của domain.

### 2.2 Phân loại owner type

`CloudinaryService.GetPolicy` (`CloudinaryService.cs:27-37`) là switch expression duy nhất ánh xạ `UploadOwnerType` sang policy:

| Owner type | Delivery type | URL |
|---|---|---|
| 4 owner type của sách | `upload` | HTTPS công khai |
| 2 owner type bằng chứng | `authenticated` | HTTPS có ký (`.Signed(true)`), không hết hạn, theo limitation đã chấp nhận |

Giá trị enum lạ ném `ArgumentOutOfRangeException`. Read DTO chỉ trả `ImageUrl`/`EditionImageUrl`; test bằng reflection xác nhận DTO không có `PublicImageId`/`CoverImageUrl`.

### 2.3 Xóa theo thứ tự database trước

- Áp dụng cho thay ảnh, `DELETE .../image`, và xóa BookSeries/Title/Edition: lấy ID cũ → commit DB và audit (`DELETE_IMAGE` hoặc `REPLACE_IMAGE`) → gọi `DestroyAsync` với `CancellationToken.None`.
- BookCopy không có API xóa bản sách, nên chỉ xóa ảnh.
- Các test liên quan: `ReplaceImage_keeps_new_reference_when_destroy_fails`, `DeleteBookSeries_destroys_public_asset_after_database_commit`, `DeleteBookCopy_removes_public_asset_after_database_commit`.

### 2.4 Audit log

- Action mới: `CREATE_UPLOAD_INTENT`, `ATTACH_IMAGE`, `REPLACE_IMAGE`, `DELETE_IMAGE`.
- `before`/`after` chứa `PublicImageId` và `UploadIntentId`.
- Source không còn hằng số `UPLOAD_ATTACHMENT`/`DELETE_ATTACHMENT`. Các dòng audit lịch sử không bị động đến.

### 2.5 Dọn dẹp runtime và phạm vi hoãn lại

- **Runtime:** không còn đăng ký MinIO ở DI, options, hosted service hay health check. Health check `ready` chỉ còn Redis. Package `Minio`, section appsettings và service Docker Compose đều đã gỡ. `RemovedAttachmentAndMinioTests` kiểm tra model EF và assembly không còn type cũ.
- **Phạm vi hoãn lại:** `RentalLineImageModel`/`StockReceiptImageModel` chỉ xuất hiện trong `AppDbContext` (DbSet, table, default `now()`, FK, index unique). Không có controller hoặc service nào dùng chúng. Endpoint signature từ chối hai owner type này.

---

## 3. Phát hiện

### M1 (Medium): Rollback và BookCopy kèm ảnh chưa được test trên PostgreSQL

- **Vị trí:** `app/backend.Tests/Services/*ImageServiceTests.cs`; `BookCopyService.CreateBookCopyAsync`/`UpdateBookCopyAsync`.
- **Vấn đề:**
  - InMemory provider không có transaction. Test `ConcurrentConsume_of_same_intent_assigns_image_to_only_one_title` chứng minh được request thứ hai bị chặn, nhưng không chứng minh được việc rollback (InMemory vẫn ghi audit của request thua).
  - Create/Update BookCopy dùng `FOR UPDATE` và `nextval` bằng raw SQL, nên đường "tạo hoặc sửa bản sách kèm ảnh" chưa có test tự động nào.
- **Tác động:** nếu PostgreSQL không rollback như kỳ vọng, các bất biến "không tồn tại audit hoặc entity nửa chừng" và "retry được sau rollback" sẽ không có test bảo vệ.
- **Khắc phục:** thêm project integration test dùng PostgreSQL thật (Testcontainers hoặc DB tạm trong CI).
- **Test đề xuất:** `Concurrent_consume_on_postgres_rolls_back_losing_request_completely`. Hai `DbContext`, hai task cùng gọi `UpdateTitleImageAsync` với một intent. Kiểm tra đúng 1 title có `PublicImageId` và đúng 1 audit `ATTACH_IMAGE`. Thêm `CreateBookCopy_with_image_consumes_intent_inside_receipt_transaction`.

### M2 (Medium): Giới hạn định dạng và dung lượng phụ thuộc hoàn toàn vào cấu hình preset trên Cloudinary

- **Vị trí:** `CloudinarySettings.PublicUploadPreset`/`AuthenticatedUploadPreset`; `CloudinaryService.cs:47-58`.
- **Vấn đề:** spec yêu cầu chỉ nhận JPEG/PNG/WebP tối đa 10 MB, ở chế độ preset **signed**. Code chỉ gửi tên preset. Lúc khởi động không có kiểm tra nào xác nhận preset có tồn tại, có ở chế độ signed và có giới hạn đúng định dạng/dung lượng hay không.
- **Tác động:**
  - Nếu preset bị cấu hình sai (unsigned, cho phép PDF, hoặc không giới hạn dung lượng), nhân viên có thể upload file ngoài chính sách và vẫn gắn được vào entity, vì chữ ký vẫn hợp lệ.
  - Nếu preset là unsigned, bất kỳ ai biết tên preset đều upload được (dù không gắn được vào entity). Rủi ro là tốn chi phí lưu trữ.
- **Khắc phục:** viết runbook cấu hình preset. Tùy chọn thêm một health check hoặc tool dùng Admin API (`GetUploadPresetAsync`) để kiểm tra `unsigned=false`, `allowed_formats`, `max_file_size`, `type`.
- **Test đề xuất:** unit test `UploadPresetPolicyValidator_rejects_unsigned_or_pdf_preset` trên một model preset giả lập.

### M3 (Medium): `POST /api/uploads/signature` không có rate limit

- **Vị trí:** `UploadsController.cs:20`. Ứng dụng không đăng ký `AddRateLimiter` nào (`Program.cs`).
- **Vấn đề:** mỗi lần gọi tạo một intent `PENDING` lưu vĩnh viễn và cấp quyền upload một asset. Chưa có job dọn dẹp (đã hoãn theo spec).
- **Tác động:** một tài khoản nhân viên bị lộ, hoặc frontend bị lỗi vòng lặp, có thể tạo vô hạn intent và upload vô hạn asset mồ côi. Bảng `upload_intents` và dung lượng Cloudinary tăng không giới hạn.
- **Khắc phục:** thêm `RateLimiter` cửa sổ cố định theo `sub` (ví dụ 30 lần/phút) cho endpoint signature.
- **Test đề xuất:** integration test `CreateSignature_returns_429_after_per_user_limit`.

### L1 (Low): Kiểm tra chữ ký response mặc định dùng SHA-1

- **Vị trí:** `CloudinaryService.cs:79-85`, `CloudinarySettings`.
- **Vấn đề:** `Account` được tạo mà không chỉ định `SignatureAlgorithm`, nên SDK dùng SHA-1 mặc định. Nếu product environment trên Cloudinary chuyển sang SHA-256, mọi chữ ký response sẽ không khớp.
- **Tác động:** mọi lần gắn ảnh đều trả 400. Đây là rủi ro về tính sẵn sàng, không phải bảo mật.
- **Khắc phục:** thêm setting tùy chọn `SignatureAlgorithm` (`SHA1`/`SHA256`). Ở CloudinaryDotNet 1.29.3, có thể tính chữ ký qua `ApiShared.SignString(string, SignatureAlgorithm)` với chuỗi `public_id=…&version=…` + secret. Cần dùng cùng thuật toán cho cả chữ ký upload.
- **Test đề xuất:** `VerifyUploadResponse_accepts_sha256_signature_when_configured`.

### L2 (Low): Mapping 409 toàn cục áp dụng cho cả concurrency token có sẵn của Employee

- **Vị trí:** `ApiHandlerException.cs:40`, `EmployeeModel.RoleId` có `[ConcurrencyCheck]`.
- **Vấn đề:** trước `b979f33`, lỗi concurrency khi đổi role nhân viên trả 500. Giờ nó trả 409 với thông báo "The data was modified by another request…".
- **Tác động:** hành vi thay đổi theo hướng tốt hơn, nhưng client đang xử lý 500 cần biết.
- **Khắc phục:** chỉ cần ghi nhận trong changelog hoặc contract.
- **Test đề xuất:** `DbUpdateConcurrencyException_for_employee_maps_to_409`.

### L3 (Low): Cần xác nhận quyết định sản phẩm cho route ảnh BookCopy

- **Vị trí:** `BookCopyService.cs:595` (`UpdateBookCopyImageAsync`), so với `BookCopyService.cs:443` (`EnsureEditable`).
- **Vấn đề:** `PUT /{id}` chặn sửa bản sách đang `RENTED`/`SOLD`, còn `PUT/DELETE /{id}/image` thì không. CASHIER có quyền ghi ảnh trên mọi entity sách (đúng theo spec). Response của route ảnh BookCopy che `CostPrice` với role không có quyền xem (`BookCopiesController.cs:145`).
- **Tác động:** nhân viên có thể đổi ảnh của bản sách đã bán hoặc đang cho thuê.
- **Khắc phục:** nếu không mong muốn, thêm `BookCopyValidator.EnsureEditable(copy)` vào hai route ảnh.
- **Test đề xuất:** `UpdateBookCopyImage_rejects_sold_copy` (chỉ khi chọn chặn).

### L4 (Low): Lỗi xóa asset chỉ được ghi vào log

- **Vị trí:** `CloudinaryServiceExtensions.TryDestroyAfterCommitAsync`; `CloudinaryService.DestroyAsync` (`:109-118`).
- **Vấn đề:** lỗi chỉ được ghi `LogWarning`, không có bản ghi bền vững. Kết quả `"not found"` từ Cloudinary được coi là thành công. Đây là hành vi spec đã chấp nhận.
- **Tác động:** asset mồ côi chỉ tìm lại được bằng cách so `upload_intents` (đã `COMPLETED`) với các cột và bảng ảnh, như spec mô tả.
- **Khắc phục:** khi làm job dọn dẹp, dùng truy vấn đối chiếu đó. Có thể bổ sung cảnh báo trên log aggregator theo template message.
- **Test đề xuất:** đã có (`ReplaceImage_keeps_new_reference_when_destroy_fails`).

---

## 4. Đã khắc phục trong quá trình triển khai

| ID | Mức | Nội dung | Commit |
|---|---|---|---|
| F1 | High | Hai request đồng thời dùng chung một intent `PENDING` có thể gán cùng `public_id` cho hai entity. Khi xóa hoặc thay ảnh của một entity, asset của entity kia cũng mất. Đã sửa bằng concurrency token trên `UploadIntent.Status` và map lỗi thành 409. Test: `ConcurrentConsume_of_same_intent_assigns_image_to_only_one_title` (fail khi bỏ token). | `b979f33` |
| F2 | High | `EditionService.UpdateEditionAsync` cũ gán `PublicImageId = request.CoverImageUrl`. Client gán được public ID tùy ý, và nếu không gửi trường này thì ảnh bị xóa. Đã thay bằng `ImageUpload` có xác minh. Test: `UpdateEdition_without_image_upload_keeps_existing_image`. | `aac2dc1` |

---

## 5. Rủi ro còn lại (đã hoãn theo spec)

- **Job dọn dẹp:** chưa có. Intent `PENDING` bị bỏ dở và asset mồ côi tích lũy dần (xem M3, L4).
- **API ảnh bằng chứng:** RentalLine/StockReceipt chỉ có schema. Khi làm API cần:
  - mở owner type ở `IsImplementedBookOwnerType`;
  - xóa các dòng ảnh con trước khi xóa entity cha (FK `NO ACTION`);
  - cân nhắc URL có thời hạn thay cho URL ký vĩnh viễn.
- **Last-write-wins:** khi thay ảnh đồng thời trên cùng một entity, intent của request thua thành asset mồ côi. Đây là hành vi đã chấp nhận.
- **Frontend:** `app/frontend/src/contract/api-contract.ts` vẫn dùng Attachment API (giờ trả 404) và `CoverImageUrl`. Phải chuyển sang luồng signature và `ImageUrl`/`EditionImageUrl` trước khi deploy frontend.
- **Rollout:** `ReplaceAttachmentsWithCloudinaryImages` có thao tác phá dữ liệu và chưa được áp dụng tự động. Container và volume MinIO chỉ nên xóa sau khi đã kiểm tra trên môi trường thật.
