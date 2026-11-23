# PDR-008: Canonical role identifiers

## Status

Accepted

## Date

2026-11-23

## Context

PDR-002 correctly established three business responsibilities but used `Nhân viên`/Employee as the name for the cashier role and allowed several historical role aliases to be described as compatible. The implemented backend enum, database seed and authorization claims already use `ADMIN`, `CASHIER`, and `INVENTORY_MANAGER`. The product owner clarified that these three are the only role identifiers.

## Decision

The system has exactly these three canonical role identifiers:

- `ADMIN` — Admin / Quản trị viên.
- `CASHIER` — Cashier / Thu ngân.
- `INVENTORY_MANAGER` — Inventory / Quản lý kho.

Authorization boundaries accept only these values. `EMPLOYEE`, `WAREHOUSE`, `SUPER_ADMIN`, and unknown strings are not aliases and must fail closed. The existing screen-access matrix, protected scopes, dynamic permission rules and approval responsibilities are unchanged.

`INVENTORY_MANAGER` remains the wire-level backend/database/API identifier. Existing schema and API field names such as `WarehouseAllowed` remain compatibility contracts and do not create a Warehouse role.

## Alternatives Considered

- Keep historical aliases: rejected because an authorization system should not silently migrate invalid role claims after the canonical values are known.
- Rename `INVENTORY_MANAGER` to `INVENTORY` everywhere: rejected because it would change stable backend claims, database seed and API contracts without changing the business role.

## Consequences

- Frontend session/cache normalization rejects legacy role values and therefore fails closed.
- Product UI and documentation use Cashier/Thu ngân and Inventory/Quản lý kho when naming roles.
- HR employee entities, endpoint names and generic references to staff are not role aliases and remain unchanged.

## Affected Artifacts

Supersedes the role terminology portion of `PDR-002`; updates `ROLES.md`, `FEATURE.md`, RBAC-002 specs/plans, frontend role normalization and role-label fixtures.
