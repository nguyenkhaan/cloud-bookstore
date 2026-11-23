# RBAC canonical role identifiers — design

## Intent

Correct the role terminology used by RBAC-002 without changing the approved access matrix: the only business roles are `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER`. `CASHIER` is the counter cashier role; `INVENTORY_MANAGER` is the inventory role.

## Decision

- Treat `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER` as the only valid role values at every frontend authorization boundary.
- Reject `EMPLOYEE`, `WAREHOUSE`, `SUPER_ADMIN`, and unknown values instead of normalizing them. A cached or session role outside the three canonical values must fail closed.
- Use Vietnamese product labels `Quản trị viên`, `Thu ngân`, and `Quản lý kho`; documentation may pair these with `Admin`, `Cashier`, and `Inventory` when naming the roles in English.
- Retain `INVENTORY_MANAGER` in backend code, session claims, generated contract, database seed, and API fields such as `WarehouseAllowed`. Those are established wire/schema contracts, not a fourth role.

## Scope

- Correct the RBAC decision/spec/plan/product role source of truth and relevant current feature documents.
- Update frontend role normalization, role labels, fixtures, and tests.
- Preserve the existing RBAC screen/action matrix; no route, permission ceiling, data scope, or backend authorization rule changes.

## Non-goals

- Do not rename HR `Employee` entities, endpoints, DTOs, database tables, or generic references to staff members.
- Do not rename backend `INVENTORY_MANAGER` to `INVENTORY` or manually alter generated API contract code.
- Do not rewrite historical `docs/legacy/` artifacts.

## Verification

- Tests prove only canonical values normalize and legacy/unknown values return `null`.
- Session/cache behavior remains fail-closed for removed aliases.
- Role-specific user-facing labels identify Cashier and Inventory correctly.
- Static searches distinguish remaining employee-domain and `WarehouseAllowed` contract references from prohibited legacy role aliases.
