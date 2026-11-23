# Thiết kế UI — Ca làm, chấm công và lương theo ca

## Trạng thái

**Approved — UI only**

Thiết kế này được duyệt để triển khai giao diện frontend trước. Chưa bao gồm API, service, hook, backend, tính lương thật hoặc thực thi phân quyền thật.

## Mục tiêu

Thiết kế ba màn hình vận hành cho nhân viên cửa hàng và Admin:

- `SCR-POS-01` — Ca làm việc & Két tiền mặt.
- `SCR-HRM-02` — Phân công/tra cứu bản ghi ca theo ngày.
- `SCR-HRM-03` — Điểm danh và chấm công tổng thể theo từng ca.

Mã `SRC-*` trong yêu cầu người dùng được chuẩn hóa thành `SCR-*` để khớp với Figma và tài liệu hiện hành.

## Quyết định phạm vi

Figma hiện tại mô tả `SCR-HRM-02` bằng lịch tuần và `SCR-HRM-03` bằng bảng công tháng. Phạm vi đã được duyệt của sản phẩm không triển khai lịch tuần/tháng hoặc bảng lương theo kỳ. Vì vậy:

- Giữ lại cấu trúc dashboard, mật độ thông tin và ngôn ngữ thị giác của Figma.
- Không triển khai module lịch tuần/tháng.
- `SCR-HRM-02` trở thành màn hình phân công và tra cứu bản ghi ca theo ngày, nhân viên và thứ tự ca.
- `SCR-HRM-03` hiển thị chấm công theo từng ca/lần làm; lương chỉ hiển thị theo ca.
- Không hiển thị thao tác “khóa công tháng”, “mở khóa kỳ” hoặc tính bảng lương theo kỳ.
- Quy tắc ca qua ngày và xác thực check-in/check-out vẫn để mở theo `OQ-010`; UI chỉ mô phỏng trạng thái, không tự quyết định policy.

Các ràng buộc này bám theo `SHIFT-001`, `ATT-001`, `ATT-002`, `PAYROLL-001`–`PAYROLL-003`, `CASH-003`–`CASH-005` và phase 11 hiện hành.

## Phân bổ module và route

| Màn hình | Module sở hữu | Route đề xuất | Component page |
| --- | --- | --- | --- |
| `SCR-POS-01` | `src/features/pos` | `/pos/shift` | `PosShiftPage` |
| `SCR-HRM-02` | `src/features/hr` | `/hr/shifts` | `ShiftRecordsPage` |
| `SCR-HRM-03` | `src/features/hr` | `/hr/attendance` | `AttendancePage` |

`/pos` sẽ chuyển đến `/pos/shift`; `/hr` sẽ chuyển đến `/hr/attendance`. Sidebar vẫn dùng các mục nghiệp vụ `pos` và `hr` hiện có, không tạo navigation top-level mới.

Không tạo `features/payroll` hoặc `features/schedule`: lương là một thuộc tính của bản ghi ca trong domain HR, còn phân công ca là một lát cắt của bản ghi ca, không phải module lịch độc lập.

## Nền tảng giao diện

### Shell

Ba page phải dùng `MainLayout` hiện có, bao gồm:

- Sidebar nghiệp vụ hiện tại.
- Header context hiện tại.
- Breadcrumb có mã màn hình.
- `pageTitle` và `screenCode` truyền qua `MainLayout`.
- Footer hiện tại.

Không tạo layout mới và không dùng `App.css` cũ cho các page này.

### Theme

- Font: Plus Jakarta Sans.
- Canvas: `#f8fafc`.
- Surface: trắng, border slate.
- Brand: indigo hiện tại trong `index.css`.
- Semantic: emerald cho thành công/đã trả, amber cho chờ xử lý/đi trễ, rose cho lỗi/chênh lệch, blue cho thông tin.
- Card: `rounded-2xl`, border nhẹ, shadow thấp.
- Controls: kích thước tối thiểu phù hợp thao tác tại quầy, focus ring indigo rõ ràng.

Ưu tiên các primitive đã có: `Card`, `StatCard`, `Badge`, `Button`, `TextField`, `SelectBox`, `Breadcrumb` và icon từ thư viện hiện tại.

### Mật độ thông tin

Đây là giao diện vận hành nội bộ, không phải landing page. Mỗi page có một nhóm hành động chính, một vùng thông tin trọng tâm và các trạng thái nghiệp vụ dễ quét. Không lạm dụng card hoặc gradient trang trí.

## Thiết kế màn hình `SCR-POS-01`

### Mục đích

Cho phép nhân viên xem trạng thái ca, kiểm soát tiền mặt trong ca và chuẩn bị đóng ca; Admin có thể xem ca đã đóng và xử lý ngoại lệ theo quy trình phê duyệt.

