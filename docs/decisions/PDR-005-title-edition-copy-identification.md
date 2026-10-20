# PDR-005: Tách đầu sách, ấn bản và bản vật lý

## Status

Accepted

## Date

2026-10-20

## Context

ISBN không tự mã hóa số lần tái bản, số thứ tự ấn bản, năm xuất bản hoặc định dạng. Nhiều bản vật lý có thể cùng ISBN, trong khi cửa hàng phải quản lý riêng tình trạng, giá và vòng đời của từng cuốn. Một số tài liệu cũ gộp đầu sách với ấn bản hoặc dùng từ “barcode” cho cả ISBN và mã bản vật lý.

## Decision

Áp dụng mô hình:

`Bộ sách → Đầu sách/tập → Ấn bản → Bản sách vật lý`

- Đầu sách/tập mô tả nội dung chung.
- Ấn bản có khóa nội bộ và lưu ISBN tùy chọn, NXB, năm, lần xuất bản/tái bản, định dạng, giá bìa cùng metadata liên quan.
- ISBN dùng để tra cứu ấn bản nhưng không phải khóa chính, không bắt buộc unique và không định danh bản vật lý.
- Mỗi bản vật lý liên kết đúng một ấn bản và có CopyBarcode nội bộ duy nhất.
- Barcode ISBN và CopyBarcode là hai khái niệm riêng; giao dịch trên từng cuốn dùng CopyBarcode.

## Alternatives Considered

### Gắn ISBN trực tiếp vào đầu sách

Loại vì không biểu diễn rõ nhiều ấn bản/định dạng của cùng nội dung.

### Dùng ISBN làm barcode của bản vật lý

Loại vì nhiều cuốn có cùng ISBN và không thể theo dõi riêng trạng thái, giá hoặc lịch sử thuê.

### Suy diễn lần tái bản từ ISBN

Loại vì ISBN không mã hóa thông tin này; metadata phải được lấy từ nguồn ngoài rồi nhân viên xác nhận hoặc nhập thủ công.

## Consequences

- Data model và API phải có thực thể `BookEdition` riêng.
- ISBN được lập chỉ mục để tra cứu nhưng không là primary key/unique key bắt buộc.
- POS, thuê–trả và kiểm kê phải quét CopyBarcode.
- Luồng nhập/thu mua phải xác nhận ấn bản trước khi tạo bản vật lý.
- Test phải bao phủ nhiều ấn bản cùng đầu sách, nhiều bản cùng ấn bản, cùng ISBN giữa các lần tái bản và sách không có ISBN.

## Affected Artifacts

`FEATURE.md`, `PROJECT_SPEC.md`, `product/GLOSSARY.md`, `product/SCOPE.md`, `requirements/BUSINESS_RULES.md`, `requirements/WORKFLOWS.md`, `requirements/NON_FUNCTIONAL.md`, `requirements/QUALITY.md`, `architecture/DOMAIN_MODEL.md`.
