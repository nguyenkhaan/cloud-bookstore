# PRD - Vận hành nội bộ và quy tắc hệ thống

## 17. Quản lý ca thu ngân và két tiền

### 17.1. Mục tiêu

Module ca thu ngân giúp cửa hàng đối chiếu toàn bộ tiền mặt phát sinh trong khoảng thời gian một nhân viên chịu trách nhiệm tại quầy. Module này đặc biệt quan trọng vì két vừa nhận tiền bán, tiền cọc và phí thuê, vừa chi tiền thu mua sách và hoàn tiền cọc.

Mỗi giao dịch tiền mặt phải truy được đến:

- Chứng từ nghiệp vụ nguồn.
- Ca thu ngân.
- Nhân viên thực hiện.
- Thời điểm phát sinh.
- Số tiền thu hoặc chi.
- Trạng thái giao dịch.

### 17.2. Phân biệt ca làm việc và ca thu ngân

- Ca làm việc thể hiện lịch nhân sự và thời gian một nhân viên được phân công.
- Ca thu ngân thể hiện trách nhiệm với một két tiền.
- Nhân viên chỉ được mở ca thu ngân khi đang có ca làm việc hợp lệ hoặc được người có quyền cho phép ngoại lệ.
- Một ca làm việc không nhất thiết phải có ca thu ngân nếu nhân viên không thao tác tiền mặt.

### 17.3. Mở ca thu ngân

Luồng mở ca:

1. Nhân viên đăng nhập và chọn chức năng mở ca.
2. Hệ thống kiểm tra nhân viên có quyền thu ngân.
3. Hệ thống kiểm tra không tồn tại ca thu ngân chưa đóng của cùng nhân viên hoặc cùng két.
4. Nhân viên chọn két/quầy nếu cửa hàng cấu hình nhiều vị trí thu tiền.
5. Nhân viên nhập số tiền mặt đầu ca đã kiểm đếm.
6. Nhân viên xác nhận nhận bàn giao.
7. Hệ thống tạo ca ở trạng thái Đang mở, lưu thời gian, nhân viên và tiền đầu ca.
8. Từ thời điểm này, các giao dịch tiền mặt của nhân viên được liên kết với ca.

**[TBD - Unconfirmed]**: MVP quản lý một két chung hay cho phép cấu hình nhiều két vật lý.

### 17.4. Ghi nhận tiền thu vào

Các khoản thu tiền mặt gồm tối thiểu:

- Tiền bán sách.
- Tiền cọc khi cho thuê.
- Phí thuê và phí gia hạn khi trả sách.
- Phạt quá hạn hoặc hư hỏng.
- Phần khách phải trả thêm khi tiền cọc không đủ.

Khi một khoản thu thành công:

1. Hệ thống tạo giao dịch thu và liên kết chứng từ nguồn.
2. Giao dịch được gắn với ca đang mở của nhân viên.
3. Số dư tiền mặt lý thuyết tăng đúng bằng số thực thu.
4. Giao dịch bị hủy trước khi hoàn tất không làm thay đổi số dư.
5. Giao dịch đã hoàn tất chỉ được đảo bằng quy trình được phê duyệt.

### 17.5. Ghi nhận tiền chi ra

Các khoản chi tiền mặt gồm tối thiểu:

- Chi mua sách cũ từ khách.
- Hoàn tiền cọc sau khi khách trả sách.
- Hoàn tiền do ngoại lệ quét nhầm barcode được phê duyệt.
- Chi lương bằng tiền mặt nếu cửa hàng thực hiện từ két được quản lý.

Khi ghi nhận khoản chi:

1. Hệ thống kiểm tra chứng từ nguồn đã đủ điều kiện chi.
2. Hệ thống kiểm tra quyền của nhân viên và ca đang mở.
3. Hệ thống hiển thị số tiền phải chi.
4. Nhân viên xác nhận đã giao tiền.
5. Nếu nghiệp vụ yêu cầu, người nhận xác nhận đã nhận.
6. Hệ thống tạo giao dịch chi và giảm số dư lý thuyết.

**[TBD - Unconfirmed]**: Có chặn khoản chi khi tiền mặt lý thuyết trong két không đủ hay cho phép chi âm với phê duyệt của Quản lý.

### 17.6. Tính số dư lý thuyết

Công thức:

`Tiền lý thuyết cuối ca = Tiền đầu ca + Tổng thu tiền mặt thành công − Tổng chi tiền mặt thành công ± Các điều chỉnh được duyệt`

Thanh toán chuyển khoản không làm thay đổi số dư tiền mặt của két.

Mỗi thành phần trong công thức phải mở được danh sách giao dịch chi tiết để đối soát.

### 17.7. Đóng ca

1. Nhân viên yêu cầu đóng ca.
2. Hệ thống ngăn tạo giao dịch tiền mặt mới trong lúc kiểm đếm.
3. Hệ thống tính và hiển thị tiền lý thuyết.
4. Nhân viên kiểm đếm tiền thực tế và nhập số tiền.
5. Hệ thống tính chênh lệch giữa thực tế và lý thuyết.
6. Nếu không chênh lệch, nhân viên xác nhận đóng ca.
7. Nếu có chênh lệch, nhân viên bắt buộc nhập giải trình.
8. Trường hợp vượt ngưỡng cho phép phải được Quản lý phê duyệt.
9. Hệ thống lưu thời điểm đóng, số liệu, giải trình và người duyệt.
10. Sau khi đóng, ca không nhận thêm giao dịch.

