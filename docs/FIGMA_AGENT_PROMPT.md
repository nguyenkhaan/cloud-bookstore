# PROMPT CHO FIGMA AGENT: CHUẨN HÓA THIẾT KẾ THEO MÔ HÌNH DỮ LIỆU SÁCH 4 CẤP
## (Bộ sách ➔ Đầu sách / Tập ➔ Ấn bản ➔ Bản sách vật lý)

---

### THÔNG TIN DỰ ÁN & MỤC TIÊU (CONTEXT & MISSION)
- **Tên dự án:** Cloud Bookstore (ComicPOS) — Hệ thống quản lý tiệm sách tích hợp: Bán lẻ, Thuê truyện, Thu mua sách cũ và Quản lý kho.
- **Figma File URL:** `https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=0-1`
- **Target Page:** `Page 1` (Lưu ý: Đã có trang `backup` dự phòng an toàn).
- **Mục tiêu tối thượng:** Chuyển đổi toàn bộ các màn hình liên quan đến sách từ mô hình 2 cấp phẳng hiện tại (Đầu sách gộp chung ISBN ➔ Bản vật lý) sang mô hình chuẩn nghiệp vụ thư viện & xuất bản **4 CẤP PHÂN TÁCH RẠCH RÒI**:
  1. **Cấp 1 - Bộ sách (Book Series):** Nhóm các đầu sách/tập trong cùng series (VD: *Thám tử lừng danh Conan*, *Doraemon*, *Harry Potter*). Quản lý tiến độ đủ bộ (Completeness rate).
  2. **Cấp 2 - Đầu sách / Tập (Book Title / Work):** Tác phẩm nội dung trừu tượng (VD: *Conan – Tập 10*, *Dế Mèn phiêu lưu ký*). **KHÔNG chứa ISBN tại cấp này.**
  3. **Cấp 3 - Ấn bản (Book Edition):** Lần xuất bản cụ thể ra thị trường (Lưu: ISBN-13, Nhà xuất bản, Năm phát hành, Lần in/tái bản, Định dạng bìa, Giá bìa tham chiếu, Đơn giá thuê mặc định, Ngưỡng min tồn kho cho Bán & Thuê). **1 Đầu sách có thể có N Ấn bản.**
  4. **Cấp 4 - Bản sách vật lý (Book Copy / Item):** Từng cuốn sách cụ thể đang nằm trên kệ tiệm. Định danh bằng **CopyBarcode nội bộ duy nhất** dán gáy. Lưu: Tình trạng thực tế (Grade A/B/C/D), Giá vốn, Giá bán niêm yết (Căn cứ thu cọc khi thuê), Vị trí kệ, Trạng thái (Khả dụng, Đang thuê, Khóa kiểm kê, Hỏng, Mất).

---

### HỆ THỐNG THIẾT KẾ NỀN TẢNG (DESIGN SYSTEM FOUNDATIONS)
Khi tạo mới hoặc cập nhật các node trong Figma, Agent **BẮT BUỘC** tuân thủ đúng Design Tokens hiện có của file:
* **Typography:** Font family `Inter` (cần tải các style: `Regular`, `Medium`, `Semi Bold`, `Bold`).
  - Page Title: 20px / Bold / `#182337`
  - Section Title: 14px – 16px / Bold / `#182337`
  - Body Text: 12px / Regular / `#182337`
  - Caption / Subtitle: 10px – 11px / Regular / `#778295`
* **Color Palette (Màu sắc):**
  - Background Canvas / Page: `#F5F7FA` (`rgb(0.96, 0.97, 0.98)`)
  - Surface White: `#FFFFFF` (`rgb(1, 1, 1)`)
  - Border: `#E8ECF2` (`rgb(0.91, 0.93, 0.95)`)
  - Primary Brand (Indigo): `#4F46E5` (`rgb(0.31, 0.27, 0.90)`) | Primary Light: `#EEF2FF`
  - Text Primary: `#182337` (`rgb(0.09, 0.14, 0.22)`)
  - Text Muted: `#778295` (`rgb(0.47, 0.51, 0.58)`)
  - Success (Green): `#16A34A` | Success Light: `#DCFCE7`
  - Warning (Amber): `#D97706` | Warning Light: `#FEF3C7`
  - Danger (Red): `#DC2626` | Danger Light: `#FEE2E2`
  - Series Theme (Purple): `#7C3AED` | Purple Light: `#F3E8FF`
