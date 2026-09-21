# ĐẶC TẢ YÊU CẦU CHỨC NĂNG

## 1. Tổng quan

Hệ thống là webapp hỗ trợ vận hành một cửa hàng vật lý chuyên bán sách cũ và cho thuê truyện tranh. Hệ thống quản lý tập trung đầu sách, từng bản sách vật lý, tồn kho, giao dịch bán/thuê, khách hàng, nhân viên, thanh toán, thông báo và báo cáo.

Mọi giao dịch bán và cho thuê được nhân viên thực hiện tại cửa hàng. Hệ thống không cung cấp mua hàng, đặt trước hoặc giao hàng trực tuyến.

## 2. Phạm vi và đối tượng sử dụng

### 2.1. Đối tượng sử dụng

| Đối tượng | Phạm vi sử dụng |
| --- | --- |
| **Admin** | Có toàn quyền ngay từ khi khởi tạo hệ thống; quản lý tài khoản, vai trò, quyền hạn, cấu hình và nhật ký thao tác. Quyền của Admin không thể bị nhân viên thay đổi. |
| **Quản lý** | Quản lý nhân viên, ca làm, chấm công, bảng lương và các nghiệp vụ được Admin cấp quyền. |
| **Thu ngân** | Thực hiện nghiệp vụ bán sách, cho thuê, nhận trả sách và thanh toán theo quyền được cấp. |
| **Nhân viên kho** | Quản lý nhập kho, xuất kho, kiểm kê và điều chỉnh tồn kho theo quyền được cấp. |
| **Nhân viên** | Vai trò mặc định của tài khoản nhân viên mới; được xem hồ sơ cá nhân, ca làm, chấm công và thực hiện nghiệp vụ bán/thuê cơ bản. |
| **Khách hàng** | Có hồ sơ khách hàng trong hệ thống. Tài khoản đăng nhập là tùy chọn và chỉ được Admin hoặc nhân viên có quyền tạo. |

Các vai trò Quản lý, Thu ngân và Nhân viên kho là vai trò gợi ý ban đầu. Admin có thể tạo vai trò mới hoặc thay đổi quyền theo nhu cầu vận hành.

### 2.2. Nguyên tắc nghiệp vụ chung

- Hệ thống chỉ quản lý một cửa hàng vật lý.
- Thông tin sách được quản lý theo hai tầng: **đầu sách** và **bản sách vật lý**.
- Mỗi bản sách vật lý có mã riêng và có thể được bán hoặc cho thuê khi đang khả dụng.
- Bản sách đang được thuê bị khóa khỏi các giao dịch khác. Bản sách đã bán được ghi nhận là đã rời kho vĩnh viễn.
- Các nghiệp vụ nhạy cảm phải kiểm tra quyền trước khi thực hiện và lưu nhật ký thao tác.
- Các giao dịch bị hủy hoặc hoàn tiền không được tính vào tổng chi tiêu hợp lệ của khách hàng và doanh thu thuần.

## 3. Nhóm chức năng

### 3.1. Tài khoản và xác thực

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| AUTH-01 | Khởi tạo tài khoản Admin | Hệ thống có sẵn tài khoản Admin đầu tiên khi được khởi tạo. Tài khoản này có toàn quyền và không thể bị người dùng thông thường hạ quyền. |
| AUTH-02 | Đăng ký tài khoản nhân viên | Nhân viên được tự đăng ký bằng email thuộc domain nhân viên đã cấu hình. Hệ thống từ chối email không đúng domain. |
| AUTH-03 | Xác thực email nhân viên | Hệ thống gửi liên kết hoặc mã xác thực đến email đăng ký. Sau khi xác thực thành công, tài khoản được kích hoạt ngay và nhận vai trò mặc định đã cấu hình, không cần Admin phê duyệt. |
| AUTH-04 | Tạo tài khoản khách hàng | Khách hàng không được tự đăng ký. Admin hoặc nhân viên có quyền tạo tài khoản và liên kết tài khoản đó với một hồ sơ khách hàng hiện có. |
| AUTH-05 | Đăng nhập và đăng xuất | Người dùng đăng nhập bằng thông tin hợp lệ, sử dụng các chức năng theo quyền được cấp và có thể chủ động kết thúc phiên đăng nhập. Tài khoản bị khóa hoặc vô hiệu hóa không được đăng nhập. |
| AUTH-06 | Quản lý thông tin đăng nhập | Người dùng được đổi mật khẩu và cập nhật thông tin đăng nhập được phép. Hệ thống hỗ trợ quên/đặt lại mật khẩu qua email; Admin chỉ có thể yêu cầu đặt lại mật khẩu, không được xem mật khẩu của người dùng. |
| AUTH-07 | Quản lý trạng thái tài khoản | Admin được khóa, mở khóa hoặc vô hiệu hóa tài khoản. Việc thay đổi trạng thái tài khoản phải được lưu vào nhật ký thao tác. |

