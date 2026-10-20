# Danh mục chức năng

**Trạng thái tài liệu:** Proposed — chờ người phụ trách sản phẩm duyệt  
**Mục đích:** xác định chức năng thuộc phạm vi; không thể hiện thứ tự triển khai hay tiến độ.

## Quy ước

- `Required`: thuộc phạm vi sản phẩm đã thống nhất.
- `Open policy`: chức năng thuộc phạm vi nhưng còn tham số trong [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md).
- Mỗi feature ID là ổn định và phải được dùng trong spec, test và pull request sau này.
- Chi tiết hành vi nằm trong [`requirements/`](./requirements/BUSINESS_RULES.md), không lặp lại toàn bộ tại đây.

## 1. Tài khoản, xác thực và phân quyền

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| AUTH-001 | Required | Seed một tài khoản Admin gốc được bảo vệ khi triển khai. |
| AUTH-002 | Required | Admin quản lý danh sách email nhân viên được phép đăng ký. |
| AUTH-003 | Open policy | Nhân viên đăng ký bằng email được cho phép và xác thực OTP. |
| AUTH-004 | Open policy | Đăng nhập, đăng xuất, đổi mật khẩu và đặt lại mật khẩu. |
| AUTH-005 | Required | Admin khóa, mở khóa hoặc vô hiệu hóa tài khoản không được bảo vệ. |
| RBAC-001 | Required | Hệ thống có đúng ba vai trò nghiệp vụ: Admin, Nhân viên và Quản lý kho. |
| RBAC-002 | Required | Backend kiểm tra quyền trên mọi API được bảo vệ. |
| RBAC-003 | Required | Chỉ Admin được phê duyệt ngoại lệ nhạy cảm. |
| AUD-001 | Required | Ghi audit log cho quyền, giá, kho, tài chính, chấm công, lương và cấu hình. |
| AUD-002 | Required | Tra cứu audit log theo người dùng, hành động, đối tượng và thời gian. |

## 2. Danh mục, ấn bản và bản sách vật lý

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| CAT-001 | Required | Quản lý thể loại, bộ sách, đầu sách/tập và quan hệ giữa chúng. |
| CAT-002 | Required | Một đầu sách/tập có một hoặc nhiều ấn bản; sách độc lập có thể không thuộc bộ. |
| CAT-003 | Required | Quản lý metadata chung của đầu sách/tập: tên, số tập, tác giả, mô tả và thể loại. |
| EDITION-001 | Required | Quản lý từng ấn bản với ISBN tùy chọn, NXB, năm xuất bản, lần xuất bản/tái bản, định dạng, giá bìa và ảnh bìa. |
| EDITION-002 | Required | ISBN không phải khóa chính, không định danh bản vật lý và không tự cung cấp lần tái bản/ấn bản. |
| EDITION-003 | Required | Cho phép nhiều ấn bản có cùng ISBN khi metadata tái bản khác nhau và đã được nhân viên xác nhận. |
| BOOK-001 | Required | Quản lý từng bản sách vật lý bằng `CopyBarcode` nội bộ duy nhất và liên kết đúng một ấn bản. |
| BOOK-002 | Required | Lưu nguồn nhập, Grade, tình trạng, giá vốn, giá bán và đơn giá thuê từng bản. |
| BOOK-003 | Required | Quản lý vòng đời bản sách và lịch sử chuyển trạng thái. |
| BOOK-004 | Required | Tìm kiếm theo CopyBarcode, ISBN, ấn bản, tên, bộ/tập, tác giả, thể loại, Grade và trạng thái. |
| BOOK-005 | Required | In hoặc tái in tem CopyBarcode theo quyền, không thay đổi danh tính bản sách. |
| BOOK-006 | Required | Dùng ISBN để tra cứu/chọn ấn bản; dùng CopyBarcode cho bán, thuê, trả và kiểm kê từng cuốn. |
| BOOK-007 | Required | Bản sách vật lý mặc định khả dụng cho cả Bán và Thuê; người có quyền kho có thể giới hạn thành chỉ Bán hoặc chỉ Thuê. |
| INT-BOOK-001 | Required | Tra cứu metadata ấn bản bằng ISBN qua Google Books/Open Library và yêu cầu nhân viên xác nhận. |
| INT-BOOK-002 | Required | Fallback nhập ấn bản thủ công khi API lỗi hoặc sách không có ISBN. |

