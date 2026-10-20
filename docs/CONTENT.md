# Mục lục tài liệu

Thư mục `docs/` là nguồn sự thật cho phạm vi, quy tắc nghiệp vụ và các quyết định của dự án Old Bookstore. Tài liệu cũ chỉ còn giá trị tham khảo lịch sử và không được dùng trực tiếp để triển khai.

## Thứ tự ưu tiên khi có mâu thuẫn

1. Quyết định có trạng thái `Accepted` trong [`decisions/`](./decisions/README.md).
2. Phạm vi và ranh giới trong [`PROJECT_SPEC.md`](./PROJECT_SPEC.md).
3. Quy tắc và luồng nghiệp vụ trong [`requirements/`](./requirements/BUSINESS_RULES.md).
4. Danh mục chức năng trong [`FEATURE.md`](./FEATURE.md).
5. Tài liệu kiến trúc và hướng dẫn.
6. Tài liệu trong [`legacy/`](./legacy/README.md) chỉ dùng để truy nguyên, không phải nguồn yêu cầu.

Nếu hai tài liệu đang hoạt động mâu thuẫn, dừng triển khai phần liên quan, tạo hoặc cập nhật decision record, rồi đồng bộ lại các tài liệu bị ảnh hưởng.

## Cây tài liệu

```text
docs/
├── CONTENT.md                         # Mục lục và quy tắc sử dụng tài liệu
├── FEATURE.md                         # Danh mục chức năng thuộc phạm vi sản phẩm
├── PROJECT_SPEC.md                    # Đặc tả cấp dự án cho quy trình SDD
├── OPEN_QUESTIONS.md                  # Các quyết định còn thiếu, không được tự suy đoán
├── product/
│   ├── VISION.md                      # Vấn đề, mục tiêu và thước đo thành công
│   ├── SCOPE.md                       # Trong/ngoài phạm vi và giả định
│   ├── ROLES.md                       # Ba vai trò và ranh giới quyền hạn
│   └── GLOSSARY.md                    # Thuật ngữ nghiệp vụ thống nhất
├── requirements/
│   ├── BUSINESS_RULES.md              # Quy tắc nghiệp vụ chuẩn
│   ├── WORKFLOWS.md                   # Luồng chính và nhánh lỗi
│   ├── NON_FUNCTIONAL.md              # Bảo mật, toàn vẹn, hiệu năng, vận hành
│   └── QUALITY.md                     # Chiến lược kiểm thử và cổng nghiệm thu
├── architecture/
│   ├── SYSTEM_CONTEXT.md              # Biên hệ thống và tích hợp bên ngoài
│   └── DOMAIN_MODEL.md                # Đầu sách, ấn bản và bản vật lý
├── decisions/
│   ├── README.md                      # Vòng đời và mẫu decision record
│   ├── PDR-*.md                       # Các quyết định sản phẩm đã được chấp thuận
│   └── ADR-*.md                       # Các quyết định kiến trúc đã được chấp thuận
├── specs/
│   └── README.md                      # Quy ước cho đặc tả tính năng ở bước sau
├── guides/
│   └── SDD_WORKFLOW.md                # Cách duy trì tài liệu theo SDD
└── legacy/
    ├── README.md                      # Cảnh báo và nguồn gốc tài liệu cũ
    ├── documents/                     # PRD/yêu cầu cũ, có thể mâu thuẫn
    └── meetings/                      # Biên bản cũ
```

## Điểm bắt đầu theo nhu cầu

| Nhu cầu | Đọc tài liệu |
| --- | --- |
| Hiểu sản phẩm và phạm vi | [`product/VISION.md`](./product/VISION.md), [`product/SCOPE.md`](./product/SCOPE.md) |
| Xem toàn bộ chức năng | [`FEATURE.md`](./FEATURE.md) |
| Triển khai một quy tắc nghiệp vụ | [`requirements/BUSINESS_RULES.md`](./requirements/BUSINESS_RULES.md), [`requirements/WORKFLOWS.md`](./requirements/WORKFLOWS.md) |
| Kiểm tra quyền | [`product/ROLES.md`](./product/ROLES.md) |
| Hiểu mô hình sách và mã định danh | [`architecture/DOMAIN_MODEL.md`](./architecture/DOMAIN_MODEL.md) |
| Thiết kế tích hợp | [`architecture/SYSTEM_CONTEXT.md`](./architecture/SYSTEM_CONTEXT.md), [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md) |
| Viết đặc tả tính năng | [`specs/README.md`](./specs/README.md) |
| Hiểu lý do của một quyết định | [`decisions/README.md`](./decisions/README.md) |

## Trạng thái tài liệu

- `Accepted`: đã được xác nhận và có thể dùng làm đầu vào triển khai.
- `Proposed`: phương án đề xuất, cần được duyệt trước khi triển khai.
- `Open`: chưa có quyết định; không được tự chọn giá trị mặc định có ảnh hưởng nghiệp vụ.
- `Superseded`: đã được quyết định mới thay thế; chỉ giữ để truy nguyên.

## Nguyên tắc cập nhật

1. Thay đổi quyết định trước, rồi mới cập nhật đặc tả và danh mục chức năng.
2. Mỗi đặc tả tính năng phải liên kết tới feature ID và business rule ID liên quan.
3. Quy tắc tài chính, phân quyền và chuyển trạng thái phải có tiêu chí kiểm thử.
4. Không sao chép nội dung từ `legacy/` vào tài liệu hoạt động nếu chưa đối chiếu xung đột.
5. Không ghi implementation plan trong `docs/`; plan và task chỉ được tạo ở giai đoạn SDD tiếp theo sau khi đặc tả được duyệt.