**[TBD - Unconfirmed]**: Ngưỡng chênh lệch yêu cầu Quản lý phê duyệt.

### 17.8. Bàn giao ca

Nếu tiền cuối ca được dùng làm tiền đầu ca tiếp theo:

1. Ca trước được đóng và xác nhận số tiền bàn giao.
2. Nhân viên ca sau kiểm đếm độc lập.
3. Số tiền được ghi làm tiền đầu ca mới sau khi người nhận xác nhận.
4. Chênh lệch khi bàn giao phải được ghi riêng, không sửa số đóng ca cũ.

### 17.9. Quy tắc kiểm soát

- Không xóa ca đã có giao dịch.
- Không sửa trực tiếp số tiền đầu ca hoặc cuối ca sau khi đóng.
- Mở lại ca phải có quyền đặc biệt, lý do và nhật ký.
- Giao dịch đảo phải phản ánh vào ca hiện tại theo quy tắc kế toán nội bộ, không viết lại lịch sử ca cũ.
- Quản lý được tra cứu theo thời gian, nhân viên, két và trạng thái.

## 18. Nhân viên, lịch làm và chấm công

### 18.1. Hồ sơ nhân viên

Hồ sơ nhân viên lưu tối thiểu:

- Mã nhân viên.
- Họ tên.
- Email do cửa hàng cung cấp.
- Số điện thoại.
- Trạng thái làm việc.
- Tài khoản liên kết.
- Vai trò hiện tại.
- Ngày bắt đầu/nghỉ việc nếu có.
- Thông tin lương theo quyền truy cập phù hợp.

Không được xóa hồ sơ đã phát sinh giao dịch, chấm công hoặc lương. Khi nhân viên nghỉ việc, hồ sơ được chuyển trạng thái và tài khoản bị vô hiệu hóa theo quy trình.

### 18.2. Cấu hình ca làm việc

Mỗi mẫu ca gồm:

- Tên ca.
- Giờ bắt đầu và kết thúc.
- Thời gian nghỉ nếu có.
- Số nhân viên tối thiểu.
- Trạng thái sử dụng.

Hệ thống phải hỗ trợ ca qua ngày nếu cửa hàng có nhu cầu.

**[TBD - Unconfirmed]**: Cửa hàng có sử dụng ca qua ngày và thời gian nghỉ có được trừ khỏi giờ công hay không.

### 18.3. Lập lịch làm việc

1. Quản lý chọn tuần hoặc tháng cần lập lịch.
2. Chọn mẫu ca cho từng ngày.
3. Gán nhân viên vào ca.
4. Hệ thống kiểm tra trùng thời gian.
5. Hệ thống tính tổng giờ được phân công theo ngày và tuần.
6. Hệ thống chặn lịch vượt 12 giờ/ngày hoặc 48 giờ/tuần.
7. Hệ thống cảnh báo ca chưa đủ số nhân viên tối thiểu.
8. Lịch chỉ được công bố khi không còn lỗi chặn.
9. Sau khi công bố, nhân viên nhận thông báo nội bộ và email.

### 18.4. Xin nghỉ và đổi ca

1. Nhân viên chọn ca đã được phân công.
2. Nhân viên tạo yêu cầu nghỉ hoặc đổi ca và nhập lý do.
3. Với đổi ca, nhân viên chọn ca/người thay thế nếu quy trình cho phép.
4. Hệ thống kiểm tra xung đột lịch dự kiến.
5. Quản lý phê duyệt hoặc từ chối.
6. Khi phê duyệt, hệ thống cập nhật lịch và kiểm tra lại số người tối thiểu.
7. Các bên liên quan nhận thông báo.

**[TBD - Unconfirmed]**: Có yêu cầu nhân viên thay thế xác nhận trước khi Quản lý duyệt đổi ca hay không.

### 18.5. Check-in

1. Nhân viên đăng nhập và chọn check-in.
2. Hệ thống xác định ca phù hợp tại thời điểm hiện tại.
3. Hệ thống ghi thời gian thực tế.
4. Hệ thống so sánh với giờ bắt đầu và đánh dấu Đúng giờ hoặc Đi trễ.
5. Nếu không có ca hợp lệ, hệ thống từ chối hoặc yêu cầu quyền ngoại lệ.

### 18.6. Check-out

1. Nhân viên chọn check-out khi kết thúc ca.
2. Hệ thống ghi thời gian thực tế.
3. Hệ thống so sánh với giờ kết thúc để xác định Về sớm, Đúng giờ hoặc Tăng ca.
4. Hệ thống tính thời gian làm việc sơ bộ.
5. Dữ liệu được đưa vào bảng công chờ kiểm tra.

**[TBD - Unconfirmed]**: Hình thức xác thực check-in/check-out ngoài việc đăng nhập, ví dụ thiết bị cố định, mã QR nội bộ hoặc giới hạn mạng cửa hàng.

### 18.7. Thiếu chấm công

