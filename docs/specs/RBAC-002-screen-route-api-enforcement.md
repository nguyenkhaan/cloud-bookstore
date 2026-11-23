# Spec: RBAC-002 — Ma trận truy cập màn hình và thực thi đồng bộ Sidebar, Route, API

## Status

Accepted — người dùng chấp thuận mô hình phân quyền kết hợp và ma trận màn hình ngày 2026-11-23.

## Objective

Ba vai trò nghiệp vụ duy nhất là `ADMIN` (Admin/Quản trị viên), `CASHIER` (Cashier/Thu ngân) và `INVENTORY_MANAGER` (Inventory/Quản lý kho). Mỗi role chỉ nhìn thấy, đọc và thao tác trên các màn hình phù hợp với trách nhiệm của mình.

Quyền phải được thực thi đồng thời ở ba lớp:

1. Sidebar và điều hướng không hiển thị đích đến không được phép.
2. Route guard chặn truy cập trực tiếp bằng URL.
3. Backend kiểm tra quyền trên từng API và giới hạn đúng phạm vi dữ liệu.

Ẩn menu hoặc nút trên frontend không được xem là biện pháp bảo mật. Backend là nơi ra quyết định cuối cùng và không được thay đổi dữ liệu khi từ chối quyền.

## References

- Feature IDs: `RBAC-001`–`RBAC-003`, `AUTH-004`, `AUD-001`–`AUD-002`, `CAT-001`–`BOOK-007`, `SUP-001`, `INV-001`–`INV-007`, `BUY-001`–`BUY-008`, `SALE-001`–`SALE-008`, `RENT-001`–`RETURN-006`, `CUS-001`–`CUS-003`, `CASH-001`–`CASH-005`, `EMP-001`, `SHIFT-001`, `ATT-001`–`ATT-002`, `PAYROLL-001`–`PAYROLL-003`, `REPORT-001`–`REPORT-005`, `CONFIG-001`–`CONFIG-003`.
- Product decisions: `PDR-001`, `PDR-002`, `PDR-006`.
- Architecture decisions: `ADR-003`, `ADR-005`, `ADR-007`.
- Requirements: `BR-GEN-001`, `BR-GEN-003`, `BR-GEN-007`, `BR-INV-003`, `BR-CASH-003`, `BR-ATT-003`, `BR-PAYROLL-002`; `WF-01`–`WF-11`.
- Role source of truth: [`../product/ROLES.md`](../product/ROLES.md).
- Existing dynamic permission spec: [`RBAC-002-CONFIG-002-dynamic-permissions.md`](./RBAC-002-CONFIG-002-dynamic-permissions.md).

## Intent and Non-goals

### Goals

- Có một ma trận quyền mặc định duy nhất cho toàn bộ màn hình và màn hình con.
- Sidebar, route guard, tab/action visibility và backend dùng cùng nguồn permission hiệu lực.
- Thay đổi permission động có hiệu lực từ request kế tiếp theo `ADR-007`.
- Giữ các giới hạn Admin-only và giới hạn dữ liệu cá nhân bất biến.
- Mỗi trạng thái `R`, `U`, `N` có thể kiểm thử tự động.

### Non-goals

- Không thêm role thứ tư như “Quản lý” hoặc “Thu ngân trưởng”.
- Không dùng role hoặc permission chỉ có ở frontend để thay thế backend authorization.
- Không cấp quyền dựa trên screen code, tên tab hiển thị hoặc nhãn văn bản tự do.
- Không tự động mở quyền cho API/màn hình demo chưa có nghiệp vụ backend thật.
- Không thay đổi quy tắc nghiệp vụ, điều kiện phê duyệt hoặc phạm vi dữ liệu chỉ vì role có quyền mở màn hình.

## Approaches Considered

### 1. Phân quyền cứng theo role ở từng component

Đơn giản lúc đầu nhưng sidebar, route và nút thao tác sẽ nhanh chóng lệch nhau. Cách này cũng không đáp ứng quyền động trong `ADR-007`.

### 2. Phân quyền hoàn toàn động, không có baseline màn hình

Linh hoạt nhưng không cung cấp trạng thái an toàn khi cấu hình thiếu, đồng thời làm tăng nguy cơ cấp nhầm quyền Admin-only hoặc mở dữ liệu vượt phạm vi.

