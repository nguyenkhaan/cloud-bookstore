# HƯỚNG DẪN PROMPT TOÀN DIỆN CHO FIGMA AGENT: BỔ SUNG & HOÀN THIỆN THIẾT KẾ PHÂN HỆ QUẢN LÝ SÁCH (COMICPOS)
## Chuẩn hóa theo Đặc tả Luồng UX/UI: `THIET_KE_LUONG_UX_UI_QUAN_LY_SACH.md`

---

### THÔNG TIN DỰ ÁN & MÔI TRƯỜNG THIẾT KẾ
- **Tên dự án:** Cloud Bookstore (ComicPOS) — Hệ thống Bán lẻ, Cho thuê & Thu mua Sách truyện cũ.
- **Figma Target File:** `https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=0-1`
- **Trang làm việc (Target Page):** `Page 1` (Node ID: `0:1`). *Lưu ý: Giữ nguyên trang `backup` (ID `32:2`) làm dự phòng.*
- **Tài liệu nghiệp vụ đối chiếu:** [`docs/THIET_KE_LUONG_UX_UI_QUAN_LY_SACH.md`](./THIET_KE_LUONG_UX_UI_QUAN_LY_SACH.md), [`docs/BAO_CAO_RA_SOAT_BO_SUNG_DESIGN_SACH.md`](./BAO_CAO_RA_SOAT_BO_SUNG_DESIGN_SACH.md).
- **Mục tiêu của Agent:**
  1. **Tạo mới 7 Màn hình / Modal / Drawer** còn thiếu để hoàn thiện luồng trải nghiệm người dùng khép kín.
  2. **Cập nhật tinh chỉnh 12 Màn hình hiện có** để đảm bảo tuân thủ nghiêm ngặt mô hình dữ liệu 4 cấp: `Bộ sách ➔ Đầu sách/Tập ➔ Ấn bản ➔ Bản sách vật lý` và các quy tắc phê duyệt ngoại lệ tại quầy POS.

---

### BỘ QUY CHUẨN DESIGN SYSTEM & TOKENS BẮT BUỘC
Khi tạo mới hoặc chỉnh sửa các Frame/Node, Agent **BẮT BUỘC** áp dụng chính xác các Design Tokens sau:

#### 1. Typography (`Inter`)
Agent phải nạp các kiểu phông chữ sau trước khi can thiệp TextNode:
```javascript
await figma.loadFontAsync({ family: "Inter", style: "Regular" });
await figma.loadFontAsync({ family: "Inter", style: "Medium" });
await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
await figma.loadFontAsync({ family: "Inter", style: "Bold" });
```
- **Page Title:** 20px / Bold / Line-height 28px / `#182337`
- **Section / Modal Header:** 16px / Semi Bold / Line-height 24px / `#182337`
- **Body Text:** 12px – 13px / Regular / Line-height 18px / `#182337`
- **Caption / Meta Text:** 10px – 11px / Regular & Medium / `#778295`
- **POS Display Number:** 24px – 28px / Bold / `#182337` hoặc `#4F46E5`

#### 2. Color Palette (Màu sắc) & Hệ màu Plugin API (dải 0.0 – 1.0)
| Tên Token | Mã Hex | Giá trị Plugin API (RGB 0-1) | Ứng dụng thực tế |
|---|---|---|---|
| `bgApp` | `#F5F7FA` | `{ r: 0.961, g: 0.969, b: 0.980 }` | Nền canvas toàn bộ màn hình |
| `surfaceWhite`| `#FFFFFF` | `{ r: 1.000, g: 1.000, b: 1.000 }` | Nền Card, Bảng, Modal, Drawer |
| `borderLight` | `#E8ECF2` | `{ r: 0.910, g: 0.925, b: 0.949 }` | Đường viền ngăn cách, viền table |
| `primary` | `#4F46E5` | `{ r: 0.310, g: 0.275, b: 0.898 }` | Nút bấm chính (CTA), điểm nhấn điều hướng |
| `primaryLight`| `#EEF2FF` | `{ r: 0.933, g: 0.949, b: 1.000 }` | Nền badge active, thẻ đang chọn |
| `textDark` | `#182337` | `{ r: 0.094, g: 0.137, b: 0.216 }` | Màu chữ chính, tiêu đề, số tiền |
| `textMuted` | `#778295` | `{ r: 0.467, g: 0.510, b: 0.584 }` | Màu chữ phụ, chú thích, nhãn mờ |
| `success` | `#16A34A` | `{ r: 0.086, g: 0.639, b: 0.290 }` | Bản sách Khả dụng, Thành công, Đủ bộ |
| `successLight`| `#DCFCE7` | `{ r: 0.863, g: 0.988, b: 0.906 }` | Nền badge Khả dụng, Đúng hạn |
| `warning` | `#D97706` | `{ r: 0.851, g: 0.467, b: 0.024 }` | Đang thuê, Khóa kiểm kê, Ân hạn trễ |
| `warningLight`| `#FEF3C7` | `{ r: 0.996, g: 0.953, b: 0.780 }` | Nền badge Đang thuê, Cảnh báo min |
| `danger` | `#DC2626` | `{ r: 0.863, g: 0.149, b: 0.149 }` | Sách mất, Hư hỏng, Quá hạn trễ |
| `dangerLight` | `#FEE2E2` | `{ r: 0.996, g: 0.886, b: 0.886 }` | Nền badge Hỏng, Mất, Phạt trễ 150% |
| `purple` | `#7C3AED` | `{ r: 0.486, g: 0.227, b: 0.929 }` | Badge Bộ truyện tranh (Series), Boxset |
| `purpleLight` | `#F3E8FF` | `{ r: 0.953, g: 0.910, b: 1.000 }` | Nền badge Bộ sách |

