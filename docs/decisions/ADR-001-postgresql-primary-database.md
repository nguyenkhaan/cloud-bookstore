# ADR-001: Dùng PostgreSQL làm cơ sở dữ liệu chính

## Status

Accepted

## Date

2026-10-20

## Context

Nghiệp vụ cửa hàng có nhiều quan hệ và thay đổi trạng thái cần toàn vẹn giao dịch: bản sách vật lý, bán, thuê–trả, kiểm kê, thanh toán, két và audit. `DATABASE.txt` là DBML cho mô hình quan hệ này; kiểu `string` tổng quát không sinh được DDL PostgreSQL hợp lệ.

## Decision

Dùng PostgreSQL làm cơ sở dữ liệu chính. Trong DBML, khóa chính và cột tham chiếu dùng `uuid`; dữ liệu tiền/tỷ lệ dùng kiểu số PostgreSQL phù hợp; tập giá trị nghiệp vụ cố định dùng enum PostgreSQL.

## Alternatives Considered

### Kiểu `string` tổng quát

Loại vì không phải kiểu DDL PostgreSQL hợp lệ và làm lẫn lộn mã văn bản với định danh quan hệ.

### Mã trạng thái bằng `varchar`

Loại vì mỗi nơi có thể ghi một giá trị khác hoặc sai chính tả; enum biểu đạt tập giá trị đã chốt rõ hơn.

## Consequences

- Migration, ORM và test phải dùng UUID và enum tương ứng.
- Thêm giá trị enum cần migration có kiểm soát.
- Các ràng buộc khóa ngoại vật lý vẫn được bổ sung ở bước thiết kế migration tiếp theo.

## Affected Artifacts

- [`DATABASE.txt`](../DATABASE.txt)
- [`PROJECT_SPEC.md`](../PROJECT_SPEC.md)
- [`OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md)