### 3. Mô hình kết hợp — được chọn

Mỗi màn hình có quyền mặc định theo role. Mỗi thao tác ghi và API vẫn được kiểm tra bằng permission động. Các giới hạn Admin-only, dữ liệu cá nhân, phạm vi kho và nguyên tắc người tạo không tự duyệt không thể bị gỡ bằng ma trận động.

## Permission Semantics

- `R`: role được mở và đọc màn hình trong phạm vi dữ liệu được phép.
- `U`: role có ít nhất một thao tác tạo/cập nhật/xóa/chuyển trạng thái hợp lệ trên màn hình. `U` luôn kéo theo `R`.
- `N`: màn hình không xuất hiện trong điều hướng và truy cập URL trực tiếp bị chặn.
- `N` loại trừ `R` và `U`; một ô hợp lệ chỉ là `R`, `R, U` hoặc `N`.
- `R, U` không đồng nghĩa được dùng mọi nút. Mỗi action vẫn cần permission tương ứng và phải qua domain validation.

Ma trận bên dưới là baseline khi chưa có cấu hình động. Permission có thể cấu hình được phép thu hồi hoặc cấp thêm theo `ADR-007`. Những quyền được đánh dấu Admin-only hoặc protected scope không thể cấp cho role khác.

## Actors and Permissions

### Cashier / Thu ngân — `CASHIER`

Thực hiện bán, thuê, gia hạn, trả, thu mua, thanh toán, ca thu ngân; quản lý khách trong phạm vi giao dịch; xem danh mục; chấm công, tạo yêu cầu và xem lương của bản thân.

### Admin — `ADMIN`

Có quyền vận hành toàn hệ thống và là cấp duyệt duy nhất cho ngoại lệ nhạy cảm. Admin quản lý tài khoản, nhân sự, lương, báo cáo tài chính, cấu hình và RBAC nhưng vẫn chịu nguyên tắc không tự duyệt yêu cầu do chính mình tạo.

### Inventory — `INVENTORY_MANAGER`

Quản lý danh mục, metadata, nhà cung cấp, nhập/xuất, CopyBarcode, kiểm kê, cảnh báo tồn và thu mua khi được phân công. Inventory được tạo yêu cầu điều chỉnh nhưng không được tự phê duyệt hoặc thao tác két/bán–thuê mặc định.

## Default Screen Access Matrix

