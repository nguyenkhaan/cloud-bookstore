# PHẦN 1: TỔNG QUAN NGHIỆP VỤ & XÁC ĐỊNH PHẠM VI

## 1. Bản chất nghiệp vụ
- Dịch vụ cho thuê truyện/sách: Là mô hình kinh doanh dịch vụ xoay vòng tài sản. Cửa hàng giao tài sản (truyện, sách) cho khách hàng sử dụng trong một khoảng thời gian xác định dựa trên cam kết bảo toàn tài sản (tiền đặt cọc). Khách hàng trả phí thuê theo thời gian/lượt đọc; phát sinh chi phí phạt nếu vi phạm thời hạn hoặc làm suy giảm giá trị tài sản.
- Kinh doanh sách cũ: Là hoạt động thương mại bán lẻ hàng đã qua sử dụng (second-hand). Cửa hàng nhập sách từ nguồn thu gom cá nhân hoặc xả kho, thẩm định chất lượng, định giá lại theo độ mới/độ hiếm và bán đứt cho người mua.

## 2. Các mô hình thực tế
Nhóm đã cân nhắc đến một số mô hình hệ thống có tính ứng dụng cao giải quyết nhu cầu bài toán và có tính khả thi:

### 2.1. Mô hình cốt lõi: Cửa hàng truyền thống độc lập
Đây là mô hình nền tảng và là trọng tâm triển khai chính (MVP) của đề tài. Cửa hàng chỉ vận hành tại một mặt bằng duy nhất, tập trung vào hai nghiệp vụ chính: cho thuê truyện và mua bán sách cũ.

#### 2.1.1. Đặc điểm nổi bật:
- Vận hành tại một điểm vật lý cố định (thường gần trường học, ký túc xá, khu dân cư đông đúc).
- Diện tích vừa và nhỏ; toàn bộ giao dịch cho thuê, trả sách, thanh toán, nhập xuất kho đều diễn ra trực tiếp tại quầy thu ngân (POS).
- Tốc độ luân chuyển dòng tiền và xoay vòng truyện diễn ra nhanh chóng theo ngày.

#### 2.1.2. Khách hàng tiềm năng:
- Học sinh, sinh viên, người dân sinh sống hoặc làm việc trong bán kính 1 – 3 km.
- Độc giả vãng lai yêu thích văn hóa đọc truyện tranh/sách giấy truyền thống, người có nhu cầu săn tìm sách/truyện cũ giá rẻ.

#### 2.1.3. Khả năng tiếp cận khách hàng:
- Bị giới hạn về mặt địa lý; phụ thuộc hoàn toàn vào vị trí mặt bằng và lưu lượng người qua lại.
- Tương tác chủ yếu qua sự quen mặt (khách quen) hoặc bảng hiệu vật lý tại cửa hàng.

#### 2.1.4. Nền tảng đề xuất:
- Hệ thống Web App nội bộ (POS & Management Dashboard): Dành riêng cho Chủ cửa hàng, Quản lý và Thu ngân/Thủ kho thao tác trực tiếp tại quầy.
- Web Portal tra cứu cơ bản: Độc giả có thể kiểm tra danh mục đầu sách, tra cứu tình trạng còn/hết trên kệ trước khi đến tiệm. Không làm App di động độc lập để tránh tốn kém chi phí bảo trì và rào cản cài đặt app đối với khách vãng lai.

#### 2.1.5. Phạm vi tính năng hệ thống chi tiết:
- Xác thực & Tài khoản (Authentication): Đăng ký tài khoản, đăng xuất, xác thực email, đổi mật khẩu và cập nhật thông tin cá nhân.
- Quản lý sản phẩm & Bản sách: Thêm/sửa/xóa thông tin chi tiết từng đầu sách; nhập/xuất số lượng tồn kho theo từng bản sao vật lý (Copy).
- Nghiệp vụ cho thuê sách: Lập và quản lý phiếu thuê, ghi nhận trả sách, tính phí phạt trễ hạn hoặc đền bù hư hỏng.
- Mua bán sách cũ: Bán sách cũ cho khách lẻ; thu mua sách cũ từ doanh nghiệp/cá nhân (theo kiện sỉ hoặc mua lẻ) và định giá nhập.
- Quản lý khách hàng: Lưu trữ hồ sơ, thêm/cập nhật thông tin, tra cứu lịch sử giao dịch và xếp hạng thành viên (tích điểm/ưu đãi cọc).
- Quản lý nhân viên & Ca làm: Quản lý hồ sơ nhân viên, phân công ca làm, chấm công hằng ngày và tính lương.
- Quản lý danh mục: Thêm/sửa/xóa thể loại, danh mục; phân loại sách/truyện theo danh mục.
- Thanh toán: Hỗ trợ thanh toán tiền mặt (tính tiền thối tự động) và chuyển khoản ngân hàng qua mã QR động.
- Thông báo hệ thống: Cảnh báo chạm ngưỡng tồn kho tối thiểu, thông báo thanh toán thành công và cảnh báo quá hạn trả sách.
- Báo cáo & Thống kê: Báo cáo sách bán chạy, phân tích tần suất thuê/bán, danh sách sách tồn kho lâu ngày không phát sinh giao dịch; thống kê chi phí (nhập hàng, nhân sự), doanh thu và hỗ trợ xuất file Excel.
- Cấu hình hệ thống: Thiết lập đơn vị tiền tệ, số lượng nhập tối đa/tối thiểu, cài đặt ngưỡng tồn kho tối thiểu để cảnh báo nhập hàng.
- Phân quyền & Quản trị cấp cao (Admin): Tài khoản toàn quyền thiết lập hệ thống, phân quyền chức năng theo vai trò và tra cứu lịch sử thao tác của nhân viên (Audit Log).

#### 2.1.6. Ưu điểm:
- Quy trình tinh gọn, chi phí đầu tư ban đầu thấp, dễ kiểm soát nhân sự tại một điểm.
- Tập trung giải quyết triệt để bài toán vòng đời bản sao sách (mượn - trả - phạt - thanh lý).

#### 2.1.7. Nhược điểm:
- Quy mô doanh thu bị giới hạn bởi không gian lưu trữ và tệp khách địa phương.
- Nếu không có phần mềm hỗ trợ, cửa hàng dễ thất thoát sách và nhầm lẫn tiền phạt/tiền cọc.

#### 2.1.8. Vấn đề ngoài hệ thống đi kèm:
- Mã định danh vật lý: Bắt buộc trang bị máy in mã vạch/QR để dán nhãn duy nhất cho từng bản sao (Copy ID) và máy quét barcode tại quầy.
- Bảo quản sách: Cần quy trình bọc nilon (bọc bao kiếng), phân loại độ mới/cũ và vệ sinh kệ sách định kỳ để tránh ẩm mốc.

### 2.2. Hướng mở rộng 1: Nhà sách tích hợp dịch vụ
Giữ nguyên quy mô một cửa hàng vật lý duy nhất, nhưng mở rộng phạm vi kinh doanh để đa dạng hóa nguồn thu và tăng trải nghiệm giữ chân khách hàng tại chỗ.

#### 2.2.1. Đặc điểm nổi bật:
- Thoát khỏi mô hình cho thuê thuần túy; tích hợp thêm các dịch vụ bổ trợ: bán văn phòng phẩm, phụ kiện, quà lưu niệm, kết hợp quầy pha chế đồ uống (F&B nhẹ) hoặc không gian đọc tại chỗ.

#### 2.2.2. Khách hàng tiềm năng:
- Độc giả có nhu cầu ngồi lại không gian yên tĩnh để học tập, làm việc; nhóm bạn bè cần không gian giao lưu giải trí nhẹ nhàng; khách mua quà tặng hoặc dụng cụ học tập.

#### 2.2.3. Khả năng tiếp cận khách hàng:
- Cao hơn mô hình truyền thống nhờ thu hút thêm tệp khách hàng F&B; tăng độ phủ sóng trên mạng xã hội nhờ không gian bài trí (check-in).

#### 2.2.4. Phát sinh về mặt hệ thống:
- Quản lý mặt hàng không phải sách: Quản lý tồn kho văn phòng phẩm, định lượng nguyên vật liệu pha chế đồ uống.
- Hóa đơn phức hợp: Hỗ trợ gộp chung hóa đơn thuê sách, mua văn phòng phẩm và gọi nước uống vào một lần thanh toán.
- Quản lý thẻ thành viên trả trước: Khách có thể nạp tiền trước vào tài khoản thành viên để trừ dần khi gọi nước hoặc thuê truyện. Xét giảm giá cho thẻ thành viên.
- Hệ thống khuyến mãi: Cửa hàng có khả năng thiết lập và thông báo các chương trình khuyến mãi, ưu đãi cộng đồng / ưu đãi riêng cho thành viên.

#### 2.2.5. Ưu điểm:
- Tăng đáng kể giá trị trung bình trên mỗi đơn hàng và biên lợi nhuận từ mảng F&B/văn phòng phẩm.

