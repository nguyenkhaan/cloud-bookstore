# Plan: EDITION-001 / BOOK-001 — CRUD trang chi tiết

1. Đồng bộ backend: dòng phiếu nhập khả dụng, xóa bản vật lý có kiểm tra tham chiếu, sửa ghi chú khi giao dịch còn hiệu lực. Kiểm chứng bằng test backend.
2. Nối frontend service/hook và contract OpenAPI; sửa form tạo theo dữ liệu thực, upload ảnh đúng owner type.
3. Bổ sung sửa/xóa/ngừng sử dụng tại trang chi tiết, che thao tác theo quyền, hiển thị ảnh kế thừa. Kiểm chứng qua test, lint, build và browser nếu chạy được.
4. Rà soát UI thừa, cập nhật `docs/plans/todo.md` bằng bằng chứng.

Rủi ro: môi trường local có thể thiếu phiếu nhập hoặc Cloudinary, nên cần trạng thái rỗng/lỗi rõ ràng và không giả lập thành công.
