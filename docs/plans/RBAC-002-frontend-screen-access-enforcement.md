# Frontend Screen Access Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thực thi ma trận quyền màn hình `R`/`U`/`N` cho ba role tại frontend, đồng bộ từ role session đến Sidebar, `RoleGuard`, tab và action, để người dùng có thể đăng nhập từng tài khoản và kiểm tra đúng workspace của mình.

**Architecture:** Role chuẩn hóa được lấy từ `/auth/session`, giữ trong `AuthProvider` và chỉ cache tạm trong `sessionStorage`; cache không phải nguồn quyền và không được dùng trước khi session server hoàn tất khởi tạo. Một screen-policy catalog thuần là nguồn duy nhất cho Sidebar, route guard và child/tab policy; permission API hiện có tiếp tục quyết định action động qua TanStack Query. `RoleGuard.tsx` chặn route `N`, còn các component dùng cùng resolver để chuyển giữa chỉ đọc và có thao tác.

**Tech Stack:** React 19, TypeScript 6, React Router 7, TanStack Query 5, Vite 8, Node test runner, Bun, Oxlint.

**Spec:** [`docs/specs/RBAC-002-screen-route-api-enforcement.md`](../specs/RBAC-002-screen-route-api-enforcement.md)

## Global Constraints

- Phạm vi của plan này chỉ gồm `app/frontend` và tài liệu/evidence liên quan; không sửa backend, database, OpenAPI hoặc generated `src/contract/api-contract.ts`.
- Frontend guard là kiểm soát UX và phòng truy cập nhầm, không phải security boundary. Plan này chưa thể tuyên bố hoàn tất yêu cầu backend authorization trong spec.
- Chỉ có ba role chuẩn: `ADMIN`, `CASHIER`, `INVENTORY_MANAGER`; alias `SUPER_ADMIN`, `EMPLOYEE`, `WAREHOUSE` chỉ được normalize, không tạo role mới.
- Role lấy từ response login/session. Không tạo role selector, không dùng query string `previewRole`, không tin `localStorage`/`sessionStorage` như nguồn quyền.
- `sessionStorage` chỉ cache `AuthUser` của session hiện tại; `RequireSession`/`RoleGuard` không render protected content trước khi `/auth/session` xác nhận.
- Role không hợp lệ, policy thiếu hoặc permission chưa xác định phải fail closed.
- `U` luôn bao hàm `R`; UI chỉ có ba effective state `N`, `R`, `U`.
- Không thêm dependency, state manager hoặc provider wrapper mới nếu `AuthProvider` và TanStack Query hiện có đáp ứng được.
- Không đổi bố cục/giao diện hiện tại ngoài việc ẩn item/tab/action không có quyền và trích màn hình 403 dùng chung.
- Không thêm screen code, nhãn role-status thừa hoặc subtitle giải thích quyền trên giao diện.
- Không xây `/reports/inventory` hoặc màn hình báo cáo mới trong plan này vì chưa có API/contract; dữ liệu cá nhân tiếp tục dùng `/dashboard`, `/pos/shift` và các route HR hiện có.
- Mọi task phải bảo toàn thay đổi người dùng đang có và chạy focused test trước khi commit.

## Review Focus

- `sessionStorage` bị sửa hoặc chứa role lạ: auth khởi tạo không được thoáng render màn hình protected; Task 1 phải có test cache tampered/unknown.
- Inventory mở `/pos`: chỉ tab Thu mua được render và được chọn mặc định, không phát request/tab bán–thuê trước khi guard; Task 6 phải kiểm thử.
- Người dùng nhập trực tiếp route `N` hoặc alias route: child không mount/query và trang 403 xuất hiện; Task 4 phải kiểm thử.
- Permission đang loading, lỗi hoặc bị thu hồi khi trang mở: action ghi fail closed, dữ liệu form không bị xóa bởi guard; Task 3 và Task 7 phải kiểm thử.
- URL có `:employeeId` hoặc query `previewRole`: Employee/Inventory không được nâng role hoặc xem dữ liệu người khác; Task 8 phải kiểm thử.

---

## Frontend-only Completion Boundary

Khi tất cả task trong plan hoàn tất, frontend phải đạt đúng ma trận hiển thị/điều hướng và action visibility khi đăng nhập ba tài khoản thật. Tuy nhiên, các API backend chưa có authorization hoặc data-scope đúng vẫn là rủi ro tồn đọng. Evidence cuối phải ghi rõ “frontend enforcement complete; backend enforcement deferred”, không dùng kết quả UAT frontend để tuyên bố hệ thống đã an toàn trước request thủ công.

## Artifact Map

### Files to create

