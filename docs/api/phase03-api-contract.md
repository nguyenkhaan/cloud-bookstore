# Phase 03 — API Contract

## P03-S01

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/categories` | Lấy danh sách thể loại có phân trang và lọc theo tên, thể loại cha, trạng thái. |
| `GET` | `/api/categories/{id}` | Lấy chi tiết một thể loại. |
| `POST` | `/api/categories` | Tạo thể loại. |
| `PUT` | `/api/categories/{id}` | Cập nhật thể loại. |
| `PATCH` | `/api/categories/{id}/status` | Ngừng sử dụng hoặc kích hoạt lại thể loại. |
| `DELETE` | `/api/categories/{id}` | Xóa thể loại chưa được tham chiếu. |
| `GET` | `/api/book-series` | Lấy danh sách bộ sách có phân trang và lọc theo tên, trạng thái. |
| `GET` | `/api/book-series/{id}` | Lấy chi tiết một bộ sách. |
| `POST` | `/api/book-series` | Tạo bộ sách. |
| `PUT` | `/api/book-series/{id}` | Cập nhật bộ sách. |
| `PATCH` | `/api/book-series/{id}/status` | Ngừng sử dụng hoặc kích hoạt lại bộ sách. |
| `DELETE` | `/api/book-series/{id}` | Xóa bộ sách chưa được tham chiếu. |
| `GET` | `/api/book-titles` | Lấy danh sách đầu sách/tập có phân trang và lọc theo tên, bộ sách, thể loại, trạng thái. |
| `GET` | `/api/book-titles/{id}` | Lấy chi tiết một đầu sách/tập. |
| `POST` | `/api/book-titles` | Tạo đầu sách độc lập hoặc tập thuộc một bộ sách. |
| `PUT` | `/api/book-titles/{id}` | Cập nhật metadata chung và quan hệ của đầu sách/tập. |
| `PATCH` | `/api/book-titles/{id}/status` | Ngừng sử dụng hoặc kích hoạt lại đầu sách/tập. |
| `DELETE` | `/api/book-titles/{id}` | Xóa đầu sách/tập chưa được tham chiếu. |

## P03-S02

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/editions` | Lấy danh sách ấn bản có phân trang và lọc theo ISBN, đầu sách, NXB, năm xuất bản, trạng thái. |
| `GET` | `/api/editions/{id}` | Lấy chi tiết một ấn bản. |
| `POST` | `/api/editions` | Tạo ấn bản từ metadata đã xác nhận hoặc dữ liệu nhập thủ công. |
| `PUT` | `/api/editions/{id}` | Cập nhật metadata của ấn bản. |
| `PATCH` | `/api/editions/{id}/status` | Ngừng sử dụng hoặc kích hoạt lại ấn bản. |
| `DELETE` | `/api/editions/{id}` | Xóa ấn bản chưa được tham chiếu. |
| `GET` | `/api/book-metadata/isbn/{isbn}` | Tra cứu các gợi ý metadata từ Google Books/Open Library theo ISBN. |

## P03-S03

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/book-copies/{id}` | Lấy chi tiết một bản sách vật lý. |
| `POST` | `/api/book-copies` | Tạo bản sách vật lý và CopyBarcode riêng. |
| `PUT` | `/api/book-copies/{id}` | Cập nhật Grade, tình trạng, giá, vị trí kệ và kênh Bán/Thuê của bản sách. |
| `PATCH` | `/api/book-copies/{id}/status` | Chuyển trạng thái vòng đời của bản sách. |
| `GET` | `/api/book-copies/{id}/history` | Lấy lịch sử trạng thái và biến động của bản sách. |
| `POST` | `/api/book-copies/{id}/label` | Tạo dữ liệu in hoặc tái in tem CopyBarcode cho bản sách hiện có. |

## P03-S04

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| `GET` | `/api/book-copies` | Tìm bản sách có phân trang theo CopyBarcode, ISBN, tên, bộ/tập, tác giả, thể loại, Grade, trạng thái và kênh Bán/Thuê. |
| `GET` | `/api/book-copies/by-barcode/{copyBarcode}` | Tra cứu chính xác một bản sách theo CopyBarcode. |
