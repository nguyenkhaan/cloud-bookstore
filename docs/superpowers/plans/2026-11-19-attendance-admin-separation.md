# Attendance and Admin HR Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate employee self-service attendance cards from Admin-only attendance, shift-pay, and shift-assignment screens.

**Architecture:** Keep the existing `hr` feature and `MainLayout` shell. Share one UI fixture between the employee and Admin pages, add focused attendance-card components for `/hr/attendance`, and add an Admin HR route group under `/admin/hr` with reusable tabs. Preserve old deep links with redirects where their meaning changes.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, Node test runner, existing shared UI primitives.

**Spec:** `docs/superpowers/specs/2026-11-19-attendance-admin-separation-design.md`

## Global Constraints

- UI-only demo; do not add service, hook, API, or generated contract changes.
- `/hr/attendance` must show only the current employee's attendance cards.
- `/admin/hr` must expose separate tabs for attendance/payroll and shift assignment.
- Do not add Admin guards yet; all new routes remain behind `RequireSession` only.
- Use existing `MainLayout`, Sidebar, Breadcrumb, and shared controls.
- Keep the simulated demo date `2026-10-18` populated until API data is available.
- Existing unrelated worktree changes are user-owned and must not be reverted.

## Review Focus

- A current employee with multiple shifts on the selected day sees multiple cards, not an all-employee table; covered by the attendance UI contract test.
- A previous date shows historical cards but cannot trigger new check-in/check-out; covered by the attendance UI contract test and component source checks.
- `/admin/hr` and its two child routes are guarded and reachable from Sidebar; covered by route and structure tests.
- Legacy `/hr/shifts` does not expose the Admin screen directly; covered by the route test.
- The Admin table retains payroll/status/adjustment controls after moving out of the employee page; covered by the Admin HR UI test.

---

### Task 1: Employee attendance cards

**Files:**
- Create: `app/frontend/src/features/hr/attendance.data.ts`
- Create: `app/frontend/src/features/hr/components/AttendanceCard.tsx`
- Create: `app/frontend/src/features/hr/components/AttendanceDateFilter.tsx`
- Modify: `app/frontend/src/features/hr/hr-shift.type.ts`
- Modify: `app/frontend/src/features/hr/pages/AttendancePage.tsx`
- Test: `app/frontend/tests/attendance-ui.test.mjs`

**Interfaces:**
- Consumes: existing `AuthContext`, `MainLayout`, shared `Card`, `Badge`, `Button`, and demo attendance types.
- Produces: shared attendance fixture and employee-only card page consumed by the Admin page and route tests.

**Acceptance Criteria:**
- The employee page contains no all-employee table, payroll filter, or salary column.
- It renders multiple attendance cards for the active employee when multiple shifts exist on the selected demo date.
- The date control is a labelled calendar input and changing it filters the cards.
- Check-in/check-out controls remain available only for the simulated current date; historical cards are view-only.

- [x] **Step 1: Write the failing source-contract tests** for a shared fixture, `AttendanceCard`, calendar filter, employee-only page, and absence of the admin table/payroll labels.
- [x] **Step 2: Run `node --test tests/attendance-ui.test.mjs`** and verify the new assertions fail because the current page still contains the admin table and has no card list/calendar contract.
- [x] **Step 3: Implement the fixture, card, date filter, and employee-only `AttendancePage`.** Resolve the active employee to a matching fixture row when possible and use `NV-0002` as the UI-demo fallback.
- [x] **Step 4: Run `node --test tests/attendance-ui.test.mjs`** and verify it passes.

### Task 2: Admin HR area and attendance/payroll tab

**Files:**
- Create: `app/frontend/src/features/hr/admin-hr.route.ts`
- Create: `app/frontend/src/features/hr/components/AdminHrTabs.tsx`
- Create: `app/frontend/src/features/hr/pages/AdminAttendancePage.tsx`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Test: `app/frontend/tests/admin-hr-ui.test.mjs`
- Test: `app/frontend/tests/app-routes.test.mjs`