### 3.2. Phân quyền và quản trị hệ thống

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| ADM-01 | Quản lý vai trò | Admin được tạo, cập nhật và ngừng sử dụng vai trò; đồng thời có thể sử dụng các vai trò mẫu như Quản lý, Thu ngân và Nhân viên kho. |
| ADM-02 | Quản lý quyền hạn | Admin gán quyền chi tiết theo từng nhóm chức năng cho vai trò hoặc bổ sung quyền cho nhân viên cụ thể. Nhân viên chỉ được truy cập và thao tác trong phạm vi quyền đã cấp. |
| ADM-03 | Vai trò mặc định | Hệ thống cho phép cấu hình vai trò tự động gán cho nhân viên sau khi đăng ký. Vai trò mặc định ban đầu là Nhân viên và không có quyền quản lý phân quyền, lương, cấu hình, nhập/xuất kho, hoàn tiền hoặc báo cáo tài chính. |
| ADM-04 | Nhật ký thao tác | Hệ thống ghi nhận người thực hiện, hành động, đối tượng bị tác động, thời điểm và nội dung thay đổi đối với các thao tác quan trọng như thêm/sửa/xóa dữ liệu, nhập/xuất kho, thanh toán, hoàn tiền và thay đổi quyền. Người có quyền được tra cứu nhật ký theo thời gian, nhân viên và loại thao tác. |

### 3.3. Danh mục và sản phẩm sách

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| CAT-01 | Quản lý danh mục | Người có quyền được thêm, cập nhật, ngừng sử dụng hoặc xóa danh mục khi không phát sinh ràng buộc dữ liệu. Đầu sách có thể được gắn vào danh mục phù hợp để phục vụ tra cứu và báo cáo. |
| CAT-02 | Quản lý đầu sách | Hệ thống lưu thông tin chung của đầu sách như tên, mã/ISBN, tác giả, nhà xuất bản, năm xuất bản, mô tả và hình ảnh. Người có quyền được thêm, sửa, ngừng kinh doanh và tra cứu đầu sách. |
| CAT-03 | Cấu hình chính sách thuê theo đầu sách | Mỗi đầu sách có giá thuê theo ngày và thời hạn thuê mặc định. Các giá trị này được dùng khi lập phiếu thuê và có thể được điều chỉnh theo quyền hạn. |
| CAT-04 | Quản lý bản sách vật lý | Mỗi bản sách có mã hoặc barcode riêng, liên kết với một đầu sách và lưu tình trạng, giá nhập, giá bán cùng trạng thái hiện tại. Giá và mức độ hao mòn có thể khác nhau giữa các bản của cùng một đầu sách. |
| CAT-05 | Trạng thái bản sách | Hệ thống theo dõi tối thiểu các trạng thái: khả dụng, đang cho thuê, đã bán, hư hỏng, thất lạc, thanh lý và ngừng kinh doanh. Chỉ bản sách khả dụng mới được chọn để bán hoặc cho thuê. |
| CAT-06 | Tra cứu sản phẩm | Người dùng được tìm kiếm và lọc đầu sách/bản sách theo mã, tên, danh mục, tác giả, tình trạng, trạng thái và khả năng sẵn có. |