### Bố cục desktop

1. Page header:
   - Breadcrumb `Không gian làm việc / Quầy giao dịch / Ca làm việc & Két tiền mặt`.
   - Screen code `SCR-POS-01`.
   - Trạng thái ca `Chưa mở`, `Đang mở`, `Đã đóng`.
   - Action chính thay đổi theo trạng thái: `Mở ca`, `Đóng ca`, `In biên bản`.
2. Summary cards:
   - Tiền đầu ca.
   - Tiền lý thuyết hiện tại.
   - Tiền đã kiểm đếm.
   - Chênh lệch.
3. Vùng kiểm đếm và sổ quỹ:
   - Panel kiểm đếm tiền mặt theo mệnh giá.
   - Bảng sổ giao dịch trong ca.
   - Thông tin người mở ca, thời điểm mở và số giao dịch.
4. Dialog đóng ca:
   - Tổng tiền hệ thống.
   - Tổng tiền thực đếm.
   - Chênh lệch tự hiển thị trong UI demo.
   - Trường giải trình bắt buộc khi chênh lệch khác `0`.

### Trạng thái UI

- `closed`: các control giao dịch bị khóa, chỉ còn xem/in.
- `open`: hiển thị sổ quỹ và action đóng ca.
- `not-opened`: hiển thị form tiền đầu ca và action mở ca.
- `variance`: chênh lệch nổi bật bằng màu semantic, hiển thị vùng giải trình và nhãn cần Admin xử lý.
- `empty-ledger`: sổ quỹ rỗng nhưng vẫn hiển thị summary và hướng dẫn thao tác.

## Thiết kế màn hình `SCR-HRM-02`

### Mục đích

Admin tra cứu và mô phỏng việc phân công nhân viên vào từng bản ghi ca/lần làm theo ngày. Màn hình không tạo lịch lặp hoặc lịch tuần/tháng.

### Bố cục desktop

1. Page header:
   - Breadcrumb `Không gian làm việc / Nhân sự & tiền lương / Phân công ca`.
   - Screen code `SCR-HRM-02`.
   - Action `Thêm bản ghi ca`.
2. Toolbar:
   - Chọn ngày.
   - Lọc nhân viên.
   - Lọc thứ tự ca.
   - Lọc trạng thái bản ghi.
3. Summary cards:
   - Tổng bản ghi trong ngày.
   - Nhân viên đã phân công.
   - Ca còn thiếu người.
   - Bản ghi cần bổ sung chấm công.
4. Main table/list:
   - Ngày làm.
   - Nhân viên.
   - Thứ tự ca.
   - Khoảng thời gian hiển thị nếu có dữ liệu demo.
   - Trạng thái phân công.
   - Link/action xem chi tiết.
5. Drawer `Thêm bản ghi ca`:
   - Nhân viên.
   - Ngày làm.
   - Thứ tự ca.
   - Ghi chú.
   - Không thêm trường lịch lặp hoặc kỳ bảng công.

### Trạng thái UI

- `assigned`: bản ghi đã có nhân viên.
- `unassigned`: bản ghi thiếu người, dùng warning badge.
- `attendance-missing`: đã có ca nhưng thiếu check-in/check-out.
- `empty`: chưa có bản ghi trong ngày đã chọn.
- `admin-only`: action tạo/chỉnh sửa chỉ hiển thị trong mock Admin view.

## Thiết kế màn hình `SCR-HRM-03`

### Mục đích

Cho phép theo dõi chấm công theo ca/lần làm, nhận diện thiếu dữ liệu và hiển thị trạng thái lương của từng ca mà không biến thành bảng lương theo kỳ.

### Bố cục desktop

1. Page header:
   - Breadcrumb `Không gian làm việc / Nhân sự & tiền lương / Chấm công`.
   - Screen code `SCR-HRM-03`.
   - Action `Gửi yêu cầu điều chỉnh` hoặc `Xuất danh sách` chỉ là UI demo.
2. Today attendance card:
   - Nhân viên hiện tại.
   - Ca hiện tại.
   - Check-in/check-out.
   - Trạng thái hiện tại.
   - Action check-in/check-out chỉ mô phỏng ở UI.
3. Summary cards:
   - Có mặt.
   - Đi trễ.
   - Vắng.
   - Thiếu chấm công.
4. Attendance table:
   - Nhân viên.
   - Ngày làm.
   - Thứ tự ca.
   - Check-in.
   - Check-out.
   - Giờ công.
   - Trạng thái.
   - Trạng thái lương ca.
5. Adjustment drawer/dialog:
   - Giá trị hiện tại.
   - Giá trị đề nghị.
   - Lý do bắt buộc.
   - Nhãn đang chờ Admin duyệt.