- `app/frontend/src/features/auth/role.ts`: role type, alias normalization và validation.
- `app/frontend/src/routes/screen-access.policy.ts`: ma trận màn hình, child policies và pure resolver.
- `app/frontend/src/hooks/useScreenAccess.ts`: kết hợp session role, baseline policy và permission query.
- `app/frontend/src/routes/RoleGuard.tsx`: route boundary dùng screen policy.
- `app/frontend/src/pages/ForbiddenPage.tsx`: trạng thái 403 dùng chung trong application shell.
- `app/frontend/tests/auth-role-session.test.mjs`: role/session cache tests.
- `app/frontend/tests/screen-access-policy.test.mjs`: data-driven matrix tests.
- `app/frontend/tests/screen-access-hook.test.mjs`: permission loading/error/revoke tests.
- `app/frontend/tests/role-guard.test.mjs`: direct-route guard tests.
- `app/frontend/tests/role-aware-tabs.test.mjs`: POS/Approvals/Settings child-policy tests.
- `app/frontend/tests/role-action-visibility.test.mjs`: read-only/update action tests.

### Main files to modify

- `app/frontend/src/context/AuthProvider.ts`
- `app/frontend/src/context/auth-provider.tsx`
- `app/frontend/src/api/client.ts`
- `app/frontend/src/hooks/usePermissions.ts`
- `app/frontend/src/routes/AppRoutes.tsx`
- `app/frontend/src/components/layout/Sidebar/Sidebar.tsx`
- `app/frontend/src/features/workspace/workspace.route.ts`
- `app/frontend/src/features/hr/hr-role.util.ts`
- POS, Approvals, Settings tab/page files listed in Task 6.
- Catalog, Customer, Warehouse, Settings action files listed in Task 7.
- HR and approval ownership files listed in Task 8.
- Existing role/route tests whose old assertions conflict with the accepted matrix.

## Dependency Graph

```text
T01 Role/session normalization
└── T02 Pure screen-policy catalog
    ├── T03 Permission-aware access hook
    │   └── T04 RoleGuard + all application routes
    └── T05 Sidebar/navigation from the same catalog
        └── T06 Child/tab access for POS, Approvals, Settings
            ├── T07 Read-only/update actions across business pages
            └── T08 HR/self-scope and approval ownership UI
                └── T09 Regression + three-account UAT handoff
```

## Ordered Task Index

| ID | Deliverable | Depends on | Size |
| --- | --- | --- | :---: |
| `RBAC-FE-T01` | Role chuẩn hóa và session cache fail-closed | Không | M |
| `RBAC-FE-T02` | Screen-policy catalog và resolver thuần | T01 | M |
| `RBAC-FE-T03` | Permission-aware screen access hook | T01, T02 | S |
| `RBAC-FE-T04` | `RoleGuard.tsx`, trang 403 và bảo vệ toàn bộ routes | T03 | M |
| `RBAC-FE-T05` | Sidebar/workspace navigation dùng chung policy | T02, T03 | M |
| `RBAC-FE-T06` | Policy màn hình con cho POS, Approvals và Settings | T03–T05 | M |
| `RBAC-FE-T07` | Action visibility và chế độ chỉ đọc trên các trang nghiệp vụ | T03, T04 | M |
| `RBAC-FE-T08` | HR self-scope, loại preview role và ownership phê duyệt | T03–T06 | M |
| `RBAC-FE-T09` | Regression gate, UAT ba tài khoản và evidence | T01–T08 | M |

### Task 1: Normalize role and make session storage fail closed

**Files:**
- Create: `app/frontend/src/features/auth/role.ts`
- Create: `app/frontend/tests/auth-role-session.test.mjs`
- Modify: `app/frontend/src/context/AuthProvider.ts`
- Modify: `app/frontend/src/context/auth-provider.tsx`
- Modify: `app/frontend/src/api/client.ts`
- Modify: `app/frontend/src/features/hr/hr-role.util.ts`
- Modify: `app/frontend/tests/auth-session.test.mjs`
- Modify: `app/frontend/tests/sidebar-role-nav.test.mjs`
- Modify: `app/frontend/tests/hrm-wave1-verification.test.mjs`

**Interfaces:**
- Produces: `type AppRole = 'ADMIN' | 'CASHIER' | 'INVENTORY_MANAGER'`.
- Produces: `normalizeRoleCode(value?: string | null): AppRole | null`; aliases `SUPER_ADMIN → ADMIN`, `EMPLOYEE → CASHIER`, `WAREHOUSE → INVENTORY_MANAGER`.
- Produces: `isAppRole(value: unknown): value is AppRole`.
- Changes: `AuthUser` contains `id?: string` and `roleCode?: AppRole`.
- Changes: `StoredUser` mirrors the validated identity fields `id`, `name`, `email`, `role`, `roleCode`, `avatarUrl`.
- Constraint: `formatUser()` must never synthesize Admin when role is absent/unknown.
- Consumed by: Tasks 2–8.

**Acceptance Criteria:**
- Role from login/session is normalized once before entering `AuthContext` and before caching.
- Cached user with malformed JSON or unknown role is ignored; protected UI waits for `/auth/session`.
- Successful session refresh overwrites stale cached role and identity.
- Logout clears cached identity and permission queries cannot reuse the previous role key.
- `?previewRole=` no longer changes authorization role.

- [ ] **Step 1: Write failing role/session tests**

Add tests named:

