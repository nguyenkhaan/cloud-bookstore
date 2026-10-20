# Kế hoạch triển khai Old Bookstore

## Mục tiêu

Triển khai hệ thống từ nền tảng ban đầu đến khi sẵn sàng nghiệm thu. Mỗi phase tạo ra một lát cắt chạy được, gồm dữ liệu, backend, frontend và kiểm thử liên quan; không làm toàn bộ backend rồi mới làm frontend.

## Trạng thái và giả định

- Bộ kế hoạch này dựa trên tài liệu đang hoạt động trong `docs/`; `docs/legacy/` chỉ dùng để truy nguyên.
- PostgreSQL đã được chấp thuận. React hiện có được giữ làm frontend.
- Backend và cơ chế xác thực chưa được chốt; Phase 00 phải giải quyết trước khi dựng nền kỹ thuật.
- Các quy tắc còn `Proposed` và câu hỏi P0 phải được duyệt trước khi code vùng bị ảnh hưởng.
- Yêu cầu hiện tại đặt plan trong `docs/plans/`, dù `docs/CONTENT.md` và quy ước SDD cũ đang ghi plan ở `tasks/`. Không tạo bản sao ở hai nơi để tránh lệch nội dung.

## Cách thực hiện mỗi step

1. Đọc feature ID, business rule, workflow và decision được tham chiếu.
2. Viết hoặc duyệt feature spec trong `docs/specs/`.
3. Viết test cho hành vi quan trọng và nhánh lỗi.
4. Làm backend và frontend của cùng lát cắt.
5. Chạy test, lint, build và kiểm tra thủ công.
6. Chỉ đánh dấu hoàn tất khi đạt acceptance criteria.

## Thứ tự phase

| Phase | Kết quả chính | Phụ thuộc |
| --- | --- | --- |
| [00](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chốt P0, duyệt đặc tả cấp dự án | Không |
| [01](./phase-01-setup-nen-tang.md) | Dựng project, test, DB, khung UI/API | 00 |
| [02](./phase-02-tai-khoan-phan-quyen-audit.md) | Đăng nhập nội bộ, ba vai trò, audit | 01 |
| [03](./phase-03-danh-muc-an-ban-ban-sach.md) | Quản lý đầu sách, ấn bản, bản vật lý | 02 |
| [04](./phase-04-khach-hang-thanh-vien.md) | Hồ sơ khách và hạng thành viên | 02 |
| [05](./phase-05-nhap-kho-va-thu-mua.md) | Nhà cung cấp, nhập kho, thu mua | 03, 04; bước chi tiền cần 06 |
| [06](./phase-06-ca-ket-va-thanh-toan.md) | Ca két, tiền mặt, VietQR, đối soát | 02 |
| [07](./phase-07-ban-sach-tai-quay.md) | Luồng bán hoàn chỉnh tại quầy | 03, 04, 06 |
| [08](./phase-08-thue-sach.md) | Lập phiếu thuê và thu cọc | 03, 04, 06 |
| [09](./phase-09-gia-han-tra-sach.md) | Gia hạn, trả và quyết toán | 08 |
| [10](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Kiểm kê, duyệt chênh lệch, cảnh báo tồn | 03, 05 |
| [11](./phase-11-nhan-su-cham-cong-luong.md) | Công và lương theo ca | 02, 06 |
| [12](./phase-12-thong-bao-va-tich-hop.md) | Outbox, Zalo/email, giám sát tích hợp | 07, 09 |
| [13](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Cấu hình, báo cáo, xuất file, health | 07–12 |
| [14](./phase-14-hardening-uat-phat-hanh.md) | Bảo mật, hiệu năng, UAT, phát hành | 01–13 |

## Dependency chính

```text
Quyết định P0
└── Nền tảng + DB + test
    ├── Auth/RBAC/Audit
    │   ├── Danh mục/Ấn bản/Bản sách
    │   │   ├── Nhập kho/Thu mua
    │   │   ├── Bán ───────────────┐
    │   │   ├── Thuê → Trả         ├── Thông báo/Báo cáo
    │   │   └── Kiểm kê            │
    │   ├── Khách hàng/Thành viên ─┤
    │   └── Ca két/Thanh toán ─────┤
    └── Nhân sự/Công/Lương ────────┘
```

## Quy tắc checkpoint

- Sau mỗi 2–3 step: toàn bộ test hiện có phải pass; frontend build/lint và backend build/test phải pass.
- Không chuyển phase nếu còn lỗi dữ liệu, quyền hoặc giao dịch tài chính.
- Có thể song song các phase độc lập sau khi API contract và migration dùng chung đã ổn định; không chạy song song hai thay đổi trên cùng schema.
- Phase 05 Step 1–3 có thể làm song song với Phase 06; Phase 05 Step 4 và checkpoint chỉ hoàn tất sau nền thanh toán của Phase 06.

## Điểm cần sửa trong tài liệu trước khi code

- `OPEN_QUESTIONS.md` hiện đánh số tới `OQ-014`, nhưng `VISION.md`, `NON_FUNCTIONAL.md` và `QUALITY.md` tham chiếu `OQ-015`.
- `PROJECT_SPEC.md` và nhiều requirement vẫn là `Proposed`.
- `DATABASE.txt` là mô hình định hướng, chưa có đủ khóa ngoại/check constraint và còn một số điểm cần đối chiếu với rule đã chốt.

