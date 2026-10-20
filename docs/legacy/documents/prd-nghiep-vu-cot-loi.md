# PRD - Nghiệp vụ cốt lõi của cửa hàng sách cũ và cho thuê truyện tranh

## 2. Tóm tắt sản phẩm

### 2.1. Bối cảnh kinh doanh

Sản phẩm là một hệ thống web nội bộ phục vụ một cửa hàng vật lý chuyên:

- Bán sách cũ tại quầy.
- Cho thuê sách và truyện tranh tại quầy.
- Thu mua sách cũ trực tiếp từ khách hàng.
- Nhập sách từ nhà cung cấp.
- Quản lý từng cuốn sách vật lý, giao dịch, khách hàng, nhân viên và dòng tiền tại cửa hàng.

Cửa hàng hiện cần theo dõi nhiều thông tin có liên quan chặt chẽ với nhau: một đầu sách có thể có nhiều bản vật lý, mỗi bản có tình trạng và giá khác nhau, một bản có thể được bán hoặc cho thuê, và mỗi giao dịch có thể kéo theo tiền cọc, phí thuê, tiền phạt hoặc khoản hoàn trả. Nếu các dữ liệu này được quản lý thủ công, cửa hàng dễ gặp sai lệch tồn kho, nhầm lẫn khi quyết toán và khó truy tìm trách nhiệm.

### 2.2. Vấn đề cần giải quyết

Hệ thống cần giải quyết các vấn đề chính sau:

- Không xác định chính xác bản sách nào đang có sẵn, đang được thuê, đã bán, bị hỏng hoặc thất lạc.
- Khó theo dõi hạn trả và tính nhất quán phí thuê, phí gia hạn, tiền phạt và tiền cọc.
- Khó quản lý nguồn gốc, tình trạng và giá vốn của sách cũ thu mua từ khách.
- Khó đối chiếu tiền thu, tiền chi và số dư két theo từng ca thu ngân.
- Khó kiểm soát quyền của nhân viên và truy vết các thao tác nhạy cảm.
- Thiếu dữ liệu tập trung để lập báo cáo doanh thu, chi phí, tồn kho và dữ liệu phục vụ kê khai thuế.

### 2.3. Giải pháp đề xuất

Hệ thống cung cấp một giao diện quản trị kiêm POS dùng tại cửa hàng. Nhân viên sử dụng giao diện này để thực hiện nghiệp vụ theo quyền được cấp. Backend cung cấp API cho giao diện quản trị và cho các dịch vụ tích hợp như ngân hàng, email, Zalo và thư mục sách.

Trong MVP, khách hàng không trực tiếp đăng nhập hệ thống. Nhân viên tạo và quản lý hồ sơ khách hàng, thực hiện mọi giao dịch tại quầy và gửi thông báo cho khách qua Zalo.

### 2.4. Mô hình vận hành

- Hệ thống phục vụ một cửa hàng vật lý duy nhất.
- Mọi giao dịch mua, bán, thuê, trả và thu mua sách diễn ra tại quầy.
- Không có trang thương mại điện tử cho khách hàng.
- Không có đặt trước hoặc giữ chỗ sách.
- Không có giao hàng hoặc nhận trả sách qua đơn vị vận chuyển.
- Không có ứng dụng di động độc lập trong MVP.
- Mỗi bản sách vật lý được quản lý bằng một barcode duy nhất.

### 2.5. Giá trị mang lại

- Theo dõi chính xác vòng đời của từng bản sách.
- Chuẩn hóa các bước bán, thuê, trả và thu mua sách.
- Tự động hóa các phép tính thường gây sai sót như phí thuê, phạt quá hạn và quyết toán tiền cọc.
- Đối soát được doanh thu, chi phí và tiền mặt theo giao dịch và theo ca.
- Cung cấp dữ liệu đáng tin cậy cho quản lý và báo cáo.
- Tạo nền tảng để mở rộng thêm dịch vụ trong tương lai mà không đưa các dịch vụ đó vào MVP.

## 3. Mục tiêu và tiêu chí thành công

### 3.1. Mục tiêu kinh doanh

- Giảm thất thoát sách và tiền trong quá trình vận hành.
- Tăng tốc độ phục vụ khách tại quầy.
- Theo dõi được hiệu quả của hoạt động bán sách, cho thuê và thu mua sách.
- Hỗ trợ chủ cửa hàng ra quyết định dựa trên doanh thu, chi phí và tình trạng tồn kho.

### 3.2. Mục tiêu vận hành

- Mọi bản sách đang kinh doanh phải có barcode và trạng thái rõ ràng.
- Mọi khoản thu hoặc chi phải liên kết với chứng từ nghiệp vụ tương ứng.
- Các thao tác nhạy cảm phải được kiểm tra quyền và ghi nhật ký.
- Số liệu tồn kho, giao dịch và dòng tiền phải có thể truy ngược đến người thực hiện.
- Nhân viên có thể hoàn thành các luồng chính tại quầy mà không phải ghi chép lại ở hệ thống khác.

### 3.3. Mục tiêu sản phẩm

MVP phải hỗ trợ đầy đủ các nhóm nghiệp vụ sau:

1. Tài khoản nhân viên, xác thực email và phân quyền.
2. Danh mục, bộ sách, đầu sách và bản sách vật lý.
3. Nhập kho, xuất kho, kiểm kê và cảnh báo tồn kho.
4. Thu mua sách cũ từ khách hàng.
5. Bán sách tại quầy.
6. Cho thuê, gia hạn, nhận trả và quyết toán tiền cọc.
7. Hồ sơ khách hàng và hạng thành viên.
8. Thanh toán tiền mặt và VietQR có xác nhận bằng webhook ngân hàng.
9. Ca thu ngân, nhân viên, chấm công, lương, thông báo và báo cáo được mô tả trong tài liệu PRD thứ hai.

### 3.4. Chỉ số đánh giá thành công

Các chỉ số sau phải được hệ thống thu thập được. Mục tiêu định lượng chính thức chưa được thống nhất:

- Tỷ lệ bản sách có barcode và trạng thái hợp lệ.
- Thời gian trung bình để hoàn thành một giao dịch bán hoặc thuê tại quầy.
- Số lượng giao dịch phải điều chỉnh sau khi hoàn tất.
- Tỷ lệ chênh lệch giữa tồn kho hệ thống và kiểm kê thực tế.
- Tỷ lệ chênh lệch két tiền theo ca.
- Tỷ lệ thanh toán VietQR được đối soát tự động thành công.
- Số phiếu thuê quá hạn và thời gian quá hạn trung bình.
- Độ chính xác của báo cáo doanh thu và chi phí so với chứng từ nguồn.

