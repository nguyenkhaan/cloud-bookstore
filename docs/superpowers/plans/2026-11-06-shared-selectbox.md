# Shared SelectBox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Component `SelectBox` dùng chung (danh sách hiện đại mẫu A, có ô tìm kiếm) thay cho 4 `<select>` gốc, cộng ô "Dòng phiếu nhập" rỗng trong dialog tạo bản sách.

**Architecture:** Logic thuần (chuẩn hoá chữ bỏ dấu, lọc, tô khớp, điều hướng phím) nằm trong `selectBox.utils.ts` để test hành vi bằng Node. Component `SelectBox.tsx` chỉ nối logic đó với DOM: nút ô chọn + danh sách portal `fixed` ra `document.body`. Các trang chỉ đổi markup, giữ nguyên state/callback/payload.

**Tech Stack:** React 19, TypeScript, Tailwind v4, `lucide-react` (đã có), `react-dom` `createPortal`, Node test runner + Vite `ssrLoadModule`.

**Spec:** `docs/superpowers/specs/2026-11-06-shared-selectbox-design.md`

## Global Constraints

- Không thêm dependency; không CSS toàn cục.
- Không đổi API, contract, payload, giá trị hay callback của các ô chọn được thay.
- Ô ReceiptLineId: `options=[]`, giá trị **không** gửi lên API.
- Copy: rỗng "Chưa có dòng phiếu nhập nào." + "Sẽ có khi hoàn tất luồng nhập kho (phase 05)."; tìm không thấy "Không tìm thấy kết quả phù hợp".
- **Không commit** — người dùng tự commit.

## Review Focus

- Gõ không dấu khớp có dấu và cả "đ"/"Đ" (NFD không tách "đ") → test `normalizeSearchText('Đắc Nhân Tâm') === 'dac nhan tam'` (Task 1).
- Danh sách rỗng hoặc lọc ra 0 mục: phím ↑/↓/Enter không lỗi, không chọn gì → test `moveActiveIndex` với `count = 0` trả `-1` (Task 1).
- Esc trong danh sách không đóng `CatalogDialog` (listener trên `window`) → test source: `event.stopPropagation()` trong nhánh `Escape` (Task 2).
- Danh sách trong dialog có `overflow-y-auto` không bị cắt → test source: `createPortal(` và `position: 'fixed'`/`fixed` (Task 2).
- Sau khi thay, không còn `<select` nào trong `src` → test quét file (Task 3).

---

### Task 1: Logic thuần `selectBox.utils.ts`

**Files:**
- Create: `app/frontend/src/components/common/SelectBox/selectBox.utils.ts`
- Test: `app/frontend/tests/select-box.test.mjs`

**Interfaces:**
- Produces:
  - `type SelectOption<T extends string = string> = { value: T; label: string }`
  - `normalizeSearchText(text: string): string` — lowercase, bỏ dấu (NFD + xoá `\p{Diacritic}`), `đ→d`, trim.
  - `filterOptions<T>(options: SelectOption<T>[], query: string): SelectOption<T>[]` — query rỗng trả nguyên mảng.
  - `getMatchRange(label: string, query: string): [number, number] | null` — vị trí khớp trên label gốc (so khớp trên bản chuẩn hoá; độ dài giữ nguyên vì chuẩn hoá từng ký tự 1→1).
  - `moveActiveIndex(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End', current: number, count: number): number` — vòng tròn cho ↑/↓; `count===0` → `-1`.

- [ ] **Step 1: Test** (load qua `createServer` + `ssrLoadModule` như `auth-api.test.mjs`):

