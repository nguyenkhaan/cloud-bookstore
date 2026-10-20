# Mô hình miền sách

**Trạng thái:** Accepted  
**Quyết định liên quan:** [`PDR-005`](../decisions/PDR-005-title-edition-copy-identification.md)

## Cấu trúc chuẩn

```text
Bộ sách
└── Đầu sách / tập
    └── Ấn bản
        ├── ISBN (có thể trống)
        ├── Nhà xuất bản
        ├── Năm xuất bản
        ├── Lần xuất bản/tái bản
        ├── Định dạng
        └── Bản sách vật lý
            ├── CopyBarcode 001
            └── CopyBarcode 002
```

```mermaid
erDiagram
    BOOK_SERIES ||--o{ BOOK_TITLE : contains
    BOOK_TITLE ||--o{ BOOK_EDITION : has
    BOOK_EDITION ||--o{ BOOK_COPY : materializes_as

    BOOK_SERIES {
        string id PK
        string name
    }
    BOOK_TITLE {
        string id PK
        string series_id FK
        string title
        int volume_number
        string description
    }
    BOOK_EDITION {
        string id PK
        string book_title_id FK
        string isbn nullable
        string publisher
        int publication_year
        string edition_statement
        string printing_statement
        string format
        money list_price
    }
    BOOK_COPY {
        string id PK
        string book_edition_id FK
        string copy_barcode UK
        string grade
        money acquisition_cost
        money sale_price
        money rental_rate
        string status
    }
```

## Trách nhiệm từng thực thể

### Bộ sách

Nhóm nhiều đầu sách/tập trong cùng series. Một sách độc lập không bắt buộc thuộc bộ.

### Đầu sách/tập

Mô tả nội dung/tác phẩm ở cấp tên sách hoặc số tập. Không dùng ISBN làm khóa định danh. Các trường điển hình gồm tên, số tập, tác giả, mô tả và thể loại.

### Ấn bản

Mô tả sản phẩm xuất bản cụ thể mà cửa hàng nhận diện được. Các trường tối thiểu:

- Khóa nội bộ `EditionId`.
- `ISBN` tùy chọn.
- Nhà xuất bản.
- Năm xuất bản.
- Lần xuất bản và/hoặc lần tái bản do nhân viên nhập hoặc xác nhận.
- Định dạng như bìa mềm, bìa cứng hoặc khổ sách.
- Giá bìa và ảnh bìa của ấn bản.
- Nguồn metadata, người xác nhận và thời điểm xác nhận.

ISBN không chứa sẵn thông tin lần tái bản. Không dùng ISBN làm primary key hoặc định danh bản vật lý. Khi nhiều ấn bản/tái bản có cùng ISBN, hệ thống hiển thị các ứng viên và yêu cầu nhân viên chọn theo metadata thực tế.

### Bản sách vật lý

Mô tả một cuốn cụ thể trong kho. Mỗi bản:

- Thuộc đúng một ấn bản.
- Có `CopyBarcode` duy nhất toàn hệ thống.
- Có nguồn nhập, Grade, mô tả tình trạng, giá vốn, giá bán, đơn giá thuê và trạng thái riêng.
- Có lịch sử thay đổi trạng thái và giao dịch riêng.

## Hai loại barcode

| Mã quét | Giá trị | Mục đích |
| --- | --- | --- |
| Barcode ISBN | Thường là ISBN-13/EAN-13 do nhà xuất bản in | Tìm các ấn bản ứng viên và tra cứu metadata |
| CopyBarcode | Mã nội bộ do cửa hàng sinh/in | Định danh đúng một bản vật lý trong nhập kho, bán, thuê, trả và kiểm kê |

Không dùng thuật ngữ chung “barcode” trong spec/API khi có thể gây nhầm lẫn; phải ghi rõ `ISBN`/`IsbnBarcode` hoặc `CopyBarcode`.

## Quy tắc định danh

1. `BookTitleId`, `EditionId` và `BookCopyId` là khóa nội bộ ổn định.
2. `CopyBarcode` là duy nhất và bắt buộc đối với bản sách được đưa vào kinh doanh.
3. ISBN có thể trống, được lập chỉ mục để tìm kiếm nhưng không bắt buộc unique.
4. Kết quả API sách chỉ là đề xuất; nhân viên xác nhận metadata trước khi liên kết bản vật lý.
5. Tái in tem CopyBarcode không tạo bản sách mới và không thay đổi danh tính bản hiện có.
6. Không gộp trạng thái, giá hoặc lịch sử của nhiều bản vật lý chỉ vì chúng cùng ISBN.

## Luồng nhận diện khi nhập sách

1. Quét Barcode ISBN nếu sách có ISBN.
2. Chuẩn hóa ISBN và tìm danh sách ấn bản ứng viên.
3. Nếu chưa có, gọi Google Books/Open Library để đề xuất metadata.
4. Nhân viên xác nhận đầu sách, NXB, năm, lần xuất bản/tái bản và định dạng; hoặc nhập thủ công.
5. Chọn/tạo ấn bản bằng khóa nội bộ.
6. Tạo một bản vật lý cho mỗi cuốn và sinh CopyBarcode riêng.
7. Các giao dịch sau đó quét CopyBarcode.