#### 3. Layout & Elevation Rules
- Toàn bộ các Card, Table row, Toolbar, Badge **bắt buộc dùng Auto-Layout** (`layoutMode = "HORIZONTAL" | "VERTICAL"`).
- `cornerRadius`: `6px` cho Tag/Badge; `8px` cho Button và Input; `12px` cho Card, Modal và Drawer.
- `padding`: `16px` đến `24px` cho Card/Modal; `8px` đến `12px` cho Button/Row.
- Không dùng tọa độ tuyệt đối bên trong container Auto-Layout.

---

### PHẦN I: TẠO MỚI 7 MÀN HÌNH / MODAL / DRAWER CÒN THIẾU
Agent hãy tạo các Frame này đặt tại khu vực trống bên dưới hoặc bên phải các cụm phân hệ tương ứng trên canvas `Page 1`:

```
VỊ TRÍ ĐỀ XUẤT TRÊN CANVAS (PAGE 1):
• Cụm Quầy POS:  (x: 9200, y: 1400) đến (x: 9200, y: 4600)
• Cụm Kho Sách:  (x: 9200, y: 6200) đến (x: 9200, y: 9000)
```

---

#### 1. MÀN HÌNH MỚI 1: `MOD-POS-01` · Modal "Bộ chọn nhanh theo Bộ truyện (Series Quick-Picker)"
- **Kích thước Frame:** `800 × 640 px`, Auto-Layout dọc, `cornerRadius = 12`, Nền `#FFFFFF`, Viền `#E8ECF2`.
- **Vị trí đề xuất:** `x: 9200, y: 2926` (nằm cạnh `SCR-POS-06`).
- **Mục đích:** Mở từ nút `[ + Thu mua theo Bộ truyện ]` tại quầy `SCR-POS-06` hoặc `SCR-INV-06`. Cho phép chọn hàng loạt tập trong một bộ truyện tranh và tự động bung thành N dòng độc lập (1 dòng = 1 cuốn vật lý).
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Thu mua theo Bộ truyện tranh (Series Quick-Picker)"* (16px Bold), Subtitle *"Chọn bộ truyện và đánh dấu các tập khách mang tới. Hệ thống tự động tạo từng dòng riêng biệt."* (11px Regular, màu `#778295`), Nút đóng `[ × ]`.
  2. **Thanh tìm kiếm Bộ truyện:** Ô Input tìm kiếm có icon kính lúp: `Thám tử lừng danh Conan` kèm nhãn kết quả: `📚 Bộ: Thám tử lừng danh Conan · NXB Kim Đồng · Đang phát hành (104 tập)`.
  3. **Bộ lọc nhanh theo dải tập (Pill Filters):**
     - Nút tag: `[ Tất cả ]`, `[ Tập 1 – 20 ]`, `[ Tập 21 – 40 ]`, `[ Tập 41 – 60 ]`, `[ Tập tiệm đang THIẾU (8 tập) ]` (Màu đỏ nhạt).
  4. **Ma trận chọn tập (Volume Selection Grid):**
     - Container Auto-Layout bọc nhiều dòng (`layoutWrap = "WRAP"`, gap 8px).
     - Hiển thị 20 ô đại diện cho các tập từ `T.01` đến `T.20` (kích thước `52 × 44 px`, bo góc 6px).
     - Các tập được chọn (VD: `T.01`, `T.02`, `T.05`, `T.10`): Nền tím Indigo `#4F46E5`, chữ trắng Bold, có icon dấu tích `✓`.
     - Các tập chưa chọn: Nền xám `#F5F7FA`, viền `#E8ECF2`, chữ xám `#182337`.
  5. **Khối thiết lập đồng loạt (Batch Setting Bar):**
     - Hàng ngang:
       - Phân hạng chung: Radio buttons `( ) Grade A`, `(•) Grade B`, `( ) Grade C`.
       - Giá bìa tham chiếu ấn bản: `45.000đ/tập`.
       - Giá đề xuất mua (40%): `18.000đ/tập` ➔ Ô nhập giá thỏa thuận thực tế: `[ 20.000đ ]`.
       - Giá bán dự kiến: `[ 35.000đ ]`.
  6. **Footer Action Bar:**
     - Bên trái: Text *"Đã chọn: 4 tập · Tổng tiền chi trả: 80.000đ"* (13px Bold, màu `#182337`).
     - Bên phải: Nút `[ Hủy bỏ ]` (Secondary) và Nút `[ Áp dụng & Bung 4 dòng độc lập ➔ ]` (Primary Indigo).