```js
assert.equal(utils.normalizeSearchText('  Đắc Nhân TÂM '), 'dac nhan tam')
assert.deepEqual(utils.filterOptions(opts, 'ky').map(o => o.value), ['ky'])        // opts có { value:'ky', label:'Kỳ Án' }
assert.deepEqual(utils.filterOptions(opts, 'ULTRA').map(o => o.value), ['ultra'])
assert.equal(utils.filterOptions(opts, '').length, opts.length)
assert.deepEqual(utils.getMatchRange('Ultraman Zero', 'ul'), [0, 2])
assert.deepEqual(utils.getMatchRange('Kỳ Án', 'an'), [3, 5])
assert.equal(utils.getMatchRange('Harry', 'zz'), null)
assert.equal(utils.moveActiveIndex('ArrowDown', 2, 3), 0)
assert.equal(utils.moveActiveIndex('ArrowUp', 0, 3), 2)
assert.equal(utils.moveActiveIndex('Home', 2, 3), 0)
assert.equal(utils.moveActiveIndex('End', 0, 3), 2)
assert.equal(utils.moveActiveIndex('ArrowDown', -1, 0), -1)
```

- [ ] **Step 2: Run** `node --test tests/select-box.test.mjs` → FAIL (module not found).
- [ ] **Step 3: Implement** theo Interfaces.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Không commit.**

### Task 2: Component `SelectBox`

**Files:**
- Create: `app/frontend/src/components/common/SelectBox/SelectBox.tsx`, `.../SelectBox/index.ts`
- Modify: `app/frontend/src/components/common/index.ts` (thêm `export * from './SelectBox'`)
- Test: `app/frontend/tests/select-box.test.mjs`

**Interfaces:**
- Consumes: Task 1.
- Produces: `export function SelectBox<T extends string>(props: { label: string; value: T | ''; options: SelectOption<T>[]; onChange: (value: T) => void; placeholder?: string; searchPlaceholder?: string; emptyMessage?: string; emptyHint?: string; disabled?: boolean; className?: string })`; re-export `SelectOption`.

- [ ] **Step 1: Test** (source, vì repo không có DOM test env):

