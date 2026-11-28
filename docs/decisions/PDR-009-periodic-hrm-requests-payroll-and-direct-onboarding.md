# PDR-009: Full HRM workflows, periodic payroll and direct onboarding

## Status

Status: Accepted (2026-11-25)

## Date
2026-11-25

## Context
The accepted HRM screens require end-to-end employee lifecycle, staff requests, payroll and payslip workflows.
PDR-006 originally scoped out requests and periodic payroll, while AUTH-002 used an email whitelist and employee self-registration.

## Decision
- Adopt the accepted HRM workflows for SCR-HRM-01, SCR-HRM-04, SCR-HRM-05 and SCR-HRM-06.
- Admin creates employee accounts directly as `INVITED`; a single-use password setup link sent by email transitions the account to `ACTIVE`.
- Do not provide an email whitelist or employee self-registration flow.
- Preserve `EmployeeWorkRecordModel` as the canonical per-shift attendance source and support Admin-reviewed leave, shift-swap and attendance-explanation requests with append-only history and audit.
- Support periodic payroll and payslip reconciliation while retaining Admin approval for sensitive mutations and the existing payment ledger invariants.
- Use Cloudinary signed upload intents for proof images and retain the three canonical roles defined by PDR-008.

## Alternatives Considered
- **Adopt full Figma HRM (chosen):** makes the approved screens functional with persisted workflows and auditable approvals.
- **Retain the strict PDR-006 MVP:** rejected because it would require removing approved request, periodic payroll and payslip workflows.

## Consequences
- Employee onboarding, HR requests, periodic payroll and payslip workflows require PostgreSQL-backed APIs, migrations, authorization and tests.
- RootAdmin protection, maker-checker approval, actor derivation from authenticated claims and append-only audit remain mandatory.
- Per-shift work records and payment ledger remain authoritative for attendance and payment history.

## Architectural Invariants
- Exactly three canonical roles exist: `ADMIN`, `CASHIER` and `INVENTORY_MANAGER`.
- RootAdmin cannot be locked, revoked or demoted; an Admin cannot lock, revoke or demote themselves.
- Sensitive HR, payroll and payslip approvals are Admin-only and enforce maker-checker separation.
- Employee-facing mutations derive employee identity from the authenticated JWT subject, not request payload fields.
- Proof images use `UploadIntentService` and Cloudinary signed uploads; attachment tables and MinIO are prohibited.
- Sensitive changes append audit records in the same save transaction where feasible.

## Affected Artifacts
- `AUTH-002`, `EMP-001`, `ATT-002` and `PAYROLL-*` in `docs/FEATURE.md`.
- HR, attendance and payroll business rules in `docs/requirements/BUSINESS_RULES.md`.
- SCR-HRM-01, SCR-HRM-04, SCR-HRM-05 and SCR-HRM-06 implementations.