- Nhân viên phải có cả check-in và check-out.
- Nếu thiếu một đầu, ca được đánh dấu Thiếu chấm công.
- Hệ thống không tự động tính giờ công hợp lệ cho ca thiếu dữ liệu.
- Nhân viên phải tạo giải trình/bổ sung.
- Quản lý kiểm tra và phê duyệt trước khi dữ liệu được tính lương.

### 18.8. Hiệu chỉnh chấm công

1. Nhân viên hoặc Quản lý tạo yêu cầu điều chỉnh.
2. Yêu cầu phải có lý do và giá trị đề xuất.
3. Người có quyền phê duyệt hoặc từ chối.
4. Nếu phê duyệt, hệ thống lưu cả giá trị cũ và mới.
5. Hệ thống tính lại giờ công và các trạng thái liên quan.
6. Nhật ký lưu người yêu cầu, người duyệt và thời điểm.

### 18.9. Chốt bảng công

1. Cuối kỳ, hệ thống tổng hợp số ca, giờ làm, tăng ca, đi trễ, về sớm, vắng và ngày nghỉ.
2. Quản lý kiểm tra các trường hợp thiếu hoặc đang chờ duyệt.
3. Chỉ được chốt khi không còn lỗi chặn.
4. Sau khi chốt, dữ liệu chấm công của kỳ bị khóa.
5. Muốn sửa phải được Admin mở khóa, ghi lý do và lưu nhật ký đặc biệt.

## 19. Quản lý lương

### 19.1. Phạm vi

Hệ thống tính và ghi nhận lương nhưng không trực tiếp chuyển tiền qua API ngân hàng. Dữ liệu lương là dữ liệu nhạy cảm và chỉ người có quyền phù hợp được xem hoặc sửa.

### 19.2. Cấu hình lương

Mỗi nhân viên có thể áp dụng một trong các hình thức:

- Lương theo giờ.
- Lương theo ca.
- Lương tháng cố định.

Hồ sơ lương có thể gồm mức cơ bản, đơn giá tăng ca, hệ số tăng ca, phụ cấp và các quy tắc khấu trừ.

**[TBD - Unconfirmed]**: Hình thức lương chính thức được cửa hàng sử dụng, công thức lương tháng khi thiếu công và hệ số tăng ca.

### 19.3. Lập bảng lương

1. Người có quyền chọn kỳ lương.
2. Hệ thống lấy bảng công đã chốt.
3. Hệ thống tính lương cơ bản theo hình thức của từng nhân viên.
4. Hệ thống tính tiền tăng ca theo đơn giá và hệ số cấu hình.
5. Hệ thống thêm phụ cấp, thưởng, phạt hoặc tạm ứng hợp lệ.
6. Mọi khoản nhập thủ công phải có mô tả và người thực hiện.
7. Hệ thống tạo bảng lương Nháp và phiếu lương từng nhân viên.

Công thức khái quát:

`Thực nhận = Lương cơ bản + Tăng ca + Phụ cấp + Thưởng − Khấu trừ − Tạm ứng`

### 19.4. Duyệt và chốt

1. Quản lý kiểm tra bảng lương Nháp.
2. Các điều chỉnh phải ghi lý do.
3. Admin hoặc Quản lý có quyền chuyển bảng sang Chờ duyệt.
4. Người có thẩm quyền duyệt và chốt.
5. Sau khi chốt, bảng lương bị khóa.
6. Mở lại bảng lương phải có quyền đặc biệt và nhật ký.

### 19.5. Ghi nhận chi trả

- Với tiền mặt, người chi xác nhận và giao dịch được liên kết với két/ca phù hợp.
- Với chuyển khoản, Quản lý thực hiện chuyển tiền bên ngoài hệ thống và nhập mã giao dịch/chứng từ.
- API ngân hàng không được dùng để tự động chuyển lương.
- Hệ thống cập nhật trạng thái Chưa thanh toán, Thanh toán một phần hoặc Đã thanh toán nếu có hỗ trợ trả nhiều lần.

**[TBD - Unconfirmed]**: MVP có cho phép thanh toán lương nhiều lần hay chỉ một lần cho toàn bộ số thực nhận.

### 19.6. Phiếu lương và xuất dữ liệu

Sau khi thanh toán, hệ thống:

- Tạo phiếu lương cho nhân viên.
- Gửi thông báo nội bộ và email.
- Cho phép người có quyền xuất bảng công và bảng lương sang Excel/PDF.
- Đưa chi phí nhân sự đã hoàn tất vào báo cáo chi phí và dữ liệu thuế.

## 20. Yêu cầu và báo cáo của khách hàng

### 20.1. Phạm vi MVP

Module này được giữ ở mức tối giản để tạo nền dữ liệu cho mở rộng sau này:

- Sử dụng một bảng dữ liệu chính.
- Cung cấp API CRUD cơ bản.
- Không xây dựng quy trình ticket nhiều bước.
- Không lưu nguồn tiếp nhận.
- Khách hàng không tự tạo yêu cầu vì không có tài khoản đăng nhập.
- Dữ liệu ban đầu sẽ được phía dự án cung cấp/feed vào hệ thống.

### 20.2. Cấu trúc dữ liệu đề xuất

Bảng dữ liệu nên có tối thiểu:

- Mã yêu cầu/báo cáo.
- Mã khách hàng nếu xác định được.
- Tiêu đề.
- Nội dung.
- Loại dữ liệu hoặc nhãn phân loại.
- Mức độ ưu tiên nếu cần.
- Trạng thái đơn giản.
- Nhân viên tạo.
- Thời điểm tạo và cập nhật.
- Tham chiếu giao dịch liên quan nếu có.

**[TBD - Unconfirmed]**: Danh sách trường cuối cùng, các loại yêu cầu và tập trạng thái. Nếu chưa được chốt khi phát triển, API nên dùng tập trường tối thiểu và tránh xây workflow phức tạp.

### 20.3. API CRUD

- **Tạo**: Nhân viên có quyền tạo bản ghi và liên kết khách hàng/giao dịch nếu có.
- **Đọc**: Cho phép xem chi tiết, phân trang, tìm kiếm và lọc theo các trường đã thống nhất.
- **Cập nhật**: Cho phép sửa nội dung chưa khóa; lưu thời điểm và người cập nhật.
- **Xóa**: Chỉ người có quyền được xóa khi bản ghi chưa có ràng buộc. Nếu cần lưu lịch sử, dùng ngừng sử dụng/xóa mềm.

### 20.4. Quyền truy cập

Quyền tạo, xem, sửa và xóa phải được tách riêng trong RBAC. Module không tự động gửi thông báo hoặc phân công xử lý trừ khi được bổ sung sau MVP.

## 21. Thông báo

### 21.1. Kênh thông báo

- Khách hàng: Zalo.
- Nhân viên: thông báo nội bộ trên trang quản trị và email.
- Không sử dụng Firebase Cloud Messaging.

### 21.2. Sự kiện thông báo cho khách hàng

Tối thiểu gồm:

- Xác nhận đã nộp tiền cọc và nhận sách.
- Nhắc hạn trả trước 1–2 ngày.
- Thông báo phiếu đã quá hạn và tiền phạt dự kiến.
- Xác nhận gia hạn và hạn trả mới.
- Xác nhận trả sách và nội dung quyết toán.
- Xác nhận thanh toán thành công.
- Xác nhận cửa hàng đã thu mua sách và chi tiền.
- Biên nhận mua sách khi khách có hồ sơ và thông tin phù hợp.

### 21.3. Sự kiện thông báo cho nhân viên

Tối thiểu gồm:

- Lịch làm mới hoặc thay đổi.
- Kết quả yêu cầu nghỉ/đổi ca.
- Ca thiếu người hoặc lịch xung đột cần xử lý.
- Cảnh báo tồn kho thấp.
- Chênh lệch kiểm kê.
- Phiếu thu mua chờ phê duyệt.
- Chênh lệch két hoặc ca cần duyệt.
- Bảng công/bảng lương cần xử lý.
- Thanh toán VietQR cần đối soát.

### 21.4. Luồng gửi thông báo

1. Nghiệp vụ phát sinh sự kiện sau khi giao dịch đạt trạng thái phù hợp.
2. Hệ thống tạo bản ghi thông báo với người nhận, kênh và mẫu nội dung.
3. Hệ thống đưa yêu cầu gửi đến dịch vụ tương ứng.
4. Kết quả gửi được cập nhật Thành công hoặc Thất bại.
5. Thông báo thất bại có thể được gửi lại tự động hoặc thủ công.
6. Nhân viên có quyền xem lịch sử gửi để hỗ trợ khách.

### 21.5. Dữ liệu cần lưu

- Loại sự kiện.
- Người nhận.
- Kênh gửi.
- Nội dung hoặc mã mẫu.
- Chứng từ liên quan.
- Thời điểm tạo và gửi.
- Trạng thái gửi.
- Số lần thử.
- Mô tả lỗi nếu thất bại.
- Trạng thái đọc đối với thông báo nội bộ.

### 21.6. Bảo vệ thông tin

- Không gửi mật khẩu qua email hoặc Zalo.
- OTP không được ghi vào nhật ký ở dạng có thể đọc lại.
- Thông báo tài chính chỉ chứa thông tin cần thiết.
- Không gửi CCCD hoặc dữ liệu nhận diện nhạy cảm trong nội dung thông báo.

**[TBD - Unconfirmed]**:

- Việc tích hợp trực tiếp Zalo Official Account API hay một nhà cung cấp trung gian.
- Mẫu nội dung Zalo cần đăng ký/phê duyệt.
- Thời điểm chính xác của nhắc hạn: trước một ngày, hai ngày hay cả hai.
- Số lần thử lại và thời gian giữa các lần gửi.

## 22. Báo cáo và thống kê

### 22.1. Nguyên tắc chung

- Báo cáo chỉ dùng giao dịch có trạng thái hợp lệ.
- Giao dịch bị hủy không được tính.
- Giao dịch đảo phải giảm số liệu tương ứng nhưng vẫn giữ khả năng truy vết.
- Bộ lọc thời gian phải dùng quy ước thời gian thống nhất của cửa hàng.
- Quyền xem số liệu tài chính phải được kiểm soát riêng.
- Kết quả trên màn hình và kết quả xuất file phải dùng cùng bộ lọc và công thức.

### 22.2. Báo cáo bán sách

Bao gồm:

- Số lượng bản đã bán.
- Doanh thu gộp và giảm giá.
- Doanh thu sau điều chỉnh.
- Theo đầu sách, bộ sách, danh mục, nhân viên và khoảng thời gian.
- Sách bán nhiều, bán ít hoặc không phát sinh giao dịch.