---

#### 2. MÀN HÌNH MỚI 2: `DRAWER-INV-01` · Drawer "Đăng ký Ấn bản mới bằng ISBN"
- **Kích thước Frame:** `480 × 1000 px`, Auto-Layout dọc, `cornerRadius = 0`, Nền `#FFFFFF`, Viền trái `#E8ECF2`.
- **Vị trí đề xuất:** `x: 9200, y: 4625` (nằm cạnh `SCR-INV-03`).
- **Mục đích:** Mở khi click `[ + Thêm Ấn bản mới bằng ISBN ]` tại `SCR-INV-02` hoặc `SCR-INV-03`. Tạo thực thể Cấp 3 (Ấn bản), truy xuất Google Books API và thiết lập min-stock 2 kênh Bán & Thuê.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Đăng ký Ấn bản mới (Book Edition)"* (16px Bold), Subtitle *"Thuộc Đầu sách: Conan · Tập 10 (Mã: TL-0010)"* (11px Medium, màu `#7C3AED`).
  2. **Bước 1: Tra cứu ISBN tự động:**
     - Label: *"Mã vạch thương mại ISBN-13 (*)"*.
     - Ô Input: `978-604-2-09359-5` kèm Nút `[ Tra cứu API ]`.
     - Banner phản hồi: `✅ Đã tìm thấy dữ liệu từ Google Books & NXB Kim Đồng` (Nền `#DCFCE7`, chữ `#16A34A`).
  3. **Bước 2: Thông tin Xuất bản Thực tế:**
     - Dropdown / Text field: Nhà xuất bản: `NXB Kim Đồng`.
     - Năm xuất bản: `2024` | Lần tái bản: `Tái bản lần thứ 15`.
     - Định dạng bìa: Dropdown chọn `Bìa mềm áo rời (Jacket)`.
     - Số trang: `184 trang` | Ngôn ngữ: `Tiếng Việt`.
  4. **Bước 3: Định giá & Ngưỡng Tồn kho 2 Kênh (`PDR-007`):**
     - Giá bìa tham chiếu (*): `45.000đ` (Căn cứ gợi ý giá thu mua cũ).
     - Đơn giá thuê mặc định/ngày: `3.000đ/ngày` (Snapshot vào phiếu khi khách thuê).
     - Ngưỡng tồn an toàn Bán (`min_stock_sale`): `[ 2 cuốn ]`.
     - Ngưỡng tồn an toàn Thuê (`min_stock_rental`): `[ 3 cuốn ]`.
  5. **Bước 4: Ảnh bìa Ấn bản:**
     - Khung xem trước ảnh bìa tỷ lệ 3:4 (`100 × 133 px`) kèm nút `[ Tải ảnh bìa mới ]`.
  6. **Footer:** Nút `[ Hủy ]` và Nút `[ XÁC NHẬN LƯU ẤN BẢN ➔ ]` (Primary).

---

#### 3. MÀN HÌNH MỚI 3: `DRAWER-INV-02` · Drawer "Thêm Bản sách vật lý thủ công & Phân bổ kênh"
- **Kích thước Frame:** `480 × 1000 px`, Auto-Layout dọc, `cornerRadius = 0`, Nền `#FFFFFF`, Viền trái `#E8ECF2`.
- **Vị trí đề xuất:** `x: 9720, y: 4625`.
- **Mục đích:** Thêm từng cuốn sách vật lý (Cấp 4) vào kho từ màn hình `SCR-INV-03`.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Thêm Bản sách vật lý (Book Copy)"* (16px Bold), Subtext *"Ấn bản: NXB Kim Đồng · Tái bản 2024 (Bìa mềm áo rời)"*.
  2. **Mã vạch CopyBarcode:** Ô Input có badge tự sinh: `BC-0082930` (Monospace, nền tím `#EEF2FF`, chữ `#4F46E5`).
  3. **Thẩm định tình trạng ngoại quan (Grade):**
     - 4 Nút chọn trạng thái: `[ Grade A (90-99%) ]` (Active), `[ Grade B ]`, `[ Grade C ]`, `[ Grade D ]`.
     - Textarea: Ghi chú ngoại quan: `Sách mới, nguyên bìa áo, không gập trang`.
  4. **Tài chính & Giá cọc:**
     - Giá vốn nhập: `[ 25.000đ ]`.
     - Giá bán niêm yết: `[ 45.000đ ]` kèm nhãn chú thích: *"Căn cứ thu cọc 100% khi khách thuê cuốn này"*.
     - Đơn giá thuê/ngày: `[ 3.000đ ]`.
  5. **Vị trí kệ & Kênh phân phối (`PDR-007`):**
     - Vị trí kệ: `[ A1-03 ]`.
     - Kênh phân phối:
       - `(•) Cả Bán lẻ & Cho thuê (BOTH) — Mặc định`
       - `( ) Chỉ Bán lẻ (SALE_ONLY)`
       - `( ) Chỉ Cho thuê (RENTAL_ONLY)`
  6. **Footer:** Nút `[ Lưu & Thêm cuốn tiếp theo ]` và Nút `[ Lưu & In tem Barcode ]` (Primary).