- `normalizeRoleCode accepts three canonical roles and supported aliases`;
- `unknown role never defaults to ADMIN`;
- `readStoredUser rejects malformed or unrecognized cached role`;
- `formatUser preserves BrowserSessionUser id and normalized role`;
- `previewRole query cannot replace the authenticated role`.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/auth-role-session.test.mjs tests/auth-session.test.mjs tests/sidebar-role-nav.test.mjs tests/hrm-wave1-verification.test.mjs`

Expected: FAIL because `role.ts` does not exist and current HR resolver accepts `previewRole`/falls back to Admin.

- [ ] **Step 3: Implement role normalization and validated session cache**

Implement the produced interfaces above. `AuthProvider` may hydrate visual identity from `sessionStorage`, but `isInitializing` remains true until `getSession()` succeeds or fails; no protected child may use cached role as authenticated proof.

- [ ] **Step 4: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/auth-role-session.test.mjs tests/auth-session.test.mjs tests/sidebar-role-nav.test.mjs tests/hrm-wave1-verification.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/features/auth/role.ts app/frontend/src/context/AuthProvider.ts app/frontend/src/context/auth-provider.tsx app/frontend/src/api/client.ts app/frontend/src/features/hr/hr-role.util.ts app/frontend/tests/auth-role-session.test.mjs app/frontend/tests/auth-session.test.mjs app/frontend/tests/sidebar-role-nav.test.mjs app/frontend/tests/hrm-wave1-verification.test.mjs
git commit -m "feat(rbac): normalize frontend session roles"
```

### Task 2: Build the pure screen-policy catalog

**Files:**
- Create: `app/frontend/src/routes/screen-access.policy.ts`
- Create: `app/frontend/tests/screen-access-policy.test.mjs`

**Interfaces:**
- Consumes: `AppRole`, `normalizeRoleCode` from Task 1.
- Produces: `type AccessLevel = 'N' | 'R' | 'U'`.
- Produces: `SCREEN_POLICIES` as the sole baseline catalog matching every row and child/tab distinction in the accepted spec.
- Produces: `type ScreenId = keyof typeof SCREEN_POLICIES`.
- Produces: `getBaselineAccess(screenId: ScreenId, role: AppRole | null): AccessLevel`.
- Produces: `canReadAccess(access: AccessLevel): boolean` and `canUpdateAccess(access: AccessLevel): boolean`.
- Produces: `getReadableChildIds(parentId: ScreenId, role: AppRole): ScreenId[]`.
- Produces: `getFirstAllowedWorkspacePath(role: AppRole): string`.
- Each policy may declare `path`, `navId`, `children`, `readPermissions`, `updatePermissions`, `permissionMode: 'static' | 'api'`, `maximumAccessByRole` and `dataScope` (`SELF`, `OWN_REQUESTS`, `WAREHOUSE`, `TRANSACTION_CONTEXT`, `ALL`).
- `maximumAccessByRole` is the immutable ceiling from protected constraints: for example Employee catalog, non-Admin customer detail and non-Admin Settings cannot be raised above `R` by a permission code.
- Consumed by: Tasks 3–6.

**Acceptance Criteria:**
- Data-driven test covers every authenticated route and all POS/Approvals/Settings child screens in the spec matrix.
- Unknown screen ID is impossible at compile time; missing runtime policy resolves to `N`.
- Parent access is readable when at least one child is readable, including Inventory `/pos` through `pos.buyback`.
- `/book-series` is `N` for all roles and is never returned as a workspace destination.
- Admin-only screens cannot be upgraded for Employee/Inventory by child aggregation.

- [ ] **Step 1: Write the expected matrix test**

Create an explicit expectation object for `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER`. Assert exact access for every route/subscreen from the spec, not only representative samples.

- [ ] **Step 2: Run the matrix test and confirm failure**

Run: `cd app/frontend && bun run test -- tests/screen-access-policy.test.mjs`

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the catalog and pure resolvers**

Keep route metadata separate from display components. Do not import React, AuthContext or TanStack Query into this file.

- [ ] **Step 4: Run the matrix test**

Run: `cd app/frontend && bun run test -- tests/screen-access-policy.test.mjs`

