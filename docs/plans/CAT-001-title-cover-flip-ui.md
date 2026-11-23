# CAT-001 Title Cover Flip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay bìa tĩnh ở danh sách Đầu sách bằng bìa lật có cảm giác độ dày cuốn sách.

**Architecture:** Tạo `TitleCoverStack` từ cấu trúc của `SeriesCoverStack`, nhưng kích thước phù hợp dòng Đầu sách và có lớp mép giấy phía sau bìa. `TitleListPage` trở thành `group` để hover/focus-within kích hoạt animation bằng CSS/Tailwind.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Node test runner.

**Spec:** `docs/specs/CAT-001-title-cover-flip-ui.md`

## Global Constraints

- Không thêm dependency, JavaScript animation hoặc thay đổi UI ngoài bìa dòng Đầu sách.
- Tái sử dụng ngôn ngữ chuyển động của `SeriesCoverStack`: 62° quanh gáy trái, `object-cover object-top`, fallback, reduced-motion.
- Phần trang/bìa trang trí phải `aria-hidden`; ảnh bìa vẫn có alt text.

## Review Focus

- Ảnh lỗi hoặc không có ảnh vẫn hiển thị fallback không làm vỡ kích thước dòng.
- Focus liên kết tiêu đề vẫn kích hoạt animation bằng `group-focus-within`.
- Reduced-motion loại bỏ phép quay nhưng giữ bìa/trang hiển thị ổn định.
- Mép trang tạo cảm giác độ dày mà không gây overflow ngang trên màn hình nhỏ.

### Task 1: Thay bìa đầu sách bằng TitleCoverStack

**Files:**
- Create: `app/frontend/src/features/catalog/components/TitleCoverStack.tsx`
- Modify: `app/frontend/src/features/catalog/pages/TitleListPage.tsx`
- Modify: `app/frontend/tests/catalog-series-cover.test.mjs`

**Interfaces:**
- Consumes: `imageUrl: string | null`, `name: string` từ mỗi `BookTitle`.
- Produces: `TitleCoverStack` với bìa lật khi hover/focus-within và các lớp trang sau bìa.

**Acceptance Criteria:**
- Bìa mở 62° quanh mép trái khi hover/focus liên kết trong dòng.
- Ảnh và fallback bám đúng khung; lớp trang tạo chiều sâu; reduced-motion không xoay.

- [ ] **Step 1: Write the failing test**

Assert `TitleCoverStack` exists with spine-origin flip, `group-hover`, `group-focus-within`, reduced-motion, image fallback and layered page edge; assert title rows import it and become a `group`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: FAIL because title rows still use `CoverTile`.

- [ ] **Step 3: Implement TitleCoverStack and connect it to TitleListPage**

Use three decorative layers: a paper block, a visible right-edge page stack, and the rotating front cover. Retain the existing row dimensions and use CSS-only transition classes.

- [ ] **Step 4: Run focused verification**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs`
Expected: PASS.

### Task 2: Record verification evidence

**Files:**
- Modify: `docs/plans/todo.md`

**Acceptance Criteria:**
- Focused test, lint/build outcomes and manual responsive observations are recorded, including pre-existing blockers.

- [ ] **Step 1: Run verification and inspect diff**

Run: `cd app/frontend && node --test tests/catalog-series-cover.test.mjs && bun run lint && bun run build`; then `git diff --check`.

- [ ] **Step 2: Update tracker evidence**

Move `CAT-001-UI-03` to `IN_REVIEW` only after evidence is recorded.
