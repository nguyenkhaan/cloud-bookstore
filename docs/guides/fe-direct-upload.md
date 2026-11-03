# HƯỚNG DẪN UPLOAD ẢNH TỪ FRONTEND LÊN CLOUDINARY (DIRECT UPLOAD)

**Build with Cloudian 💙 Cloud**

Ý chính cần nhớ: **file ảnh đi thẳng từ trình duyệt lên Cloudinary, không đi qua Backend.** Backend chỉ làm hai việc: cấp chữ ký cho phép upload, và kiểm tra kết quả upload trước khi lưu vào database.

Bên trong các bảng như `BookSeries`, `Title`... sẽ lưu trực tiếp PublicImageId, chính là id của ảnh đó trên Cloudinary. Khi trả repsonse về cho Frontend, chúng ta có thể sử dụng PublicImageId này để sinh lại Url --> giúp hiển thị lại hình ảnh trên FE. 

## 1. Cài đặt

### 1.1. Cloudinary

1. Tạo tài khoản tại [cloudinary.com](https://cloudinary.com).
2. Vào **Settings → API Keys** và ghi lại 3 giá trị: **Cloud name**, **API Key**, **API Secret**.
3. Vào **Settings → Upload → Upload presets** và tạo 2 preset:

| Thiết lập                              | `book_images_signed`       | `evidence_images_signed`          |
| ---------------------------------------- | ---------------------------- | ----------------------------------- |
| Signing mode                             | **Signed**             | **Signed**                    |
| Delivery type (Không có thì thôi)    | `upload` (ảnh công khai) | `authenticated` (ảnh riêng tư) |
| Allowed formats (Không có thì thôi) | `jpg, png, webp`           | `jpg, png, webp`                  |
| Max file size (Không có thì thôi)   | `10485760` (10 MB)         | `10485760` (10 MB)                |
| Asset folder (Không có thì thôi)    | để trống                  | để trống                         |

Lưu ý:

- **Upload preset** là bộ cấu hình upload lưu sẵn trên Cloudinary, gồm định dạng cho phép, dung lượng tối đa và kiểu hiển thị. Đây là nơi chặn file sai định dạng hoặc quá lớn, vì Backend không nhận file nên không tự kiểm tra được.
- Preset **bắt buộc là Signed**. Nếu để Unsigned, ai biết tên preset cũng upload được vào tài khoản của bạn.
- Để trống **Asset folder**: Backend tự quyết định thư mục cho từng loại ảnh.
- Hiện tại chỉ `book_images_signed` được dùng. `evidence_images_signed` để dành cho ảnh bằng chứng (hư hại, phiếu nhập) sau này.

### 1.2. Backend

Sao chép `app/backend/appsettings.example.json` thành `app/backend/appsettings.json`, nếu chưa có. File này đã nằm trong `.gitignore`, **không commit**. Sau đó điền mục `Cloudinary`:

```json
"Cloudinary": {
  "CloudName": "<cloud name>",
  "ApiKey": "<api key>",
  "ApiSecret": "<api secret>",
  "RootFolder": "cloud-bookstore",
  "PublicUploadPreset": "book_images_signed",
  "AuthenticatedUploadPreset": "evidence_images_signed"
}
```

- Tên preset phải **trùng chính xác** với tên đã tạo trên Cloudinary. Ví dụ `book_images_signed` khác `book-images-signed`.
- `ApiSecret` chỉ nằm ở Backend. Frontend không bao giờ biết giá trị này.
- `FolderMode` mặc định là `DYNAMIC`, đúng với tài khoản Cloudinary mới. Chỉ thêm `"FolderMode": "FIXED"` nếu tài khoản của bạn là loại cũ dùng fixed folder. Vì vậy, không cần tạo sẵn folder cloud-bookstore trên Cloudinary. Khi BE gửi đường link đến Cloudinary để xin cấp PublicId, Cloudinary sẽ tự động đọc đường link do BE tự cấu hình *(/cloud-bookstore/public/....)* để tạo ra cây thư mục tương ứng *(folder cloud-bookstore -> folder public -> ...)*. Đây gọi là cơ chế `DYNAMIC FOLDER`trên Cloudinary bản mới. 
- `AuthCookies.AllowedOrigins` phải có địa chỉ Frontend, mặc định `http://localhost:5173`.

Chạy Backend (cổng `4000`):

```bash
cd app/backend
dotnet restore
dotnet run
```

### 1.3. Frontend

File `app/frontend/.env`:

```env
VITE_BASE_URL=http://localhost:4000
```

Frontend không cần thêm biến môi trường nào cho Cloudinary. Mọi thông tin cần để upload đều do Backend trả về.

```bash
cd app/frontend
bun install
bun dev                   # http://localhost:5173
```

---

## 2. Luồng upload

### 2.1. Khái niệm

**Tóm tắt nhanh:** 

- FE xin quyền upload ảnh từ BE, BE tiến hành tạo một signature + publicId bằng cách gọi lên API của ` Cloudinary` trước. Đồng thời, BE cũng tạo sẵn trước một record  `UploadIntent`với trạng thái là`UNCOMPLETE`.
- Cloudinary cung cấp signature và xác nhận publicId cho BE. BE sẽ gửi 2 thông tin này về cho FE.
- FE sử dụng hai thông tin này để upload hình ảnh lên Cloudinary.
- FE nhận response từ Cloudinary, response này có chứa publicId của hình ảnh vưa upload.
- FE gửi thông tin response này về cho BE, BE sẽ xác nhận `publicId` trong response với `publicId` lưu trong `UploadIntent` record trước đó. Nếu khớp nhau thì hình ảnh được đưa vào sử dụng, ngược lại thì không.

```text
 Trình duyệt (FE)                  Backend                     Cloudinary
       │                              │                             │
 ① chọn ảnh                           │                             │
       │── POST /api/uploads/signature ──▶                          │
       │                         ② tạo "intent" + ký               │
       │◀── chữ ký, publicId, uploadUrl ──│                          │
       │                              │                             │
       │── ③ POST file + chữ ký ──────────────────────────────────▶ │
       │◀── public_id, version, signature ──────────────────────── │
       │                              │                             │
       │── ④ POST /api/... kèm imageUpload ─▶                       │
       │                         ⑤ kiểm tra, lưu DB                │
       │◀── dữ liệu có imageUrl ──────│                             │
```

| Bước | Thực hiện      | Chi tiết công việc thực hiện                                                                                                                                                                                                             |
| ------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ①     | FE               | Người dùng chọn ảnh. FE kiểm tra sơ bộ (JPEG/PNG/WebP                                                                                                                                                                                 |
| ②     | BE               | Tạo một **upload intent** record bên trong database, tức "vé upload" dùng một lần, gắn với người dùng hiện tại. BE tự đặt `publicId` (tên ảnh trên Cloudinary) rồi ký các tham số upload bằng API Secret. |
| ③     | FE → Cloudinary | FE gửi file cùng **đúng và đủ** các tham số BE đã ký lên `uploadUrl`. Cloudinary kiểm tra chữ ký và preset, lưu ảnh, rồi trả về kết quả có chữ ký của chính Cloudinary.                                  |
| ④     | FE → BE         | FE gửi kết quả đó (gọi là `imageUpload`) kèm dữ liệu tạo/sửa đối tượng.                                                                                                                                                     |
| ⑤     | BE               | Kiểm tra intent (đúng người, chưa dùng, đúng `publicId`) và chữ ký của Cloudinary, rồi lưu `publicId` vào đối tượng. Response trả về `imageUrl` để hiển thị.                                                  |

Lý do lựa chọn kiến trúc: 

- **Nhanh và nhẹ cho Backend:** Không cần truyền file đến server (nặng) nên tối ưu được đường truyền.
- **An toàn:** FE không tự chọn được tên ảnh, thư mục hay preset, vì đổi bất kỳ tham số nào thì chữ ký sai. FE cũng không thể gắn một ảnh tuỳ ý vào đối tượng, vì BE chỉ chấp nhận ảnh có intent hợp lệ và chữ ký thật của Cloudinary.
- **Mỗi intent chỉ dùng được một lần.** Upload ảnh mới thì phải xin chữ ký mới. Sau khi FE upload, mỗi khi tạo form, sẽ tiến hành gửi kèm publicId do Cloudinary trả về cho BE để tiến hành xác nhận lại intent record. Nếu như khớp thì quá trình upload thành công và ảnh sẽ được ghi nhận, ngược lại, quá trình upload xem như thất bại, ảnh sẽ không được sử dụng.

### 2.2. Ví dụ: luồng "Tạo sản phẩm"

Trên trang sản phẩm thật, người dùng chỉ cần chọn ảnh, việc upload diễn ra tự động:

1. Người dùng chọn ảnh sản phẩm. FE **ngay lập tức** xin chữ ký từ BE và upload lên Cloudinary, đồng thời hiện trạng thái "Đang tải ảnh…".
2. Upload xong, FE giữ lại `imageUpload` trong state của form.
3. Người dùng điền tên, giá… rồi bấm **Tạo**. FE gửi dữ liệu form kèm `imageUpload` cho BE.
4. BE tạo sản phẩm và gắn ảnh trong cùng một lần lưu, rồi trả về sản phẩm có `imageUrl`.

### 2.3. Đổi ảnh và xoá ảnh

- **Đổi ảnh:** upload ảnh mới theo các bước ①–③ (intent mới, `publicId` mới), sau đó gửi `imageUpload` vào `PUT /api/<đối-tượng>/{id}/image`. BE lưu ảnh mới rồi tự xoá ảnh cũ trên Cloudinary.
- **Xoá ảnh:** `DELETE /api/<đối-tượng>/{id}/image`.

### 2.4. Một số lưu ý cho Frontend 

- **Hiển thị ảnh bằng `imageUrl` do BE trả về.** Không tự ghép URL Cloudinary.
- **Khoá nút gửi** khi đang gửi, để một intent không bị dùng hai lần.
- BE trả **400** (form sai): intent vẫn còn hiệu lực. Người dùng sửa form rồi gửi lại với **cùng** `imageUpload`.
- BE trả **409** (intent đã dùng): không gửi lại intent đó. Upload lại để lấy intent mới.
- Ảnh đã lên Cloudinary nhưng người dùng không bấm Tạo: ảnh sẽ nằm thừa trên Cloudinary. Hiện tại chấp nhận điều này; sau này sẽ có job dọn dẹp.

### 2.5. Lỗi thường gặp

| Lỗi                              | Nguyên nhân                                                      | Cách sửa                                         |
| --------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| `Upload preset not found` (400) | Tên preset trong `appsettings.json` không có trên Cloudinary | Tạo preset hoặc sửa tên cho trùng chính xác |

---

## 3. Test bằng trang `/book-series`

Trang này dùng để **test và demo** luồng upload. Code nằm ở `app/frontend/src/features/bookseries/`.

### 3.1. Khác biệt với trang thật

Ở trang thật, ảnh được upload tự động ngay khi chọn file (mục 2.2). Ở trang `/book-series`, việc upload được **tách thành một nút riêng "Upload lên Cloudinary"**. Nhờ vậy bạn thấy rõ từng bước và kiểm tra kết quả upload trước khi tạo đối tượng.

### 3.2. Quyền truy cập

Để test trọn luồng **tạo BookSeries kèm ảnh**, hãy đăng nhập bằng tài khoản **ADMIN** hoặc **INVENTORY_MANAGER**.

### 3.3. Các bước test

1. Chạy Backend và Frontend (mục 1), rồi đăng nhập tại `http://localhost:5173/login`.
2. Mở `http://localhost:5173/book-series`. Nên mở trong **cùng tab** vừa đăng nhập; nếu bị đưa về trang đăng nhập thì đăng nhập lại, trang sẽ tự quay về `/book-series`.
3. Nhập **Tên** (bắt buộc), **Mô tả**, chọn **Đang hoạt động**.
4. Chọn ảnh. Trang hiện ảnh xem trước.
5. Bấm **Upload lên Cloudinary** (bước ②③). Thành công thì trang hiện `uploadIntentId`, `publicId`, `version`, `format / bytes`.
6. Bấm **Tạo BookSeries** (bước ④⑤). Bảng bên dưới tự tải lại và hiện ảnh từ `imageUrl`.
7. Kiểm tra trên Cloudinary: **Media Library → `cloud-bookstore/public/book-series`** phải có ảnh với tên trùng phần cuối của `publicId`.

Nếu chọn ảnh mà không bấm Upload, BookSeries vẫn được tạo nhưng **không có ảnh**. Trang có hiện cảnh báo cho trường hợp này.

### 3.4. Test thêm trong bảng

Mỗi dòng có các nút:

- **Thêm ảnh / Đổi ảnh**: chọn file là tự upload và gắn luôn (giống trang thật). Kiểm tra trên Cloudinary: ảnh mới xuất hiện, ảnh cũ bị xoá.
- **Xoá ảnh**: ảnh biến khỏi bảng và bị xoá trên Cloudinary.
- **Ngưng / Kích hoạt**: đổi trạng thái.
- **Xoá**: bấm thêm **Xác nhận xoá**. BookSeries bị xoá cùng ảnh của nó. Không xoá được nếu BookSeries đang có Title.
