# CLOUDINARY_AGENT.md: luồng upload ảnh trực tiếp lên Cloudinary

> **Đối tượng:** coding agent hoặc developer cần triển khai, hoặc chỉnh lại cho đúng, luồng upload ảnh Cloudinary trong một dự án khác (**Spring Boot + React**).
> **Nguồn:** luồng đã triển khai và audit ở backend .NET của dự án old-bookstore. Tham khảo thêm: `docs/superpowers/specs/2026-11-03-cloudinary-direct-upload-design.md`, `docs/audits/2026-11-03-cloudinary-backend-audit.md`.
> **Cách dùng:** đọc hết mục 1–3 trước khi sửa code. Mục 9 là checklist để agent đối chiếu dự án đích. Tên class/route ở đây chỉ là ví dụ: giữ nguyên **contract và bất biến**, còn tên thì đổi theo convention của dự án đích.

---

## 1. Ý tưởng cốt lõi

- **Frontend upload file thẳng lên Cloudinary.** Backend không bao giờ nhận bytes của ảnh.
- **Backend là bên quyết định toàn bộ:**
  - Cấp chữ ký upload với tham số do **server** quyết định: `public_id`, folder, delivery type, preset.
  - Xác minh kết quả Cloudinary trả về rồi mới gắn `public_id` vào entity.
- **Upload intent** là một "vé" dùng **một lần**, gắn với người tạo. Nó ngăn frontend gắn một asset Cloudinary tùy ý, hoặc asset của người khác, vào entity.
- Entity chỉ lưu `publicImageId`. API đọc dữ liệu trả `imageUrl` đã build sẵn, **không bao giờ trả `publicImageId`**.
- **Database trước, Cloudinary sau:** khi thay hoặc xóa ảnh, commit DB trước rồi mới xóa asset cũ. Nếu xóa trên Cloudinary lỗi thì chỉ log cảnh báo, không rollback DB.

```text
React                         Spring Boot API                        Cloudinary
  |  POST /api/uploads/signature {ownerType}  |                            |
  |------------------------------------------>| tạo UploadIntent PENDING   |
  |                                           | ký params do server quyết định |
  |<------------------------------------------| {uploadIntentId, signature, publicId, ...}
  |  POST multipart (file + đúng các params đã ký) ---------------------->|
  |<----------------------------------------------------------------------| {public_id, version, signature, asset_id, format, bytes}
  |  POST/PUT entity {..., imageUpload:{uploadIntentId, publicId, version, signature, ...}}
  |------------------------------------------>| TRONG MỘT TRANSACTION:     |
  |                                           |  validate nghiệp vụ        |
  |                                           |  consume intent (kiểm tra + PENDING->COMPLETED có điều kiện)
  |                                           |  entity.publicImageId = ...|
  |                                           |  ghi audit                 |
  |                                           | COMMIT                     |
  |                                           | sau commit: destroy asset cũ ---------->|
  |<------------------------------------------| {..., imageUrl}            |
```

Không có endpoint `/complete`. Kết quả upload chỉ được "tiêu thụ" bên trong thao tác Create/Update của domain, hoặc route ảnh chuyên biệt.

---

## 2. Bất biến bắt buộc (không được vi phạm)

1. **`ApiSecret` chỉ nằm ở backend**, đọc từ biến môi trường hoặc secret store. Không đặt trong file config được commit, không đưa vào bundle React.
2. **`public_id` do backend sinh.** Frontend không được gửi hoặc sửa nó khi xin chữ ký.
3. **Chính sách lấy từ một nguồn duy nhất:** một hàm `getPolicy(ownerType)` (switch đầy đủ mọi giá trị) quyết định delivery type (`upload` cho ảnh công khai, `authenticated` cho ảnh riêng tư), preset và folder. Frontend không được chọn delivery type.
4. **Chỉ ký một tập tham số cố định do server tạo.** Không có endpoint nào nhận map tham số tùy ý từ client rồi ký.
5. **Intent dùng một lần.** Consume phải kiểm tra:
   - đúng người tạo (`createdBy == actor`);
   - trạng thái `PENDING`;
   - đúng `ownerType` mong đợi;
   - `publicId` khớp chính xác;
   - chữ ký response của Cloudinary hợp lệ.
   Sau đó chuyển sang `COMPLETED` một cách có điều kiện, để hai request đồng thời không thể cùng thành công (xem mục 5.3).
