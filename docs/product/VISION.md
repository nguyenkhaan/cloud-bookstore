# Tầm nhìn sản phẩm

**Trạng thái:** Accepted

## Problem Statement

Làm thế nào để một cửa hàng sách vật lý duy nhất quản lý chính xác từng bản sách, mọi giao dịch tại quầy và trách nhiệm của nhân viên, mà không phụ thuộc vào ghi chép rời rạc hoặc trí nhớ của người vận hành?

## Bối cảnh

Cửa hàng đồng thời bán sách cũ, cho thuê sách/truyện tranh, thu mua sách từ khách và nhập sách từ nhà cung cấp. Một đầu sách có thể có nhiều ấn bản; mỗi ấn bản có nhiều bản vật lý với giá, tình trạng và vòng đời khác nhau. Tiền mặt trong két vừa có khoản thu vừa có khoản chi, nên sai lệch ở sách hoặc chứng từ dễ dẫn đến sai lệch dòng tiền.

## Người dùng

- Admin điều hành, cấu hình và phê duyệt ngoại lệ.
- Nhân viên đứng tại quầy thực hiện giao dịch và vận hành ca thu ngân.
- Quản lý kho quản lý danh mục, nhập/xuất, Barcode ISBN/`CopyBarcode` và kiểm kê.
- Khách hàng là đối tượng nghiệp vụ, không phải người dùng hệ thống.

## Giá trị cốt lõi

- Truy vết vòng đời của từng bản sách vật lý.
- Chuẩn hóa bán, thuê–trả, thu mua, nhập kho và thanh toán.
- Ngăn xung đột trạng thái và giảm sai sót trong tính tiền.
- Truy ngược mọi khoản thu/chi tới chứng từ, nhân viên và ca.
- Hỗ trợ đầy đủ vận hành nhân sự, chấm công và lương trong cùng hệ thống.
- Duy trì hoạt động tại quầy khi tích hợp bên ngoài tạm thời lỗi.

## Kết quả thành công

Sản phẩm thành công khi nhân viên có thể hoàn thành toàn bộ công việc tại cửa hàng trên một hệ thống, Admin đối soát được sách–tiền–người thực hiện, và không cần một giao diện tự phục vụ dành cho khách hàng.

Các mục tiêu định lượng về tốc độ giao dịch, sai lệch kho/két, uptime và độ bao phủ kiểm thử phải được chốt trong `OQ-015` trước UAT.
