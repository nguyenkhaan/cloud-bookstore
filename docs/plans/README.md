# Kế hoạch triển khai Old Bookstore

## Mục tiêu

Triển khai hệ thống theo các lát cắt chạy được, gồm dữ liệu, backend, frontend và kiểm thử liên quan. `docs/plans/phase-*.md` là nguồn nội dung kế hoạch; [`todo.md`](./todo.md) chỉ theo dõi trạng thái, owner và evidence. Không tạo bản sao trong `tasks/`.

## Trạng thái

- Tài liệu hoạt động trong `docs/` là nguồn yêu cầu; `docs/legacy/` chỉ dùng để truy nguyên.
- PostgreSQL đã được chấp thuận tại `ADR-001`; ASP.NET Core đã được chấp thuận tại `ADR-002`; cơ chế xác thực vẫn chờ Phase 00.
- Không triển khai vùng bị ảnh hưởng bởi câu hỏi P0 hoặc rule/spec chưa được duyệt.
- Definition of Done chuẩn nằm tại [`requirements/QUALITY.md`](../requirements/QUALITY.md#definition-of-done-cho-triển-khai-sau-này); không duy trì một bản sao khác trong plan.

## Architecture Decisions

| Quyết định | Trạng thái | Ảnh hưởng kế hoạch |
| --- | --- | --- |
| `ADR-001` — PostgreSQL | Accepted | Áp dụng từ Phase 01. |
| [`ADR-002`](../decisions/ADR-002-aspnet-core-backend.md) — ASP.NET Core | Accepted | Là backend chính thức; lệnh backend chuẩn có hiệu lực. |
| `ADR-003` — Xác thực | Chưa tạo; chờ `OQ-002` | Chặn Phase 02. |
| `ADR-004` — Hợp đồng tích hợp | Chưa tạo; chờ `OQ-006`, `OQ-007` | Chặn VietQR/webhook và Zalo. |
| `PDR-001`–`PDR-007` | Accepted | Là ranh giới sản phẩm cho mọi phase. |

## Risks and Mitigations

| Rủi ro | Mức | Giảm thiểu |
| --- | --- | --- |
| Cơ chế xác thực chưa có ADR | Cao | Hoàn tất `ADR-003` trước khi mở Phase 02. |
| Nhiều rule/spec còn `Proposed` | Cao | Mỗi step phải liên kết rule/spec và dừng nếu còn P0. |
| Phase 05 có dependency một phần vào Phase 06 | Trung bình | Tách checkpoint 05A; chỉ hoàn tất 05B sau nền payment. |
| Thông báo phụ thuộc nhiều nguồn sự kiện | Trung bình | Tích hợp outbox tại phase nguồn; Phase 12 chỉ đóng sau Phase 05–11. |
| Cấu hình có phiên bản xuất hiện quá muộn | Cao | Dựng nền đọc/seed cấu hình ở Phase 01; UI quản trị hoàn thiện ở Phase 13. |
| Frontend chưa có test script | Cao | Phase 01 phải thêm unit/component/E2E runner trước feature nghiệp vụ. |
| `DATABASE.txt` chưa phải schema được duyệt | Trung bình | Chỉ tạo migration từ spec/rule/decision đã Accepted. |

## Open Questions

| ID | Mức chặn | Owner cần xác nhận | Phase bị ảnh hưởng |
| --- | --- | --- | --- |
| `OQ-002` | P0 | Tech Lead/Product Owner | 02 |
| `OQ-003`, `OQ-004`, `OQ-006` | P0 | Product Owner/Kế toán/Tech Lead | 06, 08–09 |
| `OQ-005`, `OQ-008`, `OQ-009`, `OQ-011` | P1 | Product Owner/Kế toán | 05–06, 09, 13 |
| `OQ-007`, `OQ-010`, `OQ-014` | P1 | Product Owner/Tech Lead | 11–14 |
| `OQ-012`, `OQ-013` | P2 | Product Owner/Kế toán | 04, 13 |

Chi tiết và trạng thái quyết định được quản lý tại [`OPEN_QUESTIONS.md`](../OPEN_QUESTIONS.md). Các mục tiêu NFR định lượng thuộc `OQ-014`.

## Mẫu step chuẩn

Mỗi step phải là một kết quả dọc có thể hoàn tất trong một phiên tập trung. Không dùng tiêu đề ghép bằng “và”; step L/XL phải tiếp tục tách tới XS/S/M.

```markdown
## Step PXX-SYY — <Kết quả duy nhất>

**Mô tả ngắn:** <Một câu mô tả kết quả.>

**Tham chiếu:** Feature `<ID>`; Rule `<ID>`; Workflow `<ID>`; Decision `<ID/OQ>`.

**Acceptance:**
- [ ] <Điều kiện cụ thể, kiểm thử được.>

**Verification:**
- [ ] `<lệnh cụ thể>` pass.
- [ ] <Kiểm tra E2E hoặc thủ công> pass.

**Dependencies:** `<Step ID>` hoặc `Không`.

**Files:** `<đường dẫn hoặc glob có giới hạn>`.

**Quy mô:** XS | S | M.
```

Quy mô: XS là một file/cấu hình; S là 1–2 file; M là một lát cắt khoảng 3–5 file. L/XL không được đưa vào thực thi khi chưa tách.

## Thứ tự phase

| Phase | Kết quả chính | Phụ thuộc |
| --- | --- | --- |
| [00](./phase-00-chot-yeu-cau-va-quyet-dinh.md) | Chốt P0 và duyệt đầu vào | Không |
| [01](./phase-01-setup-nen-tang.md) | Nền FE–BE–DB, test và config core | 00 |
| [02](./phase-02-tai-khoan-phan-quyen-audit.md) | Auth, RBAC, audit | 01 |
| [03](./phase-03-danh-muc-an-ban-ban-sach.md) | Danh mục, ấn bản, bản vật lý | 02 |
| [04](./phase-04-khach-hang-thanh-vien.md) | Khách hàng và thành viên | 02 |
| [05](./phase-05-nhap-kho-va-thu-mua.md) | Nhập kho và thu mua | 03, 04; checkpoint 05B cần 06.1–06.2 |
| [06](./phase-06-ca-ket-va-thanh-toan.md) | Ca két và payment ledger | 02 |
| [07](./phase-07-ban-sach-tai-quay.md) | Bán tại quầy | 03, 04, 06 |
| [08](./phase-08-thue-sach.md) | Lập phiếu thuê và thu cọc | 03, 04, 06 |
| [09](./phase-09-gia-han-tra-sach.md) | Gia hạn, trả và quyết toán | 08, 06 |
| [10](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Kiểm kê và điều chỉnh | 03, 05A |
| [11](./phase-11-nhan-su-cham-cong-luong.md) | Công và lương theo ca | 02, 06 |
| [12](./phase-12-thong-bao-va-tich-hop.md) | Outbox, adapter và vận hành gửi | 05–11 theo nguồn sự kiện |
| [13](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Quản trị cấu hình, báo cáo và vận hành | 05–12 |
| [14](./phase-14-hardening-uat-phat-hanh.md) | Bảo mật, hiệu năng, UAT, phát hành | 01–13 |

## Dependency graph

```text
Phase 00
└── Phase 01: nền tảng + DB + test + config core
    └── Phase 02: Auth/RBAC/Audit
        ├── Phase 03: Danh mục/Ấn bản/Bản sách ──┐
        ├── Phase 04: Khách hàng/Thành viên ─────┼──> Phase 05A
        └── Phase 06: Ca két/Payment ────────────┴──> Phase 05B
             ├── Phase 07: Bán
             ├── Phase 08: Thuê ──> Phase 09: Gia hạn/Trả
             └── Phase 11: Công/Lương
Phase 03 + Phase 05A ──> Phase 10: Kiểm kê
Phase 05–11 ───────────> Phase 12: Thông báo
Phase 05–12 ───────────> Phase 13: Báo cáo/Vận hành
Phase 01–13 ───────────> Phase 14: Phát hành
```

## Checkpoint chuẩn

Đặt checkpoint sau mỗi 2–3 step và khi kết thúc phase.

```markdown
## Checkpoint CPXX-Y — <Mốc>
- [ ] Backend test pass bằng lệnh chuẩn.
- [ ] Frontend test/lint/build pass bằng lệnh chuẩn.
- [ ] Lát cắt hiện tại chạy end-to-end.
- [ ] Evidence được gắn trong `todo.md`.
- [ ] Người phụ trách kỹ thuật review.
- [ ] Người phụ trách sản phẩm review nếu hành vi nghiệp vụ thay đổi.
```

## Lệnh chuẩn

ASP.NET Core đã được chấp thuận tại `ADR-002`; các lệnh backend dưới đây là lệnh chuẩn của dự án.

| Gate | Lệnh | Trạng thái |
| --- | --- | --- |
| Backend restore | `dotnet restore backend.sln` | Accepted |
| Backend build | `dotnet build backend.sln --no-restore` | Accepted |
| Backend test | `dotnet test backend.sln --no-build` | Accepted |
| Backend run | `dotnet run --project app/backend/backend.csproj` | Accepted |
| Frontend install | `cd app/frontend && bun install --frozen-lockfile` | Current |
| Frontend lint | `cd app/frontend && bun run lint` | Current |
| Frontend build | `cd app/frontend && bun run build` | Current |
| Frontend run | `cd app/frontend && bun run dev` | Current |
| Frontend test | Chờ Phase 01 thêm script | Blocked |
| End-to-end test | Chờ Phase 01 chọn runner và thêm script | Blocked |

## Quy tắc hoàn tất

- Step chỉ được `DONE` khi acceptance, verification và Definition of Done đều đạt.
- Không chuyển phase nếu còn lỗi dữ liệu, quyền hoặc tài chính chưa xử lý.
- Không chạy song song hai step thay đổi cùng schema khi contract chưa ổn định.
- Phase 05A có thể song song Phase 06; Phase 05B chỉ bắt đầu sau `P06-S02`.
- Mọi thay đổi hành vi phải cập nhật spec/decision trước code.

