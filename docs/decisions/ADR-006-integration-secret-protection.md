# ADR-006: Bảo vệ khóa tích hợp bằng Data Protection

## Status
Accepted — người dùng chốt trong phiên sửa lỗi ngày 2026-11-20.

## Date
2026-11-20

## Context
Cấu hình tích hợp có API key, signing secret, access token và mật khẩu SMTP. Lưu hoặc trả lại các giá trị này dưới dạng văn bản gốc làm lộ thông tin xác thực qua database và API cấu hình.

## Decision
- Dùng ASP.NET Core Data Protection để mã hóa cấu hình có secret trước khi lưu database.
- GET và response sau cập nhật chỉ trả giá trị che cho secret đã thiết lập.
- Bỏ trống hoặc gửi lại giá trị che giữ nguyên secret cũ; nhập giá trị mới để thay thế.
- Khi dữ liệu đã mã hóa không giải mã được, trả lỗi và không lưu đè bằng cấu hình mặc định.
- Bộ khóa Data Protection phải được lưu bền và sao lưu cùng quy trình vận hành. Các instance cùng dùng cấu hình mã hóa phải chia sẻ bộ khóa và application discriminator.

## Alternatives Considered
Kho secret chuyên dụng chưa được chọn vì dự án chưa có hạ tầng này. Không lưu khóa mã hóa trong cùng bản ghi cấu hình hoặc source control.

## Consequences
- Response cấu hình không còn cho phép đọc lại secret gốc.
- Mất bộ khóa hoặc thay application discriminator sẽ làm cấu hình đã mã hóa không thể sử dụng được; phải khôi phục khóa trước khi chỉnh sửa.
- Dữ liệu cũ dạng plaintext cần được chuyển sang mã hóa khi lưu lại; backup cũ vẫn phải được bảo vệ.
- Nhật ký thay đổi không được ghi secret dạng plaintext.

## Affected Artifacts
`CONFIG-001`, `CONFIG-002`, `SystemSettingsService`, đăng ký Data Protection trong `Program.cs`, form tích hợp và [hướng dẫn vận hành](../guides/settings-secrets.md).
