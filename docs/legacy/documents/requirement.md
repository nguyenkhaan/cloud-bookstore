# ĐẶC TẢ YÊU CẦU CHỨC NĂNG

Tài liệu này chuyển PRD thành các yêu cầu chức năng có thể dùng để thiết kế API, lập kế hoạch phát triển và kiểm thử. Nội dung chi tiết và lý do nghiệp vụ được mô tả tại:

- [PRD – Nghiệp vụ cốt lõi](./prd-nghiep-vu-cot-loi.md)
- [PRD – Vận hành nội bộ và quy tắc hệ thống](./prd-van-hanh-va-he-thong.md)
- [PRD tổng hợp](./prd.md)

Nếu có khác biệt, quyết định đã xác nhận và hai PRD chi tiết được ưu tiên hơn tài liệu này. Nội dung chưa chốt được ghi **[TBD - Unconfirmed]**.

## 1. Phạm vi

### 1.1. Phạm vi MVP

Hệ thống là web app nội bộ phục vụ một cửa hàng vật lý, bao gồm:

- POS và trang quản trị cho nhân viên.
- Bán sách cũ và cho thuê sách/truyện tranh tại quầy.
- Thu mua sách cũ từ khách và nhập sách từ nhà cung cấp.
- Quản lý từng bản sách vật lý bằng barcode.
- Thanh toán tiền mặt và VietQR có xác nhận bằng API/webhook ngân hàng.
- Hồ sơ khách hàng, hạng thành viên, nhân viên, ca làm, chấm công và lương.
- Ca thu ngân, két tiền, thông báo, báo cáo và dữ liệu phục vụ kê khai thuế.

### 1.2. Ngoài phạm vi MVP

- Trang thương mại điện tử hoặc ứng dụng dành cho khách.
- Khách hàng tự đăng ký, đăng nhập hoặc thao tác trực tiếp.
- Đặt trước hoặc giữ chỗ sách.
- Giao nhận sách tận nơi.
- Quản lý nhiều chi nhánh.
- Vận hành chương trình điểm tích lũy.
- Firebase Cloud Messaging.
- Tự động chuyển tiền ra từ tài khoản ngân hàng.
- Tự động nộp hồ sơ thuế.
- Đổi trả sách đã bán theo chính sách thông thường.

## 2. Đối tượng sử dụng

| Đối tượng   | Phạm vi chính                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Admin gốc      | Tài khoản seed có toàn quyền, không thể bị hạ quyền hoặc xóa bằng luồng thông thường.  |
| Admin           | Được cấp quyền qua RBAC; quản lý tài khoản, vai trò, cấu hình và chức năng được cấp. |
| Quản lý       | Phê duyệt ngoại lệ, quản lý kho, nhân sự, ca, lương và báo cáo theo quyền.                |
| Thu ngân       | Bán, thuê, trả, thu mua, thanh toán và quản lý két trong ca.                                    |
| Nhân viên kho | Nhập/xuất kho, in barcode (isbn), kiểm kê và xử lý tồn kho theo quyền.                         |
| Nhân viên     | Vai trò mặc định với quyền tối thiểu; được cấp thêm quyền khi cần.                       |
| Khách hàng    | Chỉ có hồ sơ nghiệp vụ; không có tài khoản đăng nhập trong MVP.                            |

## 3. Nguyên tắc nghiệp vụ chung

- Chỉ vận hành một cửa hàng vật lý.
- Mọi giao dịch mua, bán, thuê, trả và thu mua diễn ra tại quầy.
- Mỗi bản sách vật lý có barcode duy nhất.
- Chỉ bản Khả dụng được bán hoặc cho thuê.
- Một bản sách không thể thuộc hai giao dịch đang có hiệu lực cùng lúc.
- Mọi khoản thu/chi phải liên kết với chứng từ nguồn.
- Dữ liệu tài chính đã hoàn tất không được sửa hoặc xóa trực tiếp.
- Sửa sai dùng giao dịch đảo/điều chỉnh có phê duyệt và nhật ký.
- Giá trị dùng để tính cọc và trần phạt là giá bán thực tế của từng bản vật lý.
- Các giá trị chưa chốt phải là cấu hình hoặc mang nhãn **[TBD - Unconfirmed]**.

## 4. Tài khoản và xác thực