---

#### 4. MÀN HÌNH MỚI 4: `MOD-POS-02` · Modal "Thẩm định Hư hỏng Ngoại lệ & Phê duyệt tại chỗ"
- **Kích thước Frame:** `720 × 600 px`, Auto-Layout dọc, `cornerRadius = 12`, Nền `#FFFFFF`, Viền `#E8ECF2`.
- **Vị trí đề xuất:** `x: 9200, y: 0` (nằm cạnh quầy trả sách `SCR-POS-05`).
- **Mục đích:** Mở tại `SCR-POS-05` khi khách trả sách bị hư hỏng ngoài khung quy định (ướt nước, rách nát). Hỗ trợ Quản lý nhập mã PIN 4 số duyệt ngay tại quầy hoặc gửi duyệt từ xa sang `SCR-APP-01`.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Thẩm định Hư hỏng Ngoại lệ & Phê duyệt Phạt"* (16px Bold), Mã phiếu: `RENT-20261008-0038` · Khách: `Nguyễn Thu Hà`.
  2. **Thông tin bản sách tổn hại:**
     - Dòng thẻ: `[ BC-2102 ] Conan · Tập 10 (KĐ 2024)` | Giá niêm yết (Tiền cọc): `100.000đ`.
  3. **Biên bản hiện trạng:**
     - Loại hư hỏng: Dropdown chọn `Sách bị ngấm nước rách 15 trang giữa`.
     - Tỷ lệ bồi thường đề xuất: `[ 50% ]` ➔ Số tiền phạt: `50.000đ` (khấu trừ trực tiếp vào tiền cọc).
     - 2 Khung ảnh chụp hiện trạng: `[ Ảnh 1: Vết ướt bìa ]`, `[ Ảnh 2: Trang rách ]` kèm nút `[ + Chụp ảnh webcam / Tải ảnh ]`.
  4. **Cơ chế Phê duyệt kép (Dual-Approval Options):**
     - **Tùy chọn A (Đang chọn):** `(•) Phê duyệt tại chỗ (Quản lý đang có mặt tại quầy)`:
       - Trường nhập mã PIN 4 số của Quản lý: `[ • • • • ]`.
       - Ghi chú Quản lý: `Đồng ý mức phạt 50%, cuốn sách chuyển kho hủy`.
     - **Tùy chọn B:** `( ) Gửi duyệt từ xa tới Trung tâm Phê duyệt SCR-APP-01` (Tạm khóa quyết toán).
  5. **Footer:** Nút `[ Hủy bỏ ]` và Nút `[ XÁC NHẬN DUYỆT & HOÀN TẤT QUYẾT TOÁN ➔ ]` (Primary Green).

---

#### 5. MÀN HÌNH MỚI 5: `MOD-INV-03` · Modal "Đóng gói Combo Bán Trọn Bộ (Full Set Packaging)"
- **Kích thước Frame:** `760 × 600 px`, Auto-Layout dọc, `cornerRadius = 12`, Nền `#FFFFFF`.
- **Vị trí đề xuất:** `x: 9200, y: 7800` (nằm cạnh `SCR-INV-10`).
- **Mục đích:** Mở từ màn hình Quản lý Bộ sách `SCR-INV-10`. Gom các tập đã đủ 100% thành 1 gói combo để bán nguyên bộ tại quầy `SCR-POS-02`.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Đóng gói Gói Bán Trọn Bộ (Combo Boxset)"* (16px Bold), Bộ truyện: *Thám tử lừng danh Conan (Đã đủ 104/104 tập)*.
  2. **Danh sách tập được tự động chọn:**
     - Hệ thống tự động lọc ra 104 cuốn vật lý có Grade A hoặc B tốt nhất trên giá kệ.
     - Dòng tóm tắt: `Tổng giá bán lẻ 104 cuốn cộng dồn: 3.640.000đ`.
  3. **Thiết lập Giá bán Combo:**
     - Ô nhập: Tỷ lệ chiết khấu trọn bộ: `[ 15% ]`.
     - Giá bán Combo niêm yết: `[ 3.094.000đ ]` (Tiết kiệm cho khách: 546.000đ).
     - Mã Barcode Combo nội bộ: `COMBO-CONAN-104` (Monospace).
  4. **Lưu ý nghiệp vụ:** Text cảnh báo màu hổ phách: *"Sau khi đóng gói, 104 cuốn sách vật lý lẻ sẽ chuyển trạng thái COMBO_PACKAGED và tạm khóa khỏi kênh cho thuê lẻ."*
  5. **Footer:** Nút `[ Hủy ]` và Nút `[ XÁC NHẬN ĐÓNG GÓI & IN TEM COMBO ]` (Primary Purple).

