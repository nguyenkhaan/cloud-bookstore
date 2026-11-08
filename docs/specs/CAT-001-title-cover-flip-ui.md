# Spec: CAT-001 — Hiệu ứng bìa lật cho danh sách Đầu sách

## Status

Accepted

## Objective

Làm bìa của mỗi Đầu sách tại `/catalog/titles` có cảm giác là một cuốn sách vật lý: hover hoặc focus lật bìa quanh gáy và để lộ phần trang có độ dày, nhất quán với hiệu ứng đã có ở danh sách Bộ sách.

## References

- Feature `CAT-001`, `CAT-003`
- Rule `BR-CAT-001`
- `PDR-005` — Book hierarchy
- `SeriesCoverStack` — chuẩn chuyển động và reduced-motion hiện có

## Preconditions

- Danh sách Đầu sách đã có `coverImageUrl` và `name`.

## Main Flow

1. Mỗi dòng dùng một title-cover component thay cho `CoverTile`.
2. Hover vào dòng hoặc focus liên kết tiêu đề làm bìa lật 62° quanh mép trái.
3. Phần sau bìa hiển thị trang trắng cùng các lớp mép giấy để gợi độ dày.
4. Khi reduced motion được bật, bìa giữ nguyên, không lật.

## Acceptance Criteria

- Given một ảnh bìa hợp lệ, when hover/focus dòng đầu sách, then bìa xoay mở quanh gáy và ảnh giữ `object-cover object-top`.
- Given không có ảnh hoặc ảnh lỗi, when hiển thị, then fallback chữ cái đầu vẫn có cấu trúc bìa sách.
- Given người dùng bật reduced motion, then không có phép quay bìa.
- Giao diện chỉ thay đổi phần minh họa bìa ở dòng Đầu sách; không đổi layout hay hành vi danh mục khác.

## Non-functional Requirements

- Lớp trang và bìa trang trí bị ẩn khỏi screen reader; ảnh có alt text.
- Không thêm dependency hoặc animation JavaScript.

## Open Questions

Không có câu hỏi P0 ảnh hưởng lát cắt này.
