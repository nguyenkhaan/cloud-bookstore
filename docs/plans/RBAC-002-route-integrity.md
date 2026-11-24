# RBAC-002 Route Integrity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `workspace.route.ts` the single source for workspace navigation destinations and prevent Sidebar callbacks from navigating to undeclared routes.

**Architecture:** Keep feature-specific child routes in their owning `*.route.ts` files. Move workspace fallback selection and top-level Sidebar metadata into `workspace.route.ts`, make `AppRoutes.tsx` consume workspace path constants for top-level routes, and make every workspace shell—including Settings—resolve Sidebar IDs through `workspacePathFor`.

**Tech Stack:** React 19, TypeScript, React Router 7, Vite, Node test runner, Bun.

**Spec:** `docs/FEATURE.md` (`RBAC-002`), `app/frontend/AGENTS.md`.

## Global Constraints

- `workspace.route.ts` is the single source for top-level workspace navigation destinations.
- `workspace.route.ts` is also the single source for top-level Sidebar IDs, labels, icons, and screen mappings.
- Feature child routes remain owned by their feature route modules.
- Unknown workspace IDs must fail closed and must never be converted into a guessed URL.
- Preserve unrelated user-owned changes in the working tree.
- Do not edit generated API contract files.

## Review Focus

- Settings Sidebar navigation: `overview` and `warehouse` resolve to `/dashboard` and `/suppliers`, not guessed paths.
- Top-level route declarations: each workspace registry value is consumed by `AppRoutes.tsx`.
- Unknown workspace IDs, including inherited object keys: `workspacePathFor` returns `undefined` rather than a fallback URL.
- Forbidden fallback: the first allowed workspace path remains `/dashboard` and never `/book-series`.
- Existing role-aware visibility: route centralization does not change the current role matrix.

### Task 1: Centralize workspace route ownership and add regression coverage

**Files:**
- Modify: `app/frontend/src/features/workspace/workspace.route.ts`
- Modify: `app/frontend/src/components/layout/Sidebar/Sidebar.tsx`
- Modify: `app/frontend/src/routes/screen-access.policy.ts`
- Modify: `app/frontend/src/routes/AppRoutes.tsx`
- Modify: `app/frontend/src/pages/ForbiddenPage.tsx`
- Modify: `app/frontend/src/features/settings/pages/SettingsPage.tsx`
- Modify: `app/frontend/tests/settings-forms.test.mjs`
- Modify: `app/frontend/tests/catalog-routing.test.mjs`
- Modify: `app/frontend/tests/screen-access-policy.test.mjs`
- Modify: `app/frontend/tests/admin-hr-ui.test.mjs`
- Modify: `app/frontend/tests/app-routes.test.mjs`
- Modify: `app/frontend/tests/reports-ui.test.mjs`
- Modify: `app/frontend/tests/feature-structure.test.mjs`
- Modify: `docs/plans/todo.md`

**Interfaces:**
- Consumes: existing `workspacePaths`, `workspacePathFor`, `SCREEN_POLICIES`, and feature route constants.
- Produces: `getFirstAllowedWorkspacePath(role: AppRole): string` from `workspace.route.ts`; top-level `AppRoutes` bindings use `workspacePaths`; Sidebar metadata and access mappings use the workspace registry; Settings uses `workspacePathFor` for Sidebar callbacks.

**Acceptance Criteria:**
- Clicking any top-level Sidebar item from Settings resolves through `workspacePathFor`; `overview` reaches `/dashboard` and `warehouse` reaches `/suppliers`.
- Every top-level value in `workspacePaths` is used by its corresponding `AppRoutes` declaration.
- Unknown workspace IDs return `undefined` and cannot become `/${id}` routes.
- `getFirstAllowedWorkspacePath` has one owner (`workspace.route.ts`) and all callers/tests use that owner.
- Existing route, role, settings, lint, and build verification results are recorded, including unrelated baseline failures.

- [x] **Step 1: Add failing regression assertions** for Settings Sidebar callback resolution, workspace route/AppRoutes binding, unknown-ID fail-closed behavior, and helper ownership.
- [x] **Step 2: Run focused tests** and confirm the pre-fix Settings assertion fails with `/overview` instead of `/dashboard`.
- [x] **Step 3: Implement the centralized route changes** in the listed source files without changing feature child route ownership.
- [x] **Step 4: Run focused tests** and confirm all routing/settings/sidebar assertions pass (32/32).
- [x] **Step 5: Run the full frontend test, lint, build, and diff checks; inspect the final diff and working tree.** Routing/sidebar focused suite is 32/32. Full suite is 250/251 because of an unrelated local HR copy assertion; lint passes with existing warnings; build is blocked by two unrelated local HR unused imports; diff check passes.

