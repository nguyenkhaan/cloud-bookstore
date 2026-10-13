# PRODUCT REQUIREMENTS DOCUMENT

> **Sản phẩm:** Hệ thống cửa hàng bán sách cũ và cho thuê truyện tranh
> **Phạm vi:** Một cửa hàng vật lý, giao dịch trực tiếp tại quầy
> **Ngôn ngữ:** Tiếng Việt

PRD đầy đủ được tách thành hai tài liệu để dễ đọc và bảo trì:

- [PRD – Nghiệp vụ cốt lõi](./prd-nghiep-vu-cot-loi.md): mục 2–16.
- [PRD – Vận hành nội bộ và quy tắc hệ thống](./prd-van-hanh-va-he-thong.md): mục 17–25 và 31.

Hai tài liệu trên hợp thành PRD chính thức. Khi có khác biệt, thứ tự ưu tiên là: quyết định đã xác nhận trong quá trình làm rõ yêu cầu → hai PRD chi tiết → `meeting.md` → `requirement.md`. Mọi nội dung chưa chốt phải mang nhãn **[TBD - Unconfirmed]**.

## 2. Tóm tắt sản phẩm

Đây là web app nội bộ cho một cửa hàng vật lý chuyên bán sách cũ, cho thuê sách/truyện tranh và thu mua sách cũ. Nhân viên thao tác qua POS và trang quản trị; khách hàng không đăng nhập hệ thống trong MVP.

Mọi hoạt động mua, bán, thuê, trả, thanh toán, nhập kho và kiểm kê diễn ra tại quầy. Mỗi bản sách vật lý có barcode, tình trạng, giá và vòng đời riêng.

## 3. Mục tiêu và tiêu chí thành công

Sản phẩm phải giảm sai lệch kho và dòng tiền, chuẩn hóa nghiệp vụ, tăng khả năng truy vết và cung cấp dữ liệu đáng tin cậy cho quản lý. Mục tiêu định lượng cụ thể là **[TBD - Unconfirmed]**.

## 4. Phạm vi sản phẩm

MVP gồm POS/trang quản trị React, REST API ASP.NET Core, tài khoản nhân viên và RBAC, quản lý sách/kho, thu mua, bán, thuê/trả, khách hàng, VietQR, két tiền, nhân sự, lương, thông báo và báo cáo.

Không thuộc MVP: thương mại điện tử, giao hàng, đặt trước/giữ chỗ, tài khoản khách hàng, đa chi nhánh, vận hành điểm tích lũy, tự động chuyển tiền ra và tự động nộp thuế.

## 5. Người dùng và các bên liên quan

Người dùng nội bộ gồm Admin gốc, Admin được cấp quyền, Quản lý, Thu ngân, Nhân viên kho và Nhân viên. Khách hàng chỉ có hồ sơ nghiệp vụ. Tích hợp ngoài gồm ngân hàng/VietQR, Google Books hoặc Open Library, email và Zalo.

## 6. Thuật ngữ và mô hình nghiệp vụ

Mô hình sách gồm Bộ sách → Đầu sách/tập → Bản sách vật lý. Giá dùng để tính cọc và trần phạt là giá bán thực tế của từng bản, không phải giá bìa chung.

## 7. Kiến trúc chức năng tổng quan

Frontend chỉ phục vụ nội bộ. Backend kiểm tra quyền và quy tắc tại API. Dữ liệu được lưu trong cơ sở dữ liệu quan hệ; hệ quản trị cụ thể là **[TBD - Unconfirmed]**.

## 8. Tài khoản, xác thực và phân quyền

Hệ thống seed một Admin gốc không thể bị hạ quyền. Admin khai báo trước email nhân viên bằng API; nhân viên tự đăng ký bằng email đã được phép và xác thực OTP. Quyền được quản lý bằng RBAC và thao tác nhạy cảm phải có nhật ký.

## 9. Quản lý danh mục và sách

Hệ thống quản lý danh mục, bộ sách, đầu sách/tập và từng bản vật lý. Metadata được tra cứu bằng ISBN qua Google Books/Open Library hoặc nhập thủ công. Mỗi bản có barcode riêng.

## 10. Quản lý nhà cung cấp và kho

Phạm vi gồm nhà cung cấp, nhập/xuất kho, kiểm kê, điều chỉnh có phê duyệt, lịch sử biến động và cảnh báo tồn kho.

## 11. Thu mua sách cũ từ khách hàng

Nhân viên định danh người bán, tra cứu/nhập sách, thẩm định Grade, đề xuất giá, xin duyệt khi vượt hạn mức, chi tiền và tạo từng bản vật lý trong kho.

## 12. Bán sách tại quầy

Chỉ bản Khả dụng được bán. Sách đã thanh toán không được đổi trả thông thường. Ngoại lệ duy nhất là quét nhầm barcode được Quản lý xác nhận trong 24 giờ và xử lý bằng giao dịch đảo có nhật ký.