**[TBD - Unconfirmed]**: Giá trị mục tiêu cụ thể cho từng chỉ số sẽ được chốt trước UAT.

### 3.5. Mục tiêu không thuộc MVP

- Kinh doanh đa chi nhánh.
- Sàn thuê sách trực tuyến hoặc giao nhận tận nơi.
- Trang khách hàng để mua, thuê, đặt trước hoặc giữ chỗ.
- Ví điện tử nội bộ hoặc thẻ trả trước.
- Bán văn phòng phẩm, F&B hoặc quản lý nguyên liệu.
- Vận hành chương trình điểm tích lũy.
- Tự động chuyển tiền lương, tiền thu mua hoặc tiền hoàn cọc qua API ngân hàng.
- Tự động nộp hồ sơ kê khai thuế.

## 4. Phạm vi sản phẩm

### 4.1. Phạm vi MVP

MVP bao gồm một web app nội bộ với hai ngữ cảnh sử dụng chính:

- POS tại quầy cho các thao tác bán, thuê, trả, thanh toán, thu mua và quản lý két.
- Trang quản trị cho danh mục, kho, khách hàng, nhân viên, cấu hình, báo cáo và phân quyền.

Backend sử dụng ASP.NET Core và cung cấp REST API. Frontend sử dụng React. Cơ sở dữ liệu phải là cơ sở dữ liệu quan hệ để đảm bảo ràng buộc giữa sách, giao dịch, thanh toán và tồn kho.

**[TBD - Unconfirmed]**: Hệ quản trị cơ sở dữ liệu cụ thể chưa được chốt trong các nguồn yêu cầu.

### 4.2. Nội dung ngoài phạm vi

- Khách hàng tự đăng ký hoặc đăng nhập.
- Khách tự tạo đơn mua, phiếu thuê hoặc yêu cầu gia hạn trên website.
- Đặt trước, giữ chỗ hoặc hàng chờ cho sách.
- Thanh toán trực tuyến từ giao diện khách hàng.
- Giao hàng, nhận trả tận nơi và tích hợp đơn vị vận chuyển.
- Quản lý nhiều cửa hàng hoặc điều chuyển liên chi nhánh.
- Tích điểm, đổi điểm, hết hạn điểm hoặc hoàn điểm.
- Hoàn trả sách đã bán theo chính sách đổi trả thông thường.

### 4.3. Hướng mở rộng

Thiết kế không được buộc hệ thống chỉ có thể quản lý sách mãi mãi, nhưng MVP không cần triển khai các module mở rộng. Các hướng có thể cân nhắc sau MVP gồm:

- Trang tra cứu hoặc tài khoản cho khách hàng.
- Giữ chỗ, đặt trước hoặc thương mại điện tử.
- Chương trình điểm tích lũy.
- Nhiều chi nhánh và luân chuyển kho.
- Văn phòng phẩm, F&B và hóa đơn phức hợp.
- Ứng dụng di động.

### 4.4. Giả định và giới hạn

- Cửa hàng có máy quét barcode và máy in tem barcode.
- Nhân viên được đào tạo quy trình quét đúng bản sách vật lý.
- Cửa hàng có tài khoản ngân hàng và quyền truy cập API/webhook phù hợp.
- Cửa hàng có hạ tầng gửi email và tài khoản/kênh Zalo phù hợp.
- Thời gian triển khai dự kiến tối đa 13–14 tuần.
- Các tỷ lệ, hạn mức và đơn giá chưa chốt phải được cấu hình thay vì viết cố định trong mã nguồn.

## 5. Người dùng và các bên liên quan

Các thông tin dưới đây chỉ là các nghiệp vụ trong thực tế. Không phải phân quyền thật sự trong hệ thống

### 5.1. Chủ cửa hàng

Chủ cửa hàng chịu trách nhiệm cuối cùng về chính sách giá, tiền cọc, phí thuê, hạng thành viên, hạn mức phê duyệt, nhân sự và báo cáo tài chính. Chủ cửa hàng có thể sử dụng tài khoản Admin gốc hoặc một vai trò quản trị phù hợp.

### 5.2. Admin gốc

- Được seed khi triển khai hệ thống.
- Có toàn quyền trên hệ thống.
- Không thể bị hạ quyền bởi tài khoản khác.
- Không thể bị xóa hoặc vô hiệu hóa bằng luồng quản trị thông thường.
- Được phép cấp vai trò Admin cho tài khoản khác qua RBAC.

### 5.3. Admin được cấp quyền

- Có các quyền quản trị được gán qua RBAC.
- Có thể quản lý tài khoản, vai trò, cấu hình và nhật ký nếu được cấp quyền.
- Không được thay đổi hoặc hạ quyền Admin gốc.
- Có thể bị điều chỉnh quyền bởi chủ thể có thẩm quyền.

### 5.4. Quản lý

Quản lý giám sát kho, nhân viên, ca làm, giá, thu mua, các ngoại lệ nghiệp vụ, bảng công, bảng lương và báo cáo theo quyền được cấp. Quản lý là người phê duyệt phổ biến đối với giá thu mua vượt hạn mức, điều chỉnh phí và đảo giao dịch do quét nhầm.

### 5.5. Thu ngân

Thu ngân thực hiện các giao dịch tại quầy trong ca đang mở:

- Bán sách.
- Lập phiếu thuê và nhận trả sách.
- Thu tiền và hoàn cọc.
- Tiếp nhận thu mua sách cũ.
- Quản lý tiền trong két theo quyền được cấp.

### 5.6. Nhân viên kho

Nhân viên kho thực hiện nhập kho, xuất kho, in/gắn barcode, kiểm kê, điều chỉnh có phê duyệt và theo dõi cảnh báo tồn kho.

### 5.7. Nhân viên thông thường

Đây là vai trò mặc định có quyền tối thiểu. Nhân viên chỉ được xem thông tin cá nhân, lịch làm, chấm công và sử dụng các chức năng được cấp bổ sung.

### 5.8. Khách hàng