Expected: PASS with every matrix row asserted.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/routes/screen-access.policy.ts app/frontend/tests/screen-access-policy.test.mjs
git commit -m "feat(rbac): add screen access policy catalog"
```

### Task 3: Combine baseline access with live permissions

**Files:**
- Create: `app/frontend/src/hooks/useScreenAccess.ts`
- Create: `app/frontend/tests/screen-access-hook.test.mjs`
- Modify: `app/frontend/src/hooks/usePermissions.ts`
- Modify: `app/frontend/tests/dynamic-permissions.test.mjs`

**Interfaces:**
- Consumes: `ScreenId`, `AccessLevel`, `SCREEN_POLICIES` and pure access helpers from Task 2.
- Produces: `type ScreenAccessResult = { access: AccessLevel; canRead: boolean; canUpdate: boolean; isResolving: boolean; permissionsError: boolean }`.
- Produces: `resolveEffectiveScreenAccess(screenId: ScreenId, role: AppRole | null, permissionCodes: ReadonlySet<string>, permissionStatus: 'loading' | 'ready' | 'error'): AccessLevel` as a pure function in `screen-access.policy.ts`.
- Produces: `useScreenAccess(screenId: ScreenId): ScreenAccessResult`.
- Extends: `usePermissions()` returns `can(code: string)`, `canAny(codes: readonly string[])`, query status and the current role-keyed permission list.
- Resolution rule: protected/static policy uses baseline; API-aware policy may be upgraded/downgraded only by declared permission codes and is always clamped to `maximumAccessByRole`. Loading/error may retain baseline read but must downgrade all writes to read-only.
- Consumed by: Tasks 4–8.

**Acceptance Criteria:**
- Permission cache remains isolated by authenticated `id/email + roleCode`.
- Permission query explicitly refetches on window focus and every 15 seconds.
- Loading/error never grants an update action.
- Revoking the last update permission changes `U → R`; revoking the last read permission on an API-aware policy changes `R → N`.
- Protected Admin-only screen remains `N` for other roles even if a matching code is inserted into client cache.
- Immutable read-only constraints remain `R` even if a write permission is inserted into client cache.

- [ ] **Step 1: Write failing hook tests**

Use Vite SSR, `QueryClientProvider` and `AuthContext.Provider`. Cover ready, loading, error, revoke and injected protected permission cases.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/screen-access-hook.test.mjs tests/dynamic-permissions.test.mjs`

Expected: FAIL because `useScreenAccess`/`canAny` do not exist.

- [ ] **Step 3: Implement permission-aware access**

Reuse the existing `role-permissions` query key. Do not add a second permission query or copy permissions into AuthContext/session storage.

- [ ] **Step 4: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/screen-access-hook.test.mjs tests/dynamic-permissions.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/hooks/useScreenAccess.ts app/frontend/src/hooks/usePermissions.ts app/frontend/tests/screen-access-hook.test.mjs app/frontend/tests/dynamic-permissions.test.mjs
git commit -m "feat(rbac): resolve live screen access"
```

### Task 4: Add RoleGuard and protect every application route

**Files:**
- Create: `app/frontend/src/routes/RoleGuard.tsx`
- Create: `app/frontend/src/pages/ForbiddenPage.tsx`
- Create: `app/frontend/tests/role-guard.test.mjs`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/tests/app-routes.test.mjs`
- Modify: `app/frontend/tests/auth-screens.test.mjs`
- Modify: `app/frontend/tests/audit-ui.test.mjs`
- Modify: `app/frontend/tests/reports-ui.test.mjs`
- Modify: route-specific source tests that currently assert `<RequireSession><Page />` directly.

**Interfaces:**
- Consumes: `ScreenId` from Task 2 and `useScreenAccess()` from Task 3.
- Produces: `RoleGuard({ screenId, children }: { screenId: ScreenId; children: ReactNode }): ReactNode`.
- Produces: `ForbiddenPage({ currentPath?: string }): ReactNode`, reusing the existing 403 visual and `MainLayout`.
- Constraint: `RequireSession` remains the outer authentication guard; `RoleGuard` handles role/screen access only.

**Acceptance Criteria:**
- Every authenticated canonical route declares a `ScreenId` and is wrapped by `RoleGuard`.
- `N` renders the shared 403 page and never mounts the protected child/query.
- `R` and `U` render the child.
- Invalid/absent role fails closed.
- Alias routes are guarded using the canonical destination policy before `<Navigate>`.
- Inline `RequireRole` and duplicate 403 markup are removed.
- `/book-series` import and production route are removed; `/catalog/series` remains canonical.

- [ ] **Step 1: Write failing RoleGuard tests**

Assert child mount count for allowed and denied roles, 403 copy for denied role, invalid-role denial, and alias-route denial before navigation.

- [ ] **Step 2: Run route tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/role-guard.test.mjs tests/app-routes.test.mjs tests/auth-screens.test.mjs tests/audit-ui.test.mjs tests/reports-ui.test.mjs`

Expected: FAIL because routes still use ad-hoc `RequireRole` or session-only guards.

- [ ] **Step 3: Extract ForbiddenPage and implement RoleGuard**

Keep the current application-shell presentation. The forbidden page must not print raw role codes or enumerate roles permitted for the target.

- [ ] **Step 4: Wrap all canonical and alias routes**

Assign the exact `ScreenId` from Task 2. Do not add a permissive default screen ID.

- [ ] **Step 5: Update obsolete route source assertions**

Replace tests that require direct `<RequireSession><Page />` nesting with assertions for `RequireSession → RoleGuard(screenId) → Page`.

- [ ] **Step 6: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/role-guard.test.mjs tests/app-routes.test.mjs tests/auth-screens.test.mjs tests/audit-ui.test.mjs tests/reports-ui.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/src/routes/RoleGuard.tsx app/frontend/src/pages/ForbiddenPage.tsx app/frontend/src/routes/AppRoutes.tsx app/frontend/tests
git commit -m "feat(rbac): guard every frontend route"
```