6. **Consume nằm cùng transaction** với việc ghi entity và audit. Nếu kiểm tra thất bại hoặc rollback thì intent phải còn `PENDING`, để frontend gửi lại được.
7. **Chữ ký response chỉ phủ `public_id` và `version`.** Các field `asset_id`, `format`, `bytes` chỉ để tham khảo, không dùng để quyết định quyền. Định dạng và dung lượng được kiểm soát bởi **signed upload preset**. Validate ở frontend chỉ phục vụ trải nghiệm người dùng.
8. **Database trước:** chỉ xóa asset cũ trên Cloudinary **sau khi commit thành công**. Không bao giờ xóa khi transaction bị rollback.
9. **Không ghi đè asset:** mỗi lần thay ảnh dùng intent mới và `public_id` mới, ký `overwrite=false`. Nhờ vậy không mất ảnh cũ khi lỗi giữa chừng, và không bị CDN cache ảnh cũ.
10. **API đọc chỉ trả `imageUrl`.** URL được build trong bộ nhớ sau khi query xong, không build trong JPQL/Criteria projection.

---

## 3. Owner type và policy

| `UploadOwnerType` (ví dụ) | Lưu ở đâu | Delivery type | Preset | Folder segment | Số lượng |
|---|---|---|---|---|---|
| `BOOK_SERIES_IMAGE` | `book_series.public_image_id` | `upload` | public preset | `public/book-series` | 1 |
| `TITLE_IMAGE` | `titles.public_image_id` | `upload` | public preset | `public/titles` | 1 |
| `EDITION_IMAGE` | `edition.public_image_id` | `upload` | public preset | `public/editions` | 1 |
| `BOOK_COPY_IMAGE` | `book_copies.public_image_id` | `upload` | public preset | `public/book-copies` | 1 |
| `RENTAL_LINE_IMAGE` | bảng con `rental_line_images` | `authenticated` | authenticated preset | `private/rental-lines` | Không giới hạn |
| `STOCK_RECEIPT_IMAGE` | bảng con `stock_receipt_images` | `authenticated` | authenticated preset | `private/stock-receipts` | Không giới hạn |

- **Public ID:** `<RootFolder>/<folder segment>/<intentId không có dấu gạch>`, ví dụ `cloud-bookstore/public/editions/7d13d8f578b145a298c2f54c613dbf57`.
- **Folder mode:**
  - `DYNAMIC` (mặc định của product environment mới): ký thêm `asset_folder = <RootFolder>/<folder segment>`. Chỉ `public_id` thôi không quyết định được vị trí thư mục trong Media Library.
  - `FIXED` (environment cũ): không gửi `asset_folder`; đường dẫn trong `public_id` tự tạo thư mục.
- **Owner type chưa có API tiêu thụ:** endpoint signature **từ chối** các owner type chưa có API domain để consume (ở dự án gốc là hai loại ảnh bằng chứng). Nếu vẫn cấp, sẽ sinh intent vô dụng và asset mồ côi.
- **Quyền:** ở dự án gốc, cả 3 role nhân viên đều được quản lý ảnh qua route ảnh riêng. Các trường dữ liệu khác của entity vẫn giữ quyền chặt như trước. Không mở rộng quyền sửa entity chỉ để phục vụ việc đổi ảnh.

---

## 4. Mô hình dữ liệu (PostgreSQL)

```sql
CREATE TABLE upload_intents (
  id               uuid PRIMARY KEY,
  owner_type       varchar(40)  NOT NULL,                -- enum lưu dạng string
  public_image_id  varchar(255) NOT NULL UNIQUE,         -- do backend sinh
  status           varchar(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED
  created_by       uuid NOT NULL REFERENCES employee(id),   -- NO ACTION
  created_at       timestamptz  NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  asset_id         varchar(64),   -- chỉ để tham khảo
  format           varchar(20),   -- chỉ để tham khảo
  bytes            bigint         -- chỉ để tham khảo
);
-- KHÔNG có: owner_id, version, delivery_type, width, height.
-- Không entity nào FK tới upload_intents. Giữ intent COMPLETED vĩnh viễn: đây là danh mục cho job dọn asset mồ côi sau này.

ALTER TABLE book_series ADD COLUMN public_image_id varchar(255);
ALTER TABLE titles      ADD COLUMN public_image_id varchar(255);
ALTER TABLE edition     ADD COLUMN public_image_id varchar(255);  -- thay cho cover_image_url cũ
ALTER TABLE book_copies ADD COLUMN public_image_id varchar(255);

CREATE TABLE rental_line_images (
  id               uuid PRIMARY KEY,
  rental_line_id   uuid NOT NULL REFERENCES rental_lines(id),   -- NO ACTION: phải xóa ảnh trước khi xóa entity cha
  public_image_id  varchar(255) NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
-- stock_receipt_images: cấu trúc tương tự, FK tới stock_receipts.
```