#### 2.2.6. Nhược điểm & Thách thức:
- Nhân viên phải phụ trách đa nhiệm (vừa cho thuê sách vừa bán nước/hàng phụ trợ), dễ gây tắc nghẽn quầy thu ngân vào giờ cao điểm.
- Phát sinh nghiệp vụ quản lý nguyên vật liệu có hạn sử dụng ngắn (đối với F&B).

### 2.3. Hướng mở rộng 2: Quản lý chuỗi hệ thống cửa hàng
Phát triển từ Hướng mở rộng 1 nhưng mở rộng về quy mô tổ chức: Từ 2 chi nhánh trở lên, hoạt động theo cơ chế quản trị tập trung.

#### 2.3.1. Đặc điểm nổi bật:
- Hệ thống nhiều cửa hàng phân bổ ở các quận/khu vực khác nhau; có kho tổng trung tâm hoặc luân chuyển nội bộ giữa các chi nhánh.

#### 2.3.2. Khách hàng tiềm năng:
- Khách hàng trung thành với thương hiệu, có nhu cầu di chuyển linh hoạt (ví dụ: thuê sách ở chi nhánh gần trường học nhưng muốn trả sách ở chi nhánh gần nhà).

#### 2.3.3. Khả năng tiếp cận khách hàng:
- Rộng mở, nhận diện thương hiệu mạnh mẽ trên toàn thành phố; chạy các chiến dịch marketing diện rộng.

#### 2.3.4. Phát sinh về mặt hệ thống:
- Quản trị kho tập trung & Điều chuyển: Quản lý tồn kho từng chi nhánh, lập phiếu xuất/nhập điều chuyển sách giữa các kho.
- Nghiệp vụ thuê/trả liên chi nhánh: Cho phép khách thuê tại Chi nhánh A và trả tại Chi nhánh B (hệ thống tự động cấn trừ công nợ và cập nhật trạng thái kho giữa 2 bên).
- Phân quyền nâng cao: Phân quyền Quản lý chi nhánh (chỉ xem dữ liệu của cửa hàng mình) và Quản trị cấp cao (xem tổng hợp toàn chuỗi).

#### 2.3.5. Ưu điểm:
- Tận dụng tối đa nguồn tài nguyên sách; quy mô dữ liệu khách hàng lớn giúp tối ưu chính sách khách hàng thân thiết toàn hệ thống.

#### 2.3.6. Nhược điểm & Thách thức:
- Kiến trúc phần mềm phức tạp hơn nhiều (xử lý đồng bộ dữ liệu thời gian thực, tranh chấp tài nguyên tồn kho).
- Chi phí vận hành, chi phí logistics nội bộ (xe chở sách luân chuyển định kỳ) và quản lý thất thoát rất tốn kém.

### 2.4. Hướng mở rộng 3: Sàn thuê sách trực tuyến
Chuyển đổi toàn diện sang mô hình thương mại điện tử: Xây dựng nền tảng số kết nối giữa người đọc với kho sách của hệ thống (hoặc mở rộng cho các cửa hàng khác cùng tham gia ký gửi).

#### 2.4.1. Đặc điểm nổi bật:
- Không gian số hóa 100%; phục vụ mô hình kho lưu trữ (Warehouse) kết hợp giao nhận tận nơi.
- Áp dụng thêm hình thức thuê bao định kỳ (Subscription: trả phí tháng/quý để đọc truyện không giới hạn lượt mượn).

#### 2.4.2. Khách hàng tiềm năng:
- Người bận rộn không có thời gian đến cửa hàng vật lý, dân văn phòng, phụ huynh thuê sách cho con; độc giả ở các tỉnh/thành phố xa muốn thuê các bộ truyện hiếm.

#### 2.4.3. Khả năng tiếp cận khách hàng:
- Xóa bỏ hoàn toàn rào cản địa lý trên toàn quốc; tiếp cận khách hàng qua tiếp thị số, SEO và mạng xã hội.

#### 2.4.4. Phát sinh về mặt hệ thống:
- Ứng dụng đa kênh cho khách hàng (Mobile App / E-commerce Web): Cho phép tạo tài khoản, nạp ví điện tử, chọn gói thuê, theo dõi trạng thái đơn hàng.
- Tích hợp Logistics & Cổng thanh toán: Tự động đẩy đơn qua API của các đơn vị vận chuyển (GHN, GHTK, Viettel Post) và tích hợp cổng thanh toán trực tuyến (VNPay, Momo, ZaloPay).

#### 2.4.5. Ưu điểm:
- Khả năng mở rộng quy mô không giới hạn; không tốn chi phí thuê mặt bằng kinh doanh tại các vị trí đắc địa.

#### 2.4.6. Nhược điểm & Thách thức:
- Chi phí logistics 2 chiều (giao đi và thu hồi sách về) chiếm tỷ trọng lớn trong giá thành.
- Nguy cơ rủi ro cao về thất thoát tài sản (khách thuê không trả, chuyển nơi ở) và sách bị hư hại trong quá trình đơn vị vận chuyển giao hàng.

### 2.5. Hướng mở rộng 4: Nền tảng SaaS quản lý bán hàng & cho thuê đa cửa hàng (B2B)
B2B (Business-to-Business) – Cung cấp phần mềm dưới dạng dịch vụ thuê bao (Subscription hàng tháng/hàng năm)

#### 2.5.1. Đặc điểm nổi bật:
- Kiến trúc đa khách thuê: Hệ thống dùng chung một nền tảng hạ tầng nhưng cô lập dữ liệu tuyệt đối giữa các cửa hàng. Mỗi cửa hàng đăng ký sẽ được định danh riêng biệt (qua một slug hoặc custom subdomain).
- Khả năng module hóa: Cung cấp hệ sinh thái tính năng cốt lõi ở gói tiêu chuẩn (thuê truyện, bán sách cũ), và cho phép bật/tắt (toggle) hoặc trả thêm phí để mở rộng thêm các tính năng nâng cao (ví dụ: tạo kho mặt hàng phi sách, quản lý F&B, chấm công nhân sự nâng cao).

#### 2.5.2. Khách hàng tiềm năng:
- Các chủ cửa hàng truyện tranh, tiệm sách cũ độc lập trên toàn quốc muốn số hóa quy trình nhưng không có chi phí/khả năng tự thuê đội ngũ lập trình riêng.
- Các cửa hàng dịch vụ hỗn hợp (vừa cho thuê đồ/truyện, vừa bán đồ chơi, văn phòng phẩm, boardgame).

#### 2.5.3. Khả năng tiếp cận khách hàng:
- Tiếp cận qua kênh tiếp thị số B2B (Google Search, hội nhóm cộng đồng chủ tiệm sách/kinh doanh truyện, quảng cáo hướng đối tượng).
- Cung cấp gói dùng thử (Freemium / Free-trial 14 ngày) để thu hút người dùng đăng ký trải nghiệm trực tiếp trên web.

#### 2.5.4. Phát sinh về mặt hệ thống:
- Super Admin Portal (Dành cho Admin gốc của hệ thống): Quản lý danh sách các cửa hàng, quản lý gói cước dịch vụ, duyệt yêu cầu mở rộng tính năng, theo dõi doanh thu thanh toán thuê bao phần mềm.
- Tenant Admin Portal:
  - Cung cấp trang cài đặt bật/tắt module linh hoạt (Feature Toggles).
  - Cho phép tự cấu hình kho mở rộng: Khởi tạo các nhóm mặt hàng tùy ý (Attributes động: tên mặt hàng, đơn vị tính, hạn sử dụng, biến thể...) ngoài sách/truyện.
- Tenant POS & Web Tra cứu: Giao diện thao tác bán hàng/thuê truyện được gắn thương hiệu, logo và dữ liệu riêng của từng cửa hàng.

#### 2.5.5. Ưu điểm:
- Mở rộng kinh doanh không giới hạn (High Scalability): Nhóm không cần trực tiếp vận hành cửa hàng, không cần lo lắng về việc mất sách, hư hỏng truyện hay kho vận ngoài đời thực.
- Doanh thu định kỳ bền vững (Recurring Revenue): Nguồn thu đến từ tiền duy trì dịch vụ định kỳ (MRR/ARR) và phí nâng cấp module chức năng từ nhiều cửa hàng.
- Tái sử dụng mã nguồn tối đa: Một lần bảo trì, cập nhật tính năng mới thì toàn bộ các cửa hàng đều được hưởng lợi.

#### 2.5.6. Nhược điểm & Thách thức:
- Độ phức tạp kỹ thuật rất cao:
  - Bảo mật & Phân lập dữ liệu: Phải thiết kế cơ sở dữ liệu cực kỳ cẩn thận (dùng chung DB có cột Store_ID/Tenant_ID hay tách riêng từng Schema/Database) để tránh tuyệt đối việc Cửa hàng A vô tình xem được doanh thu hay thông tin khách hàng của Cửa hàng B.
  - Kiến trúc cơ sở dữ liệu động: Việc cho phép cửa hàng tự tạo kho lưu các mặt hàng phi sách khác đòi hỏi thiết kế CSDL linh hoạt (dùng JSON column, NoSQL hoặc mô hình Entity-Attribute-Value - EAV).