Khách hàng không đăng nhập hệ thống trong MVP. Hồ sơ khách hàng được nhân viên quản lý và có thể đóng nhiều vai trò:

- Người mua sách.
- Người thuê sách.
- Người bán lại sách cũ cho cửa hàng.
- Người gửi yêu cầu hoặc báo cáo cần hỗ trợ.

### 5.9. Hệ thống bên ngoài

- API ngân hàng/VietQR: tạo thông tin thanh toán và xác nhận tiền vào.
- Google Books hoặc Open Library: tra cứu thông tin thư mục theo ISBN.
- Dịch vụ email: OTP và thông báo cho nhân viên.
- Zalo: thông báo cho khách hàng.

## 6. Thuật ngữ và mô hình nghiệp vụ

### 6.1. Thể loại, bộ (đầu) sách, bản sách vật lý

- **Thể loại:** Nhóm các cuốn sách có cùng một chủ đề hoặc một thông tin gì đó liên quan với nhau.
- **Bộ (đầu) sách**: nhóm nhiều tập có cùng series, ví dụ một bộ truyện tranh.
- **Bản sách vật lý**: cuốn sách thực tế đang được cửa hàng quản lý. Mỗi bản có barcode, tình trạng, giá vốn, giá bán và trạng thái riêng.

Quan hệ chuẩn là: một thể loại có nhiều bản sách hoặc bộ(đầu) sách; một bộ (đầu) sách có nhiều bản sách vật lý.

### 6.2. Giá bìa, giá bán và giá trị bản sách

- **Giá bìa**: giá tham khảo của ấn phẩm, được lấy từ nguồn bên ngoài hoặc nhập thủ công.
- **Giá bán thực tế**: giá do cửa hàng định cho từng bản sách vật lý dựa trên tình trạng và độ hiếm.
- **Giá trị bản sách**: trong các quy tắc tiền cọc và trần phạt, giá trị bản sách chính là giá bán thực tế của bản vật lý đó, không phải giá bìa chung.

Giá bán phải được xác nhận trước khi bản sách chuyển sang trạng thái khả dụng.

### 6.3. Phiếu thuê, phí thuê và tiền cọc

- **Phiếu thuê**: chứng từ ghi nhận một khách hàng nhận một hoặc nhiều bản sách.
- **Phí thuê**: khoản doanh thu cửa hàng thu dựa trên đơn giá thuê, số ngày thuê thực tế và ưu đãi thành viên.
- **Tiền cọc**: khoản khách nộp khi nhận sách. Tiền cọc của mỗi bản bằng 100% giá bán thực tế của bản đó.
- **Phí gia hạn**: phần phí thuê phát sinh do thời gian gia hạn; được quyết toán khi trả sách.
- **Tiền phạt**: khoản phát sinh do quá hạn hoặc hư hỏng.

### 6.4. Phiếu thu mua và phiếu nhập kho

- **Phiếu thu mua**: chứng từ cửa hàng mua sách cũ từ cá nhân và chi tiền cho người bán.
- **Phiếu nhập kho**: chứng từ nhập sách từ doanh nghiệp, nhà phát hành hoặc nhà cung cấp.

Hai loại chứng từ đều tạo bản sách vật lý nhưng khác nguồn hàng, cách thanh toán và dữ liệu đối tác.

### 6.5. Hạng thành viên và tổng chi tiêu hợp lệ

Hạng thành viên được hệ thống tự tính từ tổng chi tiêu hợp lệ. Tổng chi tiêu hợp lệ gồm:

- Tiền mua sách đã thanh toán.
- Phí thuê đã thanh toán.
- Phí gia hạn đã thanh toán.

Không bao gồm:

- Tiền cọc.
- Tiền phạt quá hạn.
- Tiền phạt hư hỏng hoặc bồi thường.
- Tiền cửa hàng chi khi thu mua sách.
- Giao dịch bị hủy hoặc số tiền đã đảo.

### 6.6. Ca làm việc hoặc ca thu ngân.

- **Ca làm việc**: khoảng thời gian nhân viên được phân công làm việc.
- **Ca thu ngân**: khoảng thời gian một nhân viên chịu trách nhiệm đối với két tiền cụ thể.

Hai khái niệm có thể liên kết nhưng không đồng nhất; một ca làm việc chỉ trở thành ca thu ngân khi nhân viên mở két và ghi nhận tiền đầu ca.

Trong hệ thống code, đồng nhất khái niệm ca làm việc và ca thu ngân để dễ dàng quản lý được thông tin công việc của nhân viên.

### 6.7. Giao dịch thu, chi và hoàn tiền

- **Thu**: tiền bán sách, tiền cọc, phí thuê, phí gia hạn, tiền phạt hoặc khoản thu hợp lệ khác.
- **Chi**: tiền thu mua sách, hoàn cọc và chi lương.
- **Đảo giao dịch**: bút toán nghiệp vụ dùng để vô hiệu tác động của giao dịch đã hoàn tất trong trường hợp được phép; không xóa dấu vết giao dịch gốc.

## 7. Kiến trúc chức năng tổng quan

### 7.1. Trang quản trị và POS nội bộ

Frontend React cung cấp giao diện nội bộ theo quyền người dùng. Không có giao diện thương mại điện tử. POS cần tối ưu cho thao tác quét barcode, chọn khách hàng, xác nhận thanh toán và in/gửi chứng từ.

### 7.2. Backend và API

Backend ASP.NET Core cung cấp REST API cho:

- Tài khoản và phân quyền.
- Danh mục, kho và bản sách.
- Bán, thuê, trả và thu mua.
- Khách hàng và thành viên.
- Thanh toán và ca thu ngân.
- Nhân sự, thông báo và báo cáo.
- Webhook từ ngân hàng.

API phải kiểm tra quyền và trạng thái nghiệp vụ ở phía server; không dựa vào việc ẩn nút trên giao diện để bảo vệ chức năng.

### 7.3. Cơ sở dữ liệu

Cơ sở dữ liệu phải đảm bảo:

- Barcode của bản sách là duy nhất.
- Một bản sách không thể đồng thời nằm trong hai giao dịch đang có hiệu lực.
- Mọi thanh toán liên kết được với chứng từ nguồn.
- Dữ liệu tài chính đã hoàn tất không bị sửa trực tiếp.
- Có lịch sử cho các thay đổi nhạy cảm.

### 7.4. Tích hợp bên ngoài

