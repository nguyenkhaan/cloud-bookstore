# Spec: AUD-001 — Ổn định P1 frontend sau audit

## Status

Accepted — phạm vi kỹ thuật được người phụ trách sản phẩm duyệt ngày 2026-11-24.

## Objective

Loại bỏ các lỗi P1 ở frontend làm hỏng build hoặc tạo đầu ra không an toàn, đồng thời không cho giao diện báo thành công đối với thao tác chưa có API/contract để thực thi thật. Mục tiêu là ổn định trải nghiệm hiện có với thay đổi giao diện tối thiểu.

## References

- Feature IDs: `AUD-001`, `AUTH-004`, `BOOK-005`, `SALE-005`, `RETURN-003`–`RETURN-005`.
- `docs/OPEN_QUESTIONS.md`: `OQ-003`, `OQ-004`, `OQ-006` là P0; không triển khai nghiệp vụ thuê/trả/thanh toán phụ thuộc các câu hỏi này.
- Audit frontend lần 1, do người dùng cung cấp ngày 2026-11-24.

## Actors and Permissions

- Mọi vai trò chỉ nhìn thấy thao tác đã được RBAC hiện có cho phép.
- Không mở rộng quyền hoặc thay đổi chính sách RBAC trong lát cắt này.

## Preconditions

- Frontend có các lỗi TypeScript P1 được audit ghi nhận.
- Một số nút/biểu mẫu hiện mô phỏng thành công bằng timeout hoặc state cục bộ vì backend chưa có endpoint/contract tương ứng.

## Main Flow

1. Build frontend hoàn tất không có lỗi TypeScript do import/biến không dùng hoặc dữ liệu giá có thể là `undefined`.
2. Dữ liệu động được đưa vào trang in tem chỉ sau khi đã được escape; dữ liệu văn bản khi xuất CSV không thể được diễn giải như công thức bảng tính.
3. Một thao tác chưa có API/contract không cập nhật state như đã lưu, không điều hướng sang trạng thái hoàn tất và không thông báo thành công; UI giữ nguyên dữ liệu người dùng đã nhập và hiển thị lỗi khả dụng ngắn gọn.

## Alternate and Error Flows

- Khi endpoint/mutation đã tồn tại, không thay bằng fallback; lỗi thực từ API tiếp tục được hiển thị theo cơ chế hiện có.
- Các quy trình bán, thuê, trả, hư hỏng hoặc thanh toán cần tính toán/ghi sổ thực vẫn không được mô phỏng. Việc hoàn thiện chúng chờ spec, contract và các quyết định P0 tương ứng.

## Data and State Changes

- Không tạo, cập nhật hoặc xóa dữ liệu nghiệp vụ mới trong lát cắt này.
- Không thay đổi dữ liệu người dùng đang điền khi thao tác chưa được backend hỗ trợ.
- Không sửa API contract sinh tự động.

## Acceptance Criteria

- [ ] `bun run build` không còn lỗi TypeScript từ `AuditPage`, `DashboardPage`, `CopyDetailPage`, `TaxDeclarationReportPage` hoặc `BookCopyLifecycleDrawer`.
- [ ] Giá bán/đơn giá thuê thiếu dữ liệu hiển thị theo fallback tiền tệ hiện có, không gây lỗi type/runtime.
- [ ] HTML động của luồng in tem không thể chèn markup/script vào cửa sổ in.
- [ ] Giá trị CSV bắt đầu bằng ký tự công thức được xuất dưới dạng literal an toàn, vẫn giữ nguyên giá trị hiển thị dự kiến.
- [ ] Các biểu mẫu/nút chưa có contract backend không báo thành công giả, không đóng/reset/điều hướng như giao dịch đã hoàn tất và giải thích ngắn gọn cho người dùng.
- [ ] Không thay đổi bố cục, nhãn điều hướng hay quyền truy cập UI hiện có ngoài thông báo/trạng thái cần thiết cho các thao tác chưa hỗ trợ.

## Non-functional Requirements

- Thay đổi phải nhỏ, giới hạn ở frontend và các test/tài liệu SDD liên quan.
- Có regression test cho escape HTML/CSV và các fallback không-thành-công giả khi có cấu trúc test phù hợp.
- Hoàn tất các gate: `bun run test`, `bun run lint`, `bun run build`, `git diff --check`.

## Open Questions

- API đổi mật khẩu, cập nhật hồ sơ và thu hồi phiên thiết bị chưa có trong backend hiện tại; cần contract/spec riêng trước khi bật lại hành vi lưu thật.
- Sale/return/payment/QR và xử lý hư hỏng không thuộc lát cắt này vì phụ thuộc `OQ-003`, `OQ-004`, `OQ-006` và contract backend.
