# Quy ước đặc tả tính năng

Thư mục này dành cho Phase 1 — Specify của SDD. Chưa tạo implementation plan hoặc task tại đây.

## Một spec cho một lát cắt nghiệp vụ

Tên file: `<feature-id>-<ten-ngan>.md`, ví dụ `SALE-001-counter-sale.md`.

Mỗi spec phải có:

```markdown
# Spec: <Feature ID> — <Tên>

## Status
Draft | In Review | Accepted | Superseded

## Objective
Người dùng nào cần đạt kết quả gì và vì sao.

## References
- Feature IDs
- Business rule IDs
- Decision records

## Actors and Permissions
Actor chính, quyền cần có, bước cần Admin duyệt.

## Preconditions
Trạng thái dữ liệu và điều kiện trước khi bắt đầu.

## Main Flow
Luồng thành công theo thứ tự.

## Alternate and Error Flows
Validation, xung đột, retry, mất kết nối và rollback.

## Data and State Changes
Input/output, snapshot, trạng thái trước/sau, audit và idempotency.

## Acceptance Criteria
Given/When/Then hoặc điều kiện kiểm thử tương đương.

## Non-functional Requirements
Bảo mật, hiệu năng, privacy, observability liên quan.

## Open Questions
Chỉ các câu hỏi chưa chặn việc review; câu hỏi P0 phải giải quyết trước.
```

## Quy tắc review

- Spec không được tham chiếu `legacy/` như nguồn yêu cầu.
- Khi đề cập mã vạch, spec phải ghi rõ `ISBN`/Barcode ISBN dùng để nhận diện ấn bản hay `CopyBarcode` dùng để nhận diện bản vật lý; không dùng “barcode” chung chung.
- Không viết API/schema chi tiết trước khi ADR công nghệ liên quan được chấp thuận.
- Không đánh dấu `Accepted` nếu còn câu hỏi P0 hoặc tiêu chí không kiểm thử được.
- Sau khi spec được con người duyệt mới chuyển sang Plan, Tasks và Implement.