**JPA:** dùng `@Enumerated(EnumType.STRING)`. Không cascade xóa từ entity cha sang bảng ảnh con. Không tạo bảng "media/attachment" dùng chung kiểu đa hình.

---

## 5. Backend (Spring Boot)

### 5.1 Cấu hình (validate khi khởi động)

```yaml
cloudinary:
  cloud-name: ${CLOUDINARY_CLOUD_NAME}
  api-key: ${CLOUDINARY_API_KEY}
  api-secret: ${CLOUDINARY_API_SECRET}     # chỉ lấy từ env hoặc secret store
  root-folder: cloud-bookstore             # regex: ^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$
  folder-mode: DYNAMIC                     # DYNAMIC | FIXED
  public-upload-preset: book_images_signed
  authenticated-upload-preset: evidence_images_signed
```

Dùng `@ConfigurationProperties` + `@Validated` (`@NotBlank`, `@Pattern`) để ứng dụng dừng ngay khi thiếu cấu hình. Validate không cần gọi mạng.

**Preset trên Cloudinary console (bắt buộc):**
- cả hai preset ở chế độ **Signed**;
- `allowed_formats = jpg,png,webp`;
- `max_file_size = 10485760` (10 MB);
- delivery type khớp với policy (`upload` / `authenticated`);
- không cho phép PDF.

Code không tự kiểm tra được các thiết lập này, nên cần runbook cấu hình (audit M2).

### 5.2 `CloudinaryService`: nơi duy nhất giữ secret

Interface tối thiểu:

```java
public interface CloudinaryService {
    UploadPolicy getPolicy(UploadOwnerType ownerType);              // switch đầy đủ, default -> throw
    UploadSignature createUploadSignature(UploadOwnerType ownerType, UUID intentId);
    boolean verifyUploadResponse(String publicId, long version, String signature);
    String buildImageUrl(String publicId, UploadOwnerType ownerType);
    void destroy(String publicId, UploadOwnerType ownerType);        // ném exception khi lỗi
}
```

**Tạo chữ ký upload:**
- Tham số được ký: `public_id`, `timestamp` (epoch giây), `type` (delivery type), `upload_preset`, `overwrite=false`, và `asset_folder` (chỉ khi `DYNAMIC`).
- Thuật toán của Cloudinary:
  1. Sắp các tham số theo key.
  2. Nối thành chuỗi `k1=v1&k2=v2...`. **Không** đưa vào `file`, `api_key`, `resource_type`, `cloud_name`.
  3. Nối thêm `api_secret` vào cuối chuỗi.
  4. Băm bằng SHA-1 (mặc định), hoặc SHA-256 nếu account cấu hình như vậy.
- Với SDK Java (`com.cloudinary:cloudinary-http5`/`cloudinary-core`), dùng `cloudinary.apiSignRequest(params, apiSecret, signatureVersion)`. Overload của hàm này khác nhau giữa các phiên bản SDK, nên kiểm tra lại trước khi dùng. Có thể tự cài đặt theo các bước 1–4 ở trên làm phương án dự phòng.
- Upload URL: `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload`.

**Xác minh chữ ký response:**
- Công thức: `sign({public_id, version})` theo cùng thuật toán, so với `signature` mà Cloudinary trả về.
- SDK Java có `cloudinary.verifyApiResponseSignature(publicId, version, signature[, signatureVersion])`. Kiểm tra lại đúng chữ ký hàm theo phiên bản SDK đang dùng.
- Nếu tự so sánh, dùng phép so **constant-time**: `MessageDigest.isEqual(a.getBytes(UTF_8), b.getBytes(UTF_8))`.
- Truyền vào **`publicId` lưu trong intent**, không dùng giá trị client gửi lên.