* **Layout Sizing & Auto-Layout Rules:**
  - Luôn sử dụng `figma.createAutoLayout()` hoặc thiết lập `layoutMode = 'HORIZONTAL' | 'VERTICAL'` cho các container chứa con.
  - Sử dụng `cornerRadius = 6` đến `12` cho card và nút.
  - Đảm bảo `padding` đồng đều (16px, 20px, 24px) và `itemSpacing` theo hệ 4-8px (8px, 12px, 16px, 20px).

---

### NHIỆM VỤ 1: TÁI CẤU TRÚC MÀN HÌNH `SCR-INV-03` (CHI TIẾT ĐẦU SÁCH)
- **Node ID mục tiêu:** `8:36745` (Tên hiện tại: *SCR-INV-03 · Chi tiết Đầu sách & Bản sách vật lý*)
- **Vấn đề cần sửa:** Hiện tại màn hình này bỏ qua tầng "Ấn bản", gộp ISBN, NXB, năm XB, giá bìa vào thẳng Đầu sách rồi nối trực tiếp xuống bảng Bản vật lý.
- **Yêu cầu thiết kế lại (Master-Detail 3 Tầng Lồng Nhau):**

#### 1. Tầng 1: Khối Đầu Sách / Tác Phẩm (Title Level Card)
- **Breadcrumb:** `Kho sách / Bộ: Thám tử lừng danh Conan / Đầu sách: Conan · Tập 10`
- **Tiêu đề chính:** *Conan · Tập 10*
- **Hệ thống Badges:**
  - `Tập 10 / 104` (Primary light badge)
  - `Đang kinh doanh` (Success light badge)
  - `Thuộc Bộ: Thám tử lừng danh Conan ↗` (Purple light badge, có icon mũi tên liên kết sang màn hình bộ)
- **Thông tin metadata:**
  - Tác giả: *Gosho Aoyama* | Thể loại: *Manga · Trinh thám* | Năm công bố gốc: *1996*
  - Mô tả tác phẩm: Đoạn tóm tắt nội dung tập 10.
- **Hành động:** Nút `Sửa tác phẩm` (Secondary), Nút `+ Thêm Ấn bản mới bằng ISBN` (Primary).
- **LƯU Ý:** Tuyệt đối KHÔNG hiển thị ISBN, NXB, Năm tái bản hoặc Giá bìa tại Khối Tầng 1 này.

#### 2. Tầng 2: Khối Quản Lý Ấn Bản (Edition Level - Horizontal Cards Selector)
- **Tiêu đề section:** *Các Ấn bản xuất bản (2 ấn bản đã đăng ký trong kho)*
- **Thiết kế dạng hàng thẻ nằm ngang (Horizontal Cards):**
  - **Thẻ 1 (Active / Đang chọn - Viền Indigo 2px, nền trắng):**
    - Tag: `[ẤN BẢN ĐANG CHỌN]` (Indigo badge) + `Tồn: 8 bản vật lý` (Green bold text).
    - Tên ấn bản: **NXB Kim Đồng · Tái bản 2024 (Bìa mềm áo rời)**
    - Chi tiết thông số:
      - ISBN-13: `978-604-2-09359-5` (Font monospace / semi-bold)
      - Giá bìa tham chiếu: `45.000đ` | Phí thuê mặc định: `3.000đ/ngày`
      - Tồn an toàn: `Min 2 bán / Min 3 thuê` | Số trang: `184` | Ngôn ngữ: `Tiếng Việt`
  - **Thẻ 2 (Inactive - Viền xám mỏng, nền trắng):**
    - Tag: `[BẢN ĐẶC BIỆT]` (Purple light badge) + `Tồn: 2 bản vật lý`.
    - Tên ấn bản: **NXB Kim Đồng · Kỷ niệm 20 năm (Bìa cứng Jacket kèm Artbook mini)**
    - Chi tiết thông số:
      - ISBN-13: `978-604-2-19882-1`
      - Giá bìa tham chiếu: `120.000đ` | Kênh: `Chỉ bán (Không cho thuê)`
      - Tồn an toàn: `Min 1 bán / Min 0 thuê`
  - **Nút thêm ấn bản:** Card nét đứt `[ + Đăng ký Ấn bản mới ]`.