### 22.3. Báo cáo cho thuê

Bao gồm:

- Số phiếu và số bản được thuê.
- Phí thuê và phí gia hạn.
- Số phiếu sắp đến hạn, quá hạn và đã hoàn tất.
- Tổng tiền phạt quá hạn và hư hỏng.
- Số bản bị mất.
- Đầu sách được thuê nhiều hoặc ít.
- Thời gian thuê trung bình.

Tiền cọc không được tính là doanh thu.

### 22.4. Báo cáo thu mua và nhập hàng

Bao gồm:

- Số phiếu và giá trị nhập từ doanh nghiệp.
- Số phiếu, số bản và số tiền thu mua từ khách.
- Chi phí theo nguồn hàng, Grade, đầu sách và thời gian.
- Giao dịch vượt hạn mức hoặc phải phê duyệt.
- Tỷ lệ sách bị từ chối nếu dữ liệu được ghi nhận.

### 22.5. Báo cáo tồn kho

Bao gồm:

- Số lượng theo trạng thái.
- Số lượng khả dụng theo đầu sách/tập.
- Tồn dưới ngưỡng hoặc hết hàng.
- Bản đang cho thuê, hư hỏng, thất lạc và thanh lý.
- Sách tồn lâu không bán hoặc cho thuê.
- Chênh lệch kiểm kê.
- Lịch sử biến động của từng bản sách.

### 22.6. Báo cáo doanh thu

Doanh thu được tách tối thiểu thành:

- Doanh thu bán sách.
- Phí thuê.
- Phí gia hạn.
- Tiền phạt quá hạn.
- Tiền phạt hư hỏng.
- Khoản thu khác nếu được cấu hình.

Tiền cọc chỉ là khoản phải hoàn/đối trừ và không được tính vào doanh thu. Phần cọc bị giữ do mất sách phải được phân loại riêng để phục vụ đối soát và báo cáo thuế theo chính sách được xác nhận.

**[TBD - Unconfirmed]**: Cách phân loại kế toán/thuế đối với tiền cọc bị giữ do mất sách và các khoản phạt.

### 22.7. Báo cáo chi phí

Bao gồm:

- Chi phí nhập hàng từ doanh nghiệp.
- Chi phí thu mua sách từ khách.
- Chi phí nhân sự đã ghi nhận.
- Khoản hoàn/điều chỉnh có ảnh hưởng chi phí.
- So sánh doanh thu và chi phí theo kỳ.

### 22.8. Báo cáo nhân sự và lương

- Số ca và giờ làm.
- Đi muộn, về sớm, vắng và thiếu chấm công.
- Giờ tăng ca.
- Tổng lương, phụ cấp, thưởng và khấu trừ.
- Trạng thái chi trả lương.
- Chi phí nhân sự theo kỳ.

### 22.9. Báo cáo ca thu ngân

- Tiền đầu ca và cuối ca.
- Tổng thu/chi tiền mặt.
- Số tiền lý thuyết và thực tế.
- Chênh lệch theo ca, nhân viên và thời gian.
- Danh sách giao dịch cấu thành số dư.
- Lịch sử giải trình và phê duyệt chênh lệch.

### 22.10. Dữ liệu phục vụ kê khai thuế

1. Người dùng chọn kỳ tháng hoặc quý.
2. Hệ thống lấy các giao dịch đã hoàn tất trong kỳ.
3. Hệ thống tổng hợp doanh thu bán sách.
4. Hệ thống tổng hợp phí thuê và gia hạn.
5. Hệ thống tổng hợp tiền phạt theo nhóm riêng.
6. Hệ thống tổng hợp chi phí nhập hàng từ doanh nghiệp và thu mua từ khách.
7. Hệ thống tổng hợp chi phí nhân sự.
8. Người có quyền mở danh sách chứng từ cấu thành từng số liệu.
9. Sau khi kiểm tra, người dùng xuất Excel hoặc PDF.

Hệ thống chỉ tổng hợp và xuất dữ liệu; không lập hoặc nộp hồ sơ thuế tự động.

### 22.11. Xuất file

File Excel/PDF phải ghi:

- Tên báo cáo.
- Khoảng thời gian.
- Bộ lọc áp dụng.
- Thời điểm xuất.
- Người xuất.
- Các tổng số và dữ liệu chi tiết phù hợp.

**[TBD - Unconfirmed]**: Mẫu Excel/PDF, cột dữ liệu bắt buộc và định dạng được cơ quan/người dùng yêu cầu.

## 23. Cấu hình hệ thống

### 23.1. Nguyên tắc cấu hình

- Chỉ người có quyền mới được thay đổi.
- Thay đổi phải lưu người thực hiện, thời gian, giá trị cũ và mới.
- Cấu hình mới không được tự ý viết lại giao dịch lịch sử.
- Mỗi cấu hình phải xác định có hiệu lực ngay hay từ một thời điểm cụ thể.

### 23.2. Tiền tệ và làm tròn

- Đơn vị tiền tệ mặc định là VNĐ.
- Hệ thống dùng thống nhất quy tắc hiển thị và tính toán tiền.

**[TBD - Unconfirmed]**: Quy tắc làm tròn tiền đối với kết quả phần trăm, giảm giá và phí phát sinh.

