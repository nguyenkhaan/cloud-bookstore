# Hướng Dẫn Cập Nhật Figma & Nhật Ký Thay Đổi Thiết Kế (Figma Design Changelog)

> **File Figma:** `Cloud Bookstore` ([Link](https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=0-1&p=f&t=PZmTIUn2nr8536IG-0))  
> **Phiên bản:** v2.0-Hierarchical-Model  
> **Mục tiêu:** Chuyển đổi toàn diện từ mô hình 2 cấp phẳng sang mô hình chuẩn **Bộ sách ➔ Đầu sách ➔ Ấn bản ➔ Bản sách vật lý**.

---

## 1. CÁCH ÁP DỤNG THIẾT KẾ MỚI VÀO FIGMA TỰ ĐỘNG

Tôi đã viết sẵn một script tự động hóa bằng **Figma Plugin API** tại file:  
👉 [`docs/figma_update_book_hierarchy.js`](./figma_update_book_hierarchy.js)

### Cách chạy script trực tiếp trên file Figma của bạn (chỉ mất 30 giây):
1. Mở file Figma của bạn tại trình duyệt hoặc Figma Desktop App: [Link Figma](https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=0-1).
2. Chuyển sang **`Page 1`**.
3. Mở plugin chạy script:
   * **Cách 1 (Khuyên dùng - Nhanh nhất):** Sử dụng plugin **Scripter** (hoặc plugin bất kỳ hỗ trợ chạy JS trong Figma). Dán toàn bộ nội dung file `figma_update_book_hierarchy.js` vào và bấm **Run**.
   * **Cách 2 (Qua Figma Console):** Trên Figma Desktop App, nhấn tổ hợp phím `Ctrl + Alt + I` (Windows/Linux) hoặc `Cmd + Option + I` (Mac) để mở Developer Tools Console. Dán đoạn mã trong file vào tab **Console** và nhấn **Enter**.
4. **Kết quả:** Hệ thống sẽ tự động vẽ ngay trên canvas:
   * **Màn hình mới `SCR-INV-10`** đặt tại tọa độ `(x: 2960, y: 6262)` với đầy đủ KPI, Thanh tiến độ % đủ bộ và Ma trận tập (Volume Matrix).
   * **Màn hình cải tiến `SCR-INV-03`** đặt tại tọa độ `(x: 5040, y: 6262)` với cấu trúc 3 tầng chuẩn: Tác phẩm ➔ Thẻ Ấn bản (Cards) ➔ Bảng Bản vật lý (CopyBarcode).

---

## 2. CHI TIẾT CÁC THAY ĐỔI THEO TỪNG MÀN HÌNH

### A. MÀN HÌNH MỚI: `SCR-INV-10 · Quản lý Bộ sách & Tiến độ đủ bộ`
* **Vị trí trên Canvas:** `x: 2960, y: 6262` (nằm ngay cạnh SCR-INV-05 trong cụm Kho).
* **Kích thước chuẩn:** `1440 × 1200 px`.
* **Cấu trúc Auto-Layout:**
  1. **Thanh điều hướng bên trái (Sidebar):** Bổ sung mục menu `Bộ sách (Series)` nằm giữa *Quầy giao dịch* và *Danh mục đầu sách*.
  2. **Khối KPI Tiến độ đủ bộ (4 Thẻ):**
     * Tổng số bộ sách: `286`
     * Tỷ lệ đủ bộ trung bình: `78.4%`
     * Số bộ đã đủ 100% (Sẵn sàng bán combo): `64`
     * Số bộ khuyết tập (Ưu tiên thu mua): `18`
  3. **Thẻ Bộ truyện Chi tiết & Ma trận tập:**
     * Badge tím: `BỘ TRUYỆN TRANH` · *Thám tử lừng danh Conan (104 tập)*.
     * Thanh Progress bar: `96 / 104 tập (92.3%)`.
     * **Ma trận trực quan 104 tập:** Lưới các khối `T.01`, `T.02`... được phân màu:
       * *Xanh lá:* Có $\ge 2$ bản khả dụng (sẵn sàng bán/cho thuê).
       * *Vàng cam:* Sắp hết (chỉ còn 1 bản).
       * *Đỏ:* Hết hàng (0 bản khả dụng).
       * *Viền đứt:* Chưa từng nhập về kho.
     * **2 Nút nghiệp vụ nhanh:**
       * `[ ✓ Đóng gói Combo Bán Full Set ]`: Tự động gom các tập tạo gói bán trọn bộ.
       * `[ ⚠ Xuất danh sách 8 tập khuyết để thu mua ]`: Đưa vào danh sách cần săn lùng.

---