**Build URL:**
- Ảnh công khai: `cloudinary.url().secure(true).type("upload").generate(publicId)`.
- Ảnh riêng tư: `cloudinary.url().secure(true).type("authenticated").signed(true).generate(publicId)`. URL ký kiểu này **không hết hạn**; đây là giới hạn đã chấp nhận ở phiên bản đầu.

**Xóa asset:** `cloudinary.uploader().destroy(publicId, Map.of("resource_type","image","type",deliveryType,"invalidate",true))`. Nếu response có lỗi thì ném exception. Kết quả `"not found"` có thể coi là thành công.

### 5.3 `UploadIntentService`

**`createSignature(actorId, ownerType)`**
1. Kiểm tra `ownerType` hợp lệ và **đã có API consume**. Nếu không, trả 400 và không tạo intent.
2. `intentId = UUID.randomUUID()`, rồi `sig = cloudinaryService.createUploadSignature(ownerType, intentId)`.
3. Lưu intent `PENDING` (`publicImageId = sig.publicId`, `createdBy = actorId`) và audit `CREATE_UPLOAD_INTENT` **trong cùng transaction**.
4. Trả response (mục 6.1). Không bao giờ trả secret.

**`consume(actorId, expectedOwnerType, uploadResult)`** (bắt buộc chạy trong `@Transactional` của domain service, không tự commit):
1. Validate input: `uploadIntentId` khác rỗng, `publicId` có giá trị và tối đa 255 ký tự, `version > 0`, `signature` có giá trị, `bytes >= 0`.
2. Đọc intent theo id. Không thấy thì trả 404.
3. `createdBy != actorId` thì trả 403.
4. `status != PENDING` thì trả 409.
5. `ownerType != expectedOwnerType` hoặc `publicImageId` khác `publicId` (so chính xác) thì trả 400.
6. `!verifyUploadResponse(intent.publicImageId, version, signature)` thì trả 400.
7. **Chuyển trạng thái có điều kiện (chống dùng trùng):**

   ```java
   @Modifying
   @Query("""
     update UploadIntent i
        set i.status = 'COMPLETED', i.completedAt = :now,
            i.assetId = :assetId, i.format = :format, i.bytes = :bytes
      where i.id = :id and i.status = 'PENDING'
   """)
   int completeIfPending(...);
   ```

   Nếu số dòng cập nhật khác 1 thì ném exception để rollback toàn bộ transaction và trả 409.
   - Cách khác: dùng `@Version` (optimistic locking) và map `ObjectOptimisticLockingFailureException` thành 409.
   - **Không** dừng ở "đọc thấy PENDING rồi set COMPLETED" mà không có điều kiện ở câu `UPDATE`. Đó chính là lỗi đã gặp ở dự án gốc (mục 8.1).
8. Trả về `intent.publicImageId` để domain service gán vào entity.

### 5.4 Domain service: thứ tự bắt buộc

**Create/Update kèm `imageUpload`:**

```java
@Transactional
public EditionResponse update(UUID id, UpdateEditionRequest req, Actor actor) {
    var edition = repo.findById(id).orElseThrow(NotFound::new);
    validateBusinessRules(req);                         // 1. validate nghiệp vụ trước
    applyFields(edition, req);                          //    (không đụng publicImageId nếu không có imageUpload)
    String oldId = null;
    if (req.imageUpload() != null) {
        var newId = uploadIntentService.consume(actor.id(), EDITION_IMAGE, req.imageUpload()); // 2
        oldId = edition.getPublicImageId();
        edition.setPublicImageId(newId);                // 3
        audit(oldId == null ? "ATTACH_IMAGE" : "REPLACE_IMAGE", edition.getId(), oldId, req.imageUpload().uploadIntentId(), newId); // 4
    }
    if (oldId != null) destroyAfterCommit(oldId, EDITION_IMAGE);   // 5. đăng ký, CHƯA xóa
    return toResponse(edition);                         // imageUrl build trong bộ nhớ
}
```

**`destroyAfterCommit`:** đăng ký callback để chạy **chỉ khi commit thành công**:

```java
TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override public void afterCommit() {
        try { cloudinaryService.destroy(publicId, ownerType); }
        catch (Exception e) {
            log.warn("Cloudinary orphan: failed to destroy asset {} ({}) after database commit.", publicId, ownerType, e);
        }
    }
});
```

Có thể dùng `@TransactionalEventListener(phase = AFTER_COMMIT)` thay cho đoạn trên. **Không** gọi `destroy` trực tiếp bên trong method `@Transactional`, vì nếu commit lỗi thì asset đã bị xóa mất.

**Route ảnh chuyên biệt** (mở cho mọi role nhân viên):

| Route | Hành vi |
|---|---|
| `PUT /api/<entity>/{id}/image` | Body là kết quả upload. Consume, thay ảnh, audit, commit, rồi xóa asset cũ sau commit |
| `DELETE /api/<entity>/{id}/image` | Set `publicImageId = null`, audit `DELETE_IMAGE`, commit, rồi xóa asset sau commit. Nếu entity không có ảnh thì trả 204 mà không làm gì |
| Xóa entity cha có ảnh | Lấy `publicImageId`, xóa entity và ghi audit, commit, rồi xóa asset sau commit |

**Update không kèm `imageUpload` phải giữ nguyên ảnh hiện tại.** Không được hiểu "thiếu trường" là "xóa ảnh". Muốn xóa ảnh thì dùng route `DELETE .../image`.

**Ảnh nhiều tấm** (bảng con): mỗi ảnh tương ứng một intent và một dòng con. Xóa theo id của dòng con, đặt dưới route của entity cha. Phải xóa các dòng con trước khi xóa entity cha.

### 5.5 Đọc dữ liệu

```java
var rows = repo.findPage(...);   // projection có chứa publicImageId
return rows.map(r -> new TitleResponse(..., r.publicImageId() == null ? null
        : cloudinaryService.buildImageUrl(r.publicImageId(), TITLE_IMAGE)));
```

Khi một DTO có cả ảnh của chính entity và ảnh của entity liên quan, đặt tên tách bạch, ví dụ BookCopy có `imageUrl` (ảnh bản sách) và `editionImageUrl` (ảnh ấn bản). Không dùng một tên chung chung như `coverImageUrl`.

### 5.6 Map lỗi và audit

| Tình huống | HTTP |
|---|---|
| Thiếu hoặc sai actor (JWT `sub`) | 401 |
| Intent thuộc người khác | 403 |
| Không tìm thấy intent hoặc entity | 404 |
| Sai owner type, public id hoặc chữ ký; owner type chưa hỗ trợ | 400 |
| Intent đã dùng; mất khi tranh chấp concurrency | 409 |

**Audit action:**
- `CREATE_UPLOAD_INTENT`: đích là `UploadIntent`.
- `ATTACH_IMAGE`, `REPLACE_IMAGE`, `DELETE_IMAGE`: đích là entity domain, `before`/`after` chứa `publicImageId` và `uploadIntentId`, kèm actor và IP.

**Bảo mật web:** nếu dùng cookie auth thì CSRF phải phủ cả `POST /signature` và các route `PUT`/`DELETE .../image`. Nên thêm rate limit cho endpoint signature theo user (audit M3).

---

## 6. Contract API

### 6.1 `POST /api/uploads/signature`

```json
// request
{ "ownerType": "EDITION_IMAGE" }

// response 200
{
  "uploadIntentId": "3f0c…",
  "apiKey": "123456789012345",
  "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud>/image/upload",
  "publicId": "cloud-bookstore/public/editions/3f0c…",
  "assetFolder": "cloud-bookstore/public/editions",   // null nếu FIXED
  "uploadPreset": "book_images_signed",
  "deliveryType": "upload",
  "overwrite": false,
  "timestamp": 1793650000,
  "signature": "a1b2…"
}
```

### 6.2 Kết quả upload gửi kèm Create/Update (field `imageUpload`), hoặc làm body của `PUT .../image`

```json
{
  "uploadIntentId": "3f0c…",
  "publicId": "cloud-bookstore/public/editions/3f0c…",
  "version": 1793650042,
  "signature": "<signature trong response của Cloudinary>",
  "assetId": "…", "format": "webp", "bytes": 123456
}
```

### 6.3 Response đọc dữ liệu

Có `imageUrl` (nullable), không có `publicImageId`.

---

