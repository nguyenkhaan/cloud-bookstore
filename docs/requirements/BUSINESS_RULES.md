# Quy tắc nghiệp vụ

**Trạng thái:** Proposed — các quy tắc có nguồn từ quyết định đã xác nhận được đánh dấu `Accepted`; quy tắc kế thừa từ tài liệu cũ cần được duyệt cùng toàn bộ bộ tài liệu.

## Quy tắc chung

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-GEN-001 | Accepted | Hệ thống chỉ phục vụ một cửa hàng vật lý và người dùng nội bộ. |
| BR-GEN-002 | Accepted | Khách hàng không có tài khoản hoặc giao diện tự phục vụ. |
| BR-GEN-003 | Accepted | Mỗi bản sách có một CopyBarcode nội bộ duy nhất. |
| BR-GEN-004 | Proposed | Chỉ bản ở trạng thái Khả dụng được đưa vào giao dịch bán hoặc thuê mới. |
| BR-GEN-005 | Proposed | Một bản sách không thể thuộc hai giao dịch đang có hiệu lực cùng lúc. |
| BR-GEN-006 | Proposed | Dữ liệu tài chính hoàn tất không được sửa/xóa trực tiếp; sửa sai bằng đảo hoặc điều chỉnh. |
| BR-GEN-007 | Accepted | Chỉ Admin được phê duyệt ngoại lệ nhạy cảm. |
| BR-GEN-008 | Proposed | Mọi khoản thu/chi phải liên kết với chứng từ nguồn, người thực hiện và thời điểm. |
| BR-GEN-009 | Proposed | Giá trị bản sách trong công thức cọc/bồi thường là giá bán thực tế, không phải giá bìa. |

## Danh mục, ấn bản và định danh

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-CAT-001 | Accepted | Mô hình sách tuân theo `Bộ sách → Đầu sách/tập → Ấn bản → Bản sách vật lý`. |
| BR-CAT-002 | Accepted | Một đầu sách/tập có thể có nhiều ấn bản; mỗi ấn bản thuộc đúng một đầu sách/tập. |
| BR-EDITION-001 | Accepted | Ấn bản lưu ISBN tùy chọn, NXB, năm xuất bản, lần xuất bản/tái bản, định dạng, giá bìa và ảnh bìa. |
| BR-EDITION-002 | Accepted | ISBN không phải khóa chính, không định danh bản vật lý và không được suy diễn để xác định lần tái bản/ấn bản. |
| BR-EDITION-003 | Accepted | Nhiều ấn bản có thể cùng ISBN khi lần tái bản hoặc metadata khác nhau; nhân viên phải xác nhận đúng ấn bản. |
| BR-EDITION-004 | Accepted | Barcode ISBN/EAN-13 chỉ dùng để tra cứu ứng viên ấn bản; kết quả từ API ngoài phải được nhân viên xác nhận. |
| BR-COPY-001 | Accepted | Mỗi bản vật lý thuộc đúng một ấn bản và có CopyBarcode duy nhất toàn hệ thống. |
| BR-COPY-002 | Accepted | Bán, thuê, trả và kiểm kê dùng CopyBarcode, không dùng ISBN để thay thế định danh bản vật lý. |

## Bản sách và kho

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-INV-001 | Proposed | Bản sách mới chỉ chuyển sang Khả dụng sau khi liên kết đúng ấn bản, có CopyBarcode, tình trạng và giá bán được xác nhận. |
| BR-INV-002 | Proposed | Khi kiểm kê, các bản thuộc phạm vi bị khóa khỏi giao dịch xuất kho. |
| BR-INV-003 | Proposed | Chênh lệch kiểm kê chỉ làm thay đổi tồn kho sau khi Admin duyệt. |
| BR-INV-004 | Proposed | Bản Đã bán, Thất lạc, Thanh lý hoặc Ngừng kinh doanh không được dùng cho giao dịch mới. |
| BR-INV-005 | Proposed | Dữ liệu sách đã được giao dịch tham chiếu phải ngừng sử dụng thay vì xóa vật lý. |
| BR-INV-006 | Accepted | Cảnh báo tồn tính theo từng ấn bản và từng nhóm Bán/Thuê: đếm bản Khả dụng cho phép kênh tương ứng; bản hỗ trợ cả hai được tính cho cả hai nhóm, rồi so với ngưỡng riêng của ấn bản. |
| BR-INV-007 | Accepted | Bản sách vật lý mặc định cho phép cả Bán và Thuê. Người có quyền kho có thể giới hạn bản thành chỉ Bán hoặc chỉ Thuê; bán/thuê chỉ được chọn bản cho phép kênh giao dịch tương ứng. |

