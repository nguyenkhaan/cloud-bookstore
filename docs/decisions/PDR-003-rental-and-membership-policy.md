# PDR-003: Chính sách thuê và thành viên

## Status

Accepted

## Date

2026-10-20

## Context

Tài liệu cũ mâu thuẫn về cọc 70% hay 100%, thời điểm thu phí gia hạn và quyền lợi thành viên. Những khác biệt này tác động trực tiếp tới tiền, báo cáo và trải nghiệm tại quầy.

## Decision

- Cọc bằng 100% giá bán thực tế của từng bản, thu khi giao sách.
- Phí thuê và phí gia hạn tính theo thời gian thực tế, thu khi trả.
- Phạt/hư hỏng được khấu trừ từ cọc trước khi hoàn phần còn lại.
- Gia hạn chỉ khi phiếu còn hạn, tại quầy, tối đa 2 lần và mỗi lần tối đa 7 ngày.
- Ba hạng: Thường dưới 1 triệu (3 bản/14 ngày/0%), Bạc từ 1 đến dưới 3 triệu (5 bản/21 ngày/5%), Vàng từ 3 triệu (8 bản/30 ngày/10%).
- Giảm giá áp dụng cho bán và phí thuê; không áp dụng cho cọc, phạt hay bồi thường.
- Không có điểm tích lũy.

## Alternatives Considered

- Cọc 70% và tối thiểu 30.000 VNĐ: loại vì không bảo đảm toàn bộ giá trị từng bản.
- Thu phí gia hạn ngay: loại để thống nhất quyết toán theo thời gian thực tế lúc trả.
- Khách tự gia hạn: loại theo PDR-001.
- Điểm tích lũy: loại khỏi MVP vì hạng đã đáp ứng chính sách khách hàng thân thiết.

## Consequences

- Phải lưu snapshot giá bán, đơn giá thuê và hạng áp dụng trên giao dịch.
- Cọc không được tính là doanh thu.
- Giao dịch đảo có thể làm giảm tổng chi tiêu và hạ hạng.
- Đơn giá/làm tròn và mức hư hỏng vẫn cần quyết định riêng.

## Affected Artifacts

`BR-RENT-*`, `BR-RETURN-*`, `BR-MEMBER-*`, `RENT-*`, `RETURN-*`, `MEMBER-*`.
