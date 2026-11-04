# CLOUDINARY_AGENT.md: hướng dẫn triển khai upload ảnh trực tiếp lên Cloudinary (signed direct upload)

> **Đối tượng:** AI coding agent (hoặc developer) cần triển khai, hoặc sửa lại cho đúng, luồng upload ảnh Cloudinary trong **bất kỳ dự án web nào** có backend riêng và frontend chạy trên trình duyệt / mobile.
> **Phạm vi:** không phụ thuộc ngôn ngữ hay framework. Code mẫu viết bằng pseudocode / TypeScript; mục 11 ghi chú cách làm tương ứng trên các stack phổ biến.
> **Cách dùng:**
> 1. Đọc hết mục 1–3 (ý tưởng, bất biến, quyết định cần đưa ra) trước khi sửa code.
> 2. Khảo sát dự án đích theo mục 0, rồi điền các giá trị cụ thể (owner type, entity, role, tên route...).
> 3. Triển khai theo mục 4–8, đối chiếu bằng checklist ở mục 10.
>
> Mọi tên class / route / bảng trong tài liệu là **ví dụ**. Phải giữ nguyên **contract và bất biến**; còn tên thì đổi theo convention của dự án đích.

---

## 0. Khảo sát dự án đích trước khi viết code

Agent phải trả lời được các câu hỏi sau (đọc code, config, migration; hỏi người dùng nếu không tự xác định được):

| Câu hỏi | Tại sao cần |
|---|---|
| Backend dùng stack gì? Cơ chế transaction là gì (ORM unit-of-work, `@Transactional`, `BEGIN/COMMIT` thủ công...)? | Consume intent phải nằm cùng transaction với việc ghi entity; xóa asset phải chạy *sau commit*. |
| Có hook "after commit" không (transaction synchronization, domain event, outbox...)? | Dùng cho việc xóa asset cũ (mục 5.5). |
| Database gì? Có hỗ trợ `UPDATE ... WHERE status = ...` trả về số dòng, hoặc optimistic locking không? | Chống dùng trùng intent (mục 5.4). |
| Xác thực thế nào (JWT bearer, cookie session)? Lấy id người dùng hiện tại từ đâu? | Intent gắn với người tạo; cookie auth cần CSRF. |
| Mô hình phân quyền (role, ownership)? Ai được đổi ảnh của entity nào? | Quyết định quyền cho route signature và route ảnh. |
| Đã có hệ thống audit log chưa? | Ghi các action ảnh (mục 5.7). |
| Những entity nào cần ảnh? Mỗi entity 1 ảnh hay nhiều ảnh? Ảnh công khai hay riêng tư? | Lập bảng owner type (mục 3). |
| Hiện có luồng upload cũ không (multipart qua backend, S3, cột URL ảnh tự do, bảng attachment đa hình)? | Cần gỡ hoặc migrate. |
| Cloudinary account dùng folder mode `DYNAMIC` hay `FIXED`? Thuật toán ký SHA-1 hay SHA-256? | Ảnh hưởng tham số ký và xác minh. |

Ghi kết quả khảo sát ra một bảng ngắn trước khi bắt tay vào sửa code.

---

## 1. Ý tưởng cốt lõi

- **Client upload file thẳng lên Cloudinary.** Backend không bao giờ nhận bytes của ảnh.
- **Backend là bên quyết định toàn bộ:**
  - Cấp chữ ký upload với các tham số do **server** quyết định: `public_id`, folder, delivery type, upload preset.
  - Xác minh kết quả Cloudinary trả về rồi mới gắn `public_id` vào entity.
- **Upload intent** là một "vé" dùng **một lần**, gắn với người tạo. Nó ngăn client gắn một asset Cloudinary tùy ý, hoặc asset của người khác, vào entity.
- Entity chỉ lưu `publicImageId`. API đọc dữ liệu trả `imageUrl` đã build sẵn, **không trả `publicImageId`**.
- **Database trước, Cloudinary sau:** khi thay hoặc xóa ảnh, commit DB trước rồi mới xóa asset cũ. Nếu xóa trên Cloudinary lỗi thì chỉ log cảnh báo, không rollback DB.