- Dịch vụ hỗ trợ khách hàng: Phải duy trì đội ngũ hướng dẫn sử dụng, giải quyết sự cố kỹ thuật và đào tạo người dùng mới thường xuyên.

#### 2.5.7. Vấn đề ngoài hệ thống đi kèm
- Hạ tầng Cloud: Chi phí thuê máy chủ (Server/Cloud), dịch vụ sao lưu dữ liệu tự động (Auto-backup) và đảm bảo thời gian hoạt động ổn định (SLA 99.9%).
- Pháp lý & Điều khoản dịch vụ (Terms of Service - ToS): Quy định rõ ràng về quyền sở hữu dữ liệu (Dữ liệu giao dịch là của chủ tiệm, nhóm cung cấp nền tảng không được làm lộ hay chiếm đoạt) và chính sách hoàn tiền/bồi thường khi hệ thống gặp sự cố mạng.

#### Nội dung 
Nhóm quyết định chọn Mô hình 2.1 (Cửa hàng truyền thống độc lập) làm phạm vi cốt lõi (MVP - Sản phẩm khả dụng tối thiểu) để triển khai. Đồng thời, kiến trúc hệ thống và cơ sở dữ liệu sẽ được thiết kế mở để sẵn sàng tích hợp Mô hình 2.2 (Nhà sách tích hợp dịch vụ F&B, văn phòng phẩm) trong các giai đoạn phát triển tiếp theo.
- Khảo sát thực tiễn:
    + **Backend**: Sử dụng framework .NET Core để xây dựng RESTful API đảm bảo hiệu năng và tính bảo mật.
    + **Frontend**: Sử dụng ReactJS phát triển 2 phân hệ: POS & Management Dashboard (cho nhân viên/quản lý) và Web Portal (cho độc giả tra cứu) 
- Thời gian dự án: Dự án được thực hiện trong khoảng thời gian tối đa là 13 - 14 tuần. Quá trình phát triển áp dụng phương pháp tiếp cận hướng đặc tả (Spec-Driven Development) kết hợp Agile, chia làm 6 giai đoạn cụ thể: từ khâu phân tích nghiệp vụ, phát triển các module (Nền tảng, Khách hàng, Nhân sự, Báo cáo) cho đến kiểm thử tổng thể (UAT).

---

# PHẦN 2: HIỆN TRẠNG & TÍNH KHẢ THI

## Bối cảnh
Hệ thống cửa hàng cho thuê truyện tranh và bán sách cũ hiện tại hoạt động theo mô hình kinh doanh kết hợp tại một điểm vật lý duy nhất. Mọi công việc: giao dịch, cho thuê, nhận, trả sách, nhập hàng, xuất hàng và kiểm kê trong kho đều được nhân viên thực hiện trực tiếp tại quầy. 
Phần mềm được xây dựng nhằm số hóa và tập trung hóa toàn bộ hoạt động quản lý cửa hàng. Một số chức năng trong hệ thống có thể kể đến như: quản lý tài khoản, quản lý khách hàng, các dịch vụ hỗ trợ khách hàng, hỗ trợ chấm công, ca làm, lương, thanh toán, báo cáo và thống kê. 
Sau đây, tôi sẽ phân tích các pain points, làm rõ mục tiêu xây dựng phần mềm và đánh giá tính khả thi dựa trên 3 khía cạnh: công nghệ, nghiệp vụ và thời gian. 

## Vấn đề tồn đọng trong vận hành hiện đại.

### 2.1. Quản lý thủ công
Hệ thống cửa hàng hiện tại đa số còn vận hành theo hướng thủ công, thiếu công cụ tập trung. Việc theo dõi đồng thời từng thông tin đầu sách, bản sách vật lý khiến cho thông tin khó liên kết, đồng bộ với nhau. Việc tra cứu và tìm kiếm chậm và dễ sai lệch khi nhân viên thao tác thủ công. 
Đặc biệt, việc quản lý tình trạng một đầu sách có nhiều trạng thái phức tạp (cho thuê, đã bán, đã hỏng, thất lạc, thanh lý…), rất khó quản lý chính xác nếu không có hệ thống hỗ trợ theo dõi theo thời gian thực. 

### 2.2. Quản lý danh sách sách trong hệ thống
Thiếu cơ chế để quản lý được danh sách các đầu sách và bản sách vật lý trong kho. Nhân viên phải thực hiện quản lý các thông tin sách một cách thủ công: độ mới sách, trình trạng sách, giá tiền bán. 

### 2.3. Khó khăn trong quản lý cho thuê, gia hạn và thu hồi sách.
Khi không có hệ thống theo dõi trạng thái theo thời gian thực, nhân viên khó nắm bắt chính xác sách nào đang được cho thuê và hạn trả cụ thể, dẫn đến nguy cơ cho thuê trùng một bản sách hoặc bỏ sót việc nhắc khách trả sách đúng hạn. 
Việc tính tiền phạt trễ hạn, xử lý tiền đặt cọc khi sách bị hư hỏng phụ thuộc vào trí nhớ cá nhân, dễ thiếu nhất quán giữa các ca làm việc, gây ra thâm thoát chi phí cho cửa hàng. 

### 2.4. Thất thoát và khó kiểm soát tồn kho
Thiếu cơ chế cảnh báo khi tồn kho khi chạm ngưỡng tối thiểu, cửa hàng dễ rơi vào tình trạng hết hàng đối với các đầu sách bán chạy và không kịp để bổ sung. Ngược lại, việc dư thừa sách trong tồn kho cũng dẫn đến tồn đọng vốn (nhập nhiều mà bán không được thì được cái éo gì). Việc kiểm kê định kỳ này nếu không được chuẩn hóa hay quản lý tự động thì sẽ gây ra thấm thoát tài sản mà không xác định được nguyên nhân, thời điểm hay người liên quan. 

### 2.5. Quản lý các dịch vụ khách hàng
Việc cho thuê/bán sách sẽ khó nắm bắt chính xác bản nào đang được cho thuê và hạn trả cụ thể, dẫn đến nguy cơ cho thuê trùng một bản sách hoặc bỏ sót việc nhắc khách trả sách đúng hạn. Việc tính tiền phạt trễ hạn cũng dễ gây ra sai sót, phụ thuộc vào việc ghi chép và trí nhớ của nhân viên. 
Nhân viên không được cung cấp dữ liệu đầy đủ để phục vụ khách hàng nhanh chóng. Cửa hàng cũng khó khăn trong việc cung cấp các ưu đãi cho khách hàng thân thiết. 
Ngoài ra, còn phải thực hiện một số dịch vụ cho khách hàng: 

### 2.6. Quản lý nhân sự, chấm công và ca làm
Việc phân công ca làm, nếu thực hiện thủ sẽ tốn nhiều thời gian đối chiếu và xảy ra sai lệch giữa lịch làm việc và thời gian thực tế họ làm. Sai lệch dẫn đến khó trả lương và theo dõi năng suất. 

### 2.7. Thiếu báo cáo để đưa ra quyết định kịp thời.
Nếu không có công cụ tổng hợp số liệu tự động, việc thống kê doanh thu bán sách, doanh thu cho thuê, chi phí nhập hàng và chi phí nhân sự sẽ mất nhiều thời gian và xảy ra sai sót. Điều này khiến người quản lý kho khó xác định kịp thời đầu sách nào bán chạy hay bán ít, khó ra quyết định nhập hàng, điều chỉnh giá hoặc đối chiếu doanh thu với chi phí vận hành. 

### 2.8. Thiếu quyền kiểm soát và truy vết trách nhiệm
Khi không có cơ chế phân quyền rõ ràng theo vai trò và nhật ký không lưu lại các thao tác nhạy cảm, cửa hàng khó kiểm soát được ai được phép thực hiện thao tác gì, đồng thời không có cơ sở để truy vết và quy trách nhiệm khi phát sinh sai soát hoặc thấm thoát, gia tăng rủi ro nội bộ. 

## Tính khả thi

### 3.1. Khả thi về công nghệ
- Backend - .NET: Cung cấp nền tảng vững chắc để xây dựng các API nghiệp vụ theo từng nhóm chức năng. Cung cấp nền tảng vững chắc để xây dựng các API nghiệp vụ theo từng nhóm chức năng. 
  - Phù hợp với mức độ hiểu biết và sử dụng của cả nhóm. 
  - ASP.NET Core đáp ứng đầy đủ các thư viện, không cần bổ sung công nghệ nằm ngoài hê thống 
- Cơ sở dữ liệu: Là hệ quản trị CSDL, hiệu năng tốt và được cộng đồng doanh nghiệp sử dụng rộng rãi; phù hợp để đảm bảo các ràng buộc dữ liệu chặt chẽ giữa các đầu sách, bản sách và giao dịch. 
- Frontend - React: Xây dựng UI quản lý nghiệp vụ cho cửa hàng. Các thao tác tương tác đảm bảo đúng với luồng yêu cầu nghiệp vụ được chốt trong tài liệu. Giao tiếp với backend bằng cơ chế API REST. Đồng thời, thuận lợi khi sau này mở rộng ra multiplat form với mobile (React Native). 