---

#### 6. MÀN HÌNH MỚI 6: `MOD-INV-02` · Modal "Lập Phiếu Đề nghị Điều chỉnh Kho sau Kiểm kê"
- **Kích thước Frame:** `800 × 580 px`, Auto-Layout dọc, `cornerRadius = 12`, Nền `#FFFFFF`.
- **Vị trí đề xuất:** `x: 9200, y: 9200` (nằm cạnh `SCR-INV-08`).
- **Mục đích:** Mở từ màn hình Kiểm kê `SCR-INV-08`. Bắt buộc giải trình chênh lệch cho từng cuốn thất lạc hoặc thừa trước khi gửi sang `SCR-APP-01`.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Title *"Lập Đề nghị Điều chỉnh Kho sau Đối soát"* (16px Bold), Đợt kiểm kê: `AUD-20261018-003` · Kệ `A1–A3`.
  2. **Bảng phân loại sai lệch bắt buộc giải trình:**
     - Dòng 1: `BC-2208 · One Piece Tập 01` | CSDL: Có | Thực tế: THIẾU | Ô nhập: *[ Đã tìm kỹ 2 lần tại kệ A1 và bàn đọc, nghi khách cầm nhầm ]*.
     - Dòng 2: `BC-2209 · Conan Tập 11` | CSDL: Có | Thực tế: THIẾU | Ô nhập: *[ Không có chứng từ xuất, đề xuất ghi nhận thất lạc ]*.
     - Dòng 3: `BC-9998 · Doraemon Tập 05` | CSDL: Không | Thực tế: THỪA | Ô nhập: *[ Sách thu mua cũ chưa dán tem barcode, đã bổ sung mã ]*.
  3. **Tóm tắt giá trị thất thoát:** `Tổng giá trị vốn chênh lệch: -52.000đ`.
  4. **Footer:** Nút `[ Lưu bản nháp ]` và Nút `[ GỬI DUYỆT SANG SCR-APP-01 ➔ ]` (Primary).

---

#### 7. MÀN HÌNH MỚI 7: `DRAWER-INV-03` · Drawer "Tra cứu Lịch sử Vòng đời Bản sách 360°"
- **Kích thước Frame:** `480 × 1000 px`, Auto-Layout dọc, `cornerRadius = 0`, Nền `#FFFFFF`, Viền trái `#E8ECF2`.
- **Vị trí đề xuất:** `x: 9720, y: 2926`.
- **Mục đích:** Mở khi click vào bất kỳ mã `CopyBarcode` nào trên toàn hệ thống để xem lý lịch cuốn sách.
- **Cấu trúc Auto-Layout bên trong:**
  1. **Header:** Mã tem: `BC-0082918` (20px Monospace Bold), Tên sách: *Conan · Tập 10 (KĐ 2024)*, Vị trí hiện tại: `Kệ A1-03`, Trạng thái: `Khả dụng (Grade A)`.
  2. **Timeline Vòng đời (Vertical Timeline with Nodes):**
     - `Node 1 (10/10/2026 · 09:30)`: **Nhập kho mới từ NCC** — Phiếu `INB-20261010-001`. Giá vốn: 25.000đ. Người nhập: Lê Minh Khoa.
     - `Node 2 (12/10/2026 · 14:15)`: **Cho thuê** — Phiếu `RENT-20261012-0045`. Khách hàng: Trần Văn Nam. Tiền cọc: 45.000đ.
     - `Node 3 (18/10/2026 · 16:20)`: **Nhận trả sách** — Phiếu `RETURN-20261018-0021`. Tình trạng: Nguyên vẹn Grade A. Hoàn cọc đủ.
     - `Node 4 (25/10/2026 · 08:45)`: **Kiểm kê định kỳ** — Đợt `AUD-20261025-001`. Khớp vị trí kệ A1-03.
  3. **Footer:** Nút `[ In lại tem dán gáy ]` và Nút `[ Chuyển vị trí kệ ]`.

---

### PHẦN II: CẬP NHẬT & TINH CHỈNH 12 MÀN HÌNH HIỆN CÓ

Agent hãy tìm các Node ID tương ứng trên canvas `Page 1` và thực hiện các điều chỉnh chính xác như sau:

---

#### 1. Màn hình `SCR-INV-01` · Thể loại sách & Cây danh mục (Node ID: `8:36257`)
- **Vấn đề:** Cây thư mục hiện tại chỉ hiển thị 2 cấp phẳng.
- **Yêu cầu chỉnh sửa:**
  - Cập nhật cây thư mục thành **3 cấp thụt lề rõ ràng**:
    - Cấp 1 (Gốc): `Truyện tranh (1.284 đầu sách)`
      - Cấp 2 (Nhánh): `Manga Nhật Bản (936 đầu sách)`
        - Cấp 3 (Lá): `Shounen (420 đầu sách)`
        - Cấp 3 (Lá): `Trinh thám & Bí ẩn (286 đầu sách)`
        - Cấp 3 (Lá): `Phiêu lưu & Kỳ ảo (230 đầu sách)`
  - Thêm icon `folder-plus` nhỏ tại mỗi node khi hover để tạo nhanh thể loại con.
  - Bổ sung banner cảnh báo chặn xóa: *"Không thể xóa: Danh mục đang chứa 286 đầu sách. Vui lòng chuyển sách sang danh mục khác trước khi ngừng sử dụng."*

