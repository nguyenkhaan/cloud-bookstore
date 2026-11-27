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
| 02 | Chưa gán | IN_PROGRESS | 01 | `CP02-B` | AUTH-001 (xem các dòng `AUTH-001-T*`); `dotnet test backend.sln`: 35 passed; `bun run test`: 43 passed (2026-11-06) |
| 03 | Chưa gán | IN_PROGRESS | 02 | `CP03-B` | PR #21, #24, #25; `dotnet test backend.sln`: 35 passed; `bun run test`: 43 passed (2026-11-06) |
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
| `P02-S01` | [Quản trị email nội bộ](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | IN_PROGRESS | Admin đã seed (`data.json`). Còn: API/FE quản lý email được phép, khóa/mở khóa, bảo vệ Admin gốc; đăng ký hiện lọc theo tên miền email |
| `P02-S02` | [Đăng ký và xác minh qua email](./phase-02-tai-khoan-phan-quyen-audit.md) | Codex | IN_REVIEW | `AUTH-003`: Kiểm tra mật khẩu Unicode đồng nhất khi đăng ký, đặt lại và đổi mật khẩu; kiểm thử PostgreSQL xác nhận lỗi SMTP không xóa liên kết mới hơn và lỗi dọn dữ liệu vẫn trả `204`. |
| `P02-S03` | [Quản lý vòng đời phiên](./phase-02-tai-khoan-phan-quyen-audit.md) | Codex | IN_REVIEW | `AUTH-004`: Kiểm thử thu hồi từng khóa Redis, thử lại `DELETE` và xoay vòng sau khi khóa access hết hạn. 50/50 kiểm thử API và 38/38 Chromium đều đạt; OpenAPI khớp contract. Còn lỗi toàn kho có sẵn ở xuất kho, chấm công và build HR; chưa xác minh tải ảnh thành công trên Cloudinary thật. |
| `P02-S04` | [Thực thi RBAC có audit](./phase-02-tai-khoan-phan-quyen-audit.md) | Chưa gán | IN_PROGRESS | API đổi vai trò có audit + `GET /api/audit-logs` (Admin). Còn: chặn hạ quyền Admin gốc, FE đổi vai trò/tra cứu audit, test ma trận RBAC |
| `AUTH-001-T01` | [Thiết lập test backend](./AUTH-001-browser-cookie-session.md#task-auth-001-t01-thiết-lập-bề-mặt-test-backend-không-ghi-đè-file-untracked) | Codex | DONE | `dotnet test backend.sln --no-build --no-restore`: 16 passed |
| `AUTH-001-T02` | [Nền cookie, CSRF và token source](./AUTH-001-browser-cookie-session.md#task-auth-001-t02-dựng-nền-cookie-csrf-và-chọn-nguồn-access-token) | Codex | DONE | Cookie/CSRF/Origin unit tests; backend temporary build passed |
| `AUTH-001-T03` | [Contract login/session/refresh/logout](./AUTH-001-browser-cookie-session.md#task-auth-001-t03-chuyển-loginsessionrefresh-và-logout-sang-contract-cookie) | Codex | IN_REVIEW | Local OpenAPI verified; browser login flow still needs environment-backed UAT |
| `AUTH-001-T04` | [Axios credential và CSRF memory state](./AUTH-001-browser-cookie-session.md#task-auth-001-t04-chuyển-axios-sang-credentialed-request-và-csrf-memory-state) | Codex | DONE | `bun run test`, `bun run lint`, `bun run build` passed |
| `AUTH-001-T05` | [Session in-memory và route guard](./AUTH-001-browser-cookie-session.md#task-auth-001-t05-chuyển-authprovider-và-route-guard-sang-session-in-memory) | Codex | IN_REVIEW | Session/storage/route tests passed; browser UAT still required |
| `AUTH-001-T06` | [Contract regeneration và regression](./AUTH-001-browser-cookie-session.md#task-auth-001-t06-regenerate-contract-và-chạy-regression-liên-tầng) | Codex | IN_REVIEW | OpenAPI regenerated; backend 16 tests and frontend 34 tests passed |
| `AUD-001-T01`–`T04` | [Ổn định P1 frontend sau audit](./AUD-001-frontend-p1-stabilization.md) | Codex | DONE | Đã xóa 9 blocker TypeScript; `formatVnd` nhận fallback `null` cho giá thiếu; print HTML và CSV tem escape/neutralize dữ liệu không tin cậy; thao tác account chưa có API giữ input và báo lỗi thay vì completion giả. `bun run test`: 248/248; `bun run lint`: exit 0 (17 warnings ngoài phạm vi); `bun run build`: pass (chỉ Vite bundle warning); `git diff --check`: pass. POS/thuê/trả/payment vẫn ngoài scope do thiếu contract và P0. |
| `RBAC-FE-T01` | [Role chuẩn hóa và session cache fail-closed](./RBAC-002-frontend-screen-access-enforcement.md#task-1-normalize-role-and-make-session-storage-fail-closed) | Codex | DONE | Commit `84c0f9c`; focused role/session tests: 18 passed; unknown/malformed cache and `previewRole` escalation covered. |
| `RBAC-FE-T02` | [Screen-policy catalog và resolver thuần](./RBAC-002-frontend-screen-access-enforcement.md#task-2-build-the-pure-screen-policy-catalog) | Codex | DONE | Commit `c5e3179`; matrix/policy tests: 4 passed; canonical and child screens plus fail-closed defaults covered. |
| `RBAC-FE-T03` | [Permission-aware screen access hook](./RBAC-002-frontend-screen-access-enforcement.md#task-3-combine-baseline-access-with-live-permissions) | Codex | DONE | Commit `eee1d17`; focused hook/dynamic-permission tests: 6 passed; loading/error/revoke/protected ceilings covered. |
| `RBAC-FE-T04` | [`RoleGuard.tsx` và bảo vệ routes](./RBAC-002-frontend-screen-access-enforcement.md#task-4-add-roleguard-and-protect-every-application-route) | Codex | DONE | Commit `dde3abe`; focused route/guard tests: 22 passed; canonical and alias routes use shared 403 boundary. |
| `RBAC-FE-T05` | [Sidebar/workspace navigation dùng chung policy](./RBAC-002-frontend-screen-access-enforcement.md#task-5-drive-sidebar-and-workspace-navigation-from-the-shared-policy) | Codex | DONE | Commit `488e221`; focused navigation tests: 10 passed; top-level/HR children derive from policy and unreadable destinations fail closed. |
| `RBAC-FE-T06` | [Child policy cho POS, Approvals và Settings](./RBAC-002-frontend-screen-access-enforcement.md#task-6-enforce-child-policies-in-pos-approvals-and-settings) | Codex | DONE | Commit `38013ff`; focused tab/query tests: 38 passed; Inventory POS buyback-only, Cashier approval query disabled, non-Admin Settings restricted. |
| `RBAC-FE-T07` | [Action visibility và read-only business screens](./RBAC-002-frontend-screen-access-enforcement.md#task-7-enforce-read-only-and-update-actions-across-business-pages) | Codex | DONE | Commit `9ceb33c`; focused action/Settings tests: 21 passed; screen update ceiling and exact API permissions gate mutations. |
| `RBAC-FE-T08` | [HR self-scope và approval ownership](./RBAC-002-frontend-screen-access-enforcement.md#task-8-enforce-hr-self-routes-and-approval-ownership-ui) | Codex | DONE | Commit `337eabb`; focused HR/approval tests: 42 passed; no preview-role elevation, payslip self-scope, stable actor-ID ownership. |
| `RBAC-FE-T09` | [Regression gate và three-account UAT handoff](./RBAC-002-frontend-screen-access-enforcement.md#task-9-run-regression-gates-and-hand-off-three-account-uat) | Codex | IN_REVIEW | Catalog title access now uses backend permission `BookTitles.GetTitles`; unreadable catalog tabs are omitted from navigation. Sau `AUD-001`, `bun run test`: 248/248; `bun run lint`: exit 0 với 17 warnings ngoài phạm vi; `bun run build`: pass (Vite bundle warning); `git diff --check`: pass. Manual Admin/Cashier/Inventory UAT is pending user execution; backend authorization/data-scope remains deferred. |
| `RBAC-FE-T10` | [Route integrity và workspace navigation dùng chung registry](./RBAC-002-route-integrity.md#task-1-centralize-workspace-route-ownership-and-add-regression-coverage) | Codex | IN_REVIEW | Routing/sidebar focused tests pass (32/32), gồm prototype-key fail-closed và metadata Sidebar dùng chung registry; full frontend suite 250/251, còn 1 failure do copy HR đã bị thay đổi local; lint exit 0 với warnings; build còn 2 lỗi import HR không dùng từ thay đổi local; `git diff --check` pass. |
| `RBAC-CANON-T01` | [Canonical role identifiers — SSOT](./RBAC-002-canonical-role-identifiers.md#t1--correct-the-authoritative-role-vocabulary) | Codex | DONE | Commit `3503267`; PDR-008 makes `ADMIN`, `CASHIER`, `INVENTORY_MANAGER` the sole canonical authorization identifiers. |
| `RBAC-CANON-T02` | [Canonical role identifiers — frontend boundary](./RBAC-002-canonical-role-identifiers.md#t2--enforce-strict-frontend-normalization-and-labels) | Codex | DONE | Commit `e273ace`; TDD focused role/session, access and sidebar suites: 12 passed. Legacy aliases are rejected at the frontend boundary. |
| `RBAC-CANON-T03` | [Canonical role identifiers — sweep and verification](./RBAC-002-canonical-role-identifiers.md#task-3-sweep-role-naming-and-verify-the-unchanged-matrix) | Codex | DONE | Current role copy/docs and matrix expectation use Admin/Cashier/Inventory labels. Full frontend tests pass; lint exits 0 with existing warnings; `git diff --check` passes. Build remains blocked solely by the pre-existing nine TS errors recorded in the canonical-role plan (Audit/Catalog/Dashboard/Reports). |
| `P03-S01` | [Quản lý phân cấp danh mục](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | IN_PROGRESS | BE CRUD/status/xóa có ràng buộc xong; FE danh sách/form xong. Còn: chế độ chỉ xem theo vai trò, test quan hệ/quyền, E2E |
| `CAT-001-UI-01` | [UI action trên Book Card](./CAT-001-series-card-actions-ui.md) | Codex | IN_REVIEW | Đã nối cập nhật tên/mô tả (`PUT`), trạng thái (`PATCH /status`), thay ảnh signed direct upload → Cloudinary → `PUT /image`, và xóa có xác nhận qua `DELETE /api/book-series/{id}`. Xóa là single-flight, hiển thị “Đang xóa…”, đóng dialog khi thành công và giữ dialog kèm lỗi backend khi thất bại; không gọi API xóa ảnh. `bun run test`: 71/71 pass; `bun run lint`: exit 0, 7 cảnh báo ngoài phạm vi; `bun run build`: bị chặn bởi 7 TS6133 ngoài phạm vi tại `Header`, `CenterLayout`, `SplitLayout`, `CatalogWorkspace`. |
| `CAT-001-UI-02` | [Xóa Đầu sách từ dòng danh sách](./CAT-001-title-row-actions-ui.md) | Codex | IN_REVIEW | Đã thêm `TitleRowDeleteAction`: icon thùng rác + `ConfirmationDialog` + `DELETE /api/book-titles/{id}` qua mutation hiện có. `node --test tests/catalog-title-row-delete.test.mjs`: 1/1 pass; `bun run lint`: exit 0, 7 cảnh báo ngoài phạm vi; `bun run build`: bị chặn bởi 7 TS6133 có sẵn ngoài phạm vi tại `Header`, `CenterLayout`, `SplitLayout`, `CatalogWorkspace`. |
| `CAT-001-UI-03` | [Hiệu ứng bìa lật cho dòng Đầu sách](./CAT-001-title-cover-flip-ui.md) | Codex | IN_REVIEW | `TitleCoverStack` lật 62° khi hover/focus-within, có lớp trang tạo độ dày và reduced-motion; `node --test tests/catalog-series-cover.test.mjs`: 10/10 pass; `bun run lint`: exit 0, 7 cảnh báo ngoài phạm vi; `bun run build`: bị chặn bởi 7 TS6133 có sẵn ngoài phạm vi tại `Header`, `CenterLayout`, `SplitLayout`, `CatalogWorkspace`. |
| `P03-S02` | [Tra cứu ấn bản bằng ISBN](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | IN_PROGRESS | ISBN tùy chọn, không unique; FE nhập thủ công. Còn: adapter Google Books/Open Library (INT-BOOK-001), chọn ứng viên, test |
| `EDITION-001-BOOK-001-UI` | [CRUD chi tiết ấn bản và bản vật lý](./EDITION-001-BOOK-001-detail-crud.md) | Codex | IN_REVIEW | Đã nối tạo/sửa/xóa/ngừng sử dụng, chọn dòng phiếu nhập còn số lượng, barcode tự sinh và signed upload hai cấp; ảnh bản vật lý kế thừa ảnh ấn bản. Xóa bản có giao dịch/kiểm kê bị chặn; bản đang thuê/bán chỉ sửa ghi chú/ảnh. Browser mock kiểm tra Admin/Cashier và 390/768/1440 px; chưa chạy E2E với DB/Cloudinary thật. `dotnet build backend.sln --no-restore`: 0 warning/error; `dotnet test backend.sln --no-restore`: 50/50; `bun run test`: 73/73; `bun run lint`: pass; `bun run build`: pass, có cảnh báo bundle >500 kB. |
| `P03-S03` | [Quản lý bản vật lý](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | IN_PROGRESS | BE barcode/Grade/giá/kênh/trạng thái/audit/in tem xong (PR #21). Còn: UI lịch sử + in tem, constraint test `AVAILABLE`, E2E |
| `P03-S04` | [Tra cứu chi tiết bản sách](./phase-03-danh-muc-an-ban-ban-sach.md) | Chưa gán | IN_PROGRESS | BE tìm kiếm phân trang + `by-barcode` xong. Còn: UI quét CopyBarcode/ISBN, test không lẫn bản cùng ISBN, E2E |
| `P04-S01` | [Quản lý hồ sơ khách](./phase-04-khach-hang-thanh-vien.md) | Orca Coordinator / SDD v2.0 | DONE | Đã hoàn thiện toàn diện: Export CSV (UTF-8 BOM) & Excel (.xlsx), sửa màu nút Thêm khách hàng, tinh gọn combobox SelectBox, lược bỏ mã debug/dữ liệu giả, hoàn thành trang chi tiết Hồ sơ 360° (`SCR-CRM-02`) tại `/customers/:id` kèm EditCustomerDialog và toggle chặn thuê sách. Kiểm thử đa viewport và visual UX/UI (13 screenshots): `dotnet test backend.sln`: 149/149 pass; `bun run test`: 109/109 pass; `oxlint`: 0 errors; `bun run build`: pass; E2E Playwright: 17/17 pass; Reviewer VERDICT: SHIP (`6336f86`, `4dfc9de`). |
| `P04-S02` | [Tính chính sách thành viên](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | TODO | — |
| `P04-S03` | [Tra cứu nghĩa vụ khách](./phase-04-khach-hang-thanh-vien.md) | Chưa gán | IN_REVIEW | Spec `CUS-003` (Draft, chờ duyệt). BE: `CustomerHistoryService` + 5 GET `/api/customers/{id}/history/*`; FE: 4 tab + filter + 3 thẻ tóm tắt. Còn: E2E, trang chứng từ nguồn (phase 07–09), ghi `EligibleSpend` (phase 07/09). Gắn kết quả `dotnet test` / `bun run test` / `lint` / `build` khi chạy xong. |
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
| `P10-S03` | [Duyệt chênh lệch & Ngoại lệ SCR-APP-01](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Antigravity / Codex | IN_REVIEW | Spec: [`INV-005-inventory-adjustment-requests.md`](../specs/INV-005-inventory-adjustment-requests.md); `SCR-APP-01` hoàn thiện 4 tab nghiệp vụ (Giá thu mua, Phạt hư hỏng, Điều chỉnh tồn kho, Xuất hủy/Đảo hóa đơn) kèm 4 StatCards, filter, drawer chi tiết, duyệt/từ chối bảo vệ RBAC Admin; Backend: `dotnet test backend.sln`: 178/178 pass; Frontend: `bun run test`: 121/121 pass, `oxlint`: 0 errors, `bun run build`: pass. UI 22/11: từ frame Figma `326:7155`, chuyển điều hướng bốn phân hệ thành thanh tab gạch chân dưới tiêu đề, dùng toàn bộ độ rộng và giữ badge yêu cầu chờ duyệt; bỏ mã màn hình và mô tả vai trò lặp. Focused `approvals.test.mjs`: 9/9 pass; lint không có lỗi (9 warnings có sẵn); build hiện bị chặn bởi hai lỗi TypeScript ngoài phạm vi tại `BookCopyLifecycleDrawer.tsx:508` (`number | null | undefined` truyền vào tham số không nhận `undefined`). |
| `P10-S04` | [Theo dõi cảnh báo tồn](./phase-10-kiem-ke-va-dieu-chinh-kho.md) | Chưa gán | TODO | — |
| `P11-S01` | [Lập bản ghi ca](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S02` | [Ghi nhận chấm công](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S03` | [Duyệt điều chỉnh công](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-S04` | [Thanh toán lương ca](./phase-11-nhan-su-cham-cong-luong.md) | Chưa gán | TODO | — |
| `P11-UI-S01` | [Thiết lập route và UI contracts cho ba màn hình](./phase-11-ui-ca-lam-luong.md#task-1-thiết-lập-route-và-ui-contracts-cho-ba-màn-hình) | Codex | IN_REVIEW | Route/feature contract: 9/9 pass; `posPaths`, `hrPaths`, `RequireSession`, `/pos` và `/hr` redirect đã nối. Design: [`ca-lam-luong-ui-design.md`](../designs/ca-lam-luong-ui-design.md) |
| `P11-UI-S02` | [Xây dựng SCR-POS-01 — Ca làm việc & Két tiền mặt](./phase-11-ui-ca-lam-luong.md#task-2-xây-dựng-scr-pos-01--ca-làm-việc--két-tiền-mặt) | Codex | IN_REVIEW | `pos-shift-ui.test.mjs`: 4/4 pass; có `not-opened/open/closed/variance/empty-ledger`, dialog giải trình, closed read-only, action điều hướng từ `/pos` tới `/pos/shift` theo policy quyền và breadcrumb/back action. Design: [`ca-lam-luong-ui-design.md`](../designs/ca-lam-luong-ui-design.md) |
| `P11-UI-S03` | [Figma redesign SCR-HRM-02](./SHIFT-001-ATT-001-figma-hrm-redesign.md#task-2-rebuild-hrshifts-as-the-figma-weekly-roster) | Codex | IN_PROGRESS | Thay thế UI bản ghi ca theo ngày bằng lịch tuần theo Figma; phạm vi/acceptance: [`SHIFT-001-ATT-001-figma-hrm-redesign.md`](../specs/SHIFT-001-ATT-001-figma-hrm-redesign.md). |
| `P11-UI-S04` | [Figma redesign SCR-HRM-03](./SHIFT-001-ATT-001-figma-hrm-redesign.md#task-3-rebuild-hrattendance-as-the-integrated-figma-attendance-screen) | Codex | IN_PROGRESS | Tích hợp UI điểm danh và bảng công theo Figma; `/hr/attendance/personal` bị ẩn/deny cho mọi role theo spec. |
| `P11-UI-S05` | [Hoàn thiện responsive, accessibility và regression gate](./phase-11-ui-ca-lam-luong.md#task-5-hoàn-thiện-responsive-accessibility-và-regression-gate) | Codex | IN_REVIEW | `bun run lint`: exit 0, 2 cảnh báo Fast Refresh có sẵn ở `Avatar`/`Sidebar`; `bun run build`: pass, cảnh báo bundle >500 kB; full `bun run test`: 131 pass/2 baseline failures ở `approvals.test.mjs` và `pos-shift-ui.test.mjs`; `git diff --check` chỉ báo whitespace có sẵn trong `TodayAttendanceCard.tsx`. |
| `P12-S01` | [Ghi outbox nghiệp vụ](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S02` | [Gửi qua adapter](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S03` | [Retry thông báo](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P12-S04` | [Quan sát tích hợp](./phase-12-thong-bao-va-tich-hop.md) | Chưa gán | TODO | — |
| `P13-S01` | [Quản trị cấu hình phiên bản](./RBAC-002-CONFIG-002-dynamic-permissions.md) | Antigravity / Codex | IN_REVIEW | Đã sửa 11 lỗi báo cáo, gồm lựa chọn người dùng 1B/2A: quyền động ba role theo API đang triển khai, giữ quyền nhạy cảm chỉ Admin; grant/revoke tác động request tiếp theo, không dùng nhãn matrix cũ. Cấu hình bốn nhóm lưu snapshot cũ/mới, actor/reason/effectiveAt ngay trong cùng SaveChanges; audit secret được che và ghi tên trường đổi. Có UI lịch sử và quyền nút thao tác; [spec](../specs/RBAC-002-CONFIG-002-dynamic-permissions.md), [ADR-007](../decisions/ADR-007-dynamic-role-permissions-and-immediate-config.md), [ADR-006](../decisions/ADR-006-integration-secret-protection.md). Backend 231/231 test, build 0 warning/error; frontend 173/174 test (còn baseline POS yêu cầu chuỗi SCR-POS-01), lint 6 warnings, build pass với cảnh báo bundle >500 kB. OpenAPI đã regenerate. Browser Edge mock: matrix ba role/quyền khóa, bàn phím/Escape, grant/revoke UI, save payload, lịch sử cũ/mới, lỗi GET/retry và 390/768/1440 đạt. Chưa E2E DB/auth thật; sandbox không truy cập được key ring DPAPI của host khi chạy OpenAPI, test mã hóa dùng bộ khóa tạm độc lập đã đạt. Lịch sử chỉ ghi từ thay đổi mới; UI xem 100 lần gần nhất, DB giữ append-only. QA ngoài phạm vi còn modal xác nhận thuê thiếu focus/Escape. UI Settings 22/11: tab nằm dưới tiêu đề, dùng toàn bộ vùng nội dung, bỏ mã màn hình và nhãn quyền lặp; focused Settings 16/16 pass, lint không lỗi (6 warnings có sẵn), build pass, full test 174 pass/1 baseline POS fail. Tích hợp frame Figma `30:27209`: đồng bộ tab nhạy cảm với API Admin-only; người không phải Admin không thấy RBAC/Tích hợp và URL trực tiếp quay về cấu hình thuê trước khi gọi API. Regression Settings 18/18 pass; full test 175 pass/2 baseline ngoài phạm vi (`hr-shift-ui` SCR-HRM-02, `pos-shift-ui` SCR-POS-01); lint không lỗi, build pass. |
| `P13-S02` | [Báo cáo nghiệp vụ](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S03` | [Báo cáo tài chính nội bộ](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Codex | IN_REVIEW | REPORT-004 UI 22/11: Báo cáo Doanh thu & Chi phí, Đối soát Tiền cọc và Kê khai Thuế dùng cùng thanh tab gạch chân dưới tiêu đề; bỏ code badges, icon chips và điều hướng lặp trong nội dung. Đã xoá API/property `screenCode` khỏi `MainLayout`, `CatalogWorkspace`, caller, fixture UI và nhãn drawer; bổ sung quy ước phòng ngừa vào `app/frontend/AGENTS.md`. Focused reports/POS/Settings: 30/30 pass; toàn source frontend không còn `screenCode`, `SCR-*`, `MOD-*`, hoặc `DRAWER-*`. Full `bun run test`: 186/186 pass; lint không lỗi (9 warnings có sẵn); build bị chặn bởi 2 lỗi TypeScript ngoài phạm vi tại `BookCopyLifecycleDrawer.tsx:505` (`number | null | undefined` truyền vào tham số không nhận `undefined`). |
| `P13-S04` | [Xuất dữ liệu thuế](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P13-S05` | [Diễn tập vận hành](./phase-13-bao-cao-cau-hinh-van-hanh.md) | Chưa gán | TODO | — |
| `P14-S01` | [Rà soát security/privacy](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S02` | [Kiểm thử hiệu năng](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S03` | [Chạy regression](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S04` | [Nghiệm thu tại quầy](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
| `P14-S05` | [Phát hành production](./phase-14-hardening-uat-phat-hanh.md) | Chưa gán | TODO | — |