Mỗi tích hợp phải có cơ chế xử lý lỗi và không được làm mất dữ liệu giao dịch nội bộ. Việc API thư mục sách hoặc dịch vụ thông báo tạm thời không hoạt động không được chặn hoàn toàn hoạt động bán hàng tại quầy. Riêng thanh toán chuyển khoản chỉ được xác nhận khi nhận bằng chứng thanh toán hợp lệ theo quy tắc tại Mục 16.

### 7.5. Kênh thông báo

- Khách hàng nhận thông báo qua Zalo.
- Nhân viên nhận thông báo trong trang quản trị và qua email.
- Không sử dụng Firebase Cloud Messaging trong MVP.

## 8. Tài khoản, xác thực và phân quyền

### 8.1. Khởi tạo Admin gốc

1. Khi triển khai, hệ thống seed một tài khoản Admin gốc.
2. Thông tin bí mật ban đầu phải được cung cấp qua phương thức triển khai an toàn.
3. Admin gốc đăng nhập và đổi mật khẩu theo chính sách bảo mật.
4. Hệ thống đánh dấu tài khoản này là tài khoản được bảo vệ.
5. Các API sửa vai trò, khóa hoặc xóa tài khoản phải từ chối mọi thao tác làm mất quyền của Admin gốc.

### 8.2. Danh sách email được phép đăng ký

Admin có API để:

- Thêm email nhân viên vào danh sách cho phép.
- Xem và tìm kiếm danh sách.
- Cập nhật email chưa được sử dụng.
- Thu hồi email chưa đăng ký.
- Xem email đã được liên kết với tài khoản nào.

Mỗi email chỉ được sử dụng để tạo một tài khoản. Mọi thay đổi danh sách phải ghi người thực hiện, thời gian và nội dung thay đổi.

### 8.3. Luồng nhân viên tự đăng ký

1. Nhân viên nhập email do cửa hàng cung cấp.
2. Hệ thống chuẩn hóa email và kiểm tra email có trong danh sách cho phép.
3. Hệ thống từ chối nếu email không tồn tại, đã bị thu hồi hoặc đã được sử dụng.
4. Nhân viên nhập các thông tin đăng ký bắt buộc.
5. Hệ thống tạo yêu cầu đăng ký ở trạng thái chờ xác thực.
6. Hệ thống gửi OTP đến email nhân viên.
7. Nhân viên nhập OTP còn hiệu lực.
8. Hệ thống kích hoạt tài khoản và liên kết tài khoản với email đã cho phép.
9. Tài khoản nhận vai trò mặc định là Nhân viên, trừ khi Admin đã cấu hình khác.

### 8.4. Đăng nhập và quản lý mật khẩu

- Chỉ tài khoản đã xác thực và đang hoạt động được đăng nhập.
- Người dùng có thể đăng xuất và đổi mật khẩu.
- Quên mật khẩu được xử lý qua email đã xác thực.
- Admin không được xem mật khẩu người dùng; chỉ được kích hoạt luồng đặt lại.
- Mật khẩu phải được băm; không lưu dưới dạng có thể đọc lại.

### 8.5. Vai trò và quyền hạn

Hệ thống dùng RBAC và hỗ trợ:

- Tạo, cập nhật và ngừng sử dụng vai trò.
- Gán quyền theo nhóm chức năng.
- Gán vai trò cho nhân viên.
- Bổ sung quyền riêng cho một tài khoản khi cần.
- Kiểm tra quyền ở mọi API nghiệp vụ.

Các vai trò mẫu ban đầu gồm Admin, Quản lý, Thu ngân, Nhân viên kho và Nhân viên. Quyền thực tế có thể được cấu hình, ngoại trừ bảo vệ dành cho Admin gốc.

### 8.6. Nhật ký thao tác

Nhật ký tối thiểu phải lưu:

- Người thực hiện.
- Hành động.
- Đối tượng bị tác động.
- Thời điểm.
- Giá trị trước và sau đối với thay đổi quan trọng.
- Lý do nghiệp vụ khi quy trình yêu cầu.

Các thao tác bắt buộc ghi nhật ký gồm thay đổi quyền, thay đổi giá, duyệt ngoại lệ, hủy/đảo giao dịch, điều chỉnh kho, điều chỉnh tiền phạt và thay đổi trạng thái tài khoản.

## 9. Quản lý danh mục và sách

### 9.1. Danh mục và thể loại

Người có quyền được tạo, cập nhật, ngừng sử dụng và tra cứu danh mục. Chỉ được xóa danh mục khi không còn dữ liệu tham chiếu; nếu đã phát sinh dữ liệu, phải ngừng sử dụng thay vì xóa.

### 9.2. Bộ sách và đầu sách

Một bộ(đầu) sách có thể chứa nhiều tập. Đầu sách/tập lưu tối thiểu:

- Tên sách hoặc tên tập.
- Bộ sách và số tập nếu có.
- ISBN nếu có.
- Tác giả.
- Nhà xuất bản.
- Năm xuất bản.
- Giá bìa tham khảo.
- Mô tả và ảnh bìa.
- Danh mục/thể loại.
- Đơn giá thuê mặc định theo ngày.

Hệ thống phải cho phép sách không thuộc bộ và sách không có ISBN.

### 9.3. Bản sách vật lý

Mỗi bản sách lưu tối thiểu:

- Barcode nội bộ duy nhất.
- Đầu sách liên kết.
- Nguồn nhập và chứng từ nguồn.
- Grade và mô tả tình trạng.
- Giá vốn.
- Giá bán thực tế.
- Đơn giá thuê/ngày nếu khác mặc định.
- Trạng thái hiện tại.
- Lịch sử thay đổi trạng thái.

### 9.4. Trạng thái bản sách

Tối thiểu gồm:

- Chờ định giá/chờ hoàn tất nhập kho.
- Khả dụng.
- Đang cho thuê.
- Đang bị khóa kiểm kê.
- Đã bán.
- Hư hỏng.
- Thất lạc.
- Thanh lý.
- Ngừng kinh doanh.

Chỉ bản ở trạng thái Khả dụng mới được đưa vào hóa đơn bán hoặc phiếu thuê mới.

### 9.5. Tra cứu bằng ISBN