#### 3. Tầng 3: Bảng Quản Lý Bản Sách Vật Lý (Physical Copy Table)
- **Tiêu đề bảng:** *Bản sách vật lý của Ấn bản KĐ 2024 (8 cuốn trong kho)*
- **Badge phụ:** `Cọc thuê = 100% Giá bán niêm yết của cuốn`
- **Thanh công cụ bảng:**
  - Ô tìm kiếm: `Tìm CopyBarcode, kệ, nguồn...`
  - Bộ lọc: `Grade (Tất cả, A, B, C, D)`, `Trạng thái (Khả dụng, Đang thuê, Khóa kiểm kê, Hỏng/Mất)`
  - Nút hành động: `🖨 In Barcode các bản đã chọn` (Secondary), `+ Thêm cuốn vật lý` (Primary).
- **Cấu trúc cột chuẩn của bảng:**
  1. `CopyBarcode` (Ví dụ: `BC-0082918` - font semi-bold, màu Indigo)
  2. `Nguồn nhập` (Ví dụ: `INB-20261010-001 (NCC)` hoặc `BUY-20261011-003 (Thu mua)`)
  3. `Tình trạng (Grade)` (Ví dụ: `A · Mới 99%, đủ bìa` hoặc `B · Ố nhẹ mép dưới`)
  4. `Giá vốn` (Ví dụ: `25.000đ`)
  5. `Giá bán (Cọc)` (Ví dụ: `45.000đ` hoặc `35.000đ` tùy Grade)
  6. `Thuê/ngày` (Ví dụ: `3.000đ`)
  7. `Vị trí kệ` (Ví dụ: `A1-03`)
  8. `Trạng thái` (Badge màu: `Khả dụng` - xanh lá; `Đang cho thuê` - xanh dương; `Đang khóa kiểm kê` - cam; `Hư hỏng` - đỏ)
  9. `Thao tác` (Icon `•••`)

---

### NHIỆM VỤ 2: TẠO MỚI MÀN HÌNH `SCR-INV-10` (QUẢN LÝ BỘ SÁCH & TIẾN ĐỘ ĐỦ BỘ)
- **Tên màn hình mới:** `SCR-INV-10 · Quản lý Bộ sách & Tiến độ đủ bộ (Series & Set Management)`
- **Vị trí đề xuất:** `x: 2960, y: 6262` (hoặc đặt ngay cạnh các màn hình phân hệ Kho `SCR-INV-05`).
- **Kích thước Frame:** `1440 × 1200 px`, nền `#F5F7FA`.
- **Cấu trúc chi tiết màn hình:**

#### 1. Thanh điều hướng bên trái (Sidebar):
- Nhân bản sidebar chuẩn của hệ thống, cập nhật menu: Thêm mục **`Bộ sách (Series)`** (Active state, icon Book-Stack hoặc Library, màu Indigo).

#### 2. Tiêu đề trang & Nút thao tác:
- Title: *Quản lý Bộ sách & Tiến độ đủ bộ (Series / Boxset)*
- Subtitle: *Theo dõi ma trận tập, mức độ hoàn thiện của từng bộ truyện và hỗ trợ đóng gói bán/thuê trọn bộ.*
- Nút hành động: `+ Tạo Bộ sách mới` (Primary Button).

