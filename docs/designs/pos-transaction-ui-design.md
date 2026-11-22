# Thiết kế UI — Workspace Quầy giao dịch thuê & bán sách

## Trạng thái

**Approved — mock UI đã triển khai trong `app/frontend/src/features/pos`**

Thiết kế này chỉ bao gồm giao diện frontend và dữ liệu fixture local. Chưa bao gồm API, service, TanStack Query, backend, database, thanh toán thật, webhook VietQR hoặc thực thi phân quyền thật.

## Phạm vi

Thiết kế các màn hình quầy giao dịch sau:

| Mã yêu cầu | Mã trong Figma | Tên màn hình | Hình thức |
| --- | --- | --- | --- |
| `SRC-POS-02` | `SCR-POS-02` | Bán sách cũ & hàng bán lẻ tại quầy | Tab trong workspace |
| `SRC-POS-03` | `SCR-POS-03` | Lập phiếu cho thuê sách | Tab trong workspace |
| `SRC-POS-04` | `SCR-POS-04` | Tra cứu & gia hạn phiếu thuê | Tab trong workspace |
| `SRC-POS-05` | `SCR-POS-05` | Nhận trả sách & quyết toán tiền cọc | Tab trong workspace |
| `SRC-POS-07` | `SCR-POS-07` | Màn hình phụ hướng khách hàng (VietQR) | Route riêng |
| `MOD-POS-01` | `MOD-POS-01` | Bộ chọn nhanh theo bộ truyện | Modal trong workspace |
| `MOD-POS-02` | `MOD-POS-02` | Thẩm định hư hỏng ngoại lệ | Modal trong workspace |

Trong request người dùng dùng tiền tố `SRC`; Figma và tài liệu hiện hành dùng `SCR`. Khi triển khai, dùng tên `SCR-*` theo Figma và giữ bảng ánh xạ này để không mất liên kết yêu cầu.

## Nguồn tham chiếu