### 3.2. Khả thi về nghiệp vụ
- Nghiệp vụ 1 - Các tham số cấu hình đặc thù: ngưỡng tồn khi tối thiểu/tối đa, số lượng nhập tối thiểu/tối đa, chính sách thuê theo ngày và thuê mặc định từng đầu sạc. 
- Nghiệp vụ 2 - Các quy trình xử lý ngoại lệ được chuẩn hóa: Các quy trình nghiệp vụ được tìm hiểu và phù hợp với khả năng xử lý của nhóm. Nội dung sẽ được trình bày cụ thể ở Phần 4. 
- Nghiệp vụ 3 - Cơ cấu vai trò và phân quyền: Thực hiện phân quyền thực tế theo Role-Based: một số vai trò gợi ý như: Quản lý, Thu ngân, Nhân viên kho. Mỗi vai trò cần được đối chiếu với cơ cấu nhân sự thật của cửa hàng để đảm bảo đúng quyền hạn 

### 3.3. Khả thi về thời gian
Khả thi về mặt thời gian, triển khai theo từng phase. Dự kiến như sau: 
Với khối lượng đặc tả, dự án được triển khai theo hướng SDD (spec-driven development). Hệ thống sẽ tập trung vào các tài liệu đặc tả và chân lý kỹ thuật, sử dụng chúng làm source truth. Sau đó, sử dụng các công cụ AI để hỗ trợ trong việc sinh mã => Đạt được sự khả thi về mặt thời gian. 

Lộ trình kế hoạch dự kiến: 

| Giai đoạn | Nội dung chính | Thời gian ước lượng |
|---|---|---|
| Khảo sát & phân tích nghiệp vụ | Thu thập tham số cấu hình, quy trình ngoại lệ, xác nhận cơ cấu vai trò | 1-2 tuần |
| Nền tảng & nghiệp vụ | Tài khoản & xác thực, phân quyền, danh mục & sản phẩm, tồn kho, thuê/bán sách, nhập sách | 2-3 tuần |
| Khách hàng | Khách hàng & hạng thành viên, thanh toán, thông báo | 1 tuần |
| Nhân sự | Nhân viên/quản lý ca làm, tài khoản nhân viên, các thao tác trong hệ thống của nhân viên. | 2 - 3 tuần |
| Báo cáo & Thống kê | Báo cáo, thống kê doanh thu, cấu hình hệ thống. | 2 tuần |
| Kiểm thử tổng thể & UAT | Kiểm thử end-to-end. Xây dựng một bộ benchmark luồng nghiệp vụ để đánh giá được hệ thống. | 2 tuần. |

Tổng thời gian dự kiến tối đa: 13 tuần. Có thể bệnh, làm tròn lên 14 tuần. 

---

# PHẦN 3: THỰC THỂ & DỮ LIỆU THU THẬP 

## 1. CÁC TÁC NHÂN CỦA HỆ THỐNG (ACTORS) VÀ DỮ LIỆU CẦN THU THẬP
Hệ thống được thiết kế tinh gọn cho quy mô một hộ kinh doanh / một cửa hàng vật lý, phục vụ các nhóm tác nhân nội bộ, khách hàng và dịch vụ tích hợp bên ngoài như sau:

### 1.1. Khách hàng / Độc giả
- Vai trò: Là người thuê sách, mua sách cũ hoặc mang sách cũ đến quầy để bán lại (thanh lý) cho cửa hàng; có thể tra cứu và đặt giữ sách qua giao diện web.
- Dữ liệu cần lưu trữ:
  - Thông tin định danh: Mã khách hàng, Họ và tên, Số điện thoại (dùng làm khóa tìm kiếm nhanh tại quầy và tài khoản đăng nhập tra cứu).
  - Thông tin thành viên & Tích lũy: Điểm tích lũy, Tổng chi tiêu tích lũy, Hạng thành viên (Thành viên mới, Thân thiết, VIP) để áp dụng chính sách giảm giá thuê/mua.
  - Lịch sử giao dịch: Lịch sử các lần thuê/mua sách, danh sách sách đang mượn giữ, lịch sử trả trễ hoặc làm hỏng/mất sách
  - Lịch sử bán lại sách: Danh sách các đợt khách bán sách cũ cho cửa hàng kèm tổng số tiền cửa hàng đã chi trả.

### 1.2. Nhân viên cửa hàng / Thu ngân
- Vai trò: Thao tác trực tiếp tại quầy thu ngân để phục vụ khách: lập phiếu thuê/trả sách, bán sách cũ, thẩm định và lập phiếu thu mua sách cũ từ khách, kiểm kê kệ sách và bàn giao két tiền mặt cuối ca.
- Dữ liệu cần lưu trữ:
  - Hồ sơ nhân viên: Mã nhân viên, Họ và tên, Số điện thoại liên hệ, Trạng thái làm việc (Đang làm / Đã nghỉ).
  - Tài khoản hệ thống: Tên đăng nhập, Mật khẩu đã băm (Hashed Password), Vai trò (Nhân viên bán hàng / Thu ngân).
  - Dữ liệu ca làm và trách nhiệm: Ghi nhận mã nhân viên trực tiếp trên từng hóa đơn bán, phiếu thuê, phiếu thu mua và biên bản kiểm kê để dễ dàng đối soát khi xảy ra sai lệch tiền bạc hoặc thất thoát sách.

### 1.3. Chủ cửa hàng / Quản lý kiêm Quản trị viên
- Vai trò: Người sở hữu hộ kinh doanh, nắm toàn quyền điều hành hệ thống: quyết định giá thu mua và định giá bán/thuê, duyệt hủy đơn/xóa chứng từ sai lệch, quản lý tài khoản nhân viên, cấu hình tiền cọc - phí phạt và theo dõi báo cáo doanh thu, lợi nhuận, dòng tiền thực tế.
- Dữ liệu cần lưu trữ:
  - Tài khoản quản trị tối cao với đầy đủ quyền truy cập (Role-Based Access Control - RBAC ở mức đơn giản: Chủ cửa hàng và Nhân viên).
  - Nhật ký quyết định: Lịch sử can thiệp các thao tác nhạy cảm (Sửa giá bán, duyệt hao hụt sau kiểm kê, xóa phiếu lỗi, thay đổi tỷ lệ tiền cọc).

### 1.4. Các hệ thống bên ngoài (optional)
- Cổng thanh toán mã động (VietQR): Tạo mã QR động kèm số tiền và nội dung chuyển khoản tự động cho từng hóa đơn thuê/bán hoặc nhận thông báo biến động số dư để xác nhận thanh toán tức thì tại quầy. Dữ liệu lưu: Mã giao dịch ngân hàng, Số tiền, Trạng thái giao dịch, Thời gian thanh toán.
- API thư mục sách (Google Books / OpenLibrary API): Hỗ trợ nhân viên tra cứu nhanh thông tin sách (Tên sách, Tác giả, Nhà xuất bản, Năm phát hành, Ảnh bìa) dựa trên mã vạch ISBN gốc khi thu mua sách cũ có sẵn mã, giúp giảm tối đa thời gian nhập liệu thủ công.
- Dịch vụ tin nhắn Zalo / SMS: Gửi thông báo nhắc lịch trả sách sắp đến hạn hoặc quá hạn cho khách hàng qua Zalo OA hoặc SMS Brandname. Dữ liệu lưu: Số điện thoại nhận, Nội dung, Thời gian gửi và Trạng thái phản hồi.

## 2. CÁC ĐỐI TƯỢNG CHÍNH TRONG HỆ THỐNG
Dữ liệu được chuẩn hóa thành các nhóm thực thể nghiệp vụ sát với thực tế vận hành cửa hàng như sau:

### 2.1. Nhóm Ấn phẩm & Quản lý Kho sách
- **Đầu sách / Tên tập**
  - Ý nghĩa: Mô tả thông tin trừu tượng của một tập truyện cụ thể trong bộ hoặc một cuốn sách đơn lẻ không thuộc bộ.
  - Thuộc tính: Mã đầu sách, Mã bộ truyện (nếu có), Tên tập sách (ví dụ: Thám tử lừng danh Conan - Tập 100), Mã ISBN gốc, Nhà xuất bản, Năm xuất bản, Giá bìa niêm yết gốc, Ảnh bìa, Tóm tắt ngắn, Đơn giá thuê mặc định theo ngày/tuần, Tiền cọc tối thiểu mặc định.