## Thu mua sách cũ

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-BUY-001 | Proposed | Người bán phải có tối thiểu họ tên và số điện thoại. |
| BR-BUY-002 | Proposed | Mỗi cuốn được đánh giá Grade A/B/C/D; giá gợi ý không phải giá cuối cùng. |
| BR-BUY-003 | Proposed | Giá thỏa thuận hoặc tổng phiếu vượt hạn mức chuyển chờ Admin duyệt. |
| BR-BUY-004 | Proposed | Phiếu đã chi tiền không được hủy/xóa trực tiếp. |
| BR-BUY-005 | Proposed | Mỗi cuốn được nhận tạo một bản sách và CopyBarcode riêng, liên kết với ấn bản đã chọn/xác nhận. |

Khung giá gợi ý kế thừa từ tài liệu cũ:

| Grade | Tình trạng tham khảo | Khoảng giá gợi ý |
| --- | --- | ---: |
| A | 90%–99% | 35%–45% giá bìa |
| B | 70%–89% | 20%–30% giá bìa |
| C | 50%–69% | 10%–15% giá bìa |
| D | Dưới 50% | Cảnh báo từ chối hoặc giá thanh lý riêng |

## Bán sách

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-SALE-001 | Proposed | Hồ sơ khách hàng là tùy chọn đối với giao dịch bán. |
| BR-SALE-002 | Accepted | Hạng Bạc giảm 5%, Vàng giảm 10%, Thường không giảm giá bán. |
| BR-SALE-003 | Proposed | Hóa đơn chỉ hoàn tất sau khi nhận đủ tiền. |
| BR-SALE-004 | Proposed | Sách đã bán không đổi trả thông thường. |
| BR-SALE-005 | Proposed | Quét nhầm CopyBarcode chỉ được yêu cầu xử lý trong 24 giờ, cần Admin duyệt và dùng giao dịch đảo. |

## Thuê và gia hạn

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-RENT-001 | Proposed | Khách thuê phải có họ tên và số điện thoại. |
| BR-RENT-002 | Proposed | Phiếu có tổng giá trị sách trên 1.000.000 VNĐ yêu cầu CCCD và địa chỉ hiện tại. |
| BR-RENT-003 | Proposed | Chặn thuê mới khi khách có phiếu quá hạn, nghĩa vụ chưa thanh toán hoặc vượt hạn mức hạng. |
| BR-RENT-004 | Accepted | Cọc mỗi bản bằng 100% giá bán thực tế và phải được xác nhận đủ trước khi giao sách. |
| BR-RENT-005 | Accepted | Giảm giá thành viên không áp dụng cho cọc. |
| BR-RENT-006 | Accepted | Phí thuê và phí gia hạn được tính theo thời gian thực tế, thu khi trả sách. |
| BR-RENT-007 | Accepted | Chỉ gia hạn khi phiếu còn hạn, tại quầy, tối đa 2 lần và mỗi lần tối đa 7 ngày. |
| BR-RENT-008 | Proposed | Một phiếu nhiều bản phải trả toàn bộ trong một lần; MVP không trả từng phần. |

## Trả sách, quá hạn và hư hỏng

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-RETURN-001 | Proposed | Chỉ quyết toán khi tất cả bản đã quét hoặc được đánh dấu Mất theo quyền phù hợp. |
| BR-RETURN-002 | Accepted | Phí thuê, gia hạn, phạt và bồi thường được khấu trừ vào cọc trước khi hoàn phần còn lại. |
| BR-RETURN-003 | Proposed | Nếu cọc không đủ, phiếu chờ thanh toán bổ sung và chỉ hoàn tất khi nghĩa vụ bằng không. |
| BR-LATE-001 | Proposed | Có thời gian miễn phạt 2 giờ sau hạn trả. |
| BR-LATE-002 | Proposed | Sau thời gian miễn phạt, ngày trễ được làm tròn lên. |
| BR-LATE-003 | Proposed | Phạt quá hạn mỗi ngày bằng 150% đơn giá thuê/ngày và không vượt giá bán thực tế của bản. |
| BR-DAMAGE-001 | Open | Mức hư hỏng và tỷ lệ bồi thường do cấu hình; cần giải quyết `OQ-004`. |
| BR-LOST-001 | Proposed | Với bản mất, cửa hàng giữ toàn bộ cọc của bản đó và không thu thêm giá trị sách lần hai. |

