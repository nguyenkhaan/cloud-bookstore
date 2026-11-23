# Shared SelectBox Design

**Date:** 2026-11-06
**Status:** Approved 2026-11-06
**Size:** Small–medium (frontend only)

## Intent

Các ô chọn trong frontend đang là `<select>` gốc của trình duyệt, nhìn cổ điển và lệch với theme. Người dùng muốn một component `SelectBox` dùng chung: danh sách xổ xuống hiện đại, hợp theme, có ô tìm kiếm nhỏ bên trong để lọc nhanh khi gõ. Sau đó thay mọi `<select>` sang component này **mà không đổi logic API hay flow**, và thêm một ô chọn "Dòng phiếu nhập" (ReceiptLineId) làm chỗ giữ giao diện trong dialog tạo bản sách vật lý.

## Decisions (từ người dùng)

- Tự viết bằng React + Tailwind (phương án A), không thêm thư viện.
- Kiểu danh sách **mẫu A "tối giản, nền sáng"**: ô tìm sát mép trên; mục đang trỏ nền indigo rất nhạt; mục đã chọn chữ đậm + dấu ✓; phần chữ khớp từ khoá được tô nhẹ; chân danh sách hiện số kết quả và gợi ý phím.
- Ô ReceiptLineId **chưa có lựa chọn nào**, chỉ đại diện giao diện; sẽ chỉnh sau phase 05.
- Thay 4 `<select>` hiện có: lọc bộ sách (`TitleListPage`), thuộc bộ sách (`TitleEditorDialog`), kênh sử dụng và tình trạng (`CopyEditorDialog`). Giá trị, callback và payload giữ nguyên.

## Approaches

1. **Chosen — tự viết** theo mẫu ARIA combobox + listbox, portal ra `document.body` với vị trí `fixed` tính từ ô chọn. Không thêm dependency, khớp theme, dùng `lucide-react` sẵn có.
2. Rejected — Headless UI Combobox: thêm dependency; mô hình gõ thẳng vào ô chọn phải bẻ lại để có ô tìm trong danh sách.
3. Rejected — Radix Select + cmdk: thêm 2–3 dependency, không hơn (2).

## Component

- Vị trí: `src/components/common/SelectBox/` (dùng chung toàn app), export qua `@/components/common`.
- API: `SelectBox<T extends string>({ label, value, options, onChange, placeholder?, searchPlaceholder?, emptyMessage?, emptyHint?, disabled?, className? })`, `options: { value: T; label: string }[]`.
- Vỏ ô chọn giống `TextField`: nhãn nhỏ phía trên, `rounded-xl`, viền slate, focus indigo ring.
- Danh sách: portal, `fixed`, bám theo ô chọn khi cuộn/đổi kích thước; tự lật lên trên khi thiếu chỗ phía dưới; rộng bằng ô chọn; cao tối đa ~240px có cuộn.
- Tìm kiếm: lọc theo nhãn, không phân biệt hoa/thường **và dấu tiếng Việt** (gõ "ky" khớp "Kỳ"); luôn hiển thị.
- Bàn phím: trên ô chọn `Enter`/`Space`/`↓`/`↑` mở; trong danh sách `↑`/`↓` di chuyển, `Home`/`End`, `Enter` chọn, `Esc` đóng (không đóng dialog chứa nó), `Tab` đóng. Focus trở về ô chọn sau khi chọn/đóng.
- Chuột: bấm ra ngoài thì đóng.
- ARIA: nút ô chọn `aria-haspopup="listbox"`, `aria-expanded`; ô tìm `role="combobox"` + `aria-controls` + `aria-activedescendant`; danh sách `role="listbox"`; mục `role="option"` + `aria-selected`; số kết quả trong live region.
- Rỗng: không có lựa chọn → hiện `emptyMessage` + `emptyHint`; tìm không thấy → "Không tìm thấy kết quả phù hợp".
- `prefers-reduced-motion`: không animation mở/đóng.

## Calls made by Claude (người dùng có thể sửa)

- Ô ReceiptLineId đặt trong `CopyEditorDialog`, nhãn "Dòng phiếu nhập", options rỗng, giá trị **không gửi lên API** (giữ nguyên payload hiện tại); thông báo rỗng "Chưa có dòng phiếu nhập nào." + gợi ý "Sẽ có khi hoàn tất luồng nhập kho (phase 05)."
- Ô tìm luôn hiện, kể cả danh sách ngắn (kênh, tình trạng), cho đồng nhất.

## Non-goals

- Không sửa lỗi "ReceiptLineId không hợp lệ" khi tạo bản sách (cần phase 05).
- Không thêm API, không đổi contract, không chọn nhiều giá trị.

## Verification

- Test hành vi component (lọc có/không dấu, chọn bằng phím, Esc không đóng dialog, rỗng) bằng Node test runner hiện có.
- `bun run test`, `bun run lint`, `bun run build` pass.
- Kiểm tra trên trình duyệt: chuột, bàn phím, trong dialog (không bị cắt), trang danh sách đầu sách.