| Mã     | Yêu cầu                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | Hệ thống phải seed một tài khoản Admin gốc khi triển khai.                                                     |
| AUTH-02 | Admin gốc phải có toàn quyền và không thể bị hạ quyền, khóa hoặc xóa qua API quản trị thông thường. |
| AUTH-03 | Admin phải có API thêm, xem, cập nhật và thu hồi email nhân viên trong danh sách được phép đăng ký.   |
| AUTH-04 | Mỗi email được cho phép chỉ được dùng để đăng ký một tài khoản.                                      |
| AUTH-05 | Nhân viên được tự đăng ký khi email đã được Admin khai báo trước và chưa được sử dụng.         |
| AUTH-06 | Hệ thống phải gửi OTP tới email nhân viên và chỉ kích hoạt tài khoản sau khi OTP hợp lệ.                |
| AUTH-07 | Tài khoản mới nhận vai trò mặc định Nhân viên, trừ khi có cấu hình khác.                                |
| AUTH-08 | Hệ thống hỗ trợ đăng nhập, đăng xuất, đổi mật khẩu và đặt lại mật khẩu qua email.                  |
| AUTH-09 | Admin được khóa, mở khóa hoặc vô hiệu hóa tài khoản không được bảo vệ.                               |
| AUTH-10 | Khách hàng không được tạo tài khoản hoặc đăng nhập trong MVP.                                             |

**[TBD - Unconfirmed]**: Thời hạn OTP, số lần nhập sai, thời gian chờ gửi lại, chính sách mật khẩu và thời gian phiên.

## 5. Phân quyền và nhật ký

| Mã     | Yêu cầu                                                                                                       |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| RBAC-01 | Hệ thống phải quản lý quyền theo vai trò.                                                                |
| RBAC-02 | Admin có quyền được tạo, cập nhật và ngừng sử dụng vai trò.                                        |
| RBAC-03 | Hệ thống phải hỗ trợ gán vai trò và quyền riêng cho nhân viên.                                      |
| RBAC-04 | Backend phải kiểm tra quyền tại mọi API được bảo vệ.                                                  |
| RBAC-05 | Các vai trò mẫu gồm Admin, Quản lý, Thu ngân, Nhân viên kho và Nhân viên.                           |
| AUD-01  | Nhật ký phải lưu người thực hiện, hành động, đối tượng, thời gian và lý do khi cần.          |
| AUD-02  | Thay đổi quyền, giá, kho, trạng thái tài khoản, tiền phạt và giao dịch phải được ghi nhật ký. |
| AUD-03  | Với điều chỉnh nhạy cảm, nhật ký phải lưu giá trị trước và sau.                                  |
| AUD-04  | Người có quyền phải tra cứu được nhật ký theo thời gian, người dùng và loại hành động.      |

## 6. Danh mục, bộ sách và bản sách

| Mã    | Yêu cầu                                                                                                               |
| ------ | ----------------------------------------------------------------------------------------------------------------------- |
| CAT-01 | Hệ thống cho phép tạo, cập nhật, ngừng sử dụng và tra cứu danh mục/thể loại.                              |
| CAT-02 | Hệ thống phải quản lý bộ sách có nhiều tập và sách độc lập không thuộc bộ.                            |
| CAT-03 | Đầu sách/tập lưu tên, ISBN nếu có, tác giả, nhà xuất bản, năm xuất bản, giá bìa, ảnh và mô tả.    |
| CAT-04 | Một đầu sách có thể có nhiều bản vật lý.                                                                     |
| CAT-05 | Mỗi bản vật lý phải có barcode nội bộ duy nhất.                                                                |
| CAT-06 | Bản sách lưu nguồn nhập, Grade, mô tả tình trạng, giá vốn, giá bán, đơn giá thuê và trạng thái.     |
| CAT-07 | Giá bán thực tế phải được xác nhận trước khi bản chuyển sang Khả dụng.                                  |
| CAT-08 | Hệ thống hỗ trợ tra cứu metadata bằng ISBN qua Google Books hoặc Open Library.                                   |
| CAT-09 | Nhân viên phải xác nhận/chỉnh sửa dữ liệu API và luôn xác nhận giá bìa.                                  |
| CAT-10 | Khi API lỗi hoặc sách không có ISBN, hệ thống cho phép nhập thủ công.                                        |
| CAT-11 | Dữ liệu thủ công tối thiểu gồm tên sách/tập, tác giả và giá bìa ước tính.                             |
| CAT-12 | Hệ thống cho phép tìm kiếm theo mã, barcode, tên, bộ, tập, ISBN, tác giả, danh mục, Grade và trạng thái. |

## 7. Nhà cung cấp và kho