1. Nhân viên quét hoặc nhập ISBN.
2. Hệ thống kiểm tra đầu sách hiện có trước để tránh tạo trùng.
3. Nếu chưa có, hệ thống gọi Google Books hoặc Open Library.
4. Hệ thống hiển thị dữ liệu tìm được để nhân viên kiểm tra.
5. Nhân viên xác nhận hoặc chỉnh sửa tên, tác giả, nhà xuất bản, ảnh và các trường liên quan.
6. Giá bìa luôn phải do nhân viên xác nhận.
7. Nếu API không trả kết quả hoặc gặp lỗi, nhân viên chuyển sang nhập thủ công.

### 9.6. Nhập thủ công

Với sách không có ISBN hoặc không tìm thấy, tối thiểu phải nhập tên sách/tập, tác giả và giá bìa ước tính. Dữ liệu phải đủ để định giá và tính các chính sách liên quan trước khi bản sách được kinh doanh.

## 10. Quản lý nhà cung cấp và kho

### 10.1. Nhà cung cấp

Hệ thống cho phép tạo, cập nhật, ngừng hợp tác và tra cứu nhà cung cấp. Hồ sơ cần hỗ trợ thông tin liên hệ, mã số/định danh phù hợp và lịch sử các phiếu nhập.

### 10.2. Luồng nhập sách từ doanh nghiệp

1. Nhân viên có quyền tạo phiếu nhập nháp.
2. Chọn nhà cung cấp, ngày nhập và thông tin chứng từ.
3. Quét ISBN hoặc chọn đầu sách có sẵn.
4. Bổ sung đầu sách thủ công nếu cần.
5. Nhập số lượng, đơn giá và thông tin tình trạng ban đầu.
6. Hệ thống kiểm tra giới hạn số lượng nhập được cấu hình.
7. Người có quyền kiểm tra và xác nhận phiếu.
8. Hệ thống tạo từng bản sách vật lý, không gộp nhiều cuốn vào một mã.
9. Barcode được sinh/in và gắn với từng cuốn.
10. Mỗi bản phải được định giá bán trước khi chuyển sang Khả dụng.
11. Hệ thống cập nhật chi phí nhập hàng và kiểm tra ngưỡng tồn kho.

### 10.3. Xuất kho ngoài bán hàng

Các trường hợp hư hỏng không thể kinh doanh, thất lạc, thanh lý hoặc ngừng kinh doanh phải có phiếu xuất hoặc chứng từ điều chỉnh. Chứng từ phải ghi bản sách, lý do, người lập và người phê duyệt nếu cần.

### 10.4. Kiểm kê

1. Người có quyền tạo phiếu kiểm kê và chọn phạm vi.
2. Các bản trong phạm vi được khóa khỏi giao dịch xuất kho.
3. Nhân viên quét/ghi nhận từng bản thực tế.
4. Hệ thống so sánh số liệu thực tế với dữ liệu hệ thống.
5. Chênh lệch được lập thành đề nghị điều chỉnh.
6. Người có quyền phê duyệt hoặc từ chối.
7. Sau phê duyệt, hệ thống cập nhật trạng thái/tồn kho và ghi lịch sử.
8. Phiếu kiểm kê được đóng và các bản không còn vướng xử lý được mở khóa.

### 10.5. Ngưỡng tồn kho

- Ngưỡng tối thiểu mặc định là một bản khả dụng cho mỗi đầu sách, nhưng cho phép cấu hình lại.
- Khi số lượng khả dụng chạm hoặc thấp hơn ngưỡng tối thiểu, hệ thống tạo cảnh báo.
- Khi số lượng bằng không, hệ thống thể hiện trạng thái hết hàng trong giao diện nội bộ.
- Không còn Web Portal khách hàng nên không có yêu cầu ẩn nút bán trên trang khách.

## 11. Thu mua sách cũ từ khách hàng

### 11.1. Điều kiện người bán

Người bán bắt buộc có hồ sơ khách hàng với tối thiểu họ tên và số điện thoại. Hồ sơ này dùng để lập chứng từ, lưu nguồn gốc sách và đối chiếu khoản chi.

### 11.2. Tiêu chuẩn tình trạng và giá gợi ý

- Grade A, mới khoảng 90%–99%: gợi ý 35%–45% giá bìa.
- Grade B, mới khoảng 70%–89%: gợi ý 20%–30% giá bìa.
- Grade C, mới khoảng 50%–69%: gợi ý 10%–15% giá bìa.
- Grade D, dưới 50%: cảnh báo từ chối hoặc mua theo giá thanh lý riêng.

Các khoảng trên là giá gợi ý, không tự động trở thành giá cuối cùng. Giá thực tế phải được nhân viên và khách thống nhất.

### 11.3. Luồng thu mua chi tiết

1. Nhân viên tìm hoặc tạo hồ sơ người bán.
2. Với từng cuốn, nhân viên quét ISBN hoặc tìm đầu sách hiện có.
3. Nếu không có dữ liệu, nhân viên nhập thông tin tối thiểu thủ công.
4. Nhân viên kiểm tra thực tế và chọn Grade.
5. Hệ thống tính khoảng giá gợi ý từ giá bìa và Grade.
6. Nhân viên nhập giá thỏa thuận.
7. Nếu đơn giá hoặc tổng phiếu vượt hạn mức, hệ thống chuyển sang Chờ duyệt.
8. Quản lý phê duyệt hoặc từ chối; mọi thay đổi giá phải có lý do.
9. Sau khi khách đồng ý, hệ thống lập phiếu thu mua.
10. Cửa hàng chi tiền mặt hoặc chuyển khoản cho khách.
11. Với chuyển khoản, nhân viên nhập mã giao dịch; hệ thống không tự chuyển tiền.
12. Hệ thống tạo một bản sách và barcode riêng cho từng cuốn được nhận.
13. Nhân viên nhập giá vốn, tình trạng và giá bán dự kiến.
14. Chỉ bản đã có giá bán được xác nhận mới chuyển sang Khả dụng.
15. Khoản chi được đưa vào chi phí thu mua và liên kết với ca thu ngân nếu chi tiền mặt.
16. Hệ thống gửi biên nhận/thông báo Zalo khi kênh thông báo sẵn sàng.

### 11.4. Hủy hoặc từ chối

- Cuốn không đạt chất lượng có thể bị loại khỏi phiếu trước khi hoàn tất.
- Phiếu chưa chi tiền có thể được hủy bởi người có quyền.
- Phiếu đã chi tiền không được xóa; nếu cần sửa phải dùng quy trình đảo/điều chỉnh có phê duyệt và nhật ký.