```text
Client                        Backend API                            Cloudinary
  |  POST /uploads/signature {ownerType}      |                            |
  |------------------------------------------>| tạo UploadIntent PENDING   |
  |                                           | ký params do server quyết định
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

Không có endpoint `/complete` độc lập. Kết quả upload chỉ được "tiêu thụ" bên trong thao tác Create/Update của domain, hoặc route ảnh chuyên biệt của entity.

---

## 2. Bất biến bắt buộc (không được vi phạm)

1. **`api_secret` chỉ nằm ở backend**, đọc từ biến môi trường hoặc secret store. Không đặt trong file config được commit, không đưa vào bundle client.
2. **`public_id` do backend sinh.** Client không được gửi hoặc sửa nó khi xin chữ ký.
3. **Chính sách lấy từ một nguồn duy nhất:** một hàm `getPolicy(ownerType)` (switch/match đầy đủ, giá trị lạ thì throw) quyết định delivery type (`upload` cho ảnh công khai, `authenticated` cho ảnh riêng tư), preset và folder. Client không được chọn delivery type.
4. **Chỉ ký một tập tham số cố định do server tạo.** Không có endpoint nào nhận map tham số tùy ý từ client rồi ký.
5. **Intent dùng một lần.** Consume phải kiểm tra:
   - đúng người tạo (`createdBy == actor`);
   - trạng thái `PENDING`;
   - đúng `ownerType` mong đợi;
   - `publicId` khớp chính xác;
   - chữ ký response của Cloudinary hợp lệ.

   Sau đó chuyển sang `COMPLETED` **có điều kiện**, để hai request đồng thời không thể cùng thành công (mục 5.4).
6. **Consume nằm cùng transaction** với việc ghi entity và audit. Nếu kiểm tra thất bại hoặc rollback thì intent phải còn `PENDING`, để client gửi lại được.
7. **Chữ ký response chỉ phủ `public_id` và `version`.** Các field `asset_id`, `format`, `bytes` chỉ để tham khảo, không dùng để quyết định quyền. Định dạng và dung lượng được kiểm soát bởi **signed upload preset**. Validate ở client chỉ phục vụ trải nghiệm người dùng.
8. **Database trước:** chỉ xóa asset cũ trên Cloudinary **sau khi commit thành công**. Không bao giờ xóa khi transaction bị rollback.
9. **Không ghi đè asset:** mỗi lần thay ảnh dùng intent mới và `public_id` mới, ký `overwrite=false`. Nhờ vậy không mất ảnh cũ khi lỗi giữa chừng, và không bị CDN cache ảnh cũ.
10. **API đọc chỉ trả `imageUrl`.** URL được build trong bộ nhớ sau khi query xong, không build trong câu query / projection của ORM.

---

## 3. Quyết định cần đưa ra cho dự án đích

### 3.1 Bảng owner type

Mỗi "chỗ chứa ảnh" là một owner type. Lập bảng theo mẫu (ví dụ cho một shop bán hàng):

| `UploadOwnerType` | Lưu ở đâu | Delivery type | Preset | Folder segment | Số lượng |
|---|---|---|---|---|---|
| `PRODUCT_IMAGE` | `products.public_image_id` | `upload` | public preset | `public/products` | 1 |
| `CATEGORY_IMAGE` | `categories.public_image_id` | `upload` | public preset | `public/categories` | 1 |
| `ORDER_EVIDENCE_IMAGE` | bảng con `order_evidence_images` | `authenticated` | authenticated preset | `private/order-evidence` | Nhiều |

Quy tắc:
- Ảnh hiển thị công khai → `upload`. Ảnh nhạy cảm (giấy tờ, bằng chứng, ảnh nội bộ) → `authenticated`.
- 1 ảnh / entity → thêm cột `public_image_id` vào bảng entity. Nhiều ảnh → bảng con riêng cho từng loại.
- **Không** tạo bảng "media/attachment" đa hình dùng chung (`owner_type` + `owner_id`): khó ràng buộc FK, khó phân quyền, dễ lộ ảnh.

### 3.2 Public ID và folder

- **Public ID:** `<rootFolder>/<folder segment>/<intentId dạng hex không dấu gạch>`, ví dụ `my-app/public/products/7d13d8f578b145a298c2f54c613dbf57`.
- **Folder mode:**
  - `DYNAMIC` (mặc định của product environment mới): ký thêm `asset_folder = <rootFolder>/<folder segment>`. Chỉ `public_id` thôi không quyết định vị trí thư mục trong Media Library.
  - `FIXED` (environment cũ): không gửi `asset_folder`; đường dẫn trong `public_id` tự tạo thư mục.

### 3.3 Owner type chưa có API tiêu thụ

Endpoint signature phải **từ chối** owner type chưa có API domain để consume. Nếu vẫn cấp, sẽ sinh intent vô dụng và asset mồ côi. Có thể khai báo owner type trong enum trước, nhưng đánh dấu "chưa hỗ trợ" cho tới khi có route consume.

### 3.4 Phân quyền

- Quyền xin chữ ký cho owner type X = quyền đổi ảnh của entity loại X.
- Có thể cho phép một nhóm người dùng rộng hơn **chỉ đổi ảnh** qua route ảnh riêng (mục 5.6), nhưng **không** mở rộng quyền sửa các trường khác của entity chỉ để phục vụ việc đổi ảnh.

---

## 4. Mô hình dữ liệu

Ví dụ SQL (PostgreSQL); chuyển sang DB/ORM của dự án đích.

```sql
CREATE TABLE upload_intents (
  id               uuid PRIMARY KEY,
  owner_type       varchar(40)  NOT NULL,                   -- enum lưu dạng string
  public_image_id  varchar(255) NOT NULL UNIQUE,            -- do backend sinh
  status           varchar(20)  NOT NULL DEFAULT 'PENDING', -- PENDING | COMPLETED
  created_by       uuid NOT NULL REFERENCES users(id),      -- NO ACTION (bảng người dùng của dự án)
  created_at       timestamptz  NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  asset_id         varchar(64),   -- chỉ để tham khảo
  format           varchar(20),   -- chỉ để tham khảo
  bytes            bigint         -- chỉ để tham khảo
);
-- KHÔNG cần: owner_id, version, delivery_type, width, height.
-- Không entity nào FK tới upload_intents. Giữ intent COMPLETED vĩnh viễn: đây là danh mục cho job dọn asset mồ côi.