### Task 5: Drive Sidebar and workspace navigation from the shared policy

**Files:**
- Modify: `app/frontend/src/components/layout/Sidebar/Sidebar.tsx`
- Modify: `app/frontend/src/features/workspace/workspace.route.ts`
- Modify: `app/frontend/tests/sidebar-role-nav.test.mjs`
- Modify: `app/frontend/tests/catalog-routing.test.mjs`
- Modify: `app/frontend/tests/admin-hr-ui.test.mjs`

**Interfaces:**
- Consumes: `ScreenId`, `getBaselineAccess`, `getReadableChildIds`, `getFirstAllowedWorkspacePath` from Task 2 and live screen access from Task 3.
- Consumes: one `usePermissions()` snapshot plus the pure `resolveEffectiveScreenAccess()` function; Sidebar must not call a hook conditionally inside item loops.
- Changes: each top-level and HR subnav item declares a `screenId`; visibility is resolved from policy instead of `HR_ADMIN_ONLY_NAV_IDS`, `isNonAdmin` or hard-coded audit/report branches.
- Preserves: `canAccessNavItem(id, roleCode)` as a thin pure adapter for existing callers/tests, delegating to the policy catalog.
- Produces: `workspacePathFor(item, role?)` or an equivalent helper that never returns a route unreadable by the supplied role.

**Acceptance Criteria:**
- Sidebar and route guard agree for every role and screen.
- Top-level group is hidden only when all child screens are `N`.
- Employee sees POS, catalog, customers, HR, approvals and read-only settings; does not see warehouse, audit or reports.
- Inventory sees POS because Thu mua is allowed, plus catalog, warehouse, customers, HR, approvals, audit and settings; does not see reports.
- Admin sees every production workspace.
- HR submenu hides employee list, admin attendance, payroll and employee-specific payslip detail from non-Admin while keeping personal screens.
- No inaccessible item remains focusable in collapsed or expanded Sidebar.

- [ ] **Step 1: Replace old sidebar expectations with the accepted matrix**

Add table-driven assertions for all top-level items and every HR child for all three roles.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/sidebar-role-nav.test.mjs tests/catalog-routing.test.mjs tests/admin-hr-ui.test.mjs`

Expected: FAIL because current Sidebar hides Approvals/Settings from all non-Admin and uses hard-coded role branches.

- [ ] **Step 3: Attach ScreenId to navigation metadata and remove duplicate role lists**

Use the same policy resolver as `RoleGuard`; do not duplicate the matrix inside `Sidebar.tsx`.

- [ ] **Step 4: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/sidebar-role-nav.test.mjs tests/catalog-routing.test.mjs tests/admin-hr-ui.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src/components/layout/Sidebar/Sidebar.tsx app/frontend/src/features/workspace/workspace.route.ts app/frontend/tests/sidebar-role-nav.test.mjs app/frontend/tests/catalog-routing.test.mjs app/frontend/tests/admin-hr-ui.test.mjs
git commit -m "feat(rbac): derive navigation from screen policy"
```

### Task 6: Enforce child policies in POS, Approvals and Settings

**Files:**
- Create: `app/frontend/tests/role-aware-tabs.test.mjs`
- Modify: `app/frontend/src/features/pos/pages/PosWorkspacePage.tsx`
- Modify: `app/frontend/src/features/pos/components/PosWorkspaceTabs.tsx`
- Modify: `app/frontend/src/features/pos/pos-transaction.fixture.ts`
- Modify: `app/frontend/src/features/approvals/pages/ApprovalsPage.tsx`
- Modify: `app/frontend/src/features/approvals/components/ApprovalTabBar.tsx`
- Modify: `app/frontend/src/features/approvals/approvals.hook.ts`
- Modify: `app/frontend/src/features/settings/pages/SettingsPage.tsx`
- Modify: `app/frontend/src/features/settings/components/SettingsTabBar.tsx`
- Modify: `app/frontend/tests/pos-transaction-ui.test.mjs`
- Modify: `app/frontend/tests/approvals.test.mjs`
- Modify: `app/frontend/tests/settings-forms.test.mjs`

**Interfaces:**
- Consumes: child `ScreenId` values and `useScreenAccess()` from Tasks 2–3.
- Changes: each tab definition declares `screenId`; tab bars receive only visible tabs or resolve them through one shared helper.
- Changes: approval query hooks accept `enabled: boolean` where a tab/query may be forbidden.
- Produces: first-readable-tab selection for POS, Approvals and Settings.

**Acceptance Criteria:**
- Inventory opening `/pos` sees only Thu mua; `activeTab` starts at `buyback`; customer display and “Giao dịch mới” actions are absent.
- Employee/Admin see POS tabs allowed by the policy; forbidden tabs never render.
- Employee cannot see/load Điều chỉnh kho in Approvals; Inventory/Admin can create an adjustment request, while decision buttons remain Admin-only.
- Non-Admin Settings shows only Rental and Membership; direct `/settings/rbac` or `/settings/integrations` is blocked by `RoleGuard` before any sensitive query.
- Changing role/session resets an active tab that is no longer readable to the first allowed tab.
- Disallowed child queries are `enabled: false` and receive no SSR/browser request.

