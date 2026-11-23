# SHIFT-001 / ATT-001 Figma HRM Redesign Implementation Plan

> **For agentic workers:** Implement task-by-task with test-first verification.

**Goal:** Rebuild the shift and attendance screens to the approved Figma UX while disabling the separate personal-attendance route for every role.

**Architecture:** Keep `MainLayout`, existing HR fixture ownership, shared Tailwind primitives, and `RoleGuard`. Replace feature-local screen composition with focused weekly-roster and integrated-attendance components. The screen-access policy remains the single source for both navigation and direct-route denial.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, lucide-react, Node test runner, Bun.

**Spec:** [`../specs/SHIFT-001-ATT-001-figma-hrm-redesign.md`](../specs/SHIFT-001-ATT-001-figma-hrm-redesign.md)

## Global Constraints

- Frontend only; do not change API contracts or backend behavior.
- Retain the existing application shell and shared primitives; do not introduce a parallel design system.
- `/hr/attendance/personal` has no navigation item and is denied to all roles.
- Non-Admin screens must render only the actor's fixture rows; missing punch data never produces inferred hours.
- Period-close and unlock affordances are explicitly non-mutating demo UI.

## Review Focus

- A manual visit to `/hr/attendance/personal` is denied after it disappears from the menu.
- Admin retains every HRM-02/03 control while Cashier and Inventory lose aggregate staff data.
- The weekly grid remains contained on mobile instead of widening the document.
- Check-in/check-out state communicates the action result without implying a persisted API mutation.
- Disabled payroll-period controls do not present a false completed action.

### Task 1: Remove personal-attendance access and establish role-scoped screen contracts

**Files:**
- Modify: `app/frontend/src/features/hr/hr.route.ts`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/src/routes/screen-access.policy.ts`
- Modify: `app/frontend/src/components/layout/Sidebar/Sidebar.tsx`
- Modify: affected route, screen-policy, and sidebar tests

**Interfaces:**
- Consumes: `ScreenAccessPolicy`, `hrPaths`, `RoleGuard`.
- Produces: a denied `hrPersonalAttendance` policy and navigation-free personal route; role-scoped access for integrated attendance.

**Acceptance Criteria:**
- No role sees `Chấm công cá nhân`.
- A direct personal-attendance URL reaches the established 403 boundary.
- Admin, Cashier, and Inventory can reach only the appropriate integrated HR views.

- [ ] Write focused policy/navigation tests that require the denied personal route and absence of its nav item.
- [ ] Run the focused test and observe failure against the previous policy.
- [ ] Update route, policy, and sidebar declarations minimally.
- [ ] Re-run the focused test successfully.

### Task 2: Rebuild `/hr/shifts` as the Figma weekly roster

**Files:**
- Create: `app/frontend/src/features/hr/components/WeeklyRoster.tsx`
- Modify: `app/frontend/src/features/hr/pages/ShiftRecordsPage.tsx`
- Modify: `app/frontend/src/features/hr/attendance.data.ts` or a focused HR fixture file only if weekly fixture shaping is needed
- Modify/Create: focused HR shift UI tests

**Interfaces:**
- Consumes: authenticated user role, existing HR fixture data, `MainLayout`, and `hrPaths`.
- Produces: `WeeklyRoster` with `isAdminView` and actor-scoped rendering.

**Acceptance Criteria:**
- The screen has week navigation, store/my-schedule control, operational summary, three shift rows, staff chips, shortages, and alerts matching the Figma hierarchy.
- Admin can use local assignment/publish controls; non-Admin sees only their own schedule.
- Narrow layouts constrain overflow to the roster region.

- [ ] Write a focused failing UI-source/behavior contract test for the roster hierarchy and non-Admin scope.
- [ ] Run the focused test and observe failure before implementation.
- [ ] Implement the smallest feature-local roster composition and replace the old daily-table page body.
- [ ] Re-run the focused test successfully.

### Task 3: Rebuild `/hr/attendance` as the integrated Figma attendance screen

**Files:**
- Create: `app/frontend/src/features/hr/components/IntegratedAttendanceWorkspace.tsx`
- Modify: `app/frontend/src/features/hr/pages/AttendancePage.tsx`
- Modify: affected HR attendance tests

**Interfaces:**
- Consumes: `AttendanceRowDisplay`, attendance fixtures, authenticated role, and `MainLayout`.
- Produces: a single role-aware attendance workspace with local check-in/out state.

**Acceptance Criteria:**
- The Figma hierarchy is present: actor check-in/out, current-period status, metrics, filters/table, and Admin-only period panels.
- Non-Admin sees only actor-owned records and no export or aggregate administration controls.
- Period administration controls are visibly disabled/non-mutating; missing attendance remains explicit.

- [ ] Write a focused failing test for integrated actor scope, Admin panels, and non-mutating period controls.
- [ ] Run the focused test and observe failure before implementation.
- [ ] Implement the workspace and simplify `AttendancePage` to the shared route shell.
- [ ] Re-run the focused test successfully.

### Task 4: Reconcile regressions and record verification evidence

**Files:**
- Modify: affected existing HRM route/structure tests
- Modify: `docs/plans/todo.md`

**Acceptance Criteria:**
- No stale route, navigation, or old page assertions remain.
- Focused tests, full frontend tests, lint, build, and `git diff --check` are run and their evidence is recorded.

- [ ] Update tests affected by the intentional removal of navigation/access.
- [ ] Run `bun run test`, `bun run lint`, `bun run build`, and `git diff --check` from `app/frontend` as applicable.
- [ ] Record actual outcomes in `docs/plans/todo.md`.