-- Entity 1 ảnh:
ALTER TABLE <entity_table> ADD COLUMN public_image_id varchar(255);   -- nullable

-- Entity nhiều ảnh:
CREATE TABLE <entity>_images (
  id               uuid PRIMARY KEY,
  <entity>_id      uuid NOT NULL REFERENCES <entity_table>(id),   -- NO ACTION: xóa ảnh trước khi xóa entity cha
  public_image_id  varchar(255) NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

- Enum lưu dạng **string**, không lưu số thứ tự.
- Không cascade xóa từ entity cha sang bảng ảnh con ở mức DB/ORM; việc xóa ảnh phải đi qua code để còn xóa asset sau commit.
- Nếu entity đang có cột URL ảnh cũ (`image_url`, `cover_url`...), thay bằng `public_image_id` và migrate dữ liệu nếu có thể.

---

## 5. Backend

### 5.1 Cấu hình (validate khi khởi động)

```yaml
cloudinary:
  cloud-name: ${CLOUDINARY_CLOUD_NAME}
  api-key: ${CLOUDINARY_API_KEY}
  api-secret: ${CLOUDINARY_API_SECRET}   # chỉ lấy từ env hoặc secret store
  root-folder: my-app                    # regex: ^[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*$
  folder-mode: DYNAMIC                   # DYNAMIC | FIXED
  signature-algorithm: SHA1              # SHA1 | SHA256, phải khớp cấu hình account
  public-upload-preset: <app>_public_signed
  authenticated-upload-preset: <app>_private_signed
```

- Validate bắt buộc khi khởi động (không cần gọi mạng): thiếu giá trị hoặc sai định dạng thì ứng dụng dừng ngay.
- Commit một file `.example` không chứa secret.

**Preset trên Cloudinary console (bắt buộc, code không tự kiểm tra được → cần runbook):**
- chế độ **Signed**;
- `allowed_formats` giới hạn (ví dụ `jpg,png,webp`);
- `max_file_size` giới hạn (ví dụ `10485760` = 10 MB);
- delivery type khớp với policy (`upload` / `authenticated`);
- không cho phép PDF hay định dạng không phải ảnh nếu không cần.

### 5.2 `CloudinaryService`: nơi duy nhất giữ secret

Interface tối thiểu (pseudocode):

```text
interface CloudinaryService {
  getPolicy(ownerType) -> UploadPolicy                          // switch đầy đủ, giá trị lạ -> throw
  createUploadSignature(ownerType, intentId) -> UploadSignature
  verifyUploadResponse(publicId, version, signature) -> bool
  buildImageUrl(publicId, ownerType) -> string
  destroy(publicId, ownerType)                                   // throw khi lỗi
}
```

### 5.3 Ký và xác minh

**Tạo chữ ký upload:**
- Tham số được ký: `public_id`, `timestamp` (epoch giây), `type` (delivery type), `upload_preset`, `overwrite=false`, và `asset_folder` (chỉ khi `DYNAMIC`).
- Thuật toán của Cloudinary:
  1. Sắp các tham số theo key (bỏ giá trị rỗng/null).
  2. Nối thành chuỗi `k1=v1&k2=v2...`. **Không** đưa vào `file`, `api_key`, `resource_type`, `cloud_name`.
  3. Nối thêm `api_secret` vào cuối chuỗi.
  4. Băm SHA-1 (mặc định) hoặc SHA-256 nếu account cấu hình vậy; xuất dạng hex chữ thường.
- Ưu tiên dùng hàm ký của SDK chính thức (mục 11). Chữ ký hàm khác nhau giữa các phiên bản SDK, nên kiểm tra lại; có thể tự cài đặt theo bước 1–4 làm phương án dự phòng.
- Upload URL: `https://api.cloudinary.com/v1_1/<cloud_name>/image/upload`.

**Xác minh chữ ký response:**
- Công thức: `sign({public_id, version})` theo cùng thuật toán, so với `signature` Cloudinary trả về.
- So sánh **constant-time**.
- Truyền vào **`publicId` lưu trong intent**, không dùng giá trị client gửi lên.

**Build URL:**
- Ảnh công khai: URL `secure`, type `upload`.
- Ảnh riêng tư: URL `secure`, type `authenticated`, `signed=true`. URL ký kiểu này **không hết hạn**; nếu cần hết hạn, dùng token-based auth hoặc `private_download_url` (ngoài phạm vi phiên bản đầu).
- Có thể thêm transformation mặc định (`f_auto,q_auto`, kích thước) tại đây, ở một chỗ duy nhất.

**Xóa asset:** gọi `destroy(publicId, {resource_type: "image", type: <deliveryType>, invalidate: true})`. Response lỗi thì throw. Kết quả `"not found"` có thể coi là thành công.

### 5.4 `UploadIntentService`

**`createSignature(actorId, ownerType)`**
1. Kiểm tra `ownerType` hợp lệ và **đã có API consume**. Nếu không, trả 400 và không tạo intent.
2. `intentId = newUuid()`, rồi `sig = cloudinaryService.createUploadSignature(ownerType, intentId)`.
3. Lưu intent `PENDING` (`publicImageId = sig.publicId`, `createdBy = actorId`) và ghi audit `CREATE_UPLOAD_INTENT` **trong cùng transaction**.
4. Trả response (mục 6.1). Không bao giờ trả secret.

**`consume(actorId, expectedOwnerType, uploadResult)`** — bắt buộc chạy bên trong transaction của domain service, **không tự commit**:
1. Validate input: `uploadIntentId` có giá trị, `publicId` có giá trị và ≤ 255 ký tự, `version > 0`, `signature` có giá trị, `bytes >= 0` (nếu có).
2. Đọc intent theo id. Không thấy → 404.
3. `createdBy != actorId` → 403.
4. `status != PENDING` → 409.
5. `ownerType != expectedOwnerType` hoặc `publicImageId != publicId` (so chính xác) → 400.
6. `!verifyUploadResponse(intent.publicImageId, version, signature)` → 400.
7. **Chuyển trạng thái có điều kiện (chống dùng trùng):**

   ```sql
   UPDATE upload_intents
      SET status = 'COMPLETED', completed_at = :now,
          asset_id = :assetId, format = :format, bytes = :bytes
    WHERE id = :id AND status = 'PENDING';
   ```

   Nếu số dòng cập nhật khác 1 → throw để rollback toàn bộ transaction và trả 409.
   - Cách khác: optimistic locking (cột version / concurrency token) và map lỗi xung đột thành 409.
   - **Không** dừng ở "đọc thấy PENDING rồi set COMPLETED" mà không có điều kiện trong câu `UPDATE`: hai request đồng thời đều đọc thấy `PENDING` và cùng thành công (mục 9.1).
8. Trả về `intent.publicImageId` để domain service gán vào entity.

### 5.5 Domain service: thứ tự bắt buộc

**Create/Update kèm `imageUpload` (pseudocode):**

```text
transaction {
  entity = repo.find(id) or 404
  validateBusinessRules(req)                  // 1. validate nghiệp vụ trước
  applyFields(entity, req)                    //    không đụng publicImageId nếu không có imageUpload
  oldId = null
  if req.imageUpload != null:
    newId = uploadIntentService.consume(actor.id, PRODUCT_IMAGE, req.imageUpload)   // 2
    oldId = entity.publicImageId
    entity.publicImageId = newId                                                  // 3
    audit(oldId == null ? ATTACH_IMAGE : REPLACE_IMAGE, entity.id, before=oldId, after=newId, intent=req.imageUpload.uploadIntentId)  // 4
  if oldId != null:
    destroyAfterCommit(oldId, PRODUCT_IMAGE)  // 5. chỉ ĐĂNG KÝ, chưa xóa
}
return toResponse(entity)                     // imageUrl build trong bộ nhớ
```

**`destroyAfterCommit`:** đăng ký callback chạy **chỉ khi commit thành công**:

```text
onAfterCommit(() => {
  try cloudinaryService.destroy(publicId, ownerType)
  catch e: log.warn("Cloudinary orphan: failed to destroy asset {publicId} ({ownerType}) after database commit", e)
})
```

- **Không** gọi `destroy` trực tiếp bên trong transaction: nếu commit lỗi thì asset đã bị xóa mất.
- Nếu framework không có hook after-commit, gọi `destroy` ngay sau dòng commit thành công, hoặc dùng outbox/hàng đợi job.

**Update không kèm `imageUpload` phải giữ nguyên ảnh hiện tại.** Không được hiểu "thiếu trường" là "xóa ảnh". Muốn xóa ảnh thì dùng route `DELETE .../image`.

### 5.6 Route ảnh chuyên biệt

| Route | Hành vi |
|---|---|
| `PUT /<entities>/{id}/image` | Body là kết quả upload (mục 6.2). Consume, thay ảnh, audit, commit, rồi xóa asset cũ sau commit |
| `DELETE /<entities>/{id}/image` | Set `publicImageId = null`, audit `DELETE_IMAGE`, commit, rồi xóa asset sau commit. Entity không có ảnh thì trả 204 mà không làm gì |
| Xóa entity cha có ảnh | Lấy `publicImageId`, xóa entity và ghi audit, commit, rồi xóa asset sau commit |

**Ảnh nhiều tấm** (bảng con): mỗi ảnh tương ứng một intent và một dòng con.
- `POST /<entities>/{id}/images` (body là kết quả upload) → thêm dòng con.
- `DELETE /<entities>/{id}/images/{imageId}` → xóa dòng con, xóa asset sau commit.
- Phải xóa các dòng con (và đăng ký xóa asset) trước khi xóa entity cha.

### 5.7 Đọc dữ liệu

```text
rows = repo.findPage(...)           // projection có chứa publicImageId
return rows.map(r => Response(..., imageUrl = r.publicImageId == null ? null
                                              : cloudinaryService.buildImageUrl(r.publicImageId, PRODUCT_IMAGE)))
```

Khi một DTO có cả ảnh của chính entity và ảnh của entity liên quan, đặt tên tách bạch (ví dụ `imageUrl` cho ảnh của chính nó, `categoryImageUrl` cho ảnh danh mục). Không dùng một tên chung chung dễ nhầm.

### 5.8 Map lỗi, audit, bảo mật

| Tình huống | HTTP |
|---|---|
| Không xác định được actor | 401 |
| Không đủ quyền / intent thuộc người khác | 403 |
| Không tìm thấy intent hoặc entity | 404 |
| Sai owner type, public id hoặc chữ ký; owner type chưa hỗ trợ | 400 |
| Intent đã dùng; thua khi tranh chấp concurrency | 409 |

**Audit action:**
- `CREATE_UPLOAD_INTENT`: đích là `UploadIntent`.
- `ATTACH_IMAGE`, `REPLACE_IMAGE`, `DELETE_IMAGE`: đích là entity domain, `before`/`after` chứa `publicImageId` và `uploadIntentId`, kèm actor (và IP nếu hệ thống audit có).

**Bảo mật web:**
- Dùng cookie auth thì CSRF phải phủ `POST /uploads/signature` và các route `PUT`/`POST`/`DELETE .../image(s)`.
- Rate limit endpoint signature theo user, nếu không intent và asset mồ côi tăng không giới hạn.

---

## 6. Contract API

### 6.1 `POST /uploads/signature`

```json
// request
{ "ownerType": "PRODUCT_IMAGE" }

// response 200
{
  "uploadIntentId": "3f0c…",
  "apiKey": "123456789012345",
  "uploadUrl": "https://api.cloudinary.com/v1_1/<cloud>/image/upload",
  "publicId": "my-app/public/products/3f0c…",
  "assetFolder": "my-app/public/products",   // null nếu FIXED
  "uploadPreset": "<app>_public_signed",
  "deliveryType": "upload",
  "overwrite": false,
  "timestamp": 1793650000,
  "signature": "a1b2…"
}
```

`apiKey` không phải secret, được phép trả về client.

### 6.2 Kết quả upload (field `imageUpload` trong Create/Update, hoặc body của route ảnh)

```json
{
  "uploadIntentId": "3f0c…",
  "publicId": "my-app/public/products/3f0c…",
  "version": 1793650042,
  "signature": "<signature trong response của Cloudinary>",
  "assetId": "…", "format": "webp", "bytes": 123456
}
```

### 6.3 Response đọc dữ liệu

Có `imageUrl` (nullable), không có `publicImageId`.

---

## 7. Client (ví dụ TypeScript, áp dụng cho mọi framework frontend)

```ts
async function uploadImage(ownerType: UploadOwnerType, file: File): Promise<ImageUpload> {
  // validate để trải nghiệm tốt hơn (KHÔNG phải ranh giới bảo mật)
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận JPEG/PNG/WebP');
  if (file.size > 10 * 1024 * 1024) throw new Error('Tối đa 10 MB');

  const sig = await api.post<UploadSignatureResponse>('/uploads/signature', { ownerType });

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
  // Gửi ĐÚNG và ĐỦ các params đã ký. Thêm hoặc bớt params có trong chữ ký -> Cloudinary trả 401 "Invalid Signature".

  // Gọi fetch thuần, KHÔNG dùng HTTP client của app (tránh gắn cookie/Authorization/interceptor sang Cloudinary)
  const res = await fetch(sig.uploadUrl, { method: 'POST', body: form });
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

// khi submit form
const imageUpload = file ? await uploadImage('PRODUCT_IMAGE', file) : undefined;
await api.put(`/products/${id}`, { ...formValues, imageUpload });
// hoặc chỉ đổi ảnh: await api.put(`/products/${id}/image`, imageUpload);
```

**Quy tắc ở client:**
- Khóa nút submit trong lúc gửi, tránh hai request dùng chung một intent.
- **400** do validate form: intent vẫn `PENDING`, có thể sửa form rồi gửi lại với **cùng** `imageUpload` (không cần upload lại).
- **409** (intent đã dùng): không gửi lại cùng intent. Cần ảnh mới thì xin chữ ký mới và upload lại; nếu là request trùng thì chỉ cần tải lại dữ liệu.
- Hiển thị ảnh bằng `imageUrl` server trả về. Không tự ghép URL Cloudinary từ `publicId`.
- Chữ ký Cloudinary hết hạn sau khoảng 1 giờ tính từ `timestamp`. Xin chữ ký ngay trước khi upload, không xin sẵn khi mở form.

---

## 8. Kiểm thử

Test concurrency và rollback trên **database thật** (ví dụ Testcontainers), không dùng DB trong bộ nhớ: InMemory/SQLite/H2 có thể không rollback hay khóa giống DB production.

Ca test tối thiểu:
- **Policy:** ảnh công khai là `upload`, ảnh riêng tư là `authenticated`; owner type lạ throw; owner type chưa hỗ trợ bị endpoint signature từ chối.
- **Chữ ký:** `public_id` do server sinh; tham số ký đúng tập cố định; chữ ký response của một `public_id` khác bị từ chối. Nên có test vector cố định (params + secret → chữ ký mong đợi).
- **Consume:** sai actor (403); sai chữ ký hoặc public id (400, intent vẫn `PENDING`); dùng lại (409); **hai request đồng thời chỉ một thành công**.
- **Create kèm ảnh:** lưu đúng `publicImageId`, intent chuyển `COMPLETED`; validate nghiệp vụ lỗi thì intent vẫn `PENDING`.
- **Update không kèm ảnh:** ảnh cũ được giữ nguyên.
- **Thay ảnh khi xóa trên Cloudinary lỗi:** DB giữ ID mới, có log cảnh báo.
- **Xóa:** DB đã commit trước khi gọi xóa trên Cloudinary; rollback thì không gọi xóa.
- **DTO đọc** không có `publicImageId`.

Mock `CloudinaryService` ở test domain; chỉ test ký/xác minh với thuật toán thật.

---

## 9. Lỗi thường gặp (rút ra từ triển khai thực tế)

1. **Hai request dùng chung một intent:** cả hai đọc thấy `PENDING` trước khi bên kia commit, nên cùng consume thành công → hai entity dùng chung một `public_id`; xóa/thay ảnh của entity này làm ảnh của entity kia mất (404). Sửa: chuyển trạng thái có điều kiện hoặc optimistic lock, map thành 409.
2. **Update xóa mất ảnh / client gán URL tùy ý:** code gán `entity.image = request.imageUrl` cho phép client đặt giá trị bất kỳ, và làm mất ảnh khi không gửi trường. Ảnh chỉ được đổi qua intent đã xác minh.
3. **Test bằng DB trong bộ nhớ** cho kết quả xanh giả về transaction và concurrency.
4. **Không đọc được actor từ token:** kiểm tra đúng claim id người dùng (thường là `sub`). Một số framework tự đổi tên claim (ví dụ .NET map `sub` sang `ClaimTypes.NameIdentifier`), cần tắt hoặc đọc đúng tên.
5. **Preset cấu hình sai** (Unsigned, không giới hạn định dạng/dung lượng) làm vô hiệu mọi giới hạn phía server. Viết runbook và kiểm tra thủ công.
6. **Không có rate limit** cho endpoint signature → intent và asset mồ côi tăng không giới hạn.
7. **Lệch thuật toán ký:** account dùng SHA-256 mà code ký/xác minh bằng SHA-1 (hoặc ngược lại) → upload trả 401 hoặc mọi lần consume trả 400. Ký và xác minh phải dùng cùng cấu hình.
8. **Client gửi thừa/thiếu tham số đã ký** (ví dụ quên `asset_folder`, hoặc thêm `folder`) → 401 "Invalid Signature".
9. **HTTP client của app gắn header `Authorization` hoặc cookie** vào request sang Cloudinary → lỗi CORS hoặc lộ token cho bên thứ ba.

---

## 10. Checklist cho agent

**Khảo sát**
- [ ] Đã trả lời các câu hỏi ở mục 0 và lập bảng owner type (mục 3.1).

**Backend**
- [ ] Cấu hình Cloudinary validate khi khởi động; secret lấy từ env/secret store; có file `.example`.
- [ ] Có enum `UploadOwnerType` và **một** hàm `getPolicy` với switch đầy đủ.
- [ ] Bảng `upload_intents` đúng mục 4: `public_image_id` unique, FK `created_by` NO ACTION, không cột thừa.
- [ ] Entity lưu ảnh có cột `public_image_id` nullable (hoặc bảng con); bỏ cột URL ảnh cũ.
- [ ] `POST /uploads/signature`: yêu cầu xác thực và đúng quyền; từ chối owner type chưa có API consume; tạo intent và audit cùng transaction.
- [ ] Tham số ký tạo cứng phía server: `public_id`, `timestamp`, `type`, `upload_preset`, `overwrite=false`, `asset_folder` (DYNAMIC).
- [ ] `consume` làm đủ kiểm tra ở mục 5.4, so chữ ký constant-time, **chuyển trạng thái có điều kiện**, chạy trong transaction của domain.
- [ ] Create/Update nhận `imageUpload` tùy chọn; Update không có `imageUpload` thì giữ nguyên ảnh.
- [ ] Có route `PUT`/`DELETE /{id}/image` (và `POST`/`DELETE /{id}/images/...` cho ảnh nhiều tấm); không mở rộng quyền sửa các trường khác.
- [ ] Xóa asset chỉ chạy sau commit; lỗi thì log cảnh báo có `publicId` và `ownerType`.
- [ ] DTO đọc chỉ có `imageUrl` (và `xxxImageUrl` cho ảnh entity liên quan); URL build sau khi query.
- [ ] Audit đủ `CREATE_UPLOAD_INTENT`, `ATTACH_IMAGE`, `REPLACE_IMAGE`, `DELETE_IMAGE`.
- [ ] CSRF (nếu cookie auth) và rate limit cho endpoint signature.
- [ ] Gỡ hết đường upload cũ (multipart qua backend, storage khác, bảng attachment đa hình) nếu có.

**Client**
- [ ] Có `uploadImage()` theo mục 7: gửi đúng và đủ params đã ký, không gửi cookie/Authorization của app sang Cloudinary.
- [ ] Payload Create/Update có `imageUpload`; có nút đổi ảnh và xóa ảnh gọi route `/image`.
- [ ] Xử lý 400 (gửi lại cùng intent) và 409 (xin intent mới hoặc tải lại); khóa submit khi đang gửi.
- [ ] Hiển thị bằng `imageUrl`; không còn chỗ nào dùng trường URL ảnh cũ.

**Vận hành**
- [ ] Preset Signed với `allowed_formats`, `max_file_size`, delivery type đúng; có runbook.
- [ ] Các ca test ở mục 8 đã có và chạy trên DB thật.

---

## 11. Ghi chú theo stack

Kiểm tra lại tên hàm theo **phiên bản SDK** đang dùng trước khi viết code.

| Việc | Java / Spring Boot | .NET / ASP.NET Core | Node.js (Express/NestJS) |
|---|---|---|---|
| SDK | `com.cloudinary:cloudinary-http5` | `CloudinaryDotNet` | `cloudinary` (v2) |
| Cấu hình + validate | `@ConfigurationProperties` + `@Validated` | Options pattern + `ValidateDataAnnotations().ValidateOnStart()` | schema `zod`/`joi` khi boot |
| Ký params | `cloudinary.apiSignRequest(params, secret, sigVersion)` | `cloudinary.Api.SignParameters(params)` | `cloudinary.utils.api_sign_request(params, secret)` |
| Xác minh response | `cloudinary.verifyApiResponseSignature(...)` | `cloudinary.Api.VerifyApiResponseSignature(...)` | ký lại `{public_id, version}` rồi so sánh |
| So sánh constant-time | `MessageDigest.isEqual` | `CryptographicOperations.FixedTimeEquals` | `crypto.timingSafeEqual` |
| Update có điều kiện | `@Modifying @Query("update ... where status='PENDING'")`, hoặc `@Version` | `ExecuteUpdateAsync` với `Where(status == Pending)`, hoặc concurrency token | `UPDATE ... WHERE status='PENDING'` và kiểm tra `rowCount` / `count` |
| Hook after-commit | `TransactionSynchronization.afterCommit` hoặc `@TransactionalEventListener(AFTER_COMMIT)` | gọi sau `SaveChangesAsync`/`CommitAsync` thành công | gọi sau khi `$transaction`/`commit` resolve |
| Actor từ JWT | `jwt.getSubject()` | tắt map claim mặc định, đọc `sub` | `req.user.sub` (tùy middleware) |
| Test DB thật | Testcontainers PostgreSQL | Testcontainers / docker DB | Testcontainers / docker DB |

---

## 12. Ngoài phạm vi phiên bản đầu (có thể hoãn)

- Job dọn asset mồ côi: so `upload_intents` (`COMPLETED`, và `PENDING` quá cũ) với các cột/bảng ảnh.
- URL riêng tư có thời hạn (token-based hoặc `private_download_url`).
- Xử lý thay ảnh đồng thời trên cùng entity (hiện là last-write-wins; intent của request thua trở thành asset mồ côi).
- Hạn sử dụng của intent (`expiresAt`); hiện chỉ dựa vào chữ ký Cloudinary tự hết hạn.
- Hỗ trợ video/tài liệu (`resource_type` khác `image`).