#### 3. Hàng KPI Tiến độ (4 KPI Cards):
1. **Tổng số Bộ sách:** `286` (Phụ đề: *Manga, Comic, Tiểu thuyết*)
2. **Tỷ lệ đủ bộ trung bình:** `78.4%` (Phụ đề: *Đủ điều kiện cho thuê trọn bộ*, màu xanh lá)
3. **Bộ đã hoàn thiện 100%:** `64` (Phụ đề: *Đủ bộ sẵn sàng bán combo*, màu tím)
4. **Bộ khuyết tập cần săn:** `18` (Phụ đề: *Ưu tiên thu mua từ khách*, màu đỏ)

#### 4. Card Chi tiết Bộ Sách & Ma trận tập (Visual Volume Matrix Card):
- **Khối thông tin bộ:**
  - Badge tím: `BỘ TRUYỆN TRANH`
  - Tên bộ: **Thám tử lừng danh Conan (Case Closed)**
  - Tác giả: *Gosho Aoyama* | NXB: *Kim Đồng* | Tình trạng: *Đang phát hành (104 tập)*
- **2 Nút nghiệp vụ nhanh:**
  - `[ ✓ Đóng gói Combo Bán Full Set ]` (Nút màu xanh lá)
  - `[ ⚠ Xuất danh sách 8 tập khuyết để thu mua ]` (Nút màu đỏ viền)
- **Thanh Tiến độ đủ bộ (Completeness Progress Bar):**
  - Text: *Tiến độ bộ truyện: Đã có 96 / 104 tập (Khuyết: Tập 12, 18, 45, 67, 88, 92, 99, 103)* — **92.3% Hoàn thiện**.
  - Bar hiển thị trực quan: Chiều rộng 100%, tỷ lệ fill 92.3% màu tím Indigo.
- **Chú giải Ma trận (Legend):**
  - 🟢 *Sẵn sàng (>=2 cuốn khả dụng)*: Nền `#DCFCE7`, chữ `#16A34A`
  - 🟡 *Sắp hết (1 cuốn)*: Nền `#FEF3C7`, chữ `#D97706`
  - 🔴 *Hết hàng (0 cuốn)*: Nền `#FEE2E2`, chữ `#DC2626`
  - ⚪ *Chưa từng có trong kho*: Nền viền nét đứt `#E8ECF2`
- **Lưới Ma trận tập (Volume Matrix Grid):**
  - Hiển thị lưới các ô tập nhỏ (kích thước ~`52 × 42 px`, bo góc 6px):
    - `T.01` (4 bản - Xanh), `T.02` (3 bản - Xanh), `T.03` (1 bản - Vàng), ..., `T.12` (0 bản - Đỏ), ..., `T.18` (0 bản - Đỏ)...
    - Thể hiện trực quan cho nhân viên thấy ngay tập nào đang thiếu để không cho thuê lẻ nếu đang giữ làm bộ combo.

---

### NHIỆM VỤ 3: CẢI TẠO MÀN HÌNH `SCR-POS-06` (THU MUA SÁCH CŨ TỪ KHÁCH HÀNG)
- **Node ID mục tiêu:** `8:35761` (Tên hiện tại: *SCR-POS-06 · Thu mua sách cũ từ khách hàng*)
- **Vấn đề cần sửa:** Bảng danh sách sách thu mua hiện có dòng ví dụ:  
  `Conan · 4 tập (4 × 95.000đ) | B | Giá mua 380.000đ | Sinh 4 mã riêng`  
  $\to$ **Lỗi logic:** Gom dòng khiến hệ thống không biết mã nào ứng với Tập 1, mã nào ứng với Tập 5.