---

#### 2. Màn hình `SCR-INV-02` · Danh mục Đầu sách (Node ID: `8:36455`)
- **Vấn đề:** Cột bảng gộp chung ISBN vào Đầu sách.
- **Yêu cầu chỉnh sửa:**
  - Tách cột bảng:
    - Cột 1: `Đầu sách / Bộ truyện`: Hiển thị tên sách (VD: *Doraemon · Tập 01*) kèm badge tím `Bộ: Doraemon · 45 tập`.
    - Cột 2: `Số Ấn bản & Tồn kho`: Hiển thị `2 ấn bản · 14 cuốn vật lý (8 khả dụng / 5 đang thuê / 1 hỏng)`.
    - Cột 3: `Khoảng giá bìa`: `40.000đ – 120.000đ`.
  - Thay thế ô tìm kiếm thông thường bằng **Thanh tìm kiếm đa năng 4 cấp (4-Tier Omni-Search)**: Hỗ trợ tìm theo Bộ, Tác phẩm, ISBN hoặc CopyBarcode.
  - Cập nhật khung bên phải: Đổi tên thành **"Tiếp nhận sách bằng ISBN"** kèm 3 nút phân giải luồng.

---

#### 3. Màn hình `SCR-INV-03` · Chi tiết Đầu sách, Ấn bản & Bản vật lý (Node ID: `8:36745`)
- **Vấn đề:** Cần kết nối hoàn chỉnh với các Drawer mới.
- **Yêu cầu chỉnh sửa:**
  - Đảm bảo cấu trúc 3 tầng: Tầng 1 (Đầu sách) ➔ Tầng 2 (Thẻ Ấn bản ngang) ➔ Tầng 3 (Bảng Bản vật lý).
  - Thêm nút `[ + Đăng ký Ấn bản mới ]` liên kết với `DRAWER-INV-01`.
  - Thêm nút `[ + Thêm bản vật lý thủ công ]` liên kết với `DRAWER-INV-02`.
  - Tại bảng Bản vật lý: Bổ sung cột `Kênh phân phối` có Dropdown chọn nhanh `BOTH`, `SALE_ONLY`, `RENTAL_ONLY`.
  - Biến mã `CopyBarcode` (VD: `BC-0082918`) thành link click mở `DRAWER-INV-03`.

---

#### 4. Màn hình `SCR-INV-06` · Lập Phiếu nhập kho từ NCC (Node ID: `30:24578`)
- **Vấn đề:** Thiếu chi tiết Ấn bản và thiếu nhập theo bộ.
- **Yêu cầu chỉnh sửa:**
  - Bổ sung thông tin Ấn bản trên từng dòng nhập: `ISBN-13`, `Năm tái bản`, `Khổ sách/Định dạng bìa`.
  - Thêm nút tiện ích phía trên bảng: `[ + Nhập theo Trọn bộ (Boxset / Series) ]` cho phép chọn dải tập từ 1 đến N.
  - Thêm Banner chuyển tiếp sau khi duyệt: `✅ Phiếu nhập đã duyệt thành công. Đã sinh 45 mã CopyBarcode. [ Chuyển sang In nhãn Barcode ngay ➔ ]`.

---

#### 5. Màn hình `SCR-INV-08` · Kiểm kê kho định kỳ (Node ID: `30:24813`)
- **Vấn đề:** Chưa phân loại 4 loại sai lệch và thiếu nút gửi duyệt.
- **Yêu cầu chỉnh sửa:**
  - Bổ sung 4 badge màu sắc phân loại sai lệch:
    - 🔴 `Thiếu sách (MISSING)`
    - 🟡 `Thừa sách (EXTRA)`
    - 🔵 `Sai kệ (WRONG_SHELF)`
    - 🟠 `Sai tình trạng (CONDITION_MISMATCH)`
  - Thêm nút hành động chính bên dưới bảng: `[ Lập Phiếu Đề nghị Điều chỉnh Kho ➔ ]` để mở `MOD-INV-02`.

---

#### 6. Màn hình `SCR-INV-09` · Giám sát Cảnh báo tồn kho chạm min (Node ID: `30:24914`)
- **Vấn đề:** Thiết lập min-stock ở cấp Đầu sách và không phân tách kênh.
- **Yêu cầu chỉnh sửa:**
  - Tách giao diện thành **2 Tab cảnh báo**:
    - **Tab 1: Cảnh báo Kênh Bán lẻ:** Lọc các ấn bản có số lượng bán $\le min\_stock\_sale$. Có nút `[ + Lập Phiếu Nhập NCC ]`.
    - **Tab 2: Cảnh báo Kênh Cho thuê:** Lọc các tập truyện tranh có số lượng thuê $\le min\_stock\_rental$. Có nút `[ + Thu mua sách cũ theo Bộ ]`.