- **Sách vật lý tại tiệm**
  - Ý nghĩa: Từng cuốn sách cụ thể đang hiện diện tại cửa hàng. Một đầu sách có thể có nhiều cuốn với độ mới khác nhau và nguồn gốc khác nhau.
  - Thuộc tính: Mã bản sách nội bộ (Barcode riêng biệt dán gáy sách), Mã đầu sách, Nguồn nhập ("Thu mua từ khách" hoặc "Nhập từ nhà cung cấp"), Mã phiếu thu mua/nhập tương ứng, Độ mới theo thang phân cấp (Grade A, B, C, D), Mô tả tình trạng thực tế (Có bọc plastic, ố vàng nhẹ, gáy sờn...), Giá vốn thu mua vào, Giá bán định giá lại (nếu để bán), Trạng thái vòng đời ("Sẵn sàng", "Đang cho thuê", "Đã bán", “Ko sẵn sàng’’).

### 2.2. Nhóm Nghiệp vụ Cho thuê
- **Phiếu thuê sách**
  - Thuộc tính: Mã phiếu thuê, Mã khách hàng, Mã nhân viên lập phiếu, Thời gian tạo phiếu, Hạn trả theo chính sách, Thời gian trả thực tế, Tổng tiền cọc thực thu, Tổng tiền thuê dự tính, Phí phạt trễ hạn, Phí bồi thường hư hỏng/mất sách, Số tiền hoàn lại cho khách khi trả xong, Trạng thái phiếu ("Đang thuê", "Đã trả xong", "Quá hạn", "Đã đóng do mất sách").
- **Chi tiết phiếu thuê**
  - Thuộc tính: Mã phiếu thuê, Mã bản sách vật lý (Barcode cuốn cụ thể), Đơn giá thuê thực tế, Tình trạng sách lúc giao cho khách, Tình trạng sách lúc nhân viên nhận lại.

### 2.3. Nhóm Nghiệp vụ Bán sách & Thu ngân
- **Hóa đơn bán hàng**
  - Thuộc tính: Mã hóa đơn, Mã khách hàng (nếu có để tích điểm, hoặc Khách vãng lai), Mã nhân viên bán hàng, Ngày giờ giao dịch, Tổng tiền hàng, Giảm giá thành viên/khuyến mãi, Tổng tiền thực thu, Trạng thái ("Đã thanh toán", "Đã hủy").
- **Chi tiết hóa đơn bán**
  - Thuộc tính: Mã hóa đơn, Mã bản sách vật lý (cuốn sách bán ra sẽ được hệ thống cập nhật ngay sang trạng thái "Đã bán"), Đơn giá bán thực tế.
- **Giao dịch thanh toán**
  - Thuộc tính: Mã giao dịch, Loại chứng từ tham chiếu (Hóa đơn bán, Phiếu thuê, Phiếu trả hoàn cọc, Phiếu thu mua sách), Hình thức thanh toán ("Tiền mặt", "Chuyển khoản VietQR"), Số tiền giao dịch (Ghi nhận Dương nếu thu tiền vào két, ghi nhận Âm nếu chi tiền két ra để thu mua sách hoặc hoàn tiền cọc), Thời gian giao dịch, Mã tham chiếu ngân hàng (nếu là VietQR).

### 2.4. Nhóm Nghiệp vụ Thu mua sách cũ & Nhập hàng (Trọng tâm hộ kinh doanh)
- **Phiếu thu mua sách cũ từ khách**
  - Ý nghĩa: Lập tại quầy khi khách hàng mang sách cũ đến bán lại cho cửa hàng. Tiền thanh toán sẽ được chi trực tiếp từ két tiền mặt của ca hoặc chuyển khoản cho khách.
  - Thuộc tính: Mã phiếu thu mua, SĐT/Thông tin người bán (Tên, Số điện thoại), Mã nhân viên tiếp nhận, Ngày giờ thu mua, Tổng số lượng sách nhận, Tổng số tiền chi trả cho khách, Phương thức chi trả ("Tiền mặt lấy từ két", "Chuyển khoản"), Ghi chú thỏa thuận.
- **Chi tiết phiếu thu mua**
  - Thuộc tính: Mã phiếu thu mua, Mã đầu sách (được chọn từ danh mục hoặc tạo mới nếu sách chưa từng có trong hệ thống), Đánh giá độ mới (Grade A, B, C, D), Giá thu mua thỏa thuận cho từng cuốn, Mã bản sách (Barcode) mới được in và dán ngay lên cuốn sách.
- **Phiếu nhập hàng mới/sỉ**
  - Ý nghĩa: Dành cho số ít trường hợp chủ quán nhập thêm truyện tranh mới xuất bản, bọc bìa, phụ kiện từ nhà phát hành hoặc đại lý sách.
  - Thuộc tính: Mã phiếu nhập, Tên nhà cung cấp/Đại lý, Ngày nhập, Nhân viên tạo phiếu, Tổng giá trị nhập, Trạng thái thanh toán công nợ.
- **Chi tiết phiếu nhập hàng**
  - Thuộc tính: Mã phiếu nhập, Mã đầu sách, Số lượng cuốn nhập về, Đơn giá nhập sỉ.

### 2.5. Nhóm Quản trị Vận hành & Quản lý Ca - Tiền két
- **Quản lý Ca trực & Két tiền mặt**
  - Ý nghĩa: Kiểm soát dòng tiền mặt ra - vào liên tục tại quầy của hộ kinh doanh (đặc biệt khi nhân viên phải dùng tiền mặt trong két để chi trả cho khách đến bán lại sách cũ).
  - Thuộc tính: Mã ca, Nhân viên phụ trách ca, Thời gian mở ca, Thời gian chốt ca, Tiền mặt đầu ca tiếp nhận, Tổng tiền mặt thu vào (từ bán sách, thu tiền thuê, thu cọc), Tổng tiền mặt chi ra (trả tiền cọc thừa cho khách, chi tiền mua sách cũ từ khách), Tiền mặt lý thuyết trong két, Tiền mặt thực tế kiểm đếm lúc chốt ca, Số tiền chênh lệch (nếu có), Ghi chú bàn giao ca.
- **Cấu hình tham số cửa hàng:**
  - Thuộc tính: Mã cấu hình, Tỷ lệ tiền cọc tối thiểu theo % giá trị sách (ví dụ: 80% giá trị bản sách), Đơn giá thuê mặc định theo ngày (% giá bìa hoặc tiền cố định như 2.000đ - 5.000đ/ngày), Mức phạt trả trễ hạn/ngày, Số ngày tối đa cho một lượt thuê.
- **Nhật ký thao tác nhạy cảm**
  - Thuộc tính: Mã nhật ký, Mã nhân viên thao tác, Đối tượng tác động, hành động(Duyệt thu mua, Điều chỉnh giá bán, Xóa hóa đơn lập sai, Thanh lý sách hư), Thời điểm thực hiện.

## 3. Phương án xử lý sách nhiều tập và đảm bảo độ tin cậy dữ liệu sách cũ.

### 3.1. Phương án xử lý sách nhiều tập
- Mô hình dữ liệu phân rã 3 tầng: Cửa hàng sử dụng cấu trúc quan hệ:Một Bộ truyện → Nhiều Tập/Đầu sách → Nhiều Bản sách vật lý
- Cơ chế vận hành thực tế tại quầy:
  - Khi tra cứu: Khách hàng chỉ cần nhập tên bộ (ví dụ: "Doraemon" hoặc "Conan"), hệ thống sẽ hiển thị toàn bộ danh sách các tập từ tập 1 đến tập mới nhất. Với mỗi tập, nhân viên thấy ngay số lượng cuốn còn sẵn sàng để cho thuê hoặc bán ngay trên kệ, cuốn nào đang có khách mượn kèm ngày dự kiến trả.
  - Khi lập giao dịch cho thuê hoặc bán: Nhân viên không chọn tên sách chung chung, mà dùng máy quét mã vạch quét trực tiếp tem Barcode dán trên cuốn sách vật lý (ví dụ: Cuốn số 2 của Tập 5 bộ Dragon Ball có mã: DB-T05-C02). Hệ thống sẽ định danh chính xác cuốn đó, tránh nhầm lẫn giữa các tập trong cùng một bộ truyện.

### 3.2. Cơ chế thẩm định và đảm bảo độ tin cậy khi thu mua sách cũ từ khách
Sách cũ thu mua từ người đọc mang đến quầy thường có tình trạng rất đa dạng, có thể mất bìa, không có mã vạch ISBN (đối với sách xuất bản đã lâu) hoặc bị hư hại bên trong. Cửa hàng áp dụng quy trình thẩm định và chuẩn hóa dữ liệu như sau. 
- **Bước 1: Xác minh thông tin thư mục và tránh trùng lặp dữ liệu (Metadata Verification)**
  - Đối với sách có mã ISBN gốc: Nhân viên quét mã ISBN qua máy quét, hệ thống tự động gọi API (Google Books) để điền tên sách, tác giả và giá bìa gốc.
  - Đối với sách cũ không có ISBN hoặc tem bìa bị rách: Nhân viên gõ tìm kiếm nhanh theo Tên sách trên danh mục có sẵn của quán. Nếu sách mới xuất hiện lần đầu, nhân viên nhập tối thiểu 3 trường bắt buộc: Tên sách (kèm số tập nếu là truyện bộ), Tác giả và Giá bìa ước tính để làm căn cứ tính cọc sau này.