```js
const src = read('components/common/SelectBox/SelectBox.tsx')
assert.match(src, /createPortal\(/)
assert.match(src, /aria-haspopup="listbox"/)
assert.match(src, /aria-expanded=\{isOpen\}/)
assert.match(src, /role="combobox"/)
assert.match(src, /aria-activedescendant=/)
assert.match(src, /role="listbox"/)
assert.match(src, /role="option"/)
assert.match(src, /aria-selected=/)
assert.match(src, /case 'Escape':[\s\S]{0,200}event\.stopPropagation\(\)/)
assert.match(src, /Không tìm thấy kết quả phù hợp/)
assert.match(src, /aria-live="polite"/)
assert.match(read('components/common/index.ts'), /export \* from '\.\/SelectBox'/)
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.**
  - Vỏ: `<div>` giống `TextField` (label `text-xs font-semibold text-slate-500`, `rounded-xl border-slate-200`, khi mở/focus `border-indigo-600 ring-3 ring-indigo-600/15`); bên trong `<button type="button">` hiện label của giá trị hoặc `placeholder` (`text-slate-400`), icon `ChevronDown` (xoay khi mở). Label `<span id>` + nút `aria-labelledby`.
  - Mở: click, `Enter`/`Space`/`ArrowDown`/`ArrowUp` trên nút. Khi mở: query rỗng, `activeIndex` = index giá trị hiện tại (hoặc 0), focus ô tìm.
  - Danh sách: `createPortal` vào `document.body`, `fixed`, `z-[60]` (trên dialog `z-50`), `left/width` = rect của vỏ; đặt dưới (`top = rect.bottom + 6`) hoặc lật lên khi `innerHeight - rect.bottom < 280` và phía trên rộng hơn; cập nhật trên `scroll` (capture) và `resize`.
  - Mẫu A: hàng tìm (`Search` icon, input không viền, `border-b border-slate-100`); list `p-1.5 max-h-60 overflow-auto`; mục `rounded-lg px-2.5 py-2 text-sm`, active `bg-indigo-50 text-indigo-800`, selected `font-bold text-indigo-700` + `Check` icon; khớp tô `<mark class="rounded bg-indigo-100 text-inherit">`; chân `text-[11px] text-slate-400` "N kết quả" (`aria-live="polite"`) + gợi ý `↑↓ · Enter · Esc`; menu `rounded-xl border-slate-200 bg-white shadow-lg`.
  - Phím trong ô tìm: `ArrowDown/ArrowUp/Home/End` → `moveActiveIndex` + `scrollIntoView({block:'nearest'})`; `Enter` chọn mục active (bỏ qua nếu `-1`); `Escape` → `event.stopPropagation()` + đóng; `Tab` đóng. Đóng/chọn trả focus về nút.
  - Bấm ngoài (pointerdown ngoài vỏ và menu) → đóng. Hover mục → active. Click mục → chọn.
  - Rỗng: `options.length===0` → `emptyMessage`/`emptyHint`; lọc ra 0 → "Không tìm thấy kết quả phù hợp".
  - `disabled`: nút `disabled`, vỏ `opacity-60`.
  - Không animation (tôn trọng reduced motion mặc nhiên).
- [ ] **Step 4: Run** `bun run test` → PASS; `bun run lint`; `bun run build`.
- [ ] **Step 5: Không commit.**

### Task 3: Thay `<select>` + ô ReceiptLineId

**Files:**
- Modify: `app/frontend/src/features/catalog/pages/TitleListPage.tsx:37-43`, `.../components/TitleEditorDialog.tsx:92-98`, `.../components/CopyEditorDialog.tsx:67-84`
- Test: `app/frontend/tests/select-box.test.mjs`

**Interfaces:**
- Consumes: `SelectBox`, `SelectOption` từ `@/components/common`.

- [ ] **Step 1: Test**

```js
for (const file of allTsxUnder('src')) assert.doesNotMatch(read(file), /<select\b/, file)
const titleList = read('features/catalog/pages/TitleListPage.tsx')
assert.match(titleList, /<SelectBox[\s\S]*label="Lọc theo bộ sách"/)
assert.match(titleList, /setSearchParams\(value \? \{ seriesId: value \} : \{\}\)/)
const titleEditor = read('features/catalog/components/TitleEditorDialog.tsx')
assert.match(titleEditor, /label="Thuộc bộ sách"/)
assert.match(titleEditor, /onChange=\{setSeriesId\}/)
const copy = read('features/catalog/components/CopyEditorDialog.tsx')
assert.match(copy, /label="Kênh sử dụng"/)
assert.match(copy, /label="Tình trạng"/)
assert.match(copy, /label="Dòng phiếu nhập"[\s\S]*options=\{\[\]\}/)
assert.match(copy, /Sẽ có khi hoàn tất luồng nhập kho \(phase 05\)\./)
assert.doesNotMatch(copy, /receiptLineId:/)   // payload unchanged
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Option values/labels giữ nguyên từng chữ (gồm mục rỗng "Tất cả đầu sách" và "Sách độc lập / chưa gắn bộ" với `value: ''`). Ô ReceiptLineId: `useState<string>('')`, chỉ dùng cho hiển thị, đặt đầu lưới trường của `CopyEditorDialog` ngay sau CopyBarcode/Kệ; `placeholder="Chưa có dòng phiếu nhập"`.
- [ ] **Step 4: Run** `bun run test`, `bun run lint`, `bun run build` → pass.
- [ ] **Step 5: Kiểm tra trình duyệt:** `/catalog/titles` (lọc bộ sách: chuột, bàn phím, gõ "ultra"), dialog "Thêm bản sách vật lý" (kênh, tình trạng, dòng phiếu nhập rỗng; Esc đóng menu không đóng dialog; menu không bị cắt), dialog đầu sách (thuộc bộ sách).
- [ ] **Step 6: Không commit.** `git diff --check`, `git status --short`.
