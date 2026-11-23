# RBAC-002 Canonical Role Identifiers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER` the only accepted RBAC role identifiers while preserving the existing RBAC-002 screen/action matrix.

**Architecture:** Keep the backend wire contract unchanged: `INVENTORY_MANAGER` is the Inventory role. The frontend normalizer rejects every legacy alias and therefore fails closed at the session, cache, route and action boundaries. Product-facing labels distinguish `Thu ngân` from generic HR employees; current documentation is corrected only where it names a business role.

**Tech Stack:** ASP.NET Core role claims (unchanged), React 19, TypeScript, TanStack Query, Node test runner, Bun.

**Spec:** [`../superpowers/specs/2026-11-23-rbac-canonical-role-identifiers.md`](../superpowers/specs/2026-11-23-rbac-canonical-role-identifiers.md), [`../specs/RBAC-002-screen-route-api-enforcement.md`](../specs/RBAC-002-screen-route-api-enforcement.md)

## Global Constraints

- The three and only three role identifiers are `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER`.
- Preserve all existing R/U/N matrix values, protected scope and API permission codes.
- `EMPLOYEE`, `WAREHOUSE`, `SUPER_ADMIN`, and unknown input fail closed; do not migrate them to a current role.
- Preserve backend enum, database seed, generated contract, `WarehouseAllowed` API field and HR Employee domain names.
- Do not edit `docs/legacy/`.
- Commit locally only; never push.

## Review Focus

- A stale `sessionStorage` user with a removed alias must not mount protected content; Task 2 covers it.
- A valid canonical session must retain its original access matrix; Task 2 covers each code.
- UI text must call `CASHIER` a cashier, but HR employee records remain employees; Task 2/3 distinguish the contexts.
- `INVENTORY_MANAGER` must remain the backend/API role even where product copy says Inventory; Task 1/3 search and review it.
- Remaining `WarehouseAllowed` occurrences must be contract fields, not alternative role acceptance; Task 3 records the search result.

## Dependency Graph

```text
T01 Decision/spec terminology
└── T02 Strict frontend normalization and product labels
    └── T03 Documentation sweep, regression and evidence
```

### Task 1: Correct the role source of truth

**Files:**
- Create: `docs/decisions/PDR-008-canonical-role-identifiers.md`
- Modify: `docs/decisions/PDR-002-three-roles-and-approval.md`, `docs/decisions/README.md`
- Modify: `docs/product/ROLES.md`, `docs/FEATURE.md`, `docs/specs/RBAC-002-screen-route-api-enforcement.md`, `docs/plans/RBAC-002-frontend-screen-access-enforcement.md`

**Interfaces:**
- Produces: immutable decision that supersedes PDR-002 terminology only.
- Produces: role mapping `ADMIN → Admin`, `CASHIER → Cashier/Thu ngân`, `INVENTORY_MANAGER → Inventory/Quản lý kho`.

**Acceptance Criteria:**
- SSOT names only these three business roles and does not describe legacy aliases as supported.
- The matrix cells and protected constraints remain unchanged.

- [x] **Step 1: Add the corrective PDR and update the original decision status**

Record that role semantics are unchanged and only the canonical identifiers/product labels are corrected.

- [x] **Step 2: Update product/spec/plan role references**

Replace business-role usages of Employee/Warehouse with Cashier/Inventory; do not change HR employee-domain terminology or API field names.

- [x] **Step 3: Commit**

```bash
git add docs/decisions docs/product/ROLES.md docs/FEATURE.md docs/specs/RBAC-002-screen-route-api-enforcement.md docs/plans/RBAC-002-frontend-screen-access-enforcement.md
git commit -m "docs(rbac): define canonical role identifiers"
```

### Task 2: Fail closed for legacy role values in the frontend

**Files:**
- Modify: `app/frontend/src/features/auth/role.ts`
- Modify: `app/frontend/src/context/AuthProvider.ts`
- Modify: role-label consumers and fixtures under `app/frontend/src/features/auth`, `app/frontend/src/features/hr`, and `app/frontend/src/features/settings`
- Modify: `app/frontend/tests/auth-role-session.test.mjs`, plus focused role-label tests

**Interfaces:**
- Produces: `normalizeRoleCode(value?: string | null): AppRole | null` that accepts only the three canonical code strings after trim/case normalization.
- Consumes: existing `readStoredUser`/`formatUser` fail-closed behavior and existing screen-policy role codes.

**Acceptance Criteria:**
- `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER` normalize successfully.
- `EMPLOYEE`, `WAREHOUSE`, `SUPER_ADMIN`, and unknown values normalize to `null`; stale cache/session data cannot grant access.
- `CASHIER` is labelled `Thu ngân` and `INVENTORY_MANAGER` remains the Inventory/warehouse-management role in product UI.

- [ ] **Step 1: Write failing normalization and display-label tests**

Assert all canonical values pass and every removed alias returns `null`; assert `formatUser` labels `CASHIER` as `Thu ngân`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `cd app/frontend && bun run test -- tests/auth-role-session.test.mjs`

Expected: FAIL because the normalizer still accepts legacy aliases and displays Cashier as `Nhân viên`.

- [ ] **Step 3: Remove legacy aliases and update product-facing role labels**

Keep `WarehouseAllowed` and HR Employee domain identifiers unchanged.

- [ ] **Step 4: Run focused tests**

Run: `cd app/frontend && bun run test -- tests/auth-role-session.test.mjs tests/auth-screens-qa.test.mjs tests/sidebar-role-nav.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/frontend/src app/frontend/tests
git commit -m "fix(rbac): accept only canonical role identifiers"
```

### Task 3: Sweep role naming and verify the unchanged matrix

**Files:**
- Modify: current role-related docs and fixtures identified by targeted search
- Modify: `docs/plans/todo.md`

**Acceptance Criteria:**
- Current role documentation and role selectors use Cashier/Inventory/Admin labels.
- Remaining `Employee` references are HR/domain entities; remaining `WarehouseAllowed` references are backend/contract compatibility fields.
- Existing matrix tests still prove the same access results for canonical roles.

- [ ] **Step 1: Search and classify remaining legacy terms**

Run targeted searches for `EMPLOYEE|WAREHOUSE|Employee|Warehouse|Nhân viên` in role-context files; inspect every retained match.

- [ ] **Step 2: Update scoped labels, tests and documentation**

Do not mechanically rename HR employees or `WarehouseAllowed` contract fields.

- [ ] **Step 3: Run verification**

Run from `app/frontend`:

```bash
bun run test
bun run lint
bun run build
```

Also run `git diff --check` and `git status --short` from repository root. Record existing build baseline errors separately if they remain.

- [ ] **Step 4: Record evidence and commit**

```bash
git add docs app/frontend
git commit -m "docs(rbac): record canonical role verification"
```
