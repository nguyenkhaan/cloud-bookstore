# Ca làm, chấm công và lương theo ca UI Implementation Plan

**Goal:** Xây dựng ba màn hình frontend UI-only cho ca/két tiền mặt, bản ghi ca và chấm công theo ca, giữ nguyên theme và shell hiện tại.

**Architecture:** Mỗi domain giữ component trong feature sở hữu: `features/pos` cho ca/két và `features/hr` cho bản ghi ca, chấm công và trạng thái lương theo ca. Các page dùng `MainLayout` cùng primitive hiện có; dữ liệu chỉ là fixture/local state, chưa tạo service, hook hoặc API.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, `lucide-react`, shared primitives trong `src/components/common`, Bun, Node test runner và oxlint.

**Spec:** [`docs/designs/ca-lam-luong-ui-design.md`](../designs/ca-lam-luong-ui-design.md)

## Global Constraints

- Chỉ triển khai UI; không thêm API request, service, hook, backend hoặc database.
- Giữ code feature-specific trong `src/features/pos` và `src/features/hr`; không tạo `features/payroll` hoặc `features/schedule`.
- Dùng `MainLayout`, theme trong `src/index.css` và shared primitives hiện có; không tạo design system hoặc stylesheet song song.
- Không sửa thủ công `src/contract/api-contract.ts`.
- Không triển khai lịch tuần/tháng hoặc bảng lương theo kỳ.
- Lương chỉ hiển thị theo từng ca; thiếu một đầu check-in/check-out phải hiển thị `Thiếu chấm công`, không suy đoán giờ.
- Trạng thái và thao tác hiển thị phải phân biệt bằng text, không chỉ bằng màu.
- Kiểm tra responsive khoảng `390px`, `768px` và `1440px`.
- Không chốt policy ca qua ngày hoặc xác thực check-in/check-out đang mở trong `OQ-010`.

## Review Focus

- **Scope drift:** `HRM-02` không được biến thành lịch tuần/tháng; `HRM-03` không được biến thành bảng lương theo kỳ. Test: `ui-scope-contract.test.mjs`.
- **Cash variance:** `POS-01` phải có trạng thái chênh lệch và vùng giải trình khi số đếm khác tiền lý thuyết. Test: `pos-shift-ui.test.mjs`.
- **Missing attendance:** thiếu check-in hoặc check-out phải giữ trạng thái thiếu chấm công, không hiển thị số giờ suy đoán. Test: `attendance-ui.test.mjs`.
- **Approval visibility:** yêu cầu điều chỉnh phải thể hiện đang chờ Admin duyệt; UI demo không tự coi là đã áp dụng. Test: `attendance-ui.test.mjs`.
- **Route/feature ownership:** các route mới phải đi qua `RequireSession`, page nằm trong feature đúng và `/pos`, `/hr` không còn render placeholder. Test: `app-routes.test.mjs` và `feature-structure.test.mjs`.

---

### Task 1: Thiết lập route và UI contracts cho ba màn hình

**Files:**