### Trạng thái UI

- `present`: đủ check-in và check-out.
- `late`: có mặt nhưng trễ.
- `absent`: vắng.
- `missing-attendance`: thiếu một đầu chấm công, không tự suy đoán giờ.
- `adjustment-pending`: yêu cầu điều chỉnh đang chờ duyệt.
- `paid`/`unpaid`: trạng thái lương của từng ca.
- `admin-view`/`employee-view`: mô phỏng khác biệt action; không thay thế RBAC thật.

Không có khu vực “khóa công tháng”, “mở khóa kỳ” hoặc tổng lương theo tháng.

## Responsive

Kiểm tra tại khoảng `390px`, `768px` và `1440px`:

- Sidebar dùng cơ chế mobile hiện có của `MainLayout`.
- Header action chuyển thành nhóm dọc hoặc full-width.
- Summary cards chuyển từ 4 cột sang 2 cột rồi 1 cột.
- Bảng POS/HR cho phép scroll ngang có chủ đích; các thông tin quan trọng vẫn được tóm tắt bằng card trên mobile.
- Bộ lọc chuyển thành stack, không ép tất cả control trên một hàng.
- Bản ghi ca dùng list/card ở mobile thay vì làm nhỏ bảng đến mức không đọc được.

## Accessibility và copy

- Mọi action icon-only có `aria-label` hoặc tooltip phù hợp.
- Trạng thái không chỉ phân biệt bằng màu; luôn có text badge.
- Focus ring phải nhìn thấy trên mọi button, input, select, tab và row action.
- Dialog có tiêu đề, mô tả, đóng bằng Escape và focus hợp lý.
- Label dùng tiếng Việt nhất quán: `Ca làm`, `Thứ tự ca`, `Check-in`, `Check-out`, `Thiếu chấm công`, `Lương ca`.
- Chỉ dùng ba vai trò hiện hành: `Admin/Quản trị viên` (`ADMIN`), `Cashier/Thu ngân` (`CASHIER`) và `Inventory/Quản lý kho` (`INVENTORY_MANAGER`); không dùng các nhãn vai trò cũ như `Manager`, `Employee`, `Warehouse` hoặc `Clerk`.

## Ranh giới UI-only

Được phép:

- Fixture tĩnh trong feature.
- Local state cho tab, filter, dialog và trạng thái demo.
- Type frontend riêng cho dữ liệu hiển thị.
- Route và component mới.

Chưa làm:

- `*.service.ts`, `*.hook.ts`, TanStack Query hoặc API request mới.
- Thay đổi `src/contract/api-contract.ts`.
- Backend, database, migration, audit thật.
- Tính lương, tính tiền lý thuyết hoặc kiểm tra quyền thật.
- Chốt policy ca qua ngày theo `OQ-010`.

## Tiêu chí nghiệm thu thiết kế

- Ba screen code xuất hiện đúng trong page header.
- Ba màn hình dùng cùng `MainLayout` và theme hiện tại.
- `SCR-POS-01` mô phỏng đủ mở ca, đang mở, đóng ca và chênh lệch.
- `SCR-HRM-02` chỉ mô phỏng bản ghi/phân công ca theo ngày, không có lịch tuần/tháng.
- `SCR-HRM-03` hiển thị chấm công và lương theo từng ca, không có bảng lương theo kỳ.
- Các trạng thái thiếu chấm công, chờ duyệt và đã trả/chưa trả có text rõ ràng.
- Không có import service/hook/API mới.
- Giao diện usable tại 390px, 768px và 1440px.
- `bun run test`, `bun run lint` và `bun run build` pass sau khi triển khai.

## Tài liệu tham chiếu

- [Feature catalog](../FEATURE.md): `EMP-001`, `SHIFT-001`, `ATT-001`, `ATT-002`, `PAYROLL-001`–`PAYROLL-003`, `CASH-003`–`CASH-005`.
- [Phase 11 — Nhân sự, chấm công và lương theo ca](../plans/phase-11-nhan-su-cham-cong-luong.md).
- [Business rules](../requirements/BUSINESS_RULES.md): `BR-ATT-001`, `BR-ATT-002`, `BR-PAYROLL-001`–`BR-PAYROLL-003`, `BR-CASH-003`.
- [Workflows](../requirements/WORKFLOWS.md): `WF-08`, `WF-09`, `WF-10`.
- [Open questions](../OPEN_QUESTIONS.md): `OQ-010`.
- [Figma screen inventory](../BOOK_HIERARCHY_UX_PROPOSAL.md): node `8:34783`, `30:25302`, `30:25531`.
- [Frontend agent instructions](../../app/frontend/AGENTS.md).