### 23.3. Chính sách thuê

Cấu hình gồm:

- Đơn giá thuê mặc định theo ngày.
- Đơn giá riêng theo đầu sách hoặc bản sách.
- Số lần gia hạn tối đa.
- Số ngày tối đa mỗi lần gia hạn.
- Thời gian miễn phạt quá hạn.
- Hệ số phạt quá hạn.
- Trần phạt.
- Điều kiện chặn thuê.

Các giá trị mặc định đã chốt: tối đa hai lần gia hạn, mỗi lần không quá bảy ngày, miễn phạt hai giờ, hệ số phạt 150% và trần phạt 100% giá trị bản sách.

### 23.4. Hạng thành viên

Cấu hình gồm:

- Tên hạng.
- Ngưỡng tổng chi tiêu.
- Số bản thuê tối đa.
- Thời hạn thuê tối đa.
- Tỷ lệ giảm phí thuê.
- Tỷ lệ giảm giá bán nếu được áp dụng.

Hệ thống phải tính lại hạng tự động khi tổng chi tiêu hợp lệ thay đổi và lưu lịch sử.

### 23.5. Phạt hư hỏng

Mỗi mức gồm:

- Tên mức.
- Mô tả/tiêu chí nhận biết.
- Tỷ lệ phần trăm trên giá trị bản sách.
- Trạng thái sách sau xử lý.
- Trạng thái sử dụng.

Điều chỉnh ngoài khung phải có Quản lý duyệt.

### 23.6. Thu mua sách

- Khoảng tỷ lệ gợi ý theo Grade.
- Hạn mức đơn giá của Thu ngân.
- Hạn mức tổng phiếu.
- Vai trò được phê duyệt.
- Quy tắc xử lý Grade D.

### 23.7. Tồn kho

- Ngưỡng tối thiểu mặc định.
- Ngưỡng theo từng đầu sách.
- Số lượng nhập tối thiểu/tối đa.
- Chu kỳ hoặc thời điểm chạy cảnh báo.

### 23.8. Ca làm, chấm công và lương

- Mẫu ca và số người tối thiểu.
- Ngưỡng đi trễ/về sớm.
- Giới hạn giờ/ngày và giờ/tuần.
- Hình thức lương.
- Đơn giá và hệ số tăng ca.
- Các loại phụ cấp và khấu trừ.

### 23.9. Tích hợp

- Thông tin nhà cung cấp API sách.
- Cấu hình ngân hàng/VietQR và webhook.
- Cấu hình email.
- Cấu hình Zalo.
- Thời gian timeout, retry và trạng thái bật/tắt.

Bí mật tích hợp không được hiển thị lại dưới dạng đầy đủ trên giao diện hoặc ghi vào nhật ký thông thường.

## 24. Quy tắc trạng thái và tính toàn vẹn dữ liệu

### 24.1. Vòng đời bản sách

Luồng chính:

- `Chờ hoàn tất nhập` → `Khả dụng`
- `Khả dụng` → `Đang cho thuê` → `Khả dụng/Hư hỏng/Thất lạc`
- `Khả dụng` → `Đã bán`
- `Khả dụng/Hư hỏng` → `Thanh lý/Ngừng kinh doanh`
- `Khả dụng` → `Đang khóa kiểm kê` → `Khả dụng/Trạng thái điều chỉnh`

Quy tắc:

- Đã bán, Thất lạc, Thanh lý hoặc Ngừng kinh doanh không được dùng cho giao dịch mới.
- Chỉ một giao dịch có hiệu lực được giữ một bản sách tại cùng thời điểm.
- Thay đổi trạng thái ngoài luồng bán/thuê phải có lý do và quyền phù hợp.

### 24.2. Vòng đời hóa đơn bán

`Nháp` → `Chờ thanh toán` → `Đã thanh toán` hoặc `Đã hủy`

Ngoại lệ quét nhầm:

`Đã thanh toán` → `Đang yêu cầu đảo` → `Đã đảo` hoặc `Từ chối`

Hóa đơn gốc không bị xóa hoặc sửa giá trị sau thanh toán.

### 24.3. Vòng đời phiếu thuê

`Nháp` → `Chờ thanh toán cọc` → `Đang thuê` → `Sắp đến hạn/Quá hạn` → `Đang quyết toán` → `Đã hoàn tất`

Các trạng thái Sắp đến hạn và Quá hạn có thể được tính từ hạn trả thay vì ghi đè trạng thái nghiệp vụ gốc. MVP không có Trả một phần.

### 24.4. Vòng đời phiếu thu mua

`Nháp` → `Chờ khách đồng ý/Chờ duyệt` → `Đã duyệt` → `Chờ chi tiền` → `Đã hoàn tất`

Nhánh kết thúc khác gồm `Từ chối` và `Đã hủy`. Phiếu đã chi tiền không được hủy trực tiếp.

### 24.5. Vòng đời thanh toán

`Khởi tạo` → `Chờ thanh toán` → `Thành công/Thất bại/Hết hạn/Cần đối soát`

- Chỉ Thành công mới hoàn tất chứng từ nghiệp vụ.
- Webhook trùng không tạo giao dịch mới.
- Giao dịch Thành công bị đóng băng.
- Sửa sai dùng giao dịch đảo/điều chỉnh.

