# Theo dõi thực thi kế hoạch

File này chỉ theo dõi trạng thái, owner và evidence. Nội dung acceptance, verification, dependency và files nằm trong các file phase tương ứng.

## Quy ước

- Trạng thái: `TODO`, `BLOCKED`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`.
- Chỉ chuyển `DONE` khi checkpoint liên quan và Definition of Done đều đạt.
- Owner phải là một người cụ thể trước khi chuyển `IN_PROGRESS`.
- Evidence là liên kết PR, CI, biên bản review hoặc kết quả UAT.

## Việc cần xử lý trước khi triển khai

| ID | Việc | Owner | Trạng thái | Evidence |
| --- | --- | --- | --- | --- |
| DOC-001 | Duyệt cách dùng `docs/plans/` làm nguồn plan duy nhất | Chưa gán | TODO | — |
| DOC-002 | Duyệt `OQ-014` làm nguồn cho mục tiêu NFR định lượng | Chưa gán | TODO | — |
| ADR-002 | Ghi nhận ASP.NET Core là backend chính thức | Chưa gán | DONE | [`ADR-002`](../decisions/ADR-002-aspnet-core-backend.md) |
| CMD-001 | Chuyển lệnh backend chuẩn sang `Accepted` | Chưa gán | DONE | [`ADR-002`](../decisions/ADR-002-aspnet-core-backend.md) |
| TEST-001 | Thêm script test frontend | Chưa gán | TODO | — |
| TEST-002 | Thêm script E2E | Chưa gán | TODO | — |

## Tiến độ phase

| Phase | Owner | Trạng thái | Phụ thuộc | Checkpoint cuối | Evidence |
| --- | --- | --- | --- | --- | --- |
| 00 | Chưa gán | TODO | Không | `CP00-B` | — |
| 01 | Chưa gán | BLOCKED | 00 | `CP01-B` | — |
| 02 | Chưa gán | BLOCKED | 01 | `CP02-B` | — |
| 03 | Chưa gán | BLOCKED | 02 | `CP03-B` | — |
| 04 | Chưa gán | BLOCKED | 02 | `CP04-B` | — |
| 05 | Chưa gán | BLOCKED | 03, 04, 06.1–06.2 | `CP05-B` | — |
| 06 | Chưa gán | BLOCKED | 02 | `CP06-B` | — |
| 07 | Chưa gán | BLOCKED | 03, 04, 06 | `CP07-B` | — |
| 08 | Chưa gán | BLOCKED | 03, 04, 06 | `CP08-B` | — |
| 09 | Chưa gán | BLOCKED | 08, 06 | `CP09-B` | — |
| 10 | Chưa gán | BLOCKED | 03, 05A | `CP10-B` | — |
| 11 | Chưa gán | BLOCKED | 02, 06 | `CP11-B` | — |
| 12 | Chưa gán | BLOCKED | 05–11 | `CP12-B` | — |
| 13 | Chưa gán | BLOCKED | 05–12 | `CP13-C` | — |
| 14 | Chưa gán | BLOCKED | 01–13 | `CP14-C` | — |

## Checklist step

| ID | Step | Owner | Trạng thái | Evidence |
| --- | --- | --- | --- | --- |
| `P00-S01` | [Chốt cơ chế xác thực](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chưa gán | BLOCKED | `OQ-002` |
| `P00-S02` | [Chốt chính sách tài chính thuê](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chưa gán | TODO | — |
| `P00-S03` | [Chốt phạm vi tích hợp](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chưa gán | TODO | — |
| `P00-S04` | [Duyệt đầu vào triển khai](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chưa gán | TODO | — |
| `P01-S01` | [Chuẩn hóa môi trường local](./phase-01-setup-nen-tang.md) | Chưa gán | TODO | — |
| `P01-S02` | [Dựng nền backend](./phase-01-setup-nen-tang.md) | Chưa gán | TODO | — |
| `P01-S03` | [Dựng nền frontend](./phase-01-setup-nen-tang.md) | Chưa gán | TODO | — |
| `P01-S04` | [Thiết lập cổng chất lượng](./phase-01-setup-nen-tang.md) | Chưa gán | TODO | — |
| `P02-S01` | [Quản trị email nội bộ](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | TODO | — |
| `P02-S02` | [Đăng ký bằng OTP](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | TODO | — |
| `P02-S03` | [Quản lý vòng đời phiên](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | TODO | — |
| `P02-S04` | [Thực thi RBAC có audit](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | TODO | — |
| `P03-S01` | [Quản lý phân cấp danh mục](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | TODO | — |
| `P03-S02` | [Tra cứu ấn bản bằng ISBN](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | TODO | — |
| `P03-S03` | [Quản lý bản vật lý](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | TODO | — |
| `P03-S04` | [Tra cứu chi tiết bản sách](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | TODO | — |
| `P04-S01` | [Quản lý hồ sơ khách](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | TODO | — |
| `P04-S02` | [Tính chính sách thành viên](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | TODO | — |
| `P04-S03` | [Tra cứu nghĩa vụ khách](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | TODO | — |
| `P04-S04` | [Xử lý yêu cầu khách hàng](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | TODO | — |
| `P05-S01` | [Lập phiếu nhập nháp](./phase-05-nhap-kho-va-thu-mua.md) | Chưa gán | TODO | — |
| `P05-S02` | [Hoàn tất phiếu nhập](./phase-05-nhap-kho-va-thu-mua.md) | Chưa gán | TODO | — |
| `P05-S03` | [Lập phiếu thu mua](./phase-05-nhap-kho-va-thu-mua.md) | Chưa gán | TODO | — |
| `P05-S04` | [Hoàn tất thu mua](./phase-05-nhap-kho-va-thu-mua.md) | Chưa gán | TODO | — |
| `P06-S01` | [Mở ca két](./phase-06-ca-ket-va-thanh-toan.md) | Chưa gán | TODO | — |
| `P06-S02` | [Ghi payment ledger](./phase-06-ca-ket-va-thanh-toan.md) | Chưa gán | TODO | — |
| `P06-S03` | [Xử lý VietQR/webhook](./phase-06-ca-ket-va-thanh-toan.md) | Chưa gán | TODO | — |
| `P06-S04` | [Đóng ca két](./phase-06-ca-ket-va-thanh-toan.md) | Chưa gán | TODO | — |
| `P07-S01` | [Lập hóa đơn nháp](./phase-07-ban-sach-tai-quay.md) | Chưa gán | TODO | — |
| `P07-S02` | [Tính giá thành viên](./phase-07-ban-sach-tai-quay.md) | Chưa gán | TODO | — |
| `P07-S03` | [Hoàn tất thanh toán bán](./phase-07-ban-sach-tai-quay.md) | Chưa gán | TODO | — |
| `P07-S04` | [Đảo giao dịch quét nhầm](./phase-07-ban-sach-tai-quay.md) | Chưa gán | TODO | — |
| `P08-S01` | [Kiểm tra điều kiện thuê](./phase-08-thue-sach.md) | Chưa gán | TODO | — |
| `P08-S02` | [Khóa bản cho phiếu thuê](./phase-08-thue-sach.md) | Chưa gán | TODO | — |
| `P08-S03` | [Thu cọc](./phase-08-thue-sach.md) | Chưa gán | TODO | — |
| `P08-S04` | [Phát hành chứng từ thuê](./phase-08-thue-sach.md) | Chưa gán | TODO | — |
| `P09-S01` | [Gia hạn tại quầy](./phase-09-gia-han-tra-sach.md) | Chưa gán | TODO | — |
| `P09-S02` | [Tiếp nhận trả toàn bộ](./phase-09-gia-han-tra-sach.md) | Chưa gán | TODO | — |
| `P09-S03` | [Tính nghĩa vụ trả](./phase-09-gia-han-tra-sach.md) | Chưa gán | TODO | — |
| `P09-S04` | [Đóng phiếu thuê](./phase-09-gia-han-tra-sach.md) | Chưa gán | TODO | — |
| `P10-S01` | [Điều chỉnh tồn thông thường](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Chưa gán | TODO | — |
| `P10-S02` | [Quét kiểm kê](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Chưa gán | TODO | — |
| `P10-S03` | [Duyệt chênh lệch](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Chưa gán | TODO | — |
| `P10-S04` | [Theo dõi cảnh báo tồn](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Chưa gán | TODO | — |
| `P11-S01` | [Lập bản ghi ca](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S02` | [Ghi nhận chấm công](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S03` | [Duyệt điều chỉnh công](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S04` | [Thanh toán lương ca](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P12-S01` | [Ghi outbox nghiệp vụ](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S02` | [Gửi qua adapter](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S03` | [Retry thông báo](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S04` | [Quan sát tích hợp](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P13-S01` | [Quản trị cấu hình phiên bản](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S02` | [Báo cáo nghiệp vụ](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S03` | [Báo cáo tài chính nội bộ](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S04` | [Xuất dữ liệu thuế](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S05` | [Diễn tập vận hành](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P14-S01` | [Rà soát security/privacy](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S02` | [Kiểm thử hiệu năng](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S03` | [Chạy regression](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S04` | [Nghiệm thu tại quầy](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S05` | [Phát hành production](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