| Tên màn hình + route | Cashier | Admin | Inventory |
| --- | :---: | :---: | :---: |
| Xác thực trước đăng nhập — `/login`, `/register`, `/verify-register`, `/forgot-password`, `/reset-password` | N | N | N |
| Đổi mật khẩu bắt buộc — `/change-password`, `/first-change-password` | R, U | R, U | R, U |
| Hồ sơ và bảo mật cá nhân — `/profile` | R, U | R, U | R, U |
| Tổng quan theo vai trò — `/dashboard` | R | R | R |
| Quầy bán, thuê, gia hạn và trả sách — `/pos` | R, U | R, U | N |
| Thu mua sách cũ — tab Thu mua tại `/pos` | R, U | R, U | R, U |
| Màn hình thanh toán dành cho khách — `/pos/customer-display` | R | R | N |
| Ca thu ngân và két tiền — `/pos/shift` | R, U | R, U | N |
| Danh sách khách hàng — `/customers` | R, U | R, U | R, U |
| Hồ sơ khách hàng — `/customers/:id` | R | R, U | R |
| Cổng Nhân sự — `/hr` | R | R | R |
| Danh sách nhân viên — `/hr/employees` | N | R, U | N |
| Chi tiết nhân viên — `/hr/employees/:id` | N | R, U | N |
| Phân công ca — `/hr/shifts` | R | R, U | R |
| Quản trị chấm công và lương ca — `/hr/attendance` | N | R, U | N |
| Chấm công cá nhân — `/hr/attendance/personal` | R, U | R, U | R, U |
| Đơn của nhân viên — `/hr/requests` | R, U | R, U | R, U |
| Bảng lương toàn cửa hàng — `/hr/payroll` | N | R, U | N |
| Lập điều chỉnh lương — `/hr/payroll/adjustments/new` | N | R, U | N |
| Phiếu lương của bản thân — `/hr/payslip` | R | R | R |
| Phiếu lương của nhân viên — `/hr/payslip/:employeeId` | N | R, U | N |
| Trung tâm phê duyệt ngoại lệ — `/approvals` | R, U | R, U | R, U |
| Điều chỉnh chênh lệch kho — tab tại `/approvals` | N | R, U | R, U |
| Nhật ký kiểm toán — `/audit` | N | R | R |
| Lịch sử vòng đời bản sách — `/audit/copy-lifecycle` | N | R | R |
| Cổng Báo cáo — `/reports` | N | R | N |
| Doanh thu và chi phí — `/reports/revenue-expense` | N | R | N |
| Đối soát tiền cọc — `/reports/deposit-reconciliation` | N | R | N |
| Kê khai thuế — `/reports/tax-declaration` | N | R | N |
| Cấu hình hệ thống mặc định — `/settings` | R | R, U | R |
| Chính sách thuê, trả và phạt — `/settings/rental` | R | R, U | R |
| Hạng thành viên và chiết khấu — `/settings/tiers` | R | R, U | R |
| Ma trận phân quyền RBAC — `/settings/rbac` | N | R, U | N |
| Cấu hình tích hợp — `/settings/integrations` | N | R, U | N |
| Trang thử nghiệm BookSeries/Cloudinary — `/book-series` | N | N | N |
| Cây thể loại — `/catalog/categories` | R | R, U | R, U |
| Danh sách bộ sách — `/catalog/series` | R | R, U | R, U |
| Danh mục đầu sách — `/catalog/titles` | R | R, U | R, U |
| Chi tiết đầu sách — `/catalog/titles/:titleId` | R | R, U | R, U |
| Chi tiết ấn bản — `/catalog/editions/:editionId` | R | R, U | R, U |
| Chi tiết bản sách vật lý — `/catalog/copies/:copyId` | R | R, U | R, U |
| Nhà cung cấp — `/suppliers` | N | R, U | R, U |
| Phiếu nhập kho — `/stock-receipts` | N | R, U | R, U |
| Phiếu xuất kho — `/stock-out` | N | R, U | R, U |
| Kiểm kê kho — `/inventory-check` | N | R, U | R, U |
| Cảnh báo tồn kho — `/stock-alerts` | N | R, U | R, U |

`/`, route alias dưới `/catalog/*` và route `*` không phải màn hình độc lập. Chúng phải kế thừa policy của canonical destination. Các route xác thực trước đăng nhập không tham gia RBAC; giá trị `N` nghĩa là người đã đăng nhập phải được chuyển về workspace phù hợp.

## Protected Scope and Action Constraints

Các giới hạn sau được thực thi ngoài ma trận động và không thể nới bằng việc cấp một permission API đơn lẻ:

1. Cashier tại `/pos` được bán, thuê, gia hạn, trả và thu mua nhưng không được duyệt phạt, đảo giao dịch hoặc điều chỉnh két.
2. Inventory tại `/pos` chỉ thấy tab Thu mua. Khi mở `/pos`, tab mặc định phải là tab đầu tiên role được phép; tab bán, thuê, gia hạn, trả và thanh toán không được render.
3. Cashier và Inventory tại `/customers` được tra cứu và tạo khách phục vụ giao dịch. Dữ liệu nhạy cảm, gắn cờ vi phạm và xóa hồ sơ cần quyền riêng; mặc định chỉ Admin được thao tác đầy đủ.
4. Cashier chỉ đọc danh mục. Admin và Inventory mới được tạo/sửa/xóa thể loại, bộ sách, đầu sách, ấn bản và bản sách.
5. Cashier và Inventory tại `/hr/requests` chỉ tạo, xem và hủy đơn của chính mình. Hàng đợi duyệt của người khác không được tải về client.
6. Cashier tại `/approvals` chỉ xem/theo dõi hoặc hủy yêu cầu ngoại lệ do mình tạo.
7. Inventory tại `/approvals` được tạo, xem và hủy yêu cầu điều chỉnh kho của mình; không được duyệt, từ chối hoặc áp dụng.
8. Chỉ Admin được duyệt ngoại lệ nhạy cảm. Admin không được duyệt, từ chối hoặc áp dụng yêu cầu do chính mình tạo.
9. Inventory tại `/audit` chỉ xem audit của danh mục, bản sách, nhà cung cấp, nhập/xuất và kiểm kê. Audit tài khoản, lương, két, RBAC, cấu hình và secret là Admin-only.
10. Cashier và Inventory được đọc chính sách thuê và thành viên nhưng không được tải lịch sử thay đổi cấu hình.
11. Cashier và Inventory chỉ xem phiếu lương, chấm công, ca làm và yêu cầu gắn với chính actor trong session. Backend không tin `employeeId` hoặc actor ID do URL/body gửi lên.
12. `/book-series` là màn hình thử nghiệm trùng trách nhiệm với `/catalog/series`; phải bị loại khỏi navigation và production routing.