## 3. Nhà cung cấp, nhập kho và kiểm kê

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| SUP-001 | Required | Quản lý hồ sơ và trạng thái nhà cung cấp. |
| INV-001 | Required | Lập, duyệt và hoàn tất phiếu nhập sách từ nhà cung cấp. |
| INV-002 | Required | Chọn/tạo ấn bản, sau đó tạo riêng từng bản vật lý và CopyBarcode khi nhập. |
| INV-003 | Required | Lập phiếu xuất/điều chỉnh cho hỏng, mất, thanh lý hoặc ngừng kinh doanh. |
| INV-004 | Required | Kiểm kê theo phạm vi và khóa bản sách trong thời gian kiểm kê. |
| INV-005 | Required | So sánh thực tế–hệ thống và tạo đề nghị điều chỉnh chờ Admin duyệt. |
| INV-006 | Required | Cảnh báo tồn khả dụng theo từng ấn bản và từng nhóm Bán/Thuê; bản khả dụng cho cả hai được tính cho cả hai nhóm trước khi so với ngưỡng riêng. |
| INV-007 | Required | Xem lịch sử biến động của từng bản sách. |

## 4. Thu mua sách cũ từ khách hàng

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| BUY-001 | Required | Tìm hoặc tạo hồ sơ người bán với họ tên và số điện thoại. |
| BUY-002 | Required | Dùng ISBN để tìm ấn bản; nhân viên chọn đúng ấn bản hoặc nhập metadata thủ công. |
| BUY-003 | Required | Thẩm định từng cuốn theo Grade A/B/C/D và mô tả tình trạng. |
| BUY-004 | Required | Gợi ý khoảng giá mua theo Grade và giá bìa. |
| BUY-005 | Open policy | Chuyển phiếu vượt hạn mức sang chờ Admin duyệt. |
| BUY-006 | Required | Ghi nhận chi tiền mặt hoặc chuyển khoản ngoài hệ thống. |
| BUY-007 | Required | Sau hoàn tất, tạo từng bản sách liên kết ấn bản, giá vốn, giá bán dự kiến và CopyBarcode. |
| BUY-008 | Required | Không xóa phiếu đã chi tiền; sửa sai bằng điều chỉnh/đảo có audit. |

## 5. Bán sách tại quầy

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| SALE-001 | Required | Nhân viên tạo hóa đơn và quét CopyBarcode từng bản sách. |
| SALE-002 | Required | Chỉ bản Khả dụng, cho phép Bán, đã định giá và không bị khóa mới được bán. |
| SALE-003 | Required | Cho phép bán khách vãng lai hoặc gắn hồ sơ khách hàng. |
| SALE-004 | Required | Áp dụng giảm giá thành viên: Thường 0%, Bạc 5%, Vàng 10%. |
| SALE-005 | Required | Hoàn tất hóa đơn chỉ sau khi thanh toán thành công. |
| SALE-006 | Required | Chuyển bản sách sang Đã bán và cập nhật doanh thu/tổng chi tiêu hợp lệ. |
| SALE-007 | Required | Hủy hóa đơn chưa thanh toán và giải phóng khóa bản sách. |
| SALE-008 | Required | Không đổi trả thông thường; quét nhầm trong 24 giờ cần Admin duyệt và giao dịch đảo. |