### 3.4. Nhà cung cấp và quản lý tồn kho

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| INV-01 | Quản lý nhà cung cấp | Người có quyền được thêm, cập nhật, ngừng hợp tác và tra cứu thông tin nhà cung cấp phục vụ nhập sách. |
| INV-02 | Lập phiếu nhập kho | Phiếu nhập lưu ngày nhập, nhà cung cấp, người lập, danh sách đầu sách/bản sách, số lượng, đơn giá và tổng chi phí. Khi phiếu được xác nhận, hệ thống tạo hoặc cập nhật các bản sách tương ứng trong kho. |
| INV-03 | Lập phiếu xuất kho | Việc đưa sách ra khỏi kho ngoài nghiệp vụ bán phải có phiếu xuất và lý do cụ thể như hư hỏng, thất lạc hoặc thanh lý. Phiếu xuất làm thay đổi trạng thái của từng bản sách liên quan. |
| INV-04 | Điều chỉnh và kiểm kê tồn kho | Người có quyền được ghi nhận kết quả kiểm kê và đề nghị điều chỉnh chênh lệch. Điều chỉnh phải có lý do, được người có quyền phê duyệt và lưu nhật ký trước khi cập nhật tồn kho. |
| INV-05 | Theo dõi biến động kho | Hệ thống lưu lịch sử nhập, xuất, bán, cho thuê, trả, điều chỉnh và thay đổi trạng thái của từng bản sách để có thể truy vết. |
| INV-06 | Kiểm soát ngưỡng tồn kho | Hệ thống so sánh số lượng khả dụng với ngưỡng tối thiểu/tối đa đã cấu hình. Khi tồn kho chạm hoặc thấp hơn mức tối thiểu, hệ thống tạo cảnh báo để người phụ trách xem xét nhập thêm. |

### 3.5. Bán sách và hoàn trả

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| SAL-01 | Lập hóa đơn bán sách | Nhân viên chọn khách hàng (nếu có) và một hoặc nhiều bản sách đang khả dụng để lập hóa đơn. Hệ thống lấy giá bán của từng bản sách, áp dụng quyền lợi hạng thành viên và tính tổng tiền. |
| SAL-02 | Hoàn tất bán sách | Hóa đơn chỉ hoàn tất sau khi thanh toán thành công. Các bản sách trên hóa đơn được chuyển sang trạng thái đã bán và rời khỏi tồn kho khả dụng vĩnh viễn. |
| SAL-03 | Hủy hóa đơn | Nhân viên có quyền được hủy hóa đơn trước khi hoàn tất thanh toán. Hóa đơn đã hoàn tất không được hủy trực tiếp mà phải đi qua quy trình trả hàng và hoàn tiền. |
| SAL-04 | Trả sách sau bán | Nhân viên lập yêu cầu trả hàng, ghi nhận lý do và tình trạng bản sách. Admin phê duyệt hoặc từ chối yêu cầu; bản sách được đưa lại kho chỉ khi còn đủ điều kiện kinh doanh. |
| SAL-05 | Hoàn tiền | Sau khi yêu cầu trả hàng được Admin duyệt, hệ thống ghi nhận giao dịch hoàn tiền theo phương thức phù hợp, điều chỉnh doanh thu và tổng chi tiêu của khách hàng. |
| SAL-06 | Tra cứu hóa đơn | Người có quyền được tìm kiếm hóa đơn theo mã, khách hàng, nhân viên, thời gian, trạng thái và phương thức thanh toán; đồng thời xem chi tiết lịch sử hủy, trả hàng hoặc hoàn tiền. |

### 3.6. Cho thuê, gia hạn và trả sách

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| REN-01 | Lập phiếu thuê | Nhân viên chọn khách hàng và một hoặc nhiều bản sách khả dụng. Phiếu thuê lưu ngày thuê, hạn trả, giá thuê theo ngày, tiền đặt cọc, ưu đãi thành viên và người lập phiếu. |
| REN-02 | Tính tiền thuê | Hệ thống tính tiền thuê dựa trên giá thuê theo ngày, thời gian thuê và ưu đãi của hạng thành viên. Mỗi đầu sách sử dụng thời hạn thuê mặc định trừ khi người có quyền điều chỉnh. |
| REN-03 | Khóa bản sách đang thuê | Khi phiếu thuê có hiệu lực, các bản sách được chuyển sang trạng thái đang cho thuê và không thể được bán, cho người khác thuê hoặc xuất kho cho đến khi được trả hoặc xử lý là mất. |
| REN-04 | Gia hạn thuê | Nhân viên được gia hạn phiếu thuê khi phiếu còn hiệu lực, bản sách không thuộc trường hợp bị khóa gia hạn và khách hàng đáp ứng điều kiện. Hệ thống cập nhật hạn trả và tiền thuê phát sinh. |
| REN-05 | Nhận trả sách | Nhân viên ghi nhận thời điểm trả và tình trạng thực tế của từng bản sách. Hệ thống cho phép xử lý toàn bộ hoặc từng phần phiếu thuê khi các bản được trả ở thời điểm khác nhau. |
| REN-06 | Tính và thu tiền phạt | Hệ thống tính phạt quá hạn theo số ngày trễ; nhân viên được ghi nhận khoản phạt do hư hỏng hoặc mất sách kèm lý do. Tiền đặt cọc được hoàn lại hoặc khấu trừ vào các khoản còn phải trả. |
| REN-07 | Hoàn tất phiếu thuê | Phiếu thuê được hoàn tất khi mọi bản sách và nghĩa vụ thanh toán đã được xử lý. Bản còn đủ điều kiện được chuyển về khả dụng; bản hư hỏng hoặc mất được chuyển sang trạng thái tương ứng. |
| REN-08 | Quản lý danh sách phiếu thuê | Người có quyền được tra cứu phiếu theo khách hàng, bản sách, nhân viên, thời gian và trạng thái như đang thuê, sắp đến hạn, quá hạn, trả một phần hoặc đã hoàn tất. |

