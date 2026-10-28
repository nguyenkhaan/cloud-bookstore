# Database Model Reconciliation Design

## Intent

Đồng bộ mô hình EF Core backend với `docs/DATABASE.txt` để một database trống có thể được dựng bằng chuỗi migration hiện tại, migration tăng dần mới và dữ liệu seed mới. `EmployeeModel` cùng ba cột phục vụ auth hiện tại được giữ nguyên vì code đăng nhập đang phụ thuộc trực tiếp vào chúng.

## Goals

- Thêm `BookSeriesModel` và biểu diễn đúng chuỗi `book_series → titles → edition → book_copies`.
- Đồng bộ thuộc tính, kiểu CLR, nullability và độ dài của tất cả model ngoài `EmployeeModel` với `DATABASE.txt`.
- Xóa `EditionModel.DefaultRentPrice`; thêm `BookCopyModel.RentalRate`.
- Cấu hình table mapping, enum conversion, khóa ngoại, unique constraint và index được mô tả trong `DATABASE.txt` bằng Fluent API.
- Tạo một migration tăng dần mới; giữ nguyên toàn bộ migration cũ.
- Cập nhật `data.json` thành bộ dữ liệu nhất quán, có bộ sách, sách độc lập, nhiều ấn bản của một đầu sách và nhiều bản vật lý của một ấn bản.
- Cập nhật `Seed.cs` để nhận bảng mới, seed theo thứ tự phụ thuộc và thất bại rõ ràng khi dữ liệu không hợp lệ.

## Non-goals

- Không thay đổi `EmployeeModel` hoặc hành vi auth.
- Không xóa, gộp hoặc viết lại migration cũ.
- Không drop database ở local hay production.
- Không xây API/DTO/service quản lý catalog trong thay đổi này.
- Không đổi toàn bộ tên cột vật lý từ PascalCase sang snake_case; tên bảng tiếp tục theo `DATABASE.txt` và convention hiện tại.

## Selected Approach

Sử dụng migration tăng dần. Các model giữ tên property hiện tại khi cùng một khái niệm nghiệp vụ; chỉ đổi kiểu/nullability/độ dài hoặc thêm, xóa property khi `DATABASE.txt` yêu cầu. Quan hệ được cấu hình trong `AppDbContext` mà không thêm navigation property nếu code hiện tại không cần, giúp diff nhỏ và tránh tạo API object graph ngoài phạm vi.

Phương án tạo lại baseline migration bị loại vì làm mất lịch sử và không cần thiết để dựng database trống. Phương án chỉ sửa bốn model catalog bị loại vì yêu cầu đã xác nhận bao gồm các model còn lại đang lệch schema.

## Model and Context Design

- `BookSeriesModel`: `Id`, `Name`, `Description`, `IsActive`, `CreatedAt`.
- `TitleModel`: thêm `SeriesId`, `IsActive`; `SeriesId` nullable cho sách độc lập.
- `EditionModel`: bỏ `DefaultRentPrice`; giữ ISBN nullable và non-unique, có index.
- `BookCopyModel`: thêm `RentalRate` nullable; `CopyBarcode` unique.
- Các model ngoài `EmployeeModel`: khớp kiểu dữ liệu, optional/required và max length theo `DATABASE.txt`, trong đó tiền dùng `long`, `smallint` dùng `short`, và phần trăm dùng `decimal(5,2)`.
- `AppDbContext`: thêm `DbSet<BookSeriesModel>`, table mapping `book_series`, các quan hệ catalog bắt buộc/tùy chọn, self-reference của category, cùng các foreign key nghiệp vụ còn lại có thể xác định trực tiếp từ cột `...Id`.
- Các index thường, unique và partial index trong `DATABASE.txt` được biểu diễn bằng Fluent API/Npgsql khi EF Core hỗ trợ trực tiếp.
- Hành vi xóa mặc định là `Restrict`/`NoAction` cho dữ liệu nghiệp vụ nhằm tránh cascade-delete lịch sử giao dịch; quan hệ cây category cũng không cascade.

## Migration Design

Migration mới được sinh từ model snapshot sau khi model và context đã đổi. Migration phải thêm `book_series`, thêm foreign key/index cần thiết, thêm/xóa/đổi kiểu cột bị lệch và cập nhật snapshot. Vì production sẽ được drop thủ công, migration vẫn phải chạy thành công trên database trống qua toàn bộ lịch sử; không thực hiện thao tác drop database trong repo hoặc lệnh bàn giao.

## Seed Design

- Giữ UUID cố định để các bảng tham chiếu ổn định và seed lặp lại không nhân đôi dữ liệu.
- Bổ sung `book_series` trước `titles` trong JSON và allowlist.
- Dữ liệu catalog bao phủ: một series nhiều tập, một sách độc lập, một đầu sách nhiều ấn bản, ISBN nullable hoặc trùng hợp lệ, và nhiều copy barcode duy nhất trên cùng ấn bản.
- Loại `DefaultRentPrice` khỏi edition và thêm `RentalRate` ở từng book copy phù hợp với kênh thuê.
- Seed chạy migration trước, kiểm tra tên bảng, dùng một transaction và chèn theo thứ tự JSON. Lỗi foreign key hoặc kiểu dữ liệu rollback toàn bộ seed.
- `ON CONFLICT DO NOTHING` tiếp tục đảm bảo chạy lại an toàn; seed không ghi đè dữ liệu production đã tồn tại.

## Verification

- Test metadata EF Core xác nhận entity, property, nullability, max length, index và quan hệ chính.
- Test parser/validation seed xác nhận bảng mới được chấp nhận và dữ liệu catalog tham chiếu hợp lệ.
- Sinh migration và kiểm tra không có thay đổi model chưa được migration hóa bằng `dotnet ef migrations has-pending-model-changes`.
- Chạy `dotnet build backend.sln --no-restore` và `dotnet test backend.sln --no-build --no-restore`.
- Khi có PostgreSQL khả dụng, dựng database tạm từ migration và chạy seed; nếu môi trường không có database, ghi rõ phần kiểm chứng tích hợp chưa thực hiện.

## Production Handoff

Bàn giao lệnh restore tool/dependencies nếu cần, áp dụng migration bằng connection string production, rồi chạy ứng dụng với `--seed`. Không cung cấp hoặc chạy lệnh drop database; người dùng tự thực hiện bước đó như đã nêu.

## Risks

- Việc thêm toàn bộ foreign key có thể phát hiện seed cũ không nhất quán; seed mới phải được kiểm tra trước khi tạo migration cuối.
- Các migration auth viết tay phải tiếp tục nằm trong chuỗi và snapshot mới phải giữ ba cột auth.
- `ON CONFLICT DO NOTHING` không cập nhật seed đã có; điều này phù hợp production trống, nhưng môi trường đã seed muốn nhận dữ liệu mới cần được reset hoặc xử lý riêng.