## Thành viên

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-MEMBER-001 | Accepted | Hạng được tự tính lại khi tổng chi tiêu hợp lệ thay đổi và có thể tăng hoặc giảm. |
| BR-MEMBER-002 | Accepted | Tổng chi tiêu hợp lệ gồm tiền mua sách, phí thuê và phí gia hạn đã thanh toán. |
| BR-MEMBER-003 | Accepted | Tổng chi tiêu không gồm cọc, phạt, bồi thường, khoản cửa hàng chi ra hoặc giao dịch đã đảo. |
| BR-MEMBER-004 | Accepted | Thường: dưới 1.000.000 VNĐ, tối đa 3 bản, tối đa 14 ngày, giảm 0%. |
| BR-MEMBER-005 | Accepted | Bạc: từ 1.000.000 đến dưới 3.000.000 VNĐ, tối đa 5 bản, tối đa 21 ngày, giảm 5%. |
| BR-MEMBER-006 | Accepted | Vàng: từ 3.000.000 VNĐ, tối đa 8 bản, tối đa 30 ngày, giảm 10%. |
| BR-MEMBER-007 | Accepted | Giảm giá áp dụng cho giá bán và phí thuê; không áp dụng cho cọc, phạt hay bồi thường. |
| BR-MEMBER-008 | Accepted | MVP không có điểm tích lũy. |

## Thanh toán và két

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-PAY-001 | Proposed | Giao dịch tiền mặt phải liên kết với ca thu ngân đang mở. |
| BR-PAY-002 | Proposed | Mỗi VietQR có số tiền, mã tham chiếu duy nhất và thời hạn 15 phút. |
| BR-PAY-003 | Proposed | Chỉ webhook hợp lệ, đúng tham chiếu và đủ số tiền mới hoàn tất chứng từ. |
| BR-PAY-004 | Proposed | Webhook trùng không tạo giao dịch trùng; sự kiện đến muộn/sai lệch chuyển sang đối soát. |
| BR-PAY-005 | Accepted | API ngân hàng không được dùng để tự động chuyển tiền ra. |
| BR-CASH-001 | Proposed | Số dư lý thuyết = đầu ca + thu tiền mặt − chi tiền mặt ± điều chỉnh được duyệt. |
| BR-CASH-002 | Proposed | Tiền chuyển khoản không làm thay đổi số dư tiền mặt của két. |
| BR-CASH-003 | Accepted | Chênh lệch cuối ca cần giải trình; mọi ngoại lệ hoặc điều chỉnh két cần Admin duyệt. |

## Nhân sự, chấm công và lương

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-HR-001 | Proposed | Hồ sơ nhân viên đã phát sinh dữ liệu phải chuyển trạng thái, không xóa vật lý. |
| BR-ATT-001 | Accepted | Một bản ghi công là một ca/lần làm; một nhân viên có thể có nhiều ca trong một ngày, phân biệt bằng thứ tự ca. |
| BR-ATT-002 | Accepted | Ca có đủ check-in và check-out mới tính giờ công; thiếu một đầu được ghi nhận là thiếu chấm công. |
| BR-ATT-003 | Accepted | Mọi sửa chấm công cần lý do, Admin duyệt và lưu giá trị trước/sau. |
| BR-PAYROLL-001 | Accepted | Lương được ghi nhận và duyệt theo từng ca; không có bảng công hoặc bảng lương theo kỳ trong MVP. |
| BR-PAYROLL-002 | Accepted | Admin duyệt điều chỉnh lương ca; điều chỉnh thủ công phải có lý do. |
| BR-PAYROLL-003 | Accepted | Hệ thống chỉ ghi nhận chi lương; không tự động chuyển tiền qua ngân hàng. |

## Tích hợp và cấu hình

| ID | Trạng thái | Quy tắc |
| --- | --- | --- |
| BR-INT-001 | Accepted | VietQR/webhook, Zalo và Google Books/Open Library là tích hợp thật trong MVP. |
| BR-INT-002 | Accepted | Khi tích hợp lỗi, dùng fallback tiền mặt, nhập sách thủ công hoặc gửi lại thông báo. |
| BR-INT-003 | Proposed | Lỗi gửi thông báo không rollback giao dịch nghiệp vụ đã hoàn tất. |
| BR-CONFIG-001 | Proposed | Thay đổi cấu hình lưu giá trị cũ/mới, người thực hiện, thời điểm và ngày hiệu lực. |
| BR-CONFIG-002 | Proposed | Cấu hình mới không viết lại giao dịch lịch sử. |