- **Bước 2: Chuẩn hóa thang đo thẩm định chất lượng sách cũ (Condition Grading Standard)**
Nhân viên bắt buộc phải chọn 1 trong 4 phân hạng tình trạng vật lý khi tạo phiếu thu mua để hệ thống tự động gợi ý giá thu mua hợp lý:
  - Hạng A (Độ mới 90% - 99%): Sách sưu tầm hoặc đọc lướt, phẳng phiu, không quăn mép, không vết mực hay chữ ký, cấu trúc gáy sách nguyên vẹn như mới. Hệ thống gợi ý giá thu mua khoảng 35% - 45% giá bìa.
  - Hạng B (Độ mới 70% - 89%): Sách đã qua sử dụng nhiều lần, giấy ngả vàng nhẹ theo thời gian, mép sờn nhẹ nhưng không rách trang, gáy sách còn chắc chắn, đủ trang ruột. Hệ thống gợi ý giá thu mua khoảng 20% - 30% giá bìa.
  - Hạng C (Độ mới 50% - 69%): Sách cũ kỹ, bìa sờn góc, có vết ố hoặc chữ viết tay/gạch chân nhẹ của người đọc trước, nhưng vẫn đầy đủ nội dung đọc được. Hệ thống gợi ý giá thu mua khoảng 10% - 15% giá bìa (thường dùng bổ sung cho thuê bình dân).
  - Hạng D (Dưới 50%): Sách bị long gáy, mất góc bìa, dính nước hoặc rách trang nghiêm trọng. Hệ thống cảnh báo từ chối thu mua, hoặc chỉ thu mua giá tượng trưng dạng phế liệu/thanh lý theo thỏa thuận riêng.

---

# PHẦN 4: LUỒNG NGHIỆP VỤ & TƯƠNG TÁC 

## Luồng nghiệp vụ

### 1.1. Luồng thuê sách
- Khách hàng chọn sách muốn thuê (tại quầy hoặc qua FE)
- Nhân viên kiểm tra tình trạng tồn kho sách
- Nhân viên tra cứu/tạo hồ sơ khách hàng (nếu khách mới)
- Hệ thống kiểm tra hạng thành viên → áp dụng ưu đãi (nếu có)
- Nhân viên lập phiếu thuê: sách, ngày thuê, hạn trả, tiền cọc 
- Khách hàng thanh toán tiền thuê/tiền cọc
- Hệ thống trừ số lượng tồn kho
- In/gửi phiếu thuê cho khách + gửi thông báo xác nhận qua Zalo, gửi thông báo nhắc trước hạn trả 1-2 ngày, kèm đường dẫn/nút gia hạn

### 1.2. Luồng gia hạn thuê sách
- Khách hàng yêu cầu gia hạn (tại quầy hoặc phản hồi thông báo Zalo nhắc hạn), cung cấp mã phiếu thuê
- Nhân viên tra cứu phiếu thuê, kiểm tra phiếu đang ở trạng thái "Đang thuê"
- Hệ thống kiểm tra điều kiện gia hạn (theo cấu hình):
  - Chưa vượt số lần gia hạn tối đa
  - Nếu phiếu đã trễ hạn → tính tiền phạt đến thời điểm gia hạn, khách đóng phạt trước khi gia hạn
- Khách chọn số ngày muốn gia hạn
- Hệ thống tính phí gia hạn (áp dụng ưu đãi hạng thành viên) và xác định hạn trả mới
- Chuyển sang luồng thanh toán (loại giao dịch: gia hạn thuê)
- Sau khi thanh toán thành công:
  - Cập nhật hạn trả mới, tăng số lần gia hạn trên phiếu thuê
  - Lưu lịch sử gia hạn (ngày gia hạn, số ngày, phí, nhân viên thực hiện)
  - Ghi nhận phí gia hạn vào doanh thu cho thuê
  - Xuất biên nhận, gửi thông báo Zalo xác nhận hạn trả mới và số tiền đã thanh toán 

### 1.3. Luồng bán sách
- Khách hàng chọn sách muốn mua (tại quầy)
- Nhân viên kiểm tra tồn kho 
- Nhân viên tra cứu/tạo hồ sơ khách hàng (không bắt buộc như thuê, vì bán thì không cần theo dõi ai đang giữ sách)
- Hệ thống tính giá bán — áp dụng khuyến mãi/hạng thành viên
- Xác nhận đơn bán, chuyển sang luồng thanh toán
- Sau khi thanh toán thành công:
  - Cập nhật giảm số lượng sách trong kho
  - Xuất hóa đơn bán hàng
  - Gửi thông báo Zalo xác nhận đã mua
  - Ghi nhận giao dịch vào doanh thu bán hàng (tách riêng với doanh thu cho thuê để phục vụ báo cáo/thuế sau này) 

### 1.4. Luồng trả sách
- Khách hàng mang sách đến trả, cung cấp mã phiếu thuê
- Nhân viên tra cứu phiếu thuê tương ứng
- Kiểm tra tình trạng sách
- Hệ thống so sánh ngày trả thực tế với hạn trả:
  - Đúng hạn → không phạt
  - Trễ hạn → tính tiền phạt theo số ngày trễ
  - Sách hư/mất → tính phí bồi thường
- Nhân viên xác nhận số tiền phạt (nếu có) và thu tiền
- Hệ thống cập nhật tồn kho và trạng thái sách theo kết quả kiểm tra
- Cập nhật trạng thái phiếu thuê = "Đã trả"
- Gửi thông báo xác nhận trả sách + biên nhận qua Zalo (nếu có phạt, ghi rõ lý do và số tiền)

### 1.5. Luồng thanh toán

#### 1.5.1. Tiền vào
- Xác định loại giao dịch: thuê sách / mua sách / đóng phạt / gia hạn thuê
- Hệ thống tính tổng tiền
- Khách chọn tiền mặt hoặc chuyển khoản
- Tiền mặt: nhân viên nhập số tiền nhận, hệ thống tính tiền thối
- Chuyển khoản: hiển thị QR, hệ thống xác nhận trạng thái thanh toán
- Ghi nhận giao dịch, xuất hóa đơn/biên nhận cho khách
- Gửi Zalo "thanh toán thành công" kèm chi tiết hóa đơn

#### 1.5.2. Tiền chi
- Xác định loại giao dịch và người nhận: chi trả thu mua sách cũ (người nhận: khách hàng) / chi trả lương (người nhận: nhân viên)
- Hệ thống lấy số tiền từ phiếu thu mua hoặc bảng lương đã duyệt 
- Chọn hình thức chi: tiền mặt hoặc chuyển khoản ngân hàng
- Trường hợp tiền mặt: người chi xác nhận đã đưa tiền; người nhận xác nhận đã nhận (có thể ký hoặc xác nhận trên hệ thống) 
- Trường hợp ngân hàng: người chi nhập/đính kèm mã giao dịch ngân hàng  
- Hệ thống ghi nhận giao dịch, xuất phiếu chi (không phải hóa đơn)
- Gửi Zalo xác nhận cho người nhận (khách: đã nhận tiền thu mua; nhân viên: phiếu lương) 
- Ghi vào nhóm chi phí tương ứng (thu mua sách cũ / nhân sự) để đưa sang luồng thuế  

### 1.6. Luồng nhập kho sách từ doanh nghiệp
- Nhân viên/quản lý tạo phiếu nhập kho (nhà cung cấp, số lượng, giá nhập)
- Nhập nhanh thông tin sách: quét mã ISBN (nếu có) → hệ thống tự động lấy thông tin cơ bản (tên sách, tác giả, NXB) từ API tra cứu sách, nhân viên chỉ cần xác nhận/bổ sung 
- Cập nhật số lượng tồn kho theo từng đầu sách
- Hệ thống kiểm tra ngưỡng tồn kho tối thiểu/tối đa (theo cấu hình hệ thống)
- Nếu vượt/thiếu ngưỡng → sinh thông báo cảnh báo cho quản lý

### 1.7. Luồng nhập sách cũ từ khách hàng
- Khách hàng mang sách cũ đến bán lại cho cửa hàng
- Nhân viên tra cứu/tạo hồ sơ khách hàng (bắt buộc, để lưu chứng từ thu mua)
- Nhập nhanh thông tin sách: quét ISBN → hệ thống tự lấy tên sách, tác giả, NXB → nhân viên xác nhận/bổ sung
- Nhân viên đánh giá tình trạng từng cuốn
- Hệ thống đề xuất giá thu mua (giá tham chiếu × hệ số tình trạng); nhân viên điều chỉnh, khách đồng ý hoặc từ chối
- Nếu giá vượt ngưỡng cấu hình → cần quản lý duyệt
- Nếu sách không đạt yêu cầu → từ chối, kết thúc luồng
- Lập phiếu thu mua: khách hàng, danh sách sách, tình trạng, số lượng, đơn giá, tổng tiền
- Thanh toán cho khách (tiền mặt hoặc chuyển khoản), hệ thống ghi nhận khoản chi
- Nhập kho: lưu tình trạng, cập nhật tồn kho
- Hệ thống kiểm tra ngưỡng tồn kho tối thiểu/tối đa, sinh cảnh báo nếu cần
- In/gửi biên nhận thu mua + thông báo Zalo xác nhận cho khách
- Ghi nhận giao dịch vào chi phí nhập hàng (nhóm "thu mua sách cũ") để phục vụ tổng hợp thuế

