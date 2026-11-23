# Change Role Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Admin-only role-change API safe for string enum requests and guarantee complete, atomic audit records.

**Architecture:** Keep the existing controller and scoped services. Validate the request boundary, update the employee and append the audit entry through the same scoped `AppDbContext`, then persist both in one `SaveChangesAsync` call.

**Tech Stack:** ASP.NET Core 10, System.Text.Json, EF Core 10, PostgreSQL, xUnit, SQLite test provider.

**Spec:** `docs/plans/phase-02-tai-khoan-phan-quyen-audit.md`

## Global Constraints

- Accept role values as JSON strings only: `ADMIN`, `CASHIER`, `INVENTORY_MANAGER`.
- Do not add root-Admin behavior.
- Do not add a correlation ID.
- Only Admin may change roles.
- A role change and its audit record must commit atomically.

## Review Focus

- Missing `roleName` must not default to `ADMIN`.
- Numeric enum values must be rejected.
- Audit failure must not leave the employee role changed.
- Inactive roles must not be assigned.
- A no-op role request must not create a fake audit entry.

---

### Task 1: Secure the HTTP request boundary

**Files:**
- Modify: `app/backend/src/Dto/EmployeeDto/ChangeEmployeeRequest.cs`
- Modify: `app/backend/Program.cs`
- Test: `app/backend.Tests/Dto/ChangeEmployeeRequestTests.cs`

**Interfaces:**
- Consumes: JSON request body with `roleName` and `reason`.
- Produces: A validated `ChangeEmployeeRequest`; browser CORS permits `PATCH`.

- [ ] Write failing tests for a missing `roleName` and valid string `ADMIN`.
- [ ] Run the focused tests and confirm the missing-role test fails for the expected default-enum reason.
- [ ] Require `roleName`, require a nonblank reason at the service boundary, and add `PATCH` to CORS.
- [ ] Run the focused tests and a preflight OPTIONS check.

### Task 2: Make role change and audit correct and atomic

**Files:**
- Modify: `app/backend/src/Services/EmployeeService.cs`
- Modify: `app/backend/src/Services/AuditLogService.cs`
- Test: `app/backend.Tests/Services/EmployeeServiceTests.cs`

**Interfaces:**
- Consumes: `ChangeEmployeeRequest`, actor ID, employee ID and audit request context.
- Produces: `EmployeeRoleResponse` and exactly one matching audit entry committed atomically.

- [ ] Write failing tests for requested reason, inactive role, no-op role, non-Admin actor and rollback when audit persistence fails.
- [ ] Run the focused tests and confirm each fails for the intended behavior.
- [ ] Implement the smallest single-save role/audit flow with direct enum comparisons.
- [ ] Run the focused tests until green.

### Task 3: Complete audit reads and enforce append-only storage

**Files:**
- Modify: `app/backend/src/Dto/AuditLogDto/AuditLogResponse.cs`
- Modify: `app/backend/src/Services/AuditLogService.cs`
- Modify: `app/backend/src/Data/AppDbContext.cs`
- Test: `app/backend.Tests/Services/AuditLogServiceTests.cs`

**Interfaces:**
- Consumes: audit query filters and tracked audit entities.
- Produces: searchable before/after values; rejects modified or deleted audit rows.

- [ ] Write failing tests for before/after projection and update/delete rejection.
- [ ] Run the focused tests and confirm expected failures.
- [ ] Extend the response projection and add an audit append-only guard in `SaveChangesAsync`.
- [ ] Run focused tests, build, and the full test suite.