## 7. Frontend (React)

```ts
async function uploadImage(ownerType: UploadOwnerType, file: File): Promise<ImageUpload> {
  // validate để trải nghiệm tốt hơn (KHÔNG phải ranh giới bảo mật)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận JPEG/PNG/WebP');
  if (file.size > 10 * 1024 * 1024) throw new Error('Tối đa 10 MB');

  const sig = await api.post<UploadSignatureResponse>('/api/uploads/signature', { ownerType });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('public_id', sig.publicId);
  form.append('upload_preset', sig.uploadPreset);
  form.append('type', sig.deliveryType);
  form.append('overwrite', String(sig.overwrite));
  if (sig.assetFolder) form.append('asset_folder', sig.assetFolder);
  // Gửi ĐÚNG và ĐỦ các params đã ký. Thêm hoặc bớt params có trong chữ ký thì Cloudinary trả 401 "Invalid Signature".

  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });   // KHÔNG gắn cookie hay Authorization của app
  if (!res.ok) throw new Error((await res.json()).error?.message ?? 'Upload thất bại');
  const r = await res.json();

  return {
    uploadIntentId: sig.uploadIntentId,
    publicId: r.public_id,
    version: r.version,
    signature: r.signature,
    assetId: r.asset_id,
    format: r.format,
    bytes: r.bytes,
  };
}

// dùng khi submit form
const imageUpload = file ? await uploadImage('EDITION_IMAGE', file) : undefined;
await api.put(`/api/editions/${id}`, { ...formValues, imageUpload });
// hoặc chỉ đổi ảnh: await api.put(`/api/editions/${id}/image`, imageUpload);
```

**Quy tắc ở frontend:**
- Khóa nút submit trong lúc gửi, để tránh hai request dùng chung một intent.
- **400** do lỗi validate form: intent vẫn `PENDING`, nên có thể sửa form rồi gửi lại với **cùng** `imageUpload`.
- **409** (intent đã dùng): không gửi lại cùng intent. Nếu thực sự cần ảnh cho entity khác thì xin chữ ký mới và upload lại; nếu là request trùng thì chỉ cần tải lại dữ liệu.
- Hiển thị ảnh bằng `imageUrl` server trả về. Không tự ghép URL Cloudinary từ `publicId`.
- Chữ ký Cloudinary hết hạn sau khoảng 1 giờ tính từ `timestamp`. Nên xin chữ ký ngay trước khi upload, không xin sẵn khi mở form.

---

## 8. Bài học từ dự án gốc (lỗi đã gặp)

1. **Hai request dùng chung một intent:**
   - Hai request cùng đọc được `PENDING` trước khi bên kia commit, nên cả hai cùng consume thành công.
   - Kết quả là hai entity dùng chung một `public_id`; xóa hoặc thay ảnh của entity này thì ảnh của entity kia mất (404).
   - Cách sửa: chuyển trạng thái có điều kiện (`WHERE status='PENDING'`) hoặc dùng optimistic lock, và map lỗi thành 409 (mục 5.3, bước 7).
2. **Update xóa mất ảnh:** code cũ gán `publicImageId = request.coverImageUrl`. Client vừa gán được giá trị tùy ý, vừa làm mất ảnh khi không gửi trường này. Ảnh chỉ được đổi qua intent đã xác minh.
3. **Test bằng DB trong bộ nhớ không phản ánh đúng transaction:** InMemory hoặc H2 có thể không rollback như PostgreSQL, và không chạy được `FOR UPDATE` hay `nextval`. Hãy test concurrency và rollback bằng **Testcontainers PostgreSQL** (audit M1).
4. **Map claim của JWT:** đảm bảo đọc được `sub` làm actor. Ở .NET phải tắt map claim mặc định; ở Spring thì dùng `jwt.getSubject()`.
5. **Preset sai cấu hình** thì làm hỏng mọi giới hạn định dạng và dung lượng (audit M2). **Không có rate limit** thì intent và asset mồ côi tăng không giới hạn (audit M3).
6. **Thuật toán ký:** SHA-1 là mặc định. Nếu account Cloudinary dùng SHA-256, phải cấu hình giống nhau cho cả chữ ký upload và việc xác minh, nếu không thì mọi lần consume đều trả 400 (audit L1).

---