### 1.8. Luồng xử lý tồn kho thấp / hao hụt
- Hệ thống định kỳ kiểm tra tồn kho từng sách
- So sánh với mức tồn kho tối thiểu đã cấu hình
- Nếu chạm ngưỡng → tạo thông báo đề xuất nhập hàng gửi cho quản lý/nhân viên kho
- Nếu phát hiện hao hụt bất thường (kiểm kê lệch số liệu) → ghi log, thông báo cho admin để đối chiếu lịch sử thao tác

### 1.9. Luồng chia ca chấm công

#### 1.9.1. Chia ca
- Quản lý cấu hình danh mục ca làm việc (tên ca, giờ bắt đầu/kết thúc, số nhân viên tối thiểu mỗi ca)
- Quản lý tạo lịch làm việc theo tuần/tháng, gán nhân viên vào từng ca
- Hệ thống kiểm tra xung đột: trùng ca, vượt số giờ tối đa/ngày hoặc/tuần, ca thiếu người
- Quản lý công bố lịch → hệ thống gửi thông báo Zalo cho nhân viên
- Xin nghỉ/đổi ca: nhân viên gửi yêu cầu → quản lý duyệt hoặc từ chối → hệ thống cập nhật lịch và thông báo lại

#### 1.9.2. Chấm công
- Nhân viên check-in khi bắt đầu ca và check-out khi kết thúc (hệ thống ghi giờ thực tế; hình thức xác thực theo cấu hình)
- Hệ thống đối chiếu với ca đã phân và gắn trạng thái: đúng giờ / đi trễ / về sớm / thiếu chấm công / vắng / tăng ca
- Trường hợp quên chấm công hoặc sai lệch: nhân viên gửi giải trình → quản lý điều chỉnh, bắt buộc ghi lý do và lưu log chỉnh sửa

#### 1.9.3. Tổng hợp công cuối kì
- Hệ thống tổng hợp theo từng nhân viên: số ca, tổng giờ công, số lần đi trễ/về sớm, giờ tăng ca, ngày nghỉ
- Quản lý kiểm tra, đối chiếu và chốt bảng công (sau khi chốt thì khóa dữ liệu, muốn sửa phải mở khóa và ghi log)
- Hệ thống tính lương theo cấu hình cho từng nhân viên:
  - Lương theo giờ/ca × số giờ/ca thực tế
  - Tiền tăng ca = giờ tăng ca × đơn giá × hệ số
  - Các khoản cộng/trừ: phụ cấp, thưởng, phạt đi trễ/về sớm, tạm ứng (nhập tay hoặc theo quy tắc) 
- Quản lý xem bảng lương nháp, điều chỉnh (bắt buộc ghi lý do) rồi duyệt chốt
- Chi trả lương (tiền mặt hoặc chuyển khoản) → hệ thống ghi nhận khoản chi, loại giao dịch "chi trả lương"
- Gửi phiếu lương cho nhân viên qua Zalo
- Xuất bảng công + bảng lương dạng Excel/PDF; chi phí nhân sự chuyển sang luồng tổng hợp kê khai thuế

### 1.10. Luồng tổng hợp dữ liệu phục vụ kê khai thuế
- Hệ thống xác định kỳ kê khai (tháng/quý theo cấu hình)
- Tự động tổng hợp từ dữ liệu giao dịch trong kỳ:
  - Tổng doanh thu bán sách
  - Tổng doanh thu cho thuê sách / phí gia hạn
  - Tổng tiền phạt thu được (nếu tính là doanh thu phát sinh)
  - Tổng chi phí nhập hàng từ doanh nghiệp / khách bán sách cũ
  - Tổng chi phí nhân sự
- Hệ thống phân loại và tổng hợp các số liệu liên quan theo từng nhóm dữ liệu
- Quản lý/Admin kiểm tra, đối chiếu dữ liệu với các giao dịch và chứng từ liên quan
- Hệ thống xuất báo cáo tổng hợp dữ liệu phục vụ kê khai thuế dưới dạng Excel/PDF
- Quản lý sử dụng báo cáo để thực hiện việc kê khai theo quy định hiện hành
- Trong phạm vi MVP, hệ thống chỉ hỗ trợ tổng hợp và xuất dữ liệu, không thực hiện nộp hồ sơ thuế tự động

### 1.11. Luồng thông báo Zalo 

| Sự kiện | Người nhận | Nội dung |
|---|---|---|
| Thanh toán thành công | Khách hàng | Chi tiết hóa đơn, sách đã thuê/mua |
| Sắp đến hạn trả sách | Khách hàng | Nhắc hạn trả trước 1–2 ngày |
| Quá hạn trả sách | Khách hàng | Số ngày trễ, tiền phạt dự kiến |
| Tồn kho chạm mức tối thiểu | Quản lý/Admin | Tên sách, số lượng còn lại |

## Tương tác hệ thống
- Khách hàng: nhận thông báo Zalo
- Nhân viên: tiếp nhận, tra cứu, cập nhật hồ sơ khách hàng, xử lý phiếu thuê/trả, xử lý thanh toán, nhập/xuất kho, chấm công
- Quản lý (Manager): quản lý danh mục, quản lý kho, quản lý nhân viên, quản lý ca/chấm công/lương, xem báo cáo/thống kê
- Admin: full quyền, quản lý phân quyền theo RBAC (ban đầu chỉ là nhân viên bình thường, sau đó có thể có thêm các quyền hạn khác do admin trao quyền), tra cứu lịch sử thao tác

---

# PHẦN 5: RÀNG BUỘC NGHIỆP VỤ, NGOẠI LỆ & BIẾN THIÊN DỮ LIỆU 

## Ràng buộc Luồng Thuê Sách
- Định danh khách hàng bắt buộc: Thuê sách là giao dịch tạm giao tài sản. Bắt buộc phải có hồ sơ khách hàng gồm Họ tên và Số điện thoại. Khách hàng thuê bộ sách giá trị cao (tổng giá trị sách > 1.000.000 VNĐ) bắt buộc phải cập nhật Số CCCD và địa chỉ hiện tại vào hồ sơ.
- Phân tầng hạn mức và ưu đãi theo Hạng thành viên:
  - Bảng quy định điều kiện, hạn mức và ưu đãi theo Hạng thành viên:

| Hạng thành viên | Điều kiện đạt hạng | Số sách thuê tối đa đồng thời | Thời gian thuê tối đa / phiếu | Ưu đãi chiết khấu |
|---|---|---|---|---|
| Thành viên Thường (Mới) | Tài khoản mới đăng ký, chi tiêu < 1.000.000 VNĐ | 03 cuốn | 14 ngày | Không chiết khấu |
| Thành viên Bạc (Silver) | Chi tiêu tích lũy từ 1.000.000 VNĐ đến dưới 3.000.000 VNĐ | 05 cuốn | 21 ngày | Giảm 5% hóa đơn mua sách |
| Thành viên Vàng (Gold) | Chi tiêu tích lũy từ 3.000.000 VNĐ trở lên | 08 cuốn | 30 ngày | Giảm 10% hóa đơn mua sách |

- Thời hạn thuê và giới hạn gia hạn:
  - Thời gian thuê tối thiểu: 01 ngày (tính tròn 24h từ thời điểm lập phiếu).
  - Chính sách gia hạn: Cho phép gia hạn tối đa 02 lần qua Zalo hoặc trực tiếp tại quầy, mỗi lần không quá 07 ngày, với điều kiện sách đó không có khách hàng khác đang đặt giữ chỗ và phiếu thuê chưa bị rơi vào trạng thái quá hạn.
- Chính sách Tiền đặt cọc:
  - Tiền cọc cơ sở: Tính bằng 70% giá trị bán tại cửa hàng.
  - Mức cọc tối thiểu cho 01 cuốn sách: 30.000 VNĐ.
- Điều kiện chặn thuê mới: Hệ thống tự động từ chối lập phiếu thuê mới cho khách hàng nếu:
  - Khách hàng đang có ít nhất 01 phiếu thuê ở trạng thái "Quá hạn".
  - Khách hàng có tiền phạt trễ hạn hoặc tiền bồi thường hư hại sách chưa thanh toán ở các giao dịch trước.
  - Tổng số sách yêu cầu thuê vượt quá hạn mức còn lại theo hạng thành viên.

