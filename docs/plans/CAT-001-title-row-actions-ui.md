# CAT-001 Title Row Delete Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bổ sung thao tác xóa có xác nhận cho từng dòng Đầu sách/tập tại danh sách catalog.

**Architecture:** Tạo `TitleRowDeleteAction` thuộc feature catalog để cô lập state confirmation, lỗi và focus trigger. Trang danh sách chỉ render component sau liên kết xem ấn bản; component gọi mutation xóa hiện có và tái sử dụng `ConfirmationDialog`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, TanStack Query v5, Lucide React, Node test runner.

**Spec:** `docs/specs/CAT-001-title-row-actions-ui.md`

## Global Constraints

- Chỉ thêm icon xóa và dialog xác nhận tại dòng Đầu sách; không thêm/chỉnh sửa UI edit.
- Không thêm dependency hoặc chỉnh sửa `src/contract/api-contract.ts`.
- Dùng `ConfirmationDialog` và `useDeleteTitleMutation`; không gọi API ảnh.

## Review Focus

- Đầu sách có ấn bản: lỗi `DELETE` phải giữ confirmation dialog mở và hiển thị lỗi backend.
- Xóa thành công chỉ đóng dialog sau khi mutation thành công.
- Icon phải có target/focus/accessibility name đúng tại viewport nhỏ mà không làm hỏng liên kết xem ấn bản.

## Scope Revision

Theo yêu cầu người dùng, các Task 1–4 bên dưới của bản plan trước đã được thay thế và không được thực thi. Lát cắt hiện tại chỉ gồm:

1. Tạo `TitleRowDeleteAction` dùng `Trash2`, `useDeleteTitleMutation` và `ConfirmationDialog`.
2. Render action này sau “Xem ấn bản” trong `TitleListPage`.
3. Kiểm chứng bằng test tập trung, lint, build và `git diff --check`; build lỗi có sẵn ngoài phạm vi phải được ghi nhận.

### Current Task: Nối API xóa đầu sách và phản hồi pending

**Files:**
- `app/frontend/src/features/catalog/catalog.service.ts`
- `app/frontend/src/features/catalog/catalog.hook.ts`
- `app/frontend/src/features/catalog/components/TitleRowDeleteAction.tsx`

**Flow:**
1. `deleteTitle(titleId)` gọi `DELETE /api/book-titles/{id}` qua `privateClient`.
2. `useDeleteTitleMutation()` dùng service trên và invalidate cache `['catalog']` khi thành công.
3. UI chỉ gọi `mutateAsync(title.id)` sau xác nhận. `deleteTitle.isPending` được truyền vào `Button.loading`, tự khóa nút và hiện “Đang xóa…”.
4. Thành công đóng dialog; lỗi backend được giữ trong dialog qua `deleteError`.

**Acceptance:**
- Không gọi API khi mới bấm icon thùng rác.
- Một lần xác nhận chỉ phát một mutation đang chạy.
- Danh sách phản ánh kết quả mới sau invalidation; lỗi “còn ấn bản” hiển thị mà không đóng dialog.

**Status:** Đã triển khai; chỉ cần UAT với backend có dữ liệu thật trước khi chuyển `DONE`.

### Task 1: Mở rộng dữ liệu đầu sách và truy vấn thể loại

**Files:**
- Modify: `app/frontend/src/features/catalog/catalog.type.ts`
- Modify: `app/frontend/src/features/catalog/catalog.service.ts`
- Modify: `app/frontend/src/features/catalog/catalog.hook.ts`
- Test: `app/frontend/tests/catalog-title-row-actions.test.mjs`

**Interfaces:**
- Consumes: generated `TitleResponse`, `UpdateTitleRequest` and `CategoryResponse` schemas.
- Produces: `BookTitle` fields `categoryId`, `categoryName`, `originalPublishYear`; `BookCategory`; `listCategories()` and `useCategoriesQuery()`.

**Acceptance Criteria:**
- Title metadata used by the editor includes every non-image field accepted by `PUT /api/book-titles/{id}`.
- Only active categories are loaded for a new selection; no generated contract is edited.

- [ ] **Step 1: Write the failing source-level test**

