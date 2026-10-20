# PDR-001: Hệ thống chỉ phục vụ nội bộ cửa hàng

## Status

Accepted

## Date

2026-10-20

## Context

Tài liệu cũ vừa mô tả web portal/đặt giữ/gia hạn cho khách, vừa xác định MVP chỉ vận hành tại quầy. Hai hướng tạo actor, API và luồng bảo mật hoàn toàn khác nhau.

## Decision

MVP chỉ có POS và trang quản trị cho nhân sự cửa hàng. Khách hàng không đăng nhập, không tra cứu, không đặt giữ và không tự gia hạn. Zalo là kênh thông báo một chiều.

## Alternatives Considered

- Web portal tra cứu: loại khỏi MVP vì mở rộng biên bảo mật và trải nghiệm khách hàng.
- Khách tự gia hạn qua Zalo: loại vì mâu thuẫn với quy trình kiểm tra và thao tác tại quầy.
- Ứng dụng di động: không cần cho vận hành một cửa hàng vật lý.

## Consequences

- Không cần customer authentication hoặc public API.
- Mọi giao dịch và thay đổi phiếu do nhân viên thực hiện.
- Thiết kế UI tập trung vào tốc độ thao tác tại quầy.
- Tương tác hai chiều với khách là phạm vi tương lai, cần quyết định mới.

## Affected Artifacts

`FEATURE.md`, `product/SCOPE.md`, `architecture/SYSTEM_CONTEXT.md`, `WF-01`–`WF-05`.
