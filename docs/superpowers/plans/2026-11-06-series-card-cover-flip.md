# Series Card Cover Flip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi card bộ sách ở `/catalog/series` sang bìa "chồng tập" 112px, ảnh hiển thị đầy đủ, bìa lật 62° khi hover/focus, cả card là link.

**Architecture:** Một component mới `SeriesCoverStack` trong feature catalog chịu trách nhiệm toàn bộ phần bìa (lớp gáy, trang giấy, ảnh đầy đủ + nền mờ, fallback chữ cái). `SeriesListPage` thay `SeriesCover` cũ bằng component này và bọc card trong `Link` có class `group` để hover/focus điều khiển hiệu ứng.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4 (utility 3D sẵn có), React Router v7, Node test runner (test kiểm tra source).

**Spec:** `docs/superpowers/specs/2026-11-06-series-card-cover-flip-design.md`

## Global Constraints

- Chỉ sửa frontend; không đổi API, contract, dữ liệu.
- Không thêm dependency, không thêm CSS toàn cục (`index.css`).
- Bìa rộng `112px` (`w-28`), tỉ lệ `2/3`; góc lật `62°` quanh gáy trái; transition ~`450ms`, chỉ dùng `transform`.
- Ảnh `object-contain` (không cắt); nền phía sau là chính ảnh đó `object-cover` + `blur`.
- `motion-reduce`: không xoay bìa, không transition.
- **Không commit** — người dùng tự commit.

## Review Focus

- Ảnh Cloudinary tải lỗi → phải chuyển sang fallback chữ cái, không để ô trống hoặc icon ảnh vỡ (đã có `onError` → test trong Task 1).
- Tên bộ rỗng/khoảng trắng → fallback dùng chữ `S` như `CoverTile` (test trong Task 1).
- `titleCount` null → trang giấy ghi "0 tập" (test trong Task 1).
- Focus bằng bàn phím phải kích hoạt lật bìa giống hover (`group-focus-visible`) và có focus ring (test trong Task 2).
- Card là link nên không được lồng link/button khác bên trong (test trong Task 2: không còn `<Link` thứ hai trong `article`/card).

---

### Task 1: Component `SeriesCoverStack`

**Files:**
- Create: `app/frontend/src/features/catalog/components/SeriesCoverStack.tsx`
- Test: `app/frontend/tests/catalog-series-cover.test.mjs`

**Interfaces:**
- Produces: `export function SeriesCoverStack(props: { imageUrl: string | null; name: string; titleCount: number | null }): JSX.Element`. Hiệu ứng lật dựa vào class `group` ở phần tử cha (Task 2 cung cấp).

- [ ] **Step 1: Write the failing test** `tests/catalog-series-cover.test.mjs` (theo kiểu `catalog-upload-flow.test.mjs`, đọc source):

```js
test('series cover stack shows full image, blurred backdrop and flips 62deg', () => {
  const src = source('features', 'catalog', 'components', 'SeriesCoverStack.tsx')
  assert.match(src, /export function SeriesCoverStack/)
  assert.match(src, /object-contain/)
  assert.match(src, /blur/)
  assert.match(src, /group-hover:-rotate-y-62/)
  assert.match(src, /group-focus-visible:-rotate-y-62/)
  assert.match(src, /origin-left/)
  assert.match(src, /backface-hidden/)
  assert.match(src, /motion-reduce:transition-none/)
  assert.match(src, /motion-reduce:group-hover:rotate-y-0/)
  assert.match(src, /onError=\{\(\) => setFailed\(true\)\}/)
  assert.match(src, /\|\| 'S'/)
  assert.match(src, /\$\{titleCount \?\? 0\} tập/)
})
```

- [ ] **Step 2: Run** `bun run test` → Expected: FAIL (`ENOENT ... SeriesCoverStack.tsx`).