## Ràng buộc Luồng Bán Sách
- Định giá và Ưu đãi thành viên:
  - Giá bán là đơn giá cố định của từng cuốn sách vật lý dựa trên tình trạng độ mới (Grade A: 100% -90 %, Grade B: 70-80% giá bìa, Grade C: 50-60% giá bìa, Grade D: 30-40% giá bìa, Sách hiếm định giá riêng).
  - Chiết khấu thành viên: Thành viên Bạc giảm 5%, Vàng giảm 10% trên tổng hóa đơn bán sách.
- Tính bất khả hoàn: Sách cũ bán ra là hàng hóa đã qua sử dụng và khách đã trực tiếp kiểm tra tại quầy. Hệ thống không áp dụng chính sách đổi trả hoàn tiền sau khi hóa đơn bán hàng đã thanh toán thành công, trừ trường hợp lỗi do nhân viên quét sai mã vạch được Quản lý xác nhận trong vòng 24h.

## Ràng buộc Luồng Trả Sách & Quyết Toán
- Xác thực mã vạch độc bản: Nhân viên bắt buộc phải quét đúng mã vạch dán trên gáy cuốn sách để hệ thống đối chiếu chính xác với danh sách bản sách trong Phiếu thuê ban đầu. Chặn thao tác trả sách nếu mã vạch không khớp.
- Quy tắc tính phí phạt trễ hạn:
  - Thời gian gia hạn miễn phạt: Cho phép trễ tối đa 02 giờ sau mốc giờ hẹn trả trên phiếu thuê mà không tính phạt.
  - Công thức tính phạt trễ hạn: Tiền phạt trễ = Số ngày trễ * (Đơn giá thuê theo ngày * Hệ số phạt 150%).
  - Ngày trễ được làm tròn lên (Ví dụ: trễ 2 giờ 1 phút sau thời gian gia hạn tính tròn 1 ngày trễ).
  - Trần tiền phạt trễ hạn tối đa: Tổng tiền phạt trễ hạn của một cuốn sách không được vượt quá 100% Giá trị sách (bằng đúng số tiền bán cuốn sách đó).
- Quy tắc khấu trừ tiền cọc:
  - Khi trả sách đúng hạn và nguyên vẹn: Hoàn trả 100% tiền cọc cho khách hàng.
  - Khi phát sinh phí phạt/hư hại: Hệ thống tự động cấn trừ vào số tiền cọc đã giữ. Nếu Cọc < Tổng phạt, yêu cầu thanh toán bổ sung phần chênh lệch.
  - Khách mua hàng quá 2 tháng chưa trả thì số điện thoại bị đánh dấu. SĐT bị đánh dấu không thể thuê hay nhận ưu đãi khi mua hàng.

## Ràng buộc Luồng Thu Mua Sách Cũ
- Định danh người bán bắt buộc: Thu mua sách cũ là giao dịch phát sinh chi tiền ra khỏi két cửa hàng. Bắt buộc phải có thông tin định danh người bán (Họ tên, Số điện thoại) để lập chứng từ thu mua và lưu vết nguồn gốc tài sản nhập kho.
- Xác thực thông tin thư mục (ISBN & Nhập thủ công):
  - Sách có ISBN gốc: Quét mã ISBN để tự động tra cứu thông tin nhằm điền tên sách, tác giả, NXB và giá bìa gốc.
  - Sách không có ISBN/Bìa hỏng: Tìm kiếm theo danh mục hệ thống; nếu là sách mới, nhân viên bắt buộc nhập thủ công Tên sách (kèm tập), Tác giả và Giá bìa ước tính.
- Quy tắc thẩm định chất lượng và Khung giá thu mua gợi ý:
  - Grade A (Mới 90% - 99%): Phẳng phiu, nguyên vẹn; giá thu mua gợi ý 35% - 45% giá bìa.
  - Grade B (Mới 70% - 89%): Giấy ngả vàng/sờn nhẹ, đủ trang ruột; giá thu mua gợi ý 20% - 30% giá bìa.
  - Grade C (Mới 50% - 69%): Cũ, ố vàng, có vết gạch chân nhẹ; giá thu mua gợi ý 10% - 15% giá bìa.
  - Grade D (Dưới 50%): Long gáy, dính nước, rách trang nghiêm trọng; cảnh báo từ chối thu mua hoặc thu mua giá phế liệu theo thỏa thuận riêng.
- Quy tắc phê duyệt vượt ngưỡng & Xử lý sách không đạt:
  - Nếu đơn giá thu mua thỏa thuận hoặc tổng giá trị phiếu thu mua vượt ngưỡng cấu hình hạn mức của thu ngân, hệ thống bắt buộc phải gửi yêu cầu phê duyệt tới Quản lý trước khi hoàn tất giao dịch.

## Ràng buộc Luồng Thanh Toán
- Phương thức thanh toán chấp nhận: Hệ thống chấp nhận Tiền mặt và Chuyển khoản ngân hàng qua QR động.
- Ràng buộc mã QR động: Mỗi giao dịch sinh mã QR riêng biệt kèm theo Số tiền chính xác và Nội dung chuyển khoản mã hóa chuẩn (Ví dụ: THUE 1024). Thời gian hết hạn của mã QR là 15 phút.
- Tính toàn vẹn giao dịch: Hóa đơn chỉ được chuyển trạng thái "Đã thanh toán" khi đã nhận được toàn bộ số tiền. Một giao dịch khi đã thành công sẽ bị đóng băng dữ liệu, không thể chỉnh sửa.

## Ràng buộc Luồng Quản Lý Kho & Kiểm Kê
- Định danh độc bản bắt buộc khi nhập kho: Mỗi cuốn sách vật lý bắt buộc phải được gắn một Barcode duy nhất. Nghiêm cấm gộp nhiều cuốn sách vật lý vào chung một mã quản lý.
- Ràng buộc ngưỡng tồn kho:
  - Ngưỡng tồn kho tối thiểu: Mặc định là 01 bản sách khả dụng/đầu sách. Khi đạt Min Stock, hệ thống kích hoạt cảnh báo vàng.
  - Ngưỡng hết hàng: Khi số lượng khả dụng = 0, hệ thống tự động ẩn nút "Bán" trên giao diện Web Portal.
- Ràng buộc kiểm kê định kỳ: Khi phiếu kiểm kê được tạo, các bản sách thuộc phạm vi kiểm kê sẽ bị khóa giao dịch xuất kho để tránh sai lệch số liệu.

## Ràng buộc Phân Quyền & Giám Sát
- Ràng buộc quyền hạn theo vai trò: Thu ngân chỉ được lập phiếu và thu tiền trong ca; Quản lý / Admin được duyệt nhập kho và áp dụng giảm giá ngoại lệ, có toàn quyền kỹ thuật.
- Bắt buộc ghi nhận Nhật ký hệ thống: Mọi thao tác hủy phiếu, chuyển trạng thái hư hỏng, giảm trừ tiền phạt thủ công đều phải lưu log kèm User ID, Timestamp và Lý do nghiệp vụ.;

## Ràng buộc Luồng Chia Ca, Chấm Công & Tính Lương
- Quy tắc phân công ca làm việc:
  - Chống trùng lặp ca: Hệ thống tự động chặn gán một nhân viên vào hai ca làm việc có thời gian đè chồng lên nhau trong cùng một ngày.
  - Giới hạn thời gian làm việc: Tổng số giờ làm việc phân công cho một nhân viên không vượt quá 48 giờ/tuần và tối đa 12 giờ/ngày để đảm bảo tuân thủ quy định lao động.
  - Đảm bảo nhân sự tối thiểu: Mỗi ca làm việc bắt buộc phải được gán đủ số lượng nhân sự tối thiểu theo cấu hình của ca trước khi công bố lịch chính thức.
- Quy tắc chấm công và ghi nhận giờ công:
  - Bắt buộc xác thực hai đầu: Nhân viên phải thực hiện cả hai thao tác Check-in (vào ca) và Check-out (ra ca). Trường hợp thiếu một trong hai thao tác, hệ thống sẽ đánh dấu là "Thiếu chấm công" và không tự động tính giờ công cho ca đó.
  - Bắt buộc giải trình và lưu log điều chỉnh: Mọi yêu cầu bổ sung/sửa đổi dữ liệu chấm công từ nhân viên hoặc quản lý đều phải đính kèm lý do nghiệp vụ cụ thể. Hệ thống bắt buộc lưu vết chi tiết (User ID, thời gian điều chỉnh, giá trị cũ/mới, lý do) vào nhật ký hệ thống.
- Quy tắc tính lương và chốt bảng công cuối kỳ:
  - Tính lương theo giờ/ca thực tế: Lương cơ bản = (Tổng số giờ/ca làm việc hợp lệ) × (Đơn giá lương theo giờ/ca đã thỏa thuận).
  - Khóa dữ liệu sau khi duyệt: Sau khi Quản lý/Admin xác nhận chốt bảng công và bảng lương kỳ đó, toàn bộ dữ liệu chấm công và lương của kỳ sẽ bị đóng băng (Lock). Mọi thao tác chỉnh sửa sau khi khóa bắt buộc phải có quyền Admin mở khóa và lưu log đặc biệt.