| Mã    | Yêu cầu                                                                                                                       |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| INV-01 | Người có quyền được tạo, cập nhật, ngừng hợp tác và tra cứu nhà cung cấp.                                      |
| INV-02 | Phiếu nhập phải lưu nhà cung cấp, ngày nhập, người lập, chi tiết sách, số lượng, đơn giá và tổng chi phí. |
| INV-03 | Khi xác nhận phiếu nhập, hệ thống phải tạo riêng từng bản vật lý và barcode.                                      |
| INV-04 | Phiếu xuất ngoài bán hàng phải ghi từng bản sách và lý do như hỏng, mất hoặc thanh lý.                          |
| INV-05 | Hệ thống phải lưu lịch sử nhập, xuất, bán, thuê, trả, kiểm kê và thay đổi trạng thái từng bản.              |
| INV-06 | Người có quyền được tạo phiếu kiểm kê theo phạm vi.                                                                 |
| INV-07 | Bản sách trong phạm vi kiểm kê phải bị khóa khỏi giao dịch xuất kho.                                                 |
| INV-08 | Chênh lệch kiểm kê chỉ cập nhật tồn kho sau khi được phê duyệt.                                                    |
| INV-09 | Ngưỡng tồn tối thiểu mặc định là một bản khả dụng/đầu sách và có thể cấu hình.                             |
| INV-10 | Khi tồn khả dụng chạm hoặc thấp hơn ngưỡng, hệ thống phải tạo cảnh báo nội bộ.                                 |
| INV-11 | Hệ thống phải hỗ trợ giới hạn số lượng nhập tối thiểu/tối đa bằng cấu hình.                                   |

## 8. Thu mua sách cũ từ khách hàng

| Mã    | Yêu cầu                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ |
| PUR-01 | Người bán phải có hồ sơ gồm tối thiểu họ tên và số điện thoại.                        |
| PUR-02 | Nhân viên được quét ISBN, chọn đầu sách có sẵn hoặc nhập thủ công.                     |
| PUR-03 | Mỗi cuốn phải được thẩm định Grade A, B, C hoặc D.                                           |
| PUR-04 | Hệ thống phải gợi ý khoảng giá mua theo Grade và giá bìa.                                    |
| PUR-05 | Giá thỏa thuận cuối cùng phải được nhân viên nhập và khách đồng ý.                    |
| PUR-06 | Đơn giá hoặc tổng phiếu vượt hạn mức phải chuyển sang Chờ duyệt.                         |
| PUR-07 | Phiếu thu mua phải lưu người bán, người tiếp nhận, từng cuốn, Grade, giá và tổng tiền. |
| PUR-08 | Cửa hàng được chi tiền mặt hoặc chuyển khoản cho người bán.                               |
| PUR-09 | Chuyển khoản chi được thực hiện bên ngoài; nhân viên nhập mã giao dịch để đối soát. |
| PUR-10 | Sau khi hoàn tất, hệ thống tạo riêng bản vật lý và barcode cho từng cuốn.                  |
| PUR-11 | Khoản chi phải được ghi vào chi phí thu mua và liên kết chứng từ nguồn.                   |
| PUR-12 | Phiếu đã chi tiền không được xóa/hủy trực tiếp.                                            |

Khung gợi ý hiện tại:

- Grade A: 35%–45% giá bìa.
- Grade B: 20%–30% giá bìa.
- Grade C: 10%–15% giá bìa.
- Grade D: cảnh báo từ chối hoặc xử lý theo giá thanh lý.

**[TBD - Unconfirmed]**: Hạn mức từng vai trò, quy tắc làm tròn và xử lý phiếu chỉ chấp nhận một phần.

## 9. Bán sách tại quầy

| Mã    | Yêu cầu                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------- |
| SAL-01 | Thu ngân phải quét barcode (isbn) từng bản khi lập hóa đơn.                              |
| SAL-02 | Chỉ bản Khả dụng, đã có giá bán và không bị khóa mới được thêm vào hóa đơn. |
| SAL-03 | Hồ sơ khách là tùy chọn đối với giao dịch bán.                                         |
| SAL-04 | Hệ thống phải lấy giá từng bản và áp dụng ưu đãi thành viên nếu có.              |
| SAL-05 | Hóa đơn chỉ chuyển sang Đã thanh toán sau khi thanh toán thành công.                   |
| SAL-06 | Sau thanh toán, bản sách chuyển sang Đã bán và rời tồn kho khả dụng.                  |
| SAL-07 | Doanh thu và tổng chi tiêu hợp lệ của khách phải được cập nhật sau hoàn tất.       |
| SAL-08 | Hóa đơn chưa thanh toán được hủy và phải giải phóng khóa bản sách.                |
| SAL-09 | Sách đã bán không được đổi trả/hoàn tiền thông thường.                            |
| SAL-10 | Ngoại lệ quét nhầm barcode chỉ được yêu cầu trong vòng 24 giờ.                        |
| SAL-11 | Ngoại lệ phải được Quản lý duyệt, dùng giao dịch đảo và lưu nhật ký.             |
| SAL-12 | Giao dịch đảo phải điều chỉnh doanh thu, tổng chi tiêu và trạng thái bản sách.      |

**[TBD - Unconfirmed]**: Xác nhận cuối cùng tỷ lệ giảm giá bán 5% cho Bạc và 10% cho Vàng.