### 3.7. Khách hàng và hạng thành viên

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| CUS-01 | Quản lý hồ sơ khách hàng | Nhân viên có quyền được thêm, cập nhật và tra cứu hồ sơ gồm thông tin nhận diện, liên hệ, trạng thái và tài khoản liên kết nếu có. Hệ thống hạn chế tạo hồ sơ trùng dựa trên thông tin liên hệ hoặc mã khách hàng. |
| CUS-02 | Tra cứu lịch sử khách hàng | Hệ thống tổng hợp lịch sử mua, thuê, trả, quá hạn, tiền phạt, hoàn tiền và yêu cầu hỗ trợ để nhân viên phục vụ khách hàng. |
| CUS-03 | Quản lý hạng thành viên | Admin cấu hình các hạng cùng ngưỡng chi tiêu và quyền lợi như giảm giá bán/thuê, số bản được thuê tối đa hoặc số ngày thuê thêm. Hạng được Admin/nhân viên có quyền gán thủ công, không tự động thay đổi. |
| CUS-04 | Theo dõi tổng chi tiêu | Hệ thống tính tổng số tiền hợp lệ khách đã thanh toán từ giao dịch hoàn tất, sau khi loại trừ giao dịch bị hủy hoặc số tiền đã hoàn. Giá trị này hỗ trợ người dùng quyết định gán hạng thành viên. |
| CUS-05 | Không sử dụng điểm tích lũy | Hệ thống không phát hành, cộng, trừ hoặc quy đổi điểm. Mọi quyền lợi thành viên dựa trên hạng được gán và ngưỡng chi tiêu. |

### 3.8. Dịch vụ và hỗ trợ khách hàng

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| SUP-01 | Tạo yêu cầu hỗ trợ | Nhân viên được tạo yêu cầu thay khách hàng; khách có tài khoản được gửi yêu cầu của chính mình. Yêu cầu phải liên kết với hồ sơ khách hàng và có loại, nội dung, thời điểm cùng mức ưu tiên. |
| SUP-02 | Phân loại yêu cầu | Hệ thống hỗ trợ tối thiểu các loại: khiếu nại, đổi/trả sách, báo mất/hỏng và yêu cầu tìm sách. Yêu cầu gia hạn thuê được xử lý tại phiếu thuê, không thuộc module hỗ trợ. |
| SUP-03 | Phân công và xử lý | Người có quyền phân công nhân viên phụ trách, cập nhật trao đổi, kết quả và trạng thái như mới, đang xử lý, chờ khách hàng, đã giải quyết hoặc đã đóng. |
| SUP-04 | Theo dõi lịch sử hỗ trợ | Hệ thống lưu toàn bộ quá trình xử lý, người thực hiện và thời điểm thay đổi để phục vụ tra cứu và giải quyết khiếu nại. |