- [ ] **Step 1: Write failing role-aware tab tests**

Render each page/tab bar under all three role contexts. Assert visible labels, selected default and query enabled flags.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/role-aware-tabs.test.mjs tests/pos-transaction-ui.test.mjs tests/approvals.test.mjs tests/settings-forms.test.mjs`

Expected: FAIL because all POS/Approval tabs are currently rendered or selected independently of screen policy.

- [ ] **Step 3: Filter POS tabs and role-sensitive header actions**

Use child policy IDs; do not write `roleCode === ...` branches inside `PosWorkspaceTabs`.

- [ ] **Step 4: Filter Approval tabs and gate their queries**

Do not call inventory-adjustment list/stats for Employee. Keep Admin-only decision behavior and maker-checker presentation.

- [ ] **Step 5: Migrate Settings tabs to child policy**

Remove `ADMIN_ONLY_TABS` and raw `isAdmin` navigation filtering; component write actions remain permission-gated.

- [ ] **Step 6: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/role-aware-tabs.test.mjs tests/pos-transaction-ui.test.mjs tests/approvals.test.mjs tests/settings-forms.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/frontend/src/features/pos app/frontend/src/features/approvals app/frontend/src/features/settings app/frontend/tests/role-aware-tabs.test.mjs app/frontend/tests/pos-transaction-ui.test.mjs app/frontend/tests/approvals.test.mjs app/frontend/tests/settings-forms.test.mjs
git commit -m "feat(rbac): enforce role-aware workspace tabs"
```

### Task 7: Enforce read-only and update actions across business pages

**Files:**
- Create: `app/frontend/tests/role-action-visibility.test.mjs`
- Modify: `app/frontend/src/features/catalog/pages/CategoryTreePage.tsx`
- Modify: `app/frontend/src/features/catalog/pages/CopyDetailPage.tsx`
- Modify: `app/frontend/src/features/catalog/pages/StockAlertsPage.tsx`
- Modify: `app/frontend/src/features/catalog/pages/SuppliersPage.tsx`
- Modify: `app/frontend/src/features/catalog/components/BookCopyLifecycleDrawer.tsx`
- Modify: catalog create/edit/delete components found by `rg "canEdit|roleCode|canMutate" src/features/catalog` during execution.
- Modify: `app/frontend/src/features/customers/pages/CustomerListPage.tsx`
- Modify: `app/frontend/src/features/customers/pages/CustomerDetailPage.tsx`
- Modify: `app/frontend/src/features/settings/components/ScrSys01RentalPolicy.tsx`
- Modify: `app/frontend/src/features/settings/components/ScrSys02MembershipTiers.tsx`
- Modify: `app/frontend/src/features/settings/components/ScrSys03RbacMatrix.tsx`
- Modify: `app/frontend/src/features/settings/components/ScrSys04Integrations.tsx`
- Modify: relevant catalog/customer/settings tests.

**Interfaces:**
- Consumes: `useScreenAccess(screenId)` and `usePermissions().can/canAny`.
- Rule: render an update action only when `screenAccess.canUpdate` and its exact API permission are both true.
- Permission examples: `Categories.CreateCategory`, `Customers.CreateCustomer`, `Customers.UpdateCustomer`, `BookCopies.UpdateBookCopy`, `BookCopies.DeleteBookCopy`, `BookCopies.CreateBookCopyLabel`, and the existing Settings action codes.
- Read-only role may still use non-mutating search/filter/export/print only when the operation does not expose a protected dataset.

**Acceptance Criteria:**
- Employee catalog pages retain search/navigation but expose no metadata/copy create, edit, delete, status, shelf, image or label mutation.
- Admin/Inventory actions follow live permission codes; revocation removes or disables the relevant action without hiding readable data.
- Customer list create remains available per matrix; customer detail edit/delete/flag actions require effective update permission and protected constraints.
- Supplier/warehouse actions are absent for Employee because the route itself is `N` and remain permission-gated for Admin/Inventory.
- Settings Rental/Tiers are read-only for Employee/Inventory; RBAC/Integrations never mount for them.
- Existing unguarded CopyDetail edit/delete/label buttons are covered.
- Permission error leaves forms readable where allowed but disables submit; it does not clear draft values.

- [ ] **Step 1: Inventory all mutating controls before editing**

Run: `cd app/frontend && rg -n "canEdit|canMutate|isAdmin|roleCode|onClick|mutate" src/features/catalog src/features/customers src/features/settings --glob '*.{ts,tsx}'`

Record every mutating control in the test expectation table; do not refactor unrelated display-only code.

- [ ] **Step 2: Write failing action-visibility tests**