## 10. Cho thuê sách

| Mã    | Yêu cầu                                                                                     |
| ------ | --------------------------------------------------------------------------------------------- |
| REN-01 | Khách thuê bắt buộc có hồ sơ với họ tên và số điện thoại.                      |
| REN-02 | Phiếu có tổng giá trị sách trên 1.000.000 VNĐ yêu cầu thêm CCCD và địa chỉ.    |
| REN-03 | Hệ thống phải chặn khách có phiếu quá hạn hoặc nghĩa vụ thuê chưa thanh toán.  |
| REN-04 | Hệ thống phải kiểm tra số bản thuê tối đa theo hạng.                                |
| REN-05 | Thu ngân phải quét barcode từng bản khi lập phiếu.                                     |
| REN-06 | Chỉ bản Khả dụng được đưa vào phiếu thuê.                                         |
| REN-07 | Tiền cọc mỗi bản bằng 100% giá bán thực tế của bản đó.                           |
| REN-08 | Mọi hạng thành viên áp dụng tỷ lệ cọc 100%; ưu đãi không làm giảm cọc.        |
| REN-09 | Khách phải thanh toán đủ cọc trước khi nhận sách.                                   |
| REN-10 | Sau xác nhận cọc, phiếu chuyển Đang thuê và bản sách chuyển Đang cho thuê.       |
| REN-11 | Phí thuê chưa thu khi giao sách; được quyết toán lúc trả.                          |
| REN-12 | Hệ thống phải lưu hạng áp dụng, hạn trả, đơn giá và lịch sử thay đổi phiếu. |

Hạn mức mặc định:

| Hạng    |                  Tổng chi tiêu hợp lệ | Số bản tối đa | Thời hạn tối đa |
| -------- | ----------------------------------------: | ----------------: | ------------------: |
| Thường |                     Dưới 1.000.000 VNĐ |                 3 |            14 ngày |
| Bạc     | Từ 1.000.000 đến dưới 3.000.000 VNĐ |                 5 |            21 ngày |
| Vàng    |                        Từ 3.000.000 VNĐ |                 8 |            30 ngày |

### 10.1. Công thức phí thuê

`Phí thuê = Tổng (đơn giá thuê/ngày của từng bản × số ngày thuê thực tế) × (1 − tỷ lệ giảm theo hạng)`

- Tính theo chu kỳ 24 giờ.
- Tối thiểu một ngày.
- Đơn giá và tỷ lệ giảm phải cấu hình được.

**[TBD - Unconfirmed]**: Đơn giá, tỷ lệ giảm, quy tắc phần ngày lẻ, làm tròn tiền và thời điểm xác định hạng áp dụng.

## 11. Gia hạn thuê

| Mã    | Yêu cầu                                                                                   |
| ------ | ------------------------------------------------------------------------------------------- |
| EXT-01 | Một phiếu được gia hạn tối đa hai lần.                                             |
| EXT-02 | Mỗi lần gia hạn không quá bảy ngày.                                                  |
| EXT-03 | Hệ thống không kiểm tra giữ chỗ vì MVP không có giữ chỗ.                         |
| EXT-04 | Hệ thống phải lưu hạn cũ, hạn mới, số ngày, thời điểm và người thực hiện. |
| EXT-05 | Phí gia hạn là phí thuê phát sinh và được cộng vào quyết toán lúc trả.      |
| EXT-06 | Sau gia hạn, hệ thống gửi thông báo hạn mới qua Zalo.                               |

**[TBD - Unconfirmed]**: Có cho phép gia hạn phiếu đã quá hạn sau khi xử lý phạt tạm tính hay không.

## 12. Trả sách và quyết toán

| Mã    | Yêu cầu                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ |
| RET-01 | Khách phải trả toàn bộ bản sách trên cùng phiếu trong một lần.                             |
| RET-02 | Hệ thống không hỗ trợ trả từng phần trong MVP.                                                 |
| RET-03 | Nhân viên phải quét đủ barcode; barcode không thuộc phiếu phải bị từ chối.                |
| RET-04 | Nhân viên phải ghi nhận tình trạng thực tế của từng bản.                                    |
| RET-05 | Hệ thống tính phí thuê, gia hạn, quá hạn và hư hỏng trước khi quyết toán.               |
| RET-06 | Tiền phải thu được khấu trừ vào cọc trước khi hoàn phần còn lại.                        |
| RET-07 | Nếu cọc không đủ, phiếu chuyển Chờ thanh toán bổ sung.                                       |
| RET-08 | Phiếu chỉ hoàn tất sau khi mọi khoản thu/hoàn đã được xác nhận.                          |
| RET-09 | Bản nguyên vẹn về Khả dụng; bản hỏng/mất chuyển trạng thái tương ứng.                   |
| RET-10 | Phí thuê và gia hạn được cộng vào tổng chi tiêu; cọc và tiền phạt không được cộng. |