- [Figma — Cloud Bookstore](https://www.figma.com/design/ylSYDMUTYepn3GJ8eyeImv/Cloud-Bookstore?node-id=0-1)
- Figma node `30:24432` — `SCR-POS-02`.
- Figma node `8:35041` — `SCR-POS-03`.
- Figma node `8:35291` — `SCR-POS-04`.
- Figma node `8:35508` — `SCR-POS-05`.
- Figma node `8:36013` — `SCR-POS-07`.
- Figma node `196:3523` — `MOD-POS-01`.
- Figma node `196:3623` — `MOD-POS-02`.
- [Feature catalog](../FEATURE.md): `BUY-*`, `SALE-*`, `RENT-*`, `EXT-*`, `RETURN-*`, `CUS-*`, `MEMBER-*`, `PAY-*`.
- [Business rules](../requirements/BUSINESS_RULES.md): `BR-SALE-*`, `BR-RENT-*`, `BR-RETURN-*`, `BR-MEMBER-*`, `BR-PAY-*`, `BR-GEN-*`.
- [Workflows](../requirements/WORKFLOWS.md): `WF-01` đến `WF-07`.
- [PDR-002 — Admin phê duyệt ngoại lệ](../decisions/PDR-002-three-roles-and-approval.md).
- [PDR-003 — Chính sách thuê và thành viên](../decisions/PDR-003-rental-and-membership-policy.md).
- [PDR-005 — Phân biệt đầu sách, ấn bản và bản vật lý](../decisions/PDR-005-title-edition-copy-identification.md).
- [PDR-007 — Khả dụng đồng thời cho bán và thuê](../decisions/PDR-007-dual-channel-book-copy-availability.md).
- [Frontend instructions](../../app/frontend/AGENTS.md).

Figma được dùng làm reference về bố cục, mật độ thông tin và ngôn ngữ thị giác. Các điểm không phù hợp với SSOT của dự án được điều chỉnh theo tài liệu nghiệp vụ ở trên.

## Mục tiêu

- Tạo một workspace POS thống nhất cho nhân viên đứng quầy, giảm số lần chuyển màn hình trong các luồng bán, thuê, gia hạn và trả sách.
- Giữ lại cấu trúc rõ ràng của Figma: scanner ở vùng trọng tâm, bảng dòng sách ở trung tâm, panel khách hàng/thanh toán ở bên phải và trạng thái nghiệp vụ ở cuối màn hình.
- Làm cho các hành động tại quầy có thể thao tác bằng chuột và bàn phím, đặc biệt là ô quét `CopyBarcode`.
- Mô phỏng được các trạng thái chính bằng local state để đội sản phẩm có thể duyệt UI trước khi nối backend.
- Tách màn hình hướng khách hàng `SCR-POS-07` khỏi shell nội bộ để có thể hiển thị trên màn hình phụ.

## Không làm trong phạm vi này

- Không tạo endpoint, service, hook, query key hoặc request HTTP mới.
- Không chỉnh sửa `src/contract/api-contract.ts`.
- Không xây dựng logic tính tiền thật, khóa bản sách, kiểm tra tồn kho, tính hạng thành viên hoặc kiểm tra quyền từ backend.
- Không triển khai thanh toán VietQR thật, webhook, đối soát hoặc chuyển khoản ra.
- Không thay đổi màn hình `SCR-POS-01` đang có trong phase ca làm việc và két tiền mặt.
- Không tạo module thu mua độc lập; `MOD-POS-01` chỉ là modal mock phục vụ ngữ cảnh POS.
- Không chốt các policy còn mở trong tài liệu dự án bằng cách suy diễn từ dữ liệu Figma.

## Anti-goals

Thiết kế sẽ bị coi là sai phạm vi nếu:

- Biến một giá trị fixture thành quy tắc nghiệp vụ cố định.
- Dùng ISBN để nhận diện dòng giao dịch hoặc bản sách vật lý thay cho `CopyBarcode`.
- Cho phép role `Quản lý` tự duyệt ngoại lệ, vì hệ thống hiện chỉ có `Admin`, `Employee` và `Warehouse`; các tài liệu cũ ghi “Quản lý duyệt” phải ánh xạ về `Admin`.
- Tạo một màn hình khách hàng công khai hoặc luồng tự phục vụ ngoài màn hình phụ tại quầy.
- Nhồi cả bảy mã vào một page dài khiến scanner, tổng tiền và hành động chính bị khuất.

## Các hướng đã cân nhắc

### Hướng A — Mỗi mã là một route độc lập

Mỗi màn hình có URL và page component riêng, ví dụ `/pos/sale`, `/pos/rent`, `/pos/renew` và `/pos/return`.

Ưu điểm là deep-link rõ ràng và mỗi page dễ cô lập. Nhược điểm là nhân viên phải chuyển route nhiều lần, có nguy cơ lặp lại scanner, summary và payment panel; không phù hợp với yêu cầu “quầy giao dịch” liên tục.

### Hướng B — Một page duy nhất, tất cả đều là modal

Mọi nghiệp vụ đều hiển thị trong một workspace nền, còn bán, thuê, trả và gia hạn đều mở bằng modal.

Ưu điểm là không đổi route. Nhược điểm là các màn hình nghiệp vụ lớn không đủ không gian, bảng dòng sách và panel thanh toán dễ bị nén; không phù hợp với mật độ của Figma và thao tác tại quầy.

### Hướng C — Workspace kết hợp tab, modal và route màn hình phụ — được chọn

- `SCR-POS-02/03/04/05` dùng chung `/pos` và chuyển bằng tab.
- `MOD-POS-01/02` là modal thuộc workspace, mở theo hành động ngữ cảnh.
- `SCR-POS-07` dùng route riêng `/pos/customer-display` vì layout hướng khách hàng không có sidebar/header nội bộ.
- `SCR-POS-01` tiếp tục ở `/pos/shift` và không bị thay thế trong lát cắt này.

Đây là hướng được chọn vì giữ được tốc độ chuyển nghiệp vụ của workspace, không hy sinh diện tích cho các bảng POS lớn, đồng thời cho phép mở màn hình VietQR trên cửa sổ hoặc thiết bị phụ.

## Cấu trúc route và module

Module sở hữu tiếp tục là `src/features/pos`.

| Route | Component dự kiến | Vai trò |
| --- | --- | --- |
| `/pos` | `PosWorkspacePage` | Workspace chứa bốn tab nghiệp vụ |
| `/pos/customer-display` | `PosCustomerDisplayPage` | Màn hình phụ hướng khách hàng |
| `/pos/shift` | `PosShiftPage` hiện có | Ca làm việc & két tiền mặt, ngoài phạm vi thay đổi |

Các tab trong `/pos` dùng local state `activeTab` hoặc query state tương đương. Không tạo route con bắt buộc cho từng tab ở lát cắt mock UI này.

Component dự kiến, có thể điều chỉnh khi lập plan triển khai:

```text
src/features/pos/
├── components/
│   ├── PosWorkspaceTabs.tsx
│   ├── PosScannerField.tsx
│   ├── PosSalePanel.tsx
│   ├── PosRentalPanel.tsx
│   ├── PosRenewalPanel.tsx
│   ├── PosReturnPanel.tsx
│   ├── PosPaymentPanel.tsx
│   ├── PosCustomerDisplay.tsx
│   ├── QuickSeriesPickerModal.tsx
│   └── DamageReviewModal.tsx
├── pages/
│   ├── PosWorkspacePage.tsx
│   ├── PosCustomerDisplayPage.tsx
│   └── PosShiftPage.tsx
├── pos-transaction.fixture.ts
└── pos-transaction.type.ts
```

Không tạo `*.service.ts` hoặc `*.hook.ts` cho mock UI. Khi có backend contract, các fixture và local state sẽ được thay thế theo một plan riêng.

## Nền tảng thị giác chung

- Dùng `MainLayout` hiện tại cho `/pos`.
- Dùng canvas `#f8fafc`, surface trắng, border slate nhẹ, brand indigo hiện có.
- Dùng font và theme trong `app/frontend/src/index.css`; không dùng các style cũ trong `App.css` cho POS.
- Tái sử dụng `Card`, `Button`, `Badge`, `TextField`, `SelectBox`, icon hiện có và `cn()`.
- Card dùng góc bo và shadow nhẹ tương tự Figma nhưng không thêm gradient trang trí.
- Semantic state:
  - indigo/blue: thông tin, lựa chọn hiện tại, QR pending;
  - emerald: đã thanh toán, đã xác nhận, sẵn sàng;
  - amber: cảnh báo, sắp quá hạn, chờ xử lý;
  - rose: lỗi quét, thiếu tiền, cần phê duyệt hoặc không hợp lệ.
- Bảng POS giữ mật độ cao trên desktop nhưng phải có bounded scroll; không để toàn bộ page scroll ngang.

## Workspace `/pos`

### Header và tabs

Header dùng `MainLayout` với:

- Breadcrumb: `Không gian làm việc / Quầy giao dịch`.
- Tên page: `Quầy giao dịch`.
- Mã màn hình thay đổi theo tab: `SCR-POS-02`, `SCR-POS-03`, `SCR-POS-04` hoặc `SCR-POS-05`.
- Context ca hiện tại: `Ca đang mở`, người phụ trách và thời điểm mở ở dạng fixture.
- Tab chính có label và mã ngắn, không chỉ dùng màu để biểu thị tab đang chọn.

Tab không được làm mất dữ liệu nhập local khi chuyển qua lại trong cùng một phiên mock; mỗi tab có fixture/state riêng và có thể reset bằng thao tác `Tạo giao dịch mới`.

### Hành vi chung của scanner

`PosScannerField` là control ưu tiên bàn phím:

- Label rõ: `Quét CopyBarcode bản sách` hoặc `Quét mã phiếu thuê` tùy ngữ cảnh.
- Có trạng thái focus nổi bật và hint phím `Enter`.
- Nhấn Enter với fixture barcode hợp lệ sẽ thêm một dòng mẫu.
- Barcode không thuộc giao dịch, đã trùng hoặc không đủ điều kiện hiển thị alert inline; không gọi API.
- Không hiển thị ISBN như barcode giao dịch. Nếu có ô tìm ấn bản, label phải nói rõ `ISBN tra cứu ấn bản`, tách khỏi `CopyBarcode`.

### `SCR-POS-02` — Bán sách cũ & hàng bán lẻ

#### Mục đích

Mô phỏng việc nhân viên quét từng bản sách khả dụng, gắn khách hàng tùy chọn và hoàn tất hóa đơn bằng tiền mặt hoặc VietQR.

#### Bố cục

1. Tab context: `Bán hàng`.
2. Card trái/lớn `Giỏ hàng tại quầy`:
   - scanner `CopyBarcode`;
   - trạng thái máy quét;
   - banner lỗi hoặc cảnh báo;
   - bảng các cột: STT, `CopyBarcode / Đầu sách — Tập`, Grade, niêm yết, giảm, thành tiền;
   - tổng số bản và tổng tiền hàng;
   - action hủy giao dịch/đảo yêu cầu chỉ là UI disabled hoặc placeholder, không thực thi đảo thật.
3. Panel phải `Khách hàng & Thanh toán`:
   - mặc định `Khách vãng lai`;
   - thao tác tạo/chọn khách hàng chỉ mở placeholder local;
   - hạng thành viên và giảm giá hiển thị nếu fixture có khách;
   - chọn `Tiền mặt` hoặc `VietQR`;
   - tiền khách đưa, tiền thừa và tổng cần thanh toán;
   - button `Thanh toán & In hóa đơn` ở trạng thái mock.
4. Hàng dưới:
   - preview VietQR và trạng thái thanh toán;
   - preview hóa đơn;
   - cảnh báo xung đột bản sách, chứng từ và kiểm tra thanh toán.

#### Ràng buộc UI

- Khách hàng là tùy chọn cho bán.
- Chỉ hiển thị copy có khả năng `BOTH` hoặc `SALE_ONLY` trong fixture.
- Dòng bán dùng `CopyBarcode`, còn ISBN chỉ xuất hiện nếu người dùng mở ngữ cảnh tra cứu ấn bản.
- Giảm giá thành viên chỉ áp dụng trên giá bán; không tạo trường giảm trên khoản cọc/phạt.
- Trạng thái `Đã thanh toán` chỉ là trạng thái demo, không khẳng định webhook thật.

### `SCR-POS-03` — Lập phiếu cho thuê sách

#### Mục đích

Mô phỏng lập phiếu thuê cho khách có hồ sơ, quét nhiều bản sách, hiển thị giới hạn hạng và thu đủ cọc trước khi giao sách.

#### Bố cục

1. Tab context: `Cho thuê`.
2. Card `Bản sách khách chọn`:
   - scanner `CopyBarcode`;
   - danh sách bản với giá bán thực tế, đơn giá thuê/ngày minh họa, ngày bắt đầu và ước tính phí;
   - tổng giá bán thực tế của các bản.
3. Panel `Thông tin khách thuê bắt buộc`:
   - số điện thoại;
   - họ tên và hạng;
   - CCCD và địa chỉ hiện tại hiển thị khi fixture vượt ngưỡng 1.000.000 VNĐ;
   - các cảnh báo nợ, quá hạn hoặc vượt hạn mức.
4. Panel `Thu tiền cọc`:
   - tổng cọc bằng **100% giá bán thực tế** của từng bản;
   - phí thuê chỉ hiển thị là khoản quyết toán khi trả, không thu trong màn hình lập phiếu;
   - chọn tiền mặt/VietQR;
   - button `Xác nhận & In phiếu thuê`.
5. Hàng dưới là các trạng thái mock: khóa tạo phiếu, vượt hạn mức, cọc trên ngưỡng.

#### Ràng buộc UI

- Khách thuê phải có họ tên và số điện thoại trong mock form.
- Một bản đang bị thuê, đã bán, bị khóa hoặc không khả dụng không được đưa vào danh sách hợp lệ.
- Phiếu chỉ hiển thị trạng thái `Đang thuê` sau khi fixture chuyển sang `Đã nhận đủ cọc`.
- Đơn giá, cách làm tròn và phí phát sinh chỉ là fixture hiển thị; không viết công thức nghiệp vụ vì `OQ-003` chưa được giải quyết.

### `SCR-POS-04` — Tra cứu & gia hạn phiếu thuê

#### Mục đích

Mô phỏng tra cứu phiếu bằng mã phiếu, số điện thoại hoặc `CopyBarcode`, sau đó tạo preview gia hạn tại quầy.

#### Bố cục

1. Tab context: `Gia hạn`.
2. Thanh tra cứu lớn với hint `RENT-... hoặc nhập số điện thoại`.
3. Card thông tin phiếu:
   - mã phiếu, khách thuê, hạng, ngày thuê, hạn trả;
   - số lần đã gia hạn và số ngày còn lại;
   - các bản đang cho thuê với giá bán thực tế, cọc và trạng thái.
4. Card `Thiết bị gia hạn`:
   - số ngày gia hạn đề xuất;
   - hạn trả mới ở dạng preview;
   - phí gia hạn minh họa;
   - tổng nghĩa vụ dự kiến khi trả;
   - button `Tính phí gia hạn dự kiến` và `Xác nhận gia hạn`.
5. Card lịch sử gia hạn và hàng trạng thái: còn hạn, đã gia hạn tối đa, khóa vì chậm trả/cọc.

#### Ràng buộc UI

- Chỉ mở action gia hạn khi phiếu còn hạn, chưa vượt 2 lần và số ngày mock không vượt 7.
- Không hiển thị action thu phí ngay tại thời điểm gia hạn; phí được đưa vào quyết toán khi trả.
- Nếu phiếu đã quá hạn hoặc có nghĩa vụ chưa xử lý, action xác nhận bị disabled và có lý do bằng text.

### `SCR-POS-05` — Nhận trả sách & quyết toán tiền cọc

#### Mục đích

Mô phỏng quét đủ các bản của phiếu thuê, ghi nhận tình trạng, khấu trừ nghĩa vụ vào cọc và hiển thị số tiền cần hoàn hoặc thu thêm.

#### Bố cục

1. Tab context: `Trả & quyết toán`.
2. Card `Kiểm định toàn bộ phiếu`:
   - scanner từng `CopyBarcode`;
   - tiến độ `đã quét / tổng số bản`;
   - dòng sách có tình trạng `Đã quét`, `Đánh dấu báo`, `Chờ quét`;
   - cảnh báo quá hạn hoặc quét sai bản.
3. Action phụ: `Đánh dấu mất cuốn đang chọn`, `Gửi duyệt phạt hư hỏng ngoại lệ` mở `MOD-POS-02`.
4. Card `Căn cứ khấu trừ`:
   - phí thuê thực tế;
   - phí gia hạn;
   - phạt quá hạn;
   - hỏng/mất;
   - số tiền và công thức hiển thị theo fixture.
5. Panel phải `Quyết toán tiền cọc`:
   - cọc ban đầu;
   - các khoản trừ;
   - `Hoàn khách` hoặc `Khách cần trả thêm`;
   - tiền mặt/chuyển khoản ngoài;
   - mã tham chiếu VietQR nếu cần;
   - button hoàn tất chỉ enabled khi đủ bản đã quét/đánh dấu và nghĩa vụ được xử lý trong mock.

#### Ràng buộc UI

- MVP nhận trả toàn bộ phiếu trong một lần; không tạo action trả một phần.
- Cọc bị khấu trừ trước khi hoàn phần dư.
- Nếu cọc không đủ, hiển thị trạng thái `Chờ thanh toán bổ sung`, không đánh dấu hoàn tất.
- Trạng thái hư hỏng và tỷ lệ bồi thường trong fixture phải có chú thích `Minh họa — chờ OQ-004`, không được coi là policy đã chốt.

### `SCR-POS-07` — Màn hình phụ hướng khách hàng

#### Mục đích

Hiển thị những gì khách cần nhìn khi nhân viên tạo yêu cầu VietQR: sách đã chọn, tổng tiền, QR, mã tham chiếu và trạng thái thanh toán.

#### Bố cục

- Không có `MainLayout`, sidebar hoặc thao tác quản trị.
- Header tối giản: logo/tên nhà sách và mã yêu cầu mock ở góc phải.
- Cột trái: `Những cuốn sách bạn chọn`, số lượng, hạng thành viên, giá từng dòng, tổng tiền hàng và ưu đãi.
- Cột phải: `Quét mã để thanh toán`, tổng tiền nổi bật, QR fixture, ngân hàng nhận dạng mẫu, mã nội dung, thời hạn 15 phút và trạng thái `Đang chờ thanh toán`/`Thanh toán thành công`.
- Banner cuối màn hình thông báo trạng thái sau thanh toán.

#### Ràng buộc UI

- Đây là màn hình dành cho khách tại quầy, không phải cổng khách hàng công khai.
- QR là ảnh fixture hoặc placeholder local; không dùng URL asset tạm của Figma làm runtime source.
- Trạng thái thành công chỉ do nút/chuyển state local trong mock tạo ra.
- Nội dung không hiển thị dữ liệu nhạy cảm ngoài thông tin cần để thanh toán.
- Trong lát cắt này, màn hình phụ chỉ trình diễn thanh toán của giao dịch bán sách, không mở rộng sang cọc thuê hoặc hoàn tiền khi trả.
- Action `Mở màn hình phụ` mở route này ở tab/cửa sổ mới trong cùng trình duyệt; workspace truyền fixture hiện tại qua cơ chế local như `BroadcastChannel`, còn khi mở trực tiếp thì màn hình dùng fixture mặc định.
- Không hỗ trợ đồng bộ sang thiết bị khác và không dùng local persistence như một nguồn dữ liệu nghiệp vụ.

## Modal

### `MOD-POS-01` — Bộ chọn nhanh theo bộ truyện

Modal mở từ context POS mock khi nhân viên cần chọn nhanh nhiều tập của cùng bộ truyện.

Bố cục:

- Header có mã `MOD-POS-01`, tên bộ truyện và nút đóng.
- Ô tìm bộ truyện/đầu sách.
- Nhóm filter tập: tất cả, khoảng tập, tập đang thiếu.
- Grid nút tập với trạng thái đã chọn, chưa chọn và không khả dụng.
- Vùng cấu hình cho các tập đã chọn: Grade, giá bìa tham chiếu, giá thỏa thuận/tập và giá bán dự kiến/tập.
- Footer hiển thị số tập, tổng tiền chi trả fixture, `Hủy bỏ` và `Áp dụng`.

Ràng buộc:

- ISBN nếu xuất hiện chỉ để tìm ấn bản; modal không dùng ISBN làm định danh bản vật lý.
- Giá thỏa thuận là dữ liệu nhập local, không gửi chi tiền hoặc tạo bản sách.
- Trong lát cắt UI-only, `Áp dụng` chỉ trả danh sách tập và draft giá về parent để hiển thị preview; không tạo dòng bán, không khóa tồn kho và không tự sinh `CopyBarcode`.

### `MOD-POS-02` — Thẩm định hư hỏng ngoại lệ

Modal mở từ `SCR-POS-05` khi nhân viên cần ghi nhận hư hỏng cần duyệt.

Bố cục:

- Header có mã modal, mã phiếu và khách thuê.
- Thông tin bản sách: `CopyBarcode`, đầu sách/tập, giá bán thực tế/cọc.
- Select mô tả tình trạng và vùng hiển thị mức bồi thường fixture.
- Hai vùng ảnh hư hỏng dạng placeholder; action `Chụp ảnh webcam / Tải ảnh` chỉ là UI mock.
- Hai nhánh xử lý:
  - `Admin phê duyệt tại chỗ`: nhập PIN mock và ghi chú;
  - `Gửi duyệt từ xa tới Trung tâm Phê duyệt`: chuyển trạng thái chờ duyệt mock.
- Footer `Hủy bỏ` và action xác nhận.

Ràng buộc:

- Copy Figma ghi “Quản lý” được chuẩn hóa thành `Admin` theo `PDR-002`.
- Mức bồi thường, tỷ lệ và trạng thái kho sau hư hỏng là placeholder vì `OQ-004`/`BR-DAMAGE-001` đang mở.
- Không mô phỏng rằng `Employee` hoặc `Warehouse` có thể tự duyệt.
- Modal phải hiển thị rõ trạng thái `Chờ Admin duyệt` nếu không phê duyệt tại chỗ.
- Fixture của modal dùng người duyệt hiện tại là `Admin`; không tạo role switch hoặc ma trận quyền giả trong lát cắt mock.

## Fixture và local state

Fixture cần đủ để trình diễn các trạng thái sau, nhưng không được coi là dữ liệu nghiệp vụ thật:

- giao dịch bán khách vãng lai và khách hạng Bạc;
- phiếu thuê khách hạng Bạc có 2–3 bản;
- phiếu thuê còn hạn, đã gia hạn 1 lần và bị khóa vì quá hạn;
- trả đủ bản, trả có quá hạn, cọc dư và cọc thiếu;
- dòng bản sách bị hỏng với nhãn `Minh họa — chờ OQ-004`;
- VietQR pending và success;
- modal chọn nhanh có tập đã chọn, thiếu và không khả dụng.

Local state được phép:

- chuyển tab;
- thêm/xóa fixture line bằng scanner;
- chọn khách, phương thức thanh toán và trạng thái QR;
- mở/đóng modal;
- chọn tình trạng hư hỏng và nhánh phê duyệt mock;
- reset giao dịch về fixture ban đầu.

Local state không được:

- gọi API hoặc giả lập retry/webhook như đã tích hợp thật;
- tự tính policy chưa chốt rồi lưu thành dữ liệu chính thức;
- sửa dữ liệu global hoặc thay thế state của `PosShiftPage`.

## Responsive và accessibility

Kiểm tra ở khoảng `390px`, `768px` và `1440px`.

- Ở desktop, workspace dùng grid hai vùng: content chính và panel thanh toán/thông tin.
- Ở tablet, panel bên phải chuyển xuống dưới content chính nhưng vẫn giữ summary tổng tiền gần action chính.
- Ở mobile, tabs có thể scroll trong vùng bounded; scanner và action thanh toán full-width; bảng dòng sách chuyển thành list/card đọc được.
- `SCR-POS-07` giữ hai cột ở desktop và stack ở mobile.
- Modal dùng `role="dialog"`, có accessible title, đóng bằng Escape, focus vào control chính và không tạo keyboard trap.
- Mọi input có label nhìn thấy; mọi icon-only button có `aria-label`.
- Trạng thái luôn có text, không chỉ dùng màu.
- Focus ring hiện rõ trên tab, scanner, input, select, button và row action.
- Tôn trọng `prefers-reduced-motion`; không dùng animation làm tín hiệu trạng thái duy nhất.

## Kế hoạch kiểm chứng sau khi được duyệt

Sau khi design doc được duyệt, plan triển khai sẽ tách thành các lát cắt:

1. Workspace shell và tab state, không đổi logic `SCR-POS-01`.
2. `SCR-POS-02` bán sách và payment mock.
3. `SCR-POS-03` thuê sách và cọc mock.
4. `SCR-POS-04` gia hạn và `SCR-POS-05` trả/quyết toán.
5. Hai modal `MOD-POS-01/02`.
6. Route và layout `SCR-POS-07`.
7. Responsive/accessibility và regression.

Acceptance chính:

- Bảy mã yêu cầu có component/UI tương ứng đúng hình thức tab, route hoặc modal.
- `/pos` mở workspace; `/pos/customer-display` mở màn hình hướng khách hàng.
- Không có API call, service mới, hook mới hoặc chỉnh sửa generated contract.
- UI dùng `CopyBarcode` cho giao dịch và hiển thị cọc thuê theo giá bán thực tế.
- `MOD-POS-02` không biến tỷ lệ fixture thành policy đã chốt và chỉ mô phỏng quyền Admin.
- Có trạng thái populated, empty, invalid, pending, success, disabled và error phù hợp với từng màn hình.
- `bun run test`, `bun run lint`, `bun run build` và `git diff --check` pass sau triển khai.

## Blocker cần giữ nguyên trong giai đoạn mock

Các P0 sau chưa được giải quyết trong [OPEN_QUESTIONS.md](../OPEN_QUESTIONS.md):

- `OQ-003`: đơn giá thuê mặc định, phần ngày lẻ và làm tròn tiền.
- `OQ-004`: mức hư hỏng, tỷ lệ bồi thường và trạng thái bản sách sau xử lý.

Vì vậy, design này chỉ duyệt hình thái, hierarchy, copy và trạng thái giao diện. Trước khi nối logic tính tiền hoặc hoàn tất module nghiệp vụ, cần cập nhật decision/business rule tương ứng rồi lập plan mới.