Cover Employee read-only catalog, Inventory/Admin write action, customer list/detail distinction, CopyDetail actions and Settings read-only/error state.

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/role-action-visibility.test.mjs tests/dynamic-permissions.test.mjs tests/customer-management-fixes.test.mjs tests/settings-forms.test.mjs`

Expected: FAIL on current raw-role or unguarded actions.

- [ ] **Step 4: Replace raw role checks with screen plus action permission checks**

Keep protected role constraints in policy rather than scattering role arrays across pages.

- [ ] **Step 5: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/role-action-visibility.test.mjs tests/dynamic-permissions.test.mjs tests/customer-management-fixes.test.mjs tests/settings-forms.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/features/catalog app/frontend/src/features/customers app/frontend/src/features/settings app/frontend/tests/role-action-visibility.test.mjs app/frontend/tests/dynamic-permissions.test.mjs app/frontend/tests/customer-management-fixes.test.mjs app/frontend/tests/settings-forms.test.mjs
git commit -m "feat(rbac): enforce read-only business screens"
```

### Task 8: Enforce HR self routes and approval ownership UI

**Files:**
- Modify: `app/frontend/src/features/hr/hr-role.util.ts`
- Modify: `app/frontend/src/features/hr/pages/ShiftRecordsPage.tsx`
- Modify: `app/frontend/src/features/hr/pages/AttendancePage.tsx`
- Modify: `app/frontend/src/features/hr/pages/HrRequestsPage.tsx`
- Modify: `app/frontend/src/features/hr/pages/PayrollPage.tsx`
- Modify: `app/frontend/src/features/hr/pages/PayrollAdjustmentPage.tsx`
- Modify: `app/frontend/src/features/hr/pages/PayslipPage.tsx`
- Modify: `app/frontend/src/features/approvals/pages/ApprovalsPage.tsx`
- Modify: approval drawer components that compare `currentUserId`/`requestedBy`.
- Modify: `app/frontend/tests/sidebar-role-nav.test.mjs`
- Modify: `app/frontend/tests/hrm-wave1-verification.test.mjs`
- Modify: `app/frontend/tests/admin-hr-ui.test.mjs`
- Modify: `app/frontend/tests/hr-requests-ui.test.mjs`
- Modify: `app/frontend/tests/hr-payroll-ui.test.mjs`
- Modify: `app/frontend/tests/hr-payslip-ui.test.mjs`
- Modify: `app/frontend/tests/attendance-ui.test.mjs`
- Modify: `app/frontend/tests/approvals.test.mjs`

**Interfaces:**
- Consumes: normalized `AuthUser.id`, `AppRole`, `RoleGuard` and screen access hook.
- Removes: authorization effect of `getPreviewRoleFromSearch()` and search argument from `resolveHrRoleCode`.
- Rule: non-Admin uses only personal routes; `:employeeId`, employee list, admin attendance, payroll and adjustment routes are `N`.
- Rule: approval ownership comparisons use authenticated `session.user.id`, never display name.

**Acceptance Criteria:**
- Adding `?previewRole=ADMIN` cannot expose Admin navigation, route, tabs or actions.
- Employee/Inventory see own shifts, personal attendance, own requests and own payslip; admin-only HR screens return 403 before page queries.
- Non-Admin does not see the “Đơn cần duyệt” tab or receive its dataset.
- `/hr/payslip/:employeeId` is Admin-only; `/hr/payslip` remains readable for all authenticated roles.
- Approval cancel/ownership UI compares stable actor ID. Only Admin decision controls render, and self-request warning still suppresses decision controls.
- Where backend/mock data cannot yet enforce `SELF`, frontend must not fabricate another employee ID; show an unavailable/empty state and record the backend dependency instead.

- [ ] **Step 1: Update failing HR/ownership tests first**

Add direct-route denial, previewRole escalation, own-vs-other payslip, pending-request-tab and stable actor-ID assertions.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `cd app/frontend && bun run test -- tests/sidebar-role-nav.test.mjs tests/hrm-wave1-verification.test.mjs tests/admin-hr-ui.test.mjs tests/hr-requests-ui.test.mjs tests/hr-payroll-ui.test.mjs tests/hr-payslip-ui.test.mjs tests/attendance-ui.test.mjs tests/approvals.test.mjs`

Expected: FAIL because preview role and several inline forbidden/read-only branches remain.

- [ ] **Step 3: Remove preview-role authorization and migrate HR pages**

Use `RoleGuard` for screen denial and screen/action access for page variants. Do not retain hidden admin datasets in rendered non-Admin pages.

- [ ] **Step 4: Replace approval ownership name comparisons with user ID**

Pass `session.user.id` through existing drawer props and keep maker-checker behavior.