### 3.9. Nhân viên, ca làm và chấm công

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| EMP-01 | Quản lý hồ sơ nhân viên | Người có quyền được thêm, cập nhật, tra cứu và thay đổi trạng thái làm việc của nhân viên. Hồ sơ nhân viên được liên kết với tài khoản đăng nhập tương ứng. |
| EMP-02 | Quản lý ca làm | Quản lý được tạo ca, quy định thời gian bắt đầu/kết thúc và phân công nhân viên; đồng thời tra cứu lịch làm theo ngày, tuần hoặc nhân viên. |
| EMP-03 | Chấm công vào/ra | Nhân viên ghi nhận thời điểm bắt đầu và kết thúc ca trên hệ thống. Hệ thống đối chiếu với lịch làm để xác định giờ làm thực tế, đi muộn, về sớm và tăng ca. |
| EMP-04 | Hiệu chỉnh chấm công | Người có quyền được sửa dữ liệu chấm công khi có sai sót nhưng phải ghi lý do. Dữ liệu trước và sau hiệu chỉnh cùng người thực hiện được lưu trong nhật ký. |
| EMP-05 | Tổng hợp công | Hệ thống tổng hợp số ca, tổng giờ làm, giờ tăng ca, thời gian đi muộn và về sớm theo kỳ lương để làm đầu vào tính lương. |

### 3.10. Quản lý lương

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| PAYR-01 | Cấu hình hình thức lương | Mỗi nhân viên được áp dụng lương tháng cố định hoặc lương theo giờ. Hồ sơ lương lưu mức lương cơ bản và các quy tắc liên quan trong phạm vi quyền hạn. |
| PAYR-02 | Tính bảng lương | Hệ thống lập bảng lương theo kỳ dựa trên hình thức lương, dữ liệu chấm công, tăng ca, phụ cấp và khấu trừ. Người có quyền có thể bổ sung điều chỉnh kèm lý do. |
| PAYR-03 | Duyệt và chốt lương | Admin hoặc Quản lý có quyền được kiểm tra, duyệt và chốt bảng lương. Bảng lương đã chốt không được sửa trực tiếp nếu chưa mở lại theo đúng quyền hạn và lưu nhật ký. |
| PAYR-04 | Ghi nhận thanh toán lương | Hệ thống chỉ ghi nhận trạng thái chưa thanh toán/đã thanh toán và ngày thanh toán; không thực hiện chuyển tiền lương thực tế. |

### 3.11. Thanh toán

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| PMT-01 | Thanh toán tiền mặt | Nhân viên ghi nhận số tiền khách đưa, số tiền phải trả và tiền thừa đối với hóa đơn bán, phiếu thuê, tiền cọc hoặc tiền phạt. |
| PMT-02 | Thanh toán ngân hàng | Hệ thống hỗ trợ ghi nhận thanh toán chuyển khoản ở mức mô phỏng, gồm số tiền, mã tham chiếu và trạng thái giao dịch; không yêu cầu tích hợp ngân hàng hoặc xử lý tiền thật. |
| PMT-03 | Quản lý giao dịch thanh toán | Mỗi khoản thu/hoàn tiền phải liên kết với chứng từ nghiệp vụ tương ứng, lưu phương thức, số tiền, người thực hiện, thời điểm và trạng thái để đối soát. |
| PMT-04 | Xác nhận kết quả thanh toán | Chứng từ chỉ được đánh dấu đã thanh toán khi giao dịch thành công. Thanh toán thất bại hoặc bị hủy không làm thay đổi trạng thái cuối của sách và không được tính vào doanh thu. |

### 3.12. Thông báo

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| NOT-01 | Kênh thông báo | Hệ thống gửi thông báo qua email và Firebase Cloud Messaging đến trình duyệt hoặc thiết bị đã đăng ký của người nhận. |
| NOT-02 | Cảnh báo tồn kho | Hệ thống gửi cảnh báo cho người phụ trách khi số lượng khả dụng chạm hoặc thấp hơn ngưỡng tồn kho tối thiểu, hoặc khi phát hiện chênh lệch/hao hụt qua kiểm kê. |
| NOT-03 | Xác nhận thanh toán | Sau khi thanh toán thành công, hệ thống gửi thông báo xác nhận đến khách hàng có thông tin liên hệ phù hợp. |
| NOT-04 | Nhắc hạn và quá hạn | Hệ thống gửi thông báo khi phiếu thuê sắp đến hạn hoặc đã quá hạn; đồng thời thông báo cho nhân viên phụ trách để theo dõi. |
| NOT-05 | Theo dõi trạng thái thông báo | Hệ thống lưu người nhận, nội dung, kênh, thời điểm, trạng thái gửi và trạng thái đọc (khi kênh hỗ trợ) để tra cứu và gửi lại khi cần. |