- Create: `app/frontend/src/features/pos/pos.route.ts`
- Create: `app/frontend/src/features/hr/hr.route.ts`
- Create: `app/frontend/src/features/pos/pos-shift.type.ts`
- Create: `app/frontend/src/features/hr/hr-shift.type.ts`
- Modify: `app/frontend/src/features/workspace/workspace.route.ts`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/src/features/pos/pages/PosPage.tsx`
- Modify: `app/frontend/src/features/hr/pages/HumanResourcesPage.tsx`
- Test: `app/frontend/tests/app-routes.test.mjs`
- Test: `app/frontend/tests/feature-structure.test.mjs`

**Interfaces:**

- Consumes: `MainLayout` route conventions, `catalogPaths` pattern, existing `RequireSession` wrapper.
- Produces: `posPaths.shift`, `hrPaths.shifts`, `hrPaths.attendance`; feature-local display types for shift, cash summary, attendance row and per-shift payroll status.

**Acceptance Criteria:**

- `/pos/shift`, `/hr/shifts` và `/hr/attendance` được khai báo một lần và nằm sau `RequireSession`.
- `/pos` chuyển đến `/pos/shift`; `/hr` chuyển đến `/hr/attendance`.
- Các type chỉ mô tả dữ liệu hiển thị, không chứa DTO backend hoặc API response contract.
- `PosPage` và `HumanResourcesPage` không còn render `WorkspacePlaceholderPage`.
- Sidebar vẫn active đúng nhóm `pos` hoặc `hr` khi truy cập route con.

- [ ] **Step 1: Viết test contract route và feature structure**

  Bổ sung assertion cho route con, redirect mặc định, `RequireSession`, page files và việc loại bỏ placeholder khỏi hai entry page.
- [ ] **Step 2: Chạy test để xác nhận contract mới đang fail**

  Run: `cd app/frontend && node --test tests/app-routes.test.mjs tests/feature-structure.test.mjs`

  Expected: FAIL vì route/page/type mới chưa tồn tại.
- [ ] **Step 3: Tạo route constants và display types**

  Dùng pattern của `catalog.route.ts`. `PosShiftUiState` phải hỗ trợ `not-opened`, `open`, `closed`, `variance`; `AttendanceUiState` phải hỗ trợ `present`, `late`, `absent`, `missing-attendance`, `adjustment-pending`.
- [ ] **Step 4: Nối route và thay entry placeholder bằng redirect**

  Cập nhật `AppRoutes.tsx`, `workspace.route.ts`, `PosPage.tsx` và `HumanResourcesPage.tsx`; không thêm request hoặc hook.
- [ ] **Step 5: Chạy test contract**

  Run: `cd app/frontend && node --test tests/app-routes.test.mjs tests/feature-structure.test.mjs`

  Expected: PASS.

**Dependencies:** Không.

**Quy mô:** M.

### Task 2: Xây dựng `SCR-POS-01` — Ca làm việc & Két tiền mặt

**Files:**

- Create: `app/frontend/src/features/pos/pages/PosShiftPage.tsx`
- Create: `app/frontend/src/features/pos/components/ShiftStatusHeader.tsx`
- Create: `app/frontend/src/features/pos/components/CashSummaryCards.tsx`
- Create: `app/frontend/src/features/pos/components/CashCountPanel.tsx`
- Create: `app/frontend/src/features/pos/components/CashLedgerTable.tsx`
- Create: `app/frontend/src/features/pos/components/CloseShiftDialog.tsx`
- Create: `app/frontend/tests/pos-shift-ui.test.mjs`

**Interfaces:**

- Consumes: `posPaths.shift`, `pos-shift.type.ts`, shared `MainLayout`, `Card`, `StatCard`, `Badge`, `Button`, `TextField`.
- Produces: page UI mô phỏng đủ các state `not-opened`, `open`, `closed`, `variance`, `empty-ledger`.

**Acceptance Criteria:**

- Page hiển thị `SCR-POS-01`, breadcrumb và tiêu đề đúng.
- Summary có tiền đầu ca, tiền lý thuyết, tiền kiểm đếm và chênh lệch.
- Có panel kiểm đếm theo mệnh giá và bảng sổ quỹ.
- Dialog đóng ca hiển thị chênh lệch và yêu cầu giải trình trong state variance.
- State closed là read-only về mặt hiển thị.
- Không import `*.service.ts`, `*.hook.ts`, axios hoặc React Query.

- [ ] **Step 1: Viết test UI contract cho POS**

  Test kiểm tra screen code, các nhãn summary, state labels, copy giải trình chênh lệch và absence của import service/hook.
- [ ] **Step 2: Chạy test để xác nhận đang fail**

  Run: `cd app/frontend && node --test tests/pos-shift-ui.test.mjs`

  Expected: FAIL vì page/components chưa tồn tại.
- [ ] **Step 3: Tạo fixture và page composition**

  Dùng fixture cục bộ với một ca đang mở, một giao dịch mẫu và một state variance có thể chọn bằng local state; truyền dữ liệu qua props typed, không đọc API.
- [ ] **Step 4: Tạo các vùng UI của ca/két**

  Tách header, summary, cash count, ledger và close dialog theo đúng trách nhiệm; dùng semantic `Badge`/`Button` hiện có và giữ action chính theo state.
- [ ] **Step 5: Chạy test và kiểm tra route thủ công**

  Run: `cd app/frontend && node --test tests/pos-shift-ui.test.mjs`

  Expected: PASS; mở `/pos/shift` thấy page qua shell hiện tại.

**Dependencies:** Task 1.

**Quy mô:** M.

### Task 3: Xây dựng `SCR-HRM-02` — Phân công và tra cứu bản ghi ca theo ngày

**Files:**

- Create: `app/frontend/src/features/hr/pages/ShiftRecordsPage.tsx`
- Create: `app/frontend/src/features/hr/components/ShiftDateToolbar.tsx`
- Create: `app/frontend/src/features/hr/components/ShiftSummaryCards.tsx`
- Create: `app/frontend/src/features/hr/components/ShiftRecordsTable.tsx`
- Create: `app/frontend/src/features/hr/components/ShiftRecordDrawer.tsx`
- Create: `app/frontend/tests/hr-shift-ui.test.mjs`

**Interfaces:**

- Consumes: `hrPaths.shifts`, `hr-shift.type.ts`, `MainLayout`, shared filters/cards/table primitives.
- Produces: UI phân công theo ngày với `assigned`, `unassigned`, `attendance-missing`, `empty` và `admin-only` states.

**Acceptance Criteria:**

- Page hiển thị `SCR-HRM-02` và dùng wording `Phân công ca`/`Bản ghi ca`, không gọi đây là lịch tuần/tháng trong UI chính.
- Có filter ngày, nhân viên, thứ tự ca và trạng thái.
- Có summary tổng bản ghi, nhân viên đã phân công, ca thiếu người và bản ghi cần bổ sung chấm công.
- Drawer thêm bản ghi chỉ có nhân viên, ngày, thứ tự ca và ghi chú; không có lịch lặp hoặc kỳ lương.
- Empty state và unassigned state có copy hướng dẫn rõ ràng.

- [ ] **Step 1: Viết test scope contract cho HRM-02**

  Assert screen code, filter labels, required shift fields và không xuất hiện wording/field cho weekly schedule, monthly payroll hoặc recurring schedule.
- [ ] **Step 2: Chạy test để xác nhận đang fail**

  Run: `cd app/frontend && node --test tests/hr-shift-ui.test.mjs`

  Expected: FAIL vì page/components chưa tồn tại.
- [ ] **Step 3: Tạo fixture bản ghi ca và toolbar**

  Dùng local state cho ngày, nhân viên, thứ tự ca và status filter; fixture phải có ít nhất một assigned, một unassigned và một attendance-missing row.
- [ ] **Step 4: Tạo summary, table/list và drawer**

  Trên desktop dùng table; trên mobile dùng card/list hoặc overflow có kiểm soát. Drawer chỉ là UI demo và không submit API.
- [ ] **Step 5: Chạy test và kiểm tra responsive**

  Run: `cd app/frontend && node --test tests/hr-shift-ui.test.mjs`

  Expected: PASS; kiểm tra `/hr/shifts` tại 390px, 768px và 1440px.

**Dependencies:** Task 1.

**Quy mô:** M.

### Task 4: Xây dựng `SCR-HRM-03` — Điểm danh và chấm công theo ca

**Files:**

- Create: `app/frontend/src/features/hr/pages/AttendancePage.tsx`
- Create: `app/frontend/src/features/hr/components/TodayAttendanceCard.tsx`
- Create: `app/frontend/src/features/hr/components/AttendanceSummaryCards.tsx`
- Create: `app/frontend/src/features/hr/components/AttendanceFilters.tsx`
- Create: `app/frontend/src/features/hr/components/AttendanceTable.tsx`
- Create: `app/frontend/src/features/hr/components/AttendanceAdjustmentDialog.tsx`
- Create: `app/frontend/tests/attendance-ui.test.mjs`

**Interfaces:**

- Consumes: `hrPaths.attendance`, `hr-shift.type.ts`, Task 1 UI state types, shared `MainLayout`, `Badge`, `Button`, `SelectBox`, `TextField`.
- Produces: page UI theo dõi chấm công và status lương từng ca với `present`, `late`, `absent`, `missing-attendance`, `adjustment-pending`, `paid`, `unpaid`.

**Acceptance Criteria:**

- Page hiển thị `SCR-HRM-03`, card điểm danh hôm nay và summary có mặt/đi trễ/vắng/thiếu chấm công.
- Bảng có nhân viên, ngày, thứ tự ca, check-in, check-out, giờ công, trạng thái và lương ca.
- Row thiếu check-in hoặc check-out hiển thị `Thiếu chấm công`, không hiển thị giờ công được suy đoán.
- Dialog điều chỉnh có giá trị hiện tại, giá trị đề nghị, lý do bắt buộc và nhãn chờ Admin duyệt.
- Có status `Đã trả`/`Chưa trả` theo từng ca, không có bảng lương theo kỳ.
- Không có khu vực khóa công tháng hoặc mở khóa kỳ.

- [ ] **Step 1: Viết test attendance contract**

  Assert các cột, status labels, missing-attendance copy, adjustment-pending copy và absence của month-lock/period-payroll UI.
- [ ] **Step 2: Chạy test để xác nhận đang fail**

  Run: `cd app/frontend && node --test tests/attendance-ui.test.mjs`

  Expected: FAIL vì page/components chưa tồn tại.
- [ ] **Step 3: Tạo fixture attendance và local filter state**

  Fixture phải có đủ present, late, absent, missing-attendance, adjustment-pending và cả paid/unpaid row; không gắn với ngày/tháng thật từ API.
- [ ] **Step 4: Tạo today card, summary, table và adjustment dialog**

  Dùng text status và semantic badges; action check-in/check-out chỉ đổi local demo state nếu cần trình diễn.
- [ ] **Step 5: Chạy test và kiểm tra keyboard flow**

  Run: `cd app/frontend && node --test tests/attendance-ui.test.mjs`

  Expected: PASS; tab đến filter, row action và dialog; đóng dialog bằng Escape.

**Dependencies:** Task 1.

**Quy mô:** M.

### Task 5: Hoàn thiện responsive, accessibility và regression gate

**Files:**

- Modify: các page/component tạo ở Task 2–4 khi cần để sửa responsive/accessibility.
- Modify: `app/frontend/tests/app-routes.test.mjs` và các UI contract test khi cần.
- No API/contract files.

**Interfaces:**

- Consumes: ba page đã hoàn thiện và tiêu chí responsive/accessibility trong design spec.
- Produces: bộ UI có thể review tại ba breakpoint, không có regression route/theme/scope.

**Acceptance Criteria:**

- Không có overflow ngang ngoài vùng bảng được chủ đích cho phép.
- Dialog, buttons, tabs, filters và row actions có keyboard/focus support.
- Không có raw design system mới hoặc màu sắc song song với theme hiện tại.
- Không có service/hook/API import phát sinh.
- Tất cả frontend quality gates pass.

- [ ] **Step 1: Chạy toàn bộ test frontend**

  Run: `cd app/frontend && bun run test`

  Expected: PASS.
- [ ] **Step 2: Chạy lint và build**

  Run: `cd app/frontend && bun run lint && bun run build`

  Expected: exit code `0`; không thêm warning/error ngoài phạm vi mà không được ghi nhận.
- [ ] **Step 3: Review thủ công ba breakpoint**

  Run: `cd app/frontend && bun run dev`

  Kiểm tra `/pos/shift`, `/hr/shifts`, `/hr/attendance` tại khoảng `390px`, `768px`, `1440px`; kiểm tra state chênh lệch, thiếu chấm công, empty và closed.
- [ ] **Step 4: Kiểm tra thay đổi và diff hygiene**

  Run: `git diff --check` và `git status --short`.

  Expected: chỉ có file thuộc phạm vi UI plan, không có secret, file tạm hoặc thay đổi generated contract.

**Dependencies:** Task 2, Task 3, Task 4.

**Quy mô:** M.

## Checkpoint P11-UI-A

- [ ] Task 1–2 hoàn tất, route POS và UI ca/két review được.
- [ ] `SCR-POS-01` có đủ state not-opened/open/closed/variance.
- [ ] Test route và POS pass.

## Checkpoint P11-UI-B

- [ ] Task 3–4 hoàn tất, hai màn HR review được.
- [ ] HRM-02 không có lịch tuần/tháng.
- [ ] HRM-03 không có bảng lương theo kỳ.
- [ ] Missing attendance và adjustment pending được thể hiện rõ.

## Checkpoint P11-UI-C

- [ ] Task 5 hoàn tất.
- [ ] `bun run test`, `bun run lint`, `bun run build` pass.
- [ ] Review tại 390px/768px/1440px hoàn tất.
- [ ] Evidence được cập nhật trong `docs/plans/todo.md`.