**Interfaces:**
- Consumes: `attendance.data.ts`, `AttendanceFilters`, `AttendanceSummaryCards`, `AttendanceTable`, and `AttendanceAdjustmentDialog` from Task 1/current HR components.
- Produces: `/admin/hr`, `/admin/hr/attendance`, `/admin/hr/shifts` route constants and an Admin attendance/payroll screen.

**Acceptance Criteria:**
- `/admin/hr` redirects to `/admin/hr/attendance`.
- `/admin/hr/attendance` retains all-employee filtering, attendance statuses, payroll statuses, salary values, and adjustment dialog behavior.
- The Admin screen has tabs linking to attendance/payroll and shift assignment.
- The employee route remains free of the Admin table and salary content.

- [x] **Step 1: Write the failing tests** for Admin HR paths, tabs, Admin table labels, payroll filters, and the `/admin/hr` redirect.
- [x] **Step 2: Run `node --test tests/admin-hr-ui.test.mjs tests/app-routes.test.mjs`** and verify the new Admin assertions fail because the route group and Admin page do not exist.
- [x] **Step 3: Implement Admin HR route constants, tabs, `AdminAttendancePage`, and guarded route declarations.** Keep old `/hr/attendance` as the employee page.
- [x] **Step 4: Run `node --test tests/admin-hr-ui.test.mjs tests/app-routes.test.mjs`** and verify it passes.

### Task 3: Admin shift tab and Sidebar navigation

**Files:**
- Modify: `app/frontend/src/components/layout/Sidebar/Sidebar.tsx`
- Modify: `app/frontend/src/features/workspace/workspace.route.ts`
- Modify: `app/frontend/src/features/hr/hr.route.ts`
- Modify: `app/frontend/src/features/hr/pages/ShiftRecordsPage.tsx`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/tests/app-routes.test.mjs`
- Modify: `app/frontend/tests/feature-structure.test.mjs`

**Interfaces:**
- Consumes: `adminHrPaths` and `AdminHrTabs` from Task 2.
- Produces: Sidebar item `Điểm danh` for `/hr`, Sidebar item `Nhân sự` for `/admin/hr`, and Admin-only shift assignment route behavior.

**Acceptance Criteria:**
- Sidebar has distinct `Điểm danh` and `Nhân sự` items.
- `Nhân sự` navigates to `/admin/hr` and remains active for both Admin child routes.
- `ShiftRecordsPage` renders under the Admin HR area and exposes the `Phân công ca` tab.
- `/hr/shifts` redirects to `/admin/hr/shifts` for compatibility.

- [x] **Step 1: Extend route/sidebar contract tests** for the two navigation items, `admin-hr` path mapping, Admin shift route, and legacy redirect.
- [x] **Step 2: Run the focused route/structure tests** and verify the new assertions fail.
- [x] **Step 3: Update Sidebar/workspace mappings, shift page layout context, and route redirects.** Preserve existing shift table/drawer behavior.
- [x] **Step 4: Run `node --test tests/app-routes.test.mjs tests/feature-structure.test.mjs tests/admin-hr-ui.test.mjs`** and verify it passes.

### Task 4: Whole-branch verification

**Files:**
- Verify all files from Tasks 1–3.

**Acceptance Criteria:**
- Focused tests, the complete frontend test suite, lint, and build have recorded results.
- Final diff has no new whitespace errors or stale imports.
- Any pre-existing worktree failure is explicitly reported rather than hidden.

- [x] **Step 1: Run the focused HR tests.**
- [x] **Step 2: Run `bun run test`, `bun run lint`, `bun run build`, and `git diff --check` from `app/frontend`/repo root as appropriate.
- [x] **Step 3: Inspect `git diff` and `git status --short`, then report verification results and any unrelated baseline failures.**