## 6. Cho thuê, gia hạn và trả sách

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| RENT-001 | Required | Lập phiếu thuê cho khách có hồ sơ và quét CopyBarcode từng bản. |
| RENT-002 | Required | Kiểm tra nợ, quá hạn, hạn mức hạng, trạng thái và quyền cho Thuê của từng bản. |
| RENT-003 | Required | Thu cọc bằng 100% giá bán thực tế của từng bản khi giao sách. |
| RENT-004 | Required | Chỉ chuyển phiếu sang Đang thuê sau khi xác nhận đủ cọc. |
| RENT-005 | Required | Tính phí thuê theo thời gian thực tế và thu khi trả sách. |
| EXT-001 | Required | Gia hạn tại quầy khi phiếu còn hạn, tối đa 2 lần, mỗi lần tối đa 7 ngày. |
| EXT-002 | Required | Không thu phí tại thời điểm gia hạn; cộng phí phát sinh vào quyết toán khi trả. |
| RETURN-001 | Required | Nhận trả toàn bộ các bản trong phiếu trong một lần; không trả từng phần. |
| RETURN-002 | Required | Quét đủ CopyBarcode và ghi tình trạng từng bản khi nhận lại. |
| RETURN-003 | Required | Tính phí thuê, gia hạn, quá hạn, hư hỏng hoặc mất sách. |
| RETURN-004 | Required | Khấu trừ nghĩa vụ vào cọc; thu thêm nếu thiếu và hoàn phần còn lại nếu dư. |
| RETURN-005 | Required | Cập nhật trạng thái bản sách và chỉ đóng phiếu khi đã quyết toán xong. |
| RETURN-006 | Open policy | Áp dụng mức hư hỏng và tỷ lệ bồi thường do hệ thống cấu hình. |

## 7. Khách hàng và thành viên

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| CUS-001 | Required | Quản lý hồ sơ khách hàng; khách không có tài khoản đăng nhập. |
| CUS-002 | Required | Phát hiện hồ sơ có khả năng trùng theo số điện thoại/định danh. |
| CUS-003 | Required | Tra cứu lịch sử mua, thuê–trả, phạt, thu mua và nghĩa vụ chưa xử lý. |
| MEMBER-001 | Required | Tự tính tổng chi tiêu hợp lệ và nâng/hạ hạng tự động. |
| MEMBER-002 | Required | Thường: dưới 1 triệu, tối đa 3 bản/14 ngày, giảm 0%. |
| MEMBER-003 | Required | Bạc: từ 1 đến dưới 3 triệu, tối đa 5 bản/21 ngày, giảm 5%. |
| MEMBER-004 | Required | Vàng: từ 3 triệu, tối đa 8 bản/30 ngày, giảm 10%. |
| MEMBER-005 | Required | Giảm giá áp dụng cho giá bán và phí thuê; không áp dụng cho cọc, phạt hay bồi thường. |
| MEMBER-006 | Required | Không triển khai điểm tích lũy. |
| CSR-001 | Open policy | Nhân viên ghi nhận và quản lý yêu cầu/báo cáo cơ bản của khách hàng. |

## 8. Thanh toán, đối soát và két tiền

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| PAY-001 | Required | Thu/chi tiền mặt và liên kết giao dịch với chứng từ nguồn. |
| PAY-002 | Required | Sinh VietQR theo số tiền và mã tham chiếu của từng yêu cầu thanh toán. |
| PAY-003 | Open policy | Xác thực webhook ngân hàng và đối chiếu tham chiếu, số tiền, tài khoản nhận. |
| PAY-004 | Required | Xử lý webhook idempotent; không tạo thanh toán trùng. |
| PAY-005 | Required | Đưa tiền thiếu/thừa, sai nội dung hoặc đến muộn vào danh sách đối soát. |
| PAY-006 | Required | API ngân hàng chỉ xác nhận tiền vào; khoản chuyển ra thực hiện bên ngoài. |
| PAY-007 | Required | Đóng băng giao dịch thành công; sửa sai bằng giao dịch đảo/điều chỉnh. |
| CASH-001 | Required | Mở một ca két và ghi nhận tiền đầu ca. |
| CASH-002 | Required | Liên kết thu/chi tiền mặt với ca két đang mở và tính số dư lý thuyết. |
| CASH-003 | Required | Đóng ca két, nhập số kiểm đếm, tính chênh lệch và bắt buộc giải trình khi có chênh lệch. |
| CASH-004 | Required | Chỉ Admin phê duyệt chênh lệch hoặc điều chỉnh két cần ngoại lệ. |
| CASH-005 | Required | Ca két đã đóng chỉ đọc; sửa sai bằng giao dịch điều chỉnh có audit. |