- [ ] **Step 3: Implement `SeriesCoverStack`.** Cấu trúc (ngoài → trong), tất cả `aria-hidden` trừ ảnh/ chữ sr-only:
  - Wrapper `relative w-28 aspect-[2/3] shrink-0 mr-3 perspective-[700px]`.
  - 2 lớp gáy: `absolute inset-0 rounded-lg border border-white`, lớp xa `translate-x-2.5 -translate-y-1.5 bg-slate-200`, lớp gần `translate-x-1 -translate-y-0.5 bg-slate-300`.
  - Trang giấy: `absolute inset-0 rounded-r-lg bg-amber-50` + vạch kẻ ngang mờ, nhãn góc dưới phải `{`${titleCount ?? 0} tập`}` (`text-[10px] font-bold text-amber-800`).
  - Bìa trước: `absolute inset-0 overflow-hidden rounded-lg shadow-md origin-left backface-hidden transition-transform duration-[450ms] ease-out group-hover:-rotate-y-62 group-focus-visible:-rotate-y-62 group-hover:shadow-xl motion-reduce:transition-none motion-reduce:group-hover:rotate-y-0 motion-reduce:group-focus-visible:rotate-y-0`, có dải gáy tối 6px bên trái.
    - Có ảnh và chưa lỗi: `<img aria-hidden src=imageUrl class="absolute inset-0 size-full scale-110 object-cover blur-md brightness-90">` + `<img alt={`Ảnh bìa bộ sách ${name}`} class="relative size-full object-contain" loading="lazy" decoding="async" onError={() => setFailed(true)}>`.
    - Không ảnh/lỗi: nền `bg-linear-to-br from-indigo-700 via-indigo-600 to-sky-500`, chữ cái `name.trim().charAt(0).toUpperCase() || 'S'`, kèm `sr-only` "Chưa có ảnh bìa cho {name}".
  - State `failed` reset khi `imageUrl` đổi: trang gọi với `key={imageUrl ?? 'no-cover'}` (giữ như hiện tại).

- [ ] **Step 4: Run** `bun run test` → Expected: PASS.

- [ ] **Step 5: Không commit** (người dùng tự commit).

### Task 2: Card bộ sách là link + dùng `SeriesCoverStack`

**Files:**
- Modify: `app/frontend/src/features/catalog/pages/SeriesListPage.tsx` (khối `series.map`, xóa hàm `SeriesCover`)
- Test: `app/frontend/tests/catalog-series-cover.test.mjs`

**Interfaces:**
- Consumes: `SeriesCoverStack` từ Task 1; `catalogPaths.titlesForSeries(id)`.

- [ ] **Step 1: Add failing test** vào cùng file:

```js
test('series list card is a single focusable link that drives the cover flip', () => {
  const page = source('features', 'catalog', 'pages', 'SeriesListPage.tsx')
  assert.match(page, /<SeriesCoverStack /)
  assert.doesNotMatch(page, /function SeriesCover\(/)
  assert.match(page, /<Link[^>]*className="group[^"]*focus-visible:ring/)
  assert.match(page, /to=\{catalogPaths\.titlesForSeries\(item\.id\)\}/)
  assert.equal((page.match(/<Link\b/g) ?? []).length, 1)
})
```

- [ ] **Step 2: Run** `bun run test` → Expected: FAIL.

- [ ] **Step 3: Implement.** Thay `<article>` bằng `<Link key to={catalogPaths.titlesForSeries(item.id)} aria-label={`Xem đầu sách của bộ ${item.name}`} className="group flex min-w-0 gap-4 rounded-xl border border-transparent bg-white p-4 pt-5 transition-colors hover:border-indigo-200 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-indigo-600/30">`. Đặt `<SeriesCoverStack imageUrl={item.imageUrl} name={item.name} titleCount={item.titleCount} key={item.imageUrl ?? 'no-cover'} />`. Dòng "Xem {present} đầu sách →" đổi từ `Link` sang `<span>` cùng style (thêm `group-hover:text-indigo-700`). Xóa `SeriesCover`. Giữ nguyên nội dung còn lại (tiêu đề, badge, mô tả, progressbar).

- [ ] **Step 4: Run** từ `app/frontend`: `bun run test`, `bun run lint`, `bun run build` → Expected: tất cả pass, không warning mới.

- [ ] **Step 5: Kiểm tra trực quan** `http://localhost:5173/catalog/series`: Harry Potter (fallback "H"), Sky Striker & Ultraman (ảnh đầy đủ, nền mờ), hover và Tab → bìa lật 62°, lộ "N tập"; Enter mở danh sách đầu sách.

- [ ] **Step 6: Không commit** (người dùng tự commit). Chạy `git status --short` và `git diff --check` từ repo root.