### 12.1. Quá hạn

| Mã     | Yêu cầu                                                                              |
| ------- | -------------------------------------------------------------------------------------- |
| LATE-01 | Có thời gian miễn phạt hai giờ sau hạn trả.                                     |
| LATE-02 | Sau thời gian miễn phạt, số ngày trễ được làm tròn lên.                    |
| LATE-03 | Phạt mỗi ngày bằng 150% đơn giá thuê/ngày của bản.                          |
| LATE-04 | Tổng phạt quá hạn một bản không vượt 100% giá bán thực tế của bản đó. |
| LATE-05 | Phạt quá hạn được khấu trừ vào tiền cọc.                                    |

### 12.2. Hư hỏng và mất sách

| Mã     | Yêu cầu                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------ |
| DMG-01  | Mức hư hỏng được cấu hình theo tỷ lệ phần trăm giá trị bản sách.                 |
| DMG-02  | Nhân viên chọn mức; hệ thống tự tính tiền phạt.                                        |
| DMG-03  | Điều chỉnh ngoài khung phải được Quản lý duyệt và lưu nhật ký.                    |
| LOST-01 | Với bản bị mất, cửa hàng giữ toàn bộ tiền cọc của bản đó.                         |
| LOST-02 | Không thu thêm bồi thường giá trị sách cho bản mất vì cọc đã bằng 100% giá trị. |
| LOST-03 | Cọc của các bản khác trên phiếu vẫn được quyết toán riêng.                         |

**[TBD - Unconfirmed]**: Các mức hư hỏng, tỷ lệ và trạng thái bản sách sau xử lý.

## 13. Khách hàng và hạng thành viên

| Mã    | Yêu cầu                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ |
| CUS-01 | Nhân viên được tạo, cập nhật, tra cứu và thay đổi trạng thái hồ sơ khách.             |
| CUS-02 | Hệ thống phải phát hiện hồ sơ có khả năng trùng theo số điện thoại/định danh.         |
| CUS-03 | Hồ sơ phải hiển thị lịch sử mua, thuê, trả, phạt, thu mua và yêu cầu hỗ trợ.            |
| CUS-04 | Tổng chi tiêu chỉ gồm tiền mua sách, phí thuê và phí gia hạn đã thanh toán.              |
| CUS-05 | Không tính cọc, tiền phạt, bồi thường hoặc tiền cửa hàng chi thu mua.                      |
| CUS-06 | Giao dịch đảo phải làm giảm tổng chi tiêu tương ứng.                                        |
| CUS-07 | Hệ thống tự động tính lại và nâng/hạ hạng theo tổng chi tiêu.                             |
| CUS-08 | Mọi thay đổi hạng phải lưu hạng cũ, hạng mới, tổng chi tiêu, thời gian và nguyên nhân. |
| CUS-09 | MVP không cộng, trừ, đổi hoặc hiển thị số dư điểm tích lũy.                              |

## 14. Thanh toán và đối soát

| Mã    | Yêu cầu                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------- |
| PMT-01 | Hệ thống hỗ trợ thanh toán tiền mặt và VietQR.                                                |
| PMT-02 | Tiền mặt phải ghi số phải thu, số nhận và tiền thừa.                                        |
| PMT-03 | Giao dịch tiền mặt phải liên kết với ca thu ngân đang mở.                                   |
| PMT-04 | Mỗi yêu cầu chuyển khoản phải sinh VietQR có mã tham chiếu và số tiền chính xác.        |
| PMT-05 | Mã QR hết hạn sau 15 phút.                                                                        |
| PMT-06 | Backend phải nhận và xác thực webhook ngân hàng.                                               |
| PMT-07 | Chỉ webhook hợp lệ, đúng tham chiếu và đủ số tiền mới xác nhận thanh toán.             |
| PMT-08 | Webhook trùng không được tạo thanh toán trùng.                                                |
| PMT-09 | Webhook đến muộn, tiền thiếu/thừa hoặc sai nội dung phải chuyển Cần đối soát.           |
| PMT-10 | Thanh toán Thành công bị đóng băng; sửa sai dùng giao dịch đảo.                           |
| PMT-11 | API ngân hàng chỉ xác nhận tiền vào, không tự động chuyển tiền ra.                       |
| PMT-12 | Khoản chuyển ra được thực hiện bên ngoài và ghi mã giao dịch/chứng từ trong hệ thống. |

**[TBD - Unconfirmed]**: Ngân hàng/nhà cung cấp, chuẩn ký webhook, retry và quy trình đối soát sai lệch.