### 24.6. Vòng đời ca thu ngân

`Đang mở` → `Đang kiểm đếm` → `Chờ duyệt chênh lệch` hoặc `Đã đóng`

Ca Đã đóng chỉ được mở lại bằng quyền đặc biệt và phải ghi nhật ký.

### 24.7. Vòng đời bảng công và bảng lương

- Bảng công: `Nháp` → `Chờ kiểm tra` → `Đã chốt` → `Mở lại có kiểm soát`.
- Bảng lương: `Nháp` → `Chờ duyệt` → `Đã chốt` → `Đã thanh toán`.

Không sửa trực tiếp dữ liệu đã khóa.

### 24.8. Quy tắc giao dịch đồng thời

- Khi thêm bản sách vào hóa đơn hoặc phiếu thuê, backend phải kiểm tra và khóa phù hợp.
- Nếu hai nhân viên thao tác cùng một bản, chỉ giao dịch đầu tiên đáp ứng điều kiện được tiếp tục.
- Giao diện phải thông báo rõ bản sách đã thay đổi trạng thái.
- Không dựa vào số lượng tổng hợp để thay thế kiểm tra từng bản vật lý.

### 24.9. Không xóa dữ liệu lịch sử

Các dữ liệu đã tham gia giao dịch phải được ngừng sử dụng, đảo hoặc đánh dấu trạng thái thay vì xóa vật lý. Điều này áp dụng cho bản sách, khách hàng, nhân viên, chứng từ, thanh toán và cấu hình đã phát sinh tham chiếu.

## 25. Ngoại lệ và tình huống lỗi

### 25.1. Sách không có ISBN

1. Nhân viên tìm theo tên/tác giả để tránh tạo trùng.
2. Nếu không có, nhân viên tạo đầu sách thủ công.
3. Bắt buộc nhập tên/tập, tác giả và giá bìa ước tính.
4. Hệ thống vẫn sinh barcode nội bộ riêng cho bản vật lý.

### 25.2. API thư mục sách không khả dụng

- Hiển thị lỗi dễ hiểu và cho phép thử lại.
- Không tạo nhiều đầu sách trùng do người dùng bấm lại.
- Cho phép chuyển sang nhập thủ công.
- Không chặn các nghiệp vụ khác của cửa hàng.

### 25.3. Barcode không hợp lệ hoặc không khớp

- Barcode không tồn tại: thông báo và không thêm vào giao dịch.
- Bản không Khả dụng: hiển thị trạng thái hiện tại và từ chối bán/thuê.
- Khi trả sách, barcode không thuộc phiếu: chặn thao tác nhận trả.
- Barcode quét trùng trong cùng chứng từ: không thêm dòng trùng.

### 25.4. Webhook không hợp lệ

- Từ chối cập nhật thanh toán khi không xác thực được nguồn/chữ ký.
- Lưu sự kiện lỗi ở mức phù hợp để điều tra nhưng không làm lộ bí mật.
- Không chuyển hóa đơn sang Đã thanh toán.
- Có cảnh báo cho người phụ trách nếu lỗi lặp lại.

### 25.5. Webhook trùng hoặc đến muộn

- Dùng định danh giao dịch ngân hàng để bảo đảm xử lý một lần.
- Lần gửi trùng trả kết quả an toàn nhưng không tạo thêm giao dịch.
- Tiền đến sau khi QR hết hạn được đưa vào Cần đối soát.
- Nhân viên không tự gán khoản tiền đến muộn vào chứng từ khác nếu không có quyền và lý do.

### 25.6. Thanh toán thiếu, thừa hoặc sai nội dung

- Thiếu tiền: chứng từ chưa được đánh dấu thanh toán đủ.
- Thừa tiền: ghi nhận số thực nhận và tạo trường hợp đối soát/hoàn phần thừa.
- Sai nội dung nhưng xác định được người chuyển: người có quyền đối soát thủ công.
- Không xác định được: giữ ở danh sách giao dịch chưa ghép.

**[TBD - Unconfirmed]**: Quy trình và quyền đối soát thủ công với thanh toán sai nội dung.

### 25.7. Mất kết nối trong lúc giao dịch

- Giao diện không được giả định giao dịch thất bại chỉ vì không nhận được phản hồi.
- Khi kết nối lại, frontend tra cứu trạng thái bằng mã yêu cầu/giao dịch.
- Backend dùng mã chống gửi lặp cho các thao tác thanh toán và hoàn tất chứng từ.
- Nhân viên không tạo giao dịch thay thế trước khi kiểm tra trạng thái giao dịch cũ.

### 25.8. Tiền cọc không đủ khi quyết toán

1. Hệ thống khấu trừ tối đa phần cọc có thể sử dụng.
2. Tính phần khách phải trả thêm.
3. Phiếu chuyển sang Chờ thanh toán bổ sung.
4. Khách thanh toán tiền mặt hoặc VietQR.
5. Chỉ sau khi nghĩa vụ được thanh toán đủ, phiếu mới hoàn tất.

### 25.9. Chênh lệch kiểm kê

- Không tự động thay đổi tồn kho ngay khi phát hiện.
- Tạo đề nghị điều chỉnh kèm danh sách bản và lý do.
- Người có quyền phê duyệt.
- Sau phê duyệt mới cập nhật trạng thái và ghi nhật ký.