- **Yêu cầu sửa đổi:**
  1. Thêm nút hành động: `[ + Thu mua theo Bộ truyện (Series Quick-Picker) ]`.
  2. Khi thu mua nhiều tập trong 1 bộ (ví dụ khách bán 4 tập Conan: Tập 01, Tập 03, Tập 05, Tập 10):
     - Giao diện bảng thu mua **BẮT BUỘC hiển thị tách thành 4 dòng riêng biệt**:
       - Dòng 1: `Conan · Tập 01` | Grade B | Giá mua thỏa thuận: `95.000đ` | Giá bán dự kiến: `140.000đ` | Sinh mã: `BC-BUY-01`
       - Dòng 2: `Conan · Tập 03` | Grade A | Giá mua thỏa thuận: `100.000đ` | Giá bán dự kiến: `150.000đ` | Sinh mã: `BC-BUY-02`
       - Dòng 3: `Conan · Tập 05` | Grade B | Giá mua thỏa thuận: `95.000đ` | Giá bán dự kiến: `140.000đ` | Sinh mã: `BC-BUY-03`
       - Dòng 4: `Conan · Tập 10` | Grade C | Giá mua thỏa thuận: `90.000đ` | Giá bán dự kiến: `130.000đ` | Sinh mã: `BC-BUY-04`
  3. Mỗi dòng có trường chọn Grade riêng và định giá riêng. Khi sinh barcode sẽ in tem đúng tên từng tập cụ thể.

---

### NHIỆM VỤ 4: CẬP NHẬT MÀN HÌNH `SCR-INV-02` (DANH MỤC ĐẦU SÁCH)
- **Node ID mục tiêu:** `8:36455` (Tên hiện tại: *SCR-INV-02 · Danh mục Đầu sách*)
- **Yêu cầu sửa đổi:**
  1. **Thêm cột thông tin vào bảng:**
     - Cột `Đầu sách / Bộ truyện`: Hiển thị tên đầu sách kèm nhãn bộ (VD: `Doraemon · Tập 01` bên dưới có nhãn `Bộ Doraemon · 45 tập`).
     - Cột `Ấn bản`: Thay vì chỉ có 1 ISBN cố định, hiển thị số lượng ấn bản: `2 ấn bản (978604... và 978604...)`.
     - Cột `Giá bìa`: Hiển thị dải giá nếu có nhiều ấn bản (VD: `40.000đ – 120.000đ`).
  2. **Bộ lọc:** Bổ sung dropdown lọc theo `Bộ sách (Series)` bên cạnh lọc `Thể loại`.
  3. **Khung Tra cứu nhanh bên phải:**
     - Đổi tên từ *"Thêm đầu sách bằng ISBN"* thành **"Tiếp nhận sách bằng ISBN"**.
     - Bổ sung ghi chú luồng: *Quét ISBN ➔ Nếu đã có Đầu sách: Thêm Ấn bản mới hoặc Bản vật lý mới; Nếu chưa có: Tạo mới Đầu sách + Ấn bản đầu tiên.*

---

### NHIỆM VỤ 5: TINH CHỈNH CÁC MÀN HÌNH CÒN LẠI

#### 1. `SCR-INV-09` · Giám sát Cảnh báo tồn kho chạm min (Node ID `30:24914`)
- **Vấn đề:** Đang cấu hình ngưỡng min ở cấp Đầu sách.
- **Sửa đổi:**
  - Chuyển cấp cấu hình sang **Ấn bản (Edition)**.
  - Tách ngưỡng tồn thành 2 thông số độc lập:
    - `Tồn an toàn kênh Bán (min_stock_sale)`: Số lượng tối thiểu trên kệ bán (VD: 2 cuốn).
    - `Tồn an toàn kênh Thuê (min_stock_rental)`: Số lượng tối thiểu trong kho thuê (VD: 3 cuốn).
  - Bảng cảnh báo hiển thị rõ: *Conan · Tập 10 (Ấn bản KĐ 2024)* - Thiếu kho thuê (còn 0/3) ➔ Đề xuất: *Nhập bổ sung 5 cuốn cho kho thuê*.