## 15. Hoàn tiền cọc và các khoản chi

| Mã    | Yêu cầu                                                                                |
| ------ | ---------------------------------------------------------------------------------------- |
| OUT-01 | Hoàn cọc tiền mặt phải tạo khoản chi trong ca thu ngân.                          |
| OUT-02 | Hoàn cọc chuyển khoản được thực hiện ngoài hệ thống và lưu mã giao dịch. |
| OUT-03 | Khoản hoàn phải liên kết với phiếu thuê.                                         |
| OUT-04 | Chi thu mua phải liên kết với phiếu thu mua.                                        |
| OUT-05 | Chi lương phải liên kết với bảng lương.                                         |

**[TBD - Unconfirmed]**: Có bắt buộc hoàn cọc theo phương thức nộp ban đầu hay không.

## 16. Ca thu ngân và két tiền

| Mã     | Yêu cầu                                                                            |
| ------- | ------------------------------------------------------------------------------------ |
| CASH-01 | Nhân viên có quyền được mở ca và nhập tiền đầu ca.                      |
| CASH-02 | Hệ thống phải chặn ca mở trùng của cùng nhân viên/két.                    |
| CASH-03 | Mọi khoản thu/chi tiền mặt phải cập nhật số dư lý thuyết của ca.         |
| CASH-04 | Tiền chuyển khoản không được tính vào số dư tiền mặt.                   |
| CASH-05 | Khi đóng ca, nhân viên nhập tiền kiểm đếm thực tế.                        |
| CASH-06 | Hệ thống tính chênh lệch giữa tiền thực tế và lý thuyết.                 |
| CASH-07 | Chênh lệch bắt buộc có giải trình; vượt ngưỡng phải được phê duyệt. |
| CASH-08 | Ca đã đóng không nhận thêm giao dịch và không được sửa trực tiếp.    |
| CASH-09 | Hệ thống phải hỗ trợ dữ liệu bàn giao giữa hai ca.                          |

**[TBD - Unconfirmed]**: Một hay nhiều két vật lý, ngưỡng chênh lệch cần duyệt và quy tắc chi khi két không đủ.

## 17. Nhân viên, ca làm và chấm công

| Mã    | Yêu cầu                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------ |
| EMP-01 | Người có quyền được tạo, cập nhật, tra cứu và ngừng làm việc hồ sơ nhân viên.       |
| EMP-02 | Hồ sơ nhân viên phải liên kết với tài khoản đăng nhập.                                    |
| EMP-03 | Quản lý được cấu hình mẫu ca và số nhân viên tối thiểu.                                  |
| EMP-04 | Hệ thống hỗ trợ lập lịch theo tuần/tháng và gán nhân viên.                                 |
| EMP-05 | Hệ thống chặn ca trùng và lịch vượt 12 giờ/ngày hoặc 48 giờ/tuần.                         |
| EMP-06 | Hệ thống cảnh báo ca thiếu người và chỉ công bố khi không còn lỗi chặn.                 |
| EMP-07 | Nhân viên được gửi yêu cầu nghỉ/đổi ca; Quản lý duyệt hoặc từ chối.                   |
| EMP-08 | Nhân viên phải check-in và check-out.                                                              |
| EMP-09 | Thiếu một đầu chấm công phải đánh dấu Thiếu chấm công và không tự tính giờ hợp lệ. |
| EMP-10 | Điều chỉnh chấm công phải có lý do, phê duyệt và lịch sử cũ/mới.                        |
| EMP-11 | Bảng công đã chốt bị khóa; mở lại cần quyền Admin và nhật ký.                            |

**[TBD - Unconfirmed]**: Ca qua ngày, thời gian nghỉ, xác thực check-in/out và quy trình xác nhận đổi ca.

## 18. Quản lý lương

| Mã     | Yêu cầu                                                                                   |
| ------- | ------------------------------------------------------------------------------------------- |
| PAYR-01 | Hệ thống hỗ trợ lương theo giờ, theo ca hoặc theo tháng.                           |
| PAYR-02 | Bảng lương lấy dữ liệu từ bảng công đã chốt.                                    |
| PAYR-03 | Hệ thống tính lương cơ bản, tăng ca, phụ cấp, thưởng, khấu trừ và tạm ứng. |
| PAYR-04 | Điều chỉnh thủ công phải có lý do.                                                  |
| PAYR-05 | Admin/Quản lý có quyền được duyệt và chốt bảng lương.                          |
| PAYR-06 | Bảng lương đã chốt bị khóa; mở lại phải có quyền và nhật ký.                |
| PAYR-07 | Hệ thống ghi nhận chi trả tiền mặt hoặc chuyển khoản.                              |
| PAYR-08 | Hệ thống không tự động chuyển lương qua API ngân hàng.                           |
| PAYR-09 | Hệ thống xuất bảng công và bảng lương Excel/PDF.                                   |