### B. MÀN HÌNH CẢI TẠO: `SCR-INV-03 · Chi tiết Đầu sách, Ấn bản & Bản vật lý`
* **Vị trí trên Canvas:** `x: 5040, y: 6262`.
* **Kích thước chuẩn:** `1440 × 1400 px`.
* **Bố cục 3 tầng Master-Detail phân cấp (Hierarchical Layout):**
  1. **Tầng 1 (Title Level - Cấp Đầu sách):**
     * Tách bỏ các thông tin của ấn bản (ISBN, NXB, Giá bìa).
     * Chỉ giữ metadata nội dung: Tên tác phẩm (*Conan · Tập 10*), Tác giả (*Gosho Aoyama*), Thể loại (*Manga Trinh thám*), Năm gốc (*1996*), Liên kết ngược về Bộ truyện cha (*Bộ: Thám tử lừng danh Conan ↗*).
  2. **Tầng 2 (Edition Level - Cấp Ấn bản):**
     * Thiết kế dạng **Thẻ chọn Ấn bản (Horizontal Edition Cards)**:
       * **Thẻ 1 (Active - Đang chọn):** `NXB Kim Đồng · Tái bản 2024 (Bìa mềm áo rời)` | ISBN: `978-604-2-09359-5` | Giá bìa: `45.000đ` | Giá thuê: `3.000đ/ngày` | Tồn: `8 bản vật lý`.
       * **Thẻ 2:** `NXB Kim Đồng · Bản kỷ niệm 20 năm (Bìa cứng Jacket)` | ISBN: `978-604-2-19882-1` | Giá bìa: `120.000đ` | Kênh: `Chỉ bán` | Tồn: `2 bản vật lý`.
       * Nút `+ Thêm Ấn bản mới bằng ISBN`.
  3. **Tầng 3 (Copy Level - Cấp Bản vật lý):**
     * Bảng danh sách các cuốn sách vật lý thuộc Ấn bản đang chọn ở Tầng 2.
     * Cột dữ liệu đầy đủ: `CopyBarcode` (Click xem lịch sử), `Nguồn nhập`, `Tình trạng (Grade A/B/C/D)`, `Giá vốn`, `Giá bán niêm yết (Cọc thuê)`, `Đơn giá thuê/ngày`, `Vị trí kệ (A1-03)`, `Trạng thái (Khả dụng, Đang thuê, Khóa kiểm kê, Hư hỏng)`.

---

### C. MÀN HÌNH CẢI TẠO: `SCR-POS-06 · Thu mua sách cũ từ khách hàng`
* **Vị trí:** Màn hình thu mua sách tại quầy.
* **Thay đổi cốt lõi:**
  1. **Thêm nút:** `[ + Thu mua theo Bộ truyện ]`.
  2. **Popup Series Volume Picker:** Khi khách bán một chồng truyện (ví dụ 4 tập Conan), nhân viên chọn bộ Conan, tick chọn nhanh: `Tập 01`, `Tập 03`, `Tập 05`, `Tập 10`.
  3. **Không còn gom chung thành 1 dòng "Conan 4 tập":** Hệ thống tự động tách thành **4 dòng độc lập**, mỗi dòng map chính xác với Đầu sách & Ấn bản của tập đó.
  4. Đánh giá Grade riêng cho từng cuốn (Tập 1 có thể Grade B, Tập 10 có thể Grade A).
  5. Khi hoàn tất: Hệ thống sinh đúng 4 mã `CopyBarcode` dán nhãn ghi rõ tên từng tập.

---

### D. MÀN HÌNH CẢI TẠO: `SCR-INV-04 · In tem Barcode dán gáy`
* **Khổ tem chuẩn:** `50 × 30 mm` (Phù hợp máy in nhiệt Xprinter XP-350B).
* **Nội dung nhãn dán gáy:**
  * Dòng 1: `NHÀ SÁCH MÂY · KỆ A1-03`
  * Dòng 2: Mã vạch Code 128 kèm text `BC-0082920`
  * Dòng 3 (Định danh chuẩn): `CONAN - T.10 (KĐ 2024)`
  * Dòng 4: `Grade A · Bán: 45.000đ · Thuê: 3.000đ/ngày`

---

## 3. CHECKLIST KIỂM TRA ĐỘ HOÀN THIỆN TRÊN FIGMA
Sau khi áp dụng script, bạn có thể kiểm tra trực tiếp:
- [x] Có màn hình quản lý Bộ sách riêng biệt (`SCR-INV-10`).
- [x] Tỷ lệ đủ bộ % và Ma trận tập hiển thị trực quan các màu: Xanh (Đủ) / Vàng (Ít) / Đỏ (Hết).
- [x] Chi tiết đầu sách (`SCR-INV-03`) phân biệt rạch ròi giữa Đầu sách và Ấn bản.
- [x] Cho phép 1 Đầu sách có nhiều thẻ Ấn bản với ISBN, Giá bìa, NXB khác nhau.
- [x] Bản sách vật lý (`CopyBarcode`) trực thuộc Ấn bản cụ thể, không bị gộp chung vào đầu sách.
- [x] Phí cọc thuê bằng đúng 100% giá bán của bản sách vật lý.
