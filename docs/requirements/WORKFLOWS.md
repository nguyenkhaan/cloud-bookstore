# Luồng nghiệp vụ cấp cao

**Trạng thái:** Proposed

Các luồng này mô tả hành vi đầu-cuối. Đặc tả chi tiết ở bước tiếp theo phải gắn feature ID, business rule ID, dữ liệu vào/ra, trạng thái, mã lỗi và tiêu chí kiểm thử.

## WF-01 — Bán sách

1. Nhân viên mở hóa đơn trong ca hợp lệ và quét CopyBarcode.
2. Backend kiểm tra bản Khả dụng, đã định giá và chưa bị khóa.
3. Nhân viên chọn khách hàng hoặc khách vãng lai.
4. Hệ thống tính giá và giảm theo hạng.
5. Khách thanh toán tiền mặt hoặc VietQR.
6. Sau khi xác nhận đủ tiền, hóa đơn hoàn tất, bản chuyển Đã bán và doanh thu được ghi nhận.
7. Nếu thông báo Zalo lỗi, hóa đơn vẫn hoàn tất và thông báo chuyển hàng đợi gửi lại.

Nhánh lỗi chính: CopyBarcode sai/trùng, xung đột đồng thời, thanh toán thiếu/thừa, mất kết nối, yêu cầu đảo do quét nhầm.

## WF-02 — Lập phiếu thuê

1. Nhân viên tìm/tạo khách và kiểm tra điều kiện thuê.
2. Quét CopyBarcode từng bản; backend khóa bản hợp lệ cho phiếu.
3. Hệ thống xác định hạng, hạn mức và hạn trả tối đa.
4. Hệ thống tính cọc bằng 100% tổng giá bán thực tế.
5. Khách nộp đủ cọc bằng tiền mặt hoặc VietQR.
6. Phiếu chuyển Đang thuê; các bản chuyển Đang cho thuê.
7. Hệ thống phát hành chứng từ và gửi Zalo một chiều.

## WF-03 — Gia hạn

1. Khách yêu cầu trực tiếp tại quầy; Nhân viên tra cứu phiếu.
2. Backend kiểm tra phiếu còn hạn, chưa quá 2 lần gia hạn và số ngày không vượt 7.
3. Hệ thống cập nhật hạn trả và lưu lịch sử cũ/mới.
4. Phí phát sinh chưa thu ngay; được đưa vào quyết toán khi trả.
5. Gửi Zalo xác nhận hạn mới; lỗi gửi được retry.

## WF-04 — Trả và quyết toán

1. Nhân viên tra cứu phiếu và quét CopyBarcode của toàn bộ bản sách.
2. Ghi nhận tình trạng từng bản; bản không thuộc phiếu bị từ chối.
3. Hệ thống tính phí thuê, gia hạn, quá hạn, hư hỏng và mất.
4. Nghĩa vụ được khấu trừ từ cọc.
5. Nếu thiếu, khách thanh toán thêm; nếu dư, cửa hàng hoàn cọc tiền mặt hoặc chuyển khoản ngoài hệ thống.
6. Khi thu/hoàn đã xác nhận, phiếu hoàn tất và trạng thái từng bản được cập nhật.
7. Chỉ phí thuê/gia hạn đã trả được cộng vào tổng chi tiêu hợp lệ.

## WF-05 — Thu mua sách cũ

1. Nhân viên tìm/tạo người bán.
2. Với từng cuốn: quét Barcode ISBN để tìm các ấn bản phù hợp hoặc nhập thủ công khi không có ISBN.
3. Nhân viên xác nhận/tạo ấn bản bằng NXB, năm, lần xuất bản/tái bản và định dạng; không suy diễn các trường này từ ISBN.
4. Hệ thống gợi ý giá; nhân viên nhập giá thỏa thuận.
5. Nếu vượt hạn mức, phiếu chờ Admin duyệt.
6. Sau duyệt và khách đồng ý, cửa hàng chi tiền mặt hoặc chuyển khoản ngoài hệ thống.
7. Hệ thống tạo từng bản vật lý liên kết ấn bản, CopyBarcode, giá vốn và trạng thái chờ định giá.
8. Chỉ bản đã có giá bán được xác nhận mới chuyển Khả dụng.

## WF-06 — Nhập kho và kiểm kê

1. Quản lý kho lập phiếu nhập hoặc phiếu kiểm kê.
2. Với phiếu nhập, Quản lý kho quét ISBN để chọn/tạo ấn bản và xác nhận metadata ấn bản.
3. Phiếu nhập được xác nhận tạo từng bản sách riêng với CopyBarcode duy nhất.
4. Phiếu kiểm kê khóa các bản trong phạm vi, ghi nhận thực tế bằng CopyBarcode và tính chênh lệch.
5. Quản lý kho tạo đề nghị điều chỉnh; Admin duyệt hoặc từ chối.
6. Sau duyệt, trạng thái/tồn kho được cập nhật và khóa được giải phóng.

## WF-07 — Thanh toán VietQR

1. Chứng từ tạo yêu cầu có mã tham chiếu duy nhất và QR hết hạn sau 15 phút.
2. Backend nhận, xác thực và lưu sự kiện webhook.
3. Sự kiện được xử lý idempotent và đối chiếu tham chiếu, số tiền, tài khoản nhận.
4. Khớp đầy đủ: thanh toán Thành công và chứng từ tiếp tục.
5. Sai lệch/đến muộn: chuyển Cần đối soát, không tự hoàn tất chứng từ.
6. Khi mất kết nối, frontend tra cứu lại bằng mã yêu cầu thay vì tạo giao dịch mới.

## WF-08 — Ca thu ngân

1. Nhân viên mở ca két và nhập tiền đầu ca.
2. Mọi thu/chi tiền mặt cập nhật số dư lý thuyết.
3. Khi đóng, hệ thống tạm ngăn giao dịch tiền mặt mới và Nhân viên nhập số kiểm đếm.
4. Hệ thống tính chênh lệch; Nhân viên nhập giải trình nếu khác không.
5. Ngoại lệ hoặc điều chỉnh két chờ Admin duyệt; ca đã đóng không nhận giao dịch mới.

## WF-09 — Chấm công theo ca

1. Nhân viên hoặc người được phân quyền tạo bản ghi cho từng ca/lần làm, với ngày và thứ tự ca.
2. Người làm check-in và check-out; hệ thống ghi trạng thái công cơ bản và số phút làm việc.
3. Một nhân viên có thể có nhiều ca trong cùng ngày nếu thứ tự ca khác nhau.
4. Thiếu hoặc sai chấm công được điều chỉnh kèm lý do, chờ Admin duyệt và audit.

## WF-10 — Ghi nhận và trả lương theo ca

1. Nhân viên được phân quyền ghi lương thực nhận cho từng ca.
2. Admin duyệt mọi điều chỉnh lương có lý do.
3. Cửa hàng trả tiền mặt hoặc chuyển khoản ngoài hệ thống.
4. Hệ thống ghi khoản chi gắn với ca và cập nhật trạng thái đã/chưa trả.

## WF-11 — Gửi thông báo

1. Nghiệp vụ hoàn tất phát sinh sự kiện thông báo.
2. Hệ thống tạo bản ghi/outbox trước khi gọi nhà cung cấp.
3. Gửi thành công thì lưu thời điểm/kết quả; thất bại thì lưu lỗi và lịch retry.
4. Retry không được tạo thông báo nghiệp vụ trùng hoặc thay đổi giao dịch nguồn.