## 12. Bán sách tại quầy

### 12.1. Điều kiện bán

- Bản sách ở trạng thái Khả dụng.
- Có barcode hợp lệ.
- Có giá bán thực tế đã xác nhận.
- Không bị khóa bởi kiểm kê hoặc giao dịch khác.

### 12.2. Luồng bán chi tiết

1. Thu ngân mở hóa đơn mới trong ca đang hoạt động.
2. Thu ngân quét barcode từng bản sách.
3. Hệ thống kiểm tra trạng thái và khóa tạm bản sách cho hóa đơn.
4. Thu ngân chọn hồ sơ khách hàng nếu khách muốn ghi nhận lịch sử hoặc hưởng quyền lợi; bán cho khách vãng lai vẫn được phép.
5. Hệ thống lấy giá bán của từng bản.
6. Hệ thống áp dụng ưu đãi hạng thành viên nếu có.
7. Thu ngân xác nhận danh sách hàng và tổng tiền.
8. Khách thanh toán tiền mặt hoặc VietQR.
9. Chỉ sau thanh toán thành công, hóa đơn chuyển sang Đã thanh toán.
10. Các bản sách chuyển sang Đã bán và rời tồn kho khả dụng.
11. Hệ thống ghi doanh thu và cập nhật tổng chi tiêu hợp lệ của khách nếu có hồ sơ.
12. Hệ thống tạo hóa đơn/biên nhận và gửi thông báo Zalo khi phù hợp.

### 12.3. Hủy hóa đơn chưa thanh toán

Hóa đơn Nháp hoặc Chờ thanh toán có thể được hủy bởi người có quyền. Việc hủy phải giải phóng khóa tạm của các bản sách và không tạo doanh thu hoặc tổng chi tiêu.

### 12.4. Chính sách sau thanh toán

Sách cũ đã bán không được đổi trả hoặc hoàn tiền theo quy trình thông thường. Ngoại lệ duy nhất trong MVP là nhân viên quét nhầm barcode.

Luồng xử lý quét nhầm:

1. Yêu cầu được tạo trong vòng 24 giờ từ khi thanh toán.
2. Nhân viên ghi hóa đơn, bản sách bị quét nhầm và lý do.
3. Quản lý kiểm tra bản sách thực tế và giao dịch.
4. Quản lý phê duyệt hoặc từ chối.
5. Nếu phê duyệt, hệ thống tạo giao dịch đảo thay vì sửa/xóa hóa đơn gốc.
6. Doanh thu và tổng chi tiêu hợp lệ được điều chỉnh giảm.
7. Trạng thái bản sách được cập nhật theo kết quả kiểm tra thực tế.
8. Khoản tiền trả khách được ghi nhận và đối soát.
9. Toàn bộ quá trình được lưu nhật ký.

### 12.5. Ưu đãi bán sách

Theo dữ liệu cuộc họp, hạng Bạc được giảm 5% và hạng Vàng được giảm 10% trên hóa đơn bán; hạng Thường không giảm.

**[TBD - Unconfirmed]**: Xác nhận cuối cùng việc giữ các tỷ lệ giảm giá bán này trong MVP và quy tắc làm tròn số tiền giảm.

## 13. Cho thuê sách

### 13.1. Điều kiện khách hàng

Khách thuê bắt buộc có hồ sơ gồm họ tên và số điện thoại. Khi tổng giá trị các bản sách trên phiếu lớn hơn 1.000.000 VNĐ, hồ sơ phải có thêm CCCD và địa chỉ hiện tại.

Hệ thống chặn thuê mới nếu:

- Khách có ít nhất một phiếu Quá hạn.
- Khách còn nghĩa vụ chưa thanh toán từ giao dịch thuê trước.
- Số bản muốn thuê vượt hạn mức còn lại theo hạng.
- Có số điện thoại bị đánh dấu do vi phạm nghiêm trọng theo chính sách cửa hàng.

### 13.2. Hạn mức theo hạng

| Hạng    |                  Tổng chi tiêu hợp lệ | Số bản thuê tối đa đồng thời | Thời hạn tối đa mỗi phiếu |
| -------- | ----------------------------------------: | -----------------------------------: | ------------------------------: |
| Thường |                     Dưới 1.000.000 VNĐ |                                    3 |                        14 ngày |
| Bạc     | Từ 1.000.000 đến dưới 3.000.000 VNĐ |                                    5 |                        21 ngày |
| Vàng    |                        Từ 3.000.000 VNĐ |                                    8 |                        30 ngày |

Các ngưỡng và hạn mức phải có khả năng cấu hình.

### 13.3. Tiền cọc

- Tiền cọc của một bản bằng 100% giá bán thực tế của bản đó.
- Tổng tiền cọc phiếu bằng tổng tiền cọc của tất cả bản sách.
- Mọi hạng thành viên áp dụng cùng tỷ lệ cọc 100%.
- Ưu đãi thành viên không làm giảm tiền cọc.
- Khách phải thanh toán đủ tiền cọc trước khi nhận sách.

### 13.4. Luồng lập phiếu thuê

1. Thu ngân tìm hoặc tạo hồ sơ khách hàng.
2. Hệ thống kiểm tra trạng thái khách, phiếu quá hạn và nghĩa vụ chưa thanh toán.
3. Thu ngân quét barcode các bản khách muốn thuê.
4. Hệ thống xác nhận từng bản đang Khả dụng và khóa tạm.
5. Hệ thống xác định hạng hiện tại, hạn mức còn lại và thời hạn tối đa.
6. Thu ngân chọn hạn trả trong phạm vi được phép.
7. Hệ thống tính tổng giá trị bản sách và tiền cọc bằng 100% tổng giá trị đó.
8. Hệ thống hiển thị đơn giá thuê và công thức dự kiến; phí thuê chưa thu ở bước này.
9. Khách thanh toán đủ tiền cọc bằng tiền mặt hoặc VietQR.
10. Sau khi tiền cọc được xác nhận, phiếu chuyển sang Đang thuê.
11. Các bản sách chuyển sang Đang cho thuê.
12. Hệ thống tạo phiếu giao sách và gửi xác nhận qua Zalo.

### 13.5. Công thức phí thuê

