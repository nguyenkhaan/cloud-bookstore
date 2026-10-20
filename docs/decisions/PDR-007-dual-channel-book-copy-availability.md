# PDR-007: Bản sách vật lý mặc định khả dụng cho cả bán và thuê

## Status

Accepted

## Date

2026-10-20

## Context

Cửa hàng có thể dùng cùng một bản sách vật lý cho bán hoặc thuê. Phân loại độc quyền ngay khi nhập kho làm giảm linh hoạt vận hành và không phản ánh quyết định sản phẩm hiện tại.

## Decision

- Mỗi bản sách vật lý mặc định có khả năng `BOTH`: được bán hoặc cho thuê khi trạng thái bản sách cho phép.
- Người có quyền kho có thể đổi khả năng của từng bản thành `SALE_ONLY` hoặc `RENTAL_ONLY`.
- Bản khả dụng cho cả hai được tính vào tồn khả dụng của cả nhóm Bán và nhóm Thuê tại ấn bản tương ứng.
- Một bản đang được thuê, đã bán, bị khóa hoặc không khả dụng vì trạng thái khác vẫn không thể dùng cho giao dịch mới, bất kể khả năng kênh.

## Consequences

- POS bán chỉ chấp nhận `BOTH` hoặc `SALE_ONLY`; phiếu thuê chỉ chấp nhận `BOTH` hoặc `RENTAL_ONLY`.
- Nhập kho có thể đặt khả năng ban đầu, mặc định là `BOTH`.
- Đổi khả năng kênh phải được audit để giữ lịch sử thao tác kho.

## Affected Artifacts

- [`DATABASE.txt`](../DATABASE.txt)
- [`FEATURE.md`](../FEATURE.md)
- [`requirements/BUSINESS_RULES.md`](../requirements/BUSINESS_RULES.md)