### 25.10. Chênh lệch két

- Nhân viên bắt buộc nhập giải trình.
- Vượt ngưỡng cấu hình phải có Quản lý duyệt.
- Không sửa giao dịch nguồn để ép số dư khớp.
- Điều chỉnh phải là một bút toán riêng có lý do và nhật ký.

### 25.11. Thao tác đồng thời trên cùng bản sách

- Backend kiểm tra trạng thái tại thời điểm ghi dữ liệu.
- Giao dịch đến sau nhận lỗi xung đột và phải tải lại dữ liệu.
- Không được để một bản vừa Đã bán vừa Đang cho thuê.

### 25.12. Dịch vụ thông báo thất bại

- Giao dịch nghiệp vụ vẫn được hoàn tất nếu việc gửi thông báo không phải điều kiện tài chính.
- Hệ thống lưu trạng thái Thất bại và cho phép gửi lại.
- Nhân viên thấy cảnh báo để có thể liên hệ khách bằng phương thức phù hợp.

## 31. Nội dung chưa xác nhận

Các nội dung dưới đây chưa được chốt và phải được đánh dấu **[TBD - Unconfirmed]** trong quá trình phân tích, phát triển và nghiệm thu. Không được âm thầm chọn một giá trị mặc định có ảnh hưởng nghiệp vụ.

### 31.1. Tham số tài khoản và xác thực

- **[TBD - Unconfirmed]** Thời hạn OTP.
- **[TBD - Unconfirmed]** Số lần nhập OTP sai và thời gian khóa.
- **[TBD - Unconfirmed]** Chính sách mật khẩu và thời gian phiên đăng nhập.

### 31.2. Giá thuê và quyền lợi thành viên

- **[TBD - Unconfirmed]** Đơn giá thuê/ngày cụ thể.
- **[TBD - Unconfirmed]** Tỷ lệ giảm phí thuê của từng hạng.
- **[TBD - Unconfirmed]** Có giữ mức giảm giá bán 5% cho Bạc và 10% cho Vàng hay không.
- **[TBD - Unconfirmed]** Hạng dùng để tính ưu đãi được cố định lúc lập phiếu hay lấy tại lúc trả.
- **[TBD - Unconfirmed]** Quy tắc làm tròn tiền và thời gian thuê lẻ.

### 31.3. Gia hạn và quyết toán thuê

- **[TBD - Unconfirmed]** Có cho gia hạn phiếu đã quá hạn sau khi xử lý phạt hay không.
- **[TBD - Unconfirmed]** Có bắt buộc hoàn cọc theo phương thức nộp ban đầu hay không.
- **[TBD - Unconfirmed]** Danh sách mức hư hỏng, tỷ lệ phạt và trạng thái sách tương ứng.

### 31.4. Thu mua và quản lý kho

- **[TBD - Unconfirmed]** Hạn mức giá thu mua của từng vai trò.
- **[TBD - Unconfirmed]** Quy tắc xử lý phiếu có một phần sách bị từ chối.
- **[TBD - Unconfirmed]** Quy tắc làm tròn giá gợi ý thu mua.
- **[TBD - Unconfirmed]** MVP quản lý một hay nhiều két vật lý.

### 31.5. Ca làm, chấm công và lương

- **[TBD - Unconfirmed]** Quy tắc ca qua ngày và thời gian nghỉ.
- **[TBD - Unconfirmed]** Cơ chế xác thực check-in/check-out tại cửa hàng.
- **[TBD - Unconfirmed]** Quy trình xác nhận đổi ca.
- **[TBD - Unconfirmed]** Hình thức lương chính thức, hệ số tăng ca và cách xử lý thiếu công.
- **[TBD - Unconfirmed]** Có cho phép thanh toán lương nhiều lần hay không.

### 31.6. Thanh toán và đối soát

- **[TBD - Unconfirmed]** Ngân hàng/nhà cung cấp VietQR cụ thể.
- **[TBD - Unconfirmed]** Chuẩn chữ ký và xác thực webhook.
- **[TBD - Unconfirmed]** Thời gian retry webhook.
- **[TBD - Unconfirmed]** Quy trình đối soát tiền thiếu, thừa, sai nội dung hoặc đến muộn.
- **[TBD - Unconfirmed]** Cách phân loại báo cáo/thuế đối với tiền cọc bị giữ và tiền phạt.

### 31.7. Thông báo và báo cáo

- **[TBD - Unconfirmed]** Tích hợp trực tiếp Zalo OA hay qua nhà cung cấp trung gian.
- **[TBD - Unconfirmed]** Mẫu Zalo và quy trình phê duyệt mẫu.
- **[TBD - Unconfirmed]** Lịch nhắc hạn chính xác.
- **[TBD - Unconfirmed]** Số lần gửi lại thông báo thất bại.
- **[TBD - Unconfirmed]** Mẫu Excel/PDF và các cột bắt buộc.

### 31.8. Module yêu cầu của khách hàng

- **[TBD - Unconfirmed]** Danh sách trường cuối cùng của bảng dữ liệu.
- **[TBD - Unconfirmed]** Loại yêu cầu và tập trạng thái tối giản.
- **[TBD - Unconfirmed]** Chính sách xóa cứng hay xóa mềm.