Phí thuê được quyết toán sau khi khách trả sách:

`Phí thuê = Tổng (đơn giá thuê/ngày của từng bản × số ngày thuê thực tế) × (1 − tỷ lệ giảm theo hạng)`

Quy tắc:

- Thời gian được tính theo mỗi 24 giờ.
- Tối thiểu tính một ngày.
- Phần thời gian vượt quá một chu kỳ 24 giờ được làm tròn theo quy tắc cấu hình.
- Hạng dùng để giảm phí là hạng áp dụng cho giao dịch theo quy tắc được chốt.
- Đơn giá thuê và tỷ lệ giảm theo hạng là tham số cấu hình.

**[TBD - Unconfirmed]**:

- Đơn giá thuê cụ thể.
- Tỷ lệ giảm phí thuê của từng hạng.
- Hạng được cố định lúc lập phiếu hay lấy lại tại thời điểm trả.
- Quy tắc làm tròn tiền và phần ngày lẻ trước thời điểm quá hạn.

### 13.6. Gia hạn

Quy tắc đã có:

- Tối đa hai lần gia hạn.
- Mỗi lần không quá bảy ngày.
- Không có kiểm tra giữ chỗ vì hệ thống không hỗ trợ giữ chỗ.
- Phí gia hạn là phí thuê phát sinh trong thời gian gia hạn và được cộng vào số tiền quyết toán khi trả.

Luồng gia hạn tại quầy:

1. Nhân viên tra cứu phiếu đang thuê.
2. Hệ thống kiểm tra số lần gia hạn và điều kiện khách hàng.
3. Nhân viên nhập số ngày gia hạn.
4. Hệ thống kiểm tra giới hạn bảy ngày và tính hạn trả mới.
5. Nhân viên xác nhận.
6. Hệ thống lưu lịch sử gồm hạn cũ, hạn mới, số ngày, người thực hiện và thời điểm.
7. Hệ thống gửi thông báo hạn trả mới qua Zalo.

## 14. Trả sách và quyết toán phiếu thuê

### 14.1. Nguyên tắc trả toàn bộ

Nếu một phiếu có nhiều bản sách, khách bắt buộc trả toàn bộ các bản cùng một lần. Hệ thống không hỗ trợ trả từng phần trong MVP.

### 14.2. Luồng nhận trả

1. Nhân viên tra cứu phiếu bằng mã phiếu hoặc thông tin khách hàng.
2. Hệ thống hiển thị toàn bộ bản sách phải trả.
3. Nhân viên quét barcode từng bản.
4. Hệ thống từ chối barcode không thuộc phiếu.
5. Hệ thống chỉ cho chuyển sang quyết toán khi tất cả bản đã được quét hoặc được đánh dấu Mất theo quyền phù hợp.
6. Nhân viên kiểm tra tình trạng từng bản và ghi nhận mô tả.
7. Hệ thống tính phí thuê thực tế, phí gia hạn, phạt quá hạn và phạt hư hỏng.
8. Với bản mất, hệ thống giữ toàn bộ phần tiền cọc của bản đó.
9. Hệ thống tính tổng nghĩa vụ, số cọc được giữ lại và số cọc cần hoàn.
10. Nếu nghĩa vụ vượt phần cọc có thể dùng, khách thanh toán thêm.
11. Cửa hàng hoàn phần cọc còn lại bằng tiền mặt hoặc chuyển khoản.
12. Khi mọi khoản đã được xử lý, phiếu chuyển sang Đã hoàn tất.
13. Bản nguyên vẹn chuyển về Khả dụng; bản hư hỏng hoặc mất chuyển sang trạng thái tương ứng.
14. Hệ thống cập nhật tổng chi tiêu bằng phí thuê và phí gia hạn đã thanh toán, không cộng tiền phạt hoặc tiền cọc.
15. Hệ thống phát hành biên nhận và gửi thông báo Zalo.

### 14.3. Phạt quá hạn

- Có thời gian miễn phạt hai giờ sau hạn trả.
- Sau thời gian miễn phạt, số ngày trễ được làm tròn lên.
- Phạt mỗi ngày bằng 150% đơn giá thuê/ngày của bản sách.
- Tổng phạt quá hạn của một bản không vượt quá 100% giá trị bản đó.
- Tiền phạt được khấu trừ vào tiền cọc trước khi hoàn phần còn lại.

Công thức khái quát:

`Phạt quá hạn một bản = Min(Số ngày trễ làm tròn × Đơn giá thuê/ngày × 150%, Giá bán thực tế của bản)`

### 14.4. Sách hư hỏng

- Hệ thống có các mức hư hỏng được cấu hình theo tỷ lệ phần trăm giá trị bản sách.
- Nhân viên chọn mức phù hợp sau khi kiểm tra.
- Hệ thống tính tiền phạt theo tỷ lệ đã cấu hình.
- Phạt hư hỏng được khấu trừ vào tiền cọc.
- Mọi mức phạt ngoài khung phải được Quản lý phê duyệt và lưu lý do, giá trị cũ/mới.
- Trạng thái sau trả phụ thuộc mức hư hỏng: Khả dụng, Hư hỏng hoặc Thanh lý.

**[TBD - Unconfirmed]**: Danh sách mức hư hỏng, tỷ lệ của từng mức và tiêu chí chuyển trạng thái.

### 14.5. Sách bị mất

- Cửa hàng không hoàn tiền cọc của bản bị mất.
- Phần cọc bị giữ bằng 100% giá bán thực tế của bản đó.
- Không thu thêm một khoản bồi thường giá trị sách cho chính bản đã mất vì cọc đã bằng toàn bộ giá trị bản.
- Bản sách chuyển sang Thất lạc và không còn khả dụng.
- Với phiếu nhiều bản, việc giữ cọc được tính theo từng bản; cọc của các bản còn lại vẫn được quyết toán bình thường.

### 14.6. Hoàn cọc

- Hệ thống không gọi API ngân hàng để chủ động chuyển tiền hoàn.
- Hoàn tiền mặt phải ghi nhận khoản chi trong ca thu ngân.
- Hoàn chuyển khoản được nhân viên thực hiện bên ngoài hệ thống và nhập mã giao dịch để đối soát.
- Giao dịch hoàn phải liên kết với phiếu thuê và người thực hiện.
- Phiếu chỉ hoàn tất khi trạng thái hoàn tiền và mọi khoản phải thu đã được xác nhận.