**[TBD - Unconfirmed]**: Hình thức lương chính thức, hệ số tăng ca, xử lý thiếu công và thanh toán lương nhiều lần.

## 19. Yêu cầu/báo cáo của khách hàng

| Mã    | Yêu cầu                                                                           |
| ------ | ----------------------------------------------------------------------------------- |
| SUP-01 | MVP sử dụng một bảng dữ liệu chính cho yêu cầu/báo cáo của khách.      |
| SUP-02 | Hệ thống cung cấp API CRUD cơ bản.                                             |
| SUP-03 | Bản ghi có thể liên kết với khách hàng và giao dịch nếu có.             |
| SUP-04 | Hệ thống không lưu nguồn tiếp nhận.                                          |
| SUP-05 | MVP không có workflow ticket nhiều bước hoặc cổng tự phục vụ của khách. |
| SUP-06 | Quyền tạo, xem, sửa và xóa phải được quản lý riêng trong RBAC.          |

**[TBD - Unconfirmed]**: Trường dữ liệu cuối cùng, loại, trạng thái và chính sách xóa mềm/xóa cứng.

## 20. Thông báo

| Mã    | Yêu cầu                                                                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| NOT-01 | Khách hàng nhận thông báo qua Zalo.                                                                      |
| NOT-02 | Nhân viên nhận thông báo nội bộ và email.                                                             |
| NOT-03 | Hệ thống không sử dụng Firebase Cloud Messaging.                                                         |
| NOT-04 | Sự kiện khách gồm nhận sách, thanh toán, gia hạn, sắp đến hạn, quá hạn, trả sách và thu mua. |
| NOT-05 | Sự kiện nhân viên gồm lịch làm, phê duyệt, tồn kho, kiểm kê, két, lương và đối soát.       |
| NOT-06 | Hệ thống lưu người nhận, kênh, nội dung/mẫu, thời điểm, trạng thái và lỗi gửi.               |
| NOT-07 | Thông báo thất bại phải có khả năng gửi lại.                                                        |
| NOT-08 | Không gửi mật khẩu, OTP đọc được, CCCD hoặc dữ liệu nhạy cảm không cần thiết.                |

**[TBD - Unconfirmed]**: Zalo OA trực tiếp hay trung gian, mẫu tin, lịch nhắc hạn và retry.

## 21. Báo cáo và dữ liệu thuế

| Mã    | Yêu cầu                                                                                 |
| ------ | ----------------------------------------------------------------------------------------- |
| RPT-01 | Báo cáo bán theo đầu sách, danh mục, nhân viên và thời gian.                   |
| RPT-02 | Báo cáo thuê gồm lượt thuê, phí thuê, gia hạn, quá hạn, phạt và sách mất. |
| RPT-03 | Báo cáo thu mua/nhập hàng theo nguồn, Grade, số lượng và chi phí.               |
| RPT-04 | Báo cáo tồn kho theo trạng thái, ngưỡng, tuổi tồn và chênh lệch kiểm kê.    |
| RPT-05 | Báo cáo doanh thu tách bán, thuê, gia hạn và tiền phạt.                          |
| RPT-06 | Tiền cọc không được tính là doanh thu.                                            |
| RPT-07 | Báo cáo chi phí gồm nhập hàng, thu mua và nhân sự.                               |
| RPT-08 | Báo cáo nhân sự gồm giờ công, tăng ca, vi phạm và lương.                      |
| RPT-09 | Báo cáo ca thu ngân gồm đầu ca, thu/chi, lý thuyết, thực tế và chênh lệch.   |
| RPT-10 | Hệ thống tổng hợp dữ liệu phục vụ kê khai thuế theo tháng/quý.                |
| RPT-11 | Hệ thống chỉ tổng hợp/xuất dữ liệu, không tự nộp hồ sơ thuế.                |
| RPT-12 | Báo cáo phải xuất được Excel và PDF.                                              |
| RPT-13 | Báo cáo chỉ tính giao dịch hợp lệ; giao dịch đảo phải giảm số liệu.         |

**[TBD - Unconfirmed]**: Cách phân loại cọc bị giữ/tiền phạt cho thuế và mẫu Excel/PDF cuối cùng.

## 22. Cấu hình hệ thống