## Enforcement Design

### 1. Shared frontend screen-policy catalog

Frontend phải có một catalog policy duy nhất cho route và màn hình con. Mỗi mục policy tối thiểu chứa:

- canonical route pattern và navigation ID;
- baseline `R`/`U`/`N` theo ba role;
- permission API nào cấp quyền đọc và permission nào cấp quyền ghi;
- policy có phải Admin-only/protected hay không;
- data-scope key như `SELF`, `WAREHOUSE`, `OWN_REQUESTS`, `ALL`;
- danh sách child/tab policies nếu một route chứa nhiều nghiệp vụ.

Không tạo một danh sách role riêng trong Sidebar và một danh sách khác trong router. Cả hai phải gọi cùng một hàm resolve effective access.

### 2. Sidebar and navigation

- Ẩn item khi effective access là `N`.
- Nhóm điều hướng chỉ xuất hiện nếu còn ít nhất một child được phép.
- Child/tab bị cấm không được render trong DOM hoặc keyboard tab order.
- Với route nhiều tab như `/pos`, `/approvals` và `/settings`, tab mặc định là tab đầu tiên được phép.
- Deep link tới tab bị cấm phải hiển thị trạng thái 403 hoặc điều hướng về child đầu tiên được phép; không được thoáng hiện nội dung cấm trong lúc tải.

### 3. Route guard

- Mọi authenticated route phải khai báo screen policy; thiếu policy là fail closed.
- `N` trả trang 403 trong application shell và không gọi query nghiệp vụ của trang đích.
- `R` cho phép query đọc nhưng component không render action ghi.
- `R, U` chỉ render action khi permission API cụ thể cũng đang được cấp.
- Sau khi permission bị thu hồi, route đang mở được đánh giá lại khi permission query refresh; request tiếp theo vẫn phải bị backend trả 403 ngay cả trước khi UI refresh.
- Guest-only route chuyển người đã đăng nhập về `/dashboard` hoặc workspace đầu tiên được phép.

### 4. Component and action guards

- Mỗi action tạo/sửa/xóa/duyệt/đảo/chuyển trạng thái kiểm tra đúng permission code.
- Không suy quyền ghi từ việc role mở được màn hình.
- Nếu permission tải lỗi, action ghi bị khóa theo fail-closed; không dùng ma trận mẫu để cho phép thao tác.
- 403 từ backend phải giữ nguyên dữ liệu form hợp lệ, thông báo quyền đã thay đổi và làm mới permission.

### 5. Backend API authorization

- Mọi endpoint nghiệp vụ phải có `[Authorize]`, role policy hoặc dynamic `[Permission]`; endpoint thiếu metadata authorization không được phát hành.
- GET/list/detail cần permission đọc. POST/PUT/PATCH/DELETE cần permission thao tác riêng và CSRF cho unsafe method.
- Permission động sử dụng cùng mã controller/action mà frontend nhận từ `GET /api/settings/my-permissions`.
- API Admin-only tiếp tục dùng policy bất biến; không thể cấp cho `CASHIER` hoặc `INVENTORY_MANAGER` qua RBAC matrix.
- Backend áp dụng permission trước khi gọi service thay đổi dữ liệu và trả 403 rõ ràng, không tạo side effect hoặc audit nghiệp vụ giả.
- Domain validation, trạng thái chứng từ và nguyên tắc maker-checker chạy sau authorization nhưng trước mutation.

### 6. Data-scope enforcement