**[TBD - Unconfirmed]**: Có bắt buộc hoàn theo đúng phương thức nộp cọc ban đầu hay cho phép đổi phương thức theo quyền phê duyệt.

## 15. Khách hàng và hạng thành viên

### 15.1. Hồ sơ khách hàng

Khách không có tài khoản đăng nhập. Hồ sơ tối thiểu gồm:

- Mã khách hàng.
- Họ tên.
- Số điện thoại.
- Email nếu có.
- Địa chỉ và CCCD khi nghiệp vụ yêu cầu.
- Trạng thái hoạt động/cảnh báo.
- Tổng chi tiêu hợp lệ.
- Hạng hiện tại.
- Lịch sử hạng.

### 15.2. Ngăn dữ liệu trùng

Khi tạo hồ sơ, hệ thống kiểm tra số điện thoại và các định danh phù hợp. Nếu tìm thấy hồ sơ có khả năng trùng, nhân viên phải chọn hồ sơ hiện có hoặc có quyền/lý do để tiếp tục tạo mới.

### 15.3. Lịch sử khách hàng

Hồ sơ phải tra cứu được:

- Hóa đơn mua sách.
- Phiếu thuê, gia hạn và trả sách.
- Lịch sử quá hạn, hư hỏng hoặc mất sách.
- Tiền phạt và nghĩa vụ chưa thanh toán.
- Các phiếu khách bán sách cho cửa hàng.
- Yêu cầu/báo cáo hỗ trợ cơ bản.
- Lịch sử thay đổi hạng.

### 15.4. Tự động tính hạng

Sau mỗi giao dịch làm thay đổi tổng chi tiêu hợp lệ:

1. Hệ thống tính lại tổng chi tiêu từ các khoản hợp lệ.
2. Hệ thống so sánh với ngưỡng hạng.
3. Nếu hạng thay đổi, hệ thống nâng hoặc hạ hạng tự động.
4. Hệ thống lưu hạng cũ, hạng mới, tổng chi tiêu tại thời điểm thay đổi, nguyên nhân và thời gian.

Giao dịch đảo do quét nhầm phải làm giảm tổng chi tiêu và có thể làm hạ hạng.

### 15.5. Điểm tích lũy

Điểm tích lũy chưa được vận hành trong MVP:

- Không cộng điểm.
- Không trừ hoặc đổi điểm.
- Không hiển thị số dư điểm như một quyền lợi đang có hiệu lực.
- Thiết kế có thể dự trù khả năng bổ sung sau này nhưng không được tạo nghĩa vụ quyền lợi cho khách.

## 16. Thanh toán và dòng tiền giao dịch

### 16.1. Phạm vi giao dịch

Hệ thống quản lý tối thiểu:

- Thu tiền bán sách.
- Thu tiền cọc.
- Thu phí thuê và gia hạn.
- Thu tiền phạt hoặc phần quyết toán thiếu.
- Chi tiền thu mua sách.
- Chi hoàn tiền cọc.
- Ghi nhận chi trả lương.
- Đảo giao dịch được phê duyệt.

### 16.2. Thanh toán tiền mặt

1. Hệ thống hiển thị số tiền phải thu hoặc chi.
2. Với khoản thu, nhân viên nhập số tiền khách đưa.
3. Hệ thống tính tiền thừa.
4. Nhân viên xác nhận đã nhận/chi tiền.
5. Giao dịch được liên kết với ca thu ngân đang mở.
6. Số dư lý thuyết của két được cập nhật.

Không được ghi nhận giao dịch tiền mặt nếu người thực hiện không có ca thu ngân hợp lệ, trừ ngoại lệ có quyền và nhật ký.

### 16.3. Thanh toán VietQR

1. Chứng từ nghiệp vụ tạo yêu cầu thanh toán với mã duy nhất.
2. Hệ thống sinh VietQR có đúng số tiền và nội dung chuyển khoản được mã hóa theo quy ước.
3. Mã QR có thời hạn 15 phút.
4. Khách quét và chuyển khoản.
5. Backend nhận webhook từ ngân hàng.
6. Hệ thống xác thực nguồn gửi, chữ ký/thông tin bảo mật và tính hợp lệ của payload.
7. Hệ thống đối chiếu mã tham chiếu, số tiền, tài khoản nhận và trạng thái giao dịch.
8. Nếu khớp, giao dịch được đánh dấu Thành công và chứng từ nghiệp vụ tiếp tục hoàn tất.
9. Nếu thiếu, sai hoặc không xác định được chứng từ, giao dịch chuyển sang trạng thái cần đối soát; không tự hoàn tất hóa đơn.

### 16.4. Xử lý webhook an toàn

- Mỗi sự kiện ngân hàng phải có định danh duy nhất.
- Webhook gửi lại không được tạo thanh toán trùng.
- Webhook đến sau khi QR hết hạn phải được lưu và đưa vào đối soát, không tự ý bỏ qua tiền thực nhận.
- Số tiền thiếu không làm chứng từ chuyển sang Đã thanh toán.
- Số tiền thừa phải được đưa vào xử lý đối soát.
- Payload gốc cần được lưu theo chính sách bảo mật để phục vụ tra soát.
- Một giao dịch thành công không được sửa trực tiếp.

**[TBD - Unconfirmed]**: Ngân hàng/nhà cung cấp VietQR, cơ chế ký webhook, thời gian retry và quy trình xử lý tiền chuyển sai.

### 16.5. Giao dịch chi

Đối với tiền thu mua, hoàn cọc và lương:

- Tiền mặt được ghi nhận trực tiếp vào ca thu ngân/két phù hợp.
- Chuyển khoản được thực hiện bên ngoài hệ thống.
- Nhân viên nhập mã giao dịch hoặc thông tin chứng từ.
- Hệ thống chỉ ghi nhận và đối soát; không gọi API ngân hàng để chuyển tiền.
- Khoản chi phải liên kết với phiếu thu mua, phiếu thuê hoặc bảng lương tương ứng.

### 16.6. Tính bất biến của giao dịch

Sau khi Thành công, giao dịch thanh toán bị đóng băng. Mọi sửa sai phải thực hiện bằng giao dịch đảo hoặc điều chỉnh được phê duyệt, giữ nguyên dữ liệu ban đầu và tạo đầy đủ nhật ký.