## 13. Cho thuê sách

Tiền cọc bằng 100% tổng giá bán thực tế của các bản và không giảm theo hạng. Phí thuê được thu lúc trả sách. Hạn thuê và số bản được thuê phụ thuộc hạng.

`Phí thuê = Tổng (đơn giá thuê/ngày của từng bản × số ngày thuê thực tế) × (1 − tỷ lệ giảm theo hạng)`

## 14. Trả sách và quyết toán phiếu thuê

Khách trả toàn bộ sách trên phiếu cùng lúc. Hệ thống tính phí thuê, gia hạn, phạt quá hạn và hư hỏng rồi khấu trừ vào cọc. Mất sách đồng nghĩa cửa hàng giữ toàn bộ cọc của bản đó.

Quá hạn được miễn phạt hai giờ; sau đó làm tròn lên theo ngày, mỗi ngày phạt 150% đơn giá thuê/ngày và tổng phạt không vượt giá bán của bản.

## 15. Khách hàng và hạng thành viên

Hạng được tự động nâng hoặc hạ theo tổng chi tiêu hợp lệ. Chỉ tính tiền mua sách, phí thuê và phí gia hạn; không tính cọc, phạt, bồi thường hoặc tiền cửa hàng chi thu mua. Điểm tích lũy không vận hành trong MVP.

## 16. Thanh toán và dòng tiền giao dịch

Hệ thống hỗ trợ tiền mặt và VietQR. QR riêng cho từng giao dịch, hết hạn sau 15 phút và được xác nhận bằng API/webhook ngân hàng. API chỉ xác nhận tiền vào; mọi khoản chuyển tiền ra được thực hiện bên ngoài rồi ghi nhận chứng từ.

## 17. Quản lý ca thu ngân và két tiền

Ca thu ngân ghi nhận tiền đầu ca, thu/chi, số dư lý thuyết, tiền kiểm đếm, chênh lệch, giải trình và bàn giao.

## 18. Nhân viên, lịch làm và chấm công

Hệ thống quản lý hồ sơ, ca làm, lịch, nghỉ/đổi ca, check-in/check-out, giải trình và bảng công. Không xếp trùng ca; tối đa 12 giờ/ngày và 48 giờ/tuần.

## 19. Quản lý lương

Hệ thống tính, duyệt, khóa và ghi nhận chi trả lương nhưng không tự động chuyển tiền qua API ngân hàng.

## 20. Yêu cầu và báo cáo của khách hàng

MVP chỉ có một bảng dữ liệu và API CRUD cơ bản; không lưu nguồn tiếp nhận và không xây workflow ticket nhiều bước.

## 21. Thông báo

Khách nhận Zalo. Nhân viên nhận thông báo nội bộ và email. Không sử dụng Firebase Cloud Messaging.

## 22. Báo cáo và thống kê

Hệ thống báo cáo bán, thuê, thu mua, kho, doanh thu, chi phí, nhân sự, lương và két. Dữ liệu thuế được tổng hợp theo tháng/quý và xuất Excel/PDF; hệ thống không nộp thuế tự động.

## 23. Cấu hình hệ thống

Đơn giá, tỷ lệ, hạn mức và ngưỡng nghiệp vụ phải cấu hình được và lưu lịch sử. Cấu hình mới không viết lại giao dịch cũ.

## 24. Quy tắc trạng thái và tính toàn vẹn dữ liệu

Mỗi bản sách và chứng từ có vòng đời rõ ràng. Dữ liệu đã hoàn tất không bị sửa/xóa trực tiếp; sửa sai dùng giao dịch đảo hoặc điều chỉnh có thể truy vết.

## 25. Ngoại lệ và tình huống lỗi

Hai PRD chi tiết quy định cách xử lý sách không ISBN, API ngoài lỗi, barcode sai, webhook trùng/đến muộn, thanh toán sai lệch, mất kết nối, cọc không đủ, chênh lệch kho/két và thao tác đồng thời.

## 31. Nội dung chưa xác nhận

Danh sách đầy đủ nằm tại [Mục 31 – PRD vận hành](./prd-van-hanh-va-he-thong.md#31-nội-dung-chưa-xác-nhận), gồm các nhóm chính:

- Thời hạn OTP và chính sách mật khẩu.
- Đơn giá thuê, tỷ lệ giảm và quy tắc làm tròn.
- Một số điều kiện gia hạn và hoàn cọc.
- Mức phạt hư hỏng và hạn mức thu mua.
- Chi tiết chấm công và lương.
- Nhà cung cấp VietQR, chữ ký webhook và đối soát sai lệch.
- Cách tích hợp Zalo và mẫu báo cáo.
- Trường dữ liệu cuối cùng của module yêu cầu khách hàng.