Assert the title view type exposes category and original publication year, and the service/hook expose `listCategories`/`useCategoriesQuery` with the `IsActive` query binding.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: FAIL because the category query and title fields do not exist.

- [ ] **Step 3: Implement the typed catalog data adapter**

Add only the response fields and query hook needed by `TitleRowActions`; keep `SaveTitleRequest` compatible with the existing create dialog and use the generated update request schema for the editor payload.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: PASS.

### Task 2: Render and connect title-row edit and delete controls

**Files:**
- Create: `app/frontend/src/features/catalog/components/TitleRowActions.tsx`
- Modify: `app/frontend/src/features/catalog/pages/TitleListPage.tsx`
- Test: `app/frontend/tests/catalog-title-row-actions.test.mjs`

**Interfaces:**
- Consumes: `BookTitle`, active `BookSeries` and `BookCategory`, `useUpdateTitleMutation`, `useUpdateTitleStatusMutation`, `useDeleteTitleMutation`.
- Produces: icon action group, metadata form and deletion confirmation for one title row.

**Acceptance Criteria:**
- Pencil and trash icon buttons are 44 px, named for assistive technology, and do not alter the existing title-detail link.
- Details form submits all controller metadata fields and calls status patch only after a successful metadata save when needed.
- Delete reuses `ConfirmationDialog`; pending and backend-error states remain visible.

- [ ] **Step 1: Extend the failing test**

Assert `TitleListPage` renders `TitleRowActions`, that it imports `Pencil`, `Trash2`, and `ConfirmationDialog`, and that metadata/status/delete hooks and all fields are present.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: FAIL because `TitleRowActions` does not exist.

- [ ] **Step 3: Implement `TitleRowActions`**

Use `DialogKind = 'edit' | 'delete' | null` and `EditTab = 'details' | 'image'`; keep the existing row layout and insert the action group after “Xem ấn bản”. Map blank optional text to `null`, validate `originalPublishYear` as an `Int16`, and retain entered data on errors.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: PASS.

### Task 3: Add the title-cover tab and direct-upload recovery states

**Files:**
- Modify: `app/frontend/src/features/catalog/components/TitleRowActions.tsx`
- Test: `app/frontend/tests/catalog-title-row-actions.test.mjs`

**Interfaces:**
- Consumes: `uploadImage('TITLE_IMAGE', file)`, `useReplaceTitleImageMutation`, `CatalogApiError`.
- Produces: Cloudinary preview, automatic title-image attachment and retry-safe error handling.

**Acceptance Criteria:**
- JPEG, PNG and WebP ≤10 MB are validated by the shared upload service, previewed, and attached via `PUT /image`.
- Duplicate selection/attachment is blocked while busy; `409` clears the stale intent and other attachment errors expose retry.
- The slice does not call `DELETE /image`.

- [ ] **Step 1: Extend the failing test**

Assert the title image owner, preview, replacement mutation, pending labels, 409 handling, retry button, and absence of the delete-image mutation.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: FAIL because the image tab is absent.

- [ ] **Step 3: Implement the image tab state machine**

Mirror the accepted Book Series direct-upload behavior with title endpoint names only; do not create a second shared dialog abstraction.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs`
Expected: PASS.

### Task 4: Verify the catalog slice and record evidence

**Files:**
- Modify: `docs/plans/todo.md`

**Interfaces:**
- Consumes: implemented frontend slice and focused test.
- Produces: verification evidence for `CAT-001-UI-02`.

**Acceptance Criteria:**
- Focused source tests and full frontend verification have recorded results.
- The final diff contains no whitespace errors or unrelated changes.

- [ ] **Step 1: Run focused and full checks**

Run: `cd app/frontend && node --test tests/catalog-title-row-actions.test.mjs && bun run test && bun run lint && bun run build`
Expected: all commands pass, or pre-existing failures are recorded exactly.

- [ ] **Step 2: Inspect the final worktree**

Run: `git diff --check && git status --short && git diff -- app/frontend docs`
Expected: only CAT-001 title-row UI, its tests, spec, plan and tracker evidence changed.

- [ ] **Step 3: Update tracker evidence**

Record exact command results and visual checks at 390 px, 768 px and 1440 px in `docs/plans/todo.md`; move the task to `IN_REVIEW` only after all requested behavior is verified.