Quyền mở API không mặc nhiên cho phép đọc mọi bản ghi. Query/service phải lấy actor từ authenticated session và áp dụng scope server-side:

- `SELF`: chấm công, phiếu lương, ca làm và hồ sơ cá nhân của actor.
- `OWN_REQUESTS`: yêu cầu do actor tạo; không tải queue của người khác.
- `WAREHOUSE`: audit và báo cáo thuộc danh mục, bản sách, nhà cung cấp, nhập/xuất, kiểm kê.
- `TRANSACTION_CONTEXT`: Cashier chỉ xem dữ liệu kho/khách cần thiết cho giao dịch đang xử lý.
- `ALL`: chỉ Admin hoặc permission protected được chỉ định rõ.

Client-provided `employeeId`, `requestedBy`, `approvedBy`, actor ID hoặc role không được dùng làm nguồn quyền.

## Effective Permission Resolution

Thứ tự quyết định quyền:

1. Xác thực session và role hợp lệ.
2. Áp dụng protected deny/allow: Admin-only, self-scope, warehouse-scope và maker-checker.
3. Đọc baseline screen access của role.
4. Áp dụng permission động cho các action được phép cấu hình theo `ADR-007`.
5. Suy effective screen access:
   - không có permission đọc hợp lệ → `N`;
   - có permission đọc, không có permission ghi → `R`;
   - có permission đọc và ít nhất một permission ghi → `R, U`.
6. Áp dụng data scope và domain validation tại backend cho request cụ thể.

Khi chưa từng lưu RBAC matrix, permission mặc định lấy từ metadata role của API. Sau khi đã lưu, permission thiếu hoặc API mới chưa được cấp phải fail closed như `ADR-007`.

## Main Flow

1. Người dùng đăng nhập; backend trả session với một trong ba role chuẩn.
2. Frontend tải permission hiệu lực của role hiện tại.
3. Shared policy resolver xây Sidebar và xác định route đầu tiên được phép.
4. Khi điều hướng, route guard kiểm tra effective access trước khi mount page/query.
5. Page chỉ render tab và action được phép.
6. Mỗi API request được backend kiểm tra permission, protected constraint và data scope.
7. Request hợp lệ mới đi vào domain service; request bị từ chối trả 403 và không thay đổi dữ liệu.
8. Khi Admin cập nhật RBAC matrix, request kế tiếp dùng quyền mới; frontend refetch khi focus và theo chu kỳ tối đa 15 giây trong tab đang mở.

## Alternate and Error Flows

- Session không hợp lệ hoặc hết hạn: trả 401; frontend kết thúc phiên và quay về `/login` với safe return path.
- Role không thuộc ba role chuẩn: fail closed, không render workspace.
- Route không có policy: hiển thị 403/404 an toàn, không mount page nghiệp vụ.
- Permission endpoint lỗi hoặc cấu hình hỏng: không cho thao tác ghi; backend từ chối quyền không xác định.
- Người dùng nhập trực tiếp route `N`: hiển thị 403, không redirect sang trang có thể làm lộ tên/dữ liệu đối tượng.
- Permission bị thu hồi khi đang mở form: lần submit nhận 403, giữ dữ liệu chưa lưu, refresh permission và hướng dẫn người dùng quay lại.
- ID thuộc ngoài scope: backend trả 403; dùng 404 thay thế chỉ khi cần tránh xác nhận sự tồn tại của dữ liệu nhạy cảm.
- Admin tự duyệt yêu cầu do chính mình tạo: trả 403 hoặc 409 theo spec nghiệp vụ, không thay đổi trạng thái.
- Alias route: canonicalize trước khi resolve policy và không được tạo đường vòng vượt guard.

## Data and State Changes

- Tiếp tục dùng RBAC matrix trong `SystemSettings` và audit hiện có; không cần thêm role hoặc diễn dịch bảng nhãn cũ.
- Mỗi lần cấp/thu hồi permission ghi snapshot trước/sau, actor, reason và effective time trong cùng transaction.
- Screen-policy catalog là metadata source-controlled, không chứa secret hoặc dữ liệu người dùng.
- Permission không được lưu dài hạn trong JWT. Backend đọc trạng thái hiệu lực cho request hiện tại theo `ADR-007`.
- Không ghi lại hoặc thay đổi giao dịch lịch sử khi permission thay đổi.

