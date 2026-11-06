# Series Card Cover Flip Design

**Date:** 2026-11-06
**Status:** Approved 2026-11-06
**Feature:** `CAT-001` (UI màn hình `SCR-INV-10`, `/catalog/series`)
**Size:** Small change (frontend only)

## Intent

Trên trang danh sách bộ sách, nhân viên cần **nhận diện bộ sách thật nhanh qua ảnh bìa**. Hiện ảnh bìa nhỏ (96px), ảnh không đúng tỉ lệ bị cắt xấu, ô "Chưa có ảnh bìa" trông như lỗi, và chỉ có link nhỏ mới bấm được.

## Decisions (từ người dùng)

- Giữ card ngang, ảnh là bìa đứng 2:3; **không** trải ảnh ngang hết card.
- Chọn **mẫu C "chồng tập"**: bìa 112px, phía sau có 2 lớp gáy lệch gợi ý bộ nhiều tập.
- Khi rê chuột (và khi focus bằng bàn phím), bìa **lật mở quanh gáy trái khoảng 62°**, lộ trang bên trong màu trắng trơn (không vạch kẻ — người dùng yêu cầu 2026-11-06).
- **Ảnh lấp đầy khung bìa 2:3** (`object-cover`), neo ở cạnh trên (`object-top`) để phần bị cắt nằm ở dưới, ưu tiên không mất đầu nhân vật. Không dùng nền mờ. (Người dùng chỉnh lại 2026-11-06, thay cho phương án hiển thị toàn bộ ảnh.)

## Calls made by Claude (người dùng có thể sửa)

- Trang giấy bên trong ghi số tập hiện có (`titleCount`), ví dụ "2 tập".
- Cả card là một link tới danh sách đầu sách của bộ (`catalogPaths.titlesForSeries`); bỏ link "Xem N đầu sách →" riêng, giữ dòng chữ đó làm gợi ý trực quan bên trong card.
- Khi chưa có ảnh hoặc ảnh lỗi: dùng ô màu có chữ cái đầu như `CoverTile`.
- `prefers-reduced-motion`: không xoay bìa; card vẫn đổi viền khi hover/focus để báo trạng thái.
- Viền card đổi màu và có focus ring rõ khi focus bằng bàn phím.

## Approaches

1. **Chosen — Tailwind v4 utilities trong component riêng của feature.** Tạo `SeriesCoverStack` trong `src/features/catalog/components/`, dùng các utility 3D sẵn có của Tailwind v4 (`perspective-*`, `origin-left`, `rotate-y-*`, `backface-hidden`, `group-hover:`, `group-focus-visible:`, `motion-reduce:`). Không thêm CSS toàn cục, đúng quy tắc giữ code trong feature.
2. **Rejected — CSS riêng trong `index.css`.** Dễ viết keyframe/selector, nhưng tạo style toàn cục cho một chi tiết của một trang.
3. **Rejected — thư viện animation (framer-motion).** Thêm dependency cho một transition CSS đơn giản.

## Goals

- Bìa to hơn và rõ hơn, nhận diện nhanh.
- Hiệu ứng lật bìa mượt (~450ms), chỉ dùng `transform`.
- Truy cập được bằng bàn phím; tôn trọng giảm chuyển động.

## Non-goals

- Không đổi API/backend, không đổi dữ liệu.
- Không dùng transformation Cloudinary (ví dụ `g_auto`) ở bước này.
- Không sửa lỗi mô tả hiển thị nguyên chuỗi `<br>` (việc riêng).
- Không đổi trang đầu sách/ấn bản/bản sách.

## Anti-goals

- Ảnh trải ngang toàn card hoặc làm card mất cân đối.
- Hiệu ứng là cách duy nhất báo trạng thái hover/focus.

## Verification

- `bun run test`, `bun run lint`, `bun run build` pass.
- Kiểm tra trực quan trên `/catalog/series`: có ảnh, không ảnh, ảnh lỗi; hover và Tab.

## Left to the builder

Giá trị chính xác của bóng, màu trang giấy và khoảng lệch lớp gáy, miễn là bám theo mockup `series-card-flip-v2.html` (lựa chọn 2).
