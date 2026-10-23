# Đặc tả cấp dự án: Old Bookstore

**Trạng thái:** Proposed — chờ rà soát toàn bộ tài liệu mới  
**Cập nhật:** 2026-10-20

## Objective

Xây dựng hệ thống web nội bộ cho một cửa hàng vật lý bán sách cũ và cho thuê sách/truyện tranh. Hệ thống phải quản lý được từng bản sách vật lý, chuẩn hóa các giao dịch tại quầy, kiểm soát nhân sự và cung cấp dấu vết đầy đủ cho tồn kho và dòng tiền.

Người dùng trực tiếp chỉ gồm Admin, Nhân viên và Quản lý kho. Khách hàng không đăng nhập và không thao tác trên hệ thống.

## Tech Stack

### Đã quan sát trong repository

- Frontend: React 19, TypeScript, Vite, Tailwind CSS và Bun.
- Backend hiện có: ASP.NET Core trên .NET 10, Entity Framework Core và PostgreSQL provider.
- Cơ sở dữ liệu chính thức: PostgreSQL theo [`ADR-001`](./decisions/ADR-001-postgresql-primary-database.md).

### Chưa được chấp thuận

README gốc yêu cầu Hono trong khi mã nguồn hiện tại dùng ASP.NET Core; lựa chọn backend vẫn mở tại `OQ-001` trong [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md). PostgreSQL đã được chốt; phần nghiệp vụ trong bộ tài liệu này không phụ thuộc vào lựa chọn backend.

## Commands

Các lệnh dưới đây phản ánh mã nguồn hiện tại, không phải quyết định kiến trúc cuối cùng.

```bash
# Frontend
cd app/frontend && bun install
cd app/frontend && bun run dev
cd app/frontend && bun run lint
cd app/frontend && bun run build

# Backend ASP.NET Core hiện tại
dotnet restore backend.sln
dotnet build backend.sln
dotnet run --project app/backend/backend.csproj
dotnet test backend.sln
```

Hiện chưa có script kiểm thử frontend. Backend đã có project xUnit `app/backend.Tests`, nhưng Phase 01 vẫn phải chuẩn hóa lệnh kiểm thử và môi trường database test trước khi triển khai tính năng nghiệp vụ.

## Project Structure

```text
app/frontend/   # Giao diện POS và quản trị nội bộ
app/backend/    # Backend hiện tại; công nghệ cuối cùng còn chờ ADR
docs/           # Nguồn sự thật cho SDD
docs/specs/     # Đặc tả tính năng được tạo ở bước Specify tiếp theo
docs/decisions/ # Product/architecture decision records
docs/plans/     # Implementation plan, task tracker và checkpoint
```

## Code Style

- Dùng tên miền nghiệp vụ đầy đủ: `bookTitle`, `bookEdition`, `bookCopy`, `copyBarcode`, `rentalAgreement`, `cashierShift`; không dùng tên mơ hồ như `item`, `data`, `record` khi có khái niệm chính xác hơn.
- Tiền được biểu diễn bằng số nguyên VNĐ hoặc kiểu decimal phía server; không dùng floating point.
- Quyền và trạng thái phải được kiểm tra ở backend; frontend chỉ phản ánh khả năng thao tác.
- Hàm nghiệp vụ phải thể hiện ý định và từ chối trạng thái không hợp lệ.

```ts
type BookCopyStatus = "available" | "rented" | "sold" | "damaged" | "lost";

function canStartTransaction(status: BookCopyStatus): boolean {
  return status === "available";
}
```

## Testing Strategy

- Unit test: công thức giá, chiết khấu, cọc, phí thuê, phạt, lương và chuyển trạng thái.
- Integration test: persistence, transaction, khóa đồng thời, RBAC, webhook và idempotency.
- Contract test: VietQR/webhook ngân hàng, Zalo và Google Books/Open Library.
- End-to-end test: bán sách, thuê–trả, thu mua, kiểm kê, đóng két và chốt lương.
- UAT: chạy bằng dữ liệu mẫu tại quầy với ba vai trò thật.
- Ngưỡng coverage và công cụ kiểm thử cụ thể còn `Open` cho tới khi kiến trúc được chốt.

Chi tiết tại [`requirements/QUALITY.md`](./requirements/QUALITY.md).

## Boundaries

### Always

- Gắn mọi khoản thu/chi với chứng từ nguồn và người thực hiện.
- Kiểm tra quyền và trạng thái ở server.
- Dùng transaction/idempotency cho thao tác tài chính và webhook.
- Cập nhật đặc tả trước khi thay đổi hành vi nghiệp vụ.
- Giữ lịch sử thay đổi nhạy cảm.

### Ask first

- Thay đổi schema hoặc vòng đời dữ liệu đã được chấp thuận.
- Thêm dependency hoặc nhà cung cấp tích hợp.
- Thay đổi công thức tiền, quyền phê duyệt hay chính sách thành viên.
- Thay đổi CI/CD, hạ tầng hoặc công nghệ backend.

### Never

- Commit secret, OTP đọc được, access token hoặc connection string thật.
- Xóa/sửa trực tiếp giao dịch tài chính đã hoàn tất.
- Dùng tài liệu trong `legacy/` làm yêu cầu triển khai.
- Mở giao diện hoặc API tự phục vụ cho khách hàng trong MVP.
- Bỏ qua test đang thất bại để hoàn tất tính năng.

## Success Criteria

- Mỗi đầu sách/tập có thể có nhiều ấn bản; mỗi bản vật lý liên kết đúng một ấn bản.
- ISBN là thuộc tính tùy chọn của ấn bản, không phải định danh của bản vật lý và không tự cung cấp thông tin lần tái bản.
- Mỗi bản sách vật lý có CopyBarcode duy nhất và một trạng thái hợp lệ.
- Không thể bán/cho thuê một bản sách đang bị giữ bởi giao dịch khác.
- Mọi giao dịch tài chính đã hoàn tất có thể truy ngược tới chứng từ, nhân viên và ca liên quan.
- Ba vai trò chỉ truy cập đúng chức năng; mọi ngoại lệ nhạy cảm cần Admin phê duyệt.
- Các luồng bán, thuê–trả, thu mua, kho, két, nhân sự và lương vượt qua UAT.
- Lỗi tích hợp bên ngoài có fallback được quy định và không làm mất giao dịch nội bộ.
- Không còn mâu thuẫn chưa được đánh dấu giữa các tài liệu hoạt động.

## Open Questions

Các quyết định chưa chốt được quản lý tập trung tại [`OPEN_QUESTIONS.md`](./OPEN_QUESTIONS.md). Không được ngầm chọn giá trị cho những mục này trong code hoặc test.