- [ ] **Step 5: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/sidebar-role-nav.test.mjs tests/hrm-wave1-verification.test.mjs tests/admin-hr-ui.test.mjs tests/hr-requests-ui.test.mjs tests/hr-payroll-ui.test.mjs tests/hr-payslip-ui.test.mjs tests/attendance-ui.test.mjs tests/approvals.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/frontend/src/features/hr app/frontend/src/features/approvals app/frontend/tests
git commit -m "feat(rbac): scope HR and approval views by actor"
```

### Task 9: Run regression gates and hand off three-account UAT

**Files:**
- Modify: `docs/plans/todo.md`
- Modify: `docs/plans/RBAC-002-frontend-screen-access-enforcement.md` only to append execution evidence if the implementer records it inline.
- Verify: all files changed by Tasks 1–8.

**Interfaces:**
- Consumes: all frontend contracts from Tasks 1–8.
- Produces: automated verification evidence and a completed/partially completed manual UAT matrix for three real accounts.

**Acceptance Criteria:**
- Focused tests, full test suite, lint and build pass, or every baseline failure is demonstrated before/after and recorded without claiming completion.
- No role matrix remains duplicated in Sidebar, AppRoutes, HR utility or tab components.
- No `previewRole` authorization path, production `/book-series` route or raw fallback-to-Admin remains.
- User can log in once per role and complete the UAT checklist below without stale permission cache from the previous account.
- `git diff --check` passes and `git status --short` contains no temporary screenshots/logs/secrets.

- [ ] **Step 1: Run static searches**

Run:

```bash
cd app/frontend
rg -n "previewRole|HR_ADMIN_ONLY_NAV_IDS|ADMIN_ONLY_TABS|function RequireRole|path=\"/book-series\"" src tests
rg -n "roleCode ===|includes\(session\?\.user\?\.roleCode|canEdit = \['ADMIN'" src --glob '*.{ts,tsx}'
```

Expected: no obsolete authorization path; any remaining raw role comparison is documented as an immutable protected rule, not a duplicate screen matrix.

- [ ] **Step 2: Run frontend verification**

Run:

```bash
cd app/frontend
bun run test
bun run lint
bun run build
```

Expected: all commands exit 0. If the checkout has pre-existing failures, capture baseline and final output proving no new failure before requesting UAT.

- [ ] **Step 3: Run repository hygiene checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors or unintended generated/temp files.

- [ ] **Step 4: Start the application for manual UAT**

Run backend/frontend using the repository's existing local commands. Do not place account credentials in the plan, logs, screenshots or Git.

- [ ] **Step 5: UAT with Employee account**

- Sidebar shows Dashboard, POS, Catalog, Customers, HR, Approvals and Settings; Warehouse, Audit and Reports are absent.
- `/pos` shows sale/rental/renewal/return/buyback; `/pos/shift` is operable.
- Catalog is readable but metadata/copy mutation actions are always absent because Employee has an immutable `R` ceiling.
- HR shows own shifts, personal attendance, own requests and own payslip; `/hr/employees`, `/hr/attendance`, `/hr/payroll`, `/hr/payroll/adjustments/new`, `/hr/payslip/<other>` show 403.
- `/settings` shows only Rental and Membership in read-only mode; RBAC/Integrations direct URLs show 403.
- Warehouse, Audit and Reports direct URLs show 403.

- [ ] **Step 6: UAT with Inventory account**

- Sidebar shows Dashboard, POS, Catalog, Warehouse, Customers, HR, Approvals, Audit and Settings; Reports is absent.
- `/pos` opens directly on Thu mua and no sale/rental/return/customer-display/cash action is present.
- Catalog and Warehouse mutations follow current permission codes.
- Approvals shows inventory adjustment but decision controls are absent; own create/cancel paths remain.
- Audit is readable in the current UI; evidence must note that true warehouse data scope still requires backend work.
- HR only shows personal routes; Settings only Rental/Membership read-only; Reports direct URLs show 403.

- [ ] **Step 7: UAT with Admin account**

- All production workspaces are visible; `/book-series` is absent and unresolved.
- Admin-only HR, Reports, RBAC and Integrations open successfully.
- Approval decision controls render except for a request created by the same Admin.
- Catalog, warehouse and customer update actions match live permission codes.

- [ ] **Step 8: Cross-account cache verification**

Sign out in the order Admin → Employee → Inventory in the same browser tab. After each login, confirm Sidebar, route access and actions change immediately and no permissions from the previous role remain.

- [ ] **Step 9: Record evidence and commit**

Update `docs/plans/todo.md` with task IDs `RBAC-FE-T01`–`RBAC-FE-T09`, status and command/UAT evidence. Explicitly record backend enforcement as deferred.

```bash
git add docs/plans/todo.md
git commit -m "docs(rbac): record frontend access verification"
```

## Final Definition of Done

- [ ] Role/session storage follows Task 1 and cannot default to Admin.
- [ ] All current production routes and logical child screens exist in the policy catalog.
- [ ] Sidebar, route guard and tab visibility derive from the same catalog.
- [ ] `RoleGuard.tsx` protects every authenticated route.
- [ ] Read-only/update actions follow both screen access and permission code.
- [ ] HR personal routes and approval ownership use authenticated identity.
- [ ] No additional business screen was invented without API support; only the shared 403 page was added.
- [ ] Automated frontend gates pass.
- [ ] Three-account manual UAT is completed by the user or explicitly marked pending.
- [ ] Handoff clearly states that backend authorization/data-scope remains outside this frontend-only plan.