| Mã    | Yêu cầu                                                                                             |
| ------ | ----------------------------------------------------------------------------------------------------- |
| CFG-01 | Hệ thống dùng VNĐ và có quy tắc hiển thị tiền thống nhất.                                 |
| CFG-02 | Đơn giá thuê, tỷ lệ giảm, ngưỡng hạng và hạn mức thuê phải cấu hình được.         |
| CFG-03 | Số lần gia hạn, số ngày gia hạn, miễn phạt, hệ số và trần phạt phải cấu hình được. |
| CFG-04 | Các mức hư hỏng và tỷ lệ phạt phải cấu hình được.                                       |
| CFG-05 | Hạn mức thu mua và vai trò phê duyệt phải cấu hình được.                                  |
| CFG-06 | Ngưỡng tồn và giới hạn số lượng nhập phải cấu hình được.                              |
| CFG-07 | Mẫu ca, giới hạn giờ làm và tham số lương phải cấu hình được.                          |
| CFG-08 | Tích hợp ngân hàng, email, Zalo và API sách phải có cấu hình riêng.                        |
| CFG-09 | Mọi thay đổi cấu hình phải lưu giá trị cũ/mới, người thực hiện và thời gian.         |
| CFG-10 | Cấu hình mới không tự động viết lại giao dịch lịch sử.                                    |

## 23. Vòng đời dữ liệu chính

### 23.1. Bản sách

`Chờ hoàn tất nhập → Khả dụng → Đang cho thuê → Khả dụng/Hư hỏng/Thất lạc`

`Khả dụng → Đã bán`

`Khả dụng/Hư hỏng → Thanh lý/Ngừng kinh doanh`

`Khả dụng → Đang khóa kiểm kê → Khả dụng/Trạng thái điều chỉnh`

### 23.2. Hóa đơn bán

`Nháp → Chờ thanh toán → Đã thanh toán/Đã hủy`

Ngoại lệ: `Đã thanh toán → Đang yêu cầu đảo → Đã đảo/Từ chối`.

### 23.3. Phiếu thuê

`Nháp → Chờ thanh toán cọc → Đang thuê → Sắp đến hạn/Quá hạn → Đang quyết toán → Đã hoàn tất`

Không có trạng thái Trả một phần trong MVP.

### 23.4. Phiếu thu mua

`Nháp → Chờ khách đồng ý/Chờ duyệt → Đã duyệt → Chờ chi tiền → Đã hoàn tất`

Nhánh khác: `Từ chối/Đã hủy`.

### 23.5. Thanh toán

`Khởi tạo → Chờ thanh toán → Thành công/Thất bại/Hết hạn/Cần đối soát`

### 23.6. Ca thu ngân

`Đang mở → Đang kiểm đếm → Chờ duyệt chênh lệch/Đã đóng`

### 23.7. Bảng công và bảng lương

- Bảng công: `Nháp → Chờ kiểm tra → Đã chốt → Mở lại có kiểm soát`.
- Bảng lương: `Nháp → Chờ duyệt → Đã chốt → Đã thanh toán`.

## 24. Ngoại lệ bắt buộc xử lý

Hệ thống phải có hành vi rõ ràng cho các trường hợp:

- Sách không có ISBN hoặc API thư mục sách lỗi.
- Barcode không tồn tại, bị quét trùng hoặc không thuộc phiếu trả.
- Hai nhân viên thao tác đồng thời trên cùng bản sách.
- Webhook sai chữ ký, trùng, đến muộn hoặc không khớp số tiền.
- Mất kết nối khi đang thanh toán.
- Tiền cọc không đủ để quyết toán.
- Chênh lệch kiểm kê hoặc chênh lệch két.
- Dịch vụ Zalo/email thất bại.

Backend phải dùng mã yêu cầu/định danh giao dịch để chống xử lý lặp đối với các thao tác tài chính.

## 25. Danh sách quyết định còn mở

- **[TBD - Unconfirmed]** Chính sách OTP, mật khẩu và phiên.
- **[TBD - Unconfirmed]** Đơn giá thuê và tỷ lệ giảm theo hạng.
- **[TBD - Unconfirmed]** Giảm giá bán theo hạng.
- **[TBD - Unconfirmed]** Quy tắc làm tròn phí và thời gian.
- **[TBD - Unconfirmed]** Gia hạn phiếu quá hạn.
- **[TBD - Unconfirmed]** Phương thức hoàn cọc.
- **[TBD - Unconfirmed]** Mức phạt hư hỏng.
- **[TBD - Unconfirmed]** Hạn mức thu mua.
- **[TBD - Unconfirmed]** Cấu hình két, chấm công và lương.
- **[TBD - Unconfirmed]** Nhà cung cấp VietQR và xác thực webhook.
- **[TBD - Unconfirmed]** Cách tích hợp Zalo và mẫu thông báo.
- **[TBD - Unconfirmed]** Cách phân loại cọc bị giữ/tiền phạt trong báo cáo thuế.
- **[TBD - Unconfirmed]** Mẫu xuất Excel/PDF.
- **[TBD - Unconfirmed]** Trường dữ liệu cuối cùng của module yêu cầu khách hàng.
