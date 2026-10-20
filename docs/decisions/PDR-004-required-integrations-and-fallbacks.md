# PDR-004: Tích hợp thật và fallback trong MVP

## Status

Accepted

## Date

2026-10-20

## Context

VietQR, Zalo và API sách tạo giá trị vận hành nhưng đều là phụ thuộc bên ngoài. MVP cần kiểm chứng tích hợp thật mà không để sự cố nhà cung cấp làm tê liệt quầy.

## Decision

MVP tích hợp thật VietQR/webhook ngân hàng, Zalo và Google Books/Open Library. Khi lỗi:

- Thanh toán chuyển sang tiền mặt hoặc danh sách đối soát phù hợp.
- Tra cứu sách chuyển sang nhập thủ công.
- Thông báo được lưu thất bại và gửi lại.

Giao dịch nội bộ hợp lệ không bị rollback chỉ vì gửi thông báo hoặc tra cứu metadata thất bại.

## Alternatives Considered

- Chỉ mock tích hợp trong MVP: loại vì không kiểm chứng rủi ro vận hành thật.
- Chặn toàn bộ POS khi tích hợp lỗi: loại vì cửa hàng phải tiếp tục phục vụ tại quầy.
- Tự động chuyển tiền ra qua ngân hàng: loại vì vượt phạm vi và tăng rủi ro tài chính.

## Consequences

- Cần adapter, contract test, idempotency, timeout/retry và quan sát trạng thái tích hợp.
- Nhà cung cấp, chữ ký webhook và mẫu Zalo vẫn phải được chốt trước triển khai module tương ứng.
- UI phải thể hiện rõ fallback và các giao dịch cần xử lý tiếp.

## Affected Artifacts

`INTEGRATION-*`, `PAY-*`, `NOTIFY-*`, `INT-BOOK-*`, `NFR-RES`.