---

#### 7. Màn hình `SCR-INV-10` · Quản lý Bộ sách & Tiến độ đủ bộ (Node ID: `188:555` hoặc Screen đã tạo)
- **Vấn đề:** Cần bổ sung các nút kích hoạt nghiệp vụ thương mại.
- **Yêu cầu chỉnh sửa:**
  - Bổ sung nút nổi bật: `[ ✓ Đóng gói Combo Bán Full Set ]` để mở `MOD-INV-03`.
  - Bổ sung nút: `[ ⚠ Xuất danh sách 8 tập khuyết để thu mua ]` để liên kết dữ liệu sang quầy `SCR-POS-06`.

---

#### 8. Màn hình `SCR-POS-02` · Bán sách cũ tại quầy (Node ID: `30:24432`)
- **Yêu cầu chỉnh sửa:**
  - Thêm tab chọn nhanh: `Khách vãng lai` (không bắt buộc nhập SĐT, giữ nguyên giá niêm yết).
  - Bổ sung cảnh báo khi quét nhầm bản sách `RENTAL_ONLY`: Banner đỏ: *"Lỗi: Cuốn sách BC-2105 thuộc danh mục CHỈ CHO THUÊ, không được xuất bán lẻ!"*.

---

#### 9. Màn hình `SCR-POS-03` · Lập phiếu cho thuê sách (Node ID: `8:35041`)
- **Yêu cầu chỉnh sửa:**
  - Bắt buộc định danh khách hàng: Nhập SĐT khách để tự động load hạng.
  - Bổ sung Widget kiểm tra hạn mức hạng:
    - `Đang giữ: 1 cuốn | Đang chọn: 3 cuốn | Hạn mức hạng Bạc: 5 cuốn (Hợp lệ ✅)`
    - `Thời hạn thuê: Tối đa 24 ngày`.
  - Làm rõ cột tài chính: Cột **"Tiền cọc ký quỹ (100% Giá bán - Thu ngay)"** và cột **"Phí thuê dự kiến (Thu khi trả sách)"**.
  - Khóa tạo phiếu nếu khách có nợ phạt quá hạn.

---

#### 10. Màn hình `SCR-POS-04` · Tra cứu & Gia hạn phiếu thuê (Node ID: `8:35291`)
- **Yêu cầu chỉnh sửa:**
  - Bổ sung Widget **Ân hạn trễ 2 giờ (Grace Period)**:
    - Nếu trễ $\le 2$ giờ: Badge xanh `✅ Trong 2 giờ ân hạn (Miễn phạt trễ)`.
    - Nếu trễ $> 2$ giờ: Banner vàng: `⚠️ Trễ 10h43m ➔ Phạt trễ 150% đơn giá thuê x 1 ngày = 7.500đ`.
  - Ghi chú to rõ: *"PHÍ GIA HẠN ĐƯỢC CỘNG DỒN VÀO PHIẾU THUÊ - KHÔNG THU TIỀN NGAY TẠI QUẦY"*.
  - Cảnh báo chạm trần cọc nếu tổng phí $\ge$ tiền cọc đang giữ.

---

#### 11. Màn hình `SCR-POS-05` · Nhận trả sách & Quyết toán cọc (Node ID: `8:35508`)
- **Yêu cầu chỉnh sửa:**
  - Chuẩn hóa quy tắc **Mất sách**: Khi chọn lý do *"Mất sách"*, hệ thống:
    - Giữ 100% tiền cọc của cuốn đó chuyển sang Doanh thu bán.
    - **Miễn hoàn toàn phí thuê và phạt trễ** cho cuốn sách bị mất.
  - Bổ sung nút: `[ Gửi duyệt phạt hư hỏng ngoại lệ ]` để mở `MOD-POS-02`.

---

#### 12. Màn hình `SCR-POS-06` · Thu mua sách cũ từ khách hàng (Node ID: `8:35761`)
- **Yêu cầu cực kỳ quan trọng:**
  - Bổ sung nút nổi bật: `[ + Thu mua theo Bộ truyện (Series Quick-Picker) ]` để mở `MOD-POS-01`.
  - **Xóa bỏ triệt để việc gom nhiều tập vào 1 dòng**: Tách thành 4 dòng độc lập khi mua 4 tập Conan, mỗi dòng có trường Grade và định giá riêng.
  - Bổ sung Banner cảnh báo khi giá mua thỏa thuận $> 200.000$đ/cuốn: *"Cần Quản lý duyệt giá (Nhập PIN hoặc gửi sang SCR-APP-01)"*.

---