## 9. Nhân viên, ca làm, chấm công và lương

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| EMP-001 | Required | Admin quản lý hồ sơ, tài khoản, vai trò và trạng thái làm việc của nhân viên. |
| SHIFT-001 | Required | Ghi nhận từng ca/lần làm với ngày làm, thứ tự ca, check-in và check-out; một nhân viên có thể có nhiều ca trong một ngày. |
| ATT-001 | Required | Ghi nhận trạng thái ca cơ bản: có mặt, đi trễ, vắng, thiếu chấm công hoặc nghỉ. |
| ATT-002 | Required | Điều chỉnh chấm công cần lý do, Admin duyệt và lưu audit. |
| PAYROLL-001 | Required | Ghi nhận lương thực nhận theo từng ca; không triển khai bảng công hoặc bảng lương theo kỳ. |
| PAYROLL-002 | Required | Ghi nhận trạng thái đã/chưa trả lương và liên kết một khoản chi lương với ca tương ứng. |
| PAYROLL-003 | Required | Admin duyệt điều chỉnh chấm công hoặc lương ca; chi lương chuyển khoản vẫn thực hiện ngoài hệ thống. |

## 10. Thông báo và tích hợp

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| NOTIFY-001 | Required | Gửi thông báo một chiều cho khách hàng qua Zalo. |
| NOTIFY-002 | Required | Thông báo nội bộ/email cho nhân viên về duyệt, kho, két, lương và đối soát. |
| NOTIFY-003 | Required | Lưu kênh, mẫu/nội dung, chứng từ, trạng thái, lỗi và số lần thử. |
| NOTIFY-004 | Open policy | Gửi lại tự động hoặc thủ công khi Zalo/email thất bại. |
| NOTIFY-005 | Required | Lỗi thông báo không rollback giao dịch nghiệp vụ đã hoàn tất. |
| INTEGRATION-001 | Required | Tích hợp thật VietQR/webhook ngân hàng trong MVP. |
| INTEGRATION-002 | Required | Tích hợp thật Zalo trong MVP. |
| INTEGRATION-003 | Required | Tích hợp thật Google Books/Open Library trong MVP. |
| INTEGRATION-004 | Required | Có fallback: tiền mặt, nhập sách thủ công và gửi lại thông báo. |

## 11. Báo cáo, cấu hình và vận hành

| ID | Trạng thái | Chức năng |
| --- | --- | --- |
| REPORT-001 | Required | Báo cáo bán sách theo đầu sách, thể loại, nhân viên và thời gian. |
| REPORT-002 | Required | Báo cáo thuê, gia hạn, quá hạn, phạt, hư hỏng và mất sách. |
| REPORT-003 | Required | Báo cáo nhập/thu mua, tồn kho và chênh lệch kiểm kê. |
| REPORT-004 | Required | Báo cáo doanh thu, chi phí, nhân sự, lương và ca thu ngân. |
| REPORT-005 | Open policy | Tổng hợp dữ liệu thuế theo tháng/quý và xuất Excel/PDF; không tự nộp thuế. |
| CONFIG-001 | Required | Quản lý tham số thuê, thành viên, phạt, thu mua và ngưỡng tồn kho. |
| CONFIG-002 | Required | Lưu lịch sử thay đổi cấu hình và thời điểm hiệu lực. |
| CONFIG-003 | Required | Cấu hình mới không viết lại giao dịch lịch sử. |
| OPS-001 | Required | Health check và trạng thái tích hợp phục vụ vận hành. |
| OPS-002 | Open policy | Sao lưu, khôi phục, retention log và giám sát theo mục tiêu NFR được duyệt. |

## Ngoài phạm vi

- Giao diện, tài khoản hoặc ứng dụng dành cho khách hàng.
- Tra cứu công khai, đặt trước, giữ chỗ hoặc hàng chờ.
- Gia hạn tự phục vụ hoặc tương tác hai chiều qua Zalo.
- Thương mại điện tử, giao nhận hoặc thanh toán từ xa cho khách.
- Điểm tích lũy, đổi điểm hoặc ví trả trước.
- Mẫu ca, lịch tuần/tháng, yêu cầu nghỉ/đổi ca, bảng công và bảng lương theo kỳ.
- Đa chi nhánh, điều chuyển liên chi nhánh hoặc SaaS đa tenant.
- Văn phòng phẩm, F&B và nguyên liệu.
- Tự động chuyển tiền ra hoặc tự động nộp hồ sơ thuế.