## 9. Checklist cho agent khi chỉnh dự án Spring Boot + React

**Backend**
- [ ] Có `CloudinaryProperties` validate khi khởi động; secret lấy từ env; có `.example` không chứa secret.
- [ ] Có enum `UploadOwnerType` và **một** hàm `getPolicy` dùng switch đầy đủ.
- [ ] Bảng `upload_intents` đúng các cột ở mục 4: `public_image_id` unique, FK `created_by` kiểu NO ACTION, không có cột thừa.
- [ ] Các entity lưu ảnh có cột `public_image_id` nullable; bỏ các cột URL ảnh cũ.
- [ ] `POST /api/uploads/signature`: yêu cầu xác thực và đúng role; từ chối owner type chưa có API consume; tạo intent và audit cùng transaction.
- [ ] Tham số ký được tạo cứng phía server: `public_id`, `timestamp`, `type`, `upload_preset`, `overwrite=false`, `asset_folder` (DYNAMIC).
- [ ] `consume` làm đủ các kiểm tra ở mục 5.3, so chữ ký constant-time, **chuyển trạng thái có điều kiện**, chạy trong transaction của domain.
- [ ] Create/Update nhận `imageUpload` tùy chọn; Update không có `imageUpload` thì giữ nguyên ảnh.
- [ ] Có route `PUT`/`DELETE /{id}/image` cho mọi role nhân viên, không mở rộng quyền sửa các trường khác.
- [ ] Xóa asset chỉ chạy `afterCommit`; lỗi thì `log.warn` có `publicId` và `ownerType`.
- [ ] DTO đọc chỉ có `imageUrl` (và `xxxImageUrl` cho ảnh của entity liên quan); URL build sau khi query.
- [ ] Audit đủ các action `CREATE_UPLOAD_INTENT`, `ATTACH_IMAGE`, `REPLACE_IMAGE`, `DELETE_IMAGE`.
- [ ] CSRF (nếu dùng cookie) và rate limit cho endpoint signature.
- [ ] Gỡ hết đường upload cũ (multipart qua backend, S3/MinIO, bảng attachment kiểu đa hình) nếu có.

**Frontend**
- [ ] Có `uploadImage()` theo mục 7: gửi đúng và đủ các params đã ký, không gửi cookie hay Authorization của app sang Cloudinary.
- [ ] Payload Create/Update có `imageUpload`; có nút đổi ảnh và xóa ảnh gọi route `/image`.
- [ ] Xử lý 400 (gửi lại cùng intent) và 409 (xin intent mới hoặc tải lại dữ liệu); khóa submit khi đang gửi.
- [ ] Hiển thị bằng `imageUrl`; bỏ mọi chỗ còn dùng `coverImageUrl` hay attachment cũ.

**Test tối thiểu**
- [ ] Policy: ảnh sách là `upload`, ảnh bằng chứng là `authenticated`; owner type lạ ném exception.
- [ ] Chữ ký: `public_id` do server sinh; chữ ký response của một `public_id` khác bị từ chối.
- [ ] Consume: sai actor (403), sai chữ ký hoặc public id (400, intent vẫn `PENDING`), dùng lại (409), **hai request đồng thời chỉ một thành công** (Postgres thật).
- [ ] Create kèm ảnh: lưu đúng `publicImageId` và intent chuyển `COMPLETED`; validate lỗi thì intent vẫn `PENDING`.
- [ ] Thay ảnh khi xóa trên Cloudinary lỗi: giữ ID mới, có log cảnh báo.
- [ ] Xóa: DB đã commit trước khi gọi xóa trên Cloudinary.
- [ ] DTO đọc không có `publicImageId`.

---

## 10. Ngoài phạm vi phiên bản đầu (cố ý hoãn)

- Job dọn asset mồ côi: so `upload_intents` (`COMPLETED`, và cả `PENDING` quá cũ) với các cột và bảng ảnh.
- API cho ảnh bằng chứng (nhiều ảnh, dạng `authenticated`).
- URL riêng tư có thời hạn (token hoặc `private_download_url`).
- Xử lý thay ảnh đồng thời trên cùng entity (hiện là last-write-wins; intent của request thua trở thành asset mồ côi).
- Hạn sử dụng của intent: hiện không có `expiresAt`; chỉ chữ ký Cloudinary tự hết hạn.