#### 2. `SCR-INV-06` · Lập Phiếu nhập kho từ NCC (Node ID `30:24578`)
- **Sửa đổi:**
  - Bảng dòng nhập hàng thể hiện rõ: `Đầu sách · Tập`, `Ấn bản (ISBN / Năm tái bản / Khổ sách)`, `% Chiết khấu NCC`, `Số lượng nhập`, `Giá vốn`, `Giá bìa niêm yết`.
  - Thêm nút tiện ích: `[ + Nhập theo Trọn bộ (Boxset / Series) ]` cho phép nhập từ tập A đến tập B chỉ với 1 click.

#### 3. `SCR-INV-04` · In nhãn Barcode dán gáy (Node ID `8:37026`)
- **Sửa đổi bản xem trước nhãn tem (50 × 30 mm):**
  - Cập nhật nội dung tem in thành 4 dòng chuẩn:
    - Dòng 1: `NHÀ SÁCH MÂY · KỆ A1-03`
    - Dòng 2: Mã vạch Code 128 + Text `BC-0082920`
    - Dòng 3 (Định danh rõ): `CONAN - T.10 (KĐ 2024)`
    - Dòng 4: `Grade A · Bán: 45.000đ · Thuê: 3.000đ/ngày`

---

### HƯỚNG DẪN THỰC THI CHO FIGMA AGENT (TECHNICAL EXECUTION INSTRUCTIONS)
1. **Font Loading Prerequisite:**
   Trước khi tạo hoặc sửa đổi bất kỳ `TextNode` nào, phải gọi lệnh load font:
   ```javascript
   await figma.loadFontAsync({ family: "Inter", style: "Regular" });
   await figma.loadFontAsync({ family: "Inter", style: "Medium" });
   await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
   await figma.loadFontAsync({ family: "Inter", style: "Bold" });
   ```
2. **Auto-Layout Structure:**
   - Sử dụng Auto-Layout (`figma.createAutoLayout()`) cho mọi khối danh sách, table header, table row, badge và card.
   - Tránh tuyệt đối việc dùng absolute coordinates bên trong card nội dung để layout không bị vỡ khi co giãn text.
3. **Màu sắc trong Plugin API:**
   - Hệ màu trong Figma Plugin API là dải `0 - 1` (ví dụ: Màu tím `#7C3AED` = `{ r: 0.49, g: 0.23, b: 0.93 }`).
   - Các thuộc tính `fills` và `strokes` là read-only arrays, phải gán bằng mảng mới `[{ type: 'SOLID', color: {...} }]`.
4. **Bảo tồn tính toàn vẹn (Safety):**
   - Không được xóa hoặc ghi đè trang `backup` (ID `32:2`). Mọi thay đổi thực hiện trên `Page 1` (ID `0:1`).
   - Giữ nguyên cấu trúc Header / Sidebar / Topbar đồng bộ với các màn hình HRM, POS, SYS đã có.

---

### TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)
- [ ] Màn hình mới `SCR-INV-10` xuất hiện trên canvas với đầy đủ KPI, Thanh % đủ bộ và Ma trận 104 tập có màu sắc phân loại rõ ràng.
- [ ] Màn hình `SCR-INV-03` được chia thành 3 tầng rõ rệt: Khối Đầu sách (Title) $\to$ Khối Thẻ chọn Ấn bản (Edition Cards với ISBN riêng) $\to$ Bảng Danh sách cuốn vật lý (CopyBarcode).
- [ ] Không còn tình trạng hiển thị ISBN hay Giá bìa ở cấp Tác phẩm / Đầu sách.
- [ ] Màn hình `SCR-POS-06` tách rời từng tập khi thu mua truyện cũ, mỗi tập có Grade và Barcode độc lập.
- [ ] Màn hình `SCR-INV-09` tách rõ ngưỡng tồn min cho kênh Bán và kênh Thuê theo từng Ấn bản.
- [ ] Tất cả các component, font chữ và màu sắc khớp 100% với Design System của Cloud Bookstore.