### 3.13. Báo cáo và thống kê

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| RPT-01 | Báo cáo bán sách | Thống kê số lượng và doanh thu bán theo đầu sách, danh mục và khoảng thời gian; xác định sách bán chạy và sách ít phát sinh giao dịch. |
| RPT-02 | Báo cáo cho thuê | Thống kê lượt thuê, doanh thu thuê, tình trạng trả và quá hạn; xác định sách được thuê nhiều/ít nhất theo kỳ. |
| RPT-03 | Báo cáo tồn kho | Thống kê số lượng theo trạng thái, sách tồn lâu, tồn dưới ngưỡng, hư hỏng, thất lạc và chênh lệch kiểm kê. |
| RPT-04 | Báo cáo doanh thu | Tổng hợp doanh thu bán sách, tiền thuê, tiền phạt và các khoản thu khác; khấu trừ khoản hoàn tiền để thể hiện doanh thu thuần theo kỳ. |
| RPT-05 | Báo cáo chi phí | Tổng hợp chi phí nhập sách và chi phí nhân sự theo khoảng thời gian, phục vụ so sánh với doanh thu. |
| RPT-06 | Lọc và tra cứu báo cáo | Người có quyền được lọc báo cáo theo khoảng thời gian và các tiêu chí nghiệp vụ liên quan. Quyền xem dữ liệu tài chính được kiểm soát riêng. |
| RPT-07 | Xuất báo cáo Excel | Hệ thống cho phép xuất dữ liệu báo cáo đã lọc sang tệp Excel, kèm tên báo cáo, khoảng thời gian và thời điểm xuất. |

### 3.14. Cấu hình hệ thống

| Mã | Chức năng | Mô tả về chức năng |
| --- | --- | --- |
| CFG-01 | Cấu hình tiền tệ | Admin chọn đơn vị tiền tệ dùng thống nhất khi hiển thị giá, thanh toán, lương và báo cáo. |
| CFG-02 | Cấu hình domain nhân viên | Admin thiết lập domain email được phép dùng để tự đăng ký tài khoản nhân viên. Thay đổi cấu hình chỉ áp dụng cho các lần đăng ký mới và phải được ghi nhật ký. |
| CFG-03 | Cấu hình vai trò mặc định | Admin chọn vai trò được tự động gán cho tài khoản nhân viên mới sau khi xác thực email. |
| CFG-04 | Cấu hình số lượng nhập | Admin thiết lập số lượng nhập tối thiểu và tối đa dùng để kiểm tra, cảnh báo khi lập phiếu nhập. |
| CFG-05 | Cấu hình ngưỡng tồn kho | Admin thiết lập ngưỡng tồn tối thiểu áp dụng mặc định và có thể điều chỉnh cho từng đầu sách. Ngưỡng này là cơ sở tạo cảnh báo nhập hàng. |
| CFG-06 | Cấu hình chính sách thành viên | Admin quản lý tên hạng, ngưỡng chi tiêu và quyền lợi của từng hạng. Việc thay đổi chính sách không tự động đổi hạng đã gán cho khách hàng. |

## 4. Quy tắc trạng thái chính

### 4.1. Vòng đời bản sách

`Khả dụng` → `Đang cho thuê` → `Khả dụng/Hư hỏng/Thất lạc`

`Khả dụng` → `Đã bán`

`Khả dụng/Hư hỏng` → `Thanh lý/Ngừng kinh doanh`

- Bản sách đã bán, thanh lý hoặc thất lạc không được dùng cho giao dịch mới.
- Việc đưa bản sách đã trả lại vào kho phụ thuộc vào kết quả kiểm tra tình trạng.
- Mọi thay đổi trạng thái ngoài quy trình bán/thuê thông thường phải có lý do và quyền phù hợp.

### 4.2. Vòng đời giao dịch

- Hóa đơn bán: `Nháp/Chờ thanh toán` → `Đã thanh toán` hoặc `Đã hủy`; hóa đơn đã thanh toán có thể phát sinh `Yêu cầu trả hàng` → `Đã hoàn tiền/Từ chối`.
- Phiếu thuê: `Đang thuê` → `Trả một phần/Sắp đến hạn/Quá hạn` → `Đã hoàn tất`.
- Phiếu hỗ trợ: `Mới` → `Đang xử lý/Chờ khách hàng` → `Đã giải quyết` → `Đã đóng`.
- Bảng lương: `Nháp` → `Chờ duyệt` → `Đã chốt` → `Đã thanh toán`.