## Missing Screens Identified

Hai năng lực trong SSOT chưa có màn hình canonical và cần spec/plan riêng:

1. Báo cáo kho, đề xuất route `/reports/inventory`: Cashier `N`, Admin `R`, Inventory `R`.
2. Báo cáo giao dịch/ca cá nhân của Cashier: ưu tiên tích hợp dữ liệu scoped vào `/dashboard` và `/pos/shift`; nếu tạo route mới phải bổ sung policy trước khi phát hành.

Các thiếu sót này không chặn triển khai enforcement cho route hiện có.

## Acceptance Criteria

1. Có đúng ba role nghiệp vụ: `ADMIN`, `CASHIER` và `INVENTORY_MANAGER`; mọi alias cũ hoặc role không hợp lệ phải bị từ chối fail-closed.
2. Mỗi route authenticated và mỗi tab nghiệp vụ có một screen policy; policy thiếu bị fail closed.
3. Với từng ô `N`, item không có trong Sidebar, URL trực tiếp không mount query nghiệp vụ và người dùng nhận 403 hoặc redirect guest-only đúng thiết kế.
4. Với từng ô `R`, người dùng đọc được dữ liệu đúng scope nhưng không thấy action ghi; gọi trực tiếp unsafe API bị 403 và dữ liệu không đổi.
5. Với từng ô `R, U`, chỉ action có permission tương ứng được render và API hợp lệ thực thi thành công.
6. Sidebar và route guard dùng chung policy resolver; test contract chứng minh không có nav item cho route mà guard từ chối và không có route được phép nhưng navigation vô cớ ẩn.
7. Inventory mở `/pos` chỉ thấy tab Thu mua; Cashier/Admin thấy đúng tab theo permission. Tab mặc định không bao giờ là tab bị cấm.
8. Cashier và Inventory không tải danh sách nhân viên, bảng lương toàn cửa hàng, queue duyệt của người khác, RBAC matrix, integration secret hoặc báo cáo tài chính.
9. Cashier/Inventory chỉ đọc phiếu lương, chấm công, ca và yêu cầu của chính actor dù sửa `employeeId` hoặc request payload.
10. Inventory đọc audit đúng `WAREHOUSE` scope và không nhận audit tài khoản, lương, két, RBAC hoặc cấu hình.
11. Chỉ Admin có thể duyệt ngoại lệ; Admin tự duyệt yêu cầu của mình bị từ chối và không thay đổi dữ liệu.
12. Cấp/thu hồi permission động có hiệu lực từ request kế tiếp; quyền Admin-only không thể cấp cho role khác hoặc tắt cho Admin.
13. Khi permission bị thu hồi trong lúc mở trang, submit tiếp theo nhận 403, form không mất dữ liệu và UI cập nhật quyền sau refetch.
14. Tất cả unsafe request tiếp tục yêu cầu CSRF hợp lệ; permission không làm suy yếu session, CSRF hoặc domain validation.
15. `/book-series` không xuất hiện trong production navigation/routing; `/catalog/series` là màn hình canonical.
16. Có test backend cho allowed/forbidden/data-scope của từng API và test frontend cho Sidebar/route/tab/action của cả ba role.

## Non-functional Requirements

- Fail closed khi role, permission hoặc policy không xác định.
- Không có security decision chỉ tồn tại ở frontend.
- Không gửi dữ liệu ngoài scope rồi mới ẩn bằng CSS/component.
- Permission refresh không gây vòng lặp request; thay đổi quyền được phản ánh tối đa 15 giây hoặc ngay khi window focus.
- Mọi 403 có response nhất quán, không lộ secret, token, dữ liệu lương hoặc dữ liệu actor khác.
- Việc kiểm tra permission phải đủ nhẹ để áp dụng cho mọi request; không cache vượt quá thời điểm hiệu lực được `ADR-007` cho phép.
- Test ma trận là data-driven để một route/permission mới buộc phải khai báo policy và expectation theo ba role.

## Open Questions

Không có câu hỏi P0 chặn design này. Route báo cáo kho và cách trình bày báo cáo ca/giao dịch cá nhân là lát cắt UI riêng, không làm thay đổi nguyên tắc enforcement đã chấp thuận.