#### 13. Màn hình `SCR-APP-01` · Trung tâm Phê duyệt ngoại lệ (Node ID: `30:25960`)
- **Yêu cầu chỉnh sửa:**
  - Tái cấu trúc thành **4 Tab nghiệp vụ phê duyệt chuyên biệt**:
    1. Tab 1: `Duyệt Giá Thu mua Sách cũ Vượt Hạn mức` (Có ảnh sách, giá thỏa thuận, nút Duyệt / Từ chối).
    2. Tab 2: `Duyệt Phạt Hư hỏng Trả sách Ngoài Khung` (Có ảnh vết rách/ẩm ướt, tiền cọc đang giữ).
    3. Tab 3: `Duyệt Điều chỉnh Kho sau Kiểm kê` (Có bảng đối soát giải trình của thủ kho).
    4. Tab 4: `Duyệt Xuất hủy Sách hỏng / Đảo Hóa đơn Bán trong 24h`.

---

### PHẦN III: HƯỚNG DẪN THỰC THI BẰNG FIGMA PLUGIN API (SAMPLE CODE TEMPLATE)

Agent có thể chạy đoạn mã JavaScript sau để tự động khởi tạo khung của 7 Modal/Drawer mới:

```javascript
// =============================================================================
// FIGMA PLUGIN SCRIPT: TỰ ĐỘNG KHỞI TẠO 7 MODAL / DRAWER CÒN THIẾU
// =============================================================================
(async () => {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const page = figma.currentPage;

  const colors = {
    bg: { r: 0.961, g: 0.969, b: 0.980 },
    white: { r: 1, g: 1, b: 1 },
    border: { r: 0.910, g: 0.925, b: 0.949 },
    primary: { r: 0.310, g: 0.275, b: 0.898 },
    primaryLight: { r: 0.933, g: 0.949, b: 1.000 },
    textDark: { r: 0.094, g: 0.137, b: 0.216 },
    textMuted: { r: 0.467, g: 0.510, b: 0.584 },
    purple: { r: 0.486, g: 0.227, b: 0.929 },
    purpleLight: { r: 0.953, g: 0.910, b: 1.000 },
    success: { r: 0.086, g: 0.639, b: 0.290 },
    successLight: { r: 0.863, g: 0.988, b: 0.906 }
  };

  function createText(str, size = 12, weight = "Regular", color = colors.textDark) {
    const t = figma.createText();
    t.fontName = { family: "Inter", style: weight };
    t.fontSize = size;
    t.characters = str;
    t.fills = [{ type: "SOLID", color }];
    return t;
  }

  // Khởi tạo MOD-POS-01: Series Quick-Picker
  const modPicker = figma.createFrame();
  modPicker.name = "MOD-POS-01 · Series Quick-Picker (Bộ chọn nhanh tập truyện)";
  modPicker.resize(800, 640);
  modPicker.cornerRadius = 12;
  modPicker.fills = [{ type: "SOLID", color: colors.white }];
  modPicker.strokes = [{ type: "SOLID", color: colors.border }];
  modPicker.strokeWeight = 1;
  modPicker.layoutMode = "VERTICAL";
  modPicker.paddingLeft = 24;
  modPicker.paddingRight = 24;
  modPicker.paddingTop = 20;
  modPicker.paddingBottom = 20;
  modPicker.itemSpacing = 16;
  modPicker.x = 9200;
  modPicker.y = 2926;

  modPicker.appendChild(createText("Thu mua theo Bộ truyện tranh (Series Quick-Picker)", 18, "Bold", colors.textDark));
  modPicker.appendChild(createText("Chọn bộ truyện và đánh dấu các tập khách mang tới. Hệ thống tự động tạo từng dòng riêng biệt.", 12, "Regular", colors.textMuted));

  figma.viewport.scrollAndZoomIntoView([modPicker]);

  return { success: true, message: "Đã khởi tạo thành công MOD-POS-01 trên canvas!" };
})();
```

---

### TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] 7 Màn hình / Modal / Drawer mới đã xuất hiện đầy đủ trên canvas `Page 1` tại tọa độ quy định.
- [ ] Màn hình `SCR-POS-06` có nút mở `MOD-POS-01` và hiển thị tách rời từng tập truyện khi thu mua.
- [ ] Màn hình `SCR-INV-03` có đầy đủ 3 tầng, có Dropdown chọn kênh phân phối `BOTH / SALE / RENTAL` và liên kết tới 3 Drawer mới.
- [ ] Màn hình `SCR-POS-05` thể hiện rõ quy tắc Mất sách giữ 100% cọc thành Doanh thu bán, miễn phí thuê/phạt trễ và có nút mở `MOD-POS-02`.
- [ ] Màn hình `SCR-INV-09` đã tách thành 2 tab Bán lẻ và Cho thuê riêng biệt.
- [ ] Màn hình `SCR-APP-01` được tổ chức thành 4 tab nghiệp vụ duyệt sách.
- [ ] Tất cả các phông chữ, màu sắc, bo góc đều khớp 100% với Design Tokens của ComicPOS.